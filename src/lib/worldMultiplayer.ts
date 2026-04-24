/**
 * World Multiplayer — Supabase Realtime layer.
 *
 * Transport choices:
 *   - Broadcast  → position ticks (no DB write, pure pub/sub, <10ms latency)
 *   - DB upsert  → room state, answers, results (must survive reconnects)
 *
 * Position throttle: emit at most once per 80ms (~12.5 fps over network).
 * Remote positions are interpolated smoothly on the receiving end.
 */

import { supabase } from './supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

export const WORLD_ROOM_CAPACITY = 8;
export const LOBBY_COUNTDOWN_SEC = 10;
export const ROUND_DURATION_SEC  = 300; // 5-minute game round
export const POSITION_THROTTLE_MS = 80;

// ─── Types ───────────────────────────────────────────────────────────────────

export type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'finished';

export interface WorldRoom {
  id:           string;
  room_code:    string;
  host_name:    string;
  map_id:       string;
  status:       RoomStatus;
  player_count: number;
  max_players:  number;
  start_time:   string | null;
  end_time:     string | null;
  team_score:   number;
  created_at:   string;
}

export interface WorldPlayer {
  id:            string;        // UUID
  room_code:     string;
  player_name:   string;
  color_id:      string;
  equipped_id:   string | null;
  x:             number;        // 0–MAP_W
  y:             number;        // 0–MAP_H
  last_seen:     string;
  rooms_solved:  number;
  coins_earned:  number;
  is_host:       boolean;
}

export interface PositionTick {
  player_name: string;
  color_id:    string;
  equipped_id: string | null;
  x:           number;
  y:           number;
  dir:         number;          // 1 = right, -1 = left
  frame:       number;          // walk frame 0–2
}

// ─── Room helpers (DB) ───────────────────────────────────────────────────────

function genCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export async function createWorldRoom(
  hostName: string, mapId: string
): Promise<WorldRoom> {
  const room_code = genCode();
  const { data, error } = await supabase
    .from('world_rooms')
    .insert({
      room_code, host_name: hostName, map_id: mapId,
      status: 'waiting', player_count: 1, max_players: WORLD_ROOM_CAPACITY,
      team_score: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getOpenWorldRooms(mapId: string): Promise<WorldRoom[]> {
  const { data } = await supabase
    .from('world_rooms')
    .select('*')
    .eq('map_id', mapId)
    .eq('status', 'waiting')
    .lt('player_count', WORLD_ROOM_CAPACITY)
    .order('created_at', { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function getOrCreateAutoRoom(
  mapId: string, hostName: string
): Promise<WorldRoom> {
  // Find an existing open room first
  const open = await getOpenWorldRooms(mapId);
  if (open.length > 0) return open[0];
  // None found — create one
  return createWorldRoom(hostName, mapId);
}

export async function joinWorldRoom(
  roomCode: string, playerName: string, colorId: string, equippedId: string | null,
  isHost = false,
): Promise<void> {
  // Upsert player row
  await supabase.from('world_players').upsert({
    room_code: roomCode, player_name: playerName,
    color_id: colorId, equipped_id: equippedId,
    x: 450, y: 324, // spawn centre
    last_seen: new Date().toISOString(),
    rooms_solved: 0, coins_earned: 0, is_host: isHost,
  }, { onConflict: 'room_code,player_name' });

  // Increment counter (safe via RPC — avoid race)
  await supabase.rpc('increment_world_room_players', { p_room_code: roomCode });
}

export async function leaveWorldRoom(
  roomCode: string, playerName: string
): Promise<void> {
  await supabase.from('world_players')
    .delete().eq('room_code', roomCode).eq('player_name', playerName);
  await supabase.rpc('decrement_world_room_players', { p_room_code: roomCode });
}

export async function startWorldRoom(roomCode: string): Promise<void> {
  const startTime = new Date();
  const endTime   = new Date(startTime.getTime() + ROUND_DURATION_SEC * 1000);
  await supabase.from('world_rooms').update({
    status: 'playing',
    start_time: startTime.toISOString(),
    end_time:   endTime.toISOString(),
  }).eq('room_code', roomCode);
}

export async function finishWorldRoom(roomCode: string): Promise<void> {
  await supabase.from('world_rooms').update({ status: 'finished' })
    .eq('room_code', roomCode);
}

export async function getWorldPlayers(roomCode: string): Promise<WorldPlayer[]> {
  const { data } = await supabase
    .from('world_players').select('*').eq('room_code', roomCode);
  return data ?? [];
}

export async function recordWorldAnswer(
  roomCode: string, playerName: string, roomKey: string, correct: boolean,
): Promise<void> {
  // Upsert into world_answers for deduplication
  await supabase.from('world_answers').upsert({
    room_code: roomCode, player_name: playerName,
    room_key: roomKey, correct,
    answered_at: new Date().toISOString(),
  }, { onConflict: 'room_code,player_name,room_key' });

  if (correct) {
    await Promise.all([
      supabase.rpc('increment_world_player_rooms', { p_room_code: roomCode, p_player_name: playerName }),
      supabase.rpc('increment_world_team_score', { p_room_code: roomCode }),
    ]);
  }
}

// ─── Specialist roles ─────────────────────────────────────────────────────────
// Each player is randomly assigned 2 "expert" rooms. Their vote counts ×2 there.

const ALL_ROOM_KEYS = [
  'math','science','computer','robotics','library','history',
  'language_arts','reading','art','music','kitchen','cafeteria',
];

export function assignSpecialties(playerName: string, roomCode: string): string[] {
  // Deterministic shuffle from name+code so it's stable across reconnects
  const seed = (playerName + roomCode).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const shuffled = [...ALL_ROOM_KEYS].sort((a, b) =>
    ((seed * 1664525 + a.charCodeAt(0)) % 99991) - ((seed * 1664525 + b.charCodeAt(0)) % 99991)
  );
  return shuffled.slice(0, 2);
}

// ─── Broadcast events ─────────────────────────────────────────────────────────

export interface RoomTriggerEvent {
  type:        'room_triggered';
  room_key:    string;
  room_label:  string;
  room_color:  string;
  room_emoji:  string;
  question:    { text: string; choices: string[]; answer: number };
  triggered_by: string;
  expires_at:  number; // Date.now() + 15000
}

export interface VoteEvent {
  type:        'vote';
  room_key:    string;
  player_name: string;
  choice:      number;
  is_specialist: boolean;
}

export interface RoomResolvedEvent {
  type:       'room_resolved';
  room_key:   string;
  correct:    boolean;
  answer:     number;
  team_score: number;
}

export type GameEvent = RoomTriggerEvent | VoteEvent | RoomResolvedEvent;

// ─── Realtime channel factory ─────────────────────────────────────────────────

let gameChannel: ReturnType<typeof supabase.channel> | null = null;
let lastPosSent = 0;

export function subscribeToRoom(
  roomCode: string,
  onRoomChange:    (room: WorldRoom) => void,
  onPlayersChange: (players: WorldPlayer[]) => void,
  onPosition:      (tick: PositionTick) => void,
  onGameEvent?:    (evt: GameEvent) => void,
) {
  // ── 1. Postgres Changes — room status + player list ────────────────────────
  const dbChannel = supabase.channel(`world-db-${roomCode}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'world_rooms',
      filter: `room_code=eq.${roomCode}`,
    }, payload => {
      if (payload.new) onRoomChange(payload.new as WorldRoom);
    })
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'world_players',
      filter: `room_code=eq.${roomCode}`,
    }, async () => {
      const players = await getWorldPlayers(roomCode);
      onPlayersChange(players);
    })
    .subscribe();

  // ── 2. Broadcast — positions + game events on one channel ─────────────────
  gameChannel = supabase.channel(`world-game-${roomCode}`, {
    config: { broadcast: { self: false } },
  })
    .on('broadcast', { event: 'pos' }, ({ payload }) => {
      onPosition(payload as PositionTick);
    })
    .on('broadcast', { event: 'game' }, ({ payload }) => {
      onGameEvent?.(payload as GameEvent);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(dbChannel);
    if (gameChannel) supabase.removeChannel(gameChannel);
    gameChannel = null;
  };
}

export function broadcastPosition(roomCode: string, tick: PositionTick): void {
  const now = Date.now();
  if (now - lastPosSent < POSITION_THROTTLE_MS) return;
  lastPosSent = now;
  gameChannel?.send({ type: 'broadcast', event: 'pos', payload: tick });
}

export function broadcastGameEvent(event: GameEvent): void {
  gameChannel?.send({ type: 'broadcast', event: 'game', payload: event });
}
