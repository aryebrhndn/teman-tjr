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
      {/* Decorative Top Accent Stripe: Lighter Red (30%) + Golden Yellow (70%) */}
      <div className="w-full h-[2.5px] flex shrink-0">
        <div className="w-[30%] bg-[#e53935]"></div>
        <div className="w-[70%] bg-[#fec300]"></div>
      </div>

      <div className="h-[54px] px-4 max-w-xl mx-auto flex items-center justify-between">
        {/* Brand & Slogan */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/LOGO TJR.png"
            alt="Teman TJR Logo"
            className="w-8 h-8 rounded-full object-cover border border-white/90 shadow-2xs bg-[#a90008] shrink-0"
          />
          <div className="flex flex-col justify-center leading-none min-w-0">
            <span className="font-extrabold text-[15px] text-white tracking-tight leading-none">
              Teman TJR
            </span>
            <span className="text-[10px] text-white/90 flex items-center gap-1 mt-1 font-medium tracking-tight leading-none truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#fec300] inline-block shrink-0"></span>
              Teman Perjalanan Dalam Genggaman
            </span>
          </div>
        </div>

        {/* Tab Indicator & Settings Button */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[10.5px] font-bold text-white/95 bg-white/20 px-2.5 py-0.5 rounded-full hidden sm:inline-block">
            {tabTitles[currentTab] || 'Companion'}
          </span>
          <button
            aria-label="Pengaturan"
            title="Pengaturan"
            onClick={onOpenSettings}
            className="w-8.5 h-8.5 flex items-center justify-center rounded-xl text-white hover:bg-white/20 transition-all active:scale-95 bg-white/10"
          >
            <span className="material-symbols-outlined text-[19px]">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
