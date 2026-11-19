import { useEffect, useState } from 'react';
import { db, type ChecklistItem } from '../../database/dexie';

export const BekalScreen: React.FC = () => {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedSeason, setSelectedSeason] = useState<'spring' | 'summer' | 'autumn' | 'winter'>('spring');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ChecklistItem['category']>('Documents');
  const [newItemPriority, setNewItemPriority] = useState(false);

  async function loadData() {
    const all = await db.checklist_items.orderBy('sort_order').toArray();
    setItems(all);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (id: string, current: boolean) => {
    await db.checklist_items.update(id, { completed: !current });
    loadData();
  };

  const handleDelete = async (id: string) => {
    await db.checklist_items.delete(id);
    loadData();
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    await db.checklist_items.add({
      id: `chk-${Date.now()}`,
      title: newItemTitle.trim(),
      category: newItemCategory,
      completed: false,
      is_priority: newItemPriority,
      sort_order: items.length + 1,
      is_custom: true,
      season: selectedSeason,
    });

    setNewItemTitle('');
    setShowAddModal(false);
    loadData();
  };

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const categories = [
    'Semua',
    'Documents',
    'Electronics',
    'Clothing',
    'Worship Equipment',
    'Medication',
    'Travel Accessories',
  ];

  const categoryTranslations: Record<string, string> = {
    Documents: 'Dokumen Penting',
    Electronics: 'Gadget & Elektronik',
    Clothing: 'Pakaian & Sepatu',
    'Worship Equipment': 'Perlengkapan Ibadah',
    Medication: 'Obat & Kesehatan',
    'Travel Accessories': 'Aksesoris Koper',
  };

  const filteredItems = items.filter((i) => {
    if (selectedCategory === 'Semua') return true;
    return i.category === selectedCategory;
  });

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4">
      {/* Header Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-surface-container/80">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">luggage</span>
            </div>
            <div>
              <h2 className="text-[13.5px] font-bold text-on-surface">Checklist & Bekal Koper</h2>
              <span className="text-[11px] text-on-surface-variant font-medium">Panduan persiapan matang ke Jepang</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
            H - 14 Hari
          </span>
        </div>


        {/* Progress Gauge */}
        <div className="bg-surface-container-low rounded-lg p-2.5 space-y-1.5 mt-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-on-surface-variant font-medium">Progress Kelengkapan</span>
            <span className="font-bold text-primary text-[11.5px]">
              {completedCount} dari {totalCount} Selesai ({percent}%)
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-container rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
        </div>

        {/* Season Selector */}
        <div className="pt-2.5 border-t border-surface-container/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-[11.5px] text-on-surface-variant font-semibold">Musim Perjalanan:</span>
          <div className="grid grid-cols-4 gap-1.5 sm:flex sm:gap-1.5">
            {[
              { id: 'spring', label: '🌸 Semi' },
              { id: 'summer', label: '☀️ Panas' },
              { id: 'autumn', label: '🍁 Gugur' },
              { id: 'winter', label: '❄️ Dingin' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSeason(s.id as any)}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-bold text-center transition-colors ${
                  selectedSeason === s.id
                    ? 'bg-primary-container text-white shadow-2xs'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`h-7.5 px-3 rounded-full text-[11px] font-semibold flex items-center whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-primary-container text-white shadow-2xs'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-surface-container'
            }`}
          >
            {categoryTranslations[cat] || cat}
          </button>
        ))}
      </div>

      {/* Checklist Feed */}
      <div className="space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
              item.completed
                ? 'bg-surface-container-low/60 border-surface-container opacity-75'
                : 'bg-surface-container-lowest border-surface-container shadow-xs'
            }`}
          >
            <div
              onClick={() => handleToggle(item.id, item.completed)}
              className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            >
              <button
                type="button"
                aria-label="Toggle Complete"
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                  item.completed
                    ? 'bg-primary-container text-white'
                    : 'border-[1.5px] border-outline-variant bg-white'
                }`}
              >
                {item.completed && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[13px] font-bold ${
                      item.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.is_priority && (
                    <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container text-[9.5px] font-bold">
                      Prioritas
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-on-surface-variant mt-0.5">
                  {categoryTranslations[item.category] || item.category}
                </span>
              </div>
            </div>
            {item.is_custom && (
              <button
                type="button"
                aria-label="Hapus Item"
                onClick={() => handleDelete(item.id)}
                className="text-on-surface-variant/60 hover:text-error transition-colors p-1"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Item Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full h-9.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-[12px] font-bold text-primary flex items-center justify-center gap-1.5 transition-colors border border-dashed border-outline-variant active:scale-98"
      >
        <span className="material-symbols-outlined text-[16px]">add</span>
        Tambah Perlengkapan Kustom
      </button>


      {/* Modal: Tambah Checklist */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-on-surface">Tambah Perlengkapan Koper</h3>
            <form onSubmit={handleAddItemSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Nama Barang / Dokumen</label>
                <input
                  type="text"
                  required
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Misal: Termos Air Hangat & Kaos Kaki Thermal"
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Kategori</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as ChecklistItem['category'])}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                >
                  <option value="Documents">Dokumen Penting</option>
                  <option value="Electronics">Gadget & Elektronik</option>
                  <option value="Clothing">Pakaian & Sepatu</option>
                  <option value="Worship Equipment">Perlengkapan Ibadah</option>
                  <option value="Medication">Obat & Kesehatan</option>
                  <option value="Travel Accessories">Aksesoris Koper</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="priorityCheck"
                  checked={newItemPriority}
                  onChange={(e) => setNewItemPriority(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-container"
                />
                <label htmlFor="priorityCheck" className="text-xs text-on-surface font-medium cursor-pointer">
                  Tandai sebagai Prioritas Utama
                </label>
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
                  Simpan Barang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
