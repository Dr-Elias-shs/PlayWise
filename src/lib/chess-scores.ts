import { supabase } from '@/lib/supabase';
import type { AIDifficulty } from '@/lib/chess-ai';

export interface ChessScoreRow {
  student_name: string;
  display_name: string;
  wins:         number;
  losses:       number;
  draws:        number;
  rating:       number;
  win_streak:   number;
  best_streak:  number;
  updated_at:   string;
}

const RATING_DELTA: Record<string, number> = {
  win_ai_easy:   8,
  win_ai_medium: 15,
  win_ai_hard:   25,
  win_mp:        20,
  draw_ai:       3,
  draw_mp:       8,
  loss_ai:       0,   // no penalty vs AI — keep it fun for learners
  loss_mp:       -10,
};

export async function updateChessScore(
  playerName: string,
  playerEmail: string,
  result: 'win' | 'loss' | 'draw',
  mode: 'ai' | 'mp',
  difficulty: AIDifficulty = 'medium',
): Promise<void> {
  const dbKey      = playerEmail?.trim().toLowerCase() || playerName;
  const displayName = playerName;

  const { data: cur } = await supabase
    .from('chess_scores')
    .select('*')
    .eq('student_name', dbKey)
    .maybeSingle();

  const prev = (cur as ChessScoreRow | null) ?? {
    wins: 0, losses: 0, draws: 0, rating: 1000, win_streak: 0, best_streak: 0,
  };

  const deltaKey = `${result}_${mode}${mode === 'ai' ? `_${difficulty}` : ''}`;
  const delta    = RATING_DELTA[deltaKey] ?? 0;
  const newRating    = Math.max(800, prev.rating + delta);
  const newStreak    = result === 'win' ? prev.win_streak + 1 : 0;
  const newBestStreak = Math.max(prev.best_streak, newStreak);

  await supabase.from('chess_scores').upsert({
    student_name: dbKey,
    display_name: displayName,
    wins:         prev.wins   + (result === 'win'  ? 1 : 0),
    losses:       prev.losses + (result === 'loss' ? 1 : 0),
    draws:        prev.draws  + (result === 'draw' ? 1 : 0),
    rating:       newRating,
    win_streak:   newStreak,
    best_streak:  newBestStreak,
    updated_at:   new Date().toISOString(),
  });
}

export async function getChessLeaderboard(limit = 50): Promise<ChessScoreRow[]> {
  const { data } = await supabase
    .from('chess_scores')
    .select('*')
    .order('rating', { ascending: false })
    .limit(limit);
  return (data as ChessScoreRow[]) ?? [];
}
