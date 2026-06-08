<template>
  <div class="reveal-container flex flex-col items-center justify-center p-4">
    <!-- Card wrapper for flip animation -->
    <div 
      class="card-wrapper relative w-64 h-96 transition-transform duration-700 preserve-3d cursor-pointer"
      :class="{ 'is-flipped': isFlipped }"
      @click="triggerFlip"
    >
      <!-- CARD BACK -->
      <div class="card-face card-back absolute inset-0 flex flex-col items-center justify-center rounded-3xl p-6 shadow-2xl">
        <div class="back-design border-4 border-dashed border-white/20 rounded-2xl w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/30 to-primary-dark/30">
          <span class="text-6xl animate-bounce">🎁</span>
          <h3 class="text-xl font-black text-white mt-4 tracking-widest uppercase">
            {{ isZh ? '点击翻牌' : 'TAP TO FLIP' }}
          </h3>
          <p class="text-xs text-white/60 mt-2">Homework Hero</p>
        </div>
      </div>

      <!-- CARD FRONT -->
      <div class="card-face card-front absolute inset-0 rounded-3xl overflow-hidden shadow-2xl">
        <CardFrame 
          :card="card" 
          :locale="locale"
          :clickable="false"
          class="w-full h-full"
        />
      </div>
    </div>

    <!-- Details overlay below the card after reveal -->
    <Transition name="fade">
      <div v-if="isFlipped" class="mt-8 text-center max-w-sm">
        <span 
          class="inline-block text-xs font-extrabold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm"
          :class="rarityClass"
        >
          {{ isZh ? '稀有度: ' : 'Rarity: ' }}{{ rarityLabel }}
        </span>
        <h2 class="text-2xl font-black mt-3 text-content-main">
          {{ isZh ? card.name.zh : card.name.en }}
        </h2>
        <p class="text-sm text-content-sub mt-2 italic px-4">
          "{{ isZh ? card.description.zh : card.description.en }}"
        </p>
        <button 
          @click="$emit('next')" 
          class="btn-mainline mt-6"
        >
          {{ isZh ? '继续' : 'Next' }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import CardFrame from './CardFrame.vue';
import { triggerConfetti } from '../../utils/confetti';

const props = defineProps({
  card: {
    type: Object,
    required: true
  },
  locale: {
    type: String,
    default: 'zh'
  }
});

const emit = defineEmits(['next', 'revealed']);

const isFlipped = ref(false);

const isZh = computed(() => props.locale === 'zh');

const rarityLabel = computed(() => {
  const rarities = {
    N: isZh.value ? '普通' : 'Normal',
    R: isZh.value ? '稀有' : 'Rare',
    SR: isZh.value ? '超稀有' : 'Super Rare',
    SSR: isZh.value ? '传说' : 'Legendary'
  };
  return rarities[props.card.rarity] || props.card.rarity;
});

const rarityClass = computed(() => {
  return {
    'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200': props.card.rarity === 'N',
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200': props.card.rarity === 'R',
    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200': props.card.rarity === 'SR',
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200': props.card.rarity === 'SSR'
  };
});

const triggerFlip = () => {
  if (isFlipped.value) return;
  isFlipped.value = true;
  emit('revealed', props.card);

  // If SSR card, trigger confetti
  if (props.card.rarity === 'SSR') {
    triggerConfetti();
  }
};

// Reset flip when card changes
watch(() => props.card, () => {
  isFlipped.value = false;
});
</script>

<style scoped>
.reveal-container {
  min-height: 500px;
}

.preserve-3d {
  transform-style: preserve-3d;
}

.card-wrapper {
  perspective: 1000px;
}

.card-face {
  backface-visibility: hidden;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-back {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border: 4px solid #f2b84b; /* Gold border */
}

.card-front {
  transform: rotateY(180deg);
}

.is-flipped .card-back {
  transform: rotateY(180deg);
}

.is-flipped .card-front {
  transform: rotateY(360deg);
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
