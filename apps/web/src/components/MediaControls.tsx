import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Users,
  FileText,
  PhoneOff,
  Hand,
  Sparkles,
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useMeetingStore } from '../stores/meetingStore';

interface Props {
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
  onEndMeetingForEveryone?: () => void;
  onTriggerAISummary?: () => void;
  onSwitchCamera?: (deviceId: string) => void;
  availableCameras?: MediaDeviceInfo[];
  currentCameraId?: string | null;
  isHost?: boolean;
  isCoHost?: boolean;
}

export const MediaControls: React.FC<Props> = ({
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  onEndMeetingForEveryone,
  onTriggerAISummary,
  onSwitchCamera,
  availableCameras,
  currentCameraId,
  isHost = false,
  isCoHost = false
}) => {
  const {
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    setHandRaised,
    isChatOpen,
    isParticipantsOpen,
    isNotesOpen,
    isHostControlOpen,
    toggleChat,
    toggleParticipants,
    toggleNotes,
    toggleHostControl,
    participants,
    chatMessages,
    waitingParticipants,
    isAudioBlocked,
    isVideoBlocked,
    accessSettings,
    isAudioOnlyMode,
    setIsAudioOnlyMode
  } = useMeetingStore();

  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);

  const canModerate = isHost || isCoHost;
  const isScreenShareDisabled = !canModerate && accessSettings?.allowScreenShare === false;

  return (
    <>
      <footer className="h-16 sm:h-20 bg-slate-950/95 border-t border-white/10 px-1.5 sm:px-6 flex items-center justify-between z-40 backdrop-blur-xl shrink-0 w-full select-none overflow-x-auto no-scrollbar pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]">
        {/* Left Section: Live Status & Bandwidth Mode */}
        <div className="hidden md:flex items-center gap-2.5 min-w-[160px]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-100">Live</span>
            <span className="text-slate-500">•</span>
            <span>{participants.size + 1} online</span>
          </div>

          {/* Low Bandwidth Mode Toggle */}
          <button
            onClick={() => setIsAudioOnlyMode(!isAudioOnlyMode)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
              isAudioOnlyMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-slate-200'
            }`}
            title={isAudioOnlyMode ? 'Disable Low-Bandwidth Mode' : 'Enable Low-Bandwidth Mode (Audio Priority)'}
          >
            {isAudioOnlyMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden xl:inline">
              {isAudioOnlyMode ? 'Low Bandwidth' : 'Standard'}
            </span>
          </button>
        </div>

        {/* Center Section: Core Audio/Video/Call Controls */}
        <div className="flex items-center justify-center gap-1 sm:gap-2.5 flex-1 md:flex-initial shrink-0">
          {/* Microphone Toggle */}
          <button
            onClick={onToggleAudio}
            disabled={isAudioBlocked}
            className={`w-9.5 h-9.5 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition shadow-lg shrink-0 ${
              isAudioBlocked
                ? 'bg-slate-800 text-slate-500 border border-white/5 opacity-50 cursor-not-allowed'
                : isMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={
              isAudioBlocked
                ? 'The host has disabled participant unmuting'
                : isMuted
                ? 'Unmute microphone'
                : 'Mute microphone'
            }
            aria-label="Microphone Toggle"
          >
            {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Camera Toggle */}
          <button
            onClick={onToggleVideo}
            disabled={isVideoBlocked}
            className={`w-9.5 h-9.5 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition shadow-lg shrink-0 ${
              isVideoBlocked
                ? 'bg-slate-800 text-slate-500 border border-white/5 opacity-50 cursor-not-allowed'
                : isCameraOff
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={
              isVideoBlocked
                ? 'The host has disabled your camera'
                : isCameraOff
                ? 'Turn on camera'
                : 'Turn off camera'
            }
            aria-label="Camera Toggle"
          >
            {isCameraOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Switch Camera Button (Visible when multi-camera detected) */}
          {availableCameras && availableCameras.length > 1 && !isCameraOff && (
            <button
              onClick={() => {
                const currentIndex = availableCameras.findIndex(c => c.deviceId === currentCameraId);
                const nextDevice = availableCameras[(currentIndex + 1) % availableCameras.length];
                if (nextDevice && onSwitchCamera) {
                  onSwitchCamera(nextDevice.deviceId);
                }
              }}
              className="w-8 h-8 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition shadow shrink-0"
              title="Switch camera device"
              aria-label="Switch Camera"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Screen Share Toggle */}
          <button
            onClick={onToggleScreenShare}
            disabled={isScreenShareDisabled}
            className={`hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-xl items-center justify-center transition shadow-lg shrink-0 ${
              isScreenShareDisabled
                ? 'bg-slate-800 text-slate-500 border border-white/5 opacity-50 cursor-not-allowed'
                : isScreenSharing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={
              isScreenShareDisabled
                ? 'Screen sharing disabled by host'
                : isScreenSharing
                ? 'Stop sharing screen'
                : 'Share screen'
            }
            aria-label="Screen Share Toggle"
          >
            <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Raise Hand Toggle */}
          <button
            onClick={() => setHandRaised(!isHandRaised)}
            className={`w-9.5 h-9.5 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition shadow-lg shrink-0 ${
              isHandRaised
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 ring-2 ring-amber-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            aria-label="Raise Hand Toggle"
          >
            <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Leave Call Button */}
          <button
            onClick={() => setShowConfirmLeave(true)}
            className="flex items-center justify-center gap-1.5 w-9.5 h-9.5 xs:w-10 xs:h-10 sm:w-auto sm:px-4 sm:h-12 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-rose-600/30 transition shrink-0 ml-0.5 sm:ml-2"
            title="Leave this meeting"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>

        {/* Right Section: Host Controls & Sidebars */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Host Controls Toggle (Visible to Host & Co-Host) */}
          {canModerate && (
            <button
              onClick={toggleHostControl}
              className={`relative flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto px-2 sm:px-3 h-9 sm:h-11 rounded-xl transition shrink-0 ${
                isHostControlOpen
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-2 ring-violet-500/40'
                  : 'bg-gradient-to-r from-violet-600/20 to-indigo-600/20 hover:from-violet-600/30 hover:to-indigo-600/30 text-violet-300 border border-violet-500/30'
              }`}
              title="Host Controls & Security Settings"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden xl:inline text-xs font-bold">Host Controls</span>
              {waitingParticipants.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse absolute -top-0.5 -right-0.5 ring-2 ring-slate-900" />
              )}
            </button>
          )}

          {/* AI Summary Trigger */}
          {onTriggerAISummary && (
            <button
              onClick={onTriggerAISummary}
              className="flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto px-2 sm:px-3.5 h-9 sm:h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition shrink-0"
              title="Generate live AI meeting summary"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
              <span className="hidden 2xl:inline">AI Summary</span>
            </button>
          )}

          {/* Notes Toggle */}
          <button
            onClick={toggleNotes}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition shrink-0 ${
              isNotesOpen
                ? 'bg-violet-600/40 text-violet-300 border border-violet-500/50 shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10'
            }`}
            title="Shared meeting notes"
          >
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Chat Toggle with Unread Activity */}
          <button
            onClick={toggleChat}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition shrink-0 ${
              isChatOpen
                ? 'bg-violet-600/40 text-violet-300 border border-violet-500/50 shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10'
            }`}
            title="In-meeting chat"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {chatMessages.length > 0 && !isChatOpen && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-violet-400 ring-2 ring-slate-900" />
            )}
          </button>

          {/* Participants Toggle */}
          <button
            onClick={toggleParticipants}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition shrink-0 ${
              isParticipantsOpen
                ? 'bg-violet-600/40 text-violet-300 border border-violet-500/50 shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10'
            }`}
            title="Participants list"
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-violet-600 text-[10px] font-bold text-white rounded-full">
              {participants.size + 1}
            </span>
          </button>
        </div>
      </footer>

      {/* Leave Meeting Modal */}
      {showConfirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl animate-scaleIn space-y-4">
            <h3 className="text-lg font-bold text-white">Leave Meeting</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isHost
                ? 'You can leave the meeting without terminating it for others, or end it for all participants.'
                : 'Are you sure you want to exit the current meeting session?'}
            </p>

            <div className="space-y-2 pt-2">
              {/* Option 1: Just Leave */}
              <button
                onClick={() => {
                  setShowConfirmLeave(false);
                  onLeaveMeeting();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition"
              >
                Leave Meeting
              </button>

              {/* Option 2: End for Everyone (Host Only) */}
              {isHost && onEndMeetingForEveryone && (
                <button
                  onClick={() => {
                    setShowConfirmLeave(false);
                    setShowConfirmEnd(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition"
                >
                  End Meeting for Everyone
                </button>
              )}

              <button
                onClick={() => setShowConfirmLeave(false)}
                className="w-full py-2 rounded-xl text-slate-500 hover:text-slate-400 text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Meeting for Everyone Destructive Modal */}
      {showConfirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl animate-scaleIn space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">End meeting for everyone?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will disconnect all attendees immediately.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-white/5">
              The session will terminate for everyone in the room. Are you sure you want to end it now?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmEnd(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmEnd(false);
                  onEndMeetingForEveryone?.();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition"
              >
                End Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
