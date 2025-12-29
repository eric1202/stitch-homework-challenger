<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { db } from './db';
import { liveQuery } from 'dexie';
import { useI18n } from 'vue-i18n';

// Components
import HomeView from './components/HomeView.vue';
import AnalyticsView from './components/AnalyticsView.vue';
import RewardStore from './components/RewardStore.vue';
import SettingsView from './components/SettingsView.vue';

const { t, locale } = useI18n();
const currentView = ref('home');
const totalPoints = ref(0);
const userName = ref('Hero');

// Live Query for Points
const pointsSubscription = liveQuery(async () => {
  try {
    const allTasks = await db.tasks.toArray();
    let spent = 0;
    
    if (db.redemptionLogs) {
      const spentPointsLogs = await db.redemptionLogs.toArray();
      spent = spentPointsLogs.reduce((sum, log) => sum + (log.spentPoints || 0), 0);
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
  totalPoints.value = value;
});

// Live Query for Name & Language
const settingsSubscription = liveQuery(() => db.settings.toArray())
  .subscribe(results => {
    const nameSetting = results.find(s => s.key === 'userName');
    if (nameSetting) userName.value = nameSetting.value;

    const langSetting = results.find(s => s.key === 'language');
    if (langSetting && langSetting.value !== locale.value) {
      locale.value = langSetting.value;
    }
  });

onUnmounted(() => {
  pointsSubscription.unsubscribe();
  settingsSubscription.unsubscribe();
});

const navItems = computed(() => [
  { name: 'home', icon: 'wb_sunny', label: t('app.nav.tasks') },
  { name: 'analytics', icon: 'monitoring', label: t('app.nav.analytics') },
  { name: 'rewards', icon: 'redeem', label: t('app.nav.rewards') },
  { name: 'settings', icon: 'settings', label: t('app.nav.settings') },
]);

// Theme handling (simplistic approach for now)
const isDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
onMounted(() => {
  if (isDark.value) document.documentElement.classList.add('dark');
});
</script>

<template>
  <div class="min-h-screen bg-background-light dark:bg-background-dark flex flex-col lg:flex-row font-display text-text-main-light dark:text-text-main-dark selection:bg-primary/20 transition-colors duration-200">
    
    <!-- Sidebar for Desktop -->
    <aside class="hidden lg:flex w-72 flex-col justify-between bg-surface-light dark:bg-surface-dark border-r border-gray-100 dark:border-gray-800 p-6 h-screen sticky top-0">
      <div class="flex flex-col gap-8">
        <div class="flex items-center gap-3">
          <div class="bg-gradient-to-br from-primary to-primary-dark rounded-xl size-10 shadow-lg shadow-primary/20 flex items-center justify-center text-black font-black text-xl">
            <span class="material-symbols-outlined fill-1">school</span>
          </div>
          <h1 class="text-xl font-black tracking-tight">{{ t('app.title') }} <span class="text-primary">{{ t('app.subtitle') }}</span></h1>
        </div>
        
        <nav class="flex flex-col gap-2">
          <button 
            v-for="item in navItems" 
            :key="item.name"
            @click="currentView = item.name"
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold group relative overflow-hidden text-left"
            :class="currentView === item.name 
              ? 'bg-primary/20 text-text-main-light dark:text-primary' 
              : 'text-text-sub-light dark:text-text-sub-dark hover:bg-gray-50 dark:hover:bg-gray-800'"
          >
            <span class="material-symbols-outlined transition-transform duration-300 group-hover:scale-110" :class="{ 'fill-1': currentView === item.name }">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <div v-if="currentView === item.name" class="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-l-full"></div>
          </button>
        </nav>
      </div>

      <!-- Sidebar Footer Profile -->
      <div class="flex flex-col gap-4">
        <div class="bg-gradient-to-br from-surface-light to-background-light dark:from-gray-800 dark:to-gray-900 border border-gray-100 dark:border-gray-700 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div class="absolute -right-6 -top-6 w-20 h-20 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all"></div>
          <p class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest mb-1">{{ t('app.totalPoints') }}</p>
          <div class="flex items-baseline gap-1">
            <p class="text-3xl font-black text-primary">{{ totalPoints }}</p>
            <span class="text-xs font-bold text-text-sub-light">pts</span>
          </div>
        </div>

        <div class="flex items-center gap-3 p-3 rounded-2xl bg-background-light/50 dark:bg-background-dark/50 border border-transparent hover:border-gray-100 dark:hover:border-gray-800 transition-all cursor-pointer">
          <div class="size-10 rounded-full bg-primary/30 flex items-center justify-center text-primary-dark font-black overflow-hidden ring-2 ring-white dark:ring-gray-800">
            <span class="material-symbols-outlined">person</span>
          </div>
          <div class="flex flex-col overflow-hidden">
            <p class="text-sm font-bold truncate">{{ userName }}</p>
            <p class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('app.offlineReady') }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile Header -->
    <header class="lg:hidden bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800 transition-colors">
      <div class="flex items-center gap-2">
         <div class="size-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg shadow-md flex items-center justify-center text-black">
           <span class="material-symbols-outlined text-xl fill-1">school</span>
         </div>
         <h1 class="text-lg font-black tracking-tight">{{ t('app.title') }}<span class="text-primary">{{ t('app.subtitle') }}</span></h1>
      </div>
      <div class="bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
        <span class="text-xl font-black text-primary">{{ totalPoints }}</span>
        <span class="text-[8px] font-black text-text-sub-light uppercase">pts</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto lg:h-screen relative w-full bg-background-light dark:bg-background-dark transition-colors duration-200">
      <div class="p-4 pb-28 lg:p-10 lg:pb-10 max-w-5xl mx-auto min-h-full">
        <Transition name="page" mode="out-in">
          <component 
            :key="currentView" 
            :is="currentView === 'home' ? HomeView : currentView === 'analytics' ? AnalyticsView : currentView === 'rewards' ? RewardStore : SettingsView" 
          />
        </Transition>
      </div>
    </main>

    <!-- Mobile Bottom Nav -->
    <nav class="lg:hidden fixed bottom-6 left-6 right-6 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-2 flex justify-between items-center z-50 border border-gray-100/50 dark:border-gray-800/50 transition-colors">
       <button 
          v-for="item in navItems" 
          :key="item.name"
          @click="currentView = item.name"
          class="flex items-center justify-center w-full py-3 rounded-2xl transition-all duration-300 relative"
          :class="currentView === item.name ? 'text-primary' : 'text-text-sub-light dark:text-text-sub-dark'"
        >
          <div class="absolute inset-x-2 inset-y-1 bg-primary/10 rounded-xl transition-all duration-300" :class="{ 'opacity-100 scale-100': currentView === item.name, 'opacity-0 scale-90': currentView !== item.name }"></div>
          <div class="flex flex-col items-center relative z-10">
            <span class="material-symbols-outlined text-2xl" :class="{ 'fill-1': currentView === item.name }">{{ item.icon }}</span>
            <span class="text-[10px] font-bold mt-0.5">{{ item.label }}</span>
          </div>
        </button>
    </nav>
  </div>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.99);
}

.page-leave-to {
  opacity: 0;
  transform: scale(0.99);
}
</style>
