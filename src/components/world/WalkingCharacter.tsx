"use client";

import { forwardRef } from 'react';
import { ACCESSORIES, itemTopFraction } from '@/lib/avatar-items';
import { useCharacterRegistry, resolveOutfitFrame } from '@/lib/characterRegistry';

export const CHAR_H  = 72;
export const CHAR_HW = 36;

interface Props {
  playerName:          string;
  colorFilter?:        string;
  characterId?:        string;
  equippedAccId?:      string | null;   // hat / extra — from ACCESSORIES
  equippedClothingId?: string | null;   // clothing — from registry
}

export const WalkingCharacter = forwardRef<HTMLDivElement, Props>(
  function WalkingCharacter(
    { playerName, colorFilter = '', characterId = 'male', equippedAccId, equippedClothingId }, ref
  ) {
    const registry      = useCharacterRegistry();
    const charDef       = registry.character(characterId) ?? registry.characters[0];
    const frames        = charDef?.frames ?? ['/character/walk1.png', '/character/walk2.png', '/character/walk3.png'];

    // Hat / extra: look up from ACCESSORIES for emoji + positioning
    const accItem       = ACCESSORIES.find(a => a.id === equippedAccId) ?? null;

    // Clothing: look up from registry
    const outfitDef     = equippedClothingId ? registry.outfit(equippedClothingId) : null;
    const hasOutfitSprite = !!outfitDef?.sprites[characterId];

    function accOverlay() {
      if (!accItem) return null;
      const topPx = itemTopFraction(accItem) * CHAR_H;
      const fs    = Math.round(CHAR_H * 0.30);
      return (
        <div className="absolute pointer-events-none select-none"
          style={{ top: topPx, left: `calc(50% + ${accItem.xOffset ?? 0}px)`,
                   transform: 'translateX(-50%)', fontSize: fs, lineHeight: 1, zIndex: 3 }}>
          {accItem.emoji}
        </div>
      );
    }

    function clothOverlay() {
      if (!outfitDef || hasOutfitSprite) return null; // sprite handles it
      const topPx = (outfitDef.yFraction ?? 0.44) * CHAR_H;
      const fs    = Math.round(CHAR_H * 0.30);
      return (
        <div className="absolute pointer-events-none select-none"
          style={{ top: topPx, left: `calc(50% + ${outfitDef.xOffset ?? 0}px)`,
                   transform: 'translateX(-50%)', fontSize: fs, lineHeight: 1, zIndex: 3 }}>
          {outfitDef.emoji}
        </div>
      );
    }

    return (
      <div ref={ref} className="absolute"
        style={{ left: 0, top: 0, width: CHAR_HW * 2, height: CHAR_H,
                 transformOrigin: 'center bottom', willChange: 'left, top, transform',
                 zIndex: 20, pointerEvents: 'none', userSelect: 'none' }}>

        {/* Name tag */}
        <div className="absolute w-full flex justify-center" style={{ top: -18 }}>
          <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            {playerName}
          </span>
        </div>

        {/* Sprite frames — RAF loop in WorldMap toggles display:block/none */}
        <div style={{ position: 'relative', height: CHAR_H }}>
          {frames.map((baseSrc, i) => {
            const src = outfitDef
              ? (resolveOutfitFrame(outfitDef, characterId, i) ?? baseSrc)
              : baseSrc;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" draggable={false}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ display: i === 1 ? 'block' : 'none',
                         filter: colorFilter, transition: 'filter 0.2s' }}
              />
            );
          })}
        </div>

        {accOverlay()}
        {clothOverlay()}

      </div>
    );
  }
);
