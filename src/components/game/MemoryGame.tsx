"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { addCoins } from '@/lib/wallet';
import { playSound } from '@/lib/sounds';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  id: number;
  pairId: number;       // cards with same pairId match
  content: string;      // display text
  isFlipped: boolean;
  isMatched: boolean;
}

// ─── Grid sizes ───────────────────────────────────────────────────────────────

const GRID = {
  easy:   { pairs: 6,  cols: 4 },   // 4×3 = 12 cards
  medium: { pairs: 10, cols: 4 },   // 4×5 = 20 cards
  hard:   { pairs: 12, cols: 6 },   // 6×4 = 24 cards
};

// ─── Pair generation ──────────────────────────────────────────────────────────

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

function generatePairs(level: Level): { question: string; answer: string }[] {
  const used = new Set<string>();
  const pairs: { question: string; answer: string }[] = [];
  const count = GRID[level].pairs;

  while (pairs.length < count) {
    let question: string, answer: string, key: string;

    if (level === 'easy') {
      const a = randInt(2, 5), b = randInt(1, 10);
      question = `${a} × ${b}`; answer = String(a * b); key = question;
    } else if (level === 'medium') {
      const type = Math.random() > 0.4 ? 'mult' : 'div';
      if (type === 'mult') {
        const a = randInt(2, 9), b = randInt(2, 10);
        question = `${a} × ${b}`; answer = String(a * b); key = question;
      } else {
        const b = randInt(2, 9), q = randInt(2, 10);
        question = `${b * q} ÷ ${b}`; answer = String(q); key = question;
      }
    } else {
      const type = Math.random() > 0.5 ? 'mult' : 'div';
      if (type === 'mult') {
        const a = randInt(6, 12), b = randInt(6, 12);
        question = `${a} × ${b}`; answer = String(a * b); key = question;
      } else {
        const b = randInt(6, 12), q = randInt(6, 12);
        question = `${b * q} ÷ ${b}`; answer = String(q); key = question;
      }
    }

    if (!used.has(key)) { used.add(key); pairs.push({ question, answer }); }
  }
  return pairs;
}

function buildCards(level: Level): Card[] {
  const pairs = generatePairs(level);
  const cards: Omit<Card, 'id'>[] = [];
  pairs.forEach((p, i) => {
    cards.push({ pairId: i, content: p.question, isFlipped: false, isMatched: false });
    cards.push({ pairId: i, content: p.answer,   isFlipped: false, isMatched: false });
  });
  return shuffle(cards).map((c, id) => ({ ...c, id }));
}

// ─── Single card ──────────────────────────────────────────────────────────────

function MemoryCard({ card, onClick, disabled }: {
  card: Card;
  onClick: () => void;
  disabled: boolean;
}) {
  const show = card.isFlipped || card.isMatched;
  return (
    <motion.div
      whileHover={!show && !disabled ? { scale: 1.05 } : {}}
      whileTap={!show && !disabled ? { scale: 0.95 } : {}}
      onClick={() => !disabled && !show && onClick()}
      className="relative cursor-pointer"
      style={{ perspective: 600 }}
    >
      <motion.div
        animate={{ rotateY: show ? 180 : 0 }}
        transition={{ duration: 0.35, ease: 'easeInOut' }}
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Back (question mark) */}
        <div className="absolute inset-0 rounded-2xl flex items-center justify-center text-3xl font-black"
          style={{
            backfaceVisibility: 'hidden',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          }}>
          <span className="text-white/80">?</span>
        </div>

        {/* Front (content) */}
        <motion.div
          animate={card.isMatched ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 rounded-2xl flex items-center justify-center font-black"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: card.isMatched
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : 'linear-gradient(135deg, #1e1b4b, #312e81)',
            boxShadow: card.isMatched
              ? '0 0 20px rgba(16,185,129,0.5)'
              : '0 4px 15px rgba(0,0,0,0.3)',
            border: card.isMatched ? '2px solid #34d399' : '2px solid rgba(255,255,255,0.1)',
          }}>
          <span className="text-white text-center px-1 leading-tight"
            style={{ fontSize: card.content.length > 5 ? '1rem' : '1.3rem' }}>
            {card.content}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ─── Game over screen ─────────────────────────────────────────────────────────

function GameOver({ level, matches, flips, elapsed, coins, onPlayAgain, onBack }: {
  level: Level; matches: number; flips: number; elapsed: number;
  coins: number; onPlayAgain: () => void; onBack: () => void;
}) {
  const accuracy = Math.max(0, Math.round(100 - ((flips - matches * 2) / Math.max(1, flips)) * 100));
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const grade =
    accuracy >= 90 ? { label: '⭐ Perfect Memory!', color: 'text-yellow-300' } :
    accuracy >= 70 ? { label: '👍 Great job!',      color: 'text-emerald-300' } :
    accuracy >= 50 ? { label: '💪 Keep practising!', color: 'text-blue-300' } :
                     { label: '🧠 Train your brain!', color: 'text-purple-300' };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.2, 0.8, 0.2], y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 2 + Math.random() * 2, delay: Math.random() * 2 }}
            className="absolute text-white/20 text-2xl"
            style={{ top: `${Math.random() * 90}%`, left: `${Math.random() * 90}%` }}
          >★</motion.div>
        ))}
      </div>

      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 w-full max-w-md text-center relative z-10">

        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 3 }}
          className="text-7xl mb-3">🧠</motion.div>

        <h2 className="text-4xl font-black text-white mb-1">Complete!</h2>
        <p className={`text-xl font-bold mb-5 ${grade.color}`}>{grade.label}</p>

        {/* Coins */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
          className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl p-4 mb-5 shadow-lg">
          <div className="text-3xl font-black text-white">+{coins} ₿</div>
          <div className="text-yellow-100 text-sm">PlayBits earned!</div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Pairs Found',  value: `${matches}/${GRID[level].pairs}`, icon: '🃏', color: 'from-violet-500 to-purple-600' },
            { label: 'Total Flips',  value: flips,    icon: '👆', color: 'from-blue-500 to-cyan-500' },
            { label: 'Accuracy',     value: `${accuracy}%`, icon: '🎯', color: 'from-emerald-400 to-green-500' },
            { label: 'Time',         value: timeStr,  icon: '⏱️', color: 'from-orange-400 to-amber-500' },
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
            style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
            🔄 Again!
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main MemoryGame ──────────────────────────────────────────────────────────

export function MemoryGame({ onBack }: { onBack: () => void }) {
  const { playerName, playerGrade, soundEnabled, setSoundEnabled } = useGameStore();

  const [level, setLevel] = useState<Level | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);   // ids of currently face-up cards (max 2)
  const [locked, setLocked] = useState(false);
  const [matches, setMatches] = useState(0);
  const [flips, setFlips] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [coins, setCoins] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalPairs = level ? GRID[level].pairs : 0;

  // Start timer when level chosen
  useEffect(() => {
    if (!level) return;
    const newCards = buildCards(level);
    setCards(newCards);
    setFlipped([]);
    setLocked(false);
    setMatches(0);
    setFlips(0);
    setElapsed(0);
    setIsGameOver(false);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current!);
  }, [level]);

  // Check win
  useEffect(() => {
    if (level && matches === totalPairs && matches > 0) {
      clearInterval(timerRef.current!);
      setIsGameOver(true);
      if (soundEnabled) playSound('win');
      // Coins: base per pair × level multiplier, bonus for low flips
      const mult = LEVEL_CONFIG[level].multiplier;
      const flipBonus = Math.max(0, totalPairs * 2 + 4 - flips); // reward efficient flips
      const earned = Math.round((totalPairs * 3 + flipBonus) * mult);
      setCoins(earned);
      addCoins(playerName, earned, elapsed, true, playerGrade).catch(() => {});
    }
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
        // Match!
        if (soundEnabled) setTimeout(() => playSound('correct'), 200);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === id1 || c.id === id2 ? { ...c, isMatched: true } : c
          ));
          setMatches(m => m + 1);
          setFlipped([]);
          setLocked(false);
        }, 500);
      } else {
        // No match — flip back
        if (soundEnabled) setTimeout(() => playSound('wrong'), 300);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === id1 || c.id === id2 ? { ...c, isFlipped: false } : c
          ));
          setFlipped([]);
          setLocked(false);
        }, 1000);
      }
    }
  }, [locked, flipped, cards, soundEnabled]);

  const handlePlayAgain = () => {
    clearInterval(timerRef.current!);
    setLevel(null);
  };

  // ── Level picker ──
  if (!level) {
    return (
      <LevelPicker
        onSelect={setLevel}
        onBack={onBack}
        bgStyle="linear-gradient(135deg, #0f0c29, #302b63, #24243e)"
      />
    );
  }

  // ── Game over ──
  if (isGameOver) {
    return (
      <GameOver
        level={level} matches={matches} flips={flips} elapsed={elapsed} coins={coins}
        onPlayAgain={handlePlayAgain}
        onBack={() => { clearInterval(timerRef.current!); onBack(); }}
      />
    );
  }

  const { cols } = GRID[level];
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins > 0 ? `${mins}:` : ''}${String(secs).padStart(2, '0')}`;

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => { clearInterval(timerRef.current!); setLevel(null); }}
          className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-2 text-sm font-bold transition-colors">
          ✕
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-black">🧠 Memory Match</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-white/10 text-white/70">
              {LEVEL_CONFIG[level].emoji} {LEVEL_CONFIG[level].label}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 rounded-xl px-3 py-1 text-center">
            <div className="text-white font-black">{matches}/{totalPairs}</div>
            <div className="text-white/50 text-xs">pairs</div>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-1 text-center">
            <div className="text-white font-black">{timeStr}</div>
            <div className="text-white/50 text-xs">time</div>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-4">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500"
            animate={{ width: `${(matches / totalPairs) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Card grid */}
      <div className="flex-1 flex items-center justify-center px-4 pb-6">
        <div
          className="grid gap-3 w-full max-w-2xl"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridAutoRows: `minmax(${cols >= 6 ? '70px' : '80px'}, 1fr)`,
          }}
        >
          {cards.map(card => (
            <MemoryCard
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card.id)}
              disabled={locked}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
