import { useState, useEffect, useMemo } from 'react';
import { db, liveQuery } from '../db';
import { useTranslation } from 'react-i18next';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';
import {
  BadgeCheck, ClipboardList, Download, Flame, LineChart,
  PieChart, Star, Stars, TrendingUp, Zap
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

export default function AnalyticsView() {
  const { t } = useTranslation();
  const [allTasks, setAllTasks] = useState([]);
  const [userName, setUserName] = useState('Hero');

  // Subscribe to userName
  useEffect(() => {
    let tasksSub = null;

    const nameSub = liveQuery(() => db.settings.get('userName'))
      .subscribe(result => {
        const newName = result?.value || 'Hero';
        setUserName(newName);

        // Re-subscribe to tasks with new name
        if (tasksSub) tasksSub.unsubscribe();
        tasksSub = liveQuery(() =>
          db.tasks.where('user_name').equals(newName).toArray()
        ).subscribe(tasks => {
          setAllTasks(tasks.sort((a, b) => b.date.localeCompare(a.date)));
        });
      });

    return () => {
      nameSub.unsubscribe();
      if (tasksSub) tasksSub.unsubscribe();
    };
  }, []);

  // Stats calculations
  const stats = useMemo(() => {
    if (allTasks.length === 0) return { perfectDays: 0, streak: 0, rate: 0 };

    const dateGroups = allTasks.reduce((acc, task) => {
      if (!acc[task.date]) acc[task.date] = [];
      acc[task.date].push(task);
      return acc;
    }, {});

    const dates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
    const perfectDays = Object.values(dateGroups).filter(dayTasks =>
      dayTasks.length > 0 && dayTasks.every(t => t.completed)
    ).length;

    const totalCompleted = allTasks.filter(t => t.completed).length;
    const rate = Math.round((totalCompleted / allTasks.length) * 100);

    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const dayTasks = dateGroups[dates[i]];
      if (dayTasks.every(t => t.completed)) {
        streak++;
      } else {
        break;
      }
    }

    return { perfectDays, streak, rate };
  }, [allTasks]);

  // Chart data
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  const chartData = useMemo(() => {
    const data = weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      return allTasks.filter(t => t.date === dayStr && t.completed).length;
    });

    return {
      labels: weekDays.map(d => format(d, 'EEE')),
      datasets: [{
        label: 'Tasks',
        backgroundColor: '#2563eb',
        hoverBackgroundColor: '#1d4ed8',
        borderRadius: 12,
        data: data,
        barPercentage: 0.6,
      }]
    };
  }, [allTasks]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Lexend', size: 14 },
        bodyFont: { family: 'Lexend', size: 12 },
        padding: 12,
        displayColors: false,
        cornerRadius: 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: true, color: 'rgba(0,0,0,0.03)', drawBorder: false },
        ticks: { precision: 0, font: { family: 'Lexend' } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Lexend', weight: 'bold' } }
      }
    }
  };

  const exportData = () => {
    const headers = [t('analytics.table.date'), t('analytics.table.task'), t('analytics.table.subject'), t('analytics.table.points'), t('analytics.table.status')];
    const rows = allTasks.map(t => [t.date, `"${t.title.replace(/"/g, '""')}"`, t.subject, t.points, t.completed ? 'Completed' : 'Pending']);
    const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${t('analytics.exportFileName')}.csv`);
    link.click();
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">{t('analytics.title')}</h1>
          <p className="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{t('analytics.subtitle')} 🏆</p>
        </div>
        <button
          onClick={exportData}
          className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 text-text-main-light dark:text-text-main-dark px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm"
        >
          <Download className="w-5 h-5" />
          {t('analytics.exportCsv')}
        </button>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BadgeCheck className="w-16 h-16 text-primary" />
          </div>
          <div>
            <p className="text-text-sub-light dark:text-text-sub-dark text-xs font-black uppercase tracking-widest">{t('analytics.status.completed')}</p>
            <p className="text-4xl font-black mt-1 text-text-main-light dark:text-white">{stats.perfectDays}</p>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Perfect Days
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity whitespace-nowrap">
            <Flame className="w-16 h-16 text-orange-400" />
          </div>
          <div>
            <p className="text-text-sub-light dark:text-text-sub-dark text-xs font-black uppercase tracking-widest">Active Streak</p>
            <p className="text-4xl font-black mt-1 text-text-main-light dark:text-white">{stats.streak} Days</p>
          </div>
          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            Keep going!
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PieChart className="w-16 h-16 text-blue-400" />
          </div>
          <div>
            <p className="text-text-sub-light dark:text-text-sub-dark text-xs font-black uppercase tracking-widest">Global Progress</p>
            <p className="text-4xl font-black mt-1 text-text-main-light dark:text-white">{stats.rate}%</p>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5">
            <Stars className="w-4 h-4" />
            Completion
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="text-xl font-bold">{t('analytics.weekActivity')}</h3>
              <p className="text-sm text-text-sub-light">{t('analytics.subtitle')}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-black text-primary bg-primary/10 px-4 py-2 rounded-full uppercase tracking-wider">
              <LineChart className="w-4 h-4" />
              On Track
            </div>
          </div>
          <div className="h-[300px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Motivation Box & Stats Detail */}
        <div className="flex flex-col gap-6">
          <div className="bg-background-dark dark:bg-primary/20 p-7 rounded-3xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 size-24 bg-primary rounded-full blur-3xl opacity-20"></div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm shadow-inner ring-1 ring-white/20">
                <Star className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-black text-xl text-primary">{t('analytics.tipTitle')}</h3>
                <p className="text-sm text-gray-300 mt-2 leading-relaxed">{t('analytics.tipDesc', { name: userName })}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">{t('analytics.history')}</h3>
              <button className="text-xs font-black text-primary hover:underline uppercase tracking-widest">{t('analytics.exportCsv')}</button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {allTasks.slice(0, 10).map(task => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-2xl hover:bg-background-light dark:hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 group cursor-pointer"
                >
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all shadow-sm">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate text-sm">{task.title}</p>
                    <p className="text-[10px] text-text-sub-light font-bold uppercase">{task.date}</p>
                  </div>
                  {task.completed && (
                    <div className="bg-primary/20 text-text-sub-light dark:text-primary text-[10px] font-black px-2 py-1 rounded-lg">
                      DONE
                    </div>
                  )}
                </div>
              ))}
              {allTasks.length === 0 && (
                <div className="text-center py-10 opacity-30 italic text-sm">
                  {t('analytics.table.empty')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
