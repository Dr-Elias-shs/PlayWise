"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '@/lib/sounds';

interface Props { coins: number; }

// Eased counter — slow start, accelerates, eases out near end
function useCounter(target: number, delay = 500) {
  const [val, setVal] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (target === 0) { setDone(true); return; }
    // Coin rain sound at start
    setTimeout(() => playSound('coinrain'), delay * 0.4);
    const startAt = Date.now() + delay;
    const duration = Math.min(2800, 600 + target * 55); // ~55ms per coin, max 2.8s
    let raf: number;

    const tick = () => {
      const now = Date.now();
      if (now < startAt) { raf = requestAnimationFrame(tick); return; }
      const elapsed = now - startAt;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(eased * target);
      setVal(current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else { setDone(true); playSound('coindone'); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, delay]);

  return { val, done };
}

// Falling coin particle
function FallingCoin({ delay, startX }: { delay: number; startX: number }) {
  return (
    <motion.div
      initial={{ x: startX, y: -30, opacity: 1, scale: 1, rotate: 0 }}
      animate={{ y: 80, opacity: 0, scale: 0.4, rotate: 360 }}
      transition={{ delay, duration: 0.9 + Math.random() * 0.4, ease: 'easeIn' }}
      className="absolute top-0 left-1/2 text-2xl select-none pointer-events-none"
      style={{ textShadow: '0 0 10px #ffd700' }}
    >
      ₿
    </motion.div>
  );
}

export function CoinReward({ coins }: Props) {
  const { val, done } = useCounter(coins);

  const coinParticles = Array.from({ length: Math.min(coins + 3, 16) }, (_, i) => ({
    id: i,
    delay: i * 0.08,
    startX: (Math.random() - 0.5) * 140,
  }));

  return (
    <div className="flex flex-col items-center">
      {/* Falling coin rain */}
      <div className="relative w-full h-20 mb-2">
        {coinParticles.map(p => (
          <FallingCoin key={p.id} delay={p.delay} startX={p.startX} />
        ))}
      </div>

      {/* Counter */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        className="relative flex items-center justify-center gap-1"
      >
        {/* Shine sweep */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={{ x: -80, opacity: 0.7 }}
              animate={{ x: 80, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 w-12 h-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.6), transparent)', borderRadius: 12 }}
            />
          )}
        </AnimatePresence>

        <motion.span
          animate={done ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.4 }}
          className="text-3xl font-black text-amber-400"
        >+</motion.span>

        <motion.span
          animate={done ? { scale: [1, 1.25, 1] } : {}}
          transition={{ duration: 0.4 }}
          className="text-5xl font-black tabular-nums"
          style={{
            color: '#fbbf24',
            textShadow: done ? '0 0 20px #fbbf24, 0 0 40px #fbbf24' : 'none',
            transition: 'text-shadow 0.3s',
          }}
        >
          {val}
        </motion.span>

        <span className="text-3xl font-black text-amber-400">₿</span>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-white/50 text-sm font-medium mt-1"
      >
        PlayBits earned!
      </motion.p>
    </div>
  );
}
