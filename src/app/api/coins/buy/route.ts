// POST /api/coins/buy { kind, id } — buy a cosmetic. The price is looked up here.
//   kind 'accessory'  an item from src/lib/avatar-items.ts (hats, extras, small clothing)
//   kind 'outfit'     a clothing outfit from the character registry
//   kind 'character'  a character unlock from the character registry
import { readSession, json } from '@/lib/server/session';
import { db, registryOutfits } from '@/lib/server/db';
import { ACCESSORIES } from '@/lib/avatar-items';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const s = readSession(req);
  if (!s) return json({ error: 'Not signed in' }, { status: 401 });
  let body: { kind?: string; id?: string };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, { status: 400 }); }
  const id = String(body.id || '');

  let price: number | undefined, owned: 'accessories' | 'clothing' | 'characters' | undefined;
  if (body.kind === 'accessory') {
    const a = ACCESSORIES.find(x => x.id === id);
    if (a) { price = a.price; owned = a.category === 'clothing' ? 'clothing' : 'accessories'; }
  } else if (body.kind === 'outfit' || body.kind === 'character') {
    const o = (await registryOutfits()).find(x => x.id === id);
    const isChar = o?.category === 'characters';
    if (o && isChar === (body.kind === 'character')) { price = o.price; owned = isChar ? 'characters' : 'clothing'; }
  }
  if (price === undefined || !owned) return json({ error: 'Unknown item' }, { status: 404 });

  const { data, error } = await db().rpc('pw_spend', {
    p_student: s.email, p_amount: Math.max(0, price), p_reason: `${body.kind}:${id}`, p_kind: owned, p_item: id,
  });
  if (error) return json({ error: 'Purchase could not be saved' }, { status: 500 });
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) return json({ error: 'Not enough PlayBits', balance: row?.balance ?? 0 }, { status: 402 });
  return json({ ok: true, balance: row.balance, already: !!row.already, owned, id });
}
