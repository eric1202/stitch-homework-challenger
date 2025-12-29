<script setup>
import { ref, onMounted } from 'vue';
import { db } from '../db';
import { liveQuery } from 'dexie';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();
const fileInput = ref(null);
const isEditingName = ref(false);
const editNameValue = ref('');

// Change language and persist
const changeLanguage = async (lang) => {
  console.log('Changing language to:', lang);
  locale.value = lang;
  try {
    await db.settings.put({ key: 'language', value: lang });
    console.log('Language saved to DB');
  } catch (err) {
    console.error('Failed to save language:', err);
  }
};

// Live reactive username
const userName = ref('Hero');
const settingsSubscription = liveQuery(() => db.settings.toArray())
    .subscribe(results => {
      const nameSetting = results.find(s => s.key === 'userName');
      if (nameSetting) userName.value = nameSetting.value;
      
      const langSetting = results.find(s => s.key === 'language');
      if (langSetting && langSetting.value !== locale.value) {
        locale.value = langSetting.value;
      }
    });

onMounted(() => {
  editNameValue.value = userName.value;
});

const saveName = async () => {
  if (!editNameValue.value.trim()) return;
  await db.settings.put({ key: 'userName', value: editNameValue.value.trim() });
  isEditingName.value = false;
};

const exportData = async () => {
  try {
    const tasks = await db.tasks.toArray();
    const settings = await db.settings.toArray();
    const rewards = await db.rewards.toArray();
    const redemptionLogs = await db.redemptionLogs.toArray();
    
    const backup = {
      version: 2.1,
      timestamp: new Date().toISOString(),
      data: { tasks, settings, rewards, redemptionLogs }
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
      if (backup.data) {
        if (backup.data.tasks) {
          await db.tasks.bulkPut(backup.data.tasks);
        }
        if (backup.data.settings) {
          await db.settings.bulkPut(backup.data.settings);
        }
        if (backup.data.rewards) {
          await db.rewards.bulkPut(backup.data.rewards);
        }
        if (backup.data.redemptionLogs) {
          await db.redemptionLogs.bulkPut(backup.data.redemptionLogs);
        }
        alert(t('settings.alerts.importSuccess', { count: (backup.data.tasks?.length || 0) }));
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
      await db.settings.clear();
      await db.rewards.clear();
      await db.redemptionLogs.clear();
      alert(t('settings.alerts.resetSuccess'));
      window.location.reload(); // Refresh to clear state
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
      
      <!-- User Account Section -->
      <section class="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 size-40 bg-primary/5 rounded-full blur-3xl"></div>
        
        <div class="size-24 rounded-full bg-primary/20 flex items-center justify-center text-primary-dark ring-4 ring-primary/10 overflow-hidden shrink-0">
           <span class="material-symbols-outlined text-5xl">person</span>
        </div>
        <div class="flex-1 text-center md:text-left relative z-10">
           <h3 class="text-2xl font-black">{{ userName }}</h3>
           <p class="text-text-sub-light font-bold">Scholar • {{ t('app.offlineReady') }}</p>
           <button 
            @click="isEditingName = true; editNameValue = userName"
            class="mt-4 text-primary text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1 mx-auto md:mx-0"
           >
             <span class="material-symbols-outlined text-sm">edit</span>
             {{ t('settings.dataManagement.editProfile') }}
           </button>
        </div>
        
        <div class="bg-background-light dark:bg-background-dark p-4 rounded-2xl flex flex-col items-center border border-gray-100 dark:border-gray-800 shrink-0 min-w-[120px]">
           <span class="text-[10px] font-black uppercase text-text-sub-light opacity-60 mb-2">Language</span>
           <div class="relative w-full">
             <select 
               :value="locale"
               @change="e => changeLanguage(e.target.value)"
               class="w-full bg-surface-light dark:bg-surface-dark border-2 border-primary/20 rounded-xl px-4 py-2 font-bold text-xs appearance-none cursor-pointer focus:outline-none focus:border-primary transition-all pr-10"
             >
               <option value="zh">简体中文</option>
               <option value="en">English (US)</option>
             </select>
             <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
               <span class="material-symbols-outlined text-lg">expand_more</span>
             </div>
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

    <!-- Edit Name Modal -->
    <div v-if="isEditingName" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-surface-light dark:bg-surface-dark p-8 rounded-[2rem] shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-800 animate-in zoom-in duration-300">
        <h3 class="text-2xl font-black mb-6 flex items-center gap-2">
          {{ t('settings.dataManagement.editProfile') }} ✏️
        </h3>
        <div class="flex flex-col gap-2 mb-8">
           <label class="text-xs font-black uppercase tracking-widest text-text-sub-light px-1">{{ t('settings.dataManagement.userName') }}</label>
           <input 
            v-model="editNameValue" 
            @keyup.enter="saveName"
            type="text" 
            class="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold transition-all outline-none text-lg shadow-inner ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-primary"
            autofocus
           >
        </div>
        <div class="flex gap-4">
          <button @click="isEditingName = false" class="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold text-text-sub-light hover:bg-gray-50 transition-colors uppercase tracking-widest text-xs">Cancel</button>
          <button @click="saveName" class="flex-1 py-4 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-xs">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>
