import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { config } from '../config/env';
import { ITokenPayload } from '../middleware/auth';
import { MeetingModel } from '../models/Meeting';
import { WorkspaceMembershipModel } from '../models/WorkspaceMembership';
import { ChatService } from '../services/chat.service';

interface ISocketParticipant {
  socketId: string;
  meetingId: string;
  userId?: string;
  fullName: string;
  role: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

// In-memory active room tracker: meetingId -> Map<socketId, ISocketParticipant>
const activeRooms = new Map<string, Map<string, ISocketParticipant>>();

export function setupSocketHandlers(io: SocketIOServer): void {
  // Authentication middleware for socket connections
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
          algorithms: ['HS256']
        }) as ITokenPayload;
        (socket as any).user = decoded;
      } catch (err) {
        (socket as any).user = null;
      }
    } else {
      (socket as any).user = null;
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as ITokenPayload | null;

    // Join user's personal notification room if authenticated
    if (user?.userId) {
      socket.join(`user:${user.userId}`);
    }

    // Per-socket chat message rate-limiting tracking
    let chatCount = 0;
    let chatWindowStart = Date.now();

    /**
     * meeting:join - Join a WebRTC meeting room with database validation & authorization
     */
    socket.on('meeting:join', async (data: {
      meetingId: string;
      workspaceId?: string;
      fullName?: string;
      isMuted?: boolean;
      isCameraOff?: boolean;
    }) => {
      try {
        const { meetingId } = data;
        if (!meetingId || typeof meetingId !== 'string') {
          socket.emit('meeting:error', { message: 'Invalid meeting identifier provided.' });
          return;
        }

        // Query database to authorize room entry
        const query: Record<string, unknown> = {};
        if (mongoose.Types.ObjectId.isValid(meetingId)) {
          query._id = new mongoose.Types.ObjectId(meetingId);
        } else {
          query.meetingCode = meetingId;
        }

        const meeting = await MeetingModel.findOne(query);
        if (!meeting) {
          socket.emit('meeting:error', { message: 'Meeting does not exist.' });
          return;
        }

        if (meeting.status === 'CANCELLED' || meeting.status === 'ENDED') {
          socket.emit('meeting:error', { message: 'This meeting has ended or was cancelled.' });
          return;
        }

        // Guest policy verification
        if (!user && !meeting.accessSettings.allowGuests) {
          socket.emit('meeting:error', { message: 'Guest access is not permitted for this meeting.' });
          return;
        }

        // Workspace membership check for non-hosts
        const isHost = user && meeting.hostId.toString() === user.userId;
        if (user && !isHost) {
          const membership = await WorkspaceMembershipModel.findOne({
            workspaceId: meeting.workspaceId,
            userId: new mongoose.Types.ObjectId(user.userId),
            status: 'ACTIVE'
          });

          if (!membership && !meeting.accessSettings.allowGuests) {
            socket.emit('meeting:error', { message: 'Forbidden: You are not authorized to join this private meeting.' });
            return;
          }
        }

        const role = isHost ? 'HOST' : 'ATTENDEE';
        const fullName = user
          ? (user.email ? user.email.split('@')[0] : 'Attendee')
          : (data.fullName?.trim().slice(0, 50) || 'Guest Attendee');

        socket.join(`meeting:${meetingId}`);

        if (!activeRooms.has(meetingId)) {
          activeRooms.set(meetingId, new Map());
        }

        const room = activeRooms.get(meetingId)!;
        const participant: ISocketParticipant = {
          socketId: socket.id,
          meetingId,
          userId: user?.userId,
          fullName,
          role,
          isMuted: data.isMuted ?? false,
          isCameraOff: data.isCameraOff ?? false,
          isScreenSharing: false
        };

        room.set(socket.id, participant);

        // Return current participant list to the newly joined peer
        const existingParticipants = Array.from(room.values()).filter(p => p.socketId !== socket.id);
        socket.emit('meeting:room-state', {
          participants: existingParticipants,
          you: participant
        });

        // Broadcast to other peers in room that a new peer joined
        socket.to(`meeting:${meetingId}`).emit('meeting:participant-joined', participant);

        console.log(`[Socket] "${fullName}" (${socket.id}) joined meeting ${meetingId}. Room size: ${room.size}`);
      } catch (err) {
        socket.emit('meeting:error', { message: 'Error processing meeting join request.' });
      }
    });

    /**
     * meeting:signal - Forward WebRTC SDP offer, answer, or ICE candidate to a specific peer in the same room
     */
    socket.on('meeting:signal', (data: {
      meetingId?: string;
      toSocketId: string;
      signal: any;
    }) => {
      if (!data.toSocketId || !data.signal) return;

      // Find the room the sender is currently in
      let senderRoomId: string | null = null;
      for (const [roomId, room] of activeRooms.entries()) {
        if (room.has(socket.id)) {
          senderRoomId = roomId;
          // Verify that target recipient is also in this same room
          if (room.has(data.toSocketId)) {
            io.to(data.toSocketId).emit('meeting:signal', {
              fromSocketId: socket.id,
              signal: data.signal
            });
          }
          break;
        }
      }
    });

    /**
     * meeting:state-updated - Microphone, Camera, Hand raise status toggles
     */
    socket.on('meeting:state-updated', (data: {
      meetingId: string;
      isMuted?: boolean;
      isCameraOff?: boolean;
      isHandRaised?: boolean;
    }) => {
      const room = activeRooms.get(data.meetingId);
      if (room && room.has(socket.id)) {
        const participant = room.get(socket.id)!;
        if (data.isMuted !== undefined) participant.isMuted = data.isMuted;
        if (data.isCameraOff !== undefined) participant.isCameraOff = data.isCameraOff;

        socket.to(`meeting:${data.meetingId}`).emit('meeting:participant-updated', {
          socketId: socket.id,
          ...data
        });
      }
    });

    /**
     * meeting:screen-share - Start or stop screen sharing
     */
    socket.on('meeting:screen-share', (data: {
      meetingId: string;
      isSharing: boolean;
    }) => {
      const room = activeRooms.get(data.meetingId);
      if (room && room.has(socket.id)) {
        const participant = room.get(socket.id)!;
        participant.isScreenSharing = data.isSharing;

        io.to(`meeting:${data.meetingId}`).emit('meeting:screen-share-changed', {
          socketId: socket.id,
          isSharing: data.isSharing,
          sharedBy: participant.fullName
        });
      }
    });

    /**
     * meeting:chat - In-meeting live chat message with rate limiting and membership check
     */
    socket.on('meeting:chat', async (data: {
      meetingId: string;
      workspaceId?: string;
      message: string;
    }) => {
      const now = Date.now();
      if (now - chatWindowStart > 30000) {
        chatCount = 0;
        chatWindowStart = now;
      }
      chatCount++;
      if (chatCount > 30) {
        socket.emit('meeting:error', { message: 'Too many messages sent. Please slow down.' });
        return;
      }

      if (!data.message || typeof data.message !== 'string' || !data.message.trim()) {
        return;
      }

      const room = activeRooms.get(data.meetingId);
      if (!room || !room.has(socket.id)) {
        socket.emit('meeting:error', { message: 'You must be a participant in the meeting to send messages.' });
        return;
      }

      const cleanMessage = data.message.trim().slice(0, 1000);
      const participant = room.get(socket.id);
      const senderName = participant?.fullName || 'Attendee';

      const payload = {
        id: crypto.randomUUID(),
        meetingId: data.meetingId,
        senderId: user?.userId || 'guest',
        senderName,
        message: cleanMessage,
        createdAt: new Date().toISOString()
      };

      // Persist to database asynchronously if authenticated
      if (user?.userId && data.workspaceId && mongoose.Types.ObjectId.isValid(data.workspaceId)) {
        ChatService.saveMessage({
          meetingId: data.meetingId,
          workspaceId: data.workspaceId,
          senderId: user.userId,
          senderName,
          message: cleanMessage
        }).catch(err => console.error('Error saving chat message:', err));
      }

      io.to(`meeting:${data.meetingId}`).emit('meeting:chat', payload);
    });

    /**
     * meeting:typing - Typing indicators
     */
    socket.on('meeting:typing', (data: { meetingId: string; isTyping: boolean }) => {
      const room = activeRooms.get(data.meetingId);
      const participant = room?.get(socket.id);
      if (participant) {
        socket.to(`meeting:${data.meetingId}`).emit('meeting:typing', {
          socketId: socket.id,
          fullName: participant.fullName,
          isTyping: data.isTyping
        });
      }
    });

    /**
     * meeting:leave - Explicit leave
     */
    socket.on('meeting:leave', (data: { meetingId: string }) => {
      handleUserLeave(socket, data.meetingId);
    });

    /**
     * disconnect - Cleanup upon disconnection
     */
    socket.on('disconnect', () => {
      activeRooms.forEach((room, meetingId) => {
        if (room.has(socket.id)) {
          handleUserLeave(socket, meetingId);
        }
      });
    });
  });

  function handleUserLeave(socket: Socket, meetingId: string) {
    const room = activeRooms.get(meetingId);
    if (!room) return;

    const participant = room.get(socket.id);
    if (participant) {
      room.delete(socket.id);
      socket.leave(`meeting:${meetingId}`);

      socket.to(`meeting:${meetingId}`).emit('meeting:participant-left', {
        socketId: socket.id,
        fullName: participant.fullName
      });

      console.log(`[Socket] "${participant.fullName}" left meeting ${meetingId}. Remaining: ${room.size}`);
    }

    if (room.size === 0) {
      activeRooms.delete(meetingId);
    }
  }
}
