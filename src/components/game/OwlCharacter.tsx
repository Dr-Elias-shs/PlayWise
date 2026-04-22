"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type OwlMood = 'idle' | 'correct' | 'wrong' | 'thinking' | 'celebrate';

// ─── Colors per mood ──────────────────────────────────────────────────────────

const PALETTE: Record<OwlMood, { body: string; face: string; stripe: string }> = {
  idle:      { body: '#6d28d9', face: '#8b5cf6', stripe: '#a78bfa' },
  thinking:  { body: '#4f46e5', face: '#6366f1', stripe: '#818cf8' },
  correct:   { body: '#059669', face: '#10b981', stripe: '#34d399' },
  wrong:     { body: '#dc2626', face: '#ef4444', stripe: '#f87171' },
  celebrate: { body: '#b45309', face: '#d97706', stripe: '#fbbf24' },
};

const MESSAGES: Record<OwlMood, string> = {
  idle:      "Let's solve this! 🧩",
  thinking:  'Read carefully... 👀',
  correct:   'Good job! ⭐',
  wrong:     'Try again! 💪',
  celebrate: 'Amazing! 🎉',
};

// ─── Owl SVG ──────────────────────────────────────────────────────────────────

function OwlSVG({ mood }: { mood: OwlMood }) {
  const [eyeOpen, setEyeOpen] = useState(true);
  const c = PALETTE[mood];

  // Auto-blink
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    function scheduleBlink() {
      timeout = setTimeout(() => {
        setEyeOpen(false);
        setTimeout(() => { setEyeOpen(true); scheduleBlink(); }, 130);
      }, 2400 + Math.random() * 2000);
    }
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  const eyeScale = eyeOpen ? (mood === 'wrong' ? 0.65 : 1) : 0.07;
  const brow     = mood === 'thinking';

  return (
    <motion.div
      animate={
        mood === 'idle'      ? { y: [0, -7, 0] } :
        mood === 'thinking'  ? { y: [0, -4, 0] } :
        mood === 'correct'   ? { y: [0, -22, 2, -12, 0], scale: [1, 1.18, 0.95, 1.08, 1] } :
        mood === 'wrong'     ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } :
                               { y: [0, -24, 0], rotate: [-6, 6, -3, 3, 0], scale: [1, 1.22, 1] }
      }
      transition={
        mood === 'idle' || mood === 'thinking'
          ? { repeat: Infinity, duration: 2.6, ease: 'easeInOut' }
          : { duration: 0.6, ease: 'easeOut' }
      }
      style={{ display: 'inline-block' }}
    >
      <svg viewBox="0 0 100 128" width="100" height="128" xmlns="http://www.w3.org/2000/svg">

        {/* Ear tufts */}
        <path d="M 35 16 L 28 1 L 40 11 Z"  fill={c.body} />
        <path d="M 65 16 L 72 1 L 60 11 Z"  fill={c.body} />

        {/* Head */}
        <circle cx="50" cy="40" r="28" fill={c.body} />

        {/* Face disc */}
        <ellipse cx="50" cy="42" rx="20" ry="18" fill={c.face} />

        {/* ── Left eye ── */}
        <g style={{ transformOrigin: '40px 37px' } as React.CSSProperties}>
          <motion.ellipse cx="40" cy="37" rx="9.5" ry="9.5" fill="white"
            animate={{ scaleY: eyeScale }}
            transition={{ duration: 0.1 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties}
          />
          <motion.ellipse cx="40" cy="37" rx="5.5" ry="5.5" fill="#180e3a"
            animate={{ scaleY: eyeScale }}
            transition={{ duration: 0.1 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties}
          />
          <circle cx="37" cy="34" r="2" fill="white" opacity="0.9" />
        </g>

        {/* ── Right eye ── */}
        <g style={{ transformOrigin: '60px 37px' } as React.CSSProperties}>
          <motion.ellipse cx="60" cy="37" rx="9.5" ry="9.5" fill="white"
            animate={{ scaleY: eyeScale }}
            transition={{ duration: 0.1 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties}
          />
          <motion.ellipse cx="60" cy="37" rx="5.5" ry="5.5" fill="#180e3a"
            animate={{ scaleY: eyeScale }}
            transition={{ duration: 0.1 }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' } as React.CSSProperties}
          />
          <circle cx="57" cy="34" r="2" fill="white" opacity="0.9" />
        </g>

        {/* Thinking eyebrows */}
        {brow && (
          <>
            <path d="M 32 27 Q 38 24 44 26" stroke="#180e3a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 56 26 Q 62 24 68 27" stroke="#180e3a" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Beak */}
        <polygon points="50,46 44,56 56,56" fill="#f59e0b" />

        {/* Body */}
        <ellipse cx="50" cy="98" rx="26" ry="29" fill={c.body} />

        {/* Belly */}
        <ellipse cx="50" cy="99" rx="18" ry="21" fill={c.face} />

        {/* Belly stripes */}
        {[90, 97, 104, 111].map((y, i) => (
          <line key={i} x1="41" y1={y} x2="59" y2={y}
            stroke={c.stripe} strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        ))}

        {/* Left wing */}
        <motion.path d="M 24 82 Q 3 64 7 47 Q 19 60 24 82 Z"
          fill={c.body}
          animate={
            mood === 'correct' || mood === 'celebrate'
              ? { y: [0, -14, 2, -7, 0] }
              : { y: 0 }
          }
          transition={{ duration: 0.55 }}
        />

        {/* Right wing */}
        <motion.path d="M 76 82 Q 97 64 93 47 Q 81 60 76 82 Z"
          fill={c.body}
          animate={
            mood === 'correct' || mood === 'celebrate'
              ? { y: [0, -14, 2, -7, 0] }
              : { y: 0 }
          }
          transition={{ duration: 0.55, delay: 0.06 }}
        />

        {/* Feet */}
        <ellipse cx="40" cy="125" rx="9"  ry="3.5" fill={c.body} opacity="0.75" />
        <ellipse cx="60" cy="125" rx="9"  ry="3.5" fill={c.body} opacity="0.75" />

        {/* Celebrate sparkles */}
        {mood === 'celebrate' && (
          <>
            <motion.text x="8"  y="22" fontSize="13"
              animate={{ opacity: [0, 1, 0], y: [22, 12, 22] }}
              transition={{ repeat: Infinity, duration: 0.9 }}>⭐</motion.text>
            <motion.text x="76" y="22" fontSize="13"
              animate={{ opacity: [0, 1, 0], y: [22, 12, 22] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: 0.25 }}>✨</motion.text>
          </>
        )}

        {/* Correct check */}
        {mood === 'correct' && (
          <motion.text x="38" y="18" fontSize="16"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400 }}>✓</motion.text>
        )}
      </svg>
    </motion.div>
  );
}

// ─── Full character with speech bubble ───────────────────────────────────────

export function OwlCharacter({ mood }: { mood: OwlMood }) {
  return (
    <div className="flex items-center gap-3">
      <OwlSVG mood={mood} />

      <AnimatePresence mode="wait">
        <motion.div
          key={mood}
          initial={{ scale: 0, opacity: 0, x: -12 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0, opacity: 0, x: -12 }}
          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
          className={`relative px-4 py-2.5 rounded-2xl text-sm font-black shadow-lg border max-w-[160px]
            ${mood === 'correct' || mood === 'celebrate'
              ? 'bg-emerald-500 text-white border-emerald-400/40'
              : mood === 'wrong'
              ? 'bg-red-500 text-white border-red-400/40'
              : mood === 'thinking'
              ? 'bg-indigo-500 text-white border-indigo-400/40'
              : 'bg-white text-slate-800 border-white/40'}`}
        >
          {/* Tail */}
          <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0
            border-t-[7px] border-b-[7px] border-r-[12px] border-t-transparent border-b-transparent
            ${mood === 'correct' || mood === 'celebrate' ? 'border-r-emerald-500'
              : mood === 'wrong' ? 'border-r-red-500'
              : mood === 'thinking' ? 'border-r-indigo-500'
              : 'border-r-white'}`}
          />
          {MESSAGES[mood]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
