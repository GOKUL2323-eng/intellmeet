import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Copy, Check, Shield } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoGrid } from '../components/VideoGrid';
import { MediaControls } from '../components/MediaControls';
import { MeetingChatSidebar } from '../components/MeetingChatSidebar';
import { MeetingNotesPanel } from '../components/MeetingNotesPanel';
import { ParticipantsSidebar } from '../components/ParticipantsSidebar';
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
    toggleChat,
    toggleNotes,
    toggleParticipants,
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

  // Initialize WebRTC with preferred name support
  const {
    localStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendMeetingChat
  } = useWebRTC(meetingId || 'room', initialMuted, initialCameraOff, guestName);

  useEffect(() => {
    fetchMeetingData();
    return () => {
      resetMeetingState();
    };
  }, [meetingId]);

  const fetchMeetingData = async () => {
    try {
      const data: any = await apiClient.get(`/meetings/${meetingId}`);
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

  const isHost = meeting?.hostId?._id === user?.id || meeting?.hostId === user?.id;

  return (
    <div className="h-screen h-[100dvh] w-screen bg-[#070A12] text-slate-100 flex flex-col overflow-hidden relative select-none">
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
          />
        )}
      </div>

      {/* Bottom Media Controls Bar */}
      <MediaControls
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeaveMeeting={handleLeaveMeeting}
        onTriggerAISummary={handleTriggerAISummary}
        isHost={isHost}
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
