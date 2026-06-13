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

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }
function lcm(a: number, b: number): number { return (a * b) / gcd(a, b); }
function simplify(num: number, den: number): [number, number] {
  const g = gcd(num, den);
  return [num / g, den / g];
}

// ─── Question type ────────────────────────────────────────────────────────────

export interface Question {
  displayText: string;
  answer: number;           // numeric answer (for same-denom fractions: the numerator)
  answerDisplay?: string;   // formatted answer for display (e.g. "5/6")
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
  durationByLevel?: Partial<Record<Level, number>>;
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
    const max    = { easy: 20, medium: 50, hard: 100 }[level];
    const addOnly = level === 'easy';
    const op = addOnly || Math.random() > 0.45 ? '+' : '−';

    if (op === '+') {
      const a = randInt(1, max), b = randInt(1, max);
      return { displayText: `${a} + ${b}`, answer: a + b, choices: makeChoices(a + b, 1, max * 2), formatChoice: n => String(n) };
    } else {
      const b = randInt(1, max - 1), a = randInt(b + 1, max);
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
  // Note: MultiplayerGame.tsx handles question generation for this game (table picker + deck)
  generateQuestion: (level = 'medium') => {
    const maxA = { easy: 5, medium: 9, hard: 12 }[level];
    const maxB = { easy: 10, medium: 15, hard: 20 }[level];
    const a = randInt(2, maxA), b = randInt(1, maxB);
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
    const maxDiv = { easy: 5, medium: 10, hard: 15 }[level];
    const maxQ   = { easy: 10, medium: 15, hard: 20 }[level];
    const divisor = randInt(2, maxDiv), quotient = randInt(1, maxQ);
    return {
      displayText: `${divisor * quotient} ÷ ${divisor}`,
      answer: quotient,
      choices: makeChoices(quotient, 1, maxQ),
      formatChoice: n => String(n),
    };
  },
};

// ─── Grade 5 — Fractions ──────────────────────────────────────────────────────

// Easy: same denominator, addition only
const EASY_DENOMS = [2, 3, 4, 5, 6];

// Medium: different denominators — friendly pairs, LCD ≤ 12
const MEDIUM_DIFF_PAIRS: [number, number][] = [
  [2, 3], [2, 4], [2, 6], [3, 4], [3, 6], [4, 6],
];

// Hard: different denominators — harder pairs, LCD up to 40
const HARD_DIFF_PAIRS: [number, number][] = [
  [3, 4], [4, 5], [5, 6], [3, 7], [4, 9],
  [5, 8], [6, 8], [5, 10], [3, 8], [4, 7], [6, 10],
];

function diffDenomQuestion(pairs: [number, number][]): Question {
  const [da, db] = pairs[randInt(0, pairs.length - 1)];
  const lcd = lcm(da, db);
  const fa = lcd / da;
  const fb = lcd / db;
  const useAdd = Math.random() > 0.45;

  let dN1: number, dD1: number, dN2: number, dD2: number, ansNum: number, op: string;

  if (useAdd) {
    op = '+';
    dD1 = da; dD2 = db;
    dN1 = randInt(1, da - 1);
    const n1 = dN1 * fa;
    const maxN2 = Math.min(db - 1, Math.floor((lcd - n1 - 1) / fb));
    dN2 = maxN2 >= 1 ? randInt(1, maxN2) : 1;
    ansNum = n1 + dN2 * fb;
  } else {
    op = '−';
    const na = randInt(1, da - 1);
    const nb = randInt(1, db - 1);
    const na_s = na * fa;
    const nb_s = nb * fb;
    if (na_s > nb_s) {
      dD1 = da; dN1 = na; dD2 = db; dN2 = nb;
      ansNum = na_s - nb_s;
    } else if (nb_s > na_s) {
      dD1 = db; dN1 = nb; dD2 = da; dN2 = na;
      ansNum = nb_s - na_s;
    } else {
      // Equal fractions — fall back to addition
      op = '+';
      dD1 = da; dN1 = na; dD2 = db; dN2 = nb;
      ansNum = na_s + nb_s;
    }
  }

  const [sNum, sDen] = simplify(ansNum, lcd);
  const answerDisplay = `${sNum}/${sDen}`;

  const wrongSet = new Set<string>();
  for (let off = 1; wrongSet.size < 3 && off <= 12; off++) {
    for (const delta of [off, -off]) {
      const w = sNum + delta;
      if (w > 0 && w !== sNum && wrongSet.size < 3) {
        const [ws, wd] = simplify(w, sDen);
        const s = `${ws}/${wd}`;
        if (s !== answerDisplay) wrongSet.add(s);
      }
    }
  }

  const allChoices = [answerDisplay, ...Array.from(wrongSet).slice(0, 3)];
  const shuffled = allChoices.sort(() => Math.random() - 0.5);

  return {
    displayText: `${dN1}/${dD1}  ${op}  ${dN2}/${dD2}`,
    answer: shuffled.indexOf(answerDisplay),
    choices: [0, 1, 2, 3],
    formatChoice: n => shuffled[n] ?? '?',
    hint: '= ?',
  };
}

export const fractionGame: GameConfig = {
  id: 'fractions',
  title: 'Fraction Frenzy',
  description: 'Add and subtract fractions like a pro!',
  emoji: '🍕',
  bgStyle:     'linear-gradient(135deg, #9d174d, #e11d48, #dc2626)',
  cardStyle:   'linear-gradient(135deg, #ec4899, #f43f5e)',
  accentStyle: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  duration: 60,
  durationByLevel: { easy: 60, medium: 90, hard: 120 },
  generateQuestion: (level = 'medium') => {
    if (level === 'hard')   return diffDenomQuestion(HARD_DIFF_PAIRS);
    if (level === 'medium') return diffDenomQuestion(MEDIUM_DIFF_PAIRS);

    // Easy: same denominator, addition only
    const denom = EASY_DENOMS[randInt(0, EASY_DENOMS.length - 1)];
    const num1 = randInt(1, denom - 1);
    const num2 = randInt(1, denom - num1);
    const answer = num1 + num2;
    return {
      displayText: `${num1}/${denom}  +  ${num2}/${denom}`,
      answer,
      choices: makeChoices(answer, 1, denom, 4),
      formatChoice: n => `${n}/${denom}`,
      hint: `= ?/${denom}`,
    };
  },
};

// ─── Brain Logic game ─────────────────────────────────────────────────────────

export const brainGame: GameConfig = {
  id: 'brain',
  title: 'Brain Logic',
  description: 'Solve word problems step by step!',
  emoji: '🧩',
  bgStyle:     'linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)',
  cardStyle:   'linear-gradient(135deg, #4f46e5, #6d28d9)',
  accentStyle: 'linear-gradient(135deg, #4f46e5, #6d28d9)',
  duration: 0,
  generateQuestion: () => ({ displayText: '', answer: 0, choices: [], formatChoice: n => String(n) }),
};

// ─── Grade 5 — Hangman ────────────────────────────────────────────────────────

export const hangmanGame: GameConfig = {
  id: 'hangman',
  title: 'Hangman',
  description: 'Guess the word before the figure is complete!',
  emoji: '🪢',
  bgStyle:     'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
  cardStyle:   'linear-gradient(135deg, #4f46e5, #7c3aed)',
  accentStyle: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
  duration: 0,
  generateQuestion: () => ({ displayText: '', answer: 0, choices: [], formatChoice: n => String(n) }),
};

// ─── Memory Game (standalone component — config only for hub card) ────────────

export const memoryGame: GameConfig = {
  id: 'memory',
  title: 'Memory Match',
  description: 'Flip cards to find matching math pairs!',
  emoji: '🧠',
  bgStyle:     'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
  cardStyle:   'linear-gradient(135deg, #4f46e5, #7c3aed)',
  accentStyle: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
  duration: 0,
  generateQuestion: () => ({ displayText: '', answer: 0, choices: [], formatChoice: n => String(n) }),
};

// ─── Trivia ───────────────────────────────────────────────────────────────────

export const triviaGame: GameConfig = {
  id: 'trivia',
  title: 'Trivia Challenge',
  description: 'History, sports, science & more — test your knowledge!',
  emoji: '🎯',
  bgStyle:     'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)',
  cardStyle:   'linear-gradient(135deg, #4f46e5, #6d28d9)',
  accentStyle: 'linear-gradient(135deg, #4f46e5, #6d28d9)',
  duration: 0,
  generateQuestion: () => ({ displayText: '', answer: 0, choices: [], formatChoice: n => String(n) }),
};

// ─── Chess ────────────────────────────────────────────────────────────────────

export const chessGame: GameConfig = {
  id: 'chess',
  title: 'Chess',
  description: 'Play vs the AI or challenge a classmate in real-time!',
  emoji: '♟️',
  bgStyle:     'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',
  cardStyle:   'linear-gradient(135deg, #1e3a5f, #2d5986)',
  accentStyle: 'linear-gradient(135deg, #1e3a5f, #2d5986)',
  duration: 0,
  generateQuestion: () => ({ displayText: '', answer: 0, choices: [], formatChoice: n => String(n) }),
};

// ─── Spelling Bee ─────────────────────────────────────────────────────────────

export const spellingBeeGame: GameConfig = {
  id: 'spelling-bee',
  title: 'Spelling Bee',
  description: 'Listen to the word and spell it correctly!',
  emoji: '🐝',
  bgStyle:     'linear-gradient(135deg, #0c1a6e, #1a237e, #0d47a1)',
  cardStyle:   'linear-gradient(135deg, #1565c0, #1976d2)',
  accentStyle: 'linear-gradient(135deg, #FDD835, #F9A825)',
  duration: 0,
  generateQuestion: () => ({ displayText: '', answer: 0, choices: [], formatChoice: n => String(n) }),
};

// ─── Penalty Shootout ─────────────────────────────────────────────────────────

export const penaltyGame: GameConfig = {
  id: 'penalty',
  title: 'Penalty Shootout',
  description: 'Answer fast and score goals — 5 kicks to glory!',
  emoji: '⚽',
  bgStyle:     'linear-gradient(135deg, #064e3b, #065f46, #047857)',
  cardStyle:   'linear-gradient(135deg, #059669, #10b981)',
  accentStyle: 'linear-gradient(135deg, #16a34a, #15803d)',
  duration: 0,
  generateQuestion: () => ({ displayText: '', answer: 0, choices: [], formatChoice: n => String(n) }),
};

// ─── All games ────────────────────────────────────────────────────────────────

export const ALL_GAMES: GameConfig[] = [
  additionGame,
  multiplicationGame,
  divisionGame,
  fractionGame,
  brainGame,
  hangmanGame,
  memoryGame,
  triviaGame,
  chessGame,
  spellingBeeGame,
  penaltyGame,
];
