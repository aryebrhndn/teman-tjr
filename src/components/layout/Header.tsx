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
      <div className="h-10 px-3 max-w-md mx-auto flex items-center justify-between">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-1.5">
          <img
            src="/LOGO TJR.png"
            alt="TEMAN TJR Logo"
            className="w-6 h-6 rounded-full object-cover border border-white shadow-2xs bg-[#a90008] shrink-0"
          />
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-[12px] text-white tracking-wide leading-none">
              TEMAN TJR
            </span>
            <span className="text-[8.5px] text-white/90 flex items-center gap-1 mt-0.5 font-medium tracking-tight">
              <span className="w-1 h-1 rounded-full bg-[#fec300] inline-block shrink-0"></span>
              Teman perjalanan dalam genggaman
            </span>
          </div>
        </div>

        {/* Tab Indicator & Settings Button */}
        <div className="flex items-center gap-1">
          <span className="text-[9.5px] font-medium text-white/85 bg-white/15 px-2 py-0.5 rounded-full hidden sm:inline-block">
            {tabTitles[currentTab] || 'Companion'}
          </span>
          <button
            aria-label="Pengaturan"
            title="Pengaturan"
            onClick={onOpenSettings}
            className="w-7 h-7 flex items-center justify-center rounded-full text-white/95 hover:text-white hover:bg-white/15 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
