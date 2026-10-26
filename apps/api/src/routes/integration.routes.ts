import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { GoogleMeetService } from '../services/googleMeet.service';

const router = Router();

// Google Integration Status
router.get('/google/status', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = await GoogleMeetService.getIntegrationStatus(req.user!._id.toString());
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// Google OAuth Authorization URL
router.get('/google/connect-url', authenticate, (req: Request, res: Response, next: NextFunction): void => {
  try {
    const redirectUri = req.query.redirectUri as string | undefined;
    const url = GoogleMeetService.getOAuthUrl(req.user!._id.toString(), redirectUri);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// Google OAuth Callback Code Exchange
router.post('/google/callback', authenticate, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, redirectUri } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Authorization code is required.' });
      return;
    }

    await GoogleMeetService.exchangeAuthCode(code, req.user!._id.toString(), redirectUri);
    res.json({ message: 'Google Meet account connected successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
