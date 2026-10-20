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
  Sparkles
} from 'lucide-react';
import { useMeetingStore } from '../stores/meetingStore';

interface Props {
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onLeaveMeeting: () => void;
  onTriggerAISummary?: () => void;
  isHost?: boolean;
}

export const MediaControls: React.FC<Props> = ({
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveMeeting,
  onTriggerAISummary,
  isHost = false
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
    toggleChat,
    toggleParticipants,
    toggleNotes,
    participants,
    chatMessages
  } = useMeetingStore();

  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  return (
    <>
      <footer className="h-16 sm:h-20 bg-slate-950/95 border-t border-white/10 px-2 sm:px-6 flex items-center justify-between z-30 backdrop-blur-xl shrink-0 w-full gap-1.5 sm:gap-4 select-none">
        {/* Left Section: Live Status (Visible on md+) */}
        <div className="hidden md:flex items-center gap-3 min-w-[140px]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-100">Live</span>
            <span className="text-slate-500">•</span>
            <span>{participants.size + 1} online</span>
          </div>
        </div>

        {/* Center Section: Core Audio/Video/Call Controls */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-3 flex-1 md:flex-initial">
          {/* Microphone */}
          <button
            onClick={onToggleAudio}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition shadow-lg shrink-0 ${
              isMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label="Microphone Toggle"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={onToggleVideo}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition shadow-lg shrink-0 ${
              isCameraOff
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 ring-2 ring-rose-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
            aria-label="Camera Toggle"
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          {/* Screen Share (Desktop/Tablet Only) */}
          <button
            onClick={onToggleScreenShare}
            className={`hidden sm:flex w-11 h-11 sm:w-12 sm:h-12 rounded-xl items-center justify-center transition shadow-lg shrink-0 ${
              isScreenSharing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
            aria-label="Screen Share Toggle"
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          {/* Raise Hand */}
          <button
            onClick={() => setHandRaised(!isHandRaised)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition shadow-lg shrink-0 ${
              isHandRaised
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 ring-2 ring-amber-500/30'
                : 'bg-slate-800/90 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            aria-label="Raise Hand Toggle"
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Leave Call Button */}
          <button
            onClick={() => setShowConfirmLeave(true)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 h-11 sm:h-12 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-rose-600/30 transition shrink-0 ml-1 sm:ml-2"
            title="Leave this meeting"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden xs:inline">Leave</span>
          </button>
        </div>

        {/* Right Section: Productivity Tools & Sidebars */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* AI Summary Trigger */}
          {onTriggerAISummary && (
            <button
              onClick={onTriggerAISummary}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 h-10 sm:h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition shrink-0"
              title="Generate live AI meeting summary"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span className="hidden lg:inline">AI Summary</span>
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
            <FileText className="w-4 h-4" />
          </button>

          {/* Chat Toggle with Unread/Activity Indicator */}
          <button
            onClick={toggleChat}
            className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition shrink-0 ${
              isChatOpen
                ? 'bg-violet-600/40 text-violet-300 border border-violet-500/50 shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10'
            }`}
            title="In-meeting chat"
          >
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && !isChatOpen && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-400 ring-2 ring-slate-900" />
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
            <Users className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-violet-600 text-[10px] font-bold text-white rounded-full">
              {participants.size + 1}
            </span>
          </button>
        </div>
      </footer>

      {/* Leave Confirmation Dialog */}
      {showConfirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl animate-scaleIn">
            <h3 className="text-lg font-bold text-white mb-2">Leave Meeting?</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {isHost
                ? 'As the host, you can leave or conclude the meeting for all participants.'
                : 'Are you sure you want to exit the current meeting session?'}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmLeave(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmLeave(false);
                  onLeaveMeeting();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition"
              >
                {isHost ? 'End Meeting' : 'Leave Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
