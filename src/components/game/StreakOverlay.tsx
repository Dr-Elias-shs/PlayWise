"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '@/lib/sounds';

interface Props { streak: number; }

function getInfo(streak: number) {
  if (streak >= 10) return { emoji: '🔥', text: 'ON FIRE!',   glow: '#ff4500', bg: 'rgba(255,69,0,0.18)',    particles: 14 };
  if (streak >= 5)  return { emoji: '⚡', text: 'LIGHTNING!', glow: '#ffd700', bg: 'rgba(255,215,0,0.15)',   particles: 10 };
  if (streak >= 3)  return { emoji: '💥', text: 'COMBO!',     glow: '#ff69b4', bg: 'rgba(255,105,180,0.15)', particles: 8  };
  return null;
}

// Show at exact milestones and every 5 above 10
function isMilestone(n: number) {
  return n === 3 || n === 5 || n === 10 || (n > 10 && n % 5 === 0);
}

export function StreakOverlay({ streak }: Props) {
  const [visible, setVisible] = useState(false);
  const [snap, setSnap] = useState(streak);

  useEffect(() => {
    if (!isMilestone(streak)) return;
    setSnap(streak);
    setVisible(true);
    // Play matching streak sound
    if (streak >= 10) playSound('onfire');
    else if (streak >= 5) playSound('lightning');
    else playSound('combo');
    const t = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(t);
  }, [streak]);

  const info = getInfo(snap);
  if (!info) return null;

  // Random spark positions
  const sparks = Array.from({ length: info.particles }, (_, i) => ({
    id: i,
    angle: (360 / info.particles) * i + Math.random() * 20,
    dist: 80 + Math.random() * 60,
  }));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={snap}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-40"
        >
          {/* Background flash */}
          <motion.div
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0"
            style={{ background: info.bg }}
          />

          {/* Spark particles */}
          {sparks.map(s => (
            <motion.div
              key={s.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(s.angle * Math.PI / 180) * s.dist,
                y: Math.sin(s.angle * Math.PI / 180) * s.dist,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute w-3 h-3 rounded-full"
              style={{ background: info.glow }}
            />
          ))}

          {/* Main label */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: [0, 1.4, 1.1], rotate: [0, 6, -4, 0] }}
            transition={{ duration: 0.45, type: 'spring', stiffness: 300 }}
            className="text-center select-none"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [-8, 8, 0] }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-[5rem] leading-none mb-1"
            >
              {info.emoji}
            </motion.div>

            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: 2, duration: 0.25, delay: 0.3 }}
              className="text-5xl font-black tracking-wide"
              style={{
                color: info.glow,
                textShadow: `0 0 20px ${info.glow}, 0 0 50px ${info.glow}, 0 0 80px ${info.glow}`,
              }}
            >
              {info.text}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/70 font-bold text-xl mt-1"
            >
              ×{snap} streak!
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
