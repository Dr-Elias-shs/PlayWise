"use client";
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWallet } from '@/lib/wallet';
import { supabase } from '@/lib/supabase';

interface Props {
  studentName: string;
  playerEmail?: string;
  onClick?: () => void;
  refreshKey?: number;
}

export function WalletBadge({ studentName, playerEmail, onClick, refreshKey }: Props) {
  const [coins, setCoins] = useState<number | null>(null);
  const [pop, setPop] = useState(false);
  const prevRef = useRef<number | null>(null);

  const dbKey = playerEmail?.trim().toLowerCase() || studentName || '';

  const fetch = () => {
    if (!dbKey) return;
    getWallet(dbKey).then(w => {
      const c = w?.coins ?? 0;
      if (prevRef.current !== null && c > prevRef.current) {
        setPop(true);
        setTimeout(() => setPop(false), 700);
      }
      prevRef.current = c;
      setCoins(c);
    }).catch(() => setCoins(0));
  };

  // Initial fetch + re-fetch after refreshKey changes (with delay to let write land)
  useEffect(() => {
    if (!dbKey) return;
    const t = setTimeout(fetch, refreshKey ? 1200 : 0);
    return () => clearTimeout(t);
  }, [dbKey, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Supabase Realtime — auto-update whenever player_wallets row changes
  useEffect(() => {
    if (!dbKey) return;
    const channel = supabase
      .channel(`wallet-${dbKey}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_wallets',
        filter: `student_name=eq.${dbKey}`,
      }, (payload: any) => {
        const c = payload.new?.coins ?? 0;
        if (prevRef.current !== null && c > prevRef.current) {
          setPop(true);
          setTimeout(() => setPop(false), 700);
        }
        prevRef.current = c;
        setCoins(c);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dbKey]);

  if (coins === null) return null;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={pop ? { scale: [1, 1.3, 1] } : {}}
      className="relative flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2.5 rounded-2xl shadow-md cursor-pointer"
    >
      <motion.span animate={pop ? { rotate: [0, 20, -20, 0] } : {}} className="text-xl">₿</motion.span>
      <div className="text-left">
        <motion.div
          key={coins}
          initial={{ y: pop ? -8 : 0, opacity: pop ? 0 : 1 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-white font-black text-lg leading-none"
        >
          {coins.toLocaleString()}
        </motion.div>
        <div className="text-yellow-100 text-xs font-medium">PlayBits</div>
      </div>

      <AnimatePresence>
        {pop && (
          <motion.span
            initial={{ y: 0, opacity: 1, scale: 1 }}
            animate={{ y: -28, opacity: 0, scale: 1.4 }}
            exit={{ opacity: 0 }}
            className="absolute -top-1 right-2 text-white font-black text-sm pointer-events-none"
          >+</motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
