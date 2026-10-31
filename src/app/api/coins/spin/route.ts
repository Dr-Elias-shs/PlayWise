// The daily spin wheel. GET: can I spin? POST: spin; the server draws the prize.
import { readSession, json } from '@/lib/server/session';
import { db, walletOf, countSince } from '@/lib/server/db';
import { drawSpin, SPIN_GAMES_NEEDED, todayStartUTC } from '@/lib/server/rewards';

export const dynamic = 'force-dynamic';

async function status(email: string) {
  const since = todayStartUTC();
  const [games, spins] = await Promise.all([
    countSince('game_sessions', { student_name: email }, since),
    countSince('coin_transactions', { student_name: email, source: 'spin_wheel' }, since),
  ]);
  return { games, needed: SPIN_GAMES_NEEDED, spun: spins > 0 };
}

export async function GET(req: Request) {
  const s = readSession(req);
  if (!s) return json({ error: 'Not signed in' }, { status: 401 });
  return json(await status(s.email));
}

export async function POST(req: Request) {
  const s = readSession(req);
  if (!s) return json({ error: 'Not signed in' }, { status: 401 });
  if ((await walletOf(s.email))?.banned) return json({ error: 'Banned' }, { status: 403 });
  const st = await status(s.email);
  if (st.spun) return json({ error: 'Already spun today', ...st }, { status: 409 });
  if (st.games < st.needed) return json({ error: 'Play more games first', ...st }, { status: 409 });

  const prize = drawSpin();
  const { data, error } = await db().rpc('pw_award', {
    p_student: s.email, p_display: s.name || '', p_amount: prize.coins, p_source: 'spin_wheel', p_game: prize.id,
    p_play_seconds: 0, p_count_session: false, p_grade: s.grade || '', p_daily_cap: null,
  });
  if (error) return json({ error: 'Spin could not be saved' }, { status: 500 });
  const row = Array.isArray(data) ? data[0] : data;
  return json({ prizeId: prize.id, coins: row?.credited ?? 0, balance: row?.balance ?? null });
}
