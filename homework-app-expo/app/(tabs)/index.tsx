import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { 
  Rocket, Calendar, CalendarDays, CalendarPlus, Check, CheckCircle2, 
  ChevronLeft, ChevronRight, Plus, RotateCw, Trash2, X, Book 
} from 'lucide-react-native';

import { db, liveQuery } from '../../src/services/db';
import { getTodayDateString, formatDateDisplay } from '../../src/utils/date';
import { triggerConfetti } from '../../src/utils/confetti';
import { useData } from '../../src/hooks/useData';

const parseBatchTasks = (text) => {
  let parts = text.split(/(?:\s+)?\d+\s*[.、,，]+\s*/);
  if (parts.length <= 1 && text.includes('\n')) {
      parts = text.split(/\n+/);
  }
  return parts.map(p => p.trim()).filter(p => p.length > 0);
};

export default function HomeView() {
  const { t } = useTranslation();
  const today = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('Math');
  const [isAddingFormOpen, setIsAddingFormOpen] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isBatchConfirmModalOpen, setIsBatchConfirmModalOpen] = useState(false);
  const [batchParsedTasks, setBatchParsedTasks] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const { userName } = useData();
  
  const selectedDateRef = useRef(today);
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  const calculatedPoints = useMemo(() => {
    if (!newTaskTitle.trim()) return 0;
    const str = `${newTaskSubject}-${newTaskTitle.trim()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 26) + 10;
  }, [newTaskTitle, newTaskSubject]);

  const subjects = ["Chinese", 'Math', 'English', 'Science', 'Art', 'Reading', 'Sports', 'Other'];
  
  const subjectColors = {
    Chinese: { text: 'text-emerald-600', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-900/30', darkText: 'dark:text-emerald-300', dot: 'bg-emerald-600' },
    Math: { text: 'text-purple-600', bg: 'bg-purple-100', darkBg: 'dark:bg-purple-900/30', darkText: 'dark:text-purple-300', dot: 'bg-purple-600' },
    English: { text: 'text-blue-600', bg: 'bg-blue-100', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-300', dot: 'bg-blue-600' },
    Science: { text: 'text-indigo-700', bg: 'bg-indigo-100', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-300', dot: 'bg-indigo-700' },
    Art: { text: 'text-rose-600', bg: 'bg-rose-100', darkBg: 'dark:bg-rose-900/30', darkText: 'dark:text-rose-300', dot: 'bg-rose-600' },
    Reading: { text: 'text-amber-600', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-300', dot: 'bg-amber-600' },
    Sports: { text: 'text-orange-600', bg: 'bg-orange-100', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400', dot: 'bg-orange-600' },
    Other: { text: 'text-slate-600', bg: 'bg-slate-100', darkBg: 'dark:bg-slate-800', darkText: 'dark:text-slate-300', dot: 'bg-slate-600' },
  };

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    const timer = setTimeout(() => {
      if (isInitialLoading) setIsInitialLoading(false);
    }, 5000);

    const sub = liveQuery(() => 
      db.tasks.where('user_name').equals(userName).toArray()
    ).subscribe(result => {
      setTasks(result.filter(t => t.date === selectedDateRef.current));
      if (isInitialLoading) {
        setIsInitialLoading(false);
        clearTimeout(timer);
      }
    });

    return () => {
      sub.unsubscribe();
      clearTimeout(timer);
    };
  }, [userName, isInitialLoading]);

  const refreshTasks = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await db.tasks.where('user_name').equals(userName).toArray();
      setTasks(result.filter(t => t.date === selectedDateRef.current));
    } catch (error) {
      Alert.alert(t('common.error'), t('home.refreshFail'));
    } finally {
      setIsRefreshing(false);
    }
  }, [userName, t]);

  const isToday = selectedDate === today;
  const isLocked = tasks.length > 0 && tasks.every(t => t.completed);

  const groupedTasks = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const s = task.subject || 'Other';
      if (!groups[s]) groups[s] = [];
      groups[s].push(task);
    });

    return Object.keys(groups).sort((a, b) => {
      const indexA = subjects.indexOf(a);
      const indexB = subjects.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    }).map(subject => ({ subject, tasks: groups[subject] }));
  }, [tasks]);

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  const addTask = async () => {
    if (!newTaskTitle.trim() || isAddingTask) return;
    
    if (isBatchMode) {
      const parsed = parseBatchTasks(newTaskTitle);
      if (parsed.length === 0) return;
      setBatchParsedTasks(parsed);
      setIsBatchConfirmModalOpen(true);
      return;
    }

    setIsAddingTask(true);
    try {
      await db.tasks.add({
        title: newTaskTitle, subject: newTaskSubject, points: calculatedPoints,
        completed: false, date: selectedDate, user_name: userName
      });
      setNewTaskTitle('');
      setIsAddingFormOpen(false);
      refreshTasks();
    } catch (error) {
      Alert.alert(t('common.error'), t('home.addTaskError') || 'Failed to add task');
    } finally {
      setIsAddingTask(false);
    }
  };

  const confirmBatchAdd = async () => {
    setIsAddingTask(true);
    try {
      for (const title of batchParsedTasks) {
        const str = `${newTaskSubject}-${title}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = (hash << 5) - hash + str.charCodeAt(i);
          hash |= 0;
        }
        const pts = (Math.abs(hash) % 26) + 10;
        
        await db.tasks.add({
          title: title, 
          subject: newTaskSubject, 
          points: pts,
          completed: false, 
          date: selectedDate, 
          user_name: userName
        });
      }
      setNewTaskTitle('');
      setIsAddingFormOpen(false);
      setIsBatchConfirmModalOpen(false);
      refreshTasks();
    } catch (error) {
      Alert.alert(t('common.error'), t('home.addTaskError') || 'Failed to add tasks');
    } finally {
      setIsAddingTask(false);
    }
  };

  const selectDate = (date) => {
    setSelectedDate(date);
    setIsDatePickerOpen(false);
    refreshTasks();
  };

  const changeDate = (days) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const dateStr = currentDate.toISOString().split('T')[0];
    selectDate(dateStr);
  };

  const toggleTask = async (task) => {
    if (isLocked && task.completed) {
      Alert.alert(t('common.notice'), t('home.lockedMessage'));
      return;
    }
    const newStatus = !task.completed;
    await db.tasks.update(task.id, { completed: newStatus });
    if (newStatus) triggerConfetti();
  };

  const deleteTask = async (id) => {
    Alert.alert(
      t('common.confirm'),
      t('home.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: async () => {
          await db.tasks.delete(id);
          refreshTasks();
        }}
      ]
    );
  };

  if (isInitialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 font-bold text-lg dark:text-white">Stitch Challenger</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark" contentContainerStyle={{ padding: 20 }}>
      {/* Header */}
      <View className="flex flex-col gap-4 mb-8">
        <Text className="text-3xl font-black tracking-tight dark:text-white">
          Hi {userName}, here is your mission!
        </Text>
        <View className="flex flex-row items-center gap-2">
          <TouchableOpacity onPress={() => changeDate(-1)} className="p-2">
            <ChevronLeft size={24} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsDatePickerOpen(true)} className="flex flex-row items-center gap-2 bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-800">
            <Calendar size={20} color="#6366f1" />
            <Text className="text-lg font-bold dark:text-white">{formatDateDisplay(selectedDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeDate(1)} className="p-2">
            <ChevronRight size={24} color="#64748b" />
          </TouchableOpacity>
          {!isToday && (
            <TouchableOpacity onPress={() => selectDate(today)} className="bg-primary/10 px-3 py-1.5 rounded-lg">
              <Text className="text-primary font-bold">Today</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress Card */}
      {tasks.length > 0 && (
        <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
          <View className="flex flex-row justify-between items-end mb-4">
            <View>
              <Text className="text-xl font-bold dark:text-white">{t('home.progress')}</Text>
              <Text className="text-text-sub-light dark:text-text-sub-dark text-xs">
                {progressPercent === 100 ? 'Mission Accomplished! 🏆' : 'Keep going! 🔥'}
              </Text>
            </View>
            <Text className="text-3xl font-black text-primary">{progressPercent}%</Text>
          </View>
          <View className="h-4 w-full bg-background-light dark:bg-background-dark rounded-full overflow-hidden p-1">
            <View className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </View>
        </View>
      )}

      {/* Tasks Section */}
      <View className="flex flex-col gap-6">
        <View className="flex flex-row justify-between items-center">
          <Text className="text-2xl font-black dark:text-white flex flex-row items-center">
            <CheckCircle2 size={24} color="#6366f1" /> {t('home.title')}
          </Text>
          <TouchableOpacity onPress={() => setIsAddingFormOpen(!isAddingFormOpen)} className="bg-primary px-4 py-2 rounded-xl">
            <Text className="text-white font-bold">{isAddingFormOpen ? 'Close' : 'Add Task'}</Text>
          </TouchableOpacity>
        </View>

        {isAddingFormOpen && (
          <View className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border-2 border-primary/20 shadow-lg">
            <View className="flex flex-row justify-between items-center mb-2">
              <Text className="text-gray-500 font-bold dark:text-gray-400">
                {isBatchMode ? '批量输入多项作业' : '输入作业内容'}
              </Text>
              <TouchableOpacity 
                onPress={() => setIsBatchMode(!isBatchMode)}
                className="flex flex-row items-center gap-2"
              >
                <View className={`size-5 rounded border items-center justify-center ${isBatchMode ? 'bg-primary border-primary' : 'border-gray-400 dark:border-gray-600'}`}>
                  {isBatchMode && <Check size={12} color="white" />}
                </View>
                <Text className="text-gray-600 dark:text-gray-300 font-bold">批量</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              className="bg-background-light dark:bg-background-dark p-4 rounded-xl font-bold dark:text-white mb-4"
              placeholder={isBatchMode ? '例如：1.抄写生字 2.背诵课文...' : t('home.inputs.placeholder')}
              placeholderTextColor="#94a3b8"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              multiline={isBatchMode}
              style={isBatchMode ? { minHeight: 80, textAlignVertical: 'top' } : {}}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {subjects.map(s => (
                <TouchableOpacity 
                  key={s} 
                  onPress={() => setNewTaskSubject(s)}
                  className={`mr-2 px-4 py-2 rounded-full ${newTaskSubject === s ? 'bg-primary' : 'bg-gray-100 dark:bg-gray-800'}`}
                >
                  <Text className={newTaskSubject === s ? 'text-white' : 'text-gray-600 dark:text-gray-400'}>{t(`home.subjects.${s}`)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={addTask} disabled={isAddingTask} className="bg-primary p-4 rounded-xl items-center flex flex-row justify-center gap-2">
              {isAddingTask && <ActivityIndicator color="white" size="small" />}
              <Text className="text-white font-black uppercase">{isAddingTask ? 'Adding...' : t('home.buttons.add')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {tasks.length === 0 ? (
          <View className="py-16 items-center bg-surface-light dark:bg-surface-dark rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <Book size={48} color="#cbd5e1" />
            <Text className="text-xl font-black text-gray-400 mt-4">{t('home.noTasksTitle')}</Text>
          </View>
        ) : (
          groupedTasks.map(group => (
            <View key={group.subject} className={`p-4 rounded-3xl ${subjectColors[group.subject]?.bg || 'bg-gray-100'} ${subjectColors[group.subject]?.darkBg || 'dark:bg-gray-900/30'}`}>
              <Text className={`text-sm font-black uppercase mb-3 ${subjectColors[group.subject]?.text}`}>
                {t(`home.subjects.${group.subject}`)}
              </Text>
              <View className="flex flex-col gap-2">
                {group.tasks.map(task => (
                  <View key={task.id} className={`flex flex-row items-center bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm ${task.completed ? 'opacity-50' : ''}`}>
                    <TouchableOpacity onPress={() => toggleTask(task)} className={`size-8 rounded-full border-2 items-center justify-center ${task.completed ? 'bg-primary border-primary' : 'border-gray-200 dark:border-gray-700'}`}>
                      {task.completed && <Check size={16} color="white" />}
                    </TouchableOpacity>
                    <Text className={`flex-1 ml-4 text-lg font-bold dark:text-white ${task.completed ? 'line-through text-gray-400' : ''}`}>{task.title}</Text>
                    <View className="flex flex-row items-center gap-2">
                      <Text className="text-sm font-bold text-gray-400">+{task.points} pts</Text>
                      <TouchableOpacity onPress={() => deleteTask(task.id)} className="p-2">
                        <Trash2 size={18} color="#cbd5e1" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Batch Confirm Modal */}
      <Modal visible={isBatchConfirmModalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center p-6">
          <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl max-h-[80%]">
            <View className="flex flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black dark:text-white">确认批量添加</Text>
              <TouchableOpacity onPress={() => setIsBatchConfirmModalOpen(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <Text className="text-gray-500 mb-4 dark:text-gray-400">即将添加以下 {batchParsedTasks.length} 项作业（科目：{t(`home.subjects.${newTaskSubject}`)}）：</Text>
            <ScrollView className="mb-6">
              {batchParsedTasks.map((task, idx) => (
                <View key={idx} className="bg-background-light dark:bg-background-dark p-3 rounded-xl mb-2">
                  <Text className="dark:text-white font-bold">{idx + 1}. {task}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={confirmBatchAdd} disabled={isAddingTask} className="bg-primary p-4 rounded-xl items-center flex flex-row justify-center gap-2">
              {isAddingTask && <ActivityIndicator color="white" size="small" />}
              <Text className="text-white font-black uppercase">确认添加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Basic Modal for Date Picker */}
      <Modal visible={isDatePickerOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center p-6">
          <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl">
            <View className="flex flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black dark:text-white">Select Date</Text>
              <TouchableOpacity onPress={() => setIsDatePickerOpen(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => selectDate(today)} className="bg-background-light dark:bg-background-dark p-4 rounded-xl mb-4 items-center">
              <Text className="font-bold dark:text-white">Go to Today</Text>
            </TouchableOpacity>
            {/* For real date picking, one would usually use @react-native-community/datetimepicker */}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
