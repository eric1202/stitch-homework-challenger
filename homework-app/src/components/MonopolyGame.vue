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
const mathQuizMode = ref('start'); // 'start', 'challenge', or 'gate_resume'
let mathTimerInterval = null;

function generateMathQuiz() {
  const op = Math.random() < 0.5 ? '+' : '-';
  let a, b;
  const max = 20;

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
        if (mathQuizMode.value === 'start' || mathQuizMode.value === 'gate_resume') {
          gamePhase.value = 'start';
        }
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
  mathQuizMode.value = 'start';
  generateMathQuiz();
  showMathQuiz.value = true;
  startMathTimer();
}

function onMathChallengeClick() {
  if (isRolling.value || isMoving.value || showEvent.value) return;
  mathQuizMode.value = 'challenge';
  generateMathQuiz();
  showMathQuiz.value = true;
  startMathTimer();
}

function dismissMathQuiz() {
  stopMathTimer();
  showMathQuiz.value = false;
  // If dismissing a mandatory gate quiz, go back to start screen
  if (mathQuizMode.value === 'start' || mathQuizMode.value === 'gate_resume') {
    gamePhase.value = 'start';
  }
}

function checkMathAnswer() {
  if (parseInt(mathAnswer.value) === mathCorrectAnswer.value) {
    stopMathTimer();
    showMathQuiz.value = false;
    if (mathQuizMode.value === 'start') {
      startGame();
    } else if (mathQuizMode.value === 'gate_resume') {
      // Quiz passed, allow resuming the loaded game (already in 'playing' phase)
    } else {
      // Challenge reward
      player.score += 30;
      gameStats.mathSolved = (gameStats.mathSolved || 0) + 1;
      eventMessage.value = t('monopoly.mathQuiz.success', { points: 30 });
      currentEvent.value = { type: 'reward', points: 30 };
      showEvent.value = true;
    }
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
    normal: 'from-primary/5 to-primary/10 border-primary/20',
    reward: 'from-accent-green/10 to-accent-green/20 border-accent-green/40',
    penalty: 'from-accent-red/10 to-accent-red/20 border-accent-red/40',
    item: 'from-accent-cyan/10 to-accent-cyan/20 border-accent-cyan/40',
    event: 'from-accent-amber/10 to-accent-amber/20 border-accent-amber/40',
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
  if (!currentEvent.value) return 'bg-primary';
  const eType = currentEvent.value.type;
  if (eType === 'reward' || eType === 'itemUse') return 'bg-accent-green';
  if (eType === 'penalty') return 'bg-accent-red';
  if (eType === 'shield' || eType === 'freeze') return 'bg-accent-cyan';
  if (eType === 'item') return 'bg-accent-amber';
  if (currentEvent.value.points > 0) return 'bg-accent-green';
  return 'bg-accent-red';
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
  } else {
    // Game loaded from save — still require math quiz before playing
    mathQuizMode.value = 'gate_resume';
    generateMathQuiz();
    showMathQuiz.value = true;
    startMathTimer();
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
  if (s >= 1000) return { label: 'SSS', color: 'text-accent-amber' };
  if (s >= 800) return { label: 'SS', color: 'text-accent-amber' };
  if (s >= 600) return { label: 'S', color: 'text-accent-amber' };
  if (s >= 400) return { label: 'A', color: 'text-accent-green' };
  if (s >= 200) return { label: 'B', color: 'text-accent-cyan' };
  return { label: 'C', color: 'text-text-sub' };
});
</script>

<template>
  <div class="monopoly-game select-none">
    <!-- ==================== START SCREEN ==================== -->
    <Transition name="fade">
      <div v-if="gamePhase === 'start'" class="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] gap-6 md:gap-12 text-center px-4 max-w-4xl mx-auto py-6 md:py-12">
        <!-- Logo -->
        <div class="flex flex-col items-center gap-6">
          <div class="badge-mainline">Adventure</div>
          <h1 class="text-4xl md:text-8xl font-black text-primary leading-[0.9] -ml-1">
            {{ t('monopoly.title') }}
          </h1>
          <p class="text-base md:text-2xl font-medium text-text-sub max-w-xl leading-relaxed">
            {{ t('monopoly.subtitle') }}
          </p>
        </div>

        <!-- Rules cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 w-full">
          <div class="card-mainline legacy-monopoly-rule !p-3 md:!p-6 flex flex-col gap-2 md:gap-3 group hover:rotate-1">
            <div class="text-2xl md:text-3xl transition-transform group-hover:scale-125 group-hover:-rotate-12">🎯</div>
            <div class="text-left">
              <p class="text-[10px] font-black text-text-sub uppercase tracking-widest">{{ t('monopoly.rules.goal') }}</p>
              <p class="text-base md:text-xl font-black text-primary mt-1">{{ TARGET_SCORE }} pts</p>
            </div>
          </div>
          <div class="card-mainline legacy-monopoly-rule !p-3 md:!p-6 flex flex-col gap-2 md:gap-3 group hover:-rotate-1">
            <div class="text-2xl md:text-3xl transition-transform group-hover:scale-125 group-hover:rotate-12">⏱️</div>
            <div class="text-left">
              <p class="text-[10px] font-black text-text-sub uppercase tracking-widest">{{ t('monopoly.rules.rounds') }}</p>
              <p class="text-base md:text-xl font-black text-primary mt-1">{{ MAX_ROUNDS }} {{ t('monopoly.round') }}</p>
            </div>
          </div>
          <div class="card-mainline legacy-monopoly-rule !p-3 md:!p-6 flex flex-col gap-2 md:gap-3 group hover:rotate-1">
            <div class="text-2xl md:text-3xl transition-transform group-hover:scale-125 group-hover:-rotate-12">🎒</div>
            <div class="text-left">
              <p class="text-[10px] font-black text-text-sub uppercase tracking-widest">{{ t('monopoly.rules.items') }}</p>
              <p class="text-base md:text-xl font-black text-primary mt-1">8 {{ t('monopoly.rules.types') }}</p>
            </div>
          </div>
          <div class="card-mainline legacy-monopoly-rule !p-3 md:!p-6 flex flex-col gap-2 md:gap-3 group hover:-rotate-1">
            <div class="text-2xl md:text-3xl transition-transform group-hover:scale-125 group-hover:rotate-12">⚡</div>
            <div class="text-left">
              <p class="text-[10px] font-black text-text-sub uppercase tracking-widest">{{ t('monopoly.rules.events') }}</p>
              <p class="text-[10px] font-black text-text-sub uppercase tracking-widest">{{ t('monopoly.rules.events') }}</p>
              <p class="text-base md:text-xl font-black text-primary mt-1">15 {{ t('monopoly.rules.random') }}</p>
            </div>
          </div>
        </div>

        <!-- Username Input -->
        <div class="w-full max-w-sm flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-[10px] font-black uppercase tracking-widest text-text-sub px-1 text-left">
              {{ t('monopoly.username.label') }}
            </label>
            <input
              v-model="username"
              type="text"
              :placeholder="t('monopoly.username.placeholder')"
              class="input-mainline text-center text-base md:text-xl"
            />
          </div>

          <button
            @click="onStartClick"
            class="btn-mainline w-full !py-3 md:!py-5 text-base md:text-xl group"
          >
            <span class="inline-block transition-transform group-hover:translate-x-1">{{ t('monopoly.startBtn') }} 🚀</span>
          </button>
        </div>

        <!-- Leaderboard -->
        <div class="w-full max-w-xl mt-4">
          <div class="card-mainline !p-6 !shadow-none">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-black text-primary uppercase tracking-widest">
                🏆 {{ t('monopoly.leaderboard.title') }}
              </h3>
              <button @click="fetchLeaderboard" class="p-2 hover:bg-primary/10 rounded-full transition-colors" :disabled="isLoadingLeaderboard">
                <RotateCw  class=" text-sm" :class="{ 'animate-spin': isLoadingLeaderboard }"/>
              </button>
            </div>

            <div v-if="isLoadingLeaderboard && !leaderboardData.length" class="py-12 text-center text-text-sub">
              <div class="animate-spin text-3xl mb-2">🎲</div>
              <p class="text-xs font-bold">{{ t('monopoly.leaderboard.loading') }}</p>
            </div>

            <div v-else-if="leaderboardError" class="py-8 text-center text-accent-red">
               <p class="text-xs font-bold">{{ t('monopoly.leaderboard.error') }}</p>
               <p class="text-[10px] mt-1 opacity-70">{{ leaderboardError }}</p>
            </div>

            <div v-else-if="!leaderboardData.length" class="py-12 text-center text-text-sub">
              <p class="text-4xl mb-2">📭</p>
              <p class="text-xs font-bold">{{ t('monopoly.leaderboard.noData') }}</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="text-[10px] uppercase font-bold text-text-sub border-b border-border-main">
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
                    class="border-b border-primary/5 last:border-0 hover:bg-primary/5 transition-colors"
                  >
                    <td class="py-3 px-2">
                       <span v-if="idx === 0" class="text-lg">🥇</span>
                       <span v-else-if="idx === 1" class="text-lg">🥈</span>
                       <span v-else-if="idx === 2" class="text-lg">🥉</span>
                       <span v-else class="font-black text-text-sub pl-1">#{{ idx + 1 }}</span>
                    </td>
                    <td class="py-3 px-2">
                      <div class="font-bold flex items-center gap-1.5">
                        {{ item.username }}
                        <span v-if="item.username === username" class="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{{ t('common.you') }}</span>
                      </div>
                      <div class="text-[10px] text-text-sub opacity-70">
                        {{ new Date(item.start_time).toLocaleDateString() }}
                      </div>
                    </td>
                    <td class="py-3 px-2 text-right">
                      <span class="font-black text-accent-emerald">{{ item.score }}</span>
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
        <div class="absolute inset-0 bg-background-main/50 backdrop-blur-sm" @click="dismissMathQuiz"></div>
        <div class="relative card-mainline p-6 lg:p-8 max-w-sm w-full shadow-2xl text-center">
          <!-- Timer circle -->
          <div class="absolute top-4 right-4 w-10 h-10">
            <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" stroke-width="2" class="text-border-main" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="3" stroke-linecap="round"
                class="transition-all duration-1000 ease-linear"
                :class="mathTimer <= 2 ? 'text-accent-red' : 'text-primary'"
                :stroke-dasharray="97.4"
                :stroke-dashoffset="97.4 - (97.4 * mathTimer / 5)"
              />
            </svg>
            <span class="absolute inset-0 flex items-center justify-center text-sm font-black" :class="mathTimer <= 2 ? 'text-accent-red' : ''">{{ mathTimer }}</span>
          </div>

          <div class="text-4xl mb-2">🧮</div>
          <h3 class="text-lg font-black mb-1">{{ t('monopoly.mathQuiz.title') }}</h3>
          <p class="text-xs text-text-sub mb-5">{{ t('monopoly.mathQuiz.hint') }}</p>

          <div class="text-3xl lg:text-4xl font-black mb-5 tracking-wide" :class="{ 'animate-wrong': mathWrong }">
            {{ mathA }} {{ mathOp }} {{ mathB }} = ?
          </div>

          <input
            v-model="mathAnswer"
            type="number"
            inputmode="numeric"
            class="w-full text-center text-3xl font-black py-4 px-6 rounded-2xl border-2 bg-surface-main border-primary focus:shadow-offset-green focus:outline-none transition-all mb-6"
            :class="{ 'border-accent-red': mathWrong }"
            :placeholder="t('monopoly.mathQuiz.placeholder')"
            @keyup.enter="checkMathAnswer"
            autofocus
          />

          <div class="flex gap-3">
            <button
              @click="dismissMathQuiz"
              class="flex-1 py-4 rounded-2xl font-black border-2 border-primary text-text-sub hover:bg-primary/5 transition-all"
            >
              {{ t('monopoly.mathQuiz.cancel') }}
            </button>
            <button
              @click="checkMathAnswer"
              class="flex-1 py-3 rounded-xl font-black bg-primary text-background-main shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {{ t('monopoly.mathQuiz.confirm') }}
            </button>
          </div>

          <p v-if="mathWrong" class="text-accent-red text-sm font-bold mt-3 animate-bounce-slow">{{ t('monopoly.mathQuiz.wrong') }}</p>
        </div>
      </div>
    </Transition>

    <!-- ==================== GAME BOARD ==================== -->
    <Transition name="fade">
      <div v-if="gamePhase === 'playing'" class="flex flex-col gap-3 md:gap-4">
        <!-- Top HUD -->
        <div class="flex items-center gap-3 md:gap-4 mb-3 md:mb-8">
            <div class="size-8 md:size-12 bg-primary text-background-main rounded-xl flex items-center justify-center shadow-offset-green">
              <Zap class="size-4 md:size-7" />
            </div>
            <div>
              <h2 class="text-xl md:text-3xl font-black text-primary uppercase tracking-tighter">Stitch Adventure</h2>
              <div class="flex items-center gap-2">
                <span class="badge-mainline">Season 1</span>
                <span class="text-[10px] font-black text-text-sub uppercase tracking-widest">{{ t('monopoly.roundsLeft', { count: MAX_ROUNDS - round + 1 }) }}</span>
              </div>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-2 md:gap-4">
            <div class="card-mainline !p-3 md:!p-5 !bg-accent-amber/5 !shadow-none rotate-1">
              <div class="flex items-center gap-3 mb-2">
                <Zap class="size-5 text-accent-amber fill-accent-amber" />
                <span class="text-[10px] font-black uppercase tracking-widest text-text-sub">Score</span>
              </div>
              <div class="text-2xl md:text-4xl font-black text-primary">{{ player.score }}</div>
            </div>
            <div class="card-mainline !p-3 md:!p-5 !bg-accent-cyan/5 !shadow-none -rotate-1">
              <div class="flex items-center gap-3 mb-2">
                <LayoutDashboard class="size-5 text-accent-cyan" />
                <span class="text-[10px] font-black uppercase tracking-widest text-text-sub">Items</span>
              </div>
              <div class="text-2xl md:text-4xl font-black text-primary">{{ player.items.length }}</div>
            </div>
        </div>

        <!-- Board Grid (rectangular loop) -->
        <div class="board-container bg-surface-main rounded-3xl p-3 lg:p-5 border-2 border-border-main shadow-sm">
          <!-- Top row -->
          <div class="flex gap-1.5 lg:gap-2 mb-1.5 lg:mb-2">
            <div
              v-for="tile in topRow"
              :key="'t'+tile.id"
              class="tile-cell flex-1 aspect-square rounded-xl lg:rounded-2xl border-2 bg-gradient-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden min-w-0"
              :class="[tileColorClass(tile), player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 scale-110 shadow-lg' : '']"
            >
              <span class="text-base lg:text-xl leading-none">{{ tileIcon(tile) }}</span>
              <span class="text-[8px] lg:text-[10px] font-bold mt-0.5 text-text-sub">{{ tile.id + 1 }}</span>
              <!-- Player token -->
              <div v-if="player.position === tile.id" class="absolute inset-0 flex items-center justify-center">
                <div class="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-background-main text-xs lg:text-sm font-black shadow-lg animate-pulse-slow border-2 border-background-main">
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
                class="tile-cell w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl border-2 bg-gradient-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden"
                :class="[tileColorClass(tile), player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 scale-110 shadow-lg' : '']"
              >
                <span class="text-base lg:text-xl leading-none">{{ tileIcon(tile) }}</span>
                <span class="text-[8px] lg:text-[10px] font-bold mt-0.5 text-text-sub">{{ tile.id + 1 }}</span>
                <div v-if="player.position === tile.id" class="absolute inset-0 flex items-center justify-center">
                  <div class="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-background-main text-xs lg:text-sm font-black shadow-lg animate-pulse-slow border-2 border-background-main">★</div>
                </div>
              </div>
            </div>

            <!-- Center area: Dice + Controls -->
            <div class="flex-1 flex flex-col items-center justify-center gap-3 lg:gap-4 min-h-[160px] lg:min-h-[250px]">
              <!-- Dice -->
              <div
                class="dice-container w-16 h-16 lg:w-24 lg:h-24 bg-surface-main rounded-2xl lg:rounded-3xl shadow-offset-dark border-2 border-primary grid grid-cols-3 grid-rows-3 p-2 lg:p-3 gap-0.5 lg:gap-1 transition-transform duration-100"
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
                class="legacy-monopoly-board-cta bg-primary text-background-main font-black text-sm lg:text-base px-6 lg:px-8 py-2.5 lg:py-3 rounded-xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50"
              >
                <span v-if="isRolling" class="inline-flex items-center gap-1">
                  <span class="animate-spin">🎲</span> ...
                </span>
                <span v-else-if="isMoving">{{ t('monopoly.moving') }}...</span>
                <span v-else>{{ t('monopoly.rollBtn') }} 🎲</span>
              </button>

              <button
                @click="onMathChallengeClick"
                :disabled="isRolling || isMoving || showEvent"
                class="legacy-monopoly-secondary-cta bg-surface-main text-primary border-2 border-primary/20 hover:border-primary/50 font-black text-[10px] lg:text-xs px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <span>🧮 {{ t('monopoly.mathQuiz.entry') }}</span>
              </button>
            </div>

            <!-- Right column -->
            <div class="flex flex-col gap-1.5 lg:gap-2">
              <div
                v-for="tile in rightCol"
                :key="'r'+tile.id"
                class="tile-cell w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl border-2 bg-gradient-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden"
                :class="[tileColorClass(tile), player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 scale-110 shadow-lg' : '']"
              >
                <span class="text-base lg:text-xl leading-none">{{ tileIcon(tile) }}</span>
                <span class="text-[8px] lg:text-[10px] font-bold mt-0.5 text-text-sub">{{ tile.id + 1 }}</span>
                <div v-if="player.position === tile.id" class="absolute inset-0 flex items-center justify-center">
                  <div class="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-background-main text-xs lg:text-sm font-black shadow-lg animate-pulse-slow border-2 border-background-main">★</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom row (reversed) -->
          <div class="flex gap-1.5 lg:gap-2 mt-1.5 lg:mt-2">
            <div
              v-for="tile in bottomRow"
              :key="'b'+tile.id"
              class="tile-cell flex-1 aspect-square rounded-xl lg:rounded-2xl border-2 bg-gradient-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative overflow-hidden min-w-0"
              :class="[tileColorClass(tile), player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 scale-110 shadow-lg' : '']"
            >
              <span class="text-base lg:text-xl leading-none">{{ tileIcon(tile) }}</span>
              <span class="text-[8px] lg:text-[10px] font-bold mt-0.5 text-text-sub">{{ tile.id + 1 }}</span>
              <div v-if="player.position === tile.id" class="absolute inset-0 flex items-center justify-center">
                <div class="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-background-main text-xs lg:text-sm font-black shadow-lg animate-pulse-slow border-2 border-background-main">★</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== BACKPACK PANEL ==================== -->
        <div class="card-mainline legacy-inventory-card !p-6 !shadow-none">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base md:text-xl font-black text-primary uppercase tracking-widest">{{ t('monopoly.inventory.title') }}</h3>
              <span class="badge-mainline">{{ player.items.length }}/5</span>
            </div>
            
            <div class="flex flex-wrap gap-3">
              <div
                v-for="(item, idx) in player.items"
                :key="idx"
                @click="useItem(idx)"
                class="size-12 bg-surface-main border-2 border-primary rounded-xl flex items-center justify-center text-2xl shadow-offset-dark hover:rotate-12 transition-transform cursor-help group relative"
              >
                {{ item.icon }}
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-primary text-background-main text-[10px] font-black rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-20">
                  {{ t(`monopoly.items.${item.id}.name`) }}
                </div>
              </div>
              <div v-if="player.items.length === 0" class="w-full py-4 text-center text-text-sub italic font-black text-sm border-2 border-dashed border-primary/10 rounded-xl">
                 {{ t('monopoly.inventory.empty') }}
              </div>
            </div>
          </div>

        <!-- ==================== EVENT POPUP ==================== -->
        <Transition name="zoom">
          <div v-if="showEvent" class="fixed inset-0 z-100 flex items-center justify-center p-4" @click.self="dismissEvent">
            <div class="absolute inset-0 bg-primary/40 backdrop-blur-sm"></div>
            <div class="relative bg-surface-main rounded-3xl p-6 lg:p-8 max-w-sm w-full border-2 border-primary text-center">
              <div class="text-5xl mb-3 animate-bounce-slow">{{ eventTypeIcon() }}</div>
              <p class="text-base lg:text-lg font-bold leading-relaxed mb-5">{{ eventMessage }}</p>
              <button
                @click="dismissEvent"
                class="legacy-event-cta bg-primary text-background-main font-black px-8 py-3 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {{ t('monopoly.ok') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- ==================== GAME OVER SCREEN ==================== -->
    <Transition name="fade">
      <div v-if="gamePhase === 'gameover'" class="flex flex-col items-center justify-center min-h-[70vh] gap-8 text-center px-4">
        <div class="text-7xl lg:text-8xl animate-bounce-slow mb-4">🏆</div>

        <div class="flex flex-col gap-2">
          <h2 class="text-5xl font-black text-primary tracking-tight leading-tight">
            {{ t('monopoly.gameOver') }}
          </h2>
          <p class="text-text-sub font-bold text-lg">
            {{ player.score >= TARGET_SCORE ? t('monopoly.result.goalReached') : t('monopoly.result.roundsEnd') }}
          </p>
        </div>

        <!-- Score display -->
        <div class="card-mainline legacy-gameover-score !p-10 !bg-primary !text-background-main !shadow-none rotate-1 w-full max-w-sm">
          <div class="text-6xl font-black mb-2">{{ player.score }}</div>
          <p class="text-xs font-black uppercase tracking-widest opacity-60">{{ t('monopoly.finalScore') }}</p>
          <div class="mt-6 text-4xl font-black opacity-90">
            {{ gradeLabel.label }}
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-2 gap-4 w-full max-w-sm">
          <div class="card-mainline legacy-summary-stat !p-4 !shadow-none text-left bg-surface-main">
            <p class="text-[10px] font-black text-text-sub uppercase tracking-widest mb-1">{{ t('monopoly.stats.rounds') }}</p>
            <p class="text-2xl font-black text-primary">{{ round - 1 }}</p>
          </div>
          <div class="card-mainline legacy-summary-stat !p-4 !shadow-none text-left bg-surface-main">
            <p class="text-[10px] font-black text-text-sub uppercase tracking-widest mb-1">{{ t('monopoly.stats.laps') }}</p>
            <p class="text-2xl font-black text-primary">{{ gameStats.lapsCompleted }}</p>
          </div>
          <div class="card-mainline legacy-summary-stat !p-4 !shadow-none text-left bg-surface-main">
            <p class="text-[10px] font-black text-text-sub uppercase tracking-widest mb-1">{{ t('monopoly.stats.itemsUsed') }}</p>
            <p class="text-2xl font-black text-primary">{{ gameStats.itemsUsed }}</p>
          </div>
          <div class="card-mainline legacy-summary-stat !p-4 !shadow-none text-left bg-surface-main">
            <p class="text-[10px] font-black text-text-sub uppercase tracking-widest mb-1">{{ t('monopoly.stats.bestRound') }}</p>
            <p class="text-2xl font-black text-primary">+{{ gameStats.maxScoreInOneRound }}</p>
          </div>
        </div>

        <button
          @click="startGame"
          class="btn-mainline !py-5 !px-12 flex items-center justify-center gap-3 mt-4"
        >
          <RotateCw class="size-6" />
          <span class="text-xl">{{ t('monopoly.playAgain') }}</span>
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
