import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

// v3 — now stores email as stable identifier
const STORAGE_KEY = 'playwise_profile_v3';

interface StoredProfile {
  name: string;
  email: string;
  avatar: string;
  grade: string;
}

function loadProfile(): StoredProfile {
  if (typeof window === 'undefined') return { name: '', email: '', avatar: '', grade: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Migrate from v2 (no email) — keep name, email will be set on next SSO login
    const v2 = localStorage.getItem('playwise_profile_v2');
    if (v2) return { ...JSON.parse(v2), email: '' };
    return { name: '', email: '', avatar: '', grade: '' };
  } catch { return { name: '', email: '', avatar: '', grade: '' }; }
}

function saveProfile(p: StoredProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

interface GameState {
  // Profile
  playerName:   string;  // display name (for UI only)
  playerEmail:  string;  // stable DB identifier (email)
  playerAvatar: string;
  playerGrade:  string;

  setProfile:      (name: string, email: string, avatar: string, grade: string) => void;
  setPlayerName:   (name: string, email?: string) => void;
  loadStoredProfile: () => void;

  // Sound
  soundEnabled:    boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // Game
  focusNumber:       number | null;
  setFocusNumber:    (num: number | null) => void;
  score:             number;
  streak:            number;
  maxStreak:         number;
  correctCount:      number;
  wrongCount:        number;
  scoreMultiplier:   number;
  incrementScore:    (points: number) => void;
  incrementWrong:    () => void;
  setScoreMultiplier:(m: number) => void;
  resetGame:         () => void;

  // Multiplayer
  socket:              Socket | null;
  roomId:              string | null;
  roomData:            any | null;
  connectSocket:       () => void;
  joinRoom:            (roomId: string) => void;
  startGameMultiplayer:(config: any) => void;
  clearRoom:           () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerName:   '',
  playerEmail:  '',
  playerAvatar: '',
  playerGrade:  '',

  setProfile(name, email, avatar, grade) {
    const p = { name, email: email.toLowerCase().trim(), avatar, grade };
    saveProfile(p);
    set({ playerName: p.name, playerEmail: p.email, playerAvatar: avatar, playerGrade: grade });
  },

  setPlayerName(name, email) {
    const { playerAvatar, playerGrade, playerEmail } = get();
    const resolvedEmail = (email ?? playerEmail ?? '').toLowerCase().trim();
    saveProfile({ name, email: resolvedEmail, avatar: playerAvatar, grade: playerGrade });
    set({ playerName: name, playerEmail: resolvedEmail });
  },

  loadStoredProfile() {
    const { name, email, avatar, grade } = loadProfile();
    if (name || email) {
      set({ playerName: name, playerEmail: email, playerAvatar: avatar, playerGrade: grade });
    }
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

  incrementWrong:    () => set((s) => ({ streak: 0, wrongCount: s.wrongCount + 1 })),
  setScoreMultiplier:(m) => set({ scoreMultiplier: m }),
  resetGame:         () => set({ score: 0, streak: 0, maxStreak: 0, correctCount: 0, wrongCount: 0, scoreMultiplier: 1 }),

  socket: null, roomId: null, roomData: null,

  connectSocket() {
    if (!get().socket) {
      const socket = io();
      socket.on('room_update',       (data)    => set({ roomData: data }));
      socket.on('game_started',      (data)    => set({ roomData: data, focusNumber: data.config.focusNumber }));
      socket.on('leaderboard_update',(players) => set((s) => ({ roomData: { ...s.roomData, players } })));
      set({ socket });
    }
  },

  joinRoom(roomId) {
    const { socket, playerName, playerAvatar } = get();
    if (socket) { socket.emit('join_room', { roomId, playerName, playerAvatar }); set({ roomId }); }
  },

  startGameMultiplayer(config) {
    const { socket, roomId } = get();
    if (socket && roomId) socket.emit('start_game', { roomId, config });
  },

  clearRoom: () => set({ roomId: null, roomData: null }),
}));
