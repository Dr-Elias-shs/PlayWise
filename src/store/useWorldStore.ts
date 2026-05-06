import { create } from 'zustand';

export type RoomKey =
  | 'math' | 'science' | 'computer' | 'robotics'
  | 'library' | 'history' | 'language_arts' | 'reading'
  | 'art' | 'music' | 'kitchen' | 'cafeteria';

const LS_KEY = 'playwise_world';

interface WorldData {
  playerName:          string;
  playerEmail:         string;
  playBits:            number;
  completedRooms:      RoomKey[];
  currentMissionIndex: number;
  foundSecrets:        string[];   // hidden spot IDs answered correctly
}

interface WorldState {
  playerName:          string;
  playerEmail:         string;
  playBits:            number;
  completedRooms:      Set<RoomKey>;
  currentMissionIndex: number;
  foundSecrets:        Set<string>;
  setPlayerName:       (name: string, email?: string) => void;
  addPlayBits:         (amount: number, syncToDB?: boolean) => void;
  markRoomComplete:    (room: RoomKey) => void;
  advanceMission:      () => void;
  resetProgress:       () => void;
  markSecretFound:     (id: string) => void;
  syncWithDatabase:    (studentName: string, email?: string) => Promise<void>;
}

function load(): { playerName: string; playerEmail: string; playBits: number; completedRooms: Set<RoomKey>; currentMissionIndex: number; foundSecrets: Set<string> } {
  if (typeof window === 'undefined') {
    return { playerName: 'Player', playerEmail: '', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0, foundSecrets: new Set() };
  }
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) return { playerName: 'Player', playerEmail: '', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0, foundSecrets: new Set() };
    const d: WorldData = JSON.parse(s);
    return {
      playerName:          d.playerName          ?? 'Player',
      playerEmail:         d.playerEmail         ?? '',
      playBits:            d.playBits            ?? 0,
      completedRooms:      new Set(d.completedRooms      ?? []),
      currentMissionIndex: d.currentMissionIndex ?? 0,
      foundSecrets:        new Set(d.foundSecrets        ?? []),
    };
  } catch {
    return { playerName: 'Player', playerEmail: '', playBits: 0, completedRooms: new Set(), currentMissionIndex: 0, foundSecrets: new Set() };
  }
}

function persist(name: string, email: string, bits: number, rooms: Set<RoomKey>, missionIdx: number, secrets: Set<string>) {
  try {
    const data: WorldData = {
      playerName:          name,
      playerEmail:         email,
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

  async syncWithDatabase(studentName, email) {
    const dbKey = (email || get().playerEmail || studentName).toLowerCase().trim();
    if (!dbKey || dbKey === 'player') return;
    try {
      const { getWallet } = await import('@/lib/wallet');
      const wallet = await getWallet(dbKey);
      if (wallet) {
        const bits = wallet.coins ?? 0;
        set({ playBits: bits });
        const { playerName, playerEmail, completedRooms, currentMissionIndex, foundSecrets } = get();
        persist(playerName, playerEmail, bits, completedRooms, currentMissionIndex, foundSecrets);
      }
    } catch (err) {
      console.error('Failed to sync world store with DB:', err);
    }
  },

  setPlayerName(playerName, email) {
    const playerEmail = email || get().playerEmail;
    set({ playerName, playerEmail });
    const { playBits, completedRooms, currentMissionIndex, foundSecrets } = get();
    persist(playerName, playerEmail, playBits, completedRooms, currentMissionIndex, foundSecrets);
    get().syncWithDatabase(playerName, playerEmail);
  },

  async addPlayBits(amount, syncToDB = true) {
    const playBits = Math.max(0, get().playBits + amount);
    set({ playBits });
    const { playerName, playerEmail, completedRooms, currentMissionIndex, foundSecrets } = get();
    persist(playerName, playerEmail, playBits, completedRooms, currentMissionIndex, foundSecrets);

    // Sync change to Supabase if player is identified and requested
    if (syncToDB && (playerEmail || (playerName && playerName !== 'Player'))) {
      try {
        const { addCoins, spendCoins } = await import('@/lib/wallet');
        if (amount > 0) {
          // EARNING bits
          await addCoins(playerName, amount, 0, false, '', 'world-action', playerEmail);
        } else if (amount < 0) {
          // SPENDING bits (shop)
          const dbKey = playerEmail || playerName;
          await spendCoins(dbKey, Math.abs(amount));
        }
      } catch (err) {
        console.error('Failed to sync bits to Supabase:', err);
      }
    }
  },

  markRoomComplete(room) {
    const next = new Set<RoomKey>();
    get().completedRooms.forEach(k => next.add(k));
    next.add(room);
    set({ completedRooms: next });
    const { playerName, playerEmail, playBits, currentMissionIndex, foundSecrets } = get();
    persist(playerName, playerEmail, playBits, next, currentMissionIndex, foundSecrets);
  },

  advanceMission() {
    const nextIdx = get().currentMissionIndex + 1;
    set({ currentMissionIndex: nextIdx });
    const { playerName, playerEmail, playBits, completedRooms, foundSecrets } = get();
    persist(playerName, playerEmail, playBits, completedRooms, nextIdx, foundSecrets);
  },

  markSecretFound(id) {
    const next = new Set(get().foundSecrets);
    next.add(id);
    set({ foundSecrets: next });
    const { playerName, playerEmail, playBits, completedRooms, currentMissionIndex } = get();
    persist(playerName, playerEmail, playBits, completedRooms, currentMissionIndex, next);
  },

  resetProgress() {
    const { playerName, playerEmail, playBits, foundSecrets } = get();
    const empty = new Set<RoomKey>();
    set({ completedRooms: empty, currentMissionIndex: 0 });
    persist(playerName, playerEmail, playBits, empty, 0, foundSecrets);
  },
}));
