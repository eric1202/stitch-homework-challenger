import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Database, Edit2, TriangleAlert, User, ChevronRight, Globe } from 'lucide-react-native';

import { db, liveQuery } from '../../src/services/db';
import { useData } from '../../src/hooks/useData';

export default function SettingsView() {
  const { t, i18n } = useTranslation();
  const { userName } = useData();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');

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

  const clearAllData = async () => {
    Alert.alert(
      t('settings.danger.title'),
      t('settings.alerts.deleteConfirm1'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Reset Everything', style: 'destructive', onPress: async () => {
            await db.tasks.clear();
            await db.settings.clear();
            await db.rewards.clear();
            await db.redemptionLogs.clear();
            Alert.alert('Success', t('settings.alerts.resetSuccess'));
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark" contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View className="mb-8">
        <Text className="text-4xl font-black tracking-tight dark:text-white">{t('settings.title')}</Text>
        <Text className="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{t('settings.subtitle')} ⚙️</Text>
      </View>

      <View className="flex flex-col gap-6">
        {/* Profile Section */}
        <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-row items-center gap-6">
          <View className="size-16 rounded-full bg-primary/20 items-center justify-center">
            <User size={32} color="#6366f1" />
          </View>
          <View className="flex-1">
            <Text className="text-xl font-black dark:text-white">{userName}</Text>
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest">Scholar</Text>
            <TouchableOpacity onPress={() => { setIsEditingName(true); setEditNameValue(userName); }} className="mt-2 flex flex-row items-center gap-1">
              <Edit2 size={12} color="#6366f1" />
              <Text className="text-xs font-black text-primary uppercase">{t('settings.dataManagement.editProfile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Section */}
        <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <View className="flex flex-row items-center gap-3 mb-4">
            <Globe size={20} color="#6366f1" />
            <Text className="text-lg font-bold dark:text-white">Language</Text>
          </View>
          <View className="flex flex-row gap-2">
            {['zh', 'en'].map(lang => (
              <TouchableOpacity
                key={lang}
                onPress={() => changeLanguage(lang)}
                className={`flex-1 py-3 items-center rounded-xl border-2 ${i18n.language === lang ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700'}`}
              >
                <Text className={`font-black ${i18n.language === lang ? 'text-white' : 'text-gray-400'}`}>
                  {lang === 'zh' ? '中文' : 'English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data Management Section */}
        <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <View className="flex flex-row items-center gap-3 mb-4">
            <Database size={20} color="#6366f1" />
            <Text className="text-lg font-bold dark:text-white">{t('settings.dataManagement.title')}</Text>
          </View>
          <Text className="text-xs text-text-sub-light mb-6">{t('settings.dataManagement.desc')}</Text>

          <TouchableOpacity className="flex flex-row items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-2xl mb-2">
            <Text className="font-bold dark:text-white">Backup to Local Data</Text>
            <ChevronRight size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100 dark:border-red-900/40">
          <View className="flex flex-row items-center gap-3 mb-2">
            <TriangleAlert size={20} color="#ef4444" />
            <Text className="text-lg font-bold text-red-600 dark:text-red-400">{t('settings.danger.title')}</Text>
          </View>
          <Text className="text-xs text-red-400 mb-6">{t('settings.danger.desc')}</Text>

          <TouchableOpacity onPress={clearAllData} className="bg-white dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 p-4 rounded-2xl items-center">
            <Text className="text-red-600 dark:text-red-400 font-black uppercase tracking-widest text-xs">{t('settings.danger.resetBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Name Modal */}
      <Modal visible={isEditingName} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 items-center justify-center p-6">
          <View className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl w-full max-w-sm">
            <Text className="text-2xl font-black mb-6 dark:text-white">Edit Name ✏️</Text>
            <TextInput
              className="bg-background-light dark:bg-background-dark p-4 rounded-2xl font-bold dark:text-white mb-6"
              value={editNameValue}
              onChangeText={setEditNameValue}
              autoFocus
            />
            <View className="flex flex-row gap-4">
              <TouchableOpacity onPress={() => setIsEditingName(false)} className="flex-1 p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 items-center">
                <Text className="font-bold text-gray-500">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} className="flex-1 p-4 rounded-2xl bg-primary items-center">
                <Text className="font-bold text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
