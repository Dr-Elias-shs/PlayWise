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
  category: TriviaCategory,
  difficulty: TriviaLevel,
  limit = 20,
): Promise<TriviaQuestion[]> {
  const { data, error } = await supabase
    .from('trivia_questions')
    .select('*')
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

export async function addTriviaQuestion(
  q: Omit<TriviaQuestion, 'id' | 'created_at'>,
): Promise<TriviaQuestion> {
  const { data, error } = await supabase
    .from('trivia_questions')
    .insert(q)
    .select()
    .single();
  if (error) throw error;
  return data as TriviaQuestion;
}

export async function updateTriviaQuestion(
  id: string,
  q: Partial<Omit<TriviaQuestion, 'id' | 'created_at'>>,
): Promise<void> {
  const { error } = await supabase.from('trivia_questions').update(q).eq('id', id);
  if (error) throw error;
}

export async function deleteTriviaQuestion(id: string): Promise<void> {
  const { error } = await supabase.from('trivia_questions').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkInsertTrivia(
  questions: Omit<TriviaQuestion, 'id' | 'created_at'>[],
): Promise<number> {
  const CHUNK = 50;
  let total = 0;
  for (let i = 0; i < questions.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('trivia_questions')
      .insert(questions.slice(i, i + CHUNK))
      .select('id');
    if (error) throw error;
    total += (data ?? []).length;
  }
  return total;
}
