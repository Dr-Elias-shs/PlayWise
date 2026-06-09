"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Rating {
  id: string;
  student_name: string;
  stars: number;
  created_at: string;
}

function StarDisplay({ stars, size = 'sm' }: { stars: number; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'text-2xl' : 'text-sm';
  return (
    <span className={s}>
      {'⭐'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function WorldRatingsTab() {
  const [ratings,  setRatings]  = useState<Rating[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('world_ratings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) setError(error.message);
      else setRatings((data ?? []) as Rating[]);
      setLoading(false);
    })();
  }, []);

  const total    = ratings.length;
  const avg      = total ? (ratings.reduce((s, r) => s + r.stars, 0) / total) : 0;
  const dist     = [5, 4, 3, 2, 1].map(s => ({ stars: s, count: ratings.filter(r => r.stars === s).length }));

  return (
    <div className="space-y-6">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm font-semibold">
          ⚠️ Could not load ratings — Supabase may still be recovering. Try again later.<br />
          <span className="text-red-400 text-xs font-normal">{error}</span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl font-black text-slate-800">{total}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Total Ratings</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center">
          <div className="text-3xl font-black text-emerald-600">{total ? avg.toFixed(1) : '—'}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Average Stars</div>
          {total > 0 && <div className="text-base mt-0.5">{'⭐'.repeat(Math.round(avg))}</div>}
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-wide">Distribution</div>
          <div className="space-y-1.5">
            {dist.map(({ stars, count }) => (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs w-4 text-slate-500 font-bold">{stars}</span>
                <span className="text-xs">⭐</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: total ? `${(count / total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ratings table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-black text-slate-800 mb-4">🌍 Student Ratings</h3>

        {loading ? (
          <p className="text-slate-400 text-sm py-8 text-center">Loading…</p>
        ) : ratings.length === 0 && !error ? (
          <div className="py-12 text-center space-y-2">
            <div className="text-4xl">🌟</div>
            <p className="text-slate-400 text-sm">No ratings yet — students will rate from the World coming-soon page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Student</th>
                  <th className="pb-2 pr-4">Rating</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((r, i) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-4 text-slate-300 font-mono text-xs">{i + 1}</td>
                    <td className="py-2.5 pr-4 font-semibold text-slate-700 max-w-[180px] truncate">{r.student_name}</td>
                    <td className="py-2.5 pr-4">
                      <StarDisplay stars={r.stars} />
                    </td>
                    <td className="py-2.5 text-slate-400 text-xs whitespace-nowrap">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
