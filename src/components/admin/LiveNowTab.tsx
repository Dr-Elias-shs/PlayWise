"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface ActiveSession {
  player_email: string;
  player_name:  string;
  grade:        string;
  current_game: string;
  last_seen:    string;
  started_at:   string;
}

const GAME_EMOJI: Record<string, string> = {
  'Hub':                   '🏠',
  'WiseWorld':             '🌍',
  'WiseWorld Multiplayer': '🌍⚔️',
  'World Lobby':           '🗺️',
  'Multiplayer Hub':       '⚔️',
  'Math Game':             '➕',
  'Memory':                '🃏',
  'Hangman':               '🔡',
  'Brain':                 '🧠',
  'Multiplication':        '✖️',
};

function gameEmoji(game: string) {
  return GAME_EMOJI[game] ?? '🎮';
}

function sinceMinutes(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

function playingFor(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function LiveNowTab() {
  const [sessions,    setSessions]    = useState<ActiveSession[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  async function fetchSessions() {
    setError(null);
    const cutoff = new Date(Date.now() - 2 * 60_000).toISOString();
    const { data, error: err } = await supabase
      .from('active_sessions')
      .select('*')
      .gte('last_seen', cutoff)
      .order('last_seen', { ascending: false });

    if (err) {
      console.error('[LiveNow] fetch error:', err);
      setError(err.message);
    } else {
      setSessions((data ?? []) as ActiveSession[]);
    }
    setLoading(false);
    setLastRefresh(new Date());
  }

  useEffect(() => {
    fetchSessions();
    const t = setInterval(fetchSessions, 20_000); // auto-refresh every 20 s
    return () => clearInterval(t);
  }, []);

  // Group by game
  const byGame = sessions.reduce<Record<string, ActiveSession[]>>((acc, s) => {
    (acc[s.current_game] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5 max-w-3xl">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-3 h-3 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <h2 className="font-black text-slate-800 text-xl">
            Live Now
            <span className="ml-2 text-emerald-600 font-black text-2xl">{sessions.length}</span>
            <span className="text-slate-400 font-medium text-sm ml-1">
              {sessions.length === 1 ? 'student' : 'students'} active
            </span>
          </h2>
        </div>
        <button onClick={fetchSessions}
          className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1">
          🔄 Refresh
          <span className="text-slate-300 font-normal ml-1">
            {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 font-bold">Loading…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-2">
          <p className="text-red-600 font-black text-sm">⚠️ Could not load active sessions</p>
          <p className="text-red-400 text-xs font-mono">{error}</p>
          <p className="text-red-500 text-sm font-bold mt-2">
            Make sure you have created the <code className="bg-red-100 px-1 rounded">active_sessions</code> table in Supabase:
          </p>
          <pre className="bg-red-100 text-red-700 text-xs rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS public.active_sessions (
  player_email  TEXT        PRIMARY KEY,
  player_name   TEXT        NOT NULL DEFAULT '',
  grade         TEXT        NOT NULL DEFAULT '',
  current_game  TEXT        NOT NULL DEFAULT 'hub',
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active_sessions_all" ON public.active_sessions
  FOR ALL USING (true) WITH CHECK (true);`}</pre>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 py-16 text-center">
          <div className="text-5xl mb-3">😴</div>
          <p className="text-slate-400 font-bold">No students active right now</p>
          <p className="text-slate-300 text-sm mt-1">Updates every 20 seconds</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(byGame).map(([game, players]) => (
              <div key={game} className="bg-white rounded-2xl border border-slate-200 p-3 text-center shadow-sm">
                <div className="text-2xl mb-1">{gameEmoji(game)}</div>
                <div className="font-black text-slate-800 text-xl">{players.length}</div>
                <div className="text-slate-400 text-xs font-bold truncate">{game}</div>
              </div>
            ))}
          </div>

          {/* Player list */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="col-span-4">Student</span>
              <span className="col-span-2 text-center">Grade</span>
              <span className="col-span-3">Playing</span>
              <span className="col-span-2 text-right">Duration</span>
              <span className="col-span-1 text-right">Ping</span>
            </div>
            <AnimatePresence>
              {sessions.map((s, i) => (
                <motion.div key={s.player_email}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-12 items-center px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  {/* Name */}
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <motion.div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{s.player_name}</p>
                      <p className="text-slate-400 text-[10px] truncate">{s.player_email}</p>
                    </div>
                  </div>

                  {/* Grade */}
                  <div className="col-span-2 text-center">
                    <span className="bg-violet-100 text-violet-700 text-xs font-black px-2 py-0.5 rounded-full">
                      G{s.grade || '?'}
                    </span>
                  </div>

                  {/* Game */}
                  <div className="col-span-3 flex items-center gap-1.5">
                    <span className="text-base">{gameEmoji(s.current_game)}</span>
                    <span className="text-slate-600 text-xs font-bold truncate">{s.current_game}</span>
                  </div>

                  {/* Duration */}
                  <div className="col-span-2 text-right">
                    <span className="text-slate-500 text-xs font-bold">{playingFor(s.started_at)}</span>
                  </div>

                  {/* Last ping */}
                  <div className="col-span-1 text-right">
                    <span className="text-emerald-500 text-[10px] font-bold">{sinceMinutes(s.last_seen)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      <p className="text-slate-300 text-xs text-center">
        Students appear here within 30 s of opening the app · Auto-refreshes every 20 s
      </p>
    </div>
  );
}
