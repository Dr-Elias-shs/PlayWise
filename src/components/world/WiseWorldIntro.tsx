"use client";

/**
 * WiseWorldIntro
 *
 * Magical entry cinematic shown every time a student enters WiseWorld.
 * Plays automatically and calls onDone after ~3.2 s.
 * A small Skip button lets impatient students jump straight in.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { COLORS, ACCESSORIES } from "@/lib/avatar-items";

// ─── Walking character hook ───────────────────────────────────────────────────
function useWalkFrame(fps = 6) {
  const [frame, setFrame] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setFrame(f => (f % 3) + 1), 1000 / fps);
    return () => clearInterval(t);
  }, [fps]);
  return frame;
}

// ─── Magical floating sparkles ────────────────────────────────────────────────
const SPARKLES = [
  { s: "✦",  x: 6,  y: 20, delay: 0.0, scale: 0.8 },
  { s: "⭐", x: 90, y: 15, delay: 0.3, scale: 1.0 },
  { s: "✨", x: 15, y: 70, delay: 0.7, scale: 0.7 },
  { s: "🌟", x: 82, y: 65, delay: 0.2, scale: 0.9 },
  { s: "✦",  x: 50, y: 8,  delay: 1.0, scale: 0.6 },
  { s: "💫", x: 72, y: 80, delay: 0.5, scale: 0.8 },
  { s: "✨", x: 28, y: 40, delay: 1.2, scale: 0.7 },
  { s: "⭐", x: 60, y: 88, delay: 0.8, scale: 0.6 },
  { s: "✦",  x: 38, y: 75, delay: 0.4, scale: 1.0 },
  { s: "🌿", x: 5,  y: 50, delay: 0.9, scale: 0.8 },
  { s: "🌿", x: 92, y: 42, delay: 0.6, scale: 0.7 },
  { s: "💚", x: 20, y: 90, delay: 1.1, scale: 0.6 },
];

// Per-letter spring for "WiseWorld"
const LETTERS = "WiseWorld".split("");

// ─── Dot loader ───────────────────────────────────────────────────────────────
function DotLoader() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-emerald-400"
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  onDone: () => void;
}

export function WiseWorldIntro({ onDone }: Props) {
  const [exiting, setExiting] = useState(false);
  const doneRef  = useRef(false);
  const walkFrame = useWalkFrame(7);
  const { colorId, equippedId } = useGameStore();
  const colorFilter      = COLORS.find(c => c.id === colorId)?.filter ?? '';
  const equippedAcc      = ACCESSORIES.find(a => a.id === equippedId) ?? null;

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setTimeout(onDone, 600);
  }

  // Auto-dismiss after 3.4 s
  useEffect(() => {
    const t = setTimeout(finish, 3400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="wiseworld-intro"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              "linear-gradient(160deg, #011a0e 0%, #022c1a 25%, #064e3b 55%, #065f46 75%, #0d1f0d 100%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(16px)" }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          {/* ── Blurred world-map backdrop ── */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "url('/maps/floor_map.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(6px) saturate(0.4)",
            }}
          />

          {/* ── Ambient top glow ── */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: 600, height: 300,
              background:
                "radial-gradient(ellipse, rgba(52,211,153,0.18) 0%, rgba(16,185,129,0.08) 50%, transparent 75%)",
              filter: "blur(28px)",
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* ── Floating sparkles ── */}
          {SPARKLES.map((sp, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none select-none"
              style={{ left: `${sp.x}%`, top: `${sp.y}%`, fontSize: 18, scale: sp.scale }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0.5, 0.9, 0],
                scale:   [0, sp.scale, sp.scale * 1.2, sp.scale, 0],
                y:       [0, -12, 0, -8, 0],
              }}
              transition={{
                duration: 2.5,
                delay:    sp.delay,
                repeat:   Infinity,
                repeatDelay: 1.2,
                ease: "easeInOut",
              }}
            >
              {sp.s}
            </motion.div>
          ))}

          {/* ── Logos row ── */}
          <motion.div
            className="relative z-10 flex items-center gap-4 mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
          >
            {/* SHS logo */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-2 shadow-lg shadow-black/40">
              <img
                src="/exams-logo.png"
                alt="SHS"
                draggable={false}
                className="w-12 h-12 md:w-14 md:h-14 object-contain"
              />
            </div>

            {/* Separator */}
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className="w-px h-8 bg-gradient-to-b from-transparent via-emerald-400/60 to-transparent"
                animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-emerald-400/50 text-[10px] font-black tracking-widest">×</span>
              <motion.div
                className="w-px h-8 bg-gradient-to-b from-transparent via-emerald-400/60 to-transparent"
                animate={{ scaleY: [0.5, 1, 0.5], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              />
            </div>

            {/* PlayWise logo */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-2 shadow-lg shadow-black/40">
              <img
                src="/playwise-logo.png"
                alt="PlayWise"
                draggable={false}
                className="w-12 h-12 md:w-14 md:h-14 object-contain"
              />
            </div>
          </motion.div>

          {/* ── "WiseWorld" per-letter animation ── */}
          <div className="relative z-10 mb-2">
            {/* Glow behind text */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(52,211,153,0.30) 0%, transparent 68%)",
                filter: "blur(18px)",
                transform: "scale(1.6)",
              }}
            />
            <motion.div
              className="relative flex items-baseline"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.07, delayChildren: 0.45 } },
              }}
            >
              {"WiseWorld".split("").map((ch, i) => (
                <motion.span
                  key={i}
                  className="font-black text-white leading-none"
                  style={{
                    fontSize:   "clamp(3.2rem, 11vw, 6.5rem)",
                    textShadow:
                      i < 4
                        ? "0 0 32px rgba(52,211,153,0.85), 0 0 8px rgba(52,211,153,0.5)"
                        : "0 0 32px rgba(167,243,208,0.80), 0 0 8px rgba(52,211,153,0.5)",
                    color: i < 4 ? "#d1fae5" : "#6ee7b7",
                  }}
                  variants={{
                    hidden: { opacity: 0, y: 40, rotate: -8, scale: 0.6 },
                    show:   {
                      opacity: 1, y: 0, rotate: 0, scale: 1,
                      transition: { type: "spring", stiffness: 260, damping: 20 },
                    },
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* ── Tagline ── */}
          <motion.p
            className="relative z-10 text-emerald-300/70 font-bold tracking-widest uppercase text-xs md:text-sm mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.5 }}
          >
            Your School · Your World
          </motion.p>

          {/* ── Walking character ── */}
          <motion.div
            className="relative z-10 flex flex-col items-center mb-8"
            initial={{ x: -120, opacity: 0 }}
            animate={{ x: 0,    opacity: 1 }}
            transition={{ delay: 1.0, type: "spring", stiffness: 120, damping: 18 }}
          >
            {/* Accessory above character */}
            {equippedAcc && (
              <span className="select-none pointer-events-none" style={{ fontSize: 22, lineHeight: 1, marginBottom: 2 }}>
                {equippedAcc.emoji}
              </span>
            )}
            {/* Shadow under feet */}
            <motion.div
              className="w-10 h-2 bg-black/30 rounded-full blur-sm mt-1"
              animate={{ scaleX: [1, 0.85, 1] }}
              transition={{ duration: 0.28, repeat: Infinity }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/character/walk${walkFrame}.png`}
              alt="Character"
              draggable={false}
              className="w-16 h-16 md:w-20 md:h-20"
              style={{
                marginTop: "-8px",
                filter: [
                  colorFilter,
                  "drop-shadow(0 0 12px rgba(52,211,153,0.7)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
                ].filter(Boolean).join(' '),
              }}
            />
          </motion.div>

          {/* ── Entering World loader ── */}
          <motion.div
            className="relative z-10 flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.4 }}
          >
            <DotLoader />
            <span className="text-emerald-400/80 text-sm font-bold tracking-wider">
              Entering World
            </span>
            <DotLoader />
          </motion.div>

          {/* ── Skip button ── */}
          <motion.button
            className="absolute top-5 right-5 z-20 text-white/30 text-sm font-bold hover:text-white/70 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            onClick={finish}
          >
            Skip →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
