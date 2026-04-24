/**
 * Zustand store for World Multiplayer state.
 * Keeps remote player positions with linear interpolation data.
 */

import { create } from 'zustand';
import type { WorldRoom, WorldPlayer, PositionTick } from '@/lib/worldMultiplayer';

export interface RemotePlayer extends PositionTick {
  // Interpolation targets
  targetX:    number;
  targetY:    number;
  renderX:    number;
  renderY:    number;
  lastUpdate: number;
}

interface WorldMultiState {
  room:          WorldRoom | null;
  players:       WorldPlayer[];          // lobby / DB list
  remotePos:     Record<string, RemotePlayer>; // live position map
  myRoomCode:    string;
  countdown:     number;                 // seconds left in lobby countdown
  roundTimeLeft: number;                 // seconds left in round
  teamScore:     number;

  setRoom:          (r: WorldRoom | null) => void;
  setPlayers:       (p: WorldPlayer[]) => void;
  upsertRemotePos:  (tick: PositionTick) => void;
  removeRemotePos:  (name: string) => void;
  setMyRoomCode:    (code: string) => void;
  setCountdown:     (n: number) => void;
  setRoundTimeLeft: (n: number) => void;
  setTeamScore:     (n: number) => void;
  reset:            () => void;
}

export const useWorldMultiStore = create<WorldMultiState>((set, get) => ({
  room:          null,
  players:       [],
  remotePos:     {},
  myRoomCode:    '',
  countdown:     0,
  roundTimeLeft: 0,
  teamScore:     0,

  setRoom(r)     { set({ room: r, teamScore: r?.team_score ?? 0 }); },
  setPlayers(p)  { set({ players: p }); },
  setMyRoomCode(code) { set({ myRoomCode: code }); },
  setCountdown(n)     { set({ countdown: n }); },
  setRoundTimeLeft(n) { set({ roundTimeLeft: n }); },
  setTeamScore(n)     { set({ teamScore: n }); },

  upsertRemotePos(tick) {
    set(s => {
      const existing = s.remotePos[tick.player_name];
      return {
        remotePos: {
          ...s.remotePos,
          [tick.player_name]: {
            ...tick,
            targetX:    tick.x,
            targetY:    tick.y,
            renderX:    existing?.renderX ?? tick.x,
            renderY:    existing?.renderY ?? tick.y,
            lastUpdate: Date.now(),
          },
        },
      };
    });
  },

  removeRemotePos(name) {
    set(s => {
      const next = { ...s.remotePos };
      delete next[name];
      return { remotePos: next };
    });
  },

  reset() {
    set({
      room: null, players: [], remotePos: {}, myRoomCode: '',
      countdown: 0, roundTimeLeft: 0, teamScore: 0,
    });
  },
}));
