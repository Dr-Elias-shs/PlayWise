"use client";

/**
 * PlayWiseIntro
 *
 * Full-screen magical intro shown once per browser session.
 * localStorage key "playwise_intro_seen" prevents it repeating.
 * Call resetPlayWiseIntro() from the browser console to see it again.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Reset helper (call from console: resetPlayWiseIntro()) ───────────────────
if (typeof window !== "undefined") {
  (window as any).resetPlayWiseIntro = () => {
    localStorage.removeItem("playwise_intro_seen");
    window.location.reload();
  };
}

export const INTRO_SEEN_KEY = "playwise_intro_seen";

// ─── Floating particle definitions ────────────────────────────────────────────
// Each particle has a symbol, horizontal position (%), animation delay, and
// duration. Kept to 12 for good tablet performance.
const PARTICLES = [
  { s: "✦",  x: 8,  delay: 0.0, dur: 9,  size: 18 },
  { s: "÷",  x: 78, delay: 1.2, dur: 11, size: 22 },
  { s: "📚", x: 22, delay: 2.0, dur: 10, size: 20 },
  { s: "⭐", x: 62, delay: 0.4, dur: 8,  size: 24 },
  { s: "√",  x: 48, delay: 3.1, dur: 12, size: 20 },
  { s: "🔬", x: 87, delay: 1.6, dur: 9,  size: 20 },
  { s: "✨", x: 14, delay: 2.7, dur: 10, size: 16 },
  { s: "π",  x: 55, delay: 0.9, dur: 13, size: 22 },
  { s: "💡", x: 35, delay: 1.9, dur: 8,  size: 20 },
  { s: "×",  x: 70, delay: 3.4, dur: 11, size: 18 },
  { s: "🎓", x: 4,  delay: 4.2, dur: 9,  size: 22 },
  { s: "∑",  x: 93, delay: 2.3, dur: 10, size: 20 },
];

// ─── Tiny twinkling background stars ─────────────────────────────────────────
const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7)  % 100,
  size: (i % 3) + 1,
  delay: (i * 0.17) % 3,
}));

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  onDone: () => void;
}

export function PlayWiseIntro({ onDone }: Props) {
  const [exiting, setExiting] = useState(false);
  const doneCalledRef = useRef(false);

  function finish() {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    localStorage.setItem(INTRO_SEEN_KEY, "1");
    setExiting(true);
    // Wait for exit animation before handing off
    setTimeout(onDone, 550);
  }

  // Auto-dismiss safety — if user ignores everything for 12 s, move on
  useEffect(() => {
    const t = setTimeout(finish, 12_000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="intro-root"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
          style={{
            background:
              "linear-gradient(160deg, #1e1b4b 0%, #312e81 35%, #4c1d95 65%, #1e1b4b 100%)",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: "blur(12px)" }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        >
          {/* ── Static twinkling stars ── */}
          {STARS.map((st) => (
            <motion.div
              key={st.id}
              className="absolute rounded-full bg-white pointer-events-none"
              style={{
                left: `${st.x}%`,
                top:  `${st.y}%`,
                width:  st.size,
                height: st.size,
              }}
              animate={{ opacity: [0.15, 0.8, 0.15] }}
              transition={{
                duration: 2.5 + (st.id % 4) * 0.5,
                delay:    st.delay,
                repeat:   Infinity,
                ease:     "easeInOut",
              }}
            />
          ))}

          {/* ── Floating learning symbols ── */}
          {PARTICLES.map((p, i) => (
            <motion.div
              key={i}
              className="absolute pointer-events-none font-black text-white/25"
              style={{ left: `${p.x}%`, bottom: "-8%", fontSize: p.size }}
              animate={{ y: [-10, -820], opacity: [0, 0.7, 0.5, 0] }}
              transition={{
                duration: p.dur,
                delay:    p.delay,
                repeat:   Infinity,
                ease:     "linear",
              }}
            >
              {p.s}
            </motion.div>
          ))}

          {/* ── Outer ambient glow ── */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 420, height: 420,
              background:
                "radial-gradient(circle, rgba(167,139,250,0.22) 0%, rgba(124,58,237,0.12) 50%, transparent 72%)",
              filter: "blur(32px)",
            }}
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* ── Inner logo glow ring ── */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 200, height: 200,
              background:
                "radial-gradient(circle, rgba(216,180,254,0.35) 0%, rgba(167,139,250,0.15) 55%, transparent 75%)",
              filter: "blur(14px)",
            }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />

          {/* ── Logo ── */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.55, opacity: 0, y: 20 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            transition={{ delay: 0.25, type: "spring", stiffness: 220, damping: 22 }}
          >
            <img
              src="/playwise-logo.png"
              alt="PlayWise"
              draggable={false}
              className="w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-[0_0_24px_rgba(167,139,250,0.7)]"
            />
          </motion.div>

          {/* ── App name ── */}
          <motion.h1
            className="relative z-10 mt-5 text-white font-black tracking-tight"
            style={{ fontSize: "clamp(2rem, 6vw, 3rem)", textShadow: "0 0 30px rgba(167,139,250,0.5)" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.5 }}
          >
            PlayWise
          </motion.h1>

          {/* ── Tagline — staggered word reveal ── */}
          <motion.p
            className="relative z-10 mt-3 flex gap-2 text-lg md:text-xl font-bold"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 1.1 } } }}
          >
            {["Play.", "Learn.", "Grow."].map((word) => (
              <motion.span
                key={word}
                className="text-violet-300"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show:   { opacity: 1, y: 0, transition: { duration: 0.45 } },
                }}
              >
                {word}
              </motion.span>
            ))}
          </motion.p>

          {/* ── Start Adventure button ── */}
          <motion.button
            className="relative z-10 mt-10 px-8 py-4 rounded-2xl text-white font-black text-lg md:text-xl shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #9333ea, #7c3aed)",
              backgroundSize: "200% 200%",
              boxShadow: "0 0 30px rgba(124,58,237,0.55), 0 4px 24px rgba(0,0,0,0.4)",
            }}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0,  scale: 1   }}
            transition={{ delay: 1.55, type: "spring", stiffness: 200, damping: 18 }}
            whileHover={{ scale: 1.06, boxShadow: "0 0 44px rgba(167,139,250,0.7), 0 4px 24px rgba(0,0,0,0.4)" }}
            whileTap={{ scale: 0.97 }}
            onClick={finish}
          >
            Start Adventure ✨
          </motion.button>

          {/* ── Subtle bottom hint ── */}
          <motion.p
            className="relative z-10 mt-5 text-white/25 text-xs font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
          >
            Your learning world awaits
          </motion.p>

          {/* ── Skip button ── */}
          <motion.button
            className="absolute top-5 right-5 z-20 text-white/30 text-sm font-bold hover:text-white/70 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            onClick={finish}
          >
            Skip →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
