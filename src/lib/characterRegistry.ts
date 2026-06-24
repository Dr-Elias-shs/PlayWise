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
  price:       number;
  category:    'hat' | 'extra' | 'clothing' | 'characters';
  characterId?: string; // set on character-type items — equipping transforms into this character
  yFraction?:  number;
  xOffset?:    number;
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
  /** Loads from cache instantly; refetches from Supabase only if cache is stale. */
  refresh:      (force?: boolean) => Promise<void>;
  save:         (r: CharacterRegistry) => Promise<void>;
}

// ─── URL rewriting (Supabase Storage → in-app proxy) ─────────────────────────
//
// Sprite URLs stored in the registry historically point straight at Supabase
// Storage public URLs. Serving them from there burns the free-tier egress
// quota. Rewriting them to /api/sprite/* makes them flow through our proxy
// route, which fetches once per server lifetime and caches indefinitely in
// the browser (1-year immutable Cache-Control).

const SUPABASE_STORAGE_RE = /\/storage\/v1\/object\/public\/characters\/(.+)$/;

function rewriteSpriteUrl(url: string): string {
  if (!url) return url;
  const m = url.match(SUPABASE_STORAGE_RE);
  return m ? `/api/sprite/${m[1]}` : url;
}

function rewriteRegistryUrls(reg: CharacterRegistry): CharacterRegistry {
  return {
    characters: reg.characters.map(c => ({
      ...c,
      frames: [
        rewriteSpriteUrl(c.frames[0]),
        rewriteSpriteUrl(c.frames[1]),
        rewriteSpriteUrl(c.frames[2]),
      ] as [string, string, string],
      standFrame: rewriteSpriteUrl(c.standFrame),
    })),
    outfits: reg.outfits.map(o => ({
      ...o,
      thumbnail: o.thumbnail ? rewriteSpriteUrl(o.thumbnail) : undefined,
      sprites: Object.fromEntries(
        Object.entries(o.sprites).map(([k, v]) => [
          k,
          typeof v === 'string' ? rewriteSpriteUrl(v) : v.map(rewriteSpriteUrl),
        ])
      ) as Record<string, string | string[]>,
    })),
  };
}

// ─── Cache config ─────────────────────────────────────────────────────────────

const CACHE_KEY = 'character_registry_cache_v2'; // v2: URLs rewritten to /api/sprite
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedRegistry {
  registry:  CharacterRegistry;
  cachedAt:  number;
}

function readCache(): CachedRegistry | null {
  if (typeof window === 'undefined') return null;
  try {
    // Discard the v1 cache (full Supabase URLs) if it lingers from before the proxy rewrite.
    localStorage.removeItem('character_registry_cache_v1');

    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRegistry;
    if (!parsed.registry?.characters || !parsed.registry?.outfits) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(registry: CharacterRegistry) {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedRegistry = { registry, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch { /* quota or disabled — ignore */ }
}

function isFresh(cache: CachedRegistry): boolean {
  return (Date.now() - cache.cachedAt) < CACHE_TTL_MS;
}

export const useCharacterRegistry = create<RegistryStore>((set, get) => ({
  ...FALLBACK_REGISTRY,
  loaded: false,

  character: (id) => get().characters.find(c => c.id === id),
  outfit:    (id) => get().outfits.find(o => o.id === id),

  async refresh(force = false) {
    // ── Step 1: hydrate from cache instantly (no network) ─────────────────
    const cached = readCache();
    if (cached) {
      set({ characters: cached.registry.characters, outfits: cached.registry.outfits, loaded: true });
      // Fresh cache → done. No Supabase call. This is the egress win.
      if (!force && isFresh(cached)) return;
    }

    // ── Step 2: cache missing or stale → fetch from Supabase ──────────────
    try {
      const { data } = await supabase
        .from('global_config')
        .select('value')
        .eq('key', 'character_registry')
        .maybeSingle();
      if (data?.value) {
        const reg = rewriteRegistryUrls(data.value as CharacterRegistry);
        set({ characters: reg.characters, outfits: reg.outfits, loaded: true });
        writeCache(reg);
        return;
      }
    } catch { /* fall through */ }

    // ── Step 3: Supabase failed → try static JSON fallback ────────────────
    try {
      const res = await fetch(`/characters/registry.json?t=${Date.now()}`);
      if (res.ok) {
        const data = rewriteRegistryUrls(await res.json() as CharacterRegistry);
        set({ characters: data.characters, outfits: data.outfits, loaded: true });
        writeCache(data);
        return;
      }
    } catch { /* fall through */ }

    set({ loaded: true });
  },

  async save(registry) {
    // Admin saves the raw registry (Supabase URLs) — Supabase is the source of truth.
    // After persisting, store the rewritten form in cache + memory so the
    // admin (and everyone else who reads the cache) goes through the proxy.
    const rewritten = rewriteRegistryUrls(registry);
    set({ characters: rewritten.characters, outfits: rewritten.outfits });
    writeCache(rewritten);
    await supabase
      .from('global_config')
      .upsert({ key: 'character_registry', value: registry }, { onConflict: 'key' });
  },
}));

// Auto-load once on client — cache-first, so this is free on repeat visits.
if (typeof window !== 'undefined') {
  useCharacterRegistry.getState().refresh();
}

// ─── Upload helper ────────────────────────────────────────────────────────────

export async function uploadCharacterFile(
  file:       File,
  targetPath: string,   // e.g. "/characters/robot/walk1.png"
): Promise<string> {
  // Strip /characters/ prefix; POST the raw bytes to our server route which
  // uses the service role key to upload directly to Supabase Storage.
  const relPath  = targetPath.replace(/^\/characters\//, '');
  const formData = new FormData();
  formData.append('file', file, file.name);
  // No Content-Type header — browser sets it automatically with multipart boundary
  const res = await fetch(`/api/characters/upload?p=${relPath}`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Upload failed (HTTP ${res.status})`);
  }
  const { publicUrl } = await res.json();
  return publicUrl;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
