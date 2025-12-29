<script setup>
import { ref } from 'vue';
import { db } from '../db';
import { liveQuery } from 'dexie';
import { useI18n } from 'vue-i18n';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/solid';

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
  <div class="space-y-8">
    <div>
      <h2 class="text-3xl font-black text-dark tracking-tight">{{ t('settings.title') }}</h2>
      <p class="text-gray-400 font-bold mt-1">{{ t('settings.subtitle') }}</p>
    </div>

    <div class="grid gap-6">
      
      <!-- Data Management -->
      <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 class="text-lg font-bold text-dark mb-4">{{ t('settings.dataManagement.title') }}</h3>
        <p class="text-sm text-gray-500 mb-6">{{ t('settings.dataManagement.desc') }}</p>
        
        <div class="grid md:grid-cols-2 gap-4">
          <button 
            @click="exportData"
            class="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-primary/10 bg-primary/5 text-primary font-bold hover:bg-primary hover:text-white transition-all duration-200 group"
          >
            <ArrowDownTrayIcon class="w-6 h-6" />
            <div class="text-left">
              <div class="text-sm">{{ t('settings.dataManagement.backupBtn') }}</div>
              <div class="text-[10px] opacity-60 font-medium font-sans">{{ t('settings.dataManagement.backupSub') }}</div>
            </div>
          </button>

          <button 
            @click="triggerImport"
            class="flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-600 font-bold hover:bg-gray-200 hover:text-dark transition-all duration-200"
          >
            <ArrowUpTrayIcon class="w-6 h-6" />
            <div class="text-left">
              <div class="text-sm">{{ t('settings.dataManagement.restoreBtn') }}</div>
              <div class="text-[10px] opacity-60 font-medium font-sans">{{ t('settings.dataManagement.restoreSub') }}</div>
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
      </div>

      <!-- Danger Zone -->
      <div class="bg-red-50 p-6 rounded-3xl border border-red-100">
        <h3 class="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
          <ExclamationTriangleIcon class="w-5 h-5" />
          {{ t('settings.danger.title') }}
        </h3>
        <p class="text-sm text-red-400 mb-6">{{ t('settings.danger.desc') }}</p>
        
        <button 
          @click="clearAllData"
          class="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-white border border-red-200 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all duration-200 shadow-sm"
        >
          <TrashIcon class="w-5 h-5" />
          {{ t('settings.danger.resetBtn') }}
        </button>
      </div>

    </div>
  </div>
</template>
