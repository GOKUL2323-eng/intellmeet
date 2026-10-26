import {
  UserRole,
  WorkspaceRole,
  MeetingStatus,
  ParticipantRole,
  TaskStatus,
  TaskPriority,
  AIProcessingStatus,
  NotificationType,
  AuditAction
} from './enums';

export interface IUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  timezone: string;
  googleId?: string;
  authProvider?: 'local' | 'google' | 'both';
  createdAt: string;
  updatedAt: string;
}

export interface IWorkspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  settings?: {
    allowGuestInvites?: boolean;
    defaultMeetingDuration?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IWorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: 'ACTIVE' | 'INVITED';
  user?: IUser;
  createdAt: string;
}

export interface IInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  expiresAt: string;
  invitedBy: string;
  createdAt: string;
}

export interface IMeetingAccessSettings {
  allowGuests: boolean;
  waitingRoom: boolean;
  defaultMute: boolean;
  allowScreenShare: boolean;
  allowChat: boolean;
  allowUnmute: boolean;
  allowCamera: boolean;
  requirePassword?: boolean;
}

export interface IMeeting {
  id: string;
  meetingCode: string;
  title: string;
  description?: string;
  workspaceId: string;
  hostId: string;
  host?: IUser;
  coHostIds?: string[];
  isLocked?: boolean;
  bannedUserIds?: string[];
  bannedGuestNames?: string[];
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: MeetingStatus;
  accessSettings: IMeetingAccessSettings;
  recordingUrl?: string;
  aiProcessingStatus: AIProcessingStatus;
  summaryId?: string;
  provider?: 'native' | 'google_meet';
  googleMeetUrl?: string;
  googleMeetSpaceId?: string;
  googleCalendarEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMeetingParticipant {
  id: string;
  meetingId: string;
  userId?: string;
  user?: IUser;
  guestName?: string;
  socketId?: string;
  role: ParticipantRole;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised?: boolean;
  isInWaitingRoom?: boolean;
  isAudioBlocked?: boolean;
  isVideoBlocked?: boolean;
  isScreenShareBlocked?: boolean;
  isBanned?: boolean;
  networkQuality?: 'good' | 'fair' | 'poor';
  joinedAt: string;
  leftAt?: string;
}

export interface IChatMessage {
  id: string;
  meetingId: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  messageType: 'CHAT' | 'SYSTEM' | 'ACTION';
  clientMessageId?: string;
  createdAt: string;
}

export interface ITranscriptSegment {
  speakerId: string;
  speakerName: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface IMeetingTranscript {
  id: string;
  meetingId: string;
  workspaceId: string;
  segments: ITranscriptSegment[];
  language: string;
  consentRecorded: boolean;
  createdAt: string;
}

export interface IMeetingSummary {
  id: string;
  meetingId: string;
  workspaceId: string;
  overview: string;
  decisions: string[];
  discussionHighlights: string[];
  unresolvedQuestions: string[];
  nextSteps: string[];
  isEdited: boolean;
  editedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IActionItem {
  id: string;
  meetingId: string;
  workspaceId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: 'PROPOSED' | 'CONVERTED' | 'DISMISSED';
  taskId?: string;
  createdAt: string;
}

export interface IProject {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  key: string;
  color: string;
  createdAt: string;
}

export interface ITaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: string;
}

export interface ITask {
  id: string;
  workspaceId: string;
  projectId?: string;
  meetingId?: string;
  actionItemId?: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assignee?: IUser;
  creatorId: string;
  creator?: IUser;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  tags?: string[];
  comments: ITaskComment[];
  createdAt: string;
  updatedAt: string;
}

export interface INotification {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface IAuditLog {
  id: string;
  workspaceId?: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface IAnalyticsOverview {
  totalMeetings: number;
  totalMeetingMinutes: number;
  scheduledMeetingsCount: number;
  completedMeetingsCount: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  totalMembers: number;
  meetingsByDay: { date: string; count: number; minutes: number }[];
  tasksByStatus: { status: TaskStatus; count: number }[];
  tasksByPriority: { priority: TaskPriority; count: number }[];
}

// Socket Signalling Types
export interface ISocketUser {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  socketId: string;
}

export interface ISignalPayload {
  toSocketId: string;
  fromSocketId: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>;
}

export interface IMeetingRoomState {
  meetingId: string;
  participants: IMeetingParticipant[];
  isLocked: boolean;
  activeScreenShareSocketId?: string;
  accessSettings?: IMeetingAccessSettings;
}

// Host Control Payloads
export type ParticipantModerationAction =
  | 'mute'
  | 'stopVideo'
  | 'stopScreenShare'
  | 'lowerHand'
  | 'remove'
  | 'promoteCoHost'
  | 'demoteCoHost';

export interface IModerateParticipantPayload {
  action: ParticipantModerationAction;
  targetParticipantId?: string;
  targetSocketId?: string;
  targetUserId?: string;
  blockRejoin?: boolean;
  reason?: string;
}

export interface IMuteAllPayload {
  allowUnmute: boolean;
}

export interface IUpdateHostSettingsPayload {
  isLocked?: boolean;
  waitingRoom?: boolean;
  defaultMute?: boolean;
  allowScreenShare?: boolean;
  allowChat?: boolean;
  allowUnmute?: boolean;
  allowCamera?: boolean;
}

export interface ILiveKitTokenResponse {
  token: string;
  url: string;
  roomName: string;
  participantIdentity: string;
  participantName: string;
  isHost: boolean;
  isCoHost: boolean;
  configured: boolean;
}
