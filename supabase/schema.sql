-- ==========================================================
-- TEMAN TJR (Teman Jalan Ryan Companion) - Supabase Database Schema
-- Sesuai PRD v2.0 Section 16.2
-- Jalankan skrip ini di SQL Editor Supabase Anda
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: activation_codes (Kode Tiket Lisensi Pelanggan)
CREATE TABLE IF NOT EXISTS public.activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_display TEXT UNIQUE NOT NULL,
    code_hash TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'revoked', 'expired')),
    order_reference TEXT,
    customer_name TEXT,
    device_id_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    redeemed_at TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_by TEXT DEFAULT 'admin'
);

-- 3. TABEL: prayer_places (Direktori Masjid & Musholla Halal di Jepang)
CREATE TABLE IF NOT EXISTS public.prayer_places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Mosque',
    description TEXT,
    address TEXT NOT NULL,
    city_id TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    facilities TEXT[] DEFAULT '{}',
    website TEXT,
    distance_km DOUBLE PRECISION,
    verification_date TEXT,
    status TEXT NOT NULL DEFAULT 'Verified'
);

-- 4. TABEL: itinerary_templates (Template Master Rencana Perjalanan)
CREATE TABLE IF NOT EXISTS public.itinerary_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL DEFAULT 7,
    destination TEXT NOT NULL,
    thumbnail TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL: itinerary_template_items (Detail Aktivitas Template)
CREATE TABLE IF NOT EXISTS public.itinerary_template_items (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    location TEXT NOT NULL,
    description TEXT,
    estimated_cost INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 1,
    is_halal_spot BOOLEAN DEFAULT FALSE
);

-- 6. TABEL: app_config (Konfigurasi Global & Nilai Tukar Kurs Acuan)
CREATE TABLE IF NOT EXISTS public.app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Policy untuk prayer_places: Semua orang bisa membaca (Public Read)
CREATE POLICY "Public read prayer_places" ON public.prayer_places
    FOR SELECT USING (true);

-- Policy untuk itinerary_templates & items: Public Read
CREATE POLICY "Public read itinerary_templates" ON public.itinerary_templates
    FOR SELECT USING (true);

CREATE POLICY "Public read itinerary_template_items" ON public.itinerary_template_items
    FOR SELECT USING (true);

-- Policy untuk app_config: Public Read
CREATE POLICY "Public read app_config" ON public.app_config
    FOR SELECT USING (true);

-- Policy untuk activation_codes:
-- Anon dapat membaca untuk validasi kode aktivasi saat login pertama
CREATE POLICY "Public read active activation_codes" ON public.activation_codes
    FOR SELECT USING (true);

-- Anon dapat memperbarui saat menukarkan kode (redeem)
CREATE POLICY "Public redeem activation_codes" ON public.activation_codes
    FOR UPDATE USING (status = 'active')
    WITH CHECK (true);

-- Authenticated Admin memiliki akses penuh (Full CRUD)
CREATE POLICY "Admin full access activation_codes" ON public.activation_codes
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admin full access prayer_places" ON public.prayer_places
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================================
-- SEED DATA AWAL (Contoh Kode Aktivasi & Masjid Jepang)
-- ==========================================================

-- Masukkan kode aktivasi awal untuk demo & pengujian
INSERT INTO public.activation_codes (code_display, status, order_reference, customer_name)
VALUES 
    ('TJR-JPN-2025-ABCD', 'active', 'INV-2025-001', 'Ary Muhtadie'),
    ('TJR-JPN-2025-DEMO', 'active', 'INV-2025-002', 'Demo Traveler'),
    ('TJR-JPN-2025-KLMN', 'active', 'INV-2025-003', 'Sahabat Jalan')
ON CONFLICT (code_display) DO NOTHING;

-- Masukkan masjid rujukan Jepang resmi TJR
INSERT INTO public.prayer_places (id, name, type, description, address, city_id, latitude, longitude, facilities, distance_km, status)
VALUES
    ('mosque-1', 'Tokyo Camii & Diyanet Turkish Culture Center', 'Mosque', 'Masjid terbesar di Jepang dengan arsitektur Ottoman menakjubkan, wudhu luas, dan halal mart.', '1-19 Oyama-cho, Shibuya-ku, Tokyo', 'tokyo', 35.6675, 139.6836, ARRAY['Tempat Wudhu', 'Mukena Tersedia', 'Halal Mart', 'Ramah Kursi Roda'], 2.4, 'Verified'),
    ('mosque-2', 'Asakusa Mosque (Darul Arqam)', 'Mosque', 'Masjid 5 lantai di dekat pusat wisata Asakusa Sensoji.', '1-9-12 Higashi-Asakusa, Taito-ku, Tokyo', 'tokyo', 35.7189, 139.7997, ARRAY['Tempat Wudhu', 'Dekat Halal Ramen'], 5.1, 'Verified'),
    ('mosque-3', 'Kyoto Islamic Cultural Center', 'Mosque', 'Pusat ibadah dan kajian Islam terdekat dari stasiun Kyoto dan kawasan Gion.', '92 Miyagaki-cho, Kamigyo-ku, Kyoto', 'kyoto', 35.0234, 135.7709, ARRAY['Tempat Wudhu', 'Kiblat Terverifikasi'], 3.2, 'Verified'),
    ('mosque-4', 'Osaka Central Mosque', 'Mosque', 'Masjid utama kota Osaka di dekat jalur Midosuji.', '4-2-13 Owada, Nishiyodogawa-ku, Osaka', 'osaka', 34.7122, 135.4578, ARRAY['Tempat Wudhu', 'Ruang Sholat Wanita'], 4.0, 'Verified')
ON CONFLICT (id) DO NOTHING;

-- Masukkan konfigurasi kurs awal
INSERT INTO public.app_config (key, value)
VALUES ('exchange_rate', '{"rate": 105.0, "currency": "JPY", "unit": "IDR"}')
ON CONFLICT (key) DO NOTHING;

-- ==========================================================
-- GRANT PERMISSIONS KE ROLE POSTGREST SUPABASE (anon, authenticated, service_role)
-- ==========================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;


