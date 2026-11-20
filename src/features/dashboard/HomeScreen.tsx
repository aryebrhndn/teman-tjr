import React, { useEffect, useState } from 'react';
import { db, type Trip, type Expense, type ChecklistItem, type Budget } from '../../database/dexie';
import { getJapanPrayerTimes, type DailyPrayers } from '../../services/prayer.service';

interface HomeScreenProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddExpense?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab, onOpenAddExpense }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [prayers, setPrayers] = useState<DailyPrayers | null>(null);
  const [rate, setRate] = useState<number>(105.0);

  useEffect(() => {
    async function loadData() {
      const allTrips = await db.trips.toArray();
      if (allTrips.length > 0) {
        setTrip(allTrips[0]);
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

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* Top Greeting & Status */}
      <div className="flex items-center justify-between pt-0.5 pb-0.5">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-extrabold text-on-surface tracking-tight">
              Halo, Traveler!
            </span>
            <span className="inline-flex text-base">🌸</span>
          </div>
          <p className="text-[12px] text-on-surface-variant font-medium mt-0.5">
            {trip ? trip.name : 'Tokyo, Kyoto & Osaka 2025'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface text-[11px] font-bold shadow-2xs border border-surface-container shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block animate-ping"></span>
          <span>Aktif Offline</span>
        </div>
      </div>

      {/* 1. Clean Trip Hero Card (Tanpa Tiket Pesawat Palsu) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1b1c1d] to-[#2b2d30] text-white p-4 sm:p-5 shadow-xs border border-surface-container/20">
        <div className="relative z-10 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold shadow-2xs">
              <span className="material-symbols-outlined text-[14px]">event</span>
              H - 14 Hari Menuju Berangkat
            </span>
            <span className="text-[10.5px] text-white/60 tracking-wider uppercase font-semibold">
              Musim Semi
            </span>
          </div>

          <div>
            <h3 className="text-[17px] font-extrabold text-white tracking-tight leading-snug">
              {trip?.name || 'Jelajah Tokyo, Kyoto & Osaka 2025'}
            </h3>
            <p className="text-[12px] text-white/80 flex items-center gap-1.5 font-medium mt-1">
              <span className="material-symbols-outlined text-[15px] text-secondary">calendar_today</span>
              12 - 19 April 2025 • 7 Hari Perjalanan
            </p>
          </div>
        </div>
      </div>

      {/* 2. Today's Itinerary Highlight */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-xs flex flex-col space-y-3 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-container"></span>
            <span className="text-[13.5px] font-bold text-on-surface">Sorotan Hari Ini</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-md bg-primary-fixed text-primary text-[10.5px] font-bold">
            Hari 1 • Tokyo
          </span>
        </div>

        <div className="rounded-xl bg-surface-container-low p-3 flex gap-3 items-center">
          <div className="w-10 h-10 rounded-xl bg-primary-fixed/30 flex items-center justify-center text-primary-container shrink-0">
            <span className="material-symbols-outlined text-[20px]">park</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1 leading-tight">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="px-1.5 py-0.2 rounded bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
                14:30 JST
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium truncate">
                Shinjuku
              </span>
            </div>
            <h4 className="text-[13.5px] font-bold text-on-surface truncate">
              Shinjuku Gyoen Garden
            </h4>
            <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
              Piknik santai hanami sakura & istirahat sejenak setelah check-in hotel.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('itinerary')}
          className="w-full h-9.5 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 text-primary text-[12px] font-bold border border-surface-container active:scale-98"
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

        {/* 5 Daily Prayers */}
        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          <div className="flex flex-col items-center justify-center py-2 px-0.5 rounded-xl bg-surface-container-low text-center min-w-0">
            <span className="text-[10.5px] text-on-surface-variant font-medium">Subuh</span>
            <span className="text-[12px] font-bold text-on-surface mt-0.5">{prayers?.fajr || '04:15'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-0.5 rounded-xl bg-surface-container-low text-center min-w-0">
            <span className="text-[10.5px] text-on-surface-variant font-medium">Dzuhur</span>
            <span className="text-[12px] font-bold text-on-surface mt-0.5">{prayers?.dhuhr || '11:52'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-0.5 rounded-xl bg-secondary-container text-on-secondary-container text-center shadow-xs border border-secondary min-w-0">
            <span className="text-[10.5px] font-black uppercase">Ashar</span>
            <span className="text-[12px] font-black mt-0.5">{prayers?.asr || '15:20'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-0.5 rounded-xl bg-surface-container-low text-center min-w-0">
            <span className="text-[10.5px] text-on-surface-variant font-medium">Maghrib</span>
            <span className="text-[12px] font-bold text-on-surface mt-0.5">{prayers?.maghrib || '18:10'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-0.5 rounded-xl bg-surface-container-low text-center min-w-0">
            <span className="text-[10.5px] text-on-surface-variant font-medium">Isya</span>
            <span className="text-[12px] font-bold text-on-surface mt-0.5">{prayers?.isha || '19:28'}</span>
          </div>
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
