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

const SAME_DENOMS: Record<'easy' | 'medium', number[]> = {
  easy:   [2, 3, 4],
  medium: [2, 3, 4, 5, 6, 8],
};

// Friendly denominator pairs for Hard — LCD is always manageable
const DIFF_PAIRS: [number, number][] = [
  [2, 3], [2, 4], [2, 6], [2, 8],
  [3, 4], [3, 6], [3, 9],
  [4, 8], [4, 12],
  [5, 10],
];

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

    // ── Hard: different denominators ─────────────────────────────────────────
    if (level === 'hard') {
      let tries = 0;
      while (tries < 50) {
        tries++;
        const [d1, d2] = DIFF_PAIRS[randInt(0, DIFF_PAIRS.length - 1)];
        const lcd = lcm(d1, d2);
        const num1 = randInt(1, d1 - 1);
        const num2 = randInt(1, d2 - 1);
        const n1 = num1 * (lcd / d1);
        const n2 = num2 * (lcd / d2);
        const op = Math.random() > 0.45 ? '+' : '−';

        let ansNum: number;
        if (op === '+') {
          ansNum = n1 + n2;
          if (ansNum > lcd) continue; // keep sum proper fraction
        } else {
          if (n1 <= n2) continue;     // ensure positive result
          ansNum = n1 - n2;
        }

        const [sNum, sDen] = simplify(ansNum, lcd);

        // Generate wrong choices by varying the simplified numerator
        const wrongChoices = new Set<string>();
        let offset = 1;
        while (wrongChoices.size < 3 && offset < 10) {
          const wNum = sNum + (wrongChoices.size % 2 === 0 ? offset : -offset);
          if (wNum > 0 && wNum !== sNum) {
            const [wS, wD] = simplify(wNum, sDen);
            wrongChoices.add(`${wS}/${wD}`);
          }
          if (wrongChoices.size < 3) {
            const wNum2 = sNum - (wrongChoices.size % 2 === 0 ? offset : -offset);
            if (wNum2 > 0 && wNum2 !== sNum) {
              const [wS2, wD2] = simplify(wNum2, sDen);
              wrongChoices.add(`${wS2}/${wD2}`);
            }
          }
          offset++;
        }

        const answerDisplay = `${sNum}/${sDen}`;
        // Pack choices as indices: 0 = correct, 1..3 = wrongs
        // We store answer as 0 and use formatChoice to map to strings
        const allChoices = [answerDisplay, ...Array.from(wrongChoices).slice(0, 3)];
        const shuffled = allChoices.sort(() => Math.random() - 0.5);
        const correctIdx = shuffled.indexOf(answerDisplay);

        return {
          displayText: `${num1}/${d1}  ${op}  ${num2}/${d2}`,
          answer: correctIdx,
          choices: [0, 1, 2, 3],
          formatChoice: n => shuffled[n] ?? '?',
          hint: '= ?',
        };
      }
      // Fallback to medium if all tries fail
      level = 'medium';
    }

    // ── Easy / Medium: same denominator ──────────────────────────────────────
    const pool = SAME_DENOMS[level as 'easy' | 'medium'];
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
