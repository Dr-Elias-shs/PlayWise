/**
 * Anti-farming reward system for multiplication table practice.
 *
 * Formula: reward = BASE × difficulty × accuracyFactor × freshness
 *                 + accuracyBonus + improvementBonus + masteryBonus
 *                 + varietyBonus + multiplayerBonus
 *
 * Design goals:
 *   - Reward mastery & improvement, not repetition
 *   - Penalise easy table farming (×1, ×5, ×10 have low difficulty)
 *   - Daily cap via freshness decay
 *   - One-time mastery bonus when a table is first cracked at 90%+
 *   - Variety bonus for practising multiple tables per day
 */

import { supabase } from './supabase';
import { addCoins } from './wallet';
import { recordGameResult } from './learningScore';

// ── Difficulty weights (0.5 = easy pattern, 1.3 = genuinely hard) ─────────────
export const TABLE_DIFFICULTY: Record<number, number> = {
  1:  0.5,   // anything × 1 is trivial
  2:  0.8,
  3:  0.9,
  4:  1.0,
  5:  0.7,   // easy — ends in 0 or 5
  6:  1.1,
  7:  1.2,
  8:  1.3,   // hardest
  9:  1.1,
  10: 0.6,   // easy — just add a zero
  11: 1.0,
  12: 1.3,
};

// ── Freshness: multiplier per session index for this table today (0-based) ────
// 1st session = full reward, 4th+ = 20% (still pays something so it's not demoralising)
const DAILY_FRESHNESS = [1.0, 0.7, 0.4, 0.2];

const BASE = 10; // base coins before all modifiers

// ─────────────────────────────────────────────────────────────────────────────
// Pure calculation — no side effects, fully unit-testable
// ─────────────────────────────────────────────────────────────────────────────

export interface RewardInput {
  tableNumber:      number;
  correctCount:     number;
  totalQuestions:   number;
  won:              boolean;   // multiplayer win
  isMultiplayer:    boolean;
  sessionsToday:    number;    // sessions for THIS table today before this one (0 = first)
  prevAccuracy:     number | null; // last session's accuracy [0-1], null = never played
  mastered:         boolean;
  masteryBonusGiven:boolean;
  tablesAfterThis:  number;    // distinct tables practised today INCLUDING this session
  variety4Given:    boolean;   // 4-table variety bonus already awarded today
  variety6Given:    boolean;
}

export interface RewardBreakdown {
  base:             number;
  accuracyBonus:    number;
  improvementBonus: number;
  masteryBonus:     number;
  varietyBonus:     number;
  multiplayerBonus: number;
  total:            number;
  accuracy:         number;   // 0-1, for display
  // flags for DB updates
  newMastered:      boolean;
  awardVariety4:    boolean;
  awardVariety6:    boolean;
}

export function calcTableReward(input: RewardInput): RewardBreakdown {
  const {
    tableNumber, correctCount, totalQuestions, won, isMultiplayer,
    sessionsToday, prevAccuracy, mastered, masteryBonusGiven,
    tablesAfterThis, variety4Given, variety6Given,
  } = input;

  const accuracy   = totalQuestions > 0 ? correctCount / totalQuestions : 0;
  const difficulty = TABLE_DIFFICULTY[tableNumber] ?? 1.0;
  const freshness  = DAILY_FRESHNESS[Math.min(sessionsToday, DAILY_FRESHNESS.length - 1)];

  // Accuracy factor shifts the base reward between 0.5× (terrible) and 1.2× (excellent)
  const accFactor = accuracy >= 0.9 ? 1.2
                  : accuracy >= 0.8 ? 1.0
                  : accuracy >= 0.6 ? 0.8
                  : 0.5;

  // Core reward — freshness scales BOTH base and accuracy bonus so farming
  // decays the entire repeatable reward, not just the base component.
  const rawAccuracyBonus = accuracy >= 0.9 ? 10 : accuracy >= 0.8 ? 5 : 0;
  const base         = Math.round((BASE * difficulty * accFactor + rawAccuracyBonus) * freshness);
  const accuracyBonus = 0; // folded into base above — kept in breakdown as 0 for clarity

  // Improvement bonus — rewards getting better vs. last time (+5% threshold)
  const improvementBonus = prevAccuracy !== null && accuracy > prevAccuracy + 0.05 ? 8 : 0;

  // One-time mastery bonus — first time reaching ≥90% on this table
  const newMastered  = !mastered && accuracy >= 0.9;
  const masteryBonus = newMastered && !masteryBonusGiven ? 25 : 0;

  // Multiplayer win bonus
  const multiplayerBonus = isMultiplayer && won ? 10 : 0;

  // Variety bonus — awarded once per day when crossing the threshold
  const awardVariety4 = !variety4Given && tablesAfterThis >= 4;
  const awardVariety6 = !variety6Given && tablesAfterThis >= 6;
  const varietyBonus  = (awardVariety4 ? 10 : 0) + (awardVariety6 ? 20 : 0);

  // Always give at least 1 coin so students never feel punished for trying
  const total = Math.max(1,
    base + accuracyBonus + improvementBonus + masteryBonus + multiplayerBonus + varietyBonus
  );

  return {
    base, accuracyBonus, improvementBonus, masteryBonus,
    varietyBonus, multiplayerBonus, total, accuracy,
    newMastered, awardVariety4, awardVariety6,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator — reads DB state, calculates, writes back, awards coins
// ─────────────────────────────────────────────────────────────────────────────

export async function awardTableCoins(
  studentName:    string,
  tableNumber:    number,
  correctCount:   number,
  totalQuestions: number,
  won:            boolean,
  isMultiplayer:  boolean,
  playTimeSeconds:number,
  playerGrade:    string,
): Promise<RewardBreakdown> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // ── 1. Fetch this table's history ─────────────────────────────────────────
  const { data: tableRow } = await supabase
    .from('table_progress')
    .select('*')
    .eq('student_name', studentName)
    .eq('table_number', tableNumber)
    .maybeSingle();

  // ── 2. Count distinct tables played today (for variety) ───────────────────
  const { data: todayRows } = await supabase
    .from('table_progress')
    .select('table_number')
    .eq('student_name', studentName)
    .eq('last_session_date', today);

  const distinctToday = new Set((todayRows ?? []).map((r: any) => r.table_number as number));

  // Is this the first time the student plays this table today?
  const isNewTableToday = tableRow?.last_session_date !== today;
  const tablesAfterThis = distinctToday.size + (isNewTableToday ? 1 : 0);

  // ── 3. Fetch today's variety bonus flags ──────────────────────────────────
  const { data: dailyRow } = await supabase
    .from('student_daily')
    .select('*')
    .eq('student_name', studentName)
    .eq('date', today)
    .maybeSingle();

  // Reset sessions_today if last session was on a different day
  const sessionsToday = tableRow?.last_session_date === today
    ? (tableRow?.sessions_today ?? 0)
    : 0;

  // ── 4. Calculate reward ───────────────────────────────────────────────────
  const result = calcTableReward({
    tableNumber,
    correctCount,
    totalQuestions,
    won,
    isMultiplayer,
    sessionsToday,
    prevAccuracy:      tableRow?.last_accuracy ?? null,
    mastered:          tableRow?.mastered ?? false,
    masteryBonusGiven: tableRow?.mastery_bonus_given ?? false,
    tablesAfterThis,
    variety4Given:     dailyRow?.variety_4_bonus_given ?? false,
    variety6Given:     dailyRow?.variety_6_bonus_given ?? false,
  });

  const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

  // ── 5. Persist table progress ─────────────────────────────────────────────
  await supabase.from('table_progress').upsert({
    student_name:        studentName,
    table_number:        tableNumber,
    last_accuracy:       accuracy,
    best_accuracy:       Math.max(accuracy, tableRow?.best_accuracy ?? 0),
    sessions_today:      sessionsToday + 1,
    last_session_date:   today,
    mastered:            (tableRow?.mastered ?? false) || result.newMastered,
    mastery_bonus_given: (tableRow?.mastery_bonus_given ?? false) || result.masteryBonus > 0,
    updated_at:          new Date().toISOString(),
  }, { onConflict: 'student_name,table_number' });

  // ── 6. Persist variety bonus flags if thresholds crossed ─────────────────
  if (result.awardVariety4 || result.awardVariety6) {
    await supabase.from('student_daily').upsert({
      student_name:           studentName,
      date:                   today,
      variety_4_bonus_given:  (dailyRow?.variety_4_bonus_given ?? false) || result.awardVariety4,
      variety_6_bonus_given:  (dailyRow?.variety_6_bonus_given ?? false) || result.awardVariety6,
    }, { onConflict: 'student_name,date' });
  }

  // ── 7. Award coins + update learning score ───────────────────────────────
  await Promise.all([
    addCoins(studentName, result.total, playTimeSeconds, true, playerGrade, `multiplication-${tableNumber}`),
    recordGameResult(studentName, 'multiplication', correctCount, totalQuestions, playerGrade),
  ]);

  return result;
}
