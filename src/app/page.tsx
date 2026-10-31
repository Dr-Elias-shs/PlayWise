"use client";
import { useGameStore } from "@/store/useGameStore";
import { Users, Trophy, LogIn, LogOut, Settings, Maximize, Minimize } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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
import { GameIntro } from "@/components/game/GameIntro";
import { GameLoader } from "@/components/game/GameLoader";
import { PenaltyShootout } from "@/components/game/PenaltyShootout";
import { MultiplayerHub } from "@/components/multiplayer/MultiplayerHub";
import { ProfileSetup } from "@/components/profile/ProfileSetup";
import { RedeemPage } from "@/components/redeem/RedeemPage";
import { Shop } from "@/components/shop/Shop";
import { WalletBadge } from "@/components/hub/WalletBadge";
import { useWalletStore } from "@/store/useWalletStore";
import { useSessionStore } from "@/store/useSessionStore";
import { syncOwned } from "@/lib/coinsClient";
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
import { WorldBackdrop } from "@/components/world/WorldBackdrop";
import { PlaceCard } from "@/components/world/PlaceCard";
import { MascotBubble } from "@/components/world/MascotBubble";

// ─── Page ─────────────────────────────────────────────────────────────────────


type Screen = 'login' | 'profile-setup' | 'hub' | 'profile-edit' | 'game-intro' | 'game-loading' | 'game' | 'multiplayer' | 'redeem' | 'shop';

export default function Home() {
  const { playerName, playerEmail, playerGrade, colorId, characterId, setPlayerName, setProfile, resetGame, loadStoredProfile } = useGameStore();
  const { start: startSession, end: endSession } = useSessionStore();
  const { playerName: walletName, playerEmail: walletEmail, setPlayerName: setWalletName, syncWithDatabase: syncWallet } = useWalletStore();
  const [screen, setScreen] = useState<Screen>('login');
  const [showIntro, setShowIntro] = useState(() => {
    try { return typeof window !== 'undefined' ? !localStorage.getItem(INTRO_SEEN_KEY) : false; }
    catch { return false; } // storage blocked on MDM tablets — skip intro entirely
  });

  // Sync Hub player name and email into the wallet store (for Shop currency sync)
  useEffect(() => {
    if (playerName && (playerName !== walletName || playerEmail !== walletEmail)) {
      setWalletName(playerName, playerEmail);
    }
  }, [playerName, playerEmail, walletName, walletEmail, setWalletName]);
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
  // Hub: one game card at a time comes alive (its Higgsfield loop), cycling every 5 s.
  const [spotlight, setSpotlight] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSpotlight(i => i + 1), 5000);
    return () => clearInterval(t);
  }, []);
  const sessionClass = useSessionStore(st => st.session?.classroom ?? null);
  const [bannedInfo, setBannedInfo] = useState<{ banned: boolean; reason: string } | null>(null);
  // Staff (from Wisely) skip the time limits; the old ?unlock= code was readable by anyone.
  const isStaffSession = useSessionStore(st => !!st.session && (st.session.isStaff || st.session.isAdmin));
  const testBypass = isStaffSession;
  const { isFullscreen, toggle: toggleFullscreen, enter: enterFullscreen } = useFullscreen();
  const msalConfigured = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID !== '00000000-0000-0000-0000-000000000000';
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  // Heartbeat — tracks this student as active while on hub or in a game
  const heartbeatGame = (screen === 'game' || screen === 'game-intro') ? (activeGame?.title ?? 'Game') : screen === 'multiplayer' ? 'Multiplayer Hub' : 'Hub';
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
    // Grade and class come from Wisely through the server session. When Wisely has
    // a grade it wins over whatever this device remembered.
    startSession(instance, accounts[0]).then(s => {
      if (!s) return;
      const st = useGameStore.getState();
      if (s.grade && st.playerGrade !== s.grade) {
        setProfile(displayName, email, st.colorId || 'green', s.grade, st.characterId || 'male');
      }
      // Owned shop items live on the wallet so they follow the student to any tablet.
      syncOwned({ accessories: st.ownedAccessories, clothing: st.ownedClothing, characters: st.ownedCharacters })
        .then(owned => {
          if (!owned) return;
          const g = useGameStore.getState();
          (owned.accessories ?? []).forEach(id => { if (!g.ownedAccessories.includes(id)) g.ownAccessory(id); });
          (owned.clothing ?? []).forEach(id => { if (!g.ownedClothing.includes(id)) g.ownClothing(id); });
          (owned.characters ?? []).forEach(id => { if (!g.ownedCharacters.includes(id)) g.ownCharacter(id); });
        });
    });
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
    endSession();
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
    setScreen('game-intro');
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
  if (!isLocal && !testBypass && (screen === 'hub' || screen === 'game') && !access.allowed) {
    return <TimeGate access={access} loading={false} grade={playerGrade ?? ''} onRetry={tmRefresh} />;
  }

  // ── Login ──
  if (screen === 'login' || (!playerName && screen !== 'profile-setup')) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-6">
        <WorldBackdrop wash={0.15} />
        <div className="relative z-10 max-w-md w-full bg-white/95 backdrop-blur-md rounded-[32px] overflow-hidden"
          style={{ boxShadow: '0 8px 0 rgba(15,60,40,0.18), 0 24px 50px -16px rgba(15,60,40,0.45)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/world/intro.webp" alt="The PlayWise friends looking over PlayWise Valley" className="w-full aspect-[16/8] object-cover" />
          <div className="p-7 pt-5">
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
          <h1 className="font-display text-4xl font-extrabold text-center text-emerald-950 mb-1">PlayWise</h1>
          <p className="text-emerald-900/60 text-center font-bold mb-7">Your adventure in PlayWise Valley starts here</p>

          <div className="space-y-3">
            {/* Microsoft SSO — the real login */}
            {msalConfigured ? (
              <button onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 transition-all font-display font-extrabold text-amber-950 text-xl"
                style={{ boxShadow: '0 5px 0 #b45309' }}>
                <LogIn size={22} />
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

  // ── Game intro ──
  if (screen === 'game-intro' && activeGame) {
    return (
      <GameIntro
        config={activeGame}
        onPlay={() => { enterFullscreen(); setScreen('game-loading'); }}
        onBack={() => { resetGame(); setScreen('hub'); }}
      />
    );
  }

  // ── Game loader (football keepie-uppies while the game boots) ──
  if (screen === 'game-loading' && activeGame) {
    return <GameLoader config={activeGame} onDone={() => setScreen('game')} />;
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
    if (activeGame.id === 'penalty') {
      return <PenaltyShootout onBack={backToHub} />;
    }
    return <GameEngine config={activeGame} onBack={backToHub} />;
  }

  // ── Redeem page ──
  if (screen === 'redeem') {
    return <RedeemPage studentName={playerName} playerEmail={playerEmail} onBack={() => setScreen('shop')} onCoinsChanged={() => setWalletRefresh(r => r + 1)} />;
  }

  // ── Character shop ──
  if (screen === 'shop') {
    return <Shop onClose={() => setScreen('hub')} pageMode onPrizes={() => setScreen('redeem')} />;
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
  const visibleGames = ALL_GAMES.filter(g => gameSettings[g.id] !== false);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <WorldBackdrop />

      <div className="relative z-10 px-4 py-5 md:px-8 md:py-7 lg:px-10 max-w-7xl mx-auto"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}>

        {/* ── Header: the owl says hello ── */}
        <header className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 bg-white/85 backdrop-blur-md rounded-[28px] pl-2 pr-5 py-2 min-w-0"
            style={{ boxShadow: '0 5px 0 rgba(15,60,40,0.12), 0 12px 24px -12px rgba(15,60,40,0.3)' }}>
            <MascotBubble size={58} />
            <button onClick={() => setShowStats(true)} className="text-left min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-emerald-950 leading-tight truncate">
                Hey, {playerName}!
              </h1>
              <p className="text-emerald-800/70 text-sm font-bold truncate">
                Grade {playerGrade}{sessionClass ? ` · ${sessionClass}` : ''} · Where to today?
              </p>
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 flex-wrap">
            <WalletBadge
              studentName={playerName} playerEmail={playerEmail} refreshKey={walletRefresh}
              onClick={() => { if (playerName) syncWallet(playerName, playerEmail); setScreen('shop'); }}
            />
            <SpinWheel onWin={() => setWalletRefresh(r => r + 1)} />
            {[
              { on: toggleFullscreen, title: isFullscreen ? 'Exit Fullscreen' : 'Fullscreen', icon: isFullscreen ? <Minimize size={18} /> : <Maximize size={18} /> },
              { on: () => setScreen('profile-edit'), title: 'Edit Profile', icon: <Settings size={18} /> },
              ...(isAuthenticated ? [{ on: handleLogout, title: 'Sign Out', icon: <LogOut size={18} /> }] : []),
            ].map(b => (
              <button key={b.title} onClick={b.on} title={b.title}
                className="bg-white/85 backdrop-blur-md p-2.5 rounded-2xl text-emerald-900/70 hover:text-emerald-950 hover:bg-white transition-all"
                style={{ boxShadow: '0 3px 0 rgba(15,60,40,0.15)' }}>
                {b.icon}
              </button>
            ))}
          </motion.div>
        </header>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
              className="flex items-center gap-3">
              <h2 className="font-display text-emerald-950 text-xl sm:text-2xl font-extrabold">Explore PlayWise Valley</h2>
              <div className="flex-1 h-1 rounded-full bg-emerald-900/10" />
              <span className="text-emerald-900/60 text-xs font-black bg-white/70 px-2.5 py-1 rounded-full">{visibleGames.length} places</span>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {visibleGames.map((config, i) => (
                <PlaceCard
                  key={config.id}
                  config={config}
                  index={i}
                  spotlight={visibleGames.length > 0 && spotlight % visibleGames.length === i}
                  onClick={() => handleGameCardClick(config)}
                  badge={config.id === 'multiplication' ? 'Duels too' : undefined}
                />
              ))}
            </div>

            {/* Math Duels (hidden when the grade's Math Duels switch is off) */}
            {gameSettings.multiplayer !== false && <motion.button
              type="button"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
              whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}
              onClick={() => setScreen('multiplayer')}
              className="relative w-full text-left overflow-hidden rounded-[28px]"
              style={{ boxShadow: '0 6px 0 rgba(49,24,87,0.35), 0 14px 30px -12px rgba(49,24,87,0.5)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/world/places/multiplication.webp" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(49,24,87,0.92) 0%, rgba(49,24,87,0.7) 55%, rgba(49,24,87,0.2) 100%)' }} />
              <div className="relative z-10 p-5 sm:p-6 flex items-center gap-4">
                <div className="bg-white/15 rounded-2xl p-3.5 border border-white/25 shrink-0">
                  <Users size={28} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-2xl font-extrabold text-white leading-tight">Math Duels at the Castle</h2>
                  <p className="text-white/75 text-sm mt-0.5">Challenge a classmate live, head to head</p>
                </div>
                <span className="hidden sm:block bg-amber-400 text-amber-950 font-black text-sm px-5 py-2.5 rounded-2xl shrink-0"
                  style={{ boxShadow: '0 3px 0 #b45309' }}>
                  Enter lobby
                </span>
              </div>
            </motion.button>}

          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="lg:col-span-1">
            <Leaderboard />
          </motion.div>
        </div>
      </div>

      <PlayerStatsModal
        studentName={playerName} playerEmail={playerEmail} grade={playerGrade}
        open={showStats} onClose={() => setShowStats(false)}
      />
    </div>
  );
}
