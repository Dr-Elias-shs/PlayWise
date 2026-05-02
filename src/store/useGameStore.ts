import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { saveAppearance } from '@/lib/wallet';

const STORAGE_KEY = 'playwise_profile_v4';

const VARIANT_TO_COLOR: Record<string, string> = {
  classic: 'green', sky: 'teal', royal: 'golden',
  blush: 'pink', crimson: 'purple', ember: 'red',
  solar: 'yellow', midnight: 'shadow',
};

interface StoredProfile {
  name:               string;
  email:              string;
  grade:              string;
  colorId:            string;
  characterId:        string;
  baseCharacterId:    string;
  ownedAccessories:   string[];
  ownedClothing:      string[];
  ownedCharacters:    string[];
  equippedId:         string | null;
  equippedClothingId: string | null;
}

function defaults(): StoredProfile {
  return { name: '', email: '', grade: '', colorId: 'green', characterId: 'male',
           baseCharacterId: 'male',
           ownedAccessories: [], ownedClothing: [], ownedCharacters: [],
           equippedId: null, equippedClothingId: null };
}

function loadProfile(): StoredProfile {
  if (typeof window === 'undefined') return defaults();
  try {
    const v4 = localStorage.getItem(STORAGE_KEY);
    if (v4) return { ...defaults(), ...JSON.parse(v4) };

    // Migrate from v3 profile + old avatar store
    const v3raw = localStorage.getItem('playwise_profile_v3');
    const avraw = localStorage.getItem('playwise_avatar_v2')
               ?? localStorage.getItem('playwise_avatar');
    const v3 = v3raw ? JSON.parse(v3raw) : null;
    const av = avraw ? JSON.parse(avraw) : null;
    const charId = av?.characterType ?? 'male';
    return {
      name:               v3?.name  ?? '',
      email:              v3?.email ?? '',
      grade:              v3?.grade ?? '',
      colorId:            av?.colorId ?? VARIANT_TO_COLOR[v3?.avatar ?? ''] ?? 'green',
      characterId:        charId,
      baseCharacterId:    av?.baseCharacterId ?? charId,
      ownedAccessories:   av?.ownedAccessories  ?? [],
      ownedClothing:      av?.ownedClothing      ?? [],
      ownedCharacters:    av?.ownedCharacters    ?? [],
      equippedId:         av?.equippedId         ?? null,
      equippedClothingId: av?.equippedClothingId ?? null,
    };
  } catch { return defaults(); }
}

function save(p: StoredProfile) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function snap(s: GameState): StoredProfile {
  return {
    name: s.playerName, email: s.playerEmail, grade: s.playerGrade,
    colorId: s.colorId, characterId: s.characterId, baseCharacterId: s.baseCharacterId,
    ownedAccessories: s.ownedAccessories, ownedClothing: s.ownedClothing,
    ownedCharacters: s.ownedCharacters,
    equippedId: s.equippedId, equippedClothingId: s.equippedClothingId,
  };
}

interface GameState {
  // ── Profile ───────────────────────────────────────────────────────────────
  playerName:  string;
  playerEmail: string;
  playerGrade: string;

  // ── Character appearance ──────────────────────────────────────────────────
  colorId:            string;
  characterId:        string;
  baseCharacterId:    string;
  ownedAccessories:   string[];
  ownedClothing:      string[];
  ownedCharacters:    string[];
  equippedId:         string | null;
  equippedClothingId: string | null;

  // Profile
  setProfile:         (name: string, email: string, colorId: string, grade: string, characterId?: string) => void;
  setPlayerName:      (name: string, email?: string) => void;
  loadStoredProfile:  () => void;

  // Avatar
  setColor:           (id: string) => void;
  setCharacterId:     (type: string) => void;
  ownAccessory:       (id: string) => void;
  equipAccessory:     (id: string | null) => void;
  ownClothing:        (id: string) => void;
  equipClothing:      (id: string | null) => void;
  ownCharacter:       (id: string) => void;
  equipCharacter:     (targetCharId: string | null) => void;

  // ── Sound ─────────────────────────────────────────────────────────────────
  soundEnabled:    boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // ── Game state ─────────────────────────────────────────────────────────────
  focusNumber:        number | null;
  setFocusNumber:     (num: number | null) => void;
  score:              number;
  streak:             number;
  maxStreak:          number;
  correctCount:       number;
  wrongCount:         number;
  scoreMultiplier:    number;
  incrementScore:     (points: number) => void;
  incrementWrong:     () => void;
  setScoreMultiplier: (m: number) => void;
  resetGame:          () => void;

  // ── Multiplayer ───────────────────────────────────────────────────────────
  socket:               Socket | null;
  roomId:               string | null;
  roomData:             any | null;
  connectSocket:        () => void;
  joinRoom:             (roomId: string) => void;
  startGameMultiplayer: (config: any) => void;
  clearRoom:            () => void;
}

export const useGameStore = create<GameState>((set, get) => {
  const stored = loadProfile();

  return {
    playerName:         stored.name,
    playerEmail:        stored.email,
    playerGrade:        stored.grade,
    colorId:            stored.colorId,
    characterId:        stored.characterId,
    baseCharacterId:    stored.baseCharacterId,
    ownedAccessories:   stored.ownedAccessories,
    ownedClothing:      stored.ownedClothing,
    ownedCharacters:    stored.ownedCharacters,
    equippedId:         stored.equippedId,
    equippedClothingId: stored.equippedClothingId,

    setProfile(name, email, colorId, grade, characterId) {
      const s = get();
      const p: StoredProfile = {
        name, email: email.toLowerCase().trim(), grade, colorId,
        characterId:        characterId ?? s.characterId,
        baseCharacterId:    s.baseCharacterId,
        ownedAccessories:   s.ownedAccessories,
        ownedClothing:      s.ownedClothing,
        ownedCharacters:    s.ownedCharacters,
        equippedId:         s.equippedId,
        equippedClothingId: s.equippedClothingId,
      };
      save(p);
      set({ playerName: p.name, playerEmail: p.email, playerGrade: grade,
            colorId, characterId: p.characterId });
    },

    setPlayerName(name, email) {
      const s = get();
      const resolvedEmail = (email ?? s.playerEmail ?? '').toLowerCase().trim();
      save({ ...snap(s), name, email: resolvedEmail });
      set({ playerName: name, playerEmail: resolvedEmail });
    },

    loadStoredProfile() {
      const p = loadProfile();
      if (p.name || p.email) {
        set({
          playerName: p.name, playerEmail: p.email, playerGrade: p.grade,
          colorId: p.colorId, characterId: p.characterId, baseCharacterId: p.baseCharacterId,
          ownedAccessories: p.ownedAccessories, ownedClothing: p.ownedClothing,
          ownedCharacters: p.ownedCharacters,
          equippedId: p.equippedId, equippedClothingId: p.equippedClothingId,
        });
      }
    },

    // ── Avatar ────────────────────────────────────────────────────────────────
    setColor(colorId) {
      save({ ...snap(get()), colorId });
      set({ colorId });
      const { playerEmail, playerName, characterId } = get();
      saveAppearance(playerEmail || playerName, characterId, colorId).catch(() => {});
    },

    setCharacterId(characterId) {
      save({ ...snap(get()), characterId });
      set({ characterId });
      const { playerEmail, playerName, colorId } = get();
      saveAppearance(playerEmail || playerName, characterId, colorId).catch(() => {});
    },

    ownAccessory(id) {
      const ownedAccessories = [...get().ownedAccessories, id];
      save({ ...snap(get()), ownedAccessories });
      set({ ownedAccessories });
    },

    equipAccessory(equippedId) {
      save({ ...snap(get()), equippedId });
      set({ equippedId });
    },

    ownClothing(id) {
      const ownedClothing = [...get().ownedClothing, id];
      save({ ...snap(get()), ownedClothing });
      set({ ownedClothing });
    },

    equipClothing(equippedClothingId) {
      save({ ...snap(get()), equippedClothingId });
      set({ equippedClothingId });
    },

    ownCharacter(id) {
      const ownedCharacters = [...get().ownedCharacters, id];
      save({ ...snap(get()), ownedCharacters });
      set({ ownedCharacters });
    },

    equipCharacter(targetCharId) {
      const s = get();
      if (targetCharId !== null) {
        // Save the current base character (if not already transformed) then switch
        const base = s.ownedCharacters.includes(s.characterId) ? s.baseCharacterId : s.characterId;
        save({ ...snap(s), baseCharacterId: base, characterId: targetCharId });
        set({ baseCharacterId: base, characterId: targetCharId });
      } else {
        // Revert to original character
        save({ ...snap(s), characterId: s.baseCharacterId });
        set({ characterId: s.baseCharacterId });
      }
    },

    // ── Sound ─────────────────────────────────────────────────────────────────
    soundEnabled: true,
    setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

    // ── Game ──────────────────────────────────────────────────────────────────
    focusNumber: null,
    setFocusNumber: (num) => set({ focusNumber: num }),
    score: 0, streak: 0, maxStreak: 0, correctCount: 0, wrongCount: 0, scoreMultiplier: 1,

    incrementScore: (points) => set((s) => {
      const newStreak = s.streak + 1;
      return { score: s.score + Math.floor(points * s.scoreMultiplier),
               streak: newStreak, maxStreak: Math.max(s.maxStreak, newStreak),
               correctCount: s.correctCount + 1 };
    }),
    incrementWrong:     () => set((s) => ({ streak: 0, wrongCount: s.wrongCount + 1 })),
    setScoreMultiplier: (m) => set({ scoreMultiplier: m }),
    resetGame:          () => set({ score: 0, streak: 0, maxStreak: 0,
                                    correctCount: 0, wrongCount: 0, scoreMultiplier: 1 }),

    // ── Multiplayer ───────────────────────────────────────────────────────────
    socket: null, roomId: null, roomData: null,

    connectSocket() {
      if (!get().socket) {
        const socket = io();
        socket.on('room_update',        (data)    => set({ roomData: data }));
        socket.on('game_started',       (data)    => set({ roomData: data, focusNumber: data.config.focusNumber }));
        socket.on('leaderboard_update', (players) => set((s) => ({ roomData: { ...s.roomData, players } })));
        set({ socket });
      }
    },

    joinRoom(roomId) {
      const { socket, playerName, colorId } = get();
      if (socket) {
        socket.emit('join_room', { roomId, playerName, playerAvatar: colorId });
        set({ roomId });
      }
    },

    startGameMultiplayer(config) {
      const { socket, roomId } = get();
      if (socket && roomId) socket.emit('start_game', { roomId, config });
    },

    clearRoom: () => set({ roomId: null, roomData: null }),
  };
});
