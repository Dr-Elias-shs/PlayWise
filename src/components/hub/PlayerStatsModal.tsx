"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LearningRow {
  learning_score: number;
  mastery_score: number;
  accuracy_score: number;
  progress_score: number;
  diversity_score: number;
  playbits_score: number;
  total_mastered: number;
  games_distinct_14d: number;
  avg_accuracy_all: number;
  total_playbits: number;
  improvement_delta: number;
}

interface Props {
  studentName: string;
  grade?: string | null;
  open: boolean;
  onClose: () => void;
}

function Bar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export function PlayerStatsModal({ studentName, grade, open, onClose }: Props) {
  const [row, setRow]         = useState<LearningRow | null>(null);
  const [rank, setRank]       = useState<number | null>(null);
  const [coins, setCoins]     = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !studentName) return;
    setLoading(true);

    Promise.all([
      // Own learning row
      supabase
        .from('learning_scores')
        .select('*')
        .eq('student_name', studentName)
        .maybeSingle(),
      // Count players with higher score → derive rank
      supabase
        .from('learning_scores')
        .select('learning_score', { count: 'exact', head: false })
        .order('learning_score', { ascending: false }),
      // PlayBits from wallet
      supabase
        .from('player_wallets')
        .select('coins')
        .eq('student_name', studentName)
        .maybeSingle(),
    ]).then(([own, all, wallet]) => {
      const ownData = own.data as LearningRow | null;
      setRow(ownData);
      setCoins((wallet.data as any)?.coins ?? null);

      if (ownData && all.data) {
        const pos = (all.data as { learning_score: number }[])
          .findIndex(r => r.learning_score <= ownData.learning_score);
        setRank(pos >= 0 ? pos + 1 : (all.data as any[]).length + 1);
      }
      setLoading(false);
    });
  }, [open, studentName]);

  const STATS = row ? [
    { label: 'Mastery',   value: row.mastery_score,   max: 100, color: 'bg-violet-500',  weight: '35%', tip: `${row.total_mastered} game${row.total_mastered !== 1 ? 's' : ''} mastered` },
    { label: 'Accuracy',  value: row.accuracy_score,  max: 100, color: 'bg-emerald-500', weight: '20%', tip: `${Math.round(row.avg_accuracy_all * 100)}% avg correct` },
    { label: 'Progress',  value: row.progress_score,  max: 100, color: 'bg-blue-500',    weight: '20%', tip: row.improvement_delta > 0 ? `+${(row.improvement_delta * 100).toFixed(1)}% improving` : 'Keep playing to improve' },
    { label: 'Variety',   value: row.diversity_score, max: 100, color: 'bg-amber-500',   weight: '15%', tip: `${row.games_distinct_14d}/7 games this fortnight` },
    { label: 'PlayBits',  value: row.playbits_score,  max: 100, color: 'bg-orange-500',  weight: '10%', tip: `${row.total_playbits.toLocaleString()} total earned` },
  ] : [];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm pointer-events-auto overflow-hidden">

              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800">{studentName}</h2>
                  {grade && <p className="text-xs text-slate-400 font-semibold mt-0.5">Grade {grade}</p>}
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {loading && (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-200 border-t-violet-600" />
                  </div>
                )}

                {!loading && !row && (
                  <p className="text-center text-slate-400 text-sm py-6">
                    No score data yet — play some games to see your stats! 🚀
                  </p>
                )}

                {!loading && row && (
                  <>
                    {/* Score + rank */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 rounded-2xl p-4 text-center"
                        style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
                        <div className="text-3xl font-black text-white">{row.learning_score.toFixed(1)}</div>
                        <div className="text-violet-200 text-xs font-bold mt-0.5">LEARNING SCORE</div>
                      </div>
                      <div className="rounded-2xl p-4 text-center bg-amber-50 border border-amber-100">
                        <div className="text-3xl font-black text-amber-600">
                          {rank != null ? `#${rank}` : '—'}
                        </div>
                        <div className="text-amber-400 text-xs font-bold mt-0.5">RANK</div>
                      </div>
                    </div>

                    {/* PlayBits wallet */}
                    {coins != null && (
                      <div className="rounded-2xl p-3 flex items-center gap-3 bg-orange-50 border border-orange-100">
                        <span className="text-2xl">🪙</span>
                        <div>
                          <div className="font-black text-slate-800 text-lg">{coins.toLocaleString()}</div>
                          <div className="text-xs text-slate-400 font-semibold">PlayBits available</div>
                        </div>
                      </div>
                    )}

                    {/* Score breakdown */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Score Breakdown</p>
                      {STATS.map(s => (
                        <div key={s.label}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-700">{s.label}</span>
                              <span className="text-[9px] bg-slate-100 text-slate-400 font-black px-1.5 py-0.5 rounded-full">{s.weight}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-700">{s.value.toFixed(1)}</span>
                              <span className="text-[9px] text-slate-400 ml-1">{s.tip}</span>
                            </div>
                          </div>
                          <Bar value={s.value} color={s.color} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
