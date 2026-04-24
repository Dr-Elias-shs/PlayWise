/**
 * Curriculum management — per-grade, per-term, per-subject questions.
 *
 * When a student enters a world room:
 *  1. Fetch active term for their grade from curriculum_terms
 *  2. Fetch curriculum_questions for grade + term + room_subject
 *  3. If found → use those; if empty → fall back to static QUESTION_BANK
 */

import { supabase } from './supabase';

export interface CurriculumQuestion {
  id:            string;
  grade:         string;       // '1'–'12'
  term:          number;       // 1 | 2 | 3
  subject:       string;       // matches room key: 'math', 'science', etc.
  question_text: string;
  choices:       string[];     // exactly 4 choices
  correct_answer: number;      // 0-indexed
  enabled:       boolean;
  created_at:    string;
}

export interface CurriculumTerm {
  grade:   string;
  term:    number;
  enabled: boolean;
}

// ── Subjects that match World room keys ───────────────────────────────────────
export const CURRICULUM_SUBJECTS = [
  { key: 'math',          label: 'Math',          emoji: '➕' },
  { key: 'science',       label: 'Science',        emoji: '🔬' },
  { key: 'computer',      label: 'Computer',       emoji: '💻' },
  { key: 'language_arts', label: 'Language Arts',  emoji: '✏️' },
  { key: 'reading',       label: 'Reading',        emoji: '📖' },
  { key: 'history',       label: 'History',        emoji: '🏛️' },
  { key: 'library',       label: 'Library',        emoji: '📚' },
  { key: 'art',           label: 'Art',            emoji: '🎨' },
  { key: 'music',         label: 'Music',          emoji: '🎵' },
  { key: 'robotics',      label: 'Robotics',       emoji: '🤖' },
  { key: 'kitchen',       label: 'Kitchen / Food', emoji: '🍎' },
  { key: 'cafeteria',     label: 'Cafeteria',      emoji: '🍽️' },
];

// ── Term management ───────────────────────────────────────────────────────────

export async function getTermsForGrade(grade: string): Promise<CurriculumTerm[]> {
  const { data } = await supabase
    .from('curriculum_terms')
    .select('*')
    .eq('grade', grade)
    .order('term');
  // Fill missing terms with disabled defaults
  const existing = data ?? [];
  return [1, 2, 3].map(t => {
    const found = existing.find((r: any) => r.term === t);
    return found ?? { grade, term: t, enabled: false };
  });
}

export async function setTermEnabled(grade: string, term: number, enabled: boolean) {
  return supabase.from('curriculum_terms').upsert(
    { grade, term, enabled },
    { onConflict: 'grade,term' }
  );
}

export async function getActiveTerm(grade: string): Promise<number | null> {
  const { data } = await supabase
    .from('curriculum_terms')
    .select('term')
    .eq('grade', grade)
    .eq('enabled', true)
    .order('term', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.term ?? null;
}

// ── Question management ───────────────────────────────────────────────────────

export async function getQuestions(grade: string, term: number, subject: string): Promise<CurriculumQuestion[]> {
  const { data } = await supabase
    .from('curriculum_questions')
    .select('*')
    .eq('grade', grade)
    .eq('term', term)
    .eq('subject', subject)
    .order('created_at');
  return (data ?? []) as CurriculumQuestion[];
}

export async function addQuestion(q: Omit<CurriculumQuestion, 'id' | 'created_at'>) {
  return supabase.from('curriculum_questions').insert(q);
}

export async function updateQuestion(id: string, updates: Partial<CurriculumQuestion>) {
  return supabase.from('curriculum_questions').update(updates).eq('id', id);
}

export async function deleteQuestion(id: string) {
  return supabase.from('curriculum_questions').delete().eq('id', id);
}

export async function toggleQuestion(id: string, enabled: boolean) {
  return supabase.from('curriculum_questions').update({ enabled }).eq('id', id);
}

// ── Bulk import (from Ollama-parsed text) ─────────────────────────────────────

export async function bulkAddQuestions(
  questions: Omit<CurriculumQuestion, 'id' | 'created_at'>[],
) {
  return supabase.from('curriculum_questions').insert(questions);
}

// ── Runtime: get questions for a student ─────────────────────────────────────

export async function getCurriculumQuestionsForStudent(
  grade: string,
  subject: string,
): Promise<{ text: string; choices: string[]; answer: number } | null> {
  if (!grade) return null;
  const term = await getActiveTerm(grade);
  if (!term) return null;

  const qs = await getQuestions(grade, term, subject);
  const enabled = qs.filter(q => q.enabled);
  if (enabled.length === 0) return null;

  const q = enabled[Math.floor(Math.random() * enabled.length)];
  return { text: q.question_text, choices: q.choices, answer: q.correct_answer };
}

// ── Ollama import ─────────────────────────────────────────────────────────────

export interface ParsedQuestion {
  question: string;
  choices:  string[];
  answer:   number;
}

const OLLAMA_MODELS_PREFERENCE = ['mistral:latest', 'gemma3:4b', 'phi:latest', 'deepseek-r1:7b'];

async function getOllamaModel(): Promise<string> {
  try {
    const r = await fetch('http://localhost:11434/api/tags');
    if (!r.ok) return OLLAMA_MODELS_PREFERENCE[0];
    const { models } = await r.json();
    const names: string[] = (models ?? []).map((m: any) => m.name);
    return OLLAMA_MODELS_PREFERENCE.find(m => names.includes(m)) ?? names[0] ?? 'mistral:latest';
  } catch {
    return 'mistral:latest';
  }
}

export async function parseQuestionsWithOllama(
  rawText: string,
  subject: string,
  onChunk?: (partial: string) => void,
): Promise<ParsedQuestion[]> {
  const model = await getOllamaModel();

  const prompt = `You are an educational test parser. Extract ALL multiple choice questions from the text below and return ONLY a valid JSON array. No explanation, no markdown, just JSON.

Each question must have:
- "question": the question text (string)
- "choices": exactly 4 answer options as strings (array of 4)
- "answer": the index (0-3) of the correct answer

Subject: ${subject}

Text to parse:
---
${rawText}
---

Return ONLY a JSON array like:
[{"question":"...","choices":["A","B","C","D"],"answer":0}]`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: true }),
  });

  if (!response.ok || !response.body) throw new Error('Ollama not reachable');

  let fullText = '';
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Each chunk is a JSON line from Ollama streaming
    for (const line of chunk.split('\n').filter(Boolean)) {
      try {
        const { response: token, done: streamDone } = JSON.parse(line);
        if (token) { fullText += token; onChunk?.(fullText); }
        if (streamDone) break;
      } catch {}
    }
  }

  // Extract JSON array from the response
  const match = fullText.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Ollama did not return a valid JSON array');

  const parsed: ParsedQuestion[] = JSON.parse(match[0]);

  // Validate each question
  return parsed.filter(q =>
    typeof q.question === 'string' &&
    Array.isArray(q.choices) && q.choices.length === 4 &&
    typeof q.answer === 'number' && q.answer >= 0 && q.answer <= 3
  );
}
