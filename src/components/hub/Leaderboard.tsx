"use client";

import { useEffect, useState } from "react";
import { getGlobalLeaderboard } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Medal, Star } from "lucide-react";

interface Entry {
  student_name: string;
  score: number;
}

export function Leaderboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data } = await getGlobalLeaderboard();
      if (data) setEntries(data);
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 h-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-brand-accent/20 p-2 rounded-xl text-brand-accent">
          <Trophy size={24} />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Top Students</h2>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {entries.map((entry, index) => (
            <motion.div
              key={`${entry.student_name}-${index}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center justify-between p-4 rounded-2xl border ${
                index === 0 
                  ? "bg-yellow-50 border-yellow-100" 
                  : index === 1 
                  ? "bg-slate-50 border-slate-100" 
                  : index === 2 
                  ? "bg-orange-50 border-orange-100"
                  : "bg-white border-transparent"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  index === 0 ? "bg-yellow-400 text-white" :
                  index === 1 ? "bg-slate-300 text-white" :
                  index === 2 ? "bg-orange-400 text-white" :
                  "bg-slate-100 text-slate-400"
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="font-bold text-slate-700 capitalize">{entry.student_name}</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{entry.score.toLocaleString()} Points</div>
                </div>
              </div>
              
              {index < 3 && (
                <div className={
                  index === 0 ? "text-yellow-500" :
                  index === 1 ? "text-slate-400" :
                  "text-orange-500"
                }>
                  {index === 0 ? <Trophy size={20} /> : <Medal size={20} />}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {entries.length === 0 && (
          <div className="text-center py-12 text-slate-400 font-medium">
            No scores recorded yet. Be the first!
          </div>
        )}
      </div>
    </div>
  );
}
