// Eligibility and sign-in checks against the seeded data. Run: bun src/lib/db-service.check.ts
import assert from 'node:assert/strict';
import { dbService, publicUser } from './db-service';

const stats = await dbService.getComplianceStats('course-ds', 'sec-ds-a');
const ananya = stats.find((s) => s.enrollmentNumber === 'CS-2026-003')!;
assert.equal(stats.length, 15);
assert.deepEqual([ananya.attendedLectures, ananya.totalLectures, ananya.percentage], [16, 24, 66.7]);
assert.equal(ananya.isDefaulter, true);
assert.equal(ananya.neededFor75, 8); // (16 + 8) / (24 + 8) = 75%
assert.equal(stats.find((s) => s.enrollmentNumber === 'CS-2026-001')!.neededFor75, 0);

// A student enrolled after sessions were locked isn't counted absent for them.
await dbService.importStudentsRoster('sec-ds-a', [
  { enrollmentNumber: 'CS-2026-900', fullName: 'Late Joiner', email: 'late@univ.edu' },
]);
const after = await dbService.getComplianceStats('course-ds', 'sec-ds-a');
assert.equal(after.length, 15);
assert.ok(!after.some((s) => s.enrollmentNumber === 'CS-2026-900'));

// The student's own summary agrees with the section figures.
const summary = await dbService.getStudentPersonalSummary('stu-4');
assert.equal(summary.courses[0].percentage, 66.7);
assert.equal(summary.courses[0].neededFor75, 8);

// Sign-in requires the right password, and user records never leave with it.
await assert.rejects(dbService.authenticate('rajesh.sharma@univ.edu'));
await assert.rejects(dbService.authenticate('rajesh.sharma@univ.edu', 'wrong'));
const { user } = await dbService.authenticate('rajesh.sharma@univ.edu', 'faculty123');
assert.ok(!('password' in publicUser(user)));

console.log('db-service checks passed');
