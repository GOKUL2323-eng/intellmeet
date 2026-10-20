import { create } from 'zustand';
import { IMeeting, IMeetingAccessSettings } from '@intellmeet/shared';

export interface IParticipantState {
  socketId: string;
  userId?: string;
  fullName: string;
  role: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised?: boolean;
  isAudioBlocked?: boolean;
  isVideoBlocked?: boolean;
  isScreenShareBlocked?: boolean;
  networkQuality?: 'good' | 'fair' | 'poor';
  stream?: MediaStream;
}

export interface IChatMsg {
  id: string;
  senderName: string;
  senderId?: string;
  message: string;
  createdAt: string;
}

export interface IWaitingParticipantState {
  socketId: string;
  userId?: string;
  fullName: string;
  requestedAt: string;
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
  isHostControlOpen: boolean;
  notes: string;
  isInWaitingRoom: boolean;
  waitingRoomMessage: string;

  // Host Controls & Moderation state
  isHost: boolean;
  isCoHost: boolean;
  isMeetingLocked: boolean;
  accessSettings: IMeetingAccessSettings | null;
  waitingParticipants: IWaitingParticipantState[];
  isAudioBlocked: boolean;
  isVideoBlocked: boolean;
  isScreenShareBlocked: boolean;
  isAudioOnlyMode: boolean; // Low-bandwidth optimization
  moderationLogs: any[];

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
  toggleHostControl: () => void;
  setNotes: (text: string) => void;
  setWaitingRoom: (val: boolean, message?: string) => void;
  setIsHost: (val: boolean) => void;
  setIsCoHost: (val: boolean) => void;
  setIsMeetingLocked: (val: boolean) => void;
  setAccessSettings: (settings: IMeetingAccessSettings) => void;
  setWaitingParticipants: (list: IWaitingParticipantState[]) => void;
  removeWaitingParticipant: (socketId: string) => void;
  setIsAudioBlocked: (val: boolean) => void;
  setIsVideoBlocked: (val: boolean) => void;
  setIsScreenShareBlocked: (val: boolean) => void;
  setIsAudioOnlyMode: (val: boolean) => void;
  setModerationLogs: (logs: any[]) => void;
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
  isHostControlOpen: false,
  notes: '',
  isInWaitingRoom: false,
  waitingRoomMessage: 'Waiting for the meeting host to admit you...',

  isHost: false,
  isCoHost: false,
  isMeetingLocked: false,
  accessSettings: null,
  waitingParticipants: [],
  isAudioBlocked: false,
  isVideoBlocked: false,
  isScreenShareBlocked: false,
  isAudioOnlyMode: false,
  moderationLogs: [],

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
      isNotesOpen: false,
      isHostControlOpen: false
    })),

  toggleParticipants: () =>
    set((s) => ({
      isParticipantsOpen: !s.isParticipantsOpen,
      isChatOpen: false,
      isNotesOpen: false,
      isHostControlOpen: false
    })),

  toggleNotes: () =>
    set((s) => ({
      isNotesOpen: !s.isNotesOpen,
      isChatOpen: false,
      isParticipantsOpen: false,
      isHostControlOpen: false
    })),

  toggleHostControl: () =>
    set((s) => ({
      isHostControlOpen: !s.isHostControlOpen,
      isChatOpen: false,
      isParticipantsOpen: false,
      isNotesOpen: false
    })),

  setNotes: (text) => set({ notes: text }),
  setWaitingRoom: (val, message) =>
    set({
      isInWaitingRoom: val,
      waitingRoomMessage: message || 'Waiting for the meeting host to admit you...'
    }),

  setIsHost: (val) => set({ isHost: val }),
  setIsCoHost: (val) => set({ isCoHost: val }),
  setIsMeetingLocked: (val) => set({ isMeetingLocked: val }),
  setAccessSettings: (settings) => set({ accessSettings: settings }),
  setWaitingParticipants: (list) => set({ waitingParticipants: list }),
  removeWaitingParticipant: (socketId) =>
    set((s) => ({
      waitingParticipants: s.waitingParticipants.filter(p => p.socketId !== socketId)
    })),

  setIsAudioBlocked: (val) => set({ isAudioBlocked: val }),
  setIsVideoBlocked: (val) => set({ isVideoBlocked: val }),
  setIsScreenShareBlocked: (val) => set({ isScreenShareBlocked: val }),
  setIsAudioOnlyMode: (val) => set({ isAudioOnlyMode: val }),
  setModerationLogs: (logs) => set({ moderationLogs: logs }),

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
      isHostControlOpen: false,
      isInWaitingRoom: false,
      waitingRoomMessage: 'Waiting for the meeting host to admit you...',
      isHost: false,
      isCoHost: false,
      isMeetingLocked: false,
      accessSettings: null,
      waitingParticipants: [],
      isAudioBlocked: false,
      isVideoBlocked: false,
      isScreenShareBlocked: false,
      isAudioOnlyMode: false,
      moderationLogs: []
    })
}));
