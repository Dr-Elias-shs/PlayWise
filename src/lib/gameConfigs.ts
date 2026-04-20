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
    // Allow outside [min,max] so we never get stuck in a tiny range
    if (w > 0 && !set.has(w)) set.add(w);
    tries++;
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

// ─── Question type ─────────────────────────────────────────────────────────────

export interface Question {
  displayText: string;       // e.g. "7 × 8"
  answer: number;            // numeric answer used internally
  choices: number[];         // numeric choices
  formatChoice: (n: number) => string;   // how to display a choice button
  hint?: string;             // e.g. "= ?/5" shown below question
}

// ─── Config type ──────────────────────────────────────────────────────────────

export interface GameConfig {
  id: string;
  title: string;
  description: string;
  emoji: string;
  bgStyle: string;       // inline CSS gradient for full-screen bg
  cardStyle: string;     // inline CSS gradient for hub card header
  accentStyle: string;   // inline CSS gradient for buttons
  duration: number;
  generateQuestion: () => Question;
}

// ─── Grade 2 — Addition & Subtraction ─────────────────────────────────────────

export const additionGame: GameConfig = {
  id: 'addition',
  title: 'Number Sprint',
  description: 'Add and subtract your way to the top!',
  emoji: '➕',
  bgStyle:     'linear-gradient(135deg, #1d4ed8, #0891b2, #0f766e)',
  cardStyle:   'linear-gradient(135deg, #3b82f6, #06b6d4)',
  accentStyle: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
  duration: 60,
  generateQuestion: () => {
    const op = Math.random() > 0.45 ? '+' : '−';
    if (op === '+') {
      const a = randInt(1, 30);
      const b = randInt(1, 30);
      const answer = a + b;
      return {
        displayText: `${a} + ${b}`,
        answer,
        choices: makeChoices(answer, 1, 60),
        formatChoice: n => String(n),
      };
    } else {
      const b = randInt(1, 20);
      const a = randInt(b + 1, 40);
      const answer = a - b;
      return {
        displayText: `${a} − ${b}`,
        answer,
        choices: makeChoices(answer, 0, 39),
        formatChoice: n => String(n),
      };
    }
  },
};

// ─── Grade 3 — Multiplication (same engine, different config) ─────────────────

export const multiplicationGame: GameConfig = {
  id: 'multiplication',
  title: 'Multiplication Blitz',
  description: 'Master your times tables with speed!',
  emoji: '✖️',
  bgStyle:     'linear-gradient(135deg, #6d28d9, #9333ea, #a21caf)',
  cardStyle:   'linear-gradient(135deg, #7c3aed, #9333ea)',
  accentStyle: 'linear-gradient(135deg, #7c3aed, #9333ea)',
  duration: 60,
  generateQuestion: () => {
    const a = randInt(2, 10);
    const b = randInt(1, 10);
    const answer = a * b;
    return {
      displayText: `${a} × ${b}`,
      answer,
      choices: makeChoices(answer, 2, 100),
      formatChoice: n => String(n),
    };
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
  generateQuestion: () => {
    const divisor = randInt(2, 12);
    const quotient = randInt(1, 12);
    const dividend = divisor * quotient;
    return {
      displayText: `${dividend} ÷ ${divisor}`,
      answer: quotient,
      choices: makeChoices(quotient, 1, 12),
      formatChoice: n => String(n),
    };
  },
};

// ─── Grade 5 — Fractions ──────────────────────────────────────────────────────

const DENOMS = [2, 3, 4, 5, 6, 8, 10];

export const fractionGame: GameConfig = {
  id: 'fractions',
  title: 'Fraction Frenzy',
  description: 'Add and subtract fractions like a pro!',
  emoji: '🍕',
  bgStyle:     'linear-gradient(135deg, #9d174d, #e11d48, #dc2626)',
  cardStyle:   'linear-gradient(135deg, #ec4899, #f43f5e)',
  accentStyle: 'linear-gradient(135deg, #ec4899, #f43f5e)',
  duration: 60,
  generateQuestion: () => {
    const denom = DENOMS[randInt(0, DENOMS.length - 1)];
    const op = Math.random() > 0.45 ? '+' : '−';
    let num1: number, num2: number, answer: number;

    if (op === '+') {
      num1 = randInt(1, denom - 1);
      num2 = randInt(1, denom - num1);   // keep sum ≤ denom
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

// ─── All games list (for hub) ─────────────────────────────────────────────────

export const ALL_GAMES: GameConfig[] = [
  additionGame,
  multiplicationGame,
  divisionGame,
  fractionGame,
];
