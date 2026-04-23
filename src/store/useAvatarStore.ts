import { create } from 'zustand';

const LS_KEY = 'playwise_avatar';

interface AvatarData {
  colorId:          string;
  ownedAccessories: string[];
  equippedId:       string | null;
}

interface AvatarState extends AvatarData {
  setColor:       (id: string) => void;
  ownAccessory:   (id: string) => void;
  equipAccessory: (id: string | null) => void;
}

function load(): AvatarData {
  if (typeof window === 'undefined') {
    return { colorId: 'green', ownedAccessories: [], equippedId: null };
  }
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? JSON.parse(s) : { colorId: 'green', ownedAccessories: [], equippedId: null };
  } catch {
    return { colorId: 'green', ownedAccessories: [], equippedId: null };
  }
}

function persist(state: AvatarData) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  ...load(),

  setColor(colorId) {
    set({ colorId });
    persist({ ...get(), colorId });
  },

  ownAccessory(id) {
    const ownedAccessories = [...get().ownedAccessories, id];
    set({ ownedAccessories });
    persist({ ...get(), ownedAccessories });
  },

  equipAccessory(equippedId) {
    set({ equippedId });
    persist({ ...get(), equippedId });
  },
}));
