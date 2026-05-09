"use client";
import { useGameStore } from '@/store/useGameStore';

import { useState } from 'react';
import { motion } from 'framer-motion';

import { useWorldStore }  from '@/store/useWorldStore';
import { COLORS, ACCESSORIES, AccessoryItem, itemTopFraction, resolveAccessory } from '@/lib/avatar-items';
import { useCharacterRegistry, resolveOutfitStand, type RegistryOutfit } from '@/lib/characterRegistry';
import { useAccessoryPositions } from '@/hooks/useAccessoryPositions';

type Tab = 'colors' | 'accessories' | 'clothing' | 'characters';

const CHAR_H = 100;

function CharPreview({ colorFilter, baseSrc, item, outfitSprite }: {
  colorFilter:   string;
  baseSrc:       string;
  item?:         AccessoryItem | null;
  outfitSprite?: string | null;
}) {
  const spriteSrc = outfitSprite ?? baseSrc;
  const topPx = item ? itemTopFraction(item) * CHAR_H : 0;
  const fs    = Math.round(CHAR_H * 0.30);
  return (
    <div className="relative" style={{ width: CHAR_H, height: CHAR_H }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteSrc} alt="Character preview" draggable={false}
        style={{ width: CHAR_H, height: CHAR_H, objectFit: 'contain',
                 filter: colorFilter, transition: 'filter 0.25s ease' }} />
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

export function Shop({ onClose, pageMode }: { onClose: () => void; pageMode?: boolean }) {
  const [tab,          setTab]          = useState<Tab>('colors');
  const [mainTab,      setMainTab]      = useState<'shop' | 'redeemed'>('shop');
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const [previewAcc,   setPreviewAcc]   = useState<string | null>(null);
  const [justBought,   setJustBought]   = useState<string | null>(null);

  const isLocal = typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname);

  const {
    colorId, ownedAccessories, ownedClothing, ownedCharacters,
    equippedId, equippedClothingId,
    characterId, baseCharacterId,
    setColor, ownAccessory, equipAccessory,
    ownClothing, equipClothing,
    ownCharacter, equipCharacter,
  } = useGameStore();
  useAccessoryPositions();
  const registry    = useCharacterRegistry();
  const charDef     = registry.character(characterId) ?? registry.characters[0];
  const { playBits, addPlayBits } = useWorldStore();

  const activeColor      = COLORS.find(c => c.id === (previewColor ?? colorId));
  const hatsAndExtras    = ACCESSORIES.filter(a => a.category !== 'clothing');
  const clothingOutfits  = registry.outfits.filter(o => o.category !== 'characters');
  const characterOutfits = registry.outfits.filter(o => o.category === 'characters');

  const previewAccItem: AccessoryItem | undefined =
    resolveAccessory(previewAcc) ??
    (tab !== 'clothing' && tab !== 'characters' ? resolveAccessory(equippedId) ?? undefined : undefined);
  const previewOutfit: RegistryOutfit | undefined =
    registry.outfit(previewAcc ?? '') ??
    (tab === 'clothing' ? registry.outfit(equippedClothingId ?? '') : undefined);
  const previewSprite = previewOutfit ? resolveOutfitStand(previewOutfit, characterId) : null;

  const hoveredCharOutfit  = tab === 'characters' ? registry.outfit(previewAcc ?? '') : undefined;
  const hoveredCharDef     = hoveredCharOutfit?.characterId ? registry.character(hoveredCharOutfit.characterId) : undefined;
  const previewCharBaseSrc = hoveredCharDef?.standFrame ?? charDef?.standFrame ?? '/character/walk2.png';
  const activelyTransformed = characterId !== baseCharacterId;

  function buy(acc: AccessoryItem) {
    const owned = acc.category === 'clothing' ? ownedClothing : ownedAccessories;
    if (owned.includes(acc.id)) return;
    if (!isLocal && playBits < acc.price) return;
    addPlayBits(-acc.price);
    if (acc.category === 'clothing') { ownClothing(acc.id); equipClothing(acc.id); }
    else { ownAccessory(acc.id); equipAccessory(acc.id); }
    setJustBought(acc.id);
    setTimeout(() => setJustBought(null), 1500);
  }

  function toggleEquip(acc: AccessoryItem) {
    if (acc.category === 'clothing') equipClothing(equippedClothingId === acc.id ? null : acc.id);
    else equipAccessory(equippedId === acc.id ? null : acc.id);
  }

  function ItemCard({ acc }: { acc: AccessoryItem }) {
    const owned    = (acc.category === 'clothing' ? ownedClothing : ownedAccessories).includes(acc.id);
    const equipped = acc.category === 'clothing' ? equippedClothingId === acc.id : equippedId === acc.id;
    const canBuy   = !owned && (isLocal || playBits >= acc.price);
    const bought   = justBought === acc.id;
    return (
      <div onMouseEnter={() => setPreviewAcc(acc.id)} onMouseLeave={() => setPreviewAcc(null)}
        className={`flex items-center gap-3 rounded-2xl p-3 transition-colors
          ${equipped ? 'bg-violet-50 ring-2 ring-violet-400' : 'bg-slate-50'}`}>
        <span className="text-3xl leading-none">{acc.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-black text-sm text-slate-800 truncate">{acc.name}</div>
          {owned ? (
            <button onClick={() => toggleEquip(acc)}
              className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-colors
                ${equipped ? 'bg-violet-500 text-white hover:bg-violet-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
              {equipped ? '✓ Wearing' : 'Wear'}
            </button>
          ) : (
            <button onClick={() => buy(acc)} disabled={!canBuy}
              className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-all
                ${bought ? 'bg-emerald-500 text-white' :
                  canBuy ? 'bg-yellow-400 text-slate-800 hover:bg-yellow-300 hover:scale-105' :
                           'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              {bought ? '✓ Got it!' : `🪙 ${acc.price}`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── PAGE MODE ─────────────────────────────────────────────────────────────────
  if (pageMode) {
    const ownedAccItems   = ACCESSORIES.filter(a => ownedAccessories.includes(a.id));
    const ownedClothItems = clothingOutfits.filter(o => ownedClothing.includes(o.id));
    const ownedCharItems  = characterOutfits.filter(o => ownedCharacters.includes(o.id));
    const hasOwned = ownedAccItems.length + ownedClothItems.length + ownedCharItems.length > 0;

    return (
      <div className="min-h-screen flex flex-col bg-brand-background">

        {/* ── Top header ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 shadow-xl">
          <div className="max-w-4xl mx-auto px-6 pt-6 pb-0">
            <div className="flex items-center justify-between mb-5">
              <button onClick={onClose}
                className="flex items-center gap-2 text-white/80 hover:text-white font-black text-sm transition-colors bg-white/10 hover:bg-white/20 px-4 py-2 rounded-2xl">
                ← Back
              </button>
              <h1 className="text-white font-black text-2xl tracking-tight">🛒 Shop</h1>
              <div className="flex items-center gap-2 bg-black/25 rounded-2xl px-4 py-2">
                <span className="text-lg">🪙</span>
                <span className="text-yellow-300 font-black text-xl">
                  {isLocal ? '∞' : playBits.toLocaleString()}
                </span>
                <span className="text-white/60 text-xs font-semibold hidden sm:block">PlayBits</span>
              </div>
            </div>

            {/* Main tabs */}
            <div className="flex gap-1">
              {(['shop', 'redeemed'] as const).map(t => (
                <button key={t} onClick={() => setMainTab(t)}
                  className={`px-8 py-3 font-black text-sm rounded-t-2xl transition-all ${
                    mainTab === t
                      ? 'bg-brand-background text-violet-700'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}>
                  {t === 'shop' ? '🛍️ Shop' : '🎒 Redeemed'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Content ────────────────────────────────────────────────────────── */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">

          {/* ── SHOP TAB ──────────────────────────────────────────────────────── */}
          {mainTab === 'shop' && (
            <div className="flex gap-8">
              {/* Left: preview */}
              <div className="hidden md:flex flex-col items-center gap-4 w-40 shrink-0">
                <div className="bg-gradient-to-b from-purple-100 to-white rounded-3xl p-6 shadow-inner w-full flex justify-center">
                  <CharPreview
                    colorFilter={tab === 'characters' ? '' : (activeColor?.filter ?? '')}
                    baseSrc={tab === 'characters' ? previewCharBaseSrc : (charDef?.standFrame ?? '/character/walk2.png')}
                    item={tab === 'characters' ? undefined : previewAccItem}
                    outfitSprite={tab === 'characters' ? null : previewSprite}
                  />
                </div>
                <div className="text-center text-xs text-slate-400 font-semibold">Preview</div>
              </div>

              {/* Right: sub-tabs + content */}
              <div className="flex-1 min-w-0">
                {/* Sub-tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                  {([
                    ['colors',      '🎨', 'Colors'],
                    ['accessories', '✨', 'Accessories'],
                    ['clothing',    '👕', 'Clothing'],
                    ['characters',  '🔥', 'Characters'],
                  ] as const).map(([t, emoji, label]) => (
                    <button key={t} onClick={() => { setTab(t); setPreviewAcc(null); }}
                      className={`flex items-center gap-1.5 px-5 py-2.5 rounded-2xl font-black text-sm whitespace-nowrap transition-all ${
                        tab === t
                          ? 'bg-violet-600 text-white shadow-md'
                          : 'bg-white text-slate-500 hover:text-violet-600 border border-slate-200 hover:border-violet-300'
                      }`}>
                      {emoji} {label}
                    </button>
                  ))}
                </div>

                {/* Mobile preview */}
                <div className="md:hidden flex justify-center mb-6">
                  <div className="bg-gradient-to-b from-purple-100 to-white rounded-3xl p-4 shadow-inner">
                    <CharPreview
                      colorFilter={tab === 'characters' ? '' : (activeColor?.filter ?? '')}
                      baseSrc={tab === 'characters' ? previewCharBaseSrc : (charDef?.standFrame ?? '/character/walk2.png')}
                      item={tab === 'characters' ? undefined : previewAccItem}
                      outfitSprite={tab === 'characters' ? null : previewSprite}
                    />
                  </div>
                </div>

                {/* Colors */}
                {tab === 'colors' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="grid grid-cols-5 sm:grid-cols-8 gap-4">
                      {COLORS.map(color => {
                        const active = colorId === color.id;
                        return (
                          <button key={color.id}
                            onClick={() => { setColor(color.id); setPreviewColor(null); }}
                            onMouseEnter={() => setPreviewColor(color.id)}
                            onMouseLeave={() => setPreviewColor(null)}
                            className="flex flex-col items-center gap-1.5">
                            <div className={`w-12 h-12 rounded-full border-4 transition-all duration-150
                              ${active
                                ? 'border-violet-500 scale-110 shadow-lg shadow-violet-300/50'
                                : 'border-slate-200 hover:border-violet-300 hover:scale-105'}`}
                              style={{ background: color.swatch }}>
                              {active && <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black">✓</div>}
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">{color.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Accessories */}
                {tab === 'accessories' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {hatsAndExtras.map(acc => <ItemCard key={acc.id} acc={acc} />)}
                  </div>
                )}

                {/* Clothing */}
                {tab === 'clothing' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {clothingOutfits.length === 0 && (
                      <p className="col-span-3 text-center text-slate-400 py-8 font-semibold">No outfits yet.</p>
                    )}
                    {clothingOutfits.map(outfit => {
                      const owned    = ownedClothing.includes(outfit.id);
                      const equipped = equippedClothingId === outfit.id;
                      const canBuy   = !owned && (isLocal || playBits >= outfit.price);
                      const bought   = justBought === outfit.id;
                      const imgSrc   = outfit.thumbnail ?? resolveOutfitStand(outfit, characterId);
                      return (
                        <div key={outfit.id}
                          onMouseEnter={() => setPreviewAcc(outfit.id)}
                          onMouseLeave={() => setPreviewAcc(null)}
                          className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                            equipped ? 'border-violet-400' : 'border-transparent hover:border-slate-200'
                          }`}>
                          <div className="flex justify-center mb-3 h-20">
                            {imgSrc
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={imgSrc} alt={outfit.name} className="h-full w-auto object-contain" />
                              : <span className="text-5xl leading-none">{outfit.emoji}</span>
                            }
                          </div>
                          <div className="font-black text-slate-800 text-center text-sm mb-3">{outfit.name}</div>
                          {owned ? (
                            <button onClick={() => equipClothing(equipped ? null : outfit.id)}
                              className={`w-full py-2 rounded-xl font-black text-sm transition-colors ${
                                equipped ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}>
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
                              className={`w-full py-2 rounded-xl font-black text-sm transition-all ${
                                bought ? 'bg-emerald-500 text-white' :
                                canBuy ? 'bg-yellow-400 text-slate-800 hover:bg-yellow-300' :
                                         'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}>
                              {bought ? '✓ Got it!' : `🪙 ${outfit.price.toLocaleString()}`}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Characters — PREMIUM */}
                {tab === 'characters' && (
                  <div className="space-y-4">
                    {activelyTransformed && (
                      <button onClick={() => equipCharacter(null)}
                        className="w-full py-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-violet-300 text-slate-600 font-black text-sm transition-all">
                        ↩ Revert to original character
                      </button>
                    )}
                    {characterOutfits.length === 0 && (
                      <p className="text-center text-slate-400 py-8 font-semibold">No characters available yet.</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                      {characterOutfits.map(item => {
                        const owned    = ownedCharacters.includes(item.id);
                        const canBuy   = !owned && (isLocal || playBits >= item.price);
                        const bought   = justBought === item.id;
                        const charDef_ = item.characterId ? registry.character(item.characterId) : null;
                        const isActive = item.characterId ? characterId === item.characterId : false;
                        return (
                          <div key={item.id}
                            onMouseEnter={() => setPreviewAcc(item.id)}
                            onMouseLeave={() => setPreviewAcc(null)}
                            className={`rounded-3xl overflow-hidden shadow-xl transition-all hover:scale-[1.02] ${
                              isActive ? 'ring-4 ring-orange-400 shadow-orange-300/40' :
                              owned    ? 'ring-2 ring-violet-400 shadow-violet-200/40' : ''
                            }`}>
                            {/* Dark hero image area */}
                            <div className="relative bg-gradient-to-b from-slate-900 via-gray-900 to-gray-800 flex justify-center items-center py-8 px-4 min-h-[180px]">
                              {isActive && (
                                <div className="absolute top-3 right-3 bg-orange-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wide">
                                  Active
                                </div>
                              )}
                              {item.thumbnail
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={item.thumbnail} alt={item.name}
                                    className="h-32 w-auto object-contain drop-shadow-[0_0_24px_rgba(251,146,60,0.5)]" />
                                : <span className="text-7xl">{item.emoji}</span>
                              }
                            </div>
                            {/* Info area */}
                            <div className={`p-4 ${owned ? 'bg-gradient-to-b from-gray-800 to-gray-900' : 'bg-white'}`}>
                              <div className={`font-black text-lg mb-0.5 ${owned ? 'text-white' : 'text-slate-800'}`}>
                                {item.name}
                              </div>
                              {charDef_ && (
                                <div className={`text-xs font-bold mb-3 ${owned ? 'text-orange-300' : 'text-slate-400'}`}>
                                  Character Skin
                                </div>
                              )}
                              {owned ? (
                                <button
                                  onClick={() => isActive ? equipCharacter(null) : equipCharacter(item.characterId ?? null)}
                                  className={`w-full py-3 rounded-2xl font-black text-sm transition-all ${
                                    isActive
                                      ? 'bg-orange-500 text-white hover:bg-orange-600'
                                      : 'bg-gradient-to-r from-orange-400 to-red-500 text-white hover:scale-105 shadow-lg shadow-orange-500/30'
                                  }`}>
                                  {isActive ? '🔥 Transformed!' : '⚡ TRANSFORM'}
                                </button>
                              ) : (
                                <>
                                  <div className={`text-center font-black text-2xl mb-3 ${canBuy ? 'text-yellow-500' : 'text-slate-300'}`}>
                                    🪙 {item.price.toLocaleString()}
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (!canBuy) return;
                                      if (!isLocal) addPlayBits(-item.price);
                                      ownCharacter(item.id);
                                      setJustBought(item.id);
                                      setTimeout(() => setJustBought(null), 1500);
                                    }}
                                    disabled={!canBuy}
                                    className={`w-full py-3 rounded-2xl font-black text-sm transition-all ${
                                      bought  ? 'bg-emerald-500 text-white' :
                                      canBuy  ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 hover:scale-105 shadow-lg shadow-yellow-400/30' :
                                                'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}>
                                    {bought ? '✓ Unlocked!' : 'Buy Now'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── REDEEMED TAB ──────────────────────────────────────────────────── */}
          {mainTab === 'redeemed' && (
            <div className="space-y-10">
              {!hasOwned && (
                <div className="text-center py-20">
                  <div className="text-7xl mb-4">🎒</div>
                  <div className="font-black text-slate-600 text-2xl">Nothing redeemed yet</div>
                  <div className="text-slate-400 mt-2 font-semibold">Visit the Shop tab to spend your PlayBits!</div>
                </div>
              )}

              {ownedCharItems.length > 0 && (
                <div>
                  <h3 className="font-black text-slate-700 text-xl mb-4">🔥 Characters</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    {ownedCharItems.map(item => {
                      const isActive = item.characterId ? characterId === item.characterId : false;
                      return (
                        <div key={item.id} className={`rounded-3xl overflow-hidden shadow-xl ${
                          isActive ? 'ring-4 ring-orange-400' : 'ring-2 ring-violet-400'
                        }`}>
                          <div className="bg-gradient-to-b from-slate-900 to-gray-800 flex justify-center items-center py-8 min-h-[160px]">
                            {item.thumbnail
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={item.thumbnail} alt={item.name}
                                  className="h-28 w-auto object-contain drop-shadow-[0_0_20px_rgba(251,146,60,0.4)]" />
                              : <span className="text-6xl">{item.emoji}</span>
                            }
                          </div>
                          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-4">
                            <div className="text-white font-black text-center text-lg mb-3">{item.name}</div>
                            <button
                              onClick={() => isActive ? equipCharacter(null) : equipCharacter(item.characterId ?? null)}
                              className={`w-full py-3 rounded-2xl font-black text-sm transition-all ${
                                isActive
                                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                                  : 'bg-gradient-to-r from-orange-400 to-red-500 text-white hover:scale-105 shadow-lg'
                              }`}>
                              {isActive ? '🔥 Transformed!' : '⚡ TRANSFORM'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {ownedClothItems.length > 0 && (
                <div>
                  <h3 className="font-black text-slate-700 text-xl mb-4">👕 Clothing</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {ownedClothItems.map(outfit => {
                      const equipped = equippedClothingId === outfit.id;
                      const imgSrc   = outfit.thumbnail ?? resolveOutfitStand(outfit, characterId);
                      return (
                        <div key={outfit.id} className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                          equipped ? 'border-violet-400' : 'border-slate-100'
                        }`}>
                          <div className="flex justify-center h-16 mb-2">
                            {imgSrc
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={imgSrc} alt={outfit.name} className="h-full w-auto object-contain" />
                              : <span className="text-4xl">{outfit.emoji}</span>
                            }
                          </div>
                          <div className="font-black text-slate-800 text-center text-sm mb-2">{outfit.name}</div>
                          <button onClick={() => equipClothing(equipped ? null : outfit.id)}
                            className={`w-full py-2 rounded-xl font-black text-sm transition-colors ${
                              equipped ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            {equipped ? '✓ Wearing' : 'Wear'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {ownedAccItems.length > 0 && (
                <div>
                  <h3 className="font-black text-slate-700 text-xl mb-4">✨ Accessories</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {ownedAccItems.map(acc => {
                      const equipped = equippedId === acc.id;
                      return (
                        <div key={acc.id} className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                          equipped ? 'border-violet-400' : 'border-slate-100'
                        }`}>
                          <div className="text-4xl text-center mb-2">{acc.emoji}</div>
                          <div className="font-black text-slate-800 text-center text-sm mb-2">{acc.name}</div>
                          <button onClick={() => equipAccessory(equipped ? null : acc.id)}
                            className={`w-full py-2 rounded-xl font-black text-sm transition-colors ${
                              equipped ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            {equipped ? '✓ Equipped' : 'Equip'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── MODAL MODE (in-game) ──────────────────────────────────────────────────────
  const cardContent = (
    <>
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

      <div className="flex justify-center items-end bg-gradient-to-b from-purple-50 to-white py-4">
        <CharPreview
          colorFilter={tab === 'characters' ? '' : (activeColor?.filter ?? '')}
          baseSrc={tab === 'characters' ? previewCharBaseSrc : (charDef?.standFrame ?? '/character/walk2.png')}
          item={tab === 'characters' ? undefined : previewAccItem}
          outfitSprite={tab === 'characters' ? null : previewSprite}
        />
      </div>

      <div className="flex border-b border-slate-100">
        {([['colors','🎨'],['accessories','✨'],['clothing','👕'],['characters','🔥']] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setPreviewAcc(null); }}
            className={`flex-1 py-2.5 font-black text-sm transition-colors
              ${tab === t ? 'text-violet-600 border-b-2 border-violet-600 bg-violet-50/40' : 'text-slate-400 hover:text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 overflow-y-auto" style={{ maxHeight: 260 }}>
        {tab === 'colors' && (
          <div className="grid grid-cols-5 gap-3">
            {COLORS.map(color => {
              const active = colorId === color.id;
              return (
                <button key={color.id}
                  onClick={() => { setColor(color.id); setPreviewColor(null); }}
                  onMouseEnter={() => setPreviewColor(color.id)}
                  onMouseLeave={() => setPreviewColor(null)}
                  className="flex flex-col items-center gap-1.5">
                  <div className={`w-11 h-11 rounded-full border-4 transition-all duration-150
                    ${active ? 'border-violet-500 scale-110 shadow-lg shadow-violet-300/50' : 'border-slate-200 hover:border-violet-300 hover:scale-105'}`}
                    style={{ background: color.swatch }}>
                    {active && <div className="w-full h-full rounded-full flex items-center justify-center text-white font-black text-base">✓</div>}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">{color.name}</span>
                </button>
              );
            })}
          </div>
        )}
        {tab === 'accessories' && (
          <div className="grid grid-cols-2 gap-2.5">
            {hatsAndExtras.map(acc => <ItemCard key={acc.id} acc={acc} />)}
          </div>
        )}
        {tab === 'clothing' && (
          <div className="grid grid-cols-2 gap-2.5">
            {clothingOutfits.length === 0 && (
              <p className="col-span-2 text-center text-slate-400 text-sm py-4">No outfits yet.</p>
            )}
            {clothingOutfits.map(outfit => {
              const owned    = ownedClothing.includes(outfit.id);
              const equipped = equippedClothingId === outfit.id;
              const canBuy   = !owned && (isLocal || playBits >= outfit.price);
              const bought   = justBought === outfit.id;
              const imgSrc   = outfit.thumbnail ?? resolveOutfitStand(outfit, characterId);
              return (
                <div key={outfit.id}
                  onMouseEnter={() => setPreviewAcc(outfit.id)} onMouseLeave={() => setPreviewAcc(null)}
                  className={`flex items-center gap-3 rounded-2xl p-3 transition-colors ${equipped ? 'bg-violet-50 ring-2 ring-violet-400' : 'bg-slate-50'}`}>
                  {imgSrc
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={imgSrc} alt={outfit.name} draggable={false} className="w-10 h-10 object-contain rounded-lg bg-white shrink-0" />
                    : <span className="text-3xl leading-none shrink-0">{outfit.emoji}</span>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-slate-800 truncate">{outfit.name}</div>
                    {owned ? (
                      <button onClick={() => equipClothing(equipped ? null : outfit.id)}
                        className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-colors ${equipped ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {equipped ? '✓ Wearing' : 'Wear'}
                      </button>
                    ) : (
                      <button onClick={() => {
                        if (!canBuy) return;
                        if (!isLocal) addPlayBits(-outfit.price);
                        ownClothing(outfit.id); equipClothing(outfit.id);
                        setJustBought(outfit.id); setTimeout(() => setJustBought(null), 1500);
                      }} disabled={!canBuy}
                        className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-all ${
                          bought ? 'bg-emerald-500 text-white' :
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
        {tab === 'characters' && (
          <div className="space-y-3">
            {activelyTransformed && (
              <button onClick={() => equipCharacter(null)}
                className="w-full py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs transition-colors">
                ↩ Revert to original character
              </button>
            )}
            {characterOutfits.map(item => {
              const owned    = ownedCharacters.includes(item.id);
              const canBuy   = !owned && (isLocal || playBits >= item.price);
              const bought   = justBought === item.id;
              const charDef_ = item.characterId ? registry.character(item.characterId) : null;
              const isActive = item.characterId ? characterId === item.characterId : false;
              return (
                <div key={item.id}
                  onMouseEnter={() => setPreviewAcc(item.id)} onMouseLeave={() => setPreviewAcc(null)}
                  className={`flex items-center gap-3 rounded-2xl p-3 transition-colors ${isActive ? 'bg-orange-50 ring-2 ring-orange-400' : 'bg-slate-50'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.thumbnail ? <img src={item.thumbnail} alt={item.name} draggable={false} className="w-12 h-12 object-contain rounded-xl shrink-0" /> : <span className="text-3xl shrink-0">{item.emoji}</span>}
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-slate-800">{item.name}</div>
                    {charDef_ && <div className="text-[10px] text-slate-400 font-bold">Character skin</div>}
                    {owned ? (
                      <button onClick={() => isActive ? equipCharacter(null) : equipCharacter(item.characterId ?? null)}
                        className={`mt-1 text-xs font-black px-3 py-1.5 rounded-full transition-all ${
                          isActive ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gradient-to-r from-orange-400 to-red-500 text-white hover:scale-105 shadow-md'}`}>
                        {isActive ? '🔥 Transformed!' : '⚡ TRANSFORM'}
                      </button>
                    ) : (
                      <button onClick={() => {
                        if (!canBuy) return;
                        if (!isLocal) addPlayBits(-item.price);
                        ownCharacter(item.id); setJustBought(item.id); setTimeout(() => setJustBought(null), 1500);
                      }} disabled={!canBuy}
                        className={`mt-1 text-xs font-black px-3 py-1 rounded-full transition-all ${
                          bought ? 'bg-emerald-500 text-white' :
                          canBuy ? 'bg-yellow-400 text-slate-800 hover:bg-yellow-300 hover:scale-105' :
                                   'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
                        {bought ? '✓ Unlocked!' : `🪙 ${item.price.toLocaleString()}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {characterOutfits.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">No characters available yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2">
        <button onClick={onClose}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-colors text-sm">
          Close
        </button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{   scale: 0.88, opacity: 0, y: 20  }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl bg-white"
        onClick={e => e.stopPropagation()}>
        {cardContent}
      </motion.div>
    </div>
  );
}
