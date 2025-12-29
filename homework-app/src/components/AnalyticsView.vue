<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { db } from '../db';
import { liveQuery } from 'dexie';
import { useI18n } from 'vue-i18n';
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
import { Bar } from 'vue-chartjs';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, differenceInDays } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

const { t } = useI18n();

const allTasks = ref([]);
const userName = ref('Hero');

const subscription = liveQuery(() => db.tasks.toArray()).subscribe(tasks => {
  allTasks.value = tasks.sort((a, b) => b.date.localeCompare(a.date));
});

const nameSubscription = liveQuery(() => db.settings.get('userName'))
  .subscribe(result => {
    if (result) userName.value = result.value;
  });

onUnmounted(() => {
  subscription.unsubscribe();
  nameSubscription.unsubscribe();
});

// --- Stats Calculations ---
const stats = computed(() => {
  if (allTasks.value.length === 0) return { perfectDays: 0, streak: 0, rate: 0 };
  
  // Group by date
  const dateGroups = allTasks.value.reduce((acc, task) => {
    if (!acc[task.date]) acc[task.date] = [];
    acc[task.date].push(task);
    return acc;
  }, {});

  const dates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
  
  // Perfect Days: all tasks completed for a day
  const perfectDays = Object.values(dateGroups).filter(dayTasks => 
    dayTasks.length > 0 && dayTasks.every(t => t.completed)
  ).length;

  // Completion Rate
  const totalCompleted = allTasks.value.filter(t => t.completed).length;
  const rate = Math.round((totalCompleted / allTasks.value.length) * 100);

  // Simple Streak calc
  let streak = 0;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  // Check if today has at least one task and is completed
  // This is simplified
  for (let i = 0; i < dates.length; i++) {
    const dayTasks = dateGroups[dates[i]];
    if (dayTasks.every(t => t.completed)) {
      streak++;
    } else {
      break;
    }
  }

  return { perfectDays, streak, rate };
});

// --- Chart ---
const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
const weekDays = eachDayOfInterval({
  start: weekStart,
  end: endOfWeek(new Date(), { weekStartsOn: 1 })
});

const chartData = computed(() => {
  const data = weekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return allTasks.value.filter(t => t.date === dayStr && t.completed).length;
  });

  return {
    labels: weekDays.map(d => format(d, 'EEE')),
    datasets: [{
      label: 'Tasks',
      backgroundColor: '#4bee2b', // primary
      hoverBackgroundColor: '#3bc920',
      borderRadius: 12,
      data: data,
      barPercentage: 0.6,
    }]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { 
      backgroundColor: '#132210', 
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
  const rows = allTasks.value.map(t => [t.date, `"${t.title.replace(/"/g, '""')}"`, t.subject, t.points, t.completed ? 'Completed' : 'Pending']);
  const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${t('analytics.exportFileName')}.csv`);
  link.click();
};
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="flex flex-col gap-2">
        <h1 class="text-4xl md:text-5xl font-black tracking-tight leading-tight">{{ t('analytics.title') }}</h1>
        <p class="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{{ t('analytics.subtitle') }} 🏆</p>
      </div>
      <button 
        @click="exportData"
        class="bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 text-text-main-light dark:text-text-main-dark px-6 py-3 rounded-2xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm"
      >
        <span class="material-symbols-outlined">download</span>
        {{ t('analytics.exportCsv') }}
      </button>
    </div>

    <!-- Stats Cards -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
        <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span class="material-symbols-outlined text-7xl text-primary font-light">verified</span>
        </div>
        <div>
          <p class="text-text-sub-light dark:text-text-sub-dark text-xs font-black uppercase tracking-widest">{{ t('analytics.status.completed') }}</p>
          <p class="text-4xl font-black mt-1 text-text-main-light dark:text-white">{{ stats.perfectDays }}</p>
        </div>
        <div class="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base">trending_up</span>
          Perfect Days
        </div>
      </div>

      <div class="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
        <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity whitespace-nowrap">
          <span class="material-symbols-outlined text-7xl text-orange-400 font-light">local_fire_department</span>
        </div>
        <div>
          <p class="text-text-sub-light dark:text-text-sub-dark text-xs font-black uppercase tracking-widest">Active Streak</p>
          <p class="text-4xl font-black mt-1 text-text-main-light dark:text-white">{{ stats.streak }} Days</p>
        </div>
        <div class="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base">flash_on</span>
          Keep going!
        </div>
      </div>

      <div class="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
        <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <span class="material-symbols-outlined text-7xl text-blue-400 font-light">pie_chart</span>
        </div>
        <div>
          <p class="text-text-sub-light dark:text-text-sub-dark text-xs font-black uppercase tracking-widest">Global Progress</p>
          <p class="text-4xl font-black mt-1 text-text-main-light dark:text-white">{{ stats.rate }}%</p>
        </div>
        <div class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5">
          <span class="material-symbols-outlined text-base">stars</span>
          Completion
        </div>
      </div>
    </section>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Chart Area -->
      <div class="lg:col-span-2 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
        <div class="flex justify-between items-start mb-10">
          <div>
            <h3 class="text-xl font-bold">{{ t('analytics.weekActivity') }}</h3>
            <p class="text-sm text-text-sub-light">{{ t('analytics.subtitle') }}</p>
          </div>
          <div class="flex items-center gap-1 text-xs font-black text-primary bg-primary/10 px-4 py-2 rounded-full uppercase tracking-wider">
            <span class="material-symbols-outlined text-lg">timeline</span>
            On Track
          </div>
        </div>
        <div class="h-[300px]">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Motivation Box & Stats Detail -->
      <div class="flex flex-col gap-6">
        <div class="bg-gradient-to-br from-background-dark to-surface-dark dark:from-primary/20 dark:to-primary/5 p-7 rounded-3xl text-white relative overflow-hidden">
          <div class="absolute top-0 right-0 -mt-2 -mr-2 size-24 bg-primary rounded-full blur-3xl opacity-20"></div>
          <div class="flex items-start gap-4 relative z-10">
            <div class="bg-white/10 p-3 rounded-2xl backdrop-blur-sm shadow-inner ring-1 ring-white/20">
              <span class="material-symbols-outlined text-primary text-3xl">star</span>
            </div>
            <div>
              <h3 class="font-black text-xl text-primary">{{ t('analytics.tipTitle') }}</h3>
              <p class="text-sm text-gray-300 mt-2 leading-relaxed"> {{ t('analytics.tipDesc', { name: userName }) }}</p>
            </div>
          </div>
        </div>

        <div class="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex-1 flex flex-col">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold">{{ t('analytics.history') }}</h3>
            <button class="text-xs font-black text-primary hover:underline uppercase tracking-widest">{{ t('analytics.exportCsv') }}</button>
          </div>
          <div class="flex flex-col gap-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            <div 
              v-for="task in allTasks.slice(0, 10)" 
              :key="task.id"
              class="flex items-center gap-4 p-3 rounded-2xl hover:bg-background-light dark:hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 group cursor-pointer"
            >
              <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all shadow-sm">
                 <span class="material-symbols-outlined text-xl">assignment</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-bold truncate text-sm">{{ task.title }}</p>
                <p class="text-[10px] text-text-sub-light font-bold uppercase">{{ task.date }}</p>
              </div>
              <div v-if="task.completed" class="bg-primary/20 text-text-sub-light dark:text-primary text-[10px] font-black px-2 py-1 rounded-lg">
                DONE
              </div>
            </div>
            <div v-if="allTasks.length === 0" class="text-center py-10 opacity-30 italic text-sm">
                {{ t('analytics.table.empty') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e7eb;
  border-radius: 9999px;
}
:where(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #1f2937;
}
</style>
