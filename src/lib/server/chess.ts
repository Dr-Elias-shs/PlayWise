// Server-only: online chess results are read from the room, never believed from the
// browser, and the chess ranking is written here (the browser key can no longer
// write chess_scores once supabase/chess_fair_2026-11.sql has run).
import { Chess } from 'chess.js';
import { db } from './db';

const ROOM_MAX_AGE_MS = 3 * 3600 * 1000;
const MIN_FULL_MOVES = 6;   // about 10 moves between the two players

export interface RoomVerdict {
  ok: boolean;
  why?: string;
  result?: 'win' | 'draw' | 'loss';
  opponent?: string;        // opponent's email
  fullMoves?: number;
}

/**
 * The outcome of an online game, from the room row:
 *  - the loser's own device writes resigned_<colour> or timeout_<colour>, or
 *  - the final position is checkmate or a draw.
 * Joining an abandoned room and letting the absent player's clock run out on
 * your own screen writes nothing, so it earns nothing. Playing yourself from
 * two devices is refused because both sides have the same account.
 */
export async function verifyRoom(code: string, email: string): Promise<RoomVerdict> {
  if (!/^[A-Z0-9]{4,8}$/.test(code)) return { ok: false, why: 'no room' };
  const { data: room, error } = await db().from('chess_rooms')
    .select('room_code, status, fen, white_email, black_email, created_at')
    .eq('room_code', code).maybeSingle();
  if (error || !room) return { ok: false, why: 'room not found' };

  const white = String(room.white_email || '').toLowerCase();
  const black = String(room.black_email || '').toLowerCase();
  if (!white || !black) return { ok: false, why: 'room has no players' };
  if (white === black) return { ok: false, why: 'same player on both sides' };
  const me = email.toLowerCase();
  if (me !== white && me !== black) return { ok: false, why: 'not a player in this room' };
  if (Date.now() - new Date(room.created_at).getTime() > ROOM_MAX_AGE_MS) return { ok: false, why: 'room too old' };

  const myColor = me === white ? 'w' : 'b';
  const opponent = myColor === 'w' ? black : white;
  const fullMoves = Number(String(room.fen || '').split(' ')[5]) || 1;

  let result: RoomVerdict['result'];
  const st = String(room.status || '');
  const m = /^(resigned|timeout)_([wb])$/.exec(st);
  if (m) {
    result = m[2] === myColor ? 'loss' : 'win';
  } else {
    try {
      const g = new Chess(room.fen);
      if (g.isCheckmate()) result = g.turn() === myColor ? 'loss' : 'win';
      else if (g.isDraw() || g.isStalemate()) result = 'draw';
    } catch { /* bad fen */ }
  }
  if (!result) return { ok: false, why: 'game not finished', opponent, fullMoves };
  if (fullMoves < MIN_FULL_MOVES) return { ok: false, why: 'game too short', result, opponent, fullMoves };
  return { ok: true, result, opponent, fullMoves };
}

const RATING_DELTA: Record<string, number> = {
  win_ai_easy: 8, win_ai_medium: 15, win_ai_hard: 25, win_mp: 20,
  draw_ai: 3, draw_mp: 8, loss_ai: 0, loss_mp: -10,
};

/** Update the chess ranking for one finished game. */
export async function recordChessScore(email: string, name: string, result: 'win' | 'draw' | 'loss',
                                       mode: 'ai' | 'mp', difficulty = 'medium') {
  const { data: cur } = await db().from('chess_scores').select('*').eq('student_name', email).maybeSingle();
  const prev = cur ?? { wins: 0, losses: 0, draws: 0, rating: 1000, win_streak: 0, best_streak: 0 };
  const key = `${result}_${mode}${mode === 'ai' ? `_${difficulty}` : ''}`;
  const delta = RATING_DELTA[key] ?? RATING_DELTA[`${result}_${mode}`] ?? 0;
  const streak = result === 'win' ? (prev.win_streak ?? 0) + 1 : 0;
  await db().from('chess_scores').upsert({
    student_name: email,
    display_name: name || cur?.display_name || email,
    wins: (prev.wins ?? 0) + (result === 'win' ? 1 : 0),
    losses: (prev.losses ?? 0) + (result === 'loss' ? 1 : 0),
    draws: (prev.draws ?? 0) + (result === 'draw' ? 1 : 0),
    rating: Math.max(800, (prev.rating ?? 1000) + delta),
    win_streak: streak,
    best_streak: Math.max(prev.best_streak ?? 0, streak),
    updated_at: new Date().toISOString(),
  });
}
