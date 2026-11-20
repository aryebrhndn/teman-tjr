import { useEffect, useState } from 'react';
import { initializeDatabaseSeed } from './database/seed';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { HomeScreen } from './features/dashboard/HomeScreen';
import { ItineraryScreen } from './features/itinerary/ItineraryScreen';
import { BudgetScreen } from './features/budget/BudgetScreen';
import { PrayerScreen } from './features/prayer/PrayerScreen';
import { BekalScreen } from './features/checklist/BekalScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { AdminScreen } from './features/admin/AdminScreen';

const APP_BUILD_ID = '2026.11.20-build12';

export function App() {
  const [isReady, setIsReady] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('beranda');
  const [openAddExpenseInBudget, setOpenAddExpenseInBudget] = useState(false);

  useEffect(() => {
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

    // Check if URL has #admin
    if (window.location.hash === '#admin') {
      setCurrentTab('admin');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Loading state
  if (!isReady) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <img
          src="/LOGO TJR.png"
          alt="Teman TJR Logo"
          className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md bg-[#a90008] animate-pulse"
        />
        <p className="mt-4 text-xs font-semibold text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          Memuat Teman TJR...
        </p>
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
            onOpenAdmin={() => setCurrentTab('admin')}
            onBack={() => setCurrentTab('beranda')}
          />
        );
      case 'admin':
        return <AdminScreen onBack={() => setCurrentTab('settings')} />;
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

  const showNav = currentTab !== 'admin';

  return (
    <div className="min-h-screen bg-surface flex flex-col selection:bg-primary-fixed selection:text-primary">
      <Header
        currentTab={currentTab}
        onOpenSettings={() => setCurrentTab(currentTab === 'settings' ? 'beranda' : 'settings')}
      />

      <main className="flex-1 w-full max-w-xl mx-auto px-3.5 sm:px-4 pt-[66px] sm:pt-[70px] pb-[76px] sm:pb-[82px] flex flex-col">
        {renderMainContent()}
      </main>

      {showNav && <BottomNav currentTab={currentTab} onTabChange={(tab) => setCurrentTab(tab)} />}
    </div>
  );
}

export default App;
