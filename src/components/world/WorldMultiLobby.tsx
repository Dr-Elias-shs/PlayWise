"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldStore } from '@/store/useWorldStore';
import { useWorldMultiStore } from '@/store/useWorldMultiStore';
import { useAvatarStore } from '@/store/useAvatarStore';
import { COLORS, ACCESSORIES } from '@/lib/avatar-items';
import {
  createWorldRoom, getOpenWorldRooms, getOrCreateAutoRoom,
  joinWorldRoom, leaveWorldRoom, startWorldRoom,
  subscribeToRoom, getWorldPlayers,
  LOBBY_COUNTDOWN_SEC, WORLD_ROOM_CAPACITY,
  WorldRoom, WorldPlayer,
} from '@/lib/worldMultiplayer';

interface Props {
  mapId:   string;
  onStart: (roomCode: string) => void;
  onBack:  () => void;
}

function PlayerChip({ p }: { p: WorldPlayer }) {
  const color  = COLORS.find(c => c.id === p.color_id);
  const acc    = ACCESSORIES.find(a => a.id === p.equipped_id);
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
      <div className="flex flex-col items-center">
        {acc && <span className="text-base leading-none">{acc.emoji}</span>}
        <img src="/character/walk2.png" alt="" draggable={false}
          style={{ height: 36, filter: color?.filter ?? '' }} />
      </div>
      <div>
        <div className="text-white font-black text-sm">{p.player_name}</div>
        <div className="text-white/40 text-[10px] font-bold uppercase tracking-wider">
          {p.is_host ? '👑 Host' : 'Player'}
        </div>
      </div>
      <div className="ml-auto text-[10px] text-emerald-400 font-bold">✓ Ready</div>
    </div>
  );
}

export function WorldMultiLobby({ mapId, onStart, onBack }: Props) {
  const { playerName } = useWorldStore();
  const { colorId, equippedId } = useAvatarStore();
  const { setRoom, setPlayers, setMyRoomCode, room, players } = useWorldMultiStore();

  const [openRooms,    setOpenRooms]    = useState<WorldRoom[]>([]);
  const [joinCode,     setJoinCode]     = useState('');
  const [joinError,    setJoinError]    = useState('');
  const [phase,        setPhase]        = useState<'browse' | 'lobby'>('browse');
  const [loading,      setLoading]      = useState(false);
  const [countdownLive, setCountdownLive] = useState(0);

  const unsubRef    = useRef<(() => void) | null>(null);
  const cdTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const myRoomCode  = useWorldMultiStore(s => s.myRoomCode);

  // Fetch open rooms on mount
  useEffect(() => {
    getOpenWorldRooms(mapId).then(setOpenRooms);
    const interval = setInterval(() => getOpenWorldRooms(mapId).then(setOpenRooms), 5000);
    return () => clearInterval(interval);
  }, [mapId]);

  // Subscribe to room changes when in lobby phase
  useEffect(() => {
    if (phase !== 'lobby' || !myRoomCode) return;

    const unsub = subscribeToRoom(
      myRoomCode,
      (updatedRoom) => {
        setRoom(updatedRoom);
        // Room moved to countdown
        if (updatedRoom.status === 'countdown') startCountdown();
        // Room moved to playing — launch the game
        if (updatedRoom.status === 'playing') {
          clearTimers();
          onStart(myRoomCode);
        }
      },
      (updatedPlayers) => setPlayers(updatedPlayers),
      () => {}, // positions handled in game, not lobby
    );
    unsubRef.current = unsub;
    return () => { unsub(); };
  }, [phase, myRoomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearTimers() {
    if (cdTimerRef.current)    clearInterval(cdTimerRef.current);
    if (roundTimerRef.current) clearInterval(roundTimerRef.current);
  }

  function startCountdown() {
    clearTimers();
    let secs = LOBBY_COUNTDOWN_SEC;
    setCountdownLive(secs);
    cdTimerRef.current = setInterval(() => {
      secs--;
      setCountdownLive(secs);
      if (secs <= 0) {
        clearInterval(cdTimerRef.current!);
        // Host triggers game start via DB; all clients react via subscription
      }
    }, 1000);
  }

  async function enterRoom(code: string, isHost: boolean) {
    setLoading(true);
    setJoinError('');
    try {
      await joinWorldRoom(code, playerName, colorId, equippedId, isHost);
      const ps = await getWorldPlayers(code);
      setMyRoomCode(code);
      setPlayers(ps);
      setPhase('lobby');
    } catch (e: any) {
      setJoinError(e.message ?? 'Could not join room');
    }
    setLoading(false);
  }

  async function handleAutoJoin() {
    setLoading(true);
    try {
      const r = await getOrCreateAutoRoom(mapId, playerName);
      setRoom(r);
      await enterRoom(r.room_code, r.host_name === playerName);
    } catch (e: any) {
      setJoinError(e.message ?? 'Could not join');
    }
    setLoading(false);
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const r = await createWorldRoom(playerName, mapId);
      setRoom(r);
      await enterRoom(r.room_code, true);
    } catch (e: any) {
      setJoinError(e.message ?? 'Could not create room');
    }
    setLoading(false);
  }

  async function handleJoinByCode() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    try {
      await enterRoom(code, false);
    } catch (e: any) {
      setJoinError('Room not found or full');
    }
    setLoading(false);
  }

  async function handleHostStart() {
    if (!myRoomCode) return;
    // Update room to countdown — all clients react
    await import('@/lib/supabase').then(({ supabase }) =>
      supabase.from('world_rooms').update({ status: 'countdown' }).eq('room_code', myRoomCode)
    );
    startCountdown();
    // After countdown, host transitions to playing
    setTimeout(async () => {
      await startWorldRoom(myRoomCode);
    }, LOBBY_COUNTDOWN_SEC * 1000);
  }

  async function handleLeave() {
    clearTimers();
    if (myRoomCode) await leaveWorldRoom(myRoomCode, playerName);
    unsubRef.current?.();
    useWorldMultiStore.getState().reset();
    setPhase('browse');
    setJoinCode('');
    setJoinError('');
    getOpenWorldRooms(mapId).then(setOpenRooms);
  }

  const isHost = room?.host_name === playerName;

  // ── Browse Phase ─────────────────────────────────────────────────────────────
  if (phase === 'browse') {
    return (
      <div className="min-h-screen flex flex-col p-5 gap-5"
        style={{ background: 'linear-gradient(160deg, #0d1f0d 0%, #1a3a1a 40%, #0d2020 100%)' }}>

        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white/50 hover:text-white font-bold text-sm transition-colors">← Back</button>
          <h1 className="text-white font-black text-xl flex-1">🌍 World Multiplayer</h1>
        </div>

        {joinError && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-2xl px-4 py-2 text-red-300 text-sm font-bold">
            ⚠️ {joinError}
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={handleAutoJoin} disabled={loading}
            className="py-4 rounded-2xl font-black text-white text-sm transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            ⚡ Quick Join<br />
            <span className="font-medium text-xs text-white/70">Auto-match a room</span>
          </button>

          <button onClick={handleCreate} disabled={loading}
            className="py-4 rounded-2xl font-black text-white text-sm transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            ➕ Create Room<br />
            <span className="font-medium text-xs text-white/70">Get a room code</span>
          </button>

          <div className="flex gap-2 items-center bg-white/10 border border-white/10 rounded-2xl px-4">
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE" maxLength={5}
              className="flex-1 bg-transparent text-white font-black text-center text-lg tracking-widest outline-none placeholder:text-white/20"
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()} />
            <button onClick={handleJoinByCode} disabled={!joinCode.trim() || loading}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white font-black rounded-xl text-sm transition-colors disabled:opacity-30">
              Join →
            </button>
          </div>
        </div>

        {/* Open rooms list */}
        <div className="flex-1 space-y-3">
          <h2 className="text-white/60 text-xs font-black uppercase tracking-widest">
            Open Rooms ({openRooms.length})
          </h2>
          {openRooms.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No open rooms — create one!</p>
          ) : openRooms.map(r => (
            <motion.div key={r.id} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-4 bg-white/8 border border-white/10 rounded-2xl px-5 py-3">
              <div>
                <div className="text-white font-black text-sm">{r.host_name}'s room</div>
                <div className="text-white/40 text-[10px] font-bold tracking-widest">{r.room_code}</div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-emerald-400 text-xs font-bold">
                  {r.player_count}/{r.max_players} players
                </span>
                <button onClick={() => { setRoom(r); enterRoom(r.room_code, false); }} disabled={loading}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white font-black text-sm rounded-xl transition-colors disabled:opacity-30">
                  Join
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ── Lobby Phase ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col p-5 gap-5"
      style={{ background: 'linear-gradient(160deg, #0d1f0d 0%, #1a3a1a 40%, #0d2020 100%)' }}>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={handleLeave} className="text-white/50 hover:text-white font-bold text-sm transition-colors">← Leave</button>
        <h1 className="text-white font-black text-xl flex-1">🌍 Game Lobby</h1>
        <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-center">
          <div className="text-[9px] text-white/40 font-black uppercase tracking-widest">Room Code</div>
          <div className="text-white font-black text-lg tracking-[0.3em]">{myRoomCode}</div>
        </div>
      </div>

      {/* Countdown banner */}
      <AnimatePresence>
        {countdownLive > 0 && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-4 text-center">
            <div className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Game starting in</div>
            <div className="text-emerald-400 font-black text-5xl">{countdownLive}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Players */}
      <div className="flex-1 space-y-2">
        <div className="text-white/60 text-xs font-black uppercase tracking-widest">
          Players ({players.length}/{WORLD_ROOM_CAPACITY})
        </div>
        <AnimatePresence>
          {players.map(p => (
            <motion.div key={p.player_name}
              initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              <PlayerChip p={p} />
            </motion.div>
          ))}
        </AnimatePresence>
        {/* Empty slots */}
        {Array.from({ length: Math.max(0, WORLD_ROOM_CAPACITY - players.length) }).map((_, i) => (
          <div key={i} className="bg-white/5 border border-white/5 border-dashed rounded-2xl px-4 py-3
            text-white/20 text-sm font-bold text-center">
            Waiting for player…
          </div>
        ))}
      </div>

      {/* Host controls */}
      {isHost && countdownLive === 0 && (
        <div className="space-y-3">
          <p className="text-white/40 text-xs text-center">
            {players.length < 2 ? 'Waiting for at least 2 players…' : 'Ready to start!'}
          </p>
          <button
            onClick={handleHostStart}
            disabled={players.length < 1} // allow solo testing too
            className="w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-105 disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            🚀 Start Game Now
          </button>
          <p className="text-white/30 text-[10px] text-center">
            Or wait — game auto-starts when the host clicks Start.
          </p>
        </div>
      )}
      {!isHost && (
        <p className="text-white/40 text-xs text-center pb-2">
          Waiting for the host to start the game…
        </p>
      )}
    </div>
  );
}
