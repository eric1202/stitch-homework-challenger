<template>
  <div class="gacha-main flex flex-col gap-4 md:gap-8 pb-6 md:pb-10">
    <header class="flex flex-col gap-4 md:gap-8 mb-2 md:mb-4">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex flex-col gap-4">
          <span class="badge-mainline w-fit">{{ isZh ? '召唤卡池' : 'Gacha Summon' }}</span>
          <h1 class="text-3xl md:text-7xl font-black text-primary leading-[0.9] -ml-0.5 md:-ml-1">
            {{ t('gacha.title') }}
          </h1>
          <p class="text-sm md:text-xl font-medium text-text-sub max-w-2xl leading-relaxed">
            {{ activePool.description[locale] || activePool.description.en }}
          </p>
        </div>

        <div class="flex items-center gap-4">
          <button
            @click="activeSubView = 'collection'"
            class="btn-mainline-secondary flex items-center gap-2"
          >
            <span>🎴</span>
            <span>{{ isZh ? '图鉴' : 'Collection' }}</span>
          </button>

          <button
            @click="activeSubView = 'history'"
            class="btn-mainline-secondary flex items-center gap-2"
          >
            <span>📜</span>
            <span>{{ isZh ? '记录' : 'History' }}</span>
          </button>
        </div>
      </div>
    </header>

    <div v-if="activeSubView === 'collection'">
      <CollectionView
        :user-cards="userCards"
        :locale="locale"
        :active-category-id="activePool.categoryId"
        @back="activeSubView = 'main'"
      />
    </div>

    <div v-else-if="activeSubView === 'history'">
      <DrawHistory
        :draw-records="drawRecords"
        :locale="locale"
        @back="activeSubView = 'main'"
      />
    </div>

    <div v-else class="flex flex-col gap-8">
      <div class="card-mainline bg-accent-green/5 flex items-center justify-between p-4 md:p-8">
        <div class="flex flex-col gap-2">
          <p class="text-[10px] font-black uppercase tracking-widest text-text-sub">
            {{ isZh ? '我的当前积分' : 'Available Balance' }}
          </p>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl md:text-6xl font-black text-primary leading-none">{{ totalPoints }}</span>
            <span class="text-lg md:text-xl font-black text-primary uppercase">pts</span>
          </div>
        </div>

        <div class="text-right flex flex-col gap-1">
          <span class="text-xs text-text-sub font-bold">{{ isZh ? '当前卡池进度' : 'Current Pool Progress' }}</span>
          <span class="text-2xl font-black text-primary">
            {{ collectedUniqueCount }} / {{ totalCardsCount }}
          </span>
          <span class="text-[10px] text-text-sub font-bold bg-primary/10 px-2 py-0.5 rounded-full">
            {{ isZh ? '保底十连2R或1SR' : 'Pity Guaranteed' }}
          </span>
        </div>
      </div>

      <div v-if="state === 'idle'" class="flex flex-col gap-6">
        <div class="grid grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
          <button
            v-for="poolOption in GACHA_POOLS"
            :key="poolOption.id"
            @click="selectPool(poolOption.id)"
            class="pool-tab text-left rounded-3xl border-2 p-3 md:p-4 transition-all duration-300"
            :class="poolOption.id === activePoolId ? 'border-primary bg-primary/8 shadow-lg -translate-y-1' : 'border-primary/10 bg-surface-main hover:border-primary/30 hover:-translate-y-1'"
          >
            <div class="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 mb-3">
              <img
                :src="poolOption.coverImage"
                :alt="poolOption.name[locale] || poolOption.name.en"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-black uppercase tracking-[0.22em] text-text-sub">{{ poolOption.icon }} {{ isZh ? '分类卡池' : 'Theme Pool' }}</p>
                <h3 class="text-sm md:text-base font-black text-primary mt-1 leading-tight">
                  {{ poolOption.name[locale] || poolOption.name.en }}
                </h3>
              </div>
              <span class="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
                {{ getCollectedCountByPool(poolOption) }}/{{ poolOption.cards.length }}
              </span>
            </div>
          </button>
        </div>

        <div class="gacha-play-board flex flex-col lg:flex-row gap-6 lg:items-stretch p-5 md:p-8 bg-surface-main rounded-3xl border-2 border-primary/10 shadow-lg relative overflow-hidden">
          <div class="flex-1 flex flex-col gap-5">
            <div class="flex items-center gap-3">
              <span class="text-4xl">{{ activePool.icon }}</span>
              <div>
                <p class="text-xs font-black uppercase tracking-[0.22em] text-text-sub">{{ isZh ? '当前卡池' : 'Active Pool' }}</p>
                <h2 class="text-2xl md:text-4xl font-black text-primary leading-tight">
                  {{ activePool.name[locale] || activePool.name.en }}
                </h2>
              </div>
            </div>

            <p class="text-sm md:text-base text-text-sub max-w-2xl leading-relaxed">
              {{ activePool.description[locale] || activePool.description.en }}
            </p>

            <div class="flex flex-wrap gap-3">
              <div
                v-for="preview in activePool.previewImages"
                :key="preview"
                class="h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-2xl border border-primary/10 bg-slate-50 shadow-sm"
              >
                <img :src="preview" alt="" class="h-full w-full object-cover" />
              </div>
            </div>

            <div class="flex flex-wrap gap-3 text-xs font-bold text-text-sub">
              <span class="rounded-full bg-slate-100 px-3 py-1.5">N {{ rarityBreakdown.N }}</span>
              <span class="rounded-full bg-cyan-50 px-3 py-1.5 text-cyan-700">R {{ rarityBreakdown.R }}</span>
              <span class="rounded-full bg-purple-50 px-3 py-1.5 text-purple-700">SR {{ rarityBreakdown.SR }}</span>
              <span class="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">SSR {{ rarityBreakdown.SSR }}</span>
            </div>
          </div>

          <div class="lg:w-[22rem] shrink-0 flex flex-col justify-between gap-6">
            <div class="card-pool-visual relative overflow-hidden rounded-[2rem] border-4 border-primary/20 shadow-2xl">
              <img
                :src="activePool.coverImage"
                :alt="activePool.name[locale] || activePool.name.en"
                class="h-72 w-full object-cover"
              />
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent px-5 py-4 text-white">
                <h3 class="text-xl font-black">{{ activePool.shortName[locale] || activePool.shortName.en }}</h3>
                <p class="text-xs font-bold uppercase tracking-[0.22em] text-white/70">{{ totalCardsCount }} {{ isZh ? '张卡片' : 'Cards Available' }}</p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row lg:flex-col gap-4">
              <button
                @click="performDraw('single')"
                :disabled="totalPoints < activePool.singleCost || isDrawing"
                class="btn-mainline flex-1 flex flex-col items-center p-4 !h-auto"
                :class="{ 'opacity-50 !shadow-none !border-primary/10': totalPoints < activePool.singleCost || isDrawing }"
              >
                <template v-if="isDrawing">
                  <span class="text-lg font-black flex items-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ isZh ? '正在召唤...' : 'Summoning...' }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-lg font-black">{{ isZh ? '单抽 ×1' : 'Summon ×1' }}</span>
                  <span class="text-xs text-white/80 mt-1 font-bold">{{ activePool.singleCost }} Pts</span>
                </template>
              </button>

              <button
                @click="performDraw('ten')"
                :disabled="totalPoints < activePool.tenCost || isDrawing"
                class="btn-mainline flex-1 flex flex-col items-center p-4 !h-auto !bg-accent-amber !text-slate-900 border-accent-amber shadow-offset-amber"
                :class="{ 'opacity-50 !shadow-none !border-primary/10': totalPoints < activePool.tenCost || isDrawing }"
              >
                <template v-if="isDrawing">
                  <span class="text-lg font-black flex items-center gap-2">
                    <svg class="animate-spin h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {{ isZh ? '正在召唤...' : 'Summoning...' }}
                  </span>
                </template>
                <template v-else>
                  <span class="text-lg font-black">{{ isZh ? '十连抽 ×10' : 'Summon ×10' }}</span>
                  <span class="text-xs text-slate-900/80 mt-1 font-extrabold">
                    {{ activePool.tenCost }} Pts ({{ isZh ? '九折' : '10% OFF' }})
                  </span>
                </template>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="state === 'revealing'" class="gacha-reveal-board flex justify-center py-6">
        <CardReveal
          :card="revealList[revealIndex]"
          :locale="locale"
          @revealed="handleCardRevealed"
          @next="handleNextReveal"
        />
      </div>

      <div v-else-if="state === 'result'" class="gacha-result-board">
        <TenPullResult
          :cards="drawResult"
          :is-new-list="isNewList"
          :locale="locale"
          @again="performDraw('ten')"
          @viewCollection="activeSubView = 'collection'; state = 'idle'"
          @close="state = 'idle'"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { db, liveQuery } from '../../db';
import { GACHA_POOLS } from '../../gacha/cardData';
import { drawSingle, drawTen } from '../../gacha/gachaEngine';
import CardReveal from './CardReveal.vue';
import TenPullResult from './TenPullResult.vue';
import CollectionView from './CollectionView.vue';
import DrawHistory from './DrawHistory.vue';

const { t, locale } = useI18n();

const isZh = computed(() => locale.value === 'zh');
const state = ref('idle');
const activeSubView = ref('main');
const activePoolId = ref(GACHA_POOLS[0]?.id || '');

const totalPoints = ref(0);
const userName = ref('Hero');
const userCards = ref([]);
const drawRecords = ref([]);

const isDrawing = ref(false);
const drawResult = ref([]);
const isNewList = ref([]);
const revealList = ref([]);
const revealIndex = ref(0);

let pointsSub = null;
let nameSub = null;
const userCardsSub = ref(null);
const drawRecordsSub = ref(null);

const activePool = computed(() => {
  return GACHA_POOLS.find(pool => pool.id === activePoolId.value) || GACHA_POOLS[0];
});

const totalCardsCount = computed(() => activePool.value?.cards.length || 0);
const currentPoolCardIds = computed(() => new Set((activePool.value?.cards || []).map(card => card.id)));
const collectedUniqueCount = computed(() => {
  return userCards.value.filter(uc => uc.count > 0 && currentPoolCardIds.value.has(uc.card_id)).length;
});

const rarityBreakdown = computed(() => {
  return (activePool.value?.cards || []).reduce((acc, card) => {
    acc[card.rarity] += 1;
    return acc;
  }, { N: 0, R: 0, SR: 0, SSR: 0 });
});

const selectPool = (poolId) => {
  if (isDrawing.value) return;
  activePoolId.value = poolId;
};

const getCollectedCountByPool = (pool) => {
  const poolIds = new Set(pool.cards.map(card => card.id));
  return userCards.value.filter(uc => uc.count > 0 && poolIds.has(uc.card_id)).length;
};

const setupSubscriptions = (name) => {
  if (userCardsSub.value) userCardsSub.value.unsubscribe();
  if (drawRecordsSub.value) drawRecordsSub.value.unsubscribe();
  if (pointsSub) pointsSub.unsubscribe();

  userCardsSub.value = liveQuery(() => db.userCards.where('user_name').equals(name).toArray()).subscribe(val => {
    userCards.value = val || [];
  });

  drawRecordsSub.value = liveQuery(() => db.drawRecords.where('user_name').equals(name).reverse().toArray()).subscribe(val => {
    drawRecords.value = val || [];
  });

  pointsSub = liveQuery(async () => {
    try {
      const allTasks = await db.tasks.where('user_name').equals(name).select('points, completed').toArray();
      const spentPointsLogs = await db.redemptionLogs.where('user_name').equals(name).select('spent_points').toArray();
      const spent = spentPointsLogs.reduce((sum, log) => sum + (log.spent_points || 0), 0);
      const earned = allTasks
        .filter(task => task.completed)
        .reduce((sum, task) => sum + (Number(task.points) || 0), 0);

      return earned - spent;
    } catch (err) {
      console.warn('Points calculation error in Gacha:', err);
      return 0;
    }
  }).subscribe(val => {
    totalPoints.value = val;
  });
};

onMounted(() => {
  nameSub = liveQuery(() => db.settings.get('userName')).subscribe(result => {
    const newName = result?.value || 'Hero';
    if (newName !== userName.value || !pointsSub) {
      userName.value = newName;
      setupSubscriptions(newName);
    }
  });
});

onUnmounted(() => {
  if (userCardsSub.value) userCardsSub.value.unsubscribe();
  if (drawRecordsSub.value) drawRecordsSub.value.unsubscribe();
  if (pointsSub) pointsSub.unsubscribe();
  if (nameSub) nameSub.unsubscribe();
});

const performDraw = async (type) => {
  const pool = activePool.value;
  const cost = type === 'ten' ? pool.tenCost : pool.singleCost;
  if (totalPoints.value < cost || isDrawing.value) return;

  isDrawing.value = true;

  try {
    const results = type === 'ten' ? drawTen(pool) : [drawSingle(pool)];

    await db.transaction('rw', db.redemptionLogs, db.userCards, db.drawRecords, async () => {
      await db.redemptionLogs.add({
        reward_title: `${pool.name.en} (${type === 'ten' ? '10-Pull' : 'Single'})`,
        spent_points: cost,
        timestamp: Date.now(),
        user_name: userName.value
      });

      const existingCards = await db.userCards.where('user_name').equals(userName.value).toArray();
      const tempNewList = [];

      for (const card of results) {
        const cardMatch = existingCards.find(uc => uc.card_id === card.id);

        if (!cardMatch || cardMatch.count === 0) {
          tempNewList.push(true);
          const newRecord = {
            user_name: userName.value,
            card_id: card.id,
            count: 1,
            first_obtained_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await db.userCards.put(newRecord);
          existingCards.push(newRecord);
        } else {
          tempNewList.push(false);
          const updatedRecord = {
            ...cardMatch,
            count: cardMatch.count + 1,
            updated_at: new Date().toISOString()
          };
          await db.userCards.put(updatedRecord);
          const targetIndex = existingCards.findIndex(uc => uc.card_id === card.id);
          existingCards[targetIndex] = updatedRecord;
        }
      }

      await db.drawRecords.add({
        user_name: userName.value,
        pool_id: pool.id,
        draw_type: type,
        cost_points: cost,
        result_cards: results.map(card => card.id),
        created_at: new Date().toISOString()
      });

      isNewList.value = tempNewList;
    });

    drawResult.value = results;

    if (type === 'ten') {
      state.value = 'result';
    } else {
      revealList.value = [...results];
      revealIndex.value = 0;
      state.value = 'revealing';
    }
  } catch (error) {
    console.error('Failed to perform draw:', error);
    alert('Draw failed: ' + error.message);
  } finally {
    isDrawing.value = false;
  }
};

const handleCardRevealed = () => {};

const handleNextReveal = () => {
  if (revealIndex.value < revealList.value.length - 1) {
    revealIndex.value += 1;
  } else {
    state.value = 'idle';
  }
};
</script>

<style scoped>
.gacha-main {
  animation: fadeIn 0.4s ease-out;
}

.pool-tab {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.shadow-offset-amber {
  box-shadow: 4px 4px 0 0 #b45309;
}

.shadow-offset-amber:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 0 #b45309;
}

.shadow-offset-amber:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 #b45309;
}
</style>
