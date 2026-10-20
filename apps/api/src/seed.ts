import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/database';
import { UserModel } from './models/User';
import { WorkspaceModel } from './models/Workspace';
import { WorkspaceMembershipModel } from './models/WorkspaceMembership';
import { MeetingModel } from './models/Meeting';
import { MeetingSummaryModel } from './models/MeetingSummary';
import { MeetingTranscriptModel } from './models/MeetingTranscript';
import { ActionItemModel } from './models/ActionItem';
import { TaskModel } from './models/Task';
import { NotificationModel } from './models/Notification';
import {
  UserRole,
  WorkspaceRole,
  MeetingStatus,
  TaskStatus,
  TaskPriority,
  AIProcessingStatus,
  NotificationType
} from '@intellmeet/shared';

export async function seedDatabase(shouldDisconnect = true) {
  console.log('🌱 Starting IntellMeet Database Seed...');
  await connectDatabase();

  // Clear existing collections
  await Promise.all([
    UserModel.deleteMany({}),
    WorkspaceModel.deleteMany({}),
    WorkspaceMembershipModel.deleteMany({}),
    MeetingModel.deleteMany({}),
    MeetingSummaryModel.deleteMany({}),
    MeetingTranscriptModel.deleteMany({}),
    ActionItemModel.deleteMany({}),
    TaskModel.deleteMany({}),
    NotificationModel.deleteMany({})
  ]);

  console.log('🧹 Cleaned existing database collections.');

  // 1. Create Demo Users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const [adminUser, devUser, productUser] = await UserModel.insertMany([
    {
      email: 'alex.chen@intellmeet.com',
      passwordHash,
      fullName: 'Alex Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      role: UserRole.ADMIN,
      timezone: 'America/New_York'
    },
    {
      email: 'elena.rostova@intellmeet.com',
      passwordHash,
      fullName: 'Elena Rostova',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      role: UserRole.MEMBER,
      timezone: 'Europe/London'
    },
    {
      email: 'sarah.jenkins@intellmeet.com',
      passwordHash,
      fullName: 'Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      role: UserRole.MEMBER,
      timezone: 'America/Los_Angeles'
    }
  ]);

  console.log(`👤 Created 3 Demo Users (alex.chen@intellmeet.com / Password123!)`);

  // 2. Create Workspace
  const workspace = await WorkspaceModel.create({
    name: 'Acme Technologies',
    slug: 'acme-tech',
    description: 'Engineering, Design, and Product Operations Workspace',
    ownerId: adminUser._id,
    settings: {
      allowGuestInvites: true,
      defaultMeetingDuration: 45
    }
  });

  // Memberships
  await WorkspaceMembershipModel.insertMany([
    { workspaceId: workspace._id, userId: adminUser._id, role: WorkspaceRole.OWNER, status: 'ACTIVE' },
    { workspaceId: workspace._id, userId: devUser._id, role: WorkspaceRole.ADMIN, status: 'ACTIVE' },
    { workspaceId: workspace._id, userId: productUser._id, role: WorkspaceRole.MEMBER, status: 'ACTIVE' }
  ]);

  console.log(`🏢 Created Workspace: "${workspace.name}"`);

  // 3. Create Sample Meetings
  const now = new Date();
  const pastMeetingDate = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const scheduledMeetingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Past Meeting with full AI intelligence summary
  const pastMeeting = await MeetingModel.create({
    meetingCode: 'eng-sync-842',
    title: 'Sprint 24 Architecture Review & WebRTC Sizing',
    description: 'Review WebRTC mesh signaling capacity, Mongoose tenant indexing, and AI transcription pipeline.',
    workspaceId: workspace._id,
    hostId: adminUser._id,
    scheduledStartTime: pastMeetingDate,
    scheduledEndTime: new Date(pastMeetingDate.getTime() + 45 * 60 * 1000),
    actualStartTime: pastMeetingDate,
    actualEndTime: new Date(pastMeetingDate.getTime() + 42 * 60 * 1000),
    status: MeetingStatus.ENDED,
    accessSettings: {
      allowGuests: true,
      waitingRoom: false,
      defaultMute: true
    },
    aiProcessingStatus: AIProcessingStatus.COMPLETED
  });

  // Live / Scheduled meetings
  const upcomingMeeting = await MeetingModel.create({
    meetingCode: 'prd-launch-910',
    title: 'IntellMeet v1.0 Go-To-Market & Security Audit',
    description: 'Final security walkthrough with team leads prior to production rollout.',
    workspaceId: workspace._id,
    hostId: devUser._id,
    scheduledStartTime: scheduledMeetingDate,
    scheduledEndTime: new Date(scheduledMeetingDate.getTime() + 60 * 60 * 1000),
    status: MeetingStatus.SCHEDULED,
    accessSettings: {
      allowGuests: true,
      waitingRoom: true,
      defaultMute: false
    },
    aiProcessingStatus: AIProcessingStatus.IDLE
  });

  // 4. Meeting Transcript for past meeting
  await MeetingTranscriptModel.create({
    meetingId: pastMeeting._id,
    workspaceId: workspace._id,
    language: 'en',
    consentRecorded: true,
    segments: [
      {
        speakerId: adminUser._id.toString(),
        speakerName: 'Alex Chen',
        text: 'Welcome everyone to the sprint architecture review. Today we want to finalize our WebRTC signaling and multi-tenant security architecture.',
        startTime: 0,
        endTime: 12
      },
      {
        speakerId: devUser._id.toString(),
        speakerName: 'Elena Rostova',
        text: 'The WebRTC mesh with STUN is working reliably for up to 6 participants. For higher numbers, we will hook up an SFU pipeline.',
        startTime: 13,
        endTime: 28
      },
      {
        speakerId: productUser._id.toString(),
        speakerName: 'Sarah Jenkins',
        text: 'The AI summary extraction looks great. Users can convert generated action items directly into Kanban cards with a single click.',
        startTime: 29,
        endTime: 42
      }
    ]
  });

  // 5. Meeting Summary
  const summary = await MeetingSummaryModel.create({
    meetingId: pastMeeting._id,
    workspaceId: workspace._id,
    overview:
      'The engineering leadership aligned on the WebRTC mesh signaling architecture, verified database compound indexing for multi-tenant workspace isolation, and approved the automated AI meeting summary and action-item pipeline.',
    decisions: [
      'Adopted peer-to-peer WebRTC with STUN signaling for rooms up to 6 participants, with an SFU upgrade path for larger enterprise broadcasts.',
      'Enforced mandatory tenant isolation checks via compound Mongoose indexes on workspaceId and userId.',
      'Standardized JWT authentication with short-lived 15m access tokens and 7-day refresh token rotation.'
    ],
    discussionHighlights: [
      'Evaluated socket room segregation to prevent cross-workspace message leakage.',
      'Reviewed latency benchmarks for real-time speech segment transcription streaming.',
      'Discussed fallback strategies when external AI models experience transient rate limits.'
    ],
    unresolvedQuestions: [
      'Should TURN server credentials be dynamically leased using coturn REST API or preconfigured static credentials?',
      'What is the maximum recording segment retention threshold before archiving to cold storage?'
    ],
    nextSteps: [
      'Finalize integration test coverage for refresh token family reuse detection.',
      'Deploy MongoDB memory server fallback validation in CI test runner.'
    ],
    isEdited: false
  });

  pastMeeting.summaryId = summary._id as mongoose.Types.ObjectId;
  await pastMeeting.save();

  // 6. Action Items
  const actionItems = await ActionItemModel.insertMany([
    {
      meetingId: pastMeeting._id,
      workspaceId: workspace._id,
      title: 'Implement coturn STUN/TURN credential leasing endpoint',
      description: 'Provide dynamic ICE server configuration for participants behind symmetric NAT.',
      assigneeId: devUser._id,
      assigneeName: 'Elena Rostova',
      priority: TaskPriority.HIGH,
      status: 'CONVERTED',
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
    },
    {
      meetingId: pastMeeting._id,
      workspaceId: workspace._id,
      title: 'Audit workspace isolation queries across all repositories',
      description: 'Verify every Mongoose query in meeting, task, and analytics modules enforces workspaceId.',
      assigneeId: adminUser._id,
      assigneeName: 'Alex Chen',
      priority: TaskPriority.URGENT,
      status: 'PROPOSED',
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    },
    {
      meetingId: pastMeeting._id,
      workspaceId: workspace._id,
      title: 'Export weekly analytics report to CSV',
      description: 'Generate team collaboration summary for stakeholders.',
      assigneeId: productUser._id,
      assigneeName: 'Sarah Jenkins',
      priority: TaskPriority.LOW,
      status: 'PROPOSED',
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  ]);

  // 7. Kanban Tasks
  await TaskModel.insertMany([
    {
      workspaceId: workspace._id,
      creatorId: adminUser._id,
      assigneeId: devUser._id,
      meetingId: pastMeeting._id,
      actionItemId: actionItems[0]._id,
      title: 'Configure Coturn STUN/TURN ICE credentials',
      description: 'Ensure WebRTC calls connect seamlessly across restrictive corporate firewalls.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      tags: ['DevOps', 'WebRTC'],
      comments: [
        {
          userId: adminUser._id,
          userName: 'Alex Chen',
          text: 'Verified Google public STUN servers for standard NAT networks. Ready to test symmetric traversal.',
          createdAt: new Date(now.getTime() - 30 * 60 * 1000)
        }
      ]
    },
    {
      workspaceId: workspace._id,
      creatorId: devUser._id,
      assigneeId: adminUser._id,
      title: 'Enforce strict workspace tenant isolation middleware',
      description: 'Block cross-workspace data access with unit test verification.',
      status: TaskStatus.DONE,
      priority: TaskPriority.URGENT,
      dueDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      tags: ['Security', 'Mongoose']
    },
    {
      workspaceId: workspace._id,
      creatorId: productUser._id,
      assigneeId: productUser._id,
      title: 'Pre-meeting lobby camera & audio visualizer polish',
      description: 'Add microphone level meters and camera selector dropdown in the join lobby.',
      status: TaskStatus.IN_REVIEW,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      tags: ['Frontend', 'UI/UX']
    },
    {
      workspaceId: workspace._id,
      creatorId: adminUser._id,
      assigneeId: devUser._id,
      title: 'Automate weekly AI analytics digest export',
      description: 'Provide downloadable CSV with meeting durations and task velocity.',
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      tags: ['Analytics']
    }
  ]);

  // 8. Notifications
  await NotificationModel.insertMany([
    {
      userId: adminUser._id,
      workspaceId: workspace._id,
      title: 'AI Summary Ready',
      message: 'Sprint 24 Architecture Review summary and 3 action items are ready to review.',
      type: NotificationType.AI_SUMMARY_READY,
      link: `/meetings/${pastMeeting._id}`,
      isRead: false
    },
    {
      userId: devUser._id,
      workspaceId: workspace._id,
      title: 'New Task Assigned',
      message: 'You were assigned task: "Configure Coturn STUN/TURN ICE credentials"',
      type: NotificationType.TASK_ASSIGNED,
      link: '/tasks',
      isRead: false
    },
    {
      userId: adminUser._id,
      workspaceId: workspace._id,
      title: 'Upcoming Meeting Tomorrow',
      message: 'IntellMeet v1.0 Go-To-Market & Security Audit starts tomorrow at 10:00 AM.',
      type: NotificationType.MEETING_STARTING,
      link: `/meetings/${upcomingMeeting._id}`,
      isRead: true
    }
  ]);

  console.log('✅ IntellMeet demo data seeded successfully!');
  console.log('====================================================');
  console.log('Credentials:');
  console.log('Email:    alex.chen@intellmeet.com');
  console.log('Password: Password123!');
  console.log('Workspace: Acme Technologies');
  console.log('====================================================');

  if (shouldDisconnect) {
    await disconnectDatabase();
  }
}

// If run directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase().catch(err => {
    console.error('Seed script failed:', err);
    process.exit(1);
  });
}
