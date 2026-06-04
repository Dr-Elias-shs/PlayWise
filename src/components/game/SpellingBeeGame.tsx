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
import { supabase } from '@/lib/supabase';

const WORDS_PER_SESSION = 15;
const BG = 'linear-gradient(135deg, #0c1a6e, #1a237e, #0d47a1)';

const KB_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

const MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── TTS ───────────────────────────────────────────────────────────────────────

// Module-level preferred voice name — set from picker, persisted to localStorage
let _preferredVoice: string | null = null;
export function setPreferredVoice(name: string | null) { _preferredVoice = name; }

// Curated list of decent English voices shown in the picker
export const VOICE_OPTIONS: Array<{ match: RegExp; label: string; flag: string }> = [
  { match: /samantha/i,                    label: 'Samantha',   flag: '🇺🇸' },
  { match: /google us english(?! male)/i,  label: 'Google US',  flag: '🇺🇸' },
  { match: /zira/i,                        label: 'Zira',       flag: '🇺🇸' },
  { match: /karen/i,                       label: 'Karen',      flag: '🇦🇺' },
  { match: /victoria/i,                    label: 'Victoria',   flag: '🇦🇺' },
  { match: /serena/i,                      label: 'Serena',     flag: '🇬🇧' },
  { match: /google uk english female/i,    label: 'Google UK',  flag: '🇬🇧' },
  { match: /moira/i,                       label: 'Moira',      flag: '🇮🇪' },
  { match: /tessa/i,                       label: 'Tessa',      flag: '🇿🇦' },
  { match: /microsoft.*zira/i,             label: 'MS Zira',    flag: '🇺🇸' },
  { match: /microsoft.*hazel/i,            label: 'MS Hazel',   flag: '🇬🇧' },
];

function getAvailableVoices(): Array<{ voice: SpeechSynthesisVoice; label: string; flag: string }> {
  if (typeof window === 'undefined') return [];
  const voices = window.speechSynthesis.getVoices();
  const result: Array<{ voice: SpeechSynthesisVoice; label: string; flag: string }> = [];
  for (const opt of VOICE_OPTIONS) {
    const found = voices.find(v => opt.match.test(v.name));
    if (found) result.push({ voice: found, label: opt.label, flag: opt.flag });
  }
  return result;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred = _preferredVoice ?? (typeof window !== 'undefined' ? localStorage.getItem('sb_voice') : null);
  if (preferred) {
    const found = voices.find(v => v.name === preferred);
    if (found) return found;
  }
  return (
    voices.find(v => /samantha|google us english(?! male)|zira|karen|victoria|serena/i.test(v.name)) ||
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
    utt.rate = 0.62; utt.pitch = 1.15; utt.lang = 'en-US'; utt.volume = 1;
    const v = pickVoice(); if (v) utt.voice = v;
    return utt;
  };
  const first = makeUtt();
  first.onend = () => setTimeout(() => {
    const second = makeUtt();
    second.onend = () => onDone?.();
    window.speechSynthesis.speak(second);
  }, 900);
  window.speechSynthesis.speak(first);
}

function speakText(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.88; utt.pitch = 1.15; utt.lang = 'en-US'; utt.volume = 1;
  const v = pickVoice(); if (v) utt.voice = v;
  window.speechSynthesis.speak(utt);
}

// ── Voice Picker component ────────────────────────────────────────────────────

function VoicePicker({ selectedName, onSelect }: {
  selectedName: string | null;
  onSelect: (name: string) => void;
}) {
  const [available, setAvailable] = useState<Array<{ voice: SpeechSynthesisVoice; label: string; flag: string }>>([]);

  useEffect(() => {
    const load = () => {
      const list = getAvailableVoices();
      if (list.length > 0) setAvailable(list);
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  if (available.length === 0) return null;

  return (
    <div className="w-full">
      <p className="text-white/40 text-xs font-semibold text-center mb-2 uppercase tracking-wide">🔊 Speaker Voice</p>
      <div className="flex flex-wrap justify-center gap-2">
        {available.map(({ voice, label, flag }) => {
          const active = selectedName === voice.name;
          return (
            <button
              key={voice.name}
              onClick={() => {
                onSelect(voice.name);
                // Quick preview
                window.speechSynthesis.cancel();
                const utt = new SpeechSynthesisUtterance('Hello!');
                utt.voice = voice; utt.rate = 0.9; utt.pitch = 1.1;
                window.speechSynthesis.speak(utt);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                active
                  ? 'bg-yellow-400 text-gray-900 shadow-lg shadow-yellow-400/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/15'
              }`}
            >
              <span>{flag}</span>
              <span>{label}</span>
              {active && <span>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Dictionary API ────────────────────────────────────────────────────────────

interface WordDef { partOfSpeech: string; definition: string; example?: string; }


async function fetchDefinition(word: string): Promise<WordDef | null> {
  try {
    const res = await fetch(`/api/dictionary/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) return null;
    const data = await res.json();
    const meaning = data[0]?.meanings?.[0];
    const def = meaning?.definitions?.[0];
    if (!def) return null;
    return { partOfSpeech: meaning.partOfSpeech ?? '', definition: def.definition ?? '', example: def.example };
  } catch { return null; }
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
        <circle cx="25" cy="18" r="2" fill="#1a1a1a"/><circle cx="31" cy="18" r="2" fill="#1a1a1a"/>
        <circle cx="25.7" cy="17.3" r="0.7" fill="white"/><circle cx="31.7" cy="17.3" r="0.7" fill="white"/>
        <path d="M25 22 Q28 25 31 22" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        <line x1="24" y1="12" x2="19" y2="6" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="18.5" cy="5.5" r="2" fill="#FDD835" stroke="#F9A825" strokeWidth="1"/>
        <line x1="32" y1="12" x2="37" y2="6" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="37.5" cy="5.5" r="2" fill="#FDD835" stroke="#F9A825" strokeWidth="1"/>
      </svg>
    </motion.div>
  );
}

// ── QWERTY keyboard ───────────────────────────────────────────────────────────

function Keyboard({ onLetter, onBackspace, onSubmit, disabled, canSubmit }: {
  onLetter: (l: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled: boolean;
  canSubmit: boolean;
}) {
  return (
    <div className="w-full max-w-xl space-y-2 select-none">
      {KB_ROWS.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1.5">
          {row.map(letter => (
            <motion.button key={letter}
              onPointerDown={e => { e.preventDefault(); if (!disabled) onLetter(letter); }}
              whileTap={!disabled ? { scale: 0.85 } : {}}
              disabled={disabled}
              className={`flex-1 h-12 rounded-xl font-black text-base transition-colors
                ${disabled ? 'bg-white/5 text-white/20'
                  : 'bg-white/20 text-white active:bg-yellow-400 active:text-gray-900 hover:bg-white/30'}`}
            >{letter}</motion.button>
          ))}
        </div>
      ))}
      <div className="flex gap-1.5 pt-0.5">
        <motion.button
          onPointerDown={e => { e.preventDefault(); if (!disabled) onBackspace(); }}
          whileTap={!disabled ? { scale: 0.88 } : {}} disabled={disabled}
          className={`flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 transition-colors
            ${disabled ? 'bg-white/5 text-white/20' : 'bg-white/15 text-white hover:bg-white/25'}`}
        ><Delete size={16} /> DEL</motion.button>
        <motion.button
          onPointerDown={e => { e.preventDefault(); if (!disabled && canSubmit) onSubmit(); }}
          whileTap={!disabled && canSubmit ? { scale: 0.94 } : {}}
          disabled={disabled || !canSubmit}
          className={`flex-[2] h-12 rounded-xl font-black text-base transition-all
            ${!disabled && canSubmit
              ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300 shadow-lg shadow-yellow-400/25'
              : 'bg-white/8 text-white/25'}`}
        >CHECK ✓</motion.button>
      </div>
    </div>
  );
}

// ── Letter tiles ──────────────────────────────────────────────────────────────

function LetterTiles({ input, result }: { input: string; result: 'idle' | 'correct' | 'wrong' }) {
  const letters = input.split('');
  const color = result === 'correct' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
    : result === 'wrong' ? 'border-red-400 bg-red-500/20 text-red-300'
    : 'border-white/30 bg-white/10 text-white';
  return (
    <div className="min-h-[3.5rem] flex items-center justify-center flex-wrap gap-1.5 px-2">
      {letters.length === 0 ? (
        <p className="text-white/25 text-sm font-medium tracking-widest">tap letters below…</p>
      ) : letters.map((l, i) => (
        <motion.div key={i}
          initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className={`w-9 h-10 flex items-center justify-center rounded-xl border-2 font-black text-lg ${color}`}
        >{l}</motion.div>
      ))}
      {result === 'idle' && letters.length > 0 && (
        <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }}
          className="w-0.5 h-7 bg-yellow-400 rounded-full" />
      )}
    </div>
  );
}

// ── Floating hexagons background ──────────────────────────────────────────────

function HexBg({ count = 12, opacity = 0.08 }: { count?: number; opacity?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i} className="absolute select-none text-yellow-400"
          style={{ top: `${(i * 7.3 + 5) % 90}%`, left: `${(i * 13.7 + 3) % 90}%`,
            fontSize: `${38 + (i % 4) * 12}px`, opacity }}
          animate={{ opacity: [opacity * 0.6, opacity * 1.2, opacity * 0.6], rotate: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 4 + (i % 3), delay: i * 0.4 }}>
          ⬡
        </motion.div>
      ))}
    </div>
  );
}

// ── Lobby screen ──────────────────────────────────────────────────────────────

interface LeaderboardEntry { name: string; accuracy: number; sessions: number; score: number; }

function LobbyScreen({ grade, playerName, selectedVoice, onVoiceSelect, onStart, onBack }: {
  grade: number;
  playerName: string;
  selectedVoice: string | null;
  onVoiceSelect: (name: string) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loadingLB, setLoadingLB] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: perf } = await supabase
          .from('game_performance')
          .select('student_name, avg_accuracy, sessions_count')
          .eq('game_id', 'spelling-bee')
          .gte('sessions_count', 1)
          .limit(50);

        if (!perf || perf.length === 0) { setLoadingLB(false); return; }

        const { data: wallets } = await supabase
          .from('player_wallets')
          .select('student_name, display_name, grade')
          .in('student_name', perf.map(p => p.student_name));

        const walletMap = Object.fromEntries(
          (wallets ?? []).map(w => [w.student_name, w])
        );

        // Score = accuracy × ln(sessions + 1) so consistent players rank above lucky one-shots
        const scored = perf
          .filter(p => {
            const w = walletMap[p.student_name];
            return w && String(w.grade) === String(grade);
          })
          .map(p => ({
            name: walletMap[p.student_name]?.display_name || (p.student_name as string).split('@')[0],
            accuracy: Math.round((p.avg_accuracy ?? 0) * 100),
            sessions: p.sessions_count as number,
            score: (p.avg_accuracy ?? 0) * Math.log((p.sessions_count as number) + 1),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        setEntries(scored);
      } catch { /* non-fatal */ }
      setLoadingLB(false);
    })();
  }, []);

  const titleChars = 'Spelling Bee'.split('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden"
      style={{ background: BG }}>

      <HexBg count={16} opacity={0.09} />

      {/* Back */}
      <button onClick={onBack}
        className="absolute top-5 left-5 flex items-center gap-1 text-white/40 hover:text-white transition-colors text-sm font-semibold z-10">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="w-full max-w-sm flex flex-col items-center gap-5 relative z-10">

        {/* Bee entrance */}
        <motion.div
          initial={{ y: -120, scale: 0.4, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 13, delay: 0.1 }}
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut', delay: 1 }}
          >
            <BeeIcon size={110} />
          </motion.div>
        </motion.div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-5xl font-black tracking-tight leading-none mb-2"
            style={{ fontFamily: 'system-ui, sans-serif' }}>
            {titleChars.map((char, i) => (
              <motion.span key={i}
                initial={{ y: -28, opacity: 0, scale: 0.6 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.45 + i * 0.055 }}
                className="inline-block"
                style={{ color: char === ' ' ? 'transparent' : i < 8 ? '#FDD835' : '#ffffff' }}
              >{char === ' ' ? ' ' : char}</motion.span>
            ))}
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.5 }}
            className="flex items-center justify-center gap-2"
          >
            <span className="bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 font-bold text-sm px-3 py-1 rounded-full">
              Grade {grade}
            </span>
            <span className="text-white/30 text-sm">·</span>
            <span className="text-white/40 text-sm font-medium">{WORDS_PER_SESSION} words</span>
          </motion.div>
        </div>

        {/* Leaderboard */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5, ease: 'easeOut' }}
        >
          <div className="bg-white/8 backdrop-blur-sm border border-white/12 rounded-3xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <span className="text-base">🏆</span>
              <span className="text-white font-black text-sm tracking-wide">Top Spellers · Grade {grade}</span>
              <span className="ml-auto text-white/30 text-xs font-medium">accuracy</span>
            </div>

            {loadingLB ? (
              <div className="py-6 text-center">
                <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-white/30 text-sm">loading…</motion.div>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-3xl mb-2">🐝</p>
                <p className="text-white/40 text-sm">Be the first top speller!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/8">
                {entries.map((entry, i) => (
                  <motion.div key={entry.name}
                    initial={{ x: 40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 1.35 + i * 0.1 }}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      entry.name === playerName ? 'bg-yellow-400/10' : ''
                    }`}
                  >
                    <span className="text-xl w-7 text-center">{MEDALS[i]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${
                        entry.name === playerName ? 'text-yellow-300' : 'text-white'
                      }`}>{entry.name}</p>
                      <p className="text-white/35 text-xs">{entry.sessions} sessions</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-base text-emerald-400">{entry.accuracy}%</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Voice picker */}
        <motion.div className="w-full"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
          <VoicePicker selectedName={selectedVoice} onSelect={onVoiceSelect} />
        </motion.div>

        {/* Start button */}
        <motion.div className="w-full"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 1.7 }}
        >
          <motion.button
            onClick={onStart}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            animate={{ boxShadow: [
              '0 0 20px rgba(253,216,53,0.35)',
              '0 0 45px rgba(253,216,53,0.7)',
              '0 0 20px rgba(253,216,53,0.35)',
            ]}}
            transition={{ boxShadow: { repeat: Infinity, duration: 2, delay: 2 } }}
            className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-black text-xl tracking-wide transition-colors"
          >
            🐝 Start Playing
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SpellingBeeGame({ onBack }: { onBack: () => void }) {
  const { playerName, playerEmail, playerGrade } = useGameStore();
  const grade = Math.max(1, Math.min(12, parseInt(playerGrade ?? '1', 10) || 1));

  const [selectedVoice, setSelectedVoice] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sb_voice');
  });

  const handleVoiceSelect = (name: string) => {
    setSelectedVoice(name);
    setPreferredVoice(name);
    localStorage.setItem('sb_voice', name);
  };

  const [phase, setPhase] = useState<'lobby' | 'loading' | 'playing' | 'done'>('lobby');
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

  // Load words only when phase becomes 'loading'
  useEffect(() => {
    if (phase !== 'loading') return;
    getWordsForGrade(grade).then(pool => {
      setWords(shuffle(pool).slice(0, WORDS_PER_SESSION));
      setPhase('playing');
    });
    return () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); };
  }, [phase, grade]);

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
            recordGameResult(dbKey, 'spelling-bee', newCorrect, words.length, playerGrade ?? '').catch(() => {});
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

  const pressLetter  = useCallback((l: string) => { if (result !== 'idle') return; setInput(s => s + l); }, [result]);
  const pressBackspace = useCallback(() => { if (result !== 'idle') return; setInput(s => s.slice(0, -1)); }, [result]);

  const restart = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setIdx(0); setInput(''); setResult('idle'); setStreak(0);
    setCorrectCount(0); setCoinsEarned(0); setDefinition(null);
    startRef.current = Date.now();
    setPhase('lobby');
  }, []);

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <LobbyScreen
        grade={grade}
        playerName={playerName ?? ''}
        selectedVoice={selectedVoice}
        onVoiceSelect={handleVoiceSelect}
        onStart={() => { startRef.current = Date.now(); setPhase('loading'); }}
        onBack={onBack}
      />
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: BG }}>
        <HexBg count={10} opacity={0.07} />
        <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}>
          <BeeIcon size={72} />
        </motion.div>
        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}
          className="text-yellow-300/70 font-bold text-sm tracking-widest">
          Preparing words…
        </motion.p>
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
        <HexBg count={10} opacity={0.07} />
        {isPerfect && Array.from({ length: 30 }).map((_, i) => (
          <motion.div key={i} className="fixed w-3 h-3 rounded-sm pointer-events-none"
            style={{ background: ['#FDD835','#f87171','#34d399','#60a5fa','#a78bfa','#fb923c'][i % 6],
              left: `${5 + Math.random() * 90}%`, top: 0, zIndex: 60 }}
            initial={{ y: 0, rotate: 0, opacity: 1 }}
            animate={{ y: '105vh', rotate: 720 + Math.random() * 360, opacity: [1, 1, 0] }}
            transition={{ duration: 1.3 + Math.random() * 0.7, delay: Math.random() * 0.5, ease: 'easeIn' }}
          />
        ))}
        <motion.div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl relative z-10"
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
      <HexBg count={10} opacity={0.07} />

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

        {/* Definition button */}
        <AnimatePresence>
          {(defLoading || definition) && (
            <motion.button
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              onClick={() => {
                if (!definition) return;
                speakText(definition.definition + (definition.example ? '. For example: ' + definition.example : ''));
              }}
              disabled={defLoading || !definition}
              whileTap={definition ? { scale: 0.94 } : {}}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm border transition-colors ${
                defLoading
                  ? 'bg-white/5 border-white/10 text-white/25 cursor-default'
                  : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/18 hover:text-white'
              }`}
            >
              <Volume2 size={15} />
              {defLoading ? 'Loading definition…' : 'Hear definition 📖'}
            </motion.button>
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
              {result === 'correct' ? <>✅ Correct!</> : <>❌ It&apos;s <span className="font-black text-white ml-1 tracking-widest">{currentWord}</span></>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live score */}
        <div className="flex gap-3">
          {[
            { val: correctCount, label: 'correct', color: 'text-emerald-400' },
            { val: idx - correctCount, label: 'wrong', color: 'text-red-400' },
            { val: words.length - idx, label: 'left', color: 'text-white/60' },
          ].map(s => (
            <div key={s.label} className="bg-white/8 rounded-xl px-3 py-1.5 text-center">
              <p className={`font-black text-base leading-none ${s.color}`}>{s.val}</p>
              <p className="text-white/35 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Keyboard */}
        <Keyboard
          onLetter={pressLetter} onBackspace={pressBackspace} onSubmit={submit}
          disabled={result !== 'idle'} canSubmit={input.trim().length > 0}
        />
      </div>
    </div>
  );
}
