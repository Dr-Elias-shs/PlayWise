// PlayWise session: who is playing, with grade and class from Wisely.
//   POST   { graphToken }  checks the Microsoft token, asks Wisely for grade/class/roles, sets the cookie
//   GET                    returns the current session (or 401)
//   DELETE                 signs out
import { encodeSession, readSession, sessionCookie, json, type PwSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

const SHSAI_URL = (process.env.SHSAI_URL || 'https://shsai.onrender.com').replace(/\/$/, '');

type Identity = Omit<PwSession, 'exp'>;

// Wisely checks the token with Microsoft and adds grade, class and roles.
async function fromWisely(graphToken: string): Promise<Identity | null> {
  const key = process.env.SHSAI_BRIDGE_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${SHSAI_URL}/api/playwise/identity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Key': key },
      body: JSON.stringify({ graph_token: graphToken }),
      signal: AbortSignal.timeout(20000),   // Wisely may be waking up
    });
    if (!r.ok) return null;
    const d = await r.json();
    return {
      // The wallet key is the Microsoft sign-in name, as before the link with Wisely.
      email: String(d.login || d.email || '').toLowerCase(), name: d.name || '',
      grade: d.found ? d.grade ?? null : null, classroom: d.found ? d.classroom ?? null : null,
      linked: !!d.found, isAdmin: !!d.is_admin, isStaff: !!d.is_staff,
    };
  } catch {
    return null;
  }
}

// Fallback when Wisely is unreachable: check the token with Microsoft directly.
async function fromGraph(graphToken: string): Promise<Identity | null> {
  try {
    const r = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${graphToken}` }, signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const me = await r.json();
    const email = String(me.userPrincipalName || me.mail || '').toLowerCase();
    if (!email) return null;
    return { email, name: me.displayName || '', grade: null, classroom: null, linked: false, isAdmin: false, isStaff: false };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let graphToken = '';
  try { graphToken = String((await req.json()).graphToken || ''); } catch { /* empty body */ }
  if (!graphToken) return json({ error: 'graphToken required' }, { status: 400 });

  // A Wisely refusal can also mean a wrong bridge key, so Microsoft has the last word.
  let id = await fromWisely(graphToken);
  if (!id || !id.email) id = await fromGraph(graphToken);
  if (!id) return json({ error: 'Could not verify the Microsoft sign-in' }, { status: 401 });

  const token = encodeSession(id);
  return json(id, { headers: { 'Set-Cookie': sessionCookie(token) } });
}

export async function GET(req: Request) {
  const s = readSession(req);
  return s ? json(s) : json({ error: 'Not signed in' }, { status: 401 });
}

export async function DELETE() {
  return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } });
}
