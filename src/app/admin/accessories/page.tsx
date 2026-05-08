"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { ACCESSORIES, COLORS, setAccessoryPositionOverrides, getAccessoryPositionOverrides } from '@/lib/avatar-items';
import { getGlobalConfig, setGlobalConfig } from '@/lib/wallet';
import { useCharacterRegistry } from '@/lib/characterRegistry';

// ─── Constants ────────────────────────────────────────────────────────────────
const PREVIEW_H = 216;   // 3× CHAR_H (72)
const PREVIEW_W = 144;   // 3× CHAR_HW*2 (48)
const SCALE     = PREVIEW_H / 72;

// Admin PIN (same as AdminPage)
const ADMIN_PIN = 'astalabista';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

// ─── Indicator circle for positioning ────────────────────────────────────────
function PositionIndicator({ size }: { size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(255,215,0,0.6) 50%, rgba(200,150,0,0.3))',
      border: '2.5px solid rgba(255,215,0,0.9)',
      boxShadow: '0 0 8px 2px rgba(255,215,0,0.6), inset 0 1px 3px rgba(255,255,255,0.8)',
      pointerEvents: 'none',
    }} />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AccessoryEditorPage() {
  const [pin,       setPin]       = useState('');
  const [unlocked,  setUnlocked]  = useState(false);
  const [pinError,  setPinError]  = useState(false);

  const registry  = useCharacterRegistry();
  const charDef   = registry.characters[0];
  const standSrc  = charDef?.standFrame ?? '/character/walk2.png';

  // Per-accessory overrides: { id -> { yFraction, xOffset } }
  const [overrides, setOverrides] = useState<Record<string, { yFraction: number; xOffset: number }>>({});
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [selected,  setSelected]  = useState<string>(ACCESSORIES[0].id);

  // ── Load from DB on mount ──
  useEffect(() => {
    getGlobalConfig('accessory_positions').then(data => {
      if (data) {
        setAccessoryPositionOverrides(data);
        // Merge with defaults so every accessory has a value
        const merged: Record<string, { yFraction: number; xOffset: number }> = {};
        ACCESSORIES.forEach(a => {
          const ov = data[a.id] ?? {};
          merged[a.id] = {
            yFraction: ov.yFraction ?? a.yFraction ?? defaultYFraction(a.category),
            xOffset:   ov.xOffset   ?? a.xOffset   ?? 0,
          };
        });
        setOverrides(merged);
      } else {
        initDefaults();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initDefaults() {
    const d: Record<string, { yFraction: number; xOffset: number }> = {};
    ACCESSORIES.forEach(a => {
      d[a.id] = {
        yFraction: a.yFraction ?? defaultYFraction(a.category),
        xOffset:   a.xOffset   ?? 0,
      };
    });
    setOverrides(d);
  }

  // ── Drag logic ────────────────────────────────────────────────────────────
  const dragging      = useRef(false);
  const previewRef    = useRef<HTMLDivElement>(null);
  const indicatorSize = Math.round(PREVIEW_H * 0.22);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    updatePosition(e.clientX, e.clientY);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePosition = useCallback((clientX: number, clientY: number) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const yFraction = clamp(relY / PREVIEW_H, -0.3, 1.1);
    const xOffset   = Math.round(clamp((relX - PREVIEW_W / 2) / SCALE, -30, 30));
    setOverrides(prev => ({
      ...prev,
      [selected]: { yFraction: Math.round(yFraction * 100) / 100, xOffset },
    }));
  }, [selected]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) updatePosition(e.clientX, e.clientY); };
    const onUp   = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [updatePosition]);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    dragging.current = true;
    const t = e.touches[0];
    updatePosition(t.clientX, t.clientY);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onEnd = () => { dragging.current = false; };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
  }, [updatePosition]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    await setGlobalConfig('accessory_positions', overrides);
    setAccessoryPositionOverrides(overrides);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── PIN gate ──────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)' }}>
        <div className="bg-white rounded-3xl p-8 w-80 shadow-2xl text-center">
          <div className="text-4xl mb-4">🎒</div>
          <h2 className="text-xl font-black text-slate-800 mb-1">Accessory Editor</h2>
          <p className="text-slate-400 text-sm mb-6">Admin PIN required</p>
          <input
            type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={e => e.key === 'Enter' && (pin === ADMIN_PIN ? setUnlocked(true) : setPinError(true))}
            placeholder="Enter PIN"
            className={`w-full px-4 py-3 border-2 rounded-2xl text-center font-bold outline-none mb-3
              ${pinError ? 'border-red-400' : 'border-slate-200 focus:border-violet-500'}`}
          />
          {pinError && <p className="text-red-500 text-sm mb-3">Wrong PIN</p>}
          <button onClick={() => pin === ADMIN_PIN ? setUnlocked(true) : setPinError(true)}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  const acc = ACCESSORIES.find(a => a.id === selected)!;
  const pos = overrides[selected] ?? { yFraction: 0, xOffset: 0 };
  const topPx  = pos.yFraction * PREVIEW_H;
  const leftPx = PREVIEW_W / 2 + pos.xOffset * SCALE - indicatorSize / 2;

  return (
    <div className="min-h-screen p-6"
      style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95,#6b21a8)' }}>

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center gap-4">
        <a href="/admin" className="text-white/60 hover:text-white font-bold text-sm transition-colors">
          ← Admin
        </a>
        <h1 className="text-white font-black text-2xl flex-1">🎒 Accessory Position Editor</h1>
        <button
          onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50
            text-white font-black rounded-2xl transition-colors flex items-center gap-2">
          {saving ? '⏳ Saving…' : saved ? '✅ Saved!' : '💾 Save All'}
        </button>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Accessory list ── */}
        <div className="bg-white/10 backdrop-blur rounded-3xl p-4 space-y-1 max-h-[600px] overflow-y-auto">
          <p className="text-white/50 text-xs font-black uppercase tracking-wider px-2 mb-3">Accessories</p>
          {ACCESSORIES.map(a => {
            const isSelected = a.id === selected;
            return (
              <button key={a.id} onClick={() => setSelected(a.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all text-left ${
                  isSelected ? 'bg-white text-violet-700' : 'text-white hover:bg-white/10'
                }`}>
                <span className="text-xl">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className={`font-black text-sm ${isSelected ? 'text-violet-700' : 'text-white'}`}>{a.name}</div>
                  <div className={`text-[10px] font-mono ${isSelected ? 'text-violet-400' : 'text-white/40'}`}>
                    y: {(overrides[a.id]?.yFraction ?? 0).toFixed(2)}  x: {overrides[a.id]?.xOffset ?? 0}
                  </div>
                </div>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  a.category === 'hat'      ? 'bg-amber-200 text-amber-700' :
                  a.category === 'extra'    ? 'bg-blue-200 text-blue-700' :
                  'bg-emerald-200 text-emerald-700'
                }`}>{a.category}</span>
              </button>
            );
          })}
        </div>

        {/* ── Center: Preview canvas ── */}
        <div className="flex flex-col items-center gap-6">
          <div className="bg-white/10 backdrop-blur rounded-3xl p-6 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{acc.emoji}</span>
              <h2 className="text-white font-black text-xl">{acc.name}</h2>
            </div>
            <p className="text-white/50 text-xs text-center">
              Drag the circle to reposition.<br/>
              The golden circle shows where the accessory anchor point is.
            </p>

            {/* Character preview with draggable indicator */}
            <div
              ref={previewRef}
              className="relative select-none cursor-crosshair"
              style={{ width: PREVIEW_W, height: PREVIEW_H,
                       background: 'rgba(255,255,255,0.08)',
                       border: '2px dashed rgba(255,255,255,0.2)',
                       borderRadius: 16 }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
            >
              {/* Character sprite */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={standSrc} alt="Character" draggable={false}
                style={{ width: PREVIEW_W, height: PREVIEW_H, objectFit: 'contain',
                         pointerEvents: 'none', userSelect: 'none' }}
              />

              {/* Draggable anchor circle */}
              <div style={{
                position: 'absolute',
                top:  topPx - indicatorSize / 2,
                left: leftPx,
                pointerEvents: 'none',
              }}>
                <PositionIndicator size={indicatorSize} />
              </div>

              {/* Crosshair guide lines */}
              <div style={{
                position: 'absolute', top: topPx, left: 0, right: 0, height: 1,
                background: 'rgba(255,215,0,0.3)', pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', left: PREVIEW_W / 2 + pos.xOffset * SCALE, top: 0, bottom: 0, width: 1,
                background: 'rgba(255,215,0,0.3)', pointerEvents: 'none',
              }} />
            </div>
          </div>

          {/* Color preview */}
          <div className="bg-white/10 backdrop-blur rounded-3xl p-4 w-full">
            <p className="text-white/50 text-xs font-black uppercase tracking-wider mb-3 text-center">Preview with colors</p>
            <div className="flex flex-wrap justify-center gap-3">
              {COLORS.slice(0, 5).map(c => (
                <div key={c.id} className="flex flex-col items-center gap-1">
                  <div className="relative" style={{ width: 56, height: 56 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={standSrc} alt="" draggable={false}
                      style={{ width: 56, height: 56, objectFit: 'contain', filter: c.filter || undefined }}
                    />
                    <span style={{
                      position: 'absolute',
                      top: pos.yFraction * 56 - 9,
                      left: `calc(50% + ${pos.xOffset * (56 / 72)}px)`,
                      transform: 'translateX(-50%)',
                      fontSize: 18, lineHeight: 1,
                      pointerEvents: 'none',
                    }}>{acc.emoji}</span>
                  </div>
                  <span className="text-[9px] text-white/40 font-bold">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Fine controls ── */}
        <div className="bg-white/10 backdrop-blur rounded-3xl p-6 space-y-6">
          <h3 className="text-white font-black text-lg">Fine Adjust</h3>

          {/* yFraction slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/70 text-sm font-bold">Vertical Position</label>
              <span className="text-white font-black text-sm font-mono">{pos.yFraction.toFixed(2)}</span>
            </div>
            <input type="range" min="-30" max="110" step="1"
              value={Math.round(pos.yFraction * 100)}
              onChange={e => setOverrides(prev => ({
                ...prev,
                [selected]: { ...prev[selected], yFraction: parseInt(e.target.value) / 100 },
              }))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>above head</span><span>body</span>
            </div>
          </div>

          {/* xOffset slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/70 text-sm font-bold">Horizontal Offset</label>
              <span className="text-white font-black text-sm font-mono">{pos.xOffset}px</span>
            </div>
            <input type="range" min="-30" max="30" step="1"
              value={pos.xOffset}
              onChange={e => setOverrides(prev => ({
                ...prev,
                [selected]: { ...prev[selected], xOffset: parseInt(e.target.value) },
              }))}
              className="w-full accent-amber-400"
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>← left</span><span>center</span><span>right →</span>
            </div>
          </div>

          {/* Numeric inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/50 text-xs font-bold block mb-1">yFraction</label>
              <input type="number" step="0.01" min="-0.3" max="1.1"
                value={pos.yFraction}
                onChange={e => setOverrides(prev => ({
                  ...prev,
                  [selected]: { ...prev[selected], yFraction: parseFloat(e.target.value) || 0 },
                }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl
                  text-white font-black text-sm outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs font-bold block mb-1">xOffset (px)</label>
              <input type="number" step="1" min="-30" max="30"
                value={pos.xOffset}
                onChange={e => setOverrides(prev => ({
                  ...prev,
                  [selected]: { ...prev[selected], xOffset: parseInt(e.target.value) || 0 },
                }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl
                  text-white font-black text-sm outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Reset to default */}
          <button
            onClick={() => {
              const a = ACCESSORIES.find(x => x.id === selected)!;
              setOverrides(prev => ({
                ...prev,
                [selected]: {
                  yFraction: a.yFraction ?? defaultYFraction(a.category),
                  xOffset:   a.xOffset   ?? 0,
                },
              }));
            }}
            className="w-full py-2 bg-white/10 hover:bg-white/20 text-white/70 font-bold
              rounded-2xl text-sm transition-colors">
            ↺ Reset to default
          </button>

          {/* Category hint */}
          <div className="text-[11px] text-white/30 space-y-1 border-t border-white/10 pt-4">
            <p className="font-black text-white/40 mb-2">Reference (default y-anchors)</p>
            <p>Hat: <span className="font-mono">-0.14</span> (above head)</p>
            <p>Extra: <span className="font-mono">0.21</span> (face level)</p>
            <p>Clothing: <span className="font-mono">0.44</span> (chest level)</p>
          </div>
        </div>
      </div>
    </div>
  );

  function defaultYFraction(cat: string) {
    if (cat === 'hat')      return -0.14;
    if (cat === 'extra')    return 0.21;
    if (cat === 'clothing') return 0.44;
    return 0;
  }
}
