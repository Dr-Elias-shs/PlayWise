"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TRIVIA_CATEGORIES, TriviaCategory, TriviaGrade, TriviaLevel, TriviaQuestion,
  getAllTriviaForAdmin, addTriviaQuestion, updateTriviaQuestion,
  deleteTriviaQuestion, bulkInsertTrivia, clearAllTrivia,
} from '@/lib/trivia';
import { TRIVIA_SEED } from '@/lib/trivia-seed';
import { parseQuestionsWithOllama } from '@/lib/curriculum';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_PIN = 'astalabista';
const GRADES: TriviaGrade[] = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const DIFFICULTIES: TriviaLevel[] = ['easy','medium','hard'];

const DIFF_LABELS: Record<TriviaLevel, string> = { easy: '🌱 Easy', medium: '⚡ Medium', hard: '🔥 Hard' };
const DIFF_COLORS: Record<TriviaLevel, string> = {
  easy:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  hard:   'bg-red-500/20 text-red-300 border-red-500/30',
};

// ─── Blank question form ──────────────────────────────────────────────────────

function blankForm(grade: TriviaGrade): Omit<TriviaQuestion, 'id' | 'created_at'> {
  return {
    question: '',
    options: ['', '', '', ''],
    correct_index: 0,
    category: 'history',
    grade,
    difficulty: 'easy',
    source: 'manual',
  };
}

// ─── Question card ────────────────────────────────────────────────────────────

function QCard({
  q, onEdit, onDelete,
}: {
  q: TriviaQuestion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = TRIVIA_CATEGORIES.find(c => c.id === q.category);
  return (
    <div className="rounded-2xl p-4 border border-white/10 space-y-2"
      style={{ background: 'rgba(255,255,255,0.04)' }}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${DIFF_COLORS[q.difficulty]}`}>
              {DIFF_LABELS[q.difficulty]}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {cat?.emoji} {cat?.label}
            </span>
            {q.source && q.source !== 'manual' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {q.source}
              </span>
            )}
          </div>
          <p className="text-white font-medium text-sm leading-snug">{q.question}</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs">
            ✏️
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-xs">
            🗑️
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {q.options.map((opt, i) => (
          <div key={i} className={`text-xs px-3 py-1.5 rounded-lg ${i === q.correct_index
            ? 'bg-emerald-500/20 text-emerald-300 font-bold'
            : 'bg-white/5 text-white/50'}`}>
            {String.fromCharCode(65 + i)}. {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Question form modal ──────────────────────────────────────────────────────

function QFormModal({
  initial, grade, onSave, onClose,
}: {
  initial: Omit<TriviaQuestion, 'id' | 'created_at'>;
  grade: TriviaGrade;
  onSave: (q: Omit<TriviaQuestion, 'id' | 'created_at'>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const setOption = (i: number, val: string) => {
    const opts = [...form.options];
    opts[i] = val;
    setForm(f => ({ ...f, options: opts }));
  };

  const handleSave = async () => {
    if (!form.question.trim()) { setErr('Question is required'); return; }
    if (form.options.some(o => !o.trim())) { setErr('All 4 options are required'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setErr(String(e));
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-violet-400 transition-colors placeholder:text-white/20';
  const selCls   = 'bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-violet-400 cursor-pointer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg rounded-3xl p-6 space-y-4 border border-white/10"
        style={{ background: 'rgba(15,23,42,0.98)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-black text-lg">
            {initial.question ? 'Edit Question' : 'Add Question'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl">×</button>
        </div>

        {/* Category + Difficulty */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/40 text-xs font-bold uppercase mb-1 block">Category</label>
            <select className={selCls} value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as TriviaCategory }))}>
              {TRIVIA_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs font-bold uppercase mb-1 block">Difficulty</label>
            <select className={selCls} value={form.difficulty}
              onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as TriviaLevel }))}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
            </select>
          </div>
        </div>

        {/* Question */}
        <div>
          <label className="text-white/40 text-xs font-bold uppercase mb-1 block">Question</label>
          <textarea rows={2} className={`${inputCls} resize-none`} placeholder="Type the question…"
            value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
        </div>

        {/* Options */}
        <div>
          <label className="text-white/40 text-xs font-bold uppercase mb-1 block">Answer Options</label>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={form.correct_index === i}
                  onChange={() => setForm(f => ({ ...f, correct_index: i }))}
                  className="accent-emerald-400 w-4 h-4 cursor-pointer" />
                <input className={`${inputCls} flex-1`}
                  placeholder={`Option ${String.fromCharCode(65 + i)}${i === form.correct_index ? ' ← correct' : ''}`}
                  value={opt} onChange={e => setOption(i, e.target.value)} />
              </div>
            ))}
          </div>
          <p className="text-white/25 text-xs mt-1">Select the radio button next to the correct answer.</p>
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded-2xl font-black text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
            {saving ? 'Saving…' : 'Save Question'}
          </button>
          <button onClick={onClose}
            className="px-5 py-3 rounded-2xl font-bold text-white/50 hover:text-white bg-white/5 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Generation panel (Ollama) ────────────────────────────────────────────

function AIPanel({
  grade, onGenerated,
}: {
  grade: TriviaGrade;
  onGenerated: (questions: Omit<TriviaQuestion, 'id' | 'created_at'>[]) => void;
}) {
  const [text,       setText]       = useState('');
  const [category,   setCategory]   = useState<TriviaCategory>('history');
  const [difficulty, setDifficulty] = useState<TriviaLevel>('medium');
  const [loading,    setLoading]    = useState(false);
  const [status,     setStatus]     = useState('');
  const [stream,     setStream]     = useState('');   // live partial output
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('Reading file…');
    try {
      const content = await file.text();
      setText(content.slice(0, 10000));
      setStatus(`Loaded: ${file.name}`);
    } catch {
      setStatus('Could not read file.');
    }
    e.target.value = '';
  };

  const handleGenerate = async () => {
    if (!text.trim()) { setStatus('Please paste text or upload a file first.'); return; }
    setLoading(true);
    setStream('');
    setStatus('Connecting to Ollama…');
    try {
      // Reuse the same Ollama streaming helper from curriculum
      const parsed = await parseQuestionsWithOllama(
        text,
        category,
        (partial) => setStream(partial),
      );

      if (parsed.length === 0) {
        setStatus('Ollama returned no valid questions. Try different content or check Ollama is running.');
        setLoading(false);
        setStream('');
        return;
      }

      // Map ParsedQuestion (choices/answer) → TriviaQuestion shape (options/correct_index)
      const mapped: Omit<TriviaQuestion, 'id' | 'created_at'>[] = parsed.map(q => ({
        question: q.question,
        options: q.choices,
        correct_index: q.answer,
        category,
        grade,
        difficulty,
        source: 'ai-ollama',
      }));

      onGenerated(mapped);
      setStatus(`✅ Generated ${mapped.length} questions. Review and save them below.`);
      setStream('');
    } catch (e) {
      setStatus(`Error: ${String(e)}`);
      setStream('');
    }
    setLoading(false);
  };

  const selCls = 'bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-violet-400 cursor-pointer';

  return (
    <div className="rounded-2xl p-5 border border-violet-500/20 space-y-4"
      style={{ background: 'rgba(109,40,217,0.08)' }}>
      <h3 className="text-white font-black text-base flex items-center gap-2">
        🤖 AI Question Generator <span className="text-white/30 text-xs font-medium">(Ollama)</span>
      </h3>

      {/* File upload + text */}
      <div>
        <p className="text-white/40 text-xs font-bold uppercase mb-1.5">Upload a file or paste text</p>
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-colors border border-white/10">
            📎 Upload File (.txt, .md)
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFile} />
        </div>
        <textarea rows={5} value={text} onChange={e => setText(e.target.value)}
          placeholder="Paste your lesson, test paper, notes, or any text here…"
          className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-violet-400 transition-colors placeholder:text-white/20 resize-none" />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/40 text-xs font-bold uppercase mb-1 block">Category</label>
          <select className={selCls} value={category} onChange={e => setCategory(e.target.value as TriviaCategory)}>
            {TRIVIA_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/40 text-xs font-bold uppercase mb-1 block">Difficulty</label>
          <select className={selCls} value={difficulty} onChange={e => setDifficulty(e.target.value as TriviaLevel)}>
            {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
          </select>
        </div>
      </div>

      <button onClick={handleGenerate} disabled={loading}
        className="w-full py-3 rounded-2xl font-black text-white transition-all hover:opacity-90 disabled:opacity-50 text-sm"
        style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
        {loading ? '🔄 Generating with Ollama…' : '✨ Generate Questions'}
      </button>

      {/* Live stream output */}
      {stream && (
        <div className="rounded-xl p-3 border border-white/10 max-h-40 overflow-auto"
          style={{ background: 'rgba(0,0,0,0.3)' }}>
          <pre className="text-white/50 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
            {stream}
          </pre>
        </div>
      )}

      {status && (
        <p className="text-sm font-medium" style={{ color: status.startsWith('✅') ? '#86efac' : status.startsWith('Error') ? '#fca5a5' : '#cbd5e1' }}>
          {status}
        </p>
      )}
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export default function AdminTriviaPage() {
  const [pin,       setPin]       = useState('');
  const [unlocked,  setUnlocked]  = useState(false);
  const [pinError,  setPinError]  = useState(false);

  const [grade,     setGrade]     = useState<TriviaGrade>('1');
  const [catFilter, setCatFilter] = useState<TriviaCategory | 'all'>('all');
  const [diffFilter,setDiffFilter]= useState<TriviaLevel | 'all'>('all');

  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [saveStatus,setSaveStatus] = useState('');

  const [editQ,     setEditQ]     = useState<TriviaQuestion | null>(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [aiPreview, setAiPreview] = useState<Omit<TriviaQuestion, 'id' | 'created_at'>[]>([]);
  const [seeding,   setSeeding]   = useState(false);
  const [seedStatus,setSeedStatus]= useState('');

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllTriviaForAdmin(
        grade,
        catFilter !== 'all' ? catFilter : undefined,
      );
      setQuestions(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [grade, catFilter]);

  useEffect(() => {
    if (unlocked) fetchQuestions();
  }, [unlocked, fetchQuestions]);

  const handlePinSubmit = () => {
    if (pin === ADMIN_PIN) { setUnlocked(true); setPinError(false); }
    else { setPinError(true); setPin(''); }
  };

  const handleSeedGrades = async () => {
    if (!confirm('This will seed questions. Duplicates may be inserted. Continue?')) return;
    setSeeding(true);
    setSeedStatus('Seeding…');
    try {
      const count = await bulkInsertTrivia(TRIVIA_SEED);
      setSeedStatus(`✅ Inserted ${count} questions!`);
      await fetchQuestions();
    } catch (e) {
      setSeedStatus(`Error: ${String(e)}`);
    }
    setSeeding(false);
  };

  const handleClearAndReseed = async () => {
    if (!confirm('⚠️ This will DELETE all trivia questions and reseed from scratch. Continue?')) return;
    setSeeding(true);
    setSeedStatus('Clearing…');
    try {
      await clearAllTrivia();
      setSeedStatus('Seeding…');
      const count = await bulkInsertTrivia(TRIVIA_SEED);
      setSeedStatus(`✅ Cleared & reseeded ${count} questions!`);
      await fetchQuestions();
    } catch (e) {
      setSeedStatus(`Error: ${String(e)}`);
    }
    setSeeding(false);
  };

  const handleAdd = async (q: Omit<TriviaQuestion, 'id' | 'created_at'>) => {
    await addTriviaQuestion(q);
    setSaveStatus('✅ Question added!');
    await fetchQuestions();
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleEdit = async (q: Omit<TriviaQuestion, 'id' | 'created_at'>) => {
    if (!editQ) return;
    await updateTriviaQuestion(editQ.id, q);
    setSaveStatus('✅ Updated!');
    await fetchQuestions();
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    await deleteTriviaQuestion(id);
    await fetchQuestions();
  };

  const handleSaveAI = async (qs: Omit<TriviaQuestion, 'id' | 'created_at'>[]) => {
    const count = await bulkInsertTrivia(qs);
    setAiPreview([]);
    setSaveStatus(`✅ Saved ${count} AI-generated questions!`);
    await fetchQuestions();
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const visibleQuestions = questions.filter(q =>
    (diffFilter === 'all' || q.difficulty === diffFilter),
  );

  // ── PIN gate ──────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)' }}>
        <div className="w-full max-w-sm rounded-3xl p-8 border border-white/10 text-center space-y-5"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
          <div className="text-5xl">🎯</div>
          <h1 className="text-2xl font-black text-white">Trivia Admin</h1>
          <p className="text-white/50 text-sm">Enter the admin PIN to manage trivia questions.</p>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
            placeholder="Admin PIN"
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-center font-bold outline-none focus:border-violet-400 transition-colors placeholder:text-white/20"
          />
          {pinError && <p className="text-red-400 text-sm">Incorrect PIN.</p>}
          <button onClick={handlePinSubmit}
            className="w-full py-3 rounded-2xl font-black text-white"
            style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
            Unlock
          </button>
          <a href="/admin" className="text-white/30 hover:text-white/60 text-sm transition-colors block">
            ← Back to Admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 z-10"
        style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)' }}>
        <a href="/admin" className="text-white/50 hover:text-white font-bold text-sm transition-colors">← Admin</a>
        <h1 className="text-white font-black text-xl flex-1">🎯 Trivia Manager</h1>
        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-sm font-medium" style={{ color: saveStatus.startsWith('✅') ? '#86efac' : '#fca5a5' }}>
              {saveStatus}
            </span>
          )}
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl font-black text-white text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)' }}>
            + Add Question
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Seed panel */}
        <div className="rounded-2xl p-4 border border-amber-500/20 flex items-center gap-4"
          style={{ background: 'rgba(245,158,11,0.07)' }}>
          <div className="text-2xl">🌱</div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Question Bank</p>
            <p className="text-white/40 text-xs">{TRIVIA_SEED.length} questions · 10 easy / 10 medium / 10 hard per category.</p>
            {seedStatus && <p className="text-xs mt-0.5" style={{ color: seedStatus.startsWith('✅') ? '#86efac' : '#fca5a5' }}>{seedStatus}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleSeedGrades} disabled={seeding}
              className="px-4 py-2 rounded-xl font-black text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)' }}>
              {seeding ? 'Working…' : 'Seed Now'}
            </button>
            <button onClick={handleClearAndReseed} disabled={seeding}
              className="px-4 py-2 rounded-xl font-black text-sm text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
              {seeding ? 'Working…' : 'Clear & Reseed'}
            </button>
          </div>
        </div>

        {/* Grade tabs */}
        <div>
          <p className="text-white/40 text-xs font-black uppercase tracking-wider mb-2">Grade</p>
          <div className="flex flex-wrap gap-2">
            {GRADES.map(g => (
              <button key={g} onClick={() => setGrade(g)}
                className={`px-3 py-1.5 rounded-xl font-black text-sm transition-all ${grade === g
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                Grade {g}
              </button>
            ))}
          </div>
        </div>

        {/* Category + difficulty filters */}
        <div className="flex flex-wrap gap-3">
          <div>
            <p className="text-white/40 text-xs font-black uppercase mb-1">Category</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setCatFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${catFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                All
              </button>
              {TRIVIA_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setCatFilter(c.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${catFilter === c.id ? 'bg-violet-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-white/40 text-xs font-black uppercase mb-1">Difficulty</p>
            <div className="flex gap-1.5">
              <button onClick={() => setDiffFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${diffFilter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                All
              </button>
              {DIFFICULTIES.map(d => (
                <button key={d} onClick={() => setDiffFilter(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${diffFilter === d ? DIFF_COLORS[d] : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white'}`}>
                  {DIFF_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Generator */}
        <AIPanel grade={grade} onGenerated={qs => setAiPreview(qs)} />

        {/* AI preview questions */}
        {aiPreview.length > 0 && (
          <div className="rounded-2xl p-4 border border-blue-500/20 space-y-3"
            style={{ background: 'rgba(59,130,246,0.07)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-black text-sm">
                🤖 AI-Generated Preview ({aiPreview.length} questions)
              </h3>
              <div className="flex gap-2">
                <button onClick={() => handleSaveAI(aiPreview)}
                  className="px-4 py-2 rounded-xl font-black text-white text-xs"
                  style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                  Save All to DB
                </button>
                <button onClick={() => setAiPreview([])}
                  className="px-3 py-2 rounded-xl font-bold text-white/50 hover:text-white bg-white/5 text-xs transition-colors">
                  Discard
                </button>
              </div>
            </div>
            {aiPreview.map((q, i) => (
              <div key={i} className="rounded-xl p-3 border border-white/10 space-y-1.5"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-white text-sm font-medium">{q.question}</p>
                <div className="grid grid-cols-2 gap-1">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className={`text-xs px-2 py-1 rounded-lg ${oi === q.correct_index
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                      : 'bg-white/5 text-white/40'}`}>
                      {String.fromCharCode(65 + oi)}. {opt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Question list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-black text-sm">
              Questions — Grade {grade} {catFilter !== 'all' ? `· ${TRIVIA_CATEGORIES.find(c => c.id === catFilter)?.label}` : ''} {diffFilter !== 'all' ? `· ${DIFF_LABELS[diffFilter]}` : ''}
            </h3>
            <span className="text-white/30 text-xs font-bold">{visibleQuestions.length} shown</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
          ) : visibleQuestions.length === 0 ? (
            <div className="text-center py-12 text-white/30 font-medium">
              No questions yet for this filter. Add some above or seed grades 1–6!
            </div>
          ) : (
            <div className="space-y-3">
              {visibleQuestions.map(q => (
                <QCard
                  key={q.id}
                  q={q}
                  onEdit={() => setEditQ(q)}
                  onDelete={() => handleDelete(q.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <QFormModal
          initial={blankForm(grade)}
          grade={grade}
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit modal */}
      {editQ && (
        <QFormModal
          initial={{
            question: editQ.question,
            options: editQ.options,
            correct_index: editQ.correct_index,
            category: editQ.category,
            grade: editQ.grade,
            difficulty: editQ.difficulty,
            source: editQ.source,
          }}
          grade={editQ.grade}
          onSave={handleEdit}
          onClose={() => setEditQ(null)}
        />
      )}
    </div>
  );
}
