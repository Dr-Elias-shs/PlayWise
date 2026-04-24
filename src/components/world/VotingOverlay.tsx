"use client";
/**
 * VotingOverlay — appears on ALL players' screens when anyone triggers a room.
 *
 * Flow:
 *   Player A enters room → broadcasts RoomTriggerEvent
 *   All clients → VotingOverlay appears with 15s countdown
 *   Each player taps an answer → broadcasts VoteEvent
 *   All clients show live vote tally (no answer revealed yet)
 *   Timer ends OR all voted → majority wins (weighted: specialist votes ×2)
 *   Triggering client broadcasts RoomResolvedEvent
 *   All clients update solvedRooms / team score
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldMultiStore } from '@/store/useWorldMultiStore';
import { playSound } from '@/lib/sounds';

interface Props {
  myName:        string;
  totalPlayers:  number;
  onVote:        (choice: number) => void;
  onResolve:     (correct: boolean, answer: number) => void; // only called by triggerer
  isTriggerer:   boolean;
}

const VOTE_DURATION = 15; // seconds

export function VotingOverlay({ myName, totalPlayers, onVote, onResolve, isTriggerer }: Props) {
  const { activeVote, myVote, specialties } = useWorldMultiStore();
  const [timeLeft, setTimeLeft] = useState(VOTE_DURATION);
  const resolvedRef = useRef(false);
  const timerRef    = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!activeVote) return;
    resolvedRef.current = false;
    const end = activeVote.expiresAt;

    function tick() {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(timerRef.current!);
        if (isTriggerer && !resolvedRef.current) resolve();
      }
    }
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => clearInterval(timerRef.current!);
  }, [activeVote?.trigger.room_key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-resolve when all players voted
  useEffect(() => {
    if (!activeVote || resolvedRef.current || !isTriggerer) return;
    const voteCount = Object.keys(activeVote.votes).length;
    if (voteCount >= totalPlayers) {
      clearInterval(timerRef.current!);
      resolve();
    }
  }, [activeVote?.votes]); // eslint-disable-line react-hooks/exhaustive-deps

  function resolve() {
    if (!activeVote || resolvedRef.current) return;
    resolvedRef.current = true;

    // Tally votes — specialist votes count ×2
    const tally: number[] = new Array(activeVote.trigger.question.choices.length).fill(0);
    Object.values(activeVote.votes).forEach(({ choice, isSpecialist }) => {
      tally[choice] = (tally[choice] ?? 0) + (isSpecialist ? 2 : 1);
    });
    const winner = tally.indexOf(Math.max(...tally));
    const correct = winner === activeVote.trigger.question.answer;
    playSound(correct ? 'correct' : 'wrong');
    onResolve(correct, activeVote.trigger.question.answer);
  }

  if (!activeVote) return null;

  const { trigger, votes } = activeVote;
  const { question, room_label, room_color, room_emoji, triggered_by } = trigger;
  const voteCount = Object.keys(votes).length;
  const amSpecialist = specialties.includes(trigger.room_key);

  // Per-choice vote count for live tally bar
  const tally = question.choices.map((_, i) =>
    Object.values(votes).filter(v => v.choice === i).length
  );
  const maxVotes = Math.max(1, ...tally);

  const timerPct = (timeLeft / VOTE_DURATION) * 100;
  const timerColor = timeLeft > 8 ? '#10b981' : timeLeft > 4 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        initial={{ scale: 0.92 }} animate={{ scale: 1 }}
      >
        {/* Room header */}
        <div className={`bg-gradient-to-r ${room_color} p-5`}>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-4xl">{room_emoji}</span>
            <div>
              <h2 className="text-white font-black text-xl">{room_label}</h2>
              <p className="text-white/70 text-xs font-bold">
                📍 {triggered_by} found this room!
                {amSpecialist && <span className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-black">⭐ YOU'RE THE EXPERT!</span>}
              </p>
            </div>
          </div>

          {/* Timer bar */}
          <div className="mt-3 h-2 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${timerPct}%` }}
              transition={{ duration: 0.5, ease: 'linear' }}
              className="h-full rounded-full"
              style={{ background: timerColor }}
            />
          </div>
          <div className="flex justify-between text-white/60 text-[10px] font-bold mt-1">
            <span>{voteCount}/{totalPlayers} voted</span>
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white p-5 space-y-4">
          {amSpecialist && (
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl px-4 py-2 text-center">
              <span className="text-yellow-700 text-xs font-black">⭐ You're the {room_label} expert! Your vote counts double!</span>
            </motion.div>
          )}

          <p className="text-slate-800 font-black text-lg text-center leading-snug">
            {question.text}
          </p>

          <div className="space-y-2.5">
            {question.choices.map((choice, i) => {
              const voted = myVote === i;
              const barPct = myVote !== null ? (tally[i] / maxVotes) * 100 : 0;

              return (
                <button key={i}
                  onClick={() => { if (myVote === null) { onVote(i); playSound('click'); } }}
                  disabled={myVote !== null}
                  className={`w-full rounded-2xl text-sm font-black text-left transition-all relative overflow-hidden
                    ${voted
                      ? 'bg-violet-500 text-white border-2 border-violet-500'
                      : myVote !== null
                        ? 'bg-slate-50 text-slate-400 border-2 border-slate-100'
                        : 'bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-violet-400 hover:bg-violet-50 active:scale-95'
                    }`}
                >
                  {/* Vote bar behind (shows after voting) */}
                  {myVote !== null && (
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${barPct}%` }}
                      className="absolute inset-y-0 left-0 bg-violet-100 rounded-2xl"
                    />
                  )}
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <span>{choice}</span>
                    {myVote !== null && tally[i] > 0 && (
                      <span className="text-violet-500 text-xs font-black">{tally[i]} vote{tally[i] !== 1 ? 's' : ''}</span>
                    )}
                    {voted && <span className="text-white text-xs font-black">✓ Your vote</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {myVote === null ? (
            <p className="text-center text-slate-400 text-xs font-bold">
              Tap your answer — the team vote decides!
            </p>
          ) : (
            <p className="text-center text-violet-500 text-xs font-black">
              Voted! Waiting for {totalPlayers - voteCount} more player{totalPlayers - voteCount !== 1 ? 's' : ''}…
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Result flash ──────────────────────────────────────────────────────────────

export function ResultFlash() {
  const { lastResult } = useWorldMultiStore();

  return (
    <AnimatePresence>
      {lastResult && (
        <motion.div
          key={lastResult.roomKey}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className={`text-center px-10 py-8 rounded-3xl shadow-2xl border-4 ${
            lastResult.correct
              ? 'bg-emerald-500 border-emerald-300 text-white'
              : 'bg-red-500 border-red-300 text-white'
          }`}>
            <div className="text-7xl mb-2">{lastResult.correct ? '🎉' : '💪'}</div>
            <div className="font-black text-3xl">{lastResult.correct ? 'Correct!' : 'Wrong!'}</div>
            {lastResult.correct && <div className="text-white/80 font-bold mt-1">+10 team points</div>}
            {!lastResult.correct && (
              <div className="text-white/80 text-sm font-bold mt-1">
                Answer: {lastResult.answer !== undefined ? `Option ${lastResult.answer + 1}` : ''}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
