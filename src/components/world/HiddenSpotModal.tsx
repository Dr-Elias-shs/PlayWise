"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldStore } from '@/store/useWorldStore';
import { playSound } from '@/lib/sounds';
import { addCoins } from '@/lib/wallet';
import type { HiddenSpotDef } from '@/lib/rooms';

// Secret bonus questions — harder trivia rewarding curious explorers
const SECRET_QUESTIONS: { text: string; choices: string[]; answer: number; hint: string }[] = [
  {
    text: 'I have hands but cannot clap. What am I?',
    choices: ['A glove', 'A clock', 'A statue', 'A robot'],
    answer: 1,
    hint: 'Hangs on the wall, tells you something every second...',
  },
  {
    text: 'What is the only number that equals itself when added to itself AND multiplied by itself?',
    choices: ['1', '2', '0', '3'],
    answer: 1,
    hint: 'Think: 2 + 2 = 4, and 2 × 2 = 4...',
  },
  {
    text: 'I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?',
    choices: ['A ghost', 'An echo', 'A shadow', 'A whisper'],
    answer: 1,
    hint: 'Shout in a canyon and something shouts back...',
  },
  {
    text: 'What comes once in a minute, twice in a moment, but never in a thousand years?',
    choices: ['The letter M', 'A second', 'A blink', 'A star'],
    answer: 0,
    hint: 'Look carefully at the words themselves...',
  },
  {
    text: 'A farmer has 17 sheep. All but 9 run away. How many are left?',
    choices: ['8', '9', '17', '6'],
    answer: 1,
    hint: '"All but 9" — read it slowly...',
  },
  {
    text: 'What 3-digit number equals the sum of its digits multiplied by the middle digit?',
    choices: ['111', '135', '123', '321'],
    answer: 1,
    hint: '1+3+5 = 9. 9 × 3 = ... hmm, that\'s not it — keep trying!',
  },
  {
    text: 'If you have a bowl with 6 apples and you take away 4, how many apples do YOU have?',
    choices: ['2', '6', '4', '0'],
    answer: 2,
    hint: 'The question asks what YOU have, not what\'s in the bowl...',
  },
];

function getQuestion(spotId: string) {
  // Deterministic pick from spotId so same spot always shows same question
  const idx = spotId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % SECRET_QUESTIONS.length;
  return SECRET_QUESTIONS[idx];
}

interface Props {
  spot: HiddenSpotDef;
  onClose: () => void;
}

export function HiddenSpotModal({ spot, onClose }: Props) {
  const { playerName, addPlayBits, markSecretFound, foundSecrets } = useWorldStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<'question' | 'correct' | 'wrong'>('question');

  const q = getQuestion(spot.id);
  const alreadyFound = foundSecrets.has(spot.id);

  function handleAnswer(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.answer) {
      playSound('correct');
      setTimeout(() => {
        addPlayBits(15);
        markSecretFound(spot.id);
        if (playerName && playerName !== 'Player') {
          addCoins(playerName, 15, 0, false, '', 'world-secret').catch(() => {});
        }
        setPhase('correct');
      }, 500);
    } else {
      playSound('wrong');
      setTimeout(() => setPhase('wrong'), 500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}>

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 24 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-5 text-center"
          style={{ background: 'linear-gradient(135deg, #1e1b4b, #4c1d95, #1e1b4b)' }}>
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl mb-2">
            ✨
          </motion.div>
          <h2 className="text-white font-black text-xl">Secret Spot Found!</h2>
          <p className="text-white/60 text-xs mt-1">Answer correctly for a bonus reward</p>
        </div>

        <div className="bg-white p-5">
          <AnimatePresence mode="wait">

            {/* Already found */}
            {alreadyFound && phase === 'question' && (
              <motion.div key="found" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-4 space-y-3">
                <div className="text-4xl">🏅</div>
                <p className="font-black text-slate-800">Already discovered!</p>
                <p className="text-slate-500 text-sm">You found this secret spot before. Keep exploring for more!</p>
                <button onClick={onClose}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-sm transition-colors">
                  Keep Exploring 🗺️
                </button>
              </motion.div>
            )}

            {/* Question */}
            {!alreadyFound && phase === 'question' && (
              <motion.div key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
                  <p className="text-slate-800 font-black text-base text-center leading-snug">{q.text}</p>
                </div>
                <div className="space-y-2.5">
                  {q.choices.map((choice, i) => {
                    let cls = 'bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-violet-400 hover:bg-violet-50';
                    if (selected !== null) {
                      if (i === q.answer) cls = 'bg-emerald-500 border-emerald-500 text-white';
                      else if (i === selected) cls = 'bg-red-400 border-red-400 text-white';
                      else cls = 'bg-slate-50 border-slate-100 text-slate-300';
                    }
                    return (
                      <motion.button key={i}
                        whileTap={selected === null ? { scale: 0.97 } : {}}
                        onClick={() => handleAnswer(i)}
                        disabled={selected !== null}
                        className={`w-full py-3 px-4 rounded-2xl font-bold text-sm text-left transition-all ${cls}`}>
                        {choice}
                      </motion.button>
                    );
                  })}
                </div>
                {/* Hint */}
                <details className="text-center">
                  <summary className="text-[11px] text-violet-400 font-bold cursor-pointer select-none">
                    💡 Show hint
                  </summary>
                  <p className="text-slate-500 text-xs mt-1 italic">{q.hint}</p>
                </details>
              </motion.div>
            )}

            {/* Correct */}
            {phase === 'correct' && (
              <motion.div key="correct"
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-center py-6 space-y-3">
                <div className="text-6xl">🌟</div>
                <h3 className="text-2xl font-black text-emerald-600">Brilliant!</h3>
                <div className="flex items-center justify-center gap-2 bg-yellow-50 rounded-2xl py-3 border border-yellow-100">
                  <span className="text-2xl">🪙</span>
                  <span className="text-yellow-600 font-black text-xl">+15 PlayBits</span>
                </div>
                <p className="text-slate-400 text-xs">Secret spot #{spot.id.split('_')[1]} discovered!</p>
                <button onClick={onClose}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black rounded-2xl text-sm hover:opacity-90 transition-opacity">
                  Keep Exploring 🗺️
                </button>
              </motion.div>
            )}

            {/* Wrong */}
            {phase === 'wrong' && (
              <motion.div key="wrong"
                initial={{ x: -8 }} animate={{ x: [0, -10, 10, -6, 6, 0] }}
                transition={{ duration: 0.4 }}
                className="text-center py-6 space-y-3">
                <div className="text-5xl">🤔</div>
                <h3 className="text-xl font-black text-red-500">Not quite!</h3>
                <p className="text-slate-500 text-sm">The correct answer was:</p>
                <p className="text-slate-800 font-black text-base bg-emerald-50 rounded-2xl py-3 px-4 border border-emerald-100">
                  {q.choices[q.answer]}
                </p>
                <div className="flex gap-2">
                  <button onClick={onClose}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-sm transition-colors">
                    Leave
                  </button>
                  <button onClick={() => { setSelected(null); setPhase('question'); }}
                    className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl text-sm transition-colors">
                    Try Again 🔄
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
