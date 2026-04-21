"use client";
import { useGameStore } from "@/store/useGameStore";
import { Users, Trophy, LogIn, LogOut, Settings, Maximize, Minimize } from "lucide-react";
import { useState, useEffect } from "react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { motion } from "framer-motion";
import { MultiplicationGame } from "@/components/game/MultiplayerGame";
import { GameEngine } from "@/components/game/GameEngine";
import { MemoryGame } from "@/components/game/MemoryGame";
import { MultiplayerHub } from "@/components/multiplayer/MultiplayerHub";
import { ProfileSetup } from "@/components/profile/ProfileSetup";
import { RedeemPage } from "@/components/redeem/RedeemPage";
import { WalletBadge } from "@/components/hub/WalletBadge";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/lib/msal";
import { Leaderboard } from "@/components/hub/Leaderboard";
import { ALL_GAMES, GameConfig } from "@/lib/gameConfigs";

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

const ALLOWED_DOMAIN = 'sagessehs.edu.lb';

type Screen = 'login' | 'profile-setup' | 'hub' | 'profile-edit' | 'game' | 'multiplayer' | 'redeem';

export default function Home() {
  const { playerName, playerAvatar, setPlayerName, resetGame, loadStoredProfile } = useGameStore();
  const [screen, setScreen] = useState<Screen>('login');
  const [activeGame, setActiveGame] = useState<GameConfig | null>(null);
  const [multiGameId, setMultiGameId] = useState<string>('multiplication');
  const [walletRefresh, setWalletRefresh] = useState(0);
  const [domainError, setDomainError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const { isFullscreen, toggle: toggleFullscreen, enter: enterFullscreen } = useFullscreen();
  const msalConfigured = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID !== '00000000-0000-0000-0000-000000000000';
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  // Load profile from localStorage on mount
  useEffect(() => {
    loadStoredProfile();
  }, [loadStoredProfile]);

  // After MSAL login — check domain then set name
  useEffect(() => {
    if (!isAuthenticated || accounts.length === 0) return;
    const email = (accounts[0].username ?? '').toLowerCase();
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setDomainError(`Only @${ALLOWED_DOMAIN} accounts can access PlayWise.`);
      instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin }).catch(() => {});
      return;
    }
    if (!playerName) {
      setDomainError('');
      setPlayerName(accounts[0].name || accounts[0].username);
    }
  }, [isAuthenticated, accounts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine initial screen once playerName/avatar known
  useEffect(() => {
    if (screen !== 'login') return;
    if (playerName && playerAvatar) setScreen('hub');
    else if (playerName && !playerAvatar) setScreen('profile-setup');
  }, [playerName, playerAvatar, screen]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(e => {
      if (e?.errorCode !== 'interaction_in_progress') console.error(e);
    });
  };

  const handleEmailLogin = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email.includes('@')) { setDomainError('Enter a valid email address.'); return; }
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setDomainError(`Only @${ALLOWED_DOMAIN} accounts can access PlayWise.`);
      return;
    }
    setDomainError('');
    // Extract display name from email prefix (john.doe → John Doe)
    const prefix = email.split('@')[0];
    const displayName = prefix.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    setPlayerName(displayName);
    setScreen('profile-setup');
  };

  const handleLogout = () => {
    setPlayerName('');
    setEmailInput('');
    setScreen('login');
    if (isAuthenticated) {
      instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
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

  // ── Login ──
  if (screen === 'login' || (!playerName && screen !== 'profile-setup')) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-brand-background">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100">
              <img src="/playwise-logo.png" alt="PlayWise Logo" className="w-24 h-24 object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-slate-800 mb-2">PlayWise</h1>
          <p className="text-slate-500 text-center mb-8">Ready to level up your learning?</p>

          {domainError && (
            <div className="mb-4 bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-center">
              <p className="text-red-600 font-bold text-sm">⛔ {domainError}</p>
            </div>
          )}

          <div className="space-y-3">
            {/* School email login — always visible */}
            <div>
              <p className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">
                Sign in with your school email
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); setDomainError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                  placeholder={`yourname@${ALLOWED_DOMAIN}`}
                  className="flex-1 px-3 py-3 border-2 border-slate-200 focus:border-brand-primary rounded-xl text-sm font-medium outline-none transition-colors"
                />
                <button onClick={handleEmailLogin}
                  className="px-4 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                  Go →
                </button>
              </div>
            </div>

            {/* Microsoft SSO — only shown when Azure is configured */}
            {msalConfigured && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs text-slate-400 font-medium">or</span>
                </div>
              </div>
            )}
            {msalConfigured && (
              <button onClick={handleLogin}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border-2 border-slate-100 hover:border-brand-primary hover:bg-brand-primary/5 transition-all font-bold text-slate-700 text-sm">
                <LogIn size={20} className="text-brand-primary" />
                Sign in with Microsoft SSO
              </button>
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
    return <GameEngine config={activeGame} onBack={backToHub} />;
  }

  // ── Redeem page ──
  if (screen === 'redeem') {
    return <RedeemPage studentName={playerName} onBack={() => setScreen('hub')} onCoinsChanged={() => setWalletRefresh(r => r + 1)} />;
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
              <span className="text-3xl">{playerAvatar}</span>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Hey, {playerName}! 👋</h1>
            </div>
            <p className="text-slate-500 text-base mt-0.5 font-medium">Pick a game and start playing</p>
          </div>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          {/* Wallet */}
          <WalletBadge
            studentName={playerName}
            refreshKey={walletRefresh}
            onClick={() => setScreen('redeem')}
          />
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
              {ALL_GAMES.map(config => (
                <HubGameCard
                  key={config.id}
                  config={config}
                  onClick={() => handleGameCardClick(config)}
                  multiplayerBadge={config.id === 'multiplication'}
                />
              ))}
            </div>
          </div>

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
    </div>
  );
}
