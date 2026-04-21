"use client";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWallet } from '@/lib/wallet';

interface Props {
  studentName: string;
  onClick?: () => void;
  refreshKey?: number;
}

export function WalletBadge({ studentName, onClick, refreshKey }: Props) {
  const [coins, setCoins] = useState<number | null>(null);
  const [prev, setPrev] = useState<number | null>(null);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    if (!studentName) return;
    getWallet(studentName).then(w => {
      const c = w?.coins ?? 0;
      if (prev !== null && c > prev) setPop(true);
      setPrev(c);
      setCoins(c);
      setTimeout(() => setPop(false), 600);
    });
  }, [studentName, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (coins === null) return null;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={pop ? { scale: [1, 1.3, 1] } : {}}
      className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2.5 rounded-2xl shadow-md cursor-pointer"
    >
      <motion.span
        animate={pop ? { rotate: [0, 20, -20, 0] } : {}}
        className="text-xl"
      >₿</motion.span>
      <div className="text-left">
        <div className="text-white font-black text-lg leading-none">{coins.toLocaleString()}</div>
        <div className="text-yellow-100 text-xs font-medium">PlayBits</div>
      </div>

      <AnimatePresence>
        {pop && (
          <motion.span
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: -24, opacity: 0 }}
            exit={{ opacity: 0 }}
            className="absolute text-yellow-300 font-black text-sm pointer-events-none"
          >+</motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
