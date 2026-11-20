import React, { useEffect, useState } from 'react';
import { db, type Trip, type Expense, type ChecklistItem, type Budget, type ItineraryDay, type ItineraryItem } from '../../database/dexie';
import { getJapanPrayerTimes, type DailyPrayers } from '../../services/prayer.service';
import panoramaBg from '../../assets/Panorama-BGJPN.png';

interface HomeScreenProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddExpense?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab, onOpenAddExpense }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
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
      if (allTrips.length > 0) {
        setTrip(allTrips[0]);
      } else {
        setTrip(null);
      }

      const allDays = await db.itinerary_days.orderBy('day_number').toArray();
      if (allDays.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const matchedDay = allDays.find((d) => d.date === todayStr) || allDays[0];
        setTodayDay(matchedDay);

        const items = await db.itinerary_items.where('day_id').equals(matchedDay.id).sortBy('sort_order');
        if (items.length > 0) {
          setTodayItem(items[0]);
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

  const totalBudget = budget?.amount || 35000000;
  const totalExpenseIdr = expenses.reduce((acc, curr) => acc + curr.converted_idr, 0);
  const remainingBudget = Math.max(0, totalBudget - totalExpenseIdr);
  const remainingJpy = Math.round(remainingBudget / rate);
  const usagePercent = Math.min(100, Math.round((totalExpenseIdr / totalBudget) * 100));

  const completedChecklist = checklist.filter((c) => c.completed).length;
  const totalChecklist = checklist.length || 12;
  const checklistPercent = Math.round((completedChecklist / totalChecklist) * 100);

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID').format(Math.round(num));
  const formatJpy = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num));

  const getTripCountdown = (startDateStr?: string) => {
    if (!startDateStr) return null;
    const target = new Date(startDateStr);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `H - ${diffDays} Hari Menuju Berangkat`;
    if (diffDays === 0) return `Hari Ini Berangkat!`;
    return `Perjalanan Sedang Berlangsung`;
  };

  const getTripDateRange = (sStr?: string, eStr?: string) => {
    if (!sStr || !eStr) return 'Jadwal belum ditentukan';
    const s = new Date(sStr);
    const e = new Date(eStr);
    const sText = s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const eText = e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const duration = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return `${sText} - ${eText} • ${duration} Hari Perjalanan`;
  };

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* 1. Trip Hero Card - Data Asli atau Ajakan Pengisian Jika Kosong */}
      {trip ? (
        <div className="relative overflow-hidden rounded-2xl text-white p-3.5 sm:p-4 shadow-sm border border-surface-container/30 bg-[#1c1d1f]">
          {/* Background Panorama Image */}
          <img
            src={panoramaBg}
            alt="Panorama Jepang"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          />
          {/* Dark Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/75 pointer-events-none" />

          <div className="relative z-10 flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10.5px] font-bold shadow-2xs">
                <span className="material-symbols-outlined text-[13px]">event</span>
                {getTripCountdown(trip.departure_date) || 'Jadwal Siap'}
              </span>
              <span className="text-[10px] text-white/90 tracking-wider uppercase font-bold drop-shadow-xs">
                {trip.season === 'spring' ? 'Musim Semi' : trip.season === 'autumn' ? 'Musim Gugur' : trip.season === 'winter' ? 'Musim Dingin' : 'Musim Panas'}
              </span>
            </div>

            <div>
              <h3 className="text-[16px] font-extrabold text-white tracking-tight leading-snug drop-shadow-sm">
                {trip.name}
              </h3>
              <p className="text-[11.5px] text-white/95 flex items-center gap-1.5 font-medium mt-0.5 drop-shadow-xs">
                <span className="material-symbols-outlined text-[14px] text-secondary">calendar_today</span>
                {getTripDateRange(trip.departure_date, trip.return_date)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl p-4 shadow-xs border border-surface-container/70 bg-surface-container-low flex flex-col gap-2">
          <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
            Rencana Perjalanan
          </span>
          <h3 className="text-[15px] font-bold text-on-surface">
            Belum Ada Jadwal Perjalanan
          </h3>
          <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
            Silakan atur atau buat rencana trip Jepang Anda di menu Itinerary.
          </p>
          <button
            onClick={() => onNavigateTab('itinerary')}
            className="mt-1 h-8.5 px-3.5 rounded-xl bg-primary text-white text-[11.5px] font-bold self-start flex items-center gap-1 shadow-2xs"
          >
            Mulai Atur Perjalanan
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      )}

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
