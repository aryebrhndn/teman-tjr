import { useEffect, useState } from 'react';
import { initializeDatabaseSeed } from './database/seed';
import { checkActivationStatus } from './services/activation.service';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { ActivationScreen } from './features/activation/ActivationScreen';
import { HomeScreen } from './features/dashboard/HomeScreen';
import { ItineraryScreen } from './features/itinerary/ItineraryScreen';
import { BudgetScreen } from './features/budget/BudgetScreen';
import { PrayerScreen } from './features/prayer/PrayerScreen';
import { BekalScreen } from './features/checklist/BekalScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { AdminScreen } from './features/admin/AdminScreen';

export function App() {
  const [isActivated, setIsActivated] = useState<boolean | null>(null);
  const [currentTab, setCurrentTab] = useState<string>('beranda');
  const [openAddExpenseInBudget, setOpenAddExpenseInBudget] = useState(false);

  useEffect(() => {
    async function init() {
      await initializeDatabaseSeed();
      const receipt = await checkActivationStatus();
      setIsActivated(!!receipt);
    }
    init();

    // Check if URL has #admin
    if (window.location.hash === '#admin') {
      setCurrentTab('admin');
    }
  }, []);

  // Loading state
  if (isActivated === null) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <img
          src="/LOGO TJR.png"
          alt="TEMAN TJR Logo"
          className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-[#a90008] animate-pulse"
        />
        <p className="mt-4 text-xs font-semibold text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          Memuat TEMAN TJR...
        </p>
      </div>
    );
  }

  // If not activated, render activation screen
  if (!isActivated) {
    return (
      <ActivationScreen
        onActivated={() => {
          setIsActivated(true);
          setCurrentTab('beranda');
        }}
      />
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
            onDeactivated={() => setIsActivated(false)}
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

      <main className="flex-1 w-full max-w-xl md:max-w-md mx-auto px-4 md:px-3 pt-[76px] md:pt-[58px] pb-[82px] md:pb-[62px] flex flex-col transition-all">
        {renderMainContent()}
      </main>




      {showNav && <BottomNav currentTab={currentTab} onTabChange={(tab) => setCurrentTab(tab)} />}
    </div>
  );
}

export default App;
