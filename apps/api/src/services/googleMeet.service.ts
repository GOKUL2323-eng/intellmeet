import mongoose from 'mongoose';
import crypto from 'crypto';
import { config } from '../config/env';
import { UserModel, IUserDocument } from '../models/User';
import { MeetingModel, IMeetingDocument } from '../models/Meeting';
import { MeetingStatus } from '@intellmeet/shared';

export interface IGoogleIntegrationStatus {
  configured: boolean;
  connected: boolean;
  clientIdAvailable: boolean;
}

export class GoogleMeetService {
  static isConfigured(): boolean {
    return Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
  }

  static async getIntegrationStatus(userId: string): Promise<IGoogleIntegrationStatus> {
    const configured = this.isConfigured();
    if (!configured) {
      return {
        configured: false,
        connected: false,
        clientIdAvailable: Boolean(config.GOOGLE_CLIENT_ID)
      };
    }

    const user = await UserModel.findById(userId);
    const connected = Boolean(
      user?.googleTokens?.accessToken || user?.googleTokens?.refreshToken
    );

    return {
      configured: true,
      connected,
      clientIdAvailable: true
    };
  }

  static getOAuthUrl(userId: string, redirectUri?: string): string {
    if (!this.isConfigured()) {
      throw {
        statusCode: 503,
        message: 'Google Cloud credentials are not configured. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
      };
    }

    const callbackUrl =
      redirectUri ||
      config.GOOGLE_REDIRECT_URI ||
      `${config.CLIENT_URL}/integrations/google/callback`;

    const scopes = [
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: config.GOOGLE_CLIENT_ID!,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: userId
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  static async exchangeAuthCode(code: string, userId: string, redirectUri?: string): Promise<void> {
    if (!this.isConfigured()) {
      throw {
        statusCode: 503,
        message: 'Google Cloud credentials are not configured.'
      };
    }

    const callbackUrl =
      redirectUri ||
      config.GOOGLE_REDIRECT_URI ||
      `${config.CLIENT_URL}/integrations/google/callback`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID!,
        client_secret: config.GOOGLE_CLIENT_SECRET!,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code'
      }).toString()
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw {
        statusCode: 400,
        message: `Failed to exchange Google authorization code: ${errText}`
      };
    }

    const data: any = await tokenRes.json();
    const user = await UserModel.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);

    user.googleTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || user.googleTokens?.refreshToken,
      expiresAt,
      scope: data.scope
    };

    await user.save();
  }

  private static async getValidAccessToken(user: IUserDocument): Promise<string> {
    if (!user.googleTokens?.accessToken && !user.googleTokens?.refreshToken) {
      throw {
        statusCode: 400,
        message: 'Your account is not connected to Google Meet. Please connect your Google account first.'
      };
    }

    // Check if token is still valid (with 60-second buffer)
    const isExpired = user.googleTokens.expiresAt
      ? new Date(user.googleTokens.expiresAt).getTime() - 60000 < Date.now()
      : false;

    if (!isExpired && user.googleTokens.accessToken) {
      return user.googleTokens.accessToken;
    }

    // Refresh token
    if (!user.googleTokens.refreshToken) {
      throw {
        statusCode: 401,
        message: 'Google authorization has expired. Please reconnect your Google account.'
      };
    }

    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.GOOGLE_CLIENT_ID!,
        client_secret: config.GOOGLE_CLIENT_SECRET!,
        refresh_token: user.googleTokens.refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });

    if (!refreshRes.ok) {
      throw {
        statusCode: 401,
        message: 'Could not refresh Google access token. Please re-authorize Google integration.'
      };
    }

    const data: any = await refreshRes.json();
    user.googleTokens.accessToken = data.access_token;
    user.googleTokens.expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000);
    await user.save();

    return data.access_token;
  }

  static async createGoogleMeeting(
    userId: string,
    workspaceId: string,
    params: {
      title: string;
      description?: string;
      scheduledStartTime: Date;
      scheduledEndTime: Date;
    }
  ): Promise<IMeetingDocument> {
    if (!this.isConfigured()) {
      throw {
        statusCode: 503,
        message:
          'Google Cloud credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured. Please configure them in your environment to create Google Meet spaces.'
      };
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.' };
    }

    const accessToken = await this.getValidAccessToken(user);

    let meetingUri = '';
    let spaceName = '';
    let calendarEventId: string | undefined;

    // Strategy 1: Google Meet REST API v2 (spaces.create)
    try {
      const meetRes = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            accessType: 'OPEN'
          }
        })
      });

      if (meetRes.ok) {
        const meetData: any = await meetRes.json();
        meetingUri = meetData.meetingUri || `https://meet.google.com/${meetData.meetingCode}`;
        spaceName = meetData.name || '';
      }
    } catch (meetErr) {
      console.warn('Google Meet API v2 call failed, attempting Calendar fallback:', meetErr);
    }

    // Strategy 2: Google Calendar API with conferenceData fallback
    if (!meetingUri) {
      const calRes = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            summary: params.title,
            description: params.description || 'IntellMeet Scheduled Google Meet',
            start: { dateTime: params.scheduledStartTime.toISOString() },
            end: { dateTime: params.scheduledEndTime.toISOString() },
            conferenceData: {
              createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: 'hangoutsMeet' }
              }
            }
          })
        }
      );

      if (!calRes.ok) {
        const errJson = await calRes.text();
        throw {
          statusCode: 502,
          message: `Google API rejected meeting space creation: ${errJson}`
        };
      }

      const calData: any = await calRes.json();
      calendarEventId = calData.id;
      const videoEntry = calData.conferenceData?.entryPoints?.find(
        (ep: any) => ep.entryPointType === 'video'
      );
      meetingUri = videoEntry?.uri || calData.hangoutLink;
    }

    if (!meetingUri) {
      throw {
        statusCode: 502,
        message: 'Google Meet link was not returned by Google services.'
      };
    }

    const meetingCode = `gmeet-${crypto.randomBytes(4).toString('hex')}`;

    const meeting = await MeetingModel.create({
      meetingCode,
      title: params.title,
      description: params.description || '',
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      hostId: new mongoose.Types.ObjectId(userId),
      scheduledStartTime: params.scheduledStartTime,
      scheduledEndTime: params.scheduledEndTime,
      status: MeetingStatus.SCHEDULED,
      provider: 'google_meet',
      googleMeetUrl: meetingUri,
      googleMeetSpaceId: spaceName,
      googleCalendarEventId: calendarEventId,
      accessSettings: {
        allowGuests: true,
        waitingRoom: false,
        defaultMute: false,
        allowScreenShare: true,
        allowChat: true,
        allowUnmute: true,
        allowCamera: true
      }
    });

    return meeting;
  }
}
