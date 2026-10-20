import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoGrid } from '../components/VideoGrid';
import { MediaControls } from '../components/MediaControls';
import { MeetingChatSidebar } from '../components/MeetingChatSidebar';
import { MeetingNotesPanel } from '../components/MeetingNotesPanel';
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
    toggleChat,
    toggleNotes,
    resetMeetingState
  } = useMeetingStore();

  const state = location.state as any;
  const initialMuted = state?.initialMuted ?? false;
  const initialCameraOff = state?.initialCameraOff ?? false;
  const consentGranted = state?.consentGranted ?? true;

  const [meeting, setMeeting] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Initialize WebRTC
  const {
    localStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    sendMeetingChat
  } = useWebRTC(meetingId || 'room', initialMuted, initialCameraOff);

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

  return (
    <div className="h-screen w-screen bg-[#070A12] text-slate-100 flex flex-col overflow-hidden relative">
      {/* Top Floating Room Bar */}
      <header className="h-14 px-6 border-b border-white/10 flex items-center justify-between bg-slate-950/70 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <Logo size="sm" showText={false} />
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <h2 className="text-sm font-bold text-white truncate max-w-sm">
            {meeting?.title || 'Live Meeting'}
          </h2>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-mono text-blue-400 font-semibold">{meetingId}</span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-semibold text-[11px]">
            Encrypted WebRTC
          </span>
          {isGeneratingAI && (
            <span className="px-2.5 py-1 rounded-md bg-violet-950/60 border border-violet-500/30 text-violet-300 font-semibold text-[11px] animate-pulse">
              Synthesizing AI Summary...
            </span>
          )}
        </div>
      </header>

      {/* Main Video Arena + Slide-out Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid */}
        <VideoGrid
          localStream={localStream}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
        />

        {/* In-Meeting Chat Sidebar */}
        {isChatOpen && (
          <MeetingChatSidebar
            onSendMessage={sendMeetingChat}
            onClose={toggleChat}
          />
        )}

        {/* Meeting Notes Panel */}
        {isNotesOpen && (
          <MeetingNotesPanel onClose={toggleNotes} />
        )}
      </div>

      {/* Bottom Media Controls Bar */}
      <MediaControls
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onLeaveMeeting={handleLeaveMeeting}
        onTriggerAISummary={handleTriggerAISummary}
        isHost={meeting?.hostId?._id === user?.id || meeting?.hostId === user?.id}
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
