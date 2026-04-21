"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const TABLES = [
  {
    name: "scores",
    sql: `CREATE TABLE IF NOT EXISTS public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  focus_table INTEGER DEFAULT 0,
  game_type TEXT DEFAULT 'multiplication',
  score INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.scores FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;`,
  },
  {
    name: "game_rooms",
    sql: `CREATE TABLE IF NOT EXISTS public.game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_name TEXT NOT NULL,
  host_avatar TEXT DEFAULT '🦁',
  game_id TEXT NOT NULL,
  status TEXT DEFAULT 'waiting',
  player_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.game_rooms FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;`,
  },
  {
    name: "player_wallets",
    sql: `CREATE TABLE IF NOT EXISTS public.player_wallets (
  student_name TEXT PRIMARY KEY,
  coins INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_redeemed INTEGER DEFAULT 0,
  play_time_seconds INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  grade TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.player_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.player_wallets FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_wallets;`,
  },
  {
    name: "shop_items",
    sql: `CREATE TABLE IF NOT EXISTS public.shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cost INTEGER NOT NULL,
  emoji TEXT DEFAULT '🎁',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.shop_items FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    name: "redemptions",
    sql: `CREATE TABLE IF NOT EXISTS public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  item_id UUID REFERENCES public.shop_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  item_emoji TEXT DEFAULT '🎁',
  cost INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.redemptions FOR ALL USING (true) WITH CHECK (true);`,
  },
];

const ALL_SQL = TABLES.map(t => t.sql).join("\n\n");

type Status = "checking" | "ok" | "missing" | "error";

export default function SetupPage() {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    TABLES.forEach(async ({ name }) => {
      setStatuses(s => ({ ...s, [name]: "checking" }));
      const { error } = await supabase.from(name).select("count").limit(1);
      if (!error) {
        setStatuses(s => ({ ...s, [name]: "ok" }));
      } else if (error.code === "42P01" || error.message.includes("does not exist")) {
        setStatuses(s => ({ ...s, [name]: "missing" }));
      } else {
        setStatuses(s => ({ ...s, [name]: "error" }));
      }
    });
  }, []);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const allOk = TABLES.every(t => statuses[t.name] === "ok");
  const anyMissing = TABLES.some(t => statuses[t.name] === "missing");

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1">🛠️ Database Setup</h1>
          <p className="text-slate-400">Check which tables exist and get the SQL to create missing ones.</p>
        </div>

        {/* Status overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {TABLES.map(t => {
            const s = statuses[t.name];
            const icon = s === "ok" ? "✅" : s === "missing" ? "❌" : s === "checking" ? "⏳" : "⚠️";
            const color = s === "ok" ? "border-emerald-500/40 bg-emerald-500/10"
              : s === "missing" ? "border-red-500/40 bg-red-500/10"
              : "border-slate-600 bg-slate-800";
            return (
              <div key={t.name} className={`rounded-xl p-3 border ${color}`}>
                <div className="text-xl mb-1">{icon}</div>
                <div className="font-bold text-sm">{t.name}</div>
                <div className="text-xs text-slate-400 capitalize">{s ?? "—"}</div>
              </div>
            );
          })}
        </div>

        {allOk && (
          <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl p-5 mb-8 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-bold text-emerald-300">All tables are set up correctly!</p>
          </div>
        )}

        {anyMissing && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6">
            <p className="font-bold text-amber-300 mb-2">⚠️ Some tables are missing</p>
            <p className="text-slate-400 text-sm">
              Copy the SQL below, go to{" "}
              <a href="https://supabase.com/dashboard/project/exehbsgplaotkohufxoj/sql/new"
                target="_blank" rel="noreferrer"
                className="text-blue-400 underline">
                Supabase SQL Editor ↗
              </a>
              , paste and click Run.
            </p>
          </div>
        )}

        {/* Copy all button */}
        {anyMissing && (
          <button onClick={() => copy(ALL_SQL, "all")}
            className="w-full mb-6 py-4 rounded-2xl font-black text-lg transition-all"
            style={{ background: copied === "all" ? "#059669" : "linear-gradient(135deg, #7c3aed, #9333ea)" }}>
            {copied === "all" ? "✅ Copied!" : "📋 Copy ALL Missing SQL"}
          </button>
        )}

        {/* Per-table SQL */}
        <div className="space-y-4">
          {TABLES.filter(t => statuses[t.name] !== "ok").map(t => (
            <div key={t.name} className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <span className="font-bold text-amber-300">{t.name}</span>
                <button onClick={() => copy(t.sql, t.name)}
                  className="px-4 py-1.5 rounded-xl text-sm font-bold transition-colors"
                  style={{ background: copied === t.name ? "#059669" : "#4f46e5" }}>
                  {copied === t.name ? "✅ Copied" : "Copy SQL"}
                </button>
              </div>
              <pre className="p-4 text-xs text-slate-300 overflow-x-auto leading-relaxed">
                {t.sql}
              </pre>
            </div>
          ))}
        </div>

        <p className="text-slate-600 text-xs text-center mt-8">
          PlayWise Setup · {typeof window !== "undefined" ? window.location.hostname : ""}
        </p>
      </div>
    </div>
  );
}
