import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, createUser } from '@/lib/db';

export const runtime = 'nodejs';

// ── Simple in-memory rate limiter ──────────────────────────────────────────
// 5 signup attempts per IP per 15 minutes.
const _attempts = new Map();

function checkRateLimit(ip) {
  const now    = Date.now();
  const WINDOW = 15 * 60 * 1000; // 15 min
  const MAX    = 5;

  let rec = _attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + WINDOW };
  }

  if (rec.count >= MAX) {
    _attempts.set(ip, rec);
    const waitMin = Math.ceil((rec.resetAt - now) / 60000);
    return { ok: false, waitMin };
  }

  rec.count += 1;
  _attempts.set(ip, rec);
  return { ok: true };
}

// ── Validation helpers ─────────────────────────────────────────────────────
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

// ── POST /api/auth/signup ──────────────────────────────────────────────────
export async function POST(request) {
  try {
    // Rate-limit by IP
    const ip    = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const limit = checkRateLimit(ip);
    if (!limit.ok) {
      return NextResponse.json(
        { error: `Too many sign-up attempts. Please wait ${limit.waitMin} minute(s) and try again.` },
        { status: 429 }
      );
    }

    const body            = await request.json();
    const name            = (body.name            || '').trim();
    const email           = (body.email           || '').toLowerCase().trim();
    const phone           = (body.phone           || '').replace(/\s/g, '');
    const password        = (body.password        || '');
    const confirmPassword = (body.confirmPassword || '');

    // ── Server-side validation ─────────────────────────────────────────────
    const errors = {};

    if (!name)                              errors.name     = 'Full name is required.';
    if (!email)                             errors.email    = 'Email address is required.';
    else if (!validateEmail(email))         errors.email    = 'Enter a valid email address.';
    if (!phone)                             errors.phone    = 'Phone number is required.';
    else if (!validatePhone(phone))         errors.phone    = 'Phone must be exactly 10 digits.';
    if (!password)                          errors.password = 'Password is required.';
    else if (password.length < 8)           errors.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword)       errors.confirmPassword = 'Passwords do not match.';

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    // ── Email uniqueness ───────────────────────────────────────────────────
    if (getUserByEmail(email)) {
      return NextResponse.json(
        { errors: { email: 'This email address is already registered.' } },
        { status: 422 }
      );
    }

    // ── Create user (always pending + employee — role cannot be overridden) ─
    const passwordHash = await bcrypt.hash(password, 12);
    createUser({ name, email, phone, passwordHash });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('[/api/auth/signup]', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
