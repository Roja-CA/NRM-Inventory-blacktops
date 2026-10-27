import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { rejectUser } from '@/lib/db';

export const runtime = 'nodejs';

async function requireAdmin() {
  const cookieStore = cookies();
  const token       = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  return session?.role === 'admin' ? session : null;
}

/** POST /api/admin/signups/:id/reject  Body: { note?: string } */
export async function POST(request, { params }) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id   = Number(params.id);
    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note.slice(0, 500) : null;

    const user = rejectUser(id, note);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error('[POST /api/admin/signups/:id/reject]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
