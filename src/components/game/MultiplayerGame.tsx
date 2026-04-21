"use client";
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { playSound, speak } from '@/lib/sounds';
import { saveScore } from '@/lib/supabase';
import { addCoins, calcCoins } from '@/lib/wallet';
import { StreakOverlay } from './StreakOverlay';
import { CoinReward } from './CoinReward';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';
import { Volume2, VolumeX } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  a: number;
  b: number;
  answer: number;
  choices: number[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Shuffle an array in place
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build a shuffled deck of multipliers for the chosen level
function makeDeck(level: Level | null): number[] {
  const max = level === 'hard' ? 12 : level === 'easy' ? 5 : 10;
  return shuffle(Array.from({ length: max }, (_, i) => i + 1));
}

function generateQuestion(focusNumber: number, b: number): Question {
  const answer = focusNumber * b;
  const wrongs = new Set<number>();
  let tries = 0;
  while (wrongs.size < 3 && tries < 100) {
    const offset = Math.floor(Math.random() * 5) + 1;
    const w = answer + (Math.random() > 0.5 ? offset : -offset);
    if (w > 0 && w !== answer) wrongs.add(w);
    tries++;
  }
  const choices = [answer, ...Array.from(wrongs)].sort(() => Math.random() - 0.5);
  return { a: focusNumber, b, answer, choices };
}

function streakLabel(streak: number): { text: string; color: string } | null {
  if (streak >= 10) return { text: '🔥 ON FIRE!', color: 'text-orange-400' };
  if (streak >= 5)  return { text: '⚡ LIGHTNING!', color: 'text-yellow-300' };
  if (streak >= 3)  return { text: '💥 COMBO!', color: 'text-pink-300' };
  return null;
}

const COLORS = ['#ffd700', '#ff6b6b', '#4ecdc4', '#a78bfa', '#34d399', '#f472b6'];

// ─── Timer Bar ────────────────────────────────────────────────────────────────

const TimerBar = memo(({ timeLeft, total }: { timeLeft: number; total: number }) => {
  const pct = (timeLeft / total) * 100;
  const color =
    timeLeft <= 10 ? 'from-red-500 to-red-600' :
    timeLeft <= 20 ? 'from-amber-400 to-orange-500' :
    'from-emerald-400 to-teal-400';
  return (
    <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: 'linear' }}
      />
    </div>
  );
});
TimerBar.displayName = 'TimerBar';

// ─── Table Picker ─────────────────────────────────────────────────────────────

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const TABLE_COLORS = [
  'from-violet-500 to-purple-600',
  'from-pink-500 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-blue-500 to-cyan-500',
  'from-fuchsia-500 to-pink-500',
  'from-red-500 to-rose-600',
  'from-indigo-500 to-violet-600',
  'from-green-400 to-emerald-500',
];

function TablePicker({ onSelect, onBack, soundEnabled, onToggleSound }: {
  onSelect: (n: number) => void;
  onBack: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-purple-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-10">
          <button onClick={onBack}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold transition-colors text-sm">
            ← Hub
          </button>
          <h1 className="text-3xl font-black text-white">Pick Your Table</h1>
          <button onClick={onToggleSound}
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors">
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <p className="text-white/60 text-center mb-8 font-medium">Which times table do you want to conquer today?</p>

        <div className="grid grid-cols-3 gap-4">
          {TABLES.map((n, i) => (
            <motion.button
              key={n}
              whileHover={{ scale: 1.06, y: -4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { playSound('click'); onSelect(n); }}
              className={`bg-gradient-to-br ${TABLE_COLORS[i]} rounded-2xl py-8 text-white font-black text-3xl shadow-lg`}
            >
              {n}×
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Game Over ────────────────────────────────────────────────────────────────

function GameOver({ score, maxStreak, correctCount, wrongCount, coinsEarned, players, playerName, onPlayAgain, onBack }: {
  score: number; maxStreak: number; correctCount: number; wrongCount: number; coinsEarned: number;
  players: { name: string; score: number; streak: number }[];
  playerName: string;
  onPlayAgain: () => void; onBack: () => void;
}) {
  const accuracy = correctCount + wrongCount > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 0;

  const opponent = players.find(p => p.name !== playerName);
  const isMultiplayer = !!opponent;
  const opponentScore = opponent?.score ?? 0;

  const outcome: 'win' | 'lose' | 'draw' | null = isMultiplayer
    ? score > opponentScore ? 'win'
    : score < opponentScore ? 'lose'
    : 'draw'
    : null;

  useEffect(() => {
    if (outcome === 'win') playSound('win');
    else if (outcome === 'lose') playSound('lose');
    else if (outcome === 'draw') playSound('draw');
    else playSound(accuracy >= 70 ? 'win' : 'lose');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const outcomeDisplay = {
    win:  { emoji: '🏆', label: 'You Win!',    color: 'from-amber-400 to-yellow-500',   text: 'text-yellow-300' },
    lose: { emoji: '💪', label: 'Good Try!',   color: 'from-violet-600 to-purple-700',  text: 'text-purple-300' },
    draw: { emoji: '🤝', label: "It's a Draw!", color: 'from-blue-500 to-cyan-600',      text: 'text-cyan-300' },
  };

  const grade =
    accuracy >= 90 ? { label: '⭐ Amazing!',        color: 'text-yellow-400' } :
    accuracy >= 70 ? { label: '👍 Great job!',       color: 'text-emerald-400' } :
    accuracy >= 50 ? { label: '💪 Keep going!',      color: 'text-blue-400' } :
                     { label: '📚 Keep practicing!', color: 'text-purple-400' };

  const display = outcome ? outcomeDisplay[outcome] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-purple-900 flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2 + Math.random() * 2, delay: Math.random() * 2 }}
            className="absolute text-yellow-300 text-xl"
            style={{ top: `${Math.random() * 90}%`, left: `${Math.random() * 90}%` }}
          >★</motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 w-full max-w-md text-center relative z-10"
      >
        {/* Winner banner (multiplayer only) */}
        {display && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`bg-gradient-to-r ${display.color} rounded-2xl p-5 mb-5`}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="text-6xl mb-2"
            >{display.emoji}</motion.div>
            <div className="text-3xl font-black text-white">{display.label}</div>
          </motion.div>
        )}

        {/* Solo header */}
        {!display && (
          <>
            <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 3 }}
              className="text-7xl mb-3">🏆</motion.div>
            <h2 className="text-4xl font-black text-white mb-1">Time's Up!</h2>
            <p className={`text-xl font-bold mb-4 ${grade.color}`}>{grade.label}</p>
          </>
        )}

        {/* Coin reward */}
        <CoinReward coins={coinsEarned} />

        {/* Multiplayer score comparison */}
        {isMultiplayer && (
          <div className="flex gap-3 mb-5">
            <div className={`flex-1 rounded-2xl p-4 ${outcome === 'win' ? 'bg-emerald-500/30 border-2 border-emerald-400' : 'bg-white/10'}`}>
              <div className="text-white/60 text-xs font-bold mb-1 truncate">{playerName}</div>
              <div className="text-3xl font-black text-white">{score.toLocaleString()}</div>
              {outcome === 'win' && <div className="text-emerald-400 text-xs font-bold mt-1">WINNER ✓</div>}
            </div>
            <div className="flex items-center text-white/40 font-black text-lg">VS</div>
            <div className={`flex-1 rounded-2xl p-4 ${outcome === 'lose' ? 'bg-emerald-500/30 border-2 border-emerald-400' : 'bg-white/10'}`}>
              <div className="text-white/60 text-xs font-bold mb-1 truncate">{opponent!.name}</div>
              <div className="text-3xl font-black text-white">{opponentScore.toLocaleString()}</div>
              {outcome === 'lose' && <div className="text-emerald-400 text-xs font-bold mt-1">WINNER ✓</div>}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Score',       value: score.toLocaleString(), icon: '⭐', color: 'from-amber-400 to-yellow-500' },
            { label: 'Best Streak', value: `×${maxStreak}`,        icon: '🔥', color: 'from-orange-400 to-red-500' },
            { label: 'Correct',     value: correctCount,           icon: '✅', color: 'from-emerald-400 to-green-500' },
            { label: 'Accuracy',    value: `${accuracy}%`,         icon: '🎯', color: 'from-blue-400 to-cyan-500' },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4`}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-white/80 text-xs font-bold uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onBack}
            className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-colors border border-white/20">
            🏠 Hub
          </button>
          <button onClick={onPlayAgain}
            className="flex-1 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black rounded-2xl hover:scale-105 transition-transform shadow-lg">
            🔄 Again!
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Game ────────────────────────────────────────────────────────────────

export const MultiplicationGame = ({ onBack }: { onBack: () => void }) => {
  const {
    focusNumber, setFocusNumber, score, streak, maxStreak,
    correctCount, wrongCount, soundEnabled, setSoundEnabled,
    playerName, incrementScore, incrementWrong, resetGame,
    socket, roomId, roomData,
  } = useGameStore();

  // Broadcast score to room after each correct answer
  const broadcastScore = useCallback((newScore: number, newStreak: number) => {
    if (socket && roomId) {
      socket.emit('submit_score', { roomId, score: newScore, streak: newStreak });
    }
  }, [socket, roomId]);

  const DURATION = 60;
  const [level, setLevel] = useState<Level | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const deckRef = useRef<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [particles, setParticles] = useState<{ id: number; color: string; angle: number }[]>([]);
  const [floatingPts, setFloatingPts] = useState<{ pts: number; id: number } | null>(null);
  const [shakeWrong, setShakeWrong] = useState(false);
  const ptId = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nextQuestion = useCallback(() => {
    if (focusNumber === null) return;
    // Refill deck when empty
    if (deckRef.current.length === 0) deckRef.current = makeDeck(level);
    const b = deckRef.current.pop()!;
    setQuestion(generateQuestion(focusNumber, b));
    setSelectedChoice(null);
    setIsAnswering(false);
  }, [focusNumber, level]);

  // Start game when focusNumber + level are both set
  useEffect(() => {
    if (focusNumber === null || isGameOver || !level) return;
    deckRef.current = makeDeck(level); // fresh deck for new game
    nextQuestion();
    setTimeLeft(DURATION);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setIsGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [focusNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save score + award coins when game ends
  useEffect(() => {
    if (!isGameOver || focusNumber === null) return;

    // Read latest values directly from store to avoid stale closure
    const { score: s, correctCount: cc, maxStreak: ms, roomData: rd, playerGrade } = useGameStore.getState();

    saveScore(playerName, focusNumber, s)
      .then(({ error }: { error: any }) => {
        if (error) console.error('Score save failed:', error.message);
      });

    const players: any[] = rd?.players ?? [];
    const opponent = players.find((p: any) => p.name !== playerName);
    const won = opponent ? s > (opponent.score ?? 0) : false;
    const isMulti = players.length > 1;
    const coins = calcCoins(cc, ms, won, isMulti);
    setCoinsEarned(coins);

    console.log(`₿ Awarding ${coins} coins to ${playerName} (correct: ${cc}, streak: ${ms})`);
    addCoins(playerName, coins, DURATION, true, playerGrade)
      .then(({ error }: any) => {
        if (error) console.error('Coin save failed:', error.message);
        else console.log(`₿ +${coins} PlayBits saved!`);
      });
  }, [isGameOver]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = useCallback((choice: number) => {
    if (isAnswering || !question) return;
    setIsAnswering(true);
    setSelectedChoice(choice);

    if (choice === question.answer) {
      const lvlMultiplier = level ? LEVEL_CONFIG[level].multiplier : 1;
      const timeBonus = Math.floor(timeLeft / 6);
      const comboBonus = streak >= 5 ? streak * 8 : streak >= 3 ? streak * 4 : 0;
      const points = Math.floor((100 + timeBonus + comboBonus) * lvlMultiplier);

      incrementScore(points);
      broadcastScore(score + Math.floor(points * 1), streak + 1);
      if (soundEnabled) { playSound('correct'); setTimeout(() => playSound('coin'), 320); speak(`${question.a} times ${question.b} equals ${question.answer}`); }

      // Particles
      setParticles(Array.from({ length: 8 }, (_, i) => ({
        id: i, color: COLORS[i % COLORS.length], angle: i * 45,
      })));
      setTimeout(() => setParticles([]), 900);

      // Floating points
      ptId.current++;
      setFloatingPts({ pts: points, id: ptId.current });
      setTimeout(() => setFloatingPts(null), 900);

      setTimeout(nextQuestion, 1200);
    } else {
      incrementWrong();
      if (soundEnabled) playSound('wrong');
      setShakeWrong(true);
      setTimeout(() => setShakeWrong(false), 500);
      setTimeout(nextQuestion, 1800);
    }
  }, [isAnswering, question, timeLeft, streak, soundEnabled, incrementScore, incrementWrong, nextQuestion]);

  const handlePlayAgain = () => {
    resetGame();
    setIsGameOver(false);
    setTimeLeft(DURATION);
    nextQuestion();
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setIsGameOver(true); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  // ── Table picker ──
  if (focusNumber === null) {
    return (
      <TablePicker
        onSelect={(n) => { resetGame(); setFocusNumber(n); setLevel(null); }}
        onBack={onBack}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />
    );
  }

  // ── Level picker (after table selected) ──
  if (focusNumber !== null && !level) {
    return (
      <LevelPicker
        onSelect={setLevel}
        onBack={() => setFocusNumber(null)}
        bgStyle="linear-gradient(135deg, #6d28d9, #9333ea, #a21caf)"
      />
    );
  }

  // ── Game over ──
  if (isGameOver) {
    return (
      <GameOver
        score={score} maxStreak={maxStreak} correctCount={correctCount} wrongCount={wrongCount}
        coinsEarned={coinsEarned}
        players={roomData?.players ?? []}
        playerName={playerName}
        onPlayAgain={handlePlayAgain}
        onBack={() => { resetGame(); setFocusNumber(null); onBack(); }}
      />
    );
  }

  // ── Active game ──
  if (!question) return null;

  const label = streakLabel(streak);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-700 flex flex-col select-none relative">
      <StreakOverlay streak={streak} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { clearInterval(timerRef.current!); resetGame(); setFocusNumber(null); }}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-2 text-sm font-bold transition-colors"
          >✕</button>

          <div className="flex-1">
            <TimerBar timeLeft={timeLeft} total={DURATION} />
          </div>

          <div className="bg-white/20 rounded-xl px-3 py-1 text-center min-w-[56px]">
            <div className="text-white/60 text-xs font-medium">{timeLeft}s</div>
          </div>

          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-colors">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Score row */}
        <div className="flex items-center justify-between gap-2">
          {/* Your score */}
          <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center flex-1">
            <div className="text-white/50 text-xs font-medium truncate">{playerName}</div>
            <div className="text-white font-black text-lg leading-none">{score.toLocaleString()}</div>
            {streak > 0 && <div className="text-orange-300 text-xs font-bold">🔥 ×{streak}</div>}
          </div>

          {/* VS badge or label */}
          {roomData?.players?.length > 1 ? (
            <div className="text-white/60 font-black text-sm">VS</div>
          ) : (
            streak >= 3 && (
              <motion.div key={streak} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="font-black text-xs text-orange-300 text-center">
                {streak >= 10 ? '🔥' : streak >= 5 ? '⚡' : '💥'} ×{streak}
              </motion.div>
            )
          )}

          {/* Opponent score (multiplayer only) */}
          {roomData?.players?.length > 1 && (() => {
            const opponent = roomData.players.find((p: any) => p.name !== playerName);
            return opponent ? (
              <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center flex-1">
                <div className="text-white/50 text-xs font-medium truncate">{opponent.name}</div>
                <div className="text-white font-black text-lg leading-none">{(opponent.score ?? 0).toLocaleString()}</div>
                {(opponent.streak ?? 0) > 0 && <div className="text-orange-300 text-xs font-bold">🔥 ×{opponent.streak}</div>}
              </div>
            ) : null;
          })()}

          {/* Solo: table badge */}
          {!roomData?.players?.length && (
            <div className="flex items-center gap-2">
              <div className="bg-white/20 rounded-xl px-3 py-1.5">
                <span className="text-white/60 text-xs">Table </span>
                <span className="text-white font-black">{focusNumber}×</span>
              </div>
              {level && (
                <div className="bg-white/20 rounded-lg px-2 py-0.5 text-white text-xs font-black">
                  {LEVEL_CONFIG[level].emoji} ×{LEVEL_CONFIG[level].multiplier}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        {/* Question */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${question.a}-${question.b}`}
              initial={{ y: -30, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="text-center"
            >
              <div className="text-8xl md:text-9xl font-black text-white drop-shadow-2xl tracking-tight">
                {question.a} × {question.b}
              </div>
              <div className="text-white/50 text-2xl font-bold mt-2">= ?</div>
            </motion.div>
          </AnimatePresence>

          {/* Floating points */}
          <AnimatePresence>
            {floatingPts && (
              <motion.div key={floatingPts.id}
                initial={{ y: 0, opacity: 1, scale: 1 }}
                animate={{ y: -70, opacity: 0, scale: 1.4 }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-300 font-black text-2xl pointer-events-none whitespace-nowrap"
              >
                +{floatingPts.pts}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Particles on correct */}
          {particles.map(p => (
            <motion.div key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(p.angle * Math.PI / 180) * 100,
                y: Math.sin(p.angle * Math.PI / 180) * 100,
                opacity: 0, scale: 0,
              }}
              transition={{ duration: 0.7 }}
              className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full pointer-events-none"
              style={{ background: p.color }}
            />
          ))}
        </div>

        {/* Answer buttons */}
        <motion.div
          animate={shakeWrong ? { x: [-8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-2 gap-4 w-full max-w-sm"
        >
          {question.choices.map((choice, idx) => {
            let cls = 'bg-white text-slate-800 hover:bg-white/90 hover:scale-105 active:scale-95';
            if (selectedChoice !== null) {
              if (choice === question.answer)
                cls = 'bg-emerald-400 text-white scale-105 shadow-emerald-400/50 shadow-xl';
              else if (choice === selectedChoice)
                cls = 'bg-red-400 text-white';
              else
                cls = 'bg-white/30 text-white/50';
            }
            return (
              <motion.button
                key={`${choice}-${idx}`}
                whileTap={selectedChoice === null ? { scale: 0.94 } : {}}
                onClick={() => handleAnswer(choice)}
                disabled={selectedChoice !== null}
                className={`${cls} rounded-2xl py-6 text-4xl font-black shadow-lg transition-all duration-150 disabled:cursor-not-allowed`}
              >
                {choice}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Streak dots */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(streak, 10) }).map((_, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            ))}
            {streak > 10 && <span className="text-orange-300 font-bold text-sm ml-1">+{streak - 10}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
