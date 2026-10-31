import { create } from 'zustand';

// Key kept from the old World store so cached balances survive the upgrade.
const LS_KEY = 'playwise_world';

interface WalletData {
  playerName:  string;
  playerEmail: string;
  playBits:    number;
}

interface WalletState extends WalletData {
  setPlayerName:    (name: string, email?: string) => void;
  // The server's balance after an award, a purchase or a spin.
  setBalance:       (playBits: number) => void;
  syncWithDatabase: (studentName: string, email?: string) => Promise<void>;
}

const EMPTY: WalletData = { playerName: 'Player', playerEmail: '', playBits: 0 };

function load(): WalletData {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) return EMPTY;
    const d: Partial<WalletData> = JSON.parse(s);
    return {
      playerName:  d.playerName  ?? 'Player',
      playerEmail: d.playerEmail ?? '',
      playBits:    d.playBits    ?? 0,
    };
  } catch {
    return EMPTY;
  }
}

function persist(data: WalletData) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export const useWalletStore = create<WalletState>((set, get) => ({
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
        const { playerName, playerEmail } = get();
        persist({ playerName, playerEmail, playBits: bits });
      }
    } catch (err) {
      console.error('Failed to sync wallet with DB:', err);
    }
  },

  setPlayerName(playerName, email) {
    const playerEmail = email || get().playerEmail;
    set({ playerName, playerEmail });
    persist({ playerName, playerEmail, playBits: get().playBits });
    get().syncWithDatabase(playerName, playerEmail);
  },

  setBalance(playBits) {
    set({ playBits });
    const { playerName, playerEmail } = get();
    persist({ playerName, playerEmail, playBits });
  },
}));
