import { NextResponse } from 'next/server';
import { dbService } from '@/lib/db-service';
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
      users,
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
        { error: 'Email, Full Name, and Role are required.' },
        { status: 400 }
      );
    }

    const newUser = await dbService.createUser({
      email,
      fullName,
      role,
      campusId: campusId || 'campus-1',
      departmentId: departmentId || 'dept-cs',
      password: password || 'welcome123',
      employeeCode,
      enrollmentNumber,
      academicYear,
    });

    return NextResponse.json(
      {
        message: 'User created successfully.',
        user: newUser,
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
