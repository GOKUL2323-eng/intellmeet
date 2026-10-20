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

  // Determine grid layout columns
  const getGridClass = () => {
    if (pinnedSocketId) return 'grid-cols-1';
    if (totalCount === 1) return 'grid-cols-1 max-w-4xl mx-auto';
    if (totalCount === 2) return 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto';
    if (totalCount <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-6xl mx-auto';
    if (totalCount <= 6) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  const pinnedParticipant = remoteParticipants.find(p => p.socketId === pinnedSocketId);

  return (
    <div className="flex-1 w-full h-full flex items-center justify-center p-6 overflow-y-auto">
      {/* If a participant is pinned */}
      {pinnedSocketId ? (
        <div className="w-full h-full flex flex-col lg:flex-row gap-4">
          <div className="flex-1 h-full min-h-[450px]">
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

          {/* Filmstrip sidebar for other peers */}
          <div className="lg:w-72 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto">
            {pinnedSocketId !== 'local' && (
              <div className="w-48 lg:w-full shrink-0">
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
                <div key={p.socketId} className="w-48 lg:w-full shrink-0">
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
        /* Standard Dynamic Grid */
        <div className={`w-full grid gap-4 items-center justify-center ${getGridClass()}`}>
          {/* Local User Tile */}
          <ParticipantTile
            isLocal
            localStream={localStream}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isScreenSharing={isScreenSharing}
            fullName={user?.fullName}
            onTogglePin={() => setPinnedSocketId('local')}
          />

          {/* Remote Participants Tiles */}
          {remoteParticipants.map(p => (
            <ParticipantTile
              key={p.socketId}
              participant={p}
              isSpeaking={activeSpeakerSocketId === p.socketId}
              onTogglePin={() => setPinnedSocketId(p.socketId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
