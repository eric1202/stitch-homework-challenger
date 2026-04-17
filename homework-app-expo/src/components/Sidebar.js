import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { 
  Sun, CalendarDays, LineChart, Gift, Dices, Settings, GraduationCap 
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function Sidebar({ totalPoints, userName }) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { name: '/', icon: Sun, label: t('app.nav.tasks') },
    { name: '/checkin', icon: CalendarDays, label: t('dailyCheckin.title') },
    { name: '/analytics', icon: LineChart, label: t('app.nav.analytics') },
    { name: '/rewards', icon: Gift, label: t('app.nav.rewards') },
    { name: '/monopoly', icon: Dices, label: t('monopoly.navTitle') },
    { name: '/settings', icon: Settings, label: t('app.nav.settings') },
  ];

  const isActive = (path) => pathname === path;

  return (
    <View className="hidden lg:flex w-72 flex-col justify-between bg-surface-light dark:bg-surface-dark border-r border-gray-100 dark:border-gray-800 p-6 h-full">
      <View className="flex flex-col gap-8">
        <View className="flex flex-row items-center gap-3">
          <View className="bg-primary rounded-xl size-10 flex items-center justify-center">
            <GraduationCap color="white" size={24} />
          </View>
          <Text className="text-xl font-black tracking-tight dark:text-white">
            {t('app.title')} <Text className="text-primary">{t('app.subtitle')}</Text>
          </Text>
        </View>

        <View className="flex flex-col gap-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.name);
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => router.push(item.name)}
                className={`flex flex-row items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  active ? 'bg-primary/20' : ''
                }`}
              >
                <Icon size={24} color={active ? '#6366f1' : '#64748b'} />
                <Text className={`font-bold ${active ? 'text-primary' : 'text-text-sub-light dark:text-text-sub-dark'}`}>
                  {item.label}
                </Text>
                {active && (
                  <View className="absolute right-0 w-1.5 h-6 bg-primary rounded-l-full" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="flex flex-col gap-4">
        <View className="bg-surface-light dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 rounded-2xl">
          <Text className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-widest mb-1">
            {t('app.totalPoints')}
          </Text>
          <View className="flex flex-row items-baseline gap-1">
            <Text className="text-3xl font-black text-primary">{totalPoints}</Text>
            <Text className="text-xs font-bold text-text-sub-light">pts</Text>
          </View>
        </View>

        <View className="flex flex-row items-center gap-3 p-3 rounded-2xl bg-background-light dark:bg-background-dark/50 border border-transparent">
          <View className="size-10 rounded-full bg-primary/30 flex items-center justify-center">
            <Text className="text-primary-dark font-black">{userName?.[0]}</Text>
          </View>
          <View className="flex flex-col">
            <Text className="text-sm font-bold dark:text-white">{userName}</Text>
            <Text className="text-[10px] font-bold text-text-sub-light uppercase">{t('app.offlineReady')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
