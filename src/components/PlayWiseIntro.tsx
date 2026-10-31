"use client";

/**
 * PlayWiseIntro (Nov 2026 adventure-world look)
 *
 * The Higgsfield opening clip: the five friends turn and wave on the hilltop, then
 * the camera flies into PlayWise Valley and the title arrives. Shown once per
 * browser; the key changed with the redesign so every student sees it once more.
 * Call resetPlayWiseIntro() from the browser console to see it again.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INTRO } from "@/lib/world";

if (typeof window !== "undefined") {
  (window as any).resetPlayWiseIntro = () => {
    localStorage.removeItem(INTRO_SEEN_KEY);
    window.location.reload();
  };
}

export const INTRO_SEEN_KEY = "playwise_intro_seen_valley";

export function PlayWiseIntro({ onDone }: { onDone: () => void }) {
  const [exiting, setExiting] = useState(false);
  const [titleIn, setTitleIn] = useState(false);
  const [videoOk, setVideoOk] = useState(true);
  const doneRef = useRef(false);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    try { localStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* storage blocked on some MDM profiles */ }
    setExiting(true);
    setTimeout(onDone, 600);
  }

  // Title arrives as the camera reaches the valley; hard stop after 11 s whatever happens.
  useEffect(() => {
    const t1 = setTimeout(() => setTitleIn(true), videoOk ? 5200 : 600);
    const t2 = setTimeout(finish, 11_000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [videoOk]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div key="intro" className="fixed inset-0 z-[9999] overflow-hidden select-none bg-sky-200"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55 }} onClick={() => titleIn && finish()}>

          {videoOk ? (
            <video src={INTRO.video} poster={INTRO.still} autoPlay muted playsInline
              onEnded={() => setTitleIn(true)} onError={() => setVideoOk(false)}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <motion.img src={INTRO.still} alt="" className="absolute inset-0 w-full h-full object-cover"
              initial={{ scale: 1.08 }} animate={{ scale: 1 }} transition={{ duration: 6, ease: 'easeOut' }} />
          )}

          {/* soft glow behind the title */}
          <motion.div className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: titleIn ? 1 : 0 }} transition={{ duration: 0.8 }}
            style={{ background: 'radial-gradient(ellipse at 50% 42%, rgba(255,251,235,0.55), rgba(255,251,235,0) 60%)' }} />

          <AnimatePresence>
            {titleIn && (
              <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <motion.img src="/playwise-logo.png" alt="" className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-xl"
                  initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 14 }} />
                <motion.h1 className="font-display font-extrabold text-6xl sm:text-8xl mt-2 leading-none"
                  initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 16 }}
                  style={{ color: '#fff', WebkitTextStroke: '3px #14532d', textShadow: '0 6px 0 #14532d, 0 14px 30px rgba(0,0,0,0.35)' }}>
                  PlayWise
                </motion.h1>
                <motion.p className="mt-4 font-display text-xl sm:text-2xl font-bold text-emerald-950 bg-white/80 px-5 py-1.5 rounded-full"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  Welcome to PlayWise Valley
                </motion.p>
                <motion.button onClick={(e) => { e.stopPropagation(); finish(); }}
                  className="mt-8 bg-amber-400 text-amber-950 font-display font-extrabold text-xl px-10 py-3.5 rounded-2xl"
                  style={{ boxShadow: '0 5px 0 #b45309' }}
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 }}
                  whileTap={{ scale: 0.95, y: 3 }}>
                  Let&apos;s go!
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={(e) => { e.stopPropagation(); finish(); }}
            className="absolute top-4 right-4 bg-black/30 hover:bg-black/45 text-white text-sm font-bold px-4 py-2 rounded-full backdrop-blur-sm"
            style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
