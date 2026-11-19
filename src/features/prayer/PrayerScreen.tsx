import React, { useEffect, useState } from 'react';
import { db, type PrayerPlace } from '../../database/dexie';
import { JAPAN_CITIES, getJapanPrayerTimes, type DailyPrayers } from '../../services/prayer.service';
import { supabase, isSupabaseConfigured } from '../../services/supabase.client';

export const PrayerScreen: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState<string>('tokyo');
  const [prayers, setPrayers] = useState<DailyPrayers | null>(null);
  const [tickerSeconds, setTickerSeconds] = useState<number>(5055); // ~1h 24m 15s
  const [prayerPlaces, setPrayerPlaces] = useState<PrayerPlace[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Device orientation state
  const [compassHeading, setCompassHeading] = useState<number | null>(null);

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
    const p = getJapanPrayerTimes(selectedCity);
    setPrayers(p);
    setTickerSeconds(p.nextPrayer.remainingSeconds || 5055);
  }, [selectedCity]);

  // Live timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Device sensor orientation listener (if available)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        setCompassHeading(e.alpha);
      } else if ((e as any).webkitCompassHeading !== undefined) {
        setCompassHeading((e as any).webkitCompassHeading);
      }
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  const formatTimer = (totalSec: number) => {
    const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const targetQibla = prayers?.qiblaAngle || 293;
  // Needle rotation relative to compass device heading (or static 293 if device has no compass)
  const needleAngle = compassHeading !== null ? (targetQibla - compassHeading + 360) % 360 : targetQibla;

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
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col gap-2.5 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary-container text-[18px] shrink-0">
              location_on
            </span>
            <div className="relative inline-block">
              <select
                id="city-selector"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="appearance-none bg-surface-container-low text-[13px] font-bold text-on-surface pl-2.5 pr-7 py-1 rounded-lg focus:outline-none cursor-pointer border border-surface-container"
              >
                {Object.values(JAPAN_CITIES).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[17px]">
                expand_more
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] uppercase font-bold tracking-wider">
            JST (UTC+9)
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-y-1 text-on-surface-variant text-[11px] pt-0.5">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-[15px] text-primary">calendar_month</span>
            <span>Rabu, 13 April 2025</span>
            <span className="text-outline-variant">•</span>
            <span className="text-primary-container font-extrabold">14 Syawal 1446 H</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Japan Islamic Trust (Offline)</span>
          </div>
        </div>
      </div>


      {/* Card 1: Waktu Sholat Utama & Countdown Card */}
      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-xs flex flex-col gap-2.5 border border-surface-container/80">
        <div className="relative overflow-hidden bg-primary-container rounded-lg p-3 text-white shadow-xs">
          {/* Decorative Islamic Geometry Accent */}
          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none text-white">
            <svg fill="currentColor" height="90" viewBox="0 0 100 100" width="90">
              <polygon points="50,0 63,35 100,50 63,65 50,100 37,65 0,50 37,35"></polygon>
              <circle cx="50" cy="50" fill="none" r="22" stroke="currentColor" strokeWidth="4"></circle>
            </svg>
          </div>

          <div className="flex justify-between items-start relative z-10">
            <div>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[9px] font-bold tracking-wide uppercase">
                WAKTU BERIKUTNYA
              </span>
              <h2 className="text-xl mt-0.5 font-extrabold tracking-tight">
                {prayers?.nextPrayer.name.toUpperCase() || 'ASHAR'}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] opacity-90 block">Adzan JST</span>
              <span className="text-lg font-black tracking-tight">
                {prayers?.nextPrayer.time || '15:20'}
              </span>
            </div>
          </div>

          <div className="mt-2 pt-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-secondary-container">
                hourglass_top
              </span>
              <span className="text-[11.5px] font-semibold">Menuju Masuk Waktu</span>
            </div>
            <div className="text-sm font-bold tracking-wider font-mono text-secondary-container">
              {formatTimer(tickerSeconds)}
            </div>
          </div>
        </div>

        {/* 5 Daily Prayer Cards */}
        <div className="grid grid-cols-5 gap-1">
          <div className="bg-surface-container-low rounded-lg p-1.5 flex flex-col items-center text-center opacity-70">
            <span className="text-[10px] text-on-surface-variant font-medium">Subuh</span>
            <span className="text-[11.5px] font-bold text-on-surface my-0.5">{prayers?.fajr || '04:15'}</span>
            <span className="text-[8.5px] px-1 py-0.2 rounded bg-surface-container-high text-on-surface-variant font-semibold">
              Selesai
            </span>
          </div>
          <div className="bg-surface-container-low rounded-lg p-1.5 flex flex-col items-center text-center opacity-70">
            <span className="text-[10px] text-on-surface-variant font-medium">Dzuhur</span>
            <span className="text-[11.5px] font-bold text-on-surface my-0.5">{prayers?.dhuhr || '11:52'}</span>
            <span className="text-[8.5px] px-1 py-0.2 rounded bg-surface-container-high text-on-surface-variant font-semibold">
              Selesai
            </span>
          </div>
          <div className="bg-secondary-fixed rounded-lg p-1.5 flex flex-col items-center text-center shadow-2xs">
            <span className="text-[10px] text-on-secondary-fixed font-bold">Ashar</span>
            <span className="text-[11.5px] font-extrabold text-on-secondary-fixed my-0.5">{prayers?.asr || '15:20'}</span>
            <span className="text-[8.5px] px-1 py-0.2 rounded bg-primary-container text-white font-bold">
              Nanti
            </span>
          </div>
          <div className="bg-surface-container-low rounded-lg p-1.5 flex flex-col items-center text-center">
            <span className="text-[10px] text-on-surface-variant font-medium">Maghrib</span>
            <span className="text-[11.5px] font-bold text-on-surface my-0.5">{prayers?.maghrib || '18:10'}</span>
            <span className="text-[8.5px] px-1 py-0.2 rounded bg-surface-container-high text-on-surface-variant font-semibold">
              18:10
            </span>
          </div>
          <div className="bg-surface-container-low rounded-lg p-1.5 flex flex-col items-center text-center">
            <span className="text-[10px] text-on-surface-variant font-medium">Isya</span>
            <span className="text-[11.5px] font-bold text-on-surface my-0.5">{prayers?.isha || '19:28'}</span>
            <span className="text-[8.5px] px-1 py-0.2 rounded bg-surface-container-high text-on-surface-variant font-semibold">
              19:28
            </span>
          </div>
        </div>
      </div>


      {/* Card 2: Kompas Arah Kiblat Jepang */}
      <div className="bg-surface-container-lowest rounded-xl p-3 shadow-xs flex flex-col gap-2 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-[16px]">explore</span>
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-on-surface">Kompas Arah Kiblat</h3>
              <p className="text-[10.5px] text-on-surface-variant">Presisi astronomis Ka'bah dari Jepang</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-extrabold text-primary-container">{targetQibla}° NW</span>
            <span className="text-[10px] text-on-surface-variant block font-semibold">Barat Laut</span>
          </div>
        </div>

        {/* Compass Graphic Visualizer */}
        <div className="relative w-full aspect-square max-w-[150px] mx-auto my-1 flex items-center justify-center">
          {/* Outer Compass Disc */}
          <div className="absolute inset-0 rounded-full bg-surface-container-low flex items-center justify-center shadow-inner border border-surface-container">
            <svg className="w-full h-full text-outline-variant p-2" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="46" stroke="currentColor" strokeDasharray="2, 6" strokeWidth="1.5"></circle>
              <text fill="#7d0004" fontSize="8" fontWeight="bold" textAnchor="middle" x="50" y="13">
                U
              </text>
              <text fill="#906f6b" fontSize="7" fontWeight="bold" textAnchor="middle" x="90" y="53">
                T
              </text>
              <text fill="#906f6b" fontSize="7" fontWeight="bold" textAnchor="middle" x="50" y="93">
                S
              </text>
              <text fill="#906f6b" fontSize="7" fontWeight="bold" textAnchor="middle" x="10" y="53">
                B
              </text>
            </svg>
          </div>

          {/* Kaaba Target Icon Node at ~293 deg */}
          <div
            className="absolute inset-2 flex items-center justify-center pointer-events-none transition-transform duration-500"
            style={{ transform: `rotate(${targetQibla}deg)` }}
          >
            <div className="w-full flex items-center justify-between px-1">
              <div className="flex items-center gap-1 -rotate-90">
                <div className="w-5 h-5 rounded-full bg-secondary-container flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-[13px] text-on-secondary-container">
                    mosque
                  </span>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-transparent"></div>
            </div>
          </div>

          {/* Rotating Compass Needle */}
          <div
            className="relative z-10 w-24 h-24 flex items-center justify-center transition-transform duration-700 ease-out"
            style={{ transform: `rotate(${needleAngle}deg)` }}
          >
            <div className="w-2 h-full relative flex flex-col justify-between items-center">
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[28px] border-b-primary-container"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-on-surface shadow-xs"></div>
              <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[24px] border-t-tertiary-fixed-dim"></div>
            </div>
          </div>

          {/* Central Dial Cap */}
          <div className="absolute w-5 h-5 rounded-full bg-surface-container-lowest shadow-xs flex items-center justify-center z-20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
          </div>
        </div>

        {/* Calibration Info Box */}
        <div className="bg-surface-container-low rounded-lg p-2.5 flex items-start gap-2">
          <span className="material-symbols-outlined text-secondary text-[16px] shrink-0 mt-0.5">
            info
          </span>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Pegang ponsel sejajar permukaan tanah. Arahkan jarum merah ke kubah Ka'bah ({targetQibla}°). Jika kompas deviasi, hadapkan <strong>67° ke kanan dari arah barat</strong> sejati.
          </p>
        </div>
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
