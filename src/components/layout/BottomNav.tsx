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
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#ffffff]/98 backdrop-blur-xl border-t border-surface-container shadow-sm pb-safe">
      <div className="flex justify-around items-center h-[56px] max-w-xl mx-auto px-1 sm:px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all select-none group active:scale-95 ${
                isActive
                  ? 'text-primary-container font-bold'
                  : 'text-on-surface-variant/80 hover:text-on-surface'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] sm:text-[21px] transition-transform ${
                  isActive ? "font-variation-settings: 'FILL' 1" : ''
                }`}
              >
                {tab.icon}
              </span>
              <span className={`text-[10.5px] tracking-tight mt-0.5 ${isActive ? 'font-black' : 'font-semibold'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
