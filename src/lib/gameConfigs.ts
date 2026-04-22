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
  medium: [6, 8, 10, 12],
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

    // ── Hard: different denominators (always generates a valid question) ────────
    if (level === 'hard') {
      const [da, db] = DIFF_PAIRS[randInt(0, DIFF_PAIRS.length - 1)];
      const lcd = lcm(da, db);
      const fa = lcd / da;  // scale factor: 1/da = fa/lcd
      const fb = lcd / db;
      const useAdd = Math.random() > 0.45;

      let dN1: number, dD1: number, dN2: number, dD2: number, ansNum: number, op: string;

      if (useAdd) {
        op = '+';
        dD1 = da; dD2 = db;
        // Pick dN1, then pick dN2 so that n1 + n2 < lcd (proper fraction result)
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
          // a/da − b/db
          dD1 = da; dN1 = na; dD2 = db; dN2 = nb;
          ansNum = na_s - nb_s;
        } else if (nb_s > na_s) {
          // b/db − a/da (swap so result is positive)
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

// ─── All games ────────────────────────────────────────────────────────────────

export const ALL_GAMES: GameConfig[] = [
  additionGame,
  multiplicationGame,
  divisionGame,
  fractionGame,
  memoryGame,
];
