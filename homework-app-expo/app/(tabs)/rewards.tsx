import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { 
  Gamepad2, IceCream, Palmtree, Book, Gift, Plus, Edit2, 
  Trash2, History, Clock, CheckCircle2, X, RotateCw 
} from 'lucide-react-native';

import { db, liveQuery } from '../../src/services/db';
import { triggerConfetti } from '../../src/utils/confetti';
import { useData } from '../../src/hooks/useData';

const iconComponents = { Gamepad2, IceCream, Palmtree, Book, Gift };

const iconPresets = [
  { name: 'Gamepad2', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { name: 'IceCream', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  { name: 'Palmtree', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  { name: 'Book', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { name: 'Gift', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' }
];

export default function RewardStore() {
  const { t } = useTranslation();
  const { userName } = useData();

  const [rewards, setRewards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [form, setForm] = useState({ title: '', icon: 'Gift', points: 50, stock: 1 });

  useEffect(() => {
    const rewardsSub = liveQuery(() => db.rewards.where('user_name').equals(userName).toArray()).subscribe(setRewards);
    const logsSub = liveQuery(() => db.redemptionLogs.where('user_name').equals(userName).reverse().toArray()).subscribe(setLogs);
    
    const pointsSub = liveQuery(async () => {
        try {
          const allTasks = await db.tasks.where('user_name').equals(userName).select('points, completed').toArray();
          const spentLogs = await db.redemptionLogs.where('user_name').equals(userName).select('spent_points').toArray();
          const spent = spentLogs.reduce((sum, log) => sum + (log.spent_points || 0), 0);
          const earned = allTasks.filter(t => t.completed).reduce((sum, t) => sum + (Number(t.points) || 0), 0);
          return earned - spent;
        } catch { return 0; }
    }).subscribe(setTotalPoints);

    return () => {
      rewardsSub.unsubscribe();
      logsSub.unsubscribe();
      pointsSub.unsubscribe();
    };
  }, [userName]);

  const saveReward = async () => {
    if (!form.title || isSaving) return;
    setIsSaving(true);
    try {
      const data = { ...form, user_name: userName };
      if (editingReward) await db.rewards.update(editingReward.id, data);
      else await db.rewards.add(data);
      setShowFormModal(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const redeemReward = async (reward) => {
    if (totalPoints < reward.points || reward.stock <= 0) return;
    try {
      await db.transaction('rw', db.rewards, db.redemptionLogs, async () => {
         const fresh = await db.rewards.get(reward.id);
         if (fresh.stock <= 0) throw new Error('Out of stock');
         await db.rewards.update(reward.id, { stock: fresh.stock - 1 });
         await db.redemptionLogs.add({
           reward_title: reward.title, spent_points: reward.points,
           timestamp: Date.now(), user_name: userName
         });
      });
      triggerConfetti();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark" contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View className="flex flex-row justify-between items-end mb-8">
        <View className="flex-1">
          <Text className="text-4xl font-black tracking-tight dark:text-white">{t('rewards.title')}</Text>
          <Text className="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">{t('rewards.subtitle')}</Text>
        </View>
        <TouchableOpacity onPress={() => setIsAdmin(!isAdmin)} className={`p-3 rounded-2xl ${isAdmin ? 'bg-primary' : 'bg-surface-light dark:bg-surface-dark border border-gray-100'}`}>
          <Edit2 size={24} color={isAdmin ? 'white' : '#6366f1'} />
        </TouchableOpacity>
      </View>

      {/* Points Banner */}
      <View className="bg-primary p-6 rounded-3xl shadow-lg mb-8 flex flex-row justify-between items-center">
        <View>
          <Text className="text-white/70 text-xs font-black uppercase tracking-widest">{t('rewards.availableBalance')}</Text>
          <Text className="text-5xl font-black text-white">{totalPoints} <Text className="text-xl">pts</Text></Text>
        </View>
        <Gift size={64} color="white" opacity={0.2} />
      </View>

      {/* Admin Actions */}
      {isAdmin && (
        <TouchableOpacity onPress={() => { setEditingReward(null); setShowFormModal(true); }} className="bg-black dark:bg-white p-4 rounded-2xl items-center mb-8">
          <Text className="text-white dark:text-black font-black uppercase">{t('rewards.addNew')}</Text>
        </TouchableOpacity>
      )}

      {/* Rewards Grid */}
      <View className="flex flex-row flex-wrap gap-4">
        {rewards.length === 0 ? (
          <View className="w-full py-16 items-center bg-surface-light dark:bg-surface-dark rounded-3xl border border-dashed border-gray-200">
            <Gift size={48} color="#cbd5e1" />
            <Text className="text-xl font-black text-gray-400 mt-4">{t('rewards.noRewards')}</Text>
          </View>
        ) : (
          rewards.map(reward => {
            const IconComp = iconComponents[reward.icon] || Gift;
            const canAfford = totalPoints >= reward.points;
            return (
              <View key={reward.id} className="w-[47%] bg-surface-light dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative">
                <View className="size-12 rounded-2xl bg-background-light dark:bg-background-dark items-center justify-center mb-4">
                  <IconComp size={24} color="#6366f1" />
                </View>
                <Text className="text-lg font-black dark:text-white" numberOfLines={1}>{reward.title}</Text>
                <Text className="text-primary font-black text-2xl mt-1">{reward.points} <Text className="text-xs">pts</Text></Text>
                <Text className="text-[10px] font-bold text-gray-400 mt-2 uppercase">Stock: {reward.stock}</Text>
                
                <TouchableOpacity 
                  onPress={() => isAdmin ? (setEditingReward(reward), setForm(reward), setShowFormModal(true)) : redeemReward(reward)}
                  disabled={!isAdmin && (!canAfford || reward.stock <= 0)}
                  className={`mt-4 py-3 rounded-xl items-center ${isAdmin ? 'bg-gray-100 dark:bg-gray-800' : (canAfford && reward.stock > 0 ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800')}`}
                >
                  <Text className={`font-black uppercase text-xs ${isAdmin ? 'text-primary' : (canAfford && reward.stock > 0 ? 'text-white' : 'text-gray-400')}`}>
                    {isAdmin ? 'Edit' : (reward.stock <= 0 ? 'Out' : (canAfford ? 'Redeem' : 'Need more'))}
                  </Text>
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity onPress={() => db.rewards.delete(reward.id)} className="absolute top-4 right-4">
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Redemption History */}
      <View className="mt-8">
        <Text className="text-2xl font-black dark:text-white mb-6">History</Text>
        {logs.map(log => (
            <View key={log.id} className="flex flex-row items-center gap-4 p-4 mb-3 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <View className="size-10 rounded-full bg-red-100 items-center justify-center">
                    <History size={20} color="#ef4444" />
                </View>
                <View className="flex-1">
                    <Text className="font-bold dark:text-white">{log.reward_title}</Text>
                    <Text className="text-[10px] text-gray-400 font-bold uppercase">{new Date(log.timestamp).toLocaleDateString()}</Text>
                </View>
                <Text className="font-black text-red-500">-{log.spent_points} pts</Text>
            </View>
        ))}
      </View>

      {/* Form Modal */}
      <Modal visible={showFormModal} animationType="slide" transparent>
          <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-t-3xl">
                  <View className="flex flex-row justify-between mb-6">
                      <Text className="text-2xl font-black dark:text-white">Reward Form</Text>
                      <TouchableOpacity onPress={() => setShowFormModal(false)}><X size={24} color="#64748b" /></TouchableOpacity>
                  </View>
                  <View className="flex flex-col gap-4">
                      <TextInput className="bg-background-light dark:bg-background-dark p-4 rounded-xl font-bold dark:text-white" value={form.title} onChangeText={t => setForm(f => ({...f, title: t}))} placeholder="Title" />
                      <TextInput className="bg-background-light dark:bg-background-dark p-4 rounded-xl font-bold dark:text-white" value={String(form.points)} onChangeText={t => setForm(f => ({...f, points: Number(t)}))} keyboardType="numeric" placeholder="Points" />
                      <TextInput className="bg-background-light dark:bg-background-dark p-4 rounded-xl font-bold dark:text-white" value={String(form.stock)} onChangeText={t => setForm(f => ({...f, stock: Number(t)}))} keyboardType="numeric" placeholder="Stock" />
                      
                      <View className="flex flex-row gap-2">
                          {iconPresets.map(p => (
                              <TouchableOpacity key={p.name} onPress={() => setForm(f => ({...f, icon: p.name}))} className={`p-4 rounded-2xl ${form.icon === p.name ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                  <Text className="text-xl">🎁</Text>
                              </TouchableOpacity>
                          ))}
                      </View>

                      <TouchableOpacity onPress={saveReward} className="bg-primary p-4 rounded-xl items-center mt-4">
                          <Text className="text-white font-black uppercase">Save Reward</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
    </ScrollView>
  );
}
