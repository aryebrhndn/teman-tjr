import React, { useEffect, useState } from 'react';

const INSTALLED_KEY = 'tjr_pwa_installed';
const DISMISSED_SESSION_KEY = 'tjr_pwa_prompt_dismissed';

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://') ||
    localStorage.getItem(INSTALLED_KEY) === 'true'
  );
}

export const PwaInstallPromptModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [showInstalledSuccess, setShowInstalledSuccess] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const handleInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setIsOpen(false);
      setShowManualSteps(false);
      (window as any).deferredPwaPrompt = null;
    };

    window.addEventListener('appinstalled', handleInstalled);

    // Do NOT show if already installed or already dismissed in this browser session
    if (isPwaInstalled() || sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1') {
      return () => window.removeEventListener('appinstalled', handleInstalled);
    }

    // Wait briefly so initial paint finishes & beforeinstallprompt has time to fire
    const timer = window.setTimeout(() => {
      if (!isPwaInstalled() && sessionStorage.getItem(DISMISSED_SESSION_KEY) !== '1') {
        setIsOpen(true);
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
    setIsOpen(false);
    setShowManualSteps(false);
  };

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPwaPrompt;
    if (promptEvent) {
      // Close custom modal first so it never stacks behind the browser's OS install confirmation
      setIsOpen(false);
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          localStorage.setItem(INSTALLED_KEY, 'true');
          (window as any).deferredPwaPrompt = null;
          setShowInstalledSuccess(true);
        } else {
          // User declined the OS dialog — respect their choice cleanly for this session
          sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
        }
        return;
      } catch {
        // Fallback to manual guide if native prompt fails
        setIsOpen(true);
        setShowManualSteps(true);
        return;
      }
    }
    setShowManualSteps(true);
  };

  if (showInstalledSuccess) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={() => setShowInstalledSuccess(false)}
      >
        <div
          className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[26px] text-emerald-600">verified</span>
          </div>
          <h3 className="text-[15px] font-bold text-on-surface leading-snug">
            Aplikasi Berhasil Dipasang
          </h3>
          <p className="text-[12px] text-on-surface-variant mt-1.5 leading-relaxed">
            <strong>Teman TJR</strong> kini tersedia langsung di layar utama HP Anda dan siap diakses bahkan saat offline.
          </p>
          <button
            type="button"
            onClick={() => setShowInstalledSuccess(false)}
            className="w-full mt-5 h-9.5 rounded-xl bg-primary-container text-white text-[12px] font-bold hover:brightness-105 active:scale-98 transition-all shadow-2xs cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-[110] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={handleDismiss}
    >
      <div
        className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-surface-container flex flex-col items-center text-center animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src="/LOGO TJR.png"
          alt="Logo Teman TJR"
          className="w-12 h-12 rounded-2xl object-cover border border-white/80 shadow-xs bg-primary-container mb-3"
        />

        <h3 id="pwa-install-title" className="text-[15px] font-bold text-on-surface leading-snug">
          Pasang Aplikasi Teman TJR
        </h3>

        <p className="mt-1.5 text-[12px] text-on-surface-variant leading-relaxed">
          Akses cepat langsung dari layar utama HP dan tetap lancar dipakai offline selama di Jepang.
        </p>

        {showManualSteps && (
          <div className="w-full mt-3.5 rounded-xl bg-surface-container-low border border-surface-container p-3 text-left text-[11.5px] text-on-surface-variant space-y-1.5">
            {isIos ? (
              <>
                <p className="font-bold text-on-surface">Cara pasang di iPhone / Safari:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bawah layar.</li>
                  <li>Pilih <strong>Tambah ke Layar Utama</strong>, lalu ketuk <strong>Tambah</strong>.</li>
                </ol>
              </>
            ) : (
              <>
                <p className="font-bold text-on-surface">Cara pasang di browser HP:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Ketuk menu titik tiga (<strong>⋮</strong>) di pojok kanan atas browser.</li>
                  <li>Pilih <strong>Install Aplikasi</strong> atau <strong>Tambahkan ke Layar Utama</strong>.</li>
                </ol>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 w-full mt-5">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 h-9.5 rounded-xl bg-surface-container text-on-surface text-[12px] font-bold hover:bg-surface-container-high transition-colors active:scale-98 cursor-pointer"
          >
            {showManualSteps ? 'Tutup' : 'Nanti Saja'}
          </button>
          {!showManualSteps && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 h-9.5 rounded-xl bg-primary-container text-white text-[12px] font-bold shadow-2xs hover:brightness-105 transition-all active:scale-98 cursor-pointer"
            >
              Pasang Aplikasi
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
