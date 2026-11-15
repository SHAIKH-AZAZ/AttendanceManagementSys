import type { StoredFile, User } from '@/types';
import { LeaveApplicationModel } from '@/models';
import { connectToDatabase } from '../mongodb';
import { canReadAssignmentFile } from './assignments';

export const fileUrl = (id: string) => `/api/files/${id}`;

/**
 * Who may read an uploaded file: its uploader, admin staff, and people with a
 * reason tied to what the file is attached to.
 */
export async function canReadFile(user: User, meta: StoredFile): Promise<boolean> {
  if (meta.ownerId === user.id || user.role === 'ADMIN_STAFF') return true;
  await connectToDatabase();
  switch (meta.purpose) {
    case 'LEAVE_PROOF':
      // The HOD of the department the leave was filed in.
      return (
        user.role === 'HOD' &&
        !!(await LeaveApplicationModel.exists({ documentUrl: fileUrl(meta.id), departmentId: user.departmentId }))
      );
    case 'ASSIGNMENT':
    case 'SUBMISSION':
      return canReadAssignmentFile(user, meta.id, meta.purpose);
    default:
      return false;
  }
}
