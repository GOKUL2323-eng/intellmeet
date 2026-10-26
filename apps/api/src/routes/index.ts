import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import workspaceRoutes from './workspace.routes';
import meetingRoutes from './meeting.routes';
import taskRoutes from './task.routes';
import notificationRoutes from './notification.routes';
import analyticsRoutes from './analytics.routes';
import integrationRoutes from './integration.routes';
import { config } from '../config/env';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'intellmeet-api',
    environment: config.NODE_ENV,
    version: '1.0.0',
    aiProvider: config.AI_PROVIDER
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/meetings', meetingRoutes);
router.use('/tasks', taskRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/integrations', integrationRoutes);

export default router;
