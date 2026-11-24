import React from 'react';

interface HeaderProps {
  currentTab: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onOpenSettings }) => {
  const tabTitles: Record<string, string> = {
    beranda: 'Beranda',
    itinerary: 'Itinerary',
    biaya: 'Biaya',
    ibadah: 'Ibadah',
    bekal: 'Bekal',
    settings: 'Pengaturan',
    admin: 'Admin',
  };

  return (
    <header
      style={{
        backgroundColor: 'var(--color-header-bg)',
        color: 'var(--color-header-fg)',
        borderBottom: '1px solid var(--color-header-border)',
      }}
      className="fixed top-0 inset-x-0 z-30 shadow-xs pt-safe transition-colors"
    >
      {/* Decorative Top Accent Stripe */}
      <div className="w-full h-[2.5px] flex shrink-0">
        <div className="w-[30%]" style={{ backgroundColor: 'var(--color-header-stripe-red)' }}></div>
        <div className="w-[70%] bg-[#fec300]"></div>
      </div>

      <div className="h-[54px] px-4 max-w-xl mx-auto flex items-center justify-between">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/LOGO TJR.png"
            alt="Teman TJR Logo"
            className="w-8 h-8 rounded-full object-cover border border-white/80 shadow-2xs bg-primary-container shrink-0"
          />
          <div className="flex flex-col justify-center leading-none min-w-0">
            <span className="font-extrabold text-[15px] tracking-tight leading-none">
              Teman TJR
            </span>
            <span
              style={{ color: 'var(--color-header-muted)' }}
              className="text-[10px] flex items-center gap-1 mt-1 font-medium tracking-tight leading-none truncate"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#fec300] inline-block shrink-0"></span>
              Teman Jalan Dalam Genggaman
            </span>
          </div>
        </div>

        {/* Tab Indicator & Settings Button */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span
            style={{ backgroundColor: 'var(--color-header-btn-bg)' }}
            className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full hidden sm:inline-block"
          >
            {tabTitles[currentTab] || 'Companion'}
          </span>
          <button
            type="button"
            aria-label="Pengaturan"
            title="Pengaturan"
            onClick={onOpenSettings}
            style={{ backgroundColor: 'var(--color-header-btn-bg)' }}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl hover:opacity-90 transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[19px]">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
