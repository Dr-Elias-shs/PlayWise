import { supabase } from './supabase';

// ─── Appearance sync ─────────────────────────────────────────────────────────

export async function saveAppearance(
  studentName:        string,
  characterId:        string,
  colorId:            string,
  equippedId?:        string | null,
  equippedClothingId?: string | null,
): Promise<void> {
  if (!studentName) return;
  await supabase.from('player_wallets').upsert(
    {
      student_name:        studentName,
      character_id:        characterId,
      color_id:            colorId,
      equipped_id:         equippedId        ?? null,
      equipped_clothing_id: equippedClothingId ?? null,
      updated_at:          new Date().toISOString(),
    },
    { onConflict: 'student_name' },
  );
}

// ─── Ban management ───────────────────────────────────────────────────────────

export async function banPlayer(studentName: string, reason = '') {
  return supabase
    .from('player_wallets')
    .update({ banned: true, ban_reason: reason, updated_at: new Date().toISOString() })
    .eq('student_name', studentName);
}

export async function unbanPlayer(studentName: string) {
  return supabase
    .from('player_wallets')
    .update({ banned: false, ban_reason: null, updated_at: new Date().toISOString() })
    .eq('student_name', studentName);
}

export async function checkBanned(studentName: string): Promise<{ banned: boolean; reason: string }> {
  const { data } = await supabase
    .from('player_wallets')
    .select('banned, ban_reason')
    .eq('student_name', studentName)
    .maybeSingle();
  return { banned: !!(data as any)?.banned, reason: (data as any)?.ban_reason ?? '' };
}

// ─── Grade change requests ────────────────────────────────────────────────────

export interface GradeChangeRequest {
  id:               string;
  student_name:     string;
  display_name:     string;
  current_grade:    string;
  requested_grade:  string;
  status:           'pending' | 'approved' | 'rejected';
  created_at:       string;
}

export async function submitGradeChangeRequest(
  studentName:    string,
  displayName:    string,
  currentGrade:   string,
  requestedGrade: string,
) {
  // Cancel any existing pending request before submitting a new one
  await supabase
    .from('grade_change_requests')
    .delete()
    .eq('student_name', studentName)
    .eq('status', 'pending');
  return supabase.from('grade_change_requests').insert({
    student_name:    studentName,
    display_name:    displayName,
    current_grade:   currentGrade,
    requested_grade: requestedGrade,
    status:          'pending',
  });
}

export async function getMyGradeRequest(studentName: string): Promise<GradeChangeRequest | null> {
  const { data } = await supabase
    .from('grade_change_requests')
    .select('*')
    .eq('student_name', studentName)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as GradeChangeRequest | null;
}

export async function getApprovedGradeFromDB(studentName: string): Promise<string | null> {
  const { data } = await supabase
    .from('grade_change_requests')
    .select('requested_grade')
    .eq('student_name', studentName)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { requested_grade: string } | null)?.requested_grade ?? null;
}

export async function getAllGradeRequests(): Promise<GradeChangeRequest[]> {
  const { data } = await supabase
    .from('grade_change_requests')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as GradeChangeRequest[];
}

export async function resolveGradeRequest(
  id:          string,
  status:      'approved' | 'rejected',
  studentName: string,
  newGrade:    string,
) {
  await supabase.from('grade_change_requests').update({ status }).eq('id', id);
  if (status === 'approved') {
    await supabase.from('player_wallets').update({ grade: newGrade }).eq('student_name', studentName);
  }
}

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
  const { data, error } = await supabase
    .from('player_wallets')
    .select('*')
    .eq('student_name', studentName)
    .maybeSingle();
  if (error) console.error('getWallet error:', error.message);
  return data;
}

// PlayBits are earned and spent only through the server (/api/coins, src/lib/coinsClient.ts).

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

export async function getAllScores() {
  const { data } = await supabase
    .from('scores')
    .select('*')
    .order('timestamp', { ascending: false });
  return data ?? [];
}

export async function getAllTransactions() {
  const { data } = await supabase
    .from('coin_transactions')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getAllSessions() {
  const { data } = await supabase
    .from('game_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getGlobalConfig(key: string) {
  const { data, error } = await supabase
    .from('global_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) console.error('getGlobalConfig error:', error.message);
  return data?.value;
}

export async function setGlobalConfig(key: string, value: any) {
  console.log(`Saving global config [${key}]:`, value);
  const { data, error } = await supabase
    .from('global_config')
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
    .select();
  
  if (error) {
    console.error('setGlobalConfig error:', error.message);
  } else {
    console.log('Global config saved successfully:', data);
  }
  return { error };
}

export async function syncGradesToLearningScores(): Promise<number> {
  // Fetch all wallets that have a grade
  const { data: wallets } = await supabase
    .from('player_wallets')
    .select('student_name, grade')
    .not('grade', 'is', null)
    .neq('grade', '');
  if (!wallets || wallets.length === 0) return 0;

  // For each, update learning_scores grade if entry exists and grade is blank
  let fixed = 0;
  await Promise.all(wallets.map(async w => {
    const { data: ls } = await supabase
      .from('learning_scores')
      .select('student_name, grade')
      .eq('student_name', w.student_name)
      .maybeSingle();
    if (ls && (!ls.grade || ls.grade === '')) {
      await supabase.from('learning_scores')
        .update({ grade: w.grade })
        .eq('student_name', w.student_name);
      fixed++;
    }
  }));
  return fixed;
}

export function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
