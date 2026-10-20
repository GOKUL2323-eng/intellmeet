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
    participants
  } = useMeetingStore();

  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  return (
    <>
      <footer className="h-20 bg-slate-900/90 border-t border-white/10 px-8 flex items-center justify-between z-20 backdrop-blur-xl">
        {/* Left Info: Meeting Participants Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-white/10 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-semibold text-slate-100">Live Meeting</span>
            <span className="text-slate-500">•</span>
            <span>{participants.size + 1} online</span>
          </div>
        </div>

        {/* Center: Primary Audio/Video & Sharing Controls */}
        <div className="flex items-center gap-3">
          {/* Microphone */}
          <button
            onClick={onToggleAudio}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition shadow-lg ${
              isMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition shadow-lg ${
              isCameraOff
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition shadow-lg ${
              isScreenSharing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isScreenSharing ? 'Stop sharing screen' : 'Share entire screen'}
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          {/* Raise Hand */}
          <button
            onClick={() => setHandRaised(!isHandRaised)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition shadow-lg ${
              isHandRaised
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/10'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            <Hand className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Panels & End Call */}
        <div className="flex items-center gap-3">
          {/* AI Intelligence Generation Button */}
          {onTriggerAISummary && (
            <button
              onClick={onTriggerAISummary}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition"
              title="Generate real-time AI summary and action items"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI Summary</span>
            </button>
          )}

          {/* Notes Toggle */}
          <button
            onClick={toggleNotes}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isNotesOpen
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10'
            }`}
            title="Meeting notes"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Chat Toggle */}
          <button
            onClick={toggleChat}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isChatOpen
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10'
            }`}
            title="Meeting chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          {/* Participants Toggle */}
          <button
            onClick={toggleParticipants}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              isParticipantsOpen
                ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10'
            }`}
            title="Participants list"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Leave/End Call Button */}
          <button
            onClick={() => setShowConfirmLeave(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition ml-2"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>
      </footer>

      {/* Leave Confirmation Dialog */}
      {showConfirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Leave Meeting?</h3>
            <p className="text-xs text-slate-400 mb-6">
              {isHost
                ? 'As host, you can leave or end the meeting for all attendees.'
                : 'Are you sure you want to leave this meeting session?'}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmLeave(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmLeave(false);
                  onLeaveMeeting();
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition"
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
