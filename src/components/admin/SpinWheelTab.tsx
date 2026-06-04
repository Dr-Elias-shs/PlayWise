"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SpinRecord {
  id: string;
  student_name: string;
  amount: number;
  game_id: string;
  created_at: string;
}

const PRIZE_META: Record<string, { emoji: string; label: string; color: string }> = {
  pb5:    { emoji: '🪙', label: '+5 coins',   color: 'bg-amber-100  text-amber-700'  },
  pb10:   { emoji: '🪙', label: '+10 coins',  color: 'bg-blue-100   text-blue-700'   },
  pb15:   { emoji: '✨', label: '+15 coins',  color: 'bg-violet-100 text-violet-700' },
  pb25:   { emoji: '💰', label: '+25 coins',  color: 'bg-emerald-100 text-emerald-700' },
  pb50:   { emoji: '🎉', label: '+50 coins',  color: 'bg-pink-100   text-pink-700'   },
  box:    { emoji: '🎁', label: '+100 coins', color: 'bg-orange-100 text-orange-700' },
  try:    { emoji: '🔄', label: 'Try Again',  color: 'bg-slate-100  text-slate-500'  },
  double: { emoji: '🚀', label: '2× (visual only)', color: 'bg-red-100 text-red-500' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function todayUTC() { return new Date().toISOString().split('T')[0]; }

export function SpinWheelTab() {
  const [records,  setRecords]  = useState<SpinRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [dayFilter, setDayFilter] = useState<'all' | 'today'>('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from('coin_transactions')
        .select('id, student_name, amount, game_id, created_at')
        .eq('source', 'spin_wheel')
        .order('created_at', { ascending: false })
        .limit(500);
      if (dayFilter === 'today') {
        const d = todayUTC();
        q = q.gte('created_at', `${d}T00:00:00Z`);
      }
      const { data } = await q;
      setRecords((data ?? []) as SpinRecord[]);
      setLoading(false);
    })();
  }, [dayFilter]);

  const totalSpins  = records.length;
  const totalCoins  = records.reduce((s, r) => s + (r.amount ?? 0), 0);
  const tryAgains   = records.filter(r => r.game_id === 'try').length;
  const uniqueSpinners = new Set(records.map(r => r.student_name)).size;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Spins',     value: totalSpins,     emoji: '🎡' },
          { label: 'Unique Students', value: uniqueSpinners, emoji: '👤' },
          { label: 'Coins Given Out', value: totalCoins,     emoji: '🪙' },
          { label: 'Try Agains',      value: tryAgains,      emoji: '🔄' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className="text-2xl font-black text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400 font-semibold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-black text-slate-800">🎡 Spin History</h3>
          <div className="flex gap-2">
            {(['all', 'today'] as const).map(f => (
              <button key={f} onClick={() => setDayFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  dayFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>
                {f === 'all' ? 'All Time' : 'Today'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm py-8 text-center">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">No spins yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Student</th>
                  <th className="pb-2 pr-4">Prize</th>
                  <th className="pb-2 pr-4">Coins</th>
                  <th className="pb-2">Date / Time</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const meta = PRIZE_META[r.game_id] ?? { emoji: '❓', label: r.game_id, color: 'bg-slate-100 text-slate-500' };
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-4 text-slate-300 font-mono text-xs">{i + 1}</td>
                      <td className="py-2.5 pr-4 font-semibold text-slate-700 max-w-[160px] truncate">{r.student_name}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${meta.color}`}>
                          {meta.emoji} {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {r.amount > 0
                          ? <span className="font-black text-emerald-600">+{r.amount}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="py-2.5 text-slate-400 text-xs whitespace-nowrap">{formatDate(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
