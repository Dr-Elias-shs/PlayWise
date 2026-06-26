"use client";
import { useGameStore } from '@/store/useGameStore';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { WorldMap } from '@/components/world/WorldMap';
import { WorldMultiLobby } from '@/components/world/WorldMultiLobby';
import { WorldMultiMap } from '@/components/world/WorldMultiMap';
import { Shop } from '@/components/world/Shop';
import { useWorldStore } from '@/store/useWorldStore';

import { COLORS, ACCESSORIES, itemTopFraction } from '@/lib/avatar-items';
import { useCharacterRegistry, resolveOutfitStand } from '@/lib/characterRegistry';
import { MAP_REGISTRY, MapMeta } from '@/lib/map-registry';
import { ROOMS } from '@/lib/rooms';
import { getGlobalConfig } from '@/lib/wallet';
import { WiseWorldIntro } from '@/components/world/WiseWorldIntro';
import { useTimeGuard } from '@/hooks/useTimeGuard';
import { TimeGate } from '@/components/TimeGate';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { useAccessoryPositions } from '@/hooks/useAccessoryPositions';

// ── Helpers ────────────────────────────────────────────────────────────────────

function CharacterPreview({ size = 80 }: { size?: number }) {
  const { colorId, equippedId, equippedClothingId, characterId } = useGameStore();
  const registry   = useCharacterRegistry();
  const charDef    = registry.character(characterId) ?? registry.characters[0];
  const color      = COLORS.find(c => c.id === colorId);
  const acc        = ACCESSORIES.find(a => a.id === equippedId) ?? null;
  const outfitDef  = equippedClothingId ? registry.outfit(equippedClothingId) : null;
  const outfitSprite = outfitDef ? resolveOutfitStand(outfitDef, characterId) : null;

  const baseSrc  = charDef?.standFrame ?? '/character/walk2.png';
  const spriteSrc = outfitSprite ?? baseSrc;
  const fs = Math.round(size * 0.30);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={spriteSrc}
        alt="Character"
        draggable={false}
        style={{ width: size, height: size, objectFit: 'contain', filter: color?.filter ?? '', transition: 'filter 0.25s' }}
      />
      {acc && (
        <span className="absolute pointer-events-none select-none"
          style={{
            top:       itemTopFraction(acc) * size,
            left:      `calc(50% + ${acc.xOffset ?? 0}px)`,
            transform: 'translateX(-50%)',
            fontSize:  fs,
            lineHeight: 1,
          }}>
          {acc.emoji}
        </span>
      )}
      {/* Outfit emoji fallback — only when no sprite for this character */}
      {outfitDef && !outfitSprite && (
        <span className="absolute pointer-events-none select-none"
          style={{
            top:       (outfitDef.yFraction ?? 0.44) * size,
            left:      `calc(50% + ${outfitDef.xOffset ?? 0}px)`,
            transform: 'translateX(-50%)',
            fontSize:  fs,
            lineHeight: 1,
          }}>
          {outfitDef.emoji}
        </span>
      )}
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
  const { playerName, setPlayerName, playBits, completedRooms, syncWithDatabase } = useWorldStore();
  const { colorId, playerName: hubName } = useGameStore();

  // Resolve name: hub store → world store → localStorage fallback (in that order)
  const resolvedName = (() => {
    if (hubName && hubName !== 'Player') return hubName;
    if (playerName && playerName !== 'Player') return playerName;
    try {
      const parsed = JSON.parse(localStorage.getItem('playwise_profile_v2') ?? '{}');
      return (parsed.name as string) || '';
    } catch { return ''; }
  })();

  const [showShop, setShowShop] = useState(false);

  // Sync resolved name into world store once on mount + Sync Bits from DB
  useEffect(() => {
    if (resolvedName && playerName !== resolvedName) {
      setPlayerName(resolvedName);
    }
    if (resolvedName && resolvedName !== 'Player') {
      syncWithDatabase(resolvedName);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const color = COLORS.find(c => c.id === colorId);
  const progress = Math.round((completedRooms.size / ROOMS.length) * 100);

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

              {/* Name (read-only from school account) */}
              <div>
                <span className="text-white font-black text-xl">{playerName}</span>
                <div
                  className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: color?.swatch + '33', color: color?.swatch }}
                >
                  {color?.name} Explorer
                </div>
              </div>

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

// ── Coming Soon / Rating page ─────────────────────────────────────────────────

const STARS = [1, 2, 3, 4, 5];

function WorldComingSoon({ onBack, onUnlock }: { onBack: () => void; onUnlock: () => void }) {
  const { playerName, playerEmail } = useGameStore();
  const studentKey = playerEmail?.trim().toLowerCase() || playerName || '';

  const [hovered,   setHovered]   = useState(0);
  const [selected,  setSelected]  = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [synced,    setSynced]    = useState(false);

  // ── Hidden tester gate: long-press the SHS badge → password → preview ──────
  const [showPwd, setShowPwd] = useState(false);
  const [pwd,     setPwd]     = useState('');
  const [pwdErr,  setPwdErr]  = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startPress = () => { pressTimer.current = setTimeout(() => setShowPwd(true), 600); };
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  // On mount: restore from localStorage, try to sync if pending, check Supabase as fallback
  useEffect(() => {
    if (!studentKey) return;
    const localStars  = localStorage.getItem('world_rating_v1');
    const localSynced = localStorage.getItem('world_rating_synced') === 'true';

    if (localStars) {
      // Already rated locally — show it immediately
      setSelected(parseInt(localStars, 10) || 0);
      setSubmitted(true);
      setSynced(localSynced);

      // If not yet synced, try now (Supabase may be back)
      if (!localSynced) {
        supabase.from('world_ratings').upsert({
          student_name: studentKey,
          stars: parseInt(localStars, 10),
          created_at: new Date().toISOString(),
        }, { onConflict: 'student_name' }).then(({ error }) => {
          if (!error) {
            localStorage.setItem('world_rating_synced', 'true');
            setSynced(true);
          }
        });
      }
    } else {
      // No local rating — check Supabase in case localStorage was cleared
      supabase.from('world_ratings')
        .select('stars').eq('student_name', studentKey).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setSelected(data.stars);
            setSubmitted(true);
            setSynced(true);
            localStorage.setItem('world_rating_v1', String(data.stars));
            localStorage.setItem('world_rating_synced', 'true');
          }
        });
    }
  }, [studentKey]);

  const submitRating = async (stars: number) => {
    if (saving || submitted) return;
    setSaving(true);
    // Save locally first so it's never lost
    localStorage.setItem('world_rating_v1', String(stars));

    // Try Supabase
    const { error } = await supabase.from('world_ratings').upsert({
      student_name: studentKey,
      stars,
      created_at: new Date().toISOString(),
    }, { onConflict: 'student_name' });

    if (!error) {
      localStorage.setItem('world_rating_synced', 'true');
      setSynced(true);
    }

    setSelected(stars);
    setSubmitted(true);
    setSaving(false);
  };

  const stars = hovered || selected;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #060d1a 0%, #0d1f3c 50%, #0a2e1a 100%)' }}>

      {/* Animated background stars */}
      {[...Array(18)].map((_, i) => (
        <motion.div key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{ opacity: [0.1, 0.6, 0.1] }}
          transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6 text-center">

        {/* Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="text-7xl"
        >🌍</motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h1 className="text-3xl font-black text-white leading-tight">
            We're levelling up<br />
            <span className="text-emerald-400">PlayWise World</span> 🚀
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Coming back soon — with <span className="text-white font-bold">all your curriculum</span> built into the game.
            Learning through exploration, quests &amp; discovery.
          </p>
        </motion.div>

        {/* SHS badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          style={{ userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none' }}
          className="flex items-center gap-2 bg-white/8 border border-white/15 px-4 py-2 rounded-full cursor-default"
        >
          <span className="text-lg">🏫</span>
          <span className="text-white/80 text-xs font-bold tracking-wide uppercase">SHS Leads Innovation</span>
        </motion.div>

        {/* Rating section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="w-full bg-white/8 backdrop-blur-sm border border-white/12 rounded-3xl p-6 space-y-4"
        >
          {!submitted ? (
            <>
              <p className="text-white font-black text-base">Did you try the World? ⭐</p>
              <p className="text-white/50 text-xs">Rate your experience — your feedback shapes what we build next!</p>
              <div className="flex justify-center gap-3">
                {STARS.map(s => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => submitRating(s)}
                    className="text-4xl transition-all"
                    style={{ filter: s <= stars ? 'none' : 'grayscale(1) opacity(0.3)' }}
                  >⭐</motion.button>
                ))}
              </div>
              <p className="text-white/30 text-xs">
                {stars === 0 ? 'Tap a star to rate' : stars === 1 ? 'Needs work 🤔' : stars === 2 ? 'It was okay 😐' : stars === 3 ? 'Pretty good! 🙂' : stars === 4 ? 'Really fun! 😄' : 'AMAZING! 🤩'}
              </p>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="space-y-2"
            >
              <div className="text-4xl">{'⭐'.repeat(selected)}</div>
              <p className="text-white font-black text-base">Thanks for rating! 🎉</p>
              <p className="text-white/50 text-xs">Your feedback helps us build something incredible.</p>
              <p className={`text-xs font-semibold mt-1 ${synced ? 'text-emerald-400' : 'text-yellow-400/70'}`}>
                {synced ? '✓ Saved' : '⏳ Will sync when connection is back'}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Back button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={onBack}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-all text-sm"
        >
          ← Back to Hub
        </motion.button>

      </div>

      {/* Hidden tester password modal */}
      <AnimatePresence>
        {showPwd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
            onClick={() => { setShowPwd(false); setPwd(''); setPwdErr(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-white/15 rounded-3xl p-6 w-full max-w-xs space-y-4"
            >
              <div className="text-center">
                <div className="text-3xl mb-1">🔐</div>
                <h3 className="text-white font-black text-lg">Tester Access</h3>
                <p className="text-white/40 text-xs">Enter the password to preview the World.</p>
              </div>
              <form onSubmit={e => {
                e.preventDefault();
                if (pwd.trim().toLowerCase() === 'astalabista') { setShowPwd(false); onUnlock(); }
                else { setPwdErr(true); }
              }}>
                <input
                  type="password"
                  autoFocus
                  value={pwd}
                  onChange={e => { setPwd(e.target.value); setPwdErr(false); }}
                  placeholder="Password"
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/30 outline-none focus:border-emerald-400/60"
                />
                {pwdErr && <p className="text-red-400 text-xs font-bold mt-2">Wrong password</p>}
                <button type="submit"
                  className="w-full mt-4 py-3 rounded-2xl font-black text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:scale-[1.02] transition-transform">
                  Unlock 🚀
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
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
  const [testBypass,    setTestBypass]    = useState(false); // hidden tester unlock
  const [showWorldIntro, setShowWorldIntro] = useState(false);

  // ── Time-management guard ──────────────────────────────────────────────────
  const playerGrade = (() => { try { const p = JSON.parse(localStorage.getItem('playwise_profile_v2') ?? '{}'); return p.grade ?? ''; } catch { return ''; } })();
  const { loading: tmLoading, access, refresh: tmRefresh } = useTimeGuard(playerGrade, !!selectedMap || !!multiRoomCode);

  // Pull player info from hub profile for heartbeat
  const worldProfile = (() => { try { return JSON.parse(localStorage.getItem('playwise_profile_v2') ?? '{}'); } catch { return {}; } })();
  const worldGame = multiRoomCode ? 'WiseWorld Multiplayer' : selectedMap ? 'WiseWorld' : 'World Lobby';
  useHeartbeat(worldProfile.email ?? '', worldProfile.name ?? '', playerGrade, worldGame);
  useAccessoryPositions();

  useEffect(() => {
    // Hard-disabled until Supabase quota resets — remove this line to re-enable
    setAllowed(false);
    return;

    // Always allow on localhost so you can test without affecting students
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      setAllowed(true);
      return;
    }
    Promise.all([
      getGlobalConfig('grade_game_settings'),
      getGlobalConfig('game_settings'),
    ]).then(([gradeSettings, globalSettings]) => {
      const perGrade = playerGrade && gradeSettings?.[playerGrade];
      const effective = perGrade || globalSettings || {};
      setAllowed(effective['world'] !== false);
    }).catch(() => setAllowed(false)); // fail closed — if DB unreachable, deny access
  }, []);

  if (allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #0d1f0d 0%, #1a3a1a 100%)' }}>
        <div className="w-10 h-10 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!allowed && !testBypass) {
    return <WorldComingSoon onBack={() => router.push('/')} onUnlock={() => setTestBypass(true)} />;
  }

  // ── Time-management gate (skipped on localhost + tester bypass) ────────────
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (!isLocal && !testBypass && !access.allowed) {
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
