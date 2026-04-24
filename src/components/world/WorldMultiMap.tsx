"use client";

/**
 * WorldMultiMap — the solo WorldMap extended with:
 *   - Remote player rendering (interpolated)
 *   - Position broadcasting (throttled to 80ms)
 *   - Round timer HUD
 *   - Team score HUD
 *   - Cooperative room entry (records answer to DB for rewards)
 */

import { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Joystick } from './Joystick';
import { WalkingCharacter, CHAR_H, CHAR_HW } from './WalkingCharacter';
import { RoomEntryModal } from './RoomEntryModal';
import { HiddenSpotModal } from './HiddenSpotModal';
import { useAvatarStore } from '@/store/useAvatarStore';
import { COLORS, ACCESSORIES } from '@/lib/avatar-items';
import {
  ROOMS, WALLS as DEFAULT_WALLS, MAP_W, MAP_H, DOOR_RADIUS,
  DEFAULT_HIDDEN_SPOTS, HiddenSpotDef,
} from '@/lib/rooms';
import { playSound } from '@/lib/sounds';
import { gameAudio } from '@/lib/game-audio';
import type { RoomDef, WallDef } from '@/lib/rooms';
import { useWorldStore, RoomKey } from '@/store/useWorldStore';
import { useWorldMultiStore, RemotePlayer } from '@/store/useWorldMultiStore';
import { getGlobalConfig } from '@/lib/wallet';
import { DEFAULT_MAP_ID } from '@/lib/map-registry';
import {
  subscribeToRoom, broadcastPosition, finishWorldRoom,
  recordWorldAnswer, ROUND_DURATION_SEC,
} from '@/lib/worldMultiplayer';
import { addCoins } from '@/lib/wallet';

const COLLISION_R = 4;
const ZOOM = 2;
const SPEED = 0.7;
const FRAME_MS = 160;
const SPAWN_X = MAP_W * 0.50;
const SPAWN_Y = MAP_H * 0.54;
const INTERP_SPEED = 0.18; // lerp factor per frame (0–1)

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
    const dx = x - door.x * MAP_W, dy = y - door.y * MAP_H;
    if (dx * dx + dy * dy <= DOOR_RADIUS * DOOR_RADIUS) return room;
  }
  return null;
}

function clamp(v: number, lo: number, hi: number) { return v < lo ? lo : v > hi ? hi : v; }

function checkCollision(x: number, y: number, walls: WallDef[]): boolean {
  for (const w of walls) {
    const x1 = w.bounds.x1 * MAP_W, y1 = w.bounds.y1 * MAP_H;
    const x2 = w.bounds.x2 * MAP_W, y2 = w.bounds.y2 * MAP_H;
    const cx = Math.max(x1, Math.min(x, x2)), cy = Math.max(y1, Math.min(y, y2));
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= COLLISION_R * COLLISION_R) return true;
  }
  return false;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function formatTime(sec: number) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Remote player sprite ──────────────────────────────────────────────────────

function RemoteSprite({ p, scale }: { p: RemotePlayer; scale: number }) {
  const color = COLORS.find(c => c.id === p.color_id);
  const acc   = ACCESSORIES.find(a => a.id === p.equipped_id);
  const px = p.renderX * scale * ZOOM;
  const py = p.renderY * scale * ZOOM;

  return (
    <div style={{
      position: 'absolute',
      left: px - CHAR_HW,
      top:  py - CHAR_H,
      transform: `scaleX(${p.dir})`,
      pointerEvents: 'none',
      zIndex: 4,
    }}>
      {/* Name tag */}
      <div style={{
        position: 'absolute', bottom: '100%', left: '50%',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.65)',
        color: '#fff', fontSize: 9, fontWeight: 900,
        padding: '2px 6px', borderRadius: 8, marginBottom: 2,
        backdropFilter: 'blur(4px)',
      }}>
        {acc?.emoji ?? ''} {p.player_name}
      </div>
      {/* Character */}
      <img
        src={`/character/walk${p.frame + 1}.png`}
        alt={p.player_name}
        draggable={false}
        style={{ height: CHAR_H, filter: color?.filter ?? '', opacity: 0.92 }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  roomCode: string;
  mapId?:   string;
  onBack:   () => void;
}

export function WorldMultiMap({ roomCode, mapId: mapIdProp, onBack }: Props) {
  const activeMapId = mapIdProp ?? DEFAULT_MAP_ID;
  const { playerName, playBits, completedRooms, currentMissionIndex, foundSecrets } = useWorldStore();
  const { colorId, equippedId } = useAvatarStore();
  const color = COLORS.find(c => c.id === colorId);
  const {
    remotePos, upsertRemotePos, teamScore, setTeamScore,
    roundTimeLeft, setRoundTimeLeft, room, setRoom,
  } = useWorldMultiStore();

  const MISSION_SEQUENCE: RoomKey[] = [
    'math','science','computer','robotics','library','history',
    'language_arts','reading','art','music','kitchen','cafeteria',
  ];

  // DOM refs
  const outerRef        = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const charRef         = useRef<HTMLDivElement>(null);

  // Game state refs
  const posRef       = useRef({ x: SPAWN_X, y: SPAWN_Y });
  const joyRef       = useRef({ x: 0, y: 0 });
  const frameIdx     = useRef(1);
  const lastFrameTs  = useRef(0);
  const dirRef       = useRef(1);
  const nearbyKey    = useRef('');
  const scaleRef     = useRef(1);
  const viewportRef  = useRef({ w: 800, h: 600 });
  const wallsRef     = useRef<WallDef[]>(DEFAULT_WALLS);
  const doorsRef     = useRef<DoorOverrides>({});
  const hiddenSpotsRef = useRef<HiddenSpotDef[]>(DEFAULT_HIDDEN_SPOTS);
  const disabledRoomsRef = useRef<Set<string>>(new Set());
  const nearbySecretRef = useRef('');

  // React state
  const [scale,        setScale]        = useState(1);
  const [activeWalls,  setActiveWalls]  = useState<WallDef[]>(DEFAULT_WALLS);
  const [nearbyRoom,   setNearbyRoom]   = useState<RoomDef | null>(null);
  const [enteredRoom,  setEnteredRoom]  = useState<RoomDef | null>(null);
  const [activeSecret, setActiveSecret] = useState<HiddenSpotDef | null>(null);
  const [nearbySecretId, setNearbySecretId] = useState('');
  const [muted,        setMuted]        = useState(false);
  const [showResults,  setShowResults]  = useState(false);
  const allMissionsComplete = currentMissionIndex >= MISSION_SEQUENCE.length;

  // Round timer
  useEffect(() => {
    if (!room?.end_time) return;
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(room.end_time!).getTime() - Date.now()) / 1000));
      setRoundTimeLeft(left);
      if (left === 0) {
        clearInterval(interval);
        setShowResults(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [room?.end_time]); // eslint-disable-line react-hooks/exhaustive-deps

  // Music
  useEffect(() => {
    gameAudio.startMusic();
    return () => gameAudio.stopMusic();
  }, []);

  // Load map + game settings
  useEffect(() => {
    getGlobalConfig('game_settings').then(cfg => {
      if (cfg) disabledRoomsRef.current = new Set(
        Object.entries(cfg).filter(([,v]) => v === false).map(([k]) => k)
      );
    });
    fetchMapConfig(activeMapId).then(data => {
      if (data) {
        if (data.walls)       { wallsRef.current = data.walls; setActiveWalls(data.walls); }
        if (data.doors)       { doorsRef.current = data.doors; }
        if (data.hiddenSpots) { hiddenSpotsRef.current = data.hiddenSpots; }
      }
    });
  }, [activeMapId]);

  // Realtime subscription
  useEffect(() => {
    const unsub = subscribeToRoom(
      roomCode,
      updatedRoom => {
        setRoom(updatedRoom);
        if (updatedRoom.team_score !== undefined) setTeamScore(updatedRoom.team_score);
        if (updatedRoom.status === 'finished') setShowResults(true);
      },
      () => {},      // players list changes — not needed in-game
      tick => {
        if (tick.player_name !== playerName) upsertRemotePos(tick);
      },
    );
    return unsub;
  }, [roomCode, playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Viewport resize
  useEffect(() => {
    function update() {
      const el = outerRef.current; if (!el) return;
      const vw = el.clientWidth, vh = el.clientHeight;
      viewportRef.current = { w: vw, h: vh };
      const s = Math.min(vw / MAP_W, vh / MAP_H);
      scaleRef.current = s; setScale(s);
    }
    update();
    const ro = new ResizeObserver(update);
    if (outerRef.current) ro.observe(outerRef.current);
    return () => ro.disconnect();
  }, []);

  const positionChar = useCallback((x: number, y: number, frame: number, dir: number, s: number) => {
    const mapPx = MAP_W * s * ZOOM, mapPy = MAP_H * s * ZOOM;
    const charPx = x * s * ZOOM, charPy = y * s * ZOOM;
    const charEl = charRef.current;
    if (charEl) {
      charEl.style.left = `${charPx - CHAR_HW}px`;
      charEl.style.top  = `${charPy - CHAR_H}px`;
      charEl.style.transform = `scaleX(${dir})`;
      charEl.querySelectorAll<HTMLImageElement>('img').forEach((img, i) => {
        img.style.display = i === frame ? 'block' : 'none';
      });
    }
    const mapEl = mapContainerRef.current;
    if (mapEl) {
      const { w: vw, h: vh } = viewportRef.current;
      mapEl.style.transform = `translate(${clamp(vw/2-charPx,vw-mapPx,0)}px,${clamp(vh/2-charPy,vh-mapPy,0)}px)`;
    }
  }, []);

  useLayoutEffect(() => { positionChar(SPAWN_X, SPAWN_Y, 1, 1, scaleRef.current); }, [positionChar]);

  // Keyboard
  useEffect(() => {
    const keys = new Set<string>();
    function sync() {
      joyRef.current = {
        x: (keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),
        y: (keys.has('ArrowDown') ||keys.has('s')?1:0)-(keys.has('ArrowUp')  ||keys.has('w')?1:0),
      };
    }
    const dn=(e:KeyboardEvent)=>{keys.add(e.key);sync();};
    const up=(e:KeyboardEvent)=>{keys.delete(e.key);sync();};
    window.addEventListener('keydown',dn); window.addEventListener('keyup',up);
    return ()=>{window.removeEventListener('keydown',dn);window.removeEventListener('keyup',up);};
  }, []);

  // RAF loop — movement + interpolation
  useEffect(() => {
    let raf: number;
    function tick(ts: number) {
      const { x: jx, y: jy } = joyRef.current;
      const moving = Math.abs(jx)>0.05||Math.abs(jy)>0.05;
      const s = scaleRef.current;

      if (moving) {
        if (jx>0.08) dirRef.current=1; if (jx<-0.08) dirRef.current=-1;
        const len=Math.sqrt(jx*jx+jy*jy), nx=len>1?jx/len:jx, ny=len>1?jy/len:jy;
        const ox=posRef.current.x, oy=posRef.current.y;
        const walls=wallsRef.current;
        const newX=checkCollision(ox+nx*SPEED,oy,walls)?ox:ox+nx*SPEED;
        const newY=checkCollision(newX,oy+ny*SPEED,walls)?oy:oy+ny*SPEED;
        posRef.current.x=clamp(newX,COLLISION_R,MAP_W-COLLISION_R);
        posRef.current.y=clamp(newY,COLLISION_R,MAP_H-COLLISION_R);
        if (ts-lastFrameTs.current>FRAME_MS) {
          frameIdx.current=(frameIdx.current+1)%3; lastFrameTs.current=ts; playSound('walk');
        }
      } else { frameIdx.current=1; }

      positionChar(posRef.current.x,posRef.current.y,frameIdx.current,dirRef.current,s);

      // Broadcast my position (throttled inside broadcastPosition)
      broadcastPosition(roomCode, {
        player_name: playerName, color_id: colorId, equipped_id: equippedId,
        x: posRef.current.x, y: posRef.current.y,
        dir: dirRef.current, frame: frameIdx.current,
      });

      // Interpolate remote players
      useWorldMultiStore.setState(state => {
        const next = { ...state.remotePos };
        let changed = false;
        for (const name in next) {
          const rp = next[name];
          const newRx = lerp(rp.renderX, rp.targetX, INTERP_SPEED);
          const newRy = lerp(rp.renderY, rp.targetY, INTERP_SPEED);
          if (Math.abs(newRx-rp.renderX)>0.01||Math.abs(newRy-rp.renderY)>0.01) {
            next[name] = { ...rp, renderX: newRx, renderY: newRy };
            changed = true;
          }
          // Remove stale players (>8s no update)
          if (Date.now()-rp.lastUpdate>8000) { delete next[name]; changed=true; }
        }
        return changed ? { remotePos: next } : state;
      });

      // Door proximity
      const rawFound=findNearbyRoom(posRef.current.x,posRef.current.y,doorsRef.current);
      const found=rawFound&&!disabledRoomsRef.current.has(rawFound.key)?rawFound:null;
      const fk=found?.key??'';
      if (fk!==nearbyKey.current) { if(found)playSound('whomb'); nearbyKey.current=fk; setNearbyRoom(found); }

      // Hidden spots
      if (allMissionsComplete) {
        const SECRET_R=36,px=posRef.current.x,py=posRef.current.y;
        const nearby=hiddenSpotsRef.current.find(sp=>{const dx=px-sp.x*MAP_W,dy=py-sp.y*MAP_H;return dx*dx+dy*dy<=SECRET_R*SECRET_R;});
        const nid=nearby?.id??'';
        if (nid!==nearbySecretRef.current){if(nearby)playSound('whomb');nearbySecretRef.current=nid;setNearbySecretId(nid);}
      }

      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  }, [positionChar, roomCode, playerName, colorId, equippedId, allMissionsComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoystick = useCallback((x:number,y:number)=>{ joyRef.current={x,y}; },[]);
  const mapDisplayW=MAP_W*scale*ZOOM, mapDisplayH=MAP_H*scale*ZOOM;

  // Results screen
  if (showResults) {
    const myPlayer = useWorldMultiStore.getState().players.find(p=>p.player_name===playerName);
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(160deg,#0d1f0d,#1a3a1a)' }}>
        <motion.div initial={{scale:0.85,opacity:0}} animate={{scale:1,opacity:1}}
          className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center">
            <div className="text-6xl mb-2">🏆</div>
            <h2 className="text-white font-black text-2xl">Round Over!</h2>
            <div className="mt-4 bg-white/20 rounded-2xl py-3">
              <div className="text-white/70 text-xs font-bold uppercase tracking-widest">Team Score</div>
              <div className="text-yellow-200 font-black text-4xl">{teamScore}</div>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="bg-slate-50 rounded-2xl p-4 flex justify-between">
              <span className="text-slate-600 font-bold text-sm">Your contributions</span>
              <span className="text-violet-600 font-black">{myPlayer?.rooms_solved ?? 0} rooms</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 flex justify-between">
              <span className="text-slate-600 font-bold text-sm">Your PlayBits earned</span>
              <span className="text-amber-600 font-black">₿ {myPlayer?.coins_earned ?? 0}</span>
            </div>
            <button onClick={onBack}
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black rounded-2xl hover:scale-105 transition-transform">
              🏠 Back to Lobby
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={outerRef} className="relative w-full h-screen overflow-hidden" style={{background:'#1a2e1a'}}
      onPointerDown={()=>gameAudio.resume()}>

      {/* Map container */}
      <div ref={mapContainerRef} style={{
        position:'absolute',top:0,left:0,
        width:mapDisplayW,height:mapDisplayH,willChange:'transform',
      }}>
        <img src="/maps/floor_map.png" alt="" draggable={false}
          style={{position:'absolute',inset:0,width:'100%',height:'100%',display:'block',userSelect:'none'}} />

        {/* Remote players */}
        {Object.values(remotePos).map(rp => (
          <RemoteSprite key={rp.player_name} p={rp} scale={scale} />
        ))}

        {/* My character */}
        <WalkingCharacter ref={charRef} playerName={playerName} colorFilter={color?.filter??''} accessoryEmoji={ACCESSORIES.find(a=>a.id===equippedId)?.emoji} />
      </div>

      {/* HUD */}
      <div className="absolute inset-x-0 top-0 z-30 flex justify-between items-start p-4 pointer-events-none">
        {/* Left: Back + mute */}
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={onBack}
            className="bg-black/50 text-white font-black px-3 py-2 rounded-xl text-sm backdrop-blur-sm hover:bg-black/70 transition-colors">
            ← Exit
          </button>
          <button onClick={()=>{ setMuted(m=>!m); gameAudio.toggleMute(); }}
            className="bg-black/50 text-white px-3 py-2 rounded-xl text-sm backdrop-blur-sm">
            {muted?'🔇':'🔊'}
          </button>
        </div>

        {/* Centre: round timer + team score */}
        <div className="flex flex-col items-center gap-1">
          <div className="bg-black/55 backdrop-blur-md rounded-2xl px-5 py-2 text-center border border-white/10">
            <div className="text-[9px] text-white/50 font-black uppercase tracking-widest">Round</div>
            <div className={`font-black text-2xl ${roundTimeLeft<30?'text-red-400':'text-white'}`}>
              {formatTime(roundTimeLeft)}
            </div>
          </div>
          <div className="bg-emerald-900/70 backdrop-blur-md rounded-xl px-4 py-1.5 flex items-center gap-2 border border-emerald-500/20">
            <span className="text-emerald-400 text-xs font-black">TEAM</span>
            <span className="text-yellow-300 font-black text-sm">⭐ {teamScore}</span>
          </div>
        </div>

        {/* Right: player list mini */}
        <div className="flex flex-col gap-1 pointer-events-none">
          {Object.values(remotePos).slice(0,4).map(rp=>{
            const c=COLORS.find(x=>x.id===rp.color_id);
            return (
              <div key={rp.player_name}
                className="bg-black/50 backdrop-blur-sm rounded-xl px-2 py-1 flex items-center gap-1.5">
                <img src="/character/walk2.png" alt="" draggable={false}
                  style={{height:18,filter:c?.filter??''}} />
                <span className="text-white text-[10px] font-bold">{rp.player_name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Room entry prompt */}
      {nearbyRoom && !enteredRoom && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button onClick={()=>{ setEnteredRoom(nearbyRoom); gameAudio.setTheme('challenging'); }}
            className={`bg-gradient-to-r ${nearbyRoom.color} text-white font-black px-6 py-3 rounded-2xl shadow-xl text-base flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform`}>
            <span className="text-xl">{nearbyRoom.emoji}</span> Enter {nearbyRoom.label}
          </button>
        </div>
      )}

      {/* Secret spot prompt */}
      {allMissionsComplete && nearbySecretId && !activeSecret && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button onClick={()=>{
            const spot=hiddenSpotsRef.current.find(s=>s.id===nearbySecretId);
            if(spot) setActiveSecret(spot);
          }}
            className="bg-gradient-to-r from-violet-600 to-purple-700 text-white font-black px-6 py-3 rounded-2xl shadow-xl text-base flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform border border-violet-400/30">
            ✨ Investigate Secret Spot
          </button>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs z-30 pointer-events-none">
        WASD / arrows or joystick
      </div>
      <div className="absolute bottom-6 right-6 z-30">
        <Joystick onMove={handleJoystick} size={120} />
      </div>

      {/* Room modal — records answer to DB in multiplayer */}
      {enteredRoom && (
        <RoomEntryModal
          room={enteredRoom}
          onClose={()=>setEnteredRoom(null)}
          onCorrect={async()=>{
            await recordWorldAnswer(roomCode, playerName, enteredRoom.key, true);
          }}
        />
      )}

      {activeSecret && (
        <HiddenSpotModal spot={activeSecret} onClose={()=>setActiveSecret(null)} />
      )}
    </div>
  );
}
