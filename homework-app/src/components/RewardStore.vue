<script setup>
import { ref, computed, onUnmounted, onMounted } from 'vue';
import { db } from '../db';
import { liveQuery } from 'dexie';
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
  { name: 'Gamepad2', icon: Gamepad2, color: 'text-blue-500' },
  { name: 'IceCream', icon: IceCream, color: 'text-pink-500' },
  { name: 'Palmtree', icon: Palmtree, color: 'text-green-500' },
  { name: 'Book', icon: Book, color: 'text-purple-500' },
  { name: 'Gift', icon: Gift, color: 'text-amber-500' }
];

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
    
    const allTasks = await db.tasks.where('user_name').equals(userName.value).toArray();
    let spent = 0;
    const spentPointsLogs = await db.redemptionLogs.where('user_name').equals(userName.value).toArray();
    spent = spentPointsLogs.reduce((sum, log) => sum + (log.spent_points || 0), 0);
    const earned = allTasks
      .filter(task => task.completed)
      .reduce((sum, task) => sum + (Number(task.points) || 0), 0);
    totalPoints.value = earned - spent;
  } catch (error) {
    console.error('Failed to refresh rewards:', error);
    alert('刷新失败，请重试');
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
      const allTasks = await db.tasks.where('user_name').equals(name).toArray();
      let spent = 0;
      
      const spentPointsLogs = await db.redemptionLogs.where('user_name').equals(name).toArray();
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


// --- Computed ---
const isExpired = (expiryDate) => {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date().setHours(0, 0, 0, 0);
};

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
  if (confirm('Are you sure you want to delete this reward?')) {
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
      if (freshReward.stock <= 0) throw new Error('Out of stock!');

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
    alert('Redemption failed: ' + err.message);
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
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex flex-col gap-2">
        <h2 class="text-4xl md:text-5xl font-black tracking-tight leading-tight">
          {{ isAdmin ? t('rewards.manageTitle') : t('rewards.title') }} 🎁
        </h2>
        <p class="text-lg font-medium text-text-sub-light dark:text-text-sub-dark">
          {{ t('rewards.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-4">
        <!-- Admin Toggle -->
        <button 
          @click="isAdmin = !isAdmin"
          class="flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm"
          :class="isAdmin ? 'bg-primary text-black' : 'bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-gray-800'"
        >
          <Edit2 class="w-4 h-4" />
          {{ isAdmin ? t('rewards.exitParentMode') : t('rewards.parentMode') }}
        </button>

        <button 
          v-if="isAdmin" 
          @click="openAddModal" 
          class="bg-black text-white dark:bg-white dark:text-black font-black px-6 py-3 rounded-2xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          <Plus class="w-5 h-5" />
          <span>{{ t('rewards.addNew') }}</span>
        </button>
      </div>
    </header>

    <!-- Points Banner -->
    <div class="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-3xl shadow-lg shadow-primary/20 flex items-center justify-between text-black overflow-hidden relative group">
      <div class="absolute -right-4 -top-4 size-32 bg-white/20 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
      <div class="relative z-10">
        <p class="text-xs font-black uppercase tracking-widest opacity-70">{{ t('rewards.availableBalance') }}</p>
        <div class="flex items-baseline gap-2">
          <span class="text-5xl font-black">{{ totalPoints }}</span>
          <span class="text-xl font-bold">pts</span>
        </div>
      </div>
      <History class="w-16 h-16 opacity-20 relative z-10" />
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
          <span class="text-xs font-bold">{{ isRefreshing ? '刷新中...' : '下拉刷新' }}</span>
        </div>
      </div>
      
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-2xl font-black flex items-center gap-2">
          <Gift class="w-8 h-8 text-primary" />
          {{ t('rewards.rewardsList') || '奖励列表' }}
        </h3>
        <button 
          @click="refreshRewards"
          :disabled="isRefreshing"
          class="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          :title="isRefreshing ? '刷新中...' : '刷新列表'"
        >
          <RefreshCw 
            class="w-5 h-5 transition-transform duration-200"
            :class="{ 'animate-spin': isRefreshing }"
          />
        </button>
      </div>
      
      <div v-if="rewards.length === 0" class="py-20 text-center bg-surface-light dark:bg-surface-dark rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
        <p class="text-xl font-black text-text-sub-light">{{ t('rewards.noRewards') }}</p>
        <button v-if="isAdmin" @click="openAddModal" class="mt-4 text-primary font-bold hover:underline">{{ t('rewards.addFirst') }}</button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div 
          v-for="reward in rewards" 
          :key="reward.id"
          class="relative bg-surface-light dark:bg-surface-dark p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 flex flex-col gap-4 group"
          :class="{ 'opacity-60 grayscale scale-[0.98]': isExpired(reward.expiry_date) || reward.stock <= 0 }"
        >
          <!-- Expiry/Stock Badger -->
          <div class="absolute top-4 right-4 flex flex-col items-end gap-1">
            <span v-if="isExpired(reward.expiry_date)" class="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-lg uppercase">{{ t('rewards.expired') }}</span>
            <span v-else-if="reward.stock <= 0" class="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg uppercase">{{ t('rewards.soldOut') }}</span>
            <span v-else class="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-black rounded-lg uppercase whitespace-nowrap">{{ t('rewards.left', { count: reward.stock }) }}</span>
          </div>

          <!-- Icon Box -->
          <div class="size-16 rounded-2xl bg-background-light dark:bg-background-dark flex items-center justify-center transition-transform group-hover:scale-110 duration-500">
            <component :is="getIconComponent(reward.icon)" :class="['w-8 h-8', getIconColor(reward.icon)]" />
          </div>

          <!-- Content -->
          <div>
            <h4 class="text-lg font-black truncate">{{ reward.title }}</h4>
            <div class="flex items-center gap-1.5 text-text-sub-light dark:text-text-sub-dark mt-1">
              <span class="text-base font-black text-primary">{{ reward.points }}</span>
              <span class="text-xs font-bold uppercase tracking-wider">pts</span>
            </div>
            <div v-if="reward.expiry_date" class="flex items-center gap-1 mt-2 text-[10px] font-bold text-text-sub-light">
              <Clock class="w-3 h-3" />
              <span>{{ t('rewards.ends', { date: new Date(reward.expiry_date).toLocaleDateString() }) }}</span>
            </div>
          </div>

          <!-- Action -->
          <div class="mt-auto pt-4 border-t border-gray-50 dark:border-gray-800/50 flex gap-2">
            <template v-if="isAdmin">
              <button @click="openEditModal(reward)" class="flex-1 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-primary transition-all rounded-xl flex items-center justify-center">
                <Edit2 class="w-4 h-4" />
              </button>
              <button @click="deleteReward(reward.id)" class="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-xl flex items-center justify-center">
                <Trash2 class="w-4 h-4" />
              </button>
            </template>
            <template v-else>
              <button 
                @click="redeemReward(reward)"
                :disabled="totalPoints < reward.points || reward.stock <= 0 || isExpired(reward.expiry_date) || isRedeemingReward"
                class="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2"
                :class="totalPoints >= reward.points && !isRedeemingReward ? 'bg-primary text-black hover:bg-primary-dark shadow-primary/20' : 'bg-gray-100 text-gray-400'"
              >
                <RefreshCw 
                  v-if="isRedeemingReward"
                  class="w-4 h-4 animate-spin"
                />
                <span>{{ isRedeemingReward ? '兑换中...' : (totalPoints < reward.points ? t('rewards.needPoints') : t('rewards.redeem')) }}</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- Redemption Logs -->
    <section class="mt-8 border-t border-gray-100 dark:border-gray-800 pt-12">
      <div class="flex items-center gap-3 mb-8">
        <History class="text-primary w-8 h-8" />
        <h3 class="text-2xl font-black">{{ t('rewards.history') }}</h3>
      </div>

      <div class="bg-surface-light dark:bg-surface-dark rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-background-light dark:bg-background-dark/50 border-b border-gray-100 dark:border-gray-800">
              <th class="px-6 py-4 text-[10px] font-black text-text-sub-light uppercase tracking-widest">{{ t('rewards.table.reward') }}</th>
              <th class="px-6 py-4 text-[10px] font-black text-text-sub-light uppercase tracking-widest">{{ t('rewards.table.cost') }}</th>
              <th class="px-6 py-4 text-[10px] font-black text-text-sub-light uppercase tracking-widest">{{ t('rewards.table.date') }}</th>
              <th class="px-6 py-4 text-[10px] font-black text-text-sub-light uppercase tracking-widest text-right">{{ t('rewards.table.status') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
            <tr v-if="logs.length === 0">
              <td colspan="4" class="px-6 py-12 text-center text-text-sub-light font-medium italic">{{ t('rewards.emptyHistory') }}</td>
            </tr>
            <tr v-for="log in logs" :key="log.id" class="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <td class="px-6 py-4">
                <span class="font-black">{{ log.reward_title }}</span>
              </td>
              <td class="px-6 py-4">
                <span class="font-bold text-red-500">-{{ log.spent_points }} pts</span>
              </td>
              <td class="px-6 py-4 text-xs font-medium text-text-sub-light">{{ formatTime(log.timestamp) }}</td>
              <td class="px-6 py-4 text-right">
                <span class="inline-flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase">
                  <CheckCircle2 class="w-3 h-3" /> {{ t('rewards.table.success') }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || showEditModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div class="bg-surface-light dark:bg-surface-dark p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-800 animate-in zoom-in duration-300 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        <header class="flex justify-between items-center">
          <h3 class="text-2xl font-black">{{ showEditModal ? t('rewards.modal.edit') : t('rewards.modal.create') }} 🎁</h3>
          <button @click="showAddModal = false; showEditModal = false" class="p-2 bg-gray-50 dark:bg-gray-800 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all">
            <X class="w-5 h-5" />
          </button>
        </header>

        <div class="flex flex-col gap-4">
          <!-- Title -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{{ t('rewards.modal.name') }}</label>
            <input v-model="rewardForm.title" type="text" :placeholder="t('rewards.modal.namePlaceholder')" class="bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-primary transition-all">
          </div>

          <!-- Points & Stock -->
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{{ t('rewards.modal.price') }}</label>
              <input v-model.number="rewardForm.points" type="number" class="bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-primary transition-all text-center">
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{{ t('rewards.modal.stock') }}</label>
              <input v-model.number="rewardForm.stock" type="number" class="bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-primary transition-all text-center">
            </div>
          </div>

          <!-- Icon Select -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{{ t('rewards.modal.icon') }}</label>
            <div class="flex gap-3 mt-1">
              <button 
                v-for="preset in iconPresets" 
                :key="preset.name"
                @click="rewardForm.icon = preset.name"
                class="size-12 rounded-xl flex items-center justify-center transition-all border-2"
                :class="rewardForm.icon === preset.name ? 'border-primary bg-primary/10 shadow-sm' : 'border-transparent bg-background-light dark:bg-background-dark hover:border-gray-200'"
              >
                <component :is="preset.icon" :class="['w-6 h-6', preset.color]" />
              </button>
            </div>
          </div>

          <!-- Expiry Date -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-black uppercase tracking-widest text-text-sub-light px-1">{{ t('rewards.modal.expiry') }}</label>
            <input v-model="rewardForm.expiryDate" type="date" class="bg-background-light dark:bg-background-dark border-transparent focus:border-primary rounded-2xl p-4 font-bold outline-none ring-1 ring-gray-100 dark:ring-gray-800 focus:ring-primary transition-all">
          </div>
        </div>

        <button 
          @click="saveReward" 
          :disabled="isSavingReward"
          class="w-full py-5 bg-primary text-black font-black rounded-3xl shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 uppercase tracking-widest text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <RefreshCw 
            v-if="isSavingReward"
            class="w-5 h-5 animate-spin"
          />
          <span>{{ isSavingReward ? '保存中...' : (showEditModal ? t('rewards.modal.btnUpdate') : t('rewards.modal.btnCreate')) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}
</style>
