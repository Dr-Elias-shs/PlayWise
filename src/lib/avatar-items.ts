export interface ColorOption {
  id:     string;
  name:   string;
  filter: string;
  swatch: string;
}

export interface AccessoryItem {
  id:       string;
  name:     string;
  emoji:    string;
  price:    number;
  category: 'hat' | 'extra';
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
  // Hats
  { id: 'crown',      name: 'Crown',       emoji: '👑', price: 1000, category: 'hat'   },
  { id: 'tophat',     name: 'Top Hat',     emoji: '🎩', price: 500,  category: 'hat'   },
  { id: 'gradcap',    name: 'Grad Cap',    emoji: '🎓', price: 750,  category: 'hat'   },
  { id: 'wizard',     name: 'Wizard Hat',  emoji: '🪄', price: 800,  category: 'hat'   },
  { id: 'cap',        name: 'Sports Cap',  emoji: '🧢', price: 450,  category: 'hat'   },
  // Extras
  { id: 'sunglasses', name: 'Sunglasses',  emoji: '🕶️', price: 600,  category: 'extra' },
  { id: 'star',       name: 'Star',        emoji: '⭐', price: 300,  category: 'extra' },
  { id: 'bow',        name: 'Bow',         emoji: '🎀', price: 350,  category: 'extra' },
  { id: 'lightning',  name: 'Lightning',   emoji: '⚡', price: 400,  category: 'extra' },
  { id: 'halo',       name: 'Halo',        emoji: '😇', price: 850,  category: 'extra' },
];
