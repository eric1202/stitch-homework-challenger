import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { 
  BadgeCheck, ClipboardList, Download, Flame, LineChart, 
  PieChart, Star, Stars, TrendingUp, Zap 
} from 'lucide-react-native';
import { startOfWeek, endOfWeek, eachDayOfInterval, format } from 'date-fns';

import { db, liveQuery } from '../../src/services/db';
import { useData } from '../../src/hooks/useData';

export default function AnalyticsView() {
  const { t } = useTranslation();
  const [allTasks, setAllTasks] = useState([]);
  const { userName } = useData();

  useEffect(() => {
    const sub = liveQuery(() =>
      db.tasks.where('user_name').equals(userName).toArray()
    ).subscribe(tasks => {
      setAllTasks(tasks.sort((a, b) => b.date.localeCompare(a.date)));
    });

    return () => sub.unsubscribe();
  }, [userName]);

  const stats = useMemo(() => {
    if (allTasks.length === 0) return { perfectDays: 0, streak: 0, rate: 0 };

    const dateGroups = allTasks.reduce((acc, task) => {
      if (!acc[task.date]) acc[task.date] = [];
      acc[task.date].push(task);
      return acc;
    }, {});

    const dates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));
    const perfectDays = Object.values(dateGroups).filter(dayTasks =>
      dayTasks.length > 0 && dayTasks.every(t => t.completed)
    ).length;

    const totalCompleted = allTasks.filter(t => t.completed).length;
    const rate = Math.round((totalCompleted / allTasks.length) * 100);

    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      if (dateGroups[dates[i]].every(t => t.completed)) {
        streak++;
      } else break;
    }

    return { perfectDays, streak, rate };
  }, [allTasks]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(new Date(), { weekStartsOn: 1 })
  });

  const chartData = useMemo(() => {
    return weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = allTasks.filter(t => t.date === dayStr && t.completed).length;
      return { 
        label: format(day, 'EEE'), 
        value: count, 
        isToday: dayStr === format(new Date(), 'yyyy-MM-dd') 
      };
    });
  }, [allTasks, weekDays]);

  const maxTasks = Math.max(...chartData.map(d => d.value), 5); // Minimum 5 for scale

  const exportData = () => {
    Alert.alert(t('common.notice'), 'Exporting to CSV is available in web version. In Native, we will support standard share sheet in future.');
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark" contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View className="flex flex-row justify-between items-end mb-8">
        <View className="flex-1">
          <Text className="text-4xl font-black tracking-tight dark:text-white">{t('analytics.title')}</Text>
          <Text className="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{t('analytics.subtitle')} 🏆</Text>
        </View>
        <TouchableOpacity onPress={exportData} className="bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800 p-3 rounded-2xl shadow-sm">
          <Download size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View className="flex flex-col gap-4 mb-8">
        {[
          { label: t('analytics.status.completed'), value: stats.perfectDays, icon: BadgeCheck, sub: 'Perfect Days', color: 'text-blue-700', bg: 'bg-blue-100' },
          { label: 'Active Streak', value: `${stats.streak} Days`, icon: Flame, sub: 'Keep going!', color: 'text-orange-700', bg: 'bg-orange-100' },
          { label: 'Global Progress', value: `${stats.rate}%`, icon: PieChart, sub: 'Completion', color: 'text-indigo-700', bg: 'bg-indigo-100' },
        ].map((item, idx) => (
          <View key={idx} className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-row justify-between items-center">
            <View>
              <Text className="text-text-sub-light dark:text-text-sub-dark text-[10px] font-black uppercase tracking-widest">{item.label}</Text>
              <Text className="text-3xl font-black mt-1 dark:text-white">{item.value}</Text>
              <View className={`${item.bg} dark:bg-blue-900/30 px-3 py-1 rounded-xl mt-2 self-start`}>
                <Text className={`${item.color} dark:text-blue-400 text-[10px] font-bold`}>{item.sub}</Text>
              </View>
            </View>
            <item.icon size={48} color="#6366f1" opacity={0.1} />
          </View>
        ))}
      </View>

      {/* Simplified Bar Chart */}
      <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm mb-8">
        <View className="flex flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-lg font-bold dark:text-white">{t('analytics.weekActivity')}</Text>
            <Text className="text-xs text-text-sub-light">This Week</Text>
          </View>
          <TrendingUp size={20} color="#6366f1" />
        </View>
        
        <View className="flex flex-row items-end justify-between h-40">
          {chartData.map((d, i) => (
            <View key={i} className="items-center flex-1">
              <View 
                className={`w-4 rounded-full ${d.isToday ? 'bg-primary' : 'bg-primary/20'}`} 
                style={{ height: `${(d.value / maxTasks) * 100}%`, minHeight: 4 }} 
              />
              <Text className="text-[10px] font-bold mt-2 text-text-sub-light uppercase">{d.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* History List */}
      <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <Text className="text-lg font-bold dark:text-white mb-6">{t('analytics.history')}</Text>
        <View className="flex flex-col gap-4">
          {allTasks.slice(0, 10).map(task => (
            <View key={task.id} className="flex flex-row items-center gap-4 p-3 rounded-2xl bg-background-light dark:bg-background-dark/50">
              <View className="size-10 rounded-full bg-primary/10 items-center justify-center">
                <ClipboardList size={20} color="#6366f1" />
              </View>
              <View className="flex-1">
                <Text className="font-bold dark:text-white text-sm" numberOfLines={1}>{task.title}</Text>
                <Text className="text-[10px] text-text-sub-light font-bold uppercase">{task.date}</Text>
              </View>
              {task.completed && (
                <View className="bg-primary/20 px-2 py-1 rounded-lg">
                  <Text className="text-primary text-[10px] font-black">DONE</Text>
                </View>
              )}
            </View>
          ))}
          {allTasks.length === 0 && (
            <Text className="text-center py-10 opacity-30 italic dark:text-white">{t('analytics.table.empty')}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
