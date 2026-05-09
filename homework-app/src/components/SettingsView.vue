<script setup>
import { 
  User, 
  Database, 
  Trash2, 
  X, 
  ChevronDown, 
  Edit2, 
  CloudRain, 
  CloudOff, 
  TriangleAlert,
  Edit3,
  Monitor,
  Moon,
  Sun
} from 'lucide-vue-next';
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { db, liveQuery } from '../db';

const { t, locale } = useI18n();

const userName = ref('Hero');
const totalPoints = ref(0);
const isEditingName = ref(false);
const editNameValue = ref('');

const nameSubscription = liveQuery(() => db.settings.get('userName'))
  .subscribe(result => {
    userName.value = result?.value || 'Hero';
  });

const pointsSubscription = liveQuery(() => db.tasks.toArray())
  .subscribe(tasks => {
    totalPoints.value = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.points || 0), 0);
  });

onUnmounted(() => {
  nameSubscription.unsubscribe();
  pointsSubscription.unsubscribe();
});

const changeLanguage = (newLocale) => {
  locale.value = newLocale;
  db.settings.put({ id: 'language', value: newLocale });
};

const saveName = async () => {
  if (editNameValue.value.trim()) {
    await db.settings.put({ key: 'userName', value: editNameValue.value.trim() });
    isEditingName.value = false;
  }
};

const exportData = async () => {
  const tasks = await db.tasks.toArray();
  const templates = await db.templates.toArray();
  const settings = await db.settings.toArray();
  const data = JSON.stringify({ tasks, templates, settings }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stitch-backup-${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};

const triggerImport = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      if (data.tasks) await db.tasks.bulkPut(data.tasks);
      if (data.templates) await db.templates.bulkPut(data.templates);
      if (data.settings) await db.settings.bulkPut(data.settings);
      alert('Data imported successfully!');
      window.location.reload();
    } catch (err) {
      alert('Invalid backup file');
    }
  };
  input.click();
};

const clearAllData = async () => {
  if (confirm(t('settings.clearDataConfirm'))) {
    await db.tasks.clear();
    await db.templates.clear();
    await db.settings.clear();
    window.location.reload();
  }
};
</script>

<template>
  <div class="flex flex-col gap-6 md:gap-12 pb-20 max-w-5xl mx-auto">
    <!-- Header -->
    <header class="flex flex-col gap-4">
      <span class="badge-mainline w-fit">Configuration</span>
      <h1 class="text-3xl md:text-7xl font-black text-primary leading-[0.9] -ml-0.5 md:-ml-1">
        {{ t('settings.title') }}
      </h1>
      <p class="text-sm md:text-lg font-medium text-text-sub max-w-xl leading-relaxed">
        {{ t('settings.subtitle') }}
      </p>
    </header>

    <div class="grid grid-cols-1 gap-8">
      
      <!-- User Account Section -->
      <section class="card-mainline !p-4 md:!p-8 flex flex-col md:flex-row items-center gap-4 md:gap-8 bg-accent-green/5">
        <div class="size-16 md:size-24 border-4 border-primary rounded-full flex items-center justify-center bg-surface-main shadow-offset-dark shrink-0">
           <User class="size-8 md:size-12 text-primary" />
        </div>
        <div class="flex flex-col gap-2 flex-1 text-center md:text-left">
          <h2 class="text-2xl md:text-4xl font-black text-primary">{{ userName }}</h2>
          <div class="flex items-center gap-3 justify-center md:justify-start">
            <span class="badge-mainline !bg-accent-green !text-background-main">Explorer</span>
            <span class="text-xs font-black text-text-sub uppercase tracking-widest">{{ t('app.nav.points') }}: {{ totalPoints }}</span>
          </div>
          <button 
            @click="isEditingName = true; editNameValue = userName"
            class="mt-2 text-primary text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1 mx-auto md:mx-0"
           >
             <Edit2 class="size-3"/>
             {{ t('settings.dataManagement.editProfile') }}
           </button>
        </div>
        
        <div class="flex flex-col gap-2 min-w-[160px]">
           <label class="text-[10px] font-black uppercase text-text-sub tracking-widest">{{ t('settings.language') }}</label>
           <div class="relative">
             <select 
               :value="locale"
               @change="e => changeLanguage(e.target.value)"
               class="input-mainline !py-2 !px-4 text-sm appearance-none"
             >
               <option value="en">English</option>
               <option value="zh">中文</option>
             </select>
             <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none opacity-50" />
           </div>
        </div>
      </section>

      <!-- Data Management -->
      <section class="flex flex-col gap-6">
        <div class="flex items-center gap-4">
           <h3 class="text-2xl font-black text-primary">{{ t('settings.dataManagement.title') }}</h3>
           <span class="badge-mainline">Tools</span>
        </div>
        <p class="text-text-sub font-medium mb-4 leading-relaxed max-w-2xl">{{ t('settings.dataManagement.desc') }}</p>
        
        <div class="grid md:grid-cols-2 gap-6">
          <button 
            @click="exportData"
            class="btn-mainline-secondary !p-4 md:!p-8 flex items-center gap-4 md:gap-6 group hover:!bg-primary hover:!text-background-main"
          >
            <div class="size-10 md:size-14 border-2 border-primary rounded-xl flex items-center justify-center bg-surface-main shadow-offset-dark group-hover:shadow-none group-hover:rotate-12 transition-all">
              <Database class="size-5 md:size-7 text-primary" />
            </div>
            <div class="text-left">
              <h4 class="text-base md:text-xl font-black">{{ t('settings.exportData') }}</h4>
              <p class="text-xs font-bold text-text-sub">{{ t('settings.exportDataDesc') }}</p>
            </div>
          </button>

          <button 
            @click="triggerImport"
            class="btn-mainline-secondary !p-4 md:!p-8 flex items-center gap-4 md:gap-6 group hover:!bg-primary hover:!text-background-main"
          >
            <div class="size-10 md:size-14 border-2 border-primary rounded-xl flex items-center justify-center bg-surface-main shadow-offset-dark group-hover:shadow-none group-hover:rotate-12 transition-all">
              <Edit3 class="size-5 md:size-7 text-primary" />
            </div>
            <div class="text-left">
              <h4 class="text-base md:text-xl font-black">{{ t('settings.importData') }}</h4>
              <p class="text-xs font-bold text-text-sub">{{ t('settings.importDataDesc') }}</p>
            </div>
          </button>
        </div>
      </section>

      <!-- Danger Zone -->
      <section class="card-mainline !p-4 md:!p-8 !bg-accent-red/10 !border-accent-red/20 !shadow-none">
        <div class="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
          <div class="size-10 bg-accent-red text-background-main rounded-lg flex items-center justify-center">
            <Trash2 class="size-6" />
          </div>
          <h3 class="text-xl md:text-2xl font-black text-accent-red">
            {{ t('settings.dangerZone') }}
          </h3>
        </div>
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex flex-col gap-2">
            <p class="font-black text-primary">{{ t('settings.clearData') }}</p>
            <p class="text-xs font-bold text-text-sub max-w-md">{{ t('settings.clearDataDesc') }}</p>
          </div>
          <button 
            @click="clearAllData"
            class="btn-mainline !bg-accent-red !text-background-main !border-accent-red hover:!bg-accent-red/90 !shadow-none"
          >
            {{ t('settings.clearDataBtn') }}
          </button>
        </div>
      </section>

    </div>

    <!-- Edit Name Modal -->
    <Transition name="fade">
      <div v-if="isEditingName" class="fixed inset-0 z-[100] flex items-center justify-center bg-background-main/20 backdrop-blur-[2px] p-4" @click="isEditingName = false">
        <div class="card-mainline max-w-md w-full animate-rise flex flex-col gap-8 !p-0 overflow-hidden shadow-[20px_20px_0_var(--border)]" @click.stop>
          <header class="flex justify-between items-center border-b-2 border-primary p-8">
            <h3 class="text-xl md:text-3xl font-black">{{ t('settings.dataManagement.editProfile') }}</h3>
            <button @click="isEditingName = false" class="hover:rotate-90 transition-transform">
              <X class="size-6 md:size-8" />
            </button>
          </header>

          <div class="p-8 flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('settings.dataManagement.userName') }}</label>
              <input 
                v-model="editNameValue" 
                @keyup.enter="saveName"
                type="text" 
                class="input-mainline text-2xl"
                autofocus
              >
            </div>

            <div class="flex gap-4">
              <button @click="isEditingName = false" class="btn-mainline-secondary flex-1 !py-4 uppercase tracking-widest text-xs !shadow-none">{{ t('common.cancel') }}</button>
              <button @click="saveName" class="btn-mainline flex-1 !py-4 uppercase tracking-widest text-xs">{{ t('common.save') }}</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
</style>
