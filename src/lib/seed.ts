import mongoose from 'mongoose';
// Importing '@/models' registers every model (syncIndexes below relies on that).
import {
  CampusModel,
  CourseModel,
  DepartmentModel,
  LeaveApplicationModel,
  LectureSessionModel,
  SectionModel,
  SystemAuditLogModel,
  TrimesterModel,
  UserModel,
} from '@/models';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CAMPUSES,
  INITIAL_COURSES,
  INITIAL_DEPARTMENTS,
  INITIAL_LEAVES,
  INITIAL_SECTIONS,
  INITIAL_SESSIONS,
  INITIAL_TRIMESTERS,
  INITIAL_USERS,
} from './seed-data';
import { hashPassword } from './password';

/** `{ id, ...rest }` → `{ _id: id, ...rest }` */
const toDoc = <T extends { id: string }>({ id, ...rest }: T) => ({ _id: id, ...rest });

async function insertAll<T>(model: mongoose.Model<T>, docs: object[]) {
  if (!docs.length) return;
  try {
    // ordered:false + ignoring duplicate keys makes concurrent seeding safe.
    await model.insertMany(docs as never[], { ordered: false });
  } catch (err) {
    const e = err as { code?: number; writeErrors?: { code: number }[] };
    const onlyDuplicates = e.code === 11000 || e.writeErrors?.every((w) => w.code === 11000);
    if (!onlyDuplicates) throw err;
  }
}

async function insertSeed() {
  // Build every model's indexes (unique email, one draft per class, …) before inserting.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  await insertAll(CampusModel, INITIAL_CAMPUSES.map(toDoc));
  await insertAll(DepartmentModel, INITIAL_DEPARTMENTS.map(toDoc));
  await insertAll(TrimesterModel, INITIAL_TRIMESTERS.map(toDoc));
  await insertAll(CourseModel, INITIAL_COURSES.map(toDoc));
  await insertAll(SectionModel, INITIAL_SECTIONS.map(toDoc));
  // Seed passwords are plaintext in seed-data; only scrypt hashes are stored.
  await insertAll(
    UserModel,
    INITIAL_USERS.map((u) => toDoc({ ...u, password: u.password ? hashPassword(u.password) : undefined }))
  );
  await insertAll(LectureSessionModel, INITIAL_SESSIONS.map(toDoc));
  await insertAll(LeaveApplicationModel, INITIAL_LEAVES.map(toDoc));
  await insertAll(SystemAuditLogModel, INITIAL_AUDIT_LOGS.map(toDoc));
}

/** Load the demo data when the database has no users yet. */
export async function seedIfEmpty() {
  if ((await UserModel.estimatedDocumentCount()) > 0) return;
  await insertSeed();
}

/**
 * Drop the whole database (every collection, uploaded files included) and load
 * the demo data again. Used by `bun run db:reset`; never call it in production.
 */
export async function resetAndSeed() {
  await mongoose.connection.db!.dropDatabase();
  await insertSeed();
}
