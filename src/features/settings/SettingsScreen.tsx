import React, { useEffect, useRef, useState } from 'react';
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
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Check if PWA is already installed or running in standalone mode
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
      );
    }
    return false;
  });

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      if (isStandalone) {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // Listen for the official browser app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowSuccessModal(true);
      (window as any).deferredPwaPrompt = null;
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    const prompt = (window as any).deferredPwaPrompt;
    if (prompt) {
      try {
        prompt.prompt();
        const choiceResult = await prompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setShowSuccessModal(true);
          (window as any).deferredPwaPrompt = null;
        }
      } catch (e) {
        console.log('Error triggering PWA prompt:', e);
        setShowGuideModal(true);
      }
    } else {
      // If direct prompt is not supported (e.g. iOS Safari or already triggered), open the guide modal
      setShowGuideModal(true);
    }
  };

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      // 1. Purge all caches in CacheStorage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }

      // 2. Unregister existing Service Workers so a clean fresh one is installed
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      // 3. Mark update timestamp in localStorage
      localStorage.setItem('tjr_last_build', '2026.11.20-build11');

      setFeedback('Cache lama dibersihkan! Memuat versi terbaru...');

      // 4. Force hard reload bypassing cache
      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('tjr_update', Date.now().toString());
        window.location.href = url.toString();
      }, 700);
    } catch (err: any) {
      alert('Gagal membersihkan cache: ' + err.message);
      setIsUpdating(false);
    }
  };

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
      'Apakah Anda yakin ingin mereset catatan data pada perangkat ini? Data lokal akan kembali ke setelan awal.'
    );
    if (!confirm) return;

    await deactivateDevice();
    onDeactivated();
  };

  return (
    <div className="flex flex-col w-full space-y-3.5 sm:space-y-4 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[11px] sm:text-[11.5px] font-bold text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Kembali ke Beranda
        </button>
        <span className="text-[11px] sm:text-[11.5px] font-bold text-on-surface">Pengaturan & Aplikasi</span>
      </div>

      {feedback && (
        <div className="p-3 bg-surface-container rounded-xl text-primary-container text-[11.5px] font-bold text-center animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* App Info Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-3.5 sm:p-4 shadow-xs border border-surface-container/80 flex items-center gap-3">
        <img
          src="/LOGO TJR.png"
          alt="Teman TJR Logo"
          className="w-10 h-10 rounded-xl object-cover border border-white shadow-2xs bg-[#a90008] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-[14.5px] font-extrabold text-on-surface leading-snug">Teman TJR</h2>
          <p className="text-[10.5px] text-on-surface-variant font-medium mt-0.5">
            Teman Jalan Dalam Genggaman • Versi 2.1 (Build 21)
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-block px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[9.5px] font-bold uppercase">
              Akses Langsung Aktif
            </span>
            {isInstalled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[9.5px] font-bold">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                PWA Terpasang
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 1. PWA Installation Section */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs border border-surface-container/80 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-bold text-on-surface">Pemasangan Aplikasi (PWA)</h3>
          <span className="text-[10.5px] font-semibold text-on-surface-variant">
            {isInstalled ? 'Aplikasi sudah terpasang di HP' : 'Tersedia untuk diunduh ke layar HP'}
          </span>
        </div>
        <button
          onClick={isInstalled ? () => setShowSuccessModal(true) : handleInstallPWA}
          className={`h-8 px-3.5 rounded-lg text-[11px] font-bold shrink-0 shadow-2xs transition-all active:scale-95 ${
            isInstalled
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-primary text-white hover:bg-primary-container'
          }`}
        >
          {isInstalled ? 'Status PWA' : 'Pasang Aplikasi'}
        </button>
      </div>

      {/* 2. Auto-Update Section */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs border border-surface-container/80 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-bold text-on-surface">Pembaruan Aplikasi</h3>
          <span className="text-[10.5px] font-semibold text-on-surface-variant">
            Pembersihan cache & versi terbaru
          </span>
        </div>
        <button
          onClick={handleForceUpdate}
          disabled={isUpdating}
          className="h-8 px-3.5 rounded-lg bg-primary text-white text-[11px] font-bold shrink-0 shadow-2xs hover:bg-primary-container transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
        >
          {isUpdating ? 'Memperbarui...' : 'Perbarui Aplikasi'}
        </button>
      </div>

      {/* 3. Backup & Restore Section */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs border border-surface-container/80 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-bold text-on-surface">Cadangan Data</h3>
          <span className="text-[10.5px] font-semibold text-on-surface-variant">
            Ekspor & impor data lokal (.json)
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleExportBackup}
            className="h-8 px-2.5 rounded-lg bg-surface-container text-on-surface border border-surface-container text-[11px] font-bold hover:bg-surface-container-high active:scale-95 transition-all"
          >
            Unduh
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-2.5 rounded-lg bg-surface-container text-on-surface border border-surface-container text-[11px] font-bold hover:bg-surface-container-high active:scale-95 transition-all"
          >
            Pulihkan
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

      {/* 4. Internal Management / Admin Access */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs border border-surface-container/80 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-bold text-on-surface">Admin Internal TJR</h3>
          <span className="text-[10.5px] font-semibold text-on-surface-variant">
            Kelola template & direktori
          </span>
        </div>
        <button
          onClick={onOpenAdmin}
          className="h-8 px-3.5 rounded-lg bg-surface-container text-primary border border-surface-container text-[11px] font-bold hover:bg-surface-container-high active:scale-95 transition-all shrink-0"
        >
          Buka Admin
        </button>
      </div>

      {/* 5. Danger Zone: Reset Data */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-xs border border-surface-container/80 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-bold text-error">Setel Ulang Data</h3>
          <span className="text-[10.5px] font-semibold text-on-surface-variant">
            Hapus data lokal & kembali ke awal
          </span>
        </div>
        <button
          onClick={handleDeactivate}
          className="h-8 px-3.5 rounded-lg bg-error-container text-on-error-container text-[11px] font-bold hover:brightness-95 active:scale-95 transition-all shrink-0"
        >
          Reset Data
        </button>
      </div>

      {/* MODAL 1: PWA Installation Success Notification Popup */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-13 h-13 rounded-full bg-emerald-100 flex items-center justify-center mb-3 border-2 border-emerald-400">
              <span className="material-symbols-outlined text-[30px] text-emerald-600">verified</span>
            </div>
            <h3 className="text-[15.5px] font-black text-on-surface">Aplikasi Berhasil Dipasang! 🎉</h3>
            <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">
              <strong>Teman TJR</strong> kini telah tersimpan di <strong>Layar Utama HP</strong> Anda. Anda dapat membuka jadwal perjalanan, rincian biaya, dan checklist koper langsung dari ikon aplikasi di HP kapan saja, bahkan saat offline tanpa internet!
            </p>
            <div className="w-full mt-3.5 p-2.5 rounded-xl bg-surface-container-low border border-surface-container text-left space-y-1.5 text-[10.5px] text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[15px]">offline_bolt</span>
                <span>Siap diakses cepat kapan saja tanpa kuota internet</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[15px]">fullscreen</span>
                <span>Tampilan aplikasi penuh tanpa address bar browser</span>
              </div>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full mt-4 h-9.5 rounded-xl bg-primary text-on-primary text-[12px] font-extrabold hover:brightness-105 active:scale-98 transition-all shadow-xs"
            >
              Mantap, Mengerti!
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Manual PWA Installation Guide Popup */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container flex flex-col text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">install_mobile</span>
                <h3 className="text-[13.5px] font-black text-on-surface">Cara Pasang ke Layar Utama</h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="space-y-2.5 mt-3 text-[11px] text-on-surface-variant">
              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <p className="font-bold text-on-surface flex items-center gap-1.5 mb-1.5 text-[11.5px]">
                  <span className="material-symbols-outlined text-[16px] text-emerald-600">phone_android</span>
                  Pengguna Android (Google Chrome)
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[10.5px]">
                  <li>Ketuk tombol menu titik tiga (<strong>⋮</strong>) di kanan atas browser.</li>
                  <li>Pilih opsi <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                  <li>Ketuk <strong>"Install"</strong> pada jendela yang muncul.</li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <p className="font-bold text-on-surface flex items-center gap-1.5 mb-1.5 text-[11.5px]">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">phone_iphone</span>
                  Pengguna iPhone / iPad (Safari)
                </p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[10.5px]">
                  <li>Buka link ini di browser <strong>Safari</strong>.</li>
                  <li>Ketuk tombol <strong>Bagikan (Share)</strong> ikon kotak berpanah ke atas di bawah layar.</li>
                  <li>Gulir ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
                  <li>Ketuk <strong>"Tambah"</strong> di pojok kanan atas.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full mt-3.5 h-9 rounded-xl bg-primary text-on-primary text-[11.5px] font-extrabold hover:brightness-105 active:scale-98 transition-all"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
