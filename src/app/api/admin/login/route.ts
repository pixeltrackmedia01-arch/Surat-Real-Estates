import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminConfigured, checkPassword, createSessionToken } from '@/lib/auth';
import { clientKey, rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ message: 'Admin is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET.' }, { status: 503 });
  }
  if (!rateLimit(`login:${clientKey(req)}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json({ message: 'Too many attempts. Try again later.' }, { status: 429 });
  }
  const { password } = await req.json().catch(() => ({ password: '' }));
  if (typeof password !== 'string' || !(await checkPassword(password))) {
    return NextResponse.json({ message: 'Incorrect password.' }, { status: 401 });
  }
  const { token, maxAge } = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
