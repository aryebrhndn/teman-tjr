import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { activateDevice } from '../../services/activation.service';

interface ActivationScreenProps {
  onActivated: () => void;
}

export const ActivationScreen: React.FC<ActivationScreenProps> = ({ onActivated }) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setToast(null);

    // Simulate authentic server verification
    setTimeout(async () => {
      const res = await activateDevice(code);
      setIsLoading(false);

      if (res.success) {
        setToast({ type: 'success', message: res.message });
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#a90008', '#fec300', '#ffb4aa'],
          });
        } catch {}

        setTimeout(() => {
          onActivated();
        }, 1200);
      } else {
        setToast({ type: 'error', message: res.message });
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-between px-4 pt-safe pb-safe relative overflow-hidden">
      {/* Subtle Zen Motif Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10 flex justify-center opacity-30">
        <svg
          className="w-full max-w-lg h-auto text-outline-variant"
          fill="none"
          viewBox="0 0 400 480"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M120 280L185 140C192 125 208 125 215 140L280 280"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
          <path
            d="M170 172C182 178 190 170 200 176C210 182 220 174 230 178"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          />
          <circle cx="200" cy="180" fill="#fec300" fillOpacity="0.12" r="48" />
          <path
            d="M70 110C68 95 85 88 92 100C98 112 80 120 70 110Z"
            fill="#ffb4aa"
            fillOpacity="0.45"
          />
          <path
            d="M320 90C315 78 332 70 338 82C344 94 328 100 320 90Z"
            fill="#ffb4aa"
            fillOpacity="0.35"
          />
        </svg>
      </div>

      <div className="w-full max-w-md mx-auto flex flex-col items-center pt-6 pb-4">
        {/* Header & Brand Mark */}
        <header className="flex flex-col items-center text-center px-2">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1.5 bg-primary-fixed-dim/40 rounded-3xl blur-md"></div>
            <div className="relative w-20 h-20 rounded-2xl bg-surface-container-lowest shadow-md flex items-center justify-center p-1.5">
              <img
                src="/LOGO TJR.png"
                alt="TEMAN TJR Logo"
                className="w-full h-full rounded-xl object-cover border-2 border-white shadow-sm bg-[#a90008]"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 bg-secondary-container text-on-secondary-container rounded-full p-1 shadow-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-[13px] leading-none">verified</span>
            </span>
          </div>

          <div className="mt-5 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-tertiary">
              <span className="material-symbols-outlined text-[13px]">flight_takeoff</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Japan Travel Companion
              </span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              Selamat Datang di <br />
              <span className="text-primary-container">TEMAN TJR</span>
            </h1>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto leading-relaxed">
              Teman jalan dalam genggaman — Sahabat setia menjelajahi Jepang secara mandiri, tenang, dan terarah.
            </p>
          </div>
        </header>

        {/* Activation Ticket Card */}
        <section className="mt-6 w-full">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden relative border border-surface-container">
            {/* Top decorative gradient bar */}
            <div className="h-2 w-full bg-gradient-to-r from-primary-container via-surface-tint to-secondary-container"></div>
            
            <div className="p-5 flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary-container text-[20px]">
                    confirmation_number
                  </span>
                  <span className="text-xs font-semibold text-on-surface">
                    Tiket Akses Digital
                  </span>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                  Ver. 2.0 PWA
                </span>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-on-surface" htmlFor="activationCode">
                    Masukkan Kode Aktivasi Trip
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-on-surface-variant flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-[20px]">key</span>
                    </span>
                    <input
                      id="activationCode"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: TJR-JPN-2025-XXXX"
                      autoComplete="off"
                      spellCheck="false"
                      required
                      className="w-full h-12 pl-11 pr-10 rounded-xl bg-surface-container-low text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container transition-all uppercase tracking-wide font-mono"
                    />
                    {code && (
                      <button
                        type="button"
                        aria-label="Bersihkan input"
                        onClick={() => setCode('')}
                        className="absolute right-3 text-outline hover:text-on-surface focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[18px]">cancel</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant flex items-start gap-1 pt-1 leading-normal">
                    <span className="material-symbols-outlined text-[14px] shrink-0 text-secondary mt-0.5">
                      info
                    </span>
                    <span>
                      Kode aktivasi didapatkan otomatis setelah pemesanan layanan itinerary Teman Jalan Ryan.
                    </span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl bg-primary-container text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden group hover:brightness-105 disabled:opacity-75"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[20px]">
                        progress_activity
                      </span>
                      <span>Memverifikasi Kode...</span>
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">Aktifkan Aplikasi</span>
                      <span className="material-symbols-outlined text-[20px] relative z-10 transition-transform group-hover:translate-x-1">
                        arrow_forward
                      </span>
                      <span className="absolute top-0 inset-x-0 h-1 bg-secondary-container opacity-85"></span>
                    </>
                  )}
                </button>
              </form>

              {/* Dynamic Feedback Toast */}
              {toast && (
                <div
                  className={`rounded-xl p-3 text-center text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in ${
                    toast.type === 'success'
                      ? 'bg-surface-container text-primary-container'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {toast.type === 'success' ? 'check_circle' : 'warning'}
                  </span>
                  <span>{toast.message}</span>
                </div>
              )}

              {/* Demo Fast Track Hint */}
              <div className="pt-1 text-center flex flex-col gap-1 items-center">
                <button
                  type="button"
                  onClick={() => setCode('TJR-JPN-2025-DEMO')}
                  className="text-[11px] text-secondary font-medium hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">bolt</span>
                  Gunakan Kode Demo Cepat: <strong className="font-mono">TJR-JPN-2025-DEMO</strong>
                </button>
                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="inline-flex items-center gap-1.5 text-xs text-primary-container font-semibold hover:underline focus:outline-none py-1 px-2 rounded-lg"
                >
                  <span className="material-symbols-outlined text-[18px]">help_center</span>
                  <span>Cara Menggunakan & Bantuan</span>
                </button>
              </div>
            </div>

            {/* Ticket Notch Cuts */}
            <div className="absolute -left-2.5 top-[230px] w-5 h-5 rounded-full bg-surface border-r border-surface-container"></div>
            <div className="absolute -right-2.5 top-[230px] w-5 h-5 rounded-full bg-surface border-l border-surface-container"></div>
          </div>
        </section>

        {/* Offline-First Value Proposition */}
        <section className="mt-4 w-full">
          <div className="bg-surface-container rounded-2xl p-4 shadow-sm flex items-start gap-3 border border-surface-container-high">
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center shrink-0 text-on-secondary-fixed shadow-sm">
              <span className="material-symbols-outlined text-[22px]">bolt</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-on-surface">100% Offline-First</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-medium">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                Seluruh jadwal sholat, itinerary, konverter kurs, dan direktori masjid tersimpan aman di perangkat tanpa bergantung sinyal roaming.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Feature Highlights */}
        <section className="mt-4 grid grid-cols-3 gap-2 text-center w-full">
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm flex flex-col items-center border border-surface-container">
            <span className="material-symbols-outlined text-primary-container text-[22px]">mosque</span>
            <span className="text-xs font-semibold text-on-surface mt-1">Jadwal Salat</span>
            <span className="text-[10px] text-on-surface-variant">Akurat di Jepang</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm flex flex-col items-center border border-surface-container">
            <span className="material-symbols-outlined text-secondary-container text-[22px]">restaurant_menu</span>
            <span className="text-xs font-semibold text-on-surface mt-1">Kuliner Halal</span>
            <span className="text-[10px] text-on-surface-variant">Terverifikasi</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm flex flex-col items-center border border-surface-container">
            <span className="material-symbols-outlined text-surface-tint text-[22px]">currency_exchange</span>
            <span className="text-xs font-semibold text-on-surface mt-1">Kurs JPY-IDR</span>
            <span className="text-[10px] text-on-surface-variant">Kalkulator Siap</span>
          </div>
        </section>
      </div>

      {/* Brand Footer */}
      <footer className="w-full text-center py-4 space-y-1 text-on-surface-variant text-[11px]">
        <div className="flex items-center justify-center gap-1 font-medium">
          <span>Omotenashi Care</span>
          <span>•</span>
          <span>Kenyamanan Solo & Family Travel</span>
        </div>
        <p className="text-outline text-[10px]">
          © 2025 Teman Jalan Ryan. Hak Cipta Dilindungi.
        </p>
      </footer>

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-[24px]">
                  support_agent
                </span>
                <h3 className="text-sm font-bold text-on-surface">Panduan Aktivasi</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs text-on-surface-variant">
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <p>
                  <strong className="text-on-surface">Cek WhatsApp / Email:</strong> Buka pesan konfirmasi dari tim Teman Jalan Ryan setelah konsultasi perjalanan.
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <p>
                  <strong className="text-on-surface">Salin Kode:</strong> Format kode berupa 16 karakter (misal:{' '}
                  <span className="font-mono text-primary-container">TJR-JPN-2025-XXXX</span>).
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <div className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <p>
                  <strong className="text-on-surface">Butuh Bantuan?</strong> Hubungi customer service Teman Jalan Ryan siap mendampingi selama di Jepang.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full h-11 rounded-xl bg-surface-container-highest text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
