import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMeetingStore } from '../stores/meetingStore';
import { useAuthStore } from '../stores/authStore';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  iceCandidatePoolSize: 10
};

export function useWebRTC(
  meetingId: string,
  initialMuted = false,
  initialCameraOff = false,
  preferredName?: string,
  onMeetingEnded?: (message?: string) => void,
  onParticipantRemoved?: (reason?: string) => void
) {
  const { user } = useAuthStore();
  const {
    setParticipants,
    addParticipant,
    updateParticipant,
    removeParticipant,
    addChatMessage,
    setMuted,
    setCameraOff,
    setScreenSharing,
    setActiveSpeaker,
    setIsHost,
    setIsCoHost,
    setIsMeetingLocked,
    setAccessSettings,
    setWaitingRoom,
    setWaitingParticipants,
    setIsAudioBlocked,
    setIsVideoBlocked,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isAudioBlocked,
    isVideoBlocked,
    isAudioOnlyMode
  } = useMeetingStore();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const candidateQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  /**
   * Generates a realistic synthetic camera stream using HTML5 Canvas
   * Guarantees video preview always works even when physical cameras are disabled or absent!
   */
  const createSyntheticMediaStream = useCallback((): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    let frame = 0;
    const userName = preferredName || user?.fullName || 'Attendee';

    const draw = () => {
      frame++;
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      const cx = 320 + Math.sin(frame * 0.05) * 40;
      const cy = 160 + Math.cos(frame * 0.05) * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.fillStyle = '#8b5cf6';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(320, 160, 50, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(userName.charAt(0).toUpperCase(), 320, 160);

      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(userName, 320, 240);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Virtual Video Feed', 320, 260);

      requestAnimationFrame(draw);
    };
    draw();

    const canvasStream = canvas.captureStream(30);

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      const audioTrack = dst.stream.getAudioTracks()[0];
      if (audioTrack) {
        canvasStream.addTrack(audioTrack);
      }
    } catch (e) {
      // Audio fallback omitted if audio context blocked
    }

    return canvasStream;
  }, [user, preferredName]);

  /**
   * Acquire local camera & microphone streams
   */
  const startMedia = useCallback(async () => {
    try {
      let stream: MediaStream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: 'user'
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch (mediaErr) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch (basicErr) {
            stream = createSyntheticMediaStream();
          }
        }
      } else {
        stream = createSyntheticMediaStream();
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Apply initial mute/camera states
      stream.getAudioTracks().forEach(track => (track.enabled = !initialMuted));
      stream.getVideoTracks().forEach(track => (track.enabled = !initialCameraOff));

      setMuted(initialMuted);
      setCameraOff(initialCameraOff);

      setupAudioDetection(stream);

      return stream;
    } catch (err: any) {
      setPermissionError(err.message || 'Could not access camera/microphone');
      const fallback = createSyntheticMediaStream();
      localStreamRef.current = fallback;
      setLocalStream(fallback);
      return fallback;
    }
  }, [initialMuted, initialCameraOff, createSyntheticMediaStream, setMuted, setCameraOff]);

  const setupAudioDetection = (stream: MediaStream) => {
    try {
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) return;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      let speakingFrames = 0;

      const checkVolume = () => {
        if (!audioTrack.enabled) {
          requestAnimationFrame(checkVolume);
          return;
        }

        analyser.getByteFrequencyData(buffer);
        const sum = buffer.reduce((a, b) => a + b, 0);
        const average = sum / buffer.length;

        if (average > 25) {
          speakingFrames++;
          if (speakingFrames > 5 && socketRef.current?.id) {
            setActiveSpeaker(socketRef.current.id);
          }
        } else {
          speakingFrames = 0;
        }

        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch (err) {
      // AudioContext policy
    }
  };

  const drainCandidateQueue = useCallback(async (peerSocketId: string, pc: RTCPeerConnection) => {
    const queue = candidateQueuesRef.current.get(peerSocketId) || [];
    candidateQueuesRef.current.delete(peerSocketId);
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn(`[WebRTC] Error adding queued ICE candidate for ${peerSocketId}:`, err);
      }
    }
  }, []);

  const createPeerConnection = useCallback((peerSocketId: string, isInitiator: boolean) => {
    const existingPc = peerConnectionsRef.current.get(peerSocketId);
    if (existingPc && existingPc.signalingState !== 'closed') {
      return existingPc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerSocketId, pc);

    const currentStream = screenStreamRef.current || localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        pc.addTrack(track, currentStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('meeting:signal', {
          toSocketId: peerSocketId,
          signal: event.candidate
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {
          // Restart ICE
        }
      }
    };

    pc.ontrack = (event) => {
      let stream = remoteStreamsRef.current.get(peerSocketId);
      if (!stream) {
        stream = new MediaStream();
        remoteStreamsRef.current.set(peerSocketId, stream);
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          if (!stream!.getTracks().some(t => t.id === track.id)) {
            // Respect low-bandwidth / audio-only mode
            if (track.kind === 'video' && isAudioOnlyMode) {
              track.enabled = false;
            }
            stream!.addTrack(track);
          }
        });
      } else if (event.track) {
        if (!stream.getTracks().some(t => t.id === event.track.id)) {
          if (event.track.kind === 'video' && isAudioOnlyMode) {
            event.track.enabled = false;
          }
          stream.addTrack(event.track);
        }
      }

      updateParticipant(peerSocketId, { stream });
    };

    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          if (socketRef.current && pc.localDescription) {
            socketRef.current.emit('meeting:signal', {
              toSocketId: peerSocketId,
              signal: pc.localDescription
            });
          }
        })
        .catch(err => console.error('Error creating offer:', err));
    }

    return pc;
  }, [updateParticipant, isAudioOnlyMode]);

  // Connect to Socket.io & join room
  useEffect(() => {
    let active = true;

    const init = async () => {
      await startMedia();
      if (!active) return;

      const rawSocketTarget = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
      const socketTarget = rawSocketTarget
        ? (rawSocketTarget.startsWith('http://') || rawSocketTarget.startsWith('https://')
            ? rawSocketTarget
            : (rawSocketTarget.startsWith('localhost') || rawSocketTarget.startsWith('127.0.0.1')
                ? `http://${rawSocketTarget}`
                : `https://${rawSocketTarget}`))
        : '';
      const socket = socketTarget
        ? io(socketTarget, {
            auth: { token: localStorage.getItem('intellmeet_token') },
            transports: ['websocket', 'polling']
          })
        : io({
            auth: { token: localStorage.getItem('intellmeet_token') },
            transports: ['websocket', 'polling']
          });
      socketRef.current = socket;

      socket.on('connect', () => {
        setSocketConnected(true);
        socket.emit('meeting:join', {
          meetingId,
          fullName: preferredName || user?.fullName || 'Attendee',
          isMuted: initialMuted,
          isCameraOff: initialCameraOff
        });
      });

      // Waiting room event
      socket.on('meeting:waiting-room', (data: { message: string }) => {
        setWaitingRoom(true, data.message);
      });

      socket.on('meeting:waiting-room-updated', (data: { waitingParticipants: any[]; count: number }) => {
        setWaitingParticipants(data.waitingParticipants || []);
      });

      // Admitted from waiting room
      socket.on('meeting:admitted', (data: { participants: any[]; you: any }) => {
        setWaitingRoom(false);
        showToast('You have been admitted to the meeting!');
        setParticipants(data.participants);
        data.participants.forEach(p => {
          createPeerConnection(p.socketId, true);
        });
      });

      // Rejected from waiting room
      socket.on('meeting:rejected', (data: { message: string }) => {
        setWaitingRoom(false);
        alert(data.message || 'The host has denied admission to this meeting.');
        if (onParticipantRemoved) {
          onParticipantRemoved(data.message);
        }
      });

      // Existing participants in the room
      socket.on('meeting:room-state', (data: {
        participants: any[];
        you: any;
        isLocked?: boolean;
        accessSettings?: any;
        waitingParticipants?: any[];
      }) => {
        setWaitingRoom(false);
        setParticipants(data.participants);

        if (data.you?.role === 'HOST') {
          setIsHost(true);
          setIsCoHost(false);
        } else if (data.you?.role === 'CO_HOST') {
          setIsCoHost(true);
          setIsHost(false);
        }

        if (data.isLocked !== undefined) setIsMeetingLocked(data.isLocked);
        if (data.accessSettings) setAccessSettings(data.accessSettings);
        if (data.waitingParticipants) setWaitingParticipants(data.waitingParticipants);

        data.participants.forEach(p => {
          createPeerConnection(p.socketId, true);
        });
      });

      socket.on('meeting:participant-joined', (participant: any) => {
        addParticipant(participant);
        createPeerConnection(participant.socketId, false);
      });

      socket.on('meeting:signal', async (data: { fromSocketId: string; signal: any }) => {
        let pc = peerConnectionsRef.current.get(data.fromSocketId);
        if (!pc) {
          pc = createPeerConnection(data.fromSocketId, false);
        }

        try {
          if (data.signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            await drainCandidateQueue(data.fromSocketId, pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('meeting:signal', {
              toSocketId: data.fromSocketId,
              signal: pc.localDescription
            });
          } else if (data.signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data.signal));
            await drainCandidateQueue(data.fromSocketId, pc);
          } else if (data.signal.candidate) {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(data.signal)).catch(err => {
                console.warn('[WebRTC] Error adding ICE candidate:', err);
              });
            } else {
              const queue = candidateQueuesRef.current.get(data.fromSocketId) || [];
              queue.push(data.signal);
              candidateQueuesRef.current.set(data.fromSocketId, queue);
            }
          }
        } catch (signalErr) {
          console.error('Error handling WebRTC signal:', signalErr);
        }
      });

      socket.on('meeting:participant-updated', (data: any) => {
        updateParticipant(data.socketId, data);
      });

      socket.on('meeting:participant-left', (data: { socketId: string }) => {
        removeParticipant(data.socketId);
        candidateQueuesRef.current.delete(data.socketId);
        remoteStreamsRef.current.delete(data.socketId);
        const pc = peerConnectionsRef.current.get(data.socketId);
        if (pc) {
          pc.close();
          peerConnectionsRef.current.delete(data.socketId);
        }
      });

      socket.on('meeting:chat', (msg: any) => {
        addChatMessage(msg);
      });

      // Host Moderation Events
      socket.on('meeting:lock-toggled', (data: { isLocked: boolean; lockedBy: string }) => {
        setIsMeetingLocked(data.isLocked);
        showToast(data.isLocked ? 'The host has locked the meeting.' : 'The meeting has been unlocked.');
      });

      socket.on('meeting:all-muted', (data: { allowUnmute: boolean; mutedBy: string }) => {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
        }
        setMuted(true);
        if (!data.allowUnmute) {
          setIsAudioBlocked(true);
        }
        showToast(
          data.allowUnmute
            ? 'The host has muted all participants.'
            : 'The host has muted all participants and disabled unmuting.'
        );
      });

      socket.on('meeting:force-mute', (data: { message?: string }) => {
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = false));
        }
        setMuted(true);
        showToast(data.message || 'You have been muted by the host.');
      });

      socket.on('meeting:force-stop-video', (data: { message?: string }) => {
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => (t.enabled = false));
        }
        setCameraOff(true);
        setIsVideoBlocked(true);
        showToast(data.message || 'Your camera was turned off by the host.');
      });

      socket.on('meeting:force-stop-screen', (data: { message?: string }) => {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
        }
        setScreenStream(null);
        setScreenSharing(false);
        showToast(data.message || 'Your screen sharing was stopped by the host.');
      });

      socket.on('meeting:removed', (data: { reason?: string; isBanned?: boolean }) => {
        alert(data.reason || 'You have been removed from the meeting by the host.');
        if (onParticipantRemoved) {
          onParticipantRemoved(data.reason);
        }
      });

      socket.on('meeting:role-changed', (data: { role: string }) => {
        if (data.role === 'CO_HOST') {
          setIsCoHost(true);
          showToast('You have been granted Co-Host privileges.');
        } else {
          setIsCoHost(false);
          showToast('Your Co-Host privileges have been revoked.');
        }
      });

      socket.on('meeting:permissions-updated', (permissions: any) => {
        setAccessSettings(permissions);
        showToast('Meeting permissions updated by host.');
      });

      socket.on('meeting:network-quality-updated', (data: { socketId: string; quality: 'good' | 'fair' | 'poor' }) => {
        updateParticipant(data.socketId, { networkQuality: data.quality });
      });

      socket.on('meeting:ended', (data: { message?: string }) => {
        if (onMeetingEnded) {
          onMeetingEnded(data.message || 'The host has ended this meeting for everyone.');
        } else {
          alert(data.message || 'The meeting has been ended by the host.');
          window.location.href = '/dashboard';
        }
      });

      socket.on('meeting:error', (err: { message: string; code?: string }) => {
        showToast(`Notice: ${err.message}`);
      });
    };

    init();

    // Network connection quality monitor
    const qualityInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.connected) {
        const start = Date.now();
        socketRef.current.emit('meeting:ping', () => {
          const latency = Date.now() - start;
          const quality = latency < 150 ? 'good' : latency < 400 ? 'fair' : 'poor';
          setNetworkQuality(quality);
          socketRef.current?.emit('meeting:network-quality', { meetingId, quality });
        });
      }
    }, 15000);

    return () => {
      active = false;
      clearInterval(qualityInterval);

      if (socketRef.current) {
        socketRef.current.emit('meeting:leave', { meetingId });
        socketRef.current.disconnect();
      }

      peerConnectionsRef.current.forEach(pc => pc.close());
      peerConnectionsRef.current.clear();

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [meetingId, user, initialMuted, initialCameraOff, preferredName, startMedia, createPeerConnection, drainCandidateQueue, setParticipants, addParticipant, updateParticipant, removeParticipant, addChatMessage, setIsHost, setIsCoHost, setIsMeetingLocked, setAccessSettings, setWaitingRoom, setWaitingParticipants, setIsAudioBlocked, setIsVideoBlocked, showToast, onMeetingEnded, onParticipantRemoved]);

  // Toggle microphone
  const toggleAudio = useCallback(() => {
    if (isAudioBlocked) {
      showToast('Unmuting is disabled by the meeting host.');
      return;
    }

    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextState = !isMuted;
      audioTracks.forEach(track => (track.enabled = !nextState));
      setMuted(nextState);

      socketRef.current?.emit('meeting:state-updated', {
        meetingId,
        isMuted: nextState
      });
    }
  }, [isMuted, isAudioBlocked, meetingId, setMuted, showToast]);

  // Toggle camera
  const toggleVideo = useCallback(() => {
    if (isVideoBlocked) {
      showToast('Camera is disabled by the meeting host.');
      return;
    }

    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const nextState = !isCameraOff;
      videoTracks.forEach(track => (track.enabled = !nextState));
      setCameraOff(nextState);

      socketRef.current?.emit('meeting:state-updated', {
        meetingId,
        isCameraOff: nextState
      });
    }
  }, [isCameraOff, isVideoBlocked, meetingId, setCameraOff, showToast]);

  // Screen share toggle
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setScreenStream(null);
      setScreenSharing(false);

      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
      }

      socketRef.current?.emit('meeting:screen-share', { meetingId, isSharing: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        socketRef.current?.emit('meeting:screen-share', { meetingId, isSharing: true });
      } catch (err) {
        console.warn('Screen share canceled or denied:', err);
      }
    }
  }, [isScreenSharing, meetingId, setScreenSharing]);

  const sendMeetingChat = useCallback((message: string) => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit('meeting:chat', {
      meetingId,
      message: message.trim()
    });
  }, [meetingId]);

  // Host Control actions
  const admitParticipant = useCallback((socketId: string) => {
    socketRef.current?.emit('meeting:admit-participant', { meetingId, socketId });
  }, [meetingId]);

  const rejectParticipant = useCallback((socketId: string, reason?: string) => {
    socketRef.current?.emit('meeting:reject-participant', { meetingId, socketId, reason });
  }, [meetingId]);

  const toggleMeetingLock = useCallback((isLocked: boolean) => {
    socketRef.current?.emit('meeting:lock', { meetingId, isLocked });
  }, [meetingId]);

  const muteAllParticipants = useCallback((allowUnmute = true) => {
    socketRef.current?.emit('meeting:mute-all', { meetingId, allowUnmute });
  }, [meetingId]);

  const moderateParticipant = useCallback((
    targetSocketId: string,
    action: 'mute' | 'stopVideo' | 'stopScreenShare' | 'lowerHand' | 'remove' | 'promoteCoHost' | 'demoteCoHost',
    blockRejoin = false,
    reason?: string
  ) => {
    socketRef.current?.emit('meeting:moderate-participant', {
      meetingId,
      targetSocketId,
      action,
      blockRejoin,
      reason
    });
  }, [meetingId]);

  const updateMeetingPermissions = useCallback((permissions: {
    allowChat?: boolean;
    allowScreenShare?: boolean;
    allowUnmute?: boolean;
    allowCamera?: boolean;
    waitingRoom?: boolean;
  }) => {
    socketRef.current?.emit('meeting:update-permissions', {
      meetingId,
      permissions
    });
  }, [meetingId]);

  const endMeetingForEveryone = useCallback(() => {
    socketRef.current?.emit('meeting:end', { meetingId });
  }, [meetingId]);

  return {
    localStream,
    screenStream,
    socketConnected,
    permissionError,
    networkQuality,
    toastMessage,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendMeetingChat,
    admitParticipant,
    rejectParticipant,
    toggleMeetingLock,
    muteAllParticipants,
    moderateParticipant,
    updateMeetingPermissions,
    endMeetingForEveryone,
    isMuted,
    isCameraOff,
    isScreenSharing
  };
}
