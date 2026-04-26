"use client";

/**
 * TimeGate
 *
 * Renders its children when access is allowed.
 * Shows a friendly locked screen when the time-management rules deny access.
 */

import { motion } from 'framer-motion';
import { AccessResult } from '@/lib/timeManagement';

interface Props {
  access:   AccessResult;
  loading:  boolean;
  children: React.ReactNode;
  grade?:   string;
}

export function TimeGate({ access, loading, children, grade }: Props) {
  if (loading) {
    // Tiny spinner — barely noticeable on fast connections
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <motion.div
          className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  if (access.allowed) return <>{children}</>;

  // ── Access Denied Screen ──────────────────────────────────────────────────
  const isScreenTime = access.minutesLeft === 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)' }}>

      {/* Twinkling stars */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div key={i}
          className="absolute rounded-full bg-white/40"
          style={{ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 100}%`, width: (i % 3) + 1, height: (i % 3) + 1 }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: 2.5 + (i % 4) * 0.5, delay: (i * 0.17) % 3, repeat: Infinity }}
        />
      ))}

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-sm w-full text-center border border-white/20 shadow-2xl"
      >
        <div className="text-6xl mb-4">
          {isScreenTime ? '⏰' : '🔒'}
        </div>

        <h2 className="text-white font-black text-2xl mb-2">
          {isScreenTime ? "Time's Up!" : 'Not Available Right Now'}
        </h2>

        <p className="text-white/70 text-sm leading-relaxed mb-6">
          {access.reason}
        </p>

        {isScreenTime && (
          <div className="bg-white/10 rounded-2xl px-4 py-3 mb-4">
            <p className="text-violet-200 text-xs font-bold">
              🌟 Great job playing today! Come back tomorrow for more adventures.
            </p>
          </div>
        )}

        {grade && (
          <p className="text-white/30 text-xs font-bold">
            Grade {grade} · PlayWise
          </p>
        )}
      </motion.div>
    </div>
  );
}
