<script setup>
import { ref, onUnmounted } from 'vue';
import { db } from '../db';
import { liveQuery } from 'dexie';
import { useI18n } from 'vue-i18n';

import { getTodayDateString, formatDateDisplay } from '../utils/date';
import { triggerConfetti } from '../utils/confetti';

const { t } = useI18n();
const today = getTodayDateString();
const newTaskTitle = ref('');
const newTaskSubject = ref('Math'); 
const newTaskPoints = ref(10);
const isAddingFormOpen = ref(false);

const subjects = ['Math', 'English', 'Science', 'Art', 'Reading', 'Sports', 'Other'];
const subjectColors = {
  Math: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300',
  English: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300',
  Science: 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300',
  Art: 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300',
  Reading: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
  Sports: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  Other: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
};

const tasks = ref([]);
const subscription = liveQuery(() => db.tasks.where('date').equals(today).toArray())
    .subscribe(result => {
      tasks.value = result;
    });

onUnmounted(() => {
  subscription.unsubscribe();
});

const addTask = async () => {
  if (!newTaskTitle.value.trim()) return;
  
  await db.tasks.add({
    title: newTaskTitle.value,
    subject: newTaskSubject.value,
    points: Number(newTaskPoints.value) || 0,
    completed: false,
    date: today,
    createdAt: Date.now() 
  });
  
  newTaskTitle.value = '';
  isAddingFormOpen.value = false;
};

const toggleTask = async (task) => {
  const newStatus = !task.completed;
  await db.tasks.update(task.id, { completed: newStatus });
  
  if (newStatus) {
    triggerConfetti();
  }
};

const deleteTask = async (id) => {
  if (confirm(t('home.deleteConfirm'))) {
    await db.tasks.delete(id);
  }
};
</script>

<template>
  <div class="flex flex-col gap-8 pb-10">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="flex flex-col gap-2">
        <h2 class="text-4xl md:text-5xl font-black tracking-tight leading-tight">
          Hi Sam,<br/>here is your mission! 🚀
        </h2>
        <div class="flex items-center gap-2 text-text-sub-light dark:text-text-sub-dark">
          <span class="material-symbols-outlined text-primary text-xl">calendar_today</span>
          <p class="text-lg font-medium">{{ formatDateDisplay(today) }}</p>
        </div>
      </div>
      <button 
        @click="isAddingFormOpen = !isAddingFormOpen"
        class="hidden md:flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold py-4 px-8 rounded-2xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95 duration-200"
      >
        <span class="material-symbols-outlined font-bold">add</span>
        <span>{{ isAddingFormOpen ? t('settings.danger.resetBtn') : t('home.addTaskTitle') }}</span>
      </button>
    </header>

    <!-- Progress Card -->
    <section v-if="tasks.length > 0" class="bg-surface-light dark:bg-surface-dark p-6 px-7 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group">
      <div class="absolute -right-10 -top-10 size-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
      
      <div class="flex flex-col gap-5 relative z-10">
        <div class="flex justify-between items-end">
          <div>
            <h3 class="text-xl font-bold mb-1">{{ t('home.progress') }}</h3>
            <p v-if="tasks.filter(t => t.completed).length === tasks.length" class="text-text-sub-light dark:text-text-sub-dark text-sm font-medium">Mission Accomplished! 🏆</p>
            <p v-else class="text-text-sub-light dark:text-text-sub-dark text-sm font-medium">Keep going! You are doing great. 🔥</p>
          </div>
          <div class="text-3xl font-black text-primary">
            {{ tasks.length === 0 ? 0 : Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) }}%
          </div>
        </div>
        
        <div class="h-5 w-full bg-background-light dark:bg-background-dark rounded-full overflow-hidden p-1">
          <div 
            class="h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(75,238,43,0.4)]" 
            :style="{ width: `${tasks.length === 0 ? 0 : (tasks.filter(t => t.completed).length / tasks.length) * 100}%` }"
          ></div>
        </div>
        
        <div class="flex justify-between text-sm font-bold text-text-sub-light dark:text-text-sub-dark uppercase tracking-wider">
          <span>{{ tasks.length }} {{ t('app.nav.tasks') }}</span>
          <span>{{ tasks.filter(t => t.completed).length }} of {{ tasks.length }} {{ t('analytics.status.completed') }}</span>
        </div>
      </div>
    </section>

    <!-- Add Task Dialog/Form (Inline for simplicity now) -->
    <Transition name="expand">
      <div v-if="isAddingFormOpen" class="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border-2 border-primary/20 shadow-xl shadow-primary/5">
        <div class="grid md:grid-cols-12 gap-5">
           <div class="md:col-span-12">
             <h3 class="text-xl font-bold mb-4">{{ t('home.addTaskTitle') }} ✏️</h3>
           </div>
           <div class="md:col-span-5 flex flex-col gap-2">
             <label class="text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('home.inputs.taskName') }}</label>
             <input v-model="newTaskTitle" type="text" class="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold transition-all outline-none" :placeholder="t('home.inputs.placeholder')">
           </div>
           <div class="md:col-span-3 flex flex-col gap-2">
             <label class="text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('home.inputs.subject') }}</label>
             <select v-model="newTaskSubject" class="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold transition-all outline-none">
                <option v-for="s in subjects" :key="s" :value="s">{{ t(`home.subjects.${s}`) }}</option>
             </select>
           </div>
           <div class="md:col-span-2 flex flex-col gap-2">
             <label class="text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('home.inputs.points') }}</label>
             <input v-model.number="newTaskPoints" type="number" class="w-full bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold transition-all outline-none text-center">
           </div>
           <div class="md:col-span-2 flex items-end">
             <button @click="addTask" class="w-full bg-primary hover:bg-primary-dark text-black font-black py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 duration-200 uppercase tracking-widest text-xs">
               {{ t('home.buttons.add') }}
             </button>
           </div>
        </div>
      </div>
    </Transition>

    <!-- Task List -->
    <section class="flex flex-col gap-5">
      <h3 class="text-2xl font-black flex items-center gap-2">
        <span class="material-symbols-outlined text-primary text-3xl">check_circle</span>
        {{ t('home.title') }}
      </h3>

      <!-- Empty State -->
      <div v-if="tasks.length === 0" class="py-16 text-center bg-surface-light dark:bg-surface-dark rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
        <div class="size-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
          <span class="material-symbols-outlined text-5xl">menu_book</span>
        </div>
        <p class="text-xl font-black text-gray-400">{{ t('home.noTasksTitle') }}</p>
        <p class="text-gray-300 font-bold">{{ t('home.noTasksDesc') }}</p>
        <button @click="isAddingFormOpen = true" class="mt-6 text-primary font-bold flex items-center justify-center gap-1 mx-auto hover:underline">
          <span class="material-symbols-outlined">add</span> {{ t('home.addTaskTitle') }}
        </button>
      </div>

      <div 
        v-for="task in tasks" 
        :key="task.id"
        class="group flex items-center gap-5 bg-surface-light dark:bg-surface-dark p-5 rounded-2xl shadow-sm border-2 border-transparent hover:border-primary/40 transition-all duration-300"
        :class="{ 'opacity-60 grayscale-[0.5]': task.completed }"
      >
        <div class="relative flex items-center justify-center flex-shrink-0">
          <input 
            type="checkbox" 
            :checked="task.completed" 
            @change="toggleTask(task)"
            class="custom-checkbox appearance-none size-8 rounded-full border-2 border-gray-200 dark:border-gray-700 checked:bg-primary checked:border-primary transition-all cursor-pointer ring-offset-2 ring-primary/20 focus:ring-4"
          >
          <span v-if="task.completed" class="material-symbols-outlined absolute pointer-events-none text-black font-black text-lg">check</span>
        </div>

        <div class="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex flex-col">
            <h4 class="text-lg font-bold text-text-main-light dark:text-text-main-dark group-hover:text-primary transition-colors duration-300" :class="{ 'line-through decoration-2 decoration-primary/50 text-text-sub-light opacity-70': task.completed }">
              {{ task.title }}
            </h4>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm" :class="subjectColors[task.subject] || subjectColors.Other">
                 {{ t(`home.subjects.${task.subject}`) }}
              </span>
              <span class="text-xs font-bold text-text-sub-light">+{{ task.points }} pts</span>
            </div>
          </div>

          <div class="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
             <button @click="deleteTask(task.id)" class="p-3 text-gray-300 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
               <span class="material-symbols-outlined">delete</span>
             </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Mobile Floating Add Button -->
    <button 
      @click="isAddingFormOpen = true"
      class="md:hidden fixed bottom-24 right-6 size-16 bg-primary text-black rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-50 active:scale-90 transition-transform duration-200"
    >
      <span class="material-symbols-outlined text-3xl font-black">add</span>
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
</style>
