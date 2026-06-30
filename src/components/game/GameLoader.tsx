"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { GameConfig } from "@/lib/gameConfigs";

/**
 * Full-screen loader shown while a game boots.
 * A football player does keepie-uppies — the ball is shot up and down on a
 * loop while the kicking leg swings in sync. Pure SVG + framer-motion (no deps).
 *
 * Calls onDone() after `durationMs` (a few bounces), then the caller swaps in
 * the real game. The fade in/out is handled by the parent's AnimatePresence
 * if present; we also fade our own background in.
 */

interface Props {
  config: GameConfig;
  onDone: () => void;
  /** How long the loader stays up before handing off. */
  durationMs?: number;
}

// One full up→down cycle of the ball, in seconds.
const BOUNCE = 1.0;

export function GameLoader({ config, onDone, durationMs = 2100 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [onDone, durationMs]);

  return (
    <motion.div
      key="game-loader"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: config.bgStyle }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Soft accent glow behind the player */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: "60vmin",
          height: "60vmin",
          background: "radial-gradient(circle, rgba(255,255,255,0.16), transparent 65%)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg viewBox="0 0 200 220" className="relative w-72 h-80 max-w-[80vw] drop-shadow-2xl">
        {/* ── Ground line ── */}
        <line x1="28" y1="190" x2="172" y2="190" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />

        {/* ── Ball's ground shadow (shrinks/fades as the ball rises) ── */}
        <motion.ellipse
          cx="130"
          cy="189"
          rx="16"
          ry="4"
          fill="rgba(0,0,0,0.28)"
          animate={{ scaleX: [1, 0.55, 1], opacity: [0.32, 0.12, 0.32] }}
          transition={{ duration: BOUNCE, times: [0, 0.5, 1], repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "view-box", transformOrigin: "130px 189px" }}
        />

        {/* ── Player (gentle bob) ── */}
        <motion.g
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: BOUNCE, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Head */}
          <circle cx="92" cy="64" r="13" fill="#ffffff" />
          {/* Torso / jersey */}
          <path
            d="M92 78 q-16 4 -16 26 q0 16 16 18 q16 -2 16 -18 q0 -22 -16 -26 Z"
            fill="#ffffff"
          />
          {/* Near arm (swings slightly with the bob) */}
          <line x1="80" y1="92" x2="66" y2="116" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
          {/* Far arm */}
          <line x1="104" y1="92" x2="116" y2="112" stroke="rgba(255,255,255,0.85)" strokeWidth="8" strokeLinecap="round" />
          {/* Standing leg */}
          <line x1="88" y1="120" x2="80" y2="186" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
          {/* Standing foot */}
          <line x1="80" y1="186" x2="70" y2="187" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
        </motion.g>

        {/* ── Kicking leg (pivots at the hip, swings up on each contact) ── */}
        <motion.g
          style={{ transformBox: "view-box", transformOrigin: "96px 122px" }}
          animate={{ rotate: [-52, 14, 14, -52] }}
          transition={{ duration: BOUNCE, times: [0, 0.22, 0.8, 1], repeat: Infinity, ease: "easeInOut" }}
        >
          {/* thigh + shin */}
          <line x1="96" y1="122" x2="120" y2="176" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
          {/* foot */}
          <line x1="120" y1="176" x2="132" y2="174" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
        </motion.g>

        {/* ── Ball (arcs up & down; gravity easing + squash on contact) ── */}
        <motion.g
          animate={{ y: [0, -96, 0], scaleY: [0.82, 1, 1, 0.82], scaleX: [1.18, 1, 1, 1.18] }}
          transition={{
            duration: BOUNCE,
            times: [0, 0.5, 1],
            repeat: Infinity,
            ease: ["easeOut", "easeIn"],
          }}
          style={{ transformBox: "view-box", transformOrigin: "130px 170px" }}
        >
          {/* Continuous spin lives on an inner group */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
            style={{ transformBox: "view-box", transformOrigin: "130px 160px" }}
          >
            <circle cx="130" cy="160" r="13" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
            {/* classic ball spots */}
            <polygon points="130,153 135,157 133,163 127,163 125,157" fill="#0f172a" />
            <circle cx="121" cy="154" r="2.1" fill="#0f172a" />
            <circle cx="139" cy="154" r="2.1" fill="#0f172a" />
            <circle cx="124" cy="166" r="2.1" fill="#0f172a" />
            <circle cx="136" cy="166" r="2.1" fill="#0f172a" />
          </motion.g>
        </motion.g>
      </svg>

      {/* Loading caption */}
      <motion.p
        className="relative mt-2 text-white/80 font-black text-lg tracking-tight"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading {config.title}…
      </motion.p>
    </motion.div>
  );
}
