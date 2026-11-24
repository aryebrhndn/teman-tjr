import { useEffect, useState } from 'react';
import { initializeDatabaseSeed } from './database/seed';
import { initAppearance } from './utils/appearance';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { HomeScreen } from './features/dashboard/HomeScreen';
import { ItineraryScreen } from './features/itinerary/ItineraryScreen';
import { BudgetScreen } from './features/budget/BudgetScreen';
import { PrayerScreen } from './features/prayer/PrayerScreen';
import { BekalScreen } from './features/checklist/BekalScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { PwaInstallPromptModal } from './components/pwa/PwaInstallPromptModal';

const APP_BUILD_ID = '2026.11.24-build28';

export function App() {
  const [isReady, setIsReady] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('beranda');
  const [openAddExpenseInBudget, setOpenAddExpenseInBudget] = useState(false);

  useEffect(() => {
    initAppearance();
    // Listen for PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Auto-purge stale cache if new build version
    const lastBuild = localStorage.getItem('tjr_last_build');
    if (lastBuild && lastBuild !== APP_BUILD_ID) {
      localStorage.setItem('tjr_last_build', APP_BUILD_ID);
      if ('caches' in window) {
        caches.keys().then((keys) => {
          Promise.all(keys.map((k) => caches.delete(k))).then(() => {
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then((regs) => {
                regs.forEach((r) => r.update());
              });
            }
          });
        });
      }
    } else if (!lastBuild) {
      localStorage.setItem('tjr_last_build', APP_BUILD_ID);
    }

    async function init() {
      await initializeDatabaseSeed();
      setIsReady(true);
    }
    init();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Loading state - Pure CSS circular spinner (tanpa ketergantungan font ikon)
  if (!isReady) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 gap-4">
        <img
          src="/LOGO TJR.png"
          alt="Teman TJR Logo"
          className="w-14 h-14 rounded-2xl object-cover border-2 border-white/80 shadow-sm bg-primary-container"
        />
        <div
          aria-label="Memuat"
          className="w-6 h-6 rounded-full border-[2.5px] border-surface-container-highest border-t-primary-container animate-spin"
        />
      </div>
    );
  }

  const renderMainContent = () => {
    switch (currentTab) {
      case 'beranda':
        return (
          <HomeScreen
            onNavigateTab={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAddExpense={() => {
              setOpenAddExpenseInBudget(true);
              setCurrentTab('biaya');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        );
      case 'itinerary':
        return <ItineraryScreen />;
      case 'biaya':
        return <BudgetScreen initialOpenAddExpense={openAddExpenseInBudget} />;
      case 'ibadah':
        return <PrayerScreen />;
      case 'bekal':
        return <BekalScreen />;
      case 'settings':
        return (
          <SettingsScreen
            onDeactivated={() => {
              // Reset local data reload
              window.location.reload();
            }}
            onBack={() => setCurrentTab('beranda')}
          />
        );
      default:
        return (
          <HomeScreen
            onNavigateTab={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col selection:bg-primary-fixed selection:text-primary">
      <Header
        currentTab={currentTab}
        onOpenSettings={() => setCurrentTab(currentTab === 'settings' ? 'beranda' : 'settings')}
      />

      <main className="flex-1 w-full max-w-xl mx-auto px-3.5 sm:px-4 pt-[80px] sm:pt-[84px] pb-[76px] sm:pb-[82px] flex flex-col">
        {renderMainContent()}
      </main>

      <BottomNav currentTab={currentTab} onTabChange={(tab) => setCurrentTab(tab)} />

      {/* Optional Auto-Show PWA Install Modal (only when not yet installed) */}
      <PwaInstallPromptModal />
    </div>
  );
}

export default App;
