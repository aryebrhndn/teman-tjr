import React from 'react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'beranda', label: 'Beranda', kanji: '家' },
    { id: 'itinerary', label: 'Itinerary', kanji: '旅' },
    { id: 'biaya', label: 'Biaya', kanji: '円' },
    { id: 'ibadah', label: 'Ibadah', kanji: '礼' },
    { id: 'bekal', label: 'Bekal', kanji: '荷' },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#ffffff]/98 backdrop-blur-xl border-t border-surface-container shadow-sm pb-safe">
      <div className="flex justify-around items-center h-[58px] max-w-xl mx-auto px-1 sm:px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition-all select-none active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-primary-container'
                  : 'text-on-surface-variant/80 hover:text-on-surface'
              }`}
            >
              <span
                style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
                className={`w-7 h-6 rounded-lg flex items-center justify-center text-[15px] leading-none transition-all ${
                  isActive
                    ? 'bg-primary-fixed/85 text-primary font-extrabold border border-primary/20 shadow-2xs'
                    : 'font-semibold text-on-surface-variant'
                }`}
              >
                {tab.kanji}
              </span>
              <span
                className={`text-[10px] tracking-tight mt-0.5 leading-none ${
                  isActive ? 'font-extrabold text-primary-container' : 'font-semibold'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
