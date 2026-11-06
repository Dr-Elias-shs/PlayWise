// Server-only: how many PlayBits a finished game is worth. The browser reports the
// result; these rules decide the reward, so the anti-farming limits cannot be
// skipped from the console. The daily ceiling itself is applied by pw_award().

export const DAILY_CAP = 150;

export interface PlayResult {
  game: string;            // e.g. 'hangman', 'trivia-history', 'multiplication-7', 'chess'
  coins: number;           // what the game's own formula offered
  correct?: number;        // right answers / goals / words, when the game has them
  total?: number;
  level?: string;          // 'easy' | 'medium' | 'hard'
  playSeconds?: number;
  chess?: { mode: 'ai' | 'mp'; difficulty?: string; moves?: number; result: 'win' | 'draw' | 'loss'; opponent?: string; roomCode?: string };
}

// Per-session ceiling before the daily reduction.
const SESSION_CAPS: Record<string, number> = {
  addition: 30, division: 30, fractions: 30,
  multiplication: 30,
  brain: 40, memory: 45, hangman: 50,
  trivia: 30, 'spelling-bee': 40, penalty: 15,
  chess: 40,
};
// 1st, 2nd, 3rd... session of the same game today (all trivia topics count as one
// game, all multiplication tables too). From the 7th session on a game pays nothing,
// so the 150 a day has to come from several games, not from one quick game repeated.
const FRESHNESS = [1, 0.7, 0.4, 0.15, 0.15, 0.15, 0];

export const baseGame = (g: string) =>
  g.startsWith('trivia-') ? 'trivia' : g.startsWith('multiplication-') ? 'multiplication' : g;

export const KNOWN_GAMES = new Set(Object.keys(SESSION_CAPS));

/** Reward before the daily ceiling. `sessionsToday` counts earlier sessions of this exact game id today. */
export function reward(r: PlayResult, sessionsToday: number, onlineWinsVsOpponentToday = 0): number {
  const base = baseGame(r.game);
  if (!KNOWN_GAMES.has(base)) return 0;
  let raw = Math.max(0, Math.floor(Number(r.coins) || 0));

  if (base === 'chess') {
    const c = r.chess;
    if (!c || c.result === 'loss' || (c.moves ?? 0) < 10) return 0;
    if (c.mode === 'ai') {
      // Beating the easy computer (which even shows hints) earns nothing.
      const win = c.difficulty === 'hard' ? 40 : c.difficulty === 'medium' ? 20 : 0;
      raw = c.result === 'win' ? win : win > 0 ? 5 : 0;
    } else {
      // Online: the result was checked against the room by the award route.
      // At most 2 rewarded wins against the same opponent a day.
      if (c.result === 'win' && onlineWinsVsOpponentToday >= 2) return 0;
      raw = c.result === 'win' ? 40 : 5;
      return raw;   // no freshness: the per-opponent limit and the daily ceiling apply
    }
  } else {
    // Games with right answers: no right answers, no PlayBits.
    if (r.correct !== undefined && r.correct <= 0) return 0;
    // Trivia: less than half right pays nothing.
    if (base === 'trivia' && (r.total ?? 0) > 0 && (r.correct ?? 0) / (r.total ?? 1) < 0.5) return 0;
  }

  let cap = SESSION_CAPS[base];
  if (base === 'hangman' && r.level === 'easy') cap = 10;   // 3-letter words with a free letter
  const capped = Math.min(raw, cap);
  const fresh = FRESHNESS[Math.min(sessionsToday, FRESHNESS.length - 1)];
  return Math.round(capped * fresh);   // may be 0: no minimum of 1 any more
}

// The daily spin: the server draws the prize so it cannot be chosen in the browser.
export const SPIN_PRIZES = [
  { id: 'pb5', coins: 5, weight: 22 },
  { id: 'try', coins: 0, weight: 14 },
  { id: 'pb25', coins: 25, weight: 12 },
  { id: 'pb10', coins: 10, weight: 20 },
  { id: 'pb50', coins: 50, weight: 8 },
  { id: 'box', coins: 100, weight: 4 },
  { id: 'pb15', coins: 15, weight: 20 },
];
export const SPIN_GAMES_NEEDED = 5;

export function drawSpin(rand = Math.random) {
  const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
  let x = rand() * total;
  for (const p of SPIN_PRIZES) { x -= p.weight; if (x <= 0) return p; }
  return SPIN_PRIZES[0];
}

export const todayStartUTC = () => new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
