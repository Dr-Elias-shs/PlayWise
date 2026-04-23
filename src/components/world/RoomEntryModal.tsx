"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RoomDef } from '@/lib/rooms';
import { QUESTION_BANK, LeveledQuestion } from '@/lib/questionBank';
import { useWorldStore, RoomKey } from '@/store/useWorldStore';
import { addCoins } from '@/lib/wallet';
import { gameAudio } from '@/lib/game-audio';
import { playSound } from '@/lib/sounds';

interface Props {
  room: RoomDef;
  onClose: () => void;
}

type Phase = 'enter' | 'question' | 'correct' | 'wrong';

export function RoomEntryModal({ room, onClose }: Props) {
  const { playerName, addPlayBits, markRoomComplete, completedRooms, currentMissionIndex, advanceMission } = useWorldStore();
  const [phase, setPhase]       = useState<Phase>('enter');
  const [question, setQuestion] = useState<LeveledQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const questionStartRef = useRef<number>(Date.now());

  const MISSION_SEQUENCE: RoomKey[] = [
    'math', 'science', 'computer', 'robotics', 'library', 'history', 
    'language_arts', 'reading', 'art', 'music', 'kitchen', 'cafeteria'
  ];
  const currentMissionKey = MISSION_SEQUENCE[currentMissionIndex] || null;
  const isCorrectRoom = room.key === currentMissionKey;
  const isAlreadyDone = completedRooms.has(room.key);

  // Pick a random question for this room each visit
  useEffect(() => {
    const bank = QUESTION_BANK[room.key] || [];
    const q = bank[Math.floor(Math.random() * bank.length)];
    setQuestion(q || null);

    // Auto-skip to question if it's the correct room and not done
    if (isCorrectRoom && !isAlreadyDone) {
      setPhase('question');
    }
  }, [room, isCorrectRoom, isAlreadyDone]);

  // Switch music theme when question phase starts
  useEffect(() => {
    if (phase === 'question') {
      questionStartRef.current = Date.now();
      gameAudio.setTheme('challenging');
    } else if (phase === 'correct' || phase === 'wrong') {
      // Keep it challenging or switch back? Let's switch back on close.
    }
    return () => {
      // Revert to peaceful when modal closes
      gameAudio.setTheme('peaceful');
    };
  }, [phase]);

  function handleAnswer(idx: number) {
    if (selected !== null || !question) return;
    setSelected(idx);
    if (idx === question.answer) {
      playSound('correct');
      const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
      setTimeout(() => {
        addPlayBits(10);
        markRoomComplete(room.key);
        if (isCorrectRoom) advanceMission();
        if (playerName && playerName !== 'Player') {
          addCoins(playerName, 0, elapsed, false, '', room.key).catch(() => {});
        }
        setPhase('correct');
      }, 600);
    } else {
      playSound('wrong');
      setTimeout(() => setPhase('wrong'), 600);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>

      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 340, damping: 24 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${room.color} p-5 text-center`}>
          <div className="text-5xl mb-1">{room.emoji}</div>
          <h2 className="text-white font-black text-xl">{room.label}</h2>
        </div>

        {/* Body */}
        <div className="bg-white p-5 space-y-4">

          <AnimatePresence mode="wait">

            {/* Enter prompt */}
            {phase === 'enter' && (
              <motion.div key="enter"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                
                {isAlreadyDone ? (
                  <div className="text-center py-2">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-slate-800 font-black text-lg mb-1">Mission already done!</p>
                    <p className="text-slate-500 text-sm mb-6">You have already completed the task in this room.</p>
                    <button onClick={onClose}
                      className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">
                      Back to Map
                    </button>
                  </div>
                ) : !isCorrectRoom ? (
                  <div className="text-center py-2">
                    <div className="text-4xl mb-2">📍</div>
                    <p className="text-slate-800 font-black text-lg mb-1">Not your current task!</p>
                    <p className="text-slate-500 text-sm mb-6">You need to find the <span className="font-bold text-violet-600">{(currentMissionKey || '').replace(/_/g, ' ')}</span> first.</p>
                    <button onClick={onClose}
                      className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">
                      Okay, searching...
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-700 text-center font-semibold text-base mb-4">
                      Ready for your mission? Answer a question to earn
                      <span className="font-black text-yellow-500"> 10 PlayBits!</span>
                    </p>
                    <div className="flex gap-3">
                      <button onClick={onClose}
                        className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">
                        Not now
                      </button>
                      <button onClick={() => setPhase('question')}
                        className={`flex-1 py-3 rounded-2xl bg-gradient-to-r ${room.color} text-white font-black hover:opacity-90 transition-opacity`}>
                        Enter! 🚀
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Question */}
            {phase === 'question' && question && (
              <motion.div key="question"
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="space-y-4">
                <p className="text-slate-800 font-black text-xl text-center leading-snug">
                  {question.text}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {question.choices.map((choice, i) => {
                    let cls = 'bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50';
                    if (selected !== null) {
                      if (i === question.answer)   cls = 'bg-emerald-500 border-emerald-500 text-white scale-105';
                      else if (i === selected)     cls = 'bg-red-400 border-red-400 text-white';
                      else                         cls = 'bg-slate-50 border-slate-200 text-slate-400 opacity-50';
                    }
                    return (
                      <motion.button
                        key={i}
                        whileTap={selected === null ? { scale: 0.95 } : {}}
                        onClick={() => handleAnswer(i)}
                        disabled={selected !== null}
                        className={`${cls} rounded-2xl py-4 px-2 text-base font-black transition-all duration-200 disabled:cursor-not-allowed`}
                      >
                        {choice}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Correct */}
            {phase === 'correct' && (
              <motion.div key="correct"
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="text-center py-4 space-y-3">
                <div className="text-6xl">🎉</div>
                <h3 className="text-2xl font-black text-emerald-600">Correct!</h3>
                <div className="flex items-center justify-center gap-2 text-yellow-600 font-black text-xl">
                  <span>+10</span>
                  <span className="text-2xl">🪙</span>
                  <span>PlayBits</span>
                </div>
                <button onClick={onClose}
                  className={`w-full py-4 mt-2 rounded-2xl bg-gradient-to-r ${room.color} text-white font-black text-lg hover:opacity-90 transition-opacity`}>
                  Keep Exploring! 🗺️
                </button>
              </motion.div>
            )}

            {/* Wrong */}
            {phase === 'wrong' && (
              <motion.div key="wrong"
                initial={{ x: -10 }} animate={{ x: [0, -8, 8, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
                className="text-center py-4 space-y-3">
                <div className="text-6xl">💪</div>
                <h3 className="text-2xl font-black text-red-500">Try Again!</h3>
                <p className="text-slate-500 text-sm">The correct answer was:</p>
                <p className="text-slate-800 font-black text-lg bg-emerald-50 rounded-xl py-2 px-4">
                  {question?.choices[question.answer]}
                </p>
                <div className="flex gap-3">
                  <button onClick={onClose}
                    className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">
                    Leave
                  </button>
                  <button onClick={() => { 
                    const bank = QUESTION_BANK[room.key] || [];
                    const q = bank[Math.floor(Math.random() * bank.length)];
                    setQuestion(q || null);
                    setSelected(null); 
                    setPhase('question'); 
                  }}
                    className={`flex-1 py-3 rounded-2xl bg-gradient-to-r ${room.color} text-white font-black hover:opacity-90`}>
                    Retry 🔄
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
