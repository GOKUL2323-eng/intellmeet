import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { config } from '../config/env';

export class LiveKitService {
  /**
   * Check if LiveKit credentials are configured on the server
   */
  static isConfigured(): boolean {
    return Boolean(
      config.LIVEKIT_URL &&
      config.LIVEKIT_API_KEY &&
      config.LIVEKIT_API_SECRET &&
      config.LIVEKIT_API_KEY.trim().length > 0 &&
      config.LIVEKIT_API_SECRET.trim().length > 0
    );
  }

  /**
   * Generates a short-lived, cryptographically signed LiveKit Access Token
   * strictly on the backend with appropriate role-based permissions.
   */
  static async generateToken(params: {
    roomName: string;
    participantIdentity: string;
    participantName: string;
    isHost: boolean;
    isCoHost: boolean;
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
  }): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const at = new AccessToken(config.LIVEKIT_API_KEY!, config.LIVEKIT_API_SECRET!, {
        identity: params.participantIdentity,
        name: params.participantName,
        ttl: '2h'
      });

      at.addGrant({
        roomJoin: true,
        room: params.roomName,
        canPublish: params.canPublish ?? true,
        canSubscribe: params.canSubscribe ?? true,
        canPublishData: params.canPublishData ?? true,
        roomAdmin: params.isHost,
        canUpdateOwnMetadata: true
      });

      return await at.toJwt();
    } catch (err) {
      console.error('[LiveKit] Failed to generate access token:', err);
      return null;
    }
  }

  /**
   * Return initialized RoomServiceClient for administrative operations
   */
  static getRoomServiceClient(): RoomServiceClient | null {
    if (!this.isConfigured()) return null;
    try {
      return new RoomServiceClient(
        config.LIVEKIT_URL!,
        config.LIVEKIT_API_KEY!,
        config.LIVEKIT_API_SECRET!
      );
    } catch (err) {
      console.warn('[LiveKit] Could not initialize RoomServiceClient:', err);
      return null;
    }
  }

  /**
   * Server-side mute participant track in LiveKit room
   */
  static async muteParticipant(
    roomName: string,
    participantIdentity: string,
    trackSid: string,
    muted: boolean
  ): Promise<boolean> {
    const client = this.getRoomServiceClient();
    if (!client) return false;
    try {
      await client.mutePublishedTrack(roomName, participantIdentity, trackSid, muted);
      return true;
    } catch (err) {
      console.warn('[LiveKit] Failed to mute track:', err);
      return false;
    }
  }

  /**
   * Server-side kick participant from LiveKit room
   */
  static async removeParticipant(
    roomName: string,
    participantIdentity: string
  ): Promise<boolean> {
    const client = this.getRoomServiceClient();
    if (!client) return false;
    try {
      await client.removeParticipant(roomName, participantIdentity);
      return true;
    } catch (err) {
      console.warn('[LiveKit] Failed to remove participant:', err);
      return false;
    }
  }
}
