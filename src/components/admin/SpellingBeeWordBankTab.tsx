"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, RefreshCw, Upload, X } from 'lucide-react';
import {
  getWordRecordsForGrade,
  addSpellingWord,
  bulkAddSpellingWords,
  deleteSpellingWord,
  resetGradeToDefaults,
  SPELLING_BEE_DEFAULTS,
  type SpellingBeeWord,
} from '@/lib/spellingBee';

export function SpellingBeeWordBankTab() {
  const [grade, setGrade] = useState(1);
  const [words, setWords] = useState<SpellingBeeWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newHint, setNewHint] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState('');
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWordRecordsForGrade(grade);
      setWords(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load words');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    const clean = newWord.trim();
    if (!clean) return;
    setSaving(true);
    setError('');
    try {
      await addSpellingWord(clean, grade, newHint.trim() || undefined);
      setJustAdded(clean.toUpperCase());
      setTimeout(() => setJustAdded(null), 2000);
      setNewWord('');
      setNewHint('');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add word');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    try {
      await deleteSpellingWord(id);
      setWords(ws => ws.filter(w => w.id !== id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete word');
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const count = await bulkAddSpellingWords(lines, grade);
      setBulkText('');
      setShowBulk(false);
      await load();
      setJustAdded(`${count} words added`);
      setTimeout(() => setJustAdded(null), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to import words');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const defaultCount = SPELLING_BEE_DEFAULTS[grade]?.length ?? 100;
    if (!confirm(`Reset Grade ${grade} to the ${defaultCount} built-in default words?\n\nThis will remove ALL current words for this grade.`)) return;
    setResetting(true);
    setError('');
    try {
      await resetGradeToDefaults(grade);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reset');
    } finally {
      setResetting(false);
    }
  };

  const filtered = search.trim()
    ? words.filter(w => w.word.toLowerCase().includes(search.toLowerCase()))
    : words;

  const customCount = words.filter(w => w.is_custom).length;

  return (
    <div className="space-y-5">

      {/* Header info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-2xl">🐝</span>
        <div>
          <p className="font-bold text-yellow-900 text-sm">Spelling Bee Word Bank</p>
          <p className="text-yellow-700 text-xs mt-0.5">
            Each grade has 100 built-in default words. Add your own to supplement or replace them.
            Students hear each word spoken twice and must type it correctly.
          </p>
        </div>
      </div>

      {/* Grade selector */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(g => (
          <button
            key={g}
            onClick={() => { setGrade(g); setSearch(''); }}
            className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
              grade === g
                ? 'bg-yellow-400 text-gray-900 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            G{g}
          </button>
        ))}
      </div>

      {/* Stats + actions bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div>
            <span className="font-black text-slate-800 text-xl">{words.length}</span>
            <span className="text-slate-500 text-sm ml-1.5">words · Grade {grade}</span>
          </div>
          {customCount > 0 && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {customCount} custom
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulk(!showBulk)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <Upload size={13} /> Bulk Import
          </button>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={resetting ? 'animate-spin' : ''} />
            Reset Defaults
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {justAdded && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
          ✅ {justAdded}
        </motion.div>
      )}

      {/* Add word form */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Add a word</p>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-slate-500 mb-1">Word *</label>
            <input
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="PHENOMENON"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold uppercase outline-none focus:border-yellow-400 transition-colors"
            />
          </div>
          <div className="flex-1 min-w-32">
            <label className="block text-xs text-slate-500 mb-1">Hint (optional)</label>
            <input
              value={newHint}
              onChange={e => setNewHint(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="an unusual natural event"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-yellow-400 transition-colors"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newWord.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-lg text-sm transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            <Plus size={14} /> Add Word
          </button>
        </div>
      </div>

      {/* Bulk import */}
      <AnimatePresence>
        {showBulk && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-700">Bulk import — one word per line</p>
              <button onClick={() => setShowBulk(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={15} />
              </button>
            </div>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={'apple\nbanana\nchocolate\nphenomenon'}
              rows={8}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-yellow-400 resize-none transition-colors"
            />
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-slate-400">
                {bulkText.split('\n').filter(l => l.trim()).length} words detected
              </span>
              <button
                onClick={handleBulkImport}
                disabled={!bulkText.trim() || saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-40"
              >
                {saving ? 'Importing…' : 'Import All'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {words.length > 10 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search in ${words.length} words…`}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 transition-colors"
        />
      )}

      {/* Word list */}
      {loading ? (
        <div className="text-center text-slate-400 py-10 text-sm">Loading words…</div>
      ) : words.length === 0 ? (
        <div className="text-center py-14">
          <div className="text-5xl mb-3">🐝</div>
          <p className="font-bold text-slate-600 mb-1">No words for Grade {grade} yet</p>
          <p className="text-slate-400 text-sm">Add words above or click "Reset Defaults" to load the built-in word bank.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {search ? `${filtered.length} of ${words.length} words` : `${words.length} words`}
            </span>
          </div>
          <div className="divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-6">No words match "{search}"</p>
            ) : filtered.map(w => (
              <motion.div
                key={w.id}
                layout
                initial={w.word === justAdded ? { backgroundColor: '#fef9c3' } : {}}
                animate={{ backgroundColor: 'transparent' }}
                transition={{ duration: 1.5 }}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 group transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-slate-800 text-sm tracking-wide">{w.word}</span>
                  {w.hint && (
                    <span className="text-slate-400 text-xs italic truncate max-w-48">"{w.hint}"</span>
                  )}
                  {w.is_custom && (
                    <span className="bg-indigo-100 text-indigo-600 text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0">
                      custom
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(w.id)}
                  title="Delete word"
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1.5 rounded-lg hover:bg-red-50 ml-2 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
