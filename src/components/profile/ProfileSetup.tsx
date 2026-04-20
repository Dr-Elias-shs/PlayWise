"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';

export const AVATARS = [
  '🦁','🐯','🐼','🦊','🐸','🐧','🦄','🐬',
  '🦋','🐺','🧙','🦸','🤖','👾','🧚','🦝',
];

interface Props {
  onDone: () => void;
  isEditing?: boolean;
}

export function ProfileSetup({ onDone, isEditing = false }: Props) {
  const { playerName, playerAvatar, setProfile } = useGameStore();
  const [name, setName] = useState(playerName || '');
  const [avatar, setAvatar] = useState(playerAvatar || AVATARS[0]);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }
    if (trimmed.length > 20) { setError('Name must be 20 characters or less'); return; }
    setProfile(trimmed, avatar);
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
            {isEditing ? 'Change your name or avatar' : 'Pick an avatar and enter your name'}
          </p>
        </div>

        {/* Avatar grid */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-500 mb-3">Choose your avatar</p>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map(a => (
              <motion.button
                key={a}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAvatar(a)}
                className={`text-2xl p-1.5 rounded-xl transition-all ${
                  avatar === a
                    ? 'bg-violet-100 ring-2 ring-violet-500 scale-110'
                    : 'hover:bg-slate-50'
                }`}
              >
                {a}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div className="mb-6">
          <p className="text-sm font-bold text-slate-500 mb-2">Your name</p>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-full px-4 py-3 border-2 border-slate-200 focus:border-violet-500 rounded-2xl text-lg font-bold text-slate-800 outline-none transition-colors"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="w-full py-4 text-white font-black text-lg rounded-2xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}
        >
          {isEditing ? '✅ Save Changes' : '🚀 Let\'s Play!'}
        </motion.button>

        {isEditing && (
          <button onClick={onDone} className="w-full mt-3 py-2 text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors">
            Cancel
          </button>
        )}
      </motion.div>
    </div>
  );
}
