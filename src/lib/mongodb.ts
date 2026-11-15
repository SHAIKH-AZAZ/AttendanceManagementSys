import mongoose from 'mongoose';

/*
 * One shared MongoDB connection per server process (cached on globalThis so
 * Next.js hot reloads and serverless warm starts reuse it). There is no
 * in-memory fallback: if the database is unreachable, requests fail loudly.
 */

declare global {
  // eslint-disable-next-line no-var
  var __mongoose: { conn: Promise<typeof mongoose> | null; seeded: Promise<void> | null } | undefined;
}

const cache = (globalThis.__mongoose ??= { conn: null, seeded: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local (development) or the host environment (production).');
  }
  cache.conn ??= mongoose
    .connect(uri, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 10 })
    .catch((err) => {
      cache.conn = null; // let the next request retry
      throw err;
    });
  const m = await cache.conn;

  // First connection to an empty database: load the demo data — but never in
  // production unless explicitly asked (it creates logins with known passwords).
  const seedAllowed = process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_DATA === 'true';
  cache.seeded ??= (seedAllowed ? import('./seed').then(({ seedIfEmpty }) => seedIfEmpty()) : Promise.resolve()).catch((err) => {
    cache.seeded = null;
    throw err;
  });
  await cache.seeded;
  return m;
}
