import React, { useEffect, useState } from 'react';
import { db, type Expense, type Budget } from '../../database/dexie';

interface BudgetScreenProps {
  initialOpenAddExpense?: boolean;
}

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ initialOpenAddExpense }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'converter'>('overview');
  const [rate, setRate] = useState<number>(105.0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);

  // Converter state
  const [jpyVal, setJpyVal] = useState<string>('10000');
  const [idrVal, setIdrVal] = useState<string>('1050000');
  const [isJpyToIdr, setIsJpyToIdr] = useState<boolean>(true);

  // Add expense modal
  const [showAddModal, setShowAddModal] = useState<boolean>(!!initialOpenAddExpense);
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState<'JPY' | 'IDR'>('JPY');
  const [expCategory, setExpCategory] = useState<Expense['category']>('Food');
  const [expNotes, setExpNotes] = useState('');

  async function loadData() {
    const allExpenses = await db.expenses.orderBy('expense_date').reverse().toArray();
    setExpenses(allExpenses);

    const allBudgets = await db.budgets.toArray();
    if (allBudgets.length > 0) setBudget(allBudgets[0]);

    const rateSetting = await db.app_settings.get('exchange_rate');
    if (rateSetting && typeof rateSetting.value === 'number') {
      setRate(rateSetting.value);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Sync calculation
  const handleJpyChange = (val: string) => {
    setJpyVal(val);
    const num = parseFloat(val) || 0;
    setIdrVal(Math.round(num * rate).toString());
  };

  const handleIdrChange = (val: string) => {
    setIdrVal(val);
    const num = parseFloat(val) || 0;
    setJpyVal(Math.round(num / rate).toString());
  };

  const setPresetJpy = (amount: number) => {
    handleJpyChange(amount.toString());
  };

  const handleEditRate = async () => {
    const promptVal = prompt('Masukkan kurs JPY ke IDR saat ini (Contoh: 105.5):', rate.toString());
    if (promptVal && !isNaN(parseFloat(promptVal))) {
      const newRate = parseFloat(promptVal);
      setRate(newRate);
      await db.app_settings.put({
        key: 'exchange_rate',
        value: newRate,
        updated_at: new Date().toISOString(),
      });
      // Recalculate
      const num = parseFloat(jpyVal) || 0;
      setIdrVal(Math.round(num * newRate).toString());
    }
  };

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
      exchange_rate: rate, // Snapshot of exchange rate at transaction time
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
    <div className="flex flex-col w-full space-y-2.5">
      {/* Mode Switcher Pill */}
      <div className="p-1 rounded-xl bg-surface-container-high flex items-center justify-between shadow-2xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-[12px] font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-surface-container-lowest text-primary-container shadow-2xs'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">pie_chart</span>
          Ringkasan Biaya
        </button>
        <button
          onClick={() => setActiveTab('converter')}
          className={`flex-1 py-1.5 px-2.5 rounded-lg text-[12px] font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'converter'
              ? 'bg-surface-container-lowest text-primary-container shadow-2xs'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
          Konverter Kurs JPY-IDR
        </button>
      </div>

      {/* SECTION 1: Quick Currency Converter Box */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs border border-surface-container/80">

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant">
              Konversi Instan Saat Belanja
            </span>
          </div>
          <button
            onClick={handleEditRate}
            className="text-primary text-[11px] font-bold flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-[13px]">tune</span>
            Atur Kurs
          </button>
        </div>

        {/* Converter Form */}
        <div className="grid grid-cols-1 gap-2 relative">
          {/* JPY Block */}
          <div className="bg-surface-container-low rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs">
                🇯🇵
              </div>
              <div>
                <span className="text-on-surface-variant text-[10px] block leading-none font-medium">Yen Jepang</span>
                <span className="text-[11px] font-black text-on-surface mt-0.5 block leading-none">JPY</span>
              </div>
            </div>
            <div className="flex items-center text-right">
              <span className="text-base font-black text-on-surface mr-1">¥</span>
              <input
                type="number"
                value={jpyVal}
                onChange={(e) => handleJpyChange(e.target.value)}
                readOnly={!isJpyToIdr}
                className="w-28 bg-transparent text-right text-base font-black text-on-surface focus:outline-none"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-2.5 z-10">
            <button
              aria-label="Tukar Posisi"
              onClick={() => setIsJpyToIdr(!isJpyToIdr)}
              className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container shadow-xs flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">sync_alt</span>
            </button>
          </div>

          {/* IDR Block */}
          <div className="bg-surface-container-low rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-xs">
                🇮🇩
              </div>
              <div>
                <span className="text-on-surface-variant text-[10px] block leading-none font-medium">Rupiah Indonesia</span>
                <span className="text-[11px] font-black text-on-surface mt-0.5 block leading-none">IDR</span>
              </div>
            </div>
            <div className="flex items-center text-right">
              <span className="text-base font-black text-on-surface mr-1">Rp</span>
              <input
                type="number"
                value={idrVal}
                onChange={(e) => handleIdrChange(e.target.value)}
                readOnly={isJpyToIdr}
                className="w-32 bg-transparent text-right text-base font-black text-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-0.5">
          {[1000, 3000, 5000, 10000, 30000].map((amt) => (
            <button
              key={amt}
              onClick={() => setPresetJpy(amt)}
              className="px-2 py-0.5 rounded bg-surface-container text-on-surface text-[10px] font-bold hover:bg-primary-container hover:text-white transition-colors shrink-0 active:scale-95"
            >
              ¥ {new Intl.NumberFormat('ja-JP').format(amt)}
            </button>
          ))}
        </div>

        {/* Rate footer */}
        <div className="mt-2.5 pt-1.5 flex items-center justify-between text-on-surface-variant text-[10.5px] border-t border-surface-container/70">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-secondary">verified_user</span>
            <span>
              Kurs acuan: <strong className="text-on-surface">1 JPY = Rp {rate.toFixed(2)}</strong>
            </span>
          </div>
          <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant text-[9.5px] font-semibold">
            Offline Siap
          </span>
        </div>
      </div>


      {activeTab === 'overview' && (
        <>
          {/* SECTION 2: Budget Card Overview */}
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-xs relative overflow-hidden border border-surface-container/80">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-on-surface-variant text-[9px] uppercase tracking-wider block font-bold">
                  Buku Anggaran Traveling
                </span>
                <h2 className="text-[13px] font-bold text-on-surface leading-tight">
                  Trip Musim Semi Tokyo-Kyoto
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-primary text-[9px] font-bold">
                Aktif
              </span>
            </div>

            {/* Balances */}
            <div className="bg-surface-container-low rounded-lg p-2.5 mb-2.5">
              <span className="text-[10px] text-on-surface-variant block">Sisa Saldo Aman</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <div className="text-base font-bold text-on-surface tracking-tight">
                  Rp {formatRupiah(remainingBudget)}
                </div>
                <div className="text-[10.5px] font-semibold text-on-surface-variant">
                  Setara ¥ {formatJpy(remainingJpy)}
                </div>
              </div>

              {/* Multi-Segment Bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-on-surface-variant font-medium">
                    Terpakai:{' '}
                    <strong className="text-primary font-bold">
                      Rp {formatRupiah(totalExpenseIdr)} ({usagePercent}%)
                    </strong>
                  </span>
                  <span className="text-on-surface-variant">
                    Plafon: <strong>Rp {formatRupiah(totalBudget)}</strong>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden flex">
                  <div className="h-full bg-primary-container" style={{ width: '28%' }} title="Food"></div>
                  <div className="h-full bg-secondary-container" style={{ width: '32%' }} title="Transport"></div>
                  <div className="h-full bg-surface-tint" style={{ width: '16%' }} title="Attraction"></div>
                  <div className="h-full bg-outline" style={{ width: '14%' }} title="Shopping"></div>
                  <div className="h-full bg-tertiary-container" style={{ width: '10%' }} title="Other"></div>
                </div>
              </div>
            </div>

            {/* Daily pills */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-lg bg-surface-container/70">
                <span className="text-[9px] text-on-surface-variant block">Rata-rata Terpakai</span>
                <span className="text-[11px] font-bold text-on-surface mt-0.5 block">
                  Rp {formatRupiah(totalExpenseIdr / 4)} <span className="text-[9px] font-normal">/hari</span>
                </span>
              </div>
              <div className="p-2 rounded-lg bg-surface-container/70">
                <span className="text-[9px] text-on-surface-variant block">Estimasi Sisa Kuota</span>
                <span className="text-[11px] font-bold text-secondary mt-0.5 block">
                  ¥ {formatJpy(remainingJpy / 4)} <span className="text-[9px] font-normal">/hari</span>
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: Kategori Pengeluaran */}
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-xs border border-surface-container/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">donut_large</span>
                <h3 className="text-xs font-bold text-on-surface">Alokasi & Realisasi</h3>
              </div>
              <span className="text-[10px] text-on-surface-variant">5 Kategori Aktif</span>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Kuliner & Halal Food', cat: 'Food', icon: 'restaurant', color: 'primary', tag: 'Halal' },
                { label: 'Transport (JR / Suica IC)', cat: 'Transportation', icon: 'train', color: 'secondary' },
                { label: 'Tiket Wisata & Atraksi', cat: 'Attraction', icon: 'confirmation_number', color: 'surface' },
                { label: 'Belanja & Oleh-oleh', cat: 'Shopping', icon: 'shopping_bag', color: 'outline' },
                { label: 'Locker & Lainnya', cat: 'Other', icon: 'local_convenience_store', color: 'tertiary' },
              ].map((item) => {
                const totalCat = categoryTotals[item.cat] || 0;
                const catPercent = totalExpenseIdr > 0 ? Math.round((totalCat / totalExpenseIdr) * 100) : 0;
                return (
                  <div key={item.cat} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-bold text-on-surface">{item.label}</span>
                          {item.tag && (
                            <span className="px-1 py-0.2 rounded-full bg-primary-fixed text-primary text-[8px] font-bold uppercase">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-on-surface-variant">
                          ¥ {formatJpy(totalCat / rate)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-on-surface block">
                        Rp {formatRupiah(totalCat)}
                      </span>
                      <span className="text-[9px] text-on-surface-variant">{catPercent}% total</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: Transaksi Terbaru */}
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-xs border border-surface-container/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">history</span>
                <h3 className="text-xs font-bold text-on-surface">Transaksi Terbaru</h3>
              </div>
              <span className="text-[10px] text-on-surface-variant">{expenses.length} Transaksi</span>
            </div>

            <div className="space-y-1.5">
              {expenses.map((exp) => (
                <div key={exp.id} className="p-2 rounded-lg bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[15px]">payments</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-on-surface block leading-tight">{exp.name}</span>
                      <span className="text-[9.5px] text-on-surface-variant leading-tight">
                        {exp.expense_date} • {exp.notes || exp.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-on-surface block leading-tight">
                      -¥ {formatJpy(exp.original_currency === 'JPY' ? exp.original_amount : exp.converted_idr / rate)}
                    </span>
                    <span className="text-[9.5px] text-on-surface-variant leading-tight">
                      Rp {formatRupiah(exp.converted_idr)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Omotenashi Tip Box */}
          <div className="p-2.5 rounded-xl bg-secondary-fixed/30 flex items-start gap-2 border border-secondary-fixed/50">
            <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5 shrink-0">
              lightbulb
            </span>
            <div>
              <span className="text-[11px] font-bold text-on-secondary-fixed-variant block">
                Tips Hemat Teman Jalan:
              </span>
              <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed">
                Bawalah selalu paspor fisik Anda untuk fasilitas <em>Tax-Free (10%)</em> di toko ritel seperti Don Quijote atau Matsumoto Kiyoshi dengan minimum belanja ¥5.000!
              </p>
            </div>
          </div>
        </>
      )}

      {/* Sticky Bottom CTA: Catat Pengeluaran Baru */}
      <div className="sticky bottom-14 z-30 flex justify-center pt-1">
        <button
          onClick={() => setShowAddModal(true)}
          className="h-8.5 px-4 bg-primary-container text-white rounded-full shadow-md flex items-center justify-center gap-1.5 text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          Catat Pengeluaran Baru
        </button>
      </div>

      {/* Modal: Tambah Pengeluaran */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-on-surface">Catat Pengeluaran Baru</h3>
            <form onSubmit={handleAddExpenseSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Nama Transaksi</label>
                <input
                  type="text"
                  required
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  placeholder="Misal: Makan Siang Sushi Halal"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-on-surface block mb-1">Nominal</label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="1500"
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface block mb-1">Mata Uang</label>
                  <select
                    value={expCurrency}
                    onChange={(e) => setExpCurrency(e.target.value as 'JPY' | 'IDR')}
                    className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                  >
                    <option value="JPY">JPY (¥)</option>
                    <option value="IDR">IDR (Rp)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Kategori</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as Expense['category'])}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
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
                <label className="text-xs font-semibold text-on-surface block mb-1">Catatan / Lokasi</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Misal: Stasiun Shinjuku / Don Quijote"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 h-10 rounded-xl bg-surface-container text-xs font-semibold text-on-surface"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-primary-container text-xs font-semibold text-white"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
