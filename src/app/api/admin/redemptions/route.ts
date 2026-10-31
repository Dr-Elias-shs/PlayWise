// POST /api/admin/redemptions { id, status } — approve or reject a prize request.
// Rejecting gives the PlayBits back. Wisely admins only.
import { readSession, json } from '@/lib/server/session';
import { db } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const s = readSession(req);
  if (!s?.isAdmin) return json({ error: 'Admins only' }, { status: 403 });
  let body: { id?: string; status?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (body.status !== 'approved' && body.status !== 'rejected') return json({ error: 'Bad status' }, { status: 400 });
  const { data, error } = await db().rpc('pw_resolve_redemption', { p_id: body.id, p_status: body.status });
  if (error) return json({ error: error.message }, { status: 500 });
  return data ? json({ ok: true }) : json({ error: 'Already handled' }, { status: 409 });
}
