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
    <div className="flex flex-col w-full space-y-4 md:space-y-2.5 transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 md:gap-1 text-[13px] md:text-[11px] font-bold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px] md:text-[15px]">arrow_back</span>
          Kembali ke Beranda
        </button>
        <span className="text-[13px] md:text-[11px] font-bold text-on-surface">Pengaturan & Backup</span>
      </div>

      {feedback && (
        <div className="p-3 md:p-2 bg-surface-container rounded-xl md:rounded-lg text-primary-container text-[13px] md:text-[11px] font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* App Info Card */}
      <div className="bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 sm:p-5 md:p-3 shadow-xs border border-surface-container/80 flex items-center gap-3.5 md:gap-2.5">
        <img
          src="/LOGO TJR.png"
          alt="Teman TJR Logo"
          className="w-13 h-13 md:w-9 md:h-9 rounded-2xl md:rounded-xl object-cover border-2 md:border border-white shadow-2xs bg-[#a90008] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] md:text-[13.5px] font-extrabold text-on-surface">Teman TJR</h2>
          <p className="text-[13px] md:text-[10.5px] text-on-surface-variant font-medium mt-0.5">
            Teman Perjalanan Dalam Genggaman • Versi 2.0
          </p>
          <span className="inline-block mt-1.5 md:mt-1 px-2.5 py-0.5 md:px-2 md:py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] md:text-[9px] font-bold uppercase">
            Aktivasi Terverifikasi
          </span>
        </div>
      </div>

      {/* Backup & Restore Section */}
      <div className="bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 sm:p-5 md:p-3 shadow-xs border border-surface-container/80 space-y-3 md:space-y-2">
        <div className="flex items-center gap-2 md:gap-1.5">
          <span className="material-symbols-outlined text-primary text-[20px] md:text-[16px]">cloud_sync</span>
          <h3 className="text-[15.5px] md:text-[12.5px] font-bold text-on-surface">Cadangan Data (Backup & Restore)</h3>
        </div>
        <p className="text-[13px] md:text-[10.5px] text-on-surface-variant leading-relaxed">
          Semua catatan perjalanan, itinerary, dan anggaran Anda tersimpan secara mandiri di penyimpanan lokal perangkat.
        </p>

        <div className="grid grid-cols-2 gap-2.5 md:gap-2 pt-1 md:pt-0.5">
          <button
            onClick={handleExportBackup}
            className="h-11 md:h-8.5 rounded-xl md:rounded-lg bg-surface-container hover:bg-surface-container-high text-[13px] md:text-[11px] font-bold text-on-surface flex items-center justify-center gap-2 md:gap-1.5 transition-colors border border-surface-container active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px] md:text-[15px] text-primary">download</span>
            Unduh Backup (.json)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-11 md:h-8.5 rounded-xl md:rounded-lg bg-surface-container hover:bg-surface-container-high text-[13px] md:text-[11px] font-bold text-on-surface flex items-center justify-center gap-2 md:gap-1.5 transition-colors border border-surface-container active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px] md:text-[15px] text-secondary">upload_file</span>
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
      <div className="bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 sm:p-5 md:p-3 shadow-xs border border-surface-container/80 space-y-3 md:space-y-2">
        <div className="flex items-center gap-2 md:gap-1.5">
          <span className="material-symbols-outlined text-primary text-[20px] md:text-[16px]">admin_panel_settings</span>
          <h3 className="text-[15.5px] md:text-[12.5px] font-bold text-on-surface">Admin & Tim Internal TJR</h3>
        </div>
        <p className="text-[13px] md:text-[10.5px] text-on-surface-variant leading-relaxed">
          Kelola direktori masjid, template itinerary, dan kode aktivasi pelanggan (Khusus Staf Teman Jalan Ryan).
        </p>

        <button
          onClick={onOpenAdmin}
          className="w-full h-11 md:h-8.5 rounded-xl md:rounded-lg bg-surface-container hover:bg-surface-container-high text-[13.5px] md:text-[11px] font-bold text-primary flex items-center justify-center gap-2 md:gap-1.5 transition-colors border border-surface-container active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px] md:text-[15px]">key</span>
          Buka Dashboard Admin Internal (/admin)
        </button>
      </div>

      {/* Danger Zone: Reset & Deactivate */}
      <div className="bg-surface-container-lowest rounded-2xl md:rounded-xl p-4 sm:p-5 md:p-3 shadow-xs border border-surface-container/80 space-y-3 md:space-y-2">
        <div className="flex items-center gap-2 md:gap-1.5 text-error">
          <span className="material-symbols-outlined text-[20px] md:text-[16px]">warning</span>
          <h3 className="text-[15.5px] md:text-[12.5px] font-bold">Zona Pengaturan Perangkat</h3>
        </div>
        <p className="text-[13px] md:text-[10.5px] text-on-surface-variant leading-relaxed">
          Keluar dari aplikasi pada perangkat ini atau hapus aktivasi jika Anda berganti perangkat baru.
        </p>

        <button
          onClick={handleDeactivate}
          className="w-full h-11 md:h-8.5 rounded-xl md:rounded-lg bg-error-container text-on-error-container text-[13.5px] md:text-[11px] font-bold flex items-center justify-center gap-2 md:gap-1.5 hover:brightness-95 transition-all active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px] md:text-[15px]">logout</span>
          Reset Aktivasi Perangkat
        </button>
      </div>
    </div>
  );
};
