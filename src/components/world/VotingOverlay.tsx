"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldMultiStore } from '@/store/useWorldMultiStore';
import { playSound } from '@/lib/sounds';

interface Props {
  myName:       string;
  totalPlayers: number;
  onVote:       (choice: number) => void;
  onResolve:    (correct: boolean, answer: number) => void;
  isTriggerer:  boolean;
}

const VOTE_DURATION   = 15; // seconds voting window
const REVEAL_DURATION = 6;  // seconds the explanation screen stays

type Phase = 'voting' | 'revealing';

export function VotingOverlay({ myName, totalPlayers, onVote, onResolve, isTriggerer }: Props) {
  const { activeVote, myVote, specialties } = useWorldMultiStore();
  const [timeLeft,      setTimeLeft]      = useState(VOTE_DURATION);
  const [phase,         setPhase]         = useState<Phase>('voting');
  const [revealLeft,    setRevealLeft]    = useState(REVEAL_DURATION);
  // Store resolved result so the reveal screen knows it
  const resultRef     = useRef<{ correct: boolean; answer: number; winnerChoice: number } | null>(null);
  const resolvedRef   = useRef(false);
  const voteTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const revealTimerRef= useRef<NodeJS.Timeout | null>(null);

  // ── Voting countdown ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeVote) return;
    resolvedRef.current = false;
    resultRef.current   = null;
    setPhase('voting');
    setTimeLeft(VOTE_DURATION);

    const end = activeVote.expiresAt;
    function tick() {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(voteTimerRef.current!);
        if (isTriggerer && !resolvedRef.current) tally();
      }
    }
    tick();
    voteTimerRef.current = setInterval(tick, 500);
    return () => clearInterval(voteTimerRef.current!);
  }, [activeVote?.trigger.room_key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-tally when everyone has voted
  useEffect(() => {
    if (!activeVote || resolvedRef.current || !isTriggerer || phase !== 'voting') return;
    if (Object.keys(activeVote.votes).length >= totalPlayers) {
      clearInterval(voteTimerRef.current!);
      tally();
    }
  }, [activeVote?.votes]); // eslint-disable-line react-hooks/exhaustive-deps

  function tally() {
    if (!activeVote || resolvedRef.current) return;
    resolvedRef.current = true;

    const choices   = activeVote.trigger.question.choices;
    const tallyCounts = new Array(choices.length).fill(0);
    Object.values(activeVote.votes).forEach(({ choice, isSpecialist }) => {
      tallyCounts[choice] += isSpecialist ? 2 : 1;
    });
    const winnerChoice = tallyCounts.indexOf(Math.max(...tallyCounts));
    const correct      = winnerChoice === activeVote.trigger.question.answer;
    playSound(correct ? 'correct' : 'wrong');

    resultRef.current = { correct, answer: activeVote.trigger.question.answer, winnerChoice };
    setPhase('revealing');
    setRevealLeft(REVEAL_DURATION);

    // Start reveal countdown, then fire onResolve
    let secs = REVEAL_DURATION;
    revealTimerRef.current = setInterval(() => {
      secs--;
      setRevealLeft(secs);
      if (secs <= 0) {
        clearInterval(revealTimerRef.current!);
        onResolve(correct, activeVote.trigger.question.answer);
      }
    }, 1000);
  }

  // Non-triggerers: transition to revealing state when they receive the
  // room_resolved broadcast (activeVote will be closed by closeVote)
  // — they see the reveal via ResultFlash which already handles this.
  // We only show the reveal panel on the triggerer's side here.

  useEffect(() => {
    return () => {
      clearInterval(voteTimerRef.current!);
      clearInterval(revealTimerRef.current!);
    };
  }, []);

  if (!activeVote) return null;

  const { trigger, votes } = activeVote;
  const { question, room_label, room_color, room_emoji, triggered_by } = trigger;
  const voteCount    = Object.keys(votes).length;
  const amSpecialist = specialties.includes(trigger.room_key);
  const tallyArr     = question.choices.map((_, i) =>
    Object.values(votes).filter(v => v.choice === i).length
  );
  const maxVotes     = Math.max(1, ...tallyArr);
  const timerPct     = (timeLeft / VOTE_DURATION) * 100;
  const timerColor   = timeLeft > 8 ? '#10b981' : timeLeft > 4 ? '#f59e0b' : '#ef4444';

  // ── Reveal phase ─────────────────────────────────────────────────────────────
  if (phase === 'revealing' && resultRef.current) {
    const { correct, answer: correctIdx, winnerChoice } = resultRef.current;
    const iGotItRight = myVote === correctIdx;
    const iVotedWrong = myVote !== null && myVote !== correctIdx;

    // Who else was right / wrong
    const rightVoters = Object.entries(votes)
      .filter(([, v]) => v.choice === correctIdx)
      .map(([name]) => name);
    const wrongVoters = Object.entries(votes)
      .filter(([, v]) => v.choice !== correctIdx)
      .map(([name]) => name);

    const explanation = question.explanation
      ?? `The correct answer is "${question.choices[correctIdx]}".`;

    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Result header */}
          <div className={`p-5 text-center ${correct ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
            <div className="text-5xl mb-1">{correct ? '🎉' : '💪'}</div>
            <h2 className="text-white font-black text-xl">
              {correct ? 'Correct! +10 team points' : 'Not quite!'}
            </h2>
            {!correct && winnerChoice !== correctIdx && (
              <p className="text-white/70 text-xs mt-1 font-bold">
                Team voted: "{question.choices[winnerChoice]}" — correct was "{question.choices[correctIdx]}"
              </p>
            )}
          </div>

          <div className="bg-white p-5 space-y-4">
            {/* Question recap */}
            <p className="text-slate-600 text-sm font-bold text-center leading-snug">
              {question.text}
            </p>

            {/* Answer buttons — revealed */}
            <div className="space-y-2">
              {question.choices.map((choice, i) => {
                const isCorrect   = i === correctIdx;
                const isMyVote    = myVote === i;
                const voteCount_i = tallyArr[i];

                let bg = 'bg-slate-50 border-slate-200 text-slate-400';
                if (isCorrect)        bg = 'bg-emerald-500 border-emerald-500 text-white';
                else if (isMyVote)    bg = 'bg-red-400 border-red-400 text-white';

                return (
                  <div key={i}
                    className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 ${bg}`}>
                    <span className="font-black text-sm">{choice}</span>
                    <div className="flex items-center gap-2 text-xs font-bold">
                      {voteCount_i > 0 && (
                        <span className={isCorrect ? 'text-white/80' : isMyVote ? 'text-white/80' : 'text-slate-400'}>
                          {voteCount_i} vote{voteCount_i !== 1 ? 's' : ''}
                        </span>
                      )}
                      {isCorrect && <span>✓ Correct</span>}
                      {isMyVote && !isCorrect && <span>← Your vote</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation — prominent for wrong voters */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`rounded-2xl p-4 border-2 ${
                iGotItRight
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-300'
              }`}>
              {iGotItRight ? (
                <div className="flex items-start gap-2">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="text-emerald-700 font-black text-sm">You got it right!</p>
                    <p className="text-emerald-600 text-xs mt-0.5">{explanation}</p>
                  </div>
                </div>
              ) : iVotedWrong ? (
                <div className="flex items-start gap-2">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-amber-800 font-black text-sm">Here's why:</p>
                    <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">{explanation}</p>
                    {amSpecialist && (
                      <p className="text-amber-600 text-[10px] font-bold mt-1 italic">
                        (You're the expert here — keep studying this room!)
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-xs font-bold text-center">
                  💡 {explanation}
                </p>
              )}
            </motion.div>

            {/* Who got it right / wrong */}
            {(rightVoters.length > 0 || wrongVoters.length > 0) && (
              <div className="flex gap-3 text-[10px] font-black">
                {rightVoters.length > 0 && (
                  <div className="flex-1 bg-emerald-50 rounded-xl p-2 text-center">
                    <div className="text-emerald-600 mb-1">✓ Got it right</div>
                    {rightVoters.map(n => <div key={n} className="text-emerald-500">{n}</div>)}
                  </div>
                )}
                {wrongVoters.length > 0 && (
                  <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
                    <div className="text-red-500 mb-1">✗ Got it wrong</div>
                    {wrongVoters.map(n => <div key={n} className="text-red-400">{n}</div>)}
                  </div>
                )}
              </div>
            )}

            {/* Auto-close countdown */}
            <div className="flex items-center justify-center gap-2">
              <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${(revealLeft / REVEAL_DURATION) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                  className="h-full bg-slate-300 rounded-full"
                />
              </div>
              <span className="text-slate-400 text-[10px] font-bold shrink-0">
                Continuing in {revealLeft}s
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ── Voting phase ──────────────────────────────────────────────────────────────
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
                {amSpecialist && (
                  <span className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-black">
                    ⭐ YOU'RE THE EXPERT!
                  </span>
                )}
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
              <span className="text-yellow-700 text-xs font-black">
                ⭐ You're the {room_label} expert — your vote counts double!
              </span>
            </motion.div>
          )}

          <p className="text-slate-800 font-black text-lg text-center leading-snug">
            {question.text}
          </p>

          <div className="space-y-2.5">
            {question.choices.map((choice, i) => {
              const voted  = myVote === i;
              const barPct = myVote !== null ? (tallyArr[i] / maxVotes) * 100 : 0;

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
                  {myVote !== null && (
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${barPct}%` }}
                      className="absolute inset-y-0 left-0 bg-violet-100 rounded-2xl"
                    />
                  )}
                  <div className="relative flex items-center justify-between px-4 py-3">
                    <span>{choice}</span>
                    <div className="flex items-center gap-2 text-xs">
                      {myVote !== null && tallyArr[i] > 0 && (
                        <span className={voted ? 'text-white/80' : 'text-violet-400'} >
                          {tallyArr[i]} vote{tallyArr[i] !== 1 ? 's' : ''}
                        </span>
                      )}
                      {voted && <span className="font-black">✓ Your vote</span>}
                    </div>
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
              Voted! Waiting for {Math.max(0, totalPlayers - voteCount)} more…
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Result flash — for NON-triggerers who don't see the reveal panel ──────────

export function ResultFlash() {
  const { lastResult, activeVote } = useWorldMultiStore();
  // Don't show flash if the reveal panel is already visible
  if (activeVote) return null;

  return (
    <AnimatePresence>
      {lastResult && (
        <motion.div
          key={lastResult.roomKey}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className={`text-center px-10 py-8 rounded-3xl shadow-2xl border-4 ${
            lastResult.correct
              ? 'bg-emerald-500 border-emerald-300 text-white'
              : 'bg-red-500 border-red-300 text-white'
          }`}>
            <div className="text-7xl mb-2">{lastResult.correct ? '🎉' : '💪'}</div>
            <div className="font-black text-3xl">{lastResult.correct ? 'Correct!' : 'Wrong!'}</div>
            {lastResult.correct
              ? <div className="text-white/80 font-bold mt-1">+10 team points</div>
              : <div className="text-white/80 text-sm font-bold mt-1">Keep exploring!</div>
            }
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
