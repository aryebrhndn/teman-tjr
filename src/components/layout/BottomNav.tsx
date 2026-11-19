import React from 'react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'beranda', label: 'Beranda', icon: 'home' },
    { id: 'itinerary', label: 'Itinerary', icon: 'route' },
    { id: 'biaya', label: 'Biaya', icon: 'currency_exchange' },
    { id: 'ibadah', label: 'Ibadah', icon: 'mosque' },
    { id: 'bekal', label: 'Bekal', icon: 'luggage' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#ffffff]/95 backdrop-blur-xl border-t border-surface-container/80 shadow-xs pb-safe">
      <div className="flex justify-around items-center h-11 max-w-md mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-0.5 transition-all select-none group ${
                isActive
                  ? 'text-primary-container font-semibold'
                  : 'text-on-surface-variant/70 hover:text-on-surface'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[16px] group-hover:scale-105 transition-transform ${
                  isActive ? "font-variation-settings: 'FILL' 1" : ''
                }`}
              >
                {tab.icon}
              </span>
              <span className="text-[9px] font-medium tracking-tight mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
