import React, { useState } from 'react';
import {
  Shield,
  X,
  Lock,
  Unlock,
  Users,
  MicOff,
  Video,
  MonitorUp,
  MessageSquare,
  Mic,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useMeetingStore } from '../stores/meetingStore';
import { apiClient } from '../services/apiClient';

interface Props {
  meetingId: string;
  onClose: () => void;
  onToggleLock: (isLocked: boolean) => void;
  onMuteAll: (allowUnmute: boolean) => void;
  onUpdatePermissions: (permissions: any) => void;
  onEndMeetingForEveryone: () => void;
  isHost: boolean;
  isCoHost: boolean;
}

export const HostControlsPanel: React.FC<Props> = ({
  meetingId,
  onClose,
  onToggleLock,
  onMuteAll,
  onUpdatePermissions,
  onEndMeetingForEveryone,
  isHost,
  isCoHost
}) => {
  const {
    isMeetingLocked,
    accessSettings,
    waitingParticipants,
    participants
  } = useMeetingStore();

  const [allowUnmuteOnMuteAll, setAllowUnmuteOnMuteAll] = useState(true);
  const [showMuteAllConfirm, setShowMuteAllConfirm] = useState(false);
  const [showEndMeetingConfirm, setShowEndMeetingConfirm] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showSuccessNotice = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const currentSettings = accessSettings || {
    allowGuests: true,
    waitingRoom: false,
    defaultMute: false,
    allowScreenShare: true,
    allowChat: true,
    allowUnmute: true,
    allowCamera: true
  };

  const handleToggleLock = async () => {
    const nextLocked = !isMeetingLocked;
    try {
      await apiClient.post(`/meetings/${meetingId}/lock`, { isLocked: nextLocked });
      onToggleLock(nextLocked);
      showSuccessNotice(nextLocked ? 'Meeting locked.' : 'Meeting unlocked.');
    } catch (err: any) {
      console.error('Failed to update meeting lock:', err);
    }
  };

  const handleTogglePermission = async (key: string, currentValue: boolean) => {
    const updated = { ...currentSettings, [key]: !currentValue };
    try {
      await apiClient.patch(`/meetings/${meetingId}/settings`, updated);
      onUpdatePermissions(updated);
      showSuccessNotice('Meeting permissions updated.');
    } catch (err: any) {
      console.error('Failed to update permissions:', err);
    }
  };

  const handleMuteAll = async () => {
    try {
      await apiClient.post(`/meetings/${meetingId}/mute-all`, { allowUnmute: allowUnmuteOnMuteAll });
      onMuteAll(allowUnmuteOnMuteAll);
      setShowMuteAllConfirm(false);
      showSuccessNotice('All participants muted.');
    } catch (err: any) {
      console.error('Failed to mute all:', err);
    }
  };

  return (
    <aside className="w-full md:w-96 h-full fixed md:relative inset-0 md:inset-auto bg-slate-900/98 md:bg-slate-900/95 border-l border-white/10 flex flex-col z-50 md:z-30 backdrop-blur-2xl shadow-2xl animate-fadeIn">
      {/* Header */}
      <div className="h-14 sm:h-16 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Host Controls</span>
              <span className="px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 text-[10px] font-bold">
                {isHost ? 'Owner' : 'Co-Host'}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Security & Meeting Moderation</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {actionSuccess && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Controls Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Meeting Security Section */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Meeting Security
          </h4>

          {/* Lock Meeting Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-between hover:bg-slate-800/80 transition">
            <div className="flex items-start gap-3 min-w-0 pr-2">
              <div className={`p-2 rounded-xl shrink-0 ${isMeetingLocked ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700/60 text-slate-300'}`}>
                {isMeetingLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">Lock Meeting</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {isMeetingLocked
                    ? 'No new participants can join this meeting.'
                    : 'Allow authorized participants to enter.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleLock}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isMeetingLocked ? 'bg-rose-600' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={isMeetingLocked}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isMeetingLocked ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Waiting Room Toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-between hover:bg-slate-800/80 transition">
            <div className="flex items-start gap-3 min-w-0 pr-2">
              <div className={`p-2 rounded-xl shrink-0 ${currentSettings.waitingRoom ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700/60 text-slate-300'}`}>
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-slate-200">Waiting Room</p>
                  {waitingParticipants.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-violet-600 text-[10px] font-bold text-white">
                      {waitingParticipants.length} waiting
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Hold joining participants until approved by host.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleTogglePermission('waitingRoom', currentSettings.waitingRoom)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                currentSettings.waitingRoom ? 'bg-violet-600' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={currentSettings.waitingRoom}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  currentSettings.waitingRoom ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Participant Permissions Matrix */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Attendee Permissions
          </h4>

          <div className="rounded-2xl bg-slate-800/40 border border-white/5 divide-y divide-white/5 overflow-hidden">
            {/* Share Screen */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MonitorUp className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-200">Share their screen</span>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.allowScreenShare}
                onChange={() => handleTogglePermission('allowScreenShare', currentSettings.allowScreenShare)}
                className="w-4 h-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500/20 bg-slate-900"
              />
            </div>

            {/* Send Chat */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-200">Send chat messages</span>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.allowChat}
                onChange={() => handleTogglePermission('allowChat', currentSettings.allowChat)}
                className="w-4 h-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500/20 bg-slate-900"
              />
            </div>

            {/* Unmute Themselves */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mic className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-200">Unmute microphone</span>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.allowUnmute}
                onChange={() => handleTogglePermission('allowUnmute', currentSettings.allowUnmute)}
                className="w-4 h-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500/20 bg-slate-900"
              />
            </div>

            {/* Start Video */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-200">Start video / camera</span>
              </div>
              <input
                type="checkbox"
                checked={currentSettings.allowCamera}
                onChange={() => handleTogglePermission('allowCamera', currentSettings.allowCamera)}
                className="w-4 h-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500/20 bg-slate-900"
              />
            </div>
          </div>
        </section>

        {/* Global Meeting Actions */}
        <section className="space-y-3">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Moderation
          </h4>

          {/* Mute All Button */}
          <button
            onClick={() => setShowMuteAllConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-white/10 text-xs font-semibold shadow-sm transition"
          >
            <MicOff className="w-4 h-4 text-rose-400" />
            <span>Mute All Participants</span>
          </button>

          {/* End Meeting for Everyone (Owner only) */}
          {isHost && (
            <button
              onClick={() => setShowEndMeetingConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 text-xs font-semibold shadow-sm transition"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>End Meeting for Everyone</span>
            </button>
          )}
        </section>

        {/* Media Transport Info */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1 text-[11px] text-slate-400">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-500">Meeting Code:</span>
            <span className="text-cyan-400 font-semibold">{meetingId}</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-500">Active Peers:</span>
            <span className="text-emerald-400 font-semibold">{participants.size + 1} connected</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-500">Signaling:</span>
            <span className="text-violet-300">Socket.io + STUN</span>
          </div>
        </div>
      </div>

      {/* Mute All Confirmation Modal */}
      {showMuteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-5 shadow-2xl animate-scaleIn space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <MicOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Mute all participants?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  All current attendees will be muted immediately.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-white/5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={allowUnmuteOnMuteAll}
                onChange={(e) => setAllowUnmuteOnMuteAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-violet-600 mt-0.5"
              />
              <div>
                <span className="font-semibold text-slate-200">Allow participants to unmute themselves</span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  If unchecked, attendees cannot turn their mic back on until permitted.
                </p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowMuteAllConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleMuteAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition"
              >
                Mute All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Meeting for Everyone Confirmation Modal */}
      {showEndMeetingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-500/30 p-5 shadow-2xl animate-scaleIn space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">End meeting for everyone?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  This will disconnect all participants and terminate the session.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-white/5">
              Are you sure? All active audio/video feeds will be closed immediately and the meeting status will be marked as ended.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowEndMeetingConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowEndMeetingConfirm(false);
                  onEndMeetingForEveryone();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-600/30 transition"
              >
                End Meeting
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
