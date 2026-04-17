import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarSync, Edit2, Plus, RotateCw, Star, Trash2, X } from 'lucide-react-native';

import { db, liveQuery } from '../../src/services/db';
import { getTodayDateString } from '../../src/utils/date';
import { useData } from '../../src/hooks/useData';

export default function DailyCheckinView() {
  const { t } = useTranslation();
  const today = getTodayDateString();
  const { userName } = useData();

  const [templates, setTemplates] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('Math');
  const [formPoints, setFormPoints] = useState(10);
  const [formScheduleType, setFormScheduleType] = useState('weekdays');
  const [formCustomDays, setFormCustomDays] = useState([]);
  const [formStartDate, setFormStartDate] = useState(today);
  const [formEndDate, setFormEndDate] = useState('');

  const subjects = ["Chinese", 'Math', 'English', 'Science', 'Art', 'Reading', 'Sports', 'Other'];
  const subjectColors = {
    Chinese: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    Math: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    English: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    Science: 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30',
    Art: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30',
    Reading: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    Sports: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    Other: 'text-slate-600 bg-slate-100 dark:bg-slate-800',
  };

  const scheduleTypes = ['daily', 'weekdays', 'weekends', 'custom'];
  const weekDays = [
    { key: 'sun', value: 0 }, { key: 'mon', value: 1 }, { key: 'tue', value: 2 },
    { key: 'wed', value: 3 }, { key: 'thu', value: 4 }, { key: 'fri', value: 5 },
    { key: 'sat', value: 6 },
  ];

  useEffect(() => {
    const sub = liveQuery(() =>
      db.dailyCheckinTemplates.where('user_name').equals(userName).toArray()
    ).subscribe(result => {
      setTemplates(result || []);
    });

    return () => sub.unsubscribe();
  }, [userName]);

  const refreshTemplates = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await db.dailyCheckinTemplates.where('user_name').equals(userName).toArray();
      setTemplates(result || []);
    } catch (error) {
      console.error('Failed to refresh templates:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const generateDates = (startDate, endDate, scheduleType, customDays) => {
    const dates = [];
    let scheduleDays = [];
    if (scheduleType === 'daily') scheduleDays = [0, 1, 2, 3, 4, 5, 6];
    else if (scheduleType === 'weekdays') scheduleDays = [1, 2, 3, 4, 5];
    else if (scheduleType === 'weekends') scheduleDays = [0, 6];
    else scheduleDays = customDays;

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    if (!endDate) end.setDate(end.getDate() + 27); // Default 4 weeks

    const current = new Date(start);
    while (current <= end) {
      if (scheduleDays.includes(current.getDay())) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const createTemplate = async () => {
    if (!formTitle.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const templateData = {
        title: formTitle.trim(), subject: formSubject, points: formPoints,
        schedule_type: formScheduleType,
        custom_days: formScheduleType === 'custom' ? formCustomDays : [],
        start_date: formStartDate, end_date: formEndDate || null,
        is_active: true, user_name: userName
      };
      await db.dailyCheckinTemplates.add(templateData);

      const dates = generateDates(formStartDate, formEndDate, formScheduleType, formCustomDays);
      for (const date of dates) {
        await db.tasks.add({
          title: formTitle.trim(), subject: formSubject, points: formPoints,
          completed: false, date, user_name: userName
        });
      }
      setIsModalOpen(false);
      Alert.alert('Success', t('dailyCheckin.tasksGenerated', { count: dates.length }));
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (dayValue) => {
    setFormCustomDays(prev =>
      prev.includes(dayValue) ? prev.filter(d => d !== dayValue) : [...prev, dayValue]
    );
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark" contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View className="flex flex-row justify-between items-end mb-8">
        <View className="flex-1">
          <Text className="text-4xl font-black tracking-tight dark:text-white">{t('dailyCheckin.title')}</Text>
          <Text className="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{t('dailyCheckin.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => setIsModalOpen(true)} className="bg-primary p-3 rounded-2xl shadow-lg">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Templates List */}
      <View className="flex flex-col gap-6">
        {templates.length === 0 ? (
          <View className="py-16 items-center bg-surface-light dark:bg-surface-dark rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <CalendarSync size={48} color="#cbd5e1" />
            <Text className="text-xl font-black text-gray-400 mt-4">{t('dailyCheckin.noTemplates')}</Text>
          </View>
        ) : (
          templates.map(tpl => (
            <View key={tpl.id} className={`p-5 rounded-3xl bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-sm`}>
              <View className="flex flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-lg font-bold dark:text-white">{tpl.title}</Text>
                  <Text className={`text-[10px] font-black uppercase mt-1 ${subjectColors[tpl.subject]?.split(' ')[0]}`}>{t(`home.subjects.${tpl.subject}`)}</Text>
                </View>
                <TouchableOpacity onPress={async () => {
                  if(confirm('Delete template?')) await db.dailyCheckinTemplates.delete(tpl.id);
                }}>
                  <Trash2 size={18} color="#cbd5e1" />
                </TouchableOpacity>
              </View>
              <View className="flex flex-row items-center gap-4 mt-2">
                <View className="bg-primary/10 px-3 py-1 rounded-lg flex flex-row items-center gap-1">
                  <Star size={12} color="#6366f1" />
                  <Text className="text-primary font-bold text-xs">+{tpl.points} pts</Text>
                </View>
                <Text className="text-xs text-text-sub-light font-bold uppercase">{t(`dailyCheckin.scheduleTypes.${tpl.schedule_type}`)}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Basic Create Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-t-3xl h-[80%]">
            <View className="flex flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black dark:text-white">Create Checkin</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            
            <ScrollView className="flex-1">
                <View className="flex flex-col gap-4">
                  <TextInput
                    className="bg-background-light dark:bg-background-dark p-4 rounded-xl font-bold dark:text-white"
                    placeholder="Templat Name"
                    value={formTitle}
                    onChangeText={setFormTitle}
                  />
                  <View className="flex flex-row gap-2">
                    {scheduleTypes.map(type => (
                      <TouchableOpacity key={type} onPress={() => setFormScheduleType(type)}
                        className={`px-4 py-2 rounded-full ${formScheduleType === type ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'}`}>
                        <Text className={formScheduleType === type ? 'text-white' : 'text-gray-600'}>{t(`dailyCheckin.scheduleTypes.${type}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {formScheduleType === 'custom' && (
                    <View className="flex flex-row flex-wrap gap-2">
                      {weekDays.map(day => (
                        <TouchableOpacity key={day.value} onPress={() => toggleDay(day.value)}
                          className={`size-10 rounded-full items-center justify-center ${formCustomDays.includes(day.value) ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          <Text className={formCustomDays.includes(day.value) ? 'text-white' : 'text-gray-600'}>{t(`dailyCheckin.days.${day.key}`).slice(0, 1)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity onPress={createTemplate} disabled={isLoading} className="bg-primary p-4 rounded-xl items-center mt-4">
                    <Text className="text-white font-black uppercase">Create Template & Tasks</Text>
                  </TouchableOpacity>
                </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
