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
  display_name TEXT DEFAULT '',
  coins INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_redeemed INTEGER DEFAULT 0,
  play_time_seconds INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  grade TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Add display_name if upgrading existing table
ALTER TABLE public.player_wallets ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';
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
  {
    name: "coin_transactions",
    sql: `CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  game_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.coin_transactions FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    name: "game_sessions",
    sql: `CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  coins_earned INTEGER DEFAULT 0,
  play_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.game_sessions FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    name: "global_config",
    sql: `CREATE TABLE IF NOT EXISTS public.global_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.global_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.global_config FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    name: "table_progress",
    sql: `CREATE TABLE IF NOT EXISTS public.table_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  table_number INT NOT NULL,
  last_accuracy DECIMAL(5,4) DEFAULT NULL,
  best_accuracy DECIMAL(5,4) DEFAULT 0,
  sessions_today INT DEFAULT 0,
  last_session_date DATE DEFAULT NULL,
  mastered BOOLEAN DEFAULT false,
  mastery_bonus_given BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_name, table_number)
);
ALTER TABLE public.table_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.table_progress FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    name: "student_daily",
    sql: `CREATE TABLE IF NOT EXISTS public.student_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  date DATE NOT NULL,
  variety_4_bonus_given BOOLEAN DEFAULT false,
  variety_6_bonus_given BOOLEAN DEFAULT false,
  UNIQUE(student_name, date)
);
ALTER TABLE public.student_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.student_daily FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    name: "game_performance",
    sql: `CREATE TABLE IF NOT EXISTS public.game_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  sessions_count INT DEFAULT 0,
  avg_accuracy DECIMAL(5,4) DEFAULT 0,
  best_accuracy DECIMAL(5,4) DEFAULT 0,
  prev_accuracy DECIMAL(5,4) DEFAULT NULL,
  last_accuracy DECIMAL(5,4) DEFAULT NULL,
  mastered BOOLEAN DEFAULT false,
  last_played_at TIMESTAMPTZ DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_name, game_id)
);
ALTER TABLE public.game_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.game_performance FOR ALL USING (true) WITH CHECK (true);`,
  },
  {
    name: "learning_scores",
    sql: `CREATE TABLE IF NOT EXISTS public.learning_scores (
  student_name TEXT PRIMARY KEY,
  grade TEXT DEFAULT '',
  mastery_score DECIMAL(6,2) DEFAULT 0,
  accuracy_score DECIMAL(6,2) DEFAULT 0,
  progress_score DECIMAL(6,2) DEFAULT 0,
  diversity_score DECIMAL(6,2) DEFAULT 0,
  playbits_score DECIMAL(6,2) DEFAULT 0,
  learning_score DECIMAL(6,2) DEFAULT 0,
  games_distinct_14d INT DEFAULT 0,
  avg_accuracy_all DECIMAL(5,4) DEFAULT 0,
  improvement_delta DECIMAL(6,4) DEFAULT 0,
  total_mastered INT DEFAULT 0,
  total_playbits INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.learning_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.learning_scores FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.learning_scores;`,
  },
  {
    name: "world_rooms",
    sql: `CREATE TABLE IF NOT EXISTS public.world_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  host_name TEXT NOT NULL,
  map_id TEXT NOT NULL DEFAULT 'school',
  status TEXT DEFAULT 'waiting',
  player_count INT DEFAULT 0,
  max_players INT DEFAULT 8,
  team_score INT DEFAULT 0,
  start_time TIMESTAMPTZ DEFAULT NULL,
  end_time TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.world_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.world_rooms FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_rooms;

-- Helper RPCs
CREATE OR REPLACE FUNCTION increment_world_room_players(p_room_code TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE world_rooms SET player_count = player_count + 1 WHERE room_code = p_room_code;
$$;

CREATE OR REPLACE FUNCTION decrement_world_room_players(p_room_code TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE world_rooms SET player_count = GREATEST(0, player_count - 1) WHERE room_code = p_room_code;
$$;

CREATE OR REPLACE FUNCTION increment_world_team_score(p_room_code TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE world_rooms SET team_score = team_score + 10 WHERE room_code = p_room_code;
$$;`,
  },
  {
    name: "world_players",
    sql: `CREATE TABLE IF NOT EXISTS public.world_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  player_name TEXT NOT NULL,
  color_id TEXT DEFAULT 'green',
  equipped_id TEXT DEFAULT NULL,
  x DECIMAL(8,2) DEFAULT 450,
  y DECIMAL(8,2) DEFAULT 324,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  rooms_solved INT DEFAULT 0,
  coins_earned INT DEFAULT 0,
  is_host BOOLEAN DEFAULT false,
  UNIQUE(room_code, player_name)
);
ALTER TABLE public.world_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.world_players FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.world_players;

CREATE OR REPLACE FUNCTION increment_world_player_rooms(p_room_code TEXT, p_player_name TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE world_players SET rooms_solved = rooms_solved + 1
  WHERE room_code = p_room_code AND player_name = p_player_name;
$$;`,
  },
  {
    name: "world_answers",
    sql: `CREATE TABLE IF NOT EXISTS public.world_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  player_name TEXT NOT NULL,
  room_key TEXT NOT NULL,
  correct BOOLEAN DEFAULT false,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_code, player_name, room_key)
);
ALTER TABLE public.world_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON public.world_answers FOR ALL USING (true) WITH CHECK (true);`,
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
