import React, { useState } from 'react';
import { db, type PrayerPlace } from '../../database/dexie';
import { supabase, isSupabaseConfigured } from '../../services/supabase.client';

interface AdminScreenProps {
  onBack: () => void;
}

interface ActivationCodeItem {
  id: string;
  code: string;
  status: 'Unused' | 'Redeemed' | 'Revoked';
  customerName?: string;
  createdAt: string;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Admin tabs: 'activations' | 'mosques'
  const [activeTab, setActiveTab] = useState<'activations' | 'mosques'>('activations');

  // Simulated code generator
  const [codes, setCodes] = useState<ActivationCodeItem[]>([
    {
      id: '1',
      code: 'TJR-JPN-2025-ABCD',
      status: 'Redeemed',
      customerName: 'Ary Muhtadie',
      createdAt: '2025-04-01 10:30',
    },
    {
      id: '2',
      code: 'TJR-JPN-2025-DEMO',
      status: 'Redeemed',
      customerName: 'Demo Traveler',
      createdAt: '2025-04-10 14:15',
    },
    {
      id: '3',
      code: 'TJR-JPN-2025-KLMN',
      status: 'Unused',
      createdAt: '2025-04-12 09:00',
    },
  ]);

  const [generatedBatchCount, setGeneratedBatchCount] = useState('1');

  // New Mosque Form
  const [newMosqueName, setNewMosqueName] = useState('');
  const [newMosqueCity, setNewMosqueCity] = useState('Tokyo');
  const [newMosqueType, setNewMosqueType] = useState<'Mosque' | 'Prayer Room'>('Prayer Room');
  const [newMosqueAddress, setNewMosqueAddress] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail && adminPassword) {
      setIsAuthenticated(true);
    }
  };

  const handleGenerateCodes = async () => {
    const count = parseInt(generatedBatchCount) || 1;
    const newItems: ActivationCodeItem[] = [];

    for (let i = 0; i < count; i++) {
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      newItems.push({
        id: `code-${Date.now()}-${i}`,
        code: `TJR-JPN-2025-${randomStr}`,
        status: 'Unused',
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });
    }

    setCodes((prev) => [...newItems, ...prev]);

    // Sync to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const rows = newItems.map((c) => ({
          code_display: c.code,
          status: 'active',
          order_reference: 'MANUAL-STAFF-GEN',
          customer_name: 'Pelanggan Baru',
        }));
        await supabase.from('activation_codes').insert(rows);
      } catch (err) {
        console.warn('Could not sync codes to Supabase:', err);
      }
    }

    alert(`Berhasil generate ${count} kode aktivasi pelanggan baru (Lokal & Supabase Cloud)!`);
  };

  const handleRevokeCode = (id: string) => {
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'Revoked' as const } : c))
    );
  };

  const handleAddMosque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMosqueName.trim()) return;

    const newPlace: PrayerPlace = {
      id: `pp-${Date.now()}`,
      name: newMosqueName.trim(),
      type: newMosqueType,
      city: newMosqueCity,
      prefecture: newMosqueCity,
      address: newMosqueAddress.trim() || `${newMosqueCity}, Japan`,
      description: 'Direktori tempat ibadah yang ditambahkan oleh staf Teman Jalan Ryan.',
      latitude: 35.6762,
      longitude: 139.6503,
      facilities: ['Tempat Wudhu', 'Arah Kiblat'],
      verification_date: new Date().toISOString().split('T')[0],
      status: 'Published',
    };

    await db.prayer_places.add(newPlace);

    // Sync to Supabase Cloud if online
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('prayer_places').insert({
          id: newPlace.id,
          name: newPlace.name,
          type: newPlace.type,
          city_id: newPlace.city.toLowerCase(),
          address: newPlace.address,
          description: newPlace.description,
          latitude: newPlace.latitude,
          longitude: newPlace.longitude,
          facilities: newPlace.facilities,
          status: 'Verified',
        });
      } catch (err) {
        console.warn('Could not sync mosque to Supabase:', err);
      }
    }

    setNewMosqueName('');
    setNewMosqueAddress('');
    alert(`Tempat ibadah "${newPlace.name}" berhasil dipublikasikan ke aplikasi pelanggan & Supabase!`);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col w-full space-y-2.5">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-[11px] font-semibold text-primary flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Kembali
          </button>
          <span className="text-xs font-bold text-on-surface">Login Admin</span>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-surface-container/80 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">admin_panel_settings</span>
            <div>
              <h2 className="text-xs font-bold text-on-surface">Dashboard Internal TEMAN TJR</h2>
              <p className="text-[10px] text-on-surface-variant">Masuk dengan kredensial staf</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-2.5">
            <div>
              <label className="text-[11px] font-semibold text-on-surface block mb-1">Email Staf</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@temanjalanryan.com"
                className="w-full h-8.5 px-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface block mb-1">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-8.5 px-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full h-8.5 rounded-lg bg-primary-container text-white text-xs font-bold shadow-2xs active:scale-98 transition-transform"
            >
              Masuk Dashboard
            </button>
          </form>

          <p className="text-[9.5px] text-on-surface-variant text-center pt-1">
            *Untuk demo: masukkan sembarang email & password untuk masuk.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-2.5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs font-semibold text-primary flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Keluar Admin
        </button>
        <span className="text-xs font-bold text-on-surface">Admin TEMAN TJR Panel</span>
      </div>

      {/* Admin Tabs */}
      <div className="p-0.5 rounded-lg bg-surface-container flex items-center justify-between shadow-2xs">
        <button
          onClick={() => setActiveTab('activations')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all ${
            activeTab === 'activations'
              ? 'bg-surface-container-lowest text-primary-container shadow-2xs'
              : 'text-on-surface-variant'
          }`}
        >
          Kode Aktivasi ({codes.length})
        </button>
        <button
          onClick={() => setActiveTab('mosques')}
          className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all ${
            activeTab === 'mosques'
              ? 'bg-surface-container-lowest text-primary-container shadow-2xs'
              : 'text-on-surface-variant'
          }`}
        >
          Kelola Masjid
        </button>
      </div>

      {activeTab === 'activations' && (
        <div className="space-y-2.5">
          {/* Generate Box */}
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-xs border border-surface-container/80 space-y-2.5">
            <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">key</span>
              Generate Kode Aktivasi Pelanggan
            </h3>
            <div className="flex gap-2">
              <select
                value={generatedBatchCount}
                onChange={(e) => setGeneratedBatchCount(e.target.value)}
                className="w-24 h-8 px-2 rounded-lg bg-surface-container-low text-xs border border-surface-container"
              >
                <option value="1">1 Kode</option>
                <option value="5">5 Kode</option>
                <option value="10">10 Kode</option>
              </select>
              <button
                onClick={handleGenerateCodes}
                className="flex-1 h-10 rounded-xl bg-primary-container text-white text-xs font-semibold"
              >
                + Buat Kode Unik
              </button>
            </div>
          </div>

          {/* List of Codes */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container space-y-3">
            <h3 className="text-xs font-bold text-on-surface">Daftar Kode Aktivasi Pelanggan</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {codes.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-on-surface">{c.code}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          c.status === 'Unused'
                            ? 'bg-secondary-fixed text-on-secondary-fixed'
                            : c.status === 'Redeemed'
                            ? 'bg-surface-container text-primary'
                            : 'bg-error-container text-on-error-container'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant">
                      {c.customerName ? `Pelanggan: ${c.customerName}` : 'Belum terikat perangkat'} • {c.createdAt}
                    </p>
                  </div>
                  {c.status !== 'Revoked' && (
                    <button
                      onClick={() => handleRevokeCode(c.id)}
                      className="text-[10px] text-error font-semibold hover:underline"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mosques' && (
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-surface-container space-y-3">
          <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">add_location</span>
            Tambah Tempat Ibadah Baru
          </h3>

          <form onSubmit={handleAddMosque} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">Nama Tempat</label>
              <input
                type="text"
                required
                value={newMosqueName}
                onChange={(e) => setNewMosqueName(e.target.value)}
                placeholder="Misal: Ueno Station Muslim Prayer Area"
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Kota</label>
                <select
                  value={newMosqueCity}
                  onChange={(e) => setNewMosqueCity(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                >
                  <option value="Tokyo">Tokyo</option>
                  <option value="Kyoto">Kyoto</option>
                  <option value="Osaka">Osaka</option>
                  <option value="Sapporo">Sapporo</option>
                  <option value="Fukuoka">Fukuoka</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1">Tipe</label>
                <select
                  value={newMosqueType}
                  onChange={(e) => setNewMosqueType(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                >
                  <option value="Prayer Room">Prayer Room</option>
                  <option value="Mosque">Masjid Besar</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-on-surface block mb-1">Alamat / Stasiun Terdekat</label>
              <input
                type="text"
                value={newMosqueAddress}
                onChange={(e) => setNewMosqueAddress(e.target.value)}
                placeholder="Misal: Dekat Park Exit JR Ueno Station"
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-xs border border-surface-container focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-xl bg-primary-container text-white text-xs font-semibold mt-2"
            >
              Publikasikan ke Aplikasi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
