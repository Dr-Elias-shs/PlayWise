import { Chess } from 'chess.js';

// ─── Piece values ─────────────────────────────────────────────────────────────

const PIECE_VALUE: Record<string, number> = {
  p: 10, n: 30, b: 32, r: 50, q: 90, k: 2000,
};

// Piece-square tables (from white's perspective, rank 8 → rank 1)
const PST: Record<string, number[]> = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function pstIndex(square: string, color: 'w' | 'b'): number {
  const file = square.charCodeAt(0) - 97; // a=0..h=7
  const rank = parseInt(square[1]) - 1;   // 1=0..8=7
  const row  = color === 'w' ? 7 - rank : rank;
  return row * 8 + file;
}

function evaluate(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === 'w' ? -99999 : 99999;
  if (game.isDraw())      return 0;

  let score = 0;
  const board = game.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const base = PIECE_VALUE[cell.type] ?? 0;
      const pst  = (PST[cell.type] ?? [])[pstIndex(cell.square, cell.color)] ?? 0;
      const val  = base + pst * 0.1;
      score += cell.color === 'w' ? val : -val;
    }
  }
  return score;
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximising: boolean,
): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);

  const moves = game.moves();
  if (maximising) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
      game.undo();
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

const DEPTH: Record<AIDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

export function getBestMove(fen: string, difficulty: AIDifficulty): string | null {
  const game  = new Chess(fen);
  const moves = game.moves();
  if (moves.length === 0) return null;

  // Easy: pick randomly from top ~50% moves (slight randomness)
  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * Math.max(1, Math.floor(moves.length * 0.7)))];
  }

  const depth      = DEPTH[difficulty];
  const isBlack    = game.turn() === 'b';
  let bestMove     = moves[0];
  let bestScore    = isBlack ? Infinity : -Infinity;

  for (const m of moves) {
    game.move(m);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !isBlack);
    game.undo();
    if (isBlack ? score < bestScore : score > bestScore) {
      bestScore = score;
      bestMove  = m;
    }
  }
  return bestMove;
}
