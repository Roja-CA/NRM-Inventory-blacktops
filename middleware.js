/**
 * Next.js Edge Middleware — runs before every matched request.
 *
 * Rules:
 *  /              → redirect to /login or to the user's dashboard
 *  /login         → redirect authenticated users to their dashboard
 *  /admin/*       → only accessible to admins; others go to their own area or login
 *  /employee/*    → only accessible to employees; others go to their own area or login
 */

import { NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const token   = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  // ── Root: redirect to appropriate destination ──────────────────────────────
  if (pathname === '/') {
    if (!session) return NextResponse.redirect(new URL('/login', request.url));
    return NextResponse.redirect(
      new URL(session.role === 'admin' ? '/admin' : '/employee', request.url)
    );
  }

  // ── Login page: push authenticated users to their dashboard ────────────────
  if (pathname === '/login') {
    if (session) {
      return NextResponse.redirect(
        new URL(session.role === 'admin' ? '/admin' : '/employee', request.url)
      );
    }
    return NextResponse.next();
  }

  // ── Admin area ─────────────────────────────────────────────────────────────
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (!session) return NextResponse.redirect(new URL('/login', request.url));
    if (session.role !== 'admin') {
      // Employee who typed /admin by hand → send to their own area
      return NextResponse.redirect(new URL('/employee', request.url));
    }
    return NextResponse.next();
  }

  // ── Employee area ──────────────────────────────────────────────────────────
  if (pathname === '/employee' || pathname.startsWith('/employee/')) {
    if (!session) return NextResponse.redirect(new URL('/login', request.url));
    if (session.role !== 'employee') {
      // Admin who typed /employee by hand → send to their own area
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Catch-all: runs on every path except Next.js internals and static files.
  // More reliable than listing `/admin/:path*` which may miss the bare path.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
