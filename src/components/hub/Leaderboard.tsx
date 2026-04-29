"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { ALL_GAME_IDS } from "@/lib/learningScore";
import { useGameStore } from "@/store/useGameStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LearnerEntry {
  student_name: string; grade: string;
  learning_score: number;
  mastery_score: number; accuracy_score: number;
  progress_score: number; diversity_score: number;
  total_mastered: number; games_distinct_14d: number;
  avg_accuracy_all: number; improvement_delta: number;
  total_playbits: number;
}

interface SpecialistEntry {
  student_name: string;
  avg_accuracy: number; sessions_count: number; mastered: boolean;
}

type BoardType = 'learners' | 'myClass' | 'improved' | 'accuracy' | 'explorers' | 'specialist';

const MEDALS = ['🥇', '🥈', '🥉'];

const GAME_LABELS: Record<string, string> = {
  multiplication: '✖️ Multiplication', addition: '➕ Number Sprint',
  division: '➗ Division Dash', fractions: '🍕 Fractions',
  hangman: '🪢 Hangman', brain: '🧩 Brain Logic', memory: '🧠 Memory',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${(value / max) * 100}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`h-full rounded-full ${color}`} />
    </div>
  );
}

function EntryRow({ rank, name, grade, main, sub, extra, isMe }: {
  rank: number; name: string; grade?: string;
  main: string; sub?: string; extra?: React.ReactNode; isMe?: boolean;
}) {
  const top3 = rank <= 3;
  return (
    <motion.div layout initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ delay: rank * 0.04 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors border ${
        isMe        ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-300' :
        rank === 1  ? 'bg-amber-50 border-amber-100' :
        rank === 2  ? 'bg-slate-50 border-slate-100' :
        rank === 3  ? 'bg-orange-50 border-orange-100' :
        'bg-white hover:bg-slate-50 border-transparent'
      }`}>
      <span className={`w-7 text-center font-black text-sm ${
        top3 ? 'text-lg' : 'text-slate-400'
      }`}>{top3 ? MEDALS[rank - 1] : rank}</span>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-sm truncate ${isMe ? 'text-violet-700' : 'text-slate-800'}`}>
          {name}{isMe && <span className="ml-1 text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-black">YOU</span>}
        </div>
        {grade && <div className="text-[10px] text-slate-400 font-semibold">Grade {grade}</div>}
        {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
      </div>
      {extra}
      <div className={`text-right font-black text-sm shrink-0 ${isMe ? 'text-violet-600' : 'text-violet-600'}`}>{main}</div>
    </motion.div>
  );
}

// ── Main Leaderboard ──────────────────────────────────────────────────────────

export function Leaderboard() {
  const { playerGrade, playerName } = useGameStore();
  const [board, setBoard]           = useState<BoardType>('learners');
  const [entries, setEntries]       = useState<LearnerEntry[]>([]);
  const [specialists, setSpecialists] = useState<Record<string, SpecialistEntry[]>>({});
  const [specialistGame, setSpecialistGame] = useState<string>('multiplication');
  const [loading, setLoading]       = useState(true);
  const [flash, setFlash]           = useState(false);
  const [dbReady, setDbReady]       = useState(true);

  const fetchAll = async () => {
    const { data, error } = await supabase
      .from('learning_scores')
      .select('*')
      .order('learning_score', { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === '42P01') setDbReady(false);
      setLoading(false);
      return;
    }
    setDbReady(true);
    setEntries(data ?? []);

    // Fetch top-5 per game for Specialists tab
    const specResults: Record<string, SpecialistEntry[]> = {};
    await Promise.all(
      ALL_GAME_IDS.map(async (gid) => {
        const { data: gd } = await supabase
          .from('game_performance')
          .select('student_name, avg_accuracy, sessions_count, mastered')
          .eq('game_id', gid)
          .gte('sessions_count', 3)
          .order('avg_accuracy', { ascending: false })
          .limit(5);
        if (gd) specResults[gid] = gd;
      })
    );
    setSpecialists(specResults);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel('ls-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_scores' }, () => {
        setFlash(true); setTimeout(() => setFlash(false), 600);
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived lists ───────────────────────────────────────────────────────────
  const topLearners  = [...entries].sort((a, b) => b.learning_score - a.learning_score).slice(0, 10);
  const myClassEntries = [...entries]
    .filter(e => playerGrade && e.grade === playerGrade)
    .sort((a, b) => b.learning_score - a.learning_score)
    .slice(0, 20);
  const mostImproved = [...entries]
    .filter(e => e.improvement_delta > 0)
    .sort((a, b) => b.improvement_delta - a.improvement_delta).slice(0, 10);
  const accChamps   = [...entries]
    .filter(e => e.avg_accuracy_all > 0)
    .sort((a, b) => b.avg_accuracy_all - a.avg_accuracy_all).slice(0, 10);
  const explorers   = [...entries].sort((a, b) => b.games_distinct_14d - a.games_distinct_14d).slice(0, 10);

  const tabs: { id: BoardType; label: string; emoji: string }[] = [
    { id: 'learners',   label: 'Top Learners',   emoji: '🏆' },
    { id: 'myClass',    label: 'My Class',        emoji: '🏫' },
    { id: 'improved',   label: 'Most Improved',  emoji: '📈' },
    { id: 'accuracy',   label: 'Accuracy',        emoji: '🎯' },
    { id: 'explorers',  label: 'Explorers',       emoji: '🌍' },
    { id: 'specialist', label: 'Specialists',     emoji: '⭐' },
  ];

  if (loading) return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-violet-200 border-t-violet-600" />
    </div>
  );

  if (!dbReady) return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
      <div className="text-center py-8">
        <div className="text-4xl mb-3">⚙️</div>
        <p className="font-bold text-slate-700 mb-1">Leaderboard not set up yet</p>
        <p className="text-slate-400 text-sm">Visit <code className="bg-slate-100 px-1 rounded">/setup</code> and create the <code className="bg-slate-100 px-1 rounded">learning_scores</code> table.</p>
      </div>
    </div>
  );

  return (
    <motion.div animate={flash ? { scale: [1, 1.01, 1] } : {}} transition={{ duration: 0.3 }}
      className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-50">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏆</span>
          <h2 className="text-xl font-black text-slate-800">Leaderboards</h2>
          <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 font-black px-2 py-0.5 rounded-full">LIVE 🟢</span>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setBoard(t.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                board === t.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-1 max-h-[520px] overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* ── Top Learners ── */}
          {board === 'learners' && (
            <motion.div key="learners" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 mb-2">
                Mastery 35% · Accuracy 20% · Progress 20% · Variety 15% · PlayBits 10%
              </p>
              {topLearners.length === 0
                ? <p className="text-center py-12 text-slate-400 text-sm">No data yet — play some games! 🚀</p>
                : topLearners.map((e, i) => (
                  <EntryRow key={e.student_name} rank={i + 1} name={e.student_name} grade={e.grade}
                    main={`${e.learning_score.toFixed(1)} pts`}
                    extra={
                      <div className="flex flex-col gap-1 items-end mr-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400">M</span>
                          <ScoreBar value={e.mastery_score}  color="bg-violet-500" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400">A</span>
                          <ScoreBar value={e.accuracy_score} color="bg-emerald-500" />
                        </div>
                      </div>
                    }
                  />
                ))
              }
            </motion.div>
          )}

          {/* ── My Class ── */}
          {board === 'myClass' && (
            <motion.div key="myClass" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 mb-2">
                {playerGrade ? `Grade ${playerGrade} classmates · ranked by learning score` : 'Set your grade in profile to see classmates'}
              </p>
              {!playerGrade ? (
                <p className="text-center py-12 text-slate-400 text-sm">No grade set — update your profile first.</p>
              ) : myClassEntries.length === 0 ? (
                <p className="text-center py-12 text-slate-400 text-sm">No classmates found in Grade {playerGrade} yet 🎒</p>
              ) : (
                myClassEntries.map((e, i) => (
                  <EntryRow key={e.student_name} rank={i + 1} name={e.student_name}
                    isMe={e.student_name === playerName}
                    main={`${e.learning_score.toFixed(1)} pts`}
                    extra={
                      <div className="flex flex-col gap-1 items-end mr-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400">M</span>
                          <ScoreBar value={e.mastery_score}  color="bg-violet-500" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-400">A</span>
                          <ScoreBar value={e.accuracy_score} color="bg-emerald-500" />
                        </div>
                      </div>
                    }
                  />
                ))
              )}
            </motion.div>
          )}

          {/* ── Most Improved ── */}
          {board === 'improved' && (
            <motion.div key="improved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 mb-2">
                Ranked by average accuracy improvement vs. previous session
              </p>
              {mostImproved.length === 0
                ? <p className="text-center py-12 text-slate-400 text-sm">Keep playing — improvements appear after 2+ sessions per game.</p>
                : mostImproved.map((e, i) => (
                  <EntryRow key={e.student_name} rank={i + 1} name={e.student_name} grade={e.grade}
                    main={`+${(e.improvement_delta * 100).toFixed(1)}%`}
                    sub={`${Math.round(e.avg_accuracy_all * 100)}% avg accuracy`}
                  />
                ))
              }
            </motion.div>
          )}

          {/* ── Accuracy Champions ── */}
          {board === 'accuracy' && (
            <motion.div key="accuracy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 mb-2">
                Average accuracy across all games (min 3 sessions each)
              </p>
              {accChamps.length === 0
                ? <p className="text-center py-12 text-slate-400 text-sm">No accuracy data yet.</p>
                : accChamps.map((e, i) => (
                  <EntryRow key={e.student_name} rank={i + 1} name={e.student_name} grade={e.grade}
                    main={`${Math.round(e.avg_accuracy_all * 100)}%`}
                    extra={<ScoreBar value={e.avg_accuracy_all * 100} color="bg-emerald-500" />}
                  />
                ))
              }
            </motion.div>
          )}

          {/* ── Explorers ── */}
          {board === 'explorers' && (
            <motion.div key="explorers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1 mb-2">
                Most different games played in the last 14 days
              </p>
              {explorers.length === 0
                ? <p className="text-center py-12 text-slate-400 text-sm">No variety data yet.</p>
                : explorers.map((e, i) => (
                  <EntryRow key={e.student_name} rank={i + 1} name={e.student_name} grade={e.grade}
                    main={`${e.games_distinct_14d} / 7 games`}
                    extra={<ScoreBar value={e.games_distinct_14d} max={7} color="bg-blue-500" />}
                  />
                ))
              }
            </motion.div>
          )}

          {/* ── Specialists ── */}
          {board === 'specialist' && (
            <motion.div key="specialist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {/* Game picker */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_GAME_IDS.map(gid => (
                  <button key={gid} onClick={() => setSpecialistGame(gid)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${
                      specialistGame === gid ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    {GAME_LABELS[gid] ?? gid}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">
                Top accuracy in {GAME_LABELS[specialistGame]} (min 3 sessions)
              </p>
              {(specialists[specialistGame] ?? []).length === 0
                ? <p className="text-center py-8 text-slate-400 text-sm">No qualified players yet (need ≥3 sessions).</p>
                : (specialists[specialistGame] ?? []).map((e, i) => (
                  <EntryRow key={e.student_name} rank={i + 1} name={e.student_name}
                    main={`${Math.round(e.avg_accuracy * 100)}%`}
                    sub={`${e.sessions_count} sessions${e.mastered ? ' · 🏆 Mastered' : ''}`}
                    extra={<ScoreBar value={e.avg_accuracy * 100} color="bg-violet-500" />}
                  />
                ))
              }
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Score legend (only on top learners) */}
      {board === 'learners' && entries.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-50 flex flex-wrap gap-3">
          {[
            { label: 'Mastery',   color: 'bg-violet-500' },
            { label: 'Accuracy',  color: 'bg-emerald-500' },
            { label: 'Progress',  color: 'bg-amber-500' },
            { label: 'Variety',   color: 'bg-blue-500' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${l.color}`} />
              <span className="text-[10px] text-slate-400 font-bold">{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
