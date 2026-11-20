import React, { useEffect, useState } from 'react';
import { db, type Trip, type ItineraryDay, type ItineraryItem } from '../../database/dexie';

const OPEN_TRIP_ID = 'trip-jp-2025-01';
const PRIVATE_TRIP_ID = 'trip-private-custom';

export const ItineraryScreen: React.FC = () => {
  const [tripType, setTripType] = useState<'open' | 'private'>('open');
  const [openTrip, setOpenTrip] = useState<Trip | null>(null);

  const [openDays, setOpenDays] = useState<(ItineraryDay & { items: ItineraryItem[] })[]>([]);
  const [privateDays, setPrivateDays] = useState<(ItineraryDay & { items: ItineraryItem[] })[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ 'day-1': true, 'pday-1': true });

  // Rate for IDR conversion
  const [rate, setRate] = useState<number>(114.14);

  // Modals for Private Trip
  const [showAddDay, setShowAddDay] = useState(false);
  const [editingDay, setEditingDay] = useState<ItineraryDay | null>(null);

  // Modals for Activity
  const [showAddItemDayId, setShowAddItemDayId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);

  // Add/Edit Day form state
  const [dayTitle, setDayTitle] = useState('');
  const [dayCity, setDayCity] = useState('Tokyo');
  const [dayDate, setDayDate] = useState('2025-04-12');
  const [dayStatus, setDayStatus] = useState<'Siap' | 'Dalam Rencana' | 'Selesai'>('Siap');

  // Add/Edit Item form state
  const [itemTitle, setItemTitle] = useState('');
  const [itemStartTime, setItemStartTime] = useState('09:00');
  const [itemLocation, setItemLocation] = useState('');
  const [itemCost, setItemCost] = useState('1000');
  const [itemNotes, setItemNotes] = useState('');
  const [isHalal, setIsHalal] = useState(false);

  // Modal Edit Trip Name
  const [showEditTripModal, setShowEditTripModal] = useState(false);
  const [tripCustomName, setTripCustomName] = useState('Private Trip Keluarga Jepang 2025');

  async function loadData() {
    const rateSetting = await db.app_settings.get('exchange_rate');
    if (rateSetting && typeof rateSetting.value === 'number') {
      setRate(rateSetting.value);
    }

    // 1. Load Open Trip
    const allTrips = await db.trips.toArray();
    const foundOpen = allTrips.find((t) => t.id === OPEN_TRIP_ID) || allTrips[0] || null;
    setOpenTrip(foundOpen);

    const allDays = await db.itinerary_days.orderBy('day_number').toArray();
    const openDaysRaw = allDays.filter((d) => d.trip_id !== PRIVATE_TRIP_ID);
    const openWithItems = await Promise.all(
      openDaysRaw.map(async (day) => {
        const items = await db.itinerary_items.where('day_id').equals(day.id).sortBy('sort_order');
        return { ...day, items };
      })
    );
    setOpenDays(openWithItems);

    // 2. Load Private Trip
    let privDaysRaw = allDays.filter((d) => d.trip_id === PRIVATE_TRIP_ID);

    // If private trip has no days yet, initialize starting custom days
    if (privDaysRaw.length === 0) {
      const defaultPrivateDays: Omit<ItineraryDay, 'id'>[] = [
        {
          trip_id: PRIVATE_TRIP_ID,
          date: '2025-04-12',
          day_number: 1,
          title: 'Tiba di Tokyo & Istirahat di Hotel',
          city: 'Tokyo',
          theme: 'Kedatangan',
          status: 'Siap',
          notes: 'Penjemputan bandara dengan Alphard/Hiace, check-in hotel dan makan malam santai.',
        },
        {
          trip_id: PRIVATE_TRIP_ID,
          date: '2025-04-13',
          day_number: 2,
          title: 'Private Van Tour: Danau Kawaguchiko & Gunung Fuji',
          city: 'Fuji & Hakone',
          theme: 'Wisata Alam & Pemandangan',
          status: 'Siap',
          notes: 'Full day sewa mobil ke area Fuji, spot foto Oishi Park, dan kuliner halal.',
        },
        {
          trip_id: PRIVATE_TRIP_ID,
          date: '2025-04-14',
          day_number: 3,
          title: 'Eksplorasi Kota: Asakusa, Akihabara & Shibuya',
          city: 'Tokyo',
          theme: 'Belanja & Budaya',
          status: 'Dalam Rencana',
          notes: 'Belanja oleh-oleh, sewa kimono di Sensoji, dan sunset di Shibuya Sky.',
        },
        {
          trip_id: PRIVATE_TRIP_ID,
          date: '2025-04-15',
          day_number: 4,
          title: 'Hari Bebas Keluarga: Tokyo DisneySea',
          city: 'Tokyo',
          theme: 'Taman Hiburan',
          status: 'Dalam Rencana',
          notes: 'Seharian penuh wahana ramah anak di DisneySea Tokyo.',
        },
      ];

      for (let i = 0; i < defaultPrivateDays.length; i++) {
        const dId = `pday-${i + 1}`;
        await db.itinerary_days.add({
          id: dId,
          ...defaultPrivateDays[i],
        });

        // Add sample items
        if (i === 0) {
          await db.itinerary_items.add({
            id: `pitem-1-1`,
            day_id: dId,
            title: 'Penjemputan Bandara Haneda dengan Private Van',
            start_time: '09:00',
            location: 'Haneda Airport T3',
            notes: 'Driver standby di lobby kedatangan',
            estimated_cost: 0,
            currency: 'JPY',
            completed: true,
            sort_order: 1,
            is_halal_spot: false,
          });
          await db.itinerary_items.add({
            id: `pitem-1-2`,
            day_id: dId,
            title: 'Makan Siang Halal Ramen & Check-in Hotel',
            start_time: '12:00',
            location: 'Shinjuku',
            notes: 'Ayam-ya Halal Ramen Shinjuku',
            estimated_cost: 1500,
            currency: 'JPY',
            completed: true,
            sort_order: 2,
            is_halal_spot: true,
          });
        } else if (i === 1) {
          await db.itinerary_items.add({
            id: `pitem-2-1`,
            day_id: dId,
            title: 'Oishi Park & Danau Kawaguchiko (View Gunung Fuji)',
            start_time: '10:30',
            location: 'Lake Kawaguchi',
            notes: 'Foto bunga sakura & pemandangan Gunung Fuji',
            estimated_cost: 1000,
            currency: 'JPY',
            completed: false,
            sort_order: 1,
            is_halal_spot: false,
          });
          await db.itinerary_items.add({
            id: `pitem-2-2`,
            day_id: dId,
            title: 'Makan Siang Halal Hoto Fudo Noodle',
            start_time: '13:00',
            location: 'Kawaguchiko',
            notes: 'Sup hoto khas pegunungan Fuji',
            estimated_cost: 2000,
            currency: 'JPY',
            completed: false,
            sort_order: 2,
            is_halal_spot: true,
          });
        }
      }

      privDaysRaw = await db.itinerary_days.where('trip_id').equals(PRIVATE_TRIP_ID).sortBy('day_number');
    }

    const privWithItems = await Promise.all(
      privDaysRaw.map(async (day) => {
        const items = await db.itinerary_items.where('day_id').equals(day.id).sortBy('sort_order');
        return { ...day, items };
      })
    );
    setPrivateDays(privWithItems);

    // Load private trip name if stored
    const savedPrivateName = localStorage.getItem('tjr_private_trip_name');
    if (savedPrivateName) {
      setTripCustomName(savedPrivateName);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const currentDays = tripType === 'open' ? openDays : privateDays;

  const toggleDayExpand = (dayId: string) => {
    setExpandedDays((prev) => ({ ...prev, [dayId]: !prev[dayId] }));
  };

  const handleToggleItemComplete = async (itemId: string, currentCompleted: boolean) => {
    await db.itinerary_items.update(itemId, { completed: !currentCompleted });
    loadData();
  };

  // --- PRIVATE TRIP HANDLERS ---
  const handleOpenAddDay = () => {
    const nextNum = privateDays.length + 1;
    setDayTitle(`Hari ${nextNum}: Rencana Wisata`);
    setDayCity('Tokyo');
    setDayDate(`2025-04-${11 + nextNum}`);
    setDayStatus('Dalam Rencana');
    setShowAddDay(true);
  };

  const handleAddDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dayTitle.trim()) return;

    const nextDayNum = privateDays.length + 1;
    const newDayId = `pday-${Date.now()}`;

    await db.itinerary_days.add({
      id: newDayId,
      trip_id: PRIVATE_TRIP_ID,
      date: dayDate,
      day_number: nextDayNum,
      title: dayTitle.trim(),
      city: dayCity,
      theme: 'Custom Day',
      status: dayStatus,
    });

    setShowAddDay(false);
    setExpandedDays((prev) => ({ ...prev, [newDayId]: true }));
    loadData();
  };

  const handleOpenEditDay = (day: ItineraryDay) => {
    setEditingDay(day);
    setDayTitle(day.title || '');
    setDayCity(day.city || 'Tokyo');
    setDayDate(day.date || '2025-04-12');
    setDayStatus((day.status as any) || 'Siap');
  };

  const handleEditDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDay || !dayTitle.trim()) return;

    await db.itinerary_days.update(editingDay.id, {
      title: dayTitle.trim(),
      city: dayCity,
      date: dayDate,
      status: dayStatus,
    });

    setEditingDay(null);
    loadData();
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!window.confirm('Hapus hari ini beserta seluruh daftar aktivitas di dalamnya?')) return;

    // Delete day and items
    await db.itinerary_items.where('day_id').equals(dayId).delete();
    await db.itinerary_days.delete(dayId);

    // Re-index day_number
    const remaining = await db.itinerary_days.where('trip_id').equals(PRIVATE_TRIP_ID).sortBy('day_number');
    for (let i = 0; i < remaining.length; i++) {
      await db.itinerary_days.update(remaining[i].id, { day_number: i + 1 });
    }

    setEditingDay(null);
    loadData();
  };

  // --- ITEM / DESTINATION HANDLERS ---
  const handleOpenAddItem = (dayId: string) => {
    setShowAddItemDayId(dayId);
    setItemTitle('');
    setItemStartTime('09:00');
    setItemLocation('');
    setItemCost('1000');
    setItemNotes('');
    setIsHalal(false);
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !showAddItemDayId) return;

    const targetDay = currentDays.find((d) => d.id === showAddItemDayId);
    const nextOrder = (targetDay?.items.length || 0) + 1;

    await db.itinerary_items.add({
      id: `item-${Date.now()}`,
      day_id: showAddItemDayId,
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

    setShowAddItemDayId(null);
    loadData();
  };

  const handleOpenEditItem = (item: ItineraryItem) => {
    setEditingItem(item);
    setItemTitle(item.title);
    setItemStartTime(item.start_time || '09:00');
    setItemLocation(item.location || '');
    setItemCost((item.estimated_cost || 0).toString());
    setItemNotes(item.notes || '');
    setIsHalal(!!item.is_halal_spot);
  };

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !itemTitle.trim()) return;

    await db.itinerary_items.update(editingItem.id, {
      title: itemTitle.trim(),
      start_time: itemStartTime,
      location: itemLocation,
      notes: itemNotes,
      estimated_cost: parseFloat(itemCost) || 0,
      is_halal_spot: isHalal,
    });

    setEditingItem(null);
    loadData();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Hapus aktivitas / tempat ini?')) return;
    await db.itinerary_items.delete(itemId);
    setEditingItem(null);
    loadData();
  };

  // --- TRIP NAME HANDLER ---
  const handleSaveTripName = () => {
    if (!tripCustomName.trim()) return;
    localStorage.setItem('tjr_private_trip_name', tripCustomName.trim());
    setShowEditTripModal(false);
  };

  // Calculations
  const totalCostJpy = currentDays.reduce(
    (acc, day) => acc + day.items.reduce((sum, item) => sum + (item.estimated_cost || 0), 0),
    0
  );
  const totalCostIdr = Math.round(totalCostJpy * rate);
  const totalDestinations = currentDays.reduce((acc, day) => acc + day.items.length, 0);

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID').format(Math.round(num));
  const formatJpy = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num));

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* 1. Mode Switcher: Open Trip vs Private Trip */}
      <div className="p-1 rounded-2xl bg-surface-container-high flex items-center justify-between shadow-2xs">
        <button
          onClick={() => setTripType('open')}
          className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
            tripType === 'open'
              ? 'bg-surface-container-lowest text-primary shadow-2xs'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">groups</span>
          Open Trip
        </button>
        <button
          onClick={() => setTripType('private')}
          className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
            tripType === 'private'
              ? 'bg-surface-container-lowest text-primary shadow-2xs'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">directions_car</span>
          Private Trip
        </button>
      </div>

      {/* 2. Trip Overview Header Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container/80 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {tripType === 'open' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary-fixed text-primary text-[10.5px] font-bold">
                  <span className="material-symbols-outlined text-[13px]">groups</span>
                  PAKET OPEN TRIP TJR
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed text-[10.5px] font-bold">
                  <span className="material-symbols-outlined text-[13px]">directions_car</span>
                  PRIVATE TOUR & SEWA MOBIL
                </span>
              )}
              <span className="text-[11.5px] text-on-surface-variant font-medium">
                {currentDays.length} Hari Perjalanan
              </span>
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-[15px] sm:text-[16px] font-extrabold text-on-surface tracking-tight leading-snug">
                {tripType === 'open' ? openTrip?.name || 'Jelajah Tokyo, Kyoto & Osaka 2025' : tripCustomName}
              </h1>
              {tripType === 'private' && (
                <button
                  onClick={() => setShowEditTripModal(true)}
                  title="Ganti Judul Trip"
                  className="w-6 h-6 rounded-md bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-[14px]">edit</span>
                </button>
              )}
            </div>
          </div>

          {/* Action Button at Top Right */}
          <div className="shrink-0">
            {tripType === 'private' ? (
              <button
                onClick={handleOpenAddDay}
                className="h-9 px-3 rounded-xl bg-primary-container text-white text-[11.5px] font-bold flex items-center gap-1 active:scale-95 shadow-2xs hover:bg-primary transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span>Tambah Hari</span>
              </button>
            ) : (
              <button
                onClick={() => alert('Jadwal Open Trip ini siap diakses offline!')}
                className="h-9 px-3 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center gap-1 text-[11.5px] font-bold transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>Terverifikasi</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode Explanation Banner */}
        <div className="mt-3 p-2.5 rounded-xl border text-[11px] leading-relaxed flex items-center gap-2">
          {tripType === 'open' ? (
            <>
              <span className="material-symbols-outlined text-primary text-[17px] shrink-0">info</span>
              <span className="text-on-surface-variant">
                <strong>Jadwal Resmi Teman Jalan Ryan:</strong> Rute terpadu untuk rombongan Open Trip. Anda dapat mencentang aktivitas yang selesai dan menambahkan catatan pribadi.
              </span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-secondary text-[17px] shrink-0">tune</span>
              <span className="text-on-surface">
                <strong>Mode Bebas Private Trip:</strong> Anda bebas mengubah judul hari, tanggal, kota, destinasi, dan estimasi biaya per tempat sesuai kesepakatan rombongan Anda.
              </span>
            </>
          )}
        </div>

        {/* Integrated Cost & Destinations Summary */}
        <div className="mt-3 pt-2.5 border-t border-surface-container/70 flex items-center justify-between text-[11.5px]">
          <div className="flex items-center gap-2">
            <span className="text-on-surface-variant font-medium">
              {totalDestinations} Destinasi Terjadwal
            </span>
          </div>
          <div className="text-right">
            <span className="text-on-surface-variant font-medium">Est. Biaya: </span>
            <span className="text-primary font-black text-[13px]">
              ¥{formatJpy(totalCostJpy)}
            </span>
            <span className="text-[10.5px] text-on-surface-variant ml-1 font-semibold">
              (~Rp {formatRupiah(totalCostIdr)})
            </span>
          </div>
        </div>
      </div>

      {/* 3. Day-by-Day Feed */}
      <div className="flex flex-col space-y-3 sm:space-y-3.5">
        {currentDays.map((day) => {
          const isExpanded = !!expandedDays[day.id];
          const dayCost = day.items.reduce((s, i) => s + (i.estimated_cost || 0), 0);

          return (
            <div
              key={day.id}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs transition-all duration-200 border border-surface-container/80"
            >
              {/* Day Header Row */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-primary-container text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                    <span className="text-[8px] uppercase tracking-wider leading-none">Day</span>
                    <span className="text-[14px] font-black leading-none mt-0.5">
                      {String(day.day_number).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-on-surface-variant font-medium">{day.date}</span>
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface text-[10.5px] font-bold">
                        {day.city || 'Tokyo'}
                      </span>
                      {tripType === 'private' && day.status && (
                        <span
                          className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold ${
                            day.status === 'Siap'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : day.status === 'Selesai'
                              ? 'bg-blue-500/10 text-blue-700'
                              : 'bg-amber-500/10 text-amber-700'
                          }`}
                        >
                          {day.status}
                        </span>
                      )}
                    </div>
                    <h2 className="text-[14px] font-bold text-on-surface mt-0.5 truncate leading-snug">
                      {day.title}
                    </h2>
                  </div>
                </div>

                {/* Edit Day Button (Only for Private Trip) */}
                {tripType === 'private' && (
                  <button
                    onClick={() => handleOpenEditDay(day)}
                    title="Edit Informasi Hari"
                    className="h-7 px-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary text-[11px] font-bold flex items-center gap-1 transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-[13px]">edit</span>
                    <span>Edit Hari</span>
                  </button>
                )}
              </div>

              {/* Quick stops overview preview */}
              {day.items.length > 0 && (
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
                  {day.items.length > 3 && (
                    <span className="text-[10.5px] text-on-surface-variant font-medium shrink-0">
                      +{day.items.length - 3} lainnya
                    </span>
                  )}
                </div>
              )}

              {/* Day Card Footer */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-2 text-[11.5px] text-on-surface-variant font-medium">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">checklist</span>
                    {day.items.length} Destinasi
                  </span>
                  <span>•</span>
                  <span>≈ ¥{formatJpy(dayCost)}</span>
                </div>
                <button
                  onClick={() => toggleDayExpand(day.id)}
                  className="h-7 px-2.5 rounded-lg bg-surface-container text-[11.5px] text-primary font-bold flex items-center gap-0.5 hover:bg-surface-container-high transition-colors active:scale-95"
                >
                  {isExpanded ? 'Tutup' : 'Detail'}
                  <span className="material-symbols-outlined text-[14px]">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>

              {/* Expandable Activities Drawer */}
              {isExpanded && (
                <div className="mt-3 pt-2.5 space-y-2 border-t border-surface-container/70 animate-in fade-in">
                  {day.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl transition-colors border ${
                        item.completed
                          ? 'bg-surface-container-low/60 border-surface-container opacity-70'
                          : 'bg-surface-container-low border-surface-container/60 hover:bg-surface-container'
                      }`}
                    >
                      <button
                        type="button"
                        aria-label="Toggle Complete"
                        onClick={() => handleToggleItemComplete(item.id, item.completed)}
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
                          <p
                            className={`text-[13px] font-bold leading-tight ${
                              item.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.is_halal_spot && (
                            <span className="px-1.5 py-0.2 rounded bg-primary-fixed text-primary text-[9.5px] font-bold uppercase">
                              Halal Spot
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1 leading-tight">
                          {item.start_time} • {item.notes || item.location || 'Destinasi Terjadwal'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.estimated_cost ? (
                          <span className="text-[12px] font-black text-primary">
                            ¥{formatJpy(item.estimated_cost)}
                          </span>
                        ) : null}

                        {/* Private trip allows editing each destination */}
                        {tripType === 'private' && (
                          <button
                            onClick={() => handleOpenEditItem(item)}
                            title="Edit Destinasi"
                            className="w-7 h-7 rounded-lg text-on-surface-variant/70 hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleOpenAddItem(day.id)}
                    className="w-full h-9 rounded-xl bg-surface-container-high text-[11.5px] font-bold text-primary hover:bg-surface-container transition-colors flex items-center justify-center gap-1 mt-2 border border-dashed border-outline-variant active:scale-98"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Tambah Destinasi / Tempat ke Hari Ini
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Tambah Hari Baru (Private Trip) */}
      {showAddDay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container space-y-3.5">
            <h3 className="text-[14px] font-extrabold text-on-surface">Tambah Hari Perjalanan Baru</h3>
            <form onSubmit={handleAddDaySubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Judul Hari</label>
                <input
                  type="text"
                  required
                  value={dayTitle}
                  onChange={(e) => setDayTitle(e.target.value)}
                  placeholder="Misal: Wisata Kuliner Dotonbori & Universal Studios"
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Kota / Area</label>
                  <select
                    value={dayCity}
                    onChange={(e) => setDayCity(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  >
                    <option value="Tokyo">Tokyo</option>
                    <option value="Kyoto">Kyoto</option>
                    <option value="Osaka">Osaka</option>
                    <option value="Fuji & Hakone">Fuji & Hakone</option>
                    <option value="Nara">Nara</option>
                    <option value="Kobe">Kobe</option>
                    <option value="Nagoya">Nagoya</option>
                    <option value="Hokkaido">Hokkaido</option>
                    <option value="Shirakawago">Shirakawago</option>
                    <option value="Hiroshima">Hiroshima</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={dayDate}
                    onChange={(e) => setDayDate(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-surface-container-low text-[11px] border border-surface-container focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Status Kesiapan</label>
                <select
                  value={dayStatus}
                  onChange={(e) => setDayStatus(e.target.value as any)}
                  className="w-full h-9 px-2.5 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                >
                  <option value="Siap">Siap Berangkat</option>
                  <option value="Dalam Rencana">Masih Dalam Rencana</option>
                  <option value="Selesai">Sudah Selesai Dikunjungi</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDay(false)}
                  className="flex-1 h-9 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
                >
                  Simpan Hari
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Hari (Private Trip) */}
      {editingDay && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold text-on-surface">
                Edit Day {editingDay.day_number}
              </h3>
              <button
                type="button"
                onClick={() => handleDeleteDay(editingDay.id)}
                className="text-error hover:underline text-[11px] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Hapus Hari
              </button>
            </div>

            <form onSubmit={handleEditDaySubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Judul Hari</label>
                <input
                  type="text"
                  required
                  value={dayTitle}
                  onChange={(e) => setDayTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Kota / Area</label>
                  <select
                    value={dayCity}
                    onChange={(e) => setDayCity(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  >
                    <option value="Tokyo">Tokyo</option>
                    <option value="Kyoto">Kyoto</option>
                    <option value="Osaka">Osaka</option>
                    <option value="Fuji & Hakone">Fuji & Hakone</option>
                    <option value="Nara">Nara</option>
                    <option value="Kobe">Kobe</option>
                    <option value="Nagoya">Nagoya</option>
                    <option value="Hokkaido">Hokkaido</option>
                    <option value="Shirakawago">Shirakawago</option>
                    <option value="Hiroshima">Hiroshima</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={dayDate}
                    onChange={(e) => setDayDate(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-surface-container-low text-[11px] border border-surface-container focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Status Kesiapan</label>
                <select
                  value={dayStatus}
                  onChange={(e) => setDayStatus(e.target.value as any)}
                  className="w-full h-9 px-2.5 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                >
                  <option value="Siap">Siap Berangkat</option>
                  <option value="Dalam Rencana">Masih Dalam Rencana</option>
                  <option value="Selesai">Sudah Selesai Dikunjungi</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDay(null)}
                  className="flex-1 h-9 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Tambah Destinasi / Aktivitas */}
      {showAddItemDayId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container space-y-3.5">
            <h3 className="text-[14px] font-extrabold text-on-surface">Tambah Tempat / Destinasi</h3>
            <form onSubmit={handleAddItemSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Nama Tempat / Destinasi</label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Misal: Tokyo Disneyland / Shibuya Crossing"
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={itemStartTime}
                    onChange={(e) => setItemStartTime(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Estimasi Biaya (¥)</label>
                  <input
                    type="number"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 px-2.5 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Lokasi / Catatan Khusus</label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Tips tiket, akses parkir mobil van, dll."
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="halalAddCheck"
                  checked={isHalal}
                  onChange={(e) => setIsHalal(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-container"
                />
                <label htmlFor="halalAddCheck" className="text-[11.5px] text-on-surface font-semibold cursor-pointer">
                  Spot Makanan Halal / Ramah Muslim
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddItemDayId(null)}
                  className="flex-1 h-9 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
                >
                  Tambahkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Edit Destinasi / Aktivitas (Private Trip) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold text-on-surface">Edit Destinasi</h3>
              <button
                type="button"
                onClick={() => handleDeleteItem(editingItem.id)}
                className="text-error hover:underline text-[11px] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Hapus
              </button>
            </div>

            <form onSubmit={handleEditItemSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Nama Tempat / Destinasi</label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={itemStartTime}
                    onChange={(e) => setItemStartTime(e.target.value)}
                    className="w-full h-9 px-2 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Estimasi Biaya (¥)</label>
                  <input
                    type="number"
                    value={itemCost}
                    onChange={(e) => setItemCost(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Lokasi / Catatan</label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="halalEditCheck"
                  checked={isHalal}
                  onChange={(e) => setIsHalal(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-container"
                />
                <label htmlFor="halalEditCheck" className="text-[11.5px] text-on-surface font-semibold cursor-pointer">
                  Spot Makanan Halal / Ramah Muslim
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 h-9 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Ganti Judul Trip Private */}
      {showEditTripModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container space-y-3.5">
            <h3 className="text-[14px] font-extrabold text-on-surface">Ubah Nama Private Trip</h3>
            <div>
              <label className="text-[11px] font-bold text-on-surface block mb-1">Nama Perjalanan Keluarga</label>
              <input
                type="text"
                value={tripCustomName}
                onChange={(e) => setTripCustomName(e.target.value)}
                placeholder="Misal: Private Tour Keluarga Prasetya 2025"
                className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEditTripModal(false)}
                className="flex-1 h-9 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveTripName}
                className="flex-1 h-9 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
              >
                Simpan Nama
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
