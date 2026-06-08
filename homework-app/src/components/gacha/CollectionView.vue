<template>
  <div class="collection-container w-full max-w-6xl mx-auto p-4">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <button
          @click="$emit('back')"
          class="text-content-sub hover:text-content-main flex items-center gap-1 font-bold text-sm mb-2"
        >
          <span>←</span> {{ isZh ? '返回抽卡' : 'Back to Gacha' }}
        </button>
        <h2 class="text-3xl font-black text-content-main">
          {{ isZh ? '我的分类图鉴' : 'My Themed Collection' }}
        </h2>
      </div>

      <div class="flex-1 max-w-sm bg-surface-variant p-4 rounded-2xl border border-primary/10 shadow-sm flex flex-col justify-center">
        <div class="flex justify-between text-sm font-bold text-content-main mb-1.5">
          <span>{{ isZh ? '收集进度' : 'Progress' }}</span>
          <span>{{ ownedCount }} / {{ totalCount }} ({{ percentage }}%)</span>
        </div>
        <div class="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
          <div
            class="bg-gradient-to-r from-primary to-accent h-full transition-all duration-1000"
            :style="{ width: `${percentage}%` }"
          ></div>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 mb-6 border-b border-primary/10 pb-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="category in categoryTabs"
          :key="category.id"
          @click="selectedCategory = category.id"
          class="px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm border"
          :class="selectedCategory === category.id ? 'bg-primary text-white border-primary' : 'bg-surface-variant text-content-sub border-primary/10 hover:text-content-main'"
        >
          {{ category.icon }} {{ isZh ? category.name.zh : category.name.en }}
        </button>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex gap-2">
          <button
            v-for="tab in filterTabs"
            :key="tab.id"
            @click="activeFilter = tab.id"
            class="px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm"
            :class="activeFilter === tab.id ? 'bg-primary text-white' : 'bg-surface-variant text-content-sub hover:text-content-main'"
          >
            {{ isZh ? tab.label.zh : tab.label.en }}
          </button>
        </div>

        <div class="flex gap-1.5">
          <button
            v-for="rarity in ['ALL', 'N', 'R', 'SR', 'SSR']"
            :key="rarity"
            @click="selectedRarity = rarity"
            class="w-10 h-8 flex items-center justify-center rounded-lg text-xs font-black transition-all border"
            :class="rarityButtonClass(rarity)"
          >
            {{ rarity }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="filteredCards.length > 0" class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <div v-for="card in filteredCards" :key="card.id" class="flex flex-col items-center">
        <CardFrame
          :card="card"
          :is-locked="!isOwned(card.id)"
          :count="getOwnedCount(card.id)"
          :locale="locale"
          :clickable="true"
          @click="showDetail"
          class="w-full max-w-[160px] hover:-translate-y-1"
        />
      </div>
    </div>

    <div v-else class="text-center py-20 bg-surface-variant/40 rounded-3xl border-2 border-dashed border-primary/10">
      <span class="text-5xl">📭</span>
      <h3 class="text-lg font-bold text-content-main mt-4">
        {{ isZh ? '暂无匹配的卡片' : 'No matching cards' }}
      </h3>
      <p class="text-sm text-content-sub mt-1">
        {{ isZh ? '切换分类或继续抽卡来解锁更多卡面。' : 'Switch pools or keep drawing to unlock more card art.' }}
      </p>
    </div>

    <div
      v-if="selectedCard"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity"
      @click="selectedCard = null"
    >
      <div
        class="bg-surface-main rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-primary/20 flex flex-col items-center text-center relative"
        @click.stop
      >
        <button
          @click="selectedCard = null"
          class="absolute top-4 right-4 text-content-sub hover:text-content-main text-lg"
        >
          ✕
        </button>

        <CardFrame
          :card="selectedCard"
          :is-locked="!isOwned(selectedCard.id)"
          :count="getOwnedCount(selectedCard.id)"
          :locale="locale"
          :clickable="false"
          class="w-52"
        />

        <span
          class="inline-block text-xs font-extrabold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm mt-4"
          :class="rarityClass"
        >
          {{ isZh ? '稀有度: ' : 'Rarity: ' }}{{ selectedCard.rarity }}
        </span>

        <h3 class="text-xl font-bold mt-3 text-content-main">
          {{ isZh ? selectedCard.name.zh : selectedCard.name.en }}
        </h3>

        <p class="text-xs font-bold uppercase tracking-[0.22em] text-content-sub mt-2">
          {{ (isZh ? selectedCard.categoryName.zh : selectedCard.categoryName.en) || selectedCard.category }}
        </p>

        <div class="w-full mt-4 border-t border-primary/10 pt-4 text-left text-xs text-content-sub space-y-2">
          <div class="flex justify-between">
            <span>{{ isZh ? '首次获得时间' : 'First Obtained' }}</span>
            <span class="font-semibold text-content-main">{{ formatObtainedTime(selectedCard.id) }}</span>
          </div>
          <div class="flex justify-between">
            <span>{{ isZh ? '持有数量' : 'Owned Count' }}</span>
            <span class="font-semibold text-content-main">{{ getOwnedCount(selectedCard.id) }}</span>
          </div>
        </div>

        <p class="text-sm text-content-sub mt-4 italic border-t border-primary/10 pt-4 w-full">
          "{{ isZh ? selectedCard.description.zh : selectedCard.description.en }}"
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import CardFrame from './CardFrame.vue';
import { CARDS, CARD_CATEGORIES } from '../../gacha/cardData';

const props = defineProps({
  userCards: {
    type: Array,
    default: () => []
  },
  locale: {
    type: String,
    default: 'zh'
  },
  activeCategoryId: {
    type: String,
    default: 'all'
  }
});

defineEmits(['back']);

const isZh = computed(() => props.locale === 'zh');
const selectedCategory = ref(props.activeCategoryId || 'all');
const activeFilter = ref('all');
const selectedRarity = ref('ALL');
const selectedCard = ref(null);

watch(() => props.activeCategoryId, (newValue) => {
  if (newValue) {
    selectedCategory.value = newValue;
  }
});

const categoryTabs = computed(() => [
  { id: 'all', icon: '🗂️', name: { zh: '全部分类', en: 'All Categories' } },
  ...CARD_CATEGORIES.map(category => ({
    id: category.id,
    icon: category.icon,
    name: category.name
  }))
]);

const filterTabs = [
  { id: 'all', label: { zh: '全部', en: 'All' } },
  { id: 'owned', label: { zh: '已拥有', en: 'Owned' } },
  { id: 'missing', label: { zh: '未拥有', en: 'Missing' } }
];

const visibleCards = computed(() => {
  if (selectedCategory.value === 'all') return CARDS;
  return CARDS.filter(card => card.category === selectedCategory.value);
});

const totalCount = computed(() => visibleCards.value.length);
const ownedCount = computed(() => visibleCards.value.filter(card => isOwned(card.id)).length);
const percentage = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((ownedCount.value / totalCount.value) * 100);
});

const isOwned = (cardId) => props.userCards.some(uc => uc.card_id === cardId && uc.count > 0);

const getOwnedCount = (cardId) => {
  const match = props.userCards.find(uc => uc.card_id === cardId);
  return match ? match.count : 0;
};

const formatObtainedTime = (cardId) => {
  const match = props.userCards.find(uc => uc.card_id === cardId);
  if (!match || !match.first_obtained_at) return '-';
  const d = new Date(match.first_obtained_at);
  return d.toLocaleString(props.locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const rarityButtonClass = (rarity) => {
  const isSelected = selectedRarity.value === rarity;
  if (rarity === 'ALL') {
    return isSelected ? 'bg-primary text-white border-primary' : 'bg-surface-variant text-content-sub border-primary/10 hover:text-content-main';
  }
  const rarityColors = {
    N: 'border-slate-400 text-slate-500',
    R: 'border-cyan-500 text-cyan-600',
    SR: 'border-purple-500 text-purple-600',
    SSR: 'border-amber-500 text-amber-600'
  };
  const activeBgColors = {
    N: 'bg-slate-400 text-white border-slate-400',
    R: 'bg-cyan-500 text-white border-cyan-500',
    SR: 'bg-purple-500 text-white border-purple-500',
    SSR: 'bg-amber-500 text-white border-amber-500'
  };

  return isSelected ? activeBgColors[rarity] : `bg-surface-variant border-primary/10 hover:border-slate-300 ${rarityColors[rarity]}`;
};

const filteredCards = computed(() => {
  return visibleCards.value.filter(card => {
    if (activeFilter.value === 'owned' && !isOwned(card.id)) return false;
    if (activeFilter.value === 'missing' && isOwned(card.id)) return false;
    if (selectedRarity.value !== 'ALL' && card.rarity !== selectedRarity.value) return false;
    return true;
  });
});

const showDetail = (card) => {
  selectedCard.value = card;
};

const rarityClass = computed(() => {
  if (!selectedCard.value) return {};
  return {
    'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200': selectedCard.value.rarity === 'N',
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200': selectedCard.value.rarity === 'R',
    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200': selectedCard.value.rarity === 'SR',
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200': selectedCard.value.rarity === 'SSR'
  };
});
</script>

<style scoped>
.collection-container {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
