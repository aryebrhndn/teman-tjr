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
    <header className="fixed top-0 inset-x-0 z-50 bg-[#a90008] text-white shadow-md pt-safe">
      {/* Decorative Top Accent Stripe: Lighter Red (30%) + Golden Yellow (70%) */}
      <div className="w-full h-1 sm:h-1.5 flex shrink-0">
        <div className="w-[30%] bg-[#e53935]"></div>
        <div className="w-[70%] bg-[#fec300]"></div>
      </div>

      <div className="h-[68px] px-4 max-w-xl mx-auto flex items-center justify-between">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-3">
          <img
            src="/LOGO TJR.png"
            alt="Teman TJR Logo"
            className="w-11 h-11 rounded-full object-cover border-2 border-white/95 shadow-xs bg-[#a90008] shrink-0"
          />
          <div className="flex flex-col justify-center">
            <span className="font-extrabold text-[18px] sm:text-[19px] text-white tracking-tight leading-none">
              Teman TJR
            </span>
            <span className="text-[12.5px] sm:text-[13px] text-white/95 flex items-center gap-1.5 mt-1 font-medium tracking-tight leading-none">
              <span className="w-2 h-2 rounded-full bg-[#fec300] inline-block shrink-0"></span>
              Teman Perjalanan Dalam Genggaman
            </span>
          </div>
        </div>

        {/* Tab Indicator & Settings Button */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-white/95 bg-white/20 px-3 py-1 rounded-full hidden sm:inline-block">
            {tabTitles[currentTab] || 'Companion'}
          </span>
          <button
            aria-label="Pengaturan"
            title="Pengaturan"
            onClick={onOpenSettings}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[24px]">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
