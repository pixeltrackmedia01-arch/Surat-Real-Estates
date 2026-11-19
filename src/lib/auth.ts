/**
 * Minimal admin auth: a single shared password (ADMIN_PASSWORD) exchanged for an HMAC-signed,
 * httpOnly session cookie (ADMIN_SESSION_SECRET). Works in the Edge middleware and Node routes
 * via Web Crypto. For multi-user admin, replace with Supabase Auth (see README).
 */
export const ADMIN_COOKIE = 'sh_admin';
const MAX_AGE_S = 60 * 60 * 8;

const enc = new TextEncoder();
async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 16);
}

export async function createSessionToken(): Promise<{ token: string; maxAge: number }> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  const payload = `admin.${exp}`;
  return { token: `${payload}.${await hmac(process.env.ADMIN_SESSION_SECRET!, payload)}`, maxAge: MAX_AGE_S };
}

export async function verifySessionToken(token?: string): Promise<boolean> {
  if (!token || !adminConfigured()) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [who, exp, sig] = parts;
  if (who !== 'admin' || Number(exp) < Date.now() / 1000) return false;
  return timingSafeEqual(sig, await hmac(process.env.ADMIN_SESSION_SECRET!, `${who}.${exp}`));
}

export async function checkPassword(input: string): Promise<boolean> {
  if (!adminConfigured()) return false;
  // Compare HMACs so the comparison is constant-length.
  const secret = process.env.ADMIN_SESSION_SECRET!;
  return timingSafeEqual(await hmac(secret, input), await hmac(secret, process.env.ADMIN_PASSWORD!));
}
