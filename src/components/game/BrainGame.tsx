"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Flame, Volume2, VolumeX } from 'lucide-react';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';
import { OwlCharacter, OwlMood } from './OwlCharacter';
import { playSound } from '@/lib/sounds';
import { addCoins } from '@/lib/wallet';
import { useGameStore } from '@/store/useGameStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  question: string;
  choices: string[];
  correct: string;
  explanation: string;
  wrongConsequence?: string; // narrative shown when student picks wrong
}

interface Problem {
  scenario: string;
  emoji: string;
  tag: string;
  steps: Step[];
  finalMessage: string;
}

type StepState = 'idle' | 'correct' | 'wrong' | 'unlocking';

// ─── Speech synthesis ─────────────────────────────────────────────────────────

const CORRECT_PHRASES = ['Good job!', 'Excellent!', "That's right!", 'Perfect!', 'Keep it up!'];
const WRONG_PHRASES   = ['Try again!', 'Think carefully!', 'Almost there!', 'Check the story!'];

function getBestVoice() {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v =>
    v.name.includes('Samantha') ||
    v.name.includes('Google UK English Female') ||
    (v.lang === 'en-US' && v.name.toLowerCase().includes('female'))
  ) ?? voices.find(v => v.lang === 'en-US') ?? null;
}

function makeUtt(text: string, rate = 0.88, pitch = 1.1): SpeechSynthesisUtterance {
  const utt  = new SpeechSynthesisUtterance(text);
  utt.rate   = rate;
  utt.pitch  = pitch;
  utt.volume = 0.9;
  const v    = getBestVoice();
  if (v) utt.voice = v;
  return utt;
}

// Read feedback phrases (correct / wrong)
function speak(phrases: string[], enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(
    makeUtt(phrases[Math.floor(Math.random() * phrases.length)], 0.92, 1.25)
  );
}

// Read scenario then question (chained — speechSynthesis queues them automatically)
function readScenarioAndQuestion(scenario: string, question: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(makeUtt(scenario));
  window.speechSynthesis.speak(makeUtt(question));
}

// Read just a question
function readQuestion(question: string, enabled: boolean) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(makeUtt(question));
}

// ─── Floating coin ────────────────────────────────────────────────────────────

function FloatingCoin({ amount, onDone }: { amount: number; onDone: () => void }) {
  return (
    <motion.div
      className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 text-2xl font-black text-yellow-300 pointer-events-none drop-shadow-lg"
      initial={{ y: 0, opacity: 1, scale: 0.5 }}
      animate={{ y: -90, opacity: 0, scale: 1.2 }}
      transition={{ duration: 1.1, ease: 'easeOut' }}
      onAnimationComplete={onDone}
    >
      +{amount} 🪙
    </motion.div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  step, stepIdx, totalSteps,
  streak, ttsEnabled, onAnswer, onOwlMood,
}: {
  step: Step;
  stepIdx: number;
  totalSteps: number;
  streak: number;
  ttsEnabled: boolean;
  onAnswer: (isCorrect: boolean) => void;
  onOwlMood: (mood: OwlMood) => void;
}) {
  const [state, setState]   = useState<StepState>('idle');
  const [picked, setPicked] = useState<string | null>(null);
  const [showCoin, setShowCoin] = useState(false);

  const handle = (choice: string) => {
    if (state !== 'idle') return;
    const correct = choice === step.correct;
    setPicked(choice);

    if (correct) {
      setState('correct');
      playSound('correct');
      speak(CORRECT_PHRASES, ttsEnabled);
      onOwlMood('correct');
      setShowCoin(true);

      setTimeout(() => {
        setState('unlocking');
        setTimeout(() => onAnswer(true), 650);
      }, 900);
    } else {
      setState('wrong');
      playSound('wrong');
      speak(WRONG_PHRASES, ttsEnabled);
      onOwlMood('wrong');

      setTimeout(() => {
        setState('idle');
        setPicked(null);
        onOwlMood('thinking');
      }, 1600);
    }
  };

  return (
    <motion.div key={stepIdx}
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -60, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="w-full"
    >
      {/* Progress bar */}
      <div className="flex items-center gap-1.5 mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-500
            ${i < stepIdx ? 'bg-emerald-400' : i === stepIdx ? 'bg-indigo-400' : 'bg-white/20'}`} />
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
          Step {stepIdx + 1} / {totalSteps}
        </p>
        {streak >= 2 && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="flex items-center gap-1 bg-orange-500/30 border border-orange-400/40 rounded-full px-2.5 py-0.5"
          >
            <Flame size={12} className="text-orange-400" />
            <span className="text-orange-300 text-xs font-black">{streak} streak!</span>
          </motion.div>
        )}
      </div>

      {/* Question box */}
      <motion.div
        animate={state === 'wrong' ? { x: [0, -9, 9, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="bg-white/10 border border-white/15 rounded-2xl p-5 mb-4"
      >
        <p className="text-white font-black text-xl leading-snug">{step.question}</p>
      </motion.div>

      {/* Unlock animation */}
      <AnimatePresence>
        {state === 'unlocking' && (
          <motion.div
            className="flex items-center justify-center gap-3 py-4"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span className="text-5xl"
              animate={{ rotate: [0, -20, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5 }}>🔓</motion.span>
            <span className="text-emerald-300 font-black text-lg">Step unlocked!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choices */}
      {state !== 'unlocking' && (
        <div className="grid grid-cols-2 gap-3">
          {step.choices.map(choice => {
            const isCorrect = state === 'correct' && choice === picked;
            const isWrong   = state === 'wrong'   && choice === picked;
            const isReveal  = state === 'correct' && choice === step.correct && choice !== picked;
            return (
              <motion.button key={choice}
                onClick={() => handle(choice)}
                disabled={state !== 'idle'}
                whileHover={state === 'idle' ? { scale: 1.04, y: -2 } : {}}
                whileTap={state === 'idle' ? { scale: 0.95 } : {}}
                className={`py-4 px-3 rounded-2xl font-black text-sm transition-all relative overflow-hidden
                  ${isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                  : isWrong   ? 'bg-red-500/70 text-white scale-95'
                  : isReveal  ? 'bg-emerald-500/50 text-white'
                  : 'bg-white/15 text-white hover:bg-white/25'}`}
              >
                {choice}
                {isCorrect && (
                  <motion.span className="absolute right-2 top-1/2 -translate-y-1/2 text-lg"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}>✓</motion.span>
                )}
                {isWrong && (
                  <motion.span className="absolute right-2 top-1/2 -translate-y-1/2 text-lg"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}>✗</motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Explanation (correct) */}
      <AnimatePresence>
        {state === 'correct' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-emerald-400 text-lg flex-shrink-0">✓</span>
            <p className="text-emerald-200 text-sm font-semibold">{step.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wrong consequence */}
      <AnimatePresence>
        {state === 'wrong' && step.wrongConsequence && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 bg-amber-500/20 border border-amber-400/30 rounded-xl px-4 py-3 flex items-start gap-2">
            <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
            <p className="text-amber-200 text-sm font-semibold">{step.wrongConsequence}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating coin */}
      {showCoin && (
        <FloatingCoin amount={streak >= 5 ? 2 : 1} onDone={() => setShowCoin(false)} />
      )}
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

function numChoices(correct: number, trap?: number): string[] {
  const set = new Set<number>([correct]);
  if (trap && trap !== correct && trap > 0) set.add(trap);
  for (const d of [1, 2, 3, -1, -2, 4, -3, 5, -4]) {
    if (set.size >= 4) break;
    const c = correct + d;
    if (c > 0) set.add(c);
  }
  return shuffle(Array.from(set).slice(0, 4)).map(String);
}

const OPS = ['Addition (+)', 'Subtraction (−)', 'Multiplication (×)', 'Division (÷)'];

const ITEMS = [
  { name: 'apple', plural: 'apples', emoji: '🍎' },
  { name: 'candy', plural: 'candies', emoji: '🍬' },
  { name: 'book', plural: 'books', emoji: '📚' },
  { name: 'balloon', plural: 'balloons', emoji: '🎈' },
  { name: 'cookie', plural: 'cookies', emoji: '🍪' },
  { name: 'pencil', plural: 'pencils', emoji: '✏️' },
  { name: 'sticker', plural: 'stickers', emoji: '⭐' },
  { name: 'chocolate', plural: 'chocolates', emoji: '🍫' },
];

function pickItem() { return ITEMS[rand(0, ITEMS.length - 1)]; }

// ─── Problem templates ────────────────────────────────────────────────────────

function buyProblem(priceR: [number,number], countR: [number,number]): Problem {
  const item = pickItem(), price = rand(...priceR), count = rand(...countR), total = price * count;
  return {
    scenario: `You want to buy ${count} ${item.plural}. Each ${item.name} costs ${price} coins.`,
    emoji: item.emoji, tag: 'Shopping 🛍️',
    steps: [
      { question: `How much does one ${item.name} cost?`, choices: numChoices(price, count), correct: String(price), explanation: `The story says each ${item.name} costs ${price} coins.`, wrongConsequence: `That's the number of ${item.plural} — not the price! Look for the cost in the story.` },
      { question: `How many ${item.plural} do you need?`, choices: numChoices(count, price), correct: String(count), explanation: `You need to buy ${count} ${item.plural}.`, wrongConsequence: `Check the story again — how many are you buying?` },
      { question: 'Which operation should you use?', choices: shuffle(OPS), correct: 'Multiplication (×)', explanation: `You repeat the same price ${count} times — that's multiplication!`, wrongConsequence: `❌ If you used addition, you'd get ${price}+${count}=${price+count} — but that's not the total! You need ${count} groups of ${price} coins.` },
      { question: `Solve:  ${price} × ${count} = ?`, choices: numChoices(total, price + count), correct: String(total), explanation: `${price} × ${count} = ${total} 🎉` },
    ],
    finalMessage: `You need ${total} coins to buy ${count} ${item.plural}! ${item.emoji}`,
  };
}

function shareProblem(friendsR: [number,number]): Problem {
  const item = pickItem(), friends = rand(...friendsR), each = rand(2, 6), total = friends * each;
  return {
    scenario: `There are ${total} ${item.plural} to share equally among ${friends} friends.`,
    emoji: item.emoji, tag: 'Sharing 🤝',
    steps: [
      { question: `How many ${item.plural} are there in total?`, choices: numChoices(total, friends), correct: String(total), explanation: `There are ${total} ${item.plural} in total.`, wrongConsequence: `That's the number of friends — not the total items! Read the story again.` },
      { question: 'How many friends share them?', choices: numChoices(friends, each), correct: String(friends), explanation: `${friends} friends share the ${item.plural}.` },
      { question: 'Which operation should you use?', choices: shuffle(OPS), correct: 'Division (÷)', explanation: `You split into equal groups — that's division!`, wrongConsequence: `❌ You already have all ${total} ${item.plural}. You need to split them — not multiply or add!` },
      { question: `Solve:  ${total} ÷ ${friends} = ?`, choices: numChoices(each, friends), correct: String(each), explanation: `${total} ÷ ${friends} = ${each} each 🎉` },
    ],
    finalMessage: `Each friend gets ${each} ${item.plural}! ${item.emoji}`,
  };
}

function addProblem(aR: [number,number], bR: [number,number]): Problem {
  const item = pickItem(), a = rand(...aR), b = rand(...bR), total = a + b;
  return {
    scenario: `You have ${a} ${item.plural}. Your friend gives you ${b} more.`,
    emoji: item.emoji, tag: 'Combining ➕',
    steps: [
      { question: `How many ${item.plural} do you start with?`, choices: numChoices(a, b), correct: String(a), explanation: `You start with ${a} ${item.plural}.` },
      { question: `How many does your friend give you?`, choices: numChoices(b, a), correct: String(b), explanation: `Your friend gives you ${b} more.` },
      { question: 'Which operation should you use?', choices: shuffle(OPS), correct: 'Addition (+)', explanation: `You're putting groups together — that's addition!`, wrongConsequence: `❌ You're not splitting or repeating. You're joining two groups — that calls for addition!` },
      { question: `Solve:  ${a} + ${b} = ?`, choices: numChoices(total), correct: String(total), explanation: `${a} + ${b} = ${total} 🎉` },
    ],
    finalMessage: `You now have ${total} ${item.plural} in total! ${item.emoji}`,
  };
}

function spendProblem(totalR: [number,number], spendR: [number,number]): Problem {
  const item = pickItem(), total = rand(...totalR), spend = rand(...spendR), left = total - spend;
  return {
    scenario: `You have ${total} coins. You buy a ${item.name} for ${spend} coins.`,
    emoji: '🪙', tag: 'Money 💰',
    steps: [
      { question: 'How many coins do you start with?', choices: numChoices(total, spend), correct: String(total), explanation: `You start with ${total} coins.` },
      { question: `How much does the ${item.name} cost?`, choices: numChoices(spend, left), correct: String(spend), explanation: `The ${item.name} costs ${spend} coins.` },
      { question: 'Which operation should you use?', choices: shuffle(OPS), correct: 'Subtraction (−)', explanation: `You're spending coins — taking away — that's subtraction!`, wrongConsequence: `❌ You're removing coins from your wallet, not adding or splitting. That means subtraction!` },
      { question: `Solve:  ${total} − ${spend} = ?`, choices: numChoices(left, total + spend), correct: String(left), explanation: `${total} − ${spend} = ${left} coins left 🎉` },
    ],
    finalMessage: `You have ${left} coins left after buying the ${item.name}! 🪙`,
  };
}

// LOGIC: "twice as many" type
function logicDouble(): Problem {
  const item = pickItem(), base = rand(2, 7), doubled = base * 2;
  return {
    scenario: `A box has twice as many ${item.plural} as a bag. The bag has ${base} ${item.plural}.`,
    emoji: '🧠', tag: 'Logic 💡',
    steps: [
      { question: `How many ${item.plural} are in the bag?`, choices: numChoices(base, doubled), correct: String(base), explanation: `The bag has ${base} ${item.plural}.` },
      { question: '"Twice as many" means...?', choices: shuffle(['× 2', '+ 2', '− 2', '÷ 2']), correct: '× 2', explanation: '"Twice" always means multiply by 2!', wrongConsequence: '❌ "Twice" means two times as many — that\'s always multiplication by 2!' },
      { question: 'Which operation gives us "twice"?', choices: shuffle(OPS), correct: 'Multiplication (×)', explanation: 'Twice = multiply by 2!', wrongConsequence: '❌ "Twice as many" = multiply by 2. No other operation gives you double!' },
      { question: `Solve:  ${base} × 2 = ?`, choices: numChoices(doubled, base + 2), correct: String(doubled), explanation: `${base} × 2 = ${doubled} 🎉` },
    ],
    finalMessage: `The box has ${doubled} ${item.plural} — twice as many! ${item.emoji}`,
  };
}

// SCIENCE: experiment steps
function scienceProblem(): Problem {
  const tubes = rand(2, 5), drops = rand(3, 7), total = tubes * drops;
  return {
    scenario: `In a science experiment, each of the ${tubes} test tubes needs exactly ${drops} drops of liquid.`,
    emoji: '🧪', tag: 'Science 🔬',
    steps: [
      { question: 'How many test tubes are there?', choices: numChoices(tubes, drops), correct: String(tubes), explanation: `There are ${tubes} test tubes.` },
      { question: 'How many drops does each test tube need?', choices: numChoices(drops, tubes), correct: String(drops), explanation: `Each test tube needs ${drops} drops.` },
      { question: 'To find the total drops needed, you should...', choices: shuffle(OPS), correct: 'Multiplication (×)', explanation: `Same amount in each tube — multiply!`, wrongConsequence: `❌ Each of the ${tubes} tubes needs the SAME amount. Repeating equal groups = multiplication!` },
      { question: `Solve:  ${tubes} × ${drops} = ?`, choices: numChoices(total, tubes + drops), correct: String(total), explanation: `${tubes} × ${drops} = ${total} drops total 🎉` },
    ],
    finalMessage: `You need ${total} drops of liquid for the experiment! 🧪`,
  };
}

// STORY: cause → effect
function storyProblem(): Problem {
  const saved = rand(12, 30), cost = rand(4, saved - 3), left = saved - cost;
  const item  = pickItem();
  return {
    scenario: `You saved ${saved} coins all week. You decide to spend ${cost} coins on ${item.plural} as a treat.`,
    emoji: '📖', tag: 'Story 📖',
    steps: [
      { question: 'How many coins did you save?', choices: numChoices(saved, cost), correct: String(saved), explanation: `You saved ${saved} coins.` },
      { question: 'How much did you spend?', choices: numChoices(cost, saved - cost), correct: String(cost), explanation: `You spent ${cost} coins on ${item.plural}.` },
      { question: 'What happens to your savings? Which operation?', choices: shuffle(OPS), correct: 'Subtraction (−)', explanation: `Spending reduces your savings — subtraction!`, wrongConsequence: `❌ When you spend, money leaves your wallet. That's always subtraction — taking away!` },
      { question: `Solve:  ${saved} − ${cost} = ?`, choices: numChoices(left, saved + cost), correct: String(left), explanation: `${saved} − ${cost} = ${left} coins left 🎉` },
    ],
    finalMessage: `After buying ${item.plural}, you have ${left} coins left. Nice saving! ${item.emoji}`,
  };
}

// HARD: two operations
function bagsProblem(): Problem {
  const item = pickItem(), bags = rand(2, 5), each = rand(3, 7), total = bags * each, eat = rand(2, Math.min(5, total - 1)), left = total - eat;
  return {
    scenario: `You have ${bags} bags. Each bag has ${each} ${item.plural}. You eat ${eat} of them.`,
    emoji: item.emoji, tag: 'Two Steps 🧠',
    steps: [
      { question: 'How many bags do you have?', choices: numChoices(bags, each), correct: String(bags), explanation: `There are ${bags} bags.` },
      { question: `How many ${item.plural} are in each bag?`, choices: numChoices(each, bags), correct: String(each), explanation: `Each bag has ${each} ${item.plural}.` },
      { question: 'Step 1 — How do you find the total?', choices: shuffle(OPS), correct: 'Multiplication (×)', explanation: `${bags} equal groups of ${each} → multiply!`, wrongConsequence: `❌ You have ${bags} bags, each with the SAME number. Equal groups = multiplication!` },
      { question: `Step 1 — Solve:  ${bags} × ${each} = ?`, choices: numChoices(total, bags + each), correct: String(total), explanation: `${bags} × ${each} = ${total} total.` },
      { question: `Step 2 — You eat ${eat}. Which operation?`, choices: shuffle(OPS), correct: 'Subtraction (−)', explanation: `Eating takes away → subtraction!`, wrongConsequence: `❌ Eating reduces the total. Taking away = subtraction!` },
      { question: `Step 2 — Solve:  ${total} − ${eat} = ?`, choices: numChoices(left, total + eat), correct: String(left), explanation: `${total} − ${eat} = ${left} 🎉` },
    ],
    finalMessage: `You have ${left} ${item.plural} left! ${item.emoji}`,
  };
}

function earnProblem(): Problem {
  const days = rand(3, 7), earn = rand(4, 9), bonus = rand(3, 10), base = days * earn, total = base + bonus;
  return {
    scenario: `You earn ${earn} coins every day for ${days} days. Then you get a bonus of ${bonus} coins.`,
    emoji: '💰', tag: 'Two Steps 🧠',
    steps: [
      { question: 'How many coins per day?', choices: numChoices(earn, days), correct: String(earn), explanation: `You earn ${earn} coins each day.` },
      { question: 'How many days do you work?', choices: numChoices(days, earn), correct: String(days), explanation: `You work for ${days} days.` },
      { question: 'Step 1 — Find total earned. Which operation?', choices: shuffle(OPS), correct: 'Multiplication (×)', explanation: `Same amount each day → multiply!`, wrongConsequence: `❌ You earn the SAME amount every day. Repeating equal amounts = multiplication!` },
      { question: `Step 1 — Solve:  ${earn} × ${days} = ?`, choices: numChoices(base, earn + days), correct: String(base), explanation: `${earn} × ${days} = ${base} coins.` },
      { question: `Step 2 — Now add the ${bonus} bonus. Which operation?`, choices: shuffle(OPS), correct: 'Addition (+)', explanation: `A bonus adds more coins → addition!`, wrongConsequence: `❌ A bonus gives you MORE coins. Getting more = addition!` },
      { question: `Step 2 — Solve:  ${base} + ${bonus} = ?`, choices: numChoices(total, base - bonus > 0 ? base - bonus : base + 1), correct: String(total), explanation: `${base} + ${bonus} = ${total} 🎉` },
    ],
    finalMessage: `You earned ${total} coins in total! 💰`,
  };
}

function generateProblem(level: Level): Problem {
  if (level === 'easy') {
    const pick = rand(0, 4);
    if (pick === 0) return buyProblem([2, 8], [2, 5]);
    if (pick === 1) return shareProblem([2, 4]);
    if (pick === 2) return addProblem([3, 8], [3, 8]);
    if (pick === 3) return spendProblem([10, 20], [2, 8]);
    return logicDouble();
  }
  if (level === 'medium') {
    const pick = rand(0, 4);
    if (pick === 0) return buyProblem([4, 12], [4, 9]);
    if (pick === 1) return shareProblem([3, 7]);
    if (pick === 2) return scienceProblem();
    if (pick === 3) return storyProblem();
    return addProblem([8, 20], [8, 20]);
  }
  return rand(0, 1) === 0 ? bagsProblem() : earnProblem();
}

// ─── Main game ────────────────────────────────────────────────────────────────

export function BrainGame({ onBack }: { onBack: () => void }) {
  const { playerName }  = useGameStore();
  const [level, setLevel]       = useState<Level | null>(null);
  const [problem, setProblem]   = useState<Problem | null>(null);
  const [step, setStep]         = useState(0);
  const [done, setDone]         = useState(false);
  const [owlMood, setOwlMood]   = useState<OwlMood>('idle');
  const [streak, setStreak]     = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('brain_tts') !== 'false';
  });
  const pendingCoins = useRef(0);

  // Auto-read: scenario + first question when problem loads
  useEffect(() => {
    if (!problem) return;
    readScenarioAndQuestion(problem.scenario, problem.steps[0].question, ttsEnabled);
  }, [problem]); // eslint-disable-line

  // Auto-read: just the question when advancing to later steps
  useEffect(() => {
    if (!problem || step === 0) return;
    readQuestion(problem.steps[step].question, ttsEnabled);
  }, [step]); // eslint-disable-line

  const toggleTts = useCallback(() => {
    setTtsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('brain_tts', String(next));
      if (!next && typeof window !== 'undefined') window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  const startProblem = useCallback((lvl: Level) => {
    setLevel(lvl);
    setProblem(generateProblem(lvl));
    setStep(0); setDone(false);
    setOwlMood('idle'); setStreak(0); setMistakes(0);
    pendingCoins.current = 0; setCoinsEarned(0);
  }, []);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (!problem || !level) return;

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      const stepCoins = newStreak >= 5 ? 2 : 1;
      pendingCoins.current += stepCoins;

      const nextStep = step + 1;
      if (nextStep >= problem.steps.length) {
        // All done — compute bonus
        const multiplier  = LEVEL_CONFIG[level].multiplier;
        const base        = level === 'easy' ? 6 : level === 'medium' ? 10 : 18;
        const perfectBonus= mistakes === 0 ? base : 0;
        const total       = Math.round((base + pendingCoins.current + perfectBonus) * multiplier);
        setCoinsEarned(total);
        if (playerName) addCoins(playerName, total).catch(() => {});
        setOwlMood('celebrate');
        setDone(true);
      } else {
        setStep(nextStep);
        setOwlMood('thinking');
      }
    } else {
      setMistakes(m => m + 1);
      setStreak(0);
    }
  }, [problem, step, streak, mistakes, level, playerName]);

  if (!level || !problem) {
    return (
      <LevelPicker
        onSelect={startProblem} onBack={onBack}
        bgStyle="linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)"
        descriptions={{
          easy:   'Simple one-step problems with your owl guide',
          medium: 'Bigger numbers + logic & science missions',
          hard:   'Two-step problems — think twice!',
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)' }}>

      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div key={i} className="absolute text-white/10 select-none"
            style={{ top: `${Math.random() * 90}%`, left: `${Math.random() * 90}%`, fontSize: `${12 + Math.random() * 12}px` }}
            animate={{ opacity: [0.05, 0.25, 0.05], scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 3 + Math.random() * 4, delay: Math.random() * 4 }}>
            {['🧠','⚡','💡','✨','🔬'][i % 5]}
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 relative z-10 pt-2">
        <button onClick={() => setLevel(null)}
          className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="text-center">
          <p className="text-white font-black text-lg">🧩 Brain Logic</p>
          <p className="text-white/40 text-xs">{LEVEL_CONFIG[level].emoji} {LEVEL_CONFIG[level].label} · {problem.tag}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-yellow-300 font-black text-sm">🪙 {pendingCoins.current}</p>
            {mistakes === 0 && step > 0 && (
              <p className="text-emerald-400 text-xs font-bold">✨ Perfect!</p>
            )}
          </div>
          <button onClick={toggleTts}
            title={ttsEnabled ? 'Mute reading' : 'Enable reading'}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white">
            {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Owl + Scenario */}
      <div className="w-full max-w-md mb-4 relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <OwlCharacter mood={owlMood} />
        </div>

        <motion.div key={problem.scenario}
          initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          className="rounded-3xl p-5 border border-amber-400/30 shadow-xl"
          style={{ background: 'linear-gradient(135deg, #92400e, #b45309, #d97706)' }}>
          <p className="text-amber-200 text-xs font-bold uppercase tracking-widest mb-1">🧩 Scenario</p>
          <p className="text-white font-bold text-base leading-snug">{problem.scenario}</p>
        </motion.div>
      </div>

      {/* Steps */}
      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {!done && (
            <StepCard
              key={step}
              step={problem.steps[step]}
              stepIdx={step}
              totalSteps={problem.steps.length}
              streak={streak}
              ttsEnabled={ttsEnabled}
              onAnswer={handleAnswer}
              onOwlMood={setOwlMood}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Completion overlay */}
      <AnimatePresence>
        {done && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div key={i} className="absolute w-2.5 h-2.5 rounded-sm pointer-events-none"
                style={{ background: ['#f87171','#fbbf24','#34d399','#60a5fa','#a78bfa','#fb923c'][i % 6], left: `${10 + Math.random() * 80}%`, top: 0 }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{ y: '105vh', rotate: 720 + Math.random() * 360, opacity: [1, 1, 0] }}
                transition={{ duration: 1.2 + Math.random() * 0.8, delay: Math.random() * 0.5, ease: 'easeIn' }} />
            ))}

            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-2xl"
              initial={{ scale: 0.7, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.1 }}>
              <div className="flex justify-center mb-1">
                <OwlCharacter mood="celebrate" />
              </div>
              <h2 className="text-3xl font-black text-white mb-1">Problem Solved! 🎉</h2>
              {mistakes === 0 && (
                <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}
                  className="text-yellow-300 font-black text-sm mb-2">⭐ Perfect — No mistakes!</motion.p>
              )}
              <p className="text-white/60 text-sm mb-4">{problem.finalMessage}</p>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.4 }}
                className="inline-block bg-yellow-400/20 border border-yellow-400/40 rounded-2xl px-5 py-2 mb-5">
                <span className="text-yellow-300 font-black text-xl">+{coinsEarned} 🪙</span>
              </motion.div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => startProblem(level)}
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
