import { create } from 'zustand';

export type RoomKey =
  | 'math' | 'science' | 'computer' | 'robotics'
  | 'library' | 'history' | 'language_arts' | 'reading'
  | 'art' | 'music' | 'kitchen' | 'cafeteria';

const LS_KEY = 'playwise_world';

interface WorldData {
  playerName:          string;
  playBits:            number;
  completedRooms:      RoomKey[];
  currentMissionIndex: number;
  foundSecrets:        string[];   // hidden spot IDs answered correctly
}

interface WorldState {
  playerName:          string;
  playBits:            number;
  completedRooms:      Set<RoomKey>;
  currentMissionIndex: number;
  foundSecrets:        Set<string>;
  setPlayerName:       (name: string) => void;
  addPlayBits:         (amount: number) => void;
  markRoomComplete:    (room: RoomKey) => void;
  advanceMission:      () => void;
  resetProgress:       () => void;
  markSecretFound:     (id: string) => void;
}

function load(): { playerName: string; playBits: number; completedRooms: Set<RoomKey>; currentMissionIndex: number; foundSecrets: Set<string> } {
  if (typeof window === 'undefined') {
    return { playerName: 'Player', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0, foundSecrets: new Set() };
  }
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) return { playerName: 'Player', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0, foundSecrets: new Set() };
    const d: WorldData = JSON.parse(s);
    return {
      playerName:          d.playerName          ?? 'Player',
      playBits:            d.playBits            ?? 0,
      completedRooms:      new Set(d.completedRooms      ?? []),
      currentMissionIndex: d.currentMissionIndex ?? 0,
      foundSecrets:        new Set(d.foundSecrets        ?? []),
    };
  } catch {
    return { playerName: 'Player', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0, foundSecrets: new Set() };
  }
}

function persist(name: string, bits: number, rooms: Set<RoomKey>, missionIdx: number, secrets: Set<string>) {
  try {
    const data: WorldData = {
      playerName:          name,
      playBits:            bits,
      completedRooms:      Array.from(rooms),
      currentMissionIndex: missionIdx,
      foundSecrets:        Array.from(secrets),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {}
}

export const useWorldStore = create<WorldState>((set, get) => ({
  ...load(),

  setPlayerName(playerName) {
    set({ playerName });
    const { playBits, completedRooms, currentMissionIndex, foundSecrets } = get();
    persist(playerName, playBits, completedRooms, currentMissionIndex, foundSecrets);
  },

  addPlayBits(amount) {
    const playBits = Math.max(0, get().playBits + amount);
    set({ playBits });
    const { playerName, completedRooms, currentMissionIndex, foundSecrets } = get();
    persist(playerName, playBits, completedRooms, currentMissionIndex, foundSecrets);
  },

  markRoomComplete(room) {
    const next = new Set<RoomKey>();
    get().completedRooms.forEach(k => next.add(k));
    next.add(room);
    set({ completedRooms: next });
    const { playerName, playBits, currentMissionIndex, foundSecrets } = get();
    persist(playerName, playBits, next, currentMissionIndex, foundSecrets);
  },

  advanceMission() {
    const nextIdx = get().currentMissionIndex + 1;
    set({ currentMissionIndex: nextIdx });
    const { playerName, playBits, completedRooms, foundSecrets } = get();
    persist(playerName, playBits, completedRooms, nextIdx, foundSecrets);
  },

  markSecretFound(id) {
    const next = new Set(get().foundSecrets);
    next.add(id);
    set({ foundSecrets: next });
    const { playerName, playBits, completedRooms, currentMissionIndex } = get();
    persist(playerName, playBits, completedRooms, currentMissionIndex, next);
  },

  resetProgress() {
    const { playerName, playBits, foundSecrets } = get();
    const empty = new Set<RoomKey>();
    set({ completedRooms: empty, currentMissionIndex: 0 });
    persist(playerName, playBits, empty, 0, foundSecrets);
  },
}));
