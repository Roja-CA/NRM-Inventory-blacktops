import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // next/headers cookies() is synchronous in Next.js 14
    const cookieStore = cookies();
    const token       = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const user = getUserById(Number(session.userId));
    if (!user || user.status !== 'active') {
      return NextResponse.json(
        { error: 'User not found or account is not active' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id:    user.id,
      name:  user.name,
      email: user.email,
      role:  user.role,
    });
  } catch (err) {
    console.error('[/api/auth/me]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
