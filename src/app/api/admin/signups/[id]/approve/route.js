import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { approveUser } from '@/lib/db';

export const runtime = 'nodejs';

async function requireAdmin() {
  const cookieStore = cookies();
  const token       = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  return session?.role === 'admin' ? session : null;
}

/** POST /api/admin/signups/:id/approve */
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id   = Number(params.id);
    const user = approveUser(id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('[POST /api/admin/signups/:id/approve]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
