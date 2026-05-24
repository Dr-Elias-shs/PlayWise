"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, RotateCcw, Delete } from 'lucide-react';
import { playSound } from '@/lib/sounds';
import { addCoins } from '@/lib/wallet';
import { recordGameResult } from '@/lib/learningScore';
import { applyDailyFreshness } from '@/lib/gameRewards';
import { useGameStore } from '@/store/useGameStore';
import { getWordsForGrade } from '@/lib/spellingBee';

const WORDS_PER_SESSION = 15;
const BG = 'linear-gradient(135deg, #0c1a6e, #1a237e, #0d47a1)';

const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Prefer a higher-pitched female voice so the word sounds clear and friendly
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(v => /samantha|karen|victoria|zira|susan|moira/i.test(v.name)) ||
    voices.find(v => v.lang === 'en-US' && !v.localService) ||
    voices.find(v => v.lang === 'en-US') ||
    voices.find(v => v.lang.startsWith('en')) ||
    null
  );
}

function speakWord(word: string, onDone?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onDone?.(); return; }
  window.speechSynthesis.cancel();

  const makeUtt = () => {
    const utt = new SpeechSynthesisUtterance(word.toLowerCase());
    utt.rate = 0.62;
    utt.pitch = 1.15;
    utt.lang = 'en-US';
    utt.volume = 1;
    const v = pickVoice();
    if (v) utt.voice = v;
    return utt;
  };

  const first = makeUtt();
  first.onend = () => {
    setTimeout(() => {
      const second = makeUtt();
      second.onend = () => onDone?.();
      window.speechSynthesis.speak(second);
    }, 900);
  };
  window.speechSynthesis.speak(first);
}

function speakText(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.88;
  utt.pitch = 1.15;
  utt.lang = 'en-US';
  utt.volume = 1;
  const v = pickVoice();
  if (v) utt.voice = v;
  window.speechSynthesis.speak(utt);
}

// ── Dictionary API ────────────────────────────────────────────────────────────

interface WordDef {
  partOfSpeech: string;
  definition: string;
  example?: string;
}

async function fetchDefinition(word: string): Promise<WordDef | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const meaning = data[0]?.meanings?.[0];
    const def = meaning?.definitions?.[0];
    if (!def) return null;
    return {
      partOfSpeech: meaning.partOfSpeech ?? '',
      definition: def.definition ?? '',
      example: def.example,
    };
  } catch {
    return null;
  }
}

// ── Bee SVG ───────────────────────────────────────────────────────────────────

function BeeIcon({ size = 56, bounce = false }: { size?: number; bounce?: boolean }) {
  return (
    <motion.div
      animate={bounce ? { y: [0, -8, 0] } : {}}
      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
    >
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
        <ellipse cx="14" cy="24" rx="10" ry="6" fill="rgba(186,230,253,0.75)" stroke="#7dd3fc" strokeWidth="1.2"/>
        <ellipse cx="42" cy="24" rx="10" ry="6" fill="rgba(186,230,253,0.75)" stroke="#7dd3fc" strokeWidth="1.2"/>
        <ellipse cx="28" cy="34" rx="13" ry="11" fill="#FDD835"/>
        <ellipse cx="28" cy="34" rx="13" ry="11" fill="none" stroke="#F9A825" strokeWidth="1.5"/>
        <path d="M15.5 31 Q28 27 40.5 31" stroke="#333" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
        <path d="M15.5 37 Q28 41 40.5 37" stroke="#333" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx="28" cy="19" r="8" fill="#FDD835" stroke="#F9A825" strokeWidth="1.5"/>
        <circle cx="25" cy="18" r="2" fill="#1a1a1a"/>
        <circle cx="31" cy="18" r="2" fill="#1a1a1a"/>
        <circle cx="25.7" cy="17.3" r="0.7" fill="white"/>
        <circle cx="31.7" cy="17.3" r="0.7" fill="white"/>
        <path d="M25 22 Q28 25 31 22" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <line x1="24" y1="12" x2="19" y2="6" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="18.5" cy="5.5" r="2" fill="#FDD835" stroke="#F9A825" strokeWidth="1"/>
        <line x1="32" y1="12" x2="37" y2="6" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="37.5" cy="5.5" r="2" fill="#FDD835" stroke="#F9A825" strokeWidth="1"/>
      </svg>
    </motion.div>
  );
}

// ── On-screen QWERTY keyboard ─────────────────────────────────────────────────

function Keyboard({
  onLetter, onBackspace, onSubmit,
  disabled, canSubmit,
}: {
  onLetter: (l: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled: boolean;
  canSubmit: boolean;
}) {
  return (
    <div className="w-full max-w-md space-y-1.5 select-none">
      {KB_ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1">
          {row.map(letter => (
            <motion.button
              key={letter}
              onPointerDown={e => { e.preventDefault(); if (!disabled) onLetter(letter); }}
              whileTap={!disabled ? { scale: 0.85 } : {}}
              disabled={disabled}
              className={`flex-1 max-w-[2.4rem] h-11 rounded-xl font-black text-sm transition-colors
                ${disabled
                  ? 'bg-white/5 text-white/20'
                  : 'bg-white/20 text-white active:bg-yellow-400 active:text-gray-900 hover:bg-white/30'
                }`}
            >
              {letter}
            </motion.button>
          ))}
        </div>
      ))}

      {/* Bottom row: backspace + check */}
      <div className="flex gap-2 pt-0.5">
        <motion.button
          onPointerDown={e => { e.preventDefault(); if (!disabled) onBackspace(); }}
          whileTap={!disabled ? { scale: 0.88 } : {}}
          disabled={disabled}
          className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors
            ${disabled ? 'bg-white/5 text-white/20' : 'bg-white/15 text-white hover:bg-white/25'}`}
        >
          <Delete size={16} /> DEL
        </motion.button>

        <motion.button
          onPointerDown={e => { e.preventDefault(); if (!disabled && canSubmit) onSubmit(); }}
          whileTap={!disabled && canSubmit ? { scale: 0.94 } : {}}
          disabled={disabled || !canSubmit}
          className={`flex-[2] h-12 rounded-xl font-black text-base transition-all
            ${!disabled && canSubmit
              ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 shadow-lg shadow-yellow-400/25'
              : 'bg-white/8 text-white/25'
            }`}
        >
          CHECK ✓
        </motion.button>
      </div>
    </div>
  );
}

// ── Letter tiles display ──────────────────────────────────────────────────────

function LetterTiles({ input, result }: { input: string; result: 'idle' | 'correct' | 'wrong' }) {
  const letters = input.split('');
  const color =
    result === 'correct' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' :
    result === 'wrong'   ? 'border-red-400 bg-red-500/20 text-red-300' :
                           'border-white/30 bg-white/10 text-white';

  return (
    <div className="min-h-[3.5rem] flex items-center justify-center flex-wrap gap-1.5 px-2">
      {letters.length === 0 ? (
        <p className="text-white/25 text-sm font-medium tracking-widest">tap letters below…</p>
      ) : (
        letters.map((l, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className={`w-9 h-10 flex items-center justify-center rounded-xl border-2 font-black text-lg ${color}`}
          >
            {l}
          </motion.div>
        ))
      )}
      {/* Blinking cursor when idle and typing */}
      {result === 'idle' && letters.length > 0 && (
        <motion.div
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-0.5 h-7 bg-yellow-400 rounded-full"
        />
      )}
    </div>
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
  const [definition, setDefinition] = useState<WordDef | null>(null);
  const [defLoading, setDefLoading] = useState(false);
  const startRef = useRef(Date.now());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getWordsForGrade(grade).then(pool => {
      setWords(shuffle(pool).slice(0, WORDS_PER_SESSION));
      setPhase('playing');
    });
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [grade]);

  // Auto-speak on new word
  useEffect(() => {
    if (phase !== 'playing' || words.length === 0 || result !== 'idle') return;
    const t = setTimeout(() => {
      setSpeaking(true);
      speakWord(words[idx], () => setSpeaking(false));
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, words.length]);

  // Fetch definition for current word
  useEffect(() => {
    if (phase !== 'playing' || words.length === 0) return;
    setDefinition(null);
    setDefLoading(true);
    fetchDefinition(words[idx]).then(def => {
      setDefinition(def);
      setDefLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, words.length]);

  const hearAgain = useCallback(() => {
    if (!words[idx]) return;
    setSpeaking(true);
    speakWord(words[idx], () => setSpeaking(false));
  }, [words, idx]);

  const advance = useCallback((newCorrect: number, totalIdx: number) => {
    advanceTimer.current = setTimeout(() => {
      setInput('');
      setResult('idle');
      const nextIdx = totalIdx + 1;
      if (nextIdx >= words.length) {
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
    }, 2500);
  }, [words.length, grade, playerName, playerEmail, playerGrade]);

  const submit = useCallback(() => {
    if (result !== 'idle' || !words[idx] || !input.trim()) return;
    const typed = input.trim().toUpperCase();
    const target = words[idx].toUpperCase();
    const isCorrect = typed === target;
    if (isCorrect) {
      playSound('correct');
      setResult('correct');
      setStreak(s => s + 1);
      setCorrectCount(c => { advance(c + 1, idx); return c + 1; });
    } else {
      playSound('wrong');
      setResult('wrong');
      setStreak(0);
      advance(correctCount, idx);
    }
  }, [input, result, words, idx, correctCount, advance]);

  const pressLetter = useCallback((l: string) => {
    if (result !== 'idle') return;
    setInput(s => s + l);
  }, [result]);

  const pressBackspace = useCallback(() => {
    if (result !== 'idle') return;
    setInput(s => s.slice(0, -1));
  }, [result]);

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
      setDefinition(null);
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

  // ── Done ───────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const isPerfect = correctCount === words.length;
    const isGood = correctCount >= Math.ceil(words.length * 0.7);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: BG }}>
        {isPerfect && Array.from({ length: 30 }).map((_, i) => (
          <motion.div key={i} className="fixed w-3 h-3 rounded-sm pointer-events-none"
            style={{ background: ['#FDD835','#f87171','#34d399','#60a5fa','#a78bfa','#fb923c'][i % 6], left: `${5 + Math.random() * 90}%`, top: 0, zIndex: 60 }}
            initial={{ y: 0, rotate: 0, opacity: 1 }}
            animate={{ y: '105vh', rotate: 720 + Math.random() * 360, opacity: [1, 1, 0] }}
            transition={{ duration: 1.3 + Math.random() * 0.7, delay: Math.random() * 0.5, ease: 'easeIn' }}
          />
        ))}
        <motion.div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl"
          initial={{ scale: 0.75, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}>
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
    <div className="min-h-screen flex flex-col items-center p-3 pb-4 relative overflow-hidden" style={{ background: BG }}>

      {/* Background hexagons */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div key={i} className="absolute select-none text-yellow-400/10"
            style={{ top: `${Math.random() * 90}%`, left: `${Math.random() * 90}%`, fontSize: `${40 + Math.random() * 30}px` }}
            animate={{ opacity: [0.3, 0.7, 0.3], rotate: [0, 30, 0] }}
            transition={{ repeat: Infinity, duration: 4 + Math.random() * 3, delay: Math.random() * 4 }}>
            ⬡
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-2 relative z-10 pt-1">
        <button onClick={onBack} className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="text-center">
          <p className="text-white font-black text-base">🐝 Spelling Bee</p>
          <p className="text-white/40 text-xs">Grade {grade}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-lg">{idx + 1}<span className="text-white/35 font-medium text-sm">/{words.length}</span></p>
          <p className="text-white/40 text-xs">word</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md h-1.5 bg-white/10 rounded-full overflow-hidden mb-3 relative z-10">
        <motion.div className="h-full bg-yellow-400 rounded-full"
          animate={{ width: `${(idx / words.length) * 100}%` }} transition={{ duration: 0.4 }} />
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-3 relative z-10">

        {/* Bee + streak */}
        <motion.div key={`bee-${idx}`} className="flex flex-col items-center gap-1.5"
          initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}>
          <BeeIcon size={64} bounce={speaking} />
          <AnimatePresence>
            {streak >= 3 && (
              <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                className="bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-3 py-0.5">
                <span className="text-yellow-300 font-bold text-xs">🔥 {streak} in a row!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Hear button */}
        <motion.button onClick={hearAgain} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
          className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl font-black text-base shadow-lg transition-all select-none ${
            speaking ? 'bg-yellow-400 text-gray-900 shadow-yellow-400/40' : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
          }`}>
          <motion.div animate={speaking ? { scale: [1, 1.25, 1] } : {}} transition={{ repeat: Infinity, duration: 0.5 }}>
            <Volume2 size={20} />
          </motion.div>
          {speaking ? 'Listening…' : 'Hear the word 🔊'}
        </motion.button>

        {/* Definition card */}
        <AnimatePresence>
          {(defLoading || definition) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              className="w-full bg-white/8 border border-white/15 rounded-2xl px-4 py-3"
            >
              {defLoading ? (
                <p className="text-white/25 text-xs text-center tracking-wide">looking up definition…</p>
              ) : definition ? (
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="bg-yellow-400/20 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0">
                      {definition.partOfSpeech}
                    </span>
                    <button
                      onClick={() => speakText(
                        definition.definition + (definition.example ? '. For example: ' + definition.example : '')
                      )}
                      className="text-white/30 hover:text-yellow-300 transition-colors flex-shrink-0 mt-0.5"
                      title="Hear definition"
                    >
                      <Volume2 size={13} />
                    </button>
                  </div>
                  <p className="text-white/75 text-xs leading-relaxed">{definition.definition}</p>
                  {definition.example && (
                    <p className="text-white/40 text-xs italic mt-1.5">"{definition.example}"</p>
                  )}
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Letter tiles */}
        <AnimatePresence mode="wait">
          <motion.div key={`tiles-${idx}`} className="w-full"
            initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }} transition={{ duration: 0.18 }}>
            <LetterTiles input={input} result={result} />
          </motion.div>
        </AnimatePresence>

        {/* Feedback */}
        <AnimatePresence>
          {result !== 'idle' && (
            <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm ${
                result === 'correct'
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                  : 'bg-red-500/20 border border-red-400/40 text-red-300'
              }`}>
              {result === 'correct'
                ? <>✅ Correct!</>
                : <>❌ It&apos;s <span className="font-black text-white ml-1 tracking-widest">{currentWord}</span></>
              }
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live score */}
        <div className="flex gap-3">
          <div className="bg-white/8 rounded-xl px-3 py-1.5 text-center">
            <p className="text-emerald-400 font-black text-base leading-none">{correctCount}</p>
            <p className="text-white/35 text-xs mt-0.5">correct</p>
          </div>
          <div className="bg-white/8 rounded-xl px-3 py-1.5 text-center">
            <p className="text-red-400 font-black text-base leading-none">{idx - correctCount}</p>
            <p className="text-white/35 text-xs mt-0.5">wrong</p>
          </div>
          <div className="bg-white/8 rounded-xl px-3 py-1.5 text-center">
            <p className="text-white/60 font-black text-base leading-none">{words.length - idx}</p>
            <p className="text-white/35 text-xs mt-0.5">left</p>
          </div>
        </div>

        {/* Custom keyboard */}
        <Keyboard
          onLetter={pressLetter}
          onBackspace={pressBackspace}
          onSubmit={submit}
          disabled={result !== 'idle'}
          canSubmit={input.trim().length > 0}
        />
      </div>
    </div>
  );
}
