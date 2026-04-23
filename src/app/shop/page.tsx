"use client";

import { useState }        from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter }       from 'next/navigation';
import { useAvatarStore }  from '@/store/useAvatarStore';
import { useWorldStore }   from '@/store/useWorldStore';
import { COLORS, ACCESSORIES } from '@/lib/avatar-items';
import type { AccessoryItem } from '@/lib/avatar-items';

// ── Category definition ───────────────────────────────────────────────────────

type Category = 'colors' | 'hats' | 'extras';

const TABS: { id: Category; label: string; emoji: string }[] = [
  { id: 'colors', label: 'Colors', emoji: '🎨' },
  { id: 'hats',   label: 'Hats',   emoji: '🎩' },
  { id: 'extras', label: 'Extras', emoji: '✨' },
];

// ── Character preview panel ───────────────────────────────────────────────────

function CharacterPreview({
  colorFilter, accEmoji, label, sublabel,
}: {
  colorFilter: string;
  accEmoji?:   string;
  label:       string;
  sublabel?:   string;
}) {
  return (
    <div className="flex flex-col items-center gap-5 h-full justify-center">
      {/* Stage */}
      <div
        className="relative w-full rounded-3xl flex flex-col items-center justify-end overflow-hidden"
        style={{
          height: 340,
          background: 'linear-gradient(160deg, #dbeafe 0%, #e0f2fe 40%, #f0fdf4 100%)',
          boxShadow: 'inset 0 -4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {/* Background stars decoration */}
        {['12%,18%', '80%,12%', '65%,70%', '20%,75%', '50%,25%'].map((pos, i) => (
          <div key={i} className="absolute text-yellow-300/60 text-xl select-none"
            style={{ left: pos.split(',')[0], top: pos.split(',')[1] }}>★</div>
        ))}

        {/* Floor shadow */}
        <div className="absolute bottom-10 w-28 h-6 rounded-full"
          style={{ background: 'rgba(0,0,0,0.10)', filter: 'blur(8px)' }} />

        {/* Character */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
          className="relative flex flex-col items-center mb-10"
        >
          {accEmoji && (
            <span className="text-6xl leading-none mb-1 drop-shadow-md">{accEmoji}</span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/character/walk2.png"
            alt="Character"
            draggable={false}
            style={{
              height: 160,
              filter: colorFilter,
              transition: 'filter 0.3s ease',
            }}
            className="drop-shadow-xl"
          />
        </motion.div>
      </div>

      {/* Label under preview */}
      <div className="text-center">
        <p className="font-black text-slate-800 text-xl">{label}</p>
        {sublabel && <p className="text-slate-400 text-sm font-semibold mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const router = useRouter();

  const {
    colorId, equippedId, ownedAccessories,
    setColor, ownAccessory, equipAccessory,
  } = useAvatarStore();
  const { playBits, addPlayBits, playerName } = useWorldStore();

  const [tab,           setTab]           = useState<Category>('colors');
  const [previewColor,  setPreviewColor]  = useState<string | null>(null);
  const [previewAcc,    setPreviewAcc]    = useState<string | null>(null);
  const [justBought,    setJustBought]    = useState<string | null>(null);
  const [buyError,      setBuyError]      = useState<string | null>(null);

  // What shows in the preview
  const displayColorId = previewColor ?? colorId;
  const displayAccId   = tab === 'colors' ? equippedId : (previewAcc ?? equippedId);
  const displayColor   = COLORS.find(c => c.id === displayColorId);
  const displayAcc     = ACCESSORIES.find(a => a.id === displayAccId);

  function buy(acc: AccessoryItem) {
    if (ownedAccessories.includes(acc.id)) return;
    if (playBits < acc.price) {
      setBuyError(`Need ${acc.price - playBits} more PlayBits!`);
      setTimeout(() => setBuyError(null), 2000);
      return;
    }
    addPlayBits(-acc.price);
    ownAccessory(acc.id);
    equipAccessory(acc.id);
    setJustBought(acc.id);
    setTimeout(() => setJustBought(null), 1800);
  }

  const hats   = ACCESSORIES.filter(a => a.category === 'hat');
  const extras = ACCESSORIES.filter(a => a.category === 'extra');

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)' }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => router.push('/world')}
          className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white
            font-bold px-4 py-2.5 rounded-2xl text-sm transition-colors backdrop-blur-sm"
        >
          ← Back to World
        </button>

        <h1 className="text-white font-black text-2xl">🛒 Shop</h1>

        {/* PlayBits balance */}
        <div className="flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40
          px-4 py-2.5 rounded-2xl backdrop-blur-sm">
          <span className="text-2xl">🪙</span>
          <span className="text-yellow-300 font-black text-xl">{playBits}</span>
          <span className="text-yellow-200/70 text-xs font-semibold">PlayBits</span>
        </div>
      </div>

      {/* ── Category tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-3 px-6 pb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setPreviewAcc(null); setPreviewColor(null); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm
              transition-all duration-200
              ${tab === t.id
                ? 'bg-white text-violet-700 shadow-lg shadow-white/20 scale-105'
                : 'bg-white/15 text-white/80 hover:bg-white/25'}`}
          >
            <span className="text-lg">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 gap-6 px-6 pb-6 overflow-hidden">

        {/* ── Left: item grid ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: -16 }}
              transition={{ duration: 0.2 }}
            >

              {/* ── Colors ─────────────────────────────────────────────────── */}
              {tab === 'colors' && (
                <div>
                  <p className="text-white/60 text-sm font-semibold mb-4">
                    All colors are free! Pick your favourite.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {COLORS.map(color => {
                      const active = colorId === color.id;
                      return (
                        <motion.button
                          key={color.id}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setColor(color.id); setPreviewColor(null); }}
                          onMouseEnter={() => setPreviewColor(color.id)}
                          onMouseLeave={() => setPreviewColor(null)}
                          className={`relative flex flex-col items-center gap-3 p-4 rounded-3xl
                            border-2 transition-all duration-150 cursor-pointer
                            ${active
                              ? 'border-white bg-white/20 shadow-xl'
                              : 'border-white/10 bg-white/8 hover:border-white/40 hover:bg-white/15'}`}
                        >
                          {/* Mini character preview */}
                          <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/character/walk2.png" alt={color.name}
                              draggable={false}
                              style={{ height: 72, filter: color.filter,
                                transition: 'filter 0.2s' }}
                            />
                            {active && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400
                                rounded-full flex items-center justify-center text-white text-xs font-black">
                                ✓
                              </div>
                            )}
                          </div>

                          {/* Swatch + name */}
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-white/50 flex-shrink-0"
                              style={{ background: color.swatch }} />
                            <span className="text-white font-black text-sm">{color.name}</span>
                          </div>

                          {/* Free badge */}
                          <span className="text-emerald-300 text-xs font-bold">FREE</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Hats ───────────────────────────────────────────────────── */}
              {tab === 'hats' && (
                <AccessoryGrid
                  items={hats}
                  owned={ownedAccessories}
                  equipped={equippedId}
                  playBits={playBits}
                  justBought={justBought}
                  onHover={setPreviewAcc}
                  onBuy={buy}
                  onEquip={id => equipAccessory(equippedId === id ? null : id)}
                />
              )}

              {/* ── Extras ─────────────────────────────────────────────────── */}
              {tab === 'extras' && (
                <AccessoryGrid
                  items={extras}
                  owned={ownedAccessories}
                  equipped={equippedId}
                  playBits={playBits}
                  justBought={justBought}
                  onHover={setPreviewAcc}
                  onBuy={buy}
                  onEquip={id => equipAccessory(equippedId === id ? null : id)}
                />
              )}

            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Right: character preview ────────────────────────────────────────── */}
        <div className="hidden md:flex flex-col w-72 lg:w-80 flex-shrink-0">
          <CharacterPreview
            colorFilter={displayColor?.filter ?? ''}
            accEmoji={displayAcc?.emoji}
            label={
              tab === 'colors'
                ? (displayColor?.name ?? '')
                : (displayAcc?.name ?? playerName)
            }
            sublabel={
              tab !== 'colors' && displayAcc && !ownedAccessories.includes(displayAcc.id)
                ? `🪙 ${displayAcc.price} PlayBits`
                : tab !== 'colors' && displayAcc
                ? '✓ Owned'
                : undefined
            }
          />

          {/* Buy error toast */}
          <AnimatePresence>
            {buyError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 bg-red-500/90 text-white text-sm font-bold
                  px-4 py-3 rounded-2xl text-center"
              >
                {buyError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Accessory grid ────────────────────────────────────────────────────────────

function AccessoryGrid({
  items, owned, equipped, playBits, justBought,
  onHover, onBuy, onEquip,
}: {
  items:      AccessoryItem[];
  owned:      string[];
  equipped:   string | null;
  playBits:   number;
  justBought: string | null;
  onHover:    (id: string | null) => void;
  onBuy:      (item: AccessoryItem) => void;
  onEquip:    (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(item => {
        const isOwned    = owned.includes(item.id);
        const isEquipped = equipped === item.id;
        const canBuy     = !isOwned && playBits >= item.price;
        const bought     = justBought === item.id;

        return (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.03 }}
            onMouseEnter={() => onHover(item.id)}
            onMouseLeave={() => onHover(null)}
            className={`relative flex flex-col items-center gap-3 p-5 rounded-3xl
              border-2 cursor-pointer transition-all duration-150
              ${isEquipped
                ? 'border-violet-400 bg-violet-400/20 shadow-xl shadow-violet-500/20'
                : 'border-white/10 bg-white/10 hover:border-white/40 hover:bg-white/15'}`}
          >
            {/* Equipped badge */}
            {isEquipped && (
              <div className="absolute top-3 right-3 bg-violet-500 text-white
                text-[10px] font-black px-2 py-0.5 rounded-full">
                ON
              </div>
            )}

            {/* Big emoji */}
            <span className="text-6xl leading-none drop-shadow-md">{item.emoji}</span>

            {/* Name */}
            <span className="text-white font-black text-base text-center">{item.name}</span>

            {/* Price / action */}
            {isOwned ? (
              <button
                onClick={() => onEquip(item.id)}
                className={`w-full py-2.5 rounded-2xl font-black text-sm transition-all
                  ${isEquipped
                    ? 'bg-violet-500 text-white hover:bg-violet-400'
                    : 'bg-white/20 text-white hover:bg-white/30'}`}
              >
                {isEquipped ? '✓ Equipped' : 'Equip'}
              </button>
            ) : (
              <button
                onClick={() => onBuy(item)}
                disabled={!canBuy}
                className={`w-full py-2.5 rounded-2xl font-black text-sm transition-all
                  ${bought      ? 'bg-emerald-500 text-white scale-105' :
                    canBuy     ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300 hover:scale-105' :
                                  'bg-white/10 text-white/40 cursor-not-allowed'}`}
              >
                {bought ? '🎉 Got it!' : `🪙 ${item.price}`}
              </button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
