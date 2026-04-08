<script setup>
import { CalendarSync, Edit2, Plus, RotateCw, Star, Trash2, X } from 'lucide-vue-next';

import { ref, computed, onUnmounted } from 'vue';
import { db, liveQuery } from '../db';
import { useI18n } from 'vue-i18n';
import { getTodayDateString } from '../utils/date';

const { t } = useI18n();
const today = getTodayDateString();

// State
const templates = ref([]);
const userName = ref('Hero');
const isModalOpen = ref(false);
const isLoading = ref(false);
const isRefreshing = ref(false);
const editingTemplate = ref(null);

// Form state
const formTitle = ref('');
const formSubject = ref('Math');
const formPoints = ref(10);
const formScheduleType = ref('weekdays');
const formCustomDays = ref([]);
const formStartDate = ref(today);
const formEndDate = ref('');

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

const scheduleTypes = ['daily', 'weekdays', 'weekends', 'custom'];
const weekDays = [
  { key: 'sun', value: 0 },
  { key: 'mon', value: 1 },
  { key: 'tue', value: 2 },
  { key: 'wed', value: 3 },
  { key: 'thu', value: 4 },
  { key: 'fri', value: 5 },
  { key: 'sat', value: 6 },
];

// Subscriptions
const nameSubscription = liveQuery(() => db.settings.get('userName'))
  .subscribe(result => {
    userName.value = result?.value || 'Hero';
  });

let templatesSub = null;
const updateTemplatesSub = (name) => {
  if (templatesSub) templatesSub.unsubscribe();
  templatesSub = liveQuery(() => 
    db.dailyCheckinTemplates.where('user_name').equals(name).toArray()
  ).subscribe(result => {
    templates.value = result || [];
  });
};

// Watch for userName changes
const userNameWatcher = liveQuery(() => db.settings.get('userName'))
  .subscribe(result => {
    const newName = result?.value || 'Hero';
    if (newName !== userName.value || !templatesSub) {
      userName.value = newName;
      updateTemplatesSub(newName);
    }
  });

onUnmounted(() => {
  nameSubscription.unsubscribe();
  userNameWatcher.unsubscribe();
  if (templatesSub) templatesSub.unsubscribe();
});

// Refresh templates manually
const refreshTemplates = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    const result = await db.dailyCheckinTemplates.where('user_name').equals(userName.value).toArray();
    templates.value = result || [];
  } catch (error) {
    console.error('Failed to refresh templates:', error);
  } finally {
    setTimeout(() => {
      isRefreshing.value = false;
    }, 300);
  }
};

// Grouped templates by subject
const groupedTemplates = computed(() => {
  const groups = {};
  templates.value.forEach(tpl => {
    const s = tpl.subject || 'Other';
    if (!groups[s]) groups[s] = [];
    groups[s].push(tpl);
  });
  
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
    templates: groups[subject]
  }));
});

// Get days that match schedule
const getScheduleDays = (scheduleType, customDays) => {
  switch (scheduleType) {
    case 'daily': return [0, 1, 2, 3, 4, 5, 6];
    case 'weekdays': return [1, 2, 3, 4, 5];
    case 'weekends': return [0, 6];
    case 'custom': return customDays || [];
    default: return [];
  }
};

// Generate dates within range that match schedule
const generateDates = (startDate, endDate, scheduleType, customDays) => {
  const dates = [];
  const scheduleDays = getScheduleDays(scheduleType, customDays);
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date(startDate);
  
  // If no end date, generate for 4 weeks
  if (!endDate) {
    end.setDate(end.getDate() + 27);
  }
  
  const current = new Date(start);
  while (current <= end) {
    if (scheduleDays.includes(current.getDay())) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// Open modal for creating
const openCreateModal = () => {
  editingTemplate.value = null;
  formTitle.value = '';
  formSubject.value = 'Math';
  formPoints.value = 10;
  formScheduleType.value = 'weekdays';
  formCustomDays.value = [];
  formStartDate.value = today;
  formEndDate.value = '';
  isModalOpen.value = true;
};

// Open modal for editing
const openEditModal = (template) => {
  editingTemplate.value = template;
  formTitle.value = template.title;
  formSubject.value = template.subject;
  formPoints.value = template.points;
  formScheduleType.value = template.schedule_type;
  formCustomDays.value = template.custom_days || [];
  formStartDate.value = template.start_date;
  formEndDate.value = template.end_date || '';
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  editingTemplate.value = null;
};

// Toggle custom day selection
const toggleDay = (dayValue) => {
  const idx = formCustomDays.value.indexOf(dayValue);
  if (idx > -1) {
    formCustomDays.value.splice(idx, 1);
  } else {
    formCustomDays.value.push(dayValue);
  }
};

// Create template and generate tasks
const createTemplate = async () => {
  if (!formTitle.value.trim() || isLoading.value) return;
  
  isLoading.value = true;
  try {
    // Create the template
    const templateData = {
      title: formTitle.value.trim(),
      subject: formSubject.value,
      points: formPoints.value,
      schedule_type: formScheduleType.value,
      custom_days: formScheduleType.value === 'custom' ? formCustomDays.value : [],
      start_date: formStartDate.value,
      end_date: formEndDate.value || null,
      is_active: true,
      user_name: userName.value
    };
    
    const template = await db.dailyCheckinTemplates.add(templateData);
    
    // Generate tasks for the date range
    const dates = generateDates(
      formStartDate.value,
      formEndDate.value,
      formScheduleType.value,
      formCustomDays.value
    );
    
    for (const date of dates) {
      await db.tasks.add({
        title: formTitle.value.trim(),
        subject: formSubject.value,
        points: formPoints.value,
        completed: false,
        date: date,
        user_name: userName.value
      });
    }
    
    closeModal();
    alert(t('dailyCheckin.tasksGenerated', { count: dates.length }));
  } catch (error) {
    console.error('Failed to create template:', error);
    alert('创建失败: ' + error.message);
  } finally {
    isLoading.value = false;
  }
};

// Update existing template
const updateTemplate = async () => {
  if (!editingTemplate.value || !formTitle.value.trim() || isLoading.value) return;
  
  isLoading.value = true;
  try {
    await db.dailyCheckinTemplates.update(editingTemplate.value.id, {
      title: formTitle.value.trim(),
      subject: formSubject.value,
      points: formPoints.value,
      schedule_type: formScheduleType.value,
      custom_days: formScheduleType.value === 'custom' ? formCustomDays.value : [],
      start_date: formStartDate.value,
      end_date: formEndDate.value || null
    });
    
    closeModal();
  } catch (error) {
    console.error('Failed to update template:', error);
    alert('更新失败: ' + error.message);
  } finally {
    isLoading.value = false;
  }
};

// Delete template
const deleteTemplate = async (template) => {
  if (!confirm(t('dailyCheckin.deleteConfirm'))) return;
  
  try {
    await db.dailyCheckinTemplates.delete(template.id);
  } catch (error) {
    console.error('Failed to delete template:', error);
    alert('删除失败: ' + error.message);
  }
};

// Format schedule display
const formatSchedule = (template) => {
  const type = template.schedule_type;
  if (type === 'custom' && template.custom_days?.length > 0) {
    return template.custom_days
      .sort((a, b) => a - b)
      .map(d => t(`dailyCheckin.days.${weekDays.find(w => w.value === d)?.key || 'sun'}`))
      .join(', ');
  }
  return t(`dailyCheckin.scheduleTypes.${type}`);
};
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-8 pb-24 md:pb-10">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-6">
      <div class="flex flex-col gap-1 md:gap-2">
        <div class="flex items-center gap-2 md:gap-3">
          <h1 class="text-2xl md:text-5xl font-black tracking-tight leading-tight">
            {{ t('dailyCheckin.title') }} 📅
          </h1>
          <button
            @click="refreshTemplates"
            :disabled="isRefreshing"
            class="p-1.5 md:p-2 rounded-lg md:rounded-xl text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="刷新列表"
          >
            <RotateCw 
              class=" text-xl md:text-2xl transition-transform duration-200"
              :class="{ 'animate-spin': isRefreshing }"
            />
          </button>
        </div>
        <p class="text-text-sub-light dark:text-text-sub-dark text-sm md:text-lg font-medium">
          {{ t('dailyCheckin.subtitle') }}
        </p>
      </div>
      <button
        @click="openCreateModal"
        class="hidden md:flex items-center gap-2 bg-primary hover:bg-primary-dark text-black font-bold py-4 px-8 rounded-2xl shadow-lg shadow-primary/30 transition-all hover:-translate-y-1 active:scale-95 duration-200"
      >
        <Plus  class=" font-bold"/>
        <span>{{ t('dailyCheckin.addNew') }}</span>
      </button>
    </header>

    <!-- Empty State -->
    <div v-if="templates.length === 0" class="py-10 md:py-16 text-center bg-surface-light dark:bg-surface-dark rounded-2xl md:rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
      <div class="size-14 md:size-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 text-gray-300">
        <CalendarSync  class=" text-3xl md:text-5xl"/>
      </div>
      <p class="text-base md:text-xl font-black text-gray-400">{{ t('dailyCheckin.noTemplates') }}</p>
      <p class="text-sm md:text-base text-gray-300 font-bold mb-4 md:mb-6 px-4">{{ t('dailyCheckin.noTemplatesDesc') }}</p>
      <button @click="openCreateModal" class="text-primary font-bold flex items-center justify-center gap-1 mx-auto hover:underline text-sm md:text-base">
        <Plus  class=" text-lg md:text-xl"/> {{ t('dailyCheckin.addNew') }}
      </button>
    </div>

    <!-- Template List -->
    <section class="flex flex-col gap-3 md:gap-5">
      <div
        v-for="group in groupedTemplates"
        :key="group.subject"
        class="flex flex-col gap-2 md:gap-4 p-3 md:p-5 rounded-2xl md:rounded-[2rem] transition-all duration-300"
        :class="[subjectColors[group.subject]?.split(' ').filter(c => c.startsWith('bg-') || c.includes('/30')).join(' ') || 'bg-slate-50 dark:bg-slate-900/20']"
      >
        <div class="flex items-center justify-between px-1">
          <h4 class="text-xs md:text-lg font-black uppercase tracking-[0.15em] md:tracking-[0.2em] flex items-center gap-2 md:gap-3" :class="subjectColors[group.subject]?.split(' ')[0]">
            <span class="size-2 md:size-3 rounded-full shadow-sm" :class="subjectColors[group.subject]?.split(' ')[0].replace('text-', 'bg-')"></span>
            {{ t(`home.subjects.${group.subject}`) }}
          </h4>
          <span class="text-[10px] md:text-xs font-bold opacity-50 uppercase tracking-widest">{{ group.templates.length }} {{ t('app.nav.tasks') }}</span>
        </div>

        <div class="flex flex-col gap-2 md:gap-3">
          <TransitionGroup name="list">
            <div
              v-for="tpl in group.templates"
              :key="tpl.id"
              class="group flex items-center gap-2 md:gap-5 bg-surface-light dark:bg-surface-dark py-2.5 md:py-4 px-3 md:px-5 rounded-xl md:rounded-2xl shadow-sm border-2 border-transparent hover:border-primary/40 transition-all duration-300"
            >
              <div class="flex-1 min-w-0">
                <h4 class="text-sm md:text-lg font-bold text-text-main-light dark:text-text-main-dark group-hover:text-primary transition-colors duration-300 leading-tight truncate">
                  {{ tpl.title }}
                </h4>
                <div class="flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-0.5 mt-0.5 md:mt-1 text-[10px] md:text-sm text-text-sub-light dark:text-text-sub-dark">
                  <span class="flex items-center gap-0.5 md:gap-1">
                    <CalendarSync  class=" text-xs md:text-base"/>
                    {{ formatSchedule(tpl) }}
                  </span>
                  <span class="flex items-center gap-0.5 md:gap-1 font-black text-primary/80">
                    <Star  class=" text-xs md:text-base"/>
                    +{{ tpl.points }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-0 flex-shrink-0">
                <button @click="openEditModal(tpl)" class="p-2 md:p-3 text-gray-400 hover:text-primary transition-colors rounded-lg md:rounded-xl hover:bg-primary/10 active:scale-95">
                  <Edit2  class=" text-lg md:text-xl"/>
                </button>
                <button @click="deleteTemplate(tpl)" class="p-2 md:p-3 text-gray-300 hover:text-red-500 transition-colors rounded-lg md:rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95">
                  <Trash2  class=" text-lg md:text-xl"/>
                </button>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </section>

    <!-- Mobile Floating Add Button -->
    <button
      @click="openCreateModal"
      class="md:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 size-14 bg-primary text-black rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center z-50 active:scale-90 transition-transform duration-200"
    >
      <Plus  class=" text-2xl font-black"/>
    </button>

    <!-- Create/Edit Modal -->
    <Transition name="modal">
      <div v-if="isModalOpen" class="fixed inset-0 z-[60] flex items-end md:items-center justify-center" @click="closeModal">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div
          class="relative bg-surface-light dark:bg-surface-dark w-full md:max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl border-t md:border border-gray-200 dark:border-gray-700 max-h-[85vh] md:max-h-[90vh] flex flex-col"
          :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <h3 class="text-lg md:text-2xl font-black flex items-center gap-2">
              <CalendarSync  class=" text-primary text-2xl md:text-3xl"/>
              {{ editingTemplate ? t('dailyCheckin.modal.edit') : t('dailyCheckin.modal.create') }}
            </h3>
            <button
              @click="closeModal"
              class="p-1.5 md:p-2 rounded-lg md:rounded-xl text-text-sub-light hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 active:scale-95"
            >
              <X  class=" text-xl md:text-2xl"/>
            </button>
          </div>

          <!-- Form -->
          <div class="flex flex-col gap-4 md:gap-5 p-4 md:p-6 overflow-y-auto flex-1">
            <!-- Task Name -->
            <div class="flex flex-col gap-1.5 md:gap-2">
              <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('dailyCheckin.templateName') }}</label>
              <input
                v-model="formTitle"
                type="text"
                class="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base"
                :placeholder="t('dailyCheckin.templateNamePlaceholder')"
              >
            </div>

            <!-- Subject & Points Row -->
            <div class="grid grid-cols-2 gap-3 md:gap-4">
              <div class="flex flex-col gap-1.5 md:gap-2">
                <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('home.inputs.subject') }}</label>
                <select v-model="formSubject" class="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base">
                  <option v-for="s in subjects" :key="s" :value="s">{{ t(`home.subjects.${s}`) }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-1.5 md:gap-2">
                <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('home.inputs.points') }}</label>
                <input v-model.number="formPoints" type="number" class="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-center text-sm md:text-base">
              </div>
            </div>

            <!-- Schedule Type -->
            <div class="flex flex-col gap-1.5 md:gap-2">
              <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('dailyCheckin.schedule') }}</label>
              <div class="grid grid-cols-4 gap-1.5 md:gap-2">
                <button
                  v-for="type in scheduleTypes"
                  :key="type"
                  @click="formScheduleType = type"
                  class="py-2 md:py-3 px-1 md:px-4 rounded-lg md:rounded-xl font-bold transition-all duration-200 active:scale-95 text-xs md:text-sm"
                  :class="formScheduleType === type ? 'bg-primary text-black' : 'bg-background-light dark:bg-background-dark hover:bg-primary/10'"
                >
                  {{ t(`dailyCheckin.scheduleTypes.${type}`) }}
                </button>
              </div>
            </div>

            <!-- Custom Days -->
            <div v-if="formScheduleType === 'custom'" class="flex flex-col gap-1.5 md:gap-2">
              <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('dailyCheckin.selectDays') }}</label>
              <div class="grid grid-cols-7 gap-1 md:gap-2">
                <button
                  v-for="day in weekDays"
                  :key="day.value"
                  @click="toggleDay(day.value)"
                  class="py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold transition-all duration-200 active:scale-95 text-xs md:text-sm"
                  :class="formCustomDays.includes(day.value) ? 'bg-primary text-black' : 'bg-background-light dark:bg-background-dark hover:bg-primary/10'"
                >
                  {{ t(`dailyCheckin.days.${day.key}`) }}
                </button>
              </div>
            </div>

            <!-- Date Range -->
            <div class="grid grid-cols-2 gap-3 md:gap-4">
              <div class="flex flex-col gap-1.5 md:gap-2">
                <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('dailyCheckin.startDate') }}</label>
                <input
                  v-model="formStartDate"
                  type="date"
                  class="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base"
                >
              </div>
              <div class="flex flex-col gap-1.5 md:gap-2">
                <label class="text-[10px] md:text-xs font-bold text-text-sub-light uppercase tracking-widest px-1">{{ t('dailyCheckin.endDate') }}</label>
                <input
                  v-model="formEndDate"
                  type="date"
                  class="w-full bg-background-light dark:bg-background-dark border-2 border-transparent focus:border-primary rounded-xl p-3 md:p-4 font-bold transition-all outline-none text-sm md:text-base"
                >
              </div>
            </div>

            <!-- Submit Button -->
            <button
              @click="editingTemplate ? updateTemplate() : createTemplate()"
              :disabled="isLoading || !formTitle.trim()"
              class="w-full bg-primary hover:bg-primary-dark text-white font-black py-3.5 md:py-4 rounded-xl md:rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 duration-200 uppercase tracking-widest text-xs md:text-sm mt-2 md:mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RotateCw  v-if="isLoading" class=" animate-spin text-lg"/>
              <span>{{ editingTemplate ? t('dailyCheckin.editBtn') : t('dailyCheckin.createBtn') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
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

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
