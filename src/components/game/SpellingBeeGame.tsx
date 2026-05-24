"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, RotateCcw } from 'lucide-react';
import { playSound } from '@/lib/sounds';
import { addCoins } from '@/lib/wallet';
import { recordGameResult } from '@/lib/learningScore';
import { applyDailyFreshness } from '@/lib/gameRewards';
import { useGameStore } from '@/store/useGameStore';
import { getWordsForGrade } from '@/lib/spellingBee';

const WORDS_PER_SESSION = 15;
const BG = 'linear-gradient(135deg, #0c1a6e, #1a237e, #0d47a1)';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speakWord(word: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const say = (delay: number) => {
    const utt = new SpeechSynthesisUtterance(word.toLowerCase());
    utt.rate = 0.78;
    utt.pitch = 1.0;
    utt.lang = 'en-US';
    utt.volume = 1;
    setTimeout(() => window.speechSynthesis.speak(utt), delay);
  };
  say(0);
  say(1400);
}

// ── Bee SVG ──────────────────────────────────────────────────────────────────

function BeeIcon({ size = 56, bounce = false }: { size?: number; bounce?: boolean }) {
  return (
    <motion.div
      animate={bounce ? { y: [0, -8, 0] } : {}}
      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
    >
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
        {/* Wings */}
        <ellipse cx="14" cy="24" rx="10" ry="6" fill="rgba(186,230,253,0.75)" stroke="#7dd3fc" strokeWidth="1.2"/>
        <ellipse cx="42" cy="24" rx="10" ry="6" fill="rgba(186,230,253,0.75)" stroke="#7dd3fc" strokeWidth="1.2"/>
        {/* Body */}
        <ellipse cx="28" cy="34" rx="13" ry="11" fill="#FDD835"/>
        <ellipse cx="28" cy="34" rx="13" ry="11" fill="none" stroke="#F9A825" strokeWidth="1.5"/>
        {/* Stripes */}
        <path d="M15.5 31 Q28 27 40.5 31" stroke="#333" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
        <path d="M15.5 37 Q28 41 40.5 37" stroke="#333" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* Head */}
        <circle cx="28" cy="19" r="8" fill="#FDD835" stroke="#F9A825" strokeWidth="1.5"/>
        {/* Eyes */}
        <circle cx="25" cy="18" r="2" fill="#1a1a1a"/>
        <circle cx="31" cy="18" r="2" fill="#1a1a1a"/>
        <circle cx="25.7" cy="17.3" r="0.7" fill="white"/>
        <circle cx="31.7" cy="17.3" r="0.7" fill="white"/>
        {/* Smile */}
        <path d="M25 22 Q28 25 31 22" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        {/* Antennae */}
        <line x1="24" y1="12" x2="19" y2="6" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="18.5" cy="5.5" r="2" fill="#FDD835" stroke="#F9A825" strokeWidth="1"/>
        <line x1="32" y1="12" x2="37" y2="6" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="37.5" cy="5.5" r="2" fill="#FDD835" stroke="#F9A825" strokeWidth="1"/>
      </svg>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SpellingBeeGame({ onBack }: { onBack: () => void }) {
  const { playerName, playerEmail, playerGrade } = useGameStore();
  const grade = Math.max(1, Math.min(12, parseInt(playerGrade ?? '1', 10) || 1));

  const [phase, setPhase] = useState<'loading' | 'playing' | 'done'>('loading');
  const [words, setWords] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startRef = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load words
  useEffect(() => {
    getWordsForGrade(grade).then(pool => {
      setWords(shuffle(pool).slice(0, WORDS_PER_SESSION));
      setPhase('playing');
    });
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [grade]);

  // Auto-speak when a new word appears
  useEffect(() => {
    if (phase !== 'playing' || words.length === 0 || result !== 'idle') return;
    setSpeaking(true);
    speakWord(words[idx]);
    const t = setTimeout(() => setSpeaking(false), 3000);
    return () => clearTimeout(t);
  // Only fire when idx changes (not on every result change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, words.length]);

  // Re-focus input when result clears
  useEffect(() => {
    if (result === 'idle' && phase === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [result, phase]);

  const hearAgain = useCallback(() => {
    if (!words[idx]) return;
    setSpeaking(true);
    speakWord(words[idx]);
    setTimeout(() => setSpeaking(false), 3000);
  }, [words, idx]);

  const advance = useCallback((newCorrect: number, totalIdx: number) => {
    advanceTimer.current = setTimeout(() => {
      setInput('');
      setResult('idle');
      const nextIdx = totalIdx + 1;
      if (nextIdx >= words.length) {
        // Game done
        setPhase('done');
        const elapsed = Math.round((Date.now() - startRef.current) / 1000);
        const gradeBonus = Math.max(1, Math.ceil(grade / 3));
        const rawCoins = newCorrect * 2 * gradeBonus + (newCorrect === words.length ? 10 : 0);
        if (playerName) {
          const dbKey = playerEmail || playerName;
          applyDailyFreshness(dbKey, 'spelling-bee', rawCoins).then(coins => {
            setCoinsEarned(coins);
            addCoins(playerName, coins, elapsed, newCorrect > 0, playerGrade ?? '', 'spelling-bee', playerEmail).catch(() => {});
            recordGameResult(playerName, 'spelling-bee', newCorrect, words.length, playerGrade ?? '').catch(() => {});
          });
        }
      } else {
        setIdx(nextIdx);
      }
    }, 1700);
  }, [words.length, grade, playerName, playerEmail, playerGrade]);

  const submit = useCallback(() => {
    if (result !== 'idle' || !words[idx] || !input.trim()) return;
    const typed = input.trim().toUpperCase();
    const target = words[idx].toUpperCase();
    const isCorrect = typed === target;

    if (isCorrect) {
      playSound('correct');
      setResult('correct');
      setStreak(s => {
        const next = s + 1;
        if (next === 3 || next === 5 || next % 5 === 0) playSound('correct');
        return next;
      });
      setCorrectCount(c => {
        advance(c + 1, idx);
        return c + 1;
      });
    } else {
      playSound('wrong');
      setResult('wrong');
      setStreak(0);
      advance(correctCount, idx);
    }
  }, [input, result, words, idx, correctCount, advance]);

  // Enter key to submit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && phase === 'playing' && result === 'idle' && input.trim()) {
        submit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [submit, phase, result, input]);

  const restart = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    getWordsForGrade(grade).then(pool => {
      setWords(shuffle(pool).slice(0, WORDS_PER_SESSION));
      setIdx(0);
      setInput('');
      setResult('idle');
      setStreak(0);
      setCorrectCount(0);
      setCoinsEarned(0);
      startRef.current = Date.now();
      setPhase('playing');
    });
  }, [grade]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }}>
          <BeeIcon size={64} />
        </motion.div>
      </div>
    );
  }

  const currentWord = words[idx] ?? '';
  const accuracy = words.length > 0 ? Math.round((correctCount / Math.max(idx, 1)) * 100) : 100;

  // ── Done screen ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const isPerfect = correctCount === words.length;
    const isGood = correctCount >= Math.ceil(words.length * 0.7);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BG }}>
        {/* Confetti for perfect */}
        {isPerfect && Array.from({ length: 30 }).map((_, i) => (
          <motion.div key={i}
            className="fixed w-3 h-3 rounded-sm pointer-events-none"
            style={{
              background: ['#FDD835','#f87171','#34d399','#60a5fa','#a78bfa','#fb923c'][i % 6],
              left: `${5 + Math.random() * 90}%`,
              top: 0,
              zIndex: 60,
            }}
            initial={{ y: 0, rotate: 0, opacity: 1 }}
            animate={{ y: '105vh', rotate: 720 + Math.random() * 360, opacity: [1, 1, 0] }}
            transition={{ duration: 1.3 + Math.random() * 0.7, delay: Math.random() * 0.5, ease: 'easeIn' }}
          />
        ))}

        <motion.div
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl"
          initial={{ scale: 0.75, y: 40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        >
          <motion.div className="text-6xl mb-3"
            animate={{ rotate: isPerfect ? [0, -12, 12, -8, 8, 0] : [0, -4, 4, 0] }}
            transition={{ duration: 0.7, delay: 0.25 }}>
            {isPerfect ? '🏆' : isGood ? '🎉' : '💪'}
          </motion.div>

          <h2 className="text-3xl font-black text-white mb-1">
            {isPerfect ? 'Perfect spelling!' : isGood ? 'Great job!' : 'Keep practising!'}
          </h2>
          <p className="text-white/50 text-sm mb-6">Grade {grade} · {words.length} words</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-2xl font-black text-white">{correctCount}<span className="text-white/40 text-base">/{words.length}</span></p>
              <p className="text-white/50 text-xs mt-0.5">correct</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-2xl font-black text-emerald-400">{accuracy}%</p>
              <p className="text-white/50 text-xs mt-0.5">accuracy</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-2xl font-black text-yellow-400">+{coinsEarned}</p>
              <p className="text-white/50 text-xs mt-0.5">coins 🪙</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={restart}
              className="flex items-center gap-2 px-5 py-3 bg-white/15 hover:bg-white/25 text-white font-bold rounded-2xl transition-colors text-sm">
              <RotateCcw size={15} /> Again
            </button>
            <button onClick={onBack}
              className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black rounded-2xl transition-colors text-sm">
              Hub
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-hidden" style={{ background: BG }}>

      {/* Background hexagons */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div key={i}
            className="absolute select-none text-yellow-400/10"
            style={{ top: `${Math.random() * 90}%`, left: `${Math.random() * 90}%`, fontSize: `${40 + Math.random() * 30}px` }}
            animate={{ opacity: [0.3, 0.7, 0.3], rotate: [0, 30, 0] }}
            transition={{ repeat: Infinity, duration: 4 + Math.random() * 3, delay: Math.random() * 4 }}>
            ⬡
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 relative z-10 pt-2">
        <button onClick={onBack}
          className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="text-center">
          <p className="text-white font-black text-lg">🐝 Spelling Bee</p>
          <p className="text-white/40 text-xs">Grade {grade}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-xl">
            {idx + 1}<span className="text-white/35 font-medium text-base">/{words.length}</span>
          </p>
          <p className="text-white/40 text-xs">word</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md h-2 bg-white/10 rounded-full overflow-hidden mb-5 relative z-10">
        <motion.div
          className="h-full bg-yellow-400 rounded-full"
          animate={{ width: `${(idx / words.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-5 relative z-10">

        {/* Bee + word number */}
        <motion.div key={`bee-${idx}`}
          className="flex flex-col items-center gap-2"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
          <BeeIcon size={80} bounce={speaking} />
          <p className="text-white/50 text-sm font-medium tracking-wide">Word {idx + 1} of {words.length}</p>
          <AnimatePresence>
            {streak >= 3 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                className="bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-3 py-1">
                <span className="text-yellow-300 font-bold text-sm">🔥 {streak} in a row!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Hear button */}
        <motion.button
          onClick={hearAgain}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg shadow-lg transition-all select-none ${
            speaking
              ? 'bg-yellow-400 text-gray-900 shadow-yellow-400/40'
              : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
          }`}
        >
          <motion.div animate={speaking ? { scale: [1, 1.25, 1] } : {}} transition={{ repeat: Infinity, duration: 0.5 }}>
            <Volume2 size={22} />
          </motion.div>
          {speaking ? 'Listening…' : 'Hear the word 🔊'}
        </motion.button>

        {/* Instruction */}
        <p className="text-white/30 text-xs font-medium">Type what you heard, then press Enter or Check</p>

        {/* Input */}
        <AnimatePresence mode="wait">
          <motion.div key={`input-${idx}`} className="w-full"
            initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }} transition={{ duration: 0.2 }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => result === 'idle' && setInput(e.target.value)}
              placeholder="Type the word…"
              disabled={result !== 'idle'}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className={`w-full text-center text-2xl font-black py-4 px-6 rounded-2xl border-2 transition-all outline-none tracking-wide
                ${result === 'correct'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : result === 'wrong'
                  ? 'bg-red-500/20 border-red-400 text-red-300'
                  : 'bg-white/10 border-white/20 text-white placeholder-white/25 focus:border-yellow-400/70'
                }`}
            />
          </motion.div>
        </AnimatePresence>

        {/* Feedback */}
        <AnimatePresence>
          {result !== 'idle' && (
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base ${
                result === 'correct'
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                  : 'bg-red-500/20 border border-red-400/40 text-red-300'
              }`}
            >
              {result === 'correct' ? (
                <>✅ Correct!</>
              ) : (
                <>❌ The word is <span className="font-black text-white ml-1 tracking-widest">{currentWord}</span></>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check button */}
        {result === 'idle' && (
          <motion.button
            onClick={submit}
            disabled={!input.trim()}
            whileHover={input.trim() ? { scale: 1.04, y: -2 } : {}}
            whileTap={input.trim() ? { scale: 0.96 } : {}}
            className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all ${
              input.trim()
                ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 shadow-yellow-400/25'
                : 'bg-white/8 text-white/25 cursor-not-allowed'
            }`}
          >
            Check ✓
          </motion.button>
        )}

        {/* Live score */}
        <div className="flex gap-4">
          <div className="bg-white/8 rounded-xl px-4 py-2 text-center">
            <p className="text-emerald-400 font-black text-lg leading-none">{correctCount}</p>
            <p className="text-white/35 text-xs mt-1">correct</p>
          </div>
          <div className="bg-white/8 rounded-xl px-4 py-2 text-center">
            <p className="text-red-400 font-black text-lg leading-none">{idx - correctCount}</p>
            <p className="text-white/35 text-xs mt-1">wrong</p>
          </div>
          <div className="bg-white/8 rounded-xl px-4 py-2 text-center">
            <p className="text-white/60 font-black text-lg leading-none">{words.length - idx}</p>
            <p className="text-white/35 text-xs mt-1">left</p>
          </div>
        </div>
      </div>
    </div>
  );
}
