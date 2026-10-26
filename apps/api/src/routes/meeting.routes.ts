import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller';
import { authenticate, requireWorkspaceMember } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { aiProcessingLimiter } from '../middleware/rateLimiter';
import {
  createMeetingSchema,
  updateMeetingSchema,
  processAISummarySchema,
  updateSummarySchema,
  sendChatMessageSchema,
  saveTranscriptSchema,
  updateHostSettingsSchema,
  lockMeetingSchema,
  muteAllSchema,
  moderateParticipantSchema,
  coHostAssignmentSchema,
  createGoogleMeetingSchema
} from '@intellmeet/shared';

const router = Router();

// ICE Servers configuration (STUN/TURN) - accessible for WebRTC room & lobby coordination
router.get('/ice-servers', MeetingController.getIceServers);

// Guest/Public join does not strictly require auth header, but authenticated users are identified
router.post('/:meetingId/join', (req, res, next) => {
  if (req.headers.authorization || req.cookies?.accessToken) {
    return authenticate(req, res, next);
  }
  next();
}, MeetingController.join);

// Guest/Public lobby info endpoint
router.get('/:meetingId/lobby', (req, res, next) => {
  if (req.headers.authorization || req.cookies?.accessToken) {
    return authenticate(req, res, next);
  }
  next();
}, MeetingController.getLobbyInfo);

// Remaining endpoints require authentication
router.use(authenticate);

router.get('/', requireWorkspaceMember, MeetingController.list);
router.post('/', requireWorkspaceMember, validateBody(createMeetingSchema), MeetingController.create);
router.post('/google-meet', requireWorkspaceMember, validateBody(createGoogleMeetingSchema), MeetingController.createGoogleMeeting);

router.get('/:meetingId', requireWorkspaceMember, MeetingController.getById);
router.patch('/:meetingId', requireWorkspaceMember, validateBody(updateMeetingSchema), MeetingController.update);
router.post('/:meetingId/end', requireWorkspaceMember, MeetingController.end);

// Host Controls & Moderation APIs
router.get('/:meetingId/participants', requireWorkspaceMember, MeetingController.getParticipants);
router.get('/:meetingId/moderation-logs', requireWorkspaceMember, MeetingController.getModerationHistory);
router.get('/:meetingId/livekit-token', requireWorkspaceMember, MeetingController.getLiveKitToken);

router.patch('/:meetingId/settings', requireWorkspaceMember, validateBody(updateHostSettingsSchema), MeetingController.updateHostSettings);
router.post('/:meetingId/lock', requireWorkspaceMember, validateBody(lockMeetingSchema), MeetingController.lock);
router.post('/:meetingId/mute-all', requireWorkspaceMember, validateBody(muteAllSchema), MeetingController.muteAll);
router.post('/:meetingId/participants/:participantId/moderate', requireWorkspaceMember, validateBody(moderateParticipantSchema), MeetingController.moderateParticipant);
router.post('/:meetingId/participants/:participantId/admit', requireWorkspaceMember, MeetingController.admitParticipant);
router.post('/:meetingId/participants/:participantId/reject', requireWorkspaceMember, MeetingController.rejectParticipant);
router.post('/:meetingId/co-hosts', requireWorkspaceMember, validateBody(coHostAssignmentSchema), MeetingController.assignCoHost);

// Chat
router.get('/:meetingId/messages', requireWorkspaceMember, MeetingController.getMessages);
router.post('/:meetingId/messages', requireWorkspaceMember, validateBody(sendChatMessageSchema), MeetingController.sendMessage);

// Transcripts & AI
router.post('/:meetingId/transcripts', requireWorkspaceMember, validateBody(saveTranscriptSchema), MeetingController.saveTranscript);
router.post('/:meetingId/ai/process', aiProcessingLimiter, requireWorkspaceMember, validateBody(processAISummarySchema), MeetingController.processAI);
router.get('/:meetingId/summary', requireWorkspaceMember, MeetingController.getSummary);
router.patch('/:meetingId/summary', requireWorkspaceMember, validateBody(updateSummarySchema), MeetingController.updateSummary);

export default router;
