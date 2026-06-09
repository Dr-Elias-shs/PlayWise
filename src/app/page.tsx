"use client";
import { useGameStore } from "@/store/useGameStore";
import { Users, Trophy, LogIn, LogOut, Settings, Maximize, Minimize } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFullscreen } from "@/hooks/useFullscreen";
import { motion } from "framer-motion";
import { MultiplicationGame } from "@/components/game/MultiplayerGame";
import { GameEngine } from "@/components/game/GameEngine";
import { MemoryGame } from "@/components/game/MemoryGame";
import { HangmanGame } from "@/components/game/HangmanGame";
import { BrainGame } from "@/components/game/BrainGame";
import { TriviaGame } from "@/components/game/TriviaGame";
import { ChessGame } from "@/components/game/ChessGame";
import { SpellingBeeGame } from "@/components/game/SpellingBeeGame";
import { MultiplayerHub } from "@/components/multiplayer/MultiplayerHub";
import { ProfileSetup } from "@/components/profile/ProfileSetup";
import { RedeemPage } from "@/components/redeem/RedeemPage";
import { Shop } from "@/components/world/Shop";
import { WalletBadge } from "@/components/hub/WalletBadge";
import { useWorldStore } from "@/store/useWorldStore";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/lib/msal";
import { Leaderboard } from "@/components/hub/Leaderboard";
import { SpinWheel } from "@/components/hub/SpinWheel";
import { PlayerStatsModal } from "@/components/hub/PlayerStatsModal";
import { ALL_GAMES, GameConfig } from "@/lib/gameConfigs";
import { OwlMini } from "@/components/game/OwlCharacter";
import { getGlobalConfig, checkBanned, getWallet } from "@/lib/wallet";
import { useAccessoryPositions } from "@/hooks/useAccessoryPositions";
import { PlayWiseIntro, INTRO_SEEN_KEY } from "@/components/PlayWiseIntro";
import { useTimeGuard } from "@/hooks/useTimeGuard";
import { TimeGate } from "@/components/TimeGate";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { supabase } from "@/lib/supabase";

// ─── Maintenance screen ───────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = { 1: 'Needs work 🤔', 2: 'It was okay 😐', 3: 'Pretty good! 🙂', 4: 'Really fun! 😄', 5: 'AMAZING! 🤩' };

function MaintenanceScreen({ playerName, onLogout }: { playerName: string; onLogout: () => void }) {
  const { playerEmail } = useGameStore();
  const studentKey = playerEmail?.trim().toLowerCase() || playerName || '';

  const [hovered,   setHovered]   = useState(0);
  const [selected,  setSelected]  = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [synced,    setSynced]    = useState(false);

  useEffect(() => {
    if (!studentKey) return;
    const localStars  = localStorage.getItem('world_rating_v1');
    const localSynced = localStorage.getItem('world_rating_synced') === 'true';
    if (localStars) {
      setSelected(parseInt(localStars, 10) || 0);
      setSubmitted(true);
      setSynced(localSynced);
      if (!localSynced) {
        supabase.from('world_ratings').upsert({ student_name: studentKey, stars: parseInt(localStars, 10), created_at: new Date().toISOString() }, { onConflict: 'student_name' })
          .then(({ error }) => { if (!error) { localStorage.setItem('world_rating_synced', 'true'); setSynced(true); } });
      }
    } else {
      supabase.from('world_ratings').select('stars').eq('student_name', studentKey).maybeSingle()
        .then(({ data }) => { if (data) { setSelected(data.stars); setSubmitted(true); setSynced(true); localStorage.setItem('world_rating_v1', String(data.stars)); localStorage.setItem('world_rating_synced', 'true'); } });
    }
  }, [studentKey]);

  const submitRating = async (stars: number) => {
    if (saving || submitted) return;
    setSaving(true);
    localStorage.setItem('world_rating_v1', String(stars));
    const { error } = await supabase.from('world_ratings').upsert({ student_name: studentKey, stars, created_at: new Date().toISOString() }, { onConflict: 'student_name' });
    if (!error) { localStorage.setItem('world_rating_synced', 'true'); setSynced(true); }
    setSelected(stars); setSubmitted(true); setSaving(false);
  };

  const displayStars = hovered || selected;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #060d1a 0%, #0d1f3c 50%, #0a2e1a 100%)' }}>

      {[...Array(20)].map((_, i) => (
        <motion.div key={i} className="absolute rounded-full bg-white pointer-events-none"
          style={{ width: Math.random() * 3 + 1, height: Math.random() * 3 + 1, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{ opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: 2 + Math.random() * 3, repeat: Infinity, delay: Math.random() * 3 }} />
      ))}

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-5 text-center">

        <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }} className="text-6xl">🛠️</motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-2">
          <h1 className="text-3xl font-black text-white leading-tight">
            PlayWise is getting<br /><span className="text-emerald-400">a big upgrade</span> 🚀
          </h1>
          <p className="text-white/55 text-sm leading-relaxed">
            We'll be right back — bigger, better, and with your <span className="text-white font-bold">full curriculum</span> built into the game.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 }}
          className="flex items-center gap-2 bg-white/8 border border-white/15 px-4 py-2 rounded-full">
          <span className="text-base">🏫</span>
          <span className="text-white/80 text-xs font-bold tracking-wide uppercase">SHS Leads Innovation</span>
        </motion.div>

        {/* World rating card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="w-full bg-white/8 backdrop-blur-sm border border-white/12 rounded-3xl p-6 space-y-3">
          {!submitted ? (
            <>
              <p className="text-white font-black text-base">Did you play PlayWise World? ⭐</p>
              <p className="text-white/45 text-xs">Rate your experience — it shapes what we build next!</p>
              <div className="flex justify-center gap-2">
                {[1,2,3,4,5].map(s => (
                  <motion.button key={s} whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)}
                    onClick={() => submitRating(s)} disabled={saving}
                    className="text-4xl transition-all" style={{ filter: s <= displayStars ? 'none' : 'grayscale(1) opacity(0.3)' }}>⭐</motion.button>
                ))}
              </div>
              <p className="text-white/35 text-xs h-4">{displayStars ? RATING_LABELS[displayStars] : 'Tap a star to rate'}</p>
            </>
          ) : (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 12 }} className="space-y-1.5">
              <div className="text-3xl">{'⭐'.repeat(selected)}</div>
              <p className="text-white font-black">Thanks for rating! 🎉</p>
              <p className="text-white/45 text-xs">Your feedback helps us build something incredible.</p>
              <p className={`text-xs font-semibold ${synced ? 'text-emerald-400' : 'text-yellow-400/70'}`}>
                {synced ? '✓ Saved' : '⏳ Will sync when connection is back'}
              </p>
            </motion.div>
          )}
        </motion.div>

        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          onClick={onLogout}
          className="text-white/30 hover:text-white/60 text-xs font-semibold transition-colors py-2">
          Sign out
        </motion.button>
      </div>
    </div>
  );
}

// ─── Hub game card ────────────────────────────────────────────────────────────

function HubGameCard({ config, onClick, multiplayerBadge }: {
  config: GameConfig;
  onClick: () => void;
  multiplayerBadge?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
    >
      <div className="p-6 flex items-center justify-between" style={{ background: config.cardStyle }}>
        <span className="text-5xl">{config.emoji}</span>
        {multiplayerBadge && (
          <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full">⚔️ Multiplayer</span>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-lg font-black text-slate-800">{config.title}</h3>
        <p className="text-slate-500 text-sm mt-1">{config.description}</p>
        <button
          style={{ background: config.cardStyle }}
          className="mt-4 w-full py-2.5 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          Play Now →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────


type Screen = 'login' | 'profile-setup' | 'hub' | 'profile-edit' | 'game' | 'multiplayer' | 'redeem' | 'shop';

export default function Home() {
  const { playerName, playerEmail, playerGrade, colorId, characterId, setPlayerName, setProfile, resetGame, loadStoredProfile } = useGameStore();
  const { playerName: worldName, playerEmail: worldEmail, setPlayerName: setWorldName, syncWithDatabase: syncWorld } = useWorldStore();
  const [screen, setScreen] = useState<Screen>('login');
  const [showIntro, setShowIntro] = useState(() => {
    try { return typeof window !== 'undefined' ? !localStorage.getItem(INTRO_SEEN_KEY) : false; }
    catch { return false; } // storage blocked on MDM tablets — skip intro entirely
  });

  // Sync Hub player name and email into World store (for Shop/World currency sync)
  useEffect(() => {
    if (playerName && (playerName !== worldName || playerEmail !== worldEmail)) {
      setWorldName(playerName, playerEmail);
    }
  }, [playerName, playerEmail, worldName, worldEmail, setWorldName]);
  // Time-management guard — only active after login, skipped on localhost
  const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const { loading: tmLoading, access, refresh: tmRefresh } = useTimeGuard(isLocal ? '' : (playerGrade ?? ''), screen === 'hub' || screen === 'game');

  const router = useRouter();
  const [activeGame, setActiveGame] = useState<GameConfig | null>(null);
  const [multiGameId, setMultiGameId] = useState<string>('multiplication');
  const [walletRefresh, setWalletRefresh] = useState(0);
  const [gameSettings, setGameSettings] = useState<Record<string, boolean>>({});
  const [emailInput, setEmailInput] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [bannedInfo, setBannedInfo] = useState<{ banned: boolean; reason: string } | null>(null);
  const { isFullscreen, toggle: toggleFullscreen, enter: enterFullscreen } = useFullscreen();
  const msalConfigured = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID !== '00000000-0000-0000-0000-000000000000';
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  // Heartbeat — tracks this student as active while on hub or in a game
  const heartbeatGame = screen === 'game' ? (activeGame?.title ?? 'Game') : screen === 'multiplayer' ? 'Multiplayer Hub' : 'Hub';
  useHeartbeat(
    screen === 'hub' || screen === 'game' || screen === 'multiplayer' ? playerEmail : '',
    playerName, playerGrade ?? '', heartbeatGame,
  );

  // Load profile from localStorage on mount
  useEffect(() => {
    loadStoredProfile();
  }, [loadStoredProfile]);

  useEffect(() => {
    if (isLocal) return; // dev: show everything
    Promise.all([
      getGlobalConfig('grade_game_settings'),
      getGlobalConfig('game_settings'),
    ]).then(([gradeSettings, globalSettings]) => {
      const perGrade = playerGrade && gradeSettings?.[playerGrade];
      setGameSettings(perGrade || globalSettings || {});
    });
  }, [playerGrade, isLocal]); // eslint-disable-line react-hooks/exhaustive-deps

  useAccessoryPositions();

  // After MSAL login — use email as stable ID, display name for UI
  useEffect(() => {
    if (!isAuthenticated || accounts.length === 0) return;
    const email       = (accounts[0].username ?? '').toLowerCase().trim();
    const displayName = accounts[0].name || email.split('@')[0];
    if (!email) return;
    setPlayerName(displayName, email);
    // If grade isn't in localStorage, restore from DB to avoid re-asking
    if (!playerGrade) {
      getWallet(email).then(wallet => {
        if (wallet?.grade) {
          setProfile(
            displayName, email,
            (wallet.color_id as string | undefined) || colorId || 'green',
            wallet.grade as string,
            (wallet.character_id as string | undefined) || characterId || 'male',
          );
        }
      });
    }
  }, [isAuthenticated, accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine initial screen once profile loaded
  useEffect(() => {
    if (screen !== 'login') return;
    if (playerName && playerGrade) setScreen('hub');
    else if (playerName && !playerGrade) setScreen('profile-setup');
  }, [playerName, playerGrade, screen]);

  // Check ban status whenever player is identified
  useEffect(() => {
    if (!playerEmail && !playerName) return;
    const dbKey = playerEmail?.trim().toLowerCase() || playerName;
    checkBanned(dbKey).then(info => { if (info.banned) setBannedInfo(info); });
  }, [playerEmail, playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(e => {
      if (e?.errorCode !== 'user_cancelled') console.error(e);
    });
  };

  const handleEmailLogin = async () => {
    const email = emailInput.trim().toLowerCase();
    if (!email.includes('@')) return;
    const prefix      = email.split('@')[0];
    const displayName = prefix.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    setPlayerName(displayName, email);

    // Restore grade (and appearance) from DB — avoids asking grade again on new devices
    const wallet = await getWallet(email);
    if (wallet?.grade) {
      setProfile(
        displayName, email,
        (wallet.color_id as string | undefined) || colorId || 'green',
        wallet.grade as string,
        (wallet.character_id as string | undefined) || characterId || 'male',
      );
      setScreen('hub');
    } else {
      setScreen('profile-setup');
    }
  };

  const handleLogout = () => {
    // Clear full profile including email so re-login works cleanly
    setProfile('', '', 'green', '');
    setEmailInput('');
    setScreen('login');
    if (isAuthenticated) {
      // Use popup to match the popup-based login — avoids full page redirect
      // which interferes with the next loginPopup call
      instance.logoutPopup({
        postLogoutRedirectUri: window.location.origin,
        mainWindowRedirectUri: window.location.origin,
      }).catch(() => {
        // If popup fails (e.g. blocked), clear local MSAL state silently
        instance.clearCache();
      });
    }
  };

  const handleGameCardClick = (config: GameConfig) => {
    resetGame();
    setActiveGame(config);
    enterFullscreen();
    setScreen('game');
  };

  const handleMultiplayerStart = (gameId: string) => {
    setMultiGameId(gameId);
    resetGame();
    if (gameId === 'multiplication') {
      setActiveGame(null);
    } else {
      const config = ALL_GAMES.find(g => g.id === gameId) ?? null;
      setActiveGame(config);
    }
    setScreen('game');
  };

  // ── Intro splash (shown once, before any screen) ──
  if (showIntro) {
    return <PlayWiseIntro onDone={() => setShowIntro(false)} />;
  }

  // ── Ban gate — checked before anything else ──
  if (bannedInfo?.banned) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95,#6b21a8)' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Account Suspended</h2>
          <p className="text-slate-500 text-sm mb-4">
            Your account has been suspended by your teacher and you cannot access PlayWise right now.
          </p>
          {bannedInfo.reason && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-4 text-left">
              <p className="text-xs font-black text-red-500 uppercase tracking-wider mb-1">Reason</p>
              <p className="text-sm text-red-700 font-medium">{bannedInfo.reason}</p>
            </div>
          )}
          <p className="text-xs text-slate-400">Please speak to your teacher to have your account reinstated.</p>
        </div>
      </div>
    );
  }

  // ── Time-management gate (hub + game only, not login/profile-setup) ──
  if (!isLocal && (screen === 'hub' || screen === 'game') && !access.allowed) {
    return <TimeGate access={access} loading={false} grade={playerGrade ?? ''} onRetry={tmRefresh} />;
  }

  // ── Maintenance gate — shown to all logged-in students ──────────────────────
  // Remove this block when Supabase quota resets and service is ready
  if (!isLocal && playerName && screen !== 'login' && screen !== 'profile-setup') {
    return <MaintenanceScreen playerName={playerName} onLogout={handleLogout} />;
  }

  // ── Login ──
  if (screen === 'login' || (!playerName && screen !== 'profile-setup')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-brand-background">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          {/* SHS logo — upper left */}
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/exams-logo.png" alt="SHS" className="w-10 h-10 object-contain" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/playwise-logo.png" alt="PlayWise Logo" className="w-16 h-16 object-contain" />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-slate-800 mb-2">PlayWise</h1>
          <p className="text-slate-500 text-center mb-8">Ready to level up your learning?</p>

          <div className="space-y-3">
            {/* Microsoft SSO — the real login */}
            {msalConfigured ? (
              <button onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 border-slate-100 hover:border-brand-primary hover:bg-brand-primary/5 transition-all font-bold text-slate-700 text-lg">
                <LogIn size={22} className="text-brand-primary" />
                Sign in with Microsoft
              </button>
            ) : (
              /* Email fallback — only when Azure not configured */
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">School email</p>
                <div className="flex gap-2">
                  <input type="email" value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                    placeholder="yourname@school.com"
                    className="flex-1 px-3 py-3 border-2 border-slate-200 focus:border-brand-primary rounded-xl text-sm font-medium outline-none transition-colors" />
                  <button onClick={handleEmailLogin}
                    className="px-4 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:opacity-90">
                    Go →
                  </button>
                </div>
              </div>
            )}

            {/* DEV ONLY */}
            {process.env.NODE_ENV === 'development' && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-400 text-center mb-2">— Dev bypass —</p>
                <div className="flex gap-2">
                  <input id="dev-name" type="text" placeholder="Any name..." defaultValue="TestPlayer"
                    className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-brand-primary" />
                  <button onClick={() => {
                    const input = document.getElementById('dev-name') as HTMLInputElement;
                    setPlayerName(input.value.trim() || 'TestPlayer');
                    setScreen('profile-setup');
                  }} className="px-4 py-2 bg-brand-primary text-white rounded-xl text-sm font-bold hover:opacity-90">
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Profile setup (first time) ──
  if (screen === 'profile-setup') {
    return <ProfileSetup onDone={() => setScreen('hub')} />;
  }

  // ── Profile edit ──
  if (screen === 'profile-edit') {
    return <ProfileSetup onDone={() => setScreen('hub')} isEditing />;
  }

  // ── Active solo game ──
  if (screen === 'game') {
    const backToHub = () => { resetGame(); setWalletRefresh(r => r + 1); setScreen('hub'); };
    if (!activeGame || activeGame.id === 'multiplication') {
      return <MultiplicationGame onBack={backToHub} />;
    }
    if (activeGame.id === 'memory') {
      return <MemoryGame onBack={backToHub} />;
    }
    if (activeGame.id === 'hangman') {
      return <HangmanGame onBack={backToHub} />;
    }
    if (activeGame.id === 'brain') {
      return <BrainGame onBack={backToHub} />;
    }
    if (activeGame.id === 'trivia') {
      return <TriviaGame onBack={backToHub} />;
    }
    if (activeGame.id === 'chess') {
      return <ChessGame onBack={backToHub} />;
    }
    if (activeGame.id === 'spelling-bee') {
      return <SpellingBeeGame onBack={backToHub} />;
    }
    return <GameEngine config={activeGame} onBack={backToHub} />;
  }

  // ── Redeem page ──
  if (screen === 'redeem') {
    return <RedeemPage studentName={playerName} playerEmail={playerEmail} onBack={() => setScreen('hub')} onCoinsChanged={() => setWalletRefresh(r => r + 1)} />;
  }

  // ── Character shop ──
  if (screen === 'shop') {
    return <Shop onClose={() => setScreen('hub')} pageMode />;
  }

  // ── Multiplayer hub ──
  if (screen === 'multiplayer') {
    return (
      <MultiplayerHub
        onGameStart={handleMultiplayerStart}
        onBack={() => setScreen('hub')}
      />
    );
  }

  // ── Main Hub ──
  return (
    <div className="flex-1 bg-brand-background p-6 md:p-10 lg:p-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 hidden sm:block">
            <img src="/playwise-logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <OwlMini size={44} />
              <button
                onClick={() => setShowStats(true)}
                className="text-left group"
                title="View my stats"
              >
                <h1 className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-violet-600 transition-colors">
                  Hey, {playerName}! 👋
                </h1>
              </button>
            </div>
            <p className="text-slate-500 text-base mt-0.5 font-medium">Pick a game and start playing</p>
          </div>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          {/* Wallet */}
          <WalletBadge
            studentName={playerName}
            playerEmail={playerEmail}
            refreshKey={walletRefresh}
            onClick={() => {
              if (playerName) syncWorld(playerName, playerEmail);
              setScreen('shop');
            }}
          />
          <SpinWheel onWin={() => setWalletRefresh(r => r + 1)} />
          <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2">
            <Trophy size={16} className="text-brand-accent" />
            <span className="font-bold text-slate-700 text-sm">Explorer</span>
          </div>
          <button onClick={toggleFullscreen}
            className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-violet-500 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button onClick={() => setScreen('profile-edit')}
            className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-violet-500 transition-colors"
            title="Edit Profile">
            <Settings size={20} />
          </button>
          {isAuthenticated && (
            <button onClick={handleLogout}
              className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 transition-colors"
              title="Sign Out">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-black text-slate-700 mb-4">🎮 Choose Your Game</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {ALL_GAMES.filter(g => gameSettings[g.id] !== false).map(config => (
                <HubGameCard
                  key={config.id}
                  config={config}
                  onClick={() => handleGameCardClick(config)}
                  multiplayerBadge={config.id === 'multiplication'}
                />
              ))}
            </div>
          </div>

          {/* World Exploration — hard-disabled until Supabase quota resets */}
          {false && <section
            className="rounded-3xl p-7 flex items-center gap-6 cursor-pointer hover:scale-[1.02] transition-transform shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1a3a1a 0%, #2d6e2d 100%)' }}
            onClick={() => router.push('/world')}
          >
            <OwlMini size={80} />
            <div className="flex-1">
              <h2 className="text-xl font-black text-white">PlayWise World 🗺️</h2>
              <p className="text-white/70 text-sm font-medium mt-1">
                Walk the school, enter rooms, answer questions, earn PlayBits!
              </p>
              <button className="mt-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black px-5 py-2 rounded-xl text-sm transition-colors">
                Explore Now →
              </button>
            </div>
          </section>}

          {/* Math Duels section */}
          <section className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-100 rounded-3xl p-7">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-violet-100 p-3 rounded-2xl text-violet-600">
                <Users size={26} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Math Duels ⚔️</h2>
                <p className="text-slate-500 text-sm font-medium">All 4 games — challenge anyone live</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-5">
              Browse open rooms or create your own. All games available for multiplayer.
            </p>
            <button onClick={() => setScreen('multiplayer')}
              className="text-white font-black px-6 py-3 rounded-xl hover:scale-105 transition-transform shadow-md text-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
              ⚔️ Enter Lobby
            </button>
          </section>
        </div>

        <div className="lg:col-span-1">
          <Leaderboard />
        </div>
      </div>

      <PlayerStatsModal
        studentName={playerName}
        playerEmail={playerEmail}
        grade={playerGrade}
        open={showStats}
        onClose={() => setShowStats(false)}
      />
    </div>
  );
}
