import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { config } from '../config/env';
import { ITokenPayload } from '../middleware/auth';
import { MeetingModel } from '../models/Meeting';
import { MeetingParticipantModel } from '../models/MeetingParticipant';
import { WorkspaceMembershipModel } from '../models/WorkspaceMembership';
import { ChatService } from '../services/chat.service';
import { ParticipantRole, AuditAction } from '@intellmeet/shared';
import { AuditService } from '../services/audit.service';

export interface ISocketParticipant {
  socketId: string;
  meetingId: string;
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
}

export interface IWaitingParticipant {
  socketId: string;
  meetingId: string;
  userId?: string;
  fullName: string;
  requestedAt: string;
}

// In-memory active room tracker: meetingId -> Map<socketId, ISocketParticipant>
const activeRooms = new Map<string, Map<string, ISocketParticipant>>();

// In-memory waiting room tracker: meetingId -> Map<socketId, IWaitingParticipant>
const waitingRooms = new Map<string, Map<string, IWaitingParticipant>>();

let globalIO: SocketIOServer | null = null;

export function getSocketIO(): SocketIOServer | null {
  return globalIO;
}

export function broadcastToMeeting(meetingId: string, event: string, payload: any): void {
  if (globalIO) {
    globalIO.to(`meeting:${meetingId}`).emit(event, payload);
  }
}

export function setupSocketHandlers(io: SocketIOServer): void {
  globalIO = io;

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

        const isHost = Boolean(user && meeting.hostId.toString() === user.userId);
        const isCoHost = Boolean(user && meeting.coHostIds?.some(id => id.toString() === user.userId));

        // Enforce Meeting Lock
        if (meeting.isLocked && !isHost && !isCoHost) {
          socket.emit('meeting:error', {
            code: 'MEETING_LOCKED',
            message: 'This meeting is locked by the host. No new participants may enter.'
          });
          return;
        }

        const fullName = (data.fullName && data.fullName.trim().length > 0)
          ? data.fullName.trim().slice(0, 50)
          : (user?.email ? user.email.split('@')[0] : 'Attendee');

        // Enforce Banned List (prevent rejoining)
        if (user && meeting.bannedUserIds?.some(id => id.toString() === user.userId)) {
          socket.emit('meeting:error', {
            code: 'PARTICIPANT_BANNED',
            message: 'You have been removed from this meeting by the host and cannot rejoin.'
          });
          return;
        }
        if (!user && fullName && meeting.bannedGuestNames?.includes(fullName)) {
          socket.emit('meeting:error', {
            code: 'PARTICIPANT_BANNED',
            message: 'You have been removed from this meeting by the host and cannot rejoin.'
          });
          return;
        }

        // Guest policy verification
        if (!user && !meeting.accessSettings.allowGuests) {
          socket.emit('meeting:error', { message: 'Guest access is not permitted for this meeting.' });
          return;
        }

        // Workspace membership check for non-hosts
        if (user && !isHost && !isCoHost) {
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

        const role = isHost ? 'HOST' : isCoHost ? 'CO_HOST' : 'ATTENDEE';

        // Check Waiting Room
        const needsWaitingRoom = Boolean(meeting.accessSettings.waitingRoom && !isHost && !isCoHost);
        if (needsWaitingRoom) {
          if (!waitingRooms.has(meetingId)) {
            waitingRooms.set(meetingId, new Map());
          }
          const waitingRoom = waitingRooms.get(meetingId)!;
          const waitingEntry: IWaitingParticipant = {
            socketId: socket.id,
            meetingId,
            userId: user?.userId,
            fullName,
            requestedAt: new Date().toISOString()
          };
          waitingRoom.set(socket.id, waitingEntry);
          socket.join(`meeting:waiting:${meetingId}`);

          // Notify participant that they are waiting
          socket.emit('meeting:waiting-room', {
            message: 'Waiting for the meeting host to admit you...',
            meetingId,
            title: meeting.title
          });

          // Broadcast waiting room update to hosts in meeting
          const waitingList = Array.from(waitingRoom.values());
          io.to(`meeting:${meetingId}`).emit('meeting:waiting-room-updated', {
            waitingParticipants: waitingList,
            count: waitingList.length
          });

          console.log(`[Socket] "${fullName}" placed in waiting room for meeting ${meetingId}.`);
          return;
        }

        // Admit directly to active room
        joinActiveMeetingRoom(socket, meeting, role, fullName, data.isMuted, data.isCameraOff);
      } catch (err) {
        console.error('Socket join error:', err);
        socket.emit('meeting:error', { message: 'Error processing meeting join request.' });
      }
    });

    /**
     * Helper to add a socket into active room and broadcast states
     */
    function joinActiveMeetingRoom(
      socket: Socket,
      meeting: any,
      role: string,
      fullName: string,
      isMuted = false,
      isCameraOff = false
    ) {
      const meetingId = meeting._id.toString();
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
        isMuted: isMuted ?? meeting.accessSettings?.defaultMute ?? false,
        isCameraOff: isCameraOff ?? false,
        isScreenSharing: false,
        isAudioBlocked: false,
        isVideoBlocked: false,
        isScreenShareBlocked: false,
        networkQuality: 'good'
      };

      room.set(socket.id, participant);

      // Persist socketId and active presence to database
      if (user?.userId) {
        MeetingParticipantModel.findOneAndUpdate(
          { meetingId: meeting._id, userId: new mongoose.Types.ObjectId(user.userId) },
          { socketId: socket.id, leftAt: undefined, joinedAt: new Date(), role },
          { upsert: true }
        ).catch(err => console.warn('Could not update participant socketId in DB:', err));
      } else if (fullName) {
        MeetingParticipantModel.findOneAndUpdate(
          { meetingId: meeting._id, guestName: fullName, leftAt: { $exists: false } },
          { socketId: socket.id, joinedAt: new Date(), role },
          { upsert: true }
        ).catch(err => console.warn('Could not update guest participant socketId in DB:', err));
      }

      const existingParticipants = Array.from(room.values()).filter(p => p.socketId !== socket.id);
      const waitingList = Array.from(waitingRooms.get(meetingId)?.values() || []);

      socket.emit('meeting:room-state', {
        participants: existingParticipants,
        you: participant,
        isLocked: meeting.isLocked ?? false,
        accessSettings: meeting.accessSettings,
        waitingParticipants: (role === 'HOST' || role === 'CO_HOST') ? waitingList : []
      });

      // Broadcast to other peers in room
      socket.to(`meeting:${meetingId}`).emit('meeting:participant-joined', participant);

      console.log(`[Socket] "${fullName}" (${socket.id}) entered meeting ${meetingId}. Role: ${role}. Room size: ${room.size}`);
    }

    /**
     * meeting:admit-participant - Host/Co-Host admits participant from waiting room
     */
    socket.on('meeting:admit-participant', async (data: { meetingId: string; socketId: string }) => {
      try {
        const { meetingId, socketId: targetSocketId } = data;
        const room = activeRooms.get(meetingId);
        const caller = room?.get(socket.id);

        if (!caller || (caller.role !== 'HOST' && caller.role !== 'CO_HOST')) {
          socket.emit('meeting:error', { message: 'Unauthorized: Only hosts or co-hosts can admit participants.' });
          return;
        }

        const waitingRoom = waitingRooms.get(meetingId);
        const targetEntry = waitingRoom?.get(targetSocketId);
        if (!targetEntry) {
          socket.emit('meeting:error', { message: 'Participant is no longer in the waiting room.' });
          return;
        }

        waitingRoom!.delete(targetSocketId);

        const targetSocket = io.sockets.sockets.get(targetSocketId);
        if (targetSocket) {
          targetSocket.leave(`meeting:waiting:${meetingId}`);
          targetSocket.join(`meeting:${meetingId}`);

          const participant: ISocketParticipant = {
            socketId: targetSocketId,
            meetingId,
            userId: targetEntry.userId,
            fullName: targetEntry.fullName,
            role: 'ATTENDEE',
            isMuted: false,
            isCameraOff: false,
            isScreenSharing: false,
            networkQuality: 'good'
          };

          room!.set(targetSocketId, participant);

          // Send admitted event with room state to the target
          const existingParticipants = Array.from(room!.values()).filter(p => p.socketId !== targetSocketId);
          targetSocket.emit('meeting:admitted', {
            participants: existingParticipants,
            you: participant
          });

          // Broadcast join to all peers in room
          targetSocket.to(`meeting:${meetingId}`).emit('meeting:participant-joined', participant);
        }

        // Broadcast updated waiting room list to hosts
        const updatedWaiting = Array.from(waitingRoom!.values());
        io.to(`meeting:${meetingId}`).emit('meeting:waiting-room-updated', {
          waitingParticipants: updatedWaiting,
          count: updatedWaiting.length
        });
      } catch (err) {
        console.error('Error admitting participant:', err);
      }
    });

    /**
     * meeting:reject-participant - Host/Co-Host rejects waiting room participant
     */
    socket.on('meeting:reject-participant', async (data: { meetingId: string; socketId: string; reason?: string }) => {
      try {
        const { meetingId, socketId: targetSocketId, reason } = data;
        const room = activeRooms.get(meetingId);
        const caller = room?.get(socket.id);

        if (!caller || (caller.role !== 'HOST' && caller.role !== 'CO_HOST')) {
          socket.emit('meeting:error', { message: 'Unauthorized: Only hosts or co-hosts can reject participants.' });
          return;
        }

        const waitingRoom = waitingRooms.get(meetingId);
        if (waitingRoom?.has(targetSocketId)) {
          waitingRoom.delete(targetSocketId);

          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit('meeting:rejected', {
              message: reason || 'The host has denied admission to this meeting.'
            });
            targetSocket.leave(`meeting:waiting:${meetingId}`);
          }

          const updatedWaiting = Array.from(waitingRoom.values());
          io.to(`meeting:${meetingId}`).emit('meeting:waiting-room-updated', {
            waitingParticipants: updatedWaiting,
            count: updatedWaiting.length
          });
        }
      } catch (err) {
        console.error('Error rejecting participant:', err);
      }
    });

    /**
     * meeting:lock - Host/Co-Host locks or unlocks meeting
     */
    socket.on('meeting:lock', async (data: { meetingId: string; isLocked: boolean }) => {
      try {
        const room = activeRooms.get(data.meetingId);
        const caller = room?.get(socket.id);

        if (!caller || (caller.role !== 'HOST' && caller.role !== 'CO_HOST')) {
          socket.emit('meeting:error', { message: 'Unauthorized: Host permissions required to lock meeting.' });
          return;
        }

        const query: Record<string, unknown> = {};
        if (mongoose.Types.ObjectId.isValid(data.meetingId)) {
          query._id = new mongoose.Types.ObjectId(data.meetingId);
        } else {
          query.meetingCode = data.meetingId;
        }

        await MeetingModel.updateOne(query, { isLocked: data.isLocked });

        io.to(`meeting:${data.meetingId}`).emit('meeting:lock-toggled', {
          isLocked: data.isLocked,
          lockedBy: caller.fullName
        });

        console.log(`[Socket] Meeting ${data.meetingId} lock state changed to: ${data.isLocked}`);
      } catch (err) {
        console.error('Error updating meeting lock state:', err);
      }
    });

    /**
     * meeting:mute-all - Host/Co-Host mutes all participants
     */
    socket.on('meeting:mute-all', async (data: { meetingId: string; allowUnmute?: boolean }) => {
      try {
        const room = activeRooms.get(data.meetingId);
        const caller = room?.get(socket.id);

        if (!caller || (caller.role !== 'HOST' && caller.role !== 'CO_HOST')) {
          socket.emit('meeting:error', { message: 'Unauthorized: Host permissions required to mute participants.' });
          return;
        }

        const allowUnmute = data.allowUnmute ?? true;

        if (room) {
          room.forEach((p, pSocketId) => {
            if (p.role !== 'HOST' && pSocketId !== socket.id) {
              p.isMuted = true;
              p.isAudioBlocked = !allowUnmute;
            }
          });
        }

        // Broadcast to everyone in the room
        io.to(`meeting:${data.meetingId}`).emit('meeting:all-muted', {
          allowUnmute,
          mutedBy: caller.fullName
        });

        console.log(`[Socket] Mute All triggered in ${data.meetingId}. allowUnmute: ${allowUnmute}`);
      } catch (err) {
        console.error('Error in mute-all:', err);
      }
    });

    /**
     * meeting:moderate-participant - Moderate individual peer (mute, stop video, remove, promote/demote)
     */
    socket.on('meeting:moderate-participant', async (data: {
      meetingId: string;
      targetSocketId: string;
      action: 'mute' | 'stopVideo' | 'stopScreenShare' | 'lowerHand' | 'remove' | 'promoteCoHost' | 'demoteCoHost';
      blockRejoin?: boolean;
      reason?: string;
    }) => {
      try {
        const room = activeRooms.get(data.meetingId);
        const caller = room?.get(socket.id);

        if (!caller || (caller.role !== 'HOST' && caller.role !== 'CO_HOST')) {
          socket.emit('meeting:error', { message: 'Unauthorized: Host permissions required for moderation.' });
          return;
        }

        const target = room?.get(data.targetSocketId);
        if (!target) {
          socket.emit('meeting:error', { message: 'Target participant is not connected.' });
          return;
        }

        // Host protection
        if (target.role === 'HOST') {
          socket.emit('meeting:error', { message: 'Cannot moderate the meeting host.' });
          return;
        }

        // Co-host hierarchy
        if (caller.role === 'CO_HOST' && target.role === 'CO_HOST') {
          socket.emit('meeting:error', { message: 'Co-hosts cannot moderate fellow co-hosts.' });
          return;
        }

        const targetSocket = io.sockets.sockets.get(data.targetSocketId);

        switch (data.action) {
          case 'mute':
            target.isMuted = true;
            targetSocket?.emit('meeting:force-mute', {
              by: caller.fullName,
              message: 'You have been muted by the host.'
            });
            io.to(`meeting:${data.meetingId}`).emit('meeting:participant-updated', {
              socketId: data.targetSocketId,
              isMuted: true
            });
            break;

          case 'stopVideo':
            target.isCameraOff = true;
            target.isVideoBlocked = true;
            targetSocket?.emit('meeting:force-stop-video', {
              by: caller.fullName,
              message: 'Your camera has been turned off by the host.'
            });
            io.to(`meeting:${data.meetingId}`).emit('meeting:participant-updated', {
              socketId: data.targetSocketId,
              isCameraOff: true,
              isVideoBlocked: true
            });
            break;

          case 'stopScreenShare':
            target.isScreenSharing = false;
            target.isScreenShareBlocked = true;
            targetSocket?.emit('meeting:force-stop-screen', {
              by: caller.fullName,
              message: 'Your screen sharing has been stopped by the host.'
            });
            io.to(`meeting:${data.meetingId}`).emit('meeting:screen-share-changed', {
              socketId: data.targetSocketId,
              isSharing: false
            });
            break;

          case 'lowerHand':
            target.isHandRaised = false;
            io.to(`meeting:${data.meetingId}`).emit('meeting:participant-updated', {
              socketId: data.targetSocketId,
              isHandRaised: false
            });
            break;

          case 'remove':
            if (data.blockRejoin) {
              const query: Record<string, unknown> = {};
              if (mongoose.Types.ObjectId.isValid(data.meetingId)) {
                query._id = new mongoose.Types.ObjectId(data.meetingId);
              } else {
                query.meetingCode = data.meetingId;
              }
              const meeting = await MeetingModel.findOne(query);
              if (meeting) {
                if (target.userId && mongoose.Types.ObjectId.isValid(target.userId)) {
                  if (!meeting.bannedUserIds) meeting.bannedUserIds = [];
                  meeting.bannedUserIds.push(new mongoose.Types.ObjectId(target.userId));
                }
                if (target.fullName) {
                  if (!meeting.bannedGuestNames) meeting.bannedGuestNames = [];
                  meeting.bannedGuestNames.push(target.fullName);
                }
                await meeting.save();
              }
            }

            targetSocket?.emit('meeting:removed', {
              reason: data.reason || 'You were removed from the meeting by the host.',
              isBanned: data.blockRejoin ?? false
            });

            handleUserLeave(targetSocket || socket, data.meetingId, data.targetSocketId);
            break;

          case 'promoteCoHost':
            if (caller.role !== 'HOST') {
              socket.emit('meeting:error', { message: 'Only the meeting host can assign co-hosts.' });
              return;
            }
            target.role = 'CO_HOST';
            if (target.userId && mongoose.Types.ObjectId.isValid(target.userId)) {
              await MeetingModel.updateOne(
                { _id: new mongoose.Types.ObjectId(data.meetingId) },
                { $addToSet: { coHostIds: new mongoose.Types.ObjectId(target.userId) } }
              );
            }
            io.to(`meeting:${data.meetingId}`).emit('meeting:participant-updated', {
              socketId: data.targetSocketId,
              role: 'CO_HOST'
            });
            targetSocket?.emit('meeting:role-changed', { role: 'CO_HOST' });
            break;

          case 'demoteCoHost':
            if (caller.role !== 'HOST') {
              socket.emit('meeting:error', { message: 'Only the meeting host can revoke co-hosts.' });
              return;
            }
            target.role = 'ATTENDEE';
            if (target.userId && mongoose.Types.ObjectId.isValid(target.userId)) {
              await MeetingModel.updateOne(
                { _id: new mongoose.Types.ObjectId(data.meetingId) },
                { $pull: { coHostIds: new mongoose.Types.ObjectId(target.userId) } }
              );
            }
            io.to(`meeting:${data.meetingId}`).emit('meeting:participant-updated', {
              socketId: data.targetSocketId,
              role: 'ATTENDEE'
            });
            targetSocket?.emit('meeting:role-changed', { role: 'ATTENDEE' });
            break;
        }
      } catch (err) {
        console.error('Error during participant moderation:', err);
      }
    });

    /**
     * meeting:update-permissions - Update permissions matrix (chat, screen share, unmute, camera)
     */
    socket.on('meeting:update-permissions', async (data: {
      meetingId: string;
      permissions: {
        allowChat?: boolean;
        allowScreenShare?: boolean;
        allowUnmute?: boolean;
        allowCamera?: boolean;
        waitingRoom?: boolean;
      };
    }) => {
      try {
        const room = activeRooms.get(data.meetingId);
        const caller = room?.get(socket.id);

        if (!caller || (caller.role !== 'HOST' && caller.role !== 'CO_HOST')) {
          socket.emit('meeting:error', { message: 'Unauthorized: Host permissions required.' });
          return;
        }

        const query: Record<string, unknown> = {};
        if (mongoose.Types.ObjectId.isValid(data.meetingId)) {
          query._id = new mongoose.Types.ObjectId(data.meetingId);
        } else {
          query.meetingCode = data.meetingId;
        }

        const meeting = await MeetingModel.findOne(query);
        if (meeting) {
          if (!meeting.accessSettings) {
            meeting.accessSettings = {
              allowGuests: true,
              waitingRoom: false,
              defaultMute: false,
              allowScreenShare: true,
              allowChat: true,
              allowUnmute: true,
              allowCamera: true
            };
          }
          if (data.permissions.allowChat !== undefined) meeting.accessSettings.allowChat = data.permissions.allowChat;
          if (data.permissions.allowScreenShare !== undefined) meeting.accessSettings.allowScreenShare = data.permissions.allowScreenShare;
          if (data.permissions.allowUnmute !== undefined) meeting.accessSettings.allowUnmute = data.permissions.allowUnmute;
          if (data.permissions.allowCamera !== undefined) meeting.accessSettings.allowCamera = data.permissions.allowCamera;
          if (data.permissions.waitingRoom !== undefined) meeting.accessSettings.waitingRoom = data.permissions.waitingRoom;

          await meeting.save();

          io.to(`meeting:${data.meetingId}`).emit('meeting:permissions-updated', meeting.accessSettings);
        }
      } catch (err) {
        console.error('Error updating permissions:', err);
      }
    });

    /**
     * meeting:network-quality - Client reports network ping / quality status
     */
    socket.on('meeting:network-quality', (data: { meetingId: string; quality: 'good' | 'fair' | 'poor' }) => {
      const room = activeRooms.get(data.meetingId);
      const participant = room?.get(socket.id);
      if (participant && ['good', 'fair', 'poor'].includes(data.quality)) {
        participant.networkQuality = data.quality;
        socket.to(`meeting:${data.meetingId}`).emit('meeting:network-quality-updated', {
          socketId: socket.id,
          quality: data.quality
        });
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

      for (const [, room] of activeRooms.entries()) {
        if (room.has(socket.id)) {
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

        // Verify if unmute is forbidden
        if (data.isMuted === false && participant.isAudioBlocked) {
          socket.emit('meeting:error', { message: 'The host has disabled participant unmuting.' });
          return;
        }

        // Verify if camera is forbidden
        if (data.isCameraOff === false && participant.isVideoBlocked) {
          socket.emit('meeting:error', { message: 'The host has disabled your camera.' });
          return;
        }

        if (data.isMuted !== undefined) participant.isMuted = data.isMuted;
        if (data.isCameraOff !== undefined) participant.isCameraOff = data.isCameraOff;
        if (data.isHandRaised !== undefined) participant.isHandRaised = data.isHandRaised;

        socket.to(`meeting:${data.meetingId}`).emit('meeting:participant-updated', {
          socketId: socket.id,
          ...data
        });
      }
    });

    /**
     * meeting:screen-share - Start or stop screen sharing
     */
    socket.on('meeting:screen-share', async (data: {
      meetingId: string;
      isSharing: boolean;
    }) => {
      const room = activeRooms.get(data.meetingId);
      if (room && room.has(socket.id)) {
        const participant = room.get(socket.id)!;

        if (data.isSharing) {
          if (participant.isScreenShareBlocked) {
            socket.emit('meeting:error', { message: 'Screen sharing is restricted for your account.' });
            return;
          }

          // Check meeting settings
          const query: Record<string, unknown> = {};
          if (mongoose.Types.ObjectId.isValid(data.meetingId)) {
            query._id = new mongoose.Types.ObjectId(data.meetingId);
          } else {
            query.meetingCode = data.meetingId;
          }
          const meeting = await MeetingModel.findOne(query);
          if (meeting && meeting.accessSettings.allowScreenShare === false && participant.role === 'ATTENDEE') {
            socket.emit('meeting:error', { message: 'Screen sharing is currently disabled by the host.' });
            return;
          }
        }

        participant.isScreenSharing = data.isSharing;

        io.to(`meeting:${data.meetingId}`).emit('meeting:screen-share-changed', {
          socketId: socket.id,
          isSharing: data.isSharing,
          sharedBy: participant.fullName
        });
      }
    });

    /**
     * meeting:chat - In-meeting live chat message with permission check
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

      const participant = room.get(socket.id)!;

      // Check chat permission
      const query: Record<string, unknown> = {};
      if (mongoose.Types.ObjectId.isValid(data.meetingId)) {
        query._id = new mongoose.Types.ObjectId(data.meetingId);
      } else {
        query.meetingCode = data.meetingId;
      }
      const meeting = await MeetingModel.findOne(query);
      if (meeting && meeting.accessSettings?.allowChat === false && participant.role === 'ATTENDEE') {
        socket.emit('meeting:error', { message: 'Chat is currently disabled by the meeting host.' });
        return;
      }

      const cleanMessage = data.message.trim().slice(0, 1000);
      const senderName = participant.fullName || 'Attendee';
      const clientMessageId = (data as any).clientMessageId;

      const payload = {
        id: crypto.randomUUID(),
        meetingId: data.meetingId,
        senderId: user?.userId || 'guest',
        senderName,
        message: cleanMessage,
        clientMessageId,
        createdAt: new Date().toISOString()
      };

      if (user?.userId && data.workspaceId && mongoose.Types.ObjectId.isValid(data.workspaceId)) {
        ChatService.saveMessage({
          meetingId: data.meetingId,
          workspaceId: data.workspaceId,
          senderId: user.userId,
          senderName,
          message: cleanMessage,
          clientMessageId
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
     * meeting:end - Meeting Owner/Host ends meeting for everyone
     */
    socket.on('meeting:end', async (data: { meetingId: string }) => {
      try {
        const room = activeRooms.get(data.meetingId);
        const caller = room?.get(socket.id);

        if (!caller || caller.role !== 'HOST') {
          socket.emit('meeting:error', { message: 'Unauthorized: Only the meeting host can end the meeting for all participants.' });
          return;
        }

        const query: Record<string, unknown> = {};
        if (mongoose.Types.ObjectId.isValid(data.meetingId)) {
          query._id = new mongoose.Types.ObjectId(data.meetingId);
        } else {
          query.meetingCode = data.meetingId;
        }

        const meeting = await MeetingModel.findOne(query);
        if (meeting) {
          meeting.status = 'ENDED' as any;
          meeting.actualEndTime = new Date();
          await meeting.save();

          await MeetingParticipantModel.updateMany(
            { meetingId: meeting._id, leftAt: { $exists: false } },
            { leftAt: new Date() }
          );

          if (user?.userId) {
            await AuditService.log({
              userId: user.userId,
              workspaceId: meeting.workspaceId.toString(),
              action: AuditAction.MEETING_ENDED,
              entityType: 'Meeting',
              entityId: meeting._id.toString()
            });
          }
        }

        io.to(`meeting:${data.meetingId}`).emit('meeting:ended', {
          endedBy: caller.fullName,
          message: 'The meeting has been ended by the host.'
        });

        activeRooms.delete(data.meetingId);
        waitingRooms.delete(data.meetingId);
      } catch (err) {
        console.error('Error ending meeting via socket:', err);
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
      waitingRooms.forEach((waiting, meetingId) => {
        if (waiting.has(socket.id)) {
          waiting.delete(socket.id);
          const updatedWaiting = Array.from(waiting.values());
          io.to(`meeting:${meetingId}`).emit('meeting:waiting-room-updated', {
            waitingParticipants: updatedWaiting,
            count: updatedWaiting.length
          });
        }
      });
    });
  });

  function handleUserLeave(socket: Socket, meetingId: string, specificSocketId?: string) {
    const targetSocketId = specificSocketId || socket.id;
    const room = activeRooms.get(meetingId);
    if (!room) return;

    const participant = room.get(targetSocketId);
    if (participant) {
      room.delete(targetSocketId);
      socket.leave(`meeting:${meetingId}`);

      // Persist participant departure in database
      const query: Record<string, unknown> = {
        socketId: targetSocketId,
        leftAt: { $exists: false }
      };
      if (mongoose.Types.ObjectId.isValid(meetingId)) {
        query.meetingId = new mongoose.Types.ObjectId(meetingId);
      }
      MeetingParticipantModel.updateOne(query, { leftAt: new Date() })
        .catch(err => console.warn('Could not update participant leftAt in DB:', err));

      socket.to(`meeting:${meetingId}`).emit('meeting:participant-left', {
        socketId: targetSocketId,
        fullName: participant.fullName
      });

      console.log(`[Socket] "${participant.fullName}" left meeting ${meetingId}. Remaining: ${room.size}`);
    }

    if (room.size === 0) {
      activeRooms.delete(meetingId);
    }
  }
}
