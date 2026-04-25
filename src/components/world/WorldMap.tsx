"use client";

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Joystick } from './Joystick';
import { WalkingCharacter, CHAR_H, CHAR_HW } from './WalkingCharacter';
import { RoomEntryModal } from './RoomEntryModal';
import { useAvatarStore } from '@/store/useAvatarStore';
import { COLORS, ACCESSORIES } from '@/lib/avatar-items';
import {
  ROOMS, WALLS as DEFAULT_WALLS, MAP_W, MAP_H, DOOR_RADIUS,
  DEFAULT_HIDDEN_SPOTS, HiddenSpotDef,
} from '@/lib/rooms';
import { playSound } from '@/lib/sounds';
import { gameAudio } from '@/lib/game-audio';

const COLLISION_R = 4; // tight collision radius (map units) — keeps character flush with walls
import type { RoomDef, WallDef } from '@/lib/rooms';
import { HiddenSpotModal } from './HiddenSpotModal';
import { useWorldStore, RoomKey } from '@/store/useWorldStore';
import { getGlobalConfig } from '@/lib/wallet';

// ── Constants ─────────────────────────────────────────────────────────────────

const ZOOM = 2;     // map renders at 2× the fit-to-screen scale
const SPEED = 1.1;   // map units per frame at 60 fps
const FRAME_MS = 160;   // ms per walk animation frame
const SPAWN_X = MAP_W * 0.50;
const SPAWN_Y = MAP_H * 0.54;
import { DEFAULT_MAP_ID } from '@/lib/map-registry';


type DoorOverrides = Record<string, { x: number; y: number }>;

async function fetchMapConfig(mapId: string) {
  try {
    const r = await fetch(`/maps/${mapId}.json?t=${Date.now()}`);
    if (!r.ok) return null;
    return await r.json() as { walls: WallDef[]; doors: DoorOverrides; hiddenSpots?: HiddenSpotDef[] };
  } catch { return null; }
}

function findNearbyRoom(x: number, y: number, overrides: DoorOverrides): RoomDef | null {
  for (const room of ROOMS) {
    const door = overrides[room.key] ?? room.door;
    const dx = x - door.x * MAP_W;
    const dy = y - door.y * MAP_H;
    if (dx * dx + dy * dy <= DOOR_RADIUS * DOOR_RADIUS) return room;
  }
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}


function checkCollision(x: number, y: number, walls: WallDef[]): boolean {
  for (const w of walls) {
    const x1 = w.bounds.x1 * MAP_W, y1 = w.bounds.y1 * MAP_H;
    const x2 = w.bounds.x2 * MAP_W, y2 = w.bounds.y2 * MAP_H;
    const cx = Math.max(x1, Math.min(x, x2));
    const cy = Math.max(y1, Math.min(y, y2));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= COLLISION_R * COLLISION_R) return true;
  }
  return false;
}

// ── Wall overlay ──────────────────────────────────────────────────────────────

function WallOverlay({ walls, mw, mh, show }: {
  walls: WallDef[]; mw: number; mh: number; show: boolean;
}) {
  if (!show) return null;
  return (
    <svg className="absolute inset-0 pointer-events-none" width={mw} height={mh} style={{ zIndex: 5 }}>
      {walls.map(w => (
        <rect key={w.id}
          x={w.bounds.x1 * mw} y={w.bounds.y1 * mh}
          width={(w.bounds.x2 - w.bounds.x1) * mw}
          height={(w.bounds.y2 - w.bounds.y1) * mh}
          fill="rgba(239,68,68,0.18)" stroke="rgba(239,68,68,0.8)" strokeWidth={2}
        />
      ))}
      {/* Door markers shown in wall overlay are the static defaults only */}
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorldMap({ onBack, mapId: mapIdProp }: { onBack: () => void; mapId?: string }) {
  const activeMapId = mapIdProp ?? DEFAULT_MAP_ID;
  const { playerName, playBits, completedRooms, currentMissionIndex, resetProgress, foundSecrets } = useWorldStore();

  const MISSION_SEQUENCE: RoomKey[] = [
    'math', 'science', 'computer', 'robotics', 'library', 'history',
    'language_arts', 'reading', 'art', 'music', 'kitchen', 'cafeteria'
  ];
  const currentMissionKey = MISSION_SEQUENCE[currentMissionIndex] || null;
  const currentRoom = ROOMS.find(r => r.key === currentMissionKey);

  // DOM refs
  const outerRef = useRef<HTMLDivElement>(null);  // clipping viewport
  const mapContainerRef = useRef<HTMLDivElement>(null); // panned by camera
  const charRef = useRef<HTMLDivElement>(null);

  // Game state refs — never cause re-renders
  const posRef = useRef({ x: SPAWN_X, y: SPAWN_Y });
  const joyRef = useRef({ x: 0, y: 0 });
  const frameIdx = useRef(1);
  const lastFrameTs = useRef(0);
  const dirRef = useRef(1);
  const nearbyKey = useRef('');
  const scaleRef = useRef(1);
  const viewportRef = useRef({ w: 800, h: 600 });
  const wallsRef = useRef<WallDef[]>(DEFAULT_WALLS);
  const doorsRef = useRef<DoorOverrides>({});

  // React state — UI overlays only
  const [scale, setScale] = useState(1);
  const [activeWalls, setActiveWalls] = useState<WallDef[]>(DEFAULT_WALLS);
  const [nearbyRoom, setNearbyRoom] = useState<RoomDef | null>(null);
  const [enteredRoom, setEnteredRoom] = useState<RoomDef | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [activeSecret, setActiveSecret] = useState<HiddenSpotDef | null>(null);
  const [nearbySecretId, setNearbySecretId] = useState<string>('');
  const hiddenSpotsRef = useRef<HiddenSpotDef[]>(DEFAULT_HIDDEN_SPOTS);
  const nearbySecretRef = useRef<string>(''); // id of spot currently in range
  const allMissionsComplete = currentMissionIndex >= MISSION_SEQUENCE.length;
  const [showWalls, setShowWalls] = useState(true);
  const [wallEditorEnabled, setWallEditorEnabled] = useState(false);
  const disabledRoomsRef = useRef<Set<string>>(new Set());
  const [muted, setMuted] = useState(false);
  const { colorId, equippedId } = useAvatarStore();
  const colorFilter = COLORS.find(c => c.id === colorId)?.filter ?? '';
  const accessoryEmoji = ACCESSORIES.find(a => a.id === equippedId)?.emoji;

  // ── Music ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    gameAudio.startMusic();
    return () => gameAudio.stopMusic();
  }, []);

  // ── Show completion screen when all missions done ────────────────────────
  useEffect(() => {
    if (currentMissionIndex >= MISSION_SEQUENCE.length && completedRooms.size >= MISSION_SEQUENCE.length) {
      setShowCompletion(true);
    }
  }, [currentMissionIndex, completedRooms.size]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load map config — JSON file first, localStorage fallback ────────────────
  useEffect(() => {
    getGlobalConfig('wall_editor_enabled').then(cfg => {
      console.log('Wall Editor Config:', cfg);
      const enabled = !!(cfg && cfg[activeMapId]);
      console.log(`Wall Editor for ${activeMapId}:`, enabled);
      setWallEditorEnabled(enabled);
    });

    getGlobalConfig('game_settings').then(cfg => {
      if (cfg) {
        disabledRoomsRef.current = new Set(
          Object.entries(cfg).filter(([, v]) => v === false).map(([k]) => k)
        );
      }
    });

    fetchMapConfig(activeMapId).then(data => {
      if (data) {
        if (data.walls) { wallsRef.current = data.walls; setActiveWalls(data.walls); }
        if (data.doors) { doorsRef.current = data.doors; }
        if (data.hiddenSpots) { hiddenSpotsRef.current = data.hiddenSpots; }
      } else {
        // JSON not saved yet — recover from localStorage
        try {
          const w = localStorage.getItem('playwise_walls');
          const d = localStorage.getItem('playwise_doors');
          if (w) { const walls = JSON.parse(w); wallsRef.current = walls; setActiveWalls(walls); }
          if (d) { doorsRef.current = JSON.parse(d); }
        } catch { /* use defaults */ }
      }
    });
  }, []);

  // ── Viewport size + base scale ──────────────────────────────────────────────
  useEffect(() => {
    function update() {
      const el = outerRef.current;
      if (!el) return;
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      viewportRef.current = { w: vw, h: vh };
      const s = Math.min(vw / MAP_W, vh / MAP_H);
      scaleRef.current = s;
      setScale(s);
    }
    update();
    const ro = new ResizeObserver(update);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Core: position character + update camera (called every RAF frame) ───────
  const positionChar = useCallback((
    x: number, y: number, frame: number, dir: number, s: number
  ) => {
    const mapPx = MAP_W * s * ZOOM;   // total zoomed map width in px
    const mapPy = MAP_H * s * ZOOM;   // total zoomed map height in px
    const charPx = x * s * ZOOM;      // char position in zoomed px
    const charPy = y * s * ZOOM;

    // ── Character ──────────────────────────────────────────────────────────
    const charEl = charRef.current;
    if (charEl) {
      charEl.style.left = `${charPx - CHAR_HW}px`;
      charEl.style.top = `${charPy - CHAR_H}px`;
      charEl.style.transform = `scaleX(${dir})`;
      const imgs = charEl.querySelectorAll<HTMLImageElement>('img');
      imgs.forEach((img, i) => { img.style.display = i === frame ? 'block' : 'none'; });
    }

    // ── Camera: translate map so character stays at viewport centre ─────────
    const mapEl = mapContainerRef.current;
    if (mapEl) {
      const { w: vw, h: vh } = viewportRef.current;
      // Clamp so map edges don't show beyond the green background
      const tx = clamp(vw / 2 - charPx, vw - mapPx, 0);
      const ty = clamp(vh / 2 - charPy, vh - mapPy, 0);
      mapEl.style.transform = `translate(${tx}px, ${ty}px)`;
    }
  }, []);

  // Set spawn position before first paint
  useLayoutEffect(() => {
    positionChar(SPAWN_X, SPAWN_Y, 1, 1, scaleRef.current);
  }, [positionChar]);

  // ── Keyboard input ──────────────────────────────────────────────────────────
  useEffect(() => {
    const keys = new Set<string>();
    function sync() {
      joyRef.current = {
        x: (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0),
        y: (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0),
      };
    }
    const dn = (e: KeyboardEvent) => { keys.add(e.key); sync(); };
    const up = (e: KeyboardEvent) => { keys.delete(e.key); sync(); };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  // ── RAF game loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;

    function tick(ts: number) {
      const { x: jx, y: jy } = joyRef.current;
      const moving = Math.abs(jx) > 0.05 || Math.abs(jy) > 0.05;
      const s = scaleRef.current;

      if (moving) {
        if (jx > 0.08) dirRef.current = 1;
        if (jx < -0.08) dirRef.current = -1;

        const len = Math.sqrt(jx * jx + jy * jy);
        const nx = len > 1 ? jx / len : jx;
        const ny = len > 1 ? jy / len : jy;
        const ox = posRef.current.x;
        const oy = posRef.current.y;

        const walls = wallsRef.current;
        const newX = checkCollision(ox + nx * SPEED, oy, walls) ? ox : ox + nx * SPEED;
        const newY = checkCollision(newX, oy + ny * SPEED, walls) ? oy : oy + ny * SPEED;

        posRef.current.x = clamp(newX, COLLISION_R, MAP_W - COLLISION_R);
        posRef.current.y = clamp(newY, COLLISION_R, MAP_H - COLLISION_R);

        if (ts - lastFrameTs.current > FRAME_MS) {
          frameIdx.current = (frameIdx.current + 1) % 3;
          lastFrameTs.current = ts;
          playSound('walk');
        }
      } else {
        frameIdx.current = 1;
      }

      positionChar(posRef.current.x, posRef.current.y, frameIdx.current, dirRef.current, s);

      // Door proximity — uses overridden positions if set in the editor
      const rawFound = findNearbyRoom(posRef.current.x, posRef.current.y, doorsRef.current);
      const found = rawFound && !disabledRoomsRef.current.has(rawFound.key) ? rawFound : null;
      const fk = found?.key ?? '';
      if (fk !== nearbyKey.current) {
        if (found) playSound('whomb');
        nearbyKey.current = fk;
        setNearbyRoom(found);
      }

      // Hidden spot proximity — only active after all missions complete
      if (useWorldStore.getState().currentMissionIndex >= MISSION_SEQUENCE.length) {
        const SECRET_R = 36;
        const px = posRef.current.x, py = posRef.current.y;
        const nearby = hiddenSpotsRef.current.find(sp => {
          const dx = px - sp.x * MAP_W, dy = py - sp.y * MAP_H;
          return dx * dx + dy * dy <= SECRET_R * SECRET_R;
        });
        const nearbyId = nearby?.id ?? '';
        if (nearbyId !== nearbySecretRef.current) {
          if (nearby) playSound('whomb');
          nearbySecretRef.current = nearbyId;
          setNearbySecretId(nearbyId);
        }
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [positionChar]);

  const handleJoystick = useCallback((x: number, y: number) => {
    joyRef.current = { x, y };
  }, []);

  const mapDisplayW = MAP_W * scale * ZOOM;
  const mapDisplayH = MAP_H * scale * ZOOM;

  return (
    // Outer: clips the oversized map
    <div
      ref={outerRef}
      className="relative w-full h-screen overflow-hidden"
      style={{ background: '#1a2e1a' }}
      onPointerDown={() => gameAudio.resume()}
    >
      {/* Map container — moved by camera transform */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: mapDisplayW,
          height: mapDisplayH,
          willChange: 'transform',
        }}
      >
        {/* Floor map */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/maps/floor_map.png"
          alt=""
          draggable={false}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'fill',
            userSelect: 'none',
            zIndex: 1,
          }}
        />

        {/* Wall overlay */}
        <WallOverlay walls={activeWalls} mw={mapDisplayW} mh={mapDisplayH} show={showWalls && wallEditorEnabled} />

        {/* Door rings — use overridden positions when set in editor */}
        {ROOMS.map(room => {
          const door = doorsRef.current[room.key] ?? room.door;
          const done = completedRooms.has(room.key);
          return (
            <div key={room.key} style={{
              position: 'absolute',
              left: door.x * mapDisplayW - 14,
              top: door.y * mapDisplayH - 14,
              width: 28, height: 28, zIndex: 6,
              pointerEvents: 'none',
            }}>
              <div className={`w-full h-full rounded-full border-2 flex items-center justify-center
                text-xs font-bold animate-pulse
                ${done ? 'border-emerald-400 bg-emerald-400/25 text-emerald-300'
                  : 'border-yellow-300 bg-yellow-300/20 text-yellow-300'}`}>
                {done ? '✓' : ''}
              </div>
            </div>
          );
        })}

        {/* Character */}
        <WalkingCharacter
          ref={charRef}
          playerName={playerName}
          colorFilter={colorFilter}
          accessoryEmoji={accessoryEmoji}
        />
      </div>

      {/* ── HUD (fixed over the viewport, not inside the map) ── */}
      <div className="absolute top-4 left-4 right-4 flex flex-col gap-3 z-30 pointer-events-none">

        {/* Top Bar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button onClick={onBack}
              className="bg-black/55 hover:bg-black/75 text-white font-bold px-3 py-2 rounded-xl text-sm backdrop-blur-sm">
              ← Back
            </button>
            <div className="bg-black/55 text-white font-black px-3 py-2 rounded-xl text-sm backdrop-blur-sm">
              {playerName}
            </div>
            <button onClick={() => setMuted(gameAudio.toggleMute())} title="Mute/Unmute"
              className="bg-black/55 hover:bg-black/75 text-white/70 px-2 py-2 rounded-xl text-xs backdrop-blur-sm">
              {muted ? '🔇' : '🔊'}
            </button>
            {wallEditorEnabled && (
              <>
                <button onClick={() => setShowWalls(v => !v)} title="Toggle wall borders"
                  className="bg-black/55 hover:bg-black/75 text-white/70 px-2 py-2 rounded-xl text-xs backdrop-blur-sm">
                  {showWalls ? '🧱' : '👁'}
                </button>
                <a href="/wall-editor"
                  className="bg-black/55 hover:bg-black/75 text-white/70 px-2 py-2 rounded-xl text-xs backdrop-blur-sm no-underline">
                  ✏️ Walls
                </a>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <a href="/shop"
              className="bg-violet-600 hover:bg-violet-500 text-white font-black px-3 py-2 rounded-xl text-sm backdrop-blur-sm transition-colors no-underline">
              🛒 Shop
            </a>
            <div className="flex items-center gap-1.5 bg-black/55 text-yellow-400 font-black px-3 py-2 rounded-xl text-sm backdrop-blur-sm">
              <span>🪙</span><span>{playBits}</span>
            </div>
          </div>
        </div>

        {/* Mission Control (Center Top) */}
        <div className="self-center flex flex-col items-center gap-1 max-w-md w-full">
          <motion.div
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-white/90 backdrop-blur-md border-b-4 border-violet-500 rounded-2xl px-6 py-3 shadow-2xl w-full text-center pointer-events-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase text-violet-500 tracking-[0.2em]">Current Mission</span>
              <span className="h-1 w-1 rounded-full bg-violet-300" />
              <span className="text-[10px] font-black text-slate-400">{currentMissionIndex + 1} / {MISSION_SEQUENCE.length}</span>
            </div>
            {currentRoom ? (
              <h3 className="text-slate-800 font-black text-sm sm:text-base leading-tight">
                {currentRoom.mission}
              </h3>
            ) : (
              <h3 className="text-emerald-600 font-black text-base">
                🎉 All Missions Complete!
              </h3>
            )}
          </motion.div>
          {currentRoom && (
            <div className="text-[10px] font-black text-white bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
              Find the {currentRoom.label} {currentRoom.emoji}
            </div>
          )}
          {/* Secret spots hint bar */}
          {allMissionsComplete && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-black text-violet-200 bg-violet-900/60 border border-violet-500/30 px-4 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
              <span>✨</span>
              <span>{foundSecrets.size} / {hiddenSpotsRef.current.length} secrets found</span>
              <span>— listen for the whomb sound!</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Room entry prompt */}
      {nearbyRoom && !enteredRoom && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={() => {
              setEnteredRoom(nearbyRoom);
              // Start the music transition immediately
              const MISSION_SEQUENCE: RoomKey[] = [
                'math', 'science', 'computer', 'robotics', 'library', 'history',
                'language_arts', 'reading', 'art', 'music', 'kitchen', 'cafeteria'
              ];
              if (MISSION_SEQUENCE[currentMissionIndex] === nearbyRoom.key && !completedRooms.has(nearbyRoom.key)) {
                gameAudio.setTheme('challenging');
              }
            }}
            className={`bg-gradient-to-r ${nearbyRoom.color} text-white font-black px-6 py-3
              rounded-2xl shadow-xl text-base flex items-center gap-2
              hover:scale-105 active:scale-95 transition-transform`}>
            <span className="text-xl">{nearbyRoom.emoji}</span> Enter {nearbyRoom.label}
          </button>
        </div>
      )}

      <div className="absolute bottom-4 left-6 text-white/30 text-xs z-30 pointer-events-none">
        WASD / arrows or joystick
      </div>

      <div className="absolute bottom-20 left-6 z-30">
        <Joystick onMove={handleJoystick} size={120} />
      </div>

      {/* Secret spot entry prompt */}
      {allMissionsComplete && nearbySecretId && !activeSecret && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={() => {
              const spot = hiddenSpotsRef.current.find(s => s.id === nearbySecretRef.current);
              if (spot) setActiveSecret(spot);
            }}
            className="bg-gradient-to-r from-violet-600 to-purple-700 text-white font-black px-6 py-3 rounded-2xl shadow-xl text-base flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform border border-violet-400/30">
            ✨ Investigate Secret Spot
          </button>
        </div>
      )}

      {enteredRoom && (
        <RoomEntryModal room={enteredRoom} onClose={() => setEnteredRoom(null)} />
      )}

      {activeSecret && (
        <HiddenSpotModal spot={activeSecret} onClose={() => setActiveSecret(null)} />
      )}

      {/* ── All-done completion modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30, opacity: 0 }}
              animate={{ scale: 1,    y: 0,  opacity: 1 }}
              exit={{   scale: 0.85, y: 30,  opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm text-center overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8">
                <div className="text-7xl mb-2">🏆</div>
                <h2 className="text-white font-black text-2xl">Adventure Complete!</h2>
                <p className="text-white/80 text-sm mt-1">You explored all 12 rooms!</p>
                <div className="flex items-center justify-center gap-2 mt-4 bg-white/20 rounded-2xl py-3">
                  <span className="text-2xl">🪙</span>
                  <span className="text-yellow-200 font-black text-2xl">{playBits}</span>
                  <span className="text-white/70 text-sm font-semibold">PlayBits earned</span>
                </div>
              </div>

              {/* Options */}
              <div className="p-6 space-y-3">
                <p className="text-slate-500 text-sm font-medium mb-4">What would you like to do?</p>

                <button
                  onClick={() => {
                    resetProgress();
                    setShowCompletion(false);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black rounded-2xl hover:scale-105 transition-transform shadow-lg text-sm"
                >
                  🔄 New Adventure — Reset & Play Again
                </button>

                <button
                  onClick={() => setShowCompletion(false)}
                  className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black rounded-2xl transition-colors text-sm border border-emerald-100"
                >
                  🗺️ Keep Exploring — Stay in the World
                </button>

                <button
                  onClick={onBack}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-colors text-sm"
                >
                  🏠 Back to Lobby
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
