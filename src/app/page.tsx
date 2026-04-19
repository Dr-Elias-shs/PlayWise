"use client";
import { useGameStore } from "@/store/useGameStore";
import { GameCard } from "@/components/hub/GameCard";
import { Calculator, Trophy, Users, BookOpen, Brain, Star } from "lucide-react";
import { useState } from "react";
import { MultiplicationGame } from "@/components/game/MultiplayerGame";

export default function Home() {
  const { playerName, setPlayerName, focusNumber, setFocusNumber } = useGameStore();
  const [showGame, setShowGame] = useState(false);

  if (!playerName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-brand-background">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="bg-brand-primary p-4 rounded-2xl text-white shadow-lg">
              <Star size={40} className="animate-pulse-subtle" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-center text-slate-800 mb-2">PlayWise</h1>
          <p className="text-slate-500 text-center mb-8">Ready to level up your learning?</p>
          
          <div className="space-y-4">
            <label className="block text-sm font-bold text-slate-700">Student Name</label>
            <input 
              type="text"
              placeholder="Enter your name..."
              className="w-full px-5 py-4 rounded-xl border-2 border-slate-100 focus:border-brand-primary outline-none transition-all text-lg font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') setPlayerName((e.target as HTMLInputElement).value);
              }}
              autoFocus
            />
            <button 
              onClick={() => {
                const input = document.querySelector('input') as HTMLInputElement;
                if (input.value) setPlayerName(input.value);
              }}
              className="btn-primary w-full text-lg py-4"
            >
              Get Started
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
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Welcome, {playerName}! 👋</h1>
          <p className="text-slate-500 text-lg mt-1 font-medium">What would you like to master today?</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
            <Trophy className="text-brand-accent" />
            <span className="font-bold text-slate-700">Rank: Explorer</span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

      <section className="mt-16 bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center text-center">
        <div className="bg-slate-100 p-4 rounded-2xl text-slate-400 mb-4">
          <Users size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-700">Classroom Challenges</h2>
        <p className="text-slate-500 max-w-md mt-2 mb-6 font-medium">Join a live session hosted by your teacher or compete with your classmates in real-time.</p>
        <div className="flex gap-4">
           <button className="bg-white text-slate-700 border-2 border-slate-200 px-6 py-3 rounded-xl font-bold hover:border-brand-primary hover:text-brand-primary transition-all">
             Join with Code
           </button>
        </div>
      </section>
    </div>
  );
}