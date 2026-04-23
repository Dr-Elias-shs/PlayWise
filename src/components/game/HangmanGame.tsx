"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { LevelPicker, Level, LEVEL_CONFIG } from './LevelPicker';
import { playSound } from '@/lib/sounds';
import { addCoins } from '@/lib/wallet';
import { recordGameResult } from '@/lib/learningScore';
import { useGameStore } from '@/store/useGameStore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Language = 'english' | 'french' | 'arabic';

const LANG_CONFIG: Record<Language, { label: string; emoji: string; native: string; dir: 'ltr' | 'rtl' }> = {
  english: { label: 'English',  emoji: '🇬🇧', native: 'English',  dir: 'ltr' },
  french:  { label: 'French',   emoji: '🇫🇷', native: 'Français', dir: 'ltr' },
  arabic:  { label: 'Arabic',   emoji: '🇱🇧', native: 'عربي',     dir: 'rtl' },
};

// ─── Keyboards ────────────────────────────────────────────────────────────────

const KEYBOARDS: Record<Language, string[]> = {
  english: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  french:  [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), 'É','È','Ê','À','Â','Î','Ô','Ù','Û','Ç'],
  arabic:  ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'],
};

const KB_COLS: Record<Language, number> = { english: 7, french: 9, arabic: 7 };

// ─── Word banks ───────────────────────────────────────────────────────────────

const WORDS: Record<Language, Record<Level, string[]>> = {
  english: {
    easy:   ['CAT','DOG','SUN','HAT','MAP','PEN','BUS','CUP','LEG','ARM','BOOK','BIRD','FISH','FROG','STAR','TREE','BALL','CAKE','DOOR','HAND','KITE','LAMP','MILK','NOSE','RAIN','RING','DUCK','ROSE','WOLF','DRUM','LEAF','SHIP'],
    medium: ['APPLE','BEACH','CLOUD','DANCE','EARTH','FLAME','GRAPE','HOUSE','JUICE','LEMON','MAGIC','NIGHT','OCEAN','PIANO','RIVER','SPACE','TIGER','WATER','BRAIN','CHAIR','DREAM','EAGLE','FROST','HONEY','PIZZA','ROBOT','SHARK','SWORD','TORCH','CLOCK','PLANT','STONE'],
    hard:   ['CASTLE','DESERT','EMPIRE','FOREST','GARDEN','HAMMER','ISLAND','JUNGLE','MIRROR','ROCKET','SILVER','TROPHY','VALLEY','WALNUT','CAPTAIN','DIAMOND','ELEMENT','FANTASY','HISTORY','JOURNEY','KINGDOM','LANTERN','MYSTERY','NETWORK','VOLCANO','ANCIENT','BALANCE','COURAGE','ECLIPSE','FORTUNE'],
  },
  french: {
    easy:   ['BRAS','NUIT','PONT','TOUR','PAIN','LUNE','ROSE','CHAT','LOUP','LION','OURS','BOIS','CIEL','PIED','PEUR','FEUX','MIEL','BRUN','GRIS','VERT','BLEU','MAIN','NAGE','TOIT','DENT'],
    medium: ['ARBRE','FLEUR','LIVRE','NUAGE','PORTE','ROUGE','TIGRE','BLANC','CHEVAL','CRAYON','SOLEIL','JARDIN','SUCRE','NEIGE','MAISON','PAPIER','BEURRE','FOURMI','BATEAU','SAISON','PIERRE','POIVRE'],
    hard:   ['CHATEAU','VOITURE','MUSIQUE','FAMILLE','SCIENCE','BONJOUR','COULEUR','PISCINE','FROMAGE','MONTAGNE','VACANCES','POISSON','GUITARE','FENETRE','SERPENT','TABLEAU','ECOLIER'],
  },
  arabic: {
    easy:   ['باب','بيت','قلم','شمس','قمر','بحر','جبل','نار','خبز','موز','ليل','نهر','سمك','كلب','فيل','ريح','حمل','صوف','دجاج','قفل','حجر','ورق','ذيل'],
    medium: ['كتاب','حليب','عصير','كرسي','صديق','خروف','وردة','مكتب','قلعة','حصان','تفاح','ليمون','بنطال','مشمش','قبعة','شباك'],
    hard:   ['مدرسة','طاولة','سيارة','بيروت','لبنان','برتقال','مكتبة','تلميذ','معلمة','فراشة','سلحفاة','حديقتي'],
  },
};

const MAX_WRONG = 6;

function pickWord(lang: Language, level: Level): string {
  const pool = WORDS[lang][level];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Language picker ──────────────────────────────────────────────────────────

function LanguagePicker({ onSelect, onBack }: { onSelect: (l: Language) => void; onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="text-5xl mb-3">🪢</div>
          <h2 className="text-4xl font-black text-white mb-2">Hangman</h2>
          <p className="text-white/40 font-medium">Pick a language to play in</p>
        </div>

        <div className="space-y-4">
          {(Object.entries(LANG_CONFIG) as [Language, typeof LANG_CONFIG[Language]][]).map(([id, cfg], i) => (
            <motion.button key={id}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.03, x: 6 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(id)}
              className="w-full flex items-center gap-5 p-5 rounded-2xl text-white shadow-lg bg-white/10 border border-white/15 hover:bg-white/20 transition-colors"
            >
              <span className="text-4xl">{cfg.emoji}</span>
              <div className="flex-1 text-left">
                <div className="font-black text-xl">{cfg.label}</div>
                <div className="text-white/50 text-sm font-medium" style={{ direction: cfg.dir }}>{cfg.native}</div>
              </div>
              <span className="text-white/30 text-2xl">→</span>
            </motion.button>
          ))}
        </div>

        <button onClick={onBack} className="w-full mt-8 text-white/30 hover:text-white/60 font-medium text-sm transition-colors">
          ← Back to Hub
        </button>
      </div>
    </div>
  );
}

// ─── Hangman SVG ──────────────────────────────────────────────────────────────

function HangmanSVG({ wrongCount, shake }: { wrongCount: number; shake: boolean }) {
  return (
    <motion.svg viewBox="0 0 200 220" className="w-44 h-44 md:w-52 md:h-52 drop-shadow-xl"
      animate={shake ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
      transition={{ duration: 0.55 }}>

      {/* Gallows */}
      <line x1="10"  y1="212" x2="190" y2="212" stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
      <line x1="48"  y1="212" x2="48"  y2="8"   stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
      <line x1="48"  y1="8"   x2="130" y2="8"   stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
      <line x1="130" y1="8"   x2="130" y2="36"  stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.45" />

      {/* 1 Head */}
      <AnimatePresence>
        {wrongCount >= 1 && (
          <motion.circle key="head" cx="130" cy="53" r="17"
            stroke="#f87171" strokeWidth="3" fill="transparent"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }} />
        )}
      </AnimatePresence>

      {/* 2 Body */}
      {wrongCount >= 2 && (
        <motion.path d="M 130 70 L 130 138" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} />
      )}

      {/* 3 Left arm */}
      {wrongCount >= 3 && (
        <motion.path d="M 130 90 L 100 118" stroke="#34d399" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
      )}

      {/* 4 Right arm */}
      {wrongCount >= 4 && (
        <motion.path d="M 130 90 L 160 118" stroke="#34d399" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
      )}

      {/* 5 Left leg */}
      {wrongCount >= 5 && (
        <motion.path d="M 130 138 L 106 176" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
      )}

      {/* 6 Right leg */}
      {wrongCount >= 6 && (
        <motion.path d="M 130 138 L 154 176" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3 }} />
      )}
    </motion.svg>
  );
}

// ─── Main game ────────────────────────────────────────────────────────────────

export function HangmanGame({ onBack }: { onBack: () => void }) {
  const { playerName } = useGameStore();
  const [language, setLanguage]   = useState<Language | null>(null);
  const [level, setLevel]         = useState<Level | null>(null);
  const [word, setWord]           = useState('');
  const [guessed, setGuessed]     = useState<Set<string>>(new Set());
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [coinsEarned, setCoinsEarned] = useState(0);
  const startRef = useRef<number>(Date.now());

  const wrongCount = Array.from(guessed).filter(l => !word.includes(l)).length;
  const isWon  = word.length > 0 && word.split('').every(l => guessed.has(l));
  const isLost = wrongCount >= MAX_WRONG;

  const startGame = useCallback((lang: Language, lvl: Level) => {
    const newWord = pickWord(lang, lvl);
    // Easy mode: first letter is gifted
    const initial: Set<string> = lvl === 'easy' ? new Set([newWord[0]]) : new Set();
    setWord(newWord);
    setGuessed(initial);
    setGameStatus('playing');
    setCoinsEarned(0);
    startRef.current = Date.now();
  }, []);

  // Win / lose detection
  useEffect(() => {
    if (!word || gameStatus !== 'playing') return;
    if (isWon) {
      playSound('correct');
      const livesLeft = MAX_WRONG - wrongCount;
      const multiplier = level ? LEVEL_CONFIG[level].multiplier : 1;
      const coins = Math.round((10 + livesLeft * 8) * multiplier);
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      const wordLen = word.length;
      const lettersGuessedCorrect = wordLen;                     // won = all letters found
      const totalLetters = wordLen + wrongCount;                 // correct + wrong guesses
      setCoinsEarned(coins);
      if (playerName) {
        addCoins(playerName, coins, elapsed, true, '', 'hangman').catch(() => {});
        recordGameResult(playerName, 'hangman', lettersGuessedCorrect, totalLetters).catch(() => {});
      }
      setGameStatus('won');
    } else if (isLost) {
      playSound('wrong');
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      const guessedRight = word.split('').filter(l => guessed.has(l)).length;
      const totalAttempts = guessedRight + wrongCount;
      if (playerName) {
        addCoins(playerName, 0, elapsed, false, '', 'hangman').catch(() => {});
        recordGameResult(playerName, 'hangman', guessedRight, totalAttempts).catch(() => {});
      }
      setGameStatus('lost');
    }
  }, [isWon, isLost]); // eslint-disable-line react-hooks/exhaustive-deps

  const guess = useCallback((letter: string) => {
    if (guessed.has(letter) || gameStatus !== 'playing') return;
    setGuessed(prev => new Set(prev).add(letter));
    playSound(word.includes(letter) ? 'correct' : 'wrong');
  }, [guessed, word, gameStatus]);

  // Physical keyboard (English only — other languages need their on-screen keyboard)
  useEffect(() => {
    if (language !== 'english') return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) guess(key);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [language, guess]);

  // ── Screen: language picker ──
  if (!language) {
    return <LanguagePicker onSelect={setLanguage} onBack={onBack} />;
  }

  // ── Screen: level picker ──
  if (!level) {
    return (
      <LevelPicker
        onSelect={lvl => { setLevel(lvl); startGame(language, lvl); }}
        onBack={() => setLanguage(null)}
        bgStyle="linear-gradient(135deg, #0f0c29, #302b63, #24243e)"
        descriptions={{
          easy:   `Short words · first letter shown · ${LANG_CONFIG[language].native}`,
          medium: `Longer words · ${LANG_CONFIG[language].native}`,
          hard:   `Tricky long words · ${LANG_CONFIG[language].native}`,
        }}
      />
    );
  }

  // ── Screen: game ──
  const livesLeft    = MAX_WRONG - wrongCount;
  const wrongLetters = Array.from(guessed).filter(l => !word.includes(l));
  const dir          = LANG_CONFIG[language].dir;
  const keyboard     = KEYBOARDS[language];
  const kbCols       = KB_COLS[language];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}>

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <motion.div key={i} className="absolute text-white/20 select-none"
            style={{ top: `${Math.random() * 92}%`, left: `${Math.random() * 92}%`, fontSize: `${10 + Math.random() * 10}px` }}
            animate={{ opacity: [0.1, 0.5, 0.1], scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 + Math.random() * 3, delay: Math.random() * 3 }}>★</motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 relative z-10 pt-2">
        <button onClick={() => { setLevel(null); }}
          className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm font-semibold">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="text-center">
          <p className="text-white font-black text-lg">🪢 Hangman</p>
          <p className="text-white/40 text-xs">{LANG_CONFIG[language].emoji} {LANG_CONFIG[language].native} · {LEVEL_CONFIG[level].emoji} {LEVEL_CONFIG[level].label}</p>
        </div>
        <div className="text-right">
          <p className="text-white font-black text-xl">{livesLeft}</p>
          <p className="text-white/40 text-xs">lives</p>
        </div>
      </div>

      <div className="w-full max-w-md flex flex-col items-center gap-4 relative z-10">

        {/* Hangman SVG */}
        <HangmanSVG wrongCount={wrongCount} shake={gameStatus === 'lost'} />

        {/* Life dots */}
        <div className="flex gap-2">
          {Array.from({ length: MAX_WRONG }).map((_, i) => (
            <motion.div key={i}
              className={`w-3 h-3 rounded-full transition-colors duration-300 ${i < wrongCount ? 'bg-red-400' : 'bg-white/25'}`}
              animate={i === wrongCount - 1 ? { scale: [1, 1.6, 1] } : {}}
              transition={{ duration: 0.3 }} />
          ))}
        </div>

        {/* Word display */}
        <div className="flex gap-3 flex-wrap justify-center px-2"
          style={{ direction: dir }}>
          {word.split('').map((letter, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <AnimatePresence mode="wait">
                {guessed.has(letter) ? (
                  <motion.span key="l"
                    className="text-3xl font-black text-white w-9 text-center leading-none"
                    style={{ fontFamily: language === 'arabic' ? 'Arial, sans-serif' : undefined }}
                    initial={{ y: -22, opacity: 0, scale: 0.4 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                  >{letter}</motion.span>
                ) : (
                  <span key="blank"
                    className={`text-3xl font-black w-9 text-center leading-none select-none ${gameStatus === 'lost' ? 'text-red-400' : 'text-transparent'}`}
                  >{letter}</span>
                )}
              </AnimatePresence>
              <div className={`w-8 h-0.5 rounded-full ${guessed.has(letter) ? 'bg-white/70' : 'bg-white/35'}`} />
            </div>
          ))}
        </div>

        {/* Wrong letters */}
        <div className="h-5 flex gap-2 items-center flex-wrap justify-center">
          {wrongLetters.map(l => (
            <motion.span key={l} initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="text-red-400/60 font-bold text-sm line-through"
              style={{ fontFamily: language === 'arabic' ? 'Arial, sans-serif' : undefined }}
            >{l}</motion.span>
          ))}
        </div>

        {/* Keyboard */}
        <div className={`grid gap-1.5 w-full`}
          style={{ gridTemplateColumns: `repeat(${kbCols}, minmax(0, 1fr))`, direction: dir }}>
          {keyboard.map(letter => {
            const isUsed    = guessed.has(letter);
            const isCorrect = isUsed && word.includes(letter);
            const isWrong   = isUsed && !word.includes(letter);
            return (
              <motion.button key={letter}
                onClick={() => guess(letter)}
                disabled={isUsed || gameStatus !== 'playing'}
                whileHover={!isUsed ? { scale: 1.18, y: -2 } : {}}
                whileTap={!isUsed ? { scale: 0.88 } : {}}
                style={{ fontFamily: language === 'arabic' ? 'Arial, sans-serif' : undefined }}
                className={`py-3 rounded-xl text-sm font-black transition-colors
                  ${isCorrect ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : isWrong   ? 'bg-red-500/25 text-red-300/40'
                  :             'bg-white/15 text-white hover:bg-white/30'}`}
              >{letter}</motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Win overlay ── */}
      <AnimatePresence>
        {gameStatus === 'won' && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Confetti */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div key={i} className="absolute w-2.5 h-2.5 rounded-sm pointer-events-none"
                style={{ background: ['#f87171','#fbbf24','#34d399','#60a5fa','#a78bfa','#fb923c'][i % 6], left: `${10 + Math.random() * 80}%`, top: 0 }}
                initial={{ y: 0, rotate: 0, opacity: 1 }}
                animate={{ y: '105vh', rotate: 720 + Math.random() * 360, opacity: [1, 1, 0] }}
                transition={{ duration: 1.2 + Math.random() * 0.8, delay: Math.random() * 0.4, ease: 'easeIn' }} />
            ))}

            <motion.div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-2xl"
              initial={{ scale: 0.7, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.1 }}>
              <motion.div className="text-6xl mb-3"
                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                transition={{ duration: 0.6, delay: 0.3 }}>🎉</motion.div>
              <h2 className="text-3xl font-black text-white mb-1">You got it!</h2>
              <p className="text-white/60 text-sm mb-4">
                The word was <span className="text-white font-black tracking-widest"
                  style={{ fontFamily: language === 'arabic' ? 'Arial, sans-serif' : undefined }}>{word}</span>
              </p>
              {coinsEarned > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.4 }}
                  className="inline-block bg-yellow-400/20 border border-yellow-400/40 rounded-2xl px-5 py-2 mb-5">
                  <span className="text-yellow-300 font-black text-lg">+{coinsEarned} 🪙</span>
                </motion.div>
              )}
              <div className="flex gap-3 justify-center">
                <button onClick={() => setLevel(null)}
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

      {/* ── Lose overlay ── */}
      <AnimatePresence>
        {gameStatus === 'lost' && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <motion.div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-2xl"
              initial={{ scale: 0.7, y: 50, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.1 }}>
              <motion.div className="text-6xl mb-3"
                animate={{ rotate: [0, -12, 12, -8, 8, 0], y: [0, -8, 0] }}
                transition={{ duration: 0.7, delay: 0.2 }}>🙈</motion.div>
              <h2 className="text-3xl font-black text-white mb-1">Oops!</h2>
              <p className="text-white/60 text-sm mb-1">So close! The word was</p>
              <p className="text-white font-black text-xl tracking-widest mb-5"
                style={{ fontFamily: language === 'arabic' ? 'Arial, sans-serif' : undefined }}>{word}</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setLevel(null)}
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
