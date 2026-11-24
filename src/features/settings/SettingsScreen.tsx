import React, { useEffect, useRef, useState } from 'react';
import { db } from '../../database/dexie';
import { deactivateDevice } from '../../services/activation.service';
import {
  applyFontSize,
  applyTheme,
  getStoredFontSize,
  getStoredTheme,
  type FontSizeMode,
  type ThemeMode,
} from '../../utils/appearance';

interface EmergencyPhrase {
  id: string;
  idText: string;
  jpText: string;
  romaji: string;
}

const EMERGENCY_PHRASES: EmergencyPhrase[] = [
  {
    id: 'ph-1',
    idText: 'Apakah ada daging babi di dalamnya?',
    jpText: '豚肉は入っていますか？',
    romaji: 'Buta-niku wa haitte imasu ka?',
  },
  {
    id: 'ph-2',
    idText: 'Apakah ini memakai alkohol atau mirin?',
    jpText: 'アルコールやみりんは使っていますか？',
    romaji: 'Arukōru ya mirin wa tsukatte imasu ka?',
  },
  {
    id: 'ph-3',
    idText: 'Saya tidak makan daging babi.',
    jpText: '私は豚肉を食べられません。',
    romaji: 'Watashi wa buta-niku o taberaremasen.',
  },
  {
    id: 'ph-4',
    idText: 'Apakah ada tempat sholat di sini?',
    jpText: 'ここに礼拝室はありますか？',
    romaji: 'Koko ni reihaishitsu wa arimasu ka?',
  },
  {
    id: 'ph-5',
    idText: 'Saya tersesat, tolong bantu.',
    jpText: '道に迷いました。助けてください。',
    romaji: 'Michi ni mayoimashita. Tasukete kudasai.',
  },
  {
    id: 'ph-6',
    idText: 'Bagaimana cara ke stasiun ini?',
    jpText: 'この駅にはどうやって行きますか？',
    romaji: 'Kono eki ni wa dōyatte ikimasu ka?',
  },
  {
    id: 'ph-7',
    idText: 'Tolong, ini alamat hotel saya.',
    jpText: 'すみません、こちらがホテルの住所です。',
    romaji: 'Sumimasen, kochira ga hoteru no jūsho desu.',
  },
  {
    id: 'ph-8',
    idText: 'Berapa harganya?',
    jpText: 'いくらですか？',
    romaji: 'Ikura desu ka?',
  },
  {
    id: 'ph-9',
    idText: 'Bisa bayar pakai kartu?',
    jpText: 'カードで払えますか？',
    romaji: 'Kādo de haraemasu ka?',
  },
  {
    id: 'ph-10',
    idText: 'Tolong panggilkan ambulans.',
    jpText: '救急車を呼んでください。',
    romaji: 'Kyūkyūsha o yonde kudasai.',
  },
];

interface SettingsScreenProps {
  onDeactivated: () => void;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onDeactivated, onBack }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Appearance state (Theme & Global Font Size)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());
  const [fontSize, setFontSize] = useState<FontSizeMode>(() => getStoredFontSize());

  // Emergency Phrases accordion state (first item open by default just like Hitori Companion)
  const [openPhraseId, setOpenPhraseId] = useState<string | null>('ph-1');

  const handleSelectTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyTheme(mode);
  };

  const handleSelectFontSize = (size: FontSizeMode) => {
    setFontSize(size);
    applyFontSize(size);
  };

  const handleSpeakJapanese = (jpText: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(jpText);
      utter.lang = 'ja-JP';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore if speech synthesis unavailable on device
    }
  };

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
      localStorage.setItem('tjr_pwa_installed', 'true');
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
          localStorage.setItem('tjr_pwa_installed', 'true');
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

      {/* App Info Card - Ringkas Tanpa Versi/Badge Berlebih */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-2xs border border-surface-container flex items-center gap-3">
        <img
          src="/LOGO TJR.png"
          alt="Teman TJR Logo"
          className="w-10 h-10 rounded-xl object-cover border border-white/80 shadow-2xs bg-primary-container shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-extrabold text-on-surface leading-snug">Teman TJR</h2>
          <p className="text-[11.5px] text-on-surface-variant font-medium mt-0.5 truncate">
            Teman Jalan Dalam Genggaman
          </p>
        </div>
      </div>

      {/* 0. Tampilan: Mode Gelap/Terang & Ukuran Huruf Global */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-2xs border border-surface-container space-y-3.5">
        <div className="flex items-center gap-2">
          <span
            style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
            className="px-1.5 py-0.5 rounded bg-primary-fixed/75 text-primary text-[10.5px] font-bold leading-none shrink-0"
          >
            表示
          </span>
          <h3 className="text-[14px] font-bold text-on-surface">Tampilan</h3>
        </div>

        {/* Mode Gelap / Terang */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] font-semibold text-on-surface">Tema</span>
          <div className="p-0.5 rounded-xl bg-surface-container flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleSelectTheme('light')}
              className={`h-8 px-3 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-surface-container-lowest text-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">light_mode</span>
              <span>Terang</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTheme('dark')}
              className={`h-8 px-3 rounded-lg text-[11.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-surface-container-lowest text-primary shadow-2xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">dark_mode</span>
              <span>Gelap</span>
            </button>
          </div>
        </div>

        {/* Ukuran Huruf Keseluruhan Aplikasi */}
        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-surface-container/70">
          <span className="text-[12.5px] font-semibold text-on-surface">Ukuran Huruf</span>
          <div className="p-0.5 rounded-xl bg-surface-container flex items-center gap-0.5">
            {[
              { id: 'sm' as FontSizeMode, label: 'Kecil' },
              { id: 'md' as FontSizeMode, label: 'Normal' },
              { id: 'lg' as FontSizeMode, label: 'Besar' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectFontSize(opt.id)}
                className={`h-8 px-2.5 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer ${
                  fontSize === opt.id
                    ? 'bg-surface-container-lowest text-primary shadow-2xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. PWA Installation Section (Status PWA di dalam section ini) */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-2xs border border-surface-container flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-[13px] font-bold text-on-surface">Pemasangan Aplikasi (PWA)</h3>
            {isInstalled && (
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-bold">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                Terpasang
              </span>
            )}
          </div>
          <span className="text-[10.5px] font-semibold text-on-surface-variant block mt-0.5">
            {isInstalled ? 'Aplikasi sudah terpasang di layar HP' : 'Unduh ke layar utama HP'}
          </span>
        </div>
        <button
          type="button"
          onClick={isInstalled ? () => setShowSuccessModal(true) : handleInstallPWA}
          className="h-8.5 px-3.5 rounded-xl bg-primary-container text-white text-[11.5px] font-bold shrink-0 shadow-2xs hover:brightness-105 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
        >
          {isInstalled ? 'Status PWA' : 'Pasang Aplikasi'}
        </button>
      </div>

      {/* 2. Auto-Update Section */}
      <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-2xs border border-surface-container flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[13px] font-bold text-on-surface">Pembaruan Aplikasi</h3>
          <span className="text-[10.5px] font-semibold text-on-surface-variant block mt-0.5">
            Bersihkan cache &amp; muat versi terbaru
          </span>
        </div>
        <button
          type="button"
          onClick={handleForceUpdate}
          disabled={isUpdating}
          className="h-8.5 px-3.5 rounded-xl bg-primary-container text-white text-[11.5px] font-bold shrink-0 shadow-2xs hover:brightness-105 transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          {isUpdating ? 'Memperbarui...' : 'Perbarui'}
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

      {/* 4. Frasa Darurat (Bahasa Jepang + Latin + Terjemahan) tepat sebelum Hapus Data */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-2xs border border-surface-container">
        <div className="flex items-center gap-2 mb-2">
          <span
            style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
            className="px-1.5 py-0.5 rounded bg-primary-fixed/75 text-primary text-[10.5px] font-bold leading-none shrink-0"
          >
            緊急
          </span>
          <h3 className="text-[15.5px] font-bold text-on-surface">Frasa darurat</h3>
        </div>

        <div className="divide-y divide-surface-container/80">
          {EMERGENCY_PHRASES.map((phrase) => {
            const isOpen = openPhraseId === phrase.id;
            return (
              <div key={phrase.id} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenPhraseId(isOpen ? null : phrase.id)}
                  className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group"
                >
                  <span className="text-[13px] font-bold text-on-surface group-hover:text-primary transition-colors leading-snug">
                    {phrase.idText}
                  </span>
                  <span className="text-[16px] font-medium text-on-surface-variant shrink-0 leading-none">
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
                        className="text-[19px] sm:text-[20px] font-bold text-on-surface leading-snug tracking-wide"
                      >
                        {phrase.jpText}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSpeakJapanese(phrase.jpText)}
                        title="Dengarkan pelafalan Jepang"
                        aria-label={`Putar suara ${phrase.idText}`}
                        className="w-8 h-8 rounded-lg bg-surface-container-low border border-surface-container text-primary hover:bg-primary-fixed/40 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-[17px]">volume_up</span>
                      </button>
                    </div>
                    <p className="text-[12px] text-on-surface-variant font-medium">
                      {phrase.romaji}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
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
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="w-full mt-4 h-9.5 rounded-xl bg-primary-container text-white text-[12px] font-extrabold hover:brightness-105 active:scale-98 transition-all shadow-xs cursor-pointer"
            >
              Mantap, Mengerti!
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Manual PWA Installation Guide Popup */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
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
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full mt-3.5 h-9 rounded-xl bg-primary-container text-white text-[11.5px] font-extrabold hover:brightness-105 active:scale-98 transition-all cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
