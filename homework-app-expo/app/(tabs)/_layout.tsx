import React from 'react';
import { Tabs } from 'expo-router';
import { Sun, CalendarDays, LineChart, Gift, Dices, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/components/useColorScheme';
import { useDevice } from '../../src/hooks/useDevice';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { isLargeScreen } = useDevice();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
        tabBarStyle: {
          display: isLargeScreen ? 'none' : 'flex',
          height: 80,
          paddingBottom: 25,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#1e293b' : '#f1f5f9',
          backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#ffffff',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('app.nav.tasks'),
          tabBarIcon: ({ color }) => <Sun size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: t('dailyCheckin.title'),
          tabBarIcon: ({ color }) => <CalendarDays size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('app.nav.analytics'),
          tabBarIcon: ({ color }) => <LineChart size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t('app.nav.rewards'),
          tabBarIcon: ({ color }) => <Gift size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="monopoly"
        options={{
          title: t('monopoly.navTitle'),
          tabBarIcon: ({ color }) => <Dices size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('app.nav.settings'),
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
