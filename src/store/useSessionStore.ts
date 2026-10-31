import { create } from 'zustand';
import type { IPublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { loginRequest } from '@/lib/msal';

// The server session from /api/session: email, grade and class from Wisely, and roles.
export interface PlaySession {
  email: string;
  name: string;
  grade: string | null;
  classroom: string | null;
  linked: boolean;
  isAdmin: boolean;
  isStaff: boolean;
}

interface SessionState {
  session: PlaySession | null;
  checked: boolean;
  // Exchange the Microsoft sign-in for a PlayWise session.
  start: (instance: IPublicClientApplication, account: AccountInfo) => Promise<PlaySession | null>;
  // Read an existing session cookie.
  load: () => Promise<PlaySession | null>;
  end: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  checked: false,

  async start(instance, account) {
    try {
      let token: string;
      try {
        token = (await instance.acquireTokenSilent({ ...loginRequest, account })).accessToken;
      } catch {
        token = (await instance.acquireTokenPopup({ ...loginRequest, account })).accessToken;
      }
      const r = await fetch('/api/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphToken: token }), credentials: 'same-origin',
      });
      const s = r.ok ? (await r.json()) as PlaySession : null;
      set({ session: s, checked: true });
      return s;
    } catch {
      set({ checked: true });
      return null;
    }
  },

  async load() {
    try {
      const r = await fetch('/api/session', { credentials: 'same-origin' });
      const s = r.ok ? (await r.json()) as PlaySession : null;
      set({ session: s, checked: true });
      return s;
    } catch {
      set({ checked: true });
      return null;
    }
  },

  async end() {
    set({ session: null });
    try { await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin' }); } catch { /* offline */ }
  },
}));
