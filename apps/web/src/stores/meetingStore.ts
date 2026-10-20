import { create } from 'zustand';
import { IMeeting } from '@intellmeet/shared';

export interface IParticipantState {
  socketId: string;
  userId?: string;
  fullName: string;
  role: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised?: boolean;
  stream?: MediaStream;
}

export interface IChatMsg {
  id: string;
  senderName: string;
  senderId?: string;
  message: string;
  createdAt: string;
}

interface MeetingState {
  activeMeeting: IMeeting | null;
  participants: Map<string, IParticipantState>;
  chatMessages: IChatMsg[];
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  activeSpeakerSocketId: string | null;
  pinnedSocketId: string | null;
  viewMode: 'grid' | 'speaker';
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isNotesOpen: boolean;
  notes: string;
  isInWaitingRoom: boolean;

  setActiveMeeting: (meeting: IMeeting | null) => void;
  setParticipants: (list: IParticipantState[]) => void;
  addParticipant: (participant: IParticipantState) => void;
  updateParticipant: (socketId: string, updates: Partial<IParticipantState>) => void;
  removeParticipant: (socketId: string) => void;
  addChatMessage: (msg: IChatMsg) => void;
  setMuted: (val: boolean) => void;
  setCameraOff: (val: boolean) => void;
  setScreenSharing: (val: boolean) => void;
  setHandRaised: (val: boolean) => void;
  setActiveSpeaker: (socketId: string | null) => void;
  setPinnedSocketId: (socketId: string | null) => void;
  setViewMode: (mode: 'grid' | 'speaker') => void;
  toggleChat: () => void;
  toggleParticipants: () => void;
  toggleNotes: () => void;
  setNotes: (text: string) => void;
  setWaitingRoom: (val: boolean) => void;
  resetMeetingState: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  activeMeeting: null,
  participants: new Map(),
  chatMessages: [],
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isHandRaised: false,
  activeSpeakerSocketId: null,
  pinnedSocketId: null,
  viewMode: 'grid',
  isChatOpen: false,
  isParticipantsOpen: false,
  isNotesOpen: false,
  notes: '',
  isInWaitingRoom: false,

  setActiveMeeting: (meeting) => set({ activeMeeting: meeting }),

  setParticipants: (list) => {
    const map = new Map<string, IParticipantState>();
    list.forEach(p => map.set(p.socketId, p));
    set({ participants: map });
  },

  addParticipant: (p) =>
    set((state) => {
      const next = new Map(state.participants);
      next.set(p.socketId, p);
      return { participants: next };
    }),

  updateParticipant: (socketId, updates) =>
    set((state) => {
      const next = new Map(state.participants);
      const existing = next.get(socketId);
      if (existing) {
        next.set(socketId, { ...existing, ...updates });
      }
      return { participants: next };
    }),

  removeParticipant: (socketId) =>
    set((state) => {
      const next = new Map(state.participants);
      next.delete(socketId);
      return { participants: next };
    }),

  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, msg]
    })),

  setMuted: (val) => set({ isMuted: val }),
  setCameraOff: (val) => set({ isCameraOff: val }),
  setScreenSharing: (val) => set({ isScreenSharing: val }),
  setHandRaised: (val) => set({ isHandRaised: val }),
  setActiveSpeaker: (socketId) => set({ activeSpeakerSocketId: socketId }),
  setPinnedSocketId: (socketId) => set({ pinnedSocketId: socketId }),
  setViewMode: (mode) => set({ viewMode: mode }),

  toggleChat: () =>
    set((s) => ({
      isChatOpen: !s.isChatOpen,
      isParticipantsOpen: false,
      isNotesOpen: false
    })),

  toggleParticipants: () =>
    set((s) => ({
      isParticipantsOpen: !s.isParticipantsOpen,
      isChatOpen: false,
      isNotesOpen: false
    })),

  toggleNotes: () =>
    set((s) => ({
      isNotesOpen: !s.isNotesOpen,
      isChatOpen: false,
      isParticipantsOpen: false
    })),

  setNotes: (text) => set({ notes: text }),
  setWaitingRoom: (val) => set({ isInWaitingRoom: val }),

  resetMeetingState: () =>
    set({
      activeMeeting: null,
      participants: new Map(),
      chatMessages: [],
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      isHandRaised: false,
      activeSpeakerSocketId: null,
      pinnedSocketId: null,
      isChatOpen: false,
      isParticipantsOpen: false,
      isNotesOpen: false,
      isInWaitingRoom: false
    })
}));
