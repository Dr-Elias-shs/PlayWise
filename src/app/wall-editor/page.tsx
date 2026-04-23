"use client";

/**
 * Wall Editor — draw collision walls and position room doors on any map.
 *
 * Walls  : click + drag  (Draw mode)
 * Erase  : click a rect  (Erase mode)
 * Doors  : click circle to select, click map to move  (Doors mode)
 *
 * 💾 Save Map  →  writes public/maps/{mapId}.json permanently via API
 *                 Works on every device that pulls the repo.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { WALLS as DEFAULT_WALLS, ROOMS } from '@/lib/rooms';
import type { WallDef } from '@/lib/rooms';
import { MAP_REGISTRY, DEFAULT_MAP_ID } from '@/lib/map-registry';
import type { MapMeta } from '@/lib/map-registry';

// ── localStorage fallback keys ────────────────────────────────────────────────
const LS_WALLS = 'playwise_walls';
const LS_DOORS = 'playwise_doors';

function lsWalls(): WallDef[] {
  try { const s = localStorage.getItem(LS_WALLS); return s ? JSON.parse(s) : DEFAULT_WALLS; }
  catch { return DEFAULT_WALLS; }
}
function lsDoors(): DoorOverrides {
  try { const s = localStorage.getItem(LS_DOORS); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 900;   // editor canvas width  (matches MAP_W)
const H = 600;   // editor canvas height (matches MAP_H)

type Mode          = 'draw' | 'erase' | 'doors';
type DoorOverrides = Record<string, { x: number; y: number }>;
interface Draft    { sx: number; sy: number; cx: number; cy: number }

function norm(d: Draft) {
  return {
    x1: Math.min(d.sx, d.cx), y1: Math.min(d.sy, d.cy),
    x2: Math.max(d.sx, d.cx), y2: Math.max(d.sy, d.cy),
  };
}

// ─── Load from JSON file (primary), localStorage (fallback) ──────────────────

async function fetchMapConfig(mapId: string) {
  try {
    const r = await fetch(`/maps/${mapId}.json?t=${Date.now()}`);
    if (!r.ok) return null;
    return await r.json() as { walls: WallDef[]; doors: DoorOverrides };
  } catch { return null; }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WallEditorPage() {
  const [currentMap,   setCurrentMap]   = useState<MapMeta>(
    MAP_REGISTRY.find(m => m.id === DEFAULT_MAP_ID) ?? MAP_REGISTRY[0]
  );
  const [walls,        setWalls]        = useState<WallDef[]>(DEFAULT_WALLS);
  const [doors,        setDoors]        = useState<DoorOverrides>({});
  const [draft,        setDraft]        = useState<Draft | null>(null);
  const [mode,         setMode]         = useState<Mode>('draw');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [prefix,       setPrefix]       = useState('');
  const [saveStatus,   setSaveStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [copied,       setCopied]       = useState(false);
  const [hoveredWallId, setHoveredWallId] = useState<string | null>(null);

  const mapRef  = useRef<HTMLDivElement>(null);
  const counter = useRef(0);

  // ── Load config for the selected map ────────────────────────────────────────
  const loadMap = useCallback(async (meta: MapMeta) => {
    const data = await fetchMapConfig(meta.id);
    if (data) {
      // Saved file exists — use it
      setWalls(data.walls ?? DEFAULT_WALLS);
      setDoors(data.doors ?? {});
    } else {
      // No saved file yet — recover from localStorage so nothing is lost
      setWalls(lsWalls());
      setDoors(lsDoors());
    }
    setSelectedRoom(null);
    setSaveStatus('idle');
  }, []);

  useEffect(() => { loadMap(currentMap); }, [currentMap, loadMap]);

  // ── Coordinate helper ────────────────────────────────────────────────────────
  function frac(e: React.MouseEvent) {
    const r = mapRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top)  / r.height)),
    };
  }

  function getDoorPos(key: string) {
    const r = ROOMS.find(r => r.key === key)!;
    return doors[key] ?? r.door;
  }

  // ── Mouse handlers ────────────────────────────────────────────────────────────
  function onDown(e: React.MouseEvent) {
    if (mode !== 'draw') return;
    const { x, y } = frac(e);
    setDraft({ sx: x, sy: y, cx: x, cy: y });
  }

  function onMove(e: React.MouseEvent) {
    if (!draft) return;
    const { x, y } = frac(e);
    setDraft(d => d ? { ...d, cx: x, cy: y } : null);
  }

  function onUp(e: React.MouseEvent) {
    // Erase mode — handled by onClick on individual walls for better precision
    if (mode === 'erase') return;

    // Doors mode
    if (mode === 'doors') {
      const { x, y } = frac(e);
      const HIT = 0.04;
      const hit = ROOMS.find(r => {
        const p = getDoorPos(r.key);
        return Math.hypot(p.x - x, (p.y - y) * (W / H)) < HIT;
      });
      if (hit) {
        setSelectedRoom(k => k === hit.key ? null : hit.key);
      } else if (selectedRoom) {
        setDoors(d => ({ ...d, [selectedRoom]: { x, y } }));
      }
      return;
    }

    // Draw mode
    if (!draft) return;
    const b = norm(draft);
    if (b.x2 - b.x1 > 0.004 || b.y2 - b.y1 > 0.004) {
      counter.current++;
      const id = prefix.trim()
        ? `${prefix.trim()}_${Date.now()}`
        : `wall_${Date.now()}`;
      setWalls(ws => [...ws, { id, bounds: b }]);
    }
    setDraft(null);
  }

  // ── Save to file (permanent) ──────────────────────────────────────────────────
  async function saveMap() {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/save-map', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mapId: currentMap.id, walls, doors }),
      });
      setSaveStatus(res.ok ? 'saved' : 'error');
      if (res.ok) setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  }

  // ── Copy WALLS array ──────────────────────────────────────────────────────────
  function copyWalls() {
    const lines = walls.map(w => {
      const b = w.bounds;
      return `  { id: '${w.id}', bounds: { x1: ${b.x1.toFixed(3)}, y1: ${b.y1.toFixed(3)}, x2: ${b.x2.toFixed(3)}, y2: ${b.y2.toFixed(3)} } },`;
    });
    navigator.clipboard.writeText(
      `export const WALLS: WallDef[] = [\n${lines.join('\n')}\n];`
    ).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
  }

  const live = draft ? norm(draft) : null;

  const saveBg =
    saveStatus === 'saving' ? '#ca8a04' :
    saveStatus === 'saved'  ? '#15803d' :
    saveStatus === 'error'  ? '#b91c1c' : '#7c3aed';

  const saveLabel =
    saveStatus === 'saving' ? '…Saving' :
    saveStatus === 'saved'  ? '✓ Saved!' :
    saveStatus === 'error'  ? '✗ Error'  : '💾 Save Map';

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: '#f9fafb',
      display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
        padding: '10px 14px', background: '#1f2937', borderBottom: '1px solid #374151' }}>

        <span style={{ fontWeight: 900, fontSize: 17, marginRight: 4 }}>🗺 Wall Editor</span>

        {/* Map selector */}
        <select
          value={currentMap.id}
          onChange={e => {
            const m = MAP_REGISTRY.find(x => x.id === e.target.value);
            if (m) setCurrentMap(m);
          }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #4b5563',
            background: '#111827', color: '#fff', fontSize: 13, fontWeight: 700 }}
        >
          {MAP_REGISTRY.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <div style={{ width: 1, height: 24, background: '#4b5563', margin: '0 4px' }} />

        {/* Mode buttons */}
        {([
          ['draw',  '✏️ Draw',  '#2563eb'],
          ['erase', '🗑 Erase', '#dc2626'],
          ['doors', '🚪 Doors', '#d97706'],
        ] as const).map(([m, label, activeColor]) => (
          <button key={m} onClick={() => { setMode(m); setSelectedRoom(null); }} style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13,
            background: mode === m ? activeColor : '#374151', color: '#fff',
          }}>{label}</button>
        ))}

        {/* Name prefix (draw mode only) */}
        {mode === 'draw' && (
          <input value={prefix} onChange={e => setPrefix(e.target.value)}
            placeholder="wall name prefix…"
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #4b5563',
              background: '#111827', color: '#fff', fontSize: 12, width: 160 }} />
        )}

        <span style={{ marginLeft: 'auto', color: '#6b7280', fontSize: 12 }}>
          {walls.length} walls
        </span>

        <button onClick={() => { setWalls(DEFAULT_WALLS); setDoors({}); }}
          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12, background: '#374151', color: '#fff' }}>
          ↺ Reset
        </button>

        <button onClick={() => { setWalls([]); }}
          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12, background: '#7f1d1d', color: '#fff' }}>
          Clear Walls
        </button>

        <button onClick={copyWalls}
          style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            background: copied ? '#15803d' : '#059669', color: '#fff' }}>
          {copied ? '✓ Copied!' : '📋 Copy WALLS[]'}
        </button>

        {/* Primary save button */}
        <button onClick={saveMap} disabled={saveStatus === 'saving'}
          style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 800, fontSize: 13, background: saveBg, color: '#fff',
            boxShadow: '0 0 0 2px rgba(255,255,255,0.15)' }}>
          {saveLabel}
        </button>

        <a href="/world" style={{ padding: '6px 14px', borderRadius: 8,
          background: '#1d4ed8', color: '#fff', fontWeight: 700, fontSize: 13,
          textDecoration: 'none' }}>
          ← World
        </a>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Map canvas ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', overflow: 'auto', padding: 16 }}>
          <div
            ref={mapRef}
            style={{
              position: 'relative', width: W, height: H, flexShrink: 0,
              cursor: mode === 'draw' ? 'crosshair' : 'default',
              userSelect: 'none', boxShadow: '0 0 0 2px #374151',
            }}
            onMouseDown={onDown}
            onMouseMove={onMove}
            onMouseUp={onUp}
            onMouseLeave={() => setDraft(null)}
          >
            {/* Map image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentMap.image} draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
                display: 'block', pointerEvents: 'none' }} />

            {/* SVG overlay */}
            <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>

              {/* Wall rectangles */}
              {walls.map(w => {
                const x  = w.bounds.x1 * W;
                const y  = w.bounds.y1 * H;
                const bw = Math.max(2, (w.bounds.x2 - w.bounds.x1) * W);
                const bh = Math.max(2, (w.bounds.y2 - w.bounds.y1) * H);
                const isHovered = hoveredWallId === w.id;

                return (
                  <g key={w.id} 
                    style={{ cursor: mode === 'erase' ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoveredWallId(w.id)}
                    onMouseLeave={() => setHoveredWallId(null)}
                    onClick={(e) => {
                      if (mode === 'erase') {
                        e.stopPropagation();
                        setWalls(ws => ws.filter(x => x.id !== w.id));
                      }
                    }}
                  >
                    <rect x={x} y={y} width={bw} height={bh}
                      fill={isHovered ? 'rgba(239,68,68,0.7)' : mode === 'erase' ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.2)'}
                      stroke={isHovered ? '#fff' : '#ef4444'} 
                      strokeWidth={isHovered ? 3 : 2} 
                      style={{ transition: 'all 0.1s' }}
                    />
                    {/* Always show small label above or inside */}
                    <g transform={`translate(${x + bw/2}, ${y > 15 ? y - 4 : y + bh + 10})`}>
                      <rect x={-(w.id.length * 3) - 4} y={-8} width={w.id.length * 6 + 8} height={12} 
                        rx={4} fill={isHovered ? '#ef4444' : '#1f2937'} />
                      <text textAnchor="middle" fontSize={8} fontWeight={900} fill="#fff" style={{ pointerEvents: 'none' }}>
                        {w.id}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Door circles (Doors mode) */}
              {mode === 'doors' && ROOMS.map(r => {
                const pos = getDoorPos(r.key);
                const cx  = pos.x * W;
                const cy  = pos.y * H;
                const sel = selectedRoom === r.key;
                return (
                  <g key={r.key} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r={sel ? 14 : 9}
                      fill={sel ? '#f59e0b' : 'rgba(251,191,36,0.85)'}
                      stroke="#fff" strokeWidth={sel ? 3 : 1.5} />
                    <text x={cx} y={cy - 16} textAnchor="middle" fontSize={9}
                      fill="#fff" style={{ pointerEvents: 'none', fontWeight: 700 }}>
                      {r.emoji} {r.label}
                    </text>
                    {sel && (
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={8}
                        fill="#1c1917" style={{ pointerEvents: 'none', fontWeight: 900 }}>
                        click to move
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Live draw preview */}
              {live && (
                <rect
                  x={live.x1 * W} y={live.y1 * H}
                  width={(live.x2 - live.x1) * W} height={(live.y2 - live.y1) * H}
                  fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth={2}
                  strokeDasharray="6 3" style={{ pointerEvents: 'none' }} />
              )}
            </svg>

            {/* Live coordinate readout */}
            {live && (
              <div style={{ position: 'absolute', bottom: 8, left: 8, pointerEvents: 'none',
                background: 'rgba(0,0,0,0.88)', color: '#e5e7eb', fontFamily: 'monospace',
                fontSize: 11, padding: '7px 11px', borderRadius: 6, lineHeight: 1.8 }}>
                x1: <b style={{ color: '#93c5fd' }}>{live.x1.toFixed(3)}</b>
                {'  '}y1: <b style={{ color: '#93c5fd' }}>{live.y1.toFixed(3)}</b><br />
                x2: <b style={{ color: '#86efac' }}>{live.x2.toFixed(3)}</b>
                {'  '}y2: <b style={{ color: '#86efac' }}>{live.y2.toFixed(3)}</b>
              </div>
            )}

            {/* Selected door indicator */}
            {mode === 'doors' && selectedRoom && (
              <div style={{ position: 'absolute', top: 8, right: 8, pointerEvents: 'none',
                background: 'rgba(217,119,6,0.92)', color: '#fff', fontSize: 12,
                padding: '5px 12px', borderRadius: 6, fontWeight: 700 }}>
                Moving: {ROOMS.find(r => r.key === selectedRoom)?.emoji}{' '}
                {ROOMS.find(r => r.key === selectedRoom)?.label} — click to place
              </div>
            )}

            {/* Mode hint */}
            <div style={{ position: 'absolute', top: 8, left: 8, pointerEvents: 'none',
              background: 'rgba(0,0,0,0.7)', color: '#d1d5db', fontSize: 11,
              padding: '4px 10px', borderRadius: 6 }}>
              {mode === 'draw'  ? 'Click + drag to draw a wall'
               : mode === 'erase' ? 'Click a red rectangle to delete'
               : selectedRoom    ? 'Click anywhere to move the door'
               : 'Click a yellow circle to select a door'}
            </div>
          </div>
        </div>

        {/* ── Side panel ──────────────────────────────────────────────────────── */}
        <div style={{ width: 260, background: '#1a1a2e', borderLeft: '1px solid #374151',
          overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Save info */}
          <div style={{ background: '#1f2937', borderRadius: 8, padding: 10, fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>
            <b style={{ color: '#a78bfa' }}>💾 Save Map</b> writes permanently to<br />
            <code style={{ color: '#86efac' }}>public/maps/{currentMap.id}.json</code><br />
            Works on every device. Add future maps in<br />
            <code style={{ color: '#86efac' }}>src/lib/map-registry.ts</code>
          </div>

          {/* Walls list */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', marginBottom: 6,
              letterSpacing: '0.07em', textTransform: 'uppercase' }}>
              Walls ({walls.length})
            </div>
            {walls.map(w => (
              <div key={w.id} 
                onMouseEnter={() => setHoveredWallId(w.id)}
                onMouseLeave={() => setHoveredWallId(null)}
                style={{ 
                  display: 'flex', alignItems: 'flex-start',
                  justifyContent: 'space-between', 
                  background: hoveredWallId === w.id ? '#374151' : '#1f2937', 
                  borderRadius: 6,
                  padding: '5px 8px', marginBottom: 3,
                  transition: 'background 0.1s',
                  border: hoveredWallId === w.id ? '1px solid #f87171' : '1px solid transparent'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 10, color: '#f87171' }}>{w.id}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b7280', marginTop: 1, lineHeight: 1.6 }}>
                    ({w.bounds.x1.toFixed(3)}, {w.bounds.y1.toFixed(3)})<br />
                    ({w.bounds.x2.toFixed(3)}, {w.bounds.y2.toFixed(3)})
                  </div>
                </div>
                <button onClick={() => setWalls(ws => ws.filter(x => x.id !== w.id))}
                  style={{ background: 'none', border: 'none', color: '#ef4444',
                    cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Doors list */}
          {Object.keys(doors).length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#6b7280', marginBottom: 6,
                letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Door Overrides ({Object.keys(doors).length})
              </div>
              {Object.entries(doors).map(([key, pos]) => {
                const room = ROOMS.find(r => r.key === key);
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', background: '#1f2937', borderRadius: 6,
                    padding: '5px 8px', marginBottom: 3 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 10, color: '#fbbf24' }}>
                        {room?.emoji} {room?.label}
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b7280' }}>
                        x: {pos.x.toFixed(3)}  y: {pos.y.toFixed(3)}
                      </div>
                    </div>
                    <button onClick={() => setDoors(d => {
                      const next = { ...d }; delete next[key]; return next;
                    })} style={{ background: 'none', border: 'none', color: '#ef4444',
                      cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
