import { supabase } from './supabase';

// ─── Categories ───────────────────────────────────────────────────────────────

export const TRIVIA_CATEGORIES = [
  { id: 'history',    label: 'History',             emoji: '🏛️' },
  { id: 'sls',        label: 'Sagessian Life Skills', emoji: '🌱' },
  { id: 'math',       label: 'Math',                emoji: '🔢' },
  { id: 'languages',  label: 'Languages',           emoji: '📖' },
  { id: 'football',   label: 'Football',            emoji: '⚽' },
  { id: 'formula1',   label: 'Formula 1',           emoji: '🏎️' },
  { id: 'basketball',    label: 'Basketball',          emoji: '🏀' },
  { id: 'robotics_guys', label: 'Robotics Guys',        emoji: '🤖' },
] as const;

export type TriviaCategory = typeof TRIVIA_CATEGORIES[number]['id'];
export type TriviaGrade    = '1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12';
export type TriviaLevel    = 'easy'|'medium'|'hard';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];        // exactly 4 options
  correct_index: number;   // 0-3
  category: TriviaCategory;
  grade: TriviaGrade;
  difficulty: TriviaLevel;
  source?: string;
  explanation?: string | null;
  status?: 'legacy' | 'pending' | 'approved' | 'rejected';
  report_count?: number;
  created_at?: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

// Recently seen question ids per category, so a student does not get the same round twice.
const SEEN_KEY = 'playwise_trivia_seen';
function seen(category: string): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}')[category] ?? []; } catch { return []; }
}
export function markSeen(category: string, ids: string[]) {
  try {
    const all = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
    all[category] = [...ids, ...(all[category] ?? [])].slice(0, 120);
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch { /* storage blocked */ }
}

// Live (approved or legacy) questions for one round: the student's grade first,
// random order, skipping ones seen recently. If too few are left, seen ones come back.
export async function getTriviaQuestions(
  category: TriviaCategory,
  difficulty: TriviaLevel,
  limit = 20,
  grade?: string | null,
): Promise<TriviaQuestion[]> {
  const g = grade && /^\d+$/.test(grade) ? Number(grade) : null;
  const pick = async (exclude: string[]) => {
    const { data, error } = await supabase.rpc('pick_trivia', {
      p_category: category, p_difficulty: difficulty, p_grade: g, p_n: limit, p_exclude: exclude,
    });
    if (error) throw error;
    return (data ?? []) as TriviaQuestion[];
  };
  let rows = await pick(seen(category));
  if (rows.length < limit) rows = await pick([]);
  return rows;
}

// "Report this question" (three reports send it back to review).
export async function reportQuestion(bank: 'trivia' | 'spelling', id: string): Promise<void> {
  await supabase.rpc('report_question', { p_bank: bank, p_id: id });
}

// Staff edits go through the server (/api/questions); the browser key is read-only.
async function staff(body: Record<string, unknown>) {
  const r = await fetch('/api/questions', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Not allowed');
  return d;
}

export async function getAllTriviaForAdmin(
  grade?: TriviaGrade,
  category?: TriviaCategory,
): Promise<TriviaQuestion[]> {
  let q = supabase
    .from('trivia_questions')
    .select('*')
    .order('created_at', { ascending: false });
  if (grade)    q = q.eq('grade', grade);
  if (category) q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TriviaQuestion[];
}

// New and edited questions are 'pending' until approved in Wisely.
export async function addTriviaQuestion(
  q: Omit<TriviaQuestion, 'id' | 'created_at'>,
): Promise<TriviaQuestion> {
  return staff({ bank: 'trivia', op: 'insert', question: q });
}

export async function updateTriviaQuestion(
  id: string,
  q: Partial<Omit<TriviaQuestion, 'id' | 'created_at'>>,
): Promise<void> {
  await staff({ bank: 'trivia', op: 'update', id, question: q });
}

export async function deleteTriviaQuestion(id: string): Promise<void> {
  await staff({ bank: 'trivia', op: 'delete', id });
}

export async function clearAllTrivia(): Promise<void> {
  await staff({ bank: 'trivia', op: 'clear' });
}

export async function bulkInsertTrivia(
  questions: Omit<TriviaQuestion, 'id' | 'created_at'>[],
): Promise<number> {
  return (await staff({ bank: 'trivia', op: 'bulk', questions })).inserted ?? 0;
}
