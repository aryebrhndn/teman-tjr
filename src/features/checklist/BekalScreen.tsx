import React, { useEffect, useState } from 'react';
import { db, type ChecklistItem, type Trip } from '../../database/dexie';
import { MAIN_TRIP_ID } from '../../database/seed';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import {
  ALL_DEFAULT_CHECKLIST,
  DEFAULT_PACKING_SUBLISTS,
  type PackingSublist,
} from '../../data/bekalDefaults';
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
  const [sublists, setSublists] = useState<PackingSublist[]>(DEFAULT_PACKING_SUBLISTS);
  const [collapsedSublists, setCollapsedSublists] = useState<Record<string, boolean>>({});
  const [sublistDrafts, setSublistDrafts] = useState<Record<string, string>>({});

  const [trip, setTrip] = useState<Trip | null>(null);
  const [totalDays, setTotalDays] = useState<number>(1);
  const [departureDate, setDepartureDate] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<SeasonFilter>('all');

  // Bottom quick add ("Barang tambahan") & Add new sub-list
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [showAddSublist, setShowAddSublist] = useState(false);
  const [newSublistName, setNewSublistName] = useState('');
  const [pendingDeleteSublist, setPendingDeleteSublist] = useState<PackingSublist | null>(null);
  const [infoAlertMessage, setInfoAlertMessage] = useState<string | null>(null);

  async function loadData() {
    let allItems = await db.checklist_items.orderBy('sort_order').toArray();
    if (allItems.length === 0) {
      for (const item of ALL_DEFAULT_CHECKLIST) {
        await db.checklist_items.put(item);
      }
      allItems = await db.checklist_items.orderBy('sort_order').toArray();
    }
    setItems(allItems);

    const savedSublists = await db.app_settings.get('packing_sublists');
    if (savedSublists && Array.isArray(savedSublists.value) && savedSublists.value.length > 0) {
      setSublists(savedSublists.value as PackingSublist[]);
    } else {
      await db.app_settings.put({
        key: 'packing_sublists',
        value: DEFAULT_PACKING_SUBLISTS,
        updated_at: new Date().toISOString(),
      });
      setSublists(DEFAULT_PACKING_SUBLISTS);
    }

    const allTrips = await db.trips.toArray();
    const activeTrip = allTrips[0] || null;
    setTrip(activeTrip);

    const allDays = await db.itinerary_days.orderBy('day_number').toArray();
    setTotalDays(Math.max(1, allDays.length));

    const savedDate = activeTrip?.departure_date || '';
    setDepartureDate(savedDate);

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

  const persistSublists = async (next: PackingSublist[]) => {
    setSublists(next);
    await db.app_settings.put({
      key: 'packing_sublists',
      value: next,
      updated_at: new Date().toISOString(),
    });
  };

  const handleDepartureDateChange = async (newDate: string) => {
    setDepartureDate(newDate);

    const detectedSeason = newDate ? detectJapanSeason(newDate) : 'spring';
    const allDays = await db.itinerary_days.orderBy('day_number').toArray();
    const dayCount = Math.max(1, allDays.length);
    const computedReturnDate = newDate ? addDaysToIso(newDate, dayCount - 1) : '';

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

    if (newDate && allDays.length > 0) {
      for (let i = 0; i < allDays.length; i++) {
        const dayIso = addDaysToIso(newDate, i);
        await db.itinerary_days.update(allDays[i].id, { date: dayIso });
      }
    }

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

  const handleDeleteItem = async (id: string) => {
    await db.checklist_items.delete(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddItemToSublist = async (sublist: PackingSublist, rawTitle: string) => {
    const title = rawTitle.trim();
    if (!title) return;

    const newItem: ChecklistItem = {
      id: `pk-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      section: 'packing',
      group: sublist.name,
      category: 'Travel Accessories',
      title,
      completed: false,
      sort_order: items.length + 300,
      is_custom: true,
      season: sublist.season,
    };

    await db.checklist_items.add(newItem);
    setItems((prev) => [...prev, newItem]);
  };

  const handleSublistDraftSubmit = async (e: React.FormEvent, sublist: PackingSublist) => {
    e.preventDefault();
    const val = sublistDrafts[sublist.id] || '';
    if (!val.trim()) return;
    await handleAddItemToSublist(sublist, val);
    setSublistDrafts((prev) => ({ ...prev, [sublist.id]: '' }));
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = quickAddTitle.trim();
    if (!val) return;

    // Add to "Lain-lain" if it exists, otherwise the last visible sublist (or create Lain-lain)
    let target = sublists.find((s) => s.name.toLowerCase() === 'lain-lain') || visibleSublists[visibleSublists.length - 1];
    if (!target) {
      target = { id: `sub-${Date.now()}`, name: 'Lain-lain', season: 'all' };
      await persistSublists([...sublists, target]);
    }
    await handleAddItemToSublist(target, val);
    setCollapsedSublists((prev) => ({ ...prev, [target!.id]: false }));
    setQuickAddTitle('');
  };

  const handleCreateSublist = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSublistName.trim();
    if (!name) return;

    if (sublists.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setInfoAlertMessage('Nama sub-list tersebut sudah ada. Silakan gunakan nama lain.');
      return;
    }

    const newSub: PackingSublist = {
      id: `sub-${Date.now()}`,
      name,
      season: 'all',
    };

    await persistSublists([...sublists, newSub]);
    setCollapsedSublists((prev) => ({ ...prev, [newSub.id]: false }));
    setNewSublistName('');
    setShowAddSublist(false);
  };

  const handleDeleteSublist = (sublist: PackingSublist) => {
    setPendingDeleteSublist(sublist);
  };

  const confirmDeleteSublist = async () => {
    if (!pendingDeleteSublist) return;
    const sublist = pendingDeleteSublist;

    const toDelete = items
      .filter((i) => i.section === 'packing' && (i.group || 'Lain-lain') === sublist.name)
      .map((i) => i.id);

    for (const id of toDelete) {
      await db.checklist_items.delete(id);
    }

    setItems((prev) => prev.filter((i) => !toDelete.includes(i.id)));
    await persistSublists(sublists.filter((s) => s.id !== sublist.id));
    setPendingDeleteSublist(null);
  };

  const toggleSublistCollapse = (subId: string) => {
    setCollapsedSublists((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  // Partition into Timeline vs Packing
  const timelineItems = items.filter(
    (i) => i.section === 'timeline' || (!i.section && typeof i.days_before_departure === 'number')
  );
  const allPackingItems = items.filter(
    (i) => i.section === 'packing' || (!i.section && typeof i.days_before_departure !== 'number')
  );

  // Filter sublists based on selected season
  const visibleSublists = sublists.filter((sub) => {
    if (selectedSeason === 'all') return true;
    return sub.season === 'all' || sub.season === selectedSeason;
  });

  const visibleSublistNames = new Set(visibleSublists.map((s) => s.name));
  const visiblePackingItems = allPackingItems.filter((i) =>
    visibleSublistNames.has(i.group || 'Lain-lain')
  );

  const timelineCompleted = timelineItems.filter((i) => i.completed).length;
  const timelinePercent =
    timelineItems.length > 0 ? Math.round((timelineCompleted / timelineItems.length) * 100) : 0;

  const packingCompleted = visiblePackingItems.filter((i) => i.completed).length;
  const packingPercent =
    visiblePackingItems.length > 0 ? Math.round((packingCompleted / visiblePackingItems.length) * 100) : 0;

  const tripStatus = getTripStatusInfo(departureDate, totalDays, trip?.season);

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Page Title */}
      <div className="px-0.5 pt-0.5">
        <div className="flex items-center gap-2">
          <span
            style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
            className="px-1.5 py-0.5 rounded bg-primary-fixed/75 text-primary text-[11px] font-bold leading-none shrink-0"
          >
            準備
          </span>
          <h1 className="text-[19px] sm:text-[21px] font-extrabold text-on-surface tracking-tight leading-tight">
            Persiapan &amp; Bekal
          </h1>
        </div>
        <p className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
          Atur tanggal berangkat, lalu centang persiapan dan barang bawaan.
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

        <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-3 mb-1">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-300"
            style={{ width: `${timelinePercent}%` }}
          />
        </div>

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

      {/* Card 3: Packing list (Terstruktur per Sub-list, Fleksibel Tambah/Hapus Sub-list & Item) */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container shadow-2xs space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[16px] font-bold text-on-surface">Packing list</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11.5px] font-bold tabular-nums">
              {packingPercent}%
            </span>
          </div>
          <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-primary-container rounded-full transition-all duration-300"
              style={{ width: `${packingPercent}%` }}
            />
          </div>
        </div>

        {/* Sub-lists */}
        <div className="space-y-4">
          {visibleSublists.map((sublist) => {
            const subItems = allPackingItems.filter(
              (i) => (i.group || 'Lain-lain') === sublist.name
            );
            const isCollapsed = !!collapsedSublists[sublist.id];
            const draftVal = sublistDrafts[sublist.id] || '';

            return (
              <div key={sublist.id} className="space-y-1">
                {/* Sub-list Header */}
                <div className="flex items-center justify-between gap-2 py-1">
                  <button
                    type="button"
                    onClick={() => toggleSublistCollapse(sublist.id)}
                    className="flex items-center gap-1.5 text-left min-w-0 flex-1 cursor-pointer group"
                  >
                    <span className="text-[13.5px] font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                      {sublist.name}
                    </span>
                    <span className="text-[12px] font-medium text-outline shrink-0">
                      · {subItems.length}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteSublist(sublist)}
                      title={`Hapus sub-list ${sublist.name}`}
                      aria-label={`Hapus sub-list ${sublist.name}`}
                      className="w-6 h-6 rounded-md text-outline hover:text-error hover:bg-error-container/20 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSublistCollapse(sublist.id)}
                      aria-label={isCollapsed ? 'Buka sub-list' : 'Tutup sub-list'}
                      className="w-6 h-6 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center text-[15px] font-bold cursor-pointer transition-colors"
                    >
                      {isCollapsed ? '+' : '−'}
                    </button>
                  </div>
                </div>

                {/* Sub-list Items + Inline Add Item */}
                {!isCollapsed && (
                  <div>
                    <div className="divide-y divide-surface-container/70">
                      {subItems.map((item) => (
                        <div
                          key={item.id}
                          className="py-2.5 flex items-center justify-between gap-2.5 group"
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
                              {item.completed && (
                                <span className="material-symbols-outlined text-[14px]">check</span>
                              )}
                            </button>
                            <span
                              className={`text-[13px] leading-snug flex-1 ${
                                item.completed
                                  ? 'line-through text-on-surface-variant/65'
                                  : 'text-on-surface'
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            aria-label={`Hapus ${item.title}`}
                            className="text-outline/70 hover:text-error p-0.5 transition-colors shrink-0 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Inline add inside this specific sub-list */}
                    <form
                      onSubmit={(e) => handleSublistDraftSubmit(e, sublist)}
                      className="pt-2 pb-1 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={draftVal}
                        onChange={(e) =>
                          setSublistDrafts((prev) => ({ ...prev, [sublist.id]: e.target.value }))
                        }
                        placeholder={`+ Tambah item di ${sublist.name}...`}
                        className="flex-1 h-8.5 px-3 rounded-lg bg-surface-container-low/70 text-[12px] text-on-surface placeholder:text-outline border border-surface-container focus:outline-none focus:border-primary"
                      />
                      {draftVal.trim() && (
                        <button
                          type="submit"
                          className="h-8.5 px-3 rounded-lg bg-primary-container text-white text-[11.5px] font-bold shrink-0 cursor-pointer"
                        >
                          Tambah
                        </button>
                      )}
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Quick Add Bar ("Barang tambahan" + "+ Tambah") ala Hitori Companion */}
        <div className="pt-3 border-t border-surface-container space-y-2.5">
          <form onSubmit={handleQuickAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              placeholder="Barang tambahan"
              className="w-full h-10 px-3.5 rounded-xl bg-white text-[13px] text-on-surface placeholder:text-outline border border-outline-variant/70 focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!quickAddTitle.trim()}
              className="w-full h-10 rounded-xl bg-white hover:bg-surface-container-low text-on-surface text-[13px] font-bold border border-on-surface/70 disabled:opacity-45 transition-colors cursor-pointer"
            >
              + Tambah
            </button>
          </form>

          {/* Add New Sub-list */}
          {showAddSublist ? (
            <form onSubmit={handleCreateSublist} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                autoFocus
                value={newSublistName}
                onChange={(e) => setNewSublistName(e.target.value)}
                placeholder="Nama sub-list baru (mis. Oleh-oleh, Kamera)"
                className="flex-1 h-9.5 px-3 rounded-xl bg-white text-[12.5px] text-on-surface placeholder:text-outline border border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newSublistName.trim()}
                className="h-9.5 px-3.5 rounded-xl bg-primary-container text-white text-[12px] font-bold disabled:opacity-40 cursor-pointer shrink-0"
              >
                Buat
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddSublist(false);
                  setNewSublistName('');
                }}
                className="h-9.5 px-2.5 rounded-xl bg-surface-container text-on-surface-variant text-[12px] font-bold cursor-pointer shrink-0"
              >
                Batal
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddSublist(true)}
              className="w-full h-9.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-[12px] font-bold border border-dashed border-outline-variant flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">create_new_folder</span>
              <span>Tambah Sub-list Baru</span>
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDeleteSublist}
        title="Hapus Sub-list?"
        message={
          pendingDeleteSublist
            ? `Sub-list "${pendingDeleteSublist.name}" beserta semua item di dalamnya akan dihapus.`
            : ''
        }
        confirmLabel="Hapus"
        onConfirm={confirmDeleteSublist}
        onCancel={() => setPendingDeleteSublist(null)}
      />

      <ConfirmModal
        open={!!infoAlertMessage}
        title="Perhatian"
        message={infoAlertMessage || ''}
        confirmLabel="Mengerti"
        hideCancel
        icon="info"
        onConfirm={() => setInfoAlertMessage(null)}
        onCancel={() => setInfoAlertMessage(null)}
      />
    </div>
  );
};
