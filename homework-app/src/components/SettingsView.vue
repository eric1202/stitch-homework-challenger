<script setup>
import { ref } from 'vue';
import { db } from '../db';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const fileInput = ref(null);

const exportData = async () => {
  try {
    const tasks = await db.tasks.toArray();
    const backup = {
      version: 1,
      timestamp: new Date().toISOString(),
      data: { tasks }
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${t('settings.dataManagement.backupFileName')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert(t('settings.alerts.exportFail') + error.message);
  }
};

const triggerImport = () => {
  fileInput.value.click();
};

const importData = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm(t('settings.alerts.importConfirm'))) {
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (backup.data && backup.data.tasks) {
        await db.tasks.bulkPut(backup.data.tasks);
        alert(t('settings.alerts.importSuccess', { count: backup.data.tasks.length }));
      } else {
        throw new Error(t('settings.alerts.invalidFormat'));
      }
    } catch (error) {
      alert(t('settings.alerts.importFail') + error.message);
    }
    event.target.value = '';
  };
  reader.readAsText(file);
};

const clearAllData = async () => {
  if (confirm(t('settings.alerts.deleteConfirm1'))) {
    if (confirm(t('settings.alerts.deleteConfirm2'))) {
      await db.tasks.clear();
      alert(t('settings.alerts.resetSuccess'));
    }
  }
};
</script>

<template>
  <div class="flex flex-col gap-8 pb-10">
    <!-- Header -->
    <div class="flex flex-col gap-2">
      <h1 class="text-4xl md:text-5xl font-black tracking-tight leading-tight">{{ t('settings.title') }}</h1>
      <p class="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{{ t('settings.subtitle') }} ⚙️</p>
    </div>

    <div class="grid gap-8">
      
      <!-- User Account Section (Visual Only) -->
      <section class="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div class="size-24 rounded-full bg-primary/20 flex items-center justify-center text-primary-dark ring-4 ring-primary/10 overflow-hidden shrink-0">
           <span class="material-symbols-outlined text-5xl">person</span>
        </div>
        <div class="flex-1 text-center md:text-left">
           <h3 class="text-2xl font-black">Hero Sam</h3>
           <p class="text-text-sub-light font-bold">Level 5 Math Scholar • 1,250 pts</p>
           <button class="mt-4 text-primary text-xs font-black uppercase tracking-widest hover:underline">Edit Profile</button>
        </div>
        <div class="bg-background-light dark:bg-background-dark p-4 rounded-2xl flex flex-col items-center">
           <span class="text-[10px] font-black uppercase text-text-sub-light opacity-60">Language</span>
           <div class="flex gap-2 mt-1">
             <button class="px-3 py-1 bg-primary text-black font-bold rounded-lg text-xs" :class="{ 'opacity-100': $i18n.locale === 'zh', 'opacity-30': $i18n.locale !== 'zh' }" @click="$i18n.locale = 'zh'">ZH</button>
             <button class="px-3 py-1 bg-primary text-black font-bold rounded-lg text-xs" :class="{ 'opacity-100': $i18n.locale === 'en', 'opacity-30': $i18n.locale !== 'en' }" @click="$i18n.locale = 'en'">EN</button>
           </div>
        </div>
      </section>

      <!-- Data Management -->
      <section class="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
           <span class="material-symbols-outlined text-primary text-3xl">database</span>
           <h3 class="text-xl font-bold">{{ t('settings.dataManagement.title') }}</h3>
        </div>
        <p class="text-text-sub-light dark:text-text-sub-dark font-medium mb-8 leading-relaxed">{{ t('settings.dataManagement.desc') }}</p>
        
        <div class="grid md:grid-cols-2 gap-5">
          <button 
            @click="exportData"
            class="group flex items-center gap-4 p-6 rounded-2xl bg-primary/10 dark:bg-primary/5 hover:bg-primary transition-all duration-300 border-2 border-transparent hover:border-primary-dark shadow-sm"
          >
            <div class="size-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-primary group-hover:bg-black group-hover:text-primary transition-all duration-300">
              <span class="material-symbols-outlined text-3xl">cloud_download</span>
            </div>
            <div class="text-left">
              <div class="text-lg font-black text-text-main-light dark:text-white group-hover:text-black transition-colors">{{ t('settings.dataManagement.backupBtn') }}</div>
              <div class="text-[10px] font-black uppercase text-text-sub-light group-hover:text-black/60 transition-colors">{{ t('settings.dataManagement.backupSub') }}</div>
            </div>
          </button>

          <button 
            @click="triggerImport"
            class="group flex items-center gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-black transition-all duration-300 border-2 border-transparent hover:border-primary shadow-sm"
          >
            <div class="size-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-primary group-hover:text-black transition-all duration-300">
              <span class="material-symbols-outlined text-3xl">cloud_upload</span>
            </div>
            <div class="text-left">
              <div class="text-lg font-black text-text-main-light dark:text-white group-hover:text-primary transition-colors">{{ t('settings.dataManagement.restoreBtn') }}</div>
              <div class="text-[10px] font-black uppercase text-text-sub-light group-hover:text-primary/60 transition-colors">{{ t('settings.dataManagement.restoreSub') }}</div>
            </div>
          </button>
          
          <input 
            type="file" 
            ref="fileInput" 
            class="hidden" 
            accept=".json"
            @change="importData"
          >
        </div>
      </section>

      <!-- Danger Zone -->
      <section class="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30">
        <h3 class="text-xl font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-3">
          <span class="material-symbols-outlined text-3xl">warning</span>
          {{ t('settings.danger.title') }}
        </h3>
        <p class="text-text-sub-light dark:text-red-400/70 font-medium mb-8">{{ t('settings.danger.desc') }}</p>
        
        <button 
          @click="clearAllData"
          class="w-full md:w-fit px-8 py-4 rounded-2xl bg-white dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-black hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm active:scale-95 uppercase tracking-widest text-xs"
        >
          {{ t('settings.danger.resetBtn') }}
        </button>
      </section>

    </div>
  </div>
</template>
