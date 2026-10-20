import React from 'react';
import { X, Users, MicOff, VideoOff, Pin, PinOff, UserCheck, Copy, Check } from 'lucide-react';
import { useMeetingStore } from '../stores/meetingStore';
import { useAuthStore } from '../stores/authStore';

interface Props {
  onClose: () => void;
  isHost?: boolean;
}

export const ParticipantsSidebar: React.FC<Props> = ({ onClose, isHost = false }) => {
  const { user } = useAuthStore();
  const { participants, isMuted, isCameraOff, pinnedSocketId, setPinnedSocketId } = useMeetingStore();
  const [copied, setCopied] = React.useState(false);

  const remoteList = Array.from(participants.values());

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-full md:w-80 h-full fixed md:relative inset-0 md:inset-auto bg-slate-900/98 md:bg-slate-900/95 border-l border-white/10 flex flex-col z-40 md:z-20 backdrop-blur-xl">
      {/* Header */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold">Participants ({remoteList.length + 1})</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Copy Invite Link Banner */}
      <div className="p-3 border-b border-white/10 bg-slate-950/40">
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-medium transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {/* Local User */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {(user?.fullName || 'Y').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-200 truncate">
                  {user?.fullName || 'You'} (You)
                </span>
                {isHost && (
                  <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                    Host
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block truncate">Local participant</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
            {isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
            {isCameraOff && <VideoOff className="w-3.5 h-3.5 text-rose-400" />}
            <button
              onClick={() => setPinnedSocketId(pinnedSocketId === 'local' ? null : 'local')}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
              title="Pin tile"
            >
              {pinnedSocketId === 'local' ? <PinOff className="w-3.5 h-3.5 text-violet-400" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Remote Participants */}
        {remoteList.map((p) => {
          const isPeerPinned = pinnedSocketId === p.socketId;
          return (
            <div
              key={p.socketId}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0">
                  {p.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {p.fullName}
                    </span>
                    {p.role === 'HOST' && (
                      <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                        Host
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {p.isScreenSharing ? 'Sharing screen' : 'Attendee'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                {p.isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                {p.isCameraOff && <VideoOff className="w-3.5 h-3.5 text-rose-400" />}
                <button
                  onClick={() => setPinnedSocketId(isPeerPinned ? null : p.socketId)}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                  title={isPeerPinned ? 'Unpin tile' : 'Pin tile'}
                >
                  {isPeerPinned ? <PinOff className="w-3.5 h-3.5 text-violet-400" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
