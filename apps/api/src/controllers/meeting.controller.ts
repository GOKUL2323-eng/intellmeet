import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { MeetingService } from '../services/meeting.service';
import { ChatService } from '../services/chat.service';
import { AIService } from '../services/ai.service';
import { MeetingModel } from '../models/Meeting';
import { MeetingSummaryModel } from '../models/MeetingSummary';
import { MeetingTranscriptModel } from '../models/MeetingTranscript';
import { ActionItemModel } from '../models/ActionItem';
import { MeetingStatus } from '@intellmeet/shared';

export class MeetingController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspaceId!;
      const meeting = await MeetingService.createMeeting({
        workspaceId,
        hostId: req.user!._id.toString(),
        title: req.body.title,
        description: req.body.description,
        scheduledStartTime: req.body.scheduledStartTime,
        scheduledEndTime: req.body.scheduledEndTime,
        accessSettings: req.body.accessSettings
      });

      res.status(201).json({
        message: 'Meeting scheduled successfully.',
        meeting
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.workspaceId!;
      const status = req.query.status as MeetingStatus;
      const search = req.query.search as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 15;

      const result = await MeetingService.listMeetings({
        workspaceId,
        status,
        search,
        page,
        limit
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.getMeetingByIdOrCode(
        req.params.meetingId,
        req.workspaceId
      );

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found.' });
        return;
      }

      res.json({ meeting });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.updateMeeting(
        req.params.meetingId,
        req.workspaceId!,
        req.user!._id.toString(),
        req.body
      );

      res.json({ message: 'Meeting updated.', meeting });
    } catch (err) {
      next(err);
    }
  }

  static async join(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await MeetingService.joinMeeting(
        req.params.meetingId,
        req.user ? { id: req.user._id.toString(), fullName: req.user.fullName } : undefined,
        req.body?.guestName
      );

      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async end(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.endMeeting(
        req.params.meetingId,
        req.user!._id.toString(),
        req.workspaceId
      );

      res.json({ message: 'Meeting ended successfully.', meeting });
    } catch (err) {
      next(err);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.getMeetingByIdOrCode(req.params.meetingId, req.workspaceId);
      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found in this workspace.' });
        return;
      }

      const messages = await ChatService.getMeetingMessages(meeting._id.toString(), req.workspaceId);
      res.json({ messages });
    } catch (err) {
      next(err);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.getMeetingByIdOrCode(req.params.meetingId, req.workspaceId);
      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found in this workspace.' });
        return;
      }

      const message = await ChatService.saveMessage({
        meetingId: meeting._id.toString(),
        workspaceId: req.workspaceId!,
        senderId: req.user!._id.toString(),
        senderName: req.user!.fullName,
        senderAvatar: req.user!.avatarUrl,
        message: req.body.message,
        messageType: req.body.messageType || 'CHAT'
      });

      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }

  static async processAI(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.getMeetingByIdOrCode(req.params.meetingId, req.workspaceId);
      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found in this workspace.' });
        return;
      }

      const result = await AIService.processMeetingIntelligence({
        meetingId: meeting._id.toString(),
        workspaceId: req.workspaceId!,
        userId: req.user!._id.toString(),
        transcriptText: req.body.transcriptText,
        consentRecorded: req.body.consentRecorded === true,
        language: req.body.language || 'en'
      });

      res.json({
        message: 'AI meeting intelligence generated successfully.',
        ...result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.getMeetingByIdOrCode(req.params.meetingId, req.workspaceId);
      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found in this workspace.' });
        return;
      }

      const [summary, actionItems, transcript] = await Promise.all([
        MeetingSummaryModel.findOne({ meetingId: meeting._id, workspaceId: req.workspaceId }),
        ActionItemModel.find({ meetingId: meeting._id, workspaceId: req.workspaceId }),
        MeetingTranscriptModel.findOne({ meetingId: meeting._id, workspaceId: req.workspaceId })
      ]);

      if (!summary) {
        res.status(404).json({ error: 'Summary not generated for this meeting yet.' });
        return;
      }

      res.json({
        summary,
        actionItems,
        transcript
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.getMeetingByIdOrCode(req.params.meetingId, req.workspaceId);
      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found in this workspace.' });
        return;
      }

      const summary = await AIService.updateSummary(
        meeting._id.toString(),
        req.workspaceId!,
        req.user!._id.toString(),
        req.body
      );

      res.json({ message: 'Summary updated successfully.', summary });
    } catch (err) {
      next(err);
    }
  }

  static async saveTranscript(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const meeting = await MeetingService.getMeetingByIdOrCode(req.params.meetingId, req.workspaceId);
      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found in this workspace.' });
        return;
      }

      const transcript = await MeetingTranscriptModel.findOneAndUpdate(
        { meetingId: meeting._id, workspaceId: req.workspaceId },
        {
          workspaceId: req.workspaceId,
          segments: req.body.segments || [],
          language: req.body.language || 'en',
          consentRecorded: req.body.consentRecorded ?? true
        },
        { upsert: true, new: true }
      );

      res.status(201).json({ message: 'Transcript saved.', transcript });
    } catch (err) {
      next(err);
    }
  }
}
