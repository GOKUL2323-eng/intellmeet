import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { createApp } from './app';
import { setupSocketHandlers } from './sockets/socketHandler';
import { setNotificationSocketIO } from './services/notification.service';
import { UserModel } from './models/User';
import { seedDatabase } from './seed';

async function bootstrap() {
  try {
    // 1. Connect to MongoDB (or Memory fallback)
    await connectDatabase();

    // 2. Auto-seed initial demo data if database is empty
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('🌱 No users found in database. Auto-seeding initial demo data...');
      await seedDatabase(false);
    }

    // 2. Initialize Express App
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Socket.io
    const allowedOrigins = config.CORS_ORIGINS.split(',').map(o => o.trim());
    const io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          if (
            config.NODE_ENV !== 'production' &&
            (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
          ) {
            return callback(null, true);
          }
          return callback(new Error('Origin not allowed by CORS'));
        },
        credentials: true
      },
      pingTimeout: 30000,
      pingInterval: 10000
    });

    setNotificationSocketIO(io);
    setupSocketHandlers(io);

    // 4. Start HTTP Server
    server.listen(config.PORT, () => {
      console.log('====================================================');
      console.log(`🚀 INTELLMEET API & WEBRTC SERVER ONLINE`);
      console.log(`📡 URL: http://localhost:${config.PORT}`);
      console.log(`🛡️  Environment: ${config.NODE_ENV}`);
      console.log(`🤖 AI Provider: ${config.AI_PROVIDER}`);
      console.log(`🔌 Health check: http://localhost:${config.PORT}/api/v1/health`);
      console.log('====================================================');
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        io.close();
        await disconnectDatabase();
        console.log('👋 Process terminated safely.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Fatal error during server startup:', error);
    process.exit(1);
  }
}

bootstrap();
