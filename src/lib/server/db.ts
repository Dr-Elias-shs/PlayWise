// Server-only Supabase access with the service key, plus the PlayBits helpers the
// /api/coins routes share.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs/promises';

let admin: SupabaseClient | null = null;
export function db(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase service key is not set');
  admin = createClient(url, key, { auth: { persistSession: false } });
  return admin;
}

// Shop prices are looked up here, never taken from the browser.
interface RegistryOutfit { id: string; price: number; category?: string }
export async function registryOutfits(): Promise<RegistryOutfit[]> {
  try {
    const { data } = await db().from('global_config').select('value').eq('key', 'character_registry').maybeSingle();
    if (data?.value?.outfits) return data.value.outfits;
  } catch { /* fall back to the file */ }
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'public', 'characters', 'registry.json'), 'utf-8');
    return JSON.parse(raw).outfits ?? [];
  } catch {
    return [];
  }
}

export async function walletOf(email: string) {
  const { data } = await db().from('player_wallets')
    .select('student_name, coins, banned, owned').eq('student_name', email).maybeSingle();
  return data as { student_name: string; coins: number; banned: boolean; owned: Record<string, string[]> | null } | null;
}

export async function countSince(table: 'game_sessions' | 'coin_transactions', match: Record<string, string>, since: string) {
  let q = db().from(table).select('*', { count: 'exact', head: true }).gte('created_at', since);
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { count } = await q;
  return count ?? 0;
}

/** Like countSince, for one student and a game_id pattern such as 'trivia-%'. */
export async function countLike(table: 'game_sessions' | 'coin_transactions', student: string, pattern: string, since: string) {
  const { count } = await db().from(table).select('*', { count: 'exact', head: true })
    .eq('student_name', student).like('game_id', pattern).gte('created_at', since);
  return count ?? 0;
}
