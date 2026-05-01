import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CharacterDef {
  id:             string;
  name:           string;
  /** [walk1, walk2/stand, walk3] */
  frames:         [string, string, string];
  standFrame:     string;   // shown in picker — usually frames[1]
  hasBuiltInLogo: boolean;  // true = female (logo baked in, skip SHS badge overlay)
}

export interface RegistryOutfit {
  id:         string;
  name:       string;
  emoji:      string;
  thumbnail?: string;   // shop card preview image (uploaded picture)
  price:      number;
  category:   'hat' | 'extra' | 'clothing';
  yFraction?: number;
  xOffset?:   number;
  /**
   * characterId → sprite(s).
   * - string   = single image used for all walk frames (character looks static while moving)
   * - string[] = [walk1, stand, walk3] → full walking animation in the outfit
   * Missing key = emoji overlay fallback.
   */
  sprites:    Record<string, string | string[]>;
}

/** Returns the stand/preview frame (index 1, or index 0 fallback) as a plain string. */
export function resolveOutfitStand(outfit: RegistryOutfit, characterId: string): string | null {
  const s = outfit.sprites[characterId];
  if (!s) return null;
  if (typeof s === 'string') return s;
  return s[1] ?? s[0] ?? null;
}

/** Resolve the right sprite path for a given frame index (0-2). */
export function resolveOutfitFrame(
  outfit:      RegistryOutfit,
  characterId: string,
  frameIndex:  number,   // 0 = walk1, 1 = stand, 2 = walk3
): string | null {
  const s = outfit.sprites[characterId];
  if (!s) return null;
  if (typeof s === 'string') return s;            // single image → use for all frames
  return s[frameIndex % s.length] ?? s[0] ?? null; // array → use matching frame
}

export interface CharacterRegistry {
  characters: CharacterDef[];
  outfits:    RegistryOutfit[];
}

// ─── Fallback (used until JSON loads) ────────────────────────────────────────

export const FALLBACK_REGISTRY: CharacterRegistry = {
  characters: [
    {
      id: 'male', name: 'Male',
      frames: ['/character/walk1.png', '/character/walk2.png', '/character/walk3.png'],
      standFrame: '/character/walk2.png',
      hasBuiltInLogo: false,
    },
    {
      id: 'female', name: 'Female',
      frames: ['/character/female-walk1.png', '/character/female-walk2.png', '/character/female-walk3.png'],
      standFrame: '/character/female-walk2.png',
      hasBuiltInLogo: true,
    },
  ],
  outfits: [
    { id: 'f-jacket',       name: 'Varsity Jacket', emoji: '🧥', price: 800,  category: 'clothing', yFraction: 0.42, sprites: { female: '/character/female-outfit-jacket.png' } },
    { id: 'f-jeans',        name: 'Jeans',          emoji: '👖', price: 600,  category: 'clothing', yFraction: 0.44, sprites: { female: '/character/female-outfit-jeans.png' } },
    { id: 'f-jacket-jeans', name: 'Jacket + Jeans', emoji: '✨', price: 1200, category: 'clothing', yFraction: 0.42, sprites: { female: '/character/female-outfit-jacket-jeans.png' } },
  ],
};

// ─── Zustand store ────────────────────────────────────────────────────────────

interface RegistryStore extends CharacterRegistry {
  loaded:       boolean;
  character:    (id: string) => CharacterDef | undefined;
  outfit:       (id: string) => RegistryOutfit | undefined;
  refresh:      () => Promise<void>;
  save:         (r: CharacterRegistry) => Promise<void>;
}

export const useCharacterRegistry = create<RegistryStore>((set, get) => ({
  ...FALLBACK_REGISTRY,
  loaded: false,

  character: (id) => get().characters.find(c => c.id === id),
  outfit:    (id) => get().outfits.find(o => o.id === id),

  async refresh() {
    try {
      // Try Supabase global_config first (source of truth for admin updates)
      const { data } = await supabase
        .from('global_config')
        .select('value')
        .eq('key', 'character_registry')
        .maybeSingle();
      if (data?.value) {
        const reg = data.value as CharacterRegistry;
        set({ characters: reg.characters, outfits: reg.outfits, loaded: true });
        return;
      }
    } catch { /* fall through */ }

    try {
      // Fallback: static file bundled with the deployment
      const res = await fetch(`/characters/registry.json?t=${Date.now()}`);
      if (res.ok) {
        const data: CharacterRegistry = await res.json();
        set({ characters: data.characters, outfits: data.outfits, loaded: true });
        return;
      }
    } catch { /* fall through */ }

    set({ loaded: true });
  },

  async save(registry) {
    set({ characters: registry.characters, outfits: registry.outfits });
    await supabase
      .from('global_config')
      .upsert({ key: 'character_registry', value: registry }, { onConflict: 'key' });
  },
}));

// Auto-load once on client
if (typeof window !== 'undefined') {
  useCharacterRegistry.getState().refresh();
}

// ─── Upload helper ────────────────────────────────────────────────────────────

export async function uploadCharacterFile(
  file:       File,
  targetPath: string,   // e.g. "/characters/robot/walk1.png"
): Promise<string> {
  // Strip the leading /characters/ — bucket is named 'characters'
  const storagePath = targetPath.replace(/^\/characters\//, '');

  const { error } = await supabase.storage
    .from('characters')
    .upload(storagePath, file, { contentType: file.type || 'image/png', upsert: true });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage.from('characters').getPublicUrl(storagePath);
  return publicUrl;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
