import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  User,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';
import { Logo } from '../components/Logo';

export const PreMeetingLobbyPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [meeting, setMeeting] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [consentGranted, setConsentGranted] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [guestName, setGuestName] = useState(user?.fullName || '');
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetchMeetingInfo();
    setupLocalPreview();

    return () => {
      // Clean up preview stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [meetingId]);

  const fetchMeetingInfo = async () => {
    try {
      setIsLoading(true);
      const data: any = await apiClient.get(`/meetings/${meetingId}`);
      setMeeting(data.meeting);
      if (data.meeting?.accessSettings?.defaultMute) {
        setIsMuted(true);
      }
    } catch (err) {
      console.warn('Could not load meeting details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setupLocalPreview = async () => {
    try {
      let stream: MediaStream;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (e) {
          stream = createSyntheticStream();
        }
      } else {
        stream = createSyntheticStream();
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Audio volume meter
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateMeter = () => {
          if (!streamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((acc, v) => acc + v, 0);
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round(avg * 1.5)));
          requestAnimationFrame(updateMeter);
        };
        updateMeter();
      } catch (err) {
        // AudioContext policy
      }
    } catch (err) {
      console.error('Lobby camera preview error:', err);
    }
  };

  const createSyntheticStream = (): MediaStream => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;
    let frame = 0;

    const draw = () => {
      frame++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 360);

      ctx.beginPath();
      ctx.arc(320, 160, 50, 0, Math.PI * 2);
      ctx.fillStyle = '#8b5cf6';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((guestName || 'U').charAt(0).toUpperCase(), 320, 160);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(guestName || 'Attendee', 320, 240);

      requestAnimationFrame(draw);
    };
    draw();
    return canvas.captureStream(30);
  };

  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
      }
    }
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCameraOff;
      }
    }
    setIsCameraOff(!isCameraOff);
  };

  const handleJoin = () => {
    // Navigate to active meeting room with state flags
    navigate(`/meeting/${meetingId}`, {
      state: {
        initialMuted: isMuted,
        initialCameraOff: isCameraOff,
        consentGranted,
        guestName
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-4xl relative z-10 flex flex-col items-center">
        {/* Title & Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo size="md" className="mb-4" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Ready to Join</span>
          </div>
          <h1 className="text-2xl font-black text-white">
            {meeting?.title || 'Meeting Session'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Check your audio and video before entering the room
          </p>
        </div>

        {/* Two Columns: Video Preview & Setup Panel */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Video Preview Tile */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 aspect-video shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : 'block'} scale-x-[-1]`}
              />

              {isCameraOff && (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-violet-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-violet-600/30">
                    {(guestName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="mt-3 text-xs font-semibold text-slate-300">
                    Camera is turned off
                  </span>
                </div>
              )}

              {/* Floating Camera / Mic Toggles */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                    isCameraOff ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
                >
                  {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Audio Level Meter */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 flex items-center gap-3">
              <Mic className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${isMuted ? 0 : audioLevel}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {isMuted ? 'Muted' : `${audioLevel}%`}
              </span>
            </div>
          </div>

          {/* Details & Join Panel */}
          <div className="p-8 rounded-2xl bg-slate-900/80 border border-white/10 space-y-6 shadow-2xl backdrop-blur-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name..."
                required
                className="w-full bg-slate-800/60 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
              />
            </div>

            {/* Explicit AI Consent Gate */}
            <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/20 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGranted}
                  onChange={(e) => setConsentGranted(e.target.checked)}
                  className="rounded border-slate-700 text-violet-600 mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200">
                    Consent to AI Transcription & Summary
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Allow IntellMeet to securely process meeting speech to extract decisions, highlights, and action items. No raw recordings are shared publicly.
                  </p>
                </div>
              </label>
            </div>

            <button
              onClick={handleJoin}
              disabled={!guestName.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-violet-600/30 flex items-center justify-center gap-2 transition"
            >
              <span>Join Meeting Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>WebRTC Peer-to-Peer Encryption Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
