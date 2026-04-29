"use client";
import { useGameStore } from '@/store/useGameStore';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldStore } from '@/store/useWorldStore';
import { useWorldMultiStore } from '@/store/useWorldMultiStore';

import { COLORS, ACCESSORIES, itemTopFraction } from '@/lib/avatar-items';

// ── Animated lobby scene ──────────────────────────────────────────────────────

const SCENE_CHARS = [
  { colorId: 'blue',   accEmoji: '👑',  startX: 8,  speed: 38, size: 56, delay: 0    },
  { colorId: 'red',    accEmoji: '🎩',  startX: 55, speed: 52, size: 48, delay: 1.2  },
  { colorId: 'purple', accEmoji: '⭐',  startX: 30, speed: 44, size: 60, delay: 0.5  },
  { colorId: 'yellow', accEmoji: '🎓',  startX: 70, speed: 35, size: 52, delay: 2.1  },
  { colorId: 'pink',   accEmoji: '🎀',  startX: 20, speed: 48, size: 44, delay: 0.8  },
  { colorId: 'teal',   accEmoji: '⚡',  startX: 82, speed: 40, size: 50, delay: 1.7  },
  { colorId: 'orange', accEmoji: '🕶️', startX: 45, speed: 56, size: 46, delay: 3.0  },
  { colorId: 'green',  accEmoji: null,  startX: 62, speed: 42, size: 54, delay: 1.4  },
];

function LobbyScene() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 3), 160);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-white/10"
      style={{ height: 130, background: 'linear-gradient(180deg, #1a3a1a 0%, #0f2a0f 60%, #0a1a0a 100%)' }}>

      {/* Ground line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />

      {/* Map thumbnail in background */}
      <img src="/maps/floor_map.png" alt="" draggable={false}
        className="absolute inset-0 w-full h-full object-cover opacity-[0.07] pointer-events-none" />

      {/* Walking characters */}
      {SCENE_CHARS.map((ch, i) => {
        const color = COLORS.find(c => c.id === ch.colorId);
        return (
          <motion.div
            key={i}
            initial={{ x: `${ch.startX}%` }}
            animate={{ x: [`${ch.startX}%`, `${(ch.startX + 70) % 110 - 10}%`] }}
            transition={{
              duration: ch.speed,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
              delay: ch.delay,
            }}
            style={{
              position: 'absolute',
              bottom: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {ch.accEmoji && (
              <span style={{ fontSize: ch.size * 0.35, lineHeight: 1, marginBottom: 1 }}>
                {ch.accEmoji}
              </span>
            )}
            <img
              src={`/character/walk${frame + 1}.png`}
              alt=""
              draggable={false}
              style={{
                height: ch.size,
                filter: color?.filter ?? '',
                imageRendering: 'pixelated',
              }}
            />
          </motion.div>
        );
      })}

      {/* Overlay text */}
      <div className="absolute inset-0 flex items-start justify-center pt-3 pointer-events-none">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/80 text-xs font-black uppercase tracking-widest"
        >
          🌍 PlayWise World — Gathering Players…
        </motion.div>
      </div>
    </div>
  );
}
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
  const acc    = ACCESSORIES.find(a => a.id === p.equipped_id) ?? null;
  const H      = 40;
  const fs     = Math.round(H * 0.30);
  return (
    <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
      <div className="relative flex-shrink-0" style={{ width: H, height: H }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/character/walk2.png" alt="" draggable={false}
          style={{ width: H, height: H, objectFit: 'contain', filter: color?.filter ?? '' }} />
        {acc && (
          <span style={{
            position: 'absolute',
            top:       itemTopFraction(acc) * H,
            left:      `calc(50% + ${acc.xOffset ?? 0}px)`,
            transform: 'translateX(-50%)',
            fontSize:  fs,
            lineHeight: 1,
            pointerEvents: 'none',
          }}>{acc.emoji}</span>
        )}
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
  const { colorId, equippedId } = useGameStore();
  const { setRoom, setPlayers, setMyRoomCode, room, players } = useWorldMultiStore();

  const [openRooms,    setOpenRooms]    = useState<WorldRoom[]>([]);
  const [joinCode,     setJoinCode]     = useState('');
  const [joinError,    setJoinError]    = useState('');
  const [phase,        setPhase]        = useState<'browse' | 'lobby'>('browse');
  const [loading,      setLoading]      = useState(false);
  const [countdownLive, setCountdownLive] = useState(0);
  const [autoStart,    setAutoStart]    = useState(0);  // counts down to auto-start

  const unsubRef      = useRef<(() => void) | null>(null);
  const cdTimerRef    = useRef<NodeJS.Timeout | null>(null);
  const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const myRoomCode    = useWorldMultiStore(s => s.myRoomCode);

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
    if (autoTimerRef.current)  clearInterval(autoTimerRef.current);
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

  // Any player can start — idempotent if multiple clients call simultaneously
  async function handleStart(code?: string) {
    const room = code ?? myRoomCode;
    if (!room) return;
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('world_rooms')
      .update({ status: 'countdown' })
      .eq('room_code', room)
      .neq('status', 'playing'); // skip if already launched
    startCountdown();
    setTimeout(() => startWorldRoom(room), LOBBY_COUNTDOWN_SEC * 1000);
  }

  // Auto-start countdown — begins as soon as player enters lobby
  useEffect(() => {
    if (phase !== 'lobby') return;
    const AUTO_SECS = 30;
    setAutoStart(AUTO_SECS);
    let remaining = AUTO_SECS;
    autoTimerRef.current = setInterval(() => {
      remaining--;
      setAutoStart(remaining);
      if (remaining <= 0) {
        clearInterval(autoTimerRef.current!);
        handleStart();
      }
    }, 1000);
    return () => { if (autoTimerRef.current) clearInterval(autoTimerRef.current); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

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

        <LobbyScene />

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

      {/* Animated scene — shrinks to make room for countdown */}
      <AnimatePresence mode="wait">
        {countdownLive > 0 ? (
          <motion.div key="countdown"
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-2xl overflow-hidden border border-emerald-400/40 relative"
            style={{ background: 'linear-gradient(180deg, #064e3b 0%, #052e16 100%)' }}>
            {/* Scene still plays but dimmed behind the countdown */}
            <div className="opacity-40 pointer-events-none">
              <LobbyScene />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-white/70 text-xs font-black uppercase tracking-widest mb-1">Game starting in</div>
              <motion.div
                key={countdownLive}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-emerald-400 font-black"
                style={{ fontSize: 72, lineHeight: 1 }}
              >
                {countdownLive}
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="scene" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <LobbyScene />
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

      {/* Start controls — visible to everyone */}
      {countdownLive === 0 && (
        <div className="space-y-2">
          <button
            onClick={() => handleStart()}
            className="w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
            🚀 Start Game Now
          </button>
          {autoStart > 0 && (
            <p className="text-white/40 text-[11px] text-center">
              Auto-starts in {autoStart}s — or tap Start to begin immediately
            </p>
          )}
        </div>
      )}
    </div>
  );
}
