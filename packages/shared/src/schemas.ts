import { z } from 'zod';
import { UserRole, WorkspaceRole, MeetingStatus, TaskStatus, TaskPriority } from './enums';

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  timezone: z.string().default('UTC')
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  timezone: z.string().optional(),
  avatarUrl: z.string().url().optional()
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').max(50),
  description: z.string().max(250).optional()
});

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER)
});

export const createMeetingSchema = z.object({
  title: z.string().min(2, 'Meeting title is required').max(120),
  description: z.string().max(1000).optional(),
  workspaceId: z.string().optional(),
  scheduledStartTime: z.string().datetime({ message: 'Invalid start time' }),
  scheduledEndTime: z.string().datetime({ message: 'Invalid end time' }),
  accessSettings: z
    .object({
      allowGuests: z.boolean().default(true),
      waitingRoom: z.boolean().default(false),
      defaultMute: z.boolean().default(false),
      allowScreenShare: z.boolean().default(true),
      allowChat: z.boolean().default(true),
      allowUnmute: z.boolean().default(true),
      allowCamera: z.boolean().default(true)
    })
    .default({
      allowGuests: true,
      waitingRoom: false,
      defaultMute: false,
      allowScreenShare: true,
      allowChat: true,
      allowUnmute: true,
      allowCamera: true
    })
});

export const updateMeetingSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional(),
  scheduledStartTime: z.string().datetime().optional(),
  scheduledEndTime: z.string().datetime().optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  accessSettings: z
    .object({
      allowGuests: z.boolean().optional(),
      waitingRoom: z.boolean().optional(),
      defaultMute: z.boolean().optional(),
      allowScreenShare: z.boolean().optional(),
      allowChat: z.boolean().optional(),
      allowUnmute: z.boolean().optional(),
      allowCamera: z.boolean().optional()
    })
    .optional()
});

export const createTaskSchema = z.object({
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  meetingId: z.string().optional(),
  actionItemId: z.string().optional(),
  title: z.string().min(2, 'Task title is required').max(150),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  tags: z.array(z.string()).default([])
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  tags: z.array(z.string()).optional()
});

export const addTaskCommentSchema = z.object({
  text: z.string().min(1, 'Comment text cannot be empty').max(1000)
});

export const processAISummarySchema = z.object({
  meetingId: z.string().optional(),
  transcriptText: z.string().optional(),
  language: z.string().default('en'),
  consentRecorded: z.boolean().refine(val => val === true, {
    message: 'User consent is required before processing meeting audio or transcripts with AI'
  })
});

export const updateSummarySchema = z.object({
  overview: z.string().optional(),
  decisions: z.array(z.string()).optional(),
  discussionHighlights: z.array(z.string()).optional(),
  unresolvedQuestions: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional()
});

export const sendChatMessageSchema = z.object({
  meetingId: z.string().min(1),
  workspaceId: z.string().min(1),
  message: z.string().min(1, 'Message cannot be empty').max(1000),
  clientMessageId: z.string().optional()
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(WorkspaceRole, {
    errorMap: () => ({ message: 'Invalid workspace role' })
  })
});

export const convertActionItemSchema = z.object({
  actionItemId: z.string().min(1, 'Action item ID is required'),
  assigneeId: z.string().optional()
});

export const saveTranscriptSchema = z.object({
  segments: z
    .array(
      z.object({
        speakerId: z.string().optional(),
        speakerName: z.string().min(1),
        text: z.string().min(1),
        startTime: z.number().optional(),
        endTime: z.number().optional()
      })
    )
    .optional(),
  language: z.string().default('en'),
  consentRecorded: z.boolean().default(true)
});

// Host Control Schemas
export const updateHostSettingsSchema = z.object({
  isLocked: z.boolean().optional(),
  waitingRoom: z.boolean().optional(),
  defaultMute: z.boolean().optional(),
  allowScreenShare: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  allowUnmute: z.boolean().optional(),
  allowCamera: z.boolean().optional()
});

export const moderateParticipantSchema = z.object({
  action: z.enum([
    'mute',
    'stopVideo',
    'stopScreenShare',
    'lowerHand',
    'remove',
    'promoteCoHost',
    'demoteCoHost'
  ]),
  targetParticipantId: z.string().optional(),
  targetSocketId: z.string().optional(),
  targetUserId: z.string().optional(),
  blockRejoin: z.boolean().default(false),
  reason: z.string().max(200).optional()
});

export const muteAllSchema = z.object({
  allowUnmute: z.boolean().default(true)
});

export const lockMeetingSchema = z.object({
  isLocked: z.boolean()
});

export const coHostAssignmentSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  assign: z.boolean()
});

export const admitParticipantSchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  socketId: z.string().optional()
});

export const rejectParticipantSchema = z.object({
  participantId: z.string().min(1, 'Participant ID is required'),
  socketId: z.string().optional(),
  reason: z.string().max(200).optional()
});

