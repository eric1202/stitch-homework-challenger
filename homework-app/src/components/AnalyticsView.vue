<script setup>
import { ref, computed, onMounted } from 'vue';
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
  LinearScale
} from 'chart.js';
import { Bar } from 'vue-chartjs';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, subWeeks, isSameDay, parseISO } from 'date-fns';
import { ArrowDownTrayIcon, CalendarIcon } from '@heroicons/vue/24/solid';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const { t } = useI18n();

// --- Data Fetching ---
const allTasks = ref([]);
const subscription = liveQuery(() => db.tasks.toArray()).subscribe(tasks => {
  allTasks.value = tasks.sort((a, b) => b.date.localeCompare(a.date));
});

// --- Weekly Stats (Chart) ---
const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
const weekDays = eachDayOfInterval({
  start: currentWeekStart,
  end: endOfWeek(new Date(), { weekStartsOn: 1 })
});

const chartData = computed(() => {
  const data = weekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const tasksForDay = allTasks.value.filter(t => t.date === dayStr && t.completed);
    return tasksForDay.length;
  });

  return {
    labels: weekDays.map(d => format(d, 'EEE')),
    datasets: [{
      label: 'Completed Tasks',
      backgroundColor: '#FF6B6B',
      borderRadius: 6,
      data: data
    }]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { 
      backgroundColor: '#292F36', 
      padding: 12, 
      cornerRadius: 8,
      displayColors: false 
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { display: true, borderDash: [4, 4], color: '#f3f4f6' },
      ticks: { precision: 0, font: { family: 'Nunito' } },
      border: { display: false }
    },
    x: {
      grid: { display: false },
      ticks: { font: { family: 'Nunito', weight: 'bold' } },
      border: { display: false }
    }
  }
};

// --- History Table & Export ---
const exportData = () => {
  const headers = [
    t('analytics.table.date'), 
    t('analytics.table.task'), 
    t('analytics.table.subject'), 
    t('analytics.table.points'), 
    t('analytics.table.status')
  ];
  const rows = allTasks.value.map(t => [
    t.date,
    `"${t.title}"`,
    t.subject,
    t.points,
    t.completed ? t('analytics.status.completed') : t('analytics.status.pending')
  ]);
  
  const csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${t('analytics.exportFileName')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-end justify-between">
      <div>
        <h2 class="text-3xl font-black text-dark tracking-tight">{{ t('analytics.title') }}</h2>
        <p class="text-gray-400 font-bold mt-1">{{ t('analytics.subtitle') }}</p>
      </div>
       <button 
        @click="exportData"
        class="bg-white border border-gray-200 text-dark px-4 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
       >
         <ArrowDownTrayIcon class="w-4 h-4" />
         {{ t('analytics.exportCsv') }}
       </button>
    </div>

    <!-- Weekly Chart -->
    <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-80 relative overflow-hidden">
        <h3 class="text-lg font-bold text-dark mb-4 flex items-center gap-2">
            <CalendarIcon class="w-5 h-5 text-gray-400" />
            {{ t('analytics.weekActivity') }}
        </h3>
        <div class="h-60">
             <Bar :data="chartData" :options="chartOptions" />
        </div>
    </div>

    <!-- History List -->
    <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
       <div class="p-6 border-b border-gray-100">
         <h3 class="text-lg font-bold text-dark">{{ t('analytics.history') }}</h3>
       </div>
       <div class="overflow-x-auto">
         <table class="w-full text-left">
           <thead>
             <tr class="bg-gray-50/50 text-gray-400 text-xs uppercase tracking-wider">
               <th class="p-4 font-bold">{{ t('analytics.table.date') }}</th>
               <th class="p-4 font-bold">{{ t('analytics.table.task') }}</th>
               <th class="p-4 font-bold">{{ t('analytics.table.subject') }}</th>
               <th class="p-4 font-bold text-right">{{ t('analytics.table.points') }}</th>
               <th class="p-4 font-bold text-center">{{ t('analytics.table.status') }}</th>
             </tr>
           </thead>
           <tbody class="divide-y divide-gray-100">
             <tr v-for="task in allTasks" :key="task.id" class="hover:bg-gray-50/50 transition-colors">
               <td class="p-4 font-bold text-gray-500 text-sm whitespace-nowrap">{{ task.date }}</td>
               <td class="p-4 font-bold text-dark text-sm">{{ task.title }}</td>
               <td class="p-4">
                 <span class="text-[10px] uppercase font-black px-2 py-0.5 rounded-md border text-gray-500 bg-gray-50 border-gray-200">
                   {{ t(`home.subjects.${task.subject}`) }}
                 </span>
               </td>
               <td class="p-4 text-right font-black text-accent text-sm">+{{ task.points }}</td>
               <td class="p-4 text-center">
                 <span 
                  class="w-2 h-2 rounded-full inline-block"
                  :class="task.completed ? 'bg-secondary' : 'bg-gray-200'"
                 ></span>
               </td>
             </tr>
             <tr v-if="allTasks.length === 0">
                 <td colspan="5" class="p-8 text-center text-gray-400 text-sm italic">{{ t('analytics.table.empty') }}</td>
             </tr>
           </tbody>
         </table>
       </div>
    </div>
  </div>
</template>
