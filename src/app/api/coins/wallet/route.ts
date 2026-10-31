// GET  /api/coins/wallet — balance and owned items for the signed-in player.
// POST /api/coins/wallet { accessories, clothing, characters } — one-time move of the
//      items this device remembers into the wallet. Only works while the wallet has no
//      owned items yet, and only known item ids are kept.
import { readSession, json } from '@/lib/server/session';
import { db, walletOf, registryOutfits } from '@/lib/server/db';
import { ACCESSORIES } from '@/lib/avatar-items';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const s = readSession(req);
  if (!s) return json({ error: 'Not signed in' }, { status: 401 });
  const w = await walletOf(s.email);
  return json({ coins: w?.coins ?? 0, owned: w?.owned ?? {} });
}

export async function POST(req: Request) {
  const s = readSession(req);
  if (!s) return json({ error: 'Not signed in' }, { status: 401 });
  const w = await walletOf(s.email);
  if (!w) return json({ owned: {} });
  if (w.owned && Object.keys(w.owned).length > 0) return json({ owned: w.owned, imported: false });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty */ }
  const outfits = await registryOutfits();
  const acc = new Set(ACCESSORIES.filter(a => a.category !== 'clothing').map(a => a.id));
  const clo = new Set([...ACCESSORIES.filter(a => a.category === 'clothing').map(a => a.id),
                       ...outfits.filter(o => o.category !== 'characters').map(o => o.id)]);
  const chr = new Set(outfits.filter(o => o.category === 'characters').map(o => o.id));
  const pick = (v: unknown, ok: Set<string>) =>
    Array.from(new Set((Array.isArray(v) ? v : []).map(String).filter(x => ok.has(x)))).slice(0, 100);
  const owned = {
    accessories: pick(body.accessories, acc),
    clothing: pick(body.clothing, clo),
    characters: pick(body.characters, chr),
  };
  const { error } = await db().from('player_wallets').update({ owned }).eq('student_name', s.email);
  if (error) return json({ error: 'Could not save' }, { status: 500 });
  return json({ owned, imported: true });
}
