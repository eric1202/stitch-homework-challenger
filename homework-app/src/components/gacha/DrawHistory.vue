<template>
  <div class="history-container w-full max-w-4xl mx-auto p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <button 
          @click="$emit('back')" 
          class="text-content-sub hover:text-content-main flex items-center gap-1 font-bold text-sm mb-2"
        >
          <span>←</span> {{ isZh ? '返回抽卡' : 'Back to Gacha' }}
        </button>
        <h2 class="text-3xl font-black text-content-main">
          {{ isZh ? '抽卡记录' : 'Draw History' }}
        </h2>
      </div>
    </div>

    <!-- History Table/List -->
    <div v-if="drawRecords.length > 0" class="bg-surface-main rounded-2xl border border-primary/10 shadow-md overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-variant border-b border-primary/10 text-xs font-bold text-content-sub uppercase tracking-wider">
              <th class="p-4">{{ isZh ? '时间' : 'Time' }}</th>
              <th class="p-4">{{ isZh ? '类型' : 'Type' }}</th>
              <th class="p-4 text-center">{{ isZh ? '消耗' : 'Cost' }}</th>
              <th class="p-4">{{ isZh ? '获得卡片' : 'Cards Obtained' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-primary/5 text-sm text-content-main">
            <tr v-for="record in drawRecords" :key="record.id" class="hover:bg-primary/5 transition-colors">
              <!-- Time -->
              <td class="p-4 whitespace-nowrap text-xs text-content-sub">
                {{ formatTime(record.created_at) }}
              </td>

              <!-- Type -->
              <td class="p-4 whitespace-nowrap font-bold">
                <span 
                  class="px-2.5 py-1 rounded-full text-xs"
                  :class="record.draw_type === 'ten' ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'"
                >
                  {{ record.draw_type === 'ten' ? (isZh ? '十连抽' : '10-Pull') : (isZh ? '单抽' : 'Single') }}
                </span>
              </td>

              <!-- Cost -->
              <td class="p-4 whitespace-nowrap text-center font-bold text-amber-500">
                -{{ record.cost_points }} Pts
              </td>

              <!-- Card Preview Obtained -->
              <td class="p-4">
                <div class="flex flex-wrap gap-1.5 items-center">
                  <div 
                    v-for="(cardId, index) in parseResultCards(record.result_cards)" 
                    :key="index"
                    class="relative group cursor-help"
                  >
                    <span 
                      class="inline-flex items-center justify-center w-10 h-10 rounded-lg border overflow-hidden bg-surface-variant hover:scale-110 active:scale-95 transition-all shadow-sm"
                      :class="rarityBorderClass(cardId)"
                      :title="getCardName(cardId)"
                    >
                      <img
                        v-if="getCardImage(cardId)"
                        :src="getCardImage(cardId)"
                        :alt="getCardName(cardId)"
                        class="w-full h-full object-cover"
                      />
                      <span v-else class="text-lg">{{ getCardEmoji(cardId) }}</span>
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-20 bg-surface-variant/40 rounded-3xl border-2 border-dashed border-primary/10">
      <span class="text-5xl">📜</span>
      <h3 class="text-lg font-bold text-content-main mt-4">
        {{ isZh ? '还没有抽卡记录' : 'No draw records' }}
      </h3>
      <p class="text-sm text-content-sub mt-1">
        {{ isZh ? '快去抽取你的第一张卡片吧！' : 'Draw your very first card to start the log!' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { CARDS } from '../../gacha/cardData';

const props = defineProps({
  drawRecords: {
    type: Array,
    default: () => []
  },
  locale: {
    type: String,
    default: 'zh'
  }
});

defineEmits(['back']);

const isZh = computed(() => props.locale === 'zh');

// Parse result_cards JSON safely
const parseResultCards = (resultCards) => {
  if (!resultCards) return [];
  if (Array.isArray(resultCards)) return resultCards;
  try {
    return typeof resultCards === 'string' ? JSON.parse(resultCards) : resultCards;
  } catch (e) {
    return [];
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  const d = new Date(timeStr);
  return d.toLocaleString(props.locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getCardEmoji = (cardId) => {
  const match = CARDS.find(c => c.id === cardId);
  return match ? match.emoji : '❓';
};

const getCardImage = (cardId) => {
  const match = CARDS.find(c => c.id === cardId);
  return match?.image || '';
};

const getCardName = (cardId) => {
  const match = CARDS.find(c => c.id === cardId);
  if (!match) return 'Unknown';
  return isZh.value ? match.name.zh : match.name.en;
};

const rarityBorderClass = (cardId) => {
  const match = CARDS.find(c => c.id === cardId);
  if (!match) return 'border-slate-200';
  return {
    'border-slate-300 dark:border-slate-700': match.rarity === 'N',
    'border-cyan-400 dark:border-cyan-700': match.rarity === 'R',
    'border-purple-400 dark:border-purple-700': match.rarity === 'SR',
    'border-amber-400 dark:border-amber-700': match.rarity === 'SSR'
  };
};
</script>

<style scoped>
.history-container {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
