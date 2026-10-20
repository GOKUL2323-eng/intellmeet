import React from 'react';
import { ParticipantTile } from './ParticipantTile';
import { useMeetingStore } from '../stores/meetingStore';
import { useAuthStore } from '../stores/authStore';

interface Props {
  localStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

export const VideoGrid: React.FC<Props> = ({
  localStream,
  isMuted,
  isCameraOff,
  isScreenSharing
}) => {
  const { user } = useAuthStore();
  const { participants, activeSpeakerSocketId, pinnedSocketId, setPinnedSocketId } = useMeetingStore();

  const remoteParticipants = Array.from(participants.values());
  const totalCount = remoteParticipants.length + 1; // +1 for local participant

  const pinnedParticipant = remoteParticipants.find(p => p.socketId === pinnedSocketId);

  // Dynamic Grid Layout based on participant count
  const renderGridContent = () => {
    // Single Participant
    if (totalCount === 1) {
      return (
        <div className="w-full h-full max-w-5xl max-h-full flex items-center justify-center p-1">
          <div className="w-full h-full max-h-[80vh] aspect-video">
            <ParticipantTile
              isLocal
              localStream={localStream}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isScreenSharing={isScreenSharing}
              fullName={user?.fullName}
              onTogglePin={() => setPinnedSocketId('local')}
            />
          </div>
        </div>
      );
    }

    // Two Participants (Most common 1-on-1 meeting)
    if (totalCount === 2) {
      return (
        <div className="w-full h-full max-w-7xl max-h-full grid grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1 gap-2.5 sm:gap-4 p-1">
          <div className="w-full h-full min-h-0">
            <ParticipantTile
              isLocal
              localStream={localStream}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isScreenSharing={isScreenSharing}
              fullName={user?.fullName}
              onTogglePin={() => setPinnedSocketId('local')}
            />
          </div>
          {remoteParticipants.slice(0, 1).map(p => (
            <div key={p.socketId} className="w-full h-full min-h-0">
              <ParticipantTile
                participant={p}
                isSpeaking={activeSpeakerSocketId === p.socketId}
                onTogglePin={() => setPinnedSocketId(p.socketId)}
              />
            </div>
          ))}
        </div>
      );
    }

    // 3 to 4 Participants (2x2 Grid)
    if (totalCount <= 4) {
      return (
        <div className="w-full h-full max-w-6xl max-h-full grid grid-cols-1 sm:grid-cols-2 grid-rows-2 gap-2 sm:gap-3 p-1">
          <div className="w-full h-full min-h-0">
            <ParticipantTile
              isLocal
              localStream={localStream}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isScreenSharing={isScreenSharing}
              fullName={user?.fullName}
              onTogglePin={() => setPinnedSocketId('local')}
            />
          </div>
          {remoteParticipants.map(p => (
            <div key={p.socketId} className="w-full h-full min-h-0">
              <ParticipantTile
                participant={p}
                isSpeaking={activeSpeakerSocketId === p.socketId}
                onTogglePin={() => setPinnedSocketId(p.socketId)}
              />
            </div>
          ))}
        </div>
      );
    }

    // 5 to 6 Participants (3x2 Grid)
    if (totalCount <= 6) {
      return (
        <div className="w-full h-full max-w-7xl max-h-full grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 p-1 overflow-y-auto">
          <div className="w-full aspect-video min-h-0">
            <ParticipantTile
              isLocal
              localStream={localStream}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              isScreenSharing={isScreenSharing}
              fullName={user?.fullName}
              onTogglePin={() => setPinnedSocketId('local')}
            />
          </div>
          {remoteParticipants.map(p => (
            <div key={p.socketId} className="w-full aspect-video min-h-0">
              <ParticipantTile
                participant={p}
                isSpeaking={activeSpeakerSocketId === p.socketId}
                onTogglePin={() => setPinnedSocketId(p.socketId)}
              />
            </div>
          ))}
        </div>
      );
    }

    // 7+ Participants (Scrollable Grid)
    return (
      <div className="w-full h-full max-h-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 p-1 overflow-y-auto">
        <div className="w-full aspect-video min-h-0">
          <ParticipantTile
            isLocal
            localStream={localStream}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isScreenSharing={isScreenSharing}
            fullName={user?.fullName}
            onTogglePin={() => setPinnedSocketId('local')}
          />
        </div>
        {remoteParticipants.map(p => (
          <div key={p.socketId} className="w-full aspect-video min-h-0">
            <ParticipantTile
              participant={p}
              isSpeaking={activeSpeakerSocketId === p.socketId}
              onTogglePin={() => setPinnedSocketId(p.socketId)}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full h-full min-h-0 min-w-0 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden relative">
      {/* If a participant is pinned */}
      {pinnedSocketId ? (
        <div className="w-full h-full min-h-0 flex flex-col md:flex-row gap-2.5 sm:gap-4">
          {/* Main Stage Tile */}
          <div className="flex-1 h-full min-h-0 w-full rounded-2xl overflow-hidden">
            {pinnedSocketId === 'local' ? (
              <ParticipantTile
                isLocal
                localStream={localStream}
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                fullName={user?.fullName}
                isPinned
                onTogglePin={() => setPinnedSocketId(null)}
              />
            ) : pinnedParticipant ? (
              <ParticipantTile
                participant={pinnedParticipant}
                isPinned
                onTogglePin={() => setPinnedSocketId(null)}
              />
            ) : null}
          </div>

          {/* Filmstrip for remaining peers */}
          <div className="h-28 md:h-full md:w-64 lg:w-72 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto py-1">
            {pinnedSocketId !== 'local' && (
              <div className="w-40 md:w-full h-full md:h-auto md:aspect-video shrink-0">
                <ParticipantTile
                  isLocal
                  localStream={localStream}
                  isMuted={isMuted}
                  isCameraOff={isCameraOff}
                  isScreenSharing={isScreenSharing}
                  fullName={user?.fullName}
                  onTogglePin={() => setPinnedSocketId('local')}
                />
              </div>
            )}
            {remoteParticipants
              .filter(p => p.socketId !== pinnedSocketId)
              .map(p => (
                <div key={p.socketId} className="w-40 md:w-full h-full md:h-auto md:aspect-video shrink-0">
                  <ParticipantTile
                    participant={p}
                    isSpeaking={activeSpeakerSocketId === p.socketId}
                    onTogglePin={() => setPinnedSocketId(p.socketId)}
                  />
                </div>
              ))}
          </div>
        </div>
      ) : (
        /* Standard Adaptive Grid */
        renderGridContent()
      )}
    </div>
  );
};
