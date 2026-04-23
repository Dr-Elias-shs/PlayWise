/**
 * Unified Learning Score engine.
 *
 * Learning Score = Mastery(35%) + Accuracy(20%) + Progress(20%) + Diversity(15%) + PlayBits(10%)
 *
 * Called once per game session via recordGameResult().
 * Writes to game_performance + learning_scores (precomputed — no heavy joins at read time).
 */

import { supabase } from './supabase';

// All recognised game IDs
export const ALL_GAME_IDS = [
  'multiplication', 'addition', 'division',
  'fractions', 'hangman', 'brain', 'memory',
] as const;
export type GameId = typeof ALL_GAME_IDS[number];

const TOTAL_GAMES = ALL_GAME_IDS.length;

// Maximum mastered "skills":
//   12 multiplication tables + 1 mastery flag per other game (6) = 18
const MAX_MASTERED_SKILLS = 18;

// Score weights
const W = { mastery: 0.35, accuracy: 0.20, progress: 0.20, diversity: 0.15, playbits: 0.10 };

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point — call this after every game session
// ─────────────────────────────────────────────────────────────────────────────

export async function recordGameResult(
  studentName: string,
  gameId:       string,
  correctCount: number,
  totalQuestions: number,
  grade:        string = '',
): Promise<void> {
  if (!studentName || totalQuestions === 0) return;
  const accuracy = correctCount / totalQuestions;

  // ── Update game_performance for this game ────────────────────────────────
  const { data: existing } = await supabase
    .from('game_performance')
    .select('*')
    .eq('student_name', studentName)
    .eq('game_id', gameId)
    .maybeSingle();

  const sessions  = (existing?.sessions_count ?? 0) + 1;
  // Rolling average (cumulative mean)
  const rollingAvg = existing
    ? ((existing.avg_accuracy ?? 0) * existing.sessions_count + accuracy) / sessions
    : accuracy;

  // Mastered = reached ≥90% in ≥3 sessions (non-multiplication games)
  // Multiplication mastery is tracked per-table in table_progress instead
  const wasMastered = existing?.mastered ?? false;
  const nowMastered = wasMastered || (gameId !== 'multiplication' && accuracy >= 0.9 && sessions >= 3);

  await supabase.from('game_performance').upsert({
    student_name:    studentName,
    game_id:         gameId,
    sessions_count:  sessions,
    avg_accuracy:    rollingAvg,
    best_accuracy:   Math.max(accuracy, existing?.best_accuracy ?? 0),
    prev_accuracy:   existing?.last_accuracy ?? null,
    last_accuracy:   accuracy,
    mastered:        nowMastered,
    last_played_at:  new Date().toISOString(),
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'student_name,game_id' });

  // ── Recompute composite learning score ────────────────────────────────────
  await recomputeLearningScore(studentName, grade);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal — recompute all components from stored data
// ─────────────────────────────────────────────────────────────────────────────

async function recomputeLearningScore(studentName: string, grade: string): Promise<void> {
  const [perfRes, tableRes, walletRes] = await Promise.all([
    supabase.from('game_performance').select('*').eq('student_name', studentName),
    supabase.from('table_progress').select('mastered, last_accuracy, last_session_date').eq('student_name', studentName),
    supabase.from('player_wallets').select('total_earned').eq('student_name', studentName).maybeSingle(),
  ]);

  const perf   = perfRes.data  ?? [];
  const tables = tableRes.data ?? [];
  const totalPlaybits = walletRes.data?.total_earned ?? 0;

  // ── 1. Mastery Score (35%) ──────────────────────────────────────────────
  // Multiplication: count mastered tables from table_progress
  const multMastered   = tables.filter((r: any) => r.mastered).length;
  // Other games: count mastered from game_performance
  const otherMastered  = perf.filter((p: any) => p.game_id !== 'multiplication' && p.mastered).length;
  const totalMastered  = multMastered + otherMastered;
  const masteryScore   = Math.min(100, (totalMastered / MAX_MASTERED_SKILLS) * 100);

  // ── 2. Accuracy Score (20%) ─────────────────────────────────────────────
  // Use sessions with ≥3 plays for statistical reliability
  const qualifiedPerf = perf.filter((p: any) => p.sessions_count >= 3);
  const perfForAvg    = qualifiedPerf.length > 0 ? qualifiedPerf : perf;

  // Include multiplication accuracy aggregated from table_progress
  const multRows  = tables.filter((r: any) => r.last_accuracy !== null);
  const multAvgAcc = multRows.length > 0
    ? multRows.reduce((s: number, r: any) => s + (r.last_accuracy ?? 0), 0) / multRows.length
    : null;

  const nonMultPerf = perfForAvg.filter((p: any) => p.game_id !== 'multiplication');
  const allAccuracies = [
    ...nonMultPerf.map((p: any) => p.avg_accuracy ?? 0),
    ...(multAvgAcc !== null ? [multAvgAcc] : []),
  ];
  const avgAccuracy  = allAccuracies.length > 0
    ? allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length
    : 0;
  const accuracyScore = avgAccuracy * 100;

  // ── 3. Progress Score (20%) ─────────────────────────────────────────────
  // Average improvement delta (last_accuracy - prev_accuracy) per game
  const deltas = perf
    .filter((p: any) => p.prev_accuracy !== null && p.last_accuracy !== null)
    .map((p: any) => (p.last_accuracy as number) - (p.prev_accuracy as number));

  // Also compute multiplication delta: avg of (last_accuracy) across tables that were replayed
  // (We don't store prev per table here, so this stays as the game_performance delta for mult)
  const avgDelta     = deltas.length > 0
    ? deltas.reduce((a, b) => a + b, 0) / deltas.length
    : 0;

  // Map delta [-1, +1] → [0, 100] centred at 50 (no change = 50 pts)
  // ±20% improvement/decline = ±50 pts
  const progressScore = Math.max(0, Math.min(100, 50 + avgDelta * 250));

  // ── 4. Diversity Score (15%) ────────────────────────────────────────────
  // Distinct games played in the last 14 days
  const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const recentGames = perf.filter((p: any) => p.last_played_at && p.last_played_at > cutoff14d).length;
  // Also count multiplication if any table was played in the window
  const multPlayedRecently = tables.some((r: any) => r.last_session_date && (
    new Date(r.last_session_date).getTime() > new Date(cutoff14d).getTime()
  ));
  const distinctRecent  = recentGames + (multPlayedRecently && !perf.find((p: any) => p.game_id === 'multiplication' && p.last_played_at > cutoff14d) ? 1 : 0);
  const diversityScore  = Math.min(100, (Math.min(distinctRecent, TOTAL_GAMES) / TOTAL_GAMES) * 100);

  // ── 5. PlayBits Score (10%) ─────────────────────────────────────────────
  // Log scale: 10,000 PlayBits → 100 pts  (prevents huge absolute gaps)
  const playbitsScore = Math.min(100,
    (Math.log10(Math.max(1, totalPlaybits)) / Math.log10(10000)) * 100
  );

  // ── Composite ───────────────────────────────────────────────────────────
  const learningScore =
    masteryScore   * W.mastery   +
    accuracyScore  * W.accuracy  +
    progressScore  * W.progress  +
    diversityScore * W.diversity +
    playbitsScore  * W.playbits;

  await supabase.from('learning_scores').upsert({
    student_name:           studentName,
    grade,
    mastery_score:          Math.round(masteryScore   * 10) / 10,
    accuracy_score:         Math.round(accuracyScore  * 10) / 10,
    progress_score:         Math.round(progressScore  * 10) / 10,
    diversity_score:        Math.round(diversityScore * 10) / 10,
    playbits_score:         Math.round(playbitsScore  * 10) / 10,
    learning_score:         Math.round(learningScore  * 10) / 10,
    games_distinct_14d:     distinctRecent,
    avg_accuracy_all:       Math.round(avgAccuracy * 1000) / 1000,
    improvement_delta:      Math.round(avgDelta   * 1000) / 1000,
    total_mastered:         totalMastered,
    total_playbits:         totalPlaybits,
    updated_at:             new Date().toISOString(),
  }, { onConflict: 'student_name' });
}
