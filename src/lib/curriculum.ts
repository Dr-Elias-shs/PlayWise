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

// Module-level rotation — persists for the browser session, resets on page reload.
const _rotation: Record<string, number> = {};  // "grade_term_subject" → next index
const _lastTerm:  Record<string, number> = {};  // grade → last active term (cached)

export async function getCurriculumQuestionsForStudent(
  grade: string,
  subject: string,
): Promise<{ text: string; choices: string[]; answer: number } | null> {
  if (!grade) {
    console.warn('[Curriculum] No grade — falling back to static bank');
    return null;
  }
  const term = await getActiveTerm(grade);
  if (!term) {
    console.warn(`[Curriculum] No active term for grade ${grade} — enable a term in Admin › Curriculum`);
    return null;
  }
  _lastTerm[grade] = term;

  const qs = await getQuestions(grade, term, subject);
  const enabled = qs.filter(q => q.enabled);
  console.log(`[Curriculum] grade=${grade} term=${term} subject=${subject} → ${enabled.length} enabled questions`);
  if (enabled.length === 0) return null;

  // Read current index but do NOT advance yet — advance only on correct answer
  const key = `${grade}_${term}_${subject}`;
  const idx = (_rotation[key] ?? 0) % enabled.length;

  const q = enabled[idx];
  return { text: q.question_text, choices: q.choices, answer: q.correct_answer };
}

// Call this when the student answers correctly to move to the next question.
export function advanceCurriculumQuestion(grade: string, subject: string): void {
  const term = _lastTerm[grade];
  if (!term) return;
  const key = `${grade}_${term}_${subject}`;
  _rotation[key] = (_rotation[key] ?? 0) + 1;
}

// ── Ollama import ─────────────────────────────────────────────────────────────

export interface ParsedQuestion {
  question: string;
  choices:  string[];
  answer:   number;
  expr?:    string;   // math only: the arithmetic that solves it, e.g. "(3+5)/2"
}

const OLLAMA_MODELS_PREFERENCE = ['mistral:latest', 'gemma3:4b', 'phi:latest', 'deepseek-r1:7b'];

// ── Numeric answer verification ───────────────────────────────────────────────
// Small local models routinely mark the wrong choice on arithmetic questions
// (e.g. "(7+3)/2" tagged as 3 instead of 5). When a question's choices are all
// numeric and its text holds a clean arithmetic expression, we recompute the
// answer and trust the math over the model.

function toNum(s: string): number | null {
  const m = String(s).replace(/[, ]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function fmtNum(v: number): string {
  const r = Math.round(v);
  return Math.abs(v - r) < 1e-9 ? String(r) : String(Math.round(v * 100) / 100);
}

function safeEval(raw: string): number | null {
  const e = raw.replace(/[×✕·]/g, '*').replace(/[÷]/g, '/').replace(/[−–—]/g, '-');
  if (!/\d/.test(e) || !/[+\-*/]/.test(e)) return null;     // need a digit and an operator
  if (!/^[0-9.+\-*/()\s]+$/.test(e)) return null;            // whitelist only — safe to evaluate
  let depth = 0;
  for (const c of e) { if (c === '(') depth++; else if (c === ')' && --depth < 0) return null; }
  if (depth !== 0) return null;
  try {
    const v = Function(`"use strict";return (${e});`)();
    return typeof v === 'number' && isFinite(v) ? v : null;
  } catch { return null; }
}

function extractExpression(text: string): string | null {
  const norm = text.replace(/[×✕·]/g, '*').replace(/[÷]/g, '/').replace(/[−–—]/g, '-');
  const matches = norm.match(/[0-9.()\s]*[+\-*/][0-9.+\-*/()\s]*/g);
  if (!matches) return null;
  const cands = matches.map(m => m.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  for (const c of cands) if (safeEval(c) !== null) return c;
  return null;
}

// Verify/correct the marked answer for numeric questions using the model's own
// formula (preferred) or an expression embedded in the question text.
// Returns { q: corrected question, whole: true if the answer is a whole number }.
// `whole` lets the caller prefer integer-answer math but never end up with zero.
function verifyNumericAnswer(q: ParsedQuestion): { q: ParsedQuestion; whole: boolean } {
  // 1. Establish the true value. Trust the model's formula first (covers word
  //    problems where the text has no symbols), then any expression in the text.
  let value: number | null = null;
  let fromFormula = false;
  if (typeof q.expr === 'string') {
    const v = safeEval(q.expr);
    if (v !== null) { value = v; fromFormula = true; }
  }
  if (value === null) {
    const e = extractExpression(q.question);
    if (e) value = safeEval(e);
  }
  if (value === null) return { q, whole: true };    // nothing to verify → trust model, keep

  const isWhole = Math.abs(value - Math.round(value)) < 1e-9;
  const EPS = 1e-6;
  const nums = q.choices.map(toNum);

  // 2. If a numeric choice already equals the true value, mark it.
  if (nums.every(n => n !== null)) {
    const idx = nums.findIndex(n => Math.abs((n as number) - value!) < EPS);
    if (idx !== -1) return { q: { ...q, answer: idx }, whole: isWhole || !fromFormula };
  }

  // 3. No matching choice. For whole-number answers, inject the true value so
  //    there's a correct option. For decimals, leave choices alone (the
  //    question is low-quality) but still report it as non-whole.
  if (isWhole) {
    const slot = q.answer >= 0 && q.answer <= 3 ? q.answer : 0;
    const choices = [...q.choices];
    choices[slot] = fmtNum(value);
    return { q: { ...q, choices, answer: slot }, whole: true };
  }
  return { q, whole: !fromFormula };
}

async function getOllamaModel(): Promise<string> {
  try {
    const r = await fetch('/api/ollama/tags');
    if (!r.ok) return OLLAMA_MODELS_PREFERENCE[0];
    const { models } = await r.json();
    const names: string[] = (models ?? []).map((m: any) => m.name);
    return OLLAMA_MODELS_PREFERENCE.find(m => names.includes(m)) ?? names[0] ?? 'mistral:latest';
  } catch {
    return 'mistral:latest';
  }
}

// How many questions did the request ask for? (e.g. "generate 4 mcq …")
function parseRequestedCount(text: string): number | null {
  const m = text.match(/generate\s+(\d{1,2})/i) ||
            text.match(/\b(\d{1,2})\s*(?:mcq|multiple[-\s]?choice|questions?|q)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 1 && n <= 25 ? n : null;
}

// Deterministic addition+division questions with guaranteed whole-number
// answers — used to fill any shortfall when the local model can't produce
// enough valid questions.
function generateMathFill(n: number, seen: Set<string>): ParsedQuestion[] {
  const out: ParsedQuestion[] = [];
  let guard = 0;
  while (out.length < n && guard++ < 500) {
    const c   = 2 + Math.floor(Math.random() * 4);          // divisor 2..5
    const r   = 2 + Math.floor(Math.random() * 8);          // quotient 2..9 (the answer)
    const sum = r * c;
    const a   = 1 + Math.floor(Math.random() * (sum - 1));
    const b   = sum - a;
    const question = `What is the result of adding ${a} and ${b}, then dividing the sum by ${c}?`;
    const key = question.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const opts = Array.from(new Set([r, r + 1, r - 1, r + 2, r + c].filter(v => v > 0))).slice(0, 4);
    let pad = r + 5;
    while (opts.length < 4) { if (!opts.includes(pad)) opts.push(pad); pad++; }
    for (let i = opts.length - 1; i > 0; i--) {            // shuffle
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    out.push({ question, choices: opts.map(String), answer: opts.indexOf(r), expr: `(${a}+${b})/${c}` });
  }
  return out;
}

function buildPrompt(rawText: string, subject: string, isMath: boolean, target: number | null): string {
  const mathRules = isMath ? `

MATH RULES (wrong answers are NOT acceptable):
- For EVERY question add a field "expr": the exact arithmetic that solves it, using only numbers and + - * / and parentheses. Example: a question about "adding 3 and 5 then dividing by 2" has "expr":"(3+5)/2".
- The "expr" must match the question wording exactly. CRITICAL: any division must divide evenly into a whole number — pick the numbers so there is NO remainder and NO decimal (good: (6+4)/2=5, (8+4)/3=4, 20/4=5; bad: 7/2 or (8-1)/3 are NOT allowed). Work the division out before writing the question.
- Exactly ONE choice must equal the result of "expr"; the other 3 choices are plausible wrong answers (common mistakes), never equal to the correct value.
- Math example: {"question":"What is (3 + 5) ÷ 2?","choices":["2","4","8","16"],"answer":1,"expr":"(3+5)/2"}` : '';

  const countRule = target
    ? `\n\nCRITICAL: Return EXACTLY ${target} questions — no more, no fewer.`
    : '';

  return `You are an educational content assistant for grade school students. Your job is to produce multiple choice questions (MCQs) from the text below.

RULES:
1. If the text already contains MCQ questions with answer choices, extract ALL of them exactly as written.
2. If the text is explanatory or is a request to generate questions, GENERATE appropriate MCQ questions that test understanding. ${target ? `Generate exactly ${target}.` : 'Generate as many as the content supports (aim for at least 10).'}
3. Every question must have exactly 4 answer choices and one correct answer.
4. Return ONLY a valid JSON array — no explanation, no markdown, no extra text.${mathRules}${countRule}

Subject: ${subject}

Text:
---
${rawText}
---

Return ONLY a JSON array like:
[{"question":"...","choices":["A","B","C","D"],"answer":0}]`;
}

// One generation pass → validated, answer-verified, whole-number-preferred questions.
async function runOllamaOnce(
  model: string,
  prompt: string,
  temperature: number,
  onChunk?: (partial: string) => void,
): Promise<ParsedQuestion[]> {
  const response = await fetch('/api/ollama/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, prompt, stream: true,
      options: { num_predict: -1, num_ctx: 8192, temperature },
    }),
  });
  if (!response.ok || !response.body) throw new Error('Ollama not reachable');

  let fullText = '';
  let streamFinished = false;
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  while (!streamFinished) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
      try {
        const { response: token, done: streamDone } = JSON.parse(line);
        if (token) { fullText += token; onChunk?.(fullText); }
        if (streamDone) { streamFinished = true; break; }
      } catch {}
    }
  }

  const start = fullText.indexOf('[');
  const end   = fullText.lastIndexOf(']');
  if (start === -1 || end === -1 || start >= end)
    throw new Error('Ollama did not return a JSON array — try again or simplify the input text');

  const candidate = fullText.slice(start, end + 1);
  let parsed: ParsedQuestion[] | null = null;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    const cleaned = candidate
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/([^\\])\n/g, '$1 ')
      .replace(/([^\\])\t/g, '$1 ')
      .replace(/,(\s*[\]}])/g, '$1');
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const objects: ParsedQuestion[] = [];
      const objRegex = /\{[^{}]*"question"[^{}]*"choices"[^{}]*"answer"[^{}]*\}/g;
      for (const m of Array.from(fullText.matchAll(objRegex))) {
        try { objects.push(JSON.parse(m[0])); } catch {}
      }
      if (objects.length === 0)
        throw new Error('Could not parse Ollama response as JSON — try again');
      parsed = objects;
    }
  }

  const valid = (parsed as ParsedQuestion[]).filter(q =>
    typeof q.question === 'string' &&
    Array.isArray(q.choices) && q.choices.length === 4 &&
    typeof q.answer === 'number' && q.answer >= 0 && q.answer <= 3
  );
  const checked = valid.map(verifyNumericAnswer);
  const whole = checked.filter(c => c.whole).map(c => c.q);
  return whole.length > 0 ? whole : checked.map(c => c.q);
}

export async function parseQuestionsWithOllama(
  rawText: string,
  subject: string,
  onChunk?: (partial: string) => void,
): Promise<ParsedQuestion[]> {
  const model  = await getOllamaModel();
  const isMath = /math|arithmetic|algebra|numera/i.test(subject);
  const target = parseRequestedCount(rawText);
  const prompt = buildPrompt(rawText, subject, isMath, target);

  const collected: ParsedQuestion[] = [];
  const seen = new Set<string>();
  const addUnique = (qs: ParsedQuestion[]) => {
    for (const q of qs) {
      const key = q.question.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!seen.has(key)) { seen.add(key); collected.push(q); }
    }
  };

  // When a count is requested, retry a few times to reach it. Temperature 0 on
  // the first pass (best quality); higher after so retries yield NEW questions.
  const maxAttempts = target ? 4 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (target && collected.length >= target) break;
    try {
      const temp = !target ? 0 : attempt === 0 ? 0.3 : 0.8;
      addUnique(await runOllamaOnce(model, prompt, temp, onChunk));
    } catch (e) {
      if (attempt === 0 && collected.length === 0) throw e;  // hard failure (e.g. Ollama down)
      break;                                                 // transient retry failure → stop with what we have
    }
    if (!target) break;
  }

  // Math safety net: guarantee the requested count with valid generated questions.
  if (isMath && target && collected.length < target) {
    addUnique(generateMathFill(target - collected.length, seen));
  }

  return target ? collected.slice(0, target) : collected;
}
