import React, { useRef, useState } from 'react';
import { db } from '../../database/dexie';
import { deactivateDevice } from '../../services/activation.service';

interface SettingsScreenProps {
  onDeactivated: () => void;
  onOpenAdmin: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onDeactivated, onOpenAdmin, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleExportBackup = async () => {
    try {
      const trips = await db.trips.toArray();
      const days = await db.itinerary_days.toArray();
      const items = await db.itinerary_items.toArray();
      const budgets = await db.budgets.toArray();
      const expenses = await db.expenses.toArray();
      const checklists = await db.checklist_items.toArray();
      const settings = await db.app_settings.toArray();

      const backupData = {
        app: 'teman-jalan-ryan-companion',
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        data: {
          trip: trips[0] || null,
          itinerary: { days, items },
          budgets,
          expenses,
          checklists,
          settings,
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tjr_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setFeedback('Backup data perjalanan berhasil diunduh!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (e: any) {
      alert('Gagal mengekspor data: ' + e.message);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        if (json.app !== 'teman-jalan-ryan-companion' || !json.data) {
          alert('File tidak valid. Pastikan file backup resmi Teman Jalan Ryan.');
          return;
        }

        const confirmRestore = window.confirm(
          'Apakah Anda yakin ingin memulihkan data ini? Data saat ini di perangkat akan digantikan.'
        );
        if (!confirmRestore) return;

        // Restore into tables
        if (json.data.trip) {
          await db.trips.clear();
          await db.trips.add(json.data.trip);
        }

        if (json.data.itinerary?.days) {
          await db.itinerary_days.clear();
          for (const d of json.data.itinerary.days) await db.itinerary_days.add(d);
        }

        if (json.data.itinerary?.items) {
          await db.itinerary_items.clear();
          for (const i of json.data.itinerary.items) await db.itinerary_items.add(i);
        }

        if (json.data.budgets) {
          await db.budgets.clear();
          for (const b of json.data.budgets) await db.budgets.add(b);
        }

        if (json.data.expenses) {
          await db.expenses.clear();
          for (const exp of json.data.expenses) await db.expenses.add(exp);
        }

        if (json.data.checklists) {
          await db.checklist_items.clear();
          for (const chk of json.data.checklists) await db.checklist_items.add(chk);
        }

        setFeedback('Data berhasil dipulihkan!');
        setTimeout(() => {
          setFeedback(null);
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        alert('Format file JSON rusak: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleDeactivate = async () => {
    const confirm = window.confirm(
      'Apakah Anda yakin ingin mereset aktivasi pada perangkat ini? Anda harus memasukkan kode aktivasi kembali untuk mengakses aplikasi.'
    );
    if (!confirm) return;

    await deactivateDevice();
    onDeactivated();
  };

  return (
    <div className="flex flex-col w-full space-y-2.5">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Kembali ke Beranda
        </button>
        <span className="text-xs font-bold text-on-surface">Pengaturan & Backup</span>
      </div>

      {feedback && (
        <div className="p-2 bg-surface-container rounded-lg text-primary-container text-[11px] font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* App Info Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-xs border border-surface-container/80 flex items-center gap-3">
        <img
          src="/LOGO TJR.png"
          alt="TEMAN TJR Logo"
          className="w-12 h-12 rounded-xl object-cover border border-white shadow-2xs bg-[#a90008] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-on-surface">TEMAN TJR (Official)</h2>
          <p className="text-[12px] text-on-surface-variant">
            Teman Perjalanan Dalam Genggaman • Versi 2.0
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase">
            Aktivasi Terverifikasi
          </span>
        </div>
      </div>

      {/* Backup & Restore Section */}
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-xs border border-surface-container/80 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">cloud_sync</span>
          <h3 className="text-[14px] font-bold text-on-surface">Cadangan Data (Backup & Restore)</h3>
        </div>
        <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
          Semua catatan perjalanan, itinerary, dan anggaran Anda tersimpan secara mandiri di penyimpanan lokal perangkat.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportBackup}
            className="h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-[12px] font-bold text-on-surface flex items-center justify-center gap-1.5 transition-colors border border-surface-container active:scale-98"
          >
            <span className="material-symbols-outlined text-[17px] text-primary">download</span>
            Unduh Backup (.json)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-[12px] font-bold text-on-surface flex items-center justify-center gap-1.5 transition-colors border border-surface-container active:scale-98"
          >
            <span className="material-symbols-outlined text-[17px] text-secondary">upload_file</span>
            Pulihkan Data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            className="hidden"
          />
        </div>
      </div>

      {/* Internal Management / Admin Access */}
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-xs border border-surface-container/80 space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">admin_panel_settings</span>
          <h3 className="text-[14px] font-bold text-on-surface">Admin & Tim Internal TJR</h3>
        </div>
        <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
          Kelola direktori masjid, template itinerary, dan kode aktivasi pelanggan (Khusus Staf Teman Jalan Ryan).
        </p>

        <button
          onClick={onOpenAdmin}
          className="w-full h-10 rounded-xl bg-surface-container hover:bg-surface-container-high text-[12.5px] font-bold text-primary flex items-center justify-center gap-1.5 transition-colors border border-surface-container active:scale-98"
        >
          <span className="material-symbols-outlined text-[17px]">key</span>
          Buka Dashboard Admin Internal (/admin)
        </button>
      </div>

      {/* Danger Zone: Reset & Deactivate */}
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-xs border border-surface-container/80 space-y-2.5">
        <div className="flex items-center gap-2 text-error">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <h3 className="text-[14px] font-bold">Zona Pengaturan Perangkat</h3>
        </div>
        <p className="text-[12.5px] text-on-surface-variant leading-relaxed">
          Keluar dari aplikasi pada perangkat ini atau hapus aktivasi jika Anda berganti perangkat baru.
        </p>

        <button
          onClick={handleDeactivate}
          className="w-full h-10 rounded-xl bg-error-container text-on-error-container text-[12.5px] font-bold flex items-center justify-center gap-1.5 hover:brightness-95 transition-all active:scale-98"
        >
          <span className="material-symbols-outlined text-[17px]">logout</span>
          Reset Aktivasi Perangkat
        </button>
      </div>

    </div>
  );
};
