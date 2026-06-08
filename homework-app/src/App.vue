<script setup>
import { ref, computed, onMounted, onUnmounted, markRaw } from 'vue';
import { 
  Home, 
  CalendarSync, 
  Trophy, 
  BarChart3, 
  Settings, 
  Zap, 
  Palette,
  ChevronLeft, 
  ChevronRight,
  User,
  LayoutDashboard,
  Store,
  History,
  Menu,
  X,
  Gem
} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { db, liveQuery } from './db';

// Views
import HomeView from './components/HomeView.vue';
import DailyCheckinView from './components/DailyCheckinView.vue';
import RewardStore from './components/RewardStore.vue';
import AnalyticsView from './components/AnalyticsView.vue';
import MonopolyGame from './components/MonopolyGame.vue';
import SettingsView from './components/SettingsView.vue';
import GachaView from './components/gacha/GachaView.vue';

const { t, locale } = useI18n();

const activeView = ref('home');
const theme = ref('mainline'); // 'mainline' | 'legacy'
const totalPoints = ref(0);
const isMobileMenuOpen = ref(false);
const isLegacyTheme = computed(() => theme.value === 'legacy');

const navItems = [
  { id: 'home', icon: markRaw(Home), label: 'app.nav.home' },
  { id: 'checkin', icon: markRaw(CalendarSync), label: 'app.nav.checkin' },
  { id: 'monopoly', icon: markRaw(Trophy), label: 'app.nav.monopoly' },
  { id: 'gacha', icon: markRaw(Gem), label: 'app.nav.gacha' },
  { id: 'rewards', icon: markRaw(Store), label: 'app.nav.rewards' },
  { id: 'analytics', icon: markRaw(BarChart3), label: 'app.nav.analytics' },
  { id: 'settings', icon: markRaw(Settings), label: 'app.nav.settings' }
];

const currentViewComponent = computed(() => {
  switch (activeView.value) {
    case 'home': return HomeView;
    case 'checkin': return DailyCheckinView;
    case 'monopoly': return MonopolyGame;
    case 'gacha': return GachaView;
    case 'rewards': return RewardStore;
    case 'analytics': return AnalyticsView;
    case 'settings': return SettingsView;
    default: return HomeView;
  }
});

// Load settings
onMounted(async () => {
  const themeSetting = await db.settings.get('theme');
  theme.value = themeSetting?.value || 'mainline';
  applyTheme();

  const langSetting = await db.settings.get('language');
  if (langSetting) locale.value = langSetting.value;
});

const applyTheme = () => {
  document.documentElement.classList.remove('dark', 'legacy');
  if (theme.value === 'legacy') document.documentElement.classList.add('legacy');
};

const toggleTheme = async () => {
  theme.value = theme.value === 'mainline' ? 'legacy' : 'mainline';
  await db.settings.put({ key: 'theme', value: theme.value });
  applyTheme();
};

const pointsSubscription = liveQuery(() => db.tasks.toArray())
  .subscribe(tasks => {
    totalPoints.value = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.points || 0), 0);
  });

onUnmounted(() => {
  pointsSubscription.unsubscribe();
});
</script>

<template>
  <div
    class="min-h-screen bg-background-main text-text-main transition-colors duration-200"
    :class="{ 'legacy-shell': isLegacyTheme }"
  >
    <!-- Desktop Sidebar -->
    <aside 
      class="hidden md:flex flex-col w-64 fixed h-screen z-50 transition-all duration-300"
      :class="isLegacyTheme
        ? 'bg-white/82 backdrop-blur-xl border-r border-primary/10 shadow-[18px_0_40px_rgba(47,143,131,0.08)]'
        : 'bg-surface-main border-r-2 border-primary'"
    >
      <!-- Logo -->
      <div class="p-8 mb-4">
        <div class="flex items-center gap-3 group cursor-pointer" @click="activeView = 'home'">
          <div
            class="size-12 bg-primary text-background-main flex items-center justify-center transition-all"
            :class="isLegacyTheme
              ? 'rounded-[18px] shadow-[0_14px_28px_rgba(47,143,131,0.22)] group-hover:scale-[1.03]'
              : 'rounded-xl shadow-offset-green group-hover:rotate-12'"
          >
            <Zap class="size-7 fill-background-main" />
          </div>
          <span class="text-3xl font-black tracking-tighter text-primary">Homework</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 space-y-2">
        <button 
          v-for="item in navItems" 
          :key="item.id"
          @click="activeView = item.id"
          class="w-full flex items-center gap-4 px-4 py-3 font-black text-sm uppercase tracking-widest transition-all"
          :class="[
            isLegacyTheme ? 'legacy-nav-pill border' : 'rounded-xl border-2',
            activeView === item.id
              ? (isLegacyTheme
                  ? 'is-active text-primary'
                  : 'bg-primary text-background-main border-primary shadow-offset-green')
              : (isLegacyTheme
                  ? 'text-text-sub border-transparent'
                  : 'text-text-sub border-transparent hover:bg-primary/5 hover:text-primary')
          ]"
        >
          <component :is="item.icon" class="size-5" />
          {{ t(item.label) }}
        </button>
      </nav>

      <!-- Bottom Actions -->
      <div
        class="p-6 space-y-4"
        :class="isLegacyTheme ? 'border-t border-primary/10' : 'border-t-2 border-primary/5'"
      >
        <div class="flex items-center justify-between px-2">
          <span class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ theme === 'legacy' ? 'Legacy' : 'Mainline' }}</span>
          <button
            @click="toggleTheme"
            class="size-10 flex items-center justify-center transition-all active:scale-95"
            :class="isLegacyTheme
              ? 'legacy-icon-bubble border border-primary/10'
              : 'border-2 border-primary rounded-xl bg-surface-main shadow-offset-dark hover:shadow-none'"
          >
            <Palette class="size-5" />
          </button>
        </div>

        <div
          class="p-4 flex items-center gap-3"
          :class="isLegacyTheme ? 'legacy-soft-panel rounded-[22px]' : 'bg-primary/5 rounded-2xl'"
        >
          <div
            class="size-8 text-primary flex items-center justify-center shadow-sm"
            :class="isLegacyTheme
              ? 'legacy-icon-bubble'
              : 'bg-accent-amber rounded-lg'"
          >
            <Zap class="size-4 fill-primary" />
          </div>
          <div>
            <div class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('app.totalPoints') }}</div>
            <div class="text-sm font-black text-primary">{{ totalPoints }}</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile Header -->
    <header
      class="md:hidden fixed top-0 inset-x-0 h-12 flex items-center justify-between px-4 z-[60]"
      :class="isLegacyTheme
        ? 'bg-white/88 backdrop-blur-xl border-b border-primary/10 shadow-sm'
        : 'bg-surface-main border-b-2 border-primary'"
    >
      <div class="flex items-center gap-1.5">
        <div
          class="size-7 bg-primary text-background-main flex items-center justify-center"
          :class="isLegacyTheme
            ? 'rounded-[14px] shadow-[0_10px_20px_rgba(47,143,131,0.22)]'
            : 'rounded-lg shadow-offset-green'"
        >
          <Zap class="size-4 fill-background-main" />
        </div>
        <span class="text-base font-black tracking-tighter text-primary uppercase">Homework</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          @click="toggleTheme"
          class="p-1.5 text-primary transition-all"
          :class="isLegacyTheme ? 'legacy-icon-bubble px-2.5 py-1.5' : ''"
        >
          <Palette class="size-5" />
        </button>
      </div>
    </header>

    <!-- Mobile Bottom Nav -->
    <nav
      class="md:hidden fixed bottom-0 inset-x-0 h-14 flex items-center justify-around px-1 z-[60]"
      :class="isLegacyTheme
        ? 'bg-white/92 backdrop-blur-xl border-t border-primary/10 shadow-[0_-8px_30px_rgba(47,143,131,0.08)]'
        : 'bg-surface-main border-t-2 border-primary'"
      style="padding-bottom: env(safe-area-inset-bottom)"
    >
      <button 
        v-for="item in navItems" 
        :key="item.id"
        @click="activeView = item.id"
        class="flex flex-col items-center gap-0.5 p-1.5 transition-all"
        :class="activeView === item.id
          ? (isLegacyTheme ? 'text-primary bg-primary/8 px-3 py-1.5 rounded-full' : 'text-primary')
          : 'text-text-sub opacity-50'"
      >
        <component :is="item.icon" class="size-5" :class="{ 'fill-primary/10': activeView === item.id }" />
        <span class="text-[7px] font-black uppercase tracking-wider">{{ t(item.label) }}</span>
      </button>
    </nav>

    <!-- Main Content -->
    <main 
      class="flex-1 md:ml-64 px-3 py-2 md:p-12 transition-all duration-300 min-h-screen"
      :class="{ 'pb-20 pt-14 md:pb-12 md:pt-12': true }"
    >
      <div class="max-w-6xl mx-auto">
        <Transition name="page" mode="out-in">
          <component :is="currentViewComponent" :key="activeView" />
        </Transition>
      </div>
    </main>
  </div>
</template>

<style>
.page-enter-active, .page-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
