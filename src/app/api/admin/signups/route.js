import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getSignups } from '@/lib/db';

export const runtime = 'nodejs';

async function requireAdmin() {
  const cookieStore = cookies();
  const token       = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  return session?.role === 'admin' ? session : null;
}

/** GET /api/admin/signups?status=pending|active|rejected */
export async function GET(request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const signups = getSignups(status);
    return NextResponse.json({ signups });
  } catch (err) {
    console.error('[GET /api/admin/signups]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
