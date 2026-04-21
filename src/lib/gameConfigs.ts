import type { Level } from '@/components/game/LevelPicker';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeChoices(answer: number, min: number, max: number, count = 4): number[] {
  const set = new Set([answer]);
  let tries = 0;
  while (set.size < count && tries < 200) {
    const delta = randInt(1, Math.max(1, Math.floor((max - min) / 3) + 2));
    const w = answer + (Math.random() > 0.5 ? delta : -delta);
    if (w > 0 && !set.has(w)) set.add(w);
    tries++;
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

// ─── Question type ────────────────────────────────────────────────────────────

export interface Question {
  displayText: string;
  answer: number;
  choices: number[];
  formatChoice: (n: number) => string;
  hint?: string;
}

// ─── Config type ──────────────────────────────────────────────────────────────

export interface GameConfig {
  id: string;
  title: string;
  description: string;
  emoji: string;
  bgStyle: string;
  cardStyle: string;
  accentStyle: string;
  duration: number;
  generateQuestion: (level?: Level) => Question;
}

// ─── Grade 2 — Addition & Subtraction ────────────────────────────────────────

export const additionGame: GameConfig = {
  id: 'addition',
  title: 'Number Sprint',
  description: 'Add and subtract your way to the top!',
  emoji: '➕',
  bgStyle:     'linear-gradient(135deg, #1d4ed8, #0891b2, #0f766e)',
  cardStyle:   'linear-gradient(135deg, #3b82f6, #06b6d4)',
  accentStyle: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
  duration: 60,
  generateQuestion: (level = 'medium') => {
    // Easy: 1-10 addition only | Medium: 1-25 add+sub | Hard: 1-50 add+sub
    const ranges = { easy: 10, medium: 25, hard: 50 };
    const max = ranges[level];
    const addOnly = level === 'easy';
    const op = addOnly || Math.random() > 0.45 ? '+' : '−';

    if (op === '+') {
      const a = randInt(1, max);
      const b = randInt(1, max);
      return { displayText: `${a} + ${b}`, answer: a + b, choices: makeChoices(a + b, 1, max * 2), formatChoice: n => String(n) };
    } else {
      const b = randInt(1, max - 1);
      const a = randInt(b + 1, max);
      return { displayText: `${a} − ${b}`, answer: a - b, choices: makeChoices(a - b, 0, max), formatChoice: n => String(n) };
    }
  },
};

// ─── Grade 3 — Multiplication ─────────────────────────────────────────────────

export const multiplicationGame: GameConfig = {
  id: 'multiplication',
  title: 'Multiplication Blitz',
  description: 'Master your times tables with speed!',
  emoji: '✖️',
  bgStyle:     'linear-gradient(135deg, #6d28d9, #9333ea, #a21caf)',
  cardStyle:   'linear-gradient(135deg, #7c3aed, #9333ea)',
  accentStyle: 'linear-gradient(135deg, #7c3aed, #9333ea)',
  duration: 60,
  generateQuestion: (level = 'medium') => {
    // Easy: tables 2-5 | Medium: tables 2-9 | Hard: tables 2-12
    const maxA = { easy: 5, medium: 9, hard: 12 }[level];
    const maxB = { easy: 10, medium: 10, hard: 12 }[level];
    const a = randInt(2, maxA);
    const b = randInt(1, maxB);
    return { displayText: `${a} × ${b}`, answer: a * b, choices: makeChoices(a * b, 2, maxA * maxB), formatChoice: n => String(n) };
  },
};

// ─── Grade 4 — Division ───────────────────────────────────────────────────────

export const divisionGame: GameConfig = {
  id: 'division',
  title: 'Division Dash',
  description: 'Split numbers and race to the finish!',
  emoji: '➗',
  bgStyle:     'linear-gradient(135deg, #c2410c, #d97706, #ca8a04)',
  cardStyle:   'linear-gradient(135deg, #f97316, #f59e0b)',
  accentStyle: 'linear-gradient(135deg, #f97316, #f59e0b)',
  duration: 60,
  generateQuestion: (level = 'medium') => {
    // Easy: divisors 2-5 | Medium: divisors 2-9 | Hard: divisors 2-12
    const maxDiv = { easy: 5, medium: 9, hard: 12 }[level];
    const maxQ   = { easy: 10, medium: 10, hard: 12 }[level];
    const divisor  = randInt(2, maxDiv);
    const quotient = randInt(1, maxQ);
    return { displayText: `${divisor * quotient} ÷ ${divisor}`, answer: quotient, choices: makeChoices(quotient, 1, maxQ), formatChoice: n => String(n) };
  },
};

// ─── Grade 5 — Fractions ──────────────────────────────────────────────────────

const DENOMS: Record<Level, number[]> = {
  easy:   [2, 3, 4],
  medium: [2, 3, 4, 5, 6],
  hard:   [2, 3, 4, 5, 6, 8, 10],
};

export const fractionGame: GameConfig = {
  id: 'fractions',
  title: 'Fraction Frenzy',
  description: 'Add and subtract fractions like a pro!',
  emoji: '🍕',
  bgStyle:     'linear-gradient(135deg, #9d174d, #e11d48, #dc2626)',
  cardStyle:   'linear-gradient(135deg, #ec4899, #f43f5e)',
  accentStyle: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  duration: 60,
  generateQuestion: (level = 'medium') => {
    const pool = DENOMS[level];
    const denom = pool[randInt(0, pool.length - 1)];
    const addOnly = level === 'easy';
    const op = addOnly || Math.random() > 0.45 ? '+' : '−';
    let num1: number, num2: number, answer: number;

    if (op === '+') {
      num1 = randInt(1, denom - 1);
      num2 = randInt(1, denom - num1);
      answer = num1 + num2;
    } else {
      num1 = randInt(2, denom);
      num2 = randInt(1, num1 - 1);
      answer = num1 - num2;
    }

    return {
      displayText: `${num1}/${denom}  ${op}  ${num2}/${denom}`,
      answer,
      choices: makeChoices(answer, 1, denom, 4),
      formatChoice: n => `${n}/${denom}`,
      hint: `= ?/${denom}`,
    };
  },
};

// ─── All games ────────────────────────────────────────────────────────────────

export const ALL_GAMES: GameConfig[] = [
  additionGame,
  multiplicationGame,
  divisionGame,
  fractionGame,
];
