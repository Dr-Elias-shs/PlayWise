"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';

export const AVATARS = [
  '🦁','🐯','🐼','🦊','🐸','🐧','🦄','🐬',
  '🦋','🐺','🧙','🦸','🤖','👾','🧚','🦝',
];

const GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));

interface Props {
  onDone: () => void;
  isEditing?: boolean;
}

export function ProfileSetup({ onDone, isEditing = false }: Props) {
  const { playerName, playerEmail, playerAvatar, playerGrade, setProfile } = useGameStore();
  const [name, setName]   = useState(playerName  || '');
  const [avatar, setAvatar] = useState(playerAvatar || AVATARS[0]);
  const [grade, setGrade]  = useState(playerGrade  || '');
  const [error, setError]  = useState('');

  const handleSave = () => {
    // Strip emojis and non-printable characters — letters, numbers, spaces, hyphens only
    const trimmed = name.trim().replace(/[^\p{L}\p{N}\s\-'.]/gu, '').trim();
    if (trimmed.length < 2)  { setError('Name must be at least 2 characters'); return; }
    if (trimmed.length > 20) { setError('Name must be 20 characters or less');  return; }
    if (!grade)              { setError('Please select your grade');             return; }
    setProfile(trimmed, playerEmail, avatar, grade);
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #1e1b4b, #4c1d95, #6b21a8)' }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{avatar}</div>
          <h2 className="text-3xl font-black text-slate-800">
            {isEditing ? 'Edit Profile' : 'Create Your Profile'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isEditing ? 'Update your info' : 'Set up your player profile'}
          </p>
        </div>

        {/* Avatar grid */}
        <div className="mb-5">
          <p className="text-sm font-bold text-slate-500 mb-3">Choose your avatar</p>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map(a => (
              <motion.button key={a}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAvatar(a)}
                className="relative flex items-center justify-center rounded-xl transition-colors"
                style={{
                  padding: '6px',
                  background: avatar === a ? '#ede9fe' : 'transparent',
                  outline: avatar === a ? '2.5px solid #7c3aed' : '2.5px solid transparent',
                  outlineOffset: '1px',
                }}>
                <span className="text-2xl leading-none select-none">{a}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="mb-4">
          <p className="text-sm font-bold text-slate-500 mb-2">Your name</p>
          <input type="text" value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-full px-4 py-3 border-2 border-slate-200 focus:border-violet-500 rounded-2xl text-lg font-bold text-slate-800 outline-none transition-colors"
          />
        </div>

        {/* Grade */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-500 mb-2">Your grade</p>
          <select value={grade} onChange={e => { setGrade(e.target.value); setError(''); }}
            className="w-full px-4 py-3 border-2 border-slate-200 focus:border-violet-500 rounded-2xl text-lg font-bold text-slate-800 outline-none transition-colors bg-white appearance-none cursor-pointer">
            <option value="">Select your grade...</option>
            {GRADES.map(g => (
              <option key={g} value={g}>Grade {g}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-red-500 text-sm mb-3 font-medium">{error}</p>}

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="w-full py-4 text-white font-black text-lg rounded-2xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
          {isEditing ? '✅ Save Changes' : '🚀 Let\'s Play!'}
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
