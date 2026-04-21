"use client";
import { motion } from 'framer-motion';
import { playSound } from '@/lib/sounds';

export type Level = 'easy' | 'medium' | 'hard';

export const LEVEL_CONFIG = {
  easy:   { label: 'Easy',   emoji: '🌱', desc: 'Small numbers, chill pace',   multiplier: 1,   color: 'from-emerald-400 to-green-500',  glow: '#34d399' },
  medium: { label: 'Medium', emoji: '⚡', desc: 'A real challenge!',           multiplier: 1.5, color: 'from-amber-400 to-orange-500',   glow: '#f59e0b' },
  hard:   { label: 'Hard',   emoji: '🔥', desc: 'Only the brave dare enter',   multiplier: 2,   color: 'from-red-500 to-rose-600',       glow: '#f43f5e' },
} as const;

interface Props {
  onSelect: (level: Level) => void;
  onBack: () => void;
  bgStyle?: string;
}

export function LevelPicker({ onSelect, onBack, bgStyle }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: bgStyle ?? 'linear-gradient(135deg, #1e1b4b, #4c1d95, #6b21a8)' }}>

      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black text-white mb-2">Pick a Level</h2>
          <p className="text-white/50 font-medium">Higher level = more points!</p>
        </div>

        <div className="space-y-4">
          {(Object.entries(LEVEL_CONFIG) as [Level, typeof LEVEL_CONFIG[Level]][]).map(([id, cfg], i) => (
            <motion.button
              key={id}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03, x: 6 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { playSound('click'); onSelect(id); }}
              className="w-full flex items-center gap-5 p-5 rounded-2xl text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${cfg.glow}33, ${cfg.glow}22)`, border: `2px solid ${cfg.glow}44` }}
            >
              {/* Emoji badge */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center text-3xl shadow-md flex-shrink-0`}>
                {cfg.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 text-left">
                <div className="font-black text-xl">{cfg.label}</div>
                <div className="text-white/60 text-sm font-medium">{cfg.desc}</div>
              </div>

              {/* Multiplier badge */}
              <div className={`bg-gradient-to-br ${cfg.color} px-3 py-1.5 rounded-xl text-center flex-shrink-0`}>
                <div className="font-black text-lg leading-none">×{cfg.multiplier}</div>
                <div className="text-white/80 text-xs">points</div>
              </div>
            </motion.button>
          ))}
        </div>

        <button onClick={onBack} className="w-full mt-8 text-white/30 hover:text-white/60 font-medium text-sm transition-colors">
          ← Back
        </button>
      </div>
    </div>
  );
}
