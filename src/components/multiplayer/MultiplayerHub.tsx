"use client";
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { playSound } from '@/lib/sounds';
import {
  createGameRoom, getOpenRooms, deleteGameRoom,
  setRoomPlaying, incrementRoomPlayers, GameRoom,
} from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { ALL_GAMES, GameConfig } from '@/lib/gameConfigs';
import { OwlMini } from '@/components/game/OwlCharacter';

// ─── Game filter tab ──────────────────────────────────────────────────────────

const ALL_TAB = { id: 'all', title: 'All Games', emoji: '🎮' };

// ─── Time-ago helper ──────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

// ─── Room card ────────────────────────────────────────────────────────────────

function RoomCard({ room, onJoin, gameConfig }: {
  room: GameRoom;
  gameConfig: GameConfig | undefined;
  onJoin: (room: GameRoom) => void;
}) {
  const isFull = room.player_count >= 2;
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex items-center gap-4 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl px-4 py-3 transition-colors"
    >
      <div className="text-3xl">{room.host_avatar}</div>
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold truncate">{room.host_name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-white/50 text-xs">{gameConfig?.emoji} {gameConfig?.title}</span>
          <span className="text-white/30 text-xs">·</span>
          <span className="text-white/40 text-xs">{timeAgo(room.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          isFull ? 'bg-red-500/30 text-red-300' : 'bg-emerald-500/30 text-emerald-300'
        }`}>
          {room.player_count}/2
        </span>
        <button
          onClick={() => !isFull && onJoin(room)}
          disabled={isFull}
          className="px-4 py-1.5 bg-white text-slate-800 font-black text-sm rounded-xl hover:scale-105 transition-transform disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Join
        </button>
      </div>
    </motion.div>
  );
}

// ─── Create room modal ────────────────────────────────────────────────────────

function CreateRoomModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (gameId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string>(ALL_GAMES[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      await onCreate(selected);
    } catch (e: any) {
      setError(e?.message ?? 'Could not create room. Try again.');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={() => !loading && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-slate-900 border border-white/20 rounded-3xl p-6 w-full max-w-sm"
      >
        <h3 className="text-xl font-black text-white mb-4">Create a Room</h3>
        <p className="text-white/50 text-sm mb-4">Pick which game to play:</p>
        <div className="space-y-2 mb-6">
          {ALL_GAMES.map(g => (
            <button key={g.id} onClick={() => !loading && setSelected(g.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                selected === g.id ? 'bg-white text-slate-800' : 'bg-white/10 text-white hover:bg-white/15'
              }`}>
              <span className="text-xl">{g.emoji}</span>
              {g.title}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2 mb-4 text-red-300 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/15 transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 py-3 text-white font-black rounded-xl hover:scale-105 transition-transform disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            {loading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Creating...
              </>
            ) : 'Create 🚀'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Waiting room ─────────────────────────────────────────────────────────────

function WaitingRoom({ roomCode, gameConfig, onStart, onLeave }: {
  roomCode: string;
  gameConfig: GameConfig;
  onStart: () => void;
  onLeave: () => void;
}) {
  const { roomData, playerName } = useGameStore();
  const players: { id: string; name: string; avatar?: string; score: number }[] = roomData?.players ?? [];
  const amHost = players[0]?.name === playerName;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-6 w-full max-w-md mx-auto">

      <div className="text-center mb-5">
        <div className="text-4xl mb-2">{gameConfig.emoji}</div>
        <h3 className="text-xl font-black text-white">{gameConfig.title}</h3>
        <p className="text-white/50 text-sm">Waiting for players to join...</p>
      </div>

      {/* Room code */}
      <div className="bg-white/10 border-2 border-dashed border-white/30 rounded-2xl p-4 text-center mb-5">
        <p className="text-white/50 text-xs font-medium mb-1">Share this code</p>
        <div className="text-3xl font-black text-white tracking-widest">{roomCode}</div>
      </div>

      {/* Players */}
      <div className="space-y-2 mb-5">
        {players.map((p, i) => (
          <motion.div key={p.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
            <OwlMini size={32} />
            <span className="text-white font-bold flex-1">{p.name}</span>
            {i === 0 && <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">Host</span>}
          </motion.div>
        ))}
        {players.length === 1 && (
          <div className="flex items-center gap-3 bg-white/5 border border-dashed border-white/20 rounded-xl px-4 py-3">
            <motion.span animate={{ opacity: [0.3,1,0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}
              className="text-2xl">👤</motion.span>
            <span className="text-white/30 italic text-sm">Waiting for opponent...</span>
          </div>
        )}
      </div>

      {amHost ? (
        <button onClick={onStart} disabled={players.length < 2}
          className="w-full py-4 text-white font-black text-lg rounded-2xl hover:scale-105 transition-transform shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 mb-3"
          style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
          {players.length < 2 ? '⏳ Need an opponent...' : '🚀 Start Battle!'}
        </button>
      ) : (
        <p className="text-center text-white/40 text-sm font-medium mb-3">Waiting for host to start...</p>
      )}

      <button onClick={onLeave}
        className="w-full py-2 text-white/30 hover:text-white/60 font-medium text-sm transition-colors">
        ← Leave Room
      </button>
    </motion.div>
  );
}

// ─── Main MultiplayerHub ──────────────────────────────────────────────────────

interface Props {
  onGameStart: (gameId: string) => void;
  onBack: () => void;
}

export function MultiplayerHub({ onGameStart, onBack }: Props) {
  const { playerName, connectSocket, joinRoom, startGameMultiplayer, roomId, roomData, clearRoom } = useGameStore();

  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [activeRoom, setActiveRoom] = useState<{ code: string; gameId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const gameConfigMap = Object.fromEntries(ALL_GAMES.map(g => [g.id, g]));

  // Connect socket once
  useEffect(() => { connectSocket(); }, [connectSocket]);

  // Watch for game_started event
  useEffect(() => {
    if (roomData?.gameState === 'playing' && activeRoom) {
      onGameStart(activeRoom.gameId);
    }
  }, [roomData?.gameState, activeRoom, onGameStart]);

  // Load rooms with error visibility
  const loadRooms = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const { rooms: data, error } = await getOpenRooms();
    if (error) {
      console.error('Room list error:', error);
      setRoomsError(error);
    } else {
      setRoomsError(null);
      setRooms(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadRooms();

    // Supabase Realtime for instant updates
    const channel = supabase
      .channel('game-rooms-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms' }, () => loadRooms())
      .subscribe();

    // Polling fallback every 4s in case Realtime isn't enabled
    const poll = setInterval(() => loadRooms(), 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [loadRooms]);

  // Update player count in supabase when socket room data changes
  useEffect(() => {
    if (activeRoom && roomData?.players) {
      incrementRoomPlayers(activeRoom.code, roomData.players.length).catch(() => {});
    }
  }, [roomData?.players?.length, activeRoom]);

  const handleCreate = async (gameId: string) => {
    const avatar = '';
    let roomCode: string;

    try {
      // Try Supabase first (enables live room browser)
      const room = await createGameRoom(playerName, avatar, gameId);
      roomCode = room.room_code;
    } catch (e: any) {
      // Fallback: local code only — game still works via Socket.io
      console.warn('Supabase room creation failed, using local fallback:', e?.message);
      if (e?.message?.includes('does not exist') || e?.code === '42P01') {
        throw new Error('game_rooms table missing in Supabase. Run the SQL setup first.');
      }
      roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    joinRoom(roomCode);
    setActiveRoom({ code: roomCode, gameId });
    setShowCreate(false);
    playSound('click');
  };

  const handleJoin = async (room: GameRoom) => {
    joinRoom(room.room_code);
    setActiveRoom({ code: room.room_code, gameId: room.game_id });
    playSound('click');
  };

  const handleLeave = async () => {
    if (activeRoom) {
      // If host leaving, delete the room
      const players: any[] = roomData?.players ?? [];
      if (players[0]?.name === playerName) {
        await deleteGameRoom(activeRoom.code);
      }
    }
    clearRoom();
    setActiveRoom(null);
  };

  const handleStart = () => {
    if (!activeRoom) return;
    const config = gameConfigMap[activeRoom.gameId];
    setRoomPlaying(activeRoom.code);
    startGameMultiplayer({ focusNumber: 5, gameId: activeRoom.gameId });
    playSound('go');
  };

  const tabs = [ALL_TAB, ...ALL_GAMES.map(g => ({ id: g.id, title: g.title, emoji: g.emoji }))];
  const filteredRooms = filter === 'all' ? rooms : rooms.filter(r => r.game_id === filter);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <button onClick={onBack}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors">
          ← Hub
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-white">⚔️ Math Duels</h1>
          <p className="text-white/40 text-sm">Challenge a classmate in real-time</p>
        </div>
        {/* Player badge */}
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <OwlMini size={28} />
          <span className="text-white font-bold text-sm">{playerName}</span>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6">
        <AnimatePresence mode="wait">

          {/* ── Waiting room ── */}
          {activeRoom && (
            <motion.div key="waiting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex justify-center mt-4">
              <WaitingRoom
                roomCode={activeRoom.code}
                gameConfig={gameConfigMap[activeRoom.gameId]}
                onStart={handleStart}
                onLeave={handleLeave}
              />
            </motion.div>
          )}

          {/* ── Room browser ── */}
          {!activeRoom && (
            <motion.div key="browser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Create + Refresh buttons */}
              <div className="flex justify-between items-center mb-4">
                <button onClick={() => loadRooms(true)} disabled={refreshing}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/70 text-sm font-bold rounded-xl transition-colors disabled:opacity-40">
                  <motion.span animate={refreshing ? { rotate: 360 } : {}}
                    transition={{ repeat: refreshing ? Infinity : 0, duration: 0.8 }}>
                    🔄
                  </motion.span>
                  Refresh
                </button>
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-5 py-2.5 text-white font-black text-sm rounded-xl hover:scale-105 transition-transform shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
                  + Create Room
                </button>
              </div>

              {/* Game filter tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setFilter(t.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                      filter === t.id
                        ? 'bg-white text-slate-800'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}>
                    <span>{t.emoji}</span>
                    <span className="hidden sm:inline">{t.title}</span>
                  </button>
                ))}
              </div>

              {/* Room list */}
              <div className="space-y-3">
                {loading && (
                  <div className="text-center py-10">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
                      className="w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto" />
                  </div>
                )}

                {/* Error state */}
                {!loading && roomsError && (
                  <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-5 text-center">
                    <p className="text-red-400 font-bold mb-1">⚠️ Can't load rooms</p>
                    <p className="text-red-300/70 text-xs mb-3 break-all">{roomsError}</p>
                    <p className="text-white/40 text-xs">Make sure you ran the game_rooms SQL in Supabase and enabled RLS policies.</p>
                  </div>
                )}

                {!loading && !roomsError && filteredRooms.length === 0 && (
                  <div className="text-center py-14">
                    <div className="text-5xl mb-3">🏜️</div>
                    <p className="text-white/50 font-medium">No open rooms right now</p>
                    <p className="text-white/30 text-sm mt-1">Create one and invite a friend!</p>
                  </div>
                )}

                <AnimatePresence>
                  {!roomsError && filteredRooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      gameConfig={gameConfigMap[room.game_id]}
                      onJoin={handleJoin}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create room modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateRoomModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        )}
      </AnimatePresence>
    </div>
  );
}
