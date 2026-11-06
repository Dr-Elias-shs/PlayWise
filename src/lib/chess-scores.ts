import { supabase } from '@/lib/supabase';

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

// The ranking is written by the server (src/lib/server/chess.ts) after each game.

export async function getChessLeaderboard(limit = 50): Promise<ChessScoreRow[]> {
  const { data } = await supabase
    .from('chess_scores')
    .select('*')
    .order('rating', { ascending: false })
    .limit(limit);
  return (data as ChessScoreRow[]) ?? [];
}
