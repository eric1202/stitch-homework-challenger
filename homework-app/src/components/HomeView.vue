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

const parseBatchTasks = (text) => {
  let parts = text.split(/(?:\s+)?\d+\s*[.、,，]+\s*/);
  if (parts.length <= 1 && text.includes('\n')) {
      parts = text.split(/\n+/);
  }
  return parts.map(p => p.trim()).filter(p => p.length > 0);
};

const isBatchMode = ref(false);
const isBatchConfirmModalOpen = ref(false);
const batchParsedTasks = ref([]);

const calculatedPoints = computed(() => {
  if (!newTaskTitle.value.trim()) return 0;
  if (isBatchMode.value) return '-';
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
  Chinese: 'text-subject-chinese bg-subject-chinese/10 dark:bg-subject-chinese/20',
  Math: 'text-subject-math bg-subject-math/10 dark:bg-subject-math/20',
  English: 'text-subject-english bg-subject-english/10 dark:bg-subject-english/20',
  Science: 'text-subject-science bg-subject-science/10 dark:bg-subject-science/20',
  Art: 'text-subject-art bg-subject-art/10 dark:bg-subject-art/20',
  Reading: 'text-subject-reading bg-subject-reading/10 dark:bg-subject-reading/20',
  Sports: 'text-subject-sports bg-subject-sports/10 dark:bg-subject-sports/20',
  Other: 'text-subject-other bg-subject-other/10 dark:bg-subject-other/20',
};

// Raw hex values for inline styles (Tailwind dynamic class names won't work)
const subjectHex = {
  Chinese: '#d44d3e',
  Math: '#3aa6b9',
  English: '#00a878',
  Science: '#f2b84b',
  Art: '#ff6b6b',
  Reading: '#4facfe',
  Sports: '#ff9f43',
  Other: '#5f6258',
};

const getSubjectHex = (subject) => subjectHex[subject] || subjectHex.Other;

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
    alert(t('common.refreshFail'));
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
  
  if (isBatchMode.value) {
    const parsed = parseBatchTasks(newTaskTitle.value);
    if (parsed.length === 0) return;
    batchParsedTasks.value = parsed;
    isBatchConfirmModalOpen.value = true;
    return;
  }

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
    alert(t('home.addTaskError'));
  } finally {
    isAddingTask.value = false;
  }
};

const confirmBatchAdd = async () => {
  isAddingTask.value = true;
  try {
    for (const title of batchParsedTasks.value) {
      const str = `${newTaskSubject.value}-${title}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const pts = (Math.abs(hash) % 26) + 10;
      
      await db.tasks.add({
        title: title, 
        subject: newTaskSubject.value, 
        points: pts,
        completed: false, 
        date: selectedDate.value, 
        user_name: userName.value
      });
    }
    newTaskTitle.value = '';
    isAddingFormOpen.value = false;
    isBatchConfirmModalOpen.value = false;
    await refreshTasks();
  } catch (error) {
    console.error('Failed to batch add tasks:', error);
    alert(t('home.addTaskError'));
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
  <div class="flex flex-col gap-4 md:gap-8 pb-6 md:pb-10">
    <!-- Initial Loading Overlay -->
    <Transition name="fade">
      <div v-if="isInitialLoading" class="fixed inset-0 z-[100] bg-background-main dark:bg-background-main flex flex-col items-center justify-center gap-6">
        <div class="relative">
          <div class="size-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <Rocket class="w-8 h-8 text-primary animate-pulse" />
          </div>
        </div>
        <div class="flex flex-col items-center gap-2">
          <h2 class="text-3xl font-black text-text-main-light dark:text-text-main-dark tracking-tight">Homework Challenger</h2>
          <div class="flex items-center gap-2">
            <div class="size-1.5 bg-primary rounded-full animate-bounce"></div>
            <div class="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div class="size-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </div>
        </div>
      </div>
    </Transition>
    <!-- Hero Section -->
    <header class="flex flex-col gap-4 md:gap-8 mb-2 md:mb-4">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex flex-col gap-4">
          <span class="badge-mainline w-fit">{{ t('home.heroBadge') }}</span>
          <h1 class="text-3xl md:text-7xl font-black text-primary leading-[0.9] -ml-0.5 md:-ml-1">
            {{ t('home.greeting', { name: userName }).split('<br/>')[0] }}
          </h1>
          <p class="text-sm md:text-xl font-medium text-text-sub max-w-xl leading-relaxed">
            {{ t('home.subtitle') }}
          </p>
          
          <div class="flex items-center gap-2 flex-wrap mt-1 md:mt-2">
            <div class="flex items-center gap-1 border-2 border-primary rounded-xl p-1 bg-surface-main shadow-offset-dark">
              <button 
                @click="changeDate(-1)"
                class="p-2 rounded-lg text-text-sub hover:bg-primary/5 hover:text-primary transition-all"
              >
                <ChevronLeft class="size-5"/>
              </button>
              
              <button 
                @click="openDatePicker"
                class="flex items-center gap-2 px-4 py-2 font-bold text-sm text-primary hover:bg-primary/5 transition-all"
              >
                <Calendar class="size-4"/>
                <span>{{ formatDateDisplay(selectedDate) }}</span>
              </button>
              
              <button 
                @click="changeDate(1)"
                class="p-2 rounded-lg text-text-sub hover:bg-primary/5 hover:text-primary transition-all"
              >
                <ChevronRight class="size-5"/>
              </button>
            </div>
            
            <button 
              v-if="!isToday"
              @click="goToToday"
              class="btn-mainline-secondary py-2 px-4 text-xs"
            >
              <CalendarDays class="size-4 inline mr-1"/>
              {{ t('common.today') }}
            </button>
          </div>
        </div>

        <button 
          @click="isAddingFormOpen = !isAddingFormOpen"
          class="btn-mainline whitespace-nowrap flex items-center gap-2 group"
        >
          <Plus class="transition-transform group-hover:rotate-90"/>
          <span>{{ isAddingFormOpen ? t('common.cancel') : t('home.addTaskTitle') }}</span>
        </button>
      </div>
    </header>

    <!-- Date Picker Modal -->
    <Transition name="fade">
      <div v-if="isDatePickerOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background-main/20 backdrop-blur-[2px]" @click="closeDatePicker">
        <div class="card-mainline max-w-md w-full animate-rise" @click.stop>
          <!-- Header -->
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-3xl font-black">{{ t('home.dateModalTitle') }}</h3>
            <button @click="closeDatePicker" class="hover:rotate-90 transition-transform">
              <X class="size-6"/>
            </button>
          </div>

          <div class="flex flex-col gap-6">
            <div class="grid grid-cols-2 gap-4">
              <button @click="selectDate(today)" :class="selectedDate === today ? 'btn-mainline' : 'btn-mainline-secondary'" class="py-4">{{ t('common.today') }}</button>
              <button @click="selectDate((() => {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const year = tomorrow.getFullYear();
                const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
                const day = String(tomorrow.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              })())" class="btn-mainline-secondary py-4">{{ t('common.tomorrow') }}</button>
            </div>
            
            <input type="date" :value="selectedDate" @change="(e) => selectDate(e.target.value)" class="input-mainline">
          </div>
        </div>
      </div>
    </Transition>

    <!-- Progress Card -->
    <section v-if="tasks.length > 0" class="card-mainline !p-0 overflow-hidden">
      <div class="flex flex-col md:flex-row">
        <div class="flex-1 p-4 md:p-8 border-b-2 md:border-b-0 md:border-r-2 border-primary bg-accent-green/5">
          <span class="badge-mainline mb-2 md:mb-4">{{ t('home.progressBadge') }}</span>
          <h3 class="text-2xl md:text-4xl font-black mb-1 md:mb-2">{{ t('home.progress') }}</h3>
          <p class="text-text-sub font-medium max-w-sm">
            {{ tasks.filter(t => t.completed).length === tasks.length ? t('home.progressDone') : t('home.progressPending') }}
          </p>
        </div>
        <div class="w-full md:w-64 p-4 md:p-8 flex flex-col items-center justify-center bg-surface-main">
          <div class="text-4xl md:text-6xl font-black text-primary leading-none mb-1 md:mb-2">
            {{ tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) }}%
          </div>
          <div class="text-xs font-black uppercase tracking-widest text-text-sub">{{ t('analytics.status.completed') }}</div>
        </div>
      </div>
    </section>

    <!-- Add Task Form -->
    <Transition name="fade">
      <div v-if="isAddingFormOpen" class="card-mainline !bg-accent-amber/5 animate-rise">
        <div class="flex flex-col gap-4 md:gap-8">
          <div class="flex items-center justify-between">
            <h3 class="text-xl md:text-3xl font-black">{{ t('home.addTaskTitle') }}</h3>
            <div class="flex items-center gap-4">
               <button @click="isBatchMode = !isBatchMode" class="text-xs font-black uppercase tracking-widest hover:underline">
                 {{ isBatchMode ? t('home.batchToggleOff') : t('home.batchToggleOn') }}
               </button>
            </div>
          </div>

          <div class="grid md:grid-cols-12 gap-3 md:gap-6">
            <div class="md:col-span-12 flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('home.inputs.taskName') }}</label>
              <textarea v-if="isBatchMode" v-model="newTaskTitle" rows="4" class="input-mainline resize-none" :placeholder="t('home.batchPlaceholder')"></textarea>
              <input v-else v-model="newTaskTitle" type="text" class="input-mainline" :placeholder="t('home.inputs.placeholder')">
            </div>

            <div class="md:col-span-6 flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('home.inputs.subject') }}</label>
              <select v-model="newTaskSubject" class="input-mainline appearance-none">
                <option v-for="s in subjects" :key="s" :value="s">{{ t(`home.subjects.${s}`) }}</option>
              </select>
            </div>

            <div class="md:col-span-3 flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('home.inputs.points') }}</label>
              <div class="input-mainline bg-primary/5 flex items-center justify-center font-black">
                {{ isBatchMode ? '-' : (calculatedPoints || '-') }}
              </div>
            </div>

            <div class="md:col-span-3 flex items-end">
              <button @click="addTask" :disabled="isAddingTask" class="btn-mainline w-full !py-4 flex items-center justify-center gap-2">
                <RotateCw v-if="isAddingTask" class="animate-spin size-4"/>
                <span>{{ isAddingTask ? t('common.processing') : t('home.buttons.add') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Task List -->
    <section class="flex flex-col gap-2 md:gap-5" ref="taskListRef">
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
            <span class="text-xs font-bold">{{ isRefreshing ? t('common.refreshing') : t('common.pullToRefresh') }}</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between mb-3 md:mb-8">
        <div class="flex items-center gap-2 md:gap-4">
          <span class="badge-mainline">{{ t('home.listBadge') }}</span>
          <h2 class="text-2xl md:text-4xl font-black">{{ t('home.title') }}</h2>
        </div>
        <button 
          @click="refreshTasks"
          :disabled="isRefreshing"
          class="btn-mainline-secondary !p-2 !shadow-none hover:rotate-12"
        >
          <RotateCw  
            class="size-5 transition-transform duration-200"
            :class="{ 'animate-spin': isRefreshing }"
          />
        </button>
      </div>
      <!-- Empty State -->
      <div v-if="tasks.length === 0" class="py-10 md:py-16 text-center bg-surface-main rounded-2xl md:rounded-3xl border border-dashed border-primary/20">
        <div class="size-16 md:size-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 text-text-sub opacity-30">
          <Book  class=" text-4xl md:text-5xl"/>
        </div>
        <p class="text-lg md:text-xl font-black text-text-sub opacity-50">{{ t('home.noTasksTitle') }}</p>
        <p class="text-sm md:text-base text-text-sub opacity-40 font-bold">{{ t('home.noTasksDesc') }}</p>
        <button @click="isAddingFormOpen = true" class="mt-4 md:mt-6 text-primary font-bold flex items-center justify-center gap-1 mx-auto hover:underline text-sm md:text-base">
          <Plus  class=""/> {{ t('home.addTaskTitle') }}
        </button>
      </div>

      <div 
        v-for="group in groupedTasks" 
        :key="group.subject" 
        class="flex flex-col gap-4"
      >
        <!-- Subject Group Header -->
        <div 
          class="flex items-center gap-2 md:gap-3 pb-1.5 md:pb-2 border-b-[3px]"
          :style="{ borderColor: getSubjectHex(group.subject) }"
        >
          <span 
            class="inline-block size-2.5 md:size-3 rounded-full flex-shrink-0" 
            :style="{ backgroundColor: getSubjectHex(group.subject) }"
          ></span>
          <h4 
            class="text-base md:text-xl font-black uppercase tracking-widest"
            :style="{ color: getSubjectHex(group.subject) }"
          >
            {{ t(`home.subjects.${group.subject}`) }}
          </h4>
          <span 
            class="text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded-sm"
            :style="{ backgroundColor: getSubjectHex(group.subject) + '18', color: getSubjectHex(group.subject) }"
          >{{ group.tasks.length }}</span>
        </div>
        
        <!-- Task Cards -->
        <div class="flex flex-col gap-1.5 md:gap-3">
          <TransitionGroup name="list">
            <div 
              v-for="task in group.tasks" 
              :key="task.id"
              class="group flex items-center gap-3 md:gap-6 card-mainline !p-0 overflow-hidden"
              :class="{ 'opacity-60 grayscale-[0.5] !shadow-none !border-primary/20': task.completed }"
            >
              <!-- Colored left accent bar -->
              <div 
                class="self-stretch w-1 md:w-1.5 flex-shrink-0 transition-all"
                :style="{ backgroundColor: task.completed ? 'transparent' : getSubjectHex(group.subject) }"
              ></div>

              <div class="flex items-center gap-3 md:gap-6 flex-1 py-3 pr-3 md:py-4 md:pr-4">
                <div class="relative flex items-center justify-center flex-shrink-0">
                  <input 
                    type="checkbox" 
                    :checked="task.completed" 
                    @change="toggleTask(task)"
                    :disabled="isLocked && task.completed"
                    class="custom-checkbox appearance-none size-6 md:size-8 border-2 rounded-sm transition-all cursor-pointer"
                    :style="{ borderColor: getSubjectHex(group.subject), backgroundColor: task.completed ? getSubjectHex(group.subject) : 'transparent' }"
                  >
                </div>

                <div class="flex-1 flex items-center justify-between gap-4 min-w-0">
                  <h4 class="flex-1 text-sm md:text-xl font-bold text-text-main transition-colors leading-snug" :class="{ 'line-through opacity-70': task.completed }">
                    {{ task.title }}
                  </h4>

                  <div class="flex items-center gap-4 flex-shrink-0">
                    <span 
                      class="text-xs md:text-sm font-black whitespace-nowrap"
                      :style="{ color: getSubjectHex(group.subject) }"
                    >+{{ task.points }} pts</span>
                    <button @click="deleteTask(task.id)" class="text-text-sub hover:text-accent-red transition-colors">
                      <Trash2 class="size-4 md:size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>

    </section>

    <!-- Batch Confirm Modal -->
    <Transition name="fade">
      <div v-if="isBatchConfirmModalOpen" class="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background-main/20 backdrop-blur-[2px]" @click="isBatchConfirmModalOpen = false">
        <div class="card-mainline max-w-md w-full animate-rise flex flex-col" @click.stop>
          <!-- Header -->
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-3xl font-black">{{ t('home.batchConfirmTitle') }}</h3>
            <button @click="isBatchConfirmModalOpen = false" class="hover:rotate-90 transition-transform">
              <X class="size-6"/>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto mb-8 flex flex-col gap-4">
            <div 
              v-for="(task, idx) in batchParsedTasks" 
              :key="idx" 
              class="p-4 border-2 border-primary/10 rounded-lg bg-primary/5 font-bold"
            >
              {{ idx + 1 }}. {{ task }}
            </div>
          </div>

          <button @click="confirmBatchAdd" :disabled="isAddingTask" class="btn-mainline w-full !py-4 flex items-center justify-center gap-2">
            <RotateCw v-if="isAddingTask" class="animate-spin size-4" />
            <span>{{ isAddingTask ? t('common.processing') : t('home.batchConfirmAction') }}</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Mobile Floating Add Button -->
    <button 
      @click="isAddingFormOpen = true"
      class="md:hidden fixed bottom-16 right-4 size-12 btn-mainline !rounded-full !p-0 flex items-center justify-center z-50 !shadow-offset-green"
    >
      <Plus  class="size-6"/>
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
