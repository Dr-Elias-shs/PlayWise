"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAvatarStore } from '@/store/useAvatarStore';
import { useWorldStore }  from '@/store/useWorldStore';
import { COLORS, ACCESSORIES } from '@/lib/avatar-items';

type Tab = 'colors' | 'accessories';

export function Shop({ onClose }: { onClose: () => void }) {
  const [tab,          setTab]          = useState<Tab>('colors');
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [previewAcc,   setPreviewAcc]   = useState<string | null>(null);
  const [justBought,   setJustBought]   = useState<string | null>(null);

  const { colorId, ownedAccessories, equippedId, setColor, ownAccessory, equipAccessory } = useAvatarStore();
  const { playBits, addPlayBits } = useWorldStore();

  // What to show in the preview
  const activeColor = COLORS.find(c => c.id === (previewColor ?? colorId));
  const activeAcc   = ACCESSORIES.find(a => a.id === (previewAcc ?? equippedId));

  function buyAccessory(acc: typeof ACCESSORIES[0]) {
    if (playBits < acc.price || ownedAccessories.includes(acc.id)) return;
    addPlayBits(-acc.price);
    ownAccessory(acc.id);
    equipAccessory(acc.id);
    setJustBought(acc.id);
    setTimeout(() => setJustBought(null), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{   scale: 0.88, opacity: 0, y: 20  }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-white"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black text-xl">🛒 Character Shop</h2>
            <button onClick={onClose}
              className="text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white/15 rounded-2xl py-2">
            <span className="text-2xl">🪙</span>
            <span className="text-yellow-300 font-black text-2xl">{playBits}</span>
            <span className="text-white/70 text-sm font-semibold">PlayBits</span>
          </div>
        </div>

        {/* ── Character preview — fixed height so accessory emoji never shifts layout ── */}
        <div className="flex justify-center bg-gradient-to-b from-purple-50 to-white"
          style={{ height: 140 }}>
          <div className="relative flex flex-col items-center justify-end pb-4" style={{ height: 140 }}>
            <span className="text-4xl leading-none mb-1" style={{ opacity: activeAcc ? 1 : 0, transition: 'opacity 0.15s' }}>
              {activeAcc?.emoji ?? '　'}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/character/walk2.png"
              alt="Character preview"
              draggable={false}
              style={{
                height: 90,
                filter: activeColor?.filter ?? '',
                transition: 'filter 0.25s ease',
              }}
            />
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-slate-100">
          {([['colors', '🎨 Colors (Free)'], ['accessories', '✨ Accessories']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 font-black text-sm transition-colors
                ${tab === t
                  ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/40'
                  : 'text-slate-400 hover:text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 280 }}>

          {/* Colors */}
          {tab === 'colors' && (
            <div className="grid grid-cols-5 gap-3">
              {COLORS.map(color => {
                const active = colorId === color.id;
                return (
                  <button key={color.id}
                    onClick={() => { setColor(color.id); setPreviewColor(null); }}
                    onMouseEnter={() => setPreviewColor(color.id)}
                    onMouseLeave={() => setPreviewColor(null)}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`w-11 h-11 rounded-full border-4 transition-all duration-150
                        ${active
                          ? 'border-violet-500 scale-110 shadow-lg shadow-violet-300/50'
                          : 'border-slate-200 hover:border-violet-300 hover:scale-105'}`}
                      style={{ background: color.swatch }}
                    >
                      {active && (
                        <div className="w-full h-full rounded-full flex items-center justify-center
                          text-white font-black text-base">✓</div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Accessories */}
          {tab === 'accessories' && (
            <div className="grid grid-cols-2 gap-2.5">
              {ACCESSORIES.map(acc => {
                const owned    = ownedAccessories.includes(acc.id);
                const equipped = equippedId === acc.id;
                const canBuy   = !owned && playBits >= acc.price;
                const bought   = justBought === acc.id;

                return (
                  <div key={acc.id}
                    onMouseEnter={() => setPreviewAcc(acc.id)}
                    onMouseLeave={() => setPreviewAcc(null)}
                    className={`flex items-center gap-3 rounded-2xl p-3 transition-colors
                      ${equipped ? 'bg-violet-50 ring-2 ring-violet-400' : 'bg-slate-50'}`}
                  >
                    <span className="text-3xl leading-none">{acc.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-slate-800 truncate">{acc.name}</div>
                      {owned ? (
                        <button
                          onClick={() => equipAccessory(equipped ? null : acc.id)}
                          className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-colors
                            ${equipped
                              ? 'bg-violet-500 text-white hover:bg-violet-600'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        >
                          {equipped ? '✓ On' : 'Equip'}
                        </button>
                      ) : (
                        <button
                          onClick={() => buyAccessory(acc)}
                          disabled={!canBuy}
                          className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-all
                            ${bought   ? 'bg-emerald-500 text-white' :
                              canBuy  ? 'bg-yellow-400 text-slate-800 hover:bg-yellow-300 hover:scale-105' :
                                        'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                          {bought ? '✓ Got it!' : `🪙 ${acc.price}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-2">
          <button onClick={onClose}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600
              font-black rounded-2xl transition-colors text-sm">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
