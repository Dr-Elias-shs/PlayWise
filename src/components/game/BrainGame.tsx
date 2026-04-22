"use client";

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';
import { playSound } from '@/lib/sounds';
import { addCoins } from '@/lib/wallet';
import { useGameStore } from '@/store/useGameStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  question: string;
  choices: string[];
  correct: string;       // the correct choice value
  explanation: string;
}

interface Problem {
  scenario: string;
  emoji: string;
  tag: string;           // e.g. "Shopping", "Sharing"
  steps: Step[];
  finalMessage: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// 4 distinct positive integer choices including `correct`, with optional trap
function numChoices(correct: number, trap?: number): string[] {
  const set = new Set<number>([correct]);
  if (trap && trap !== correct && trap > 0) set.add(trap);
  const deltas = [1, 2, 3, -1, -2, 4, -3, 5, -4, 6];
  for (const d of deltas) {
    if (set.size >= 4) break;
    const c = correct + d;
    if (c > 0) set.add(c);
  }
  return shuffle(Array.from(set).slice(0, 4)).map(String);
}

const OPS = ['Addition (+)', 'Subtraction (−)', 'Multiplication (×)', 'Division (÷)'];

const ITEMS = [
  { name: 'apple',     plural: 'apples',     emoji: '🍎' },
  { name: 'candy',     plural: 'candies',    emoji: '🍬' },
  { name: 'book',      plural: 'books',      emoji: '📚' },
  { name: 'balloon',   plural: 'balloons',   emoji: '🎈' },
  { name: 'cookie',    plural: 'cookies',    emoji: '🍪' },
  { name: 'pencil',    plural: 'pencils',    emoji: '✏️' },
  { name: 'sticker',   plural: 'stickers',   emoji: '⭐' },
  { name: 'chocolate', plural: 'chocolates', emoji: '🍫' },
];

function pickItem() { return ITEMS[rand(0, ITEMS.length - 1)]; }

// ─── Problem templates ────────────────────────────────────────────────────────

// BUY N items at PRICE each  →  ×
function buyProblem(priceR: [number,number], countR: [number,number]): Problem {
  const item  = pickItem();
  const price = rand(...priceR);
  const count = rand(...countR);
  const total = price * count;
  return {
    scenario: `You want to buy ${count} ${item.plural}. Each ${item.name} costs ${price} coins.`,
    emoji: item.emoji,
    tag: 'Shopping 🛍️',
    steps: [
      {
        question: `How much does one ${item.name} cost?`,
        choices: numChoices(price, count),
        correct: String(price),
        explanation: `The story says each ${item.name} costs ${price} coins.`,
      },
      {
        question: `How many ${item.plural} do you need?`,
        choices: numChoices(count, price),
        correct: String(count),
        explanation: `You need to buy ${count} ${item.plural}.`,
      },
      {
        question: 'Which operation should you use?',
        choices: shuffle(OPS),
        correct: 'Multiplication (×)',
        explanation: `You repeat the same price ${count} times — that's multiplication!`,
      },
      {
        question: `Solve:  ${price} × ${count} = ?`,
        choices: numChoices(total, price + count),
        correct: String(total),
        explanation: `${price} × ${count} = ${total} 🎉`,
      },
    ],
    finalMessage: `You need ${total} coins to buy ${count} ${item.plural}! ${item.emoji}`,
  };
}

// SHARE total among friends  →  ÷
function shareProblem(totalR: [number,number], friendsR: [number,number]): Problem {
  const item    = pickItem();
  const friends = rand(...friendsR);
  const each    = rand(...[2, 6] as [number,number]);
  const total   = friends * each;          // guarantees clean division
  return {
    scenario: `There are ${total} ${item.plural} to share equally among ${friends} friends.`,
    emoji: item.emoji,
    tag: 'Sharing 🤝',
    steps: [
      {
        question: `How many ${item.plural} are there in total?`,
        choices: numChoices(total, friends),
        correct: String(total),
        explanation: `There are ${total} ${item.plural} in total.`,
      },
      {
        question: 'How many friends share them?',
        choices: numChoices(friends, each),
        correct: String(friends),
        explanation: `${friends} friends share the ${item.plural}.`,
      },
      {
        question: 'Which operation should you use?',
        choices: shuffle(OPS),
        correct: 'Division (÷)',
        explanation: `You split into equal groups — that's division!`,
      },
      {
        question: `Solve:  ${total} ÷ ${friends} = ?`,
        choices: numChoices(each, friends),
        correct: String(each),
        explanation: `${total} ÷ ${friends} = ${each} 🎉`,
      },
    ],
    finalMessage: `Each friend gets ${each} ${item.plural}! ${item.emoji}`,
  };
}

// COMBINE two groups  →  +
function addProblem(aR: [number,number], bR: [number,number]): Problem {
  const item = pickItem();
  const a    = rand(...aR);
  const b    = rand(...bR);
  const total = a + b;
  return {
    scenario: `You have ${a} ${item.plural}. Your friend gives you ${b} more ${item.plural}.`,
    emoji: item.emoji,
    tag: 'Combining ➕',
    steps: [
      {
        question: `How many ${item.plural} do you start with?`,
        choices: numChoices(a, b),
        correct: String(a),
        explanation: `You start with ${a} ${item.plural}.`,
      },
      {
        question: `How many ${item.plural} does your friend give you?`,
        choices: numChoices(b, a),
        correct: String(b),
        explanation: `Your friend gives you ${b} more.`,
      },
      {
        question: 'Which operation should you use?',
        choices: shuffle(OPS),
        correct: 'Addition (+)',
        explanation: `You're putting groups together — that's addition!`,
      },
      {
        question: `Solve:  ${a} + ${b} = ?`,
        choices: numChoices(total, a - b > 0 ? a - b : a + 1),
        correct: String(total),
        explanation: `${a} + ${b} = ${total} 🎉`,
      },
    ],
    finalMessage: `You have ${total} ${item.plural} in total! ${item.emoji}`,
  };
}

// SPEND money  →  −
function spendProblem(totalR: [number,number], spendR: [number,number]): Problem {
  const item  = pickItem();
  const total = rand(...totalR);
  const spend = rand(...spendR);
  const left  = total - spend;
  return {
    scenario: `You have ${total} coins. You buy a ${item.name} for ${spend} coins.`,
    emoji: '🪙',
    tag: 'Money 💰',
    steps: [
      {
        question: 'How many coins do you start with?',
        choices: numChoices(total, spend),
        correct: String(total),
        explanation: `You start with ${total} coins.`,
      },
      {
        question: `How much does the ${item.name} cost?`,
        choices: numChoices(spend, total - spend),
        correct: String(spend),
        explanation: `The ${item.name} costs ${spend} coins.`,
      },
      {
        question: 'Which operation should you use?',
        choices: shuffle(OPS),
        correct: 'Subtraction (−)',
        explanation: `You're taking away coins — that's subtraction!`,
      },
      {
        question: `Solve:  ${total} − ${spend} = ?`,
        choices: numChoices(left, total + spend),
        correct: String(left),
        explanation: `${total} − ${spend} = ${left} 🎉`,
      },
    ],
    finalMessage: `You have ${left} coins left after buying the ${item.name}! 🪙`,
  };
}

// HARD: bags of items, then eat some  →  ×  then  −
function bagsProblem(): Problem {
  const item  = pickItem();
  const bags  = rand(2, 5);
  const each  = rand(3, 7);
  const total = bags * each;
  const eat   = rand(2, Math.min(5, total - 1));
  const left  = total - eat;
  return {
    scenario: `You have ${bags} bags. Each bag has ${each} ${item.plural}. You eat ${eat} of them.`,
    emoji: item.emoji,
    tag: 'Two Steps 🧠',
    steps: [
      {
        question: 'How many bags do you have?',
        choices: numChoices(bags, each),
        correct: String(bags),
        explanation: `There are ${bags} bags.`,
      },
      {
        question: `How many ${item.plural} are in each bag?`,
        choices: numChoices(each, bags),
        correct: String(each),
        explanation: `Each bag has ${each} ${item.plural}.`,
      },
      {
        question: 'Step 1 — Which operation finds the total?',
        choices: shuffle(OPS),
        correct: 'Multiplication (×)',
        explanation: `${bags} bags with ${each} each → multiply!`,
      },
      {
        question: `Step 1 — Solve:  ${bags} × ${each} = ?`,
        choices: numChoices(total, bags + each),
        correct: String(total),
        explanation: `${bags} × ${each} = ${total} ${item.plural} total.`,
      },
      {
        question: `Step 2 — You eat ${eat}. Which operation now?`,
        choices: shuffle(OPS),
        correct: 'Subtraction (−)',
        explanation: `You're taking away — that's subtraction!`,
      },
      {
        question: `Step 2 — Solve:  ${total} − ${eat} = ?`,
        choices: numChoices(left, total + eat),
        correct: String(left),
        explanation: `${total} − ${eat} = ${left} 🎉`,
      },
    ],
    finalMessage: `You have ${left} ${item.plural} left! ${item.emoji}`,
  };
}

// HARD: earn per day + bonus  →  ×  then  +
function earnProblem(): Problem {
  const days  = rand(3, 7);
  const earn  = rand(4, 9);
  const bonus = rand(3, 10);
  const base  = days * earn;
  const total = base + bonus;
  return {
    scenario: `You earn ${earn} coins every day for ${days} days. Then you get a bonus of ${bonus} coins.`,
    emoji: '💰',
    tag: 'Two Steps 🧠',
    steps: [
      {
        question: 'How many coins do you earn per day?',
        choices: numChoices(earn, days),
        correct: String(earn),
        explanation: `You earn ${earn} coins each day.`,
      },
      {
        question: 'How many days do you work?',
        choices: numChoices(days, earn),
        correct: String(days),
        explanation: `You work for ${days} days.`,
      },
      {
        question: 'Step 1 — Which operation for total earned?',
        choices: shuffle(OPS),
        correct: 'Multiplication (×)',
        explanation: `Same amount each day → multiply!`,
      },
      {
        question: `Step 1 — Solve:  ${earn} × ${days} = ?`,
        choices: numChoices(base, earn + days),
        correct: String(base),
        explanation: `${earn} × ${days} = ${base} coins.`,
      },
      {
        question: `Step 2 — Add the ${bonus} coin bonus. Which operation?`,
        choices: shuffle(OPS),
        correct: 'Addition (+)',
        explanation: `Adding the bonus → addition!`,
      },
      {
        question: `Step 2 — Solve:  ${base} + ${bonus} = ?`,
        choices: numChoices(total, base - bonus > 0 ? base - bonus : base + 1),
        correct: String(total),
        explanation: `${base} + ${bonus} = ${total} 🎉`,
      },
    ],
    finalMessage: `You earned ${total} coins in total! 💰`,
  };
}

// ─── Problem picker ───────────────────────────────────────────────────────────

function generateProblem(level: Level): Problem {
  if (level === 'easy') {
    const pick = rand(0, 3);
    if (pick === 0) return buyProblem([2, 8], [2, 5]);
    if (pick === 1) return shareProblem([6, 20], [2, 4]);
    if (pick === 2) return addProblem([3, 8], [3, 8]);
    return spendProblem([10, 20], [2, 8]);
  }
  if (level === 'medium') {
    const pick = rand(0, 3);
    if (pick === 0) return buyProblem([4, 12], [4, 9]);
    if (pick === 1) return shareProblem([12, 48], [3, 6]);
    if (pick === 2) return addProblem([8, 20], [8, 20]);
    return spendProblem([20, 60], [8, 20]);
  }
  // hard
  return rand(0, 1) === 0 ? bagsProblem() : earnProblem();
}

// ─── Step card ────────────────────────────────────────────────────────────────

type StepState = 'idle' | 'correct' | 'wrong';

function StepCard({
  step, stepIdx, totalSteps, onAnswer,
}: {
  step: Step;
  stepIdx: number;
  totalSteps: number;
  onAnswer: (correct: boolean) => void;
}) {
  const [state, setState] = useState<StepState>('idle');
  const [picked, setPicked] = useState<string | null>(null);

  const handle = (choice: string) => {
    if (state !== 'idle') return;
    const correct = choice === step.correct;
    setPicked(choice);
    setState(correct ? 'correct' : 'wrong');
    playSound(correct ? 'correct' : 'wrong');

    if (correct) {
      setTimeout(() => onAnswer(true), 900);
    } else {
      setTimeout(() => { setState('idle'); setPicked(null); }, 800);
    }
  };

  return (
    <motion.div
      key={stepIdx}
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="w-full"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-indigo-400' : 'bg-white/20'}`}
          />
        ))}
      </div>
      <p className="text-white/50 text-xs font-semibold mb-3 uppercase tracking-widest">
        Step {stepIdx + 1} of {totalSteps}
      </p>

      {/* Question */}
      <motion.div
        animate={state === 'wrong' ? { x: [0, -8, 8, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="bg-white/10 border border-white/15 rounded-2xl p-5 mb-5"
      >
        <p className="text-white font-black text-xl leading-snug">{step.question}</p>
      </motion.div>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-3">
        {step.choices.map((choice) => {
          const isCorrect = state === 'correct' && choice === picked;
          const isWrong   = state === 'wrong'   && choice === picked;
          return (
            <motion.button key={choice}
              onClick={() => handle(choice)}
              disabled={state !== 'idle'}
              whileHover={state === 'idle' ? { scale: 1.03, y: -2 } : {}}
              whileTap={state === 'idle' ? { scale: 0.96 } : {}}
              className={`py-4 px-3 rounded-2xl font-black text-base transition-all relative overflow-hidden
                ${isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                : isWrong   ? 'bg-red-500/60 text-white'
                : state === 'correct' && choice === step.correct ? 'bg-emerald-500 text-white'
                : 'bg-white/15 text-white hover:bg-white/25'}`}
            >
              {choice}
              {isCorrect && (
                <motion.span className="absolute right-2 top-1/2 -translate-y-1/2"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}>✓</motion.span>
              )}
              {isWrong && (
                <motion.span className="absolute right-2 top-1/2 -translate-y-1/2"
                  initial={{ scale: 0 }} animate={{ scale: 1 }}>✗</motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {state === 'correct' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-3 flex items-start gap-2"
          >
            <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-200 text-sm font-semibold">{step.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main game ────────────────────────────────────────────────────────────────

export function BrainGame({ onBack }: { onBack: () => void }) {
  const { playerName } = useGameStore();
  const [level, setLevel]     = useState<Level | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [step, setStep]       = useState(0);
  const [done, setDone]       = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const startProblem = useCallback((lvl: Level) => {
    setLevel(lvl);
    setProblem(generateProblem(lvl));
    setStep(0);
    setDone(false);
    setCoinsEarned(0);
  }, []);

  const nextProblem = useCallback(() => {
    if (!level) return;
    setProblem(generateProblem(level));
    setStep(0);
    setDone(false);
    setCoinsEarned(0);
  }, [level]);

  const handleAnswer = useCallback(() => {
    if (!problem || !level) return;
    const nextStep = step + 1;
    if (nextStep >= problem.steps.length) {
      // All steps done
      const multiplier = LEVEL_CONFIG[level].multiplier;
      const base = level === 'easy' ? 6 : level === 'medium' ? 10 : 18;
      const coins = Math.round(base * multiplier);
      setCoinsEarned(coins);
      if (playerName) addCoins(playerName, coins).catch(() => {});
      setDone(true);
      playSound('win' as any);
    } else {
      setStep(nextStep);
    }
  }, [problem, step, level, playerName]);

  // ── Level picker ──
  if (!level || !problem) {
    return (
      <LevelPicker
        onSelect={startProblem}
        onBack={onBack}
        bgStyle="linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)"
        descriptions={{
          easy:   'Simple one-step word problems',
          medium: 'Bigger numbers, same ideas',
          hard:   'Two-step problems — think carefully!',
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)' }}>

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.div key={i} className="absolute text-white/10 select-none"
            style={{ top: `${Math.random() * 92}%`, left: `${Math.random() * 92}%`, fontSize: `${14 + Math.random() * 12}px` }}
            animate={{ opacity: [0.05, 0.3, 0.05], scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 3 + Math.random() * 4, delay: Math.random() * 4 }}>
            {['🧠','⚡','💡','✨'][i % 4]}
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 relative z-10 pt-2">
        <button onClick={() => setLevel(null)}
          className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="text-center">
          <p className="text-white font-black text-lg">🧩 Brain Logic</p>
          <p className="text-white/40 text-xs">{LEVEL_CONFIG[level].emoji} {LEVEL_CONFIG[level].label} · {problem.tag}</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Scenario card */}
      <motion.div
        key={problem.scenario}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md mb-5 relative z-10"
      >
        <div className="rounded-3xl p-5 border border-amber-400/30 shadow-xl shadow-amber-900/20"
          style={{ background: 'linear-gradient(135deg, #92400e, #b45309, #d97706)' }}>
          <div className="flex items-start gap-3">
            <span className="text-4xl">{problem.emoji}</span>
            <div>
              <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">🧩 Scenario</p>
              <p className="text-white font-bold text-base leading-snug">{problem.scenario}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Steps area */}
      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {!done && (
            <StepCard
              key={step}
              step={problem.steps[step]}
              stepIdx={step}
              totalSteps={problem.steps.length}
              onAnswer={handleAnswer}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Completion overlay ── */}
      <AnimatePresence>
        {done && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Confetti */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div key={i} className="absolute w-2.5 h-2.5 rounded-sm pointer-events-none"
                style={{ background: ['#f87171','#fbbf24','#34d399','#60a5fa','#a78bfa','#fb923c'][i % 6], left: `${10 + Math.random() * 80}%`, top: 0 }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{ y: '105vh', rotate: 720 + Math.random() * 360, opacity: [1, 1, 0] }}
                transition={{ duration: 1.2 + Math.random() * 0.8, delay: Math.random() * 0.5, ease: 'easeIn' }} />
            ))}

            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-2xl"
              initial={{ scale: 0.7, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.1 }}
            >
              <motion.div className="text-6xl mb-3"
                animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.7, delay: 0.2 }}>🧠</motion.div>
              <h2 className="text-3xl font-black text-white mb-2">Problem Solved!</h2>
              <p className="text-white/70 text-sm mb-4">{problem.finalMessage}</p>
              {coinsEarned > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.4 }}
                  className="inline-block bg-yellow-400/20 border border-yellow-400/40 rounded-2xl px-5 py-2 mb-5">
                  <span className="text-yellow-300 font-black text-lg">+{coinsEarned} 🪙</span>
                </motion.div>
              )}
              <div className="flex gap-3 justify-center">
                <button onClick={nextProblem}
                  className="flex items-center gap-2 px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-colors text-sm">
                  <RotateCcw size={15} /> Next Problem
                </button>
                <button onClick={onBack}
                  className="px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl transition-colors text-sm">
                  Hub
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
