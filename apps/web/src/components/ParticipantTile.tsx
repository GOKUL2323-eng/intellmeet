import React, { useEffect, useRef } from 'react';
import { MicOff, Pin, PinOff, MonitorUp, User } from 'lucide-react';
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

  const stream = isLocal ? localStream : participant?.stream;
  const isMuted = isLocal ? localMuted : participant?.isMuted;
  const isCameraOff = isLocal ? localCameraOff : participant?.isCameraOff;
  const isScreenSharing = isLocal ? localScreenSharing : participant?.isScreenSharing;
  const name = isLocal ? `${localName || 'You'} (You)` : participant?.fullName || 'Attendee';

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-300 flex items-center justify-center group ${
        isSpeaking
          ? 'border-violet-500 shadow-lg shadow-violet-500/20 ring-2 ring-violet-500/40'
          : 'border-white/10 hover:border-white/20'
      } ${isPinned ? 'h-full w-full' : 'aspect-video'}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Always mute local video element to prevent audio feedback loop
        className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : 'block'} ${
          isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''
        }`}
      />

      {/* Avatar Fallback when Camera is Off */}
      {isCameraOff && (
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-xl shadow-violet-600/30">
            {name.charAt(0).toUpperCase()}
          </div>
          <span className="mt-3 text-sm font-semibold text-slate-300">{name}</span>
          <span className="text-[11px] text-slate-500">Camera turned off</span>
        </div>
      )}

      {/* Top Controls Overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onTogglePin && (
          <button
            onClick={onTogglePin}
            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition"
            title={isPinned ? 'Unpin tile' : 'Pin to main stage'}
          >
            {isPinned ? <PinOff className="w-4 h-4 text-violet-400" /> : <Pin className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Bottom Name & Status Tag */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-medium border border-white/10">
          {isScreenSharing && (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <MonitorUp className="w-3.5 h-3.5" />
              <span>Presenting</span>
            </span>
          )}
          <span className="truncate max-w-[140px]">{name}</span>
        </div>

        {isMuted && (
          <div className="p-1.5 rounded-lg bg-rose-600/80 backdrop-blur-md text-white border border-rose-500/30 shadow-md">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
    </div>
  );
};
