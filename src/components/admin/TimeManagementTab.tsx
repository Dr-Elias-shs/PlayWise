"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getGlobalConfig, setGlobalConfig } from '@/lib/wallet';
import {
  TimeManagementConfig, GradeTimeSetting,
  DEFAULT_CONFIG, DEFAULT_GRADE_SETTING, resetScreenTime,
} from '@/lib/timeManagement';

const GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CONFIG_KEY = 'time_management';

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Toggle({ on, onChange, size = 'md' }: { on: boolean; onChange: (v: boolean) => void; size?: 'sm' | 'md' }) {
  const w = size === 'sm' ? 'w-9 h-5'  : 'w-12 h-6';
  const k = size === 'sm' ? 'w-4 h-4'  : 'w-5 h-5';
  const t = size === 'sm' ? 'translate-x-4' : 'translate-x-6';
  return (
    <button onClick={() => onChange(!on)}
      className={`relative ${w} rounded-full transition-colors duration-200 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 ${k} rounded-full bg-white shadow transition-transform duration-200 ${on ? t : 'translate-x-0'}`} />
    </button>
  );
}

function TimeInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input type="time" value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
      className="border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-700
        outline-none focus:border-violet-400 bg-white disabled:opacity-40 disabled:cursor-not-allowed" />
  );
}

function withDefaults(raw: any): TimeManagementConfig {
  const cfg = { ...DEFAULT_CONFIG, ...raw };
  cfg.schedule = { ...DEFAULT_CONFIG.schedule, ...(raw?.schedule ?? {}) };
  const grades: Record<string, GradeTimeSetting> = {};
  GRADES.forEach(g => { grades[g] = { ...DEFAULT_GRADE_SETTING, ...(raw?.grades?.[g] ?? {}) }; });
  cfg.grades = grades;
  return cfg;
}

// ─── Grade Card ───────────────────────────────────────────────────────────────

function GradeCard({
  grade, gs, globalSchedule, onUpdate, onApplyToAll,
}: {
  grade:          string;
  gs:             GradeTimeSetting;
  globalSchedule: TimeManagementConfig['schedule'];
  onUpdate:       (patch: Partial<GradeTimeSetting>) => void;
  onApplyToAll:   () => void;
}) {
  const effectiveOpen  = gs.custom_schedule ? gs.open_time  : globalSchedule.open_time;
  const effectiveClose = gs.custom_schedule ? gs.close_time : globalSchedule.close_time;

  return (
    <motion.div layout
      className={`rounded-2xl border-2 transition-colors overflow-hidden ${
        gs.enabled
          ? 'border-violet-200 bg-white'
          : 'border-slate-200 bg-slate-50 opacity-75'
      }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        gs.enabled ? 'bg-violet-50' : 'bg-slate-100'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm ${
            gs.enabled ? 'bg-violet-600 text-white' : 'bg-slate-300 text-slate-500'
          }`}>
            {grade}
          </div>
          <div>
            <div className="font-black text-slate-800 text-sm">Grade {grade}</div>
            <div className={`text-[10px] font-bold ${gs.enabled ? 'text-emerald-600' : 'text-red-400'}`}>
              {gs.enabled ? '● Active' : '● Disabled'}
            </div>
          </div>
        </div>
        <Toggle on={gs.enabled} onChange={v => onUpdate({ enabled: v })} />
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">

        {/* Daily limit */}
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Daily Limit</p>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={120} step={5} value={gs.daily_minutes}
              onChange={e => onUpdate({ daily_minutes: parseInt(e.target.value) })}
              className="flex-1 accent-violet-600 h-1.5" />
            <div className="flex items-center gap-1 shrink-0">
              <input type="number" min={0} max={480} step={5} value={gs.daily_minutes}
                onChange={e => onUpdate({ daily_minutes: parseInt(e.target.value) || 0 })}
                className="w-12 border border-slate-200 rounded-lg px-1 py-0.5 text-xs font-bold
                  text-center text-slate-700 outline-none focus:border-violet-400" />
              <span className="text-[10px] text-slate-400 font-bold">
                {gs.daily_minutes === 0 ? '∞' : 'min'}
              </span>
            </div>
          </div>
        </div>

        {/* Time window */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Time Window</p>
            <button
              onClick={() => onUpdate({ custom_schedule: !gs.custom_schedule })}
              className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                gs.custom_schedule
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}>
              {gs.custom_schedule ? '✏️ Custom' : '🌐 Global'}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <TimeInput value={effectiveOpen}  disabled={!gs.custom_schedule}
              onChange={v => onUpdate({ open_time: v, custom_schedule: true })} />
            <span className="text-slate-300 font-black text-xs">→</span>
            <TimeInput value={effectiveClose} disabled={!gs.custom_schedule}
              onChange={v => onUpdate({ close_time: v, custom_schedule: true })} />
          </div>
          {!gs.custom_schedule && (
            <p className="text-[9px] text-slate-400 mt-1">Inherited from global schedule</p>
          )}
        </div>
      </div>

      {/* Footer: Apply to All */}
      <div className="px-4 pb-3">
        <button
          onClick={onApplyToAll}
          className="w-full py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-black
            rounded-xl transition-colors border border-violet-200 hover:border-violet-300">
          📋 Apply Grade {grade} settings to all
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TimeManagementTab() {
  const [cfg,    setCfg]    = useState<TimeManagementConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [confirmApplyAll, setConfirmApplyAll] = useState<string | null>(null);

  // Bulk-apply template state
  const [bulkEnabled,  setBulkEnabled]  = useState(true);
  const [bulkMinutes,  setBulkMinutes]  = useState(0);
  const [bulkCustom,   setBulkCustom]   = useState(false);
  const [bulkOpen,     setBulkOpen]     = useState('07:30');
  const [bulkClose,    setBulkClose]    = useState('15:30');

  useEffect(() => {
    getGlobalConfig(CONFIG_KEY).then(raw => { if (raw) setCfg(withDefaults(raw)); });
  }, []);

  async function save(next: TimeManagementConfig) {
    setSaving(true);
    await setGlobalConfig(CONFIG_KEY, next);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(patch: Partial<TimeManagementConfig>) {
    const next = { ...cfg, ...patch };
    setCfg(next); save(next);
  }

  function updateSchedule(patch: Partial<TimeManagementConfig['schedule']>) {
    update({ schedule: { ...cfg.schedule, ...patch } });
  }

  function updateGrade(grade: string, patch: Partial<GradeTimeSetting>) {
    const next: TimeManagementConfig = {
      ...cfg,
      grades: { ...cfg.grades, [grade]: { ...cfg.grades[grade], ...patch } },
    };
    setCfg(next); save(next);
  }

  function applyGradeToAll(sourceGrade: string) {
    const source = cfg.grades[sourceGrade];
    const grades = { ...cfg.grades };
    GRADES.forEach(g => { grades[g] = { ...source }; });
    update({ grades });
    setConfirmApplyAll(null);
  }

  function applyBulkToAll() {
    const patch: GradeTimeSetting = {
      enabled:         bulkEnabled,
      daily_minutes:   bulkMinutes,
      custom_schedule: bulkCustom,
      open_time:       bulkOpen,
      close_time:      bulkClose,
    };
    const grades = { ...cfg.grades };
    GRADES.forEach(g => { grades[g] = { ...patch }; });
    update({ grades });
  }

  function toggleDay(day: string) {
    const days = cfg.schedule.days.includes(day)
      ? cfg.schedule.days.filter(d => d !== day)
      : [...cfg.schedule.days, day];
    updateSchedule({ days });
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* Save toast */}
      <AnimatePresence>
        {(saving || saved) && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-xl font-bold text-white text-sm shadow-lg
              ${saving ? 'bg-slate-700' : 'bg-emerald-500'}`}>
            {saving ? '💾 Saving…' : '✅ Saved'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. Master switch ── */}
      <div className={`rounded-2xl border-2 p-5 flex items-center justify-between transition-colors
        ${cfg.global_enabled ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
        <div>
          <h2 className="font-black text-lg text-slate-800">Platform Status</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {cfg.global_enabled
              ? '🟢 Open — all enabled grades can access games'
              : '🔴 Closed — all student access blocked'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-black text-sm ${cfg.global_enabled ? 'text-emerald-600' : 'text-red-500'}`}>
            {cfg.global_enabled ? 'OPEN' : 'CLOSED'}
          </span>
          <Toggle on={cfg.global_enabled} onChange={v => update({ global_enabled: v })} />
        </div>
      </div>

      {/* ── 2. Global schedule ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-800">🌐 Global Schedule</h2>
            <p className="text-slate-400 text-xs mt-0.5">Default time window — used by grades set to "Global"</p>
          </div>
          <Toggle on={cfg.schedule.enabled} onChange={v => updateSchedule({ enabled: v })} />
        </div>

        <AnimatePresence>
          {cfg.schedule.enabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-4">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Active Days</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => (
                    <button key={d} onClick={() => toggleDay(d)}
                      className={`w-12 h-10 rounded-xl font-black text-sm transition-all ${
                        cfg.schedule.days.includes(d)
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}>
                      {d.slice(0, 2)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Opens At</p>
                  <input type="time" value={cfg.schedule.open_time}
                    onChange={e => updateSchedule({ open_time: e.target.value })}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold
                      text-slate-700 outline-none focus:border-violet-400 bg-white" />
                </div>
                <span className="text-slate-400 font-black mt-4">→</span>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Closes At</p>
                  <input type="time" value={cfg.schedule.close_time}
                    onChange={e => updateSchedule({ close_time: e.target.value })}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold
                      text-slate-700 outline-none focus:border-violet-400 bg-white" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. Apply to All template ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="font-black text-slate-800">⚡ Apply to All Grades</h2>
          <p className="text-slate-400 text-xs mt-0.5">Set a template and push it to every grade at once</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Enabled */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Access</p>
            <div className="flex items-center gap-2">
              <Toggle on={bulkEnabled} onChange={setBulkEnabled} size="sm" />
              <span className={`text-sm font-black ${bulkEnabled ? 'text-emerald-600' : 'text-red-400'}`}>
                {bulkEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Daily limit */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Daily Limit</p>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={480} step={5} value={bulkMinutes}
                onChange={e => setBulkMinutes(parseInt(e.target.value) || 0)}
                className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold
                  text-center text-slate-700 outline-none focus:border-violet-400" />
              <span className="text-xs text-slate-400 font-bold">
                {bulkMinutes === 0 ? 'min (∞)' : 'min / day'}
              </span>
            </div>
          </div>

          {/* Time window */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-2 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Time Window</p>
              <button onClick={() => setBulkCustom(c => !c)}
                className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${
                  bulkCustom ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'
                }`}>
                {bulkCustom ? 'Custom' : 'Global'}
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <TimeInput value={bulkOpen}  disabled={!bulkCustom} onChange={setBulkOpen} />
              <span className="text-slate-300 text-xs font-black">→</span>
              <TimeInput value={bulkClose} disabled={!bulkCustom} onChange={setBulkClose} />
            </div>
          </div>

          {/* Apply button */}
          <div className="flex items-end">
            <button onClick={applyBulkToAll}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-black
                rounded-xl transition-colors text-sm shadow-md shadow-violet-200">
              Apply to All →
            </button>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs font-black text-slate-400 self-center">Quick:</span>
          {[
            { label: '🟢 All On',      patch: { enabled: true } },
            { label: '🔴 All Off',     patch: { enabled: false } },
            { label: '∞ Unlimited',    patch: { daily_minutes: 0 } },
            { label: '⏱ 30 min',      patch: { daily_minutes: 30 } },
            { label: '⏱ 45 min',      patch: { daily_minutes: 45 } },
            { label: '⏱ 60 min',      patch: { daily_minutes: 60 } },
          ].map(btn => (
            <button key={btn.label}
              onClick={() => {
                const grades = { ...cfg.grades };
                GRADES.forEach(g => { grades[g] = { ...grades[g], ...btn.patch }; });
                update({ grades });
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-violet-100 hover:text-violet-700
                text-slate-700 text-xs font-bold rounded-xl transition-colors">
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Grade cards grid ── */}
      <div>
        <h2 className="font-black text-slate-800 mb-4">📚 Per-Grade Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {GRADES.map(grade => (
            <div key={grade} className="relative">
              <GradeCard
                grade={grade}
                gs={cfg.grades[grade] ?? DEFAULT_GRADE_SETTING}
                globalSchedule={cfg.schedule}
                onUpdate={patch => updateGrade(grade, patch)}
                onApplyToAll={() => setConfirmApplyAll(grade)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. Admin tools ── */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-black text-slate-700 text-sm">🛠 Admin Tools</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { resetScreenTime(); alert('Daily screen-time counters reset on this device.'); }}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-sm rounded-xl">
            🔄 Reset Daily Timers (this device)
          </button>
          <button
            onClick={() => { const next = withDefaults({}); setCfg(next); save(next); }}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm rounded-xl">
            ↩ Restore Defaults
          </button>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Screen-time counters are stored per-device in the browser. "Reset" clears today's counter on this machine only.
        </p>
      </div>

      {/* ── Confirm "Apply to All" modal ── */}
      <AnimatePresence>
        {confirmApplyAll && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setConfirmApplyAll(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl p-7 max-w-sm w-full space-y-4">
              <div className="text-4xl text-center">📋</div>
              <h3 className="text-xl font-black text-slate-800 text-center">Apply Grade {confirmApplyAll} to All?</h3>
              <p className="text-sm text-slate-500 text-center">
                This will copy Grade {confirmApplyAll}'s settings
                (access, daily limit, time window) to <strong>all 12 grades</strong>.
              </p>
              {/* Preview the source settings */}
              {(() => {
                const gs = cfg.grades[confirmApplyAll] ?? DEFAULT_GRADE_SETTING;
                return (
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Access</span>
                      <span className={`font-black ${gs.enabled ? 'text-emerald-600' : 'text-red-500'}`}>
                        {gs.enabled ? '● Enabled' : '● Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Daily limit</span>
                      <span className="font-black text-slate-700">{gs.daily_minutes === 0 ? '∞ Unlimited' : `${gs.daily_minutes} min`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Schedule</span>
                      <span className="font-black text-slate-700">
                        {gs.custom_schedule ? `${gs.open_time} → ${gs.close_time}` : 'Global'}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <div className="flex gap-3">
                <button onClick={() => setConfirmApplyAll(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl text-sm">
                  Cancel
                </button>
                <button onClick={() => applyGradeToAll(confirmApplyAll)}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl text-sm">
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
