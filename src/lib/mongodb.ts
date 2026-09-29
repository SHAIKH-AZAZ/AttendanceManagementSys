import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendease365';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  isConnected: boolean;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
  isConnected: false,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<{
  mongoose: typeof mongoose | null;
  isConnected: boolean;
}> {
  if (cached.conn && cached.isConnected) {
    return { mongoose: cached.conn, isConnected: true };
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2000, // Fast failover in 2s if no local mongo
      connectTimeoutMS: 2000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        cached.isConnected = true;
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        cached.isConnected = false;
        console.warn(
          'MongoDB connection unavailable, using resilient in-memory storage mode:',
          err.message
        );
        return null as unknown as typeof mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
    cached.isConnected = !!(cached.conn && mongoose.connection.readyState === 1);
  } catch {
    cached.conn = null;
    cached.isConnected = false;
  }

  return { mongoose: cached.conn, isConnected: cached.isConnected };
}

export function isDatabaseConnected(): boolean {
  return cached.isConnected && mongoose.connection.readyState === 1;
}
