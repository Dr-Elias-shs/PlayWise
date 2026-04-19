"use client";
import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Timer, Flame, CheckCircle2, XCircle, Trophy, Volume2, VolumeX } from 'lucide-react';
import { playSound, speak } from '@/lib/sounds';
import { saveScore } from '@/lib/supabase';

interface Question {
  num1: number;
  num2: number;
  answer: number;
  options: number[];
}

export const MultiplicationGame = ({ onBack }: { onBack: () => void }) => {
  const { 
    focusNumber, setFocusNumber, score, incrementScore, playerName,
    resetGame, streak, socket, roomId, soundEnabled, setSoundEnabled 
  } = useGameStore();

  const [question, setQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isGameOver, setIsGameOver] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateQuestion = useCallback(() => {
    if (focusNumber === null) return;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = focusNumber * num2;
    
    const options = new Set<number>([answer]);
    while (options.size < 4) {
      const wrong = focusNumber * (Math.floor(Math.random() * 10) + 1) + (Math.random() > 0.5 ? 1 : -1);
      if (wrong > 0) options.add(wrong);
    }

    setQuestion({
      num1: focusNumber,
      num2,
      answer,
      options: Array.from(options).sort(() => Math.random() - 0.5)
    });
  }, [focusNumber]);

  useEffect(() => {
    if (focusNumber !== null && !isGameOver) {
      generateQuestion();
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsGameOver(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [focusNumber, isGameOver, generateQuestion]);

  // Save score to Supabase when game ends
  useEffect(() => {
    if (isGameOver && focusNumber !== null) {
      // For now, using playerName as the student identifier
      saveScore(playerName, focusNumber, score);
    }
  }, [isGameOver, focusNumber, score, playerName]);

  const handleAnswer = (selected: number) => {
    if (!question || feedback) return;

    if (selected === question.answer) {
      if (soundEnabled) {
        playSound('correct');
        speak(`${question.num1} times ${question.num2} is ${question.answer}`);
      }
      setFeedback('correct');
      const timeBonus = Math.floor(timeLeft / 10);
      const points = 100 + (streak * 10) + timeBonus;
      incrementScore(points);
      
      if (socket && roomId) {
        socket.emit('submit_score', { roomId, score: score + points, streak: streak + 1 });
      }

      setTimeout(() => {
        setFeedback(null);
        generateQuestion();
      }, 1000);
    } else {
      if (soundEnabled) {
        playSound('wrong');
        speak(`Incorrect, it is ${question.answer}`);
      }
      setFeedback('wrong');
      setTimeout(() => {
        setFeedback(null);
        generateQuestion();
      }, 1200);
    }
  };

  if (focusNumber === null) {
    return (
      <div className="flex-1 bg-brand-background p-6 flex flex-col items-center">
        <div className="w-full max-w-4xl flex justify-between items-center mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold hover:text-brand-primary">
            <ChevronLeft /> Back to Hub
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 rounded-xl bg-white border border-slate-100 text-slate-500 hover:text-brand-primary shadow-sm"
          >
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </button>
        </div>
        
        <h2 className="text-3xl font-black text-slate-800 mb-2">Pick your focus</h2>
        <p className="text-slate-500 mb-10">Which table do you want to master?</p>
        
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-4xl">
          {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              onClick={() => { resetGame(); setFocusNumber(num); }}
              className="bg-white border-2 border-slate-100 p-8 rounded-2xl text-2xl font-black text-slate-700 hover:border-brand-primary hover:text-brand-primary hover:shadow-xl transition-all"
            >
              ×{num}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isGameOver) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-brand-background">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-100">
          <div className="bg-brand-accent/20 text-brand-accent p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Trophy size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">Game Over!</h2>
          <p className="text-slate-500 mb-8 font-medium">Excellent effort! You're getting faster.</p>
          
          <div className="flex justify-between mb-8 px-4">
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Score</span>
              <span className="text-3xl font-black text-brand-primary">{score}</span>
            </div>
            <div className="text-center">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Max Streak</span>
              <span className="text-3xl font-black text-brand-accent">{streak}</span>
            </div>
          </div>

          <button 
            onClick={() => { setIsGameOver(false); setTimeLeft(60); resetGame(); }}
            className="btn-primary w-full text-lg py-4 mb-3"
          >
            Play Again
          </button>
          <button onClick={onBack} className="w-full py-4 text-slate-500 font-bold hover:text-slate-700">
            Return to Hub
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-brand-background">
      <div className="bg-white border-b border-slate-100 p-4 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
           <button onClick={() => { setFocusNumber(null); resetGame(); }} className="text-slate-400 hover:text-slate-600">
             <ChevronLeft size={32} />
           </button>
           <div className="flex flex-col">
             <span className="text-xs font-bold text-slate-400 uppercase">Focus</span>
             <span className="text-xl font-black text-slate-800">Table of {focusNumber}</span>
           </div>
        </div>

        <div className="flex gap-4 md:gap-8 items-center">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-400 hover:text-brand-primary transition-colors"
          >
            {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl">
            <Timer className={`${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
            <span className={`text-2xl font-black ${timeLeft < 10 ? 'text-red-500' : 'text-slate-700'}`}>{timeLeft}s</span>
          </div>
          <div className="hidden md:flex items-center gap-3 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
            <Flame className="text-orange-500" />
            <span className="text-2xl font-black text-orange-600">{streak}</span>
          </div>
          <div className="flex items-center gap-3 bg-brand-primary/10 px-4 py-2 rounded-xl border border-brand-primary/20">
            <span className="text-2xl font-black text-brand-primary">{score.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {question && !feedback && (
            <motion.div
              key={`${question.num1}-${question.num2}`}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-center mb-12"
            >
              <h1 className="text-8xl md:text-9xl font-black text-slate-800 flex items-center justify-center gap-8">
                {question.num1} <span className="text-brand-primary text-6xl">×</span> {question.num2}
              </h1>
            </motion.div>
          )}

          {feedback && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-12 relative"
            >
              {feedback === 'correct' ? (
                <div className="flex flex-col items-center text-brand-secondary">
                  <motion.div
                    animate={{ 
                      rotate: [0, 15, -15, 0],
                      scale: [1, 1.2, 1],
                      filter: ["drop-shadow(0 0 0px #10B981)", "drop-shadow(0 0 20px #10B981)", "drop-shadow(0 0 0px #10B981)"]
                    }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    <CheckCircle2 size={120} />
                  </motion.div>
                  <span className="text-3xl font-black mt-4 animate-bounce">Magic! Perfect!</span>
                  
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute bg-brand-secondary rounded-full"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        x: Math.cos(i * 45 * Math.PI / 180) * 150,
                        y: Math.sin(i * 45 * Math.PI / 180) * 150
                      }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      style={{ width: 12, height: 12 }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center text-red-500">
                  <XCircle size={120} />
                  <span className="text-3xl font-black mt-4">Try Again!</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-6 w-full mt-8">
          {question?.options.map((opt) => (
            <motion.button
              key={opt}
              whileTap={{ scale: 0.95 }}
              disabled={!!feedback}
              onClick={() => handleAnswer(opt)}
              className="bg-white border-4 border-slate-100 py-8 md:py-12 rounded-3xl text-4xl md:text-6xl font-black text-slate-700 hover:border-brand-primary hover:text-brand-primary hover:shadow-2xl transition-all shadow-lg"
            >
              {opt}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};