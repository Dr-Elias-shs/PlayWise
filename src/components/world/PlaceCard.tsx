"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LoopVideo } from './LoopVideo';
import { PLACES } from '@/lib/world';
import type { GameConfig } from '@/lib/gameConfigs';

// A game on the hub, shown as its place in PlayWise Valley. The picture comes alive
// (a short loop) while it is in the spotlight or under the pointer; only one card
// plays at a time so older tablets stay smooth.
export function PlaceCard({ config, onClick, spotlight, badge, index = 0 }: {
  config: GameConfig;
  onClick: () => void;
  spotlight: boolean;
  badge?: string;
  index?: number;
}) {
  const place = PLACES[config.id];
  const [hover, setHover] = useState(false);
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97, y: 2 }}
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="group relative text-left rounded-[28px] bg-white overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
      style={{ boxShadow: '0 6px 0 rgba(15,60,40,0.18), 0 14px 30px -12px rgba(15,60,40,0.35)' }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {place ? (
          <LoopVideo src={place.loop} poster={place.card} play={spotlight || hover}
            className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl" style={{ background: config.cardStyle }}>{config.emoji}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.35), transparent)' }} />
        {place && (
          <span className="absolute left-3 bottom-2.5 text-white text-[11px] font-black uppercase tracking-wider drop-shadow">
            {place.name}
          </span>
        )}
        {badge && (
          <span className="absolute right-3 top-3 bg-white/90 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full shadow">
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 pt-3 pb-4 flex items-end gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg sm:text-xl font-extrabold text-slate-800 leading-tight">
            <span className="mr-1.5">{config.emoji}</span>{config.title}
          </h3>
          <p className="text-slate-500 text-xs sm:text-[13px] mt-0.5 leading-snug line-clamp-2">{config.description}</p>
        </div>
        <span className="shrink-0 bg-amber-400 text-amber-950 text-sm font-black px-3.5 py-2 rounded-2xl transition-transform group-hover:translate-x-0.5"
          style={{ boxShadow: '0 3px 0 #b45309' }}>
          Play
        </span>
      </div>
    </motion.button>
  );
}
