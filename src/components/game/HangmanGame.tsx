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
    easy:   ['CAT','DOG','SUN','HAT','MAP','PEN','BUS','CUP','LEG','ARM','BOOK','BIRD','FISH','FROG','STAR','TREE','BALL','CAKE','DOOR','HAND','KITE','LAMP','MILK','NOSE','RAIN','RING','DUCK','ROSE','WOLF','DRUM','LEAF','SHIP','ANT','BAT','BEE','BOW','COW','DEN','EAR','EGG','ELK','FAN','FIG','FLY','FOX','GEM','HEN','ICE','INN','JAR','JAW','JET','JOY','KEY','KID','KOI','LOG','MOB','MUD','NUT','OAK','OWL','PAW','PIE','PIG','PIT','POD','POT','RAT','RAW','RIB','ROD','SAP','SAW','SEA','SKY','SOB','SOD','SOW','TAB','TAN','TAP','TAR','TIN','TOE','TON','TOP','TOW','TUB','TUG','URN','VAN','VAT','VET','VIM','VOW','WAX','WEB','WIG','YAK'],
    medium: ['APPLE','BEACH','CLOUD','DANCE','EARTH','FLAME','GRAPE','HOUSE','JUICE','LEMON','MAGIC','NIGHT','OCEAN','PIANO','RIVER','SPACE','TIGER','WATER','BRAIN','CHAIR','DREAM','EAGLE','FROST','HONEY','PIZZA','ROBOT','SHARK','SWORD','TORCH','CLOCK','PLANT','STONE','BACON','BADGE','BANJO','BLAZE','BLIMP','BLOOM','BLOWN','BLUNT','BLURB','BRAID','BRAND','BRAVE','BREAD','BRIDE','BRINE','BRISK','BROOM','BROTH','BROWN','BRUSH','BUDGE','BULGE','BUMPY','BUNCH','BURST','CABIN','CACHE','CAMEO','CANAL','CANDY','CARGO','CHALK','CHAMP','CHANT','CHARM','CHASE','CHEEK','CHESS','CHEST','CHIEF','CHILD','CHILL','CHIMP','CHOIR','CHORE','CHUCK','CIVIC','CLAMP','CLASP','CLASS'],
    hard:   ['CASTLE','DESERT','EMPIRE','FOREST','GARDEN','HAMMER','ISLAND','JUNGLE','MIRROR','ROCKET','SILVER','TROPHY','VALLEY','WALNUT','CAPTAIN','DIAMOND','ELEMENT','FANTASY','HISTORY','JOURNEY','KINGDOM','LANTERN','MYSTERY','NETWORK','VOLCANO','ANCIENT','BALANCE','COURAGE','ECLIPSE','FORTUNE','ABANDON','ABSOLVE','ACCLAIM','ACCOUNT','ACHIEVE','ACQUIRE','ADAPTER','ADDRESS','ADJOURN','ADVANCE','ADVISED','AFFABLE','AFFLICT','AFFIRM','AGILITY','AILMENT','ALMANAC','AMBIVAL','AMPLIFY','ANALYZE','ANTENNA','ANXIETY','APPEASE','APPLAUD','APPOINT','ARCHERY','ARCHIVE','ARSENAL','ARTISAN','ASCRIBE','ASPHALT','ASPIRIN','ASTOUND','ATHLETE','ATTACHE','ATTIRED','ATTRACT','AUCTION','AUDIBLE','AUDITOR','AUSTERE','AVIDITY','AWKWARD','BULWARK','BANQUET','BASTION','BATTERY','BEDROCK','BELOVED','BETWEEN','BILLION','BLOSSOM'],
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
  const dead = wrongCount >= 6;

  // Rope swings when dead
  const ropeAnim = dead
    ? { rotate: [0, 6, -6, 4, -4, 2, -2, 0] }
    : {};
  const ropeTransition = dead
    ? { duration: 1.2, repeat: Infinity, repeatType: 'mirror' as const, ease: 'easeInOut' }
    : {};

  return (
    <motion.svg viewBox="0 0 200 230" className="w-48 h-48 md:w-56 md:h-56 drop-shadow-xl"
      animate={shake ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } : {}}
      transition={{ duration: 0.55 }}>

      {/* ── Gallows structure ─────────────────────────────────────────────── */}
      {/* Ground */}
      <line x1="10" y1="218" x2="190" y2="218" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round"/>
      {/* Vertical post */}
      <line x1="50" y1="218" x2="50" y2="10" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round"/>
      {/* Horizontal beam */}
      <line x1="50" y1="10" x2="135" y2="10" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round"/>
      {/* Support brace */}
      <line x1="50" y1="38" x2="80" y2="10" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round"/>
      {/* Rope */}
      <line x1="135" y1="10" x2="135" y2="34" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round"/>

      {/* ── Hanged figure — pivots from rope tip ─────────────────────────── */}
      <motion.g
        style={{ originX: '135px', originY: '34px' }}
        animate={ropeAnim}
        transition={ropeTransition}
      >
        {/* 1 — HEAD with face */}
        {wrongCount >= 1 && (
          <motion.g key="head"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}>
            {/* Head circle */}
            <circle cx="135" cy="52" r="18" fill="#fde68a" stroke="#f59e0b" strokeWidth="2"/>
            {/* Ears */}
            <ellipse cx="117" cy="52" rx="4" ry="5" fill="#fcd34d"/>
            <ellipse cx="153" cy="52" rx="4" ry="5" fill="#fcd34d"/>
            {/* Eyes — X when dead, dots otherwise */}
            {dead ? (
              <>
                <line x1="126" y1="47" x2="131" y2="52" stroke="#1e293b" strokeWidth="2" strokeLinecap="round"/>
                <line x1="131" y1="47" x2="126" y2="52" stroke="#1e293b" strokeWidth="2" strokeLinecap="round"/>
                <line x1="139" y1="47" x2="144" y2="52" stroke="#1e293b" strokeWidth="2" strokeLinecap="round"/>
                <line x1="144" y1="47" x2="139" y2="52" stroke="#1e293b" strokeWidth="2" strokeLinecap="round"/>
              </>
            ) : (
              <>
                <circle cx="128" cy="50" r="2.5" fill="#1e293b"/>
                <circle cx="142" cy="50" r="2.5" fill="#1e293b"/>
                {/* Pupils glint */}
                <circle cx="129" cy="49" r="1" fill="white"/>
                <circle cx="143" cy="49" r="1" fill="white"/>
              </>
            )}
            {/* Mouth — frown when dead, neutral otherwise */}
            {dead ? (
              <path d="M 127 59 Q 135 55 143 59" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round"/>
            ) : (
              <line x1="128" y1="58" x2="142" y2="58" stroke="#92400e" strokeWidth="1.5" strokeLinecap="round"/>
            )}
            {/* Hair */}
            {[126,130,135,140,144].map((x, i) => (
              <line key={i} x1={x} y1="34" x2={x - 1} y2="28" stroke="#92400e" strokeWidth="2" strokeLinecap="round"/>
            ))}
          </motion.g>
        )}

        {/* 2 — TORSO (shirt) */}
        {wrongCount >= 2 && (
          <motion.g key="body"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            style={{ originX: '135px', originY: '70px' }}
            transition={{ duration: 0.35 }}>
            {/* Shirt body */}
            <rect x="120" y="70" width="30" height="50" rx="6" fill="#6366f1" stroke="#4f46e5" strokeWidth="1.5"/>
            {/* Collar */}
            <path d="M 128 70 L 135 78 L 142 70" stroke="#4f46e5" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            {/* Shirt pocket */}
            <rect x="123" y="78" width="9" height="7" rx="2" fill="#4f46e5" opacity="0.5"/>
            {/* Belly button / waist line */}
            <line x1="120" y1="108" x2="150" y2="108" stroke="#4f46e5" strokeWidth="1.5"/>
          </motion.g>
        )}

        {/* 3 — LEFT ARM (bent at elbow) */}
        {wrongCount >= 3 && (
          <motion.g key="larm"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            style={{ originX: '120px', originY: '80px' }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
            {/* Upper arm */}
            <line x1="120" y1="80" x2="100" y2="102" stroke="#fde68a" strokeWidth="5" strokeLinecap="round"/>
            {/* Lower arm */}
            <line x1="100" y1="102" x2="92" y2="122" stroke="#fde68a" strokeWidth="4.5" strokeLinecap="round"/>
            {/* Hand */}
            <circle cx="90" cy="126" r="5" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
          </motion.g>
        )}

        {/* 4 — RIGHT ARM (bent at elbow) */}
        {wrongCount >= 4 && (
          <motion.g key="rarm"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            style={{ originX: '150px', originY: '80px' }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
            <line x1="150" y1="80" x2="170" y2="102" stroke="#fde68a" strokeWidth="5" strokeLinecap="round"/>
            <line x1="170" y1="102" x2="178" y2="122" stroke="#fde68a" strokeWidth="4.5" strokeLinecap="round"/>
            <circle cx="180" cy="126" r="5" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.5"/>
          </motion.g>
        )}

        {/* 5 — LEGS: trousers */}
        {wrongCount >= 5 && (
          <motion.g key="legs"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            style={{ originX: '135px', originY: '120px' }}
            transition={{ duration: 0.35 }}>
            {/* Trouser waistband */}
            <rect x="119" y="118" width="32" height="8" rx="3" fill="#374151"/>
            {/* Left leg */}
            <path d="M 120 126 L 115 170 L 122 170 L 128 126 Z" fill="#374151" stroke="#1f2937" strokeWidth="1"/>
            {/* Right leg */}
            <path d="M 150 126 L 155 170 L 148 170 L 142 126 Z" fill="#374151" stroke="#1f2937" strokeWidth="1"/>
            {/* Left shoe */}
            <ellipse cx="118" cy="173" rx="9" ry="5" fill="#1e293b"/>
            {/* Right shoe */}
            <ellipse cx="152" cy="173" rx="9" ry="5" fill="#1e293b"/>
          </motion.g>
        )}

        {/* 6 — DEAD: red X eyes handled above, plus sweat drops on wrong guesses */}
        {wrongCount >= 6 && (
          <>
            {/* Sweat drop left */}
            <motion.ellipse cx="112" cy="58" rx="3" ry="5" fill="#bae6fd"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: [0,1,0], y: [0, 8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}/>
            {/* Sweat drop right */}
            <motion.ellipse cx="158" cy="56" rx="3" ry="5" fill="#bae6fd"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: [0,1,0], y: [0, 8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.7 }}/>
          </>
        )}
      </motion.g>
    </motion.svg>
  );
}

// ─── Main game ────────────────────────────────────────────────────────────────

export function HangmanGame({ onBack }: { onBack: () => void }) {
  const { playerName, playerEmail } = useGameStore();
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
        addCoins(playerName, coins, elapsed, true, '', 'hangman', playerEmail).catch(() => {});
        recordGameResult(playerName, 'hangman', lettersGuessedCorrect, totalLetters).catch(() => {});
      }
      setGameStatus('won');
    } else if (isLost) {
      playSound('wrong');
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      const guessedRight = word.split('').filter(l => guessed.has(l)).length;
      const totalAttempts = guessedRight + wrongCount;
      if (playerName) {
        addCoins(playerName, 0, elapsed, false, '', 'hangman', playerEmail).catch(() => {});
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
