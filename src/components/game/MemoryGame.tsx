"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { addCoins } from '@/lib/wallet';
import { recordGameResult } from '@/lib/learningScore';
import { applyDailyFreshness } from '@/lib/gameRewards';
import { playSound } from '@/lib/sounds';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  id: number;
  pairId: number;
  content: string;
  isFlipped: boolean;
  isMatched: boolean;
  isEmoji: boolean;   // affects display size
}

type GameType = 'picture' | 'simple-math' | 'hard-math';

// ─── Config per level ─────────────────────────────────────────────────────────

const GRID: Record<Level, { pairs: number; cols: number; type: GameType }> = {
  easy:   { pairs: 8,  cols: 4, type: 'picture'     },  // 4×4 = 16 cards, emoji matching
  medium: { pairs: 8,  cols: 4, type: 'simple-math' },  // 4×4 = 16 cards, simple +/×
  hard:   { pairs: 12, cols: 6, type: 'hard-math'   },  // 6×4 = 24 cards, harder ×/÷
};

const LEVEL_DESCRIPTIONS: Partial<Record<Level, string>> = {
  easy:   '🖼️ Match the picture pairs — pure memory!',
  medium: '🔢 Match simple equations to their answers',
  hard:   '🧮 Match tricky math equations — big numbers!',
};

// ─── Emoji pool for Easy ──────────────────────────────────────────────────────

const EMOJI_POOL = [
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
  '🦁','🐮','🐷','🐸','🐙','🦋','🌈','⭐','🍕','🎮',
  '🚀','🎯','🏆','🎸','🌺','🦄','🐬','🦋','🍎','🎪',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Pair generators ──────────────────────────────────────────────────────────

function picturePairs(count: number): { q: string; a: string }[] {
  return shuffle([...EMOJI_POOL]).slice(0, count).map(e => ({ q: e, a: e }));
}

function simpleMathPairs(count: number): { q: string; a: string }[] {
  const used = new Set<string>();
  const pairs: { q: string; a: string }[] = [];
  let tries = 0;
  while (pairs.length < count && tries < 300) {
    tries++;
    let q: string, a: string;
    if (Math.random() > 0.5) {
      // Simple addition: 1-9 + 1-9, max sum 15
      const x = randInt(1, 9), y = randInt(1, 9);
      if (x + y > 15) continue;
      q = `${x} + ${y}`; a = String(x + y);
    } else {
      // Small tables: 2×, 3×, 4× up to ×6
      const t = randInt(2, 4), m = randInt(1, 6);
      q = `${t} × ${m}`; a = String(t * m);
    }
    if (!used.has(q)) { used.add(q); pairs.push({ q, a }); }
  }
  return pairs;
}

function hardMathPairs(count: number): { q: string; a: string }[] {
  const used = new Set<string>();
  const pairs: { q: string; a: string }[] = [];
  let tries = 0;
  while (pairs.length < count && tries < 300) {
    tries++;
    let q: string, a: string;
    if (Math.random() > 0.4) {
      const x = randInt(4, 12), y = randInt(4, 12);
      q = `${x} × ${y}`; a = String(x * y);
    } else {
      const d = randInt(3, 12), r = randInt(3, 12);
      q = `${d * r} ÷ ${d}`; a = String(r);
    }
    if (!used.has(q)) { used.add(q); pairs.push({ q, a }); }
  }
  return pairs;
}

function buildCards(level: Level): Card[] {
  const { pairs: count, type } = GRID[level];
  const raw =
    type === 'picture'     ? picturePairs(count) :
    type === 'simple-math' ? simpleMathPairs(count) :
    hardMathPairs(count);

  const isEmoji = type === 'picture';
  const flat: Omit<Card, 'id'>[] = [];
  raw.forEach((p, i) => {
    flat.push({ pairId: i, content: p.q, isFlipped: false, isMatched: false, isEmoji });
    flat.push({ pairId: i, content: p.a, isFlipped: false, isMatched: false, isEmoji });
  });
  return shuffle(flat).map((c, id) => ({ ...c, id }));
}

// ─── Single card ──────────────────────────────────────────────────────────────

function MemoryCard({ card, onClick, disabled }: {
  card: Card; onClick: () => void; disabled: boolean;
}) {
  const show = card.isFlipped || card.isMatched;
  const isLong = !card.isEmoji && card.content.length > 5;

  return (
    <motion.div
      whileHover={!show && !disabled ? { scale: 1.06, y: -2 } : {}}
      whileTap={!show && !disabled ? { scale: 0.94 } : {}}
      onClick={() => !disabled && !show && onClick()}
      className="relative cursor-pointer"
      style={{ perspective: 600 }}
    >
      <motion.div
        animate={{ rotateY: show ? 180 : 0 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Card back */}
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          }}>
          <span className="text-3xl select-none">?</span>
        </div>

        {/* Card front */}
        <motion.div
          animate={card.isMatched ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 rounded-2xl flex items-center justify-center px-1"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: card.isMatched
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : 'linear-gradient(135deg, #1e1b4b, #312e81)',
            boxShadow: card.isMatched
              ? '0 0 18px rgba(16,185,129,0.55)'
              : '0 4px 12px rgba(0,0,0,0.35)',
            border: card.isMatched
              ? '2px solid #34d399'
              : '2px solid rgba(255,255,255,0.1)',
          }}>
          <span
            className="text-white text-center font-black leading-tight select-none"
            style={{ fontSize: card.isEmoji ? '2rem' : isLong ? '0.9rem' : '1.2rem' }}
          >
            {card.content}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Game over ────────────────────────────────────────────────────────────────

function GameOver({ level, matches, flips, elapsed, coins, onPlayAgain, onBack }: {
  level: Level; matches: number; flips: number; elapsed: number;
  coins: number; onPlayAgain: () => void; onBack: () => void;
}) {
  const totalPairs = GRID[level].pairs;
  const minFlips = totalPairs * 2;
  const accuracy = Math.max(0, Math.round((minFlips / Math.max(flips, minFlips)) * 100));
  const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const grade =
    accuracy >= 90 ? { label: '⭐ Perfect Memory!',  color: 'text-yellow-300' } :
    accuracy >= 70 ? { label: '👍 Great recall!',    color: 'text-emerald-300' } :
    accuracy >= 50 ? { label: '💪 Good effort!',     color: 'text-blue-300'    } :
                     { label: '🧠 Keep training!',   color: 'text-purple-300'  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 2 + Math.random() * 2, delay: Math.random() * 2 }}
            className="absolute text-white/20 text-2xl"
            style={{ top: `${Math.random() * 90}%`, left: `${Math.random() * 90}%` }}>★</motion.div>
        ))}
      </div>

      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 w-full max-w-md text-center relative z-10">

        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 3 }}
          className="text-7xl mb-3">🧠</motion.div>
        <h2 className="text-4xl font-black text-white mb-1">Complete!</h2>
        <p className={`text-xl font-bold mb-4 ${grade.color}`}>{grade.label}</p>

        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
          className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl p-4 mb-5 shadow-lg">
          <div className="text-3xl font-black text-white">+{coins} ₿</div>
          <div className="text-yellow-100 text-sm font-medium">PlayBits earned!</div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Pairs Found', value: `${matches}/${totalPairs}`, icon: '🃏', color: 'from-violet-500 to-purple-600' },
            { label: 'Total Flips', value: flips,           icon: '👆', color: 'from-blue-500 to-cyan-500' },
            { label: 'Efficiency',  value: `${accuracy}%`, icon: '🎯', color: 'from-emerald-400 to-green-500' },
            { label: 'Time',        value: timeStr,         icon: '⏱️', color: 'from-orange-400 to-amber-500' },
          ].map(s => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-4`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-white/70 text-xs font-bold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onBack}
            className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20 transition-colors">
            🏠 Hub
          </button>
          <button onClick={onPlayAgain}
            className="flex-1 py-4 text-white font-black rounded-2xl hover:scale-105 transition-transform shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            🔄 Again!
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MemoryGame({ onBack }: { onBack: () => void }) {
  const { playerName, playerEmail, playerGrade, soundEnabled, setSoundEnabled } = useGameStore();

  const [level, setLevel] = useState<Level | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [matches, setMatches] = useState(0);
  const [flips, setFlips] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [coins, setCoins] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalPairs = level ? GRID[level].pairs : 0;

  useEffect(() => {
    if (!level) return;
    setCards(buildCards(level));
    setFlipped([]); setLocked(false);
    setMatches(0); setFlips(0); setElapsed(0); setIsGameOver(false);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current!);
  }, [level]);

  useEffect(() => {
    if (!level || matches === 0 || matches < totalPairs) return;
    clearInterval(timerRef.current!);
    setIsGameOver(true);
    if (soundEnabled) playSound('win');
    const mult = LEVEL_CONFIG[level].multiplier;
    const minFlips = totalPairs * 2;
    const bonus = Math.max(0, minFlips + 4 - flips);
    const rawEarned = Math.round((totalPairs * 3 + bonus) * mult);
    const dbKey = playerEmail || playerName;
    applyDailyFreshness(dbKey, 'memory', rawEarned).then(earned => {
      setCoins(earned);
      addCoins(playerName, earned, elapsed, true, playerGrade, 'memory', playerEmail).catch(() => {});
    });
    // Accuracy = pairs found on first try / total pairs  (mismatches = flips/2 - matches)
    const mismatches = Math.max(0, Math.floor(flips / 2) - matches);
    recordGameResult(playerName, 'memory', matches, matches + mismatches, playerGrade).catch(() => {});
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCardClick = useCallback((id: number) => {
    if (locked || flipped.length >= 2 || flipped.includes(id)) return;
    if (soundEnabled) playSound('click');

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    setCards(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));
    setFlips(f => f + 1);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [id1, id2] = newFlipped;
      const c1 = cards.find(c => c.id === id1)!;
      const c2 = cards.find(c => c.id === id2)!;

      if (c1.pairId === c2.pairId) {
        if (soundEnabled) setTimeout(() => playSound('correct'), 180);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === id1 || c.id === id2 ? { ...c, isMatched: true } : c
          ));
          setMatches(m => m + 1);
          setFlipped([]); setLocked(false);
        }, 500);
      } else {
        if (soundEnabled) setTimeout(() => playSound('wrong'), 280);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === id1 || c.id === id2 ? { ...c, isFlipped: false } : c
          ));
          setFlipped([]); setLocked(false);
        }, 1000);
      }
    }
  }, [locked, flipped, cards, soundEnabled]);

  if (!level) {
    return (
      <LevelPicker
        onSelect={setLevel} onBack={onBack}
        bgStyle="linear-gradient(135deg, #0f0c29, #302b63, #24243e)"
        descriptions={LEVEL_DESCRIPTIONS}
      />
    );
  }

  if (isGameOver) {
    return (
      <GameOver
        level={level} matches={matches} flips={flips} elapsed={elapsed} coins={coins}
        onPlayAgain={() => { clearInterval(timerRef.current!); setLevel(null); }}
        onBack={() => { clearInterval(timerRef.current!); onBack(); }}
      />
    );
  }

  const { cols } = GRID[level];
  const mins = Math.floor(elapsed / 60), secs = elapsed % 60;
  const timeStr = `${mins > 0 ? `${mins}:` : ''}${String(secs).padStart(2, '0')}`;
  const cardH = cols >= 6 ? 70 : 82;

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => { clearInterval(timerRef.current!); setLevel(null); }}
          className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-2 text-sm font-bold transition-colors">✕</button>

        <div className="flex-1 flex items-center gap-2">
          <span className="text-white font-black">🧠 Memory Match</span>
          <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-white/10 text-white/70">
            {LEVEL_CONFIG[level].emoji} {LEVEL_CONFIG[level].label}
          </span>
          {/* Game type label */}
          <span className="text-xs text-white/40 font-medium hidden sm:inline">
            {level === 'easy' ? '🖼️ Pictures' : level === 'medium' ? '🔢 Simple Math' : '🧮 Hard Math'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white/10 rounded-xl px-3 py-1 text-center">
            <div className="text-white font-black text-sm">{matches}/{totalPairs}</div>
            <div className="text-white/40 text-xs">pairs</div>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-1 text-center">
            <div className="text-white font-black text-sm">{timeStr}</div>
            <div className="text-white/40 text-xs">time</div>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 mb-3">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
            animate={{ width: `${(matches / totalPairs) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center px-4 pb-4">
        <div className="grid gap-3 w-full max-w-2xl"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridAutoRows: `${cardH}px`,
          }}>
          {cards.map(card => (
            <MemoryCard key={card.id} card={card}
              onClick={() => handleCardClick(card.id)} disabled={locked} />
          ))}
        </div>
      </div>
    </div>
  );
}
