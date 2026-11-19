import React, { useEffect, useState } from 'react';
import { db, type Trip, type Expense, type ChecklistItem } from '../../database/dexie';
import { getJapanPrayerTimes, type DailyPrayers } from '../../services/prayer.service';

interface HomeScreenProps {
  onNavigateTab: (tab: string) => void;
  onOpenAddExpense?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateTab, onOpenAddExpense }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
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

  const totalBudget = 35000000;
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
    <div className="flex flex-col w-full space-y-4 md:space-y-2.5 transition-all">
      {/* Top Greeting & Context Status */}
      <div className="flex items-center justify-between pt-1 md:pt-0.5">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-[19px] md:text-[14px] font-black text-on-surface tracking-tight">
              Halo, Traveler!
            </span>
            <span className="inline-flex text-base md:text-xs">🌸</span>
          </div>
          <p className="text-[13px] md:text-[10px] text-on-surface-variant font-medium mt-0.5">
            {trip ? trip.name : 'Tokyo & Kyoto Trip • Musim Semi 2025'}
          </p>
        </div>
        <div className="flex items-center gap-1.5 md:gap-1 px-3 py-1 md:px-2 md:py-0.5 rounded-full bg-surface-container-low text-on-surface text-[12px] md:text-[9.5px] font-bold shadow-2xs border border-surface-container">
          <span className="w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-[#10b981] inline-block animate-ping"></span>
          <span>Aktif Offline</span>
        </div>
      </div>

      {/* 1. Travel Countdown Card (Hero Card) */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-xl bg-gradient-to-br from-tertiary to-inverse-surface text-inverse-on-surface p-4 md:p-3 shadow-xs">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full object-cover" fill="none" viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg">
            <path d="M-20 220C50 160 120 250 200 190C280 130 350 220 420 170V240H-20V220Z" fill="white" />
            <path d="M120 140L170 60L220 140H120Z" fill="white" opacity="0.8" />
            <circle cx="170" cy="50" fill="#a90008" opacity="0.6" r="28" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col space-y-2.5 md:space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 md:gap-1 px-3 py-1 md:px-2 md:py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[12px] md:text-[9.5px] font-bold shadow-2xs">
              <span className="material-symbols-outlined text-[15px] md:text-[12px]">flight_takeoff</span>
              H - 14 Hari Menuju Berangkat
            </span>
            <span className="text-[11px] md:text-[8.5px] text-surface-variant/90 tracking-wider uppercase font-bold">
              Spring Tour
            </span>
          </div>

          <div className="space-y-0.5">
            <h3 className="text-[17px] md:text-[13.5px] font-black text-white tracking-tight leading-snug">
              Petualanganmu makin dekat!
            </h3>
            <p className="text-[13px] md:text-[10px] text-surface-dim flex items-center gap-1.5 md:gap-1 font-medium">
              <span className="material-symbols-outlined text-[16px] md:text-[13px] text-secondary-fixed">calendar_today</span>
              12 April 2025 • CGK ➔ HND (GA874)
            </p>
          </div>

          {/* Quick Flight Route Chip */}
          <div className="flex items-center justify-between p-2 md:p-1.5 rounded-xl md:rounded-lg bg-white/10 backdrop-blur-md">
            <div className="flex items-center gap-2.5 md:gap-2">
              <div className="w-8 h-8 md:w-5 md:h-5 rounded-full bg-primary-container text-white flex items-center justify-center font-black text-[11px] md:text-[9px]">
                GA
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] md:text-[10px] text-white font-extrabold">Garuda Indonesia</span>
                <span className="text-[11px] md:text-[9px] text-surface-variant">Non-stop • 7j 25m</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('itinerary')}
              className="inline-flex items-center gap-1 px-3 py-1.5 md:px-2 md:py-0.5 rounded-full bg-white text-on-surface text-[12px] md:text-[10px] font-bold hover:bg-surface-container-high transition-colors shadow-2xs active:scale-95"
            >
              Atur Detail
              <span className="material-symbols-outlined text-[15px] md:text-[12px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Today's Itinerary Quick Card */}
      <div className="rounded-2xl md:rounded-xl bg-surface-container-lowest p-4 md:p-3 shadow-xs flex flex-col space-y-2.5 md:space-y-2 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-1.5">
            <span className="w-2 h-2 md:w-1.5 md:h-1.5 rounded-full bg-primary-container"></span>
            <span className="text-[15.5px] md:text-[11.5px] font-bold text-on-surface">Sorotan Hari Ini</span>
          </div>
          <span className="px-2.5 py-0.5 md:px-1.5 md:py-0.2 rounded md:rounded bg-primary-fixed text-primary text-[11px] md:text-[9px] font-bold">
            Hari 1 • Tokyo
          </span>
        </div>

        <div className="relative overflow-hidden rounded-xl md:rounded-lg bg-surface-container-low p-3 md:p-2 flex gap-3 md:gap-2 items-center">
          <div className="w-12 h-12 md:w-10 md:h-10 rounded-xl md:rounded-md overflow-hidden shrink-0 bg-primary-fixed/25 flex items-center justify-center text-primary-container">
            <span className="material-symbols-outlined text-[22px] md:text-[18px]">park</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1 space-y-0.5 leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 md:px-1 md:py-0.2 rounded bg-secondary-fixed text-on-secondary-fixed text-[10.5px] md:text-[8.5px] font-bold">
                14:30 JST
              </span>
              <span className="text-[12px] md:text-[10px] text-on-surface-variant font-semibold truncate">
                Shinjuku & Shibuya
              </span>
            </div>
            <h4 className="text-[14.5px] md:text-[11.5px] font-bold text-on-surface truncate">
              Shinjuku Gyoen Garden
            </h4>
            <p className="text-[12px] md:text-[9.5px] text-on-surface-variant line-clamp-1">
              Piknik santai hanami sakura & istirahat sejenak setelah check-in hotel.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('itinerary')}
          className="w-full h-10 md:h-8 px-3 rounded-xl md:rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 text-on-surface text-[13px] md:text-[10.5px] font-bold border border-surface-container active:scale-98"
        >
          <span className="material-symbols-outlined text-[17px] md:text-[13px] text-primary-container">route</span>
          Lihat Seluruh Itinerary
        </button>
      </div>

      {/* 3. Islamic Prayer Quick Summary Card */}
      <div className="rounded-2xl md:rounded-xl bg-surface-container-lowest p-4 md:p-3 shadow-xs flex flex-col space-y-2.5 md:space-y-2 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-1.5">
            <span className="material-symbols-outlined text-[20px] md:text-[15px] text-secondary">mosque</span>
            <div>
              <h4 className="text-[15px] md:text-[11.5px] font-bold text-on-surface leading-tight">Jadwal Sholat Terdekat</h4>
              <p className="text-[12px] md:text-[10px] text-on-surface-variant">Tokyo, Japan (JST)</p>
            </div>
          </div>
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[13px] md:text-[11px] text-primary font-black">
              {prayers ? `${prayers.nextPrayer.name} (${prayers.nextPrayer.time})` : 'Ashar (15:20)'}
            </span>
            <span className="text-[10.5px] md:text-[9.5px] text-on-surface-variant font-medium">Metode Muslim League</span>
          </div>
        </div>

        {/* Five Mini Prayer Badges */}
        <div className="grid grid-cols-5 gap-1.5 md:gap-1 pt-0.5">
          <div className="flex flex-col items-center justify-center py-2 md:py-1.5 px-0.5 rounded-xl md:rounded-lg bg-surface-container-low text-center">
            <span className="text-[11.5px] md:text-[9.5px] text-on-surface-variant font-semibold">Subuh</span>
            <span className="text-[13px] md:text-[11px] font-bold text-on-surface mt-0.5">{prayers?.fajr || '04:15'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 md:py-1.5 px-0.5 rounded-xl md:rounded-lg bg-surface-container-low text-center">
            <span className="text-[11.5px] md:text-[9.5px] text-on-surface-variant font-semibold">Dzuhur</span>
            <span className="text-[13px] md:text-[11px] font-bold text-on-surface mt-0.5">{prayers?.dhuhr || '11:52'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 md:py-1.5 px-0.5 rounded-xl md:rounded-lg bg-secondary-container text-on-secondary-container text-center shadow-xs">
            <span className="text-[11.5px] md:text-[9.5px] font-black uppercase tracking-wider">Ashar</span>
            <span className="text-[13px] md:text-[11px] font-black mt-0.5">{prayers?.asr || '15:20'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 md:py-1.5 px-0.5 rounded-xl md:rounded-lg bg-surface-container-low text-center">
            <span className="text-[11.5px] md:text-[9.5px] text-on-surface-variant font-semibold">Maghrib</span>
            <span className="text-[13px] md:text-[11px] font-bold text-on-surface mt-0.5">{prayers?.maghrib || '18:10'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-2 md:py-1.5 px-0.5 rounded-xl md:rounded-lg bg-surface-container-low text-center">
            <span className="text-[11.5px] md:text-[9.5px] text-on-surface-variant font-semibold">Isya</span>
            <span className="text-[13px] md:text-[11px] font-bold text-on-surface mt-0.5">{prayers?.isha || '19:28'}</span>
          </div>
        </div>

        {/* Quick Halal & Qibla Actions */}
        <div className="grid grid-cols-2 gap-2 md:gap-1.5 pt-0.5">
          <button
            onClick={() => onNavigateTab('ibadah')}
            className="flex items-center justify-center gap-1.5 py-2 md:py-1.5 px-2.5 rounded-xl md:rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-[12px] md:text-[10.5px] font-bold border border-surface-container active:scale-95"
          >
            <span className="material-symbols-outlined text-[17px] md:text-[14px] text-primary">explore</span>
            <span>Kiblat 293° Barat Laut</span>
          </button>
          <button
            onClick={() => onNavigateTab('ibadah')}
            className="flex items-center justify-center gap-1.5 py-2 md:py-1.5 px-2.5 rounded-xl md:rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-[12px] md:text-[10.5px] font-bold border border-surface-container active:scale-95"
          >
            <span className="material-symbols-outlined text-[17px] md:text-[14px] text-secondary">restaurant_menu</span>
            <span>Masjid & Halal Spot</span>
          </button>
        </div>
      </div>

      {/* 4. Budget & Financial Tracker Summary */}
      <div className="rounded-2xl md:rounded-xl bg-surface-container-lowest p-4 md:p-3 shadow-xs flex flex-col space-y-2.5 md:space-y-2 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-1.5">
            <div className="w-7 h-7 md:w-5.5 md:h-5.5 rounded-xl md:rounded-md bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[18px] md:text-[15px]">currency_yen</span>
            </div>
            <div>
              <h4 className="text-[15px] md:text-[11.5px] font-bold text-on-surface leading-tight">Ringkasan Biaya</h4>
              <span className="text-[12px] md:text-[9.5px] text-on-surface-variant font-medium">Kurs: ¥1 ≈ Rp {rate.toFixed(1)}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('biaya')}
            className="text-primary text-[12.5px] md:text-[10.5px] font-bold hover:underline"
          >
            Detail
          </button>
        </div>

        <div className="space-y-1.5 bg-surface-container-low p-3 md:p-2 rounded-xl md:rounded-lg">
          <div className="flex justify-between items-baseline text-[12.5px] md:text-[10.5px]">
            <span className="text-on-surface-variant font-bold">Terpakai ({usagePercent}%)</span>
            <span className="font-black text-on-surface text-[13.5px] md:text-[11px]">
              Rp {formatRupiah(totalExpenseIdr)}{' '}
              <span className="font-normal text-on-surface-variant text-[11px] md:text-[9.5px]">/ Rp 35jt</span>
            </span>
          </div>

          <div className="w-full h-2 md:h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
            <div className="h-full bg-primary-container" style={{ width: `${Math.min(usagePercent, 70)}%` }}></div>
            <div className="h-full bg-secondary-container" style={{ width: `${Math.max(0, usagePercent - 70)}%` }}></div>
          </div>

          <div className="flex items-center justify-between pt-0.5 text-on-surface-variant text-[12px] md:text-[9.5px]">
            <span className="font-medium">Sisa Saldo Kas:</span>
            <span className="font-black text-on-surface text-[13.5px] md:text-[11px]">
              ¥ {formatJpy(remainingJpy)}{' '}
              <span className="text-secondary font-bold text-[12px] md:text-[9.5px]">(~ Rp {formatRupiah(remainingBudget)})</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-1.5">
          <button
            type="button"
            onClick={onOpenAddExpense || (() => onNavigateTab('biaya'))}
            className="h-10 md:h-7.5 px-3 rounded-xl md:rounded-lg bg-primary-container text-white text-[12.5px] md:text-[10.5px] font-bold flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[17px] md:text-[14px]">add_circle</span>
            Catat Pengeluaran
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('biaya')}
            className="h-10 md:h-7.5 px-3 rounded-xl md:rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface text-[12.5px] md:text-[10.5px] font-bold flex items-center justify-center gap-1.5 border border-surface-container active:scale-95"
          >
            <span className="material-symbols-outlined text-[17px] md:text-[14px] text-secondary">sync_alt</span>
            Konversi Kurs
          </button>
        </div>
      </div>

      {/* 5. Preparation Progress Bar */}
      <div className="rounded-2xl md:rounded-xl bg-surface-container-lowest p-4 md:p-3 shadow-xs flex flex-col space-y-2 border border-surface-container/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-1.5">
            <span className="material-symbols-outlined text-[19px] md:text-[15px] text-primary-container">checklist</span>
            <span className="text-[15px] md:text-[11.5px] font-bold text-on-surface">Kesiapan Berangkat</span>
          </div>
          <span className="text-[12.5px] md:text-[10.5px] font-bold text-primary">
            {completedChecklist} / {totalChecklist} Selesai ({checklistPercent}%)
          </span>
        </div>

        <div className="w-full h-2 md:h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-container rounded-full transition-all duration-500"
            style={{ width: `${checklistPercent}%` }}
          ></div>
        </div>

        <button
          onClick={() => onNavigateTab('bekal')}
          className="text-center py-1 md:py-0.5 text-[12.5px] md:text-[10.5px] text-primary font-bold hover:underline"
        >
          Buka Checklist & Dokumen Koper
        </button>
      </div>

      {/* 6. Quick Access Bento Grid */}
      <div className="flex flex-col space-y-2 pt-0.5">
        <span className="text-[12px] md:text-[10px] font-black uppercase tracking-wider text-on-surface-variant">
          Akses Cepat Teman Jalan
        </span>
        <div className="grid grid-cols-2 gap-2.5 md:gap-2">
          <button
            onClick={() => onNavigateTab('itinerary')}
            className="p-3 md:p-2.5 rounded-2xl md:rounded-xl bg-surface-container-lowest shadow-2xs flex flex-col justify-between hover:bg-surface-container-low transition-all active:scale-[0.98] text-left border border-surface-container/80"
          >
            <div className="w-8 h-8 md:w-6.5 md:h-6.5 rounded-xl md:rounded-lg bg-primary-fixed text-primary flex items-center justify-center mb-2 md:mb-1.5">
              <span className="material-symbols-outlined text-[18px] md:text-[14px]">calendar_month</span>
            </div>
            <span className="text-[13px] md:text-[11px] font-bold text-on-surface leading-tight">Itinerary Lengkap</span>
            <span className="text-[11px] md:text-[9px] text-on-surface-variant mt-0.5">Jadwal 7 Hari Tokyo-Kyoto</span>
          </button>

          <button
            onClick={() => onNavigateTab('biaya')}
            className="p-3 md:p-2.5 rounded-2xl md:rounded-xl bg-surface-container-lowest shadow-2xs flex flex-col justify-between hover:bg-surface-container-low transition-all active:scale-[0.98] text-left border border-surface-container/80"
          >
            <div className="w-8 h-8 md:w-6.5 md:h-6.5 rounded-xl md:rounded-lg bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mb-2 md:mb-1.5">
              <span className="material-symbols-outlined text-[18px] md:text-[14px]">currency_exchange</span>
            </div>
            <span className="text-[13px] md:text-[11px] font-bold text-on-surface leading-tight">Konverter Kurs</span>
            <span className="text-[11px] md:text-[9px] text-on-surface-variant mt-0.5">¥ JPY ➔ Rp IDR Instan</span>
          </button>

          <button
            onClick={() => onNavigateTab('ibadah')}
            className="p-3 md:p-2.5 rounded-2xl md:rounded-xl bg-surface-container-lowest shadow-2xs flex flex-col justify-between hover:bg-surface-container-low transition-all active:scale-[0.98] text-left border border-surface-container/80"
          >
            <div className="w-8 h-8 md:w-6.5 md:h-6.5 rounded-xl md:rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center mb-2 md:mb-1.5">
              <span className="material-symbols-outlined text-[18px] md:text-[14px]">compass_calibration</span>
            </div>
            <span className="text-[13px] md:text-[11px] font-bold text-on-surface leading-tight">Kompas Kiblat</span>
            <span className="text-[11px] md:text-[9px] text-on-surface-variant mt-0.5">Akurat dengan GPS</span>
          </button>

          <button
            onClick={() => onNavigateTab('ibadah')}
            className="p-3 md:p-2.5 rounded-2xl md:rounded-xl bg-surface-container-lowest shadow-2xs flex flex-col justify-between hover:bg-surface-container-low transition-all active:scale-[0.98] text-left border border-surface-container/80"
          >
            <div className="w-8 h-8 md:w-6.5 md:h-6.5 rounded-xl md:rounded-lg bg-error-container text-primary-container flex items-center justify-center mb-2 md:mb-1.5">
              <span className="material-symbols-outlined text-[18px] md:text-[14px]">storefront</span>
            </div>
            <span className="text-[13px] md:text-[11px] font-bold text-on-surface leading-tight">Masjid & Kuliner</span>
            <span className="text-[11px] md:text-[9px] text-on-surface-variant mt-0.5">Direktori Halal</span>
          </button>

          <button
            onClick={() => onNavigateTab('bekal')}
            className="col-span-2 p-3 md:p-2.5 rounded-2xl md:rounded-xl bg-surface-container-lowest shadow-2xs flex items-center justify-between hover:bg-surface-container-low transition-all active:scale-[0.99] border border-surface-container/80"
          >
            <div className="flex items-center gap-3 md:gap-2">
              <div className="w-8 h-8 md:w-6.5 md:h-6.5 rounded-xl md:rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] md:text-[14px]">luggage</span>
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[13px] md:text-[11px] font-bold text-on-surface">Checklist & Bekal Koper</span>
                <span className="text-[11px] md:text-[9px] text-on-surface-variant mt-0.5">Panduan pakaian & obat penting</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[18px] md:text-[14px] text-on-surface-variant">chevron_right</span>
          </button>
        </div>
      </div>
    </div>

  );
};

