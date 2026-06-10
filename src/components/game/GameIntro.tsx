"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { GameConfig } from "@/lib/gameConfigs";

// ─── Per-game extras ──────────────────────────────────────────────────────────

interface GameExtras {
  tagline: string;
  tips: string[];
  decorations: string[];
  accentLight: string; // lighter tint for glass cards
}

const EXTRAS: Record<string, GameExtras> = {
  addition: {
    tagline: "Race the clock — add and subtract your way to the top!",
    tips: ["Choose Easy / Medium / Hard before you start", "Streaks multiply your coins 🔥", "You have 60 seconds — go fast!"],
    decorations: ["➕", "➖", "🔢", "⚡", "💨", "🏅"],
    accentLight: "rgba(59,130,246,0.18)",
  },
  multiplication: {
    tagline: "Blitz your times tables faster than anyone in your class!",
    tips: ["Pick a target table then beat the deck", "Hard mode gives bigger coin rewards 💰", "Aim for a perfect streak!"],
    decorations: ["✖️", "⚡", "🔥", "💥", "🏆", "🌟"],
    accentLight: "rgba(139,92,246,0.18)",
  },
  division: {
    tagline: "Split numbers at lightning speed — how far can you dash?",
    tips: ["Think: what times divisor = dividend?", "Harder levels → longer chains → more coins", "No guessing — precision wins!"],
    decorations: ["➗", "🏎️", "💨", "🎯", "🔢", "⚡"],
    accentLight: "rgba(249,115,22,0.18)",
  },
  fractions: {
    tagline: "Slice it right — fractions are just pizza math!",
    tips: ["Easy: same bottom numbers only", "Medium & Hard: find a common denominator", "More time on Hard — think carefully"],
    decorations: ["🍕", "🔢", "✂️", "🎯", "📐", "💡"],
    accentLight: "rgba(236,72,153,0.18)",
  },
  brain: {
    tagline: "Read carefully — every word in the problem matters!",
    tips: ["These are real-world word problems", "Draw it out if you're stuck 📝", "Take your time — there's no timer!"],
    decorations: ["🧩", "💡", "🔍", "🤔", "📚", "🧠"],
    accentLight: "rgba(79,70,229,0.18)",
  },
  hangman: {
    tagline: "Guess the word letter by letter — before it's too late!",
    tips: ["Start with common letters: E, T, A, O, I", "Wrong guesses bring the figure closer", "Use the on-screen keyboard!"],
    decorations: ["🔤", "❓", "💀", "🔑", "📖", "🪢"],
    accentLight: "rgba(79,70,229,0.18)",
  },
  memory: {
    tagline: "Flip two cards — match the math pairs to win!",
    tips: ["Remember where each card is hiding", "Match equals: e.g. 6×7 pairs with 42", "Fewer flips = higher score!"],
    decorations: ["🧠", "🃏", "👁️", "💡", "🎴", "✨"],
    accentLight: "rgba(79,70,229,0.18)",
  },
  trivia: {
    tagline: "History, science, sports & more — show what you know!",
    tips: ["4 choices per question — pick the best", "Topics range across all subjects", "Every correct answer earns coins!"],
    decorations: ["🎯", "🌍", "🔬", "⚽", "🏛️", "💡"],
    accentLight: "rgba(79,70,229,0.18)",
  },
  chess: {
    tagline: "Outsmart your opponent — every move matters!",
    tips: ["Play vs AI or challenge a classmate live", "Control the center early ♟️", "Think two moves ahead!"],
    decorations: ["♟️", "♛", "♜", "🏆", "🤺", "🧠"],
    accentLight: "rgba(30,58,95,0.35)",
  },
  "spelling-bee": {
    tagline: "Listen carefully — then spell it perfectly!",
    tips: ["Press 🔊 to hear the word again", "Tap letters on the keyboard below", "Pick your voice in the lobby!"],
    decorations: ["🐝", "🔊", "🔤", "✨", "🌟", "🎧"],
    accentLight: "rgba(21,101,192,0.25)",
  },
};

// ─── Floating particle ────────────────────────────────────────────────────────

function FloatingDeco({ emoji, index }: { emoji: string; index: number }) {
  const x = 8 + ((index * 73 + 17) % 84);
  const y = 5 + ((index * 47 + 31) % 80);
  const size = 1.4 + (index % 3) * 0.5;
  const dur  = 3.5 + (index % 4) * 1.2;
  const del  = (index * 0.4) % 2.4;

  return (
    <motion.div
      className="absolute pointer-events-none select-none"
      style={{ left: `${x}%`, top: `${y}%`, fontSize: `${size}rem`, opacity: 0.18 + (index % 3) * 0.07 }}
      animate={{ y: [0, -14, 0], rotate: [-4, 4, -4] }}
      transition={{ duration: dur, repeat: Infinity, delay: del, ease: "easeInOut" }}
    >
      {emoji}
    </motion.div>
  );
}

// ─── Tip pill ─────────────────────────────────────────────────────────────────

function TipPill({ tip, delay }: { tip: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-start gap-2 text-sm"
    >
      <span className="text-white/50 font-black mt-0.5">›</span>
      <span className="text-white/70 font-medium leading-snug">{tip}</span>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  config: GameConfig;
  onPlay: () => void;
  onBack: () => void;
}

export function GameIntro({ config, onPlay, onBack }: Props) {
  const extras = EXTRAS[config.id] ?? {
    tagline: config.description,
    tips: ["Good luck!"],
    decorations: [config.emoji],
    accentLight: "rgba(255,255,255,0.1)",
  };

  const [pressed, setPressed] = useState(false);

  // Keyboard shortcut: Enter = play, Escape = back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter")  { setPressed(true); setTimeout(onPlay, 180); }
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onPlay, onBack]);

  return (
    <AnimatePresence>
      <motion.div
        key="game-intro"
        className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center p-4"
        style={{ background: config.bgStyle }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Floating decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {extras.decorations.map((d, i) => <FloatingDeco key={i} emoji={d} index={i} />)}
          {/* Extra large faint center glow */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${extras.accentLight}, transparent)` }}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          onClick={onBack}
          className="absolute top-5 left-5 bg-white/10 backdrop-blur-sm border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-all rounded-2xl px-4 py-2 text-sm font-bold z-20"
        >
          ← Hub
        </motion.button>

        {/* Center card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.05 }}
          className="relative z-10 w-full max-w-sm"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "2.5rem",
            padding: "2.5rem 2rem 2rem",
          }}
        >
          {/* Emoji hero */}
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
            className="text-center mb-5"
          >
            <motion.span
              className="text-8xl inline-block"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            >
              {config.emoji}
            </motion.span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, type: "spring", stiffness: 260, damping: 22 }}
            className="text-3xl font-black text-white text-center tracking-tight mb-2"
          >
            {config.title}
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.38 }}
            className="text-white/55 text-sm text-center font-medium leading-snug mb-6 px-2"
          >
            {extras.tagline}
          </motion.p>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.44 }}
            className="rounded-2xl px-4 py-3.5 mb-6 space-y-2"
            style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white/35 text-xs font-black uppercase tracking-widest mb-2">How to play</p>
            {extras.tips.map((tip, i) => (
              <TipPill key={i} tip={tip} delay={0.50 + i * 0.08} />
            ))}
          </motion.div>

          {/* Play button */}
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 22 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setPressed(true); setTimeout(onPlay, 180); }}
            disabled={pressed}
            className="w-full relative overflow-hidden font-black text-lg py-4 rounded-2xl text-white transition-all"
            style={{ background: config.accentStyle || config.cardStyle }}
          >
            {/* Shine sweep */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.22) 50%, transparent 60%)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
            />
            <span className="relative z-10">
              {pressed ? "Loading…" : "Let's Play! →"}
            </span>
          </motion.button>

          {/* Keyboard hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75 }}
            className="text-white/20 text-xs text-center mt-3 font-medium hidden sm:block"
          >
            Press Enter to start · Esc to go back
          </motion.p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
