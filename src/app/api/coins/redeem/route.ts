// POST /api/coins/redeem { itemId } — ask for a real prize from the shop_items list.
import { readSession, json } from '@/lib/server/session';
import { db } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const s = readSession(req);
  if (!s) return json({ error: 'Not signed in' }, { status: 401 });
  let itemId = '';
  try { itemId = String((await req.json()).itemId || ''); } catch { /* empty */ }
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) return json({ error: 'Unknown prize' }, { status: 400 });

  const { data, error } = await db().rpc('pw_redeem', { p_student: s.email, p_item: itemId });
  if (error) return json({ error: 'The request could not be saved' }, { status: 500 });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) return json({ error: row?.error || 'Not possible', balance: row?.balance ?? null }, { status: 402 });
  return json({ ok: true, balance: row.balance });
}
