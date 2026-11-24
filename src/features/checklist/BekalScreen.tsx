import React, { useEffect, useState } from 'react';
import { db, type ChecklistItem, type Trip } from '../../database/dexie';
import { MAIN_TRIP_ID } from '../../database/seed';
import { ALL_DEFAULT_CHECKLIST } from '../../data/bekalDefaults';
import {
  addDaysToIso,
  detectJapanSeason,
  getSeasonLabel,
  getTripStatusInfo,
  type JapanSeason,
} from '../../utils/tripDates';

type SeasonFilter = 'all' | JapanSeason;

export const BekalScreen: React.FC = () => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [totalDays, setTotalDays] = useState<number>(1);
  const [departureDate, setDepartureDate] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<SeasonFilter>('all');

  // Simple inline add packing item state
  const [newPackingTitle, setNewPackingTitle] = useState('');

  async function loadData() {
    let allItems = await db.checklist_items.orderBy('sort_order').toArray();
    if (allItems.length === 0) {
      for (const item of ALL_DEFAULT_CHECKLIST) {
        await db.checklist_items.put(item);
      }
      allItems = await db.checklist_items.orderBy('sort_order').toArray();
    }
    setItems(allItems);

    const allTrips = await db.trips.toArray();
    const activeTrip = allTrips[0] || null;
    setTrip(activeTrip);

    const allDays = await db.itinerary_days.orderBy('day_number').toArray();
    setTotalDays(Math.max(1, allDays.length));

    const savedDate = activeTrip?.departure_date || '';
    setDepartureDate(savedDate);

    // Load saved season filter preference, or auto-detect if departureDate is set
    const seasonPref = await db.app_settings.get('bekal_season_filter');
    if (seasonPref && typeof seasonPref.value === 'string') {
      setSelectedSeason(seasonPref.value as SeasonFilter);
    } else if (savedDate) {
      setSelectedSeason(detectJapanSeason(savedDate));
    } else {
      setSelectedSeason('all');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleDepartureDateChange = async (newDate: string) => {
    setDepartureDate(newDate);

    const detectedSeason = newDate ? detectJapanSeason(newDate) : 'spring';
    const allDays = await db.itinerary_days.orderBy('day_number').toArray();
    const dayCount = Math.max(1, allDays.length);
    const computedReturnDate = newDate ? addDaysToIso(newDate, dayCount - 1) : '';

    // Update or create main trip so Beranda & Itinerary stay in sync immediately
    if (trip) {
      await db.trips.update(trip.id, {
        departure_date: newDate,
        return_date: computedReturnDate,
        season: detectedSeason,
        updated_at: new Date().toISOString(),
      });
    } else {
      await db.trips.put({
        id: MAIN_TRIP_ID,
        name: 'Perjalanan Jepang Saya',
        destination: 'Jepang',
        departure_date: newDate,
        return_date: computedReturnDate,
        season: detectedSeason,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Sync itinerary days' dates sequentially from departure date if user set a date
    if (newDate && allDays.length > 0) {
      for (let i = 0; i < allDays.length; i++) {
        const dayIso = addDaysToIso(newDate, i);
        await db.itinerary_days.update(allDays[i].id, { date: dayIso });
      }
    }

    // Auto-select detected season when a date is picked; back to 'all' if cleared
    const nextFilter: SeasonFilter = newDate ? detectedSeason : 'all';
    setSelectedSeason(nextFilter);
    await db.app_settings.put({
      key: 'bekal_season_filter',
      value: nextFilter,
      updated_at: new Date().toISOString(),
    });

    const updatedTrips = await db.trips.toArray();
    setTrip(updatedTrips[0] || null);
  };

  const handleSeasonFilterChange = async (value: SeasonFilter) => {
    setSelectedSeason(value);
    await db.app_settings.put({
      key: 'bekal_season_filter',
      value,
      updated_at: new Date().toISOString(),
    });
    if (value !== 'all' && trip) {
      await db.trips.update(trip.id, {
        season: value,
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await db.checklist_items.update(id, { completed: !current });
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, completed: !current } : it)));
  };

  const handleDelete = async (id: string) => {
    await db.checklist_items.delete(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newPackingTitle.trim();
    if (!title) return;

    const newItem: ChecklistItem = {
      id: `pk-custom-${Date.now()}`,
      section: 'packing',
      category: 'Travel Accessories',
      title,
      completed: false,
      sort_order: items.length + 200,
      is_custom: true,
      season: selectedSeason,
    };

    await db.checklist_items.add(newItem);
    setItems((prev) => [...prev, newItem]);
    setNewPackingTitle('');
  };

  // Partition into Timeline vs Packing
  const timelineItems = items.filter(
    (i) => i.section === 'timeline' || (!i.section && typeof i.days_before_departure === 'number')
  );
  const allPackingItems = items.filter(
    (i) => i.section === 'packing' || (!i.section && typeof i.days_before_departure !== 'number')
  );

  const visiblePackingItems = allPackingItems.filter((i) => {
    if (selectedSeason === 'all') return true;
    return !i.season || i.season === 'all' || i.season === selectedSeason;
  });

  const timelineCompleted = timelineItems.filter((i) => i.completed).length;
  const timelinePercent =
    timelineItems.length > 0 ? Math.round((timelineCompleted / timelineItems.length) * 100) : 0;

  const packingCompleted = visiblePackingItems.filter((i) => i.completed).length;
  const packingPercent =
    visiblePackingItems.length > 0 ? Math.round((packingCompleted / visiblePackingItems.length) * 100) : 0;

  const tripStatus = getTripStatusInfo(departureDate, totalDays, trip?.season);

  const shortSeasonTag = (s?: string) => {
    if (s === 'spring') return 'Semi';
    if (s === 'summer') return 'Panas';
    if (s === 'autumn') return 'Gugur';
    if (s === 'winter') return 'Dingin';
    return null;
  };

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Page Title */}
      <div className="px-0.5 pt-0.5">
        <h1 className="text-[20px] sm:text-[22px] font-extrabold text-on-surface tracking-tight leading-tight">
          Persiapan &amp; Bekal
        </h1>
        <p className="text-[12.5px] text-on-surface-variant mt-1 leading-relaxed">
          Hitung mundur dokumen, lalu centang barang bawaan sesuai musim keberangkatan.
        </p>
      </div>

      {/* Card 1: Tanggal & musim */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container shadow-2xs space-y-3.5">
        <h2 className="text-[15.5px] font-bold text-on-surface">Tanggal &amp; musim</h2>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="bekal-departure-date"
              className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant"
            >
              Tanggal Berangkat
            </label>
            {departureDate && (
              <button
                type="button"
                onClick={() => handleDepartureDateChange('')}
                className="text-[11px] font-semibold text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                Hapus tanggal
              </button>
            )}
          </div>
          <input
            id="bekal-departure-date"
            type="date"
            value={departureDate}
            onChange={(e) => handleDepartureDateChange(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl bg-white text-[13.5px] font-medium text-on-surface border border-outline-variant/70 focus:outline-none focus:border-primary transition-colors"
          />

          {/* Live Sync Feedback Pill */}
          {departureDate && (
            <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-[12px]">
              <span className="font-bold text-primary">{tripStatus.badgeText}</span>
              <span className="text-[11px] text-on-surface-variant font-medium shrink-0">
                {getSeasonLabel(tripStatus.season)}
              </span>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="bekal-season-select"
            className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5"
          >
            Musim Saat Berangkat
          </label>
          <div className="relative">
            <select
              id="bekal-season-select"
              value={selectedSeason}
              onChange={(e) => handleSeasonFilterChange(e.target.value as SeasonFilter)}
              style={{ appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' }}
              className="w-full appearance-none h-11 pl-3.5 pr-9 rounded-xl bg-white text-[13.5px] font-medium text-on-surface border border-outline-variant/70 focus:outline-none focus:border-primary cursor-pointer transition-colors"
            >
              <option value="all">Tampilkan semua musim</option>
              <option value="spring">Musim Semi (Mar – Mei)</option>
              <option value="summer">Musim Panas (Jun – Agu)</option>
              <option value="autumn">Musim Gugur (Sep – Nov)</option>
              <option value="winter">Musim Dingin (Des – Feb)</option>
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
              expand_more
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Linimasa persiapan */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15.5px] font-bold text-on-surface">Linimasa persiapan</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11.5px] font-bold tabular-nums">
            {timelinePercent}%
          </span>
        </div>

        {/* Thin progress line */}
        <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-3 mb-1">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-300"
            style={{ width: `${timelinePercent}%` }}
          />
        </div>

        {/* Simple clean list with subtle horizontal dividers */}
        <div className="divide-y divide-surface-container/70">
          {timelineItems.map((item) => {
            const isDueSoon =
              !item.completed &&
              tripStatus.state === 'upcoming' &&
              tripStatus.diffDays !== null &&
              typeof item.days_before_departure === 'number' &&
              tripStatus.diffDays <= item.days_before_departure;

            return (
              <div
                key={item.id}
                onClick={() => handleToggle(item.id, item.completed)}
                className="py-3 flex items-start gap-3 cursor-pointer select-none group"
              >
                <button
                  type="button"
                  aria-label={`Tandai ${item.title}`}
                  className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                    item.completed
                      ? 'bg-primary-container text-white border border-primary-container'
                      : 'border-[1.5px] border-outline-variant bg-white group-hover:border-primary'
                  }`}
                >
                  {item.completed && <span className="material-symbols-outlined text-[14px]">check</span>}
                </button>
                <p
                  className={`text-[13px] leading-snug flex-1 ${
                    item.completed ? 'line-through text-on-surface-variant/65' : 'text-on-surface'
                  }`}
                >
                  <span>{item.title}</span>
                  {typeof item.days_before_departure === 'number' && (
                    <span
                      className={`ml-1.5 text-[11.5px] font-medium ${
                        isDueSoon ? 'text-primary font-bold' : 'text-outline'
                      }`}
                    >
                      H-{item.days_before_departure}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card 3: Barang bawaan (sesuai musim) */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-[15.5px] font-bold text-on-surface">Barang bawaan</h2>
            <p className="text-[11.5px] text-on-surface-variant mt-0.5">
              {selectedSeason === 'all' ? 'Menampilkan semua musim' : `Disesuaikan untuk ${getSeasonLabel(selectedSeason)}`}
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11.5px] font-bold tabular-nums">
            {packingPercent}%
          </span>
        </div>

        {/* Thin progress line */}
        <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-3 mb-1">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-300"
            style={{ width: `${packingPercent}%` }}
          />
        </div>

        <div className="divide-y divide-surface-container/70">
          {visiblePackingItems.map((item) => {
            const seasonTag = selectedSeason === 'all' ? shortSeasonTag(item.season) : null;
            return (
              <div
                key={item.id}
                className="py-3 flex items-start justify-between gap-2.5 group"
              >
                <div
                  onClick={() => handleToggle(item.id, item.completed)}
                  className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer select-none"
                >
                  <button
                    type="button"
                    aria-label={`Tandai ${item.title}`}
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      item.completed
                        ? 'bg-primary-container text-white border border-primary-container'
                        : 'border-[1.5px] border-outline-variant bg-white group-hover:border-primary'
                    }`}
                  >
                    {item.completed && <span className="material-symbols-outlined text-[14px]">check</span>}
                  </button>
                  <p
                    className={`text-[13px] leading-snug flex-1 ${
                      item.completed ? 'line-through text-on-surface-variant/65' : 'text-on-surface'
                    }`}
                  >
                    <span>{item.title}</span>
                    {seasonTag && (
                      <span className="ml-1.5 text-[11px] font-medium text-outline">
                        {seasonTag}
                      </span>
                    )}
                  </p>
                </div>

                {item.is_custom && (
                  <button
                    type="button"
                    aria-label="Hapus barang"
                    onClick={() => handleDelete(item.id)}
                    className="text-outline hover:text-error transition-colors p-0.5 shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Simple inline add packing item */}
        <form onSubmit={handleAddPackingItem} className="pt-3 mt-1 border-t border-surface-container/70 flex gap-2">
          <input
            type="text"
            value={newPackingTitle}
            onChange={(e) => setNewPackingTitle(e.target.value)}
            placeholder="Tambah barang bawaan lainnya..."
            className="flex-1 h-9.5 px-3 rounded-xl bg-surface-container-low text-[12.5px] text-on-surface placeholder:text-outline border border-surface-container focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={!newPackingTitle.trim()}
            className="h-9.5 px-3.5 rounded-xl bg-primary-container text-white text-[12px] font-bold disabled:opacity-40 transition-opacity shrink-0 cursor-pointer"
          >
            Tambah
          </button>
        </form>
      </div>
    </div>
  );
};
