import React, { useEffect, useState } from 'react';
import { db, type PrayerPlace } from '../../database/dexie';
import { JAPAN_CITIES, getJapanPrayerTimes, type DailyPrayers } from '../../services/prayer.service';
import { supabase, isSupabaseConfigured } from '../../services/supabase.client';

export const PrayerScreen: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('tokyo');
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number; label: string } | null>(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [prayers, setPrayers] = useState<DailyPrayers | null>(null);
  const [tickerSeconds, setTickerSeconds] = useState<number>(5055); // ~1h 24m 15s
  const [prayerPlaces, setPrayerPlaces] = useState<PrayerPlace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Device orientation / compass states
  const [isCompassActive, setIsCompassActive] = useState<boolean>(false);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [compassError, setCompassError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      let places = await db.prayer_places.where('status').equals('Published').toArray();
      if (places.length === 0) {
        places = await db.prayer_places.toArray();
      }
      setPrayerPlaces(places);

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
    const loc = gpsCoords ? { latitude: gpsCoords.latitude, longitude: gpsCoords.longitude } : selectedCity;
    const p = getJapanPrayerTimes(loc);
    setPrayers(p);
    setTickerSeconds(p.nextPrayer.remainingSeconds || 5055);
  }, [selectedCity, gpsCoords]);

  // Live timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
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

  // Filtered places
  const filteredPlaces = prayerPlaces.filter((place) => {
    const matchesSearch =
      place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.city.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'Semua') return true;
    if (selectedCategory === 'Masjid Besar') return place.type === 'Mosque';
    if (selectedCategory === 'Prayer Room Stasiun') return place.type === 'Prayer Room';
    if (selectedCategory === 'Halal Restaurant Space') return place.facilities.some((f) => f.toLowerCase().includes('halal'));
    return true;
  });

  const openGoogleMaps = (place: PrayerPlace) => {
    const query = encodeURIComponent(`${place.name}, ${place.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* Location & Method Header Bar */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs flex flex-col gap-2.5 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-primary">location_on</span>
            Lokasi Waktu Sholat
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10.5px] font-bold tracking-wide shrink-0">
            JST (UTC+9)
          </span>
        </div>

        {/* Full width dropdown to prevent horizontal overlap */}
        <div className="relative w-full">
          <select
            id="city-selector"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full appearance-none bg-surface-container-low text-[13.5px] font-bold text-on-surface pl-3 pr-9 py-2.5 rounded-xl focus:outline-none cursor-pointer border border-surface-container shadow-2xs"
          >
            {Object.values(JAPAN_CITIES).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.sublabel})
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            expand_more
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-on-surface-variant text-[12px] pt-1.5 border-t border-surface-container/70">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-[15px] text-primary">calendar_month</span>
            <span>Rabu, 13 April 2025</span>
            <span className="text-outline-variant">•</span>
            <span className="text-primary font-bold">14 Syawal 1446 H</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Japan Islamic Trust (Offline)</span>
          </div>
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
              {gpsCoords
                ? `${gpsCoords.label} (${gpsCoords.latitude.toFixed(2)}°, ${gpsCoords.longitude.toFixed(2)}°)`
                : `${JAPAN_CITIES[selectedCity]?.label || 'Tokyo'} • ${targetQibla.toFixed(1)}°`}
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

      {/* Card 3: Direktori Masjid & Musholla */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-on-surface">Masjid & Musholla Terdekat</h3>
            <p className="text-[11.5px] text-on-surface-variant">Tempat ibadah ramah musafir di sekitar Jepang</p>
          </div>
          <span className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface text-[12px] font-bold">
            {filteredPlaces.length}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari masjid atau musholla..."
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-low text-[13px] text-on-surface placeholder:text-outline focus:outline-none border border-surface-container"
          />
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            search
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {['Semua', 'Masjid Besar', 'Prayer Room Stasiun', 'Halal Restaurant Space'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`h-7.5 px-3 rounded-full text-[11.5px] font-medium flex items-center whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-container text-white shadow-2xs font-semibold'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Directory Listing Items */}
        <div className="flex flex-col gap-2.5">
          {filteredPlaces.map((place) => (
            <div key={place.id} className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 border border-surface-container/60">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-primary-fixed/30 flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[22px]">
                    {place.type === 'Mosque' ? 'mosque' : 'door_sliding'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-[13.5px] font-bold text-on-surface leading-tight truncate">
                      {place.name}
                    </h4>
                    {place.distance_km && (
                      <span className="shrink-0 text-[11px] font-bold text-primary px-2 py-0.5 rounded bg-primary-fixed">
                        {place.distance_km} km
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">train</span>
                    <span className="truncate">{place.address}</span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {place.facilities.map((fac, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-medium"
                      >
                        {fac}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-1.5 flex items-center justify-between border-t border-surface-container">
                <span className="text-[11.5px] text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  {place.open_hours || 'Buka setiap hari'}
                </span>
                <button
                  type="button"
                  onClick={() => openGoogleMaps(place)}
                  className="h-8 px-3.5 rounded-full bg-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">navigation</span>
                  <span>Buka di Maps</span>
                </button>
              </div>
            </div>
          ))}
        </div>


        {/* Quick Halal Tips Footer inside Directory */}
        <div className="p-3 bg-surface-container-high rounded-xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 text-primary-container">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-primary uppercase font-bold tracking-wider">
              Tips Mushaf & Wudhu di Stasiun
            </p>
            <p className="text-[11px] text-on-surface-variant truncate">
              Gunakan botol semprot kecil atau wudhu di rest area disabilitas jika darurat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
