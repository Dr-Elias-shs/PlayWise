import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const saveScore = async (studentName: string, focusTable: number, score: number, gameType = 'multiplication') => {
  // Find existing best score for this student + game type
  const { data: existing } = await supabase
    .from('scores')
    .select('id, score')
    .eq('student_name', studentName)
    .eq('focus_table', focusTable)
    .maybeSingle();

  if (existing) {
    if (score > existing.score) {
      return supabase.from('scores').update({ score, timestamp: new Date() }).eq('id', existing.id);
    }
    return { data: existing, error: null };
  }

  // Try inserting with game_type; if column doesn't exist yet, insert without it
  const { data, error } = await supabase
    .from('scores')
    .insert([{ student_name: studentName, focus_table: focusTable, game_type: gameType, score, timestamp: new Date() }]);

  if (error?.message?.includes('game_type')) {
    // game_type column not added yet — insert without it
    return supabase
      .from('scores')
      .insert([{ student_name: studentName, focus_table: focusTable, score, timestamp: new Date() }]);
  }

  return { data, error };
};

export const getLeaderboard = async (focusTable: number) => {
  const { data, error } = await supabase
    .from('scores')
    .select('student_name, score')
    .eq('focus_table', focusTable)
    .order('score', { ascending: false })
    .limit(5);
  
  return { data, error };
};

export const getGlobalLeaderboard = async () => {
  const { data, error } = await supabase
    .from('scores')
    .select('student_name, score')
    .order('score', { ascending: false })
    .limit(10);
  return { data, error };
};

// ─── Game Rooms ───────────────────────────────────────────────────────────────

export interface GameRoom {
  id: string;
  room_code: string;
  host_name: string;
  host_avatar: string;
  game_id: string;
  status: string;
  player_count: number;
  created_at: string;
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createGameRoom(hostName: string, hostAvatar: string, gameId: string): Promise<GameRoom> {
  const room_code = genCode();
  const { data, error } = await supabase
    .from('game_rooms')
    .insert({ room_code, host_name: hostName, host_avatar: hostAvatar, game_id: gameId, player_count: 1 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOpenRooms(): Promise<{ rooms: GameRoom[]; error: string | null }> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false });
  if (error) return { rooms: [], error: error.message };
  return { rooms: data ?? [], error: null };
}

export async function incrementRoomPlayers(roomCode: string, count: number) {
  await supabase.from('game_rooms').update({ player_count: count }).eq('room_code', roomCode);
}

export async function setRoomPlaying(roomCode: string) {
  await supabase.from('game_rooms').update({ status: 'playing' }).eq('room_code', roomCode);
}

export async function deleteGameRoom(roomCode: string) {
  await supabase.from('game_rooms').delete().eq('room_code', roomCode);
}