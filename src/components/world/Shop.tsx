"use client";
import { useGameStore } from '@/store/useGameStore';

import { useState } from 'react';
import { motion } from 'framer-motion';

import { useWorldStore }  from '@/store/useWorldStore';
import { COLORS, ACCESSORIES, AccessoryItem, itemTopFraction } from '@/lib/avatar-items';
import { useCharacterRegistry, resolveOutfitStand, type RegistryOutfit } from '@/lib/characterRegistry';

type Tab = 'colors' | 'accessories' | 'clothing';

const CHAR_H = 100; // preview character height

/** Renders a character sprite with an optional outfit/accessory overlaid. */
function CharPreview({ colorFilter, baseSrc, item, outfitSprite }: {
  colorFilter:   string;
  baseSrc:       string;
  item?:         AccessoryItem | null;      // hat/extra emoji overlay
  outfitSprite?: string | null;             // full outfit sprite from registry
}) {
  const spriteSrc = outfitSprite ?? baseSrc;
  const topPx = item ? itemTopFraction(item) * CHAR_H : 0;
  const fs    = Math.round(CHAR_H * 0.30);

  return (
    <div className="relative" style={{ width: CHAR_H, height: CHAR_H }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteSrc} alt="Character preview" draggable={false}
        style={{ width: CHAR_H, height: CHAR_H, objectFit: 'contain',
                 filter: colorFilter, transition: 'filter 0.25s ease' }}
      />
      {item && !outfitSprite && (
        <span className="absolute pointer-events-none select-none"
          style={{ top: topPx, left: `calc(50% + ${item.xOffset ?? 0}px)`,
                   transform: 'translateX(-50%)', fontSize: fs, lineHeight: 1 }}>
          {item.emoji}
        </span>
      )}
    </div>
  );
}

export function Shop({ onClose }: { onClose: () => void }) {
  const [tab,          setTab]          = useState<Tab>('colors');
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [previewAcc,   setPreviewAcc]   = useState<string | null>(null);
  const [justBought,   setJustBought]   = useState<string | null>(null);

  const isLocal = typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const {
    colorId, ownedAccessories, ownedClothing,
    equippedId, equippedClothingId,
    characterId,
    setColor, ownAccessory, equipAccessory,
    ownClothing, equipClothing,
  } = useGameStore();
  const registry    = useCharacterRegistry();
  const charDef     = registry.character(characterId) ?? registry.characters[0];
  const isFemale    = !!charDef?.hasBuiltInLogo;
  const { playBits, addPlayBits } = useWorldStore();

  const activeColor   = COLORS.find(c => c.id === (previewColor ?? colorId));
  const hatsAndExtras = ACCESSORIES.filter(a => a.category !== 'clothing');
  // Clothing tab now comes from the registry
  const registryOutfits = registry.outfits;

  // For the preview: show hovered item OR currently equipped for the active tab
  const previewAccItem: AccessoryItem | undefined =
    ACCESSORIES.find(a => a.id === previewAcc) ??
    (tab !== 'clothing' ? ACCESSORIES.find(a => a.id === equippedId) : undefined);
  const previewOutfit: RegistryOutfit | undefined =
    registry.outfit(previewAcc ?? '') ??
    (tab === 'clothing' ? registry.outfit(equippedClothingId ?? '') : undefined);
  // For CharPreview: resolve sprite
  const previewSprite = previewOutfit ? resolveOutfitStand(previewOutfit, characterId) : null;

  function buy(acc: AccessoryItem) {
    const owned = acc.category === 'clothing' ? ownedClothing : ownedAccessories;
    if (owned.includes(acc.id)) return;
    if (!isLocal && playBits < acc.price) return;
    addPlayBits(-acc.price);
    if (acc.category === 'clothing') {
      ownClothing(acc.id);
      equipClothing(acc.id);
    } else {
      ownAccessory(acc.id);
      equipAccessory(acc.id);
    }
    setJustBought(acc.id);
    setTimeout(() => setJustBought(null), 1500);
  }

  function toggleEquip(acc: AccessoryItem) {
    if (acc.category === 'clothing') {
      equipClothing(equippedClothingId === acc.id ? null : acc.id);
    } else {
      equipAccessory(equippedId === acc.id ? null : acc.id);
    }
  }

  function ItemCard({ acc }: { acc: AccessoryItem }) {
    const owned    = (acc.category === 'clothing' ? ownedClothing : ownedAccessories).includes(acc.id);
    const equipped = acc.category === 'clothing' ? equippedClothingId === acc.id : equippedId === acc.id;
    const canBuy   = !owned && (isLocal || playBits >= acc.price);
    const bought   = justBought === acc.id;

    return (
      <div
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
              onClick={() => toggleEquip(acc)}
              className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-colors
                ${equipped
                  ? 'bg-violet-500 text-white hover:bg-violet-600'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
            >
              {equipped ? '✓ Wearing' : 'Wear'}
            </button>
          ) : (
            <button
              onClick={() => buy(acc)}
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
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black text-xl">🛒 Character Shop</h2>
            <button onClick={onClose}
              className="text-white/70 hover:text-white text-2xl leading-none font-bold">×</button>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white/15 rounded-2xl py-2">
            <span className="text-2xl">🪙</span>
            <span className="text-yellow-300 font-black text-2xl">{isLocal ? '∞' : playBits}</span>
            <span className="text-white/70 text-sm font-semibold">PlayBits{isLocal ? ' · Dev' : ''}</span>
          </div>
        </div>

        {/* Character preview — accessory overlaid at correct position */}
        <div className="flex justify-center items-end bg-gradient-to-b from-purple-50 to-white py-4">
          <CharPreview
            colorFilter={activeColor?.filter ?? ''}
            baseSrc={charDef?.standFrame ?? '/character/walk2.png'}
            item={previewAccItem}
            outfitSprite={previewSprite}
          />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {([
            ['colors',      '🎨 Colors'],
            ['accessories', '✨ Accessories'],
            ['clothing',    '👕 Clothing'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setPreviewAcc(null); }}
              className={`flex-1 py-2.5 font-black text-xs transition-colors
                ${tab === t
                  ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/40'
                  : 'text-slate-400 hover:text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 260 }}>

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
                        <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-base">✓</div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">{color.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Accessories (hats + extras) */}
          {tab === 'accessories' && (
            <div className="grid grid-cols-2 gap-2.5">
              {hatsAndExtras.map(acc => <ItemCard key={acc.id} acc={acc} />)}
            </div>
          )}

          {/* Clothing — from registry */}
          {tab === 'clothing' && (
            <div className="grid grid-cols-2 gap-2.5">
              {registryOutfits.length === 0 && (
                <p className="col-span-2 text-center text-slate-400 text-sm py-4">
                  No outfits yet — add them in the Character Import Tool.
                </p>
              )}
              {registryOutfits.map(outfit => {
                const owned    = ownedClothing.includes(outfit.id);
                const equipped = equippedClothingId === outfit.id;
                const canBuy   = !owned && (isLocal || playBits >= outfit.price);
                const bought   = justBought === outfit.id;
                return (
                  <div key={outfit.id}
                    onMouseEnter={() => setPreviewAcc(outfit.id)}
                    onMouseLeave={() => setPreviewAcc(null)}
                    className={`flex items-center gap-3 rounded-2xl p-3 transition-colors
                      ${equipped ? 'bg-violet-50 ring-2 ring-violet-400' : 'bg-slate-50'}`}>
                    {(() => { const s = resolveOutfitStand(outfit, characterId); return s
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={s} alt={outfit.name} draggable={false}
                          className="w-10 h-10 object-contain rounded-lg bg-white" />
                      : <span className="text-3xl leading-none">{outfit.emoji}</span>;
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-sm text-slate-800 truncate">{outfit.name}</div>
                      {owned ? (
                        <button onClick={() => equipClothing(equipped ? null : outfit.id)}
                          className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-colors
                            ${equipped ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {equipped ? '✓ Wearing' : 'Wear'}
                        </button>
                      ) : (
                        <button onClick={() => {
                          if (!canBuy) return;
                          if (!isLocal) addPlayBits(-outfit.price);
                          ownClothing(outfit.id); equipClothing(outfit.id);
                          setJustBought(outfit.id);
                          setTimeout(() => setJustBought(null), 1500);
                        }} disabled={!canBuy}
                          className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-all
                            ${bought ? 'bg-emerald-500 text-white' :
                              canBuy ? 'bg-yellow-400 text-slate-800 hover:bg-yellow-300' :
                                       'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                          {bought ? '✓ Got it!' : `🪙 ${outfit.price}`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
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
