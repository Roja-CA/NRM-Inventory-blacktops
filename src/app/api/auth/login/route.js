import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/lib/db';
import { createToken, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth';

// Force Node.js runtime so we can use fs (bcryptjs also works fine here)
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body     = await request.json();
    const email    = (body.email    || '').toLowerCase().trim();
    const password = (body.password || '');

    const user = getUserByEmail(email);

    // Verify password only when the user exists; always return the same
    // error message so callers cannot tell which field was wrong.
    let passwordOk = false;
    if (user) {
      passwordOk = await bcrypt.compare(password, user.password_hash);
    }

    if (!user || !passwordOk || !user.is_active) {
      return NextResponse.json(
        { error: 'Email or password is incorrect' },
        { status: 401 }
      );
    }

    const token = await createToken({
      userId: user.id,
      email:  user.email,
      role:   user.role,
      name:   user.name,
    });

    const response = NextResponse.json({
      success: true,
      role:    user.role,
      name:    user.name,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   COOKIE_MAX_AGE,
      path:     '/',
    });

    return response;
  } catch (err) {
    console.error('[/api/auth/login]', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
