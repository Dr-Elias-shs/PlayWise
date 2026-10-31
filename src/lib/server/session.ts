// Server-only: the signed PlayWise session cookie.
// It is set by /api/session after the student's Microsoft sign-in has been checked
// with Microsoft Graph (through Wisely when possible), so routes that move PlayBits
// can trust who the player is instead of believing the browser.
import crypto from 'crypto';

export interface PwSession {
  email: string;          // lowercased, the wallet key
  name: string;
  grade: string | null;   // "1".."12" from Wisely, null when Wisely has none
  classroom: string | null;
  linked: boolean;        // true when Wisely knows the account
  isAdmin: boolean;
  isStaff: boolean;
  exp: number;            // unix seconds
}

export const COOKIE = 'pw_session';
export const SESSION_TTL = 12 * 3600;

function secret() {
  const s = process.env.PLAYWISE_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('PLAYWISE_SESSION_SECRET is not set');
  return s;
}

const b64 = (b: Buffer) => b.toString('base64url');
const sign = (body: string) => b64(crypto.createHmac('sha256', secret()).update(body).digest());

export function encodeSession(s: Omit<PwSession, 'exp'>): string {
  const body = b64(Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + SESSION_TTL })));
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined | null): PwSession | null {
  if (!token) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  try {
    const want = Buffer.from(sign(body)), got = Buffer.from(mac);
    if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as PwSession;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export function readSession(req: Request): PwSession | null {
  const raw = req.headers.get('cookie') || '';
  const m = raw.split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  return decodeSession(m ? decodeURIComponent(m.slice(COOKIE.length + 1)) : null);
}

export function sessionCookie(token: string, maxAge = SESSION_TTL) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

// Plain Response, never NextResponse: NextResponse throws under PlayWise's custom server.
export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(init.headers || {}) },
  });
