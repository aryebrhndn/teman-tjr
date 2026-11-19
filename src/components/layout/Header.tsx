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
    <header className="fixed top-0 inset-x-0 z-50 bg-[#a90008] text-white shadow-xs pt-safe">
      <div className="h-[52px] px-3 max-w-md mx-auto flex items-center justify-between">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-2">
          <img
            src="/LOGO TJR.png"
            alt="TEMAN TJR Logo"
            className="w-8 h-8 rounded-full object-cover border border-white/90 shadow-2xs bg-[#a90008] shrink-0"
          />
          <div className="flex flex-col justify-center">
            <span className="font-extrabold text-[15px] text-white tracking-wide leading-none">
              TEMAN TJR
            </span>
            <span className="text-[11px] text-white/95 flex items-center gap-1 mt-1 font-medium tracking-tight leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fec300] inline-block shrink-0"></span>
              Teman perjalanan dalam genggaman
            </span>
          </div>
        </div>

        {/* Tab Indicator & Settings Button */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-white/90 bg-white/20 px-2.5 py-0.5 rounded-full hidden sm:inline-block">
            {tabTitles[currentTab] || 'Companion'}
          </span>
          <button
            aria-label="Pengaturan"
            title="Pengaturan"
            onClick={onOpenSettings}
            className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
