# Teman Jalan Ryan Companion (PWA)

Aplikasi pendamping perjalanan mandiri Jepang berbasis **Progressive Web Application (PWA)** dengan pendekatan **Local-First**, dibuat berdasarkan dokumen **PRD v2.0** dan mengimplementasikan secara presisi desain UI resmi dari **Google Stitch MCP**.

## Fitur Utama Sesuai PRD & Desain Stitch

1. **Aktivasi Pelanggan (Access Management)**
   - UI Tiket Digital (Notch Cut & Ambient Zen Mt. Fuji)
   - Validasi kode unik (`TJR-JPN-2025-XXXX` / demo code `TJR-JPN-2025-DEMO`)
   - Penyimpanan entitlement lokal via IndexedDB (tidak perlu akun/login)
   - Perangkat terikat lokal, offline-ready

2. **Beranda Companion (Dashboard)**
   - Header profil dengan indikator "Tersimpan Lokal"
   - Countdown Keberangkatan Hero Card (GA874 CGK ➔ HND)
   - Sorotan Aktivitas Hari Ini (Shinjuku Gyoen Hanami Sakura)
   - Widget Sholat Terdekat (Next prayer adzan timer & 5 badge sholat)
   - Ringkasan Anggaran (Progress bar terpakai & sisa saldo JPY/IDR)
   - Progress Kesiapan Koper & Bekal (Persentase kelengkapan)
   - Bento Grid Akses Cepat ke semua fitur

3. **Itinerary Planner (Perencana Perjalanan)**
   - Manajemen perjalanan 7 hari Tokyo, Kyoto, Osaka
   - Feed harian dengan drawer aktivitas interaktif (checklist penyelesaian)
   - Rute singgah, estimasi biaya JPY, dan tag spot kuliner Halal
   - Tambah Hari Baru & Tambah Aktivitas Destinasi
   - Ekspor data offline

4. **Biaya & Konversi Kurs (Budget & Financial Tracker)**
   - Mode switcher: Ringkasan Biaya vs Konverter Kurs JPY-IDR
   - Konverter kurs dua arah instan dengan tombol swap & editable rate
   - Multi-segment progress bar pengeluaran (Food, Transport, Tiket, Shopping, Other)
   - Pencatatan transaksi baru dengan snapshot kurs transaksi
   - Tips hemat Tax-Free 10%

5. **Ibadah & Arah Kiblat (Muslim Travel Features)**
   - Selector kota Jepang (Tokyo, Osaka, Kyoto, Sapporo, Fukuoka) dengan timezone JST (UTC+9)
   - Perhitungan jadwal sholat offline astronomis (Japan Islamic Trust / Muslim World League)
   - Countdown timer aktif detik menuju waktu sholat berikutnya
   - Kompas Arah Kiblat interaktif (293° NW Barat Laut) dengan dukungan sensor orientasi perangkat
   - Direktori masjid & prayer room terverifikasi dengan filter kategori dan tombol integrasi Google Maps navigasi

6. **Bekal & Checklist Koper**
   - Timeline persiapan (Visit Japan Web QR, Paspor, eSIM, dll.)
   - Kategori: Dokumen, Gadget, Pakaian, Ibadah, Obat, Aksesoris
   - Filter rekomendasi perlengkapan per musim (Spring, Summer, Autumn, Winter)
   - Tambah dan hapus item kustom

7. **Pengaturan, Backup & Restore**
   - Unduh Cadangan JSON (Format sesuai spesifikasi PRD Section 12)
   - Pulihkan data dari file JSON dengan validasi schema
   - Reset aktivasi perangkat

8. **Admin Dashboard (`/admin`)**
   - Login internal staf Teman Jalan Ryan
   - Generator kode aktivasi (Single / Batch)
   - Manajemen status kode aktivasi (Unused, Redeemed, Revoked)
   - Manajemen direktori masjid

## Teknologi yang Digunakan
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (Design tokens warna crimson `#a90008` & emas `#fec300` dari Google Stitch MCP)
- **Local Database**: IndexedDB dengan Dexie.js (`teman_jalan_ryan_db`)
- **Perhitungan Sholat & Kiblat**: Adhan library + formula Haversine
- **PWA**: Web App Manifest + Service Worker offline precaching
- **Hosting**: Netlify Ready (`netlify.toml` SPA redirects)

## Cara Menjalankan

```bash
# Jalankan development server
npm run dev

# Build untuk production
npm run build

# Preview build lokal
npm run preview
```
