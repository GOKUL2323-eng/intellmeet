import React, { useState } from 'react';
import {
  X,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Pin,
  PinOff,
  MoreVertical,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  Search,
  Copy,
  Check,
  Hand,
  MonitorUp,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useMeetingStore, IParticipantState } from '../stores/meetingStore';
import { useAuthStore } from '../stores/authStore';

interface Props {
  onClose: () => void;
  isHost?: boolean;
  isCoHost?: boolean;
  onAdmit?: (socketId: string) => void;
  onReject?: (socketId: string) => void;
  onModerate?: (
    socketId: string,
    action: 'mute' | 'stopVideo' | 'stopScreenShare' | 'lowerHand' | 'remove' | 'promoteCoHost' | 'demoteCoHost',
    blockRejoin?: boolean,
    reason?: string
  ) => void;
}

export const ParticipantsSidebar: React.FC<Props> = ({
  onClose,
  isHost = false,
  isCoHost = false,
  onAdmit,
  onReject,
  onModerate
}) => {
  const { user } = useAuthStore();
  const {
    participants,
    isMuted,
    isCameraOff,
    pinnedSocketId,
    setPinnedSocketId,
    waitingParticipants
  } = useMeetingStore();

  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeMenuSocketId, setActiveMenuSocketId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<IParticipantState | null>(null);
  const [blockRejoinOnRemove, setBlockRejoinOnRemove] = useState(false);
  const [removeReason, setRemoveReason] = useState('');

  const remoteList = Array.from(participants.values());
  const canModerate = isHost || isCoHost;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredRemote = remoteList.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirmRemove = () => {
    if (removeTarget && onModerate) {
      onModerate(
        removeTarget.socketId,
        'remove',
        blockRejoinOnRemove,
        removeReason.trim() || undefined
      );
      setRemoveTarget(null);
      setRemoveReason('');
      setBlockRejoinOnRemove(false);
    }
  };

  const renderQualityBadge = (quality?: 'good' | 'fair' | 'poor') => {
    switch (quality) {
      case 'poor':
        return (
          <span title="Poor connection" className="text-rose-400">
            <WifiOff className="w-3 h-3" />
          </span>
        );
      case 'fair':
        return (
          <span title="Fair connection" className="text-amber-400">
            <Wifi className="w-3 h-3 opacity-70" />
          </span>
        );
      case 'good':
      default:
        return (
          <span title="Good connection" className="text-emerald-400">
            <Wifi className="w-3 h-3" />
          </span>
        );
    }
  };

  return (
    <aside className="w-full md:w-84 h-full fixed md:relative inset-0 md:inset-auto bg-slate-900/98 md:bg-slate-900/95 border-l border-white/10 flex flex-col z-50 md:z-20 backdrop-blur-2xl shadow-2xl animate-fadeIn">
      {/* Header */}
      <div className="h-14 sm:h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-slate-200">
          <Users className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-semibold">
            Participants ({remoteList.length + 1})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Close participants"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Copy Invite Link Banner */}
      <div className="p-3 border-b border-white/10 bg-slate-950/40 shrink-0">
        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-medium transition"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Link Copied!' : 'Copy Invite Link'}</span>
        </button>
      </div>

      {/* Waiting Room Section for Host / Co-Host */}
      {canModerate && waitingParticipants.length > 0 && (
        <div className="p-3 bg-violet-950/40 border-b border-violet-500/30 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
              <span>Waiting Room</span>
              <span className="px-1.5 py-0.2 rounded-full bg-violet-600 text-[10px] text-white">
                {waitingParticipants.length}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  waitingParticipants.forEach(p => onAdmit?.(p.socketId));
                }}
                className="text-[11px] font-bold text-emerald-400 hover:underline"
              >
                Admit All
              </button>
              <button
                onClick={() => {
                  waitingParticipants.forEach(p => onReject?.(p.socketId));
                }}
                className="text-[11px] font-bold text-rose-400 hover:underline"
              >
                Deny All
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {waitingParticipants.map((wp) => (
              <div
                key={wp.socketId}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-violet-500/20 text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-slate-200 truncate">{wp.fullName}</p>
                  <span className="text-[10px] text-slate-400">Waiting to join...</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onAdmit?.(wp.socketId)}
                    className="p-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition"
                    title="Admit to meeting"
                  >
                    Admit
                  </button>
                  <button
                    onClick={() => onReject?.(wp.socketId)}
                    className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 text-[11px] transition"
                    title="Decline admission"
                  >
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participant Search */}
      <div className="p-3 border-b border-white/10 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="w-full bg-slate-800/60 border border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Participant List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {/* Local User */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 border border-white/5">
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
                {isCoHost && !isHost && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                    Co-Host
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block truncate">You</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
            {renderQualityBadge('good')}
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
        {filteredRemote.map((p) => {
          const isPeerPinned = pinnedSocketId === p.socketId;
          const isMenuOpen = activeMenuSocketId === p.socketId;
          const isPeerHost = p.role === 'HOST';
          const isPeerCoHost = p.role === 'CO_HOST';

          return (
            <div
              key={p.socketId}
              className="relative rounded-xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 transition"
            >
              <div className="flex items-center justify-between p-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0">
                    {p.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {p.fullName}
                      </span>
                      {isPeerHost && (
                        <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                          Host
                        </span>
                      )}
                      {isPeerCoHost && (
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                          Co-Host
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate flex items-center gap-1">
                      {p.isScreenSharing && (
                        <span className="text-emerald-400 flex items-center gap-0.5">
                          <MonitorUp className="w-3 h-3" />
                          <span>Presenting</span>
                        </span>
                      )}
                      {p.isHandRaised && (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <Hand className="w-3 h-3" />
                          <span>Hand raised</span>
                        </span>
                      )}
                      {!p.isScreenSharing && !p.isHandRaised && 'Attendee'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 text-slate-400">
                  {renderQualityBadge(p.networkQuality)}
                  {p.isMuted && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                  {p.isCameraOff && <VideoOff className="w-3.5 h-3.5 text-rose-400" />}

                  <button
                    onClick={() => setPinnedSocketId(isPeerPinned ? null : p.socketId)}
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                    title={isPeerPinned ? 'Unpin tile' : 'Pin tile'}
                  >
                    {isPeerPinned ? <PinOff className="w-3.5 h-3.5 text-violet-400" /> : <Pin className="w-3.5 h-3.5" />}
                  </button>

                  {/* Context Menu Trigger for Host / Co-Host */}
                  {canModerate && !isPeerHost && !(isCoHost && isPeerCoHost) && (
                    <button
                      onClick={() => setActiveMenuSocketId(isMenuOpen ? null : p.socketId)}
                      className={`p-1 rounded hover:bg-slate-700 transition ${isMenuOpen ? 'text-violet-400 bg-slate-700' : 'text-slate-400'}`}
                      title="Participant moderation options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Moderation Dropdown Menu */}
              {isMenuOpen && canModerate && (
                <div className="p-2 border-t border-white/5 bg-slate-900/90 rounded-b-xl space-y-1 text-xs animate-fadeIn">
                  {/* Mute Mic */}
                  {!p.isMuted && (
                    <button
                      onClick={() => {
                        onModerate?.(p.socketId, 'mute');
                        setActiveMenuSocketId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    >
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Mute Participant</span>
                    </button>
                  )}

                  {/* Stop Camera */}
                  {!p.isCameraOff && (
                    <button
                      onClick={() => {
                        onModerate?.(p.socketId, 'stopVideo');
                        setActiveMenuSocketId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    >
                      <VideoOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Turn off Camera</span>
                    </button>
                  )}

                  {/* Stop Screen Share */}
                  {p.isScreenSharing && (
                    <button
                      onClick={() => {
                        onModerate?.(p.socketId, 'stopScreenShare');
                        setActiveMenuSocketId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    >
                      <MonitorUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>Stop Screen Share</span>
                    </button>
                  )}

                  {/* Lower Hand */}
                  {p.isHandRaised && (
                    <button
                      onClick={() => {
                        onModerate?.(p.socketId, 'lowerHand');
                        setActiveMenuSocketId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
                    >
                      <Hand className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lower Hand</span>
                    </button>
                  )}

                  {/* Make Co-Host (Host Only) */}
                  {isHost && !isPeerCoHost && (
                    <button
                      onClick={() => {
                        onModerate?.(p.socketId, 'promoteCoHost');
                        setActiveMenuSocketId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Make Co-Host</span>
                    </button>
                  )}

                  {/* Revoke Co-Host (Host Only) */}
                  {isHost && isPeerCoHost && (
                    <button
                      onClick={() => {
                        onModerate?.(p.socketId, 'demoteCoHost');
                        setActiveMenuSocketId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-amber-300 hover:text-amber-200 transition"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Revoke Co-Host</span>
                    </button>
                  )}

                  {/* Remove Participant */}
                  <button
                    onClick={() => {
                      setRemoveTarget(p);
                      setActiveMenuSocketId(null);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Remove from Meeting</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Remove Participant Confirmation Modal */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl animate-scaleIn space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Remove {removeTarget.fullName}?
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will disconnect them from the current meeting.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-white/5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={blockRejoinOnRemove}
                onChange={(e) => setBlockRejoinOnRemove(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-rose-600 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-200">
                  Prevent participant from rejoining
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Participant will be banned and barred from re-entering this meeting session.
                </p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setRemoveTarget(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
