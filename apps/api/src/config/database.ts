import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './env';

let mongod: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<typeof mongoose> {
  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Set mongoose options
  mongoose.set('strictQuery', true);

  try {
    // First try connecting to configured MONGODB_URI with a 2-second timeout
    console.log(`🔌 Attempting connection to MongoDB at: ${config.MONGODB_URI}`);
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log('✅ Connected to MongoDB server successfully.');
    return mongoose;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`⚠️ Could not connect to external MongoDB: ${error.message}`);

    const canUseMemoryFallback = config.NODE_ENV !== 'production' || process.env.ALLOW_IN_MEMORY_DB === 'true';
    if (canUseMemoryFallback) {
      console.log('⚡ Initializing in-memory MongoDB fallback (mongodb-memory-server)...');
      try {
        const launchTimeout = parseInt(process.env.MONGODB_MEMORY_SERVER_LAUNCH_TIMEOUT || '60000', 10);
        mongod = await MongoMemoryServer.create({
          instance: {
            launchTimeout,
            dbName: 'intellmeet'
          }
        });
        const uri = mongod.getUri();
        await mongoose.connect(uri);
        console.log(`✅ Connected to in-memory MongoDB at: ${uri}`);
        return mongoose;
      } catch (memErr) {
        console.error('❌ Failed to start in-memory MongoDB fallback:', memErr);
        console.error('💡 Tip: If you have MongoDB installed locally, ensure it is running or provide MONGODB_URI in .env');
        throw memErr;
      }
    } else {
      console.error('❌ In production mode, MongoDB connection is mandatory.');
      throw err;
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
      mongod = null;
    }
    console.log('🔌 Disconnected from MongoDB.');
  } catch (err) {
    console.error('Error during database disconnection:', err);
  }
}
