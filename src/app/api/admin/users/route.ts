import { NextResponse } from 'next/server';
import { dbService, publicUser } from '@/lib/db-service';
import { UserRole } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as UserRole | null;
    const campusId = searchParams.get('campusId');
    const departmentId = searchParams.get('departmentId');
    const query = searchParams.get('query')?.toLowerCase();

    let users = await dbService.getUsers();

    if (role) {
      users = users.filter((u) => u.role === role);
    }
    if (campusId) {
      users = users.filter((u) => u.campusId === campusId);
    }
    if (departmentId) {
      users = users.filter((u) => u.departmentId === departmentId);
    }
    if (query) {
      users = users.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.studentProfile?.enrollmentNumber?.toLowerCase().includes(query) ||
          u.facultyProfile?.employeeCode?.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      total: users.length,
      users: users.map(publicUser),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      fullName,
      role,
      campusId,
      departmentId,
      password,
      employeeCode,
      enrollmentNumber,
      academicYear,
    } = body;

    if (!email || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, full name and role are required.' },
        { status: 400 }
      );
    }
    if (!['STUDENT', 'FACULTY', 'HOD', 'ADMIN_STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Unknown role.' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'The initial password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const newUser = await dbService.createUser({
      email,
      fullName,
      role,
      campusId: campusId || 'campus-1',
      departmentId: role === 'ADMIN_STAFF' ? undefined : departmentId || 'dept-cs',
      password,
      employeeCode,
      enrollmentNumber,
      academicYear,
    });

    return NextResponse.json(
      {
        message: 'User created successfully.',
        user: publicUser(newUser),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
