import { create } from 'zustand';
import type { WorldRoom, WorldPlayer, PositionTick, RoomTriggerEvent } from '@/lib/worldMultiplayer';

export interface RemotePlayer extends PositionTick {
  targetX: number; targetY: number;
  renderX: number; renderY: number;
  lastUpdate: number;
}

export interface ActiveVote {
  trigger:    RoomTriggerEvent;
  votes:      Record<string, { choice: number; isSpecialist: boolean }>;
  expiresAt:  number;
}

interface WorldMultiState {
  room:           WorldRoom | null;
  players:        WorldPlayer[];
  remotePos:      Record<string, RemotePlayer>;
  myRoomCode:     string;
  roundTimeLeft:  number;
  teamScore:      number;
  // Collaboration state
  specialties:    string[];          // my 2 expert room keys
  solvedRooms:    Set<string>;       // rooms answered correctly this round
  activeVote:     ActiveVote | null; // live voting session
  myVote:         number | null;     // choice index I submitted
  lastResult:     {
    roomKey:  string;
    correct:  boolean;
    answer:   number;
    // Captured at resolve time so non-triggerers can show the full reveal panel
    question: { text: string; choices: string[]; answer: number; explanation?: string } | null;
    votes:    Record<string, { choice: number; isSpecialist: boolean }>;
    myVote:   number | null;
  } | null;

  setRoom:          (r: WorldRoom | null) => void;
  setPlayers:       (p: WorldPlayer[]) => void;
  upsertRemotePos:  (tick: PositionTick) => void;
  setMyRoomCode:    (code: string) => void;
  setRoundTimeLeft: (n: number) => void;
  setTeamScore:     (n: number) => void;
  setSpecialties:   (s: string[]) => void;
  markRoomSolved:   (key: string) => void;
  openVote:         (trigger: RoomTriggerEvent) => void;
  addVote:          (playerName: string, choice: number, isSpecialist: boolean) => void;
  closeVote:        (result: { roomKey: string; correct: boolean; answer: number }) => void;
  setMyVote:        (v: number | null) => void;
  reset:            () => void;
}

export const useWorldMultiStore = create<WorldMultiState>((set, get) => ({
  room:          null,
  players:       [],
  remotePos:     {},
  myRoomCode:    '',
  roundTimeLeft: 0,
  teamScore:     0,
  specialties:   [],
  solvedRooms:   new Set(),
  activeVote:    null,
  myVote:        null,
  lastResult:    null,

  setRoom(r)           { set({ room: r, teamScore: r?.team_score ?? 0 }); },
  setPlayers(p)        { set({ players: p }); },
  setMyRoomCode(code)  { set({ myRoomCode: code }); },
  setRoundTimeLeft(n)  { set({ roundTimeLeft: n }); },
  setTeamScore(n)      { set({ teamScore: n }); },
  setSpecialties(s)    { set({ specialties: s }); },
  setMyVote(v)         { set({ myVote: v }); },

  markRoomSolved(key) {
    set(s => { const next = new Set(s.solvedRooms); next.add(key); return { solvedRooms: next }; });
  },

  openVote(trigger) {
    set({ activeVote: { trigger, votes: {}, expiresAt: trigger.expires_at }, myVote: null, lastResult: null });
  },

  addVote(playerName, choice, isSpecialist) {
    set(s => {
      if (!s.activeVote) return s;
      return {
        activeVote: {
          ...s.activeVote,
          votes: { ...s.activeVote.votes, [playerName]: { choice, isSpecialist } },
        },
      };
    });
  },

  closeVote(result) {
    const s = get();
    const question = s.activeVote?.trigger.question ?? null;
    const votes    = s.activeVote?.votes ?? {};
    const myVote   = s.myVote;
    set({ activeVote: null, myVote: null, lastResult: { ...result, question, votes, myVote } });
    if (result.correct) get().markRoomSolved(result.roomKey);
    // Hold result long enough for the reveal panel to show (7 s)
    setTimeout(() => set(st => st.lastResult?.roomKey === result.roomKey ? { lastResult: null } : st), 7000);
  },

  upsertRemotePos(tick) {
    set(s => {
      const existing = s.remotePos[tick.player_name];
      return {
        remotePos: {
          ...s.remotePos,
          [tick.player_name]: {
            ...tick,
            targetX: tick.x, targetY: tick.y,
            renderX: existing?.renderX ?? tick.x,
            renderY: existing?.renderY ?? tick.y,
            lastUpdate: Date.now(),
          },
        },
      };
    });
  },

  reset() {
    set({
      room: null, players: [], remotePos: {}, myRoomCode: '',
      roundTimeLeft: 0, teamScore: 0, specialties: [],
      solvedRooms: new Set(), activeVote: null, myVote: null, lastResult: null,
    });
  },
}));
