"use client";

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';
import { playSound } from '@/lib/sounds';
import { addCoins } from '@/lib/wallet';
import { useGameStore } from '@/store/useGameStore';

// ─── Word bank ────────────────────────────────────────────────────────────────

const WORDS: Record<Level, string[]> = {
  easy: [
    'CAT', 'DOG', 'SUN', 'HAT', 'MAP', 'PEN', 'BUS', 'CUP', 'LEG', 'ARM',
    'BOOK', 'BIRD', 'FISH', 'FROG', 'STAR', 'TREE', 'BALL', 'CAKE', 'DOOR',
    'HAND', 'KITE', 'LAMP', 'MILK', 'NOSE', 'RAIN', 'RING', 'DUCK', 'ROSE',
    'WOLF', 'SAND', 'COAT', 'DRUM', 'LEAF', 'SHIP', 'JUMP',
  ],
  medium: [
    'APPLE', 'BEACH', 'CLOUD', 'DANCE', 'EARTH', 'FLAME', 'GRAPE', 'HOUSE',
    'JUICE', 'LEMON', 'MAGIC', 'NIGHT', 'OCEAN', 'PIANO', 'RIVER', 'SPACE',
    'TIGER', 'WATER', 'BRAIN', 'CHAIR', 'DREAM', 'EAGLE', 'FROST', 'HONEY',
    'PIZZA', 'ROBOT', 'SHARK', 'SWORD', 'TORCH', 'CLOCK', 'PLANT', 'STONE',
    'SWEET', 'NURSE', 'PEACE', 'QUEST',
  ],
  hard: [
    'CASTLE', 'DESERT', 'EMPIRE', 'FOREST', 'GARDEN', 'HAMMER', 'ISLAND',
    'JUNGLE', 'MIRROR', 'ROCKET', 'SILVER', 'TROPHY', 'VALLEY', 'WALNUT',
    'CAPTAIN', 'DIAMOND', 'ELEMENT', 'FANTASY', 'HISTORY', 'JOURNEY',
    'KINGDOM', 'LANTERN', 'MYSTERY', 'NETWORK', 'VOLCANO', 'ANCIENT',
    'BALANCE', 'COURAGE', 'ECLIPSE', 'FORTUNE', 'GATEWAY', 'HARVEST',
    'JUSTICE', 'LOYALTY', 'THUNDER', 'PYRAMID',
  ],
};

const MAX_WRONG = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function pickWord(level: Level): string {
  const pool = WORDS[level];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Hangman SVG ──────────────────────────────────────────────────────────────

function HangmanSVG({ wrongCount, isLost }: { wrongCount: number; isLost: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 200 220"
      className="w-44 h-44 md:w-52 md:h-52 drop-shadow-xl"
      animate={isLost ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
      transition={{ duration: 0.55 }}
    >
      {/* Gallows — always visible */}
      <line x1="10" y1="212" x2="190" y2="212" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <line x1="48" y1="212" x2="48" y2="8"  stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <line x1="48" y1="8"   x2="130" y2="8"  stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      <line x1="130" y1="8"  x2="130" y2="36" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.5" />

      {/* 1 — Head */}
      <AnimatePresence>
        {wrongCount >= 1 && (
          <motion.circle key="head" cx="130" cy="53" r="17"
            stroke="#f87171" strokeWidth="3" fill="transparent"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          />
        )}
      </AnimatePresence>

      {/* 2 — Body */}
      {wrongCount >= 2 && (
        <motion.path d="M 130 70 L 130 138"
          stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      )}

      {/* 3 — Left arm */}
      {wrongCount >= 3 && (
        <motion.path d="M 130 90 L 100 118"
          stroke="#34d399" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}

      {/* 4 — Right arm */}
      {wrongCount >= 4 && (
        <motion.path d="M 130 90 L 160 118"
          stroke="#34d399" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}

      {/* 5 — Left leg */}
      {wrongCount >= 5 && (
        <motion.path d="M 130 138 L 106 176"
          stroke="#818cf8" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}

      {/* 6 — Right leg */}
      {wrongCount >= 6 && (
        <motion.path d="M 130 138 L 154 176"
          stroke="#818cf8" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      )}
    </motion.svg>
  );
}

// ─── Main game ────────────────────────────────────────────────────────────────

export function HangmanGame({ onBack }: { onBack: () => void }) {
  const { playerName } = useGameStore();
  const [level, setLevel] = useState<Level | null>(null);
  const [word, setWord] = useState('');
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [coinsEarned, setCoinsEarned] = useState(0);

  const wrongCount = Array.from(guessed).filter(l => !word.includes(l)).length;
  const isWon = word.length > 0 && word.split('').every(l => guessed.has(l));
  const isLost = wrongCount >= MAX_WRONG;

  const startGame = useCallback((lvl: Level) => {
    setLevel(lvl);
    setWord(pickWord(lvl));
    setGuessed(new Set());
    setGameStatus('playing');
    setCoinsEarned(0);
  }, []);

  // Detect win / lose
  useEffect(() => {
    if (!word || gameStatus !== 'playing') return;
    if (isWon) {
      playSound('correct');
      const livesLeft = MAX_WRONG - wrongCount;
      const multiplier = level ? LEVEL_CONFIG[level].multiplier : 1;
      const coins = Math.round((10 + livesLeft * 8) * multiplier);
      setCoinsEarned(coins);
      if (playerName) addCoins(playerName, coins).catch(() => {});
      setGameStatus('won');
    } else if (isLost) {
      playSound('wrong');
      setGameStatus('lost');
    }
  }, [isWon, isLost]); // eslint-disable-line react-hooks/exhaustive-deps

  const guess = useCallback((letter: string) => {
    if (guessed.has(letter) || gameStatus !== 'playing') return;
    setGuessed(prev => new Set(prev).add(letter));
    if (word.includes(letter)) {
      playSound('correct');
    } else {
      playSound('wrong');
    }
  }, [guessed, word, gameStatus]);

  // Physical keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (ALPHABET.includes(key)) guess(key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [guess]);

  if (!level) {
    return (
      <LevelPicker
        onSelect={startGame}
        onBack={onBack}
        bgStyle="linear-gradient(135deg, #0f0c29, #302b63, #24243e)"
        descriptions={{
          easy:   'Short words · 6 lives',
          medium: 'Longer words · 6 lives',
          hard:   'Tricky long words · 6 lives',
        }}
      />
    );
  }

  const livesLeft = MAX_WRONG - wrongCount;
  const wrongLetters = Array.from(guessed).filter(l => !word.includes(l));

  return (
    <div
      className="min-h-screen flex flex-col items-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}
    >
      {/* Twinkling stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div key={i}
            className="absolute text-white/20 select-none"
            style={{ top: `${Math.random() * 92}%`, left: `${Math.random() * 92}%`, fontSize: `${10 + Math.random() * 10}px` }}
            animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 + Math.random() * 3, delay: Math.random() * 3 }}
          >★</motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 relative z-10 pt-2">
        <button onClick={onBack}
          className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="text-center">
          <p className="text-white font-black text-lg">🪢 Hangman</p>
          <p className="text-white/40 text-xs">{LEVEL_CONFIG[level].emoji} {LEVEL_CONFIG[level].label}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-xl">{livesLeft}</p>
          <p className="text-white/40 text-xs">lives</p>
        </div>
      </div>

      {/* Game area */}
      <div className="w-full max-w-md flex flex-col items-center gap-4 relative z-10">

        {/* Hangman */}
        <HangmanSVG wrongCount={wrongCount} isLost={gameStatus === 'lost'} />

        {/* Life dots */}
        <div className="flex gap-2">
          {Array.from({ length: MAX_WRONG }).map((_, i) => (
            <motion.div key={i}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${i < wrongCount ? 'bg-red-400' : 'bg-white/25'}`}
              animate={i === wrongCount - 1 ? { scale: [1, 1.5, 1] } : {}}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        {/* Word blanks */}
        <div className="flex gap-2 flex-wrap justify-center px-2">
          {word.split('').map((letter, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <AnimatePresence mode="wait">
                {guessed.has(letter) ? (
                  <motion.span key="l"
                    className="text-xl font-black text-white w-7 text-center leading-none"
                    initial={{ y: -18, opacity: 0, scale: 0.4 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                  >{letter}</motion.span>
                ) : (
                  <span key="blank"
                    className={`text-xl font-black w-7 text-center leading-none select-none ${gameStatus === 'lost' ? 'text-red-400' : 'text-transparent'}`}
                  >{letter}</span>
                )}
              </AnimatePresence>
              <div className={`w-6 h-0.5 rounded-full ${guessed.has(letter) ? 'bg-white/70' : 'bg-white/35'}`} />
            </div>
          ))}
        </div>

        {/* Wrong letters used */}
        <div className="h-5 flex gap-2 items-center">
          {wrongLetters.map(l => (
            <motion.span key={l}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="text-red-400/60 font-bold text-sm line-through"
            >{l}</motion.span>
          ))}
        </div>

        {/* Keyboard */}
        <div className="grid grid-cols-7 gap-1.5 w-full">
          {ALPHABET.map(letter => {
            const isUsed    = guessed.has(letter);
            const isCorrect = isUsed && word.includes(letter);
            const isWrong   = isUsed && !word.includes(letter);
            return (
              <motion.button key={letter}
                onClick={() => guess(letter)}
                disabled={isUsed || gameStatus !== 'playing'}
                whileHover={!isUsed ? { scale: 1.18, y: -2 } : {}}
                whileTap={!isUsed ? { scale: 0.88 } : {}}
                className={`
                  py-2.5 rounded-xl text-xs font-black transition-colors
                  ${isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : isWrong   ? 'bg-red-500/30 text-red-300/50'
                  :             'bg-white/15 text-white hover:bg-white/30 active:bg-white/40'}
                `}
              >{letter}</motion.button>
            );
          })}
        </div>
      </div>

      {/* Win overlay */}
      <AnimatePresence>
        {gameStatus === 'won' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            {/* Confetti */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div key={i}
                className="absolute w-2.5 h-2.5 rounded-sm"
                style={{
                  background: ['#f87171','#fbbf24','#34d399','#60a5fa','#a78bfa','#fb923c'][i % 6],
                  left: `${10 + Math.random() * 80}%`,
                  top: 0,
                }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{ y: '105vh', rotate: 720 + Math.random() * 360, opacity: [1, 1, 0] }}
                transition={{ duration: 1.2 + Math.random() * 0.8, delay: Math.random() * 0.4, ease: 'easeIn' }}
              />
            ))}

            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-2xl"
              initial={{ scale: 0.7, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.1 }}
            >
              <motion.div className="text-6xl mb-3"
                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >🎉</motion.div>
              <h2 className="text-3xl font-black text-white mb-1">You got it!</h2>
              <p className="text-white/60 text-sm mb-4">
                The word was <span className="text-white font-black tracking-widest">{word}</span>
              </p>
              {coinsEarned > 0 && (
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.4 }}
                  className="inline-block bg-yellow-400/20 border border-yellow-400/40 rounded-2xl px-5 py-2 mb-5"
                >
                  <span className="text-yellow-300 font-black text-lg">+{coinsEarned} 🪙</span>
                </motion.div>
              )}
              <div className="flex gap-3 justify-center">
                <button onClick={() => startGame(level)}
                  className="flex items-center gap-2 px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl transition-colors text-sm">
                  <RotateCcw size={15} /> Again
                </button>
                <button onClick={onBack}
                  className="px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-colors text-sm">
                  Hub
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lose overlay */}
      <AnimatePresence>
        {gameStatus === 'lost' && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-2xl"
              initial={{ scale: 0.7, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.1 }}
            >
              <motion.div className="text-6xl mb-3"
                animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                transition={{ repeat: 2, duration: 0.4, delay: 0.2 }}
              >💀</motion.div>
              <h2 className="text-3xl font-black text-white mb-1">Game Over!</h2>
              <p className="text-white/60 text-sm mb-6">
                The word was <span className="text-white font-black tracking-widest">{word}</span>
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => startGame(level)}
                  className="flex items-center gap-2 px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl transition-colors text-sm">
                  <RotateCcw size={15} /> Try Again
                </button>
                <button onClick={onBack}
                  className="px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-2xl transition-colors text-sm">
                  Hub
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
