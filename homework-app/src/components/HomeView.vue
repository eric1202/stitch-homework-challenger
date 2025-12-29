<script setup>
import { ref } from 'vue';
import { db } from '../db';
import { liveQuery } from 'dexie';
import { useI18n } from 'vue-i18n';

import { getTodayDateString, formatDateDisplay } from '../utils/date';
import { triggerConfetti } from '../utils/confetti';
import { PlusIcon, TrashIcon, CheckCircleIcon, BookOpenIcon, StarIcon } from '@heroicons/vue/24/solid';

const { t } = useI18n();
const today = getTodayDateString();
const newTaskTitle = ref('');
const newTaskSubject = ref('Math'); 
const newTaskPoints = ref(10);
const isAddingCallback = ref(false); // for simple animation

const subjects = ['Math', 'English', 'Science', 'Art', 'Reading', 'Sports', 'Other'];
const subjectColors = {
  Math: 'text-blue-500 bg-blue-50 border-blue-100',
  English: 'text-emerald-500 bg-emerald-50 border-emerald-100',
  Science: 'text-violet-500 bg-violet-50 border-violet-100',
  Art: 'text-rose-500 bg-rose-50 border-rose-100',
  Reading: 'text-amber-500 bg-amber-50 border-amber-100',
  Sports: 'text-orange-500 bg-orange-50 border-orange-100',
  Other: 'text-slate-500 bg-slate-50 border-slate-100',
};

// Live query needs to be wrapped properly if using simple ref.
// Or we can use useObservable if installed (I didn't install vueuse/rxjs), 
// so I'll stick to the manual onMounted/onUnmounted or use a simple ref update pattern 
// or the `liveQuery` return value is just a promise-like observable, not a Vue ref.
// The easiest pattern without extra libs:
const tasks = ref([]);
const subscription = liveQuery(() => db.tasks.where('date').equals(today).toArray())
    .subscribe(result => {
      tasks.value = result;
    });

// To be safe clean up
import { onUnmounted } from 'vue';
onUnmounted(() => {
  subscription.unsubscribe();
});

const addTask = async () => {
  if (!newTaskTitle.value.trim()) return;
  
  isAddingCallback.value = true;
  await db.tasks.add({
    title: newTaskTitle.value,
    subject: newTaskSubject.value,
    points: Number(newTaskPoints.value) || 0,
    completed: false,
    date: today,
    createdAt: Date.now() 
  });
  
  newTaskTitle.value = '';
  setTimeout(() => { isAddingCallback.value = false }, 300);
};

const toggleTask = async (task) => {
  const newStatus = !task.completed;
  await db.tasks.update(task.id, { completed: newStatus });
  
  if (newStatus) {
    triggerConfetti();
  }
};

const deleteTask = async (id) => {
  // Simple confirmation as requested
  if (confirm(t('home.deleteConfirm'))) {
    await db.tasks.delete(id);
  }
};
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h2 class="text-3xl font-black text-dark tracking-tight">{{ t('home.title') }}</h2>
        <p class="text-gray-400 font-bold mt-1">{{ formatDateDisplay(today) }}</p>
      </div>
      
      <!-- Progress Bar (calculated from tasks) -->
      <div v-if="tasks.length > 0" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[240px]">
        <div class="flex-1">
          <div class="flex justify-between text-xs font-bold mb-2">
            <span class="text-gray-400">{{ t('home.progress') }}</span>
            <span class="text-primary">{{ Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) }}%</span>
          </div>
          <div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
             <div class="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                  :style="{ width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` }">
             </div>
          </div>
        </div>
        <div class="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-black">
          {{ tasks.filter(t => t.completed).length }}/{{ tasks.length }}
        </div>
      </div>
    </div>

    <!-- Task List -->
    <div class="grid gap-4">
      <!-- Empty State -->
      <div v-if="tasks.length === 0" class="py-12 flex flex-col items-center justify-center text-center opacity-50">
        <div class="w-32 h-32 bg-gray-100 rounded-full mb-4 flex items-center justify-center">
            <BookOpenIcon class="w-12 h-12 text-gray-300" />
        </div>
        <h3 class="text-xl font-bold text-gray-400">{{ t('home.noTasksTitle') }}</h3>
        <p class="text-gray-300">{{ t('home.noTasksDesc') }}</p>
      </div>

      <div 
        v-for="task in tasks" 
        :key="task.id"
        class="group bg-white rounded-2xl p-4 shadow-sm border border-transparent hover:border-primary/20 hover:shadow-md transition-all duration-200 flex items-center gap-4"
        :class="{ 'opacity-60 bg-gray-50': task.completed }"
      >
         <!-- Checkbox -->
         <button 
          @click="toggleTask(task)"
          class="w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0"
          :class="task.completed ? 'bg-secondary border-secondary' : 'border-gray-200 hover:border-secondary'"
         >
           <CheckCircleIcon v-if="task.completed" class="w-5 h-5 text-white" />
         </button>

         <!-- Content -->
         <div class="flex-1 min-w-0">
           <div class="flex items-center gap-2 mb-1">
             <span class="text-[10px] uppercase font-black px-2 py-0.5 rounded-md border"
              :class="subjectColors[task.subject] || subjectColors.Other"
             >
               {{ t(`home.subjects.${task.subject}`) }}
             </span>
           </div>
           <h3 class="font-bold text-dark truncate" :class="{ 'line-through text-gray-400': task.completed }">{{ task.title }}</h3>
         </div>

         <!-- Points & Actions -->
         <div class="flex items-center gap-3">
           <div class="flex flex-col items-end">
             <span class="text-xs font-bold text-gray-400 uppercase">{{ t('home.reward') }}</span>
             <span class="text-sm font-black text-accent">+{{ task.points }}</span>
           </div>
           
           <button @click="deleteTask(task.id)" class="p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 mobile:opacity-100 md:opacity-0">
             <TrashIcon class="w-5 h-5" />
           </button>
         </div>
      </div>
    </div>

    <!-- Add Task Form -->
    <div class="bg-white rounded-3xl p-6 shadow-lg shadow-primary/5 border border-primary/10 mt-8 relative overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent"></div>
      <h3 class="text-lg font-bold text-dark mb-4 flex items-center gap-2">
        <PlusIcon class="w-5 h-5 text-primary" />
        {{ t('home.addTaskTitle') }}
      </h3>
      
      <div class="grid md:grid-cols-12 gap-4 items-end">
        <div class="md:col-span-6 space-y-1">
          <label class="text-xs font-bold text-gray-400 uppercase ml-1">{{ t('home.inputs.taskName') }}</label>
          <input 
            v-model="newTaskTitle"
            @keyup.enter="addTask"
            type="text" 
            :placeholder="t('home.inputs.placeholder')"
            class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:font-normal"
          >
        </div>
        
        <div class="md:col-span-3 space-y-1">
          <label class="text-xs font-bold text-gray-400 uppercase ml-1">{{ t('home.inputs.subject') }}</label>
          <select 
            v-model="newTaskSubject"
            class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none cursor-pointer"
          >
            <option v-for="s in subjects" :value="s">{{ t(`home.subjects.${s}`) }}</option>
          </select>
        </div>

        <div class="md:col-span-2 space-y-1">
          <label class="text-xs font-bold text-gray-400 uppercase ml-1">{{ t('home.inputs.points') }}</label>
          <input 
            v-model.number="newTaskPoints"
            type="number" 
            class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-accent focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all text-center"
          >
        </div>

        <div class="md:col-span-1">
           <button 
            @click="addTask"
            class="w-full h-[50px] bg-dark text-white rounded-xl font-bold flex items-center justify-center hover:bg-black transition-colors shadow-lg shadow-dark/20 active:scale-95 duration-200"
           >
             <PlusIcon class="w-6 h-6" />
           </button>
        </div>
      </div>
    </div>
  </div>
</template>
