import { NextResponse, type NextRequest } from 'next/server';

// Public demo (NEXT_PUBLIC_DEMO_MODE=true): the API is read-only so visitors can't
// change shared data or lock each other out. Sign in/out still work.
const ALLOWED_WRITES = new Set(['/api/auth/login', '/api/auth/logout']);

export function proxy(request: NextRequest) {
  if (
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true' &&
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !ALLOWED_WRITES.has(request.nextUrl.pathname)
  ) {
    return NextResponse.json(
      { error: "Demo mode: changes aren't saved. Explore freely!" },
      { status: 403 },
    );
  }
}

export const config = { matcher: '/api/:path*' };
