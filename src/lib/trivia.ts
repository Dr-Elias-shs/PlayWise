import { supabase } from './supabase';

// ─── Categories ───────────────────────────────────────────────────────────────

export const TRIVIA_CATEGORIES = [
  { id: 'history',    label: 'History',             emoji: '🏛️' },
  { id: 'sls',        label: 'Sagessian Life Skills', emoji: '🌱' },
  { id: 'math',       label: 'Math',                emoji: '🔢' },
  { id: 'languages',  label: 'Languages',           emoji: '📖' },
  { id: 'football',   label: 'Football',            emoji: '⚽' },
  { id: 'formula1',   label: 'Formula 1',           emoji: '🏎️' },
  { id: 'basketball', label: 'Basketball',          emoji: '🏀' },
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
  created_at?: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getTriviaQuestions(
  grade: TriviaGrade,
  category: TriviaCategory,
  difficulty: TriviaLevel,
  limit = 20,
): Promise<TriviaQuestion[]> {
  const { data, error } = await supabase
    .from('trivia_questions')
    .select('*')
    .eq('grade', grade)
    .eq('category', category)
    .eq('difficulty', difficulty)
    .limit(limit);
  if (error) throw error;
  // Shuffle so same questions don't always appear in the same order
  const rows = (data ?? []) as TriviaQuestion[];
  return rows.sort(() => Math.random() - 0.5);
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

async function adminPost(body: unknown): Promise<{ inserted?: number; error?: string }> {
  const res = await fetch('/api/trivia-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function addTriviaQuestion(
  q: Omit<TriviaQuestion, 'id' | 'created_at'>,
): Promise<TriviaQuestion> {
  const json = await adminPost({ rows: [q] });
  if (json.error) throw new Error(json.error);
  // Re-fetch the newly inserted row for its id
  const { data, error } = await supabase
    .from('trivia_questions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data as TriviaQuestion;
}

export async function updateTriviaQuestion(
  id: string,
  q: Partial<Omit<TriviaQuestion, 'id' | 'created_at'>>,
): Promise<void> {
  const res = await fetch('/api/trivia-admin', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, updates: q }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
}

export async function deleteTriviaQuestion(id: string): Promise<void> {
  const res = await fetch('/api/trivia-admin', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
}

export async function bulkInsertTrivia(
  questions: Omit<TriviaQuestion, 'id' | 'created_at'>[],
): Promise<number> {
  const CHUNK = 50;
  let total = 0;
  for (let i = 0; i < questions.length; i += CHUNK) {
    const json = await adminPost({ rows: questions.slice(i, i + CHUNK) });
    if (json.error) throw new Error(json.error);
    total += json.inserted ?? 0;
  }
  return total;
}
