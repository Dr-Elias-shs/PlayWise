"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { playSound } from '@/lib/sounds';

const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const TABLE_COLORS = [
  'from-violet-500 to-purple-600', 'from-pink-500 to-rose-500',
  'from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500',
  'from-blue-500 to-cyan-500',    'from-fuchsia-500 to-pink-500',
  'from-red-500 to-rose-600',     'from-indigo-500 to-violet-600',
  'from-green-400 to-emerald-500',
];

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

interface Props {
  onGameStart: () => void;
  onBack: () => void;
}

export function GameLobby({ onGameStart, onBack }: Props) {
  const { playerName, connectSocket, joinRoom, startGameMultiplayer, roomId, roomData, setFocusNumber, resetGame } = useGameStore();
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [focusNum, setFocusNum] = useState(5);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  // Connect socket once on mount
  useEffect(() => { connectSocket(); }, [connectSocket]);

  // When game starts (host broadcasts start_game), move to game
  useEffect(() => {
    if (roomData?.gameState === 'playing') {
      onGameStart();
    }
  }, [roomData?.gameState, onGameStart]);

  const handleCreate = () => {
    setError('');
    const code = generateCode();
    resetGame();
    setFocusNumber(focusNum);
    joinRoom(code);          // uses code as roomId
    playSound('click');
    setMode('create');       // switches to waiting view (roomId now set)
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) { setError('Enter the room code your friend shared.'); return; }
    setError('');
    resetGame();
    joinRoom(code);
    playSound('click');
  };

  const handleStartGame = () => {
    startGameMultiplayer({ focusNumber: focusNum });
    playSound('go');
  };

  const players: { id: string; name: string; score: number }[] = roomData?.players ?? [];
  const isHost = players[0]?.id !== undefined && roomData?.gameState === 'waiting';
  const amHost = players.length > 0 && players[0]?.name === playerName;

  // ── Waiting room (after create or join) ──
  if (roomId && roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-purple-900 flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-8 w-full max-w-md">

          <div className="text-center mb-6">
            <div className="text-4xl mb-2">⚔️</div>
            <h2 className="text-2xl font-black text-white">
              {roomData.gameState === 'waiting' ? 'Waiting for players...' : 'Game starting!'}
            </h2>
          </div>

          {/* Room code display */}
          <div className="bg-white/10 border-2 border-dashed border-white/30 rounded-2xl p-5 text-center mb-6">
            <p className="text-white/50 text-sm font-medium mb-1">Share this code</p>
            <div className="text-4xl font-black text-white tracking-widest">{roomId}</div>
          </div>

          {/* Players list */}
          <div className="space-y-3 mb-6">
            {players.map((p, i) => (
              <motion.div key={p.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-black text-sm">
                  {p.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <span className="text-white font-bold">{p.name}</span>
                {i === 0 && <span className="ml-auto text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">Host</span>}
                {p.name === playerName && i !== 0 && <span className="ml-auto text-xs text-white/40 font-medium">You</span>}
              </motion.div>
            ))}
            {players.length === 1 && (
              <div className="flex items-center gap-3 bg-white/5 border border-dashed border-white/20 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <motion.div animate={{ opacity: [0.3,1,0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}
                    className="w-2 h-2 rounded-full bg-white/40" />
                </div>
                <span className="text-white/30 font-medium text-sm italic">Waiting for opponent...</span>
              </div>
            )}
          </div>

          {/* Start button (host only, needs 2+ players) */}
          {amHost && (
            <button
              onClick={handleStartGame}
              disabled={players.length < 2}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-lg rounded-2xl hover:scale-105 transition-transform shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 mb-3"
            >
              {players.length < 2 ? '⏳ Need an opponent...' : '🚀 Start Battle!'}
            </button>
          )}
          {!amHost && (
            <p className="text-center text-white/50 text-sm font-medium mb-3">Waiting for host to start...</p>
          )}

          <button onClick={onBack} className="w-full py-3 text-white/40 hover:text-white/70 font-medium transition-colors text-sm">
            ← Leave Room
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Mode selection ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-900 to-purple-900 flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-8 w-full max-w-md">

        <AnimatePresence mode="wait">

          {/* ── Pick mode ── */}
          {mode === 'select' && (
            <motion.div key="select" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
              <div className="text-center mb-8">
                <div className="text-5xl mb-3">⚔️</div>
                <h2 className="text-3xl font-black text-white">Math Duel</h2>
                <p className="text-white/50 mt-1">Challenge a classmate to a live battle</p>
              </div>
              <div className="space-y-4">
                <button onClick={() => setMode('create')}
                  className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-lg rounded-2xl hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-3">
                  🏰 Create a Room
                </button>
                <button onClick={() => setMode('join')}
                  className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-lg rounded-2xl hover:scale-105 transition-transform shadow-lg flex items-center justify-center gap-3">
                  🚀 Join a Room
                </button>
                <button onClick={onBack} className="w-full py-3 text-white/40 hover:text-white/70 font-medium transition-colors text-sm">
                  ← Back to Hub
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Create room: pick table ── */}
          {mode === 'create' && !roomId && (
            <motion.div key="create" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <button onClick={() => setMode('select')} className="text-white/40 hover:text-white/70 text-sm font-medium mb-5 flex items-center gap-1">
                ← Back
              </button>
              <h2 className="text-2xl font-black text-white mb-2">🏰 Create Room</h2>
              <p className="text-white/50 text-sm mb-6">Pick a times table for the battle:</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {TABLES.map((n, i) => (
                  <button key={n} onClick={() => setFocusNum(n)}
                    className={`py-4 rounded-xl font-black text-xl transition-all ${focusNum === n
                      ? `bg-gradient-to-br ${TABLE_COLORS[i]} text-white scale-105 shadow-lg`
                      : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                    {n}×
                  </button>
                ))}
              </div>

              <button onClick={handleCreate}
                className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-lg rounded-2xl hover:scale-105 transition-transform shadow-lg">
                🚀 Create Room!
              </button>
            </motion.div>
          )}

          {/* ── Join room ── */}
          {mode === 'join' && !roomId && (
            <motion.div key="join" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
              <button onClick={() => setMode('select')} className="text-white/40 hover:text-white/70 text-sm font-medium mb-5 flex items-center gap-1">
                ← Back
              </button>
              <h2 className="text-2xl font-black text-white mb-2">🚀 Join a Room</h2>
              <p className="text-white/50 text-sm mb-6">Ask your friend for their room code:</p>

              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                maxLength={8}
                className="w-full text-center text-3xl font-black text-white bg-white/10 border-2 border-white/20 focus:border-violet-400 rounded-2xl py-4 outline-none tracking-widest placeholder-white/20 mb-2"
              />
              {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}

              <button onClick={handleJoin} disabled={joinCode.length < 4}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-lg rounded-2xl hover:scale-105 transition-transform shadow-lg disabled:opacity-40 mt-3">
                ⚡ Join Battle!
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
