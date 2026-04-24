"use client";
import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { playSound, speak } from '@/lib/sounds';
import { saveScore } from '@/lib/supabase';
import { addCoins, calcCoins } from '@/lib/wallet';
import { recordGameResult } from '@/lib/learningScore';
import { applyDailyFreshness } from '@/lib/gameRewards';
import { GameConfig, Question } from '@/lib/gameConfigs';
import { StreakOverlay } from './StreakOverlay';
import { CoinReward } from './CoinReward';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';

// ─── Timer bar ────────────────────────────────────────────────────────────────

const TimerBar = memo(({ timeLeft, total, accent }: { timeLeft: number; total: number; accent: string }) => {
  const pct = (timeLeft / total) * 100;
  const color =
    timeLeft <= 10 ? 'from-red-500 to-red-600' :
    timeLeft <= 20 ? 'from-amber-400 to-orange-500' :
    accent;
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

// ─── Game Over screen ─────────────────────────────────────────────────────────

function GameOver({ config, score, maxStreak, correctCount, wrongCount, coinsEarned, onPlayAgain, onBack }: {
  config: GameConfig;
  score: number; maxStreak: number; correctCount: number; wrongCount: number; coinsEarned: number;
  onPlayAgain: () => void; onBack: () => void;
}) {
  const accuracy = correctCount + wrongCount > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;

  useEffect(() => {
    playSound(accuracy >= 70 ? 'win' : 'lose');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grade =
    accuracy >= 90 ? { label: '⭐ Amazing!',         color: 'text-yellow-400' } :
    accuracy >= 70 ? { label: '👍 Great job!',        color: 'text-emerald-400' } :
    accuracy >= 50 ? { label: '💪 Keep going!',       color: 'text-blue-400' } :
                     { label: '📚 Keep practicing!',  color: 'text-purple-300' };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: config.bgStyle }}>
      {/* Floating stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 2 + Math.random() * 2, delay: Math.random() * 2 }}
            className="absolute text-white/30 text-2xl"
            style={{ top: `${Math.random() * 90}%`, left: `${Math.random() * 90}%` }}
          >★</motion.div>
        ))}
      </div>

      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 w-full max-w-md text-center relative z-10">

        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 3 }}
          className="text-7xl mb-3">{config.emoji}</motion.div>

        <h2 className="text-4xl font-black text-white mb-1">Time's Up!</h2>
        <p className={`text-xl font-bold mb-4 ${grade.color}`}>{grade.label}</p>

        <CoinReward coins={coinsEarned} />

        <div className="grid grid-cols-2 gap-3 my-5">
          {[
            { label: 'Score',       value: score.toLocaleString(), icon: '⭐', color: 'from-amber-400 to-yellow-500' },
            { label: 'Best Streak', value: `×${maxStreak}`,        icon: '🔥', color: 'from-orange-400 to-red-500' },
            { label: 'Correct',     value: correctCount,           icon: '✅', color: 'from-emerald-400 to-green-500' },
            { label: 'Accuracy',    value: `${accuracy}%`,         icon: '🎯', color: 'from-blue-400 to-cyan-500' },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black text-white">{s.value}</div>
              <div className="text-white/80 text-xs font-bold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onBack}
            className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 transition-colors">
            🏠 Hub
          </button>
          <button onClick={onPlayAgain}
            style={{ background: config.accentStyle }}
            className="flex-1 py-4 text-white font-black rounded-2xl hover:scale-105 transition-transform shadow-lg">
            🔄 Again!
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main engine ──────────────────────────────────────────────────────────────

const COLORS = ['#ffd700', '#ff6b6b', '#4ecdc4', '#a78bfa', '#34d399', '#f472b6'];

function streakLabel(streak: number) {
  if (streak >= 10) return { text: '🔥 ON FIRE!',   color: 'text-orange-300' };
  if (streak >= 5)  return { text: '⚡ LIGHTNING!', color: 'text-yellow-300' };
  if (streak >= 3)  return { text: '💥 COMBO!',     color: 'text-pink-300' };
  return null;
}

export function GameEngine({ config, onBack }: { config: GameConfig; onBack: () => void }) {
  const { playerName, soundEnabled, setSoundEnabled, score, streak, maxStreak,
          correctCount, wrongCount, incrementScore, incrementWrong, resetGame } = useGameStore();

  const [level, setLevel] = useState<Level | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(config.duration);
  const [isGameOver, setIsGameOver] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [particles, setParticles] = useState<{ id: number; color: string; angle: number }[]>([]);
  const [floatingPts, setFloatingPts] = useState<{ pts: number; id: number } | null>(null);
  const [shakeWrong, setShakeWrong] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ptId = useRef(0);

  const nextQuestion = useCallback(() => {
    setQuestion(config.generateQuestion(level ?? 'medium'));
    setSelectedChoice(null);
    setIsAnswering(false);
  }, [config]);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current!);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); setIsGameOver(true); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    nextQuestion();
    startTimer();
    return () => clearInterval(timerRef.current!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isGameOver) {
      const { score: s, correctCount: cc, maxStreak: ms, playerGrade, playerEmail } = useGameStore.getState();
      const elapsed = config.duration - timeLeft;

      saveScore(playerName, 0, s, config.id)
        .then(({ error }: { error: any }) => {
          if (error) console.error('Score save failed:', error.message);
        });

      const rawCoins = calcCoins(cc, ms, false, false);
      const dbKey    = playerEmail || playerName;
      applyDailyFreshness(dbKey, config.id, rawCoins).then(coins => {
        setCoinsEarned(coins);
        addCoins(playerName, coins, elapsed, true, playerGrade, config.id, playerEmail)
          .then(({ error }: any) => {
            if (error) console.error('Coin save failed:', error.message);
          });
        recordGameResult(playerName, config.id, cc, cc + (useGameStore.getState().wrongCount ?? 0), playerGrade).catch(() => {});
      });
    }
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
      if (soundEnabled) { playSound('correct'); setTimeout(() => playSound('coin'), 320); }

      setParticles(Array.from({ length: 8 }, (_, i) => ({ id: i, color: COLORS[i % COLORS.length], angle: i * 45 })));
      setTimeout(() => setParticles([]), 900);
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
    setLevel(null); // go back to level picker
  };

  if (!level) {
    return <LevelPicker onSelect={setLevel} onBack={onBack} bgStyle={config.bgStyle} />;
  }

  if (isGameOver) {
    return (
      <GameOver config={config} score={score} maxStreak={maxStreak}
        correctCount={correctCount} wrongCount={wrongCount} coinsEarned={coinsEarned}
        onPlayAgain={handlePlayAgain}
        onBack={() => { resetGame(); onBack(); }}
      />
    );
  }

  if (!question) return null;

  const label = streakLabel(streak);
  const timerAccent = config.id === 'addition' ? 'from-cyan-400 to-teal-400'
    : config.id === 'division' ? 'from-amber-400 to-orange-400'
    : config.id === 'fractions' ? 'from-pink-400 to-rose-400'
    : 'from-emerald-400 to-teal-400';

  return (
    <div className="min-h-screen flex flex-col select-none relative" style={{ background: config.bgStyle }}>
      <StreakOverlay streak={streak} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { clearInterval(timerRef.current!); resetGame(); onBack(); }}
            className="bg-white/20 hover:bg-white/30 text-white rounded-xl px-3 py-2 text-sm font-bold transition-colors"
          >✕</button>

          <div className="flex-1">
            <TimerBar timeLeft={timeLeft} total={config.duration} accent={timerAccent} />
          </div>

          <div className="bg-white/20 rounded-xl px-3 py-1 text-center min-w-[48px]">
            <div className="text-white/70 text-xs font-bold">{timeLeft}s</div>
          </div>

          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-colors">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {/* Score row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 rounded-xl px-3 py-1">
              <span className="text-white font-bold text-sm">{config.title}</span>
            </div>
            {level && (
              <div className="rounded-lg px-2 py-0.5 text-white text-xs font-black"
                style={{ background: `linear-gradient(135deg, ${LEVEL_CONFIG[level].glow}88, ${LEVEL_CONFIG[level].glow}55)` }}>
                {LEVEL_CONFIG[level].emoji} {LEVEL_CONFIG[level].label} ×{LEVEL_CONFIG[level].multiplier}
              </div>
            )}
          </div>

          {streak >= 3 && (
            <motion.div key={streak} initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="font-black text-sm text-orange-300">
              {streak >= 10 ? '🔥' : streak >= 5 ? '⚡' : '💥'} ×{streak}
            </motion.div>
          )}

          <div className="bg-white/20 rounded-xl px-4 py-1 text-right">
            <div className="text-white font-black text-xl leading-none">{score.toLocaleString()}</div>
            {streak > 0 && <div className="text-orange-300 text-xs font-bold">🔥 ×{streak}</div>}
          </div>
        </div>
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">

        {/* Question */}
        <div className="relative text-center">
          <AnimatePresence mode="wait">
            <motion.div key={question.displayText}
              initial={{ y: -30, opacity: 0, scale: 0.85 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <div className="text-6xl md:text-8xl font-black text-white drop-shadow-2xl tracking-tight">
                {question.displayText}
              </div>
              <div className="text-white/50 text-xl font-bold mt-2">
                {question.hint ?? '= ?'}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Floating points */}
          <AnimatePresence>
            {floatingPts && (
              <motion.div key={floatingPts.id}
                initial={{ y: 0, opacity: 1, scale: 1 }}
                animate={{ y: -70, opacity: 0, scale: 1.4 }}
                className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-300 font-black text-2xl pointer-events-none whitespace-nowrap"
              >+{floatingPts.pts}</motion.div>
            )}
          </AnimatePresence>

          {/* Particles */}
          {particles.map(p => (
            <motion.div key={p.id}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos(p.angle * Math.PI / 180) * 90, y: Math.sin(p.angle * Math.PI / 180) * 90, opacity: 0 }}
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
            let cls = 'bg-white text-slate-800 hover:scale-105 active:scale-95';
            if (selectedChoice !== null) {
              if (choice === question.answer)     cls = 'bg-emerald-400 text-white scale-105 shadow-xl shadow-emerald-400/40';
              else if (choice === selectedChoice) cls = 'bg-red-400 text-white';
              else                                cls = 'bg-white/30 text-white/50';
            }
            return (
              <motion.button
                key={`${choice}-${idx}`}
                whileTap={selectedChoice === null ? { scale: 0.94 } : {}}
                onClick={() => handleAnswer(choice)}
                disabled={selectedChoice !== null}
                className={`${cls} rounded-2xl py-6 text-3xl font-black shadow-lg transition-all duration-150 disabled:cursor-not-allowed`}
              >
                {question.formatChoice(choice)}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Streak dots */}
        {streak > 0 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(streak, 10) }).map((_, i) => (
              <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-2.5 h-2.5 rounded-full bg-white/60" />
            ))}
            {streak > 10 && <span className="text-white/60 font-bold text-sm ml-1">+{streak - 10}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
