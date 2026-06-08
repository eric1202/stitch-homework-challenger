<template>
  <div class="ten-pull-container w-full max-w-4xl mx-auto p-4 flex flex-col items-center">
    <h2 class="text-3xl font-black mb-8 text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
      {{ isZh ? '召唤结果' : 'Draw Results' }}
    </h2>

    <!-- Grid Layout for 10 cards -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 md:gap-6 justify-center w-full">
      <div 
        v-for="(card, index) in cards" 
        :key="index"
        class="card-slot relative flex flex-col items-center transition-all duration-500"
        :style="{ animationDelay: `${index * 150}ms` }"
        :class="{ 'animate-fade-in-up': animate }"
      >
        <CardFrame 
          :card="card" 
          :locale="locale"
          :clickable="true"
          @click="showDetail"
          class="shadow-lg hover:shadow-xl w-full max-w-[140px]"
        />
        
        <!-- NEW flag badge -->
        <span 
          v-if="isNewList[index]" 
          class="new-badge absolute -top-1.5 -left-1.5 bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase shadow-md border border-white animate-bounce z-20"
        >
          {{ isZh ? '新卡!' : 'NEW!' }}
        </span>

        <!-- Pity upgrade label (Subtle) -->
        <span 
          v-if="card.isPityUpgraded" 
          class="absolute -bottom-2.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow border border-blue-400 z-20"
        >
          {{ isZh ? '保底' : 'Pity' }}
        </span>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex flex-col sm:flex-row gap-4 mt-12 w-full justify-center">
      <button 
        @click="$emit('again')" 
        class="btn-mainline flex items-center justify-center gap-2 !bg-accent-amber !text-slate-900 border-accent-amber shadow-offset-amber"
      >
        <span>🔄</span>
        {{ isZh ? '再来十连' : 'Draw 10 Again' }}
      </button>

      <button 
        @click="$emit('viewCollection')" 
        class="btn-mainline-secondary flex items-center justify-center gap-2"
      >
        <span>📂</span>
        {{ isZh ? '查看图鉴' : 'View Collection' }}
      </button>
      
      <button 
        @click="$emit('close')" 
        class="btn-mainline-secondary flex items-center justify-center gap-2"
      >
        <span>❌</span>
        {{ isZh ? '返回' : 'Back' }}
      </button>
    </div>

    <!-- Card Detail Modal -->
    <div 
      v-if="selectedCard" 
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity"
      @click="selectedCard = null"
    >
      <div 
        class="bg-surface-main rounded-3xl max-w-sm w-full p-6 shadow-2xl border-2 border-primary/20 flex flex-col items-center text-center relative animate-scale-in"
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
          :locale="locale"
          :clickable="false"
          class="w-44 h-66 border-4"
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

        <p class="text-sm text-content-sub mt-2 italic">
          "{{ isZh ? selectedCard.description.zh : selectedCard.description.en }}"
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import CardFrame from './CardFrame.vue';

const props = defineProps({
  cards: {
    type: Array,
    required: true
  },
  isNewList: {
    type: Array,
    default: () => []
  },
  locale: {
    type: String,
    default: 'zh'
  }
});

defineEmits(['again', 'viewCollection', 'close']);

const isZh = computed(() => props.locale === 'zh');
const animate = ref(false);
const selectedCard = ref(null);

const rarityClass = computed(() => {
  if (!selectedCard.value) return {};
  return {
    'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200': selectedCard.value.rarity === 'N',
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200': selectedCard.value.rarity === 'R',
    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200': selectedCard.value.rarity === 'SR',
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200': selectedCard.value.rarity === 'SSR'
  };
});

const showDetail = (card) => {
  selectedCard.value = card;
};

onMounted(() => {
  setTimeout(() => {
    animate.value = true;
  }, 50);
});
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  opacity: 0;
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
