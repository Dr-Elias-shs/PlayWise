"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { addCoins } from "@/lib/wallet";
import { recordGameResult } from "@/lib/learningScore";

// ─── Question generator ───────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";

interface Question {
  text: string;
  answer: number;
  choices: number[];
}

function randInt(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function makeChoices(ans: number, lo: number, hi: number): number[] {
  const set = new Set([ans]);
  let tries = 0;
  while (set.size < 4 && tries++ < 200) {
    const d = randInt(1, Math.max(2, Math.floor((hi - lo) / 3) + 2));
    const w = ans + (Math.random() > 0.5 ? d : -d);
    if (w > 0 && w !== ans) set.add(w);
  }
  return Array.from(set).sort(() => Math.random() - 0.5);
}

function generateQuestion(diff: Difficulty): Question {
  if (diff === "easy") {
    const op = Math.random() > 0.5 ? "+" : "−";
    if (op === "+") {
      const a = randInt(1, 20), b = randInt(1, 20);
      return { text: `${a} + ${b}`, answer: a + b, choices: makeChoices(a + b, 1, 40) };
    } else {
      const b = randInt(1, 15), a = randInt(b + 1, 20);
      return { text: `${a} − ${b}`, answer: a - b, choices: makeChoices(a - b, 0, 20) };
    }
  }
  if (diff === "medium") {
    const a = randInt(2, 9), b = randInt(2, 9);
    return { text: `${a} × ${b}`, answer: a * b, choices: makeChoices(a * b, 2, 81) };
  }
  // hard: division
  const div = randInt(2, 10), quot = randInt(2, 12);
  return { text: `${div * quot} ÷ ${div}`, answer: quot, choices: makeChoices(quot, 1, 12) };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const KICKS = 5;
const TIME_BY_DIFF: Record<Difficulty, number> = { easy: 12, medium: 10, hard: 8 };

// Ball target zones — tuned so ball lands inside the goal net, not above it
const GOAL_ZONES = [
  { x: -22, y: -30 }, // top-left corner
  { x:  22, y: -30 }, // top-right corner
  { x: -16, y: -25 }, // mid-left
  { x:  16, y: -25 }, // mid-right
];

type KickState = "idle" | "animating" | "result";
type KickResult = "goal" | "saved" | "timeout";
type KeeperPose = "stand" | "dive-left" | "dive-right" | "miss-left" | "miss-right";

// ─── Difficulty picker ────────────────────────────────────────────────────────

function DiffPicker({ onPick }: { onPick: (d: Difficulty) => void }) {
  const opts: { d: Difficulty; label: string; desc: string; emoji: string; color: string }[] = [
    { d: "easy",   label: "Easy",   desc: "Addition & subtraction",  emoji: "⚽", color: "#16a34a" },
    { d: "medium", label: "Medium", desc: "Multiplication tables",    emoji: "🔥", color: "#d97706" },
    { d: "hard",   label: "Hard",   desc: "Division challenges",      emoji: "💥", color: "#dc2626" },
  ];
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 p-6"
      style={{ background: "linear-gradient(160deg,#0a3d0a,#1a5c1a,#0d2b0d)" }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="text-6xl text-center mb-1">⚽</div>
        <h1 className="text-3xl font-black text-white text-center">Penalty Shootout</h1>
        <p className="text-white/50 text-center text-sm mt-1">Choose your difficulty</p>
      </motion.div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {opts.map(({ d, label, desc, emoji, color }, i) => (
          <motion.button key={d}
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => onPick(d)}
            className="flex items-center gap-4 p-4 rounded-2xl text-white font-bold text-left"
            style={{ background: `${color}cc`, border: `2px solid ${color}` }}
          >
            <span className="text-3xl">{emoji}</span>
            <div>
              <div className="text-lg font-black">{label}</div>
              <div className="text-sm opacity-70">{desc}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── End screen ───────────────────────────────────────────────────────────────

function EndScreen({ scored, total, coins, onAgain, onBack }:
  { scored: number; total: number; coins: number; onAgain: () => void; onBack: () => void }) {
  const msg =
    scored === 5 ? { text: "Perfect Shootout!", sub: "World class! 🏆", color: "#f59e0b" } :
    scored >= 4  ? { text: "Almost Perfect!",   sub: "So close! 🌟",    color: "#22c55e" } :
    scored >= 3  ? { text: "Hat-trick!",         sub: "Great effort! ⚽", color: "#3b82f6" } :
    scored >= 2  ? { text: "Keep Practicing!",   sub: "You'll get it! 💪", color: "#8b5cf6" } :
                   { text: "Don't Give Up!",      sub: "Try again! 🔥",   color: "#ef4444" };

  const kicks = Array.from({ length: total }, (_, i) => i < scored);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 p-6"
      style={{ background: "linear-gradient(160deg,#0a3d0a,#1a5c1a,#0d2b0d)" }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="text-center">
        <div className="text-6xl mb-3">{scored >= 3 ? "🏆" : "⚽"}</div>
        <h2 className="text-3xl font-black text-white">{msg.text}</h2>
        <p className="text-white/60 mt-1">{msg.sub}</p>
      </motion.div>

      {/* Kick results */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        className="flex gap-3">
        {kicks.map((goal, i) => (
          <motion.div key={i}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
            className="text-4xl">{goal ? "⚽" : "❌"}
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white/10 rounded-2xl px-8 py-4 text-center border border-white/20">
        <div className="text-3xl font-black text-white">{scored}/{total}</div>
        <div className="text-white/50 text-sm">goals scored</div>
        {coins > 0 && (
          <div className="text-yellow-400 font-bold mt-1">+{coins} coins 🪙</div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
        className="flex gap-3 w-full max-w-xs">
        <button onClick={onBack}
          className="flex-1 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all">
          ← Hub
        </button>
        <button onClick={onAgain}
          className="flex-1 py-3 rounded-2xl font-black text-white transition-all"
          style={{ background: "linear-gradient(135deg,#16a34a,#15803d)" }}>
          Play Again ⚽
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main game ────────────────────────────────────────────────────────────────

interface Props { onBack: () => void; }

export function PenaltyShootout({ onBack }: Props) {
  const { playerName, playerEmail } = useGameStore();

  const [diff, setDiff]             = useState<Difficulty | null>(null);
  const [kickIndex, setKickIndex]   = useState(0);
  const [results, setResults]       = useState<KickResult[]>([]);
  const [question, setQuestion]     = useState<Question | null>(null);
  const [kickState, setKickState]   = useState<KickState>("idle");
  const [lastResult, setLastResult] = useState<KickResult | null>(null);
  const [timeLeft, setTimeLeft]     = useState(1);           // 0–1 fraction
  const [keeperPose, setKeeperPose] = useState<KeeperPose>("stand");
  const [ballTarget, setBallTarget] = useState({ x: 0, y: 0 });
  const [ballVisible, setBallVisible] = useState(true);
  const [done, setDone]             = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef(0);
  const duration  = useRef(10);

  const scored = results.filter(r => r === "goal").length;

  // ── Start a new kick ──────────────────────────────────────────────────────
  const startKick = useCallback((d: Difficulty) => {
    setQuestion(generateQuestion(d));
    setKickState("idle");
    setKeeperPose("stand");
    setBallVisible(true);
    setBallTarget({ x: 0, y: 0 });
    setLastResult(null);
    const secs = TIME_BY_DIFF[d];
    duration.current = secs;
    startTime.current = Date.now();
    setTimeLeft(1);
  }, []);

  // ── Timer tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (kickState !== "idle" || !diff) return;
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const frac    = Math.max(0, 1 - elapsed / duration.current);
      setTimeLeft(frac);
      if (frac <= 0) {
        clearInterval(timerRef.current!);
        handleAnswer(null); // timeout
      }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [kickState, diff, question]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle answer ─────────────────────────────────────────────────────────
  const handleAnswer = useCallback((choice: number | null) => {
    if (kickState !== "idle" || !question || !diff) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setKickState("animating");

    const correct = choice === question.answer;
    const result: KickResult = (choice === null) ? "timeout" : correct ? "goal" : "saved";

    if (result === "goal") {
      // Ball flies to a random corner
      const zone = GOAL_ZONES[Math.floor(Math.random() * GOAL_ZONES.length)];
      setBallTarget(zone);
      // Keeper dives WRONG way — empty hands (miss pose)
      setKeeperPose(zone.x < 0 ? "miss-right" : "miss-left");
    } else {
      // Keeper dives a random direction, ball follows to their hands
      const diveLeft = Math.random() > 0.5;
      const xTarget  = diveLeft ? -randInt(16, 22) : randInt(16, 22);
      setBallTarget({ x: xTarget, y: -20 });
      setKeeperPose(diveLeft ? "dive-left" : "dive-right");
    }

    setLastResult(result);

    // After animation, show result label then advance
    setTimeout(() => {
      setKickState("result");
      const newResults = [...results, result];
      setResults(newResults);

      setTimeout(async () => {
        if (newResults.length >= KICKS) {
          // Game over
          const goals  = newResults.filter(r => r === "goal").length;
          const coins  = goals * 2 + (goals === 5 ? 5 : 0);
          setCoinsEarned(coins);
          if (coins > 0 && (playerName || playerEmail)) {
            const key = playerEmail?.trim().toLowerCase() || playerName;
            await addCoins(playerName, coins, 0, true, '', 'penalty', playerEmail?.trim().toLowerCase() || '');
          }
          if (playerName || playerEmail) {
            const key = playerEmail?.trim().toLowerCase() || playerName;
            await recordGameResult(key, 'penalty', goals, KICKS);
          }
          setDone(true);
        } else {
          setKickIndex(ki => ki + 1);
          startKick(diff);
        }
      }, 1200);
    }, 900);
  }, [kickState, question, diff, results, playerName, playerEmail, startKick]);

  // ── Init first kick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (diff) startKick(diff);
  }, [diff]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Screens ───────────────────────────────────────────────────────────────

  if (!diff) return <DiffPicker onPick={setDiff} />;

  if (done) {
    return (
      <EndScreen
        scored={scored} total={KICKS} coins={coinsEarned}
        onAgain={() => {
          setDiff(null);
          setResults([]); setKickIndex(0); setDone(false); setCoinsEarned(0);
        }}
        onBack={onBack}
      />
    );
  }

  const keeperSrc =
    keeperPose === "stand"       ? "/games/penalty/keeper-stand.png"      :
    keeperPose === "dive-left"   ? "/games/penalty/keeper-dive-left.png"  :
    keeperPose === "dive-right"  ? "/games/penalty/keeper-dive-right.png" :
    keeperPose === "miss-left"   ? "/games/penalty/keeper-miss-left.png"  :
                                   "/games/penalty/keeper-miss-right.png";

  const timeColor = timeLeft > 0.5 ? "#22c55e" : timeLeft > 0.25 ? "#f59e0b" : "#ef4444";

  return (
    <div className="fixed inset-0 overflow-hidden select-none"
      style={{ background: "#0a2e0a" }}>

      {/* ── Stadium background ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/games/penalty/stadium.png" alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ opacity: 0.92 }} />

      {/* Dark gradient bottom overlay so UI is readable */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)" }} />

      {/* ── Goal celebration flash ── */}
      <AnimatePresence>
        {kickState === "result" && lastResult === "goal" && (
          <motion.div key="goal-flash" className="absolute inset-0 pointer-events-none z-20"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.4, times: [0, 0.15, 0.7, 1] }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/games/penalty/goal-celebration.png" alt=""
              className="w-full h-full object-cover" style={{ opacity: 0.82 }} />
            <div className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center, rgba(251,191,36,0.3), transparent 70%)" }} />
          </motion.div>
        )}
        {kickState === "result" && lastResult !== "goal" && (
          <motion.div key="save-flash" className="absolute inset-0 pointer-events-none z-20"
            initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.8 }}
            style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.4), transparent 70%)" }} />
        )}
      </AnimatePresence>

      {/* ── Score pills (top) ── */}
      <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 z-20">
        {Array.from({ length: KICKS }, (_, i) => {
          const res = results[i];
          return (
            <div key={i}
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-lg font-black transition-all"
              style={{
                borderColor: res === "goal" ? "#22c55e" : res ? "#ef4444" : i === kickIndex ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)",
                background:  res === "goal" ? "rgba(34,197,94,0.3)" : res ? "rgba(239,68,68,0.3)" : "rgba(0,0,0,0.3)",
              }}>
              {res === "goal" ? "⚽" : res ? "❌" : i === kickIndex ? "●" : "○"}
            </div>
          );
        })}
      </div>

      {/* ── Back button ── */}
      <button onClick={onBack}
        className="absolute top-4 left-4 z-30 bg-black/40 backdrop-blur-sm border border-white/20 text-white/70 hover:text-white rounded-xl px-3 py-1.5 text-sm font-bold transition-all">
        ← Hub
      </button>

      {/* ── Goalkeeper ── */}
      <div className="absolute left-0 right-0 flex justify-center"
        style={{ top: "42%", zIndex: 10 }}>
        <motion.img
          key={keeperPose}
          src={keeperSrc}
          alt="goalkeeper"
          initial={{ opacity: 0.7, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
          className="object-contain drop-shadow-2xl"
          style={{
            height: "clamp(100px, 16vw, 155px)",
            // multiply removes white/grass backgrounds on non-transparent images
            // miss poses are already transparent — use normal so yellow isn't darkened
            mixBlendMode: (keeperPose === "miss-left" || keeperPose === "miss-right") ? "normal" : "multiply",
          }}
        />
      </div>

      {/* ── Ball ── */}
      <div className="absolute left-0 right-0 flex justify-center pointer-events-none"
        style={{ bottom: "28%", zIndex: 15 }}>
        <motion.img
          src="/games/penalty/ball.png"
          alt="ball"
          animate={kickState === "animating" ? {
            x:      `${ballTarget.x}vw`,
            y:      `${ballTarget.y}vh`,
            scale:  lastResult === "goal" ? [1, 0.35] : [1, 0.55],
            rotate: lastResult === "goal" ? [0, 540]  : [0, 180],
            opacity: kickState === "animating" ? [1, 1, 0] : 1,
          } : {
            x: 0, y: 0, scale: 1, rotate: 0, opacity: ballVisible ? 1 : 0,
          }}
          transition={{ duration: 0.75, ease: "easeIn" }}
          className="object-contain drop-shadow-xl"
          style={{ width: "clamp(48px, 9vw, 80px)", height: "clamp(48px, 9vw, 80px)" }}
        />
      </div>

      {/* ── GOAL / SAVED overlay ── */}
      <AnimatePresence>
        {kickState === "result" && (
          <motion.div key="result-label"
            className="absolute left-0 right-0 flex justify-center pointer-events-none"
            style={{ top: "42%", zIndex: 25 }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <div className="px-8 py-3 rounded-3xl font-black text-4xl text-white shadow-2xl"
              style={{
                background: lastResult === "goal" ? "rgba(22,163,74,0.9)" : "rgba(220,38,38,0.9)",
                border: `3px solid ${lastResult === "goal" ? "#4ade80" : "#f87171"}`,
                textShadow: "0 2px 8px rgba(0,0,0,0.5)",
              }}>
              {lastResult === "goal" ? "GOAL! ⚽" : lastResult === "timeout" ? "TIME! ⏱️" : "SAVED! 🧤"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Question + Answers ── */}
      <div className="absolute left-0 right-0 bottom-0 z-20 px-4 pb-5 space-y-3">
        {/* Timer bar */}
        <div className="w-full h-2 rounded-full overflow-hidden bg-white/15">
          <motion.div className="h-full rounded-full transition-colors"
            style={{ width: `${timeLeft * 100}%`, background: timeColor }}
            transition={{ duration: 0.05 }} />
        </div>

        {/* Question */}
        {question && (
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-5 py-3 text-center border border-white/15">
            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-0.5">
              Kick {kickIndex + 1} of {KICKS}
            </p>
            <p className="text-white font-black text-3xl tracking-tight">{question.text} = ?</p>
          </div>
        )}

        {/* Answer buttons */}
        {question && (
          <div className="grid grid-cols-2 gap-2.5">
            {question.choices.map((c, i) => (
              <motion.button key={`${kickIndex}-${i}`}
                whileHover={kickState === "idle" ? { scale: 1.04 } : {}}
                whileTap={kickState === "idle" ? { scale: 0.95 } : {}}
                disabled={kickState !== "idle"}
                onClick={() => handleAnswer(c)}
                className="py-4 rounded-2xl font-black text-xl text-white transition-all"
                style={{
                  background: kickState === "result"
                    ? c === question.answer
                      ? "rgba(34,197,94,0.8)"
                      : "rgba(255,255,255,0.07)"
                    : "rgba(255,255,255,0.12)",
                  border: kickState === "result" && c === question.answer
                    ? "2px solid #4ade80"
                    : "2px solid rgba(255,255,255,0.15)",
                  opacity: kickState === "idle" ? 1 : 0.8,
                }}>
                {c}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
