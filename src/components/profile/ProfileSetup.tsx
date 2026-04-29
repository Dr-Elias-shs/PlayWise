"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { COLORS } from '@/lib/avatar-items';
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

        {/* ── Colour grid — each swatch shows the character in that colour ── */}
        <div className="mb-5">
          <p className="text-sm font-bold text-slate-500 mb-3">Choose your colour</p>
          <div className="grid grid-cols-5 gap-2">
            {COLORS.map(c => {
              const charDef = registry.character(characterId) ?? registry.characters[0];
              const src = charDef?.standFrame ?? '/character/walk2.png';
              const selected = colorId === c.id;
              return (
                <button key={c.id} onClick={() => setColorId(c.id)}
                  className="flex flex-col items-center gap-1 group">
                  <div className={`relative rounded-2xl overflow-hidden transition-all duration-150
                    ${selected
                      ? 'ring-2 ring-violet-500 ring-offset-1 scale-110 shadow-lg shadow-violet-300/40'
                      : 'ring-1 ring-slate-200 hover:ring-violet-300 hover:scale-105'}`}
                    style={{ width: 52, height: 52,
                             background: selected ? '#ede9fe' : '#f1f5f9' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={c.name} draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'contain',
                               filter: c.filter || undefined }} />
                    {selected && (
                      <div className="absolute inset-0 flex items-end justify-end p-0.5">
                        <span className="text-[10px] bg-violet-500 text-white rounded-full w-4 h-4
                          flex items-center justify-center font-black leading-none">✓</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold text-center leading-tight transition-colors
                    ${selected ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    {c.name}
                  </span>
                </button>
              );
            })}
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
