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
  saveTranscriptSchema
} from '@intellmeet/shared';

const router = Router();

// Guest/Public join does not strictly require auth header, but authenticated users are identified
router.post('/:meetingId/join', (req, res, next) => {
  if (req.headers.authorization || req.cookies?.accessToken) {
    return authenticate(req, res, next);
  }
  next();
}, MeetingController.join);

// Remaining endpoints require authentication
router.use(authenticate);

router.get('/', requireWorkspaceMember, MeetingController.list);
router.post('/', requireWorkspaceMember, validateBody(createMeetingSchema), MeetingController.create);

router.get('/:meetingId', requireWorkspaceMember, MeetingController.getById);
router.patch('/:meetingId', requireWorkspaceMember, validateBody(updateMeetingSchema), MeetingController.update);
router.post('/:meetingId/end', requireWorkspaceMember, MeetingController.end);

// Chat
router.get('/:meetingId/messages', requireWorkspaceMember, MeetingController.getMessages);
router.post('/:meetingId/messages', requireWorkspaceMember, validateBody(sendChatMessageSchema), MeetingController.sendMessage);

// Transcripts & AI
router.post('/:meetingId/transcripts', requireWorkspaceMember, validateBody(saveTranscriptSchema), MeetingController.saveTranscript);
router.post('/:meetingId/ai/process', aiProcessingLimiter, requireWorkspaceMember, validateBody(processAISummarySchema), MeetingController.processAI);
router.get('/:meetingId/summary', requireWorkspaceMember, MeetingController.getSummary);
router.patch('/:meetingId/summary', requireWorkspaceMember, validateBody(updateSummarySchema), MeetingController.updateSummary);

export default router;
