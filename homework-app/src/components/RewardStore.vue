<script setup>
import { ref, computed, onUnmounted, onMounted, watch } from 'vue';
import { db, liveQuery } from '../db';
import { useI18n } from 'vue-i18n';
import { triggerConfetti } from '../utils/confetti';
import { 
  Gamepad2, 
  IceCream, 
  Palmtree, 
  Book, 
  Gift, 
  Plus, 
  Edit2, 
  Trash2, 
  History, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw
} from 'lucide-vue-next';

const { t } = useI18n();

// --- State ---
const rewards = ref([]);
const logs = ref([]);
const totalPoints = ref(0);
const isAdmin = ref(false); // Toggle for Parent/Child view
const showAddModal = ref(false);
const showEditModal = ref(false);
const editingReward = ref(null);
const isSavingReward = ref(false);
const isRedeemingReward = ref(false);
const isRefreshing = ref(false);
const pullStartY = ref(0);
const pullDistance = ref(0);
const isPulling = ref(false);
const rewardsListRef = ref(null);

// Form state
const rewardForm = ref({
  title: '',
  icon: 'Gift',
  points: 50,
  expiryDate: '',
  stock: 1
});

const iconPresets = [
  { name: 'Gamepad2', icon: Gamepad2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { name: 'IceCream', icon: IceCream, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
  { name: 'Palmtree', icon: Palmtree, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
  { name: 'Book', icon: Book, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { name: 'Gift', icon: Gift, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' }
];

// Category filter
const selectedCategory = ref('all');

const categories = computed(() => {
  const all = { key: 'all', label: t('rewards.categories.all'), count: rewards.value.length };
  const groups = iconPresets.map(preset => ({
    key: preset.name,
    label: t(`rewards.categories.${preset.name}`),
    icon: preset.icon,
    color: preset.color,
    bg: preset.bg,
    count: rewards.value.filter(r => r.icon === preset.name).length
  }));
  return [all, ...groups.filter(g => g.count > 0)];
});

const isExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date().setHours(0, 0, 0, 0);
};

const filteredRewards = computed(() => {
  let list = rewards.value;
  if (selectedCategory.value !== 'all') {
    list = list.filter(r => r.icon === selectedCategory.value);
  }
  
  return [...list].sort((a, b) => {
    const aUnavailable = isExpired(a.expiry_date) || a.stock <= 0;
    const bUnavailable = isExpired(b.expiry_date) || b.stock <= 0;
    
    if (aUnavailable !== bUnavailable) {
      return aUnavailable ? 1 : -1;
    }
    
    return (b.id || 0) - (a.id || 0);
  });
});

const getIconComponent = (iconName) => {
  const preset = iconPresets.find(p => p.name === iconName);
  return preset ? preset.icon : Gift;
};

const getIconColor = (iconName) => {
  const preset = iconPresets.find(p => p.name === iconName);
  return preset ? preset.color : 'text-primary';
};

// --- Live Queries ---
const userName = ref('Hero');
let rewardsSub = null;
let logsSub = null;
let pointsSub = null;
let nameSub = null;

// Helper to refresh rewards manually
const refreshRewards = async () => {
  if (isRefreshing.value) return;
  
  isRefreshing.value = true;
  try {
    const rewardsResult = await db.rewards.where('user_name').equals(userName.value).toArray();
    rewards.value = rewardsResult;
    
    const logsResult = await db.redemptionLogs.where('user_name').equals(userName.value).reverse().toArray();
    logs.value = logsResult;
    
    const allTasks = await db.tasks.where('user_name').equals(userName.value).select('points, completed').toArray();
    let spent = 0;
    const spentPointsLogs = await db.redemptionLogs.where('user_name').equals(userName.value).select('spent_points').toArray();
    spent = spentPointsLogs.reduce((sum, log) => sum + (log.spent_points || 0), 0);
    const earned = allTasks
      .filter(task => task.completed)
      .reduce((sum, task) => sum + (Number(task.points) || 0), 0);
    totalPoints.value = earned - spent;
  } catch (error) {
    console.error('Failed to refresh rewards:', error);
    alert(t('rewards.refreshFail'));
  } finally {
    setTimeout(() => {
      isRefreshing.value = false;
    }, 300);
  }
};

const updateSubscriptions = (name) => {
  if (rewardsSub) rewardsSub.unsubscribe();
  if (logsSub) logsSub.unsubscribe();
  if (pointsSub) pointsSub.unsubscribe();

  rewardsSub = liveQuery(() => db.rewards.where('user_name').equals(name).toArray()).subscribe(val => {
    rewards.value = val;
  });

  logsSub = liveQuery(() => db.redemptionLogs.where('user_name').equals(name).reverse().toArray()).subscribe(val => {
    logs.value = val;
  });

  pointsSub = liveQuery(async () => {
    try {
      const allTasks = await db.tasks.where('user_name').equals(name).select('points, completed').toArray();
      let spent = 0;
      
      const spentPointsLogs = await db.redemptionLogs.where('user_name').equals(name).select('spent_points').toArray();
      spent = spentPointsLogs.reduce((sum, log) => sum + (log.spent_points || 0), 0);
      
      const earned = allTasks
        .filter(task => task.completed)
        .reduce((sum, task) => sum + (Number(task.points) || 0), 0);
        
      return earned - spent;
    } catch (err) {
      console.warn('Points calculation error:', err);
      return 0;
    }
  }).subscribe(val => {
    totalPoints.value = val;
  });
};

nameSub = liveQuery(() => db.settings.get('userName')).subscribe(result => {
  const newName = result?.value || 'Hero';
  if (newName !== userName.value || !rewardsSub) {
    userName.value = newName;
    updateSubscriptions(newName);
  }
});

// 下拉刷新处理
const handleTouchStart = (e) => {
  // 只在页面顶部时才能下拉刷新
  if (window.scrollY === 0 && rewardsListRef.value) {
    const rect = rewardsListRef.value.getBoundingClientRect();
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
      await refreshRewards();
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
  if (rewardsSub) rewardsSub.unsubscribe();
  if (logsSub) logsSub.unsubscribe();
  if (pointsSub) pointsSub.unsubscribe();
  if (nameSub) nameSub.unsubscribe();
  document.removeEventListener('touchstart', handleTouchStart);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
});


// --- Actions ---
const openAddModal = () => {
  rewardForm.value = {
    title: '',
    icon: 'Gift',
    points: 50,
    expiryDate: '',
    stock: 1
  };
  showAddModal.value = true;
};

const openEditModal = (reward) => {
  editingReward.value = reward;
  rewardForm.value = { ...reward };
  showEditModal.value = true;
};

const saveReward = async () => {
  if (!rewardForm.value.title || isSavingReward.value) return;
  
  isSavingReward.value = true;
  try {
    // Create a plain object to avoid Proxy issues with IndexedDB storage
    const data = {
      title: rewardForm.value.title,
      icon: rewardForm.value.icon,
      points: Number(rewardForm.value.points) || 0,
      expiry_date: rewardForm.value.expiryDate, // Schema has expiry_date
      stock: Number(rewardForm.value.stock) || 0,
      user_name: userName.value
    };
    
    if (editingReward.value) {
      await db.rewards.update(editingReward.value.id, data);
    } else {
      await db.rewards.add(data);
    }
    
    showAddModal.value = false;
    showEditModal.value = false;
    editingReward.value = null;
    
    // 刷新列表
    await refreshRewards();
  } catch (err) {
    console.error('Failed to save reward:', err);
    alert(t('rewards.redeemFail') + err.message);
  } finally {
    isSavingReward.value = false;
  }
};

const deleteReward = async (id) => {
  if (confirm(t('rewards.deleteConfirm'))) {
    await db.rewards.delete(id);
  }
};

const redeemReward = async (reward) => {
  if (totalPoints.value < reward.points || reward.stock <= 0 || isExpired(reward.expiry_date) || isRedeemingReward.value) return;

  isRedeemingReward.value = true;
  try {
    await db.transaction('rw', db.rewards, db.redemptionLogs, async () => {
      // 1. Check stock again inside transaction
      const freshReward = await db.rewards.get(reward.id);
      if (!freshReward || freshReward.stock <= 0) throw new Error(t('rewards.outOfStock'));

      // 2. Reduce stock
      await db.rewards.update(reward.id, {
        stock: freshReward.stock - 1
      });

      // 3. Add log
      await db.redemptionLogs.add({
        reward_title: String(reward.title), // Schema: reward_title
        spent_points: Number(reward.points), // Schema: spent_points
        timestamp: Date.now(),
        user_name: userName.value
      });
    });

    triggerConfetti();
    
    // 刷新列表
    await refreshRewards();
  } catch (err) {
    alert(t('rewards.redeemFail') + err.message);
  } finally {
    isRedeemingReward.value = false;
  }
};

const formatTime = (ts) => {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

</script>

<template>
  <div class="flex flex-col gap-8 pb-10">
    <!-- Header -->
    <header class="flex flex-col gap-8 mb-4">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex flex-col gap-4">
          <span class="badge-mainline w-fit">Marketplace</span>
          <h1 class="text-5xl md:text-7xl font-black text-primary leading-[0.9] -ml-1">
            {{ isAdmin ? t('rewards.manageTitle') : t('rewards.title') }}
          </h1>
          <p class="text-lg md:text-xl font-medium text-text-sub max-w-xl leading-relaxed">
            {{ t('rewards.subtitle') }}
          </p>
        </div>
        
        <div class="flex items-center gap-4">
          <button 
            @click="isAdmin = !isAdmin"
            class="btn-mainline-secondary flex items-center gap-2"
            :class="{ '!bg-primary !text-background-main shadow-offset-green': isAdmin }"
          >
            <Edit2 class="size-4" />
            <span>{{ isAdmin ? t('rewards.exitParentMode') : t('rewards.parentMode') }}</span>
          </button>

          <button 
            v-if="isAdmin" 
            @click="openAddModal" 
            class="btn-mainline flex items-center gap-2 group"
          >
            <Plus class="transition-transform group-hover:rotate-90" />
            <span>{{ t('rewards.addNew') }}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Points Banner -->
    <div class="card-mainline !p-8 bg-accent-green/5 flex items-center justify-between group">
      <div class="flex flex-col gap-2">
        <p class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('rewards.availableBalance') }}</p>
        <div class="flex items-baseline gap-2">
          <span class="text-6xl font-black text-primary leading-none">{{ totalPoints }}</span>
          <span class="text-xl font-black text-primary uppercase">pts</span>
        </div>
      </div>
      <History class="size-16 text-primary opacity-20 group-hover:rotate-12 transition-transform" />
    </div>

    <!-- Rewards Grid -->
    <section ref="rewardsListRef">
      <!-- Pull to Refresh Indicator -->
      <div 
        v-if="pullDistance > 0 || isRefreshing"
        class="flex items-center justify-center py-2 transition-all duration-200 mb-4"
        :style="{ 
          height: `${Math.min(pullDistance, 60)}px`,
          opacity: Math.min(pullDistance / 50, 1)
        }"
      >
        <div class="flex items-center gap-2 text-primary">
          <RefreshCw 
            class="w-5 h-5 transition-transform duration-200"
            :class="{ 'animate-spin': isRefreshing }"
            :style="{ transform: isRefreshing ? 'rotate(0deg)' : `rotate(${Math.min(pullDistance * 3.6, 180)}deg)` }"
          />
          <span class="text-xs font-bold">{{ isRefreshing ? t('rewards.refreshing') : t('rewards.pullToRefresh') }}</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between mb-8 border-b-2 border-primary pb-2">
        <h3 class="text-3xl font-black text-primary">
          {{ t('rewards.rewardsList') || 'Rewards' }}
        </h3>
        <button 
          @click="refreshRewards"
          :disabled="isRefreshing"
          class="btn-mainline-secondary !p-2 !shadow-none hover:rotate-12"
        >
          <RefreshCw 
            class="size-5 transition-transform"
            :class="{ 'animate-spin': isRefreshing }"
          />
        </button>
      </div>

      <!-- Category Tabs -->
      <div class="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        <button
          v-for="cat in categories"
          :key="cat.key"
          @click="selectedCategory = cat.key"
          class="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-200 shrink-0 border"
          :class="selectedCategory === cat.key
            ? 'bg-primary text-background-main border-primary shadow-soft shadow-primary/20'
            : 'bg-surface-main border-primary/20 text-text-sub hover:border-primary/50'"
        >
          <component
            v-if="cat.icon"
            :is="cat.icon"
            class="w-4 h-4"
          />
          <span>{{ cat.label }}</span>
          <span
            class="text-[10px] font-black px-1.5 py-0.5 rounded-lg min-w-[20px] text-center"
            :class="selectedCategory === cat.key
              ? 'bg-surface-main/20 text-background-main'
              : 'bg-primary/5 text-text-sub'"
          >{{ cat.count }}</span>
        </button>
      </div>

      <div v-if="rewards.length === 0" class="py-20 text-center bg-surface-main rounded-3xl border-2 border-dashed border-primary/10">
        <p class="text-xl font-black text-text-sub">{{ t('rewards.noRewards') }}</p>
        <button v-if="isAdmin" @click="openAddModal" class="mt-4 text-primary font-bold hover:underline">{{ t('rewards.addFirst') }}</button>
      </div>

      <div v-else-if="filteredRewards.length === 0" class="py-16 text-center bg-surface-main rounded-3xl border-2 border-dashed border-primary/10">
        <p class="text-lg font-bold text-text-sub">{{ t('rewards.noRewardsInCategory') }}</p>
      </div>

      <TransitionGroup
        v-else
        name="list"
        tag="div"
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
      >
        <div 
          v-for="reward in filteredRewards" 
          :key="reward.id"
          class="card-mainline !p-6 flex flex-col gap-6 group hover:shadow-offset-green"
          :class="{ 'opacity-50 grayscale': isExpired(reward.expiry_date) || reward.stock <= 0 }"
        >
          <!-- Expiry/Stock Badger -->
          <div class="flex justify-between items-start">
            <div class="size-14 border-2 border-primary rounded-xl flex items-center justify-center bg-surface-main shadow-offset-dark group-hover:bg-accent-green group-hover:text-background-main transition-all">
              <component :is="getIconComponent(reward.icon)" class="size-6" />
            </div>
            <div class="flex flex-col items-end gap-1">
              <span v-if="isExpired(reward.expiry_date)" class="badge-mainline !bg-accent-red !text-background-main">{{ t('rewards.expired') }}</span>
              <span v-else-if="reward.stock <= 0" class="badge-mainline !bg-text-sub/10 !text-text-sub">{{ t('rewards.soldOut') }}</span>
              <span v-else class="badge-mainline !bg-accent-green/10 !text-accent-green">{{ t('rewards.left', { count: reward.stock }) }}</span>
            </div>
          </div>

          <!-- Content -->
          <div class="flex-1">
            <h4 class="text-xl font-black text-primary leading-tight mb-2 truncate">{{ reward.title }}</h4>
            <div class="flex items-center gap-2">
              <span class="text-2xl font-black text-primary">{{ reward.points }}</span>
              <span class="text-[10px] font-black uppercase tracking-widest text-text-sub">pts</span>
            </div>
          </div>

          <!-- Action -->
          <div class="flex gap-2">
            <template v-if="isAdmin">
              <button @click="openEditModal(reward)" class="btn-mainline-secondary flex-1 !p-3 hover:rotate-12">
                <Edit2 class="size-5" />
              </button>
              <button @click="deleteReward(reward.id)" class="btn-mainline-secondary flex-1 !p-3 hover:rotate-12 hover:bg-red-50 hover:text-red-500">
                <Trash2 class="size-5" />
              </button>
            </template>
            <template v-else>
              <button 
                @click="redeemReward(reward)" 
                :disabled="isRedeemingReward || totalPoints < reward.points || reward.stock <= 0"
                class="btn-mainline flex-1 !p-3 flex items-center justify-center gap-2"
                :class="{ '!bg-primary/10 !text-text-sub !shadow-none !border-primary/5': totalPoints < reward.points || reward.stock <= 0 }"
              >
                <RefreshCw v-if="isRedeemingReward" class="size-4 animate-spin" />
                <span class="text-xs">{{ isRedeemingReward ? t('rewards.redeeming') : (totalPoints < reward.points ? t('rewards.needPoints') : t('rewards.redeem')) }}</span>
              </button>
            </template>
          </div>
        </div>
      </TransitionGroup>
    </section>

    <!-- Redemption Logs -->
    <section class="mt-8 border-t border-border-main pt-12">
      <div class="flex items-center gap-3 mb-8">
        <History class="text-primary w-8 h-8" />
        <h3 class="text-2xl font-black">{{ t('rewards.history') }}</h3>
      </div>

      <div class="card-mainline !p-0 overflow-hidden bg-surface-main">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-primary text-background-main border-b-2 border-primary">
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{{ t('rewards.table.reward') }}</th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{{ t('rewards.table.cost') }}</th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{{ t('rewards.table.date') }}</th>
              <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">{{ t('rewards.table.status') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y-2 divide-primary/5">
            <tr v-if="logs.length === 0">
              <td colspan="4" class="px-6 py-12 text-center text-text-sub font-black italic">{{ t('rewards.emptyHistory') }}</td>
            </tr>
            <tr v-for="log in logs" :key="log.id" class="group hover:bg-primary/5 transition-colors">
              <td class="px-6 py-6">
                <span class="font-black text-primary">{{ log.reward_title }}</span>
              </td>
              <td class="px-6 py-6">
                <span class="font-black text-accent-amber">-{{ log.spent_points }} pts</span>
              </td>
              <td class="px-6 py-6 text-xs font-black text-text-sub uppercase tracking-widest">{{ formatTime(log.timestamp) }}</td>
              <td class="px-6 py-6 text-right">
                <span class="badge-mainline !bg-accent-green/10 !text-accent-green">
                  {{ t('rewards.table.success') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || showEditModal" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background-main/20 backdrop-blur-[2px]" @click="showAddModal = false; showEditModal = false">
      <div 
        class="card-mainline max-w-lg w-full animate-rise flex flex-col !p-0 overflow-hidden bg-surface-main shadow-[20px_20px_0_var(--border)]"
        @click.stop
      >
        <header class="flex justify-between items-center border-b-2 border-primary p-8">
          <h3 class="text-3xl font-black">{{ showEditModal ? t('rewards.modal.edit') : t('rewards.modal.create') }}</h3>
          <button @click="showAddModal = false; showEditModal = false" class="hover:rotate-90 transition-transform">
            <X class="size-8" />
          </button>
        </header>

        <div class="p-8 flex flex-col gap-8 overflow-y-auto max-h-[60vh]">
          <!-- Title -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('rewards.modal.name') }}</label>
            <input v-model="rewardForm.title" type="text" :placeholder="t('rewards.modal.namePlaceholder')" class="input-mainline">
          </div>

          <!-- Points & Stock -->
          <div class="grid grid-cols-2 gap-6">
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('rewards.modal.price') }}</label>
              <input v-model.number="rewardForm.points" type="number" class="input-mainline text-center">
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('rewards.modal.stock') }}</label>
              <input v-model.number="rewardForm.stock" type="number" class="input-mainline text-center">
            </div>
          </div>

          <!-- Icon Select -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('rewards.modal.icon') }}</label>
            <div class="flex gap-4">
              <button 
                v-for="preset in iconPresets" 
                :key="preset.name"
                @click="rewardForm.icon = preset.name"
                class="size-12 border-2 border-primary rounded-xl flex items-center justify-center transition-all"
                :class="rewardForm.icon === preset.name ? 'bg-primary text-background-main shadow-offset-green' : 'bg-surface-main text-primary hover:bg-primary/5'"
              >
                <component :is="preset.icon" class="size-6" />
              </button>
            </div>
          </div>

          <!-- Expiry Date -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-text-sub">{{ t('rewards.modal.expiry') }}</label>
            <input v-model="rewardForm.expiryDate" type="date" class="input-mainline">
          </div>
        </div>

        <div class="p-8 border-t-2 border-primary">
          <button 
            @click="saveReward" 
            :disabled="isSavingReward"
            class="btn-mainline w-full !py-4 flex items-center justify-center gap-2"
          >
            <RefreshCw v-if="isSavingReward" class="size-5 animate-spin" />
            <span>{{ isSavingReward ? t('rewards.saving') : (showEditModal ? t('rewards.modal.btnUpdate') : t('rewards.modal.btnCreate')) }}</span>
          </button>
        </div>
      </div>
    </div>
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

.animate-in {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}
.fade-in {
  animation-name: fadeIn;
}
.zoom-in {
  animation-name: zoomIn;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Hide scrollbar for category tabs */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
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
