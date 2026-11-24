import { type ChecklistItem } from '../database/dexie';

export interface PackingSublist {
  id: string;
  name: string;
  season: 'all' | 'spring' | 'summer' | 'autumn' | 'winter';
}

export const DEFAULT_PACKING_SUBLISTS: PackingSublist[] = [
  { id: 'sub-dokumen', name: 'Dokumen', season: 'all' },
  { id: 'sub-uang', name: 'Uang & pembayaran', season: 'all' },
  { id: 'sub-elektronik', name: 'Elektronik', season: 'all' },
  { id: 'sub-pakaian-semi', name: 'Pakaian — musim semi', season: 'spring' },
  { id: 'sub-pakaian-panas', name: 'Pakaian — musim panas', season: 'summer' },
  { id: 'sub-pakaian-gugur', name: 'Pakaian — musim gugur', season: 'autumn' },
  { id: 'sub-pakaian-dingin', name: 'Pakaian — musim dingin', season: 'winter' },
  { id: 'sub-sepatu-tas', name: 'Sepatu & tas', season: 'all' },
  { id: 'sub-obat', name: 'Obat & kesehatan', season: 'all' },
  { id: 'sub-sholat', name: 'Perlengkapan sholat', season: 'all' },
  { id: 'sub-lain', name: 'Lain-lain', season: 'all' },
];

export const DEFAULT_TIMELINE_ITEMS: ChecklistItem[] = [
  {
    id: 'tl-1',
    section: 'timeline',
    category: 'Documents',
    title: 'Cek masa berlaku paspor (minimal 6 bulan) atau ajukan e-paspor',
    completed: false,
    days_before_departure: 120,
    is_priority: true,
    sort_order: 1,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-2',
    section: 'timeline',
    category: 'Documents',
    title: 'Tentukan musim, kota tujuan, dan durasi perjalanan',
    completed: false,
    days_before_departure: 90,
    is_priority: false,
    sort_order: 2,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-3',
    section: 'timeline',
    category: 'Documents',
    title: 'Pantau harga tiket pesawat, pasang notifikasi harga',
    completed: false,
    days_before_departure: 90,
    is_priority: false,
    sort_order: 3,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-4',
    section: 'timeline',
    category: 'Documents',
    title: 'Beli tiket pesawat pulang-pergi',
    completed: false,
    days_before_departure: 75,
    is_priority: true,
    sort_order: 4,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-5',
    section: 'timeline',
    category: 'Documents',
    title: 'Daftar visa waiver (e-paspor) atau ajukan visa Jepang',
    completed: false,
    days_before_departure: 60,
    is_priority: true,
    sort_order: 5,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-6',
    section: 'timeline',
    category: 'Documents',
    title: 'Pesan akomodasi yang bisa dibatalkan gratis',
    completed: false,
    days_before_departure: 60,
    is_priority: false,
    sort_order: 6,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-7',
    section: 'timeline',
    category: 'Documents',
    title: 'Susun itinerary harian dan estimasi biaya',
    completed: false,
    days_before_departure: 45,
    is_priority: false,
    sort_order: 7,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-8',
    section: 'timeline',
    category: 'Documents',
    title: 'Beli tiket wisata & tourist pass yang lebih murah online',
    completed: false,
    days_before_departure: 30,
    is_priority: false,
    sort_order: 8,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-9',
    section: 'timeline',
    category: 'Electronics',
    title: 'Siapkan eSIM / SIM card / pocket WiFi',
    completed: false,
    days_before_departure: 21,
    is_priority: true,
    sort_order: 9,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-10',
    section: 'timeline',
    category: 'Documents',
    title: 'Tukar uang tunai Yen & aktifkan transaksi luar negeri kartu',
    completed: false,
    days_before_departure: 14,
    is_priority: true,
    sort_order: 10,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-11',
    section: 'timeline',
    category: 'Documents',
    title: 'Isi Visit Japan Web (Imigrasi & Bea Cukai) dan simpan QR',
    completed: false,
    days_before_departure: 7,
    is_priority: true,
    sort_order: 11,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-12',
    section: 'timeline',
    category: 'Travel Accessories',
    title: 'Cek ramalan cuaca kota tujuan & mulai packing koper',
    completed: false,
    days_before_departure: 3,
    is_priority: false,
    sort_order: 12,
    is_custom: false,
    season: 'all',
  },
  {
    id: 'tl-13',
    section: 'timeline',
    category: 'Documents',
    title: 'Check-in online, cetak cadangan dokumen, & cek berat bagasi',
    completed: false,
    days_before_departure: 1,
    is_priority: true,
    sort_order: 13,
    is_custom: false,
    season: 'all',
  },
];

function makePackingGroup(
  prefix: string,
  group: string,
  category: ChecklistItem['category'],
  season: ChecklistItem['season'],
  startOrder: number,
  titles: string[]
): ChecklistItem[] {
  return titles.map((title, idx) => ({
    id: `${prefix}-${idx + 1}`,
    section: 'packing',
    group,
    category,
    title,
    completed: false,
    sort_order: startOrder + idx,
    is_custom: false,
    season,
  }));
}

export const DEFAULT_PACKING_ITEMS: ChecklistItem[] = [
  // 1. Dokumen (9)
  ...makePackingGroup('pk-dok', 'Dokumen', 'Documents', 'all', 100, [
    'Paspor / e-paspor',
    'Visa Jepang (jika perlu)',
    'E-ticket pesawat',
    'Bukti reservasi akomodasi',
    'Cetakan itinerary',
    'QR code Visit Japan Web',
    'KTP / SIM',
    'Asuransi perjalanan',
    'IC Card / Tourist Pass',
  ]),

  // 2. Uang & pembayaran (5)
  ...makePackingGroup('pk-uang', 'Uang & pembayaran', 'Documents', 'all', 120, [
    'Yen tunai pecahan kecil',
    'Kartu debit/kredit internasional',
    'E-wallet (Suica/ICOCA digital)',
    'Kartu ATM berlogo internasional',
    'Dompet anti-RFID',
  ]),

  // 3. Elektronik (5)
  ...makePackingGroup('pk-elek', 'Elektronik', 'Electronics', 'all', 140, [
    'Ponsel + charger',
    'Power bank (di tas kabin)',
    'Adaptor colokan tipe A',
    'Kabel cadangan',
    'Earphone',
  ]),

  // 4a. Pakaian — musim semi (4)
  ...makePackingGroup('pk-semi', 'Pakaian — musim semi', 'Clothing', 'spring', 160, [
    'Jaket ringan / windbreaker',
    'Baju berlapis tipis (layering)',
    'Cardigan / sweater ringan',
    'Syal tipis untuk angin malam',
  ]),

  // 4b. Pakaian — musim panas (4)
  ...makePackingGroup('pk-panas', 'Pakaian — musim panas', 'Clothing', 'summer', 170, [
    'Baju katun / linen tipis',
    'Topi & kacamata hitam',
    'Sunscreen & payung UV',
    'Handuk kecil / kipas portable',
  ]),

  // 4c. Pakaian — musim gugur (4)
  ...makePackingGroup('pk-gugur', 'Pakaian — musim gugur', 'Clothing', 'autumn', 180, [
    'Jaket sedang / trench coat',
    'Sweater / knitwear hangat',
    'Celana panjang nyaman',
    'Pelembap kulit & lip balm',
  ]),

  // 4d. Pakaian — musim dingin (5)
  ...makePackingGroup('pk-dingin', 'Pakaian — musim dingin', 'Clothing', 'winter', 190, [
    'Heattech / thermal innerwear',
    'Coat / winter jacket',
    'Sarung tangan & beanie',
    'Kaus kaki tebal',
    'Sepatu anti-selip',
  ]),

  // 5. Sepatu & tas (4)
  ...makePackingGroup('pk-tas', 'Sepatu & tas', 'Travel Accessories', 'all', 210, [
    'Sepatu jalan yang sudah nyaman',
    'Sandal untuk di hotel',
    'Tas selempang harian',
    'Kantong lipat untuk belanja',
  ]),

  // 6. Obat & kesehatan (5)
  ...makePackingGroup('pk-obat', 'Obat & kesehatan', 'Medication', 'all', 230, [
    'Obat pribadi + resep dokter',
    'Obat masuk angin & pereda nyeri',
    'Plester untuk lecet kaki',
    'Masker',
    'Hand sanitizer',
  ]),

  // 7. Perlengkapan sholat (4)
  ...makePackingGroup('pk-sholat', 'Perlengkapan sholat', 'Worship Equipment', 'all', 250, [
    'Sajadah lipat tipis',
    'Mukena / kain sarung',
    'Kompas kiblat cadangan',
    'Botol kecil untuk bersuci',
  ]),

  // 8. Lain-lain (5)
  ...makePackingGroup('pk-lain', 'Lain-lain', 'Travel Accessories', 'all', 270, [
    'Botol minum lipat',
    'Tumbler kosong',
    'Cemilan dari Indonesia',
    'Kantong laundry',
    'Payung lipat',
  ]),
];

export const ALL_DEFAULT_CHECKLIST: ChecklistItem[] = [
  ...DEFAULT_TIMELINE_ITEMS,
  ...DEFAULT_PACKING_ITEMS,
];
