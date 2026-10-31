// POST /api/admin/merge-wallets { keep, drop } — fold a duplicate wallet into another. Admins only.
import { readSession, json } from '@/lib/server/session';
import { db } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const s = readSession(req);
  if (!s?.isAdmin) return json({ error: 'Admins only' }, { status: 403 });
  let body: { keep?: string; drop?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  if (!body.keep || !body.drop || body.keep === body.drop) return json({ error: 'Bad request' }, { status: 400 });
  const { data, error } = await db().rpc('pw_merge_wallets', { p_keep: body.keep, p_drop: body.drop });
  if (error) return json({ error: error.message }, { status: 500 });
  return data ? json({ ok: true }) : json({ error: 'Wallet not found' }, { status: 404 });
}
