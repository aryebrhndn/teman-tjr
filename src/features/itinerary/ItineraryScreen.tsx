import React, { useEffect, useState } from 'react';
import { db, type Trip, type ItineraryDay, type ItineraryItem } from '../../database/dexie';
import { MAIN_TRIP_ID } from '../../database/seed';
import { addDaysToIso, detectJapanSeason, formatIndonesianDate } from '../../utils/tripDates';
import { ConfirmModal } from '../../components/common/ConfirmModal';

type DayWithItems = ItineraryDay & { items: ItineraryItem[] };

export const ItineraryScreen: React.FC = () => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<DayWithItems[]>([]);
  const [rate, setRate] = useState<number>(114.14);

  // Inline Trip Name Edit
  const [isEditingTripName, setIsEditingTripName] = useState(false);
  const [tripNameInput, setTripNameInput] = useState('');

  // Inline Day Edit state
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [dayTitleInput, setDayTitleInput] = useState('');
  const [dayCityInput, setDayCityInput] = useState('');
  const [dayDateInput, setDayDateInput] = useState('');
  const [dayNotesInput, setDayNotesInput] = useState('');

  // Add / Edit Activity modal state
  const [activityModalDayId, setActivityModalDayId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemTime, setItemTime] = useState('09:00');
  const [itemLocation, setItemLocation] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [itemHalal, setItemHalal] = useState(false);

  // Confirm delete popups
  const [pendingDeleteDay, setPendingDeleteDay] = useState<DayWithItems | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ItineraryItem | null>(null);

  async function syncTripDateBounds(activeTrip: Trip | null, orderedDays: ItineraryDay[]) {
    if (!activeTrip) return;
    const total = Math.max(1, orderedDays.length);
    let depDate = activeTrip.departure_date || '';
    if (!depDate && orderedDays[0]?.date) {
      depDate = orderedDays[0].date;
    }
    const retDate = depDate ? addDaysToIso(depDate, total - 1) : '';
    const uniqueCities = Array.from(
      new Set(orderedDays.map((d) => (d.city || '').trim()).filter(Boolean))
    );
    const destination = uniqueCities.length > 0 ? uniqueCities.join(' – ') : 'Jepang';

    await db.trips.update(activeTrip.id, {
      departure_date: depDate,
      return_date: retDate,
      destination,
      season: depDate ? detectJapanSeason(depDate) : activeTrip.season,
      updated_at: new Date().toISOString(),
    });
  }

  async function loadData() {
    const rateSetting = await db.app_settings.get('exchange_rate');
    if (rateSetting && typeof rateSetting.value === 'number') {
      setRate(rateSetting.value);
    }

    let allTrips = await db.trips.toArray();
    let activeTrip = allTrips[0] || null;
    if (!activeTrip) {
      activeTrip = {
        id: MAIN_TRIP_ID,
        name: 'Perjalanan Jepang Saya',
        destination: 'Jepang',
        departure_date: '',
        return_date: '',
        season: 'spring',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.trips.put(activeTrip);
    }
    setTrip(activeTrip);
    setTripNameInput(activeTrip.name);

    let allDays = await db.itinerary_days.orderBy('day_number').toArray();
    // Always ensure at least 1 customizable day exists (never 7 hardcoded days)
    if (allDays.length === 0) {
      const firstDay: ItineraryDay = {
        id: 'day-1',
        trip_id: activeTrip.id,
        date: activeTrip.departure_date || '',
        day_number: 1,
        title: 'Hari Pertama di Jepang',
        city: 'Tokyo',
        notes: '',
        status: 'Dalam Rencana',
      };
      await db.itinerary_days.put(firstDay);
      allDays = [firstDay];
    }

    const withItems: DayWithItems[] = await Promise.all(
      allDays.map(async (day) => {
        const items = await db.itinerary_items.where('day_id').equals(day.id).sortBy('sort_order');
        return { ...day, items };
      })
    );
    setDays(withItems);
  }

  useEffect(() => {
    loadData();
  }, []);

  // --- TRIP NAME ---
  const handleSaveTripName = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tripNameInput.trim();
    if (!cleaned || !trip) return;
    await db.trips.update(trip.id, { name: cleaned, updated_at: new Date().toISOString() });
    setTrip({ ...trip, name: cleaned });
    setIsEditingTripName(false);
  };

  // --- DAY HANDLERS ---
  const handleStartEditDay = (day: ItineraryDay) => {
    setEditingDayId(day.id);
    setDayTitleInput(day.title || '');
    setDayCityInput(day.city || '');
    setDayDateInput(day.date || '');
    setDayNotesInput(day.notes || '');
  };

  const handleSaveEditDay = async (e: React.FormEvent, day: ItineraryDay) => {
    e.preventDefault();
    const updatedTitle = dayTitleInput.trim() || `Hari ${day.day_number}`;
    const updatedCity = dayCityInput.trim();

    await db.itinerary_days.update(day.id, {
      title: updatedTitle,
      city: updatedCity,
      date: dayDateInput,
      notes: dayNotesInput.trim(),
    });

    // If user edited Day 1's date, also sync trip.departure_date if it was empty (or Day 1 is anchor)
    if (day.day_number === 1 && dayDateInput && trip && !trip.departure_date) {
      await db.trips.update(trip.id, {
        departure_date: dayDateInput,
        season: detectJapanSeason(dayDateInput),
        updated_at: new Date().toISOString(),
      });
    }

    const updatedDays = await db.itinerary_days.orderBy('day_number').toArray();
    const freshTrips = await db.trips.toArray();
    await syncTripDateBounds(freshTrips[0] || null, updatedDays);

    setEditingDayId(null);
    loadData();
  };

  const handleAddNextDay = async () => {
    const nextNum = days.length + 1;
    const prevDay = days[days.length - 1];
    let suggestedDate = '';
    if (prevDay?.date) {
      suggestedDate = addDaysToIso(prevDay.date, 1);
    } else if (trip?.departure_date) {
      suggestedDate = addDaysToIso(trip.departure_date, nextNum - 1);
    }

    const newDayId = `day-${Date.now()}`;
    const newDay: ItineraryDay = {
      id: newDayId,
      trip_id: trip?.id || MAIN_TRIP_ID,
      day_number: nextNum,
      date: suggestedDate,
      title: `Hari ${nextNum}`,
      city: prevDay?.city || 'Tokyo',
      notes: '',
      status: 'Dalam Rencana',
    };

    await db.itinerary_days.add(newDay);
    const updatedDays = await db.itinerary_days.orderBy('day_number').toArray();
    await syncTripDateBounds(trip, updatedDays);
    await loadData();

    // Immediately open inline edit so user can customize nama, tujuan, tanggal for the new day
    handleStartEditDay(newDay);
  };

  const handleDeleteDay = (dayId: string) => {
    if (days.length <= 1) return;
    const targetDay = days.find((d) => d.id === dayId);
    if (!targetDay) return;
    setPendingDeleteDay(targetDay);
  };

  const confirmDeleteDay = async () => {
    if (!pendingDeleteDay) return;
    const dayId = pendingDeleteDay.id;

    await db.itinerary_items.where('day_id').equals(dayId).delete();
    await db.itinerary_days.delete(dayId);

    const remaining = await db.itinerary_days.orderBy('day_number').toArray();
    for (let i = 0; i < remaining.length; i++) {
      await db.itinerary_days.update(remaining[i].id, { day_number: i + 1 });
    }

    const reindexed = await db.itinerary_days.orderBy('day_number').toArray();
    await syncTripDateBounds(trip, reindexed);
    setPendingDeleteDay(null);
    setEditingDayId(null);
    loadData();
  };

  // --- ACTIVITY HANDLERS ---
  const handleOpenAddActivity = (dayId: string) => {
    setEditingItem(null);
    setActivityModalDayId(dayId);
    setItemTitle('');
    setItemTime('09:00');
    setItemLocation('');
    setItemCost('');
    setItemNotes('');
    setItemHalal(false);
  };

  const handleOpenEditActivity = (item: ItineraryItem) => {
    setEditingItem(item);
    setActivityModalDayId(item.day_id);
    setItemTitle(item.title);
    setItemTime(item.start_time || '');
    setItemLocation(item.location || '');
    setItemCost(item.estimated_cost ? item.estimated_cost.toString() : '');
    setItemNotes(item.notes || '');
    setItemHalal(!!item.is_halal_spot);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !activityModalDayId) return;

    const parsedCost = parseFloat(itemCost) || 0;

    if (editingItem) {
      await db.itinerary_items.update(editingItem.id, {
        title: itemTitle.trim(),
        start_time: itemTime,
        location: itemLocation.trim(),
        notes: itemNotes.trim(),
        estimated_cost: parsedCost,
        is_halal_spot: itemHalal,
      });
    } else {
      const targetDay = days.find((d) => d.id === activityModalDayId);
      const nextOrder = (targetDay?.items.length || 0) + 1;

      await db.itinerary_items.add({
        id: `item-${Date.now()}`,
        day_id: activityModalDayId,
        title: itemTitle.trim(),
        start_time: itemTime,
        location: itemLocation.trim(),
        notes: itemNotes.trim(),
        estimated_cost: parsedCost,
        currency: 'JPY',
        completed: false,
        sort_order: nextOrder,
        is_halal_spot: itemHalal,
      });
    }

    setActivityModalDayId(null);
    setEditingItem(null);
    loadData();
  };

  const handleToggleItem = async (item: ItineraryItem) => {
    await db.itinerary_items.update(item.id, { completed: !item.completed });
    loadData();
  };

  const handleDeleteActivity = (itemId: string) => {
    const found =
      editingItem && editingItem.id === itemId
        ? editingItem
        : days.flatMap((d) => d.items).find((it) => it.id === itemId) || null;
    if (found) setPendingDeleteItem(found);
  };

  const confirmDeleteActivity = async () => {
    if (!pendingDeleteItem) return;
    await db.itinerary_items.delete(pendingDeleteItem.id);
    setPendingDeleteItem(null);
    setActivityModalDayId(null);
    setEditingItem(null);
    loadData();
  };

  // Totals
  const totalItems = days.reduce((acc, d) => acc + d.items.length, 0);
  const totalCostJpy = days.reduce(
    (acc, d) => acc + d.items.reduce((s, it) => s + (it.estimated_cost || 0), 0),
    0
  );
  const totalCostIdr = Math.round(totalCostJpy * rate);

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));
  const formatJpy = (n: number) => new Intl.NumberFormat('ja-JP').format(Math.round(n));

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Clean Page Header */}
      <div className="px-0.5 pt-0.5">
        {isEditingTripName ? (
          <form onSubmit={handleSaveTripName} className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={tripNameInput}
              onChange={(e) => setTripNameInput(e.target.value)}
              placeholder="Nama perjalanan Anda..."
              className="flex-1 h-10 px-3 rounded-xl bg-white text-[15px] font-bold text-on-surface border border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="h-10 px-3.5 rounded-xl bg-primary-container text-white text-[12px] font-bold cursor-pointer"
            >
              Simpan
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
                className="px-1.5 py-0.5 rounded bg-primary-fixed/75 text-primary text-[11px] font-bold leading-none shrink-0"
              >
                旅程
              </span>
              <h1 className="text-[19px] sm:text-[21px] font-extrabold text-on-surface tracking-tight leading-tight truncate">
                {trip?.name || 'Perjalanan Jepang Saya'}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingTripName(true)}
              className="h-8 px-2.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary text-[11.5px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              <span>Ubah</span>
            </button>
          </div>
        )}
        <p className="text-[12.5px] text-on-surface-variant mt-1 leading-relaxed">
          Atur jadwal per hari sesuai rencana Anda. Tambah hari berikutnya kapan saja.
        </p>
      </div>

      {/* Compact Summary Strip */}
      <div className="bg-surface-container-lowest rounded-2xl px-4 py-3 border border-surface-container shadow-2xs flex items-center justify-between gap-2 text-[12px]">
        <div className="flex items-center gap-2 text-on-surface-variant font-medium">
          <span className="font-bold text-on-surface">{days.length} Hari</span>
          <span className="text-outline-variant">•</span>
          <span>{totalItems} Agenda</span>
        </div>
        <div className="text-right leading-tight">
          <span className="font-bold text-on-surface">¥ {formatJpy(totalCostJpy)}</span>
          {totalCostJpy > 0 && (
            <span className="text-[11px] text-on-surface-variant ml-1.5">
              (~Rp {formatRupiah(totalCostIdr)})
            </span>
          )}
        </div>
      </div>

      {/* Day Cards List */}
      <div className="space-y-3.5">
        {days.map((day) => {
          const isEditingThisDay = editingDayId === day.id;
          const dayCostJpy = day.items.reduce((sum, it) => sum + (it.estimated_cost || 0), 0);

          return (
            <div
              key={day.id}
              className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-surface-container shadow-2xs"
            >
              {/* Day Header or Inline Day Edit Form */}
              {isEditingThisDay ? (
                <form
                  onSubmit={(e) => handleSaveEditDay(e, day)}
                  className="space-y-3 pb-3 mb-3 border-b border-surface-container"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Edit Hari {day.day_number}
                    </span>
                    {days.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDay(day.id)}
                        className="text-[11.5px] font-semibold text-error hover:underline cursor-pointer"
                      >
                        Hapus Hari
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                      Nama / Judul Hari
                    </label>
                    <input
                      type="text"
                      required
                      value={dayTitleInput}
                      onChange={(e) => setDayTitleInput(e.target.value)}
                      placeholder="Contoh: Tiba di Tokyo & Jalan-jalan Shinjuku"
                      className="w-full h-10 px-3 rounded-xl bg-white text-[13px] text-on-surface border border-outline-variant/70 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                        Kemana / Kota Tujuan
                      </label>
                      <input
                        type="text"
                        value={dayCityInput}
                        onChange={(e) => setDayCityInput(e.target.value)}
                        placeholder="Contoh: Tokyo, Kyoto, Osaka..."
                        className="w-full h-10 px-3 rounded-xl bg-white text-[13px] text-on-surface border border-outline-variant/70 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                        Tanggal
                      </label>
                      <input
                        type="date"
                        value={dayDateInput}
                        onChange={(e) => setDayDateInput(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl bg-white text-[13px] text-on-surface border border-outline-variant/70 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                      Catatan Hari (Opsional)
                    </label>
                    <input
                      type="text"
                      value={dayNotesInput}
                      onChange={(e) => setDayNotesInput(e.target.value)}
                      placeholder="Misal: Check-in hotel jam 15:00, pakai kereta JR"
                      className="w-full h-10 px-3 rounded-xl bg-white text-[13px] text-on-surface border border-outline-variant/70 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingDayId(null)}
                      className="flex-1 h-9.5 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-9.5 rounded-xl bg-primary-container text-[12px] font-bold text-white cursor-pointer"
                    >
                      Simpan Hari
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-surface-container/80">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-on-surface-variant">
                      <span className="px-2 py-0.5 rounded-md bg-primary-fixed text-primary font-bold">
                        Hari {day.day_number}
                      </span>
                      {day.city && (
                        <>
                          <span>•</span>
                          <span className="text-on-surface font-bold">{day.city}</span>
                        </>
                      )}
                      {day.date && (
                        <>
                          <span>•</span>
                          <span>{formatIndonesianDate(day.date)}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-[15px] font-bold text-on-surface mt-1.5 leading-snug">
                      {day.title || `Hari ${day.day_number}`}
                    </h2>
                    {day.notes && (
                      <p className="text-[12px] text-on-surface-variant mt-0.5 leading-relaxed">
                        {day.notes}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartEditDay(day)}
                    className="h-8 px-2.5 rounded-lg bg-surface-container-low border border-surface-container text-[11.5px] font-semibold text-on-surface-variant hover:text-primary shrink-0 cursor-pointer transition-colors"
                  >
                    Ubah
                  </button>
                </div>
              )}

              {/* Agenda Items List */}
              {day.items.length > 0 ? (
                <div className="divide-y divide-surface-container/70 mt-1">
                  {day.items.map((item) => (
                    <div key={item.id} className="py-3 flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item)}
                        aria-label={`Tandai ${item.title}`}
                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          item.completed
                            ? 'bg-primary-container text-white border border-primary-container'
                            : 'border-[1.5px] border-outline-variant bg-white hover:border-primary'
                        }`}
                      >
                        {item.completed && <span className="material-symbols-outlined text-[14px]">check</span>}
                      </button>

                      <div
                        onClick={() => handleOpenEditActivity(item)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.start_time && (
                            <span className="text-[11px] font-bold text-primary tabular-nums">
                              {item.start_time}
                            </span>
                          )}
                          <span
                            className={`text-[13px] font-semibold leading-snug ${
                              item.completed ? 'line-through text-on-surface-variant/65' : 'text-on-surface'
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.is_halal_spot && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              Halal
                            </span>
                          )}
                        </div>

                        {(item.location || item.notes) && (
                          <p className="text-[11.5px] text-on-surface-variant mt-0.5 leading-snug">
                            {[item.location, item.notes].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>

                      {item.estimated_cost ? (
                        <span className="text-[11.5px] font-bold text-on-surface-variant shrink-0 tabular-nums mt-0.5">
                          ¥{formatJpy(item.estimated_cost)}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-[12px] text-on-surface-variant text-center">
                  Belum ada agenda di hari ini.
                </p>
              )}

              {/* Day Footer: Add Activity (Consistent Modal Trigger) + Day Subtotal */}
              <div className="pt-2.5 mt-1 border-t border-surface-container/70 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddActivity(day.id)}
                  className="h-8.5 px-3.5 rounded-xl bg-primary-container text-white text-[12px] font-bold inline-flex items-center justify-center gap-1 shadow-2xs hover:brightness-105 active:scale-95 transition-all shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Tambah agenda</span>
                </button>
                {dayCostJpy > 0 && (
                  <span className="text-[11px] font-semibold text-on-surface-variant">
                    Subtotal: ¥{formatJpy(dayCostJpy)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Next Day Button */}
      <button
        type="button"
        onClick={handleAddNextDay}
        className="w-full h-11 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low text-primary text-[13px] font-bold border border-dashed border-outline-variant flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>Tambah Hari {days.length + 1}</span>
      </button>

      {/* Clean Modal: Tambah / Edit Agenda */}
      {activityModalDayId && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-3.5 border border-surface-container">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-on-surface">
                {editingItem ? 'Ubah Agenda' : 'Tambah Agenda'}
              </h3>
              {editingItem && (
                <button
                  type="button"
                  onClick={() => handleDeleteActivity(editingItem.id)}
                  className="text-[11.5px] font-semibold text-error hover:underline cursor-pointer"
                >
                  Hapus
                </button>
              )}
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3">
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                  Nama Kegiatan / Tempat
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Contoh: Sensoji Temple & Asakusa"
                  className="w-full h-10 px-3 rounded-xl bg-white text-[13px] border border-outline-variant/70 focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                    Jam (Opsional)
                  </label>
                  <input
                    type="time"
                    value={itemTime}
                    onChange={(e) => setItemTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white text-[13px] border border-outline-variant/70 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                    Estimasi (¥)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    placeholder="0"
                    className="w-full h-10 px-3 rounded-xl bg-white text-[13px] border border-outline-variant/70 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                  Lokasi / Area
                </label>
                <input
                  type="text"
                  value={itemLocation}
                  onChange={(e) => setItemLocation(e.target.value)}
                  placeholder="Contoh: Taito City, Tokyo"
                  className="w-full h-10 px-3 rounded-xl bg-white text-[13px] border border-outline-variant/70 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Misal: Naik Ginza Line, turun Stasiun Asakusa"
                  className="w-full h-10 px-3 rounded-xl bg-white text-[13px] border border-outline-variant/70 focus:outline-none focus:border-primary"
                />
              </div>

              <label className="flex items-center gap-2 pt-0.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={itemHalal}
                  onChange={(e) => setItemHalal(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-[12.5px] text-on-surface font-medium">
                  Spot kuliner halal / ramah muslim
                </span>
              </label>

              <div className="flex gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActivityModalDayId(null);
                    setEditingItem(null);
                  }}
                  className="flex-1 h-10 rounded-xl bg-surface-container text-[12.5px] font-bold text-on-surface cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-primary-container text-[12.5px] font-bold text-white cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!pendingDeleteDay}
        title="Hapus Hari Ini?"
        message={
          pendingDeleteDay
            ? `Hari ${pendingDeleteDay.day_number}${pendingDeleteDay.title ? ` (${pendingDeleteDay.title})` : ''} beserta semua agenda di dalamnya akan dihapus.`
            : ''
        }
        confirmLabel="Hapus Hari"
        onConfirm={confirmDeleteDay}
        onCancel={() => setPendingDeleteDay(null)}
      />

      <ConfirmModal
        open={!!pendingDeleteItem}
        title="Hapus Agenda?"
        message={
          pendingDeleteItem
            ? `Agenda "${pendingDeleteItem.title}" akan dihapus dari rencana perjalanan.`
            : ''
        }
        confirmLabel="Hapus"
        onConfirm={confirmDeleteActivity}
        onCancel={() => setPendingDeleteItem(null)}
      />
    </div>
  );
};
