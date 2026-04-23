import { create } from 'zustand';

export type RoomKey =
  | 'math' | 'science' | 'computer' | 'robotics'
  | 'library' | 'history' | 'language_arts' | 'reading'
  | 'art' | 'music' | 'kitchen' | 'cafeteria';

const LS_KEY = 'playwise_world';

interface WorldData {
  playerName:     string;
  playBits:       number;
  completedRooms: RoomKey[];   // array for JSON-safe persistence
  currentMissionIndex: number;
}

interface WorldState {
  playerName:     string;
  playBits:       number;
  completedRooms: Set<RoomKey>;
  currentMissionIndex: number;
  setPlayerName:  (name: string) => void;
  addPlayBits:    (amount: number) => void;
  markRoomComplete: (room: RoomKey) => void;
  advanceMission: () => void;
  resetProgress:  () => void;
}

function load(): { playerName: string; playBits: number; completedRooms: Set<RoomKey>; currentMissionIndex: number } {
  if (typeof window === 'undefined') {
    return { playerName: 'Player', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0 };
  }
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) return { playerName: 'Player', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0 };
    const d: WorldData = JSON.parse(s);
    return {
      playerName:     d.playerName     ?? 'Player',
      playBits:       d.playBits       ?? 0,
      completedRooms: new Set(d.completedRooms ?? []),
      currentMissionIndex: d.currentMissionIndex ?? 0,
    };
  } catch {
    return { playerName: 'Player', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0 };
  }
}

function persist(name: string, bits: number, rooms: Set<RoomKey>, missionIdx: number) {
  try {
    const data: WorldData = {
      playerName:     name,
      playBits:       bits,
      completedRooms: Array.from(rooms),
      currentMissionIndex: missionIdx,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

export const useWorldStore = create<WorldState>((set, get) => ({
  ...load(),

  setPlayerName(playerName) {
    set({ playerName });
    const { playBits, completedRooms, currentMissionIndex } = get();
    persist(playerName, playBits, completedRooms, currentMissionIndex);
  },

  addPlayBits(amount) {
    const playBits = Math.max(0, get().playBits + amount);
    set({ playBits });
    const { playerName, completedRooms, currentMissionIndex } = get();
    persist(playerName, playBits, completedRooms, currentMissionIndex);
  },

  markRoomComplete(room) {
    const next = new Set<RoomKey>();
    get().completedRooms.forEach(k => next.add(k));
    next.add(room);
    set({ completedRooms: next });
    const { playerName, playBits, currentMissionIndex } = get();
    persist(playerName, playBits, next, currentMissionIndex);
  },

  advanceMission() {
    const nextIdx = get().currentMissionIndex + 1;
    set({ currentMissionIndex: nextIdx });
    const { playerName, playBits, completedRooms } = get();
    persist(playerName, playBits, completedRooms, nextIdx);
  },

  resetProgress() {
    const { playerName, playBits } = get();
    const empty = new Set<RoomKey>();
    set({ completedRooms: empty, currentMissionIndex: 0 });
    persist(playerName, playBits, empty, 0);
  },
}));
