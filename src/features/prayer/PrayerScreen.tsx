import React, { useEffect, useState } from 'react';
import { db, type PrayerPlace } from '../../database/dexie';
import {
  JAPAN_CITIES,
  JAPAN_CITY_LIST,
  calculateDistanceKm,
  getJapanPrayerTimes,
  type DailyPrayers,
} from '../../services/prayer.service';
import { supabase, isSupabaseConfigured } from '../../services/supabase.client';
import { JAPAN_PRAYER_PLACES } from '../../data/japanPrayerPlaces';

export const PrayerScreen: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('tokyo');
  const [customLat, setCustomLat] = useState<string>('35.6895');
  const [customLng, setCustomLng] = useState<string>('139.6917');
  const [calcMethod, setCalcMethod] = useState<'MuslimWorldLeague' | 'Egyptian' | 'Karachi' | 'UmmAlQura'>('MuslimWorldLeague');
  const [calcMadhab, setCalcMadhab] = useState<'Shafi' | 'Hanafi'>('Shafi');
  const [showManualCoords, setShowManualCoords] = useState<boolean>(false);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);

  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; label: string } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [prayers, setPrayers] = useState<DailyPrayers | null>(null);
  const [tickerSeconds, setTickerSeconds] = useState<number>(5055); // ~1h 24m 15s
  const [prayerPlaces, setPrayerPlaces] = useState<PrayerPlace[]>(JAPAN_PRAYER_PLACES);
  const [searchQuery, setSearchQuery] = useState('');

  // Device orientation / compass states
  const [isCompassActive, setIsCompassActive] = useState<boolean>(false);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassError, setCompassError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      let places = await db.prayer_places.where('status').equals('Published').toArray();
      if (places.length < JAPAN_PRAYER_PLACES.length) {
        for (const p of JAPAN_PRAYER_PLACES) {
          await db.prayer_places.put(p);
        }
        places = await db.prayer_places.where('status').equals('Published').toArray();
      }
      setPrayerPlaces(places.length > 0 ? places : JAPAN_PRAYER_PLACES);

      // Cloud sync from Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.from('prayer_places').select('*');
          if (!error && data && data.length > 0) {
            for (const sp of data) {
              await db.prayer_places.put({
                id: sp.id,
                name: sp.name,
                type: sp.type,
                city: sp.city_id,
                prefecture: sp.city_id,
                address: sp.address,
                description: sp.description,
                latitude: sp.latitude,
                longitude: sp.longitude,
                facilities: sp.facilities || [],
                verification_date: sp.verification_date || '2025-04-01',
                status: 'Published',
              });
            }
            const updated = await db.prayer_places.toArray();
            setPrayerPlaces(updated);
          }
        } catch {
          // Stay on local Dexie data
        }
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let loc: any = selectedCity;
    if (isManualMode && !isNaN(parseFloat(customLat)) && !isNaN(parseFloat(customLng))) {
      loc = { latitude: parseFloat(customLat), longitude: parseFloat(customLng) };
    } else if (gpsCoords) {
      loc = { latitude: gpsCoords.latitude, longitude: gpsCoords.longitude };
    }

    const p = getJapanPrayerTimes(loc, new Date(), calcMethod, calcMadhab);
    setPrayers(p);
    setTickerSeconds(p.nextPrayer.remainingSeconds || 5055);
  }, [selectedCity, isManualMode, customLat, customLng, gpsCoords, calcMethod, calcMadhab]);

  const handleCityChange = (cityId: string) => {
    setSelectedCity(cityId);
    setIsManualMode(false);
    const city = JAPAN_CITIES[cityId];
    if (city) {
      setCustomLat(city.latitude.toString());
      setCustomLng(city.longitude.toString());
    }
  };

  const handleLatChange = (val: string) => {
    setCustomLat(val);
    setIsManualMode(true);
  };

  const handleLngChange = (val: string) => {
    setCustomLng(val);
    setIsManualMode(true);
  };

  const todayDateMasehi = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Tokyo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const todayDateHijri = (() => {
    try {
      const raw = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
        timeZone: 'Asia/Tokyo',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date());
      return raw.endsWith('H') ? raw : `${raw} H`;
    } catch {
      return '10 Jumadilakhir 1448 H';
    }
  })();

  const formatJstClock = () => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date());
  };

  const [currentJstTime, setCurrentJstTime] = useState<string>(formatJstClock);

  // Live timer interval (updates countdown and live JST clock)
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setCurrentJstTime(formatJstClock());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sensor compass orientation listener (Active when user turns it ON)
  useEffect(() => {
    if (!isCompassActive) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      // iOS Safari webkitCompassHeading
      if ((e as any).webkitCompassHeading !== undefined) {
        heading = (e as any).webkitCompassHeading;
      }
      // Android absolute or relative orientation (alpha is counter-clockwise)
      else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        setCompassHeading(Math.round(heading));
      }
    };

    const win = window as any;
    if ('ondeviceorientationabsolute' in win) {
      win.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else if (win.DeviceOrientationEvent) {
      win.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if ('ondeviceorientationabsolute' in win) {
        win.removeEventListener('deviceorientationabsolute', handleOrientation);
      }
      win.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isCompassActive]);

  const handleToggleCompass = async () => {
    if (isCompassActive) {
      setIsCompassActive(false);
      setCompassHeading(null);
      setCompassError(null);
      return;
    }

    setCompassError(null);

    // iOS 13+ permission request
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response !== 'granted') {
          setCompassError('Izin sensor kompas ditolak oleh browser. Anda tetap dapat menggunakan angka derajat di atas.');
          return;
        }
      } catch {
        setCompassError('Sensor orientasi tidak dapat diakses pada browser ini.');
        return;
      }
    }

    setIsCompassActive(true);
  };

  const handleUseGps = () => {
    if (gpsCoords) {
      setGpsCoords(null);
      return;
    }

    if (!navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung fitur Geolocation.');
      return;
    }

    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsLoading(false);
        setGpsCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: 'Lokasi GPS Presisi',
        });
        setCustomLat(pos.coords.latitude.toFixed(4));
        setCustomLng(pos.coords.longitude.toFixed(4));
        setIsManualMode(false);
      },
      (err) => {
        setIsGpsLoading(false);
        alert(`Tidak dapat mendeteksi GPS (${err.message}). Menggunakan lokasi kota pilihan.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const formatTimer = (totalSec: number) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const targetQibla = prayers?.qiblaAngle || 293.0;
  // Needle rotation relative to compass device heading (or static targetQibla if compass is not active)
  const needleRotation = isCompassActive && compassHeading !== null
    ? (targetQibla - compassHeading + 360) % 360
    : targetQibla;

  const isAligned = isCompassActive && (needleRotation <= 3.5 || needleRotation >= 356.5);

  // Active coordinates for both prayer times and nearest-mosque Haversine sorting
  const activeCoords = (() => {
    const parsedLat = parseFloat(customLat);
    const parsedLng = parseFloat(customLng);
    if (isManualMode && !isNaN(parsedLat) && !isNaN(parsedLng)) {
      return { latitude: parsedLat, longitude: parsedLng };
    }
    if (gpsCoords) {
      return { latitude: gpsCoords.latitude, longitude: gpsCoords.longitude };
    }
    const cityObj = JAPAN_CITIES[selectedCity] || JAPAN_CITIES.tokyo;
    return { latitude: cityObj.latitude, longitude: cityObj.longitude };
  })();

  const activeLocationName = isManualMode
    ? 'Koordinat Manual'
    : gpsCoords
    ? 'Lokasi GPS'
    : JAPAN_CITIES[selectedCity]?.name || 'Tokyo (Shinjuku)';

  // Deduplicate places and compute real Haversine distance from active location
  const placesWithDistance = (() => {
    const seen = new Set<string>();
    const unique: Array<PrayerPlace & { distKm: number }> = [];
    for (const p of prayerPlaces) {
      const key = p.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const distKm = calculateDistanceKm(
        activeCoords.latitude,
        activeCoords.longitude,
        p.latitude,
        p.longitude
      );
      unique.push({ ...p, distKm });
    }
    unique.sort((a, b) => a.distKm - b.distKm);
    return unique;
  })();

  // Filtered places: search across all if query is typed; otherwise real nearby mosques by Haversine distance
  const filteredPlaces = (() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return placesWithDistance
        .filter(
          (place) =>
            place.name.toLowerCase().includes(q) ||
            place.address.toLowerCase().includes(q) ||
            place.city.toLowerCase().includes(q) ||
            place.prefecture.toLowerCase().includes(q)
        )
        .slice(0, 15);
    }

    // Primary radius: 25 km (accurate local mosques for selected city or manual/GPS coordinate)
    const within25 = placesWithDistance.filter((p) => p.distKm <= 25).slice(0, 10);
    if (within25.length > 0) return within25;

    // Secondary radius for suburban/nearby areas: 55 km (up to 5 real nearby places)
    return placesWithDistance.filter((p) => p.distKm <= 55).slice(0, 5);
  })();

  const formatDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

  const openGoogleMaps = (place: PrayerPlace) => {
    const query = encodeURIComponent(`${place.name}, ${place.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const openNearbyGoogleMaps = () => {
    const query = encodeURIComponent(`mosque OR prayer room`);
    window.open(
      `https://www.google.com/maps/search/${query}/@${activeCoords.latitude},${activeCoords.longitude},14z`,
      '_blank'
    );
  };

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* Location & Method Header Bar */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs flex flex-col gap-2.5 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-primary">location_on</span>
            Pilih Kota / Titik
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseGps}
              disabled={isGpsLoading}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">my_location</span>
              {isGpsLoading ? 'Mendeteksi...' : gpsCoords ? 'Ganti ke Kota' : 'Gunakan GPS'}
            </button>
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10.5px] font-bold tracking-wide shrink-0">
              JST (UTC+9)
            </span>
          </div>
        </div>

        {/* Full width dropdown with all 74 Japan locations + manual coordinates */}
        <div className="relative w-full">
          <select
            id="city-selector"
            value={isManualMode ? 'manual' : gpsCoords ? 'gps' : selectedCity}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'manual') {
                setIsManualMode(true);
                setGpsCoords(null);
                setShowManualCoords(true);
              } else if (val !== 'gps') {
                setGpsCoords(null);
                handleCityChange(val);
              }
            }}
            style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
            className="w-full appearance-none bg-surface-container-low text-[13.5px] font-bold text-on-surface pl-3 pr-9 py-2.5 rounded-xl focus:outline-none cursor-pointer border border-surface-container shadow-2xs"
          >
            {gpsCoords && (
              <option value="gps">
                GPS ({gpsCoords.latitude.toFixed(4)}°, {gpsCoords.longitude.toFixed(4)}°)
              </option>
            )}
            {JAPAN_CITY_LIST.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="manual">— koordinat manual —</option>
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            expand_more
          </span>
        </div>

        {/* Dynamic Date & Live Current Time (Hours, Minutes, Seconds) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-on-surface-variant text-[12px] pt-1.5 border-t border-surface-container/70">
          <div className="flex items-center gap-1.5 font-medium flex-wrap">
            <span className="material-symbols-outlined text-[15px] text-primary shrink-0">calendar_month</span>
            <span className="capitalize">{todayDateMasehi}</span>
            <span className="text-outline-variant">•</span>
            <span className="text-primary font-bold">{todayDateHijri}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-on-surface shrink-0 tabular-nums">
            <span className="material-symbols-outlined text-[15px] text-primary shrink-0">schedule</span>
            <span className="font-mono tracking-wider">{currentJstTime}</span>
            <span className="text-[10.5px] font-semibold text-primary">JST</span>
          </div>
        </div>

        {/* Accordion: Koordinat manual & metode hitung */}
        <div className="pt-2 border-t border-surface-container/70">
          <button
            type="button"
            onClick={() => setShowManualCoords(!showManualCoords)}
            className="w-full flex items-center justify-between text-left py-0.5 group cursor-pointer"
          >
            <span className="text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors">
              Koordinat manual & metode hitung
            </span>
            <span className="w-5 h-5 rounded-md bg-surface-container-low border border-surface-container text-on-surface text-[14px] font-bold flex items-center justify-center">
              {showManualCoords ? '−' : '+'}
            </span>
          </button>

          {showManualCoords && (
            <div className="pt-3 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                    LINTANG
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLat}
                    onChange={(e) => handleLatChange(e.target.value)}
                    placeholder="35.6762"
                    className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[13px] font-bold text-on-surface border border-surface-container focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                    BUJUR
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={customLng}
                    onChange={(e) => handleLngChange(e.target.value)}
                    placeholder="139.6503"
                    className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[13px] font-bold text-on-surface border border-surface-container focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                    METODE
                  </label>
                  <div className="relative">
                    <select
                      value={calcMethod}
                      onChange={(e) => setCalcMethod(e.target.value as any)}
                      style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
                      className="w-full appearance-none h-9 pl-3 pr-8 rounded-xl bg-surface-container-low text-[12px] font-bold text-on-surface border border-surface-container focus:outline-none cursor-pointer"
                    >
                      <option value="MuslimWorldLeague">Muslim World League (18° / 17°)</option>
                      <option value="Egyptian">Egyptian General Authority (19.5° / 17.5°)</option>
                      <option value="Karachi">Karachi - Univ. of Islamic Sciences (18° / 18°)</option>
                      <option value="UmmAlQura">Umm al-Qura University, Makkah</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                      expand_more
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                    MAZHAB ASHAR
                  </label>
                  <div className="relative">
                    <select
                      value={calcMadhab}
                      onChange={(e) => setCalcMadhab(e.target.value as any)}
                      style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
                      className="w-full appearance-none h-9 pl-3 pr-8 rounded-xl bg-surface-container-low text-[12px] font-bold text-on-surface border border-surface-container focus:outline-none cursor-pointer"
                    >
                      <option value="Shafi">Syafi'i / Jumhur</option>
                      <option value="Hanafi">Hanafi</option>
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[10.5px] text-on-surface-variant leading-relaxed">
                Zona waktu Jepang tetap JST (UTC+9), berlaku di seluruh wilayah termasuk Okinawa dan Hokkaido.
              </p>
            </div>
          )}
        </div>
      </div>


      {/* Card 1: Waktu Sholat Utama & Countdown Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs flex flex-col gap-3 border border-surface-container/80">
        <div className="relative overflow-hidden bg-primary-container rounded-xl p-3.5 text-white shadow-xs">
          {/* Decorative Islamic Geometry Accent */}
          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none text-white">
            <svg fill="currentColor" height="90" viewBox="0 0 100 100" width="90">
              <polygon points="50,0 63,35 100,50 63,65 50,100 37,65 0,50 37,35"></polygon>
              <circle cx="50" cy="50" fill="none" r="22" stroke="currentColor" strokeWidth="4"></circle>
            </svg>
          </div>

          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9.5px] font-bold tracking-wide uppercase">
                WAKTU BERIKUTNYA
              </span>
              <h2 className="text-xl mt-1 font-extrabold tracking-tight">
                {prayers?.nextPrayer.name.toUpperCase() || 'ASHAR'}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] opacity-90 block">Adzan JST</span>
              <span className="text-xl font-black tracking-tight">
                {prayers?.nextPrayer.time || '15:20'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 pt-2 bg-white/10 rounded-lg px-3 py-1.5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-secondary-container">
                hourglass_top
              </span>
              <span className="text-[12px] font-semibold">Menuju Masuk Waktu</span>
            </div>
            <div className="text-[13px] font-bold tracking-wider font-mono text-secondary-container">
              {formatTimer(tickerSeconds)}
            </div>
          </div>
        </div>

        {/* 5 Daily Prayer Cards - Highlight Dinamis Sesuai Jadwal Berikutnya */}
        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          {[
            { key: 'fajr', label: 'Subuh', time: prayers?.fajr || '04:53' },
            { key: 'dhuhr', label: 'Dzuhur', time: prayers?.dhuhr || '11:28' },
            { key: 'asr', label: 'Ashar', time: prayers?.asr || '14:12' },
            { key: 'maghrib', label: 'Maghrib', time: prayers?.maghrib || '16:32' },
            { key: 'isha', label: 'Isya', time: prayers?.isha || '17:56' },
          ].map((item) => {
            const active = prayers?.nextPrayer.name.toLowerCase().includes(item.label.toLowerCase());
            return (
              <div
                key={item.key}
                className={`py-2 px-1 flex flex-col items-center text-center rounded-xl min-w-0 transition-all ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container shadow-xs border border-secondary'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <span className={`text-[11px] ${active ? 'font-black uppercase text-on-secondary-container' : 'text-on-surface-variant font-medium'}`}>
                  {item.label}
                </span>
                <span className={`text-[12.5px] mt-0.5 ${active ? 'font-black text-on-secondary-container' : 'font-extrabold text-on-surface'}`}>
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>


      {/* Card 2: Arah Kiblat Jepang (Sesuai Standar Kompas HP & Titik Mana Pun di Jepang) */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5 border border-surface-container/80">
        <div>
          <h3 className="text-[17px] font-bold text-on-surface">Arah kiblat</h3>
          <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">
            Letakkan ponsel mendatar, lalu putar badan sampai jarum merah menunjuk ke atas.
          </p>
        </div>

        {/* Dynamic Location Indicator */}
        <div className="flex items-center justify-between text-[11px] bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container">
          <div className="flex items-center gap-1.5 text-on-surface-variant truncate">
            <span className="material-symbols-outlined text-[15px] text-primary">my_location</span>
            <span className="truncate">
              {isManualMode
                ? `Koordinat Manual (${activeCoords.latitude.toFixed(2)}°, ${activeCoords.longitude.toFixed(2)}°) • ${targetQibla.toFixed(1)}°`
                : gpsCoords
                ? `${gpsCoords.label} (${gpsCoords.latitude.toFixed(2)}°, ${gpsCoords.longitude.toFixed(2)}°) • ${targetQibla.toFixed(1)}°`
                : `${JAPAN_CITIES[selectedCity]?.label || 'Tokyo (Shinjuku)'} • ${targetQibla.toFixed(1)}°`}
            </span>
          </div>
          <button
            onClick={handleUseGps}
            disabled={isGpsLoading}
            className="text-primary font-bold hover:underline shrink-0 flex items-center gap-1 ml-2"
          >
            {isGpsLoading ? 'Mendeteksi...' : gpsCoords ? 'Ganti ke Kota' : 'Gunakan GPS'}
          </button>
        </div>

        {/* Compass Graphic Visualizer */}
        <div className="relative w-full aspect-square max-w-[220px] sm:max-w-[240px] mx-auto my-1 flex items-center justify-center">
          {/* Dial SVG */}
          <svg className="w-full h-full select-none" viewBox="0 0 240 240">
            {/* Background Circle */}
            <circle cx="120" cy="120" r="110" fill="#fcfbfa" stroke="#e6e1db" strokeWidth="1.5" />
            
            {/* Degree ticks around outer perimeter */}
            {Array.from({ length: 72 }).map((_, i) => {
              const angle = i * 5;
              const isMajor = angle % 30 === 0;
              const rad = (angle * Math.PI) / 180;
              const rInner = isMajor ? 95 : 101;
              const rOuter = 106;
              const x1 = 120 + rInner * Math.sin(rad);
              const y1 = 120 - rInner * Math.cos(rad);
              const x2 = 120 + rOuter * Math.sin(rad);
              const y2 = 120 - rOuter * Math.cos(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajor ? '#6c6563' : '#bbb4af'}
                  strokeWidth={isMajor ? 1.5 : 1}
                />
              );
            })}

            {/* Cardinals N, E, S, W */}
            <text x="120" y="32" textAnchor="middle" fill="#2c2826" fontSize="14" fontWeight="bold" fontFamily="system-ui, sans-serif">
              N
            </text>
            <text x="210" y="125" textAnchor="middle" fill="#78726e" fontSize="12" fontWeight="bold" fontFamily="system-ui, sans-serif">
              E
            </text>
            <text x="120" y="217" textAnchor="middle" fill="#78726e" fontSize="12" fontWeight="bold" fontFamily="system-ui, sans-serif">
              S
            </text>
            <text x="30" y="125" textAnchor="middle" fill="#78726e" fontSize="12" fontWeight="bold" fontFamily="system-ui, sans-serif">
              W
            </text>

            {/* Needle Rotating Group */}
            <g
              transform={`rotate(${needleRotation}, 120, 120)`}
              style={{ transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
            >
              {/* Red Tip (Pointing towards Qibla) */}
              <polygon points="112,120 120,32 128,120" fill="#c92a2a" />
              {/* Beige Tail (Opposite Qibla) */}
              <polygon points="113,120 120,205 127,120" fill="#d8cebe" />
              {/* Center Hub */}
              <circle cx="120" cy="120" r="11" fill="#ffffff" stroke="#dcd6ce" strokeWidth="2" />
              <circle cx="120" cy="120" r="5" fill="#c92a2a" />
            </g>

            {/* Center Degree & Label: e.g. 293.0° DARI UTARA */}
            <text
              x="120"
              y="154"
              textAnchor="middle"
              fill="#1c1917"
              fontSize="24"
              fontWeight="800"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {targetQibla.toFixed(1)}°
            </text>
            <text
              x="120"
              y="170"
              textAnchor="middle"
              fill="#78716c"
              fontSize="9"
              fontWeight="700"
              letterSpacing="0.16em"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              DARI UTARA
            </text>
          </svg>
        </div>

        {/* Alignment alert if user points directly to Qibla */}
        {isCompassActive && isAligned && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-[12px] font-bold animate-pulse">
            <span className="material-symbols-outlined text-[17px] text-emerald-600">check_circle</span>
            <span>Tepat Menghadap Kiblat!</span>
          </div>
        )}

        {/* Compass Button & Guidance Note */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <button
            onClick={handleToggleCompass}
            className={`h-10 px-4 rounded-xl text-[12.5px] font-bold flex items-center justify-center gap-2 transition-all active:scale-98 shrink-0 ${
              isCompassActive
                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                : 'border-2 border-primary-container text-primary-container hover:bg-primary-container/10'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCompassActive ? 'explore' : 'sensors'}
            </span>
            <span>{isCompassActive ? 'Kompas Aktif (Matikan)' : 'Aktifkan kompas'}</span>
          </button>

          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Tanpa kompas, gunakan angka derajat di atas dengan aplikasi kompas bawaan ponsel.
          </p>
        </div>

        {compassError && (
          <p className="text-[11px] text-error font-medium bg-error-container/20 p-2 rounded-lg">
            {compassError}
          </p>
        )}
      </div>

      {/* Card 3: Direktori Masjid & Musholla Terdekat Sesuai Lokasi / Koordinat Aktif */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5 border border-surface-container/80">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-bold text-on-surface truncate">
              Masjid &amp; Musholla Terdekat
            </h3>
            <p className="text-[11px] text-on-surface-variant mt-0.5 truncate">
              Sekitar {activeLocationName} ({filteredPlaces.length} lokasi ditemukan)
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-bold shrink-0 max-w-[130px] truncate">
            {activeLocationName}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama masjid atau kota di Jepang..."
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-surface-container-low text-[12.5px] text-on-surface placeholder:text-outline focus:outline-none border border-surface-container"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[17px]">
            search
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Directory Listing Items - Ukuran Sama Rata, Judul, Jarak + Alamat, dan Tombol Maps */}
        <div className="flex flex-col gap-2">
          {filteredPlaces.length > 0 ? (
            filteredPlaces.map((place) => (
              <div
                key={place.id}
                className="bg-surface-container-low rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 border border-surface-container/70 h-[68px] min-h-[68px] max-h-[68px]"
              >
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <h4 className="text-[13px] font-bold text-on-surface truncate leading-tight">
                    {place.name}
                  </h4>
                  <p className="text-[11px] text-on-surface-variant truncate mt-1">
                    <span className="font-bold text-primary">{formatDist(place.distKm)}</span>
                    {' · '}
                    {place.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openGoogleMaps(place)}
                  className="h-8 px-3.5 rounded-xl bg-primary text-white text-[11.5px] font-bold shadow-2xs hover:bg-primary-container transition-all active:scale-95 shrink-0 flex items-center justify-center cursor-pointer"
                >
                  Maps
                </button>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-on-surface-variant bg-surface-container-low rounded-xl text-[12px] border border-surface-container/60 space-y-2">
              <p>Belum ada masjid/musholla terdaftar dalam radius 55 km dari titik ini.</p>
              <button
                type="button"
                onClick={openNearbyGoogleMaps}
                className="h-8 px-3.5 rounded-xl bg-primary text-white text-[11.5px] font-bold inline-flex items-center justify-center cursor-pointer"
              >
                Cari di Google Maps
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
