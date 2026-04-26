"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { WorldMap } from '@/components/world/WorldMap';
import { WorldMultiLobby } from '@/components/world/WorldMultiLobby';
import { WorldMultiMap } from '@/components/world/WorldMultiMap';
import { Shop } from '@/components/world/Shop';
import { useWorldStore } from '@/store/useWorldStore';
import { useAvatarStore } from '@/store/useAvatarStore';
import { COLORS, ACCESSORIES } from '@/lib/avatar-items';
import { MAP_REGISTRY, MapMeta } from '@/lib/map-registry';
import { ROOMS } from '@/lib/rooms';
import { getGlobalConfig } from '@/lib/wallet';
import { WiseWorldIntro } from '@/components/world/WiseWorldIntro';
import { useTimeGuard } from '@/hooks/useTimeGuard';
import { TimeGate } from '@/components/TimeGate';

// ── Helpers ────────────────────────────────────────────────────────────────────

function CharacterPreview({ size = 80 }: { size?: number }) {
  const { colorId, equippedId } = useAvatarStore();
  const color = COLORS.find(c => c.id === colorId);
  const acc   = ACCESSORIES.find(a => a.id === equippedId);
  return (
    <div className="flex flex-col items-center">
      {acc && <span style={{ fontSize: size * 0.45 }}>{acc.emoji}</span>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/character/walk2.png"
        alt="Character"
        draggable={false}
        style={{ height: size, filter: color?.filter ?? '', transition: 'filter 0.25s' }}
      />
    </div>
  );
}

// ── Map Card ───────────────────────────────────────────────────────────────────

function MapCard({ map, onSelect, locked }: { map: MapMeta; onSelect: () => void; locked?: boolean }) {
  return (
    <motion.div
      whileHover={locked ? {} : { y: -4, scale: 1.02 }}
      whileTap={locked ? {} : { scale: 0.97 }}
      onClick={locked ? undefined : onSelect}
      className={`relative rounded-3xl overflow-hidden border-2 transition-shadow ${
        locked
          ? 'border-slate-200 opacity-60 cursor-not-allowed'
          : 'border-emerald-300/60 cursor-pointer hover:shadow-xl hover:shadow-emerald-900/30'
      }`}
      style={{ background: 'linear-gradient(160deg, #1a3a1a 0%, #2d5a2d 60%, #1a2e1a 100%)' }}
    >
      {/* Map image */}
      <div className="relative h-40 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={map.image}
          alt={map.name}
          className="w-full h-full object-cover object-top opacity-70"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a3a1a] via-transparent to-transparent" />
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-4xl">🔒</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-black text-lg">{map.name}</h3>
          <span className="text-emerald-400 text-xs font-bold bg-emerald-900/50 px-2 py-0.5 rounded-full">
            {ROOMS.length} Rooms
          </span>
        </div>
        <p className="text-white/50 text-xs mb-4">Walk the school, enter rooms, answer questions!</p>

        {locked ? (
          <div className="w-full py-2.5 rounded-2xl bg-slate-600/50 text-slate-400 font-black text-sm text-center">
            Coming Soon
          </div>
        ) : (
          <button
            onClick={onSelect}
            className="w-full py-2.5 rounded-2xl font-black text-sm text-white transition-all
              bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400"
          >
            Enter World →
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Lobby ──────────────────────────────────────────────────────────────────────

function WorldLobby({ onEnter, onMultiplayer }: { onEnter: (mapId: string) => void; onMultiplayer?: (mapId: string) => void }) {
  const { playerName, setPlayerName, playBits, completedRooms } = useWorldStore();
  const { colorId } = useAvatarStore();

  const [name, setName]         = useState(playerName === 'Player' ? '' : playerName);
  const [editingName, setEditingName] = useState(playerName === 'Player');
  const [showShop, setShowShop] = useState(false);

  // Auto-fill from hub profile if available
  useEffect(() => {
    if (playerName === 'Player') {
      try {
        const stored = localStorage.getItem('playwise_profile_v2');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name) { setName(parsed.name); setEditingName(false); setPlayerName(parsed.name); }
        }
      } catch {}
    }
  }, [playerName, setPlayerName]);

  const color = COLORS.find(c => c.id === colorId);
  const progress = Math.round((completedRooms.size / ROOMS.length) * 100);

  function confirmName() {
    const n = name.trim();
    if (!n) return;
    setPlayerName(n);
    setEditingName(false);
  }

  const readyToPlay = playerName !== 'Player' && playerName.trim().length > 0;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0d1f0d 0%, #1a3a1a 40%, #0d2020 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10">
        <button
          onClick={() => window.history.back()}
          className="text-white/50 hover:text-white font-bold transition-colors text-sm"
        >
          ← Back
        </button>
        <h1 className="text-white font-black text-xl flex-1">🗺️ PlayWise World</h1>
        <button
          onClick={() => setShowShop(true)}
          className="flex items-center gap-2 bg-violet-600/80 hover:bg-violet-500 text-white font-black
            px-4 py-2 rounded-2xl text-sm transition-colors border border-violet-400/30"
        >
          🛒 Store
        </button>
      </div>

      <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Player Profile ── */}
          <div className="lg:col-span-1 space-y-4">

            {/* Profile card */}
            <div
              className="rounded-3xl p-6 border border-white/10 text-center space-y-4"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
            >
              {/* Character */}
              <div className="flex justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowShop(true)}
                  className="cursor-pointer relative"
                  title="Customize in Store"
                >
                  <CharacterPreview size={90} />
                  <span className="absolute -bottom-1 -right-1 bg-violet-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    ✏️
                  </span>
                </motion.div>
              </div>

              {/* Name */}
              {editingName ? (
                <div className="space-y-2">
                  <input
                    className="w-full rounded-2xl px-3 py-2 text-slate-800 font-bold text-center outline-none
                      focus:ring-2 focus:ring-emerald-400 text-sm"
                    placeholder="Your name…"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmName()}
                    maxLength={20}
                    autoFocus
                  />
                  <button
                    onClick={confirmName}
                    disabled={!name.trim()}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40
                      text-white font-black rounded-xl text-sm transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-white font-black text-xl">{playerName}</span>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-white/40 hover:text-white/80 text-xs transition-colors"
                    >
                      ✏️
                    </button>
                  </div>
                  <div
                    className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold"
                    style={{ background: color?.swatch + '33', color: color?.swatch }}
                  >
                    {color?.name} Explorer
                  </div>
                </div>
              )}

              {/* PlayBits */}
              <div
                className="flex items-center justify-center gap-2 rounded-2xl py-3"
                style={{ background: 'rgba(255,215,0,0.1)' }}
              >
                <span className="text-2xl">🪙</span>
                <span className="text-yellow-300 font-black text-2xl">{playBits}</span>
                <span className="text-white/50 text-sm">PlayBits</span>
              </div>
            </div>

            {/* Stats card */}
            <div
              className="rounded-3xl p-5 border border-white/10 space-y-4"
              style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
            >
              <h3 className="text-white/70 text-xs font-black uppercase tracking-widest">Progress</h3>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-white/60">Rooms Completed</span>
                  <span className="text-emerald-400">{completedRooms.size} / {ROOMS.length}</span>
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  />
                </div>
                <p className="text-white/30 text-xs mt-1.5 text-right">{progress}% complete</p>
              </div>

              {/* Room list preview */}
              <div className="grid grid-cols-4 gap-1.5">
                {ROOMS.map(room => {
                  const done = completedRooms.has(room.key as any);
                  return (
                    <div
                      key={room.key}
                      title={room.label}
                      className={`aspect-square rounded-xl flex items-center justify-center text-lg transition-all ${
                        done
                          ? 'bg-emerald-500/30 ring-1 ring-emerald-400/50'
                          : 'bg-white/5'
                      }`}
                    >
                      <span style={{ filter: done ? '' : 'grayscale(1) opacity(0.3)' }}>
                        {room.emoji}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Store shortcut */}
            <button
              onClick={() => setShowShop(true)}
              className="w-full rounded-3xl p-4 border border-violet-400/20 flex items-center gap-4
                transition-all hover:border-violet-400/50 hover:bg-violet-500/10"
              style={{ background: 'rgba(109,40,217,0.15)', backdropFilter: 'blur(12px)' }}
            >
              <span className="text-3xl">🛒</span>
              <div className="text-left">
                <div className="text-white font-black text-sm">Character Store</div>
                <div className="text-white/40 text-xs">Colors · Accessories · Customize</div>
              </div>
              <span className="ml-auto text-violet-400 font-bold">→</span>
            </button>
          </div>

          {/* ── Right: Map Selection ── */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-white font-black text-lg flex items-center gap-2">
              🌍 Choose a World
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MAP_REGISTRY.map(map => (
                <MapCard
                  key={map.id}
                  map={map}
                  onSelect={() => readyToPlay && onEnter(map.id)}
                />
              ))}
            </div>

            {/* Multiplayer CTA */}
            {onMultiplayer && (
              <button
                onClick={() => readyToPlay && onMultiplayer(MAP_REGISTRY[0].id)}
                disabled={!readyToPlay}
                className="w-full rounded-3xl p-5 flex items-center gap-5 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed border border-violet-400/30"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(147,51,234,0.2))', backdropFilter: 'blur(12px)' }}
              >
                <span className="text-4xl">⚔️</span>
                <div className="text-left flex-1">
                  <div className="text-white font-black text-base">Multiplayer World</div>
                  <div className="text-white/50 text-xs font-medium mt-0.5">Explore together · Answer as a team · Earn more PlayBits</div>
                </div>
                <span className="text-violet-400 font-black text-sm">Play →</span>
              </button>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Placeholder "Coming Soon" maps */}
              {[
                { id: 'hospital', name: 'Hospital', image: '/maps/floor_map.png' },
                { id: 'museum',   name: 'Museum',   image: '/maps/floor_map.png' },
              ].map(m => (
                <MapCard key={m.id} map={m as MapMeta} onSelect={() => {}} locked />
              ))}
            </div>

            {/* Need name prompt */}
            {!readyToPlay && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 bg-amber-500/20 border border-amber-400/30 rounded-2xl p-4"
              >
                <span className="text-2xl">⚠️</span>
                <p className="text-amber-300 text-sm font-bold">
                  Enter your name on the left before entering a world!
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Shop Modal */}
      <AnimatePresence>
        {showShop && <Shop onClose={() => setShowShop(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WorldPage() {
  const router = useRouter();
  const [selectedMap,   setSelectedMap]   = useState<string | null>(null);
  const [multiMode,     setMultiMode]     = useState(false);
  const [multiRoomCode, setMultiRoomCode] = useState<string | null>(null);
  const [allowed,       setAllowed]       = useState<boolean | null>(null);
  const [showWorldIntro, setShowWorldIntro] = useState(false);

  // ── Time-management guard ──────────────────────────────────────────────────
  const playerGrade = (() => { try { const p = JSON.parse(localStorage.getItem('playwise_profile_v2') ?? '{}'); return p.grade ?? ''; } catch { return ''; } })();
  const { loading: tmLoading, access, refresh: tmRefresh } = useTimeGuard(playerGrade, !!selectedMap || !!multiRoomCode);

  useEffect(() => {
    // Always allow on localhost so you can test without affecting students
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      setAllowed(true);
      return;
    }
    getGlobalConfig('game_settings').then(cfg => {
      setAllowed(!cfg || cfg['world'] !== false);
    }).catch(() => setAllowed(true));
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0d1f0d 0%, #1a3a1a 100%)' }}>
        <div className="w-10 h-10 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(160deg, #0d1f0d 0%, #1a3a1a 100%)' }}>
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h1 className="text-white font-black text-2xl">World Unavailable</h1>
          <p className="text-white/50 text-sm max-w-xs">
            The PlayWise World is currently disabled by your teacher. Check back later!
          </p>
          <button onClick={() => router.push('/')}
            className="mt-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-colors text-sm">
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Time-management gate (skipped on localhost) ───────────────────────────
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (!isLocal && !access.allowed) {
    return <TimeGate access={access} loading={false} grade={playerGrade} onRetry={tmRefresh} />;
  }

  // Multiplayer game in progress
  if (multiRoomCode && selectedMap) {
    return (
      <>
        <WorldMultiMap
          roomCode={multiRoomCode} mapId={selectedMap}
          onBack={() => { setMultiRoomCode(null); setMultiMode(false); setSelectedMap(null); setShowWorldIntro(false); }}
        />
        {showWorldIntro && <WiseWorldIntro onDone={() => setShowWorldIntro(false)} />}
      </>
    );
  }

  // Multiplayer lobby
  if (multiMode && selectedMap) {
    return <WorldMultiLobby
      mapId={selectedMap}
      onStart={(code) => setMultiRoomCode(code)}
      onBack={() => { setMultiMode(false); setSelectedMap(null); }}
    />;
  }

  // Solo game — render map underneath, intro on top as overlay
  if (selectedMap && !multiMode) {
    return (
      <>
        <WorldMap onBack={() => { setSelectedMap(null); setShowWorldIntro(false); }} mapId={selectedMap} />
        {showWorldIntro && <WiseWorldIntro onDone={() => setShowWorldIntro(false)} />}
      </>
    );
  }

  return <WorldLobby
    onEnter={(mapId) => { setSelectedMap(mapId); setShowWorldIntro(true); }}
    onMultiplayer={(mapId) => { setSelectedMap(mapId); setMultiMode(true); setShowWorldIntro(true); }}
  />;
}
