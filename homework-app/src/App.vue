<script setup>
import { ref, computed } from 'vue';
import { db } from './db';
import { liveQuery } from 'dexie';
import { useI18n } from 'vue-i18n';

// Let's use a simple useEffect-like watcher or just a manual subscription.
// Actually, standard Vue 3 practice with Dexie:
import { onMounted, onUnmounted } from 'vue';

// Components
import HomeView from './components/HomeView.vue';
import AnalyticsView from './components/AnalyticsView.vue';
import SettingsView from './components/SettingsView.vue';

// Icons
import { HomeIcon, ChartBarIcon, Cog6ToothIcon } from '@heroicons/vue/24/solid';

const { t } = useI18n();
const currentView = ref('home');
const totalPoints = ref(0);

// Live Query for Points
// Simplest way without extra libs for observables
const pointsSubscription = liveQuery(async () => {
  const allTasks = await db.tasks.toArray();
  return allTasks
    .filter(task => task.completed)
    .reduce((sum, task) => sum + (Number(task.points) || 0), 0);
}).subscribe(value => {
  totalPoints.value = value;
});

onUnmounted(() => {
  pointsSubscription.unsubscribe();
});

const navItems = computed(() => [
  { name: 'home', icon: HomeIcon, label: t('app.nav.tasks') },
  { name: 'analytics', icon: ChartBarIcon, label: t('app.nav.analytics') },
  { name: 'settings', icon: Cog6ToothIcon, label: t('app.nav.settings') },
]);
</script>

<template>
  <div class="min-h-screen bg-light flex flex-col md:flex-row font-sans text-dark selection:bg-primary/20">
    <!-- Sidebar for Desktop -->
    <aside class="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 p-8 shadow-sm">
      <div class="mb-10 flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg flex items-center justify-center text-white font-black text-xl">H</div>
        <h1 class="text-2xl font-extrabold text-dark tracking-tight">{{ t('app.title') }}<span class="text-primary">{{ t('app.subtitle') }}</span></h1>
      </div>
      
      <div class="bg-gradient-to-br from-white to-gray-50 border border-gray-100 p-6 rounded-2xl mb-8 shadow-sm relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500"></div>
        <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 relative z-10">{{ t('app.totalPoints') }}</p>
        <p class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent relative z-10">{{ totalPoints }}</p>
      </div>

      <nav class="space-y-3">
        <button 
          v-for="item in navItems" 
          :key="item.name"
          @click="currentView = item.name"
          class="w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-bold group relative overflow-hidden"
          :class="currentView === item.name ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-gray-400 hover:bg-gray-50 hover:text-dark'"
        >
          <component :is="item.icon" class="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
          <span class="relative z-10">{{ item.label }}</span>
        </button>
      </nav>
      
      <div class="mt-auto pt-8 border-t border-gray-100/50">
        <p class="text-xs text-gray-300 font-medium text-center">{{ t('app.offlineReady') }}</p>
      </div>
    </aside>

    <!-- Mobile Header -->
    <header class="md:hidden bg-white/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-30 border-b border-gray-100">
      <div class="flex items-center gap-2">
         <div class="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg shadow-md flex items-center justify-center text-white font-black text-sm">H</div>
         <h1 class="text-lg font-extrabold text-dark">{{ t('app.title') }}<span class="text-primary">{{ t('app.subtitle') }}</span></h1>
      </div>
      <div class="bg-white border border-gray-100 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
        <span class="text-[10px] font-bold text-gray-400 uppercase">{{ t('app.points') }}</span>
        <span class="text-xl font-black text-primary">{{ totalPoints }}</span>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto overflow-x-hidden relative w-full">
      <div class="p-4 pb-32 md:p-10 md:pb-10 max-w-6xl mx-auto min-h-full">
        <Transition name="slide-fade" mode="out-in">
          <component :is="currentView === 'home' ? HomeView : currentView === 'analytics' ? AnalyticsView : SettingsView" />
        </Transition>
      </div>
    </main>

    <!-- Mobile Bottom Nav -->
    <nav class="md:hidden fixed bottom-6 left-6 right-6 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 flex justify-between items-center z-40 border border-gray-100/50 backdrop-blur-xl">
       <button 
          v-for="item in navItems" 
          :key="item.name"
          @click="currentView = item.name"
          class="flex items-center justify-center w-full py-3 rounded-2xl transition-all duration-300 relative"
          :class="currentView === item.name ? 'text-primary' : 'text-gray-300'"
        >
          <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 h-full bg-primary/10 rounded-xl transition-all duration-300" :class="{ 'opacity-100 scale-100': currentView === item.name, 'opacity-0 scale-90': currentView !== item.name }"></div>
          <div class="flex flex-col items-center relative z-10 transform transition-transform duration-300" :class="{ '-translate-y-0.5': currentView === item.name }">
            <component :is="item.icon" class="w-7 h-7" :class="{ 'drop-shadow-sm': currentView === item.name }" />
            <span class="text-[10px] font-bold mt-1 transition-all duration-300" :class="{ 'opacity-100 translate-y-0': currentView === item.name, 'opacity-0 translate-y-2': currentView !== item.name }">{{ item.label }}</span>
          </div>
        </button>
    </nav>
  </div>
</template>

<style>
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
