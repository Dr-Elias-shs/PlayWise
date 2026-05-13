"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';
import { playSound } from '@/lib/sounds';
import { addCoins } from '@/lib/wallet';
import { useGameStore } from '@/store/useGameStore';
import {
  TRIVIA_CATEGORIES, TriviaCategory, TriviaGrade, TriviaLevel, TriviaQuestion,
  getTriviaQuestions,
} from '@/lib/trivia';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_LIVES   = 5;
const Q_PER_GAME  = 10;

const TIMER_BY_LEVEL: Record<Level, number> = { easy: 30, medium: 20, hard: 15 };
const COINS_BY_LEVEL: Record<Level, number> = { easy: 20, medium: 35, hard: 50 };

const BG_BY_CATEGORY: Record<TriviaCategory, string> = {
  history:    'linear-gradient(135deg, #78350f, #b45309, #92400e)',
  sls:        'linear-gradient(135deg, #14532d, #15803d, #166534)',
  math:       'linear-gradient(135deg, #1e3a5f, #1d4ed8, #1e40af)',
  languages:  'linear-gradient(135deg, #4c1d95, #7c3aed, #6d28d9)',
  football:   'linear-gradient(135deg, #064e3b, #047857, #065f46)',
  formula1:   'linear-gradient(135deg, #7f1d1d, #dc2626, #b91c1c)',
  basketball: 'linear-gradient(135deg, #7c2d12, #ea580c, #c2410c)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Hearts({ lives }: { lives: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: MAX_LIVES }).map((_, i) => (
        <span key={i} className="text-lg" style={{ filter: i < lives ? '' : 'grayscale(1) opacity(0.3)' }}>
          ❤️
        </span>
      ))}
    </div>
  );
}

function TimerBar({ timeLeft, total, accent }: { timeLeft: number; total: number; accent: string }) {
  const pct = Math.max(0, timeLeft / total);
  const color = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  return (
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        animate={{ width: `${pct * 100}%`, backgroundColor: color }}
        transition={{ duration: 0.3 }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

// ─── Category picker ──────────────────────────────────────────────────────────

function CategoryPicker({
  onSelect, onBack,
}: {
  onSelect: (cat: TriviaCategory) => void;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎯</div>
          <h2 className="text-3xl font-black text-white">Pick a Category</h2>
          <p className="text-white/50 mt-1 font-medium">What do you want to test today?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TRIVIA_CATEGORIES.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { playSound('click'); onSelect(cat.id); }}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/10 hover:border-white/30 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-white font-black text-sm text-center leading-tight">{cat.label}</span>
            </motion.button>
          ))}
        </div>
        <button onClick={onBack} className="w-full mt-8 text-white/30 hover:text-white/60 font-medium text-sm transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─── Game over ────────────────────────────────────────────────────────────────

function GameOver({
  score, total, coinsEarned, lostAllLives, category, level,
  onPlayAgain, onBack,
}: {
  score: number;
  total: number;
  coinsEarned: number;
  lostAllLives: boolean;
  category: TriviaCategory;
  level: Level;
  onPlayAgain: () => void;
  onBack: () => void;
}) {
  const pct = total > 0 ? score / total : 0;
  const emoji = lostAllLives ? '💔' : pct >= 0.8 ? '🏆' : pct >= 0.5 ? '⭐' : '🎯';
  const title = lostAllLives ? 'Out of Lives!' : pct >= 0.8 ? 'Excellent!' : pct >= 0.5 ? 'Good Job!' : 'Keep Trying!';

  const catInfo = TRIVIA_CATEGORIES.find(c => c.id === category)!;

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: lostAllLives
        ? 'linear-gradient(135deg, #450a0a, #7f1d1d, #450a0a)'
        : 'linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)' }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl p-8 text-center space-y-5 border border-white/10"
        style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
      >
        <div className="text-6xl">{emoji}</div>
        <div>
          <h2 className="text-3xl font-black text-white">{title}</h2>
          <p className="text-white/50 mt-1 text-sm">{catInfo.emoji} {catInfo.label} · {LEVEL_CONFIG[level].label}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="text-3xl font-black text-white">{score}/{total}</div>
            <div className="text-white/40 text-xs font-bold mt-0.5">CORRECT</div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,215,0,0.12)' }}>
            <div className="text-3xl font-black text-yellow-300">{coinsEarned}</div>
            <div className="text-white/40 text-xs font-bold mt-0.5">PLAYBITS</div>
          </div>
        </div>

        {/* score bar */}
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className="h-full rounded-full"
            style={{ background: pct >= 0.8 ? '#22c55e' : pct >= 0.5 ? '#f59e0b' : '#ef4444' }}
          />
        </div>
        <p className="text-white/40 text-xs">{Math.round(pct * 100)}% accuracy</p>

        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-2xl font-black text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}
          >
            Play Again
          </button>
          <button
            onClick={onBack}
            className="px-5 py-3 rounded-2xl font-bold text-white/60 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            Exit
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main game ────────────────────────────────────────────────────────────────

interface GameProps {
  questions: TriviaQuestion[];
  level: Level;
  category: TriviaCategory;
  grade: TriviaGrade;
  onDone: (score: number, total: number, coins: number, lostAllLives: boolean) => void;
}

function QuizPlay({ questions, level, category, grade, onDone }: GameProps) {
  const { playerName, playerEmail } = useGameStore();
  const totalTime  = TIMER_BY_LEVEL[level];

  const [idx,       setIdx]       = useState(0);
  const [lives,     setLives]     = useState(MAX_LIVES);
  const [score,     setScore]     = useState(0);
  const [timeLeft,  setTimeLeft]  = useState(totalTime);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [locked,    setLocked]    = useState(false);
  const [shake,     setShake]     = useState(false);

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const advRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const doneRef   = useRef(false);

  const safeDone = useCallback((s: number, t: number, c: number, lost: boolean) => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopTimer();
    if (timerRef.current) clearInterval(timerRef.current);
    if (advRef.current) clearTimeout(advRef.current);
    onDone(s, t, c, lost);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone]);

  const q = questions[idx];

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeLeft(totalTime);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopTimer();
          setLocked(true);
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              advRef.current = setTimeout(() => safeDone(score, questions.length, 0, true), 1000);
            } else {
              advRef.current = setTimeout(() => {
                setIdx(i => {
                  const next = i + 1;
                  if (next >= questions.length) {
                    const coins = Math.round((score / questions.length) * COINS_BY_LEVEL[level]);
                    safeDone(score, questions.length, coins, false);
                    return i; // stay put — game is ending
                  }
                  return next;
                });
                setSelected(null);
                setLocked(false);
              }, 1200);
            }
            return newLives;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [totalTime, score, questions.length, level, onDone, stopTimer]);

  useEffect(() => {
    startTimer();
    return () => {
      stopTimer();
      if (advRef.current) clearTimeout(advRef.current);
    };
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = (optIdx: number) => {
    if (locked) return;
    stopTimer();
    setSelected(optIdx);
    setLocked(true);

    const correct = optIdx === q.correct_index;
    if (correct) {
      playSound('correct');
      const newScore = score + 1;
      setScore(newScore);
      advRef.current = setTimeout(() => {
        const nextIdx = idx + 1;
        if (nextIdx >= questions.length) {
          const coins = Math.round((newScore / questions.length) * COINS_BY_LEVEL[level]);
          safeDone(newScore, questions.length, coins, false);
        } else {
          setIdx(nextIdx);
          setSelected(null);
          setLocked(false);
        }
      }, 1000);
    } else {
      playSound('wrong');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        advRef.current = setTimeout(() => safeDone(score, questions.length, 0, true), 1200);
      } else {
        advRef.current = setTimeout(() => {
          const nextIdx = idx + 1;
          if (nextIdx >= questions.length) {
            const coins = Math.round((score / questions.length) * COINS_BY_LEVEL[level]);
            safeDone(score, questions.length, coins, false);
          } else {
            setIdx(nextIdx);
            setSelected(null);
            setLocked(false);
          }
        }, 1400);
      }
    }
  };

  if (!q) return null;

  const catInfo = TRIVIA_CATEGORIES.find(c => c.id === category)!;
  const bgStyle = BG_BY_CATEGORY[category];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgStyle }}>
      {/* HUD */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <Hearts lives={lives} />
        <div className="flex items-center gap-2 text-white/70 font-bold text-sm">
          <span>{catInfo.emoji}</span>
          <span>{idx + 1} / {questions.length}</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl">
          <span className="text-yellow-300 text-sm font-black">{timeLeft}s</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="px-5 pt-2">
        <TimerBar timeLeft={timeLeft} total={totalTime} accent="#fff" />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full space-y-6"
          >
            {/* Question card */}
            <motion.div
              animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="rounded-3xl p-6 text-center border border-white/15"
              style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(16px)' }}
            >
              <div className="text-white/40 text-xs font-black uppercase tracking-widest mb-3">
                {LEVEL_CONFIG[level].emoji} {LEVEL_CONFIG[level].label}
              </div>
              <p className="text-white font-black text-xl leading-snug">{q.question}</p>
            </motion.div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
              {q.options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrect  = i === q.correct_index;
                const showResult = selected !== null;

                let bg = 'rgba(255,255,255,0.08)';
                let border = 'rgba(255,255,255,0.12)';
                let textColor = '#fff';

                if (showResult) {
                  if (isCorrect) { bg = 'rgba(34,197,94,0.25)'; border = '#22c55e'; }
                  else if (isSelected) { bg = 'rgba(239,68,68,0.25)'; border = '#ef4444'; }
                }

                return (
                  <motion.button
                    key={i}
                    whileHover={!locked ? { scale: 1.02 } : {}}
                    whileTap={!locked ? { scale: 0.98 } : {}}
                    onClick={() => handleAnswer(i)}
                    disabled={locked}
                    className="w-full text-left p-4 rounded-2xl font-bold text-base transition-all border-2 flex items-center gap-3"
                    style={{ background: bg, borderColor: border, color: textColor }}
                  >
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.12)' }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                    {showResult && isCorrect && <span className="ml-auto text-green-400">✓</span>}
                    {showResult && isSelected && !isCorrect && <span className="ml-auto text-red-400">✗</span>}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Top-level TriviaGame ─────────────────────────────────────────────────────

type Phase = 'level' | 'category' | 'loading' | 'playing' | 'done';

export function TriviaGame({ onBack }: { onBack: () => void }) {
  const { playerName, playerEmail, playerGrade } = useGameStore();

  const [phase,    setPhase]    = useState<Phase>('level');
  const [level,    setLevel]    = useState<Level>('medium');
  const [category, setCategory] = useState<TriviaCategory>('history');
  const [questions,setQuestions] = useState<TriviaQuestion[]>([]);
  const [loadErr,  setLoadErr]  = useState('');

  // Final results
  const [finalScore,  setFinalScore]  = useState(0);
  const [finalTotal,  setFinalTotal]  = useState(0);
  const [finalCoins,  setFinalCoins]  = useState(0);
  const [lostLives,   setLostLives]   = useState(false);

  const grade: TriviaGrade = (playerGrade ?? '3') as TriviaGrade;

  const loadQuestions = useCallback(async (cat: TriviaCategory, lvl: Level) => {
    setPhase('loading');
    setLoadErr('');
    try {
      const qs = await getTriviaQuestions(cat, lvl as TriviaLevel, Q_PER_GAME + 5);
      if (qs.length === 0) {
        setLoadErr(`No questions found for this category and level. Ask your teacher to add some!`);
        setPhase('category');
        return;
      }
      setQuestions(qs.slice(0, Q_PER_GAME));
      setPhase('playing');
    } catch (e) {
      setLoadErr(`Could not load questions: ${String(e)}`);
      setPhase('category');
    }
  }, [grade]);

  const handleDone = useCallback(async (score: number, total: number, coins: number, lostAllLives: boolean) => {
    setFinalScore(score);
    setFinalTotal(total);
    setFinalCoins(coins);
    setLostLives(lostAllLives);
    if (coins > 0 && playerName) {
      await addCoins(playerName, coins, 0, true, '', 'trivia', playerEmail ?? '').catch(() => {});
    }
    setPhase('done');
  }, [playerName, playerEmail]);

  if (phase === 'level') {
    return (
      <LevelPicker
        onSelect={lvl => { setLevel(lvl); setPhase('category'); }}
        onBack={onBack}
        bgStyle="linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)"
        descriptions={{
          easy:   '30 seconds per question',
          medium: '20 seconds per question',
          hard:   '15 seconds per question',
        }}
      />
    );
  }

  if (phase === 'category') {
    return (
      <>
        <CategoryPicker
          onSelect={cat => { setCategory(cat); loadQuestions(cat, level); }}
          onBack={() => setPhase('level')}
        />
        {loadErr && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-900/90 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg max-w-sm text-center z-50">
            {loadErr}
          </div>
        )}
      </>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)' }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto" />
          <p className="text-white/60 font-medium">Loading questions…</p>
        </div>
      </div>
    );
  }

  if (phase === 'playing' && questions.length > 0) {
    return (
      <QuizPlay
        questions={questions}
        level={level}
        category={category}
        grade={grade}
        onDone={handleDone}
      />
    );
  }

  if (phase === 'done') {
    return (
      <GameOver
        score={finalScore}
        total={finalTotal}
        coinsEarned={finalCoins}
        lostAllLives={lostLives}
        category={category}
        level={level}
        onPlayAgain={() => {
          setQuestions([]);
          setPhase('level');
        }}
        onBack={onBack}
      />
    );
  }

  return null;
}
