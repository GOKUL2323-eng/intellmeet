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
  preferredName?: string
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
    isMuted,
    isCameraOff,
    isScreenSharing
  } = useMeetingStore();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const candidateQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
    const userName = user?.fullName || 'You';

    const draw = () => {
      frame++;
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 640, 360);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 360);

      // Animated glowing orb
      const cx = 320 + Math.sin(frame * 0.05) * 40;
      const cy = 160 + Math.cos(frame * 0.05) * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.fillStyle = '#8b5cf6';
      ctx.fill();

      // Avatar circle
      ctx.beginPath();
      ctx.arc(320, 160, 50, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();

      // Initial letter
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(userName.charAt(0).toUpperCase(), 320, 160);

      // Name banner
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(userName, 320, 240);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Virtual Video Feed', 320, 260);

      requestAnimationFrame(draw);
    };
    draw();

    // Canvas video track
    const canvasStream = canvas.captureStream(30);

    // Synthetic silent audio track via Web Audio
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001; // virtually silent
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
  }, [user]);

  /**
   * Acquire local camera & microphone streams
   */
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
          console.warn('Physical camera/mic with ideal constraints unavailable. Trying fallback:', mediaErr);
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          } catch (basicErr) {
            console.warn('Physical camera/mic unavailable. Using synthetic feed:', basicErr);
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

      // Setup audio visualizer for active speaking detection
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
      // AudioContext may be restricted by browser policy before user interaction
    }
  };

  /**
   * Helper to drain and apply any queued ICE candidates for a peer
   */
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

  /**
   * Create RTCPeerConnection for a remote peer socket
   */
  const createPeerConnection = useCallback((peerSocketId: string, isInitiator: boolean) => {
    // Return existing if already open
    const existingPc = peerConnectionsRef.current.get(peerSocketId);
    if (existingPc && existingPc.signalingState !== 'closed') {
      return existingPc;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(peerSocketId, pc);

    // Add local tracks to peer connection
    const currentStream = screenStreamRef.current || localStreamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach(track => {
        pc.addTrack(track, currentStream);
      });
    }

    // Send ICE candidates to remote peer via Socket.io
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('meeting:signal', {
          toSocketId: peerSocketId,
          signal: event.candidate
        });
      }
    };

    // Connection state monitor & auto-recovery
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state (${peerSocketId}):`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        try {
          pc.restartIce();
        } catch {
          // Restart ICE if supported
        }
      }
    };

    // When remote track arrives, aggregate into a persistent MediaStream
    pc.ontrack = (event) => {
      let stream = remoteStreamsRef.current.get(peerSocketId);
      if (!stream) {
        stream = new MediaStream();
        remoteStreamsRef.current.set(peerSocketId, stream);
      }

      if (event.streams && event.streams[0]) {
        event.streams[0].getTracks().forEach(track => {
          if (!stream!.getTracks().some(t => t.id === track.id)) {
            stream!.addTrack(track);
          }
        });
      } else if (event.track) {
        if (!stream.getTracks().some(t => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
      }

      updateParticipant(peerSocketId, { stream });
    };

    // If initiator, generate SDP offer
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
  }, [updateParticipant]);

  // Connect to Socket.io & join room
  useEffect(() => {
    let streamInstance: MediaStream;

    const init = async () => {
      streamInstance = await startMedia();

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

      // Existing participants in the room
      socket.on('meeting:room-state', (data: { participants: any[]; you: any }) => {
        setParticipants(data.participants);
        // Connect to each existing participant as the initiator
        data.participants.forEach(p => {
          createPeerConnection(p.socketId, true);
        });
      });

      // New peer joined
      socket.on('meeting:participant-joined', (participant: any) => {
        addParticipant(participant);
        createPeerConnection(participant.socketId, false);
      });

      // WebRTC Signal (Offer, Answer, or Candidate) with Candidate Queuing
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
              // Buffer candidate until remote description is settled
              const queue = candidateQueuesRef.current.get(data.fromSocketId) || [];
              queue.push(data.signal);
              candidateQueuesRef.current.set(data.fromSocketId, queue);
            }
          }
        } catch (signalErr) {
          console.error('Error handling WebRTC signal:', signalErr);
        }
      });

      // Participant state updates (mute, camera, hand raise)
      socket.on('meeting:participant-updated', (data: any) => {
        updateParticipant(data.socketId, data);
      });

      // Participant left
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

      // Chat broadcast
      socket.on('meeting:chat', (msg: any) => {
        addChatMessage(msg);
      });
    };

    init();

    return () => {
      // Cleanup all connections on unmount
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
  }, [meetingId, user, initialMuted, initialCameraOff, preferredName, startMedia, createPeerConnection, drainCandidateQueue, setParticipants, addParticipant, updateParticipant, removeParticipant, addChatMessage]);

  // Toggle microphone
  const toggleAudio = useCallback(() => {
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
  }, [isMuted, meetingId, setMuted]);

  // Toggle camera
  const toggleVideo = useCallback(() => {
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
  }, [isCameraOff, meetingId, setCameraOff]);

  // Screen share toggle
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      setScreenStream(null);
      setScreenSharing(false);

      // Re-replace track with local camera track
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        peerConnectionsRef.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
      }

      socketRef.current?.emit('meeting:screen-share', { meetingId, isSharing: false });
    } else {
      // Start screen share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        // Replace outgoing track for all connected peers
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

  // Send in-meeting chat message
  const sendMeetingChat = useCallback((message: string) => {
    if (!message.trim() || !socketRef.current) return;
    socketRef.current.emit('meeting:chat', {
      meetingId,
      message: message.trim()
    });
  }, [meetingId]);

  return {
    localStream,
    screenStream,
    socketConnected,
    permissionError,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendMeetingChat,
    isMuted,
    isCameraOff,
    isScreenSharing
  };
}
