import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, useWindowDimensions, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LogOut, RotateCw, X, Calculator } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, TABLES } from '../../src/services/supabase';

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

const SAVE_KEY = '@monopoly_adventure_save';
const USERNAME_KEY = '@monopoly_username';

const diceFaces = {
  1: [[1,1]], 2: [[0,2],[2,0]], 3: [[0,2],[1,1],[2,0]],
  4: [[0,0],[0,2],[2,0],[2,2]], 5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

export default function MonopolyGame() {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

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
  const [username, setUsername] = useState('');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [showMathQuiz, setShowMathQuiz] = useState(false);
  const [mathA, setMathA] = useState(0);
  const [mathB, setMathB] = useState(0);
  const [mathOp, setMathOp] = useState('+');
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathCorrectAnswer, setMathCorrectAnswer] = useState(0);
  const [mathWrong, setMathWrong] = useState(false);
  const [mathTimer, setMathTimer] = useState(5);
  const [gameStats, setGameStats] = useState({ totalDiceRolls: 0, itemsUsed: 0, eventsTriggered: 0, maxScoreInOneRound: 0, lapsCompleted: 0, mathSolved: 0 });

  const gameStartTimeRef = useRef(null);
  const mathTimerRef = useRef(null);
  const eventResolveRef = useRef(null);
  const playerRef = useRef(player);
  const boardRef = useRef(board);
  const roundRef = useRef(round);

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { boardRef.current = board; }, [board]);
  useEffect(() => { roundRef.current = round; }, [round]);

  // Scaling Logic
  const boardLayoutSize = 380; // Target logical size for the board square
  const padding = 40;
  const scale = Math.min((windowWidth - padding) / boardLayoutSize, (windowHeight - 200) / boardLayoutSize);
  const finalScale = isNaN(scale) ? 1 : Math.min(scale, 1.5);

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const { data, error } = await supabase.from(TABLES.MONOPOLY_LEADERBOARD)
        .select('*').order('score', { ascending: false }).order('rounds', { ascending: true }).limit(10);
      if (error) throw error;
      setLeaderboardData(data || []);
    } catch (e) {
      console.warn('Leaderboard fetch error:', e);
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

  const generateMathQuiz = () => {
    const op = Math.random() < 0.5 ? '+' : '-';
    let a, b;
    if (op === '+') { a = Math.floor(Math.random() * 18) + 1; b = Math.floor(Math.random() * (20 - a)) + 1; }
    else { a = Math.floor(Math.random() * 19) + 2; b = Math.floor(Math.random() * (a - 1)) + 1; }
    setMathA(a); setMathB(b); setMathOp(op);
    setMathCorrectAnswer(op === '+' ? a + b : a - b);
    setMathAnswer(''); setMathWrong(false);
  };

  const checkMathAnswer = () => {
    if (parseInt(mathAnswer) === mathCorrectAnswer) {
      if (mathTimerRef.current) clearInterval(mathTimerRef.current);
      setShowMathQuiz(false);
      startGame();
    } else {
      setMathWrong(true);
      setTimeout(() => setMathWrong(false), 800);
    }
  };

  const saveGame = async (p, r, b, sa, fr, dra) => {
    try {
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify({
        player: { position: p.position, score: p.score, items: [...p.items] },
        round: r, board: b, shieldActive: sa, freezeRounds: fr, doubleRewardActive: dra, gamePhase: 'playing'
      }));
    } catch (e) {}
  };

  const loadGame = async () => {
    try {
      const storedName = await AsyncStorage.getItem(USERNAME_KEY);
      if (storedName) setUsername(storedName);

      const raw = await AsyncStorage.getItem(SAVE_KEY);
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

  useEffect(() => {
    loadGame().then(loaded => {
      if (!loaded) setGamePhase('start');
    });
    fetchLeaderboard();
  }, []);

  const startGame = () => {
    const newBoard = generateBoard();
    setBoard(newBoard); setPlayer({ position: 0, score: 0, items: [] });
    setRound(1); setDiceValue(1); setIsRolling(false); setIsMoving(false);
    setShowEvent(false); setShieldActive(false); setFreezeRounds(0);
    setDoubleRewardActive(false); setGamePhase('playing');
    gameStartTimeRef.current = new Date().toISOString();
  };

  const rollDice = async () => {
    if (isRolling || isMoving || showEvent) return;
    setIsRolling(true);
    let finalValue = 1;
    for (let i = 0; i < 8; i++) {
      finalValue = Math.floor(Math.random() * 6) + 1;
      setDiceValue(finalValue);
      await sleep(100);
    }
    setIsRolling(false);
    await movePlayer(finalValue);
  };

  const movePlayer = async (steps) => {
    setIsMoving(true);
    let p = { ...playerRef.current };
    for (let i = 0; i < steps; i++) {
      p.position = (p.position + 1) % BOARD_SIZE;
      if (p.position === 0) p.score += 50;
      setPlayer({ ...p });
      await sleep(250);
    }
    setIsMoving(false);
    const tile = boardRef.current[p.position];
    await resolveTile(tile, p);

    const latestPlayer = playerRef.current;
    if (extraTurnPending) {
        setExtraTurnPending(false);
    } else {
        setRound(r => r + 1);
    }

    if (roundRef.current > MAX_ROUNDS || latestPlayer.score >= TARGET_SCORE) {
      setGamePhase('gameover');
      submitScore();
      AsyncStorage.removeItem(SAVE_KEY);
    } else {
      saveGame(latestPlayer, roundRef.current, boardRef.current, shieldActive, freezeRounds, doubleRewardActive);
    }
  };

  const resolveTile = async (tile, p) => {
    let msg = '';
    let evt = { type: tile.type };
    
    if (tile.type === 'reward') {
      let pts = tile.value;
      if (doubleRewardActive) { pts *= 2; setDoubleRewardActive(false); }
      setPlayer(prev => ({ ...prev, score: prev.score + pts }));
      msg = `Excellent! +${pts} pts! 🎉`;
    } else if (tile.type === 'penalty') {
      setPlayer(prev => ({ ...prev, score: Math.max(0, prev.score + tile.value) }));
      msg = `Oh no! ${tile.value} pts! ⛈️`;
    } else if (tile.type === 'item') {
      const randomItem = ITEMS_DB[Math.floor(Math.random() * ITEMS_DB.length)];
      setPlayer(prev => ({ ...prev, items: [...prev.items, { ...randomItem, uid: Date.now() }] }));
      msg = `Got item: ${randomItem.icon}! 🎒`;
    }

    if (msg) {
      setEventMessage(msg);
      setCurrentEvent(evt);
      setShowEvent(true);
      await new Promise(r => { eventResolveRef.current = r; });
    }
  };

  const useItem = (index) => {
    const item = player.items[index];
    const newItems = [...player.items];
    newItems.splice(index, 1);
    setPlayer(prev => ({ ...prev, items: newItems }));

    if (item.effect === 'rollAgain') setExtraTurnPending(true);
    else if (item.effect === 'blockPenalty') setShieldActive(true);
    else if (item.effect === 'doubleReward') setDoubleRewardActive(true);
    
    setShowBackpack(false);
  };

  const topRow = board.slice(0, 7);
  const rightCol = board.slice(7, 12);
  const bottomRow = [...board.slice(12, 19)].reverse();
  const leftCol = [...board.slice(19, 24)].reverse();

  const renderTile = (tile) => {
    const isActive = player.position === tile.id;
    const colors = {
      normal: 'bg-slate-100 dark:bg-slate-700',
      reward: 'bg-emerald-100 dark:bg-emerald-900',
      penalty: 'bg-red-100 dark:bg-red-900',
      item: 'bg-violet-100 dark:bg-violet-900',
      event: 'bg-amber-100 dark:bg-amber-900',
    };
    const icons = { reward: '🎁', penalty: '⛈️', item: '🎒', event: '⚡', normal: '' };

    return (
      <View key={tile.id} className={`size-12 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center ${colors[tile.type]}`}>
        <Text className="text-xl">{icons[tile.type]}</Text>
        <Text className="text-[8px] absolute bottom-0.5 text-gray-400 font-bold">{tile.id + 1}</Text>
        {isActive && (
          <View className="absolute inset-0 bg-primary/20 rounded-xl items-center justify-center border-2 border-primary">
            <Text className="text-xs">★</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-background-light dark:bg-background-dark" contentContainerStyle={{ flexGrow: 1 }}>
      {gamePhase === 'start' && (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-6xl mb-4">🎲</Text>
          <Text className="text-4xl font-black text-center dark:text-white mb-2">{t('monopoly.title')}</Text>
          <Text className="text-center text-text-sub-light mb-8">{t('monopoly.subtitle')}</Text>
          
          <TextInput
            className="w-full max-w-xs bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-800 font-bold text-center mb-6 dark:text-white"
            placeholder={t('monopoly.username.placeholder')}
            value={username}
            onChangeText={setUsername}
          />
          
          <TouchableOpacity 
            onPress={() => { 
                if(username.trim()) {
                    AsyncStorage.setItem(USERNAME_KEY, username.trim());
                    generateMathQuiz();
                    setShowMathQuiz(true);
                } else { 
                    Alert.alert('Error', 'Name required'); 
                } 
            }} 
            className="bg-primary px-10 py-4 rounded-2xl"
          >
            <Text className="text-white font-black text-lg">{t('monopoly.startBtn')}</Text>
          </TouchableOpacity>

          <View className="mt-12 w-full max-w-sm">
             <Text className="text-xl font-black mb-4 dark:text-white">🏆 Leaderboard</Text>
             
             {isLoadingLeaderboard ? (
               <View className="py-10">
                 <ActivityIndicator size="small" color="#6366f1" />
               </View>
             ) : leaderboardData.length === 0 ? (
               <Text className="text-center py-10 text-gray-400 italic">No rankings yet. Be the first!</Text>
             ) : (
               leaderboardData.map((item, i) => (
                 <View key={i} className="flex flex-row justify-between p-2 border-b border-gray-100 dark:border-gray-800">
                   <Text className="font-bold dark:text-gray-300">#{i+1} {item.username}</Text>
                   <Text className="font-black text-primary">{item.score} pts</Text>
                 </View>
               ))
             )}
          </View>
        </View>
      )}

      {gamePhase === 'playing' && (
        <View className="flex-1 p-6 items-center">
          {/* HUD */}
          <View className="w-full flex flex-row justify-between mb-4">
            <View className="bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-xl border border-gray-100">
               <Text className="text-xs font-bold text-gray-400 uppercase">Round</Text>
               <Text className="text-lg font-black text-primary">{round}/{MAX_ROUNDS}</Text>
            </View>
            <View className="bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-xl border border-gray-100">
               <Text className="text-xs font-bold text-gray-400 uppercase">Score</Text>
               <Text className="text-xl font-black text-emerald-500">{player.score}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowBackpack(true)} className="bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-xl">
               <Text className="text-xl">🎒</Text>
            </TouchableOpacity>
          </View>

          {/* Board Container with Auto-scaling */}
          <View 
            style={{ 
              width: boardLayoutSize, 
              height: boardLayoutSize, 
              transform: [{ scale: finalScale }],
              marginTop: 20,
              marginBottom: 20
            }}
            className="items-center justify-center"
          >
            {/* Board Tiles */}
            <View className="flex flex-row gap-1 mb-1">{topRow.map(renderTile)}</View>
            <View className="flex flex-row gap-1">
              <View className="flex flex-col gap-1">{leftCol.map(renderTile)}</View>
              <View style={{ width: 260, height: 260 }} className="items-center justify-center">
                <View className={`size-20 bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-100 items-center justify-center ${isRolling ? 'opacity-50' : ''}`}>
                  <Text className="text-4xl text-primary font-black">{diceValue}</Text>
                </View>
                <TouchableOpacity onPress={rollDice} disabled={isRolling || isMoving} className="mt-6 bg-primary px-8 py-3 rounded-xl shadow-lg">
                  <Text className="text-white font-black text-base">{isRolling ? 'Rolling...' : 'Roll Dice'}</Text>
                </TouchableOpacity>
              </View>
              <View className="flex flex-col gap-1">{rightCol.map(renderTile)}</View>
            </View>
            <View className="flex flex-row gap-1 mt-1">{bottomRow.map(renderTile)}</View>
          </View>

          {/* Backpack Modal Overlay */}
          <Modal visible={showBackpack} transparent animationType="slide">
            <View className="flex-1 bg-black/50 justify-end">
              <View className="bg-surface-light dark:bg-surface-dark p-6 rounded-t-3xl border-t border-gray-100">
                <View className="flex flex-row justify-between mb-4">
                  <Text className="text-xl font-black dark:text-white">🎒 Backpack</Text>
                  <TouchableOpacity onPress={() => setShowBackpack(false)}><X size={24} color="#64748b" /></TouchableOpacity>
                </View>
                {player.items.length === 0 ? <Text className="text-center py-10 text-gray-400">Backpack is empty</Text> : (
                  <View className="flex flex-row flex-wrap gap-2">
                    {player.items.map((it, i) => (
                      <TouchableOpacity key={it.uid} onPress={() => useItem(i)} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl items-center">
                        <Text className="text-2xl">{it.icon}</Text>
                        <Text className="text-[10px] font-bold dark:text-gray-400">{t(`monopoly.items.${it.id}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </Modal>

          {/* Event Overlay */}
          {showEvent && (
            <Modal transparent visible={showEvent} animationType="fade">
              <View className="flex-1 bg-black/40 items-center justify-center p-6">
                <View className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl items-center border border-gray-100 shadow-2xl">
                  <Text className="text-6xl mb-4">🎉</Text>
                  <Text className="text-lg font-bold text-center dark:text-white mb-6 leading-relaxed">{eventMessage}</Text>
                  <TouchableOpacity onPress={() => { setShowEvent(false); eventResolveRef.current?.(); }} className="bg-primary px-10 py-3 rounded-xl">
                    <Text className="text-white font-black">OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          <TouchableOpacity onPress={() => setGamePhase('start')} className="mt-auto py-4">
            <Text className="text-text-sub-light font-bold">Quit Adventure</Text>
          </TouchableOpacity>
        </View>
      )}

      {gamePhase === 'gameover' && (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-6xl mb-4">🏆</Text>
          <Text className="text-4xl font-black text-center dark:text-white mb-2">Game Over!</Text>
          <Text className="text-xl font-black text-primary mb-8">{player.score} pts</Text>
          <TouchableOpacity onPress={startGame} className="bg-primary px-10 py-4 rounded-2xl">
            <Text className="text-white font-black">Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Math Quiz Modal */}
      <Modal visible={showMathQuiz} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center p-6">
          <View className="bg-surface-light dark:bg-surface-dark w-full max-w-sm p-8 rounded-3xl items-center border border-gray-100 shadow-2xl">
            <View className="bg-primary/10 p-4 rounded-2xl mb-6">
              <Calculator size={40} color="#6366f1" />
            </View>
            
            <Text className="text-xl font-black text-center dark:text-white mb-2">Adventure Challenge!</Text>
            <Text className="text-text-sub-light text-center mb-8">Solve this to start your journey</Text>
            
            <View className="flex-row items-center justify-center mb-8 gap-4">
              <Text className="text-4xl font-black dark:text-white">{mathA}</Text>
              <Text className="text-3xl font-black text-primary">{mathOp}</Text>
              <Text className="text-4xl font-black dark:text-white">{mathB}</Text>
              <Text className="text-3xl font-black text-primary">=</Text>
              <View className={`border-b-4 ${mathWrong ? 'border-red-500' : 'border-primary'} px-2 min-w-[60px] items-center`}>
                <TextInput
                  className="text-4xl font-black dark:text-white text-center"
                  keyboardType="number-pad"
                  autoFocus
                  maxLength={3}
                  value={mathAnswer}
                  onChangeText={setMathAnswer}
                  onSubmitEditing={checkMathAnswer}
                />
              </View>
            </View>
            
            <TouchableOpacity 
              onPress={checkMathAnswer} 
              className="bg-primary w-full py-4 rounded-2xl shadow-lg shadow-primary/30"
            >
              <Text className="text-white font-black text-center text-lg">Verify & Start</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowMathQuiz(false)} className="mt-6">
              <Text className="text-text-sub-light font-bold">Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
