import { useState, useEffect, useRef, useMemo } from 'react';
import { db, liveQuery } from './db';
import gsap from 'gsap';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap, User, Sun, CalendarDays, LineChart, Gift, Dices, Settings
} from 'lucide-react';

import HomeView from './components/HomeView';
import AnalyticsView from './components/AnalyticsView';
import RewardStore from './components/RewardStore';
import SettingsView from './components/SettingsView';
import DailyCheckinView from './components/DailyCheckinView';
import MonopolyGame from './components/MonopolyGame';

const views = {
  home: HomeView,
  checkin: DailyCheckinView,
  analytics: AnalyticsView,
  rewards: RewardStore,
  monopoly: MonopolyGame,
  settings: SettingsView,
};

export default function App() {
  const { t, i18n } = useTranslation();
  const [currentView, setCurrentView] = useState('home');
  const [totalPoints, setTotalPoints] = useState(0);
  const [userName, setUserName] = useState('Hero');
  const displayPointsRef = useRef({ value: 0 });
  const displayPointsElRef = useRef(null);

  // Points subscription
  useEffect(() => {
    const sub = liveQuery(async () => {
      try {
        const allTasks = await db.tasks.toArray();
        let spent = 0;
        if (db.redemptionLogs) {
          const spentPointsLogs = await db.redemptionLogs.toArray();
          spent = spentPointsLogs.reduce((sum, log) => sum + (log.spentPoints || log.spent_points || 0), 0);
        }
        const earned = allTasks
          .filter(task => task.completed)
          .reduce((sum, task) => sum + (Number(task.points) || 0), 0);
        return earned - spent;
      } catch (err) {
        console.warn('Points sync error:', err);
        return 0;
      }
    }).subscribe(value => {
      setTotalPoints(value);
      // Animate points display
      gsap.to(displayPointsRef.current, {
        value,
        duration: 1.5,
        ease: "power2.out",
        snap: { value: 1 },
        onUpdate: () => {
          if (displayPointsElRef.current) {
            displayPointsElRef.current.textContent = Math.round(displayPointsRef.current.value);
          }
        }
      });
    });

    return () => sub.unsubscribe();
  }, []);

  // Settings subscription
  useEffect(() => {
    const sub = liveQuery(() => db.settings.toArray())
      .subscribe(results => {
        const nameSetting = results.find(s => s.key === 'userName');
        if (nameSetting) setUserName(nameSetting.value);

        const langSetting = results.find(s => s.key === 'language');
        if (langSetting && langSetting.value !== i18n.language) {
          i18n.changeLanguage(langSetting.value);
        }
      });
    return () => sub.unsubscribe();
  }, []);

  // Theme
  useEffect(() => {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const navItems = useMemo(() => [
    { name: 'home', icon: Sun, label: t('app.nav.tasks') },
    { name: 'checkin', icon: CalendarDays, label: t('dailyCheckin.title') },
    { name: 'analytics', icon: LineChart, label: t('app.nav.analytics') },
    { name: 'rewards', icon: Gift, label: t('app.nav.rewards') },
    { name: 'monopoly', icon: Dices, label: t('monopoly.navTitle') },
    { name: 'settings', icon: Settings, label: t('app.nav.settings') },
  ], [t]);

  const ActiveView = views[currentView] || HomeView;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col lg:flex-row font-display text-text-main-light dark:text-text-main-dark selection:bg-primary/20 transition-colors duration-200">

      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex w-72 flex-col justify-between bg-surface-light dark:bg-surface-dark border-r border-gray-100 dark:border-gray-800 p-6 h-screen sticky top-0">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-xl size-10 shadow-lg shadow-primary/20 flex items-center justify-center text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight">
              {t('app.title')} <span className="text-primary">{t('app.subtitle')}</span>
            </h1>
          </div>

          <nav className="flex flex-col gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => setCurrentView(item.name)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group relative overflow-hidden text-left ${
                    currentView === item.name
                      ? 'bg-primary/20 text-text-main-light dark:text-primary'
                      : 'text-text-sub-light dark:text-text-sub-dark hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className={`w-6 h-6 transition-transform duration-300 group-hover:scale-110 ${currentView === item.name ? 'text-primary fill-primary' : ''}`} />
                  <span>{item.label}</span>
                  {currentView === item.name && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-l-full"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-light dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all"></div>
            <p className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest mb-1">{t('app.totalPoints')}</p>
            <div className="flex items-baseline gap-1">
              <p ref={displayPointsElRef} className="text-3xl font-black text-primary transition-all duration-300">0</p>
              <span className="text-xs font-bold text-text-sub-light">pts</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-background-light/50 dark:bg-background-dark/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-all cursor-pointer">
            <div className="size-10 rounded-full bg-primary/30 flex items-center justify-center text-primary-dark font-black overflow-hidden ring-2 ring-white dark:ring-gray-800">
              <User className="w-6 h-6" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-sm font-bold truncate">{userName}</p>
              <p className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{t('app.offlineReady')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 transition-colors">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-primary rounded-lg shadow-md flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-black tracking-tight">
            {t('app.title')}<span className="text-primary">{t('app.subtitle')}</span>
          </h1>
        </div>
        <div className="bg-surface-light/50 dark:bg-surface-dark/50 backdrop-blur-md border border-gray-100 dark:border-gray-800 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
          <span ref={el => {
            // Also set mobile points ref (share same animated value)
            if (el && displayPointsElRef.current) {
              // We'll just show totalPoints directly on mobile
            }
          }} className="text-xl font-black text-primary">{totalPoints}</span>
          <span className="text-[8px] font-black text-text-sub-light uppercase">pts</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:h-screen relative w-full bg-background-light dark:bg-background-dark transition-colors duration-200">
        <div className="p-4 pb-28 lg:p-10 lg:pb-10 max-w-5xl mx-auto min-h-full">
          <ActiveView key={currentView} />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-6 left-6 right-6 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-2 flex justify-between items-center z-50 border border-gray-100/50 dark:border-gray-800/50 transition-colors">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => setCurrentView(item.name)}
              className={`flex items-center justify-center w-full py-3 rounded-2xl transition-all duration-300 relative ${
                currentView === item.name ? 'text-primary' : 'text-text-sub-light dark:text-text-sub-dark'
              }`}
            >
              <div className={`absolute inset-x-2 inset-y-1 bg-primary/10 rounded-xl transition-all duration-300 ${
                currentView === item.name ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}></div>
              <div className="flex flex-col items-center relative z-10">
                <Icon className={`w-6 h-6 ${currentView === item.name ? 'text-primary fill-primary' : ''}`} />
                <span className="text-[10px] font-bold mt-0.5">{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
