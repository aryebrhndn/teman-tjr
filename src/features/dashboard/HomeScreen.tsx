import React, { useEffect, useState } from 'react';
import { db, type Trip, type Expense, type ChecklistItem, type Budget, type ItineraryDay, type ItineraryItem } from '../../database/dexie';
import { getJapanPrayerTimes, type DailyPrayers } from '../../services/prayer.service';
import { formatDateIso, getSeasonLabel, getTripStatusInfo } from '../../utils/tripDates';
import panoramaBg from '../../assets/Panorama-BGJPN.png';

interface HomeScreenProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddExpense?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab, onOpenAddExpense }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [totalDays, setTotalDays] = useState<number>(1);
  const [todayDay, setTodayDay] = useState<ItineraryDay | null>(null);
  const [todayItem, setTodayItem] = useState<ItineraryItem | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [prayers, setPrayers] = useState<DailyPrayers | null>(null);
  const [rate, setRate] = useState<number>(114.14);

  useEffect(() => {
    async function loadData() {
      const allTrips = await db.trips.toArray();
      const activeTrip = allTrips.length > 0 ? allTrips[0] : null;
      setTrip(activeTrip);

      const allDays = await db.itinerary_days.orderBy('day_number').toArray();
      setTotalDays(Math.max(1, allDays.length));

      if (allDays.length > 0) {
        const todayStr = formatDateIso(new Date());
        const statusNow = getTripStatusInfo(activeTrip?.departure_date, allDays.length, activeTrip?.season);
        const matchedDay =
          allDays.find((d) => d.date === todayStr) ||
          (statusNow.currentDayNumber ? allDays.find((d) => d.day_number === statusNow.currentDayNumber) : null) ||
          allDays[0];
        setTodayDay(matchedDay);

        const items = await db.itinerary_items.where('day_id').equals(matchedDay.id).sortBy('sort_order');
        if (items.length > 0) {
          const nextUnchecked = items.find((it) => !it.completed) || items[0];
          setTodayItem(nextUnchecked);
        } else {
          setTodayItem(null);
        }
      } else {
        setTodayDay(null);
        setTodayItem(null);
      }

      const allBudgets = await db.budgets.toArray();
      if (allBudgets.length > 0) {
        setBudget(allBudgets[0]);
      }

      const allExpenses = await db.expenses.toArray();
      setExpenses(allExpenses);

      const allChecklists = await db.checklist_items.toArray();
      setChecklist(allChecklists);

      const rateSetting = await db.app_settings.get('exchange_rate');
      if (rateSetting && typeof rateSetting.value === 'number') {
        setRate(rateSetting.value);
      }

      const currentPrayers = getJapanPrayerTimes('tokyo');
      setPrayers(currentPrayers);
    }
    loadData();

    const interval = setInterval(() => {
      setPrayers(getJapanPrayerTimes('tokyo'));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const totalBudget = budget?.amount || 25000000;
  const totalExpenseIdr = expenses.reduce((acc, curr) => acc + curr.converted_idr, 0);
  const remainingBudget = Math.max(0, totalBudget - totalExpenseIdr);
  const remainingJpy = Math.round(remainingBudget / rate);
  const usagePercent = Math.min(100, Math.round((totalExpenseIdr / totalBudget) * 100));

  const completedChecklist = checklist.filter((c) => c.completed).length;
  const totalChecklist = checklist.length;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID').format(Math.round(num));
  const formatJpy = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num));

  const tripStatus = getTripStatusInfo(trip?.departure_date, totalDays, trip?.season);
  const hasDepartureDate = Boolean(trip?.departure_date);

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* 1. Trip Hero Card - Tersinkronisasi Otomatis dengan Tanggal di Persiapan & Bekal */}
      <div className="relative overflow-hidden rounded-2xl text-white p-3.5 sm:p-4 shadow-sm border border-surface-container/30 bg-[#1c1d1f]">
        {/* Background Panorama Image */}
        <img
          src={panoramaBg}
          alt="Panorama Jepang"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/75 pointer-events-none" />

        <div className="relative z-10 flex flex-col space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shadow-2xs ${
                hasDepartureDate
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-white/20 text-white backdrop-blur-xs'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">event</span>
              {tripStatus.badgeText}
            </span>
            {hasDepartureDate && (
              <span className="text-[10px] text-white/90 tracking-wider uppercase font-bold drop-shadow-xs shrink-0">
                {getSeasonLabel(tripStatus.season)}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-[16px] font-extrabold text-white tracking-tight leading-snug drop-shadow-sm">
              {trip?.name || 'Perjalanan Jepang Saya'}
            </h3>
            {hasDepartureDate ? (
              <p className="text-[11.5px] text-white/95 flex items-center gap-1.5 font-medium mt-0.5 drop-shadow-xs">
                <span className="material-symbols-outlined text-[14px] text-secondary">calendar_today</span>
                {tripStatus.formattedRange}
              </p>
            ) : (
              <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11.5px] text-white/85 font-medium">
                  Atur tanggal berangkat di menu Bekal agar hitungan mundur aktif.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('bekal')}
                  className="h-7.5 px-3 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-transform cursor-pointer"
                >
                  <span>Atur Tanggal</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Today's Itinerary Highlight - Dinamis Berdasarkan Data Nyata */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-xs flex flex-col space-y-3 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-container"></span>
            <span className="text-[13.5px] font-bold text-on-surface">Sorotan Hari Ini</span>
          </div>
          {todayDay && (
            <span className="px-2.5 py-0.5 rounded-md bg-primary-fixed text-primary text-[10.5px] font-bold">
              Hari {todayDay.day_number} • {todayDay.city || 'Tokyo'}
            </span>
          )}
        </div>

        {todayItem ? (
          <div className="rounded-xl bg-surface-container-low p-3 flex gap-3 items-center">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed/30 flex items-center justify-center text-primary-container shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                {todayItem.is_halal_spot ? 'restaurant' : 'place'}
              </span>
            </div>
            <div className="flex flex-col min-w-0 flex-1 leading-tight">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.2 rounded bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
                  {todayItem.start_time ? `${todayItem.start_time} JST` : 'Jadwal Hari Ini'}
                </span>
                {todayItem.location && (
                  <span className="text-[11px] text-on-surface-variant font-medium truncate">
                    {todayItem.location}
                  </span>
                )}
              </div>
              <h4 className="text-[13.5px] font-bold text-on-surface truncate">
                {todayItem.title}
              </h4>
              {todayItem.notes && (
                <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                  {todayItem.notes}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-surface-container-low p-3.5 text-center flex flex-col items-center justify-center gap-1 text-on-surface-variant border border-surface-container/60">
            <p className="text-[12px] font-semibold text-on-surface">Belum ada agenda aktivitas</p>
            <p className="text-[11px]">Tambahkan rencana tempat kunjungan di menu Itinerary.</p>
          </div>
        )}

        <button
          onClick={() => onNavigateTab('itinerary')}
          className="w-full h-9 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 text-primary text-[12px] font-bold border border-surface-container active:scale-98"
        >
          Lihat Seluruh Itinerary
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>

      {/* 3. Islamic Prayer Quick Summary Card */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-xs flex flex-col space-y-3 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[19px] text-primary">location_on</span>
            <div>
              <h4 className="text-[13.5px] font-bold text-on-surface leading-tight">Jadwal Sholat</h4>
              <p className="text-[10.5px] text-on-surface-variant mt-0.5">Tokyo (JST, UTC+9)</p>
            </div>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[12.5px] text-primary font-black">
              {prayers ? `${prayers.nextPrayer.name} (${prayers.nextPrayer.time})` : 'Ashar (15:20)'}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">Waktu Berikutnya</span>
          </div>
        </div>

        {/* 5 Daily Prayers - Highlight Waktu Sholat Berikutnya Secara Dinamis */}
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
                className={`flex flex-col items-center justify-center py-2 px-0.5 rounded-xl text-center min-w-0 transition-all ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container shadow-xs border border-secondary'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <span className={`text-[10.5px] ${active ? 'font-black uppercase text-on-secondary-container' : 'text-on-surface-variant font-medium'}`}>
                  {item.label}
                </span>
                <span className={`text-[12px] mt-0.5 ${active ? 'font-black text-on-secondary-container' : 'font-bold text-on-surface'}`}>
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => onNavigateTab('ibadah')}
          className="w-full text-center py-1 text-[11.5px] text-primary font-bold hover:underline flex items-center justify-center gap-1"
        >
          <span>Buka Kompas Kiblat & Direktori Masjid</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>

      {/* 4. Budget & Financial Tracker Summary */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-xs flex flex-col space-y-3 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[16px]">payments</span>
            </div>
            <div>
              <h4 className="text-[13.5px] font-bold text-on-surface leading-tight">Ringkasan Biaya</h4>
              <span className="text-[10.5px] text-on-surface-variant font-medium">Kurs: 1 JPY ≈ Rp {rate.toFixed(1)}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('biaya')}
            className="text-primary text-[11.5px] font-bold hover:underline"
          >
            Lihat Detail
          </button>
        </div>

        <div className="space-y-2 bg-surface-container-low p-3 rounded-xl">
          <div className="flex justify-between items-baseline text-[11.5px]">
            <span className="text-on-surface-variant font-medium">Terpakai ({usagePercent}%)</span>
            <span className="font-extrabold text-on-surface text-[12.5px]">
              Rp {formatRupiah(totalExpenseIdr)}{' '}
              <span className="font-normal text-on-surface-variant text-[10.5px]">/ Rp {formatRupiah(totalBudget)}</span>
            </span>
          </div>

          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-primary-container rounded-full" style={{ width: `${usagePercent}%` }}></div>
          </div>

          <div className="flex items-center justify-between pt-0.5 text-on-surface-variant text-[11px]">
            <span className="font-medium">Sisa Kas:</span>
            <span className="font-extrabold text-on-surface text-[12px]">
              ¥ {formatJpy(remainingJpy)}{' '}
              <span className="text-secondary font-bold text-[10.5px]">(~ Rp {formatRupiah(remainingBudget)})</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddExpense || (() => onNavigateTab('biaya'))}
          className="w-full h-9.5 rounded-xl bg-primary-container text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          Catat Pengeluaran
        </button>
      </div>

      {/* 5. Preparation Progress Bar */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-xs flex flex-col space-y-2.5 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[17px] text-primary-container">luggage</span>
            <span className="text-[13.5px] font-bold text-on-surface">Kesiapan Berangkat</span>
          </div>
          <span className="text-[11.5px] font-bold text-primary">
            {completedChecklist} / {totalChecklist} Selesai ({checklistPercent}%)
          </span>
        </div>

        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-500"
            style={{ width: `${checklistPercent}%` }}
          ></div>
        </div>

        <button
          onClick={() => onNavigateTab('bekal')}
          className="text-center py-1 text-[11.5px] text-primary font-bold hover:underline flex items-center justify-center gap-1"
        >
          <span>Buka Checklist Koper</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
