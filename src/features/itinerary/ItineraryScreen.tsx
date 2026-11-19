import React, { useEffect, useState } from 'react';
import { db, type Trip, type ItineraryDay, type ItineraryItem } from '../../database/dexie';

export const ItineraryScreen: React.FC = () => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<(ItineraryDay & { items: ItineraryItem[] })[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ 'day-1': true, 'day-2': false });
  
  // Modals
  const [showAddDay, setShowAddDay] = useState(false);
  const [showAddItem, setShowAddItem] = useState<string | null>(null);
  const [newDayTitle, setNewDayTitle] = useState('');
  const [newDayCity, setNewDayCity] = useState('Tokyo');

  const [itemTitle, setItemTitle] = useState('');
  const [itemStartTime, setItemStartTime] = useState('09:00');
  const [itemLocation, setItemLocation] = useState('');
  const [itemCost, setItemCost] = useState('1000');
  const [itemNotes, setItemNotes] = useState('');
  const [isHalal, setIsHalal] = useState(false);

  async function loadData() {
    const allTrips = await db.trips.toArray();
    if (allTrips.length > 0) setTrip(allTrips[0]);

    const allDays = await db.itinerary_days.orderBy('day_number').toArray();
    const daysWithItems = await Promise.all(
      allDays.map(async (day) => {
        const items = await db.itinerary_items
          .where('day_id')
          .equals(day.id)
          .sortBy('sort_order');
        return { ...day, items };
      })
    );
    setDays(daysWithItems);
  }

  useEffect(() => {
    loadData();
  }, []);

  const toggleDayExpand = (dayId: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleToggleItemComplete = async (itemId: string, currentCompleted: boolean) => {
    await db.itinerary_items.update(itemId, { completed: !currentCompleted });
    loadData();
  };

  const handleAddDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayTitle.trim()) return;

    const nextDayNum = days.length + 1;
    const newDayId = `day-${Date.now()}`;
    await db.itinerary_days.add({
      id: newDayId,
      trip_id: trip?.id || 'trip-1',
      date: `2025-04-${11 + nextDayNum}`,
      day_number: nextDayNum,
      title: newDayTitle.trim(),
      city: newDayCity,
      theme: 'Custom Day',
    });

    setNewDayTitle('');
    setShowAddDay(false);
    setExpandedDays((prev) => ({ ...prev, [newDayId]: true }));
    loadData();
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !showAddItem) return;

    const targetDay = days.find((d) => d.id === showAddItem);
    const nextOrder = (targetDay?.items.length || 0) + 1;

    await db.itinerary_items.add({
      id: `item-${Date.now()}`,
      day_id: showAddItem,
      title: itemTitle.trim(),
      start_time: itemStartTime,
      location: itemLocation,
      notes: itemNotes,
      estimated_cost: parseFloat(itemCost) || 0,
      currency: 'JPY',
      completed: false,
      sort_order: nextOrder,
      is_halal_spot: isHalal,
    });

    setItemTitle('');
    setItemLocation('');
    setItemNotes('');
    setShowAddItem(null);
    loadData();
  };

  const totalCostJpy = days.reduce(
    (acc, day) => acc + day.items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0),
    0
  );
  const totalDestinations = days.reduce((acc, day) => acc + day.items.length, 0);

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* Trip Overview Header Card - Refined & Clear */}
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-surface-container/80 relative overflow-hidden">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary-fixed text-primary text-[10px] sm:text-[10.5px] font-bold">
                <span className="material-symbols-outlined text-[13px]">luggage</span>
                7 HARI TOUR
              </span>
              <span className="text-[11px] sm:text-[11.5px] text-on-surface-variant font-medium truncate">
                12 - 19 Apr 2025 • 2 Traveler
              </span>
            </div>
            <h1 className="text-[14px] sm:text-[15px] font-extrabold text-on-surface tracking-tight leading-snug">
              {trip?.name || 'Jelajah Tokyo, Kyoto & Osaka 2025'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowAddDay(true)}
              className="h-8.5 sm:h-9 px-3 rounded-xl bg-primary-container text-white text-[11px] sm:text-[11.5px] font-bold flex items-center gap-1 active:scale-95 shadow-2xs hover:bg-primary transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
              <span>Tambah</span>
            </button>
            <button
              onClick={() => alert('Fitur Ekspor PDF & JSON siap digunakan offline!')}
              title="Ekspor Jadwal"
              className="h-8.5 sm:h-9 px-2.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center gap-1 text-[11px] sm:text-[11.5px] font-bold active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
              <span className="hidden xs:inline">Ekspor</span>
            </button>
          </div>
        </div>

        {/* Integrated Quick Progress Info */}
        <div className="mt-3 pt-2.5 border-t border-surface-container/70 flex items-center justify-between text-[11px] sm:text-[11.5px]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed font-bold text-[10px] sm:text-[10.5px]">
              <span className="material-symbols-outlined text-[13px]">train</span> JR Pass Aktif
            </span>
            <span className="text-on-surface-variant font-semibold">
              • {totalDestinations} Destinasi Halal
            </span>
          </div>
          <div className="text-right">
            <span className="text-on-surface-variant font-medium">Est. </span>
            <span className="text-primary font-black text-[12.5px] sm:text-[13px]">
              ¥{new Intl.NumberFormat('ja-JP').format(totalCostJpy)}
            </span>
          </div>
        </div>
      </div>

      {/* Day-by-Day Feed */}
      <div className="flex flex-col space-y-3 sm:space-y-3.5">
        {days.map((day) => {
          const isExpanded = !!expandedDays[day.id];
          const dayCost = day.items.reduce((s, i) => s + (i.estimated_cost || 0), 0);

          return (
            <div
              key={day.id}
              className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all duration-200 border border-surface-container/80"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary-container text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                    <span className="text-[8px] uppercase tracking-wider leading-none">Day</span>
                    <span className="text-[14px] font-black leading-none mt-0.5">
                      {String(day.day_number).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-on-surface-variant font-medium">{day.date}</span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface text-[10.5px] font-bold">
                        {day.city || 'Tokyo'}
                      </span>
                    </div>
                    <h2 className="text-[13.5px] font-bold text-on-surface mt-0.5 truncate leading-snug">
                      {day.title}
                    </h2>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed text-[10.5px] font-bold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Siap
                </span>
              </div>

              {/* Quick stops overview */}
              <div className="bg-surface-container-low/80 rounded-xl px-2.5 py-1.5 mb-2.5 flex items-center gap-1.5 text-on-surface text-[11.5px] overflow-x-auto">
                {day.items.slice(0, 3).map((item, idx) => (
                  <React.Fragment key={item.id}>
                    {idx > 0 && (
                      <span className="material-symbols-outlined text-[13px] text-outline shrink-0">
                        arrow_forward
                      </span>
                    )}
                    <span className="shrink-0 truncate max-w-[120px] font-semibold text-on-surface">
                      {item.title}
                    </span>
                  </React.Fragment>
                ))}
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2.5 text-[11.5px] text-on-surface-variant font-medium">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">checklist</span>
                    {day.items.length} Aktivitas
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">payments</span>
                    ≈ ¥{new Intl.NumberFormat('ja-JP').format(dayCost)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleDayExpand(day.id)}
                    className="h-7 px-2.5 rounded-lg bg-surface-container text-[11.5px] text-primary font-bold flex items-center gap-0.5 hover:bg-surface-container-high transition-colors active:scale-95"
                  >
                    Detail
                    <span className="material-symbols-outlined text-[14px]">
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Expandable Activities Drawer */}
              {isExpanded && (
                <div className="mt-3 pt-2.5 space-y-2 border-t border-surface-container/70 animate-in fade-in">
                  {day.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItemComplete(item.id, item.completed)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors ${
                        item.completed
                          ? 'bg-surface-container-low/60 line-through opacity-70'
                          : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <button
                        type="button"
                        aria-label="Toggle Complete"
                        className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          item.completed
                            ? 'bg-primary-container text-white'
                            : 'border-[1.5px] border-outline-variant bg-white'
                        }`}
                      >
                        {item.completed && (
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[13px] font-bold text-on-surface leading-tight">{item.title}</p>
                          {item.is_halal_spot && (
                            <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-primary text-[10px] font-bold uppercase">
                              Halal
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] text-on-surface-variant mt-0.5 leading-tight">
                          {item.start_time} • {item.notes || item.location}
                        </p>
                      </div>
                      {item.estimated_cost ? (
                        <span className="text-[12px] font-extrabold text-primary shrink-0">
                          ¥{new Intl.NumberFormat('ja-JP').format(item.estimated_cost)}
                        </span>
                      ) : null}
                    </div>
                  ))}

                  <button
                    onClick={() => setShowAddItem(day.id)}
                    className="w-full h-9 rounded-xl bg-surface-container-high text-[12px] font-bold text-primary hover:bg-surface-container transition-colors flex items-center justify-center gap-1.5 mt-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Tambah Aktivitas
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* Modal: Tambah Hari */}
      {showAddDay && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-sm w-full p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-on-surface">Tambah Hari Perjalanan Baru</h3>
            <form onSubmit={handleAddDaySubmit} className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-on-surface block mb-1">Judul Hari</label>
                <input
                  type="text"
                  required
                  value={newDayTitle}
                  onChange={(e) => setNewDayTitle(e.target.value)}
                  placeholder="Misal: Wisata Kuliner Namba & Dotonbori"
                  className="w-full h-8.5 px-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface block mb-1">Kota</label>
                <select
                  value={newDayCity}
                  onChange={(e) => setNewDayCity(e.target.value)}
                  className="w-full h-8.5 px-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                >
                  <option value="Tokyo">Tokyo</option>
                  <option value="Kyoto">Kyoto</option>
                  <option value="Osaka">Osaka</option>
                  <option value="Nara">Nara</option>
                  <option value="Hokkaido">Hokkaido</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddDay(false)}
                  className="flex-1 h-8.5 rounded-lg bg-surface-container text-xs font-semibold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-8.5 rounded-lg bg-primary-container text-xs font-semibold text-white"
                >
                  Simpan Hari
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Aktivitas */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-sm w-full p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-on-surface">Tambah Aktivitas Destinasi</h3>
            <form onSubmit={handleAddItemSubmit} className="space-y-2.5">
              <div>
                <label className="text-[11px] font-semibold text-on-surface block mb-1">Nama Tempat / Aktivitas</label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Misal: teamLab Planets Tokyo"
                  className="w-full h-8.5 px-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-on-surface block mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={itemStartTime}
                    onChange={(e) => setItemStartTime(e.target.value)}
                    className="w-full h-8.5 px-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-on-surface block mb-1">Estimasi Biaya (¥)</label>
                  <input
                    type="number"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    placeholder="0"
                    className="w-full h-8.5 px-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-on-surface block mb-1">Catatan Lokasi</label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Tips booking atau akses transit"
                  className="w-full h-8.5 px-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="halalSpotCheck"
                  checked={isHalal}
                  onChange={(e) => setIsHalal(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-primary-container"
                />
                <label htmlFor="halalSpotCheck" className="text-[11px] text-on-surface font-medium cursor-pointer">
                  Titik Kuliner Ramah Muslim (Halal)
                </label>
              </div>
              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddItem(null)}
                  className="flex-1 h-8.5 rounded-lg bg-surface-container text-xs font-semibold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-8.5 rounded-lg bg-primary-container text-xs font-semibold text-white"
                >
                  Tambahkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
