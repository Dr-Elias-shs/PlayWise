// Browser side of PlayBits. Games report their result here and show what the
// server actually credited; the balance can no longer be written from the browser.
import { msalInstance } from '@/lib/msal';
import { useSessionStore } from '@/store/useSessionStore';
import { useWalletStore } from '@/store/useWalletStore';

export interface PlayResult {
  game: string;
  coins: number;
  correct?: number;
  total?: number;
  level?: string;
  playSeconds?: number;
  chess?: { mode: 'ai' | 'mp'; difficulty?: string; moves?: number; result: 'win' | 'draw' | 'loss'; opponent?: string };
}

export interface AwardReply { credited: number; balance: number | null; earnedToday: number; dailyCap: number }

// POST with the session cookie; if the session ran out, renew it from the
// Microsoft sign-in once and retry.
async function call(path: string, body?: unknown, method = 'POST'): Promise<Response> {
  const go = () => fetch(path, {
    method, credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let r = await go();
  if (r.status === 401) {
    const account = msalInstance.getAllAccounts()[0];
    if (account && await useSessionStore.getState().start(msalInstance, account)) r = await go();
  }
  return r;
}

function setBalance(balance: unknown) {
  if (typeof balance === 'number') useWalletStore.getState().setBalance(balance);
}

/** Report a finished game. Resolves to what was credited (0 on failure). */
export async function awardCoins(result: PlayResult): Promise<AwardReply> {
  try {
    const r = await call('/api/coins/award', result);
    if (!r.ok) return { credited: 0, balance: null, earnedToday: 0, dailyCap: 150 };
    const d = await r.json() as AwardReply;
    setBalance(d.balance);
    return d;
  } catch {
    return { credited: 0, balance: null, earnedToday: 0, dailyCap: 150 };
  }
}

/** Buy a cosmetic. The item unlocks only when ok is true. */
export async function buyItem(kind: 'accessory' | 'outfit' | 'character', id: string)
  : Promise<{ ok: boolean; balance?: number; error?: string }> {
  try {
    const r = await call('/api/coins/buy', { kind, id });
    const d = await r.json();
    setBalance(d.balance);
    return r.ok ? { ok: true, balance: d.balance } : { ok: false, balance: d.balance, error: d.error };
  } catch {
    return { ok: false, error: 'No connection' };
  }
}

/** Ask for a real prize. */
export async function redeemPrize(itemId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await call('/api/coins/redeem', { itemId });
    const d = await r.json();
    setBalance(d.balance);
    return r.ok ? { ok: true } : { ok: false, error: d.error };
  } catch {
    return { ok: false, error: 'No connection' };
  }
}

export async function spinStatus(): Promise<{ games: number; needed: number; spun: boolean } | null> {
  try { const r = await call('/api/coins/spin', undefined, 'GET'); return r.ok ? r.json() : null; } catch { return null; }
}

export async function spin(): Promise<{ prizeId: string; coins: number } | null> {
  try {
    const r = await call('/api/coins/spin');
    if (!r.ok) return null;
    const d = await r.json();
    setBalance(d.balance);
    return d;
  } catch {
    return null;
  }
}

/** Owned items saved on the wallet; the first time, the items this device remembers are moved in. */
export async function syncOwned(local: { accessories: string[]; clothing: string[]; characters: string[] })
  : Promise<{ accessories?: string[]; clothing?: string[]; characters?: string[] } | null> {
  try {
    const r = await call('/api/coins/wallet', undefined, 'GET');
    if (!r.ok) return null;
    const d = await r.json();
    setBalance(d.coins);
    const owned = d.owned || {};
    if (Object.keys(owned).length > 0) return owned;
    const hasLocal = local.accessories.length + local.clothing.length + local.characters.length > 0;
    if (!hasLocal) return owned;
    const r2 = await call('/api/coins/wallet', local);
    return r2.ok ? (await r2.json()).owned : null;
  } catch {
    return null;
  }
}

export async function adminResolveRedemption(id: string, status: 'approved' | 'rejected') {
  const r = await call('/api/admin/redemptions', { id, status });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed');
}

export async function adminMergeWallets(keep: string, drop: string) {
  const r = await call('/api/admin/merge-wallets', { keep, drop });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed');
}
