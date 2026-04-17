import { useState, useEffect, useRef, useCallback } from 'react';
import { db, liveQuery } from '../db';
import { useTranslation } from 'react-i18next';
import { ChevronDown, CloudOff, CloudDownload, Database, Edit2, TriangleAlert, User } from 'lucide-react';

export default function SettingsView() {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [userName, setUserName] = useState('Hero');

  // Live reactive username & language
  useEffect(() => {
    const sub = liveQuery(() => db.settings.toArray())
      .subscribe(results => {
        const nameSetting = results.find(s => s.key === 'userName');
        if (nameSetting) setUserName(nameSetting.value);

        const langSetting = results.find(s => s.key === 'language');
        if (langSetting && langSetting.value !== i18n.language) {
          i18n.changeLanguage(langSetting.value);
        }
      });
    return () => sub.unsubscribe();
  }, []);

  const changeLanguage = async (lang) => {
    i18n.changeLanguage(lang);
    try {
      await db.settings.put({ key: 'language', value: lang });
    } catch (err) {
      console.error('Failed to save language:', err);
    }
  };

  const saveName = async () => {
    if (!editNameValue.trim()) return;
    await db.settings.put({ key: 'userName', value: editNameValue.trim() });
    setIsEditingName(false);
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
    fileInputRef.current?.click();
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
          if (backup.data.tasks) await db.tasks.bulkPut(backup.data.tasks);
          if (backup.data.settings) await db.settings.bulkPut(backup.data.settings);
          if (backup.data.rewards) await db.rewards.bulkPut(backup.data.rewards);
          if (backup.data.redemptionLogs) await db.redemptionLogs.bulkPut(backup.data.redemptionLogs);
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
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">{t('settings.title')}</h1>
        <p className="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{t('settings.subtitle')} ⚙️</p>
      </div>

      <div className="grid gap-8">
        {/* User Account Section */}
        <section className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 size-40 bg-primary/5 rounded-full blur-3xl"></div>
          
          <div className="size-24 rounded-full bg-primary/20 flex items-center justify-center text-primary-dark ring-4 ring-primary/10 overflow-hidden shrink-0">
            <User className="text-5xl" />
          </div>
          <div className="flex-1 text-center md:text-left relative z-10">
            <h3 className="text-2xl font-black">{userName}</h3>
            <p className="text-text-sub-light font-bold">Scholar • {t('app.offlineReady')}</p>
            <button
              onClick={() => { setIsEditingName(true); setEditNameValue(userName); }}
              className="mt-4 text-primary text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1 mx-auto md:mx-0"
            >
              <Edit2 className="text-sm w-4 h-4" />
              {t('settings.dataManagement.editProfile')}
            </button>
          </div>

          <div className="bg-background-light dark:bg-background-dark p-4 rounded-2xl flex flex-col items-center border border-gray-100 dark:border-gray-800 shrink-0 min-w-[120px]">
            <span className="text-[10px] font-black uppercase text-text-sub-light opacity-60 mb-2">Language</span>
            <div className="relative w-full">
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="w-full bg-surface-light dark:bg-surface-dark border-2 border-primary/20 rounded-xl px-4 py-2 font-bold text-xs appearance-none cursor-pointer focus:outline-none focus:border-primary transition-all pr-10"
              >
                <option value="zh">简体中文</option>
                <option value="en">English (US)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                <ChevronDown className="text-lg w-4 h-4" />
              </div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Database className="text-primary w-7 h-7" />
            <h3 className="text-xl font-bold">{t('settings.dataManagement.title')}</h3>
          </div>
          <p className="text-text-sub-light dark:text-text-sub-dark font-medium mb-8 leading-relaxed">{t('settings.dataManagement.desc')}</p>

          <div className="grid md:grid-cols-2 gap-5">
            <button
              onClick={exportData}
              className="group flex items-center gap-4 p-6 rounded-2xl bg-primary/10 dark:bg-primary/5 hover:bg-primary transition-all duration-300 border-2 border-transparent hover:border-primary-dark shadow-sm"
            >
              <div className="size-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-primary group-hover:bg-black group-hover:text-primary transition-all duration-300">
                <CloudDownload className="w-7 h-7" />
              </div>
              <div className="text-left">
                <div className="text-lg font-black text-text-main-light dark:text-white group-hover:text-black transition-colors">{t('settings.dataManagement.backupBtn')}</div>
                <div className="text-[10px] font-black uppercase text-text-sub-light group-hover:text-black/60 transition-colors">{t('settings.dataManagement.backupSub')}</div>
              </div>
            </button>

            <button
              onClick={triggerImport}
              className="group flex items-center gap-4 p-6 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-black transition-all duration-300 border-2 border-transparent hover:border-primary shadow-sm"
            >
              <div className="size-12 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-primary group-hover:text-black transition-all duration-300">
                <CloudOff className="w-7 h-7" />
              </div>
              <div className="text-left">
                <div className="text-lg font-black text-text-main-light dark:text-white group-hover:text-primary transition-colors">{t('settings.dataManagement.restoreBtn')}</div>
                <div className="text-[10px] font-black uppercase text-text-sub-light group-hover:text-primary/60 transition-colors">{t('settings.dataManagement.restoreSub')}</div>
              </div>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={importData}
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/30">
          <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-3">
            <TriangleAlert className="w-7 h-7" />
            {t('settings.danger.title')}
          </h3>
          <p className="text-text-sub-light dark:text-red-400/70 font-medium mb-8">{t('settings.danger.desc')}</p>

          <button
            onClick={clearAllData}
            className="w-full md:w-fit px-8 py-4 rounded-2xl bg-white dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-black hover:bg-red-600 hover:text-white transition-all duration-300 shadow-sm active:scale-95 uppercase tracking-widest text-xs"
          >
            {t('settings.danger.resetBtn')}
          </button>
        </section>
      </div>

      {/* Edit Name Modal */}
      {isEditingName && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 modal-overlay">
          <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-[2rem] shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-800 modal-content">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
              {t('settings.dataManagement.editProfile')} ✏️
            </h3>
            <div className="flex flex-col gap-2 mb-8">
              <label className="text-xs font-black uppercase tracking-widest text-text-sub-light px-1">{t('settings.dataManagement.userName')}</label>
              <input
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && saveName()}
                type="text"
                className="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold transition-all outline-none text-lg shadow-inner ring-1 ring-gray-100 dark:ring-gray-700 focus:ring-primary"
                autoFocus
              />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsEditingName(false)} className="flex-1 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 font-bold text-text-sub-light hover:bg-gray-50 transition-colors uppercase tracking-widest text-xs">Cancel</button>
              <button onClick={saveName} className="flex-1 py-4 bg-primary text-black font-black rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-xs">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
