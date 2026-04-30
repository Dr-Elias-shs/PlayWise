"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGlobalConfig, setGlobalConfig } from '@/lib/wallet';
import {
  TimeManagementConfig, GradeTimeSetting,
  DEFAULT_CONFIG, DEFAULT_GRADE_SETTING,
} from '@/lib/timeManagement';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));

const GAME_LIST = [
  { id: 'addition',       label: 'Number Sprint',  emoji: '➕', color: 'bg-blue-50 border-blue-200' },
  { id: 'multiplication', label: 'Multiplication', emoji: '✖️', color: 'bg-violet-50 border-violet-200' },
  { id: 'division',       label: 'Division Dash',  emoji: '➗', color: 'bg-indigo-50 border-indigo-200' },
  { id: 'fractions',      label: 'Fractions',      emoji: '🍕', color: 'bg-orange-50 border-orange-200' },
  { id: 'brain',          label: 'Brain Logic',    emoji: '🧩', color: 'bg-pink-50 border-pink-200' },
  { id: 'hangman',        label: 'Hangman',        emoji: '🪢', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'memory',         label: 'Memory Match',   emoji: '🧠', color: 'bg-teal-50 border-teal-200' },
  { id: 'world',          label: 'PlayWise World', emoji: '🗺️', color: 'bg-emerald-50 border-emerald-200' },
  { id: 'multiplayer',    label: 'Math Duels',     emoji: '⚔️', color: 'bg-red-50 border-red-200' },
];

const TM_KEY   = 'time_management';
const GAME_KEY = 'grade_game_settings';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function withTmDefaults(raw: any): TimeManagementConfig {
  const cfg = { ...DEFAULT_CONFIG, ...raw };
  cfg.schedule = { ...DEFAULT_CONFIG.schedule, ...(raw?.schedule ?? {}) };
  const grades: Record<string, GradeTimeSetting> = {};
  GRADES.forEach(g => { grades[g] = { ...DEFAULT_GRADE_SETTING, ...(raw?.grades?.[g] ?? {}) }; });
  cfg.grades = grades;
  return cfg;
}

// Returns true if the game is enabled for this grade (default = true)
function isEnabled(settings: Record<string, Record<string, boolean>>, grade: string, gameId: string): boolean {
  return settings?.[grade]?.[gameId] !== false;
}

// ─── Saved toast ──────────────────────────────────────────────────────────────

function SavedToast({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <AnimatePresence>
      {(saving || saved) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-xl font-bold text-white text-sm shadow-lg
            ${saving ? 'bg-slate-700' : 'bg-emerald-500'}`}>
          {saving ? '💾 Saving…' : '✅ Saved'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function GradeControlTab() {
  const [selectedGrade, setSelectedGrade] = useState('1');

  // Game settings: grade → { gameId → enabled }
  const [gameSettings, setGameSettings] = useState<Record<string, Record<string, boolean>>>({});
  // Time management config
  const [tmCfg, setTmCfg]   = useState<TimeManagementConfig>(DEFAULT_CONFIG);

  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [copyConfirm, setCopyConfirm] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getGlobalConfig(GAME_KEY),
      getGlobalConfig(TM_KEY),
    ]).then(([gameRaw, tmRaw]) => {
      setGameSettings(gameRaw ?? {});
      if (tmRaw) setTmCfg(withTmDefaults(tmRaw));
    });
  }, []);

  // ── Save helpers ────────────────────────────────────────────────────────────
  const toast = useCallback(() => {
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  async function saveGameSettings(next: Record<string, Record<string, boolean>>) {
    setSaving(true);
    await setGlobalConfig(GAME_KEY, next);
    toast();
  }

  async function saveTmCfg(next: TimeManagementConfig) {
    setSaving(true);
    await setGlobalConfig(TM_KEY, next);
    toast();
  }

  // ── Game toggles ────────────────────────────────────────────────────────────
  function toggleGame(gameId: string, on: boolean) {
    const next = {
      ...gameSettings,
      [selectedGrade]: { ...gameSettings[selectedGrade], [gameId]: on },
    };
    setGameSettings(next);
    saveGameSettings(next);
  }

  function setAllGames(on: boolean) {
    const patch: Record<string, boolean> = {};
    GAME_LIST.forEach(g => { patch[g.id] = on; });
    const next = { ...gameSettings, [selectedGrade]: patch };
    setGameSettings(next);
    saveGameSettings(next);
  }

  // ── Time settings ───────────────────────────────────────────────────────────
  function updateGradeTm(patch: Partial<GradeTimeSetting>) {
    const next: TimeManagementConfig = {
      ...tmCfg,
      grades: {
        ...tmCfg.grades,
        [selectedGrade]: { ...tmCfg.grades[selectedGrade], ...patch },
      },
    };
    setTmCfg(next);
    saveTmCfg(next);
  }

  // ── Copy grade to all ────────────────────────────────────────────────────────
  function copyToAll() {
    // Copy game settings
    const gradeGames = gameSettings[selectedGrade] ?? {};
    const nextGames: Record<string, Record<string, boolean>> = {};
    GRADES.forEach(g => { nextGames[g] = { ...gradeGames }; });
    setGameSettings(nextGames);
    saveGameSettings(nextGames);

    // Copy time settings
    const sourceTm = tmCfg.grades[selectedGrade] ?? DEFAULT_GRADE_SETTING;
    const nextTm: TimeManagementConfig = { ...tmCfg, grades: {} as any };
    const grades: Record<string, GradeTimeSetting> = {};
    GRADES.forEach(g => { grades[g] = { ...sourceTm }; });
    nextTm.grades = grades;
    setTmCfg(nextTm);
    saveTmCfg(nextTm);

    setCopyConfirm(false);
  }

  const gs     = tmCfg.grades[selectedGrade] ?? DEFAULT_GRADE_SETTING;
  const gradeGames = gameSettings[selectedGrade] ?? {};
  const enabledCount = GAME_LIST.filter(g => isEnabled(gameSettings, selectedGrade, g.id)).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <SavedToast saving={saving} saved={saved} />

      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-black text-slate-800">📚 Grade Control Console</h2>
        <p className="text-slate-400 text-sm mt-1">
          Select a grade to manage its available games and access schedule.
        </p>
      </div>

      {/* ── Grade selector ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Select Grade</p>
        <div className="flex flex-wrap gap-2">
          {GRADES.map(g => {
            const tm  = tmCfg.grades[g] ?? DEFAULT_GRADE_SETTING;
            const gEnabledCount = GAME_LIST.filter(gm => isEnabled(gameSettings, g, gm.id)).length;
            const allOn  = gEnabledCount === GAME_LIST.length;
            const allOff = gEnabledCount === 0;
            return (
              <button key={g} onClick={() => setSelectedGrade(g)}
                className={`relative flex flex-col items-center px-3 py-2 rounded-2xl border-2 font-black text-sm
                  transition-all min-w-[52px] ${
                  selectedGrade === g
                    ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200'
                    : tm.enabled
                    ? 'bg-white border-slate-200 text-slate-700 hover:border-violet-400'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}>
                <span>G{g}</span>
                <span className={`text-[9px] font-bold mt-0.5 ${
                  selectedGrade === g ? 'text-white/70' :
                  !tm.enabled ? 'text-red-400' :
                  allOn ? 'text-emerald-500' :
                  allOff ? 'text-red-400' : 'text-amber-500'
                }`}>
                  {!tm.enabled ? 'off' : allOn ? '✓ all' : allOff ? '✗ none' : `${gEnabledCount}/${GAME_LIST.length}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Selected grade panel ── */}
      <motion.div key={selectedGrade} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="space-y-4">

        {/* Grade badge + copy button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center
              justify-center font-black text-lg shadow-md shadow-violet-200">
              {selectedGrade}
            </div>
            <div>
              <div className="font-black text-slate-800 text-lg">Grade {selectedGrade}</div>
              <div className="text-xs text-slate-400">
                {enabledCount}/{GAME_LIST.length} games enabled ·{' '}
                {gs.enabled ? <span className="text-emerald-600 font-bold">● Access on</span>
                             : <span className="text-red-400 font-bold">● Access off</span>}
              </div>
            </div>
          </div>
          <button onClick={() => setCopyConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700
              text-white font-black rounded-xl text-sm transition-colors shadow-md">
            📋 Copy to All Grades
          </button>
        </div>

        {/* ── Games panel ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-800">🎮 Available Games</h3>
            <div className="flex gap-2">
              <button onClick={() => setAllGames(true)}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700
                  text-xs font-black rounded-xl transition-colors">
                ✓ Enable All
              </button>
              <button onClick={() => setAllGames(false)}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600
                  text-xs font-black rounded-xl transition-colors">
                ✗ Disable All
              </button>
            </div>
          </div>

          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {GAME_LIST.map(game => {
              const on = isEnabled(gameSettings, selectedGrade, game.id);
              return (
                <button key={game.id} onClick={() => toggleGame(game.id, !on)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2
                    transition-all font-medium text-sm ${
                    on
                      ? `${game.color} shadow-sm`
                      : 'bg-slate-50 border-slate-200 opacity-50 grayscale'
                  }`}>
                  {/* ON/OFF badge */}
                  <div className={`absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    on ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-500'
                  }`}>
                    {on ? 'ON' : 'OFF'}
                  </div>
                  <span className="text-3xl">{game.emoji}</span>
                  <span className="text-slate-700 font-black text-xs text-center leading-tight">
                    {game.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Time settings panel ── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800">⏰ Schedule & Limits</h3>
          </div>
          <div className="p-5 space-y-5">

            {/* Access toggle */}
            <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <div className="font-black text-slate-800 text-sm">Grade Access</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {gs.enabled ? 'Students in this grade can log in and play' : 'All access for this grade is blocked'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black ${gs.enabled ? 'text-emerald-600' : 'text-red-400'}`}>
                  {gs.enabled ? 'ON' : 'OFF'}
                </span>
                <Toggle on={gs.enabled} onChange={v => updateGradeTm({ enabled: v })} />
              </div>
            </div>

            {/* Daily limit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Daily Screen Time</p>
                <span className="text-sm font-black text-violet-600">
                  {gs.daily_minutes === 0 ? '∞ Unlimited' : `${gs.daily_minutes} min / day`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={120} step={5} value={gs.daily_minutes}
                  onChange={e => updateGradeTm({ daily_minutes: parseInt(e.target.value) })}
                  className="flex-1 accent-violet-600" />
                <input type="number" min={0} max={480} step={5} value={gs.daily_minutes}
                  onChange={e => updateGradeTm({ daily_minutes: parseInt(e.target.value) || 0 })}
                  className="w-16 border border-slate-200 rounded-xl px-2 py-1.5 text-sm font-black
                    text-center text-slate-700 outline-none focus:border-violet-400" />
              </div>
              <div className="flex gap-2 mt-2">
                {[0, 20, 30, 45, 60, 90].map(m => (
                  <button key={m} onClick={() => updateGradeTm({ daily_minutes: m })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-colors ${
                      gs.daily_minutes === m
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    {m === 0 ? '∞' : `${m}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Time window */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Access Window</p>
                <button onClick={() => updateGradeTm({ custom_schedule: !gs.custom_schedule })}
                  className={`text-xs font-black px-3 py-1 rounded-xl transition-colors ${
                    gs.custom_schedule
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}>
                  {gs.custom_schedule ? '✏️ Custom override' : '🌐 Using global schedule'}
                </button>
              </div>
              <div className={`flex items-center gap-3 transition-opacity ${!gs.custom_schedule ? 'opacity-50' : ''}`}>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">Opens</p>
                  <input type="time" value={gs.open_time} disabled={!gs.custom_schedule}
                    onChange={e => updateGradeTm({ open_time: e.target.value })}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold
                      text-slate-700 outline-none focus:border-violet-400 bg-white
                      disabled:cursor-not-allowed" />
                </div>
                <span className="text-slate-400 font-black">→</span>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">Closes</p>
                  <input type="time" value={gs.close_time} disabled={!gs.custom_schedule}
                    onChange={e => updateGradeTm({ close_time: e.target.value })}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold
                      text-slate-700 outline-none focus:border-violet-400 bg-white
                      disabled:cursor-not-allowed" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </motion.div>

      {/* ── Copy-to-all confirm modal ── */}
      <AnimatePresence>
        {copyConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setCopyConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full space-y-4">
              <div className="text-4xl text-center">📋</div>
              <h3 className="text-xl font-black text-slate-800 text-center">Copy Grade {selectedGrade} to All?</h3>
              <p className="text-sm text-slate-500 text-center">
                All 12 grades will receive the exact same game access and schedule as Grade {selectedGrade}.
              </p>
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Games enabled</span>
                  <span className="font-black text-slate-700">{enabledCount} / {GAME_LIST.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grade access</span>
                  <span className={`font-black ${gs.enabled ? 'text-emerald-600' : 'text-red-500'}`}>
                    {gs.enabled ? '● On' : '● Off'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Daily limit</span>
                  <span className="font-black text-slate-700">
                    {gs.daily_minutes === 0 ? '∞ Unlimited' : `${gs.daily_minutes} min`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Schedule</span>
                  <span className="font-black text-slate-700">
                    {gs.custom_schedule ? `${gs.open_time} → ${gs.close_time}` : 'Global'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCopyConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600
                    font-black rounded-2xl text-sm">
                  Cancel
                </button>
                <button onClick={copyToAll}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white
                    font-black rounded-2xl text-sm">
                  Apply to All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
