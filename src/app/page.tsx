"use client";
import { useGameStore } from "@/store/useGameStore";
import { GameCard } from "@/components/hub/GameCard";
import { Calculator, Trophy, Users, BookOpen, Brain, Star, LogIn, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { MultiplicationGame } from "@/components/game/MultiplayerGame";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/lib/msal";
import { Leaderboard } from "@/components/hub/Leaderboard";

export default function Home() {
  const { playerName, setPlayerName, focusNumber, setFocusNumber } = useGameStore();
  const [showGame, setShowGame] = useState(false);
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  useEffect(() => {
    if (isAuthenticated && accounts.length > 0 && !playerName) {
      setPlayerName(accounts[0].name || accounts[0].username);
    }
  }, [isAuthenticated, accounts, playerName, setPlayerName]);

  const handleLogin = () => {
    instance.loginPopup(loginRequest).catch(e => {
      console.error(e);
    });
  };

  const handleLogout = () => {
    instance.logoutPopup().then(() => {
      setPlayerName("");
    });
  };

  if (!playerName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-brand-background">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100">
              <img src="/exams-logo.png" alt="PlayWise Logo" className="w-16 h-16 object-contain" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-slate-800 mb-2">PlayWise</h1>
          <p className="text-slate-500 text-center mb-8">Ready to level up your learning?</p>
          
          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 border-slate-100 hover:border-brand-primary hover:bg-brand-primary/5 transition-all text-lg font-bold text-slate-700"
            >
              <LogIn size={24} className="text-brand-primary" />
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showGame) {
    return <MultiplicationGame onBack={() => setShowGame(false)} />;
  }

  return (
    <div className="flex-1 bg-brand-background p-6 md:p-10 lg:p-16">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 hidden sm:block">
            <img src="/exams-logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">Welcome, {playerName}! 👋</h1>
            <p className="text-slate-500 text-lg mt-1 font-medium">What would you like to master today?</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <Trophy className="text-brand-accent" />
            <span className="font-bold text-slate-700">Rank: Explorer</span>
          </div>
          {isAuthenticated && (
            <button 
              onClick={handleLogout}
              className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut size={24} />
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GameCard 
              title="Multiplication Blitz"
              description="Master your tables with speed and accuracy."
              icon={Calculator}
              color="bg-brand-primary"
              onClick={() => setShowGame(true)}
            />
            <GameCard 
              title="Fraction Heroes"
              description="Save the city by solving fraction puzzles."
              icon={Brain}
              color="bg-pink-500"
              disabled
            />
            <GameCard 
              title="Vocabulary Quest"
              description="Explore new worlds and build your word power."
              icon={BookOpen}
              color="bg-emerald-500"
              disabled
            />
          </section>

          <section className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center">
            <div className="bg-slate-100 p-4 rounded-2xl text-slate-400 mb-4">
              <Users size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-700">Classroom Challenges</h2>
            <p className="text-slate-500 max-w-md mt-2 mb-6 text-sm font-medium">Join a live session hosted by your teacher or compete with your classmates in real-time.</p>
            <div className="flex gap-4">
               <button className="bg-white text-slate-700 border-2 border-slate-200 px-6 py-2 rounded-xl font-bold hover:border-brand-primary hover:text-brand-primary transition-all text-sm">
                 Join with Code
               </button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}