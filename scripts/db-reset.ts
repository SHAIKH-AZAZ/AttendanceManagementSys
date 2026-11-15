/**
 * Drop the database and load the demo data again.
 * Usage: bun run db:reset --yes   (reads MONGODB_URI from .env.local)
 * Refuses without --yes (or ALLOW_DB_RESET=1), and always when NODE_ENV=production.
 */
import mongoose from 'mongoose';
import { resetAndSeed } from '@/lib/seed';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset a production database.');
  process.exit(1);
}
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is not set (add it to .env.local).');
  process.exit(1);
}

// Dropping a remote database is irreversible: require an explicit confirmation.
const confirmed = process.argv.includes('--yes') || process.env.ALLOW_DB_RESET === '1';
const host = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).hostname;
if (!confirmed) {
  console.error(`This DELETES every collection and uploaded file in the database at ${host}.`);
  console.error('If that database is also used by a deployed app, its data is lost too.');
  console.error('Run again with:  bun run db:reset --yes');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
console.log(`Resetting database "${mongoose.connection.name}" on ${host}…`);
await resetAndSeed();
const counts = await Promise.all(
  ['users', 'sections', 'lecturesessions', 'leaveapplications'].map(async (c) => `${c}: ${await mongoose.connection.db!.collection(c).countDocuments()}`)
);
console.log('Done.', counts.join(', '));
await mongoose.disconnect();
