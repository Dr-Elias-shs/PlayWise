"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { COLORS } from '@/lib/avatar-items';
import { OwlMini } from '@/components/game/OwlCharacter';
import { useCharacterRegistry } from '@/lib/characterRegistry';

const GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));

interface Props {
  onDone: () => void;
  isEditing?: boolean;
}

export function ProfileSetup({ onDone, isEditing = false }: Props) {
  const {
    playerName, playerEmail, playerGrade,
    colorId: storedColorId, characterId: storedCharId,
    setProfile,
  } = useGameStore();
  const registry = useCharacterRegistry();

  const [name,        setName]     = useState(playerName   || '');
  const [colorId,     setColorId]  = useState(storedColorId || 'green');
  const [characterId, setCharId]   = useState(storedCharId  || 'male');
  const [grade,       setGrade]    = useState(playerGrade   || '');
  const [error,         setError]    = useState('');

  const handleSave = () => {
    const stripped = name.trim().split('').filter(c => c.codePointAt(0)! < 0x1F000).join('');
    const trimmed  = stripped.replace(/[^\w\sÀ-öø-ÿ؀-ۿ\-'.]/g, '').trim();
    if (trimmed.length < 2)  { setError('Name must be at least 2 characters'); return; }
    if (trimmed.length > 20) { setError('Name must be 20 characters or less');  return; }
    if (!grade)              { setError('Please select your grade');             return; }
    setProfile(trimmed, playerEmail, colorId, grade, characterId as string);
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #1e1b4b, #4c1d95, #6b21a8)' }}>

      {/* SHS logo — upper left */}
      <div className="fixed top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-1.5 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/exams-logo.png" alt="SHS" draggable={false} className="w-10 h-10 object-contain" />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg"
      >
        {/* ── Character type picker ── */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-500 mb-3 text-center">
            {isEditing ? 'Edit Profile' : 'Choose Your Character'}
          </p>
          <div className={`grid gap-4 ${registry.characters.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {registry.characters.map(c => (
              <motion.button key={c.id}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => setCharId(c.id)}
                className="flex flex-col items-center gap-2 rounded-2xl py-4 px-3 transition-all"
                style={{
                  background: characterId === c.id ? '#ede9fe' : '#f8fafc',
                  outline: characterId === c.id ? '2.5px solid #7c3aed' : '2.5px solid transparent',
                }}
              >
                <div className="relative" style={{ width: 72, height: 72 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.standFrame} alt={c.name} draggable={false}
                    style={{ width: 72, height: 72, objectFit: 'contain',
                             filter: COLORS.find(col => col.id === colorId)?.filter ?? '' }}
                  />
                </div>
                <span className="text-sm font-black text-slate-700">{c.name}</span>
                {characterId === c.id && (
                  <span className="text-xs font-bold text-violet-600">✓ Selected</span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Live preview ── */}
        <div className="flex justify-center mb-5">
          <motion.div key={`${colorId}-${characterId}`}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
            <OwlMini colorIdOverride={colorId} size={80} />
          </motion.div>
        </div>

        {/* ── Colour grid ── */}
        <div className="mb-5">
          <p className="text-sm font-bold text-slate-500 mb-3">Choose your colour</p>
          <div className="grid grid-cols-5 gap-3">
            {COLORS.map(c => (
              <button key={c.id} onClick={() => setColorId(c.id)}
                className="flex flex-col items-center gap-1.5">
                <div className={`w-11 h-11 rounded-full border-4 transition-all duration-150
                  ${colorId === c.id
                    ? 'border-violet-500 scale-110 shadow-lg shadow-violet-300/50'
                    : 'border-slate-200 hover:border-violet-300 hover:scale-105'}`}
                  style={{ background: c.swatch }}>
                  {colorId === c.id && (
                    <div className="w-full h-full rounded-full flex items-center justify-center
                      text-white font-black text-base">✓</div>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-500 text-center leading-tight">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Name ── */}
        <div className="mb-4">
          <p className="text-sm font-bold text-slate-500 mb-2">Your name</p>
          <input type="text" value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-full px-4 py-3 border-2 border-slate-200 focus:border-violet-500
              rounded-2xl text-lg font-bold text-slate-800 outline-none transition-colors"
          />
        </div>

        {/* ── Grade ── */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-500 mb-2">Your grade</p>
          <select value={grade} onChange={e => { setGrade(e.target.value); setError(''); }}
            className="w-full px-4 py-3 border-2 border-slate-200 focus:border-violet-500
              rounded-2xl text-lg font-bold text-slate-800 outline-none transition-colors
              bg-white appearance-none cursor-pointer">
            <option value="">Select your grade...</option>
            {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
          </select>
        </div>

        {error && <p className="text-red-500 text-sm mb-3 font-medium">{error}</p>}

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="w-full py-4 text-white font-black text-lg rounded-2xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
          {isEditing ? '✅ Save Changes' : "🚀 Let's Play!"}
        </motion.button>

        {isEditing && (
          <button onClick={onDone}
            className="w-full mt-3 py-2 text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors">
            Cancel
          </button>
        )}
      </motion.div>
    </div>
  );
}
