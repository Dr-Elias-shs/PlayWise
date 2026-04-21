import { supabase } from './supabase';

// ─── Coin rates ───────────────────────────────────────────────────────────────

export function calcCoins(correctCount: number, maxStreak: number, won: boolean, isMultiplayer: boolean) {
  let coins = correctCount;                          // 1 per correct answer
  if (maxStreak >= 10) coins += 5;                  // streak bonus
  else if (maxStreak >= 5) coins += 3;
  if (isMultiplayer && won) coins += 10;            // win bonus
  return coins;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export async function getWallet(studentName: string) {
  const { data } = await supabase
    .from('player_wallets')
    .select('*')
    .eq('student_name', studentName)
    .single();
  return data;
}

export async function addCoins(
  studentName: string,
  amount: number,
  playTimeSeconds = 0,
  incrementGames = true,
  grade = ''
) {
  const { data: existing } = await supabase
    .from('player_wallets')
    .select('*')
    .eq('student_name', studentName)
    .single();

  if (existing) {
    return supabase.from('player_wallets').update({
      coins: existing.coins + amount,
      total_earned: existing.total_earned + amount,
      play_time_seconds: existing.play_time_seconds + playTimeSeconds,
      games_played: existing.games_played + (incrementGames ? 1 : 0),
      ...(grade ? { grade } : {}),
      updated_at: new Date().toISOString(),
    }).eq('student_name', studentName);
  }

  return supabase.from('player_wallets').insert({
    student_name: studentName,
    coins: amount,
    total_earned: amount,
    total_redeemed: 0,
    play_time_seconds: playTimeSeconds,
    games_played: incrementGames ? 1 : 0,
    grade,
  });
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

export async function getShopItems() {
  const { data } = await supabase
    .from('shop_items')
    .select('*')
    .eq('available', true)
    .order('cost', { ascending: true });
  return data ?? [];
}

export async function getAllShopItems() {
  const { data } = await supabase
    .from('shop_items')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function addShopItem(name: string, description: string, cost: number, emoji: string) {
  return supabase.from('shop_items').insert({ name, description, cost, emoji });
}

export async function toggleShopItem(id: string, available: boolean) {
  return supabase.from('shop_items').update({ available }).eq('id', id);
}

export async function deleteShopItem(id: string) {
  return supabase.from('shop_items').delete().eq('id', id);
}

// ─── Redemptions ──────────────────────────────────────────────────────────────

export async function redeemItem(studentName: string, itemId: string, itemName: string, itemEmoji: string, cost: number) {
  const wallet = await getWallet(studentName);
  if (!wallet || wallet.coins < cost) throw new Error('Not enough coins');

  // Deduct coins
  await supabase.from('player_wallets').update({
    coins: wallet.coins - cost,
    total_redeemed: wallet.total_redeemed + cost,
    updated_at: new Date().toISOString(),
  }).eq('student_name', studentName);

  // Record redemption
  return supabase.from('redemptions').insert({
    student_name: studentName,
    item_id: itemId,
    item_name: itemName,
    item_emoji: itemEmoji,
    cost,
    status: 'pending',
  });
}

export async function getMyRedemptions(studentName: string) {
  const { data } = await supabase
    .from('redemptions')
    .select('*')
    .eq('student_name', studentName)
    .order('redeemed_at', { ascending: false });
  return data ?? [];
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAllWallets() {
  const { data } = await supabase
    .from('player_wallets')
    .select('*')
    .order('coins', { ascending: false });
  return data ?? [];
}

export async function getAllRedemptions() {
  const { data } = await supabase
    .from('redemptions')
    .select('*')
    .order('redeemed_at', { ascending: false });
  return data ?? [];
}

export async function updateRedemptionStatus(id: string, status: 'approved' | 'rejected') {
  return supabase.from('redemptions').update({ status }).eq('id', id);
}

export function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
