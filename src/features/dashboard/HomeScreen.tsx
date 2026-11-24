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

  const seasonKanji = (s?: string) => {
    if (s === 'spring') return '春';
    if (s === 'summer') return '夏';
    if (s === 'autumn') return '秋';
    if (s === 'winter') return '冬';
    return '日';
  };

  return (
    <div className="flex flex-col w-full space-y-3.5">
      {/* 1. Trip Hero Card - Tersinkronisasi Otomatis dengan Tanggal di Persiapan & Bekal */}
      <div className="relative overflow-hidden rounded-2xl text-white p-4 shadow-sm border border-surface-container/30 bg-[#1c1d1f]">
        <img
          src={panoramaBg}
          alt="Panorama Jepang"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/75 pointer-events-none" />

        {/* Subtle Japanese Kanji watermark */}
        <span
          aria-hidden="true"
          style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
          className="absolute right-3 bottom-1 text-[44px] font-extrabold text-white/10 leading-none select-none pointer-events-none"
        >
          日本旅
        </span>

        <div className="relative z-10 flex flex-col space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shadow-2xs whitespace-nowrap ${
                hasDepartureDate
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-white/20 text-white backdrop-blur-xs'
              }`}
            >
              {tripStatus.badgeText}
            </span>
            {hasDepartureDate && (
              <span
                style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
                className="text-[11px] text-white/95 font-bold drop-shadow-xs shrink-0 whitespace-nowrap"
              >
                {seasonKanji(tripStatus.season)} {getSeasonLabel(tripStatus.season)}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-[16px] font-extrabold text-white tracking-tight leading-snug drop-shadow-sm">
              {trip?.name || 'Perjalanan Jepang Saya'}
            </h3>
            {hasDepartureDate ? (
              <p className="text-[12px] text-white/90 font-medium mt-0.5 drop-shadow-xs">
                {tripStatus.formattedRange}
              </p>
            ) : (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11.5px] text-white/85">Atur tanggal di menu Bekal</p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('bekal')}
                  className="h-7.5 px-3 rounded-lg bg-secondary-container text-on-secondary-container text-[11px] font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-transform cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <span>Atur Tanggal</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Agenda Hari Ini - Ringkas & Bersih */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-2xs flex flex-col space-y-2.5 border border-surface-container">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
              className="px-1.5 py-0.5 rounded bg-primary-fixed/70 text-primary text-[10.5px] font-bold leading-none shrink-0"
            >
              予定
            </span>
            <span className="text-[13.5px] font-bold text-on-surface truncate">Agenda</span>
          </div>
          {todayDay && (
            <span className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant text-[10.5px] font-bold whitespace-nowrap shrink-0">
              Hari {todayDay.day_number} · {todayDay.city || 'Tokyo'}
            </span>
          )}
        </div>

        {todayItem ? (
          <div className="rounded-xl bg-surface-container-low px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-on-surface truncate">{todayItem.title}</p>
              <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                {[todayItem.start_time ? `${todayItem.start_time} JST` : null, todayItem.location]
                  .filter(Boolean)
                  .join(' · ') || 'Jadwal hari ini'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('itinerary')}
              className="text-[11.5px] font-bold text-primary shrink-0 cursor-pointer"
            >
              Lihat →
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low px-3.5 py-3">
            <span className="text-[12px] text-on-surface-variant">Belum ada agenda</span>
            <button
              type="button"
              onClick={() => onNavigateTab('itinerary')}
              className="text-[12px] font-bold text-primary hover:underline shrink-0 cursor-pointer whitespace-nowrap"
            >
              Atur Itinerary →
            </button>
          </div>
        )}
      </div>

      {/* 3. Jadwal Sholat Ringkas */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-2xs flex flex-col space-y-3 border border-surface-container">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
              className="px-1.5 py-0.5 rounded bg-primary-fixed/70 text-primary text-[10.5px] font-bold leading-none shrink-0"
            >
              礼拝
            </span>
            <h4 className="text-[13.5px] font-bold text-on-surface truncate">
              Sholat · <span className="font-medium text-on-surface-variant">Tokyo</span>
            </h4>
          </div>
          <span className="text-[12px] text-primary font-bold whitespace-nowrap shrink-0 tabular-nums">
            {prayers ? `${prayers.nextPrayer.name} ${prayers.nextPrayer.time}` : 'Ashar 14:12'}
          </span>
        </div>

        {/* 5 Daily Prayers - Rapi & Tidak Sempit */}
        <div className="grid grid-cols-5 gap-1.5">
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
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center min-w-0 transition-all ${
                  active
                    ? 'bg-secondary-container text-on-secondary-container shadow-2xs border border-secondary'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <span
                  className={`text-[10px] leading-tight truncate max-w-full ${
                    active ? 'font-bold text-on-secondary-container' : 'text-on-surface-variant font-medium'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  className={`text-[12px] mt-0.5 tabular-nums leading-tight ${
                    active ? 'font-extrabold text-on-secondary-container' : 'font-bold text-on-surface'
                  }`}
                >
                  {item.time}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('ibadah')}
          className="w-full text-center pt-0.5 text-[11.5px] text-primary font-bold hover:underline cursor-pointer"
        >
          Kiblat &amp; Masjid Terdekat →
        </button>
      </div>

      {/* 4. Anggaran Ringkas */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-2xs flex flex-col space-y-3 border border-surface-container">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
              className="px-1.5 py-0.5 rounded bg-primary-fixed/70 text-primary text-[10.5px] font-bold leading-none shrink-0"
            >
              予算
            </span>
            <h4 className="text-[13.5px] font-bold text-on-surface truncate">Anggaran</h4>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('biaya')}
            className="text-primary text-[11.5px] font-bold hover:underline shrink-0 cursor-pointer"
          >
            Detail →
          </button>
        </div>

        <div className="space-y-2 bg-surface-container-low px-3.5 py-3 rounded-xl">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-on-surface-variant font-medium shrink-0">Sisa</span>
            <span className="font-extrabold text-on-surface text-[15px] tabular-nums truncate">
              Rp {formatRupiah(remainingBudget)}
            </span>
          </div>

          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-primary-container rounded-full" style={{ width: `${usagePercent}%` }} />
          </div>

          <div className="flex items-center justify-between text-[11px] text-on-surface-variant tabular-nums">
            <span>Terpakai {usagePercent}%</span>
            <span className="font-bold text-on-surface">≈ ¥ {formatJpy(remainingJpy)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddExpense || (() => onNavigateTab('biaya'))}
          className="w-full h-9.5 rounded-xl bg-primary-container text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>Catat Pengeluaran</span>
        </button>
      </div>

      {/* 5. Progres Bekal Ringkas */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-2xs flex flex-col space-y-2.5 border border-surface-container">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
              className="px-1.5 py-0.5 rounded bg-primary-fixed/70 text-primary text-[10.5px] font-bold leading-none shrink-0"
            >
              荷
            </span>
            <span className="text-[13.5px] font-bold text-on-surface truncate">Bekal</span>
          </div>
          <span className="text-[11.5px] font-bold text-primary whitespace-nowrap tabular-nums">
            {completedChecklist}/{totalChecklist} ({checklistPercent}%)
          </span>
        </div>

        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-500"
            style={{ width: `${checklistPercent}%` }}
          />
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('bekal')}
          className="text-center pt-0.5 text-[11.5px] text-primary font-bold hover:underline cursor-pointer"
        >
          Buka Checklist →
        </button>
      </div>
    </div>
  );
};
