import React, { useEffect, useRef, useState } from 'react';
import { db, type Expense, type Budget } from '../../database/dexie';

interface BudgetScreenProps {
  initialOpenAddExpense?: boolean;
}

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ initialOpenAddExpense }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'converter'>('overview');
  const [rate, setRate] = useState<number>(114.14);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);

  const jpyInputRef = useRef<HTMLInputElement>(null);
  const idrInputRef = useRef<HTMLInputElement>(null);

  // Converter state
  const [jpyVal, setJpyVal] = useState<string>('10000');
  const [idrVal, setIdrVal] = useState<string>('1141400');
  const [isJpyToIdr, setIsJpyToIdr] = useState<boolean>(true);

  // Add expense modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(!!initialOpenAddExpense);
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState<'JPY' | 'IDR'>('JPY');
  const [expCategory, setExpCategory] = useState<Expense['category']>('Food');
  const [expNotes, setExpNotes] = useState('');

  // Edit expense modal state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Edit budget ceiling modal state
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [budgetAmountInput, setBudgetAmountInput] = useState('');
  const [budgetNameInput, setBudgetNameInput] = useState('');

  // Edit exchange rate modal state
  const [showEditRateModal, setShowEditRateModal] = useState(false);
  const [rateInput, setRateInput] = useState('114.14');
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [fetchRateMessage, setFetchRateMessage] = useState<string | null>(null);

  async function loadData() {
    const allExpenses = await db.expenses.orderBy('expense_date').reverse().toArray();
    setExpenses(allExpenses);

    const allBudgets = await db.budgets.toArray();
    if (allBudgets.length > 0) setBudget(allBudgets[0]);

    const rateSetting = await db.app_settings.get('exchange_rate');
    if (rateSetting && typeof rateSetting.value === 'number') {
      setRate(rateSetting.value);
      setIdrVal(Math.round(10000 * rateSetting.value).toString());
    } else {
      await db.app_settings.put({
        key: 'exchange_rate',
        value: 114.14,
        updated_at: new Date().toISOString(),
      });
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Helper for thousand separator dots (Indonesian standard: 10.000, 1.050.000)
  const formatWithDots = (val: string | number): string => {
    if (!val && val !== 0) return '';
    const clean = val.toString().replace(/\D/g, '');
    if (!clean) return '';
    return new Intl.NumberFormat('id-ID').format(Number(clean));
  };

  const parseDigits = (val: string): number => {
    const clean = val.replace(/\D/g, '');
    return clean ? parseInt(clean, 10) : 0;
  };

  // Sync calculation with dot formatting support
  const handleJpyChange = (val: string) => {
    const num = parseDigits(val);
    setJpyVal(num > 0 ? num.toString() : '');
    const converted = num > 0 ? Math.round(num * rate) : 0;
    setIdrVal(converted > 0 ? converted.toString() : '');
  };

  const handleIdrChange = (val: string) => {
    const num = parseDigits(val);
    setIdrVal(num > 0 ? num.toString() : '');
    const converted = num > 0 ? Math.round(num / rate) : 0;
    setJpyVal(converted > 0 ? converted.toString() : '');
  };

  const setPresetJpy = (amount: number) => {
    setJpyVal(amount.toString());
    setIdrVal(Math.round(amount * rate).toString());
  };

  const handleOpenEditRate = () => {
    setRateInput(rate.toString());
    setFetchRateMessage(null);
    setShowEditRateModal(true);
  };

  const handleFetchLiveRate = async () => {
    setIsFetchingRate(true);
    setFetchRateMessage(null);
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/JPY');
      if (!res.ok) throw new Error('Gagal mengambil kurs online');
      const data = await res.json();
      if (data && data.rates && typeof data.rates.IDR === 'number') {
        const liveRate = Math.round(data.rates.IDR * 100) / 100;
        setRateInput(liveRate.toString());
        setFetchRateMessage(`Kurs live internet berhasil dimuat: 1 JPY = Rp ${liveRate}`);
      } else {
        throw new Error('Format data tidak sesuai');
      }
    } catch {
      setFetchRateMessage('Gagal mengambil kurs live. Silakan ketik nilai kurs secara manual.');
    } finally {
      setIsFetchingRate(false);
    }
  };

  const handleSaveRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRate = parseFloat(rateInput.replace(',', '.'));
    if (isNaN(cleanRate) || cleanRate <= 0) return;

    setRate(cleanRate);
    await db.app_settings.put({
      key: 'exchange_rate',
      value: cleanRate,
      updated_at: new Date().toISOString(),
    });

    // Recalculate active inputs
    const num = parseDigits(jpyVal);
    const converted = num > 0 ? Math.round(num * cleanRate) : 0;
    setIdrVal(converted > 0 ? converted.toString() : '');

    setShowEditRateModal(false);
  };

  // --- BUDGET CEILING HANDLERS ---
  const handleOpenEditBudget = () => {
    setBudgetAmountInput(formatWithDots(budget?.amount || 35000000));
    setBudgetNameInput(budget?.name || 'Trip Musim Semi Tokyo-Kyoto');
    setShowEditBudgetModal(true);
  };

  const handleSaveBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseDigits(budgetAmountInput);
    if (cleanAmount <= 0) return;

    if (budget) {
      await db.budgets.update(budget.id, {
        amount: cleanAmount,
        name: budgetNameInput.trim() || 'Trip Musim Semi Tokyo-Kyoto',
      });
    } else {
      await db.budgets.add({
        id: 'budget-1',
        trip_id: 'trip-1',
        name: budgetNameInput.trim() || 'Trip Musim Semi Tokyo-Kyoto',
        amount: cleanAmount,
        currency: 'IDR',
        created_at: new Date().toISOString(),
      });
    }

    setShowEditBudgetModal(false);
    loadData();
  };

  // --- EXPENSE ADD / EDIT / DELETE HANDLERS ---
  const handleAddExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName.trim() || !expAmount) return;

    const amountNum = parseFloat(expAmount) || 0;
    let convertedIdr = amountNum;
    if (expCurrency === 'JPY') {
      convertedIdr = Math.round(amountNum * rate);
    }

    await db.expenses.add({
      id: `exp-${Date.now()}`,
      budget_id: budget?.id || 'budget-1',
      name: expName.trim(),
      category: expCategory,
      original_amount: amountNum,
      original_currency: expCurrency,
      exchange_rate: rate,
      converted_idr: convertedIdr,
      expense_date: new Date().toISOString().split('T')[0],
      notes: expNotes,
      location_name: expNotes || 'Tokyo/Kyoto Spot',
    });

    setExpName('');
    setExpAmount('');
    setExpNotes('');
    setShowAddModal(false);
    loadData();
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpName(exp.name);
    setExpAmount(exp.original_amount.toString());
    setExpCurrency(exp.original_currency);
    setExpCategory(exp.category);
    setExpNotes(exp.notes || '');
  };

  const handleEditExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !expName.trim() || !expAmount) return;

    const amountNum = parseFloat(expAmount) || 0;
    let convertedIdr = amountNum;
    if (expCurrency === 'JPY') {
      convertedIdr = Math.round(amountNum * rate);
    }

    await db.expenses.update(editingExpense.id, {
      name: expName.trim(),
      category: expCategory,
      original_amount: amountNum,
      original_currency: expCurrency,
      converted_idr: convertedIdr,
      notes: expNotes,
      location_name: expNotes || 'Tokyo/Kyoto Spot',
    });

    setEditingExpense(null);
    setExpName('');
    setExpAmount('');
    setExpNotes('');
    loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Hapus transaksi pengeluaran ini? Saldo kas akan dikembalikan.')) return;
    await db.expenses.delete(id);
    setEditingExpense(null);
    loadData();
  };

  // Calculations
  const totalBudget = budget?.amount || 35000000;
  const totalExpenseIdr = expenses.reduce((acc, curr) => acc + curr.converted_idr, 0);
  const remainingBudget = Math.max(0, totalBudget - totalExpenseIdr);
  const remainingJpy = Math.round(remainingBudget / rate);
  const usagePercent = Math.min(100, Math.round((totalExpenseIdr / totalBudget) * 100));

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.converted_idr;
  }

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID').format(Math.round(num));
  const formatJpy = (num: number) => new Intl.NumberFormat('ja-JP').format(Math.round(num));

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* Mode Switcher Pill - Minimalis 1 Baris */}
      <div className="p-1 rounded-2xl bg-surface-container-high flex items-center justify-between shadow-2xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold text-center transition-all ${
            activeTab === 'overview'
              ? 'bg-surface-container-lowest text-primary shadow-2xs'
              : 'text-on-surface-variant'
          }`}
        >
          Ringkasan Biaya
        </button>
        <button
          onClick={() => setActiveTab('converter')}
          className={`flex-1 py-2 px-3 rounded-xl text-[12px] font-bold text-center transition-all ${
            activeTab === 'converter'
              ? 'bg-surface-container-lowest text-primary shadow-2xs'
              : 'text-on-surface-variant'
          }`}
        >
          Konverter Kurs
        </button>
      </div>

      {/* SECTION 1: Quick Currency Converter Box - Bersih, Seimbang & Presisi */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container/80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12.5px] font-bold text-on-surface">
            Konverter Kurs
          </span>
          <button
            onClick={handleOpenEditRate}
            className="text-primary text-[11px] font-bold hover:underline"
          >
            Atur Kurs
          </button>
        </div>

        {/* Converter Form */}
        <div className="flex flex-col gap-2 relative">
          {/* JPY Block */}
          <div className="bg-surface-container-low rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 border border-surface-container/60">
            {/* Flag & Currency Code */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-full bg-white border border-surface-container-high flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                <div className="w-3.5 h-3.5 rounded-full bg-[#bc002d]"></div>
              </div>
              <div className="flex flex-col justify-center leading-none">
                <span className="font-extrabold text-[14px] text-on-surface tracking-tight">JPY</span>
                <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">Yen Jepang</span>
              </div>
            </div>

            {/* Value & Symbol - Sejajar di Kanan, Berdampingan Menempel Sempurna */}
            <div
              onClick={() => jpyInputRef.current?.focus()}
              className="flex-1 flex items-center justify-end gap-1 min-w-0 cursor-text"
            >
              <span className="text-[15px] font-black text-on-surface-variant shrink-0 select-none">
                ¥
              </span>
              <input
                ref={jpyInputRef}
                type="text"
                inputMode="numeric"
                value={formatWithDots(jpyVal)}
                onChange={(e) => handleJpyChange(e.target.value)}
                readOnly={!isJpyToIdr}
                placeholder="0"
                style={{ width: `${Math.max(1, (formatWithDots(jpyVal) || '0').length + 0.3)}ch` }}
                className="bg-transparent text-right text-[18px] sm:text-[19px] font-black text-on-surface tabular-nums tracking-tight focus:outline-none shrink-0"
              />
            </div>
          </div>

          {/* Swap Button di Tengah */}
          <div className="flex justify-center -my-2.5 z-10">
            <button
              type="button"
              aria-label="Tukar Posisi Mata Uang"
              onClick={() => setIsJpyToIdr(!isJpyToIdr)}
              className="w-7.5 h-7.5 rounded-full bg-surface-container-highest hover:bg-secondary-container text-on-surface hover:text-on-secondary-container shadow-xs flex items-center justify-center active:scale-95 transition-all border border-surface-container"
            >
              <span className="material-symbols-outlined text-[17px]">swap_vert</span>
            </button>
          </div>

          {/* IDR Block */}
          <div className="bg-surface-container-low rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 border border-surface-container/60">
            {/* Flag & Currency Code */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-full border border-surface-container-high flex flex-col shrink-0 shadow-2xs overflow-hidden">
                <div className="w-full h-1/2 bg-[#d80027]"></div>
                <div className="w-full h-1/2 bg-white"></div>
              </div>
              <div className="flex flex-col justify-center leading-none">
                <span className="font-extrabold text-[14px] text-on-surface tracking-tight">IDR</span>
                <span className="text-[10px] text-on-surface-variant font-medium mt-0.5">Rupiah</span>
              </div>
            </div>

            {/* Value & Symbol - Sejajar di Kanan, Berdampingan Menempel Sempurna */}
            <div
              onClick={() => idrInputRef.current?.focus()}
              className="flex-1 flex items-center justify-end gap-1 min-w-0 cursor-text"
            >
              <span className="text-[15px] font-black text-primary shrink-0 select-none">
                Rp
              </span>
              <input
                ref={idrInputRef}
                type="text"
                inputMode="numeric"
                value={formatWithDots(idrVal)}
                onChange={(e) => handleIdrChange(e.target.value)}
                readOnly={isJpyToIdr}
                placeholder="0"
                style={{ width: `${Math.max(1, (formatWithDots(idrVal) || '0').length + 0.3)}ch` }}
                className="bg-transparent text-right text-[18px] sm:text-[19px] font-black text-primary tabular-nums tracking-tight focus:outline-none shrink-0"
              />
            </div>
          </div>
        </div>

        {/* Quick Presets dengan Pemisah Titik Ribuan */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5">
          {[1000, 3000, 5000, 10000, 30000].map((amt) => (
            <button
              key={amt}
              onClick={() => setPresetJpy(amt)}
              className="h-7 px-2.5 rounded-lg bg-surface-container text-on-surface text-[11px] font-bold hover:bg-primary hover:text-white transition-colors shrink-0 active:scale-95"
            >
              ¥{new Intl.NumberFormat('id-ID').format(amt)}
            </button>
          ))}
        </div>

        {/* Minimal Rate Footer */}
        <div className="mt-2.5 pt-2 flex items-center justify-between text-on-surface-variant text-[11px] border-t border-surface-container/70">
          <span>
            1 JPY = <strong className="text-on-surface">Rp {rate.toFixed(2)}</strong>
          </span>
          <span className="text-[10px] font-semibold text-on-surface-variant/80">
            Siap Offline
          </span>
        </div>
      </div>


      {activeTab === 'overview' && (
        <>
          {/* SECTION 2: Budget Card Overview */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs relative overflow-hidden border border-surface-container/80">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-on-surface-variant text-[9.5px] uppercase tracking-wider block font-bold">
                  Buku Anggaran Traveling
                </span>
                <h2 className="text-[14px] font-bold text-on-surface leading-tight mt-0.5">
                  {budget?.name || 'Trip Musim Semi Tokyo-Kyoto'}
                </h2>
              </div>
              <button
                onClick={handleOpenEditBudget}
                className="h-8 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary text-[11px] font-bold flex items-center gap-1 transition-colors active:scale-95 border border-surface-container shadow-2xs"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Atur Plafon</span>
              </button>
            </div>

            {/* Balances */}
            <div className="bg-surface-container-low rounded-xl p-3 mb-3 border border-surface-container/60">
              <span className="text-[10.5px] text-on-surface-variant font-medium block">Sisa Saldo Kas Aman</span>
              <div className="flex items-baseline justify-between mt-1 flex-wrap gap-1">
                <div className="text-[18px] sm:text-[20px] font-black text-on-surface tracking-tight">
                  Rp {formatRupiah(remainingBudget)}
                </div>
                <div className="text-[12px] font-bold text-secondary">
                  Setara ≈ ¥ {formatJpy(remainingJpy)}
                </div>
              </div>

              {/* Progress Bar & Plafon Info */}
              <div className="mt-3 pt-2 border-t border-surface-container/60">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-on-surface-variant font-medium">
                    Terpakai:{' '}
                    <strong className="text-primary font-bold">
                      Rp {formatRupiah(totalExpenseIdr)} ({usagePercent}%)
                    </strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-on-surface-variant">Plafon:</span>
                    <button
                      onClick={handleOpenEditBudget}
                      className="font-extrabold text-on-surface hover:text-primary transition-colors underline decoration-dotted cursor-pointer"
                      title="Klik untuk ubah plafon anggaran"
                    >
                      Rp {formatRupiah(totalBudget)}
                    </button>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-primary-container rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Daily pills */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-surface-container-low">
                <span className="text-[9.5px] text-on-surface-variant font-medium block">Rata-rata Terpakai</span>
                <span className="text-[12px] font-bold text-on-surface mt-0.5 block">
                  Rp {formatRupiah(totalExpenseIdr / 4)} <span className="text-[9.5px] font-normal text-on-surface-variant">/hari</span>
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low">
                <span className="text-[9.5px] text-on-surface-variant font-medium block">Estimasi Sisa Kuota</span>
                <span className="text-[12px] font-bold text-secondary mt-0.5 block">
                  ¥ {formatJpy(remainingJpy / 4)} <span className="text-[9.5px] font-normal text-on-surface-variant">/hari</span>
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: Kategori Pengeluaran */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container/80">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-on-surface">Rincian Per Kategori</span>
              <span className="text-[11px] text-on-surface-variant font-medium">Berdasarkan Transaksi</span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'Kuliner & Halal Food', cat: 'Food', icon: 'restaurant' },
                { label: 'Transportasi (JR / Bus)', cat: 'Transportation', icon: 'directions_subway' },
                { label: 'Tiket Wisata & Atraksi', cat: 'Attraction', icon: 'confirmation_number' },
                { label: 'Belanja & Oleh-oleh', cat: 'Shopping', icon: 'shopping_bag' },
                { label: 'Lainnya (Locker, dll)', cat: 'Other', icon: 'local_convenience_store' },
              ].map((item) => {
                const totalCat = categoryTotals[item.cat] || 0;
                const catPercent = totalExpenseIdr > 0 ? Math.round((totalCat / totalExpenseIdr) * 100) : 0;
                return (
                  <div key={item.cat} className="flex items-center justify-between py-1 border-b border-surface-container/50 last:border-none">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-surface-container text-on-surface flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                      </div>
                      <div>
                        <span className="text-[12px] font-bold text-on-surface block leading-tight">{item.label}</span>
                        <span className="text-[10px] text-on-surface-variant">
                          ¥ {formatJpy(totalCat / rate)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] font-bold text-on-surface block leading-tight">
                        Rp {formatRupiah(totalCat)}
                      </span>
                      <span className="text-[9.5px] text-on-surface-variant font-medium">{catPercent}% total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: Riwayat Pengeluaran (Bisa Tambah, Ubah, Hapus) */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-xs border border-surface-container/80">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px] text-primary">history</span>
                <h3 className="text-[13px] font-bold text-on-surface">Riwayat Pengeluaran</h3>
              </div>
              <span className="text-[11px] text-on-surface-variant font-medium">{expenses.length} Transaksi</span>
            </div>

            {expenses.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-surface-container-low text-[11.5px] text-on-surface-variant">
                Belum ada catatan pengeluaran. Ketuk tombol <strong>"+ Catat Pengeluaran Baru"</strong> di bawah untuk menambah.
              </div>
            ) : (
              <div className="space-y-2">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => handleOpenEditExpense(exp)}
                    className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container flex items-center justify-between cursor-pointer transition-colors border border-surface-container/60"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[12.5px] font-bold text-on-surface block leading-tight truncate">
                          {exp.name}
                        </span>
                        <span className="text-[10.5px] text-on-surface-variant leading-tight block mt-0.5">
                          {exp.expense_date} • {exp.notes || exp.category}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2 ml-2">
                      <div>
                        <span className="text-[12.5px] font-black text-on-surface block leading-tight">
                          -¥ {formatJpy(exp.original_currency === 'JPY' ? exp.original_amount : exp.converted_idr / rate)}
                        </span>
                        <span className="text-[10px] text-on-surface-variant leading-tight block mt-0.5 font-medium">
                          Rp {formatRupiah(exp.converted_idr)}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">
                        edit
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Sticky Bottom CTA: Catat Pengeluaran Baru */}
      <div className="sticky bottom-16 z-30 flex justify-center pt-1">
        <button
          onClick={() => setShowAddModal(true)}
          className="h-9 px-4 bg-primary-container text-white rounded-full shadow-md flex items-center justify-center gap-1.5 text-[11.5px] font-bold hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          Catat Pengeluaran Baru
        </button>
      </div>

      {/* MODAL 1: Atur Plafon Anggaran */}
      {showEditBudgetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container space-y-3.5">
            <h3 className="text-[14px] font-extrabold text-on-surface">Atur Plafon Anggaran Perjalanan</h3>
            <form onSubmit={handleSaveBudgetSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Nama Anggaran / Catatan Trip</label>
                <input
                  type="text"
                  value={budgetNameInput}
                  onChange={(e) => setBudgetNameInput(e.target.value)}
                  placeholder="Misal: Trip Musim Semi Tokyo-Kyoto"
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Nominal Plafon (Rupiah - IDR)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-on-surface-variant">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={budgetAmountInput}
                    onChange={(e) => setBudgetAmountInput(formatWithDots(e.target.value))}
                    placeholder="35.000.000"
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-surface-container-low text-[14px] font-bold border border-surface-container focus:outline-none"
                  />
                </div>
                <div className="mt-1 text-[11px] text-secondary font-semibold">
                  Setara ≈ ¥ {formatJpy(Math.round(parseDigits(budgetAmountInput) / rate))} JPY (Kurs: Rp {rate.toFixed(1)})
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[10.5px] font-bold text-on-surface-variant block mb-1">Pilihan Cepat Plafon:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[15000000, 25000000, 35000000, 50000000, 75000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBudgetAmountInput(formatWithDots(amt))}
                      className="h-7 px-2.5 rounded-lg bg-surface-container text-on-surface text-[10.5px] font-bold hover:bg-primary hover:text-white transition-colors active:scale-95"
                    >
                      Rp {amt / 1000000} Jt
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditBudgetModal(false)}
                  className="flex-1 h-9.5 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9.5 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
                >
                  Simpan Plafon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah Pengeluaran Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container space-y-3.5">
            <h3 className="text-[14px] font-extrabold text-on-surface">Catat Pengeluaran Baru</h3>
            <form onSubmit={handleAddExpenseSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Nama Transaksi</label>
                <input
                  type="text"
                  required
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  placeholder="Misal: Makan Siang Halal Ramen Shinjuku"
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Nominal</label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="1500"
                    className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Mata Uang</label>
                  <select
                    value={expCurrency}
                    onChange={(e) => setExpCurrency(e.target.value as 'JPY' | 'IDR')}
                    className="w-full h-9 px-2 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  >
                    <option value="JPY">JPY (¥)</option>
                    <option value="IDR">IDR (Rp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Kategori</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as Expense['category'])}
                  className="w-full h-9 px-2 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                >
                  <option value="Food">Kuliner / Halal Food</option>
                  <option value="Transportation">Transportasi (JR / Metro / Bus)</option>
                  <option value="Attraction">Tiket Wisata & Atraksi</option>
                  <option value="Shopping">Belanja & Oleh-oleh</option>
                  <option value="Accommodation">Akomodasi / Hotel</option>
                  <option value="Other">Lainnya (Locker, Minuman, dll)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Catatan / Lokasi</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Misal: Stasiun Shinjuku / Don Quijote"
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-9.5 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9.5 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit / Hapus Transaksi Pengeluaran */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-extrabold text-on-surface">Edit Transaksi Pengeluaran</h3>
              <button
                type="button"
                onClick={() => handleDeleteExpense(editingExpense.id)}
                className="text-error hover:underline text-[11px] font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Hapus
              </button>
            </div>

            <form onSubmit={handleEditExpenseSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Nama Transaksi</label>
                <input
                  type="text"
                  required
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Nominal</label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">Mata Uang</label>
                  <select
                    value={expCurrency}
                    onChange={(e) => setExpCurrency(e.target.value as 'JPY' | 'IDR')}
                    className="w-full h-9 px-2 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                  >
                    <option value="JPY">JPY (¥)</option>
                    <option value="IDR">IDR (Rp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Kategori</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as Expense['category'])}
                  className="w-full h-9 px-2 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                >
                  <option value="Food">Kuliner / Halal Food</option>
                  <option value="Transportation">Transportasi (JR / Metro / Bus)</option>
                  <option value="Attraction">Tiket Wisata & Atraksi</option>
                  <option value="Shopping">Belanja & Oleh-oleh</option>
                  <option value="Accommodation">Akomodasi / Hotel</option>
                  <option value="Other">Lainnya (Locker, Minuman, dll)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">Catatan / Lokasi</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-low text-[12px] border border-surface-container focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 h-9.5 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9.5 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Atur & Perbarui Kurs Mata Uang */}
      {showEditRateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-sm p-4.5 shadow-xl border border-surface-container flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-surface-container/80 pb-2.5">
              <div>
                <h3 className="text-[14px] font-bold text-on-surface">Atur Kurs JPY ke IDR</h3>
                <p className="text-[11px] text-on-surface-variant">Update kurs pasar live internet atau atur manual</p>
              </div>
              <button
                onClick={() => setShowEditRateModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Live Fetch Button from Internet */}
            <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 border border-surface-container">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-on-surface">Kurs Pasar Internet</span>
                <button
                  type="button"
                  onClick={handleFetchLiveRate}
                  disabled={isFetchingRate}
                  className="px-2.5 py-1 rounded-lg bg-primary-container text-white text-[11px] font-bold flex items-center gap-1.5 shadow-2xs hover:brightness-105 active:scale-95 disabled:opacity-75 transition-all"
                >
                  <span className={`material-symbols-outlined text-[14px] ${isFetchingRate ? 'animate-spin' : ''}`}>
                    sync
                  </span>
                  <span>{isFetchingRate ? 'Memuat...' : 'Perbarui dari Internet'}</span>
                </button>
              </div>

              {fetchRateMessage && (
                <p className={`text-[10.5px] font-medium ${fetchRateMessage.includes('berhasil') ? 'text-emerald-700' : 'text-error'}`}>
                  {fetchRateMessage}
                </p>
              )}
            </div>

            <form onSubmit={handleSaveRateSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">
                  Nilai Kurs (1 JPY = ... IDR)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[12px] font-bold text-on-surface-variant">Rp</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    placeholder="114.14"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-low text-[14px] font-bold text-on-surface border border-surface-container focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-[10.5px] font-semibold text-on-surface-variant block mb-1">
                  Preset Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[114.14, 112.0, 110.0, 105.0].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRateInput(preset.toString())}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-colors ${
                        rateInput === preset.toString()
                          ? 'bg-primary-container text-white border-primary-container'
                          : 'bg-surface-container-low text-on-surface border-surface-container hover:bg-surface-container'
                      }`}
                    >
                      Rp {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditRateModal(false)}
                  className="flex-1 h-9.5 rounded-xl bg-surface-container text-[12px] font-bold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9.5 rounded-xl bg-primary-container text-[12px] font-bold text-white shadow-2xs"
                >
                  Simpan Kurs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
