export interface ColorOption {
  id:     string;
  name:   string;
  filter: string;
  swatch: string;
}

export interface AccessoryItem {
  id:        string;
  name:      string;
  emoji:     string;
  price:     number;
  category:  'hat' | 'extra' | 'clothing';
  // vertical anchor as fraction of character height (0 = top, 1 = bottom)
  // negative = above the top of the sprite
  yFraction?: number;
  // horizontal pixel offset from center (positive = right)
  xOffset?: number;
  // kept for any direct code references; outfit sprites are now managed via characterRegistry
  femaleSprite?: string;
}

// Default Y anchor per category (fraction of char height)
const CAT_Y: Record<string, number> = {
  hat:      -0.14,   // bottom of hat sits on top of head (~top 5% of sprite)
  extra:     0.21,   // face / eye level (~25% from top)
  clothing:  0.44,   // upper chest / body level (~50% from top)
};

/** Returns the `top` value as a fraction of character height. */
export function itemTopFraction(item: AccessoryItem): number {
  return item.yFraction ?? CAT_Y[item.category] ?? 0;
}

export const COLORS: ColorOption[] = [
  { id: 'green',  name: 'Forest',  filter: '',                                          swatch: '#22c55e' },
  { id: 'blue',   name: 'Ocean',   filter: 'hue-rotate(180deg)',                        swatch: '#3b82f6' },
  { id: 'red',    name: 'Fire',    filter: 'hue-rotate(100deg)',                        swatch: '#ef4444' },
  { id: 'purple', name: 'Cosmic',  filter: 'hue-rotate(260deg)',                        swatch: '#a855f7' },
  { id: 'yellow', name: 'Sunny',   filter: 'hue-rotate(60deg)',                         swatch: '#eab308' },
  { id: 'pink',   name: 'Blossom', filter: 'hue-rotate(310deg)',                        swatch: '#ec4899' },
  { id: 'orange', name: 'Sunset',  filter: 'hue-rotate(30deg)',                         swatch: '#f97316' },
  { id: 'teal',   name: 'Aqua',    filter: 'hue-rotate(150deg)',                        swatch: '#14b8a6' },
  { id: 'shadow', name: 'Shadow',  filter: 'grayscale(1) brightness(0.4)',              swatch: '#374151' },
  { id: 'golden', name: 'Golden',  filter: 'sepia(1) hue-rotate(15deg) saturate(2.5)', swatch: '#d97706' },
];

export const ACCESSORIES: AccessoryItem[] = [
  // ── Hats (sit on the head) ────────────────────────────────────────────────
  { id: 'crown',      name: 'Crown',       emoji: '👑', price: 1000, category: 'hat'   },
  { id: 'tophat',     name: 'Top Hat',     emoji: '🎩', price: 500,  category: 'hat'   },
  { id: 'gradcap',    name: 'Grad Cap',    emoji: '🎓', price: 750,  category: 'hat'   },
  { id: 'wizard',     name: 'Wizard Hat',  emoji: '🪄', price: 800,  category: 'hat'   },
  { id: 'cap',        name: 'Sports Cap',  emoji: '🧢', price: 450,  category: 'hat'   },
  // ── Extras (face / effect level) ─────────────────────────────────────────
  { id: 'sunglasses', name: 'Sunglasses',  emoji: '🕶️', price: 600,  category: 'extra'                       },
  { id: 'halo',       name: 'Halo',        emoji: '😇', price: 850,  category: 'extra', yFraction: -0.08     },
  { id: 'star',       name: 'Star Aura',   emoji: '⭐', price: 300,  category: 'extra', yFraction: -0.10     },
  { id: 'lightning',  name: 'Lightning',   emoji: '⚡', price: 400,  category: 'extra', yFraction: -0.06     },
  { id: 'bow',        name: 'Bow',         emoji: '🎀', price: 350,  category: 'extra', yFraction:  0.36     },
  // ── Clothing (chest / body level) ────────────────────────────────────────
  { id: 'scarf',      name: 'Scarf',       emoji: '🧣', price: 400,  category: 'clothing', yFraction: 0.36 },
  { id: 'tie',        name: 'Neck Tie',    emoji: '👔', price: 350,  category: 'clothing', yFraction: 0.38 },
  { id: 'medal',      name: 'Medal',       emoji: '🏅', price: 600,  category: 'clothing', yFraction: 0.48 },
  { id: 'badge',      name: 'Star Badge',  emoji: '🏆', price: 500,  category: 'clothing', yFraction: 0.44 },
  { id: 'backpack',   name: 'Backpack',    emoji: '🎒', price: 700,  category: 'clothing', yFraction: 0.40, xOffset: 14 },
  { id: 'heart',      name: 'Heart Pin',   emoji: '❤️', price: 250,  category: 'clothing', yFraction: 0.50 },
  // Outfit (clothing) items with character-specific sprites are now in
  // public/characters/registry.json — managed via /admin/characters
];
