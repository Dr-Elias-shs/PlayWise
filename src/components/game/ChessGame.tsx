"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { PieceDropHandlerArgs, SquareHandlerArgs, PieceHandlerArgs } from 'react-chessboard/dist/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { addCoins } from '@/lib/wallet';
import { getBestMove, AIDifficulty } from '@/lib/chess-ai';
import { updateChessScore, getChessLeaderboard, ChessScoreRow } from '@/lib/chess-scores';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode    = 'menu' | 'ai' | 'mp-lobby' | 'mp-waiting' | 'playing-ai' | 'playing-mp' | 'done';
type Winner  = 'player' | 'ai' | 'opponent' | 'draw' | null;

const COINS_WIN  = 80;
const COINS_DRAW = 20;

const BG = 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)';

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-black"
      style={{ background: color, color: '#fff' }}>
      {text}
    </span>
  );
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

const MEDAL = ['🥇', '🥈', '🥉'];

function ModeMenu({ onSelectAI, onSelectMP, onBack }: {
  onSelectAI: () => void;
  onSelectMP: () => void;
  onBack: () => void;
}) {
  const [rows, setRows]       = useState<ChessScoreRow[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    getChessLeaderboard(20).then(data => { setRows(data); setLbLoading(false); });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 overflow-y-auto" style={{ background: BG }}>
      <div className="w-full max-w-sm space-y-5 py-8">

        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-3">♟️</div>
          <h2 className="text-3xl font-black text-white">Chess</h2>
          <p className="text-white/50 mt-1">Choose your mode</p>
        </div>

        {/* Mode buttons */}
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={onSelectAI}
          className="w-full p-5 rounded-3xl border border-white/10 text-left transition-all hover:border-white/30"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="text-3xl mb-2">🤖</div>
          <div className="text-white font-black text-lg">vs Computer</div>
          <div className="text-white/40 text-sm mt-0.5">Practice against the AI — choose difficulty</div>
        </motion.button>

        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={onSelectMP}
          className="w-full p-5 rounded-3xl border border-white/10 text-left transition-all hover:border-white/30"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="text-3xl mb-2">⚔️</div>
          <div className="text-white font-black text-lg">vs Friend</div>
          <div className="text-white/40 text-sm mt-0.5">Create or join a room and play a classmate</div>
        </motion.button>

        {/* Chess Leaderboard */}
        <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="px-4 py-3 flex items-center gap-2 border-b border-white/10"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <span className="text-lg">🏆</span>
            <span className="text-white font-black text-sm tracking-wide">TOP CHESS PLAYERS</span>
          </div>

          {lbLoading && (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white/70" />
            </div>
          )}

          {!lbLoading && rows.length === 0 && (
            <p className="text-center text-white/30 text-xs py-6">No games played yet — be the first!</p>
          )}

          {!lbLoading && rows.length > 0 && (
            <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
              {rows.map((r, i) => {
                const total = r.wins + r.losses + r.draws;
                const winPct = total > 0 ? Math.round((r.wins / total) * 100) : 0;
                return (
                  <div key={r.student_name} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-base w-6 text-center shrink-0">
                      {i < 3 ? MEDAL[i] : <span className="text-white/30 text-xs font-black">#{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-bold text-sm truncate">{r.display_name || r.student_name}</span>
                        {r.win_streak >= 3 && (
                          <span className="text-orange-400 text-xs font-black">🔥{r.win_streak}</span>
                        )}
                      </div>
                      <div className="text-white/30 text-[10px] font-semibold">
                        {r.wins}W · {r.losses}L · {r.draws}D
                        <span className="ml-1.5 text-white/20">({winPct}%)</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-amber-400 font-black text-sm">{r.rating}</div>
                      <div className="text-white/20 text-[9px] font-bold">ELO</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button onClick={onBack} className="w-full text-white/30 hover:text-white/60 font-medium text-sm transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─── AI difficulty picker ─────────────────────────────────────────────────────

function AIPicker({ onSelect, onBack }: {
  onSelect: (d: AIDifficulty) => void;
  onBack: () => void;
}) {
  const LEVELS: { id: AIDifficulty; label: string; desc: string; color: string }[] = [
    { id: 'easy',   label: 'Easy',   desc: 'Makes random-ish moves — great for beginners', color: '#22c55e' },
    { id: 'medium', label: 'Medium', desc: 'Thinks 2 moves ahead — a real challenge',       color: '#f59e0b' },
    { id: 'hard',   label: 'Hard',   desc: 'Thinks 3 moves ahead — tough opponent',         color: '#ef4444' },
  ];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BG }}>
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🤖</div>
          <h2 className="text-2xl font-black text-white">Pick Difficulty</h2>
        </div>
        {LEVELS.map((l, i) => (
          <motion.button key={l.id}
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.07 }}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(l.id)}
            className="w-full p-4 rounded-2xl border-2 text-left"
            style={{ borderColor: l.color + '55', background: l.color + '18' }}>
            <div className="font-black text-white text-base">{l.label}</div>
            <div className="text-white/50 text-xs mt-0.5">{l.desc}</div>
          </motion.button>
        ))}
        <button onClick={onBack} className="w-full text-white/30 hover:text-white/60 font-medium text-sm transition-colors pt-2">
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─── Multiplayer lobby ────────────────────────────────────────────────────────

interface ChessRoom { room_code: string; host_name: string; created_at: string; }

function MPLobby({ playerName, onJoined, onBack }: {
  playerName: string;
  onJoined: (roomCode: string, color: 'w' | 'b') => void;
  onBack: () => void;
}) {
  const [tab,       setTab]       = useState<'create' | 'join'>('create');
  const [codeInput, setCodeInput] = useState('');
  const [status,    setStatus]    = useState('');
  const [busy,      setBusy]      = useState(false);
  const [rooms,     setRooms]     = useState<ChessRoom[]>([]);

  const fetchRooms = async () => {
    const { data } = await supabase
      .from('chess_rooms')
      .select('room_code, host_name, created_at')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(10);
    setRooms((data as ChessRoom[]) ?? []);
  };

  useEffect(() => {
    fetchRooms();
    const id = setInterval(fetchRooms, 3000);
    return () => clearInterval(id);
  }, []);

  const newCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();

  const handleCreate = async () => {
    const code = newCode();
    setBusy(true);
    setStatus('Creating room…');
    const { error } = await supabase.from('chess_rooms').upsert({
      room_code: code,
      host_name: playerName,
      status: 'waiting',
      fen: new Chess().fen(),
      white_name: playerName,
      black_name: null,
      created_at: new Date().toISOString(),
    });
    if (error) { setStatus(`Error: ${error.message}`); setBusy(false); return; }
    onJoined(code, 'w');
  };

  const doJoin = async (code: string) => {
    setBusy(true);
    setStatus('Joining…');
    const { data, error } = await supabase
      .from('chess_rooms').select('*').eq('room_code', code).eq('status', 'waiting').maybeSingle();
    if (error || !data) { setStatus('Room not found or already started.'); setBusy(false); return; }
    await supabase.from('chess_rooms').update({ black_name: playerName, status: 'playing' }).eq('room_code', code);
    onJoined(code, 'b');
  };

  const handleJoin = () => {
    if (!codeInput.trim()) { setStatus('Enter a room code'); return; }
    doJoin(codeInput.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BG }}>
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center mb-2">
          <div className="text-4xl mb-2">⚔️</div>
          <h2 className="text-2xl font-black text-white">Multiplayer Chess</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['create', 'join'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl font-black text-sm transition-all ${
                tab === t ? 'bg-white text-slate-800' : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}>
              {t === 'create' ? '➕ Create Room' : '🔗 Join Room'}
            </button>
          ))}
        </div>

        {tab === 'create' && (
          <div className="space-y-3">
            <p className="text-white/50 text-sm text-center">A room code will be generated — share it with your friend.</p>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={handleCreate} disabled={busy}
              className="w-full py-3 rounded-2xl font-black text-white text-base disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
              {busy ? 'Creating…' : 'Create Room'}
            </motion.button>
          </div>
        )}

        {tab === 'join' && (
          <div className="space-y-4">
            {/* Open rooms list */}
            {rooms.length > 0 && (
              <div className="space-y-2">
                <p className="text-white/40 text-xs font-black uppercase tracking-wider">Open Rooms</p>
                {rooms.map(r => (
                  <div key={r.room_code}
                    className="flex items-center justify-between bg-white/8 border border-white/10 rounded-2xl px-4 py-3">
                    <div>
                      <div className="text-white font-black text-sm">{r.host_name}</div>
                      <div className="text-white/40 text-xs font-bold tracking-widest">{r.room_code}</div>
                    </div>
                    <motion.button whileTap={{ scale: 0.95 }}
                      onClick={() => doJoin(r.room_code)} disabled={busy}
                      className="px-4 py-1.5 rounded-xl font-black text-sm text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}>
                      Join
                    </motion.button>
                  </div>
                ))}
              </div>
            )}
            {rooms.length === 0 && (
              <p className="text-white/30 text-sm text-center py-2">No open rooms yet — ask a friend to create one!</p>
            )}

            {/* Manual code entry */}
            <div className="space-y-2">
              <p className="text-white/40 text-xs font-black uppercase tracking-wider">Or enter a code</p>
              <input
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="XXXXX"
                maxLength={6}
                className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white font-black text-center text-xl placeholder-white/30 tracking-widest outline-none focus:border-violet-400"
              />
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={handleJoin} disabled={busy}
                className="w-full py-3 rounded-2xl font-black text-white text-base disabled:opacity-50 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}>
                {busy ? 'Joining…' : 'Join by Code'}
              </motion.button>
            </div>
          </div>
        )}

        {status && (
          <p className="text-center text-sm font-medium" style={{ color: status.startsWith('Error') || status === 'Room not found or already started.' ? '#fca5a5' : '#86efac' }}>
            {status}
          </p>
        )}

        <button onClick={onBack} className="w-full text-white/30 hover:text-white/60 font-medium text-sm transition-colors pt-2">
          ← Back
        </button>
      </div>
    </div>
  );
}

// ─── Waiting room (host waits for opponent) ───────────────────────────────────

function MPWaiting({ roomCode, onOpponentJoined, onBack }: {
  roomCode: string;
  onOpponentJoined: () => void;
  onBack: () => void;
}) {
  const [joiner, setJoiner] = useState<string | null>(null);

  useEffect(() => {
    const ch = supabase.channel(`chess-room-${roomCode}`)
      .on('broadcast', { event: 'joined' }, ({ payload }) => {
        setJoiner(payload?.joiner ?? 'Opponent');
        setTimeout(() => onOpponentJoined(), 800);
      })
      .subscribe();

    // Poll fallback in case broadcast missed
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('chess_rooms').select('status, black_name').eq('room_code', roomCode).maybeSingle();
      if (data?.status === 'playing') {
        setJoiner(data.black_name ?? 'Opponent');
        setTimeout(() => onOpponentJoined(), 800);
        clearInterval(poll);
      }
    }, 2000);

    return () => { supabase.removeChannel(ch); clearInterval(poll); };
  }, [roomCode, onOpponentJoined]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BG }}>
      <div className="text-center space-y-5 max-w-xs">
        <AnimatePresence mode="wait">
          {joiner ? (
            <motion.div key="joined" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="space-y-3">
              <div className="text-5xl">🎉</div>
              <h2 className="text-2xl font-black text-white">{joiner} joined!</h2>
              <p className="text-white/50 text-sm">Starting game…</p>
            </motion.div>
          ) : (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
              <div className="text-5xl">⏳</div>
              <div>
                <h2 className="text-2xl font-black text-white">Waiting for opponent…</h2>
                <p className="text-white/50 text-sm mt-1">Share this code with your friend</p>
              </div>
              <div className="bg-white/10 rounded-3xl p-6">
                <div className="text-5xl font-black text-white tracking-[0.25em]">{roomCode}</div>
              </div>
              <div className="w-8 h-8 border-4 border-violet-400/30 border-t-violet-400 rounded-full animate-spin mx-auto" />
              <button onClick={onBack} className="text-white/30 hover:text-white/60 font-medium text-sm transition-colors">
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Sound engine (Web Audio API, no files needed) ────────────────────────────

function useChessSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const getCtx = () => {
    if (!ctxRef.current)
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return ctxRef.current;
  };
  const tone = (freq: number, dur: number, vol = 0.25, type: OscillatorType = 'sine', delay = 0) => {
    try {
      const c = getCtx();
      const osc  = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain); gain.connect(c.destination);
      osc.type = type; osc.frequency.value = freq;
      const t = c.currentTime + delay;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur + 0.01);
    } catch {}
  };
  // useRef keeps the same object identity across renders so useEffects
  // that depend on `sound` don't restart every time the component re-renders.
  const soundRef = useRef({
    move:    () => { tone(520, 0.07, 0.18, 'square'); },
    capture: () => { tone(180, 0.18, 0.45, 'sawtooth'); tone(360, 0.09, 0.2, 'square', 0.04); },
    check:   () => { tone(880, 0.09, 0.3); tone(1100, 0.12, 0.3, 'sine', 0.1); },
    win:     () => { [523,659,784,1047].forEach((f, i) => tone(f, 0.22, 0.38, 'sine', i * 0.13)); },
    lose:    () => { [440,392,349,294].forEach((f, i) => tone(f, 0.28, 0.3,  'sine', i * 0.16)); },
    tick:    () => { tone(1100, 0.04, 0.15, 'square'); },
    timeout: () => { tone(330, 0.6, 0.4, 'sawtooth'); },
  });
  return soundRef.current;
}

// ─── Timer display ─────────────────────────────────────────────────────────────

function TimerBox({ seconds, active }: { seconds: number; active: boolean }) {
  const mins    = Math.floor(seconds / 60);
  const secs    = seconds % 60;
  const danger  = seconds <= 10;
  const display = `${mins}:${String(secs).padStart(2, '0')}`;
  return (
    <motion.div
      animate={danger && active ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, repeat: danger && active ? Infinity : 0 }}
      className="px-3 py-1.5 rounded-xl text-sm font-black tabular-nums"
      style={{
        background: active
          ? danger ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.12)'
          : 'rgba(255,255,255,0.05)',
        color: active ? (danger ? '#fca5a5' : '#ffffff') : 'rgba(255,255,255,0.3)',
        border: active && danger ? '1px solid rgba(239,68,68,0.5)' : '1px solid transparent',
        minWidth: 52,
        textAlign: 'center',
      }}>
      {display}
    </motion.div>
  );
}

// ─── Captured pieces ──────────────────────────────────────────────────────────

// piece key: lowercase = black piece captured by white; uppercase = white piece captured by black
const PIECE_LABEL: Record<string, string> = {
  q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',   // black pieces (shown in dark color on light bg)
  Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟',   // white pieces (same icons, different bg)
};
const PIECE_BG: Record<string, string> = {
  q: '#1e293b', r: '#1e293b', b: '#1e293b', n: '#1e293b', p: '#1e293b',
  Q: '#f1f5f9', R: '#f1f5f9', B: '#f1f5f9', N: '#f1f5f9', P: '#f1f5f9',
};
const PIECE_COLOR: Record<string, string> = {
  q: '#f8fafc', r: '#f8fafc', b: '#f8fafc', n: '#f8fafc', p: '#f8fafc',
  Q: '#0f172a', R: '#0f172a', B: '#0f172a', N: '#0f172a', P: '#0f172a',
};
const PIECE_ORDER = ['q', 'Q', 'r', 'R', 'b', 'B', 'n', 'N', 'p', 'P'];

function addCapture(prev: string[], captured: string, moverColor: string): string[] {
  const sym = moverColor === 'w' ? captured.toLowerCase() : captured.toUpperCase();
  return [...prev, sym].sort((a, b) => PIECE_ORDER.indexOf(a) - PIECE_ORDER.indexOf(b));
}

function CapturedTray({ pieces }: { pieces: string[] }) {
  if (!pieces.length) return <div className="h-5" />;
  return (
    <div className="flex flex-wrap gap-1 mt-1 min-h-[22px]">
      <AnimatePresence initial={false}>
        {pieces.map((p, i) => (
          <motion.span key={`${p}-${i}`}
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            className="inline-flex items-center justify-center text-[13px] leading-none select-none rounded-md"
            style={{
              width: 22, height: 22,
              background: PIECE_BG[p] ?? '#334155',
              color:      PIECE_COLOR[p] ?? '#f8fafc',
              boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
              fontFamily: 'serif',
            }}>
            {PIECE_LABEL[p] ?? p.toUpperCase()}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Game board ───────────────────────────────────────────────────────────────

interface BoardProps {
  mode: 'ai' | 'mp';
  difficulty?: AIDifficulty;
  playerColor?: 'w' | 'b';
  roomCode?: string;
  playerName: string;
  playerEmail: string;
  onDone: (winner: Winner, moves: number) => void;
}

function GameBoard({ mode, difficulty = 'medium', playerColor = 'w', roomCode, playerName, playerEmail, onDone }: BoardProps) {
  const TURN_SECS = mode === 'ai' && difficulty === 'easy' ? 120 : 90;

  const [game,          setGame]          = useState(new Chess());
  const [fen,           setFen]           = useState(new Chess().fen());
  const [status,        setStatus]        = useState('');
  const [thinking,      setThinking]      = useState(false);
  const [lastMove,      setLastMove]      = useState<{ from: string; to: string } | null>(null);
  const [opponentName,  setOpponentName]  = useState('Opponent');
  const [selectedSq,    setSelectedSq]    = useState<string | null>(null);
  const [moveHints,     setMoveHints]     = useState<Record<string, React.CSSProperties>>({});
  const [myTime,        setMyTime]        = useState(TURN_SECS);
  const [oppTime,       setOppTime]       = useState(TURN_SECS);
  const [captureFlash,  setCaptureFlash]  = useState<string | null>(null);
  const [capByWhite,    setCapByWhite]    = useState<string[]>([]);
  const [capByBlack,    setCapByBlack]    = useState<string[]>([]);
  const doneRef     = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const sound       = useChessSound();

  const recordCapture = useCallback((captured: string, moverColor: string) => {
    if (moverColor === 'w') setCapByWhite(prev => addCapture(prev, captured, 'w'));
    else                    setCapByBlack(prev => addCapture(prev, captured, 'b'));
  }, []);

  // ── Move counter (anti-exploit: MP requires min moves for rewards) ──
  const [moveCount,    setMoveCount]    = useState(0);
  const moveCountRef   = useRef(0);
  moveCountRef.current = moveCount;

  // ── End-of-game banner ──
  const [endBanner, setEndBanner] = useState<{ title: string; sub: string } | null>(null);

  // Keep refs so finish() can read them without stale closure issues
  const gameRef      = useRef(game);
  const lastMoveRef  = useRef(lastMove);
  gameRef.current    = game;
  lastMoveRef.current = lastMove;

  const finish = useCallback((w: Winner, reason?: 'timeout' | 'resign' | 'checkmate' | 'draw') => {
    if (doneRef.current) return;
    doneRef.current = true;

    const g  = gameRef.current;
    const lm = lastMoveRef.current;

    const W_ICON: Record<string, string> = { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' };
    const B_ICON: Record<string, string> = { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' };
    const NAMES:  Record<string, string> = { k:'King', q:'Queen', r:'Rook', b:'Bishop', n:'Knight', p:'Pawn' };

    let title = '', sub = '';

    if (g.isCheckmate()) {
      title = w === 'player' ? '♚ Checkmate — you win!' : '♚ Checkmate!';
      if (lm) {
        const p    = g.get(lm.to as Parameters<typeof g.get>[0]);
        const icon = p ? (p.color === 'w' ? W_ICON[p.type] : B_ICON[p.type]) : '';
        sub = `${icon} ${NAMES[p?.type ?? ''] ?? 'Piece'} ${lm.from.toUpperCase()} → ${lm.to.toUpperCase()} was the final move`;
      }
    } else if (g.isDraw()) {
      title = '🤝 Draw!';
      sub   = g.isStalemate()            ? 'Stalemate — no legal moves left'
            : g.isInsufficientMaterial() ? 'Not enough pieces to force checkmate'
            : g.isThreefoldRepetition()  ? 'Same position repeated three times'
            : '50-move rule — no captures or pawn moves';
    } else if (reason === 'timeout') {
      title = w === 'player' ? "⏰ Opponent's time ran out!" : '⏰ Time\'s up!';
      sub   = w === 'player' ? 'They used all their thinking time' : 'You used all your thinking time';
    } else if (reason === 'resign') {
      title = w === 'player' ? '🏳️ Opponent resigned!' : '🏳️ You resigned';
      sub   = '';
    } else {
      title = w === 'player' ? '🏆 You win!' : '💔 Game over';
      sub   = '';
    }

    setEndBanner({ title, sub });
    setTimeout(() => onDone(w, moveCountRef.current), 2600);
  }, [onDone]);

  const syncStatus = useCallback((g: Chess) => {
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'b' : 'w';
      const playerWon = winner === playerColor;
      if (playerWon) sound.win(); else sound.lose();
      if (mode === 'ai') finish(playerWon ? 'player' : 'ai');
      else               finish(playerWon ? 'player' : 'opponent');
    } else if (g.isDraw()) {
      sound.lose();
      finish('draw');
    } else if (g.isCheck()) {
      setStatus('Check!');
    } else {
      setStatus('');
    }
  }, [mode, playerColor, finish, sound]);

  // ── Turn timer ──
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (doneRef.current) return;

    const isMyTurn = game.turn() === playerColor;

    // Reset the clock for the side that just got their turn
    if (isMyTurn) setMyTime(TURN_SECS);
    else          setOppTime(TURN_SECS);

    // Don't tick AI's clock — it moves on its own schedule
    if (mode === 'ai' && !isMyTurn) return;

    let remaining = TURN_SECS;
    timerRef.current = setInterval(() => {
      if (doneRef.current) { clearInterval(timerRef.current!); return; }
      remaining -= 1;

      if (isMyTurn) {
        setMyTime(remaining);
        if (remaining <= 10 && remaining > 0) sound.tick();
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          sound.timeout();
          if (mode === 'mp')
            supabase.from('chess_rooms').update({ status: `timeout_${playerColor}` }).eq('room_code', roomCode!).then();
          finish(mode === 'ai' ? 'ai' : 'opponent', 'timeout');
        }
      } else {
        setOppTime(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current!);
          finish('player', 'timeout');
        }
      }
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI move ──
  const doAIMove = useCallback((currentGame: Chess) => {
    if (currentGame.isGameOver()) return;
    setThinking(true);
    setTimeout(() => {
      const move = getBestMove(currentGame.fen(), difficulty);
      if (!move) { setThinking(false); return; }
      const g = new Chess(currentGame.fen());
      const result = g.move(move);
      setGame(g);
      setFen(g.fen());
      setMoveCount(c => c + 1);
      setLastMove({ from: move.slice(0, 2), to: move.slice(2, 4) });
      if (result?.captured) {
        sound.capture();
        setCaptureFlash(move.slice(2, 4));
        setTimeout(() => setCaptureFlash(null), 450);
        recordCapture(result.captured, result.color);
      } else {
        sound.move();
      }
      if (g.isCheck() && !g.isCheckmate()) sound.check();
      syncStatus(g);
      setThinking(false);
    }, 1100);
  }, [difficulty, syncStatus, sound]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch opponent name ──
  useEffect(() => {
    if (mode !== 'mp' || !roomCode) return;
    supabase.from('chess_rooms').select('white_name, black_name').eq('room_code', roomCode).maybeSingle().then(({ data }) => {
      if (!data) return;
      setOpponentName(playerColor === 'w' ? (data.black_name ?? 'Opponent') : data.white_name);
    });
  }, [mode, roomCode, playerColor]);

  // ── DB polling fallback (catches moves when WebSocket drops) ──
  useEffect(() => {
    if (mode !== 'mp' || !roomCode) return;

    const poll = setInterval(async () => {
      if (doneRef.current) return;
      const { data } = await supabase
        .from('chess_rooms').select('fen, status').eq('room_code', roomCode).maybeSingle();
      if (!data) return;

      // Detect opponent resign or timeout written to DB
      const s = data.status ?? '';
      if ((s.startsWith('resigned_') || s.startsWith('timeout_')) && !doneRef.current) {
        const endColor = s.slice(-1) as 'w' | 'b';
        if (endColor !== playerColor) {
          sound.win();
          finish('player', s.startsWith('resigned_') ? 'resign' : 'timeout');
          return;
        }
      }

      if (!data.fen) return;

      // Use ref to read current game without needing a functional updater
      const prev = gameRef.current;
      if (prev.fen() === data.fen) return; // already up to date
      const dbGame = new Chess(data.fen);
      // Only apply when it's now my turn (= opponent just moved in DB)
      if (dbGame.turn() !== playerColor) return;

      // Try to reconstruct which move was made so we can animate + record capture
      const legal = prev.moves({ verbose: true }) as { from: string; to: string; captured?: string; color: string; promotion?: string }[];
      for (const m of legal) {
        const test = new Chess(prev.fen());
        const lan = m.from + m.to + (m.promotion ?? '');
        let result: ReturnType<typeof test.move> | null = null;
        try { result = test.move(lan); } catch { continue; }
        if (test.fen() === data.fen && result) {
          setGame(test);
          setFen(test.fen());
          setMoveCount(c => c + 1);
          setLastMove({ from: m.from, to: m.to });
          if (result.captured) {
            sound.capture();
            setCaptureFlash(m.to);
            setTimeout(() => setCaptureFlash(null), 450);
            recordCapture(result.captured, result.color);
          } else {
            sound.move();
          }
          if (test.isCheck() && !test.isCheckmate()) sound.check();
          syncStatus(test);
          return;
        }
      }
      // Fallback: sync to DB state directly (e.g., promotion edge case)
      setGame(dbGame);
      setFen(data.fen);
      setMoveCount(c => c + 1);
      syncStatus(dbGame);
    }, 1000);

    return () => clearInterval(poll);
  }, [mode, roomCode, playerColor, syncStatus, recordCapture, sound, finish]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trigger AI on mount if player is black ──
  useEffect(() => {
    if (mode === 'ai' && playerColor === 'b') {
      doAIMove(game);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback(({ sourceSquare, targetSquare }: PieceDropHandlerArgs) => {
    if (thinking) return false;
    if (!targetSquare) return false;
    if (game.isGameOver()) return false;
    if (game.turn() !== playerColor) return false;

    const g = new Chess(game.fen());
    let move;
    try {
      move = g.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch { return false; }
    if (!move) return false;

    setGame(g);
    setFen(g.fen());
    setMoveCount(c => c + 1);
    setLastMove({ from: sourceSquare, to: targetSquare });
    if (move.captured) {
      sound.capture();
      setCaptureFlash(targetSquare);
      setTimeout(() => setCaptureFlash(null), 450);
      recordCapture(move.captured, move.color);
    } else {
      sound.move();
    }
    if (g.isCheck() && !g.isCheckmate()) sound.check();
    syncStatus(g);

    if (mode === 'mp')
      supabase.from('chess_rooms').update({ fen: g.fen() }).eq('room_code', roomCode!).then();

    if (mode === 'ai' && !g.isGameOver()) {
      doAIMove(g);
    }

    return true;
  }, [game, thinking, playerColor, mode, roomCode, syncStatus, doAIMove]);

  const handleResign = () => {
    if (mode === 'mp')
      supabase.from('chess_rooms').update({ status: `resigned_${playerColor}` }).eq('room_code', roomCode!).then();
    finish(mode === 'ai' ? 'ai' : 'opponent', 'resign');
  };

  // Clear move hints whenever a move is made (fen changes)
  useEffect(() => {
    setSelectedSq(null);
    setMoveHints({});
  }, [fen]);

  const selectPiece = useCallback((sq: string) => {
    if (difficulty !== 'easy' && mode !== 'mp') return;
    if (game.turn() !== playerColor || game.isGameOver() || thinking) return;
    const moves = game.moves({ square: sq as Parameters<typeof game.get>[0], verbose: true }) as { to: string; captured?: string }[];
    if (!moves.length) return;
    const hints: Record<string, React.CSSProperties> = {};
    for (const m of moves) {
      hints[m.to] = m.captured
        ? { background: 'radial-gradient(circle at center, transparent 55%, rgba(220,38,38,0.7) 57%)' }
        : { background: 'radial-gradient(circle at center, rgba(74,222,128,0.75) 24%, transparent 26%)' };
    }
    setSelectedSq(sq);
    setMoveHints(hints);
  }, [difficulty, game, playerColor, thinking]);

  const handlePieceClick = useCallback(({ square }: PieceHandlerArgs) => {
    if (!square) return;
    // Toggle selection: clicking the already-selected piece deselects it
    if (square === selectedSq) { setSelectedSq(null); setMoveHints({}); return; }
    selectPiece(square);
  }, [selectedSq, selectPiece]);

  const handleSquareClick = useCallback(({ square: sq }: SquareHandlerArgs) => {
    if (difficulty !== 'easy' && mode !== 'mp') return;
    if (game.isGameOver() || thinking) return;

    // Execute move to a hint square
    if (selectedSq && sq in moveHints) {
      if (game.turn() !== playerColor) return;
      const g = new Chess(game.fen());
      let move;
      try { move = g.move({ from: selectedSq, to: sq, promotion: 'q' }); }
      catch { setSelectedSq(null); setMoveHints({}); return; }
      if (!move) { setSelectedSq(null); setMoveHints({}); return; }

      setGame(g); setFen(g.fen());
      setMoveCount(c => c + 1);
      setLastMove({ from: selectedSq, to: sq });
      if (move.captured) {
        sound.capture();
        setCaptureFlash(sq);
        setTimeout(() => setCaptureFlash(null), 450);
        recordCapture(move.captured, move.color);
      } else {
        sound.move();
      }
      if (g.isCheck() && !g.isCheckmate()) sound.check();
      syncStatus(g);

      if (mode === 'mp')
        supabase.from('chess_rooms').update({ fen: g.fen() }).eq('room_code', roomCode!).then();
      if (mode === 'ai' && !g.isGameOver()) doAIMove(g);
      return;
    }

    // Clicking on a different own piece — re-select
    const piece = game.get(sq as Parameters<typeof game.get>[0]);
    if (piece && piece.color === playerColor) {
      selectPiece(sq);
      return;
    }

    // Clicking elsewhere deselects
    setSelectedSq(null);
    setMoveHints({});
  }, [difficulty, game, playerColor, thinking, selectedSq, moveHints, syncStatus, mode, doAIMove, selectPiece]);

  const myTurn  = game.turn() === playerColor && !game.isGameOver();
  const boardOrientation = playerColor === 'w' ? 'white' : 'black';

  const lastMoveStyles: Record<string, { backgroundColor: string }> = {};
  if (lastMove) {
    lastMoveStyles[lastMove.from] = { backgroundColor: 'rgba(255,255,0,0.25)' };
    lastMoveStyles[lastMove.to]   = { backgroundColor: 'rgba(255,255,0,0.35)' };
  }
  const squareStyles: Record<string, React.CSSProperties> = {
    ...lastMoveStyles,
    ...moveHints,
    ...(selectedSq     ? { [selectedSq]:    { backgroundColor: 'rgba(74,222,128,0.5)' } } : {}),
    ...(captureFlash   ? { [captureFlash]:  { backgroundColor: 'rgba(239,68,68,0.65)'  } } : {}),
  };

  const opponentLabel = mode === 'ai' ? `🤖 AI (${difficulty})` : opponentName;
  const oppTurn       = !myTurn && !game.isGameOver();
  // capByWhite = pieces white has captured (black pieces gone); capByBlack = pieces black captured (white pieces gone)
  const oppLost = playerColor === 'w' ? capByWhite : capByBlack; // pieces captured by me (opponent lost them)
  const myLost  = playerColor === 'w' ? capByBlack : capByWhite; // pieces captured by opponent (I lost them)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>

      {/* Opponent row */}
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white/60 text-xs">{playerColor === 'b' ? '⬜' : '⬛'}</span>
            <span className="text-white/80 text-sm font-bold truncate">{opponentLabel}</span>
            {thinking && <span className="text-[10px] text-amber-400 font-black animate-pulse">thinking…</span>}
          </div>
          <TimerBox seconds={oppTime} active={oppTurn} />
        </div>
        <CapturedTray pieces={oppLost} />
      </div>

      {/* Board */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 gap-3">

        {/* Status badge */}
        <AnimatePresence>
          {status && (
            <motion.div key="status" initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              <StatusBadge text={status} color="#ef4444" />
            </motion.div>
          )}
          {!status && !game.isGameOver() && (
            <motion.span key="turn" className="text-xs font-black px-3 py-1 rounded-full"
              style={{ background: myTurn ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', color: myTurn ? '#86efac' : '#64748b' }}>
              {myTurn ? 'Your turn' : thinking ? "AI is thinking…" : "Opponent's turn"}
            </motion.span>
          )}
        </AnimatePresence>

        <div className="w-full max-w-[min(90vw,480px)] relative">
          <Chessboard options={{
            position: fen,
            onPieceDrop: onDrop,
            onPieceClick: handlePieceClick,
            onSquareClick: handleSquareClick,
            boardOrientation,
            squareStyles,
            animationDurationInMs: 250,
            allowDragging: myTurn && !thinking && !endBanner,
            boardStyle: { borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' },
            darkSquareStyle: { backgroundColor: '#2d4a6e' },
            lightSquareStyle: { backgroundColor: '#e8edf5' },
          }} />

          {/* End-of-game explanation overlay */}
          <AnimatePresence>
            {endBanner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className="absolute inset-0 rounded-xl flex flex-col items-center justify-center gap-3 z-20 px-6"
                style={{ background: 'linear-gradient(160deg, rgba(15,32,39,0.82) 0%, rgba(15,32,39,0.96) 100%)', backdropFilter: 'blur(4px)' }}
              >
                <motion.div
                  initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }}
                  className="text-3xl font-black text-white text-center drop-shadow-lg leading-tight">
                  {endBanner.title}
                </motion.div>
                {endBanner.sub && (
                  <motion.div
                    initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.28 }}
                    className="text-white/65 text-sm font-semibold text-center leading-snug">
                    {endBanner.sub}
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
                  className="flex gap-1">
                  {[0,1,2].map(i => (
                    <motion.div key={i}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={handleResign}
          className="text-white/25 hover:text-red-400 font-medium text-xs transition-colors pt-1">
          🏳️ Resign
        </button>
      </div>

      {/* My row */}
      <div className="px-4 pt-2 pb-3 border-t border-white/10">
        <CapturedTray pieces={myLost} />
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white/60 text-xs">{playerColor === 'w' ? '⬜' : '⬛'}</span>
            <span className="text-white font-bold text-sm truncate">{playerName}</span>
          </div>
          <TimerBox seconds={myTime} active={myTurn} />
        </div>
      </div>

    </div>
  );
}

// ─── Game over screen ─────────────────────────────────────────────────────────

function GameOverScreen({ winner, coinsEarned, onPlayAgain, onBack }: {
  winner: Winner;
  coinsEarned: number;
  onPlayAgain: () => void;
  onBack: () => void;
}) {
  const emoji = winner === 'player' ? '🏆' : winner === 'draw' ? '🤝' : '💔';
  const title = winner === 'player' ? 'You Win!' : winner === 'draw' ? 'Draw!' : 'You Lost';

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl p-8 text-center space-y-5 border border-white/10"
        style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
        <div className="text-6xl">{emoji}</div>
        <h2 className="text-3xl font-black text-white">{title}</h2>
        {coinsEarned > 0 ? (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,215,0,0.12)' }}>
            <div className="text-3xl font-black text-yellow-300">+{coinsEarned}</div>
            <div className="text-white/40 text-xs font-bold mt-0.5">PLAYBITS EARNED</div>
          </div>
        ) : winner !== null && winner !== 'draw' && winner !== 'player' ? null : (
          winner === 'draw' || winner === 'player' ? (
            <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="text-white/30 text-xs font-bold">Game too short — play more moves to earn PlayBits</div>
            </div>
          ) : null
        )}
        <div className="flex gap-3">
          <button onClick={onPlayAgain}
            className="flex-1 py-3 rounded-2xl font-black text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
            Play Again
          </button>
          <button onClick={onBack}
            className="px-5 py-3 rounded-2xl font-bold text-white/60 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            Exit
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function ChessGame({ onBack }: { onBack: () => void }) {
  const { playerName, playerEmail } = useGameStore();

  const [mode,       setMode]       = useState<Mode>('menu');
  const [gameMode,   setGameMode]   = useState<'ai' | 'mp'>('ai');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [playerColor,setPlayerColor]= useState<'w' | 'b'>('w');
  const [roomCode,   setRoomCode]   = useState('');
  const [winner,      setWinner]      = useState<Winner>(null);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const MIN_MOVES_MP = 6;

  const handleWin = useCallback(async (w: Winner, moves: number) => {
    setWinner(w);
    setMode('done');
    const qualified = gameMode !== 'mp' || moves >= MIN_MOVES_MP;
    const coins = qualified ? (w === 'player' ? COINS_WIN : w === 'draw' ? COINS_DRAW : 0) : 0;
    setCoinsEarned(coins);
    if (coins > 0 && playerName) {
      await addCoins(playerName, coins, 0, true, '', 'chess', playerEmail ?? '').catch(() => {});
    }
    if (playerName && qualified) {
      const result = w === 'player' ? 'win' : w === 'draw' ? 'draw' : 'loss';
      await updateChessScore(playerName, playerEmail ?? '', result, gameMode, difficulty).catch(() => {});
    }
  }, [playerName, playerEmail, gameMode, difficulty]);

  const resetToMenu = () => {
    setMode('menu');
    setWinner(null);
    setCoinsEarned(0);
    setRoomCode('');
  };

  if (mode === 'menu') {
    return <ModeMenu onSelectAI={() => setMode('ai')} onSelectMP={() => setMode('mp-lobby')} onBack={onBack} />;
  }

  if (mode === 'ai') {
    return <AIPicker onSelect={d => { setDifficulty(d); setPlayerColor('w'); setGameMode('ai'); setMode('playing-ai'); }} onBack={() => setMode('menu')} />;
  }

  if (mode === 'mp-lobby') {
    return (
      <MPLobby
        playerName={playerName}
        onJoined={(code, color) => {
          setRoomCode(code);
          setPlayerColor(color);
          setGameMode('mp');
          setMode(color === 'w' ? 'mp-waiting' : 'playing-mp');
        }}
        onBack={() => setMode('menu')}
      />
    );
  }

  if (mode === 'mp-waiting') {
    return (
      <MPWaiting
        roomCode={roomCode}
        onOpponentJoined={() => setMode('playing-mp')}
        onBack={() => setMode('menu')}
      />
    );
  }

  if (mode === 'playing-ai' || mode === 'playing-mp') {
    return (
      <GameBoard
        key={roomCode || 'ai'}
        mode={gameMode}
        difficulty={difficulty}
        playerColor={playerColor}
        roomCode={roomCode}
        playerName={playerName}
        playerEmail={playerEmail ?? ''}
        onDone={handleWin}
      />
    );
  }

  if (mode === 'done') {
    return (
      <GameOverScreen
        winner={winner}
        coinsEarned={coinsEarned}
        onPlayAgain={resetToMenu}
        onBack={onBack}
      />
    );
  }

  return null;
}
