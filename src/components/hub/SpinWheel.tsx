"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '@/store/useGameStore';

// ── Prize config ─────────────────────────────────────────────────────────────
interface Prize {
  id: string; label: string; emoji: string;
  coins: number; color: string; weight: number; // weight 0 = impossible visual-only
}

const PRIZES: Prize[] = [
  { id: 'pb5',    label: '+5',    emoji: '🪙', coins: 5,   color: '#f59e0b', weight: 22 },
  { id: 'try',    label: 'Again', emoji: '🔄', coins: 0,   color: '#64748b', weight: 14 },
  { id: 'pb25',   label: '+25',   emoji: '💰', coins: 25,  color: '#10b981', weight: 12 },
  { id: 'pb10',   label: '+10',   emoji: '🪙', coins: 10,  color: '#3b82f6', weight: 20 },
  { id: 'double', label: '2×',    emoji: '🚀', coins: 0,   color: '#dc2626', weight: 0  },
  { id: 'pb50',   label: '+50',   emoji: '🎉', coins: 50,  color: '#ec4899', weight: 8  },
  { id: 'box',    label: '×100',  emoji: '🎁', coins: 100, color: '#f97316', weight: 4  },
  { id: 'pb15',   label: '+15',   emoji: '✨', coins: 15,  color: '#7c3aed', weight: 20 },
];

const GAMES_NEEDED = 5;
const N     = PRIZES.length;   // 8
const SLICE = 360 / N;         // 45°
const SZ    = 260;
const CX    = SZ / 2;
const CY    = SZ / 2;
const R     = SZ / 2 - 8;

// ── Helpers ──────────────────────────────────────────────────────────────────
function pickWinner(): Prize {
  const pool  = PRIZES.filter(p => p.weight > 0);
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of pool) { r -= p.weight; if (r <= 0) return p; }
  return pool[0];
}

function todayUTC() { return new Date().toISOString().split('T')[0]; }

function polar(deg: number, r = R): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function sectorPath(i: number) {
  const [x1, y1] = polar(i * SLICE);
  const [x2, y2] = polar(i * SLICE + SLICE);
  return `M${CX},${CY} L${x1},${y1} A${R},${R} 0 0,1 ${x2},${y2} Z`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SpinWheel({ onWin }: { onWin?: () => void }) {
  const { playerName, playerEmail } = useGameStore();
  const dbKey = playerEmail?.trim().toLowerCase() || playerName;

  const [open,     setOpen]     = useState(false);
  const [games,    setGames]    = useState(0);
  const [spun,     setSpun]     = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [deg,      setDeg]      = useState(0);
  const [prize,    setPrize]    = useState<Prize | null>(null);

  const ready = games >= GAMES_NEEDED && !spun;
  const gLeft = Math.max(0, GAMES_NEEDED - games);

  // Refresh eligibility on mount and whenever the modal opens
  useEffect(() => {
    if (!dbKey) return;
    const d = todayUTC();
    supabase.from('game_sessions').select('*', { count: 'exact', head: true })
      .eq('student_name', dbKey).gte('created_at', `${d}T00:00:00Z`)
      .then(({ count }) => setGames(count ?? 0));
    supabase.from('coin_transactions').select('*', { count: 'exact', head: true })
      .eq('student_name', dbKey).eq('source', 'spin_wheel')
      .gte('created_at', `${d}T00:00:00Z`)
      .then(({ count }) => setSpun((count ?? 0) > 0));
  }, [dbKey, open]);

  const doSpin = async () => {
    if (!ready || spinning) return;
    setSpinning(true);
    setPrize(null);

    const winner  = pickWinner();
    const wi      = PRIZES.indexOf(winner);
    // Center of the winning sector in SVG coords (0° = top, clockwise)
    const center  = wi * SLICE + SLICE / 2;
    // How many degrees to add so that center lands at the pointer (top)
    const offset  = ((360 - center) - (deg % 360) + 360) % 360;
    setDeg(d => d + offset + 360 * 8);

    setTimeout(async () => {
      setSpinning(false);
      setPrize(winner);
      setSpun(true); // optimistic — prevent double-spin

      if (winner.coins > 0) {
        const { data: w } = await supabase.from('player_wallets')
          .select('coins, total_earned').eq('student_name', dbKey).maybeSingle();
        if (w) {
          await supabase.from('player_wallets').update({
            coins:        (w as any).coins        + winner.coins,
            total_earned: (w as any).total_earned + winner.coins,
          }).eq('student_name', dbKey);
          onWin?.();
        }
      }
      // Record spin (used for daily-once check)
      await supabase.from('coin_transactions').insert({
        student_name: dbKey, amount: winner.coins,
        source: 'spin_wheel', game_id: winner.id,
      });
    }, 3900);
  };

  if (!dbKey) return null;

  return (
    <>
      {/* ── Trigger button ─────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        disabled={spun}
        title={
          spun    ? 'Already spun today — come back tomorrow!'
          : ready ? 'You earned a spin!'
          :         `Play ${gLeft} more game${gLeft !== 1 ? 's' : ''} to unlock`
        }
        className={`relative flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-2xl font-black text-xs shadow-sm transition-all select-none ${
          ready  ? 'text-white shadow-orange-200 hover:scale-105 ring-2 ring-orange-300 ring-offset-1'
          : spun ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          :        'bg-white border-2 border-dashed border-violet-200 text-violet-400 hover:border-violet-400 hover:text-violet-600'
        }`}
        style={ready ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)' } : {}}
      >
        <span className="text-xl leading-none">🎡</span>
        <span className="leading-none">{spun ? 'Spun ✓' : ready ? 'SPIN!' : `${gLeft} to go`}</span>
        {/* Progress dots */}
        {!spun && (
          <div className="flex gap-0.5 mt-0.5">
            {Array.from({ length: GAMES_NEEDED }).map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < games
                  ? ready ? 'bg-white' : 'bg-violet-400'
                  : ready ? 'bg-white/40' : 'bg-violet-200'
              }`} />
            ))}
          </div>
        )}
      </button>

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ background: 'rgba(15,23,42,0.8)' }}
            onClick={e => { if (e.target === e.currentTarget && !spinning) setOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 24 }} animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 24 }} transition={{ type: 'spring', damping: 18 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 pt-5 pb-4 text-center"
                style={{ background: 'linear-gradient(135deg, #1e1b4b, #4c1d95, #7c3aed)' }}>
                <div className="text-3xl mb-1">🎡</div>
                <h2 className="text-xl font-black text-white">Daily Spin!</h2>
                <p className="text-violet-300 text-xs mt-0.5">
                  {ready  ? `${games} games played — spin to win!`
                  : spun  ? "You've already spun today 🎉"
                  :         `Play ${gLeft} more game${gLeft !== 1 ? 's' : ''} to unlock the spin`}
                </p>
              </div>

              <div className="p-5">
                {/* Wheel + pointer */}
                <div className="relative flex items-center justify-center mb-4">
                  {/* Arrow pointer fixed at top */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10" style={{
                    width: 0, height: 0,
                    borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
                    borderTop: '24px solid #0f172a',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                  }} />

                  <svg width={SZ} height={SZ} style={{
                    borderRadius: '50%',
                    boxShadow: '0 6px 32px rgba(0,0,0,0.22)',
                    transform: `rotate(${deg}deg)`,
                    transition: spinning ? 'transform 3.8s cubic-bezier(0.15, 0.65, 0.10, 1)' : 'none',
                    display: 'block',
                  }}>
                    {PRIZES.map((p, i) => {
                      const mid     = i * SLICE + SLICE / 2;
                      const [ex, ey] = polar(mid, R * 0.68);
                      const [lx, ly] = polar(mid, R * 0.37);
                      return (
                        <g key={p.id}>
                          <path d={sectorPath(i)} fill={p.color} stroke="#fff" strokeWidth={1.5} />
                          {/* Emoji */}
                          <text x={ex} y={ey + 7} textAnchor="middle"
                            fontSize={p.id === 'double' ? 20 : 18}
                            style={{ userSelect: 'none' }}>
                            {p.emoji}
                          </text>
                          {/* Label */}
                          <text x={lx} y={ly + 4} textAnchor="middle"
                            fontSize={p.id === 'double' ? 12 : 9}
                            fill="white" fontWeight="900"
                            style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none' }}>
                            {p.label}
                          </text>
                        </g>
                      );
                    })}
                    {/* Center hub */}
                    <circle cx={CX} cy={CY} r={16} fill="#0f172a" stroke="#fff" strokeWidth={2} />
                    <text x={CX} y={CY + 5} textAnchor="middle" fontSize={12}>⭐</text>
                  </svg>
                </div>

                {/* Result card */}
                <AnimatePresence>
                  {!spinning && prize && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 12 }}
                      className={`mb-4 p-4 rounded-2xl text-center border-2 ${
                        prize.coins > 0
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="text-4xl mb-1">{prize.emoji}</div>
                      <div className="font-black text-xl text-slate-800">
                        {prize.coins > 0 ? `+${prize.coins} PlayBits!` : 'Try Again!'}
                      </div>
                      {prize.coins > 0 && (
                        <p className="text-emerald-600 text-sm font-bold mt-0.5">Added to your wallet 🎉</p>
                      )}
                      {prize.id === 'try' && (
                        <p className="text-slate-400 text-sm mt-0.5">So close — play more and try tomorrow!</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* CTA */}
                {!prize ? (
                  <button onClick={doSpin} disabled={spinning || !ready}
                    className={`w-full py-4 rounded-2xl font-black text-base transition-all ${
                      spinning    ? 'bg-slate-100 text-slate-400 cursor-default'
                      : ready     ? 'text-white shadow-lg hover:scale-[1.02] active:scale-95'
                      :             'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    style={ready && !spinning ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)' } : {}}
                  >
                    {spinning ? '🌀 Spinning…'
                    : ready   ? '🎡 SPIN NOW!'
                    :           `Play ${gLeft} more game${gLeft !== 1 ? 's' : ''} first`}
                  </button>
                ) : (
                  <button
                    onClick={() => { setOpen(false); setPrize(null); }}
                    className="w-full py-3 rounded-2xl font-black text-white hover:opacity-90 active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
                  >
                    {prize.coins > 0 ? "Awesome! 🎉" : "I'll get it next time 💪"}
                  </button>
                )}

                {!spinning && !prize && (
                  <button onClick={() => setOpen(false)}
                    className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-500 font-semibold transition-colors">
                    Maybe later
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
