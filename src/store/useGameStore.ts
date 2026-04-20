import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const STORAGE_KEY = 'playwise_profile';

function loadProfile(): { name: string; avatar: string } {
  if (typeof window === 'undefined') return { name: '', avatar: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { name: '', avatar: '' };
  } catch { return { name: '', avatar: '' }; }
}

function saveProfile(name: string, avatar: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, avatar }));
}

interface GameState {
  // Profile
  playerName: string;
  playerAvatar: string;
  setProfile: (name: string, avatar: string) => void;
  setPlayerName: (name: string) => void;
  loadStoredProfile: () => void;

  // Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // Game
  focusNumber: number | null;
  setFocusNumber: (num: number | null) => void;
  score: number;
  streak: number;
  maxStreak: number;
  correctCount: number;
  wrongCount: number;
  scoreMultiplier: number;
  incrementScore: (points: number) => void;
  incrementWrong: () => void;
  setScoreMultiplier: (m: number) => void;
  resetGame: () => void;

  // Multiplayer
  socket: Socket | null;
  roomId: string | null;
  roomData: any | null;
  connectSocket: () => void;
  joinRoom: (roomId: string) => void;
  startGameMultiplayer: (config: any) => void;
  clearRoom: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerName: '',
  playerAvatar: '',

  setProfile: (name, avatar) => {
    saveProfile(name, avatar);
    set({ playerName: name, playerAvatar: avatar });
  },

  setPlayerName: (name) => {
    const { playerAvatar } = get();
    saveProfile(name, playerAvatar);
    set({ playerName: name });
  },

  loadStoredProfile: () => {
    const { name, avatar } = loadProfile();
    if (name) set({ playerName: name, playerAvatar: avatar });
  },

  soundEnabled: true,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  focusNumber: null,
  setFocusNumber: (num) => set({ focusNumber: num }),
  score: 0, streak: 0, maxStreak: 0, correctCount: 0, wrongCount: 0, scoreMultiplier: 1,

  incrementScore: (points) => set((s) => {
    const newStreak = s.streak + 1;
    return {
      score: s.score + Math.floor(points * s.scoreMultiplier),
      streak: newStreak,
      maxStreak: Math.max(s.maxStreak, newStreak),
      correctCount: s.correctCount + 1,
    };
  }),

  incrementWrong: () => set((s) => ({ streak: 0, wrongCount: s.wrongCount + 1 })),
  setScoreMultiplier: (m) => set({ scoreMultiplier: m }),
  resetGame: () => set({ score: 0, streak: 0, maxStreak: 0, correctCount: 0, wrongCount: 0, scoreMultiplier: 1 }),

  socket: null,
  roomId: null,
  roomData: null,

  connectSocket: () => {
    if (!get().socket) {
      const socket = io();
      socket.on('room_update', (data) => set({ roomData: data }));
      socket.on('game_started', (data) => set({ roomData: data, focusNumber: data.config.focusNumber }));
      socket.on('leaderboard_update', (players) => set((s) => ({ roomData: { ...s.roomData, players } })));
      set({ socket });
    }
  },

  joinRoom: (roomId) => {
    const { socket, playerName, playerAvatar } = get();
    if (socket) {
      socket.emit('join_room', { roomId, playerName, playerAvatar });
      set({ roomId });
    }
  },

  startGameMultiplayer: (config) => {
    const { socket, roomId } = get();
    if (socket && roomId) socket.emit('start_game', { roomId, config });
  },

  clearRoom: () => set({ roomId: null, roomData: null }),
}));
