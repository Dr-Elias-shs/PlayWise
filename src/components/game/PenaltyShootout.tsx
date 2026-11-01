"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { awardCoins } from '@/lib/coinsClient';
import { recordGameResult } from "@/lib/learningScore";
import { placeBackground } from '@/lib/world';
import { LoopVideo } from '@/components/world/LoopVideo';

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

// Where a goal lands, in goal units: gx -1..1 across the mouth, gy 0..1 up from the line
const GOAL_ZONES = [
  { gx: -0.72, gy: 0.74 }, // top-left corner
  { gx:  0.72, gy: 0.74 }, // top-right corner
  { gx: -0.78, gy: 0.28 }, // low left
  { gx:  0.78, gy: 0.28 }, // low right
  { gx: -0.40, gy: 0.82 }, // under the bar, left
  { gx:  0.40, gy: 0.82 }, // under the bar, right
];

// The stadium picture and where its goal sits, as fractions of the picture
const STADIUM = { w: 1024, h: 688, left: 0.28, right: 0.714, bar: 0.363, line: 0.585 };
const DIVE_ASPECT = 820 / 492;        // keeper-dive / keeper-miss sprites
const DIVE_BALL = { x: 0.10, y: 0.44 }; // the ball in the catching glove (left-facing sprite)
const KEEPER_ASPECT = 484 / 720;

type KickState = "idle" | "animating" | "result";
type KickResult = "goal" | "saved" | "timeout";
type Shot = { kind: "goal"; gx: number; gy: number } | { kind: "save"; side: -1 | 1 };

// ─── Difficulty picker ────────────────────────────────────────────────────────

function DiffPicker({ onPick }: { onPick: (d: Difficulty) => void }) {
  const opts: { d: Difficulty; label: string; desc: string; emoji: string; color: string }[] = [
    { d: "easy",   label: "Easy",   desc: "Addition & subtraction",  emoji: "⚽", color: "#16a34a" },
    { d: "medium", label: "Medium", desc: "Multiplication tables",    emoji: "🔥", color: "#d97706" },
    { d: "hard",   label: "Hard",   desc: "Division challenges",      emoji: "💥", color: "#dc2626" },
  ];
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-5 p-6"
      style={{ background: placeBackground('penalty') }}>
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
      style={{ background: placeBackground('penalty') }}>
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

// Every sprite shown during a kick. Preloaded on mount so the keeper's
// dive/catch pose swaps in instantly instead of fetching mid-shot.
const PENALTY_IMAGES = [
  "/games/penalty/stadium.webp",
  "/games/penalty/keeper.webp",
  "/games/penalty/keeper-dive.webp",
  "/games/penalty/keeper-miss.webp",
  "/games/penalty/ball.webp",
];

const CONFETTI_COLORS = ["#facc15", "#22c55e", "#3b82f6", "#ef4444", "#f97316", "#ffffff"];

function useViewport() {
  const [vp, setVp] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return vp;
}

export function PenaltyShootout({ onBack }: Props) {
  const { playerName, playerEmail } = useGameStore();

  const [diff, setDiff]             = useState<Difficulty | null>(null);
  const [kickIndex, setKickIndex]   = useState(0);
  const [results, setResults]       = useState<KickResult[]>([]);
  const [question, setQuestion]     = useState<Question | null>(null);
  const [kickState, setKickState]   = useState<KickState>("idle");
  const [lastResult, setLastResult] = useState<KickResult | null>(null);
  const [timeLeft, setTimeLeft]     = useState(1);           // 0–1 fraction
  const [shot, setShot]             = useState<Shot | null>(null);
  const [panelH, setPanelH]         = useState(240);
  const panelRef = useRef<HTMLDivElement>(null);
  const vp = useViewport();
  const [done, setDone]             = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef(0);
  const duration  = useRef(10);

  // Warm the browser cache with every kick sprite on mount (difficulty screen),
  // so pose swaps during the fast shot are instant — no mid-game image load.
  useEffect(() => {
    PENALTY_IMAGES.forEach(src => { const img = new Image(); img.src = src; });
  }, []);

  const scored = results.filter(r => r === "goal").length;

  // ── Start a new kick ──────────────────────────────────────────────────────
  const startKick = useCallback((d: Difficulty) => {
    setQuestion(generateQuestion(d));
    setKickState("idle");
    setShot(null);
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
      // Ball flies into a corner and the keeper dives the wrong way
      const z = GOAL_ZONES[Math.floor(Math.random() * GOAL_ZONES.length)];
      setShot({ kind: "goal", gx: z.gx, gy: z.gy });
    } else {
      // Keeper dives and catches it
      setShot({ kind: "save", side: Math.random() > 0.5 ? -1 : 1 });
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
          setCoinsEarned(0);
          if (coins > 0 && (playerName || playerEmail)) {
            const r = await awardCoins({ game: 'penalty', coins, correct: goals, total: KICKS });
            setCoinsEarned(r.credited);
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
      }, 2200); // hold the goal/save result on screen ~1s longer before the next question
    }, 900);
  }, [kickState, question, diff, results, playerName, playerEmail, startKick]);

  // The answer panel's height decides how much pitch is left above it
  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setPanelH(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [diff, done]);

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

  const timeColor = timeLeft > 0.5 ? "#22c55e" : timeLeft > 0.25 ? "#f59e0b" : "#ef4444";

  // ── Scene layout ──
  // The stadium covers the screen like object-cover, then slides (or grows) so
  // the goal line sits a comfortable gap above the answer panel. Keeper and
  // ball are placed on the goal in pixels, so they line up on any screen.
  const W = vp.w || 1024, H = vp.h || 768;
  const openBottom = H - panelH - 12;
  const gap = Math.max(84, H * 0.14);
  const lineTarget = openBottom - gap;
  const coverH = Math.max(W / STADIUM.w, H / STADIUM.h) * STADIUM.h;
  const sceneH = Math.max(coverH, (H - lineTarget) / (1 - STADIUM.line));
  const sceneW = sceneH * STADIUM.w / STADIUM.h;
  const sceneLeft = (W - sceneW) / 2;
  const sceneTop = Math.min(0, Math.max(H - sceneH, lineTarget - STADIUM.line * sceneH));

  const gw = (STADIUM.right - STADIUM.left) * sceneW;
  const gh = (STADIUM.line - STADIUM.bar) * sceneH;
  const gx = sceneLeft + ((STADIUM.left + STADIUM.right) / 2) * sceneW;
  const lineY = sceneTop + STADIUM.line * sceneH;

  const keeperH = gh * 0.96;
  const keeperW = keeperH * KEEPER_ASPECT;
  const diveW = gw * 0.62, diveH = diveW / DIVE_ASPECT;
  const diveSide: -1 | 1 = !shot ? 1 : shot.kind === "save" ? shot.side : (shot.gx < 0 ? 1 : -1);
  const diveCx = gx + diveSide * gw * 0.28;
  const diveCy = lineY - gh * 0.45;

  const ballSize = Math.min(96, Math.max(40, gh * 0.3));
  const ballX = gx;
  const ballY = lineY + Math.max(ballSize * 0.7, (openBottom - lineY) * 0.62);

  let target = { x: 0, y: 0 };
  if (shot?.kind === "goal") {
    target = { x: shot.gx * gw * 0.5, y: lineY - shot.gy * gh - ballY };
  } else if (shot?.kind === "save") {
    target = {
      x: diveCx + diveSide * (0.5 - DIVE_BALL.x) * diveW - ballX,
      y: diveCy + (DIVE_BALL.y - 0.5) * diveH - ballY,
    };
  }
  const flying = kickState !== "idle" && !!shot;

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ background: "#2f8f3a" }}>

      {/* ── Stadium (moving loop; still picture on slow Wi-Fi or reduced motion) ── */}
      <motion.div className="absolute"
        style={{ left: sceneLeft, top: sceneTop, width: sceneW, height: sceneH }}
        animate={kickState === "result" && lastResult === "goal" ? { x: [0, -7, 6, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.45 }}>
        <LoopVideo src="/games/penalty/stadium.mp4" poster="/games/penalty/stadium.webp"
          className="w-full h-full" />
      </motion.div>

      {/* Soft shade under the panel so the answers stay readable */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: panelH + 60, background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }} />

      {/* ── Score pills (top) ── */}
      <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 z-20">
        {Array.from({ length: KICKS }, (_, i) => {
          const res = results[i];
          return (
            <div key={i}
              className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-lg font-black transition-all"
              style={{
                borderColor: res === "goal" ? "#22c55e" : res ? "#ef4444" : i === kickIndex ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                background:  res === "goal" ? "rgba(34,197,94,0.55)" : res ? "rgba(239,68,68,0.55)" : "rgba(0,0,0,0.35)",
              }}>
              {res === "goal" ? "⚽" : res ? "❌" : i === kickIndex ? "●" : "○"}
            </div>
          );
        })}
      </div>

      {/* ── Back button ── */}
      <button onClick={onBack}
        className="absolute top-4 left-4 z-30 bg-black/40 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white rounded-xl px-3 py-1.5 text-sm font-bold transition-all">
        ← Hub
      </button>

      {/* ── Goalkeeper ── */}
      {!shot ? (
        <motion.img key={`stand-${kickIndex}`} src="/games/penalty/keeper.webp" alt="goalkeeper" draggable={false}
          className="absolute pointer-events-none"
          style={{ left: gx - keeperW / 2, top: lineY - keeperH + gh * 0.04, width: keeperW, height: keeperH, zIndex: 10,
                   filter: "drop-shadow(0 6px 6px rgba(0,0,0,0.35))", transformOrigin: "50% 100%" }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: [0, -5, 0], x: [-gw * 0.04, gw * 0.04, -gw * 0.04] }}
          transition={{ opacity: { duration: 0.25 }, y: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
                        x: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } }} />
      ) : (
        <motion.img key={`dive-${kickIndex}`}
          src={shot.kind === "save" ? "/games/penalty/keeper-dive.webp" : "/games/penalty/keeper-miss.webp"}
          alt="goalkeeper" draggable={false}
          className="absolute pointer-events-none"
          style={{ left: diveCx - diveW / 2, top: diveCy - diveH / 2, width: diveW, height: diveH, zIndex: 10,
                   filter: "drop-shadow(0 8px 8px rgba(0,0,0,0.35))" }}
          initial={{ x: -diveSide * gw * 0.28, y: gh * 0.25, rotate: diveSide * 25, scaleX: diveSide > 0 ? -0.75 : 0.75, scaleY: 0.75, opacity: 0.6 }}
          animate={{ x: 0, y: 0, rotate: 0, scaleX: diveSide > 0 ? -1 : 1, scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }} />
      )}

      {/* ── Ball ── */}
      <motion.img key={`ball-${kickIndex}`} src="/games/penalty/ball.webp" alt="ball" draggable={false}
        className="absolute pointer-events-none"
        style={{ left: ballX - ballSize / 2, top: ballY - ballSize / 2, width: ballSize, height: ballSize,
                 zIndex: shot?.kind === "goal" ? 9 : 15, filter: "drop-shadow(0 4px 4px rgba(0,0,0,0.4))" }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={flying ? {
          x: target.x, y: target.y,
          scale: shot!.kind === "goal" ? 0.42 : 0.5,
          rotate: shot!.kind === "goal" ? 720 : 360,
          opacity: shot!.kind === "goal" ? 1 : [1, 1, 0],
        } : {
          x: 0, y: [0, -6, 0], scale: 1, rotate: 0, opacity: 1,
        }}
        transition={flying
          ? { duration: 0.6, ease: [0.2, 0.7, 0.4, 1] }
          : { y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }, default: { duration: 0.3 } }} />

      {/* ── Net ripple where the goal went in ── */}
      <AnimatePresence>
        {kickState === "result" && shot?.kind === "goal" && (
          <motion.div key={`ripple-${kickIndex}`} className="absolute rounded-full pointer-events-none"
            style={{ left: ballX + target.x - gh * 0.3, top: ballY + target.y - gh * 0.3, width: gh * 0.6, height: gh * 0.6,
                     border: "3px solid rgba(255,255,255,0.9)", zIndex: 8 }}
            initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }} />
        )}
      </AnimatePresence>

      {/* ── Confetti on a goal ── */}
      <AnimatePresence>
        {kickState === "result" && lastResult === "goal" && (
          <motion.div key={`confetti-${kickIndex}`} className="absolute inset-0 pointer-events-none z-20"
            exit={{ opacity: 0 }}>
            {Array.from({ length: 36 }, (_, i) => (
              <motion.span key={i} className="absolute block rounded-sm"
                style={{ left: `${(i * 37) % 100}%`, top: -20, width: 8, height: 14,
                         background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{ y: H * (0.55 + ((i * 13) % 40) / 100), rotate: (i % 2 ? 1 : -1) * 540, x: ((i * 29) % 60) - 30, opacity: [1, 1, 0] }}
                transition={{ duration: 1.6 + (i % 5) * 0.15, ease: "easeOut", delay: (i % 6) * 0.04 }} />
            ))}
          </motion.div>
        )}
        {kickState === "result" && lastResult !== "goal" && (
          <motion.div key="save-flash" className="absolute inset-0 pointer-events-none z-20"
            initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 0.8 }}
            style={{ background: "radial-gradient(ellipse at center, rgba(239,68,68,0.35), transparent 70%)" }} />
        )}
      </AnimatePresence>

      {/* ── GOAL / SAVED overlay ── */}
      <AnimatePresence>
        {kickState === "result" && (
          <motion.div key="result-label"
            className="absolute left-0 right-0 flex justify-center pointer-events-none"
            style={{ top: Math.max(64, lineY - gh * 1.55), zIndex: 25 }}
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
      <div ref={panelRef} className="absolute left-0 right-0 bottom-0 z-20 px-4 pb-4 space-y-2.5">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {question.choices.map((c, i) => (
              <motion.button key={`${kickIndex}-${i}`}
                whileHover={kickState === "idle" ? { scale: 1.04 } : {}}
                whileTap={kickState === "idle" ? { scale: 0.95 } : {}}
                disabled={kickState !== "idle"}
                onClick={() => handleAnswer(c)}
                className="py-3.5 rounded-2xl font-black text-2xl text-white transition-all backdrop-blur-sm"
                style={{
                  background: kickState === "result"
                    ? c === question.answer
                      ? "rgba(34,197,94,0.8)"
                      : "rgba(0,0,0,0.35)"
                    : "rgba(0,0,0,0.5)",
                  border: kickState === "result" && c === question.answer
                    ? "2px solid #4ade80"
                    : "2px solid rgba(255,255,255,0.25)",
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
