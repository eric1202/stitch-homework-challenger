<script setup>
import { BadgeCheck, ClipboardList, Download, Flame, LineChart, PieChart, Star, Stars, TrendingUp, Zap, Target, Calendar, CheckSquare } from 'lucide-vue-next';

import { ref, computed, onUnmounted } from 'vue';
import { db, liveQuery } from '../db';
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
let tasksSub = null;

const updateTasksSub = (name) => {
  if (tasksSub) tasksSub.unsubscribe();
  tasksSub = liveQuery(() => 
    db.tasks.where('user_name').equals(name).toArray()
  ).subscribe(tasks => {
    allTasks.value = tasks.sort((a, b) => b.date.localeCompare(a.date));
  });
};

const nameSubscription = liveQuery(() => db.settings.get('userName'))
  .subscribe(result => {
    const newName = result?.value || 'Hero';
    if (newName !== userName.value || !tasksSub) {
      userName.value = newName;
      updateTasksSub(newName);
    }
  });

onUnmounted(() => {
  if (tasksSub) tasksSub.unsubscribe();
  nameSubscription.unsubscribe();
});

// --- Stats Calculations ---
const stats = computed(() => {
  const completedTasks = allTasks.value.filter(t => t.completed);
  const completionRate = allTasks.value.length > 0 
    ? Math.round((completedTasks.length / allTasks.value.length) * 100) 
    : 0;

  // Streak calc
  const dateGroups = allTasks.value.reduce((acc, task) => {
    if (!acc[task.date]) acc[task.date] = [];
    acc[task.date].push(task);
    return acc;
  }, {});
  const dates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
  
  let currentStreak = 0;
  for (let i = 0; i < dates.length; i++) {
    if (dateGroups[dates[i]].every(t => t.completed)) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    completionRate,
    totalPoints: completedTasks.reduce((sum, t) => sum + (t.points || 0), 0),
    currentStreak,
    totalTasks: allTasks.value.length
  };
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
      backgroundColor: '#00a878',
      hoverBackgroundColor: '#00d696',
      borderRadius: 8,
      data: data,
      barPercentage: 0.6,
    }]
  };
});

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { 
      backgroundColor: '#151511', 
      titleFont: { family: 'Aptos', weight: '900' },
      bodyFont: { family: 'Aptos' },
      padding: 12,
      displayColors: false,
      cornerRadius: 4
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { display: true, color: 'rgba(0,0,0,0.05)', drawBorder: false },
      ticks: { precision: 0, font: { family: 'SFMono-Regular' } }
    },
    x: {
      grid: { display: false },
      ticks: { font: { family: 'SFMono-Regular', weight: 'bold' } }
    }
  }
}));

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
  <div class="flex flex-col gap-12 pb-20">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-8">
      <div class="flex flex-col gap-4">
        <span class="badge-mainline w-fit">Insights</span>
        <h1 class="text-5xl md:text-7xl font-black text-primary leading-[0.9] -ml-1">
          {{ t('analytics.title') }}
        </h1>
        <p class="text-lg font-medium text-text-sub max-w-xl leading-relaxed">
          {{ t('analytics.subtitle') }}
        </p>
      </div>
      
      <button 
        @click="exportData"
        class="btn-mainline flex items-center gap-2 group"
      >
        <Download class="transition-transform group-hover:translate-y-0.5"/>
        <span>{{ t('analytics.exportCsv') }}</span>
      </button>
    </header>

    <!-- Hero Stats Row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="card-mainline !p-8 !bg-accent-green !text-background-main !shadow-none rotate-1">
        <div class="flex items-center justify-between mb-4">
          <Target class="size-8 opacity-40" />
          <span class="text-[10px] font-black uppercase tracking-widest opacity-60">{{ t('home.progress') }}</span>
        </div>
        <p class="text-5xl font-black leading-none">{{ stats.completionRate }}%</p>
        <p class="mt-4 text-xs font-bold opacity-60">{{ t('analytics.statCompletedTasks') }}</p>
      </div>

      <div class="card-mainline !p-8 !bg-accent-amber !text-primary !shadow-none -rotate-1">
        <div class="flex items-center justify-between mb-4">
          <Zap class="size-8 opacity-40" />
          <span class="text-[10px] font-black uppercase tracking-widest opacity-60">{{ t('app.points') }}</span>
        </div>
        <p class="text-5xl font-black leading-none">{{ stats.totalPoints }}</p>
        <p class="mt-4 text-xs font-bold opacity-60">{{ t('analytics.statTotalPoints') }}</p>
      </div>

      <div class="card-mainline !p-8 !bg-accent-cyan !text-background-main !shadow-none rotate-1">
        <div class="flex items-center justify-between mb-4">
          <Calendar class="size-8 opacity-40" />
          <span class="text-[10px] font-black uppercase tracking-widest opacity-60">{{ t('common.streak') }}</span>
        </div>
        <p class="text-5xl font-black leading-none">{{ stats.currentStreak }}</p>
        <p class="mt-4 text-xs font-bold opacity-60">{{ t('analytics.statCurrentStreak') }}</p>
      </div>

      <div class="card-mainline !p-8 !bg-primary !text-background-main !shadow-none -rotate-1">
        <div class="flex items-center justify-between mb-4">
          <CheckSquare class="size-8 opacity-40" />
          <span class="text-[10px] font-black uppercase tracking-widest opacity-60">{{ t('common.total') }}</span>
        </div>
        <p class="text-5xl font-black leading-none">{{ stats.totalTasks }}</p>
        <p class="mt-4 text-xs font-bold opacity-60">{{ t('analytics.statTotalTasks') }}</p>
      </div>
    </div>

    <!-- Chart Grid -->
    <div class="card-mainline !p-10">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h3 class="text-3xl font-black text-primary">{{ t('analytics.weekActivity') }}</h3>
          <p class="text-text-sub font-bold">{{ t('analytics.subtitle') }}</p>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="size-3 bg-accent-green rounded-full"></div>
            <span class="text-xs font-black uppercase tracking-widest text-text-sub">{{ t('analytics.status.completed') }}</span>
          </div>
        </div>
      </div>
      <div class="h-[400px]">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <!-- Recent Activity Table -->
    <div class="flex flex-col gap-6">
      <div class="flex items-center gap-4">
        <span class="badge-mainline !bg-primary !text-background-main">History</span>
        <h3 class="text-3xl font-black">{{ t('analytics.recentTasks') }}</h3>
      </div>
      
      <div class="card-mainline !p-0 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-primary text-background-main border-b-2 border-primary">
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{{ t('analytics.table.date') }}</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{{ t('analytics.table.task') }}</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{{ t('analytics.table.subject') }}</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{{ t('analytics.table.points') }}</th>
                <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">{{ t('analytics.table.status') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y-2 divide-primary/5">
              <tr 
                v-for="task in allTasks.slice(0, 15)" 
                :key="task.id"
                class="hover:bg-primary/5 transition-colors"
              >
                <td class="px-6 py-4 text-sm font-black text-text-sub">{{ task.date }}</td>
                <td class="px-6 py-4 text-sm font-black text-primary">{{ task.title }}</td>
                <td class="px-6 py-4">
                  <span class="badge-mainline !bg-accent-green/10 !text-accent-green !shadow-none">{{ t(`home.subjects.${task.subject}`) }}</span>
                </td>
                <td class="px-6 py-4 text-sm font-black text-primary">+{{ task.points }}</td>
                <td class="px-6 py-4 text-right">
                  <span 
                    class="badge-mainline"
                    :class="task.completed ? '!bg-accent-green !text-background-main' : '!bg-accent-amber !text-primary'"
                  >
                    {{ task.completed ? t('analytics.status.completed') : t('analytics.status.pending') }}
                  </span>
                </td>
              </tr>
              <tr v-if="allTasks.length === 0">
                <td colspan="5" class="px-6 py-12 text-center text-text-sub font-black italic">{{ t('analytics.emptyTasks') }}</td>
              </tr>
            </tbody>
          </table>
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
  background-color: var(--primary);
  opacity: 0.2;
  border-radius: 9999px;
}
</style>
