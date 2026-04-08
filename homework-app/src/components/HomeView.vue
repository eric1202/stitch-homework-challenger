<script setup>
import { ArrowDown, Book, Calendar, CalendarDays, CalendarPlus, Check, CheckCircle2, ChevronLeft, ChevronRight, Plus, RotateCw, Trash2, X } from 'lucide-vue-next';

import { ref, computed, onUnmounted, onMounted } from 'vue';
import { db, liveQuery } from '../db';
import { useI18n } from 'vue-i18n';
import SplitText from './SplitText.vue';
import gsap from 'gsap';
import { Rocket } from 'lucide-vue-next';


import { getTodayDateString, formatDateDisplay } from '../utils/date';
import { triggerConfetti } from '../utils/confetti';

const { t } = useI18n();
const today = getTodayDateString();
const selectedDate = ref(today); // 当前选择的日期
const isDatePickerOpen = ref(false); // 日期选择器是否打开
const newTaskTitle = ref('');
const newTaskSubject = ref('Math'); 

const calculatedPoints = computed(() => {
  if (!newTaskTitle.value.trim()) return 0;
  const str = `${newTaskSubject.value}-${newTaskTitle.value.trim()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 26) + 10;
});

const isAddingFormOpen = ref(false);
const isAddingTask = ref(false);
const isRefreshing = ref(false);
const pullStartY = ref(0);
const pullDistance = ref(0);
const isPulling = ref(false);
const taskListRef = ref(null);
const isInitialLoading = ref(true);

const subjects = ["Chinese", 'Math', 'English', 'Science', 'Art', 'Reading', 'Sports', 'Other'];
const subjectColors = {
  Chinese: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
  Math: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300',
  English: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
  Science: 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300',
  Art: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300',
  Reading: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
  Sports: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  Other: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
};

const tasks = ref([]);
const userName = ref('Hero');
let tasksSub = null;

// Helper to refresh tasks manually
const refreshTasks = async () => {
  if (isRefreshing.value) return;
  
  isRefreshing.value = true;
  try {
    const result = await db.tasks.where('user_name').equals(userName.value).toArray();
    tasks.value = result.filter(t => t.date === selectedDate.value);
  } catch (error) {
    console.error('Failed to refresh tasks:', error);
    alert('刷新失败，请重试');
  } finally {
    setTimeout(() => {
      isRefreshing.value = false;
    }, 300);
  }
};

// Helper to update task subscription
const updateTasksSub = (name) => {
  if (tasksSub) tasksSub.unsubscribe();
  tasksSub = liveQuery(() => 
    db.tasks.where('user_name').equals(name).toArray()
  ).subscribe(result => {
    tasks.value = result.filter(t => t.date === selectedDate.value);
    if (isInitialLoading.value) {
       // 给一点点延迟让动画更平滑
       setTimeout(() => {
         isInitialLoading.value = false;
       }, 600);
    }
  });
};

// Sync username and trigger task sync
const nameSubscription = liveQuery(() => db.settings.get('userName'))
  .subscribe(result => {
    const newName = result?.value || 'Hero';
    if (newName !== userName.value || !tasksSub) {
      userName.value = newName;
      updateTasksSub(newName);
    }
  });

// 下拉刷新处理
const handleTouchStart = (e) => {
  // 只在页面顶部时才能下拉刷新
  if (window.scrollY === 0 && taskListRef.value) {
    const rect = taskListRef.value.getBoundingClientRect();
    if (rect.top >= 0 && e.touches[0].clientY > rect.top) {
      pullStartY.value = e.touches[0].clientY;
      isPulling.value = true;
    }
  }
};

const handleTouchMove = (e) => {
  if (!isPulling.value || window.scrollY > 0) {
    isPulling.value = false;
    pullDistance.value = 0;
    return;
  }
  
  const currentY = e.touches[0].clientY;
  const distance = currentY - pullStartY.value;
  
  if (distance > 0) {
    pullDistance.value = Math.min(distance, 100);
    e.preventDefault();
  } else {
    isPulling.value = false;
    pullDistance.value = 0;
  }
};

const handleTouchEnd = async () => {
  if (pullDistance.value > 50 && !isRefreshing.value) {
    isRefreshing.value = true;
    try {
      await refreshTasks();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setTimeout(() => {
        isRefreshing.value = false;
        pullDistance.value = 0;
        isPulling.value = false;
      }, 300);
    }
  } else {
    pullDistance.value = 0;
    isPulling.value = false;
  }
};

onMounted(() => {
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
});

onUnmounted(() => {
  if (tasksSub) tasksSub.unsubscribe();
  nameSubscription.unsubscribe();
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
});



const addTask = async () => {
  if (!newTaskTitle.value.trim() || isAddingTask.value) return;
  
  isAddingTask.value = true;
  try {
    await db.tasks.add({
      title: newTaskTitle.value,
      subject: newTaskSubject.value,
      points: calculatedPoints.value,
      completed: false,
      date: selectedDate.value, // 使用选中的日期
      user_name: userName.value
    });
    
    newTaskTitle.value = '';
    isAddingFormOpen.value = false;
    
    // 刷新列表
    await refreshTasks();
  } catch (error) {
    console.error('Failed to add task:', error);
    alert(t('home.addTaskError') || '添加任务失败，请重试');
  } finally {
    isAddingTask.value = false;
  }
};

// 日期选择相关函数
const openDatePicker = () => {
  isDatePickerOpen.value = true;
};

const closeDatePicker = () => {
  isDatePickerOpen.value = false;
};

const selectDate = (date) => {
  selectedDate.value = date;
  closeDatePicker();
  refreshTasks();
};

const goToToday = () => {
  selectedDate.value = today;
  refreshTasks();
};

const changeDate = (days) => {
  const currentDate = new Date(selectedDate.value);
  currentDate.setDate(currentDate.getDate() + days);
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  selectedDate.value = `${year}-${month}-${day}`;
  refreshTasks();
};

const isToday = computed(() => selectedDate.value === today);

const isLocked = computed(() => tasks.value.length > 0 && tasks.value.every(t => t.completed));

const groupedTasks = computed(() => {
  const groups = {};
  tasks.value.forEach(task => {
    const s = task.subject || 'Other';
    if (!groups[s]) {
      groups[s] = [];
    }
    groups[s].push(task);
  });
  
  // Sort subjects based on the predefined subjects list
  const sortedSubjects = Object.keys(groups).sort((a, b) => {
    const indexA = subjects.indexOf(a);
    const indexB = subjects.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return sortedSubjects.map(subject => ({
    subject,
    tasks: groups[subject]
  }));
});

const toggleTask = async (task) => {
  if (isLocked.value && task.completed) {
    alert(t('home.lockedMessage'));
    return;
  }
  const newStatus = !task.completed;
  await db.tasks.update(task.id, { completed: newStatus });
  
  if (newStatus) {
    triggerConfetti();
  }
};

const deleteTask = async (id) => {
  if (confirm(t('home.deleteConfirm'))) {
    await db.tasks.delete(id);
    await refreshTasks();
  }
};
</script>

<template>
  <div class="flex flex-col gap-8 pb-10">
    <!-- Initial Loading Overlay -->
    <Transition name="fade">
      <div v-if="isInitialLoading" class="fixed inset-0 z-[100] bg-background-light dark:bg-background-dark flex flex-col items-center justify-center gap-6">
        <div class="relative">
          <div class="size-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <Rocket class="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
        <div class="flex flex-col items-center gap-2">
          <h2 class="text-3xl font-black text-text-main-light dark:text-text-main-dark tracking-tight">Stitch Challenger</h2>
          <div class="flex items-center gap-2">
            <div class="size-1.5 bg-primary rounded-full animate-bounce"></div>
            <div class="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div class="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    </Transition>
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="flex flex-col gap-2">
        <SplitText
          :text="t('home.greeting', { name: userName }).replace(/<br\s*\/?>/gi, ' ')"
          className="text-4xl md:text-5xl font-black tracking-tight leading-tight"
          :delay="100"
          :duration="0.6"
          :from="{ opacity: 0, y: 40 }"
          :to="{ opacity: 1, y: 0 }"
          textAlign="left"
        />
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-1.5 md:gap-2">
            <!-- 前一天按钮 -->
            <button 
              @click="changeDate(-1)"
              class="p-1.5 md:p-2 rounded-lg md:rounded-xl text-text-sub-light dark:text-text-sub-dark hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95"
              title="前一天"
            >
              <ChevronLeft  class=" text-lg md:text-xl"/>
            </button>
            
            <!-- 日期显示和选择器触发按钮 -->
            <button 
              @click="openDatePicker"
              class="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl text-text-sub-light dark:text-text-sub-dark hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95 group"
            >
              <Calendar  class=" text-primary text-lg md:text-xl group-hover:scale-110 transition-transform"/>
              <p class="text-base md:text-lg font-medium">{{ formatDateDisplay(selectedDate) }}</p>
            </button>
            
            <!-- 后一天按钮 -->
            <button 
              @click="changeDate(1)"
              class="p-1.5 md:p-2 rounded-lg md:rounded-xl text-text-sub-light dark:text-text-sub-dark hover:bg-primary/10 hover:text-primary transition-all duration-200 active:scale-95"
              title="后一天"
            >
              <ChevronRight  class=" text-lg md:text-xl"/>
            </button>
          </div>
          
          <!-- 返回今天按钮 -->
          <button 
            v-if="!isToday"
            @click="goToToday"
            class="flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold text-xs md:text-sm transition-all duration-200 active:scale-95"
          >
            <CalendarDays  class=" text-sm md:text-base"/>
            <span>今天</span>
          </button>
        </div>
      </div>
      <button 
        @click="isAddingFormOpen = !isAddingFormOpen"
        class="hidden md:flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95 duration-200"
      >
        <Plus  class=" font-bold"/>
        <span>{{ isAddingFormOpen ? t('settings.danger.resetBtn') : t('home.addTaskTitle') }}</span>
      </button>
    </header>

    <!-- Date Picker Modal -->
    <Transition name="modal">
      <div v-if="isDatePickerOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4" @click="closeDatePicker">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div 
          class="relative bg-surface-light dark:bg-surface-dark rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 max-w-md w-full"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-black flex items-center gap-2">
              <Calendar  class=" text-primary text-3xl"/>
              选择日期
            </h3>
            <button 
              @click="closeDatePicker"
              class="p-2 rounded-xl text-text-sub-light hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 active:scale-95"
            >
              <X  class=" text-2xl"/>
            </button>
          </div>

          <!-- Quick Date Selection -->
          <div class="flex flex-col gap-3 mb-6">
            <p class="text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">快捷选择</p>
            <div class="grid grid-cols-2 gap-2">
              <button 
                @click="selectDate(today)"
                class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all duration-200 active:scale-95"
                :class="selectedDate === today ? 'bg-primary text-white' : 'bg-background-light dark:bg-background-dark hover:bg-primary/10'"
              >
                <CalendarDays  class=" text-xl"/>
                <span>今天</span>
              </button>
              <button 
                @click="selectDate((() => {
                  const tomorrow = new Date(today);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const year = tomorrow.getFullYear();
                  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                  const day = String(tomorrow.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                })())"
                class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-background-light dark:bg-background-dark hover:bg-primary/10 font-bold transition-all duration-200 active:scale-95"
              >
                <CalendarPlus  class=" text-xl"/>
                <span>明天</span>
              </button>
            </div>
          </div>

          <!-- Custom Date Input -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">自定义日期</label>
            <input 
              type="date" 
              :value="selectedDate"
              @change="(e) => selectDate(e.target.value)"
              class="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-4 font-bold transition-all outline-none text-base"
            >
          </div>

          <!-- Selected Date Display -->
          <div class="mt-6 p-4 bg-primary/10 rounded-xl">
            <p class="text-xs font-bold text-text-sub-light uppercase tracking-widest mb-1">当前选择</p>
            <p class="text-lg font-black text-primary">{{ formatDateDisplay(selectedDate) }}</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Progress Card -->
    <section v-if="tasks.length > 0" class="bg-surface-light dark:bg-surface-dark p-4 md:p-6 md:px-7 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
      <div class="absolute -right-10 -top-10 size-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
      
      <div class="flex flex-col gap-3 md:gap-5 relative z-10">
        <div class="flex justify-between items-end">
          <div>
            <h3 class="text-lg md:text-xl font-bold mb-1">{{ t('home.progress') }}</h3>
            <p v-if="tasks.filter(t => t.completed).length === tasks.length" class="text-text-sub-light dark:text-text-sub-dark text-xs md:text-sm font-medium">Mission Accomplished! 🏆</p>
            <p v-else class="text-text-sub-light dark:text-text-sub-dark text-xs md:text-sm font-medium">Keep going! You are doing great. 🔥</p>
          </div>
          <div class="text-2xl md:text-3xl font-black text-primary">
            {{ tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) }}%
          </div>
        </div>
        
        <div class="h-4 md:h-5 w-full bg-background-light dark:bg-background-dark rounded-full overflow-hidden p-1">
          <div 
            class="h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]" 
            :style="{ width: `${tasks.length === 0 ? 0 : (tasks.filter(t => t.completed).length / tasks.length) * 100}%` }"
          ></div>
        </div>
        
        <div class="flex justify-between text-xs md:text-sm font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">
          <span>{{ tasks.length }} {{ t('app.nav.tasks') }}</span>
          <span>{{ tasks.filter(t => t.completed).length }} of {{ tasks.length }} {{ t('analytics.status.completed') }}</span>
        </div>
      </div>
    </section>

    <!-- Add Task Dialog/Form (Inline for simplicity now) -->
    <Transition name="expand">
      <div v-if="isAddingFormOpen" class="bg-surface-light dark:bg-surface-dark p-4 md:p-6 rounded-2xl md:rounded-3xl border-2 border-primary/20 shadow-xl shadow-primary/5">
        <div class="grid md:grid-cols-12 gap-3 md:gap-5">
           <div class="md:col-span-12">
             <h3 class="text-lg md:text-xl font-bold mb-3 md:mb-4">{{ t('home.addTaskTitle') }} ✏️</h3>
           </div>
           <div class="md:col-span-5 flex flex-col gap-1.5 md:gap-2">
             <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('home.inputs.taskName') }}</label>
             <input v-model="newTaskTitle" type="text" class="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-xl md:rounded-2xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base" :placeholder="t('home.inputs.placeholder')">
           </div>
           <div class="md:col-span-3 flex flex-col gap-1.5 md:gap-2">
             <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('home.inputs.subject') }}</label>
             <select v-model="newTaskSubject" class="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-xl md:rounded-2xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base">
                <option v-for="s in subjects" :key="s" :value="s">{{ t(`home.subjects.${s}`) }}</option>
             </select>
           </div>
           <div class="md:col-span-2 flex flex-col gap-1.5 md:gap-2">
             <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('home.inputs.points') }}</label>
             <div class="w-full h-full bg-background-light dark:bg-background-dark border-transparent rounded-xl md:rounded-2xl p-3 md:p-4 font-black transition-all outline-none text-center text-sm md:text-base text-primary/80 flex items-center justify-center select-none shadow-inner">
               -
             </div>
           </div>
           <div class="md:col-span-2 flex items-end">
             <button 
               @click="addTask" 
               :disabled="isAddingTask"
               class="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 md:py-4 rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 duration-200 uppercase tracking-widest text-[10px] md:text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
               <RotateCw  
                 v-if="isAddingTask"
                 class=" animate-spin text-base md:text-lg"
               />
               <span>{{ isAddingTask ? '添加中...' : t('home.buttons.add') }}</span>
             </button>
           </div>
        </div>
      </div>
    </Transition>

    <!-- Task List -->
    <section class="flex flex-col gap-3 md:gap-5" ref="taskListRef">
      <!-- Pull to Refresh Indicator -->
      <div 
        v-if="pullDistance > 0 || isRefreshing"
        class="flex items-center justify-center py-2 transition-all duration-200"
        :style="{ 
          height: `${Math.min(pullDistance, 60)}px`,
          opacity: Math.min(pullDistance / 50, 1)
        }"
      >
        <div class="flex items-center gap-2 text-primary">
          <component :is="isRefreshing ? RotateCw : ArrowDown"  
            class=" transition-transform duration-200"
            :class="{ 'animate-spin': isRefreshing }"
            :style="{ transform: isRefreshing ? 'rotate(0deg)' : `rotate(${Math.min(pullDistance * 3.6, 180)}deg)` }"
          />
          <span class="text-xs font-bold">{{ isRefreshing ? '刷新中...' : '下拉刷新' }}</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between mb-2 md:mb-0">
        <h3 class="text-lg md:text-2xl font-black flex items-center gap-1.5 md:gap-2">
          <CheckCircle2  class=" text-primary text-xl md:text-3xl"/>
          {{ t('home.title') }}
        </h3>
        <button 
          @click="refreshTasks"
          :disabled="isRefreshing"
          class="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          :title="isRefreshing ? '刷新中...' : '刷新列表'"
        >
          <RotateCw  
            class=" text-2xl transition-transform duration-200"
            :class="{ 'animate-spin': isRefreshing }"
          />
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="tasks.length === 0" class="py-10 md:py-16 text-center bg-surface-light dark:bg-surface-dark rounded-2xl md:rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
        <div class="size-16 md:size-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 text-gray-300">
          <Book  class=" text-4xl md:text-5xl"/>
        </div>
        <p class="text-lg md:text-xl font-black text-gray-400">{{ t('home.noTasksTitle') }}</p>
        <p class="text-sm md:text-base text-gray-300 font-bold">{{ t('home.noTasksDesc') }}</p>
        <button @click="isAddingFormOpen = true" class="mt-4 md:mt-6 text-primary font-bold flex items-center justify-center gap-1 mx-auto hover:underline text-sm md:text-base">
          <Plus  class=""/> {{ t('home.addTaskTitle') }}
        </button>
      </div>

      <div 
        v-for="group in groupedTasks" 
        :key="group.subject" 
        class="flex flex-col gap-2 md:gap-4 p-2.5 md:p-5 rounded-xl md:rounded-[2rem] transition-all duration-300"
        :class="[
          subjectColors[group.subject]?.split(' ').filter(c => c.startsWith('bg-') || c.includes('/30')).join(' ') || 'bg-slate-50 dark:bg-slate-900/20'
        ]"
      >
        <div class="flex items-center justify-between px-1">
          <h4 class="text-xs md:text-lg font-black uppercase tracking-[0.15em] md:tracking-[0.2em] flex items-center gap-1.5 md:gap-3" :class="subjectColors[group.subject]?.split(' ')[0]">
            <span class="size-1.5 md:size-3 rounded-full shadow-sm" :class="subjectColors[group.subject]?.split(' ')[0].replace('text-', 'bg-')"></span>
            {{ t(`home.subjects.${group.subject}`) }}
          </h4>
          <span class="text-[9px] md:text-xs font-bold opacity-50">{{ group.tasks.length }} {{ t('app.nav.tasks') }}</span>
        </div>
        
        <div class="flex flex-col gap-1.5 md:gap-3">
          <TransitionGroup name="list">
            <div 
              v-for="task in group.tasks" 
              :key="task.id"
              class="group flex items-center gap-2 md:gap-5 bg-surface-light dark:bg-surface-dark py-2 px-2.5 md:py-3 md:px-5 rounded-lg md:rounded-2xl shadow-sm border-2 border-transparent hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5"
              :class="{ 'opacity-60 grayscale-[0.5]': task.completed }"
            >
              <div class="relative flex items-center justify-center flex-shrink-0">
                <input 
                  type="checkbox" 
                  :checked="task.completed" 
                  @change="toggleTask(task)"
                  :disabled="isLocked && task.completed"
                  class="custom-checkbox appearance-none size-5 md:size-8 rounded-full border-2 border-gray-200 dark:border-gray-700 checked:bg-primary checked:border-primary transition-all cursor-pointer ring-offset-1 md:ring-offset-2 ring-primary/20 focus:ring-2 md:focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                <Check  v-if="task.completed" class=" absolute pointer-events-none text-white font-black text-xs md:text-lg"/>
              </div>

              <div class="flex-1 flex items-center justify-between gap-2 md:gap-3 min-w-0">
                <h4 class="flex-1 text-base md:text-lg font-bold text-text-main-light dark:text-text-main-dark group-hover:text-primary transition-colors duration-300 break-words leading-snug pr-2" :class="{ 'line-through decoration-2 decoration-primary/50 text-text-sub-light opacity-70': task.completed }">
                  {{ task.title }}
                </h4>

                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="text-xs md:text-sm font-bold text-text-sub-light whitespace-nowrap">+{{ task.points }} pts</span>
                  <button @click="deleteTask(task.id)" class="p-1.5 md:p-3 text-gray-300 hover:text-red-500 transition-colors rounded-lg md:rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2  class=" text-base md:text-xl"/>
                  </button>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </section>

    <!-- Mobile Floating Add Button -->
    <button 
      @click="isAddingFormOpen = true"
      class="md:hidden fixed bottom-24 right-6 size-16 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-50 active:scale-90 transition-transform duration-200"
    >
      <Plus  class=" text-3xl font-black"/>
    </button>
  </div>
</template>

<style scoped>
.expand-enter-active, .expand-leave-active {
  transition: all 0.3s ease-out;
  max-height: 400px;
}
.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
  margin-bottom: -1.5rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-move {
  transition: transform 0.4s ease;
}

.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-active > div:last-child,
.modal-leave-active > div:last-child {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div:last-child,
.modal-leave-to > div:last-child {
  transform: scale(0.9) translateY(40px);
}
</style>
