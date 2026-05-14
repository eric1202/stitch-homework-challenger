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
  Chinese: 'text-subject-chinese bg-subject-chinese/10 dark:bg-subject-chinese/20',
  Math: 'text-subject-math bg-subject-math/10 dark:bg-subject-math/20',
  English: 'text-subject-english bg-subject-english/10 dark:bg-subject-english/20',
  Science: 'text-subject-science bg-subject-science/10 dark:bg-subject-science/20',
  Art: 'text-subject-art bg-subject-art/10 dark:bg-subject-art/20',
  Reading: 'text-subject-reading bg-subject-reading/10 dark:bg-subject-reading/20',
  Sports: 'text-subject-sports bg-subject-sports/10 dark:bg-subject-sports/20',
  Other: 'text-subject-other bg-subject-other/10 dark:bg-subject-other/20',
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
    alert(t('common.createFail') + error.message);
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
    alert(t('common.updateFail') + error.message);
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
    alert(t('common.deleteFail') + error.message);
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
    <header class="flex flex-col gap-4 md:gap-8 mb-4 md:mb-8">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex flex-col gap-4">
          <span class="badge-mainline w-fit">Automation</span>
          <h1 class="text-3xl md:text-7xl font-black text-primary leading-[0.9] -ml-0.5 md:-ml-1">
            {{ t('dailyCheckin.title') }}
          </h1>
          <p class="text-sm md:text-xl font-medium text-text-sub max-w-xl leading-relaxed">
            {{ t('dailyCheckin.subtitle') }}
          </p>
        </div>
        
        <div class="flex items-center gap-4">
          <button
            @click="refreshTemplates"
            :disabled="isRefreshing"
            class="btn-mainline-secondary !p-2 md:!p-4 !shadow-none hover:rotate-12"
          >
            <RotateCw 
              class="size-5 md:size-6 transition-transform duration-200"
              :class="{ 'animate-spin': isRefreshing }"
            />
          </button>
          
          <button
            @click="openCreateModal"
            class="btn-mainline flex items-center gap-2 group"
          >
            <Plus class="transition-transform group-hover:rotate-90"/>
            <span>{{ t('dailyCheckin.addNew') }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Empty State -->
    <div v-if="templates.length === 0" class="py-10 md:py-16 text-center bg-surface-main rounded-2xl md:rounded-3xl border border-dashed border-primary/20">
      <div class="size-14 md:size-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 text-text-sub opacity-30">
        <CalendarSync  class=" text-3xl md:text-5xl"/>
      </div>
      <p class="text-base md:text-xl font-black text-text-sub opacity-50">{{ t('dailyCheckin.noTemplates') }}</p>
      <p class="text-sm md:text-base text-text-sub opacity-40 font-bold mb-4 md:mb-6 px-4">{{ t('dailyCheckin.noTemplatesDesc') }}</p>
      <button @click="openCreateModal" class="text-primary font-bold flex items-center justify-center gap-1 mx-auto hover:underline text-sm md:text-base">
        <Plus  class=" text-lg md:text-xl"/> {{ t('dailyCheckin.addNew') }}
      </button>
    </div>

    <!-- Template List -->
    <section class="flex flex-col gap-3 md:gap-5">
      <div
        v-for="group in groupedTemplates"
        :key="group.subject"
        class="flex flex-col gap-4 md:gap-6 p-3 md:p-6 rounded-2xl md:rounded-3xl border-2 border-primary/10 transition-all hover:border-primary/30"
        :class="[subjectColors[group.subject]?.split(' ').filter(c => c.startsWith('bg-') || c.includes('/30')).join(' ') || 'bg-surface-main']"
      >
        <div class="flex items-center gap-4 border-b-2 border-primary pb-2">
          <h4 class="text-base md:text-xl font-black uppercase tracking-widest text-primary">
            {{ t(`home.subjects.${group.subject}`) }}
          </h4>
          <span class="text-xs font-black text-text-sub opacity-50 uppercase tracking-widest">{{ group.templates.length }} {{ t('app.nav.home') }}</span>
        </div>

        <div class="flex flex-col gap-2 md:gap-3">
          <TransitionGroup name="list">
            <div
              v-for="tpl in group.templates"
              :key="tpl.id"
              class="group flex items-center gap-3 md:gap-6 card-mainline !p-3 md:!p-6 hover:shadow-offset-green"
            >
              <div class="flex-1 min-w-0">
                <h4 class="text-lg md:text-2xl font-black text-primary group-hover:text-accent-green transition-colors leading-none truncate mb-1 md:mb-2">
                  {{ tpl.title }}
                </h4>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-black uppercase tracking-widest text-text-sub">
                  <span class="flex items-center gap-2">
                    <CalendarSync class="size-4"/>
                    {{ formatSchedule(tpl) }}
                  </span>
                  <span class="flex items-center gap-2 text-primary">
                    <Star class="size-4 fill-primary"/>
                    +{{ tpl.points }} pts
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-2 flex-shrink-0">
                <button @click="openEditModal(tpl)" class="btn-mainline-secondary !p-2 !shadow-none hover:rotate-12">
                  <Edit2 class="size-5"/>
                </button>
                <button @click="deleteTemplate(tpl)" class="btn-mainline-secondary !p-2 !shadow-none hover:rotate-12 hover:bg-red-50 hover:text-red-500">
                  <Trash2 class="size-5"/>
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
      class="md:hidden fixed bottom-16 right-4 size-12 btn-mainline !rounded-full !p-0 flex items-center justify-center z-50 !shadow-offset-green"
    >
      <Plus  class="size-6"/>
    </button>

    <!-- Create/Edit Modal -->
    <Transition name="modal">
      <div v-if="isModalOpen" class="fixed inset-0 z-[60] flex items-end md:items-center justify-center" @click="closeModal">
        <div class="absolute inset-0 bg-background-main/50 backdrop-blur-sm"></div>
        <div
          class="relative bg-surface-main w-full md:max-w-lg md:rounded-3xl rounded-t-3xl shadow-soft border-t md:border border-primary max-h-[85vh] md:max-h-[90vh] flex flex-col animate-in zoom-in"
          :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-4 md:p-8 border-b-2 border-primary flex-shrink-0">
            <h3 class="text-xl md:text-3xl font-black">
              {{ editingTemplate ? t('dailyCheckin.modal.edit') : t('dailyCheckin.modal.create') }}
            </h3>
            <button @click="closeModal" class="hover:rotate-90 transition-transform">
              <X class="size-6 md:size-8"/>
            </button>
          </div>

          <!-- Form -->
          <div class="flex flex-col gap-4 md:gap-8 p-4 md:p-8 overflow-y-auto flex-1">
            <!-- Task Name -->
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('dailyCheckin.templateName') }}</label>
              <input v-model="formTitle" type="text" class="input-mainline" :placeholder="t('dailyCheckin.templateNamePlaceholder')">
            </div>

            <!-- Subject & Points Row -->
            <div class="grid grid-cols-2 gap-6">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('home.inputs.subject') }}</label>
                <select v-model="formSubject" class="input-mainline">
                  <option v-for="s in subjects" :key="s" :value="s">{{ t(`home.subjects.${s}`) }}</option>
                </select>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('home.inputs.points') }}</label>
                <input v-model.number="formPoints" type="number" class="input-mainline text-center">
              </div>
            </div>

            <!-- Frequency -->
            <div class="flex flex-col gap-4">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('dailyCheckin.frequency') }}</label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="type in scheduleTypes"
                  :key="type"
                  @click="formScheduleType = type"
                  class="py-3 px-1 font-bold transition-all text-xs border-2 border-primary rounded-lg"
                  :class="formScheduleType === type ? 'bg-primary text-background-main shadow-offset-green' : 'bg-surface-main text-primary hover:bg-primary/5'"
                >
                  {{ t(`dailyCheckin.scheduleTypes.${type}`) }}
                </button>
              </div>
            </div>

            <!-- Custom Days -->
            <div v-if="formScheduleType === 'custom'" class="flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('dailyCheckin.selectDays') }}</label>
              <div class="grid grid-cols-7 gap-2">
                <button
                  v-for="day in weekDays"
                  :key="day.value"
                  @click="toggleDay(day.value)"
                  class="py-2 font-bold transition-all text-xs border-2 border-primary rounded-lg"
                  :class="formCustomDays.includes(day.value) ? 'bg-primary text-background-main shadow-offset-green' : 'bg-surface-main text-primary hover:bg-primary/5'"
                >
                  {{ t(`dailyCheckin.days.${day.key}`) }}
                </button>
              </div>
            </div>

            <!-- Date Range -->
            <div class="grid grid-cols-2 gap-6">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('dailyCheckin.startDate') }}</label>
                <input v-model="formStartDate" type="date" class="input-mainline">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('dailyCheckin.endDate') }}</label>
                <input v-model="formEndDate" type="date" class="input-mainline">
              </div>
            </div>

            <!-- Submit Button -->
            <button
              @click="editingTemplate ? updateTemplate() : createTemplate()"
              :disabled="isLoading || !formTitle.trim()"
              class="btn-mainline w-full !py-4 flex items-center justify-center gap-2 mt-4"
            >
              <RotateCw v-if="isLoading" class="animate-spin size-5"/>
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
