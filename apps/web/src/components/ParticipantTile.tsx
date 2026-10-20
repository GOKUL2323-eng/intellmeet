import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Pin, PinOff, MonitorUp } from 'lucide-react';
import { IParticipantState } from '../stores/meetingStore';

interface Props {
  participant?: IParticipantState;
  isLocal?: boolean;
  localStream?: MediaStream | null;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isScreenSharing?: boolean;
  fullName?: string;
  isSpeaking?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const ParticipantTile: React.FC<Props> = ({
  participant,
  isLocal = false,
  localStream,
  isMuted: localMuted,
  isCameraOff: localCameraOff,
  isScreenSharing: localScreenSharing,
  fullName: localName,
  isSpeaking = false,
  isPinned = false,
  onTogglePin
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  const stream = isLocal ? localStream : participant?.stream;
  const isMuted = isLocal ? localMuted : participant?.isMuted;
  const isCameraOff = isLocal ? localCameraOff : participant?.isCameraOff;
  const isScreenSharing = isLocal ? localScreenSharing : participant?.isScreenSharing;
  const name = isLocal ? `${localName || 'You'} (You)` : participant?.fullName || 'Attendee';

  // Check if active video track exists in stream
  const hasLiveVideoTrack = Boolean(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live')
  );

  const shouldRenderVideo = !isCameraOff && hasLiveVideoTrack;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsVideoLoaded(true))
          .catch(() => {
            // Autoplay might be temporarily restricted on mobile prior to user interaction
            const unlockAutoplay = () => {
              if (videoEl) {
                videoEl.play().then(() => setIsVideoLoaded(true)).catch(() => {});
              }
              window.removeEventListener('click', unlockAutoplay);
              window.removeEventListener('touchstart', unlockAutoplay);
            };
            window.addEventListener('click', unlockAutoplay, { once: true });
            window.addEventListener('touchstart', unlockAutoplay, { once: true });
          });
      }
    } else {
      setIsVideoLoaded(false);
    }
  }, [stream, shouldRenderVideo]);

  return (
    <div
      className={`relative w-full h-full min-h-0 min-w-0 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900/90 border transition-all duration-300 flex items-center justify-center group shadow-md ${
        isSpeaking
          ? 'border-violet-500 shadow-lg shadow-violet-500/25 ring-2 ring-violet-500/40'
          : 'border-white/10 hover:border-white/20'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video element to prevent audio loopback
        onLoadedData={() => setIsVideoLoaded(true)}
        onPlaying={() => setIsVideoLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          shouldRenderVideo && isVideoLoaded ? 'opacity-100' : 'opacity-0 absolute'
        } ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`}
      />

      {/* Avatar Fallback when Camera is Off or Connecting */}
      {(!shouldRenderVideo || !isVideoLoaded) && (
        <div className="flex flex-col items-center justify-center p-4 text-center z-10 select-none animate-fadeIn">
          <div
            className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-xl sm:text-3xl text-white shadow-xl shadow-violet-600/30 transition-transform ${
              isSpeaking ? 'scale-110 ring-4 ring-violet-400/50 animate-pulse' : ''
            }`}
          >
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="mt-3 text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[180px]">
            {name}
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            {isCameraOff ? 'Camera turned off' : !hasLiveVideoTrack ? 'Connecting video...' : ''}
          </span>
        </div>
      )}

      {/* Top Floating Overlay (Pin Button) */}
      {onTogglePin && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={onTogglePin}
            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition border border-white/10 shadow"
            title={isPinned ? 'Unpin tile' : 'Pin to main stage'}
          >
            {isPinned ? <PinOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" /> : <Pin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      )}

      {/* Bottom Name & Status Tag */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[11px] sm:text-xs font-medium border border-white/10 max-w-[85%] truncate shadow-sm">
          {isScreenSharing && (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold shrink-0">
              <MonitorUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Presenting</span>
            </span>
          )}
          <span className="truncate">{name}</span>
        </div>

        {isMuted && (
          <div className="p-1 sm:p-1.5 rounded-lg bg-rose-600/90 backdrop-blur-md text-white border border-rose-500/40 shadow-sm shrink-0">
            <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
};
