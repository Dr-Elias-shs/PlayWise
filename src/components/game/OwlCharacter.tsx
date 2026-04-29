"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore }           from '@/store/useGameStore';
import { useCharacterRegistry, resolveOutfitStand } from '@/lib/characterRegistry';
import { COLORS, ACCESSORIES, itemTopFraction } from '@/lib/avatar-items';

export type OwlMood = 'idle' | 'correct' | 'wrong' | 'thinking' | 'celebrate';

const MESSAGES: Record<OwlMood, string> = {
  idle:      "Let's solve this! 🧩",
  thinking:  'Read carefully... 👀',
  correct:   'Good job! ⭐',
  wrong:     'Try again! 💪',
  celebrate: 'Amazing! 🎉',
};

const MOOD_FILTER: Record<OwlMood, string> = {
  idle:      '',
  thinking:  'brightness(0.88)',
  correct:   'drop-shadow(0 0 12px #10b981) brightness(1.1)',
  wrong:     'drop-shadow(0 0 10px #ef4444)',
  celebrate: 'drop-shadow(0 0 18px #fbbf24) brightness(1.12)',
};

// ─── Resolved character data for a given player state ────────────────────────

function useResolvedCharacter() {
  const { colorId, characterId, equippedId, equippedClothingId } = useGameStore();
  const registry = useCharacterRegistry();
  const charDef  = registry.character(characterId) ?? registry.characters[0];
  const color    = COLORS.find(c => c.id === colorId);

  // Outfit sprite comes from registry
  const registryOutfit = registry.outfit(equippedClothingId ?? '');
  const outfitSprite   = registryOutfit ? resolveOutfitStand(registryOutfit, characterId) : null;

  // Hat/extra from ACCESSORIES (emoji overlay)
  const acc    = ACCESSORIES.find(a => a.id === equippedId)   ?? null;

  return { charDef, color, outfitSprite, registryOutfit, acc };
}

// ─── Item overlays ────────────────────────────────────────────────────────────

function ItemOverlays({ size, outfitActive }: { size: number; outfitActive: boolean }) {
  const { equippedId, equippedClothingId } = useGameStore();
  const registry = useCharacterRegistry();
  const acc   = ACCESSORIES.find(a => a.id === equippedId)          ?? null;
  const cloth = !outfitActive
    ? (registry.outfit(equippedClothingId ?? '') ?? null)
    : null;
  const fs = Math.round(size * 0.30);

  return (
    <>
      {acc && (
        <span className="absolute pointer-events-none select-none"
          style={{ top: itemTopFraction(acc) * size,
                   left: `calc(50% + ${acc.xOffset ?? 0}px)`,
                   transform: 'translateX(-50%)', fontSize: fs, lineHeight: 1 }}>
          {acc.emoji}
        </span>
      )}
      {cloth && (
        <span className="absolute pointer-events-none select-none"
          style={{ top: (cloth.yFraction ?? 0.44) * size,
                   left: `calc(50% + ${cloth.xOffset ?? 0}px)`,
                   transform: 'translateX(-50%)', fontSize: fs, lineHeight: 1 }}>
          {cloth.emoji}
        </span>
      )}
    </>
  );
}

// ─── Static mini character ────────────────────────────────────────────────────

export function OwlMini({ size = 60, colorIdOverride }: {
  size?: number;
  colorIdOverride?: string;
}) {
  const { colorId, characterId, equippedClothingId } = useGameStore();
  const registry   = useCharacterRegistry();
  const charDef    = registry.character(characterId) ?? registry.characters[0];
  const effectiveColorId = colorIdOverride ?? colorId;
  const color      = COLORS.find(c => c.id === effectiveColorId);

  // Outfit sprite — skip in picker mode (colorIdOverride set)
  const outfitSprite = colorIdOverride
    ? null
    : (() => { const o = registry.outfit(equippedClothingId ?? ''); return o ? resolveOutfitStand(o, characterId) : null; })();

  const spriteSrc = outfitSprite ?? charDef?.standFrame ?? '/character/walk2.png';

  return (
    <div className="relative inline-block select-none" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={spriteSrc} alt="character" draggable={false}
        style={{ width: size, height: size, objectFit: 'contain', filter: color?.filter ?? '' }}
      />

      {!colorIdOverride && <ItemOverlays size={size} outfitActive={!!outfitSprite} />}

    </div>
  );
}

// ─── Animated game character with speech bubble ───────────────────────────────

export function OwlCharacter({ mood }: { mood: OwlMood }) {
  const { colorId, characterId } = useGameStore();
  const registry     = useCharacterRegistry();
  const charDef      = registry.character(characterId) ?? registry.characters[0];
  const color        = COLORS.find(c => c.id === colorId);
  const { outfitSprite } = useResolvedCharacter();

  const [frame, setFrame] = useState(1);

  useEffect(() => {
    if (outfitSprite) { setFrame(1); return; } // static when wearing full outfit
    if (mood === 'correct' || mood === 'celebrate') {
      let f = 0;
      const id = setInterval(() => { f = (f + 1) % 3; setFrame(f); }, 110);
      return () => clearInterval(id);
    }
    setFrame(1);
  }, [mood, outfitSprite]);

  const frames      = charDef?.frames ?? ['/character/walk1.png', '/character/walk2.png', '/character/walk3.png'];
  const spriteSrc   = outfitSprite ?? frames[frame];
  const combinedFilter = [color?.filter ?? '', MOOD_FILTER[mood]].filter(Boolean).join(' ');

  return (
    <div className="flex items-center gap-3">
      <motion.div className="relative" style={{ width: 100, height: 100 }}
        animate={
          mood === 'idle'     ? { y: [0, -6, 0] } :
          mood === 'thinking' ? { y: [0, -3, 0] } :
          mood === 'correct'  ? { y: [0, -20, 2, -10, 0], scale: [1, 1.15, 0.95, 1.07, 1] } :
          mood === 'wrong'    ? { x: [0, -10, 10, -7, 7, -4, 4, 0] } :
                                { y: [0, -22, 0], scale: [1, 1.2, 1] }
        }
        transition={
          mood === 'idle' || mood === 'thinking'
            ? { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }
            : { duration: 0.55, ease: 'easeOut' }
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={spriteSrc} alt="character" draggable={false}
          style={{ width: 100, height: 100, objectFit: 'contain', filter: combinedFilter }}
        />
        <ItemOverlays size={100} outfitActive={!!outfitSprite} />

      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={mood}
          initial={{ scale: 0, opacity: 0, x: -12 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{ scale: 0, opacity: 0, x: -12 }}
          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
          className={`relative px-4 py-2.5 rounded-2xl text-sm font-black shadow-lg border max-w-[160px]
            ${mood === 'correct' || mood === 'celebrate' ? 'bg-emerald-500 text-white border-emerald-400/40'
              : mood === 'wrong'    ? 'bg-red-500 text-white border-red-400/40'
              : mood === 'thinking' ? 'bg-indigo-500 text-white border-indigo-400/40'
                                    : 'bg-white text-slate-800 border-white/40'}`}
        >
          <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0
            border-t-[7px] border-b-[7px] border-r-[12px] border-t-transparent border-b-transparent
            ${mood === 'correct' || mood === 'celebrate' ? 'border-r-emerald-500'
              : mood === 'wrong' ? 'border-r-red-500'
              : mood === 'thinking' ? 'border-r-indigo-500'
              : 'border-r-white'}`} />
          {MESSAGES[mood]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
