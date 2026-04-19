import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

interface GameState {
  // Hub & User
  playerName: string;
  setPlayerName: (name: string) => void;
  
  // Sound
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  
  // Multiplication Game
  focusNumber: number | null;
  setFocusNumber: (num: number | null) => void;
  score: number;
  streak: number;
  incrementScore: (points: number) => void;
  resetGame: () => void;
  
  // Multiplayer
  socket: Socket | null;
  roomId: string | null;
  roomData: any | null;
  connectSocket: () => void;
  joinRoom: (roomId: string) => void;
  startGameMultiplayer: (config: any) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerName: '',
  setPlayerName: (name) => set({ playerName: name }),
  
  soundEnabled: true,
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  focusNumber: null,
  setFocusNumber: (num) => set({ focusNumber: num }),
  score: 0,
  streak: 0,
  incrementScore: (points) => set((state) => ({ 
    score: state.score + points,
    streak: state.streak + 1 
  })),
  resetGame: () => set({ score: 0, streak: 0 }),

  socket: null,
  roomId: null,
  roomData: null,

  connectSocket: () => {
    if (!get().socket) {
      const socket = io();
      socket.on('room_update', (data) => set({ roomData: data }));
      socket.on('game_started', (data) => {
        set({ roomData: data, focusNumber: data.config.focusNumber });
      });
      socket.on('leaderboard_update', (players) => {
        set((state) => ({ 
          roomData: { ...state.roomData, players } 
        }));
      });
      set({ socket });
    }
  },

  joinRoom: (roomId) => {
    const { socket, playerName } = get();
    if (socket) {
      socket.emit('join_room', { roomId, playerName });
      set({ roomId });
    }
  },

  startGameMultiplayer: (config) => {
    const { socket, roomId } = get();
    if (socket && roomId) {
      socket.emit('start_game', { roomId, config });
    }
  }
}));