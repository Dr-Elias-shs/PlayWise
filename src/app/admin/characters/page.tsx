"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCharacterRegistry, uploadCharacterFile, slugify, resolveOutfitStand,
  type CharacterDef, type RegistryOutfit, type CharacterRegistry,
} from '@/lib/characterRegistry';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

// Checkered background reveals white-BG PNGs during development
const CHECKER = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23e2e8f0'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23e2e8f0'/%3E%3Crect x='8' width='8' height='8' fill='%23f1f5f9'/%3E%3Crect y='8' width='8' height='8' fill='%23f1f5f9'/%3E%3C/svg%3E")`;

function Thumb({ src, size = 64 }: { src: string; size?: number }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ width: size, height: size, backgroundImage: CHECKER }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" draggable={false}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    </div>
  );
}

function UploadZone({
  label, onFile, preview, size = 72,
}: {
  label: string;
  onFile: (f: File) => void;
  preview?: string;
  size?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="relative rounded-xl border-2 border-dashed border-slate-300 hover:border-violet-400
          bg-slate-50 hover:bg-violet-50 transition-colors flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {preview
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={preview} alt="" style={{ width: size, height: size, objectFit: 'contain' }} />
          : <span className="text-2xl text-slate-300">+</span>
        }
      </button>
      <span className="text-[10px] font-bold text-slate-400 text-center leading-tight">{label}</span>
      <input ref={ref} type="file" accept="image/png,image/webp,image/gif"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
    </div>
  );
}

// ─── Add-character modal ──────────────────────────────────────────────────────

function AddCharacterModal({ onDone, onClose }: {
  onDone: (c: CharacterDef) => void;
  onClose: () => void;
}) {
  const [name,    setName]   = useState('');
  const [frames,  setFrames] = useState<(File | null)[]>([null, null, null]);
  const [previews, setPrev]  = useState<(string | null)[]>([null, null, null]);
  const [logo,    setLogo]   = useState(false);
  const [busy,    setBusy]   = useState(false);
  const [err,     setErr]    = useState('');

  function setFrame(i: number, f: File) {
    const nf = [...frames]; nf[i] = f; setFrames(nf);
    const url = URL.createObjectURL(f);
    const np = [...previews]; np[i] = url; setPrev(np);
  }

  async function handleSave() {
    const id = slugify(name.trim());
    if (!id)              { setErr('Enter a name'); return; }
    if (frames.some(f => f === null)) { setErr('Upload all 3 walk frames'); return; }
    setBusy(true);
    try {
      const paths: string[] = [];
      for (let i = 0; i < 3; i++) {
        const p = await uploadCharacterFile(frames[i]!, `/characters/${id}/walk${i + 1}.png`);
        paths.push(p);
      }
      onDone({
        id,
        name: name.trim(),
        frames: paths as [string, string, string],
        standFrame: paths[1],
        hasBuiltInLogo: logo,
      });
    } catch {
      setErr('Upload failed — check the server');
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm">
        <h3 className="text-xl font-black text-slate-800 mb-5">Add Character</h3>

        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 mb-1">Character name</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Robot"
            className="w-full px-3 py-2.5 border-2 border-slate-200 focus:border-violet-500
              rounded-xl font-bold text-slate-800 outline-none text-sm" />
        </div>

        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 mb-2">Walk frames (PNG with transparency)</p>
          <div className="flex gap-3">
            {['Walk 1', 'Stand', 'Walk 3'].map((lbl, i) => (
              <UploadZone key={i} label={lbl} preview={previews[i] ?? undefined}
                onFile={f => setFrame(i, f)} />
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
          <input type="checkbox" checked={logo} onChange={e => setLogo(e.target.checked)}
            className="rounded accent-violet-600" />
          <span className="text-sm font-bold text-slate-600">Logo already in artwork</span>
        </label>

        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200">
            Cancel
          </button>
          <button onClick={handleSave} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-white font-black text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
            {busy ? 'Uploading…' : 'Add'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add-outfit modal ─────────────────────────────────────────────────────────

// Per-character sprite state: either 1 file or 3 files
type CharSprites = { mode: 'single'; file: File | null } | { mode: 'walk'; files: [File|null, File|null, File|null] };

function AddOutfitModal({ characters, onDone, onClose }: {
  characters: CharacterDef[];
  onDone: (o: RegistryOutfit) => void;
  onClose: () => void;
}) {
  const [name,     setName]     = useState('');
  const [emoji,    setEmoji]    = useState('');
  const [price,    setPrice]    = useState('500');
  const [category, setCategory] = useState<'hat' | 'extra' | 'clothing'>('clothing');
  const [yFrac,    setYFrac]    = useState('0.44');
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState('');

  // Default to 3-frame walk mode — outfits need animation in the world map
  const [charSprites, setCharSprites] = useState<Record<string, CharSprites>>(() =>
    Object.fromEntries(characters.map(c => [c.id, { mode: 'walk', files: [null, null, null] }]))
  );
  const [previews, setPreviews] = useState<Record<string, string | string[]>>({});

  function toggleMode(charId: string) {
    setCharSprites(s => {
      const cur = s[charId];
      return { ...s, [charId]: cur.mode === 'single'
        ? { mode: 'walk', files: [null, null, null] }
        : { mode: 'single', file: null }
      };
    });
    setPreviews(p => { const n = { ...p }; delete n[charId]; return n; });
  }

  function setSingleFile(charId: string, f: File) {
    setCharSprites(s => ({ ...s, [charId]: { mode: 'single', file: f } }));
    setPreviews(p => ({ ...p, [charId]: URL.createObjectURL(f) }));
  }

  function setWalkFile(charId: string, idx: number, f: File) {
    setCharSprites(s => {
      const cur = s[charId];
      if (cur.mode !== 'walk') return s;
      const files = [...cur.files] as [File|null, File|null, File|null];
      files[idx] = f;
      return { ...s, [charId]: { mode: 'walk', files } };
    });
    setPreviews(p => {
      const prev = Array.isArray(p[charId]) ? [...(p[charId] as string[])] : ['', '', ''];
      prev[idx] = URL.createObjectURL(f);
      return { ...p, [charId]: prev };
    });
  }

  async function handleSave() {
    const id = slugify(name.trim());
    if (!id)    { setErr('Enter a name'); return; }
    if (!emoji) { setErr('Enter an emoji'); return; }
    setBusy(true);
    try {
      const savedSprites: Record<string, string | string[]> = {};
      for (const [charId, cs] of Object.entries(charSprites)) {
        if (cs.mode === 'single') {
          if (!cs.file) continue;
          const ext  = cs.file.name.split('.').pop() ?? 'png';
          const path = `/characters/outfits/${id}/${charId}.${ext}`;
          await uploadCharacterFile(cs.file, path);
          savedSprites[charId] = path;
        } else {
          const paths: string[] = [];
          for (let i = 0; i < 3; i++) {
            const f = cs.files[i];
            if (!f) continue;
            const ext  = f.name.split('.').pop() ?? 'png';
            const path = `/characters/outfits/${id}/${charId}-walk${i + 1}.${ext}`;
            await uploadCharacterFile(f, path);
            paths.push(path);
          }
          if (paths.length === 3) savedSprites[charId] = paths;
          else if (paths.length === 1) savedSprites[charId] = paths[0];
        }
      }
      onDone({
        id, name: name.trim(), emoji,
        price:     parseInt(price, 10) || 500,
        category,
        yFraction: parseFloat(yFrac) || 0.44,
        sprites:   savedSprites,
      });
    } catch {
      setErr('Upload failed');
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-md overflow-y-auto"
        style={{ maxHeight: '90vh' }}>
        <h3 className="text-xl font-black text-slate-800 mb-5">Add Outfit / Accessory</h3>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Name</p>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Space Suit"
              className="w-full px-3 py-2 border-2 border-slate-200 focus:border-violet-500
                rounded-xl font-bold text-slate-800 outline-none text-sm" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Emoji</p>
            <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🚀"
              className="w-full px-3 py-2 border-2 border-slate-200 focus:border-violet-500
                rounded-xl font-bold text-slate-800 outline-none text-sm" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Price (PlayBits)</p>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full px-3 py-2 border-2 border-slate-200 focus:border-violet-500
                rounded-xl font-bold text-slate-800 outline-none text-sm" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">Category</p>
            <select value={category} onChange={e => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 border-2 border-slate-200 focus:border-violet-500
                rounded-xl font-bold text-slate-800 outline-none text-sm bg-white">
              <option value="hat">Hat</option>
              <option value="extra">Extra</option>
              <option value="clothing">Clothing</option>
            </select>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 mb-1">
            Vertical position <span className="font-normal text-slate-400">(0 = top · 1 = bottom · neg = above head)</span>
          </p>
          <div className="flex items-center gap-3">
            <input type="range" min="-0.3" max="0.9" step="0.02"
              value={yFrac} onChange={e => setYFrac(e.target.value)}
              className="flex-1 accent-violet-600" />
            <span className="text-sm font-black text-violet-600 w-12 text-right">{yFrac}</span>
          </div>
        </div>

        <div className="mb-5">
          <p className="text-xs font-bold text-slate-500 mb-2">
            Sprites per character
            <span className="font-normal text-slate-400 ml-1">(optional — falls back to emoji)</span>
          </p>
          <div className="space-y-4">
            {characters.map(c => {
              const cs = charSprites[c.id] ?? { mode: 'single', file: null };
              const prev = previews[c.id];
              return (
                <div key={c.id} className="border border-slate-200 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Thumb src={c.standFrame} size={28} />
                      <span className="text-sm font-black text-slate-700">{c.name}</span>
                    </div>
                    {/* Toggle single / walk cycle */}
                    <button type="button" onClick={() => toggleMode(c.id)}
                      className={`text-xs font-black px-3 py-1 rounded-full transition-colors
                        ${cs.mode === 'walk'
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-500 hover:bg-violet-50'}`}>
                      {cs.mode === 'walk' ? '🚶 Walk (3 frames)' : '🧍 Single pose'}
                    </button>
                  </div>

                  {cs.mode === 'single' ? (
                    <UploadZone label="Outfit image" size={64}
                      preview={typeof prev === 'string' ? prev : undefined}
                      onFile={f => setSingleFile(c.id, f)} />
                  ) : (
                    <div className="flex gap-3">
                      {(['Walk 1', 'Stand', 'Walk 3'] as const).map((lbl, i) => (
                        <UploadZone key={i} label={lbl} size={56}
                          preview={Array.isArray(prev) ? prev[i] : undefined}
                          onFile={f => setWalkFile(c.id, i, f)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200">
            Cancel
          </button>
          <button onClick={handleSave} disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-white font-black text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
            {busy ? 'Saving…' : 'Add'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Outfit matrix row ────────────────────────────────────────────────────────

function OutfitRow({
  outfit, characters, onUploadSprite, onRemoveSprite,
}: {
  outfit:          RegistryOutfit;
  characters:      CharacterDef[];
  onUploadSprite:  (outfitId: string, charId: string, file: File) => void;
  onRemoveSprite:  (outfitId: string, charId: string) => void;
}) {
  return (
    <tr className="border-b border-slate-100 hover:bg-violet-50/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{outfit.emoji}</span>
          <div>
            <div className="font-black text-sm text-slate-800">{outfit.name}</div>
            <div className="text-[10px] text-slate-400 font-bold">
              🪙 {outfit.price} · {outfit.category}
            </div>
          </div>
        </div>
      </td>
      {characters.map(c => {
        const sprite = outfit.sprites[c.id];
        const isWalk = Array.isArray(sprite);
        const thumbSrc = isWalk ? (sprite as string[])[1] ?? (sprite as string[])[0] : sprite as string | undefined;
        return (
          <td key={c.id} className="py-3 px-4 text-center">
            {sprite ? (
              <div className="flex flex-col items-center gap-1">
                {thumbSrc && <Thumb src={thumbSrc} size={52} />}
                {isWalk && (
                  <span className="text-[9px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                    🚶 {(sprite as string[]).length} frames
                  </span>
                )}
                <button
                  onClick={() => onRemoveSprite(outfit.id, c.id)}
                  className="text-[10px] text-red-400 hover:text-red-600 font-bold">
                  ✕ remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl opacity-30">{outfit.emoji}</span>
                <label className="cursor-pointer text-[10px] font-bold text-violet-500 hover:text-violet-700">
                  + sprite
                  <input type="file" accept="image/png,image/webp" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) onUploadSprite(outfit.id, c.id, f);
                    }} />
                </label>
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = 'characters' | 'outfits' | 'preview';

export default function CharacterImportTool() {
  const registry = useCharacterRegistry();
  const [tab,         setTab]        = useState<Tab>('characters');
  const [addCharOpen, setAddChar]    = useState(false);
  const [addOutfitOpen, setAddOutfit] = useState(false);
  const [previewChar, setPreviewChar] = useState('');
  const [previewOutfit, setPreviewOutfit] = useState('');
  const [saving, setSaving]          = useState(false);
  const [saved,  setSaved]           = useState(false);

  useEffect(() => { registry.refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(r: CharacterRegistry) {
    setSaving(true);
    await registry.save(r);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addCharacter(c: CharacterDef) {
    const updated: CharacterRegistry = {
      characters: [...registry.characters, c],
      outfits:    registry.outfits,
    };
    persist(updated);
    setAddChar(false);
  }

  function addOutfit(o: RegistryOutfit) {
    const updated: CharacterRegistry = {
      characters: registry.characters,
      outfits:    [...registry.outfits, o],
    };
    persist(updated);
    setAddOutfit(false);
  }

  async function uploadSprite(outfitId: string, charId: string, files: File[]) {
    let spriteValue: string | string[];
    if (files.length === 1) {
      const ext  = files[0].name.split('.').pop() ?? 'png';
      const path = `/characters/outfits/${outfitId}/${charId}.${ext}`;
      await uploadCharacterFile(files[0], path);
      spriteValue = path;
    } else {
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const ext  = files[i].name.split('.').pop() ?? 'png';
        const path = `/characters/outfits/${outfitId}/${charId}-walk${i + 1}.${ext}`;
        await uploadCharacterFile(files[i], path);
        paths.push(path);
      }
      spriteValue = paths;
    }
    const updated: CharacterRegistry = {
      characters: registry.characters,
      outfits: registry.outfits.map(o =>
        o.id === outfitId
          ? { ...o, sprites: { ...o.sprites, [charId]: spriteValue } }
          : o
      ),
    };
    persist(updated);
  }

  function removeSprite(outfitId: string, charId: string) {
    const updated: CharacterRegistry = {
      characters: registry.characters,
      outfits: registry.outfits.map(o => {
        if (o.id !== outfitId) return o;
        const { [charId]: _, ...rest } = o.sprites;
        return { ...o, sprites: rest };
      }),
    };
    persist(updated);
  }

  function removeCharacter(id: string) {
    if (!confirm(`Remove character "${id}"?`)) return;
    persist({ characters: registry.characters.filter(c => c.id !== id), outfits: registry.outfits });
  }

  function removeOutfit(id: string) {
    if (!confirm(`Remove outfit "${id}"?`)) return;
    persist({ characters: registry.characters, outfits: registry.outfits.filter(o => o.id !== id) });
  }

  const previewCharDef   = registry.characters.find(c => c.id === previewChar)   ?? registry.characters[0];
  const previewOutfitDef = registry.outfits.find(o => o.id === previewOutfit);
  const previewSprite    = previewOutfitDef && previewCharDef
    ? resolveOutfitStand(previewOutfitDef, previewCharDef.id) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm">← Back</button>
          <div className="w-px h-5 bg-slate-200" />
          <h1 className="text-xl font-black text-slate-800">🎨 Character Import Tool</h1>
        </div>
        <div className="flex items-center gap-3">
          {(saving || saved) && (
            <span className={`text-sm font-bold ${saved ? 'text-emerald-600' : 'text-slate-400'}`}>
              {saved ? '✓ Saved' : 'Saving…'}
            </span>
          )}
          <a href="/" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors">
            Open Game →
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 bg-white px-8">
        {(['characters', 'outfits', 'preview'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3.5 font-black text-sm capitalize transition-colors border-b-2
              ${tab === t
                ? 'text-violet-600 border-violet-600'
                : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
            {t === 'characters' ? `👤 Characters (${registry.characters.length})`
             : t === 'outfits'   ? `🎽 Outfits (${registry.outfits.length})`
             :                     '👁 Preview'}
          </button>
        ))}
      </div>

      <div className="p-8">

        {/* ── Characters tab ── */}
        {tab === 'characters' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500 font-medium">
                Each character needs 3 walk frames. PNG with transparent background.
              </p>
              <button onClick={() => setAddChar(true)}
                className="px-5 py-2.5 rounded-xl text-white font-black text-sm shadow-md
                  hover:scale-105 transition-transform"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
                + Add Character
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {registry.characters.map(c => (
                <motion.div key={c.id} layout
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col items-center gap-3">
                  <Thumb src={c.standFrame} size={80} />
                  <div className="text-center">
                    <div className="font-black text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400 font-bold">ID: {c.id}</div>
                    {c.hasBuiltInLogo && (
                      <div className="text-[10px] text-emerald-600 font-bold mt-1">✓ built-in logo</div>
                    )}
                  </div>
                  {/* Walk frames strip */}
                  <div className="flex gap-1">
                    {c.frames.map((f, i) => <Thumb key={i} src={f} size={36} />)}
                  </div>
                  {!['male', 'female'].includes(c.id) && (
                    <button onClick={() => removeCharacter(c.id)}
                      className="text-xs text-red-400 hover:text-red-600 font-bold">
                      Remove
                    </button>
                  )}
                </motion.div>
              ))}

              {/* Add card */}
              <button onClick={() => setAddChar(true)}
                className="bg-white rounded-2xl border-2 border-dashed border-slate-200
                  hover:border-violet-400 hover:bg-violet-50 transition-colors
                  flex flex-col items-center justify-center gap-2 p-5 min-h-[180px]">
                <span className="text-3xl text-slate-300">+</span>
                <span className="text-sm font-bold text-slate-400">New Character</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Outfits tab ── */}
        {tab === 'outfits' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500 font-medium">
                Upload a sprite per character. If missing, the emoji is used as fallback.
              </p>
              <button onClick={() => setAddOutfit(true)}
                className="px-5 py-2.5 rounded-xl text-white font-black text-sm shadow-md
                  hover:scale-105 transition-transform"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#9333ea)' }}>
                + Add Outfit
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-100 bg-slate-50">
                    <th className="py-3 px-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">
                      Outfit
                    </th>
                    {registry.characters.map(c => (
                      <th key={c.id} className="py-3 px-4 text-center text-xs font-black text-slate-500 uppercase tracking-wider">
                        <div className="flex flex-col items-center gap-1">
                          <Thumb src={c.standFrame} size={32} />
                          {c.name}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {registry.outfits.map(o => (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-violet-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{o.emoji}</span>
                          <div>
                            <div className="font-black text-sm text-slate-800">{o.name}</div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              🪙 {o.price} · {o.category} · y={o.yFraction ?? 0.44}
                            </div>
                          </div>
                        </div>
                      </td>
                      {registry.characters.map(c => {
                        const standSrc = resolveOutfitStand(o, c.id);
                        return (
                          <td key={c.id} className="py-3 px-4 text-center">
                            {standSrc ? (
                              <div className="flex flex-col items-center gap-1">
                                <Thumb src={standSrc} size={52} />
                                <button onClick={() => removeSprite(o.id, c.id)}
                                  className="text-[10px] text-red-400 hover:text-red-600 font-bold">
                                  ✕ remove
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-2xl opacity-25">{o.emoji}</span>
                                <label className="cursor-pointer text-[10px] font-bold text-violet-500 hover:text-violet-700 text-center leading-tight">
                                  + 3 frames
                                  <input type="file" accept="image/png,image/webp"
                                    multiple className="hidden"
                                    onChange={e => {
                                      const fs = Array.from(e.target.files ?? []);
                                      if (fs.length) uploadSprite(o.id, c.id, fs);
                                    }} />
                                </label>
                                <span className="text-[9px] text-slate-300">(or 1 pose)</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4">
                        <button onClick={() => removeOutfit(o.id)}
                          className="text-xs text-slate-300 hover:text-red-500 font-bold transition-colors">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {registry.outfits.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-bold">
                  No outfits yet — click + Add Outfit
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Preview tab ── */}
        {tab === 'preview' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
              {/* Controls */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div>
                  <p className="text-xs font-black text-slate-500 mb-2 uppercase tracking-wider">Character</p>
                  <div className="flex flex-wrap gap-2">
                    {registry.characters.map(c => (
                      <button key={c.id} onClick={() => setPreviewChar(c.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all
                          ${previewChar === c.id || (!previewChar && c === registry.characters[0])
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                        <Thumb src={c.standFrame} size={24} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black text-slate-500 mb-2 uppercase tracking-wider">Outfit</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setPreviewOutfit('')}
                      className={`px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all
                        ${!previewOutfit ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600'}`}>
                      None
                    </button>
                    {registry.outfits.map(o => (
                      <button key={o.id} onClick={() => setPreviewOutfit(o.id)}
                        className={`px-3 py-2 rounded-xl border-2 font-bold text-sm transition-all
                          ${previewOutfit === o.id
                            ? 'border-violet-500 bg-violet-50 text-violet-700'
                            : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                        {o.emoji} {o.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6
                flex flex-col items-center justify-center gap-4">
                {previewCharDef && (
                  <>
                    <div className="relative" style={{ width: 140, height: 140 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewSprite ?? previewCharDef.standFrame}
                        alt="preview"
                        draggable={false}
                        style={{ width: 140, height: 140, objectFit: 'contain' }}
                      />
                      {previewOutfitDef && !previewSprite && (
                        <span className="absolute pointer-events-none select-none"
                          style={{
                            top:       (previewOutfitDef.yFraction ?? 0.44) * 140,
                            left:      `calc(50% + ${previewOutfitDef.xOffset ?? 0}px)`,
                            transform: 'translateX(-50%)',
                            fontSize:  42,
                            lineHeight: 1,
                          }}>
                          {previewOutfitDef.emoji}
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-black text-slate-800">{previewCharDef.name}</div>
                      {previewOutfitDef && (
                        <div className="text-sm text-slate-500">
                          {previewOutfitDef.emoji} {previewOutfitDef.name}
                          {previewSprite
                            ? <span className="ml-2 text-emerald-600 font-bold text-xs">✓ sprite</span>
                            : <span className="ml-2 text-orange-500 font-bold text-xs">emoji fallback</span>
                          }
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {addCharOpen  && <AddCharacterModal onDone={addCharacter} onClose={() => setAddChar(false)} />}
        {addOutfitOpen && <AddOutfitModal characters={registry.characters} onDone={addOutfit} onClose={() => setAddOutfit(false)} />}
      </AnimatePresence>
    </div>
  );
}
