import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, TABLES } from '../supabase';
import { LogOut, RotateCw, X, Calculator } from 'lucide-react';

// ==================== GAME DATA ====================
const BOARD_SIZE = 24;
const MAX_ROUNDS = 30;
const TARGET_SCORE = 1000;

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

function generateBoard() {
  const distribution = {
    reward: [1, 5, 10, 16, 22],
    penalty: [4, 8, 14, 20],
    item: [2, 7, 13, 19],
    event: [11, 17, 23],
  };
  const tiles = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    let type = 'normal', value = 0;
    if (distribution.reward.includes(i)) {
      type = 'reward'; value = [50, 80, 100, 150, 200][Math.floor(Math.random() * 5)];
    } else if (distribution.penalty.includes(i)) {
      type = 'penalty'; value = -[30, 50, 70, 100][Math.floor(Math.random() * 4)];
    } else if (distribution.item.includes(i)) {
      type = 'item';
    } else if (distribution.event.includes(i)) {
      type = 'event';
    }
    tiles.push({ id: i, type, value });
  }
  return tiles;
}

const SAVE_KEY = 'monopoly_adventure_save';
const diceFaces = {
  1: [[1,1]], 2: [[0,2],[2,0]], 3: [[0,2],[1,1],[2,0]],
  4: [[0,0],[0,2],[2,0],[2,2]], 5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

function tileIcon(tile) {
  return { normal: '⬜', reward: '🎁', penalty: '⛈️', item: '🎒', event: '⚡' }[tile.type] || '⬜';
}
function tileColorClass(tile) {
  return {
    normal: 'from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 border-slate-300 dark:border-slate-500',
    reward: 'from-emerald-100 to-emerald-200 dark:from-emerald-800 dark:to-emerald-700 border-emerald-400 dark:border-emerald-500',
    penalty: 'from-red-100 to-red-200 dark:from-red-800 dark:to-red-700 border-red-400 dark:border-red-500',
    item: 'from-violet-100 to-violet-200 dark:from-violet-800 dark:to-violet-700 border-violet-400 dark:border-violet-500',
    event: 'from-amber-100 to-amber-200 dark:from-amber-800 dark:to-amber-700 border-amber-400 dark:border-amber-500',
  }[tile.type] || '';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

export default function MonopolyGame() {
  const { t } = useTranslation();

  const [gamePhase, setGamePhase] = useState('start');
  const [board, setBoard] = useState(generateBoard);
  const [player, setPlayer] = useState({ position: 0, score: 0, items: [] });
  const [round, setRound] = useState(1);
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [eventMessage, setEventMessage] = useState('');
  const [currentEvent, setCurrentEvent] = useState(null);
  const [showBackpack, setShowBackpack] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [freezeRounds, setFreezeRounds] = useState(0);
  const [doubleRewardActive, setDoubleRewardActive] = useState(false);
  const [extraTurnPending, setExtraTurnPending] = useState(false);
  const [username, setUsername] = useState(localStorage.getItem('monopoly_username') || '');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [showMathQuiz, setShowMathQuiz] = useState(false);
  const [mathA, setMathA] = useState(0);
  const [mathB, setMathB] = useState(0);
  const [mathOp, setMathOp] = useState('+');
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathCorrectAnswer, setMathCorrectAnswer] = useState(0);
  const [mathWrong, setMathWrong] = useState(false);
  const [mathTimer, setMathTimer] = useState(5);
  const [mathQuizMode, setMathQuizMode] = useState('start'); // 'start' or 'challenge'
  const [gameStats, setGameStats] = useState({ totalDiceRolls: 0, itemsUsed: 0, eventsTriggered: 0, maxScoreInOneRound: 0, lapsCompleted: 0, mathSolved: 0 });

  const gameStartTimeRef = useRef(null);
  const mathTimerRef = useRef(null);
  const eventResolveRef = useRef(null);
  // Use refs to avoid stale closure issues in async game logic
  const playerRef = useRef(player);
  const shieldRef = useRef(shieldActive);
  const freezeRef = useRef(freezeRounds);
  const doubleRef = useRef(doubleRewardActive);
  const extraTurnRef = useRef(extraTurnPending);
  const boardRef = useRef(board);
  const roundRef = useRef(round);
  const statsRef = useRef(gameStats);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { shieldRef.current = shieldActive; }, [shieldActive]);
  useEffect(() => { freezeRef.current = freezeRounds; }, [freezeRounds]);
  useEffect(() => { doubleRef.current = doubleRewardActive; }, [doubleRewardActive]);
  useEffect(() => { extraTurnRef.current = extraTurnPending; }, [extraTurnPending]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { statsRef.current = gameStats; }, [gameStats]);

  const isGameOver = round > MAX_ROUNDS || player.score >= TARGET_SCORE;
  const progressPercent = Math.min(100, Math.round((player.score / TARGET_SCORE) * 100));

  const topRow = board.slice(0, 7);
  const rightCol = board.slice(7, 12);
  const bottomRow = [...board.slice(12, 19)].reverse();
  const leftCol = [...board.slice(19, 24)].reverse();

  const gradeLabel = useMemo(() => {
    const s = player.score;
    if (s >= 900) return { label: 'S+', color: 'text-yellow-400' };
    if (s >= 700) return { label: 'S', color: 'text-yellow-500' };
    if (s >= 500) return { label: 'A', color: 'text-emerald-400' };
    if (s >= 300) return { label: 'B', color: 'text-blue-400' };
    if (s >= 100) return { label: 'C', color: 'text-violet-400' };
    return { label: 'D', color: 'text-slate-400' };
  }, [player.score]);

  // Leaderboard
  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true); setLeaderboardError(null);
    try {
      const { data, error } = await supabase.from(TABLES.MONOPOLY_LEADERBOARD)
        .select('*').order('score', { ascending: false }).order('rounds', { ascending: true }).limit(10);
      if (error) throw error;
      setLeaderboardData(data || []);
    } catch (e) {
      setLeaderboardError(e.message);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const submitScore = async () => {
    try {
      await supabase.from(TABLES.MONOPOLY_LEADERBOARD).insert({
        username: username.trim(), score: playerRef.current.score,
        rounds: roundRef.current - 1, start_time: gameStartTimeRef.current, end_time: new Date().toISOString()
      });
      fetchLeaderboard();
    } catch (e) { console.error('Submit score error:', e); }
  };

  // Math quiz
  const generateMathQuiz = () => {
    const op = Math.random() < 0.5 ? '+' : '-';
    let a, b;
    if (op === '+') { a = Math.floor(Math.random() * 18) + 1; b = Math.floor(Math.random() * (20 - a)) + 1; }
    else { a = Math.floor(Math.random() * 19) + 2; b = Math.floor(Math.random() * (a - 1)) + 1; }
    setMathA(a); setMathB(b); setMathOp(op);
    setMathCorrectAnswer(op === '+' ? a + b : a - b);
    setMathAnswer(''); setMathWrong(false);
  };

  const startMathTimer = () => {
    if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    setMathTimer(5);
    let t = 5;
    mathTimerRef.current = setInterval(() => {
      t--;
      setMathTimer(t);
      if (t <= 0) {
        clearInterval(mathTimerRef.current);
        setMathWrong(true);
        setTimeout(() => { setShowMathQuiz(false); setMathWrong(false); }, 1000);
      }
    }, 1000);
  };

  const onStartClick = () => {
    if (!username.trim()) { alert(t('monopoly.username.required')); return; }
    localStorage.setItem('monopoly_username', username.trim());
    setMathQuizMode('start');
    generateMathQuiz(); setShowMathQuiz(true); startMathTimer();
  };

  const onMathChallengeClick = () => {
    if (isRolling || isMoving || showEvent) return;
    setMathQuizMode('challenge');
    generateMathQuiz(); setShowMathQuiz(true); startMathTimer();
  };

  const dismissMathQuiz = () => {
    if (mathTimerRef.current) clearInterval(mathTimerRef.current);
    setShowMathQuiz(false);
  };

  const checkMathAnswer = () => {
    if (parseInt(mathAnswer) === mathCorrectAnswer) {
      if (mathTimerRef.current) clearInterval(mathTimerRef.current);
      setShowMathQuiz(false);
      if (mathQuizMode === 'start') {
        startGame();
      } else {
        // Challenge reward
        setPlayer(prev => ({ ...prev, score: prev.score + 30 }));
        setGameStats(s => ({ ...s, mathSolved: s.mathSolved + 1 }));
        setEventMessage(t('monopoly.mathQuiz.success', { defaultValue: 'Success! +30 points! 🎉' }));
        setCurrentEvent({ type: 'reward', points: 30 });
        setShowEvent(true);
      }
    } else {
      setMathWrong(true);
      setTimeout(() => setMathWrong(false), 800);
    }
  };

  // Save/Load
  const saveGame = (p, r, b, sa, fr, dra) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        player: { position: p.position, score: p.score, items: [...p.items] },
        round: r, board: b, shieldActive: sa, freezeRounds: fr, doubleRewardActive: dra, gamePhase: 'playing'
      }));
    } catch {}
  };

  const loadGame = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || data.gamePhase !== 'playing') return false;
      setPlayer({ position: data.player.position, score: data.player.score, items: data.player.items || [] });
      setRound(data.round); setBoard(data.board);
      setShieldActive(data.shieldActive || false);
      setFreezeRounds(data.freezeRounds || 0);
      setDoubleRewardActive(data.doubleRewardActive || false);
      setGamePhase('playing');
      return true;
    } catch { return false; }
  };

  const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch {} };

  useEffect(() => {
    if (!loadGame()) setGamePhase('start');
    fetchLeaderboard();
    return () => { if (mathTimerRef.current) clearInterval(mathTimerRef.current); };
  }, []);

  // Game logic
  const startGame = () => {
    const newBoard = generateBoard();
    setBoard(newBoard); setPlayer({ position: 0, score: 0, items: [] });
    setRound(1); setDiceValue(1); setIsRolling(false); setIsMoving(false);
    setShowEvent(false); setCurrentEvent(null); setShieldActive(false);
    setFreezeRounds(0); setDoubleRewardActive(false); setExtraTurnPending(false);
    setShowBackpack(false); setGameStats({ totalDiceRolls: 0, itemsUsed: 0, eventsTriggered: 0, maxScoreInOneRound: 0, lapsCompleted: 0 });
    setGamePhase('playing');
    gameStartTimeRef.current = new Date().toISOString();
    saveGame({ position: 0, score: 0, items: [] }, 1, newBoard, false, 0, false);
  };

  const quitGame = () => {
    if (confirm(t('monopoly.quitConfirm'))) {
      setGamePhase('start'); clearSave(); fetchLeaderboard();
    }
  };

  const waitForEventDismiss = () => new Promise(resolve => { eventResolveRef.current = resolve; });

  const dismissEvent = () => {
    setShowEvent(false); setCurrentEvent(null); setEventMessage('');
    if (eventResolveRef.current) { eventResolveRef.current(); eventResolveRef.current = null; }
  };

  const rollDice = async () => {
    if (isRolling || isMoving || showEvent) return;
    setIsRolling(true);
    setGameStats(s => ({ ...s, totalDiceRolls: s.totalDiceRolls + 1 }));

    let finalValue = 1;
    for (let i = 0; i < 10; i++) {
      finalValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(finalValue);
      await sleep(80);
    }
    finalValue = Math.floor(Math.random() * 6) + 1;
    setDiceValue(finalValue);
    setIsRolling(false);
    await movePlayer(finalValue);
  };

  const movePlayer = async (steps) => {
    setIsMoving(true);
    let p = { ...playerRef.current };
    const scoreBeforeRound = p.score;
    let lapsInc = 0;

    for (let i = 0; i < steps; i++) {
      const oldPos = p.position;
      p.position = (p.position + 1) % BOARD_SIZE;
      if (p.position === 0 && oldPos !== 0) { lapsInc++; p.score += 50; }
      setPlayer({ ...p });
      await sleep(200);
    }

    if (lapsInc > 0) setGameStats(s => ({ ...s, lapsCompleted: s.lapsCompleted + lapsInc }));
    setIsMoving(false);

    // Resolve tile
    const tile = boardRef.current[p.position];
    await resolveTile(tile, p);

    p = playerRef.current; // Get latest after tile resolution
    const roundScore = p.score - scoreBeforeRound;
    if (roundScore > statsRef.current.maxScoreInOneRound) {
      setGameStats(s => ({ ...s, maxScoreInOneRound: roundScore }));
    }

    if (extraTurnRef.current) {
      setExtraTurnPending(false);
    } else {
      setRound(r => r + 1);
    }

    if (freezeRef.current > 0) setFreezeRounds(f => f - 1);

    // Check game over
    const latestPlayer = playerRef.current;
    const latestRound = roundRef.current + (extraTurnRef.current ? 0 : 1);
    if (latestRound > MAX_ROUNDS || latestPlayer.score >= TARGET_SCORE) {
      setGamePhase('gameover'); submitScore(); clearSave();
    } else {
      saveGame(latestPlayer, latestRound, boardRef.current, shieldRef.current, freezeRef.current, doubleRef.current);
    }
  };

  const resolveTile = async (tile, p) => {
    switch (tile.type) {
      case 'reward': {
        let pts = tile.value;
        if (doubleRef.current) { pts *= 2; setDoubleRewardActive(false); }
        setPlayer(prev => ({ ...prev, score: prev.score + pts }));
        setEventMessage(t('monopoly.events.reward', { points: pts }));
        setCurrentEvent({ type: 'reward', points: pts }); setShowEvent(true);
        await waitForEventDismiss(); break;
      }
      case 'penalty': {
        if (shieldRef.current) {
          setShieldActive(false);
          setEventMessage(t('monopoly.events.shieldBlocked'));
          setCurrentEvent({ type: 'shield' }); setShowEvent(true);
          await waitForEventDismiss();
        } else if (freezeRef.current > 0) {
          setEventMessage(t('monopoly.events.freezeBlocked'));
          setCurrentEvent({ type: 'freeze' }); setShowEvent(true);
          await waitForEventDismiss();
        } else {
          setPlayer(prev => ({ ...prev, score: Math.max(0, prev.score + tile.value) }));
          setEventMessage(t('monopoly.events.penalty', { points: Math.abs(tile.value) }));
          setCurrentEvent({ type: 'penalty', points: tile.value }); setShowEvent(true);
          await waitForEventDismiss();
        }
        break;
      }
      case 'item': {
        const randomItem = ITEMS_DB[Math.floor(Math.random() * ITEMS_DB.length)];
        if (playerRef.current.items.length < 6) {
          setPlayer(prev => ({ ...prev, items: [...prev.items, { ...randomItem, uid: Date.now() + Math.random() }] }));
          setEventMessage(t('monopoly.events.gotItem', { item: t(`monopoly.items.${randomItem.id}`) }));
        } else {
          setEventMessage(t('monopoly.events.backpackFull'));
        }
        setCurrentEvent({ type: 'item', item: randomItem }); setShowEvent(true);
        await waitForEventDismiss(); break;
      }
      case 'event': {
        setGameStats(s => ({ ...s, eventsTriggered: s.eventsTriggered + 1 }));
        const evt = EVENTS_DB[Math.floor(Math.random() * EVENTS_DB.length)];
        await triggerRandomEvent(evt); break;
      }
    }
  };

  const triggerRandomEvent = async (evt) => {
    setCurrentEvent(evt);
    if (evt.special) {
      switch (evt.special) {
        case 'loseItems': setPlayer(prev => ({ ...prev, items: [] })); break;
        case 'freeItem': {
          const ri = ITEMS_DB[Math.floor(Math.random() * ITEMS_DB.length)];
          if (playerRef.current.items.length < 6) setPlayer(prev => ({ ...prev, items: [...prev.items, { ...ri, uid: Date.now() + Math.random() }] }));
          break;
        }
        case 'resetPosition': setPlayer(prev => ({ ...prev, position: 0 })); break;
        case 'extraTurn': setExtraTurnPending(true); break;
      }
    } else {
      if (evt.points > 0) setPlayer(prev => ({ ...prev, score: prev.score + evt.points }));
      else setPlayer(prev => ({ ...prev, score: Math.max(0, prev.score + evt.points) }));
    }
    setEventMessage(t(`monopoly.randomEvents.${evt.id}`));
    setShowEvent(true);
    await waitForEventDismiss();
  };

  const useItem = (index) => {
    const item = player.items[index];
    if (!item) return;
    const newItems = [...player.items]; newItems.splice(index, 1);
    setPlayer(prev => ({ ...prev, items: newItems }));
    setGameStats(s => ({ ...s, itemsUsed: s.itemsUsed + 1 }));

    let msg = '';
    switch (item.effect) {
      case 'rollAgain': setExtraTurnPending(true); msg = t('monopoly.itemEffects.rollAgain'); break;
      case 'blockPenalty': setShieldActive(true); msg = t('monopoly.itemEffects.blockPenalty'); break;
      case 'doubleReward': setDoubleRewardActive(true); msg = t('monopoly.itemEffects.doubleReward'); break;
      case 'rewind3': setPlayer(prev => ({ ...prev, position: (prev.position - 3 + BOARD_SIZE) % BOARD_SIZE })); msg = t('monopoly.itemEffects.rewind3'); break;
      case 'forward3': setPlayer(prev => ({ ...prev, position: (prev.position + 3) % BOARD_SIZE })); msg = t('monopoly.itemEffects.forward3'); break;
      case 'attract100': setPlayer(prev => ({ ...prev, score: prev.score + 100 })); msg = t('monopoly.itemEffects.attract100'); break;
      case 'chooseTile': setPlayer(prev => ({ ...prev, score: prev.score + 120 })); msg = t('monopoly.itemEffects.chooseTile'); break;
      case 'freezePenalty': setFreezeRounds(2); msg = t('monopoly.itemEffects.freezePenalty'); break;
    }
    setEventMessage(msg); setCurrentEvent({ type: 'itemUse' }); setShowEvent(true);
    setShowBackpack(false);
  };

  const eventTypeIcon = () => {
    if (!currentEvent) return '✨';
    const eType = currentEvent.type;
    if (eType === 'reward' || eType === 'itemUse') return '🎉';
    if (eType === 'penalty') return '😂';
    if (eType === 'shield' || eType === 'freeze') return '🛡️';
    if (eType === 'item') return '🎒';
    if (currentEvent.points > 0 || currentEvent.special === 'freeItem' || currentEvent.special === 'extraTurn') return '🍀';
    return '⚠️';
  };

  // Tile rendering helper
  const renderTile = (tile, prefix) => (
    <div key={`${prefix}${tile.id}`}
      className={`tile-cell ${prefix === 't' || prefix === 'b' ? 'flex-1 aspect-square' : 'w-10 h-10 lg:w-14 lg:h-14'} rounded-xl lg:rounded-2xl border-2 bg-gradient-to-br flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 relative min-w-0 ${tileColorClass(tile)} ${player.position === tile.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 scale-110 shadow-lg' : ''}`}>
      <span className="text-xl lg:text-2xl flex items-center justify-center leading-normal mb-1">{tileIcon(tile)}</span>
      <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark leading-none">{tile.id + 1}</span>
      {player.position === tile.id && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 lg:w-7 lg:h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-black shadow-lg shadow-primary/40 animate-pulse-slow border-2 border-white dark:border-gray-800">★</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="monopoly-game select-none">
      {/* START SCREEN */}
      {gamePhase === 'start' && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 text-center px-4">
          <div className="relative">
            <div className="text-7xl lg:text-8xl mb-2 animate-bounce-slow">🎲</div>
            <div className="absolute -inset-4 bg-primary/10 rounded-full blur-3xl -z-10"></div>
          </div>
          <div>
            <h1 className="text-3xl lg:text-5xl font-black bg-gradient-to-r from-primary via-violet-500 to-emerald-500 bg-clip-text text-transparent leading-tight pb-1">{t('monopoly.title')}</h1>
            <p className="text-text-sub-light dark:text-text-sub-dark mt-3 text-sm lg:text-base max-w-md mx-auto leading-relaxed">{t('monopoly.subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
            {[['🎯', 'monopoly.rules.goal', `${TARGET_SCORE} pts`], ['⏱️', 'monopoly.rules.rounds', `${MAX_ROUNDS} ${t('monopoly.round')}`], ['🎒', 'monopoly.rules.items', `8 ${t('monopoly.rules.types')}`], ['⚡', 'monopoly.rules.events', `15 ${t('monopoly.rules.random')}`]].map(([icon, labelKey, value]) => (
              <div key={labelKey} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 text-left">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark">{t(labelKey)}</p>
                <p className="text-sm font-black mt-1">{value}</p>
              </div>
            ))}
          </div>
          <div className="w-full max-w-sm">
            <label className="block text-left text-xs font-bold text-text-sub-light dark:text-text-sub-dark mb-2 uppercase px-1">{t('monopoly.username.label')}</label>
            <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder={t('monopoly.username.placeholder')}
              className="w-full px-4 py-3 rounded-2xl border-2 bg-surface-light dark:bg-surface-dark border-gray-100 dark:border-gray-800 focus:border-primary focus:outline-none transition-all font-bold text-center" />
          </div>
          <button onClick={onStartClick} className="bg-gradient-to-r from-primary to-violet-500 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300">
            {t('monopoly.startBtn')} 🚀
          </button>

          {/* Leaderboard */}
          <div className="w-full max-w-xl mt-4">
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">🏆 {t('monopoly.leaderboard.title')}</h3>
                <button onClick={fetchLeaderboard} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" disabled={isLoadingLeaderboard}>
                  <RotateCw className={`w-4 h-4 ${isLoadingLeaderboard ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {isLoadingLeaderboard && !leaderboardData.length ? (
                <div className="py-12 text-center text-text-sub-light dark:text-text-sub-dark">
                  <div className="animate-spin text-3xl mb-2">🎲</div>
                  <p className="text-xs font-bold">{t('monopoly.leaderboard.loading')}</p>
                </div>
              ) : leaderboardError ? (
                <div className="py-8 text-center text-red-500">
                  <p className="text-xs font-bold">{t('monopoly.leaderboard.error')}</p>
                  <p className="text-[10px] mt-1 opacity-70">{leaderboardError}</p>
                </div>
              ) : !leaderboardData.length ? (
                <div className="py-12 text-center text-text-sub-light dark:text-text-sub-dark">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-xs font-bold">{t('monopoly.leaderboard.noData')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-text-sub-light dark:text-text-sub-dark border-b border-gray-50 dark:border-gray-800">
                        <th className="pb-2 px-2 w-12">{t('monopoly.leaderboard.rank')}</th>
                        <th className="pb-2 px-2">{t('monopoly.leaderboard.nickname')}</th>
                        <th className="pb-2 px-2 text-right">{t('monopoly.leaderboard.score')}</th>
                        <th className="pb-2 px-2 text-right">{t('monopoly.leaderboard.rounds')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {leaderboardData.map((item, idx) => (
                        <tr key={item.id} className="border-b border-gray-50/50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                          <td className="py-3 px-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="font-black text-text-sub-light dark:text-text-sub-dark pl-1">#{idx + 1}</span>}</td>
                          <td className="py-3 px-2">
                            <div className="font-bold flex items-center gap-1.5">{item.username} {item.username === username && <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">YOU</span>}</div>
                            <div className="text-[10px] text-text-sub-light dark:text-text-sub-dark opacity-70">{new Date(item.start_time).toLocaleDateString()}</div>
                          </td>
                          <td className="py-3 px-2 text-right"><span className="font-black text-emerald-500">{item.score}</span></td>
                          <td className="py-3 px-2 text-right"><span className="font-bold">{item.rounds}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MATH QUIZ */}
      {showMathQuiz && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismissMathQuiz}></div>
          <div className="relative bg-surface-light dark:bg-surface-dark rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center modal-content">
            <div className="absolute top-4 right-4 w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-200 dark:text-gray-700" />
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round"
                  className={`transition-all duration-1000 ease-linear ${mathTimer <= 2 ? 'text-red-500' : 'text-primary'}`}
                  strokeDasharray="97.4" strokeDashoffset={97.4 - (97.4 * mathTimer / 5)} />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${mathTimer <= 2 ? 'text-red-500' : ''}`}>{mathTimer}</span>
            </div>
            <div className="text-4xl mb-2">🧮</div>
            <h3 className="text-lg font-black mb-1">{t('monopoly.mathQuiz.title')}</h3>
            <p className="text-xs text-text-sub-light dark:text-text-sub-dark mb-5">{t('monopoly.mathQuiz.hint')}</p>
            <div className={`text-3xl lg:text-4xl font-black mb-5 tracking-wide ${mathWrong ? 'animate-wrong' : ''}`}>
              {mathA} {mathOp} {mathB} = ?
            </div>
            <input value={mathAnswer} onChange={e => setMathAnswer(e.target.value)} type="number" inputMode="numeric"
              className={`w-full text-center text-2xl font-black py-3 px-4 rounded-xl border-2 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 focus:border-primary focus:outline-none transition-colors mb-4 ${mathWrong ? 'border-red-400 dark:border-red-500' : ''}`}
              placeholder={t('monopoly.mathQuiz.placeholder')} onKeyUp={(e) => e.key === 'Enter' && checkMathAnswer()} autoFocus />
            <div className="flex gap-3">
              <button onClick={dismissMathQuiz} className="flex-1 py-3 rounded-xl font-bold border border-gray-200 dark:border-gray-600 text-text-sub-light dark:text-text-sub-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">{t('monopoly.mathQuiz.cancel')}</button>
              <button onClick={checkMathAnswer} className="flex-1 py-3 rounded-xl font-black bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all">{t('monopoly.mathQuiz.confirm')}</button>
            </div>
            {mathWrong && <p className="text-red-500 text-sm font-bold mt-3 animate-bounce-slow">{t('monopoly.mathQuiz.wrong')}</p>}
          </div>
        </div>
      )}

      {/* GAME BOARD */}
      {gamePhase === 'playing' && (
        <div className="flex flex-col gap-4">
          {/* HUD */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <span className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{t('monopoly.roundLabel')}</span>
                <span className="text-lg font-black text-primary">{round}<span className="text-text-sub-light dark:text-text-sub-dark text-xs">/{MAX_ROUNDS}</span></span>
              </div>
              <div className="bg-surface-light dark:bg-surface-dark rounded-2xl px-4 py-2 border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <span className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{t('monopoly.score')}</span>
                <span className="text-lg font-black text-emerald-500">{player.score}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {shieldActive && <span className="text-lg" title="Shield">🛡️</span>}
              {freezeRounds > 0 && <span className="text-lg" title={`Freeze: ${freezeRounds}`}>❄️</span>}
              {doubleRewardActive && <span className="text-lg" title="Double">💰</span>}
              {extraTurnPending && <span className="text-lg" title="Extra Turn">🎲</span>}
              <button onClick={() => setShowBackpack(!showBackpack)} className="relative bg-surface-light dark:bg-surface-dark rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-800 hover:border-primary/50 transition-all">
                🎒
                {player.items.length > 0 && <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{player.items.length}</span>}
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{t('monopoly.progress')}</span>
              <span className={`text-xs font-black ${gradeLabel.color}`}>{gradeLabel.label}</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary via-violet-500 to-emerald-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark">0</span>
              <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark">{TARGET_SCORE}</span>
            </div>
          </div>

          {/* Board */}
          <div className="board-container bg-surface-light dark:bg-surface-dark rounded-3xl p-3 lg:p-5 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex gap-1.5 lg:gap-2 mb-1.5 lg:mb-2">{topRow.map(t => renderTile(t, 't'))}</div>
            <div className="flex gap-1.5 lg:gap-2">
              <div className="flex flex-col gap-1.5 lg:gap-2">{leftCol.map(t => renderTile(t, 'l'))}</div>
              <div className="flex-1 flex flex-col items-center justify-center gap-3 lg:gap-4 min-h-[160px] lg:min-h-[250px]">
                <div className={`dice-container w-16 h-16 lg:w-24 lg:h-24 bg-white dark:bg-gray-800 rounded-2xl lg:rounded-3xl shadow-xl border-2 border-gray-200 dark:border-gray-600 grid grid-cols-3 grid-rows-3 p-2 lg:p-3 gap-0.5 lg:gap-1 transition-transform duration-100 ${isRolling ? 'animate-shake' : ''}`}>
                  {[0,1,2].map(row => [0,1,2].map(col => (
                    <div key={`${row}${col}`} className="flex items-center justify-center">
                      {diceFaces[diceValue]?.some(([r, c]) => r === row && c === col) && <div className="w-2.5 h-2.5 lg:w-4 lg:h-4 bg-primary rounded-full shadow-sm"></div>}
                    </div>
                  )))}
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[120px] lg:max-w-[160px]">
                  <button onClick={rollDice} disabled={isRolling || isMoving || showEvent}
                    className="bg-gradient-to-r from-primary to-violet-500 text-white font-black text-sm lg:text-base px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    {isRolling ? <span className="inline-flex items-center gap-1"><span className="animate-spin">🎲</span> ...</span>
                      : isMoving ? `${t('monopoly.moving')}...`
                      : `${t('monopoly.rollBtn')} 🎲`}
                  </button>
                  <button onClick={onMathChallengeClick} disabled={isRolling || isMoving || showEvent}
                    className="bg-white dark:bg-gray-800 text-primary border-2 border-primary/20 hover:border-primary/50 font-bold text-[10px] lg:text-xs px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50">
                    <Calculator className="w-3 h-3 lg:w-4 h-4" />
                    {t('monopoly.mathQuiz.entry', { defaultValue: 'Math Challenge' })}
                  </button>
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-[10px] lg:text-xs font-bold text-text-sub-light dark:text-text-sub-dark">
                  <span>🎁{t('monopoly.tileTypes.reward')}</span>
                  <span>⛈️{t('monopoly.tileTypes.penalty')}</span>
                  <span>🎒{t('monopoly.tileTypes.item')}</span>
                  <span>⚡{t('monopoly.tileTypes.event')}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 lg:gap-2">{rightCol.map(t => renderTile(t, 'r'))}</div>
            </div>
            <div className="flex gap-1.5 lg:gap-2 mt-1.5 lg:mt-2">{bottomRow.map(t => renderTile(t, 'b'))}</div>
          </div>

          {/* Backpack */}
          {showBackpack && (
            <div className="bg-surface-light dark:bg-surface-dark rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-sm flex items-center gap-2">🎒 {t('monopoly.backpack')} <span className="text-text-sub-light dark:text-text-sub-dark text-xs">({player.items.length}/6)</span></h3>
                <button onClick={() => setShowBackpack(false)} className="text-text-sub-light dark:text-text-sub-dark hover:text-text-main-light dark:hover:text-text-main-dark transition-colors"><X className="w-5 h-5" /></button>
              </div>
              {player.items.length === 0 ? (
                <div className="text-center py-6 text-text-sub-light dark:text-text-sub-dark text-sm">{t('monopoly.emptyBackpack')}</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {player.items.map((item, idx) => (
                    <button key={item.uid} onClick={() => useItem(idx)} disabled={isRolling || isMoving || showEvent}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-3 border border-gray-200 dark:border-gray-600 hover:border-primary/50 hover:shadow-md transition-all active:scale-95 disabled:opacity-50 flex flex-col items-center gap-1">
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark leading-tight text-center">{t(`monopoly.items.${item.id}`)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Event Popup */}
          {showEvent && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={dismissEvent}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
              <div className="relative bg-surface-light dark:bg-surface-dark rounded-3xl p-6 lg:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center modal-content" onClick={e => e.stopPropagation()}>
                <div className="text-5xl mb-3 animate-bounce-slow">{eventTypeIcon()}</div>
                <p className="text-base lg:text-lg font-bold leading-relaxed mb-5">{eventMessage}</p>
                <button onClick={dismissEvent} className="bg-gradient-to-r from-primary to-violet-500 text-white font-black px-8 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all">{t('monopoly.ok')}</button>
              </div>
            </div>
          )}

          {/* Quit */}
          <div className="mt-4 flex justify-center">
            <button onClick={quitGame} className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark hover:text-red-500 transition-colors flex items-center gap-1 opacity-60 hover:opacity-100">
              <LogOut className="w-4 h-4" /> {t('monopoly.quitBtn')}
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER */}
      {gamePhase === 'gameover' && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4">
          <div className="text-6xl lg:text-7xl animate-bounce-slow">🏆</div>
          <div>
            <h2 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">{t('monopoly.gameOver')}</h2>
            <p className="text-text-sub-light dark:text-text-sub-dark mt-2 text-sm">{player.score >= TARGET_SCORE ? t('monopoly.result.goalReached') : t('monopoly.result.roundsEnd')}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-lg w-full max-w-sm">
            <div className="text-5xl font-black text-primary mb-1">{player.score}</div>
            <p className="text-xs font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{t('monopoly.finalScore')}</p>
            <div className={`mt-3 ${gradeLabel.color}`}><span className="text-4xl font-black">{gradeLabel.label}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {[
              [t('monopoly.stats.rounds'), round - 1],
              [t('monopoly.stats.laps'), gameStats.lapsCompleted],
              [t('monopoly.stats.itemsUsed'), gameStats.itemsUsed],
              [t('monopoly.stats.bestRound'), `+${gameStats.maxScoreInOneRound}`],
            ].map(([label, val]) => (
              <div key={label} className="bg-surface-light dark:bg-surface-dark rounded-2xl p-3 border border-gray-100 dark:border-gray-800 text-left">
                <p className="text-[10px] font-bold text-text-sub-light dark:text-text-sub-dark uppercase">{label}</p>
                <p className="text-lg font-black">{val}</p>
              </div>
            ))}
          </div>
          <button onClick={startGame} className="bg-gradient-to-r from-primary to-violet-500 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300">
            {t('monopoly.playAgain')} 🔄
          </button>
        </div>
      )}
    </div>
  );
}
