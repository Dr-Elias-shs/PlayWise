// POST /api/coins/award — a game is finished; the server decides the PlayBits.
// Body: PlayResult (see src/lib/server/rewards.ts). The player comes from the
// session cookie, never from the body.
import { readSession, json } from '@/lib/server/session';
import { db, walletOf, countSince } from '@/lib/server/db';
import { scheduleCheck, DEFAULT_CONFIG, type TimeManagementConfig } from '@/lib/timeManagement';
import { reward, baseGame, KNOWN_GAMES, DAILY_CAP, todayStartUTC, type PlayResult } from '@/lib/server/rewards';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const s = readSession(req);
  if (!s) return json({ error: 'Not signed in' }, { status: 401 });

  let r: PlayResult;
  try { r = await req.json(); } catch { return json({ error: 'Bad request' }, { status: 400 }); }
  const game = String(r?.game || '').slice(0, 40);
  if (!KNOWN_GAMES.has(baseGame(game))) return json({ error: 'Unknown game' }, { status: 400 });

  const wallet = await walletOf(s.email);
  if (wallet?.banned) return json({ error: 'Banned' }, { status: 403 });

  // No PlayBits during school time (staff testing is exempt).
  if (!s.isStaff && !s.isAdmin) {
    const { data: tm } = await db().from('global_config').select('value').eq('key', 'time_management').maybeSingle();
    const raw = (tm?.value ?? {}) as Partial<TimeManagementConfig>;
    const cfg = { ...DEFAULT_CONFIG, ...raw, schedule: { ...DEFAULT_CONFIG.schedule, ...(raw.schedule ?? {}) } } as TimeManagementConfig;
    if (scheduleCheck(cfg, s.grade || '')) {
      return json({ credited: 0, balance: wallet?.coins ?? null, earnedToday: 0, dailyCap: DAILY_CAP, closed: true });
    }
  }

  const since = todayStartUTC();
  const sessionsToday = await countSince('game_sessions', { student_name: s.email, game_id: game }, since);
  const opponent = r.chess?.mode === 'mp' ? String(r.chess.opponent || '').toLowerCase().slice(0, 120) : '';
  const winsVsOpponent = opponent
    ? await countSince('coin_transactions', { student_name: s.email, game_id: `chess-online:${opponent}` }, since)
    : 0;

  const amount = reward({ ...r, game }, sessionsToday, winsVsOpponent);
  const playSeconds = Math.max(0, Math.min(3600, Math.round(Number(r.playSeconds) || 0)));
  const gameId = opponent && r.chess?.result === 'win' && amount > 0 ? `chess-online:${opponent}` : game;

  const { data, error } = await db().rpc('pw_award', {
    p_student: s.email, p_display: s.name || '', p_amount: amount, p_source: 'game_play', p_game: gameId,
    p_play_seconds: playSeconds, p_count_session: true, p_grade: s.grade || '', p_daily_cap: DAILY_CAP,
  });
  if (error) {
    console.error('pw_award failed:', error.message);
    return json({ error: 'PlayBits could not be saved' }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  return json({
    credited: row?.credited ?? 0, balance: row?.balance ?? null,
    earnedToday: row?.earned_today ?? 0, dailyCap: DAILY_CAP,
  });
}
