<script setup>
import { LogOut, RotateCw, X } from 'lucide-vue-next';

import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { supabase, TABLES } from '../supabase';

const { t } = useI18n();

// ==================== GAME DATA ====================

const BOARD_SIZE = 24;
const MAX_ROUNDS = 30;
const TARGET_SCORE = 1000;

// Item definitions
const ITEMS_DB = [
  { id: 'double_dice', icon: '🎲', effect: 'rollAgain' },
  { id: 'shield', icon: '🛡️', effect: 'blockPenalty' },
  { id: 'jackpot', icon: '💰', effect: 'doubleReward' },
  { id: 'rewind', icon: '🔄', effect: 'rewind3' },
  { id: 'sprint', icon: '⏩', effect: 'forward3' },
  { id: 'magnet', icon: '🧲', effect: 'attract100' },
  { id: 'sniper', icon: '🎯', effect: 'chooseTile' },
  { id: 'freeze', icon: '❄️', effect: 'freezePenalty' },
];

// Random events pool
const EVENTS_DB = [
  { id: 'treasure', type: 'positive', points: 150 },
  { id: 'tax', type: 'negative', points: -80 },
  { id: 'lucky', type: 'positive', points: 100 },
  { id: 'earthquake', type: 'negative', points: 0, special: 'loseItems' },
  { id: 'birthday', type: 'positive', points: 200 },
  { id: 'thief', type: 'negative', points: -120 },
  { id: 'rainbow', type: 'positive', points: 80 },
  { id: 'storm', type: 'negative', points: -60 },
  { id: 'angel', type: 'positive', points: 180 },
  { id: 'merchant', type: 'positive', points: 0, special: 'freeItem' },
  { id: 'blackhole', type: 'negative', points: 0, special: 'resetPosition' },
  { id: 'timeMachine', type: 'positive', points: 0, special: 'extraTurn' },
  { id: 'festival', type: 'positive', points: 250 },
  { id: 'fog', type: 'negative', points: -40 },
  { id: 'star', type: 'positive', points: 300 },
];

// Generate tiles
function generateBoard() {
  const types = [];
  // Distribute tile types around the 24-tile board
  const distribution = {
    normal: [0, 3, 6, 9, 12, 15, 18, 21],
    reward: [1, 5, 10, 16, 22],
    penalty: [4, 8, 14, 20],
    item: [2, 7, 13, 19],
    event: [11, 17, 23],
  };

  const tiles = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    let type = 'normal';
    let value = 0;

    if (distribution.reward.includes(i)) {
      type = 'reward';
      value = [50, 80, 100, 150, 200][Math.floor(Math.random() * 5)];
    } else if (distribution.penalty.includes(i)) {
      type = 'penalty';
      value = -[30, 50, 70, 100][Math.floor(Math.random() * 4)];
    } else if (distribution.item.includes(i)) {
      type = 'item';
    } else if (distribution.event.includes(i)) {
      type = 'event';
    }

    tiles.push({ id: i, type, value });
  }
  return tiles;
}

// ==================== GAME STATE ====================

const gamePhase = ref('start'); // start, playing, paused, gameover
const board = ref(generateBoard());

const player = reactive({
  position: 0,
  score: 0,
  items: [],
});

const round = ref(1);
const diceValue = ref(1);
const isRolling = ref(false);
const isMoving = ref(false);
const showEvent = ref(false);
const currentEvent = ref(null);
const eventMessage = ref('');
const showItemPicker = ref(false);
const showBackpack = ref(false);
const moveHistory = ref([]);
const shieldActive = ref(false);
const freezeRounds = ref(0);
const username = ref(localStorage.getItem('monopoly_username') || '');
const gameStartTime = ref(null);
const leaderboardData = ref([]);
const isLoadingLeaderboard = ref(false);
const leaderboardError = ref(null);

// Math quiz gate
const showMathQuiz = ref(false);
const mathA = ref(0);
const mathB = ref(0);
const mathOp = ref('+');
const mathAnswer = ref('');
const mathCorrectAnswer = ref(0);
const mathWrong = ref(false);
const mathTimer = ref(5);
let mathTimerInterval = null;

function generateMathQuiz() {
  const op = Math.random() < 0.5 ? '+' : '-';
  let a, b;
  if (op === '+') {
    a = Math.floor(Math.random() * 18) + 1;
    b = Math.floor(Math.random() * (20 - a)) + 1;
  } else {
    a = Math.floor(Math.random() * 19) + 2;
    b = Math.floor(Math.random() * (a - 1)) + 1;
  }
  mathA.value = a;
  mathB.value = b;
  mathOp.value = op;
  mathCorrectAnswer.value = op === '+' ? a + b : a - b;
  mathAnswer.value = '';
  mathWrong.value = false;
}

function startMathTimer() {
  stopMathTimer();
  mathTimer.value = 5;
  mathTimerInterval = setInterval(() => {
    mathTimer.value--;
    if (mathTimer.value <= 0) {
      stopMathTimer();
      mathWrong.value = true;
      setTimeout(() => {
        showMathQuiz.value = false;
        mathWrong.value = false;
      }, 1000);
    }
  }, 1000);
}

function stopMathTimer() {
  if (mathTimerInterval) {
    clearInterval(mathTimerInterval);
    mathTimerInterval = null;
  }
}

function onStartClick() {
  if (!username.value.trim()) {
    alert(t('monopoly.username.required'));
    return;
  }
  localStorage.setItem('monopoly_username', username.value.trim());
  generateMathQuiz();
  showMathQuiz.value = true;
  startMathTimer();
}

function dismissMathQuiz() {
  stopMathTimer();
  showMathQuiz.value = false;
}

function checkMathAnswer() {
  if (parseInt(mathAnswer.value) === mathCorrectAnswer.value) {
    stopMathTimer();
    showMathQuiz.value = false;
    startGame();
  } else {
    mathWrong.value = true;
    setTimeout(() => { mathWrong.value = false; }, 800);
  }
}
const doubleRewardActive = ref(false);
const extraTurnPending = ref(false);
const showTileInfo = ref(null);
const gameStats = reactive({
  totalDiceRolls: 0,
  tilesVisited: new Set(),
  itemsUsed: 0,
  eventsTriggered: 0,
  maxScoreInOneRound: 0,
  lapsCompleted: 0,
});

// ==================== COMPUTED ====================

const isGameOver = computed(() => {
  return round.value > MAX_ROUNDS || player.score >= TARGET_SCORE;
});

const progressPercent = computed(() => {
  return Math.min(100, Math.round((player.score / TARGET_SCORE) * 100));
});

const currentTile = computed(() => board.value[player.position]);

// Arrange tiles in a rectangular loop for display
// Top row: 0-6, Right col: 7-11, Bottom row: 12-18, Left col: 19-23
const topRow = computed(() => board.value.slice(0, 7));
const rightCol = computed(() => board.value.slice(7, 12));
const bottomRow = computed(() => [...board.value.slice(12, 19)].reverse());
const leftCol = computed(() => [...board.value.slice(19, 24)].reverse());

// ==================== METHODS ====================

function startGame() {
  board.value = generateBoard();
  player.position = 0;
  player.score = 0;
  player.items = [];
  round.value = 1;
  diceValue.value = 1;
  isRolling.value = false;
  isMoving.value = false;
  showEvent.value = false;
  currentEvent.value = null;
  shieldActive.value = false;
  freezeRounds.value = 0;
  doubleRewardActive.value = false;
  extraTurnPending.value = false;
  showBackpack.value = false;
  moveHistory.value = [];
  gameStats.totalDiceRolls = 0;
  gameStats.tilesVisited = new Set();
  gameStats.itemsUsed = 0;
  gameStats.eventsTriggered = 0;
  gameStats.maxScoreInOneRound = 0;
  gameStats.lapsCompleted = 0;
  gamePhase.value = 'playing';
  gameStartTime.value = new Date().toISOString();
  saveGame();
}

async function fetchLeaderboard() {
  isLoadingLeaderboard.value = true;
  leaderboardError.value = null;
  try {
    const { data, error } = await supabase
      .from(TABLES.MONOPOLY_LEADERBOARD)
      .select('*')
      .order('score', { ascending: false })
      .order('rounds', { ascending: true })
      .limit(10);

    if (error) throw error;
    leaderboardData.value = data || [];
  } catch (e) {
    console.error('Leaderboard error:', e);
    leaderboardError.value = e.message;
  } finally {
    isLoadingLeaderboard.value = false;
  }
}

async function submitScore() {
  const endTime = new Date().toISOString();
  try {
    const { error } = await supabase
      .from(TABLES.MONOPOLY_LEADERBOARD)
      .insert({
        username: username.value.trim(),
        score: player.score,
        rounds: round.value - 1,
        start_time: gameStartTime.value,
        end_time: endTime
      });
    if (error) throw error;
    fetchLeaderboard(); // Refresh leaderboard
  } catch (e) {
    console.error('Submit score error:', e);
  }
}

function quitGame() {
  if (confirm(t('monopoly.quitConfirm'))) {
    gamePhase.value = 'start';
    clearSave();
    fetchLeaderboard();
  }
}

function rollDice() {
  if (isRolling.value || isMoving.value || showEvent.value) return;

  isRolling.value = true;
  gameStats.totalDiceRolls++;

  // Animate dice
  let rollCount = 0;
  const rollInterval = setInterval(() => {
    diceValue.value = Math.floor(Math.random() * 6) + 1;
    rollCount++;
    if (rollCount > 10) {
      clearInterval(rollInterval);
      diceValue.value = Math.floor(Math.random() * 6) + 1;
      isRolling.value = false;
      movePlayer(diceValue.value);
    }
  }, 80);
}

async function movePlayer(steps) {
  isMoving.value = true;
  const scoreBeforeRound = player.score;

  for (let i = 0; i < steps; i++) {
    const oldPos = player.position;
    player.position = (player.position + 1) % BOARD_SIZE;

    // Check if completed a lap
    if (player.position === 0 && oldPos !== 0) {
      gameStats.lapsCompleted++;
      player.score += 50; // Lap bonus
    }

    gameStats.tilesVisited.add(player.position);
    await sleep(200);
  }

  isMoving.value = false;

  // Resolve tile
  await resolveTile(board.value[player.position]);

  // Track round score
  const roundScore = player.score - scoreBeforeRound;
  if (roundScore > gameStats.maxScoreInOneRound) {
    gameStats.maxScoreInOneRound = roundScore;
  }

  // Check extra turn
  if (extraTurnPending.value) {
    extraTurnPending.value = false;
    // Don't advance round for extra turn
  } else {
    round.value++;
  }

  // Decrease freeze rounds
  if (freezeRounds.value > 0) {
    freezeRounds.value--;
  }

  // Check game over
  if (isGameOver.value) {
    gamePhase.value = 'gameover';
    submitScore();
    clearSave();
  } else {
    saveGame();
  }
}

async function resolveTile(tile) {
  switch (tile.type) {
    case 'reward': {
      let pts = tile.value;
      if (doubleRewardActive.value) {
        pts *= 2;
        doubleRewardActive.value = false;
      }
      player.score += pts;
      eventMessage.value = t('monopoly.events.reward', { points: pts });
      showEvent.value = true;
      currentEvent.value = { type: 'reward', points: pts };
      await waitForEventDismiss();
      break;
    }
    case 'penalty': {
      if (shieldActive.value) {
        shieldActive.value = false;
        eventMessage.value = t('monopoly.events.shieldBlocked');
        showEvent.value = true;
        currentEvent.value = { type: 'shield' };
        await waitForEventDismiss();
      } else if (freezeRounds.value > 0) {
        eventMessage.value = t('monopoly.events.freezeBlocked');
        showEvent.value = true;
        currentEvent.value = { type: 'freeze' };
        await waitForEventDismiss();
      } else {
        player.score = Math.max(0, player.score + tile.value);
        eventMessage.value = t('monopoly.events.penalty', { points: Math.abs(tile.value) });
        showEvent.value = true;
        currentEvent.value = { type: 'penalty', points: tile.value };
        await waitForEventDismiss();
      }
      break;
    }
    case 'item': {
      const randomItem = ITEMS_DB[Math.floor(Math.random() * ITEMS_DB.length)];
      if (player.items.length < 6) {
        player.items.push({ ...randomItem, uid: Date.now() + Math.random() });
        eventMessage.value = t('monopoly.events.gotItem', { item: t(`monopoly.items.${randomItem.id}`) });
      } else {
        eventMessage.value = t('monopoly.events.backpackFull');
      }
      showEvent.value = true;
      currentEvent.value = { type: 'item', item: randomItem };
      await waitForEventDismiss();
      break;
    }
    case 'event': {
      gameStats.eventsTriggered++;
      const evt = EVENTS_DB[Math.floor(Math.random() * EVENTS_DB.length)];
      await triggerEvent(evt);
      break;
    }
    default:
      // Normal tile - nothing happens
      break;
  }
}

async function triggerEvent(evt) {
  currentEvent.value = evt;

  if (evt.special) {
    switch (evt.special) {
      case 'loseItems':
        player.items = [];
        eventMessage.value = t(`monopoly.randomEvents.${evt.id}`);
        break;
      case 'freeItem': {
        const randomItem = ITEMS_DB[Math.floor(Math.random() * ITEMS_DB.length)];
        if (player.items.length < 6) {
          player.items.push({ ...randomItem, uid: Date.now() + Math.random() });
        }
        eventMessage.value = t(`monopoly.randomEvents.${evt.id}`);
        break;
      }
      case 'resetPosition':
        player.position = 0;
        eventMessage.value = t(`monopoly.randomEvents.${evt.id}`);
        break;
      case 'extraTurn':
        extraTurnPending.value = true;
        eventMessage.value = t(`monopoly.randomEvents.${evt.id}`);
        break;
    }
  } else {
    if (evt.points > 0) {
      player.score += evt.points;
    } else {
      player.score = Math.max(0, player.score + evt.points);
    }
    eventMessage.value = t(`monopoly.randomEvents.${evt.id}`);
  }

  showEvent.value = true;
  await waitForEventDismiss();
}

function dismissEvent() {
  showEvent.value = false;
  currentEvent.value = null;
  eventMessage.value = '';
}

function waitForEventDismiss() {
  return new Promise((resolve) => {
    const unwatch = watch(showEvent, (val) => {
      if (!val) {
        unwatch();
        resolve();
      }
    });
  });
}

function useItem(index) {
  const item = player.items[index];
  if (!item) return;

  player.items.splice(index, 1);
  gameStats.itemsUsed++;

  switch (item.effect) {
    case 'rollAgain':
      extraTurnPending.value = true;
      eventMessage.value = t('monopoly.itemEffects.rollAgain');
      break;
    case 'blockPenalty':
      shieldActive.value = true;
      eventMessage.value = t('monopoly.itemEffects.blockPenalty');
      break;
    case 'doubleReward':
      doubleRewardActive.value = true;
      eventMessage.value = t('monopoly.itemEffects.doubleReward');
      break;
    case 'rewind3': {
      player.position = (player.position - 3 + BOARD_SIZE) % BOARD_SIZE;
      eventMessage.value = t('monopoly.itemEffects.rewind3');
      break;
    }
    case 'forward3': {
      player.position = (player.position + 3) % BOARD_SIZE;
      eventMessage.value = t('monopoly.itemEffects.forward3');
      break;
    }
    case 'attract100':
      player.score += 100;
      eventMessage.value = t('monopoly.itemEffects.attract100');
      break;
    case 'chooseTile':
      // Simplified: just give a reward
      player.score += 120;
      eventMessage.value = t('monopoly.itemEffects.chooseTile');
      break;
    case 'freezePenalty':
      freezeRounds.value = 2;
      eventMessage.value = t('monopoly.itemEffects.freezePenalty');
      break;
  }

  showEvent.value = true;
  currentEvent.value = { type: 'itemUse' };
  showBackpack.value = false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==================== TILE HELPERS ====================

function tileIcon(tile) {
  const icons = {
    normal: '⬜',
    reward: '🎁',
    penalty: '⛈️',
    item: '🎒',
    event: '⚡',
  };
  return icons[tile.type] || '⬜';
}

function tileColorClass(tile) {
  const classes = {
    normal: 'from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500',
    reward: 'from-emerald-100 to-emerald-200 dark:from-emerald-800 dark:to-emerald-700 border-emerald-400 dark:border-emerald-500',
    penalty: 'from-red-100 to-red-200 dark:from-red-800 dark:to-red-700 border-red-400 dark:border-red-500',
    item: 'from-violet-100 to-violet-200 dark:from-violet-800 dark:to-violet-700 border-violet-400 dark:border-violet-500',
    event: 'from-amber-100 to-amber-200 dark:from-amber-800 dark:to-amber-700 border-amber-400 dark:border-amber-500',
  };
  return classes[tile.type] || classes.normal;
}

function eventTypeIcon() {
  if (!currentEvent.value) return '✨';
  const eType = currentEvent.value.type;
  if (eType === 'reward' || eType === 'itemUse') return '🎉';
  if (eType === 'penalty') return '😂';
  if (eType === 'shield' || eType === 'freeze') return '🛡️';
  if (eType === 'item') return '🎒';
  // random event
  if (currentEvent.value.points > 0 || currentEvent.value.special === 'freeItem' || currentEvent.value.special === 'extraTurn') return '🍀';
  return '⚠️';
}

function eventBgClass() {
  if (!currentEvent.value) return 'bg-blue-500';
  const eType = currentEvent.value.type;
  if (eType === 'reward' || eType === 'itemUse') return 'bg-emerald-500';
  if (eType === 'penalty') return 'bg-red-500';
  if (eType === 'shield' || eType === 'freeze') return 'bg-blue-500';
  if (eType === 'item') return 'bg-violet-500';
  if (currentEvent.value.points > 0) return 'bg-emerald-500';
  return 'bg-red-500';
}

// ==================== SAVE / LOAD ====================

const SAVE_KEY = 'monopoly_adventure_save';

function saveGame() {
  const data = {
    player: { position: player.position, score: player.score, items: [...player.items] },
    round: round.value,
    board: board.value,
    shieldActive: shieldActive.value,
    freezeRounds: freezeRounds.value,
    doubleRewardActive: doubleRewardActive.value,
    gamePhase: gamePhase.value,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.gamePhase !== 'playing') return false;
    player.position = data.player.position;
    player.score = data.player.score;
    player.items = data.player.items || [];
    round.value = data.round;
    board.value = data.board;
    shieldActive.value = data.shieldActive || false;
    freezeRounds.value = data.freezeRounds || 0;
    doubleRewardActive.value = data.doubleRewardActive || false;
    gamePhase.value = 'playing';
    return true;
  } catch (e) {
    return false;
  }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ }
}

onMounted(() => {
  const loaded = loadGame();
  if (!loaded) {
    gamePhase.value = 'start';
  }
  fetchLeaderboard();
});

// ==================== DICE FACE ====================

const diceFaces = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

// Grade label
const gradeLabel = computed(() => {
  const s = player.score;
  if (s >= 900) return { label: 'S+', color: 'text-yellow-400' };
  if (s >= 700) return { label: 'S', color: 'text-yellow-500' };
  if (s >= 500) return { label: 'A', color: 'text-emerald-400' };
  if (s >= 300) return { label: 'B', color: 'text-blue-400' };
  if (s >= 100) return { label: 'C', color: 'text-violet-400' };
  return { label: 'D', color: 'text-slate-400' };
});
</script>

<template>
  <div class="monopoly-game select-none">
    <!-- ==================== START SCREEN ==================== -->
    <Transition name="fade">
      <div v-if="gamePhase === 'start'" class="flex flex-col items-center justify-center min-h-[70vh] gap-8 text-center px-4">
        <!-- Logo -->
        <div class="relative">
          <div class="text-7xl lg:text-8xl mb-2 animate-bounce-slow">🎲</div>
          <div class="absolute -inset-4 bg-primary/10 rounded-full blur-3xl -z-10"></div>
        </div>

        <div>
          <h1 class="text-3xl lg:text-5xl font-black bg-linear-to-r from-primary via-violet-500 to-emerald-500 bg-clip-text text-transparent leading-tight pb-1">
            {{ t('monopoly.title') }}
          </h1>
          <p class="text-text-sub-light dark:text-text-sub-dark mt-3 text-sm lg:text-base max-w-md mx-auto leading-relaxed">
            {{ t('monopoly.subtitle') }}
          </p>
        </div>

        <!-- Rules cards -->
        <div class="grid grid-cols-2 gap-3 max-w-sm w-full">
          <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-left">
            <div class="text-2xl mb-1">🎯</div>
            <p class="text-xs font-bold text-text-sub-light dark:text-text-sub-dark">{{ t('monopoly.rules.goal') }}</p>
            <p class="text-sm font-black mt-1">{{ TARGET_SCORE }} pts</p>
          </div>
          <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-left">
            <div class="text-2xl mb-1">⏱️</div>
            <p class="text-xs font-bold text-text-sub-light dark:text-text-sub-dark">{{ t('monopoly.rules.rounds') }}</p>
            <p class="text-sm font-black mt-1">{{ MAX_ROUNDS }} {{ t('monopoly.round') }}</p>
          </div>
          <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-left">
            <div class="text-2xl mb-1">🎒</div>
            <p class="text-xs font-bold text-text-sub-light dark:text-text-sub-dark">{{ t('monopoly.rules.items') }}</p>
            <p class="text-sm font-black mt-1">8 {{ t('monopoly.rules.types') }}</p>
          </div>
          <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-left">
            <div class="text-2xl mb-1">⚡</div>
            <p class="text-xs font-bold text-text-sub-light dark:text-text-sub-dark">{{ t('monopoly.rules.events') }}</p>
            <p class="text-sm font-black mt-1">15 {{ t('monopoly.rules.random') }}</p>
          </div>
        </div>

        <!-- Username Input -->
        <div class="w-full max-w-sm">
          <label class="block text-left text-xs font-bold text-text-sub-light dark:text-text-sub-dark mb-2 uppercase px-1">
            {{ t('monopoly.username.label') }}
          </label>
          <input
            v-model="username"
            type="text"
            :placeholder="t('monopoly.username.placeholder')"
            class="w-full px-4 py-3 rounded-2xl border-2 bg-surface-light dark:bg-surface-dark border-gray-100 dark:border-gray-800 focus:border-primary focus:outline-none transition-all font-bold text-center"
          />
        </div>

        <button
          @click="onStartClick"
          class="bg-linear-to-r from-primary to-violet-500 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          {{ t('monopoly.startBtn') }} 🚀
        </button>

        <!-- Leaderboard -->
        <div class="w-full max-w-xl mt-4">
          <div class="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-black bg-linear-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                🏆 {{ t('monopoly.leaderboard.title') }}
              </h3>
              <button @click="fetchLeaderboard" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" :disabled="isLoadingLeaderboard">
                <RotateCw  class=" text-sm" :class="{ 'animate-spin': isLoadingLeaderboard }"/>
              </button>
            </div>

            <div v-if="isLoadingLeaderboard && !leaderboardData.length" class="py-12 text-center text-text-sub-light dark:text-text-sub-dark">
              <div class="animate-spin text-3xl mb-2">🎲</div>
              <p class="text-xs font-bold">{{ t('monopoly.leaderboard.loading') }}</p>
            </div>

            <div v-else-if="leaderboardError" class="py-8 text-center text-red-500">
               <p class="text-xs font-bold">{{ t('monopoly.leaderboard.error') }}</p>
               <p class="text-[10px] mt-1 opacity-70">{{ leaderboardError }}</p>
            </div>

            <div v-else-if="!leaderboardData.length" class="py-12 text-center text-text-sub-light dark:text-text-sub-dark">
              <p class="text-4xl mb-2">📭</p>
              <p class="text-xs font-bold">{{ t('monopoly.leaderboard.noData') }}</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[10px] uppercase font-bold text-text-sub-light dark:text-text-sub-dark border-b border-gray-50 dark:border-gray-800">
                    <th class="pb-2 px-2 w-12">{{ t('monopoly.leaderboard.rank') }}</th>
                    <th class="pb-2 px-2">{{ t('monopoly.leaderboard.nickname') }}</th>
                    <th class="pb-2 px-2 text-right">{{ t('monopoly.leaderboard.score') }}</th>
                    <th class="pb-2 px-2 text-right">{{ t('monopoly.leaderboard.rounds') }}</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  <tr
                    v-for="(item, idx) in leaderboardData"
                    :key="item.id"
                    class="border-b border-gray-50/50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors"
                  >
                    <td class="py-3 px-2">
                       <span v-if="idx === 0" class="text-lg">🥇</span>
                       <span v-else-if="idx === 1" class="text-lg">🥈</span>
                       <span v-else-if="idx === 2" class="text-lg">🥉</span>
                       <span v-else class="font-black text-text-sub-light dark:text-text-sub-dark pl-1">#{{ idx + 1 }}</span>
                    </td>
                    <td class="py-3 px-2">
                      <div class="font-bold flex items-center gap-1.5">
                        {{ item.username }}
                        <span v-if="item.username === username" class="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">YOU</span>
                      </div>
                      <div class="text-[10px] text-text-sub-light dark:text-text-sub-dark opacity-70">
                        {{ new Date(item.start_time).toLocaleDateString() }}
                      </div>
                    </td>
                    <td class="py-3 px-2 text-right">
                      <span class="font-black text-emerald-500">{{ item.score }}</span>
                    </td>
                    <td class="py-3 px-2 text-right">
                      <span class="font-bold">{{ item.rounds }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ==================== MATH QUIZ GATE ==================== -->
    <Transition name="zoom">
      <div v-if="showMathQuiz" class="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="dismissMathQuiz"></div>
        <div class="relative bg-surface-light dark:bg-surface-dark rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
          <!-- Timer circle -->
          <div class="absolute top-4 right-4 w-10 h-10">
            <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-200 dark:text-gray-700" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3" stroke-linecap="round"
                class="transition-all duration-1000 ease-linear"
                :class="mathTimer <= 2 ? 'text-red-500' : 'text-primary'"
                :stroke-dasharray="97.4"
                :stroke-dashoffset="97.4 - (97.4 * mathTimer / 5)"
              />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-sm font-black" :class="mathTimer <= 2 ? 'text-red-500' : ''">{{ mathTimer }}</span>
          </div>

          <div class="text-4xl mb-2">🧮</div>
          <h3 class="text-lg font-black mb-1">{{ t('monopoly.mathQuiz.title') }}</h3>
          <p class="text-xs text-text-sub-light dark:text-text-sub-dark mb-5">{{ t('monopoly.mathQuiz.hint') }}</p>

          <div class="text-3xl lg:text-4xl font-black mb-5 tracking-wide" :class="{ 'animate-wrong': mathWrong }">
            {{ mathA }} {{ mathOp }} {{ mathB }} = ?
          </div>

          <input
            v-model="mathAnswer"
            type="number"
            inputmode="numeric"
            class="w-full text-center text-2xl font-black py-3 px-4 rounded-xl border-2 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-primary focus:outline-none transition-colors mb-4"
            :class="{ 'border-red-400 dark:border-red-500': mathWrong }"
            :placeholder="t('monopoly.mathQuiz.placeholder')"
            @keyup.enter="checkMathAnswer"
            autofocus
          />

          <div class="flex gap-3">
            <button
              @click="dismissMathQuiz"
              class="flex-1 py-3 rounded-xl font-bold border border-gray-200 dark:border-gray-600 text-text-sub-light dark:text-text-sub-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              {{ t('monopoly.mathQuiz.cancel') }}
            </button>
            <button
              @click="checkMathAnswer"
              class="flex-1 py-3 rounded-xl font-black bg-linear-to-r from-primary to-violet-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              {{ t('monopoly.mathQuiz.confirm') }}
            </button>
          </div>

          <p v-if="mathWrong" class="text-red-500 text-sm font-bold mt-3 animate-bounce-slow">{{ t('monopoly.mathQuiz.wrong') }}</p>
        </div>
      </div>
    </Transition>

    <!-- ==================== GAME BOARD ==================== -->
    <Transition name="fade">
      <div v-if="gamePhase === 'playing'" class="flex flex-col gap-4">
        <!-- Top HUD -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-4">
            <div class="bg-surface-light dark:bg-surface-dark rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <span class="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('monopoly.roundLabel') }}</span>
              <span class="text-lg font-black text-primary">{{ round }}<span class="text-text-sub-light dark:text-text-sub-dark text-xs">/{{ MAX_ROUNDS }}</span></span>
            </div>
            <div class="bg-surface-light dark:bg-surface-dark rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <span class="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('monopoly.score') }}</span>
              <span class="text-lg font-black text-emerald-500">{{ player.score }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- Active buffs -->
            <span v-if="shieldActive" class="text-lg" title="Shield Active">🛡️</span>
            <span v-if="freezeRounds > 0" class="text-lg" :title="`Freeze: ${freezeRounds} rounds`">❄️</span>
            <span v-if="doubleRewardActive" class="text-lg" title="Double Reward">💰</span>
            <span v-if="extraTurnPending" class="text-lg" title="Extra Turn">🎲</span>

            <button
              @click="showBackpack = !showBackpack"
              class="relative bg-surface-light dark:bg-surface-dark rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-800 hover:border-primary/50 transition-all"
            >
              🎒
              <span v-if="player.items.length" class="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{{ player.items.length }}</span>
            </button>
          </div>
        </div>

        <!-- Score progress bar -->
        <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
          <div class="flex justify-between items-center mb-1.5">
            <span class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('monopoly.progress') }}</span>
            <span class="text-xs font-black" :class="gradeLabel.color">{{ gradeLabel.label }}</span>
          </div>
          <div class="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-linear-to-r from-primary via-violet-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
          <div class="flex justify-between mt-1">
            <span class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark">0</span>
            <span class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark">{{ TARGET_SCORE }}</span>
          </div>
        </div>

        <!-- Board Grid (rectangular loop) -->
        <div class="board-container bg-surface-light dark:bg-surface-dark rounded-3xl p-3 lg:p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
          <!-- Top row -->
          <div class="flex gap-1.5 lg:gap-2 mb-1.5 lg:mb-2">
            <div
              v-for="tile in topRow"
              :key="'t'+tile.id"
              class="tile-cell flex-1 aspect-square rounded-xl lg:rounded-2xl border-2 bg-linear-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden min-w-0"
              :class="[tileColorClass(tile), player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 scale-110 shadow-lg' : '']"
            >
              <span class="text-base lg:text-xl leading-none">{{ tileIcon(tile) }}</span>
              <span class="text-[8px] lg:text-[10px] font-bold mt-0.5 text-text-sub-light dark:text-text-sub-dark">{{ tile.id + 1 }}</span>
              <!-- Player token -->
              <div v-if="player.position === tile.id" class="absolute inset-0 flex items-center justify-center">
                <div class="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-black shadow-lg shadow-primary/40 animate-pulse-slow border-2 border-white dark:border-gray-800">
                  ★
                </div>
              </div>
            </div>
          </div>

          <!-- Middle section: left col + center area + right col -->
          <div class="flex gap-1.5 lg:gap-2">
            <!-- Left column (reversed, goes bottom to top visually) -->
            <div class="flex flex-col gap-1.5 lg:gap-2">
              <div
                v-for="tile in leftCol"
                :key="'l'+tile.id"
                class="tile-cell w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl border-2 bg-linear-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden"
                :class="[tileColorClass(tile), player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 scale-110 shadow-lg' : '']"
              >
                <span class="text-base lg:text-xl leading-none">{{ tileIcon(tile) }}</span>
                <span class="text-[8px] lg:text-[10px] font-bold mt-0.5 text-text-sub-light dark:text-text-sub-dark">{{ tile.id + 1 }}</span>
                <div v-if="player.position === tile.id" class="absolute inset-0 flex items-center justify-center">
                  <div class="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-black shadow-lg shadow-primary/40 animate-pulse-slow border-2 border-white dark:border-gray-800">★</div>
                </div>
              </div>
            </div>

            <!-- Center area: Dice + Controls -->
            <div class="flex-1 flex flex-col items-center justify-center gap-3 lg:gap-4 min-h-[160px] lg:min-h-[250px]">
              <!-- Dice -->
              <div
                class="dice-container w-16 h-16 lg:w-24 lg:h-24 bg-white dark:bg-gray-800 rounded-2xl lg:rounded-3xl shadow-xl border-2 border-gray-200 dark:border-gray-600 grid grid-cols-3 grid-rows-3 p-2 lg:p-3 gap-0.5 lg:gap-1 transition-transform duration-100"
                :class="{ 'animate-shake': isRolling }"
              >
                <template v-for="row in 3" :key="row">
                  <template v-for="col in 3" :key="col">
                    <div class="flex items-center justify-center">
                      <div
                        v-if="diceFaces[diceValue]?.some(([r, c]) => r === row - 1 && c === col - 1)"
                        class="w-2.5 h-2.5 lg:w-4 lg:h-4 bg-primary rounded-full shadow-sm"
                      ></div>
                    </div>
                  </template>
                </template>
              </div>

              <!-- Roll button -->
              <button
                @click="rollDice"
                :disabled="isRolling || isMoving || showEvent"
                class="bg-linear-to-r from-primary to-violet-500 text-white font-black text-sm lg:text-base px-6 lg:px-8 py-2.5 lg:py-3 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span v-if="isRolling" class="inline-flex items-center gap-1">
                  <span class="animate-spin">🎲</span> ...
                </span>
                <span v-else-if="isMoving">{{ t('monopoly.moving') }}...</span>
                <span v-else>{{ t('monopoly.rollBtn') }} 🎲</span>
              </button>

              <!-- Tile legend (small) -->
              <div class="flex flex-wrap justify-center gap-2 text-[10px] lg:text-xs font-bold text-text-sub-light dark:text-text-sub-dark">
                <span>🎁{{ t('monopoly.tileTypes.reward') }}</span>
                <span>⛈️{{ t('monopoly.tileTypes.penalty') }}</span>
                <span>🎒{{ t('monopoly.tileTypes.item') }}</span>
                <span>⚡{{ t('monopoly.tileTypes.event') }}</span>
              </div>
            </div>

            <!-- Right column -->
            <div class="flex flex-col gap-1.5 lg:gap-2">
              <div
                v-for="tile in rightCol"
                :key="'r'+tile.id"
                class="tile-cell w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl border-2 bg-linear-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden"
                :class="[tileColorClass(tile), player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 scale-110 shadow-lg' : '']"
              >
                <span class="text-base lg:text-xl leading-none">{{ tileIcon(tile) }}</span>
                <span class="text-[8px] lg:text-[10px] font-bold mt-0.5 text-text-sub-light dark:text-text-sub-dark">{{ tile.id + 1 }}</span>
                <div v-if="player.position === tile.id" class="absolute inset-0 flex items-center justify-center">
                  <div class="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-black shadow-lg shadow-primary/40 animate-pulse-slow border-2 border-white dark:border-gray-800">★</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom row (reversed) -->
          <div class="flex gap-1.5 lg:gap-2 mt-1.5 lg:mt-2">
            <div
              v-for="tile in bottomRow"
              :key="'b'+tile.id"
              class="tile-cell flex-1 aspect-square rounded-xl lg:rounded-2xl border-2 bg-linear-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden min-w-0"
              :class="[tileColorClass(tile), player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 scale-110 shadow-lg' : '']"
            >
              <span class="text-base lg:text-xl leading-none">{{ tileIcon(tile) }}</span>
              <span class="text-[8px] lg:text-[10px] font-bold mt-0.5 text-text-sub-light dark:text-text-sub-dark">{{ tile.id + 1 }}</span>
              <div v-if="player.position === tile.id" class="absolute inset-0 flex items-center justify-center">
                <div class="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-black shadow-lg shadow-primary/40 animate-pulse-slow border-2 border-white dark:border-gray-800">★</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== BACKPACK PANEL ==================== -->
        <Transition name="slide-up">
          <div v-if="showBackpack" class="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-lg">
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-black text-sm flex items-center gap-2">🎒 {{ t('monopoly.backpack') }} <span class="text-text-sub-light dark:text-text-sub-dark text-xs">({{ player.items.length }}/6)</span></h3>
              <button @click="showBackpack = false" class="text-text-sub-light dark:text-text-sub-dark hover:text-text-main-light dark:hover:text-text-main-dark transition-colors">
                <X  class=" text-xl"/>
              </button>
            </div>
            <div v-if="player.items.length === 0" class="text-center py-6 text-text-sub-light dark:text-text-sub-dark text-sm">
              {{ t('monopoly.emptyBackpack') }}
            </div>
            <div v-else class="grid grid-cols-3 gap-2">
              <button
                v-for="(item, idx) in player.items"
                :key="item.uid"
                @click="useItem(idx)"
                :disabled="isRolling || isMoving || showEvent"
                class="bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-3 border border-gray-200 dark:border-gray-600 hover:border-primary/50 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center gap-1"
              >
                <span class="text-2xl">{{ item.icon }}</span>
                <span class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark leading-tight text-center">{{ t(`monopoly.items.${item.id}`) }}</span>
              </button>
            </div>
          </div>
        </Transition>

        <!-- ==================== EVENT POPUP ==================== -->
        <Transition name="zoom">
          <div v-if="showEvent" class="fixed inset-0 z-100 flex items-center justify-center p-4" @click.self="dismissEvent">
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
            <div class="relative bg-surface-light dark:bg-surface-dark rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center">
              <div class="text-5xl mb-3 animate-bounce-slow">{{ eventTypeIcon() }}</div>
              <p class="text-base lg:text-lg font-bold leading-relaxed mb-5">{{ eventMessage }}</p>
              <button
                @click="dismissEvent"
                class="bg-linear-to-r from-primary to-violet-500 text-white font-black px-8 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                {{ t('monopoly.ok') }}
              </button>
            </div>
          </div>
        </Transition>

        <!-- Quit Button -->
        <div class="mt-4 flex justify-center">
          <button
            @click="quitGame"
            class="text-xs font-bold text-text-sub-light dark:text-text-sub-dark hover:text-red-500 transition-colors flex items-center gap-1 opacity-60 hover:opacity-100"
          >
            <LogOut  class=" text-sm"/>
            {{ t('monopoly.quitBtn') }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- ==================== GAME OVER SCREEN ==================== -->
    <Transition name="fade">
      <div v-if="gamePhase === 'gameover'" class="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4">
        <div class="text-6xl lg:text-7xl animate-bounce-slow">🏆</div>

        <div>
          <h2 class="text-3xl lg:text-4xl font-black bg-linear-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
            {{ t('monopoly.gameOver') }}
          </h2>
          <p class="text-text-sub-light dark:text-text-sub-dark mt-2 text-sm">
            {{ player.score >= TARGET_SCORE ? t('monopoly.result.goalReached') : t('monopoly.result.roundsEnd') }}
          </p>
        </div>

        <!-- Score display -->
        <div class="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg w-full max-w-sm">
          <div class="text-5xl font-black text-primary mb-1">{{ player.score }}</div>
          <p class="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('monopoly.finalScore') }}</p>
          <div class="mt-3" :class="gradeLabel.color">
            <span class="text-4xl font-black">{{ gradeLabel.label }}</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-3 w-full max-w-sm">
          <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 text-left">
            <p class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('monopoly.stats.rounds') }}</p>
            <p class="text-lg font-black">{{ round - 1 }}</p>
          </div>
          <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 text-left">
            <p class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('monopoly.stats.laps') }}</p>
            <p class="text-lg font-black">{{ gameStats.lapsCompleted }}</p>
          </div>
          <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 text-left">
            <p class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('monopoly.stats.itemsUsed') }}</p>
            <p class="text-lg font-black">{{ gameStats.itemsUsed }}</p>
          </div>
          <div class="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 text-left">
            <p class="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{{ t('monopoly.stats.bestRound') }}</p>
            <p class="text-lg font-black">+{{ gameStats.maxScoreInOneRound }}</p>
          </div>
        </div>

        <button
          @click="startGame"
          class="bg-linear-to-r from-primary to-violet-500 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          {{ t('monopoly.playAgain') }} 🔄
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Animations */
@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-15deg) scale(1.1); }
  40% { transform: rotate(15deg) scale(1.1); }
  60% { transform: rotate(-10deg); }
  80% { transform: rotate(10deg); }
}

@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-slow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.05); }
}

.animate-shake {
  animation: shake 0.12s ease-in-out infinite;
}

@keyframes wrong-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.animate-wrong {
  animation: wrong-shake 0.4s ease-in-out;
  color: #ef4444;
}

.animate-bounce-slow {
  animation: bounce-slow 2s ease-in-out infinite;
}

.animate-pulse-slow {
  animation: pulse-slow 1.5s ease-in-out infinite;
}

/* Transitions */
.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.zoom-enter-active, .zoom-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.zoom-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.zoom-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Tile hover glow */
.tile-cell:hover {
  box-shadow: 0 0 16px rgba(128, 128, 255, 0.15);
}
</style>
