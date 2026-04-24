/**
 * Daily freshness cap applied to ALL hub games (except multiplication,
 * which has its own tableRewards.ts system).
 *
 * Sessions today → reward multiplier:
 *   1st  → 1.0  (full)
 *   2nd  → 0.7
 *   3rd  → 0.4
 *   4th+ → 0.15  (minimal — not zero so it's never demoralising)
 *
 * Also caps the raw coin amount per session so no single game can
 * award an absurd number in one sitting.
 */

import { supabase } from './supabase';

const DAILY_FRESHNESS = [1.0, 0.7, 0.4, 0.15];

// Hard per-session caps by game (before freshness)
const SESSION_CAPS: Record<string, number> = {
  hangman: 50,   // was up to 116 — hard grind still earns ~50 first session
  memory:  45,
  brain:   40,
  addition:   30,
  division:   30,
  fractions:  30,
};

export async function applyDailyFreshness(
  studentKey: string,  // email or name — whatever is used as DB key
  gameId:     string,
  rawCoins:   number,
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  // Count how many sessions this student already played this game today
  const { count } = await supabase
    .from('game_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_name', studentKey)
    .eq('game_id', gameId)
    .gte('created_at', `${today}T00:00:00.000Z`);

  const sessionsToday = count ?? 0;
  const freshness = DAILY_FRESHNESS[Math.min(sessionsToday, DAILY_FRESHNESS.length - 1)];

  // Cap then apply freshness
  const cap = SESSION_CAPS[gameId] ?? rawCoins;
  const capped = Math.min(rawCoins, cap);
  return Math.max(1, Math.round(capped * freshness));
}
