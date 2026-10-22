import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Shield,
  Lock,
  Hourglass,
  Clock,
  PhoneOff,
  AlertCircle,
  Wifi,
  Sparkles
} from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoGrid } from '../components/VideoGrid';
import { MediaControls } from '../components/MediaControls';
import { MeetingChatSidebar } from '../components/MeetingChatSidebar';
import { MeetingNotesPanel } from '../components/MeetingNotesPanel';
import { ParticipantsSidebar } from '../components/ParticipantsSidebar';
import { HostControlsPanel } from '../components/HostControlsPanel';
import { AISummaryModal } from '../components/AISummaryModal';
import { useMeetingStore } from '../stores/meetingStore';
import { useAuthStore } from '../stores/authStore';
import { apiClient } from '../services/apiClient';
import { Logo } from '../components/Logo';

export const MeetingRoomPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    isChatOpen,
    isNotesOpen,
    isParticipantsOpen,
    isHostControlOpen,
    isMeetingLocked,
    isInWaitingRoom,
    waitingRoomMessage,
    isHost: storeIsHost,
    isCoHost: storeIsCoHost,
    toggleChat,
    toggleNotes,
    toggleParticipants,
    toggleHostControl,
    resetMeetingState
  } = useMeetingStore();

  const state = location.state as any;
  const initialMuted = state?.initialMuted ?? false;
  const initialCameraOff = state?.initialCameraOff ?? false;
  const consentGranted = state?.consentGranted ?? true;
  const guestName = state?.guestName;

  const [meeting, setMeeting] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleMeetingEnded = React.useCallback((msg?: string) => {
    alert(msg || 'The host has ended this meeting for everyone.');
    navigate(`/meetings/${meetingId}`);
  }, [meetingId, navigate]);

  const handleParticipantRemoved = React.useCallback((reason?: string) => {
    alert(reason || 'You have been removed from this meeting by the host.');
    navigate('/dashboard');
  }, [navigate]);

  // Initialize WebRTC with complete host control & moderation support
  const {
    localStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toastMessage,
    networkQuality,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendMeetingChat,
    admitParticipant,
    rejectParticipant,
    toggleMeetingLock,
    muteAllParticipants,
    moderateParticipant,
    updateMeetingPermissions,
    endMeetingForEveryone
  } = useWebRTC(
    meetingId || 'room',
    initialMuted,
    initialCameraOff,
    guestName,
    handleMeetingEnded,
    handleParticipantRemoved
  );

  useEffect(() => {
    fetchMeetingData();
    return () => {
      resetMeetingState();
    };
  }, [meetingId]);

  const fetchMeetingData = async () => {
    try {
      let data: any;
      try {
        data = await apiClient.get(`/meetings/${meetingId}`);
      } catch {
        data = await apiClient.get(`/meetings/${meetingId}/lobby`);
      }
      setMeeting(data.meeting);
    } catch (err) {
      console.warn('Could not load meeting details:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTriggerAISummary = async () => {
    try {
      setIsGeneratingAI(true);
      const res: any = await apiClient.post(`/meetings/${meeting?.id || meetingId}/ai/process`, {
        meetingId: meeting?.id || meetingId,
        consentRecorded: consentGranted
      });

      setSummaryData(res.summary);
      setActionItems(res.actionItems || []);
      setShowSummaryModal(true);
    } catch (err) {
      console.error('Failed to trigger AI summary:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleLeaveMeeting = () => {
    navigate(`/meetings/${meeting?.id || meetingId}`);
  };

  const isHost = storeIsHost || meeting?.hostId?._id === user?.id || meeting?.hostId === user?.id;
  const isCoHost = storeIsCoHost;

  // Waiting Room View for Attendees waiting for host approval
  if (isInWaitingRoom) {
    return (
      <div className="fixed inset-0 w-full h-[100dvh] bg-[#070A12] text-slate-100 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-2xl flex flex-col items-center text-center space-y-6 relative z-10 animate-scaleIn">
          <Logo size="md" />

          <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 relative">
            <Hourglass className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">
              {meeting?.title || 'Meeting Room'}
            </h2>
            <p className="text-sm font-semibold text-violet-300">
              {waitingRoomMessage}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              The host has been notified that you are waiting and will admit you shortly.
            </p>
          </div>

          <div className="w-full p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Meeting ID:</span>
              <span className="font-mono text-cyan-400 font-semibold">{meetingId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Joining as:</span>
              <span className="text-slate-200 font-semibold truncate max-w-[180px]">
                {guestName || user?.fullName || 'Attendee'}
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition"
          >
            <PhoneOff className="w-4 h-4 text-rose-400" />
            <span>Leave Waiting Room</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-screen bg-[#070A12] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 border border-violet-500/40 text-violet-200 text-xs font-semibold shadow-2xl backdrop-blur-xl flex items-center gap-2 animate-fadeIn pointer-events-none">
          <AlertCircle className="w-4 h-4 text-violet-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Floating Room Bar */}
      <header className="h-12 sm:h-14 px-3 sm:px-6 border-b border-white/10 flex items-center justify-between bg-slate-950/80 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Logo size="sm" showText={false} />
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-xs md:max-w-md">
            {meeting?.title || 'Live Meeting'}
          </h2>
          <span className="text-slate-600 hidden xs:inline">|</span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-800 text-[11px] sm:text-xs font-mono text-cyan-400 font-semibold transition shrink-0 border border-transparent hover:border-white/10"
            title="Click to copy meeting link"
          >
            <span>{meetingId}</span>
            {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60 hover:opacity-100" />}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 shrink-0">
          {/* Lock Indicator */}
          {isMeetingLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 font-semibold text-[11px] animate-pulse">
              <Lock className="w-3 h-3" />
              <span className="hidden sm:inline">Meeting Locked</span>
            </span>
          )}

          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px]">
            <Shield className="w-3 h-3" />
            <span>Encrypted WebRTC</span>
          </span>

          {isGeneratingAI && (
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-violet-950/60 border border-violet-500/30 text-violet-300 font-semibold text-[10px] sm:text-[11px] animate-pulse">
              AI Summarizing...
            </span>
          )}
        </div>
      </header>

      {/* Main Video Arena + Slide-out Sidebars */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 w-full">
        {/* Responsive Video Grid */}
        <VideoGrid
          localStream={localStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
        />

        {/* In-Meeting Chat Drawer/Sidebar */}
        {isChatOpen && (
          <MeetingChatSidebar
            onSendMessage={sendMeetingChat}
            onClose={toggleChat}
          />
        )}

        {/* Shared Meeting Notes Drawer/Sidebar */}
        {isNotesOpen && (
          <MeetingNotesPanel onClose={toggleNotes} />
        )}

        {/* Participants List Drawer/Sidebar */}
        {isParticipantsOpen && (
          <ParticipantsSidebar
            onClose={toggleParticipants}
            isHost={isHost}
            isCoHost={isCoHost}
            onAdmit={admitParticipant}
            onReject={rejectParticipant}
            onModerate={moderateParticipant}
          />
        )}

        {/* Host Controls & Moderation Panel */}
        {isHostControlOpen && (
          <HostControlsPanel
            meetingId={meeting?.id || meetingId || ''}
            onClose={toggleHostControl}
            onToggleLock={toggleMeetingLock}
            onMuteAll={muteAllParticipants}
            onUpdatePermissions={updateMeetingPermissions}
            onEndMeetingForEveryone={endMeetingForEveryone}
            isHost={isHost}
            isCoHost={isCoHost}
          />
        )}
      </div>

      {/* Bottom Media Controls Bar */}
      <MediaControls
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeaveMeeting={handleLeaveMeeting}
        onEndMeetingForEveryone={endMeetingForEveryone}
        onTriggerAISummary={handleTriggerAISummary}
        isHost={isHost}
        isCoHost={isCoHost}
      />

      {/* Real-Time AI Summary Modal */}
      {showSummaryModal && summaryData && (
        <AISummaryModal
          summary={summaryData}
          actionItems={actionItems}
          onClose={() => setShowSummaryModal(false)}
        />
      )}
    </div>
  );
};
