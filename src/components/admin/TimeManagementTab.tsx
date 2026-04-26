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

// ─── Small helpers ────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-violet-400 bg-white"
    />
  );
}

// ─── Deep merge config with defaults ─────────────────────────────────────────
function withDefaults(raw: any): TimeManagementConfig {
  const cfg = { ...DEFAULT_CONFIG, ...raw };
  cfg.schedule = { ...DEFAULT_CONFIG.schedule, ...(raw?.schedule ?? {}) };
  const grades: Record<string, GradeTimeSetting> = {};
  GRADES.forEach(g => {
    grades[g] = { ...DEFAULT_GRADE_SETTING, ...(raw?.grades?.[g] ?? {}) };
  });
  cfg.grades = grades;
  return cfg;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TimeManagementTab() {
  const [cfg,         setCfg]         = useState<TimeManagementConfig>(DEFAULT_CONFIG);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [expandedGrade, setExpandedGrade] = useState<string | null>(null);

  useEffect(() => {
    getGlobalConfig(CONFIG_KEY).then(raw => {
      if (raw) setCfg(withDefaults(raw));
    });
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save(next: TimeManagementConfig) {
    setSaving(true);
    await setGlobalConfig(CONFIG_KEY, next);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(patch: Partial<TimeManagementConfig>) {
    const next = { ...cfg, ...patch };
    setCfg(next);
    save(next);
  }

  function updateSchedule(patch: Partial<TimeManagementConfig['schedule']>) {
    update({ schedule: { ...cfg.schedule, ...patch } });
  }

  function updateGrade(grade: string, patch: Partial<GradeTimeSetting>) {
    const next: TimeManagementConfig = {
      ...cfg,
      grades: { ...cfg.grades, [grade]: { ...cfg.grades[grade], ...patch } },
    };
    setCfg(next);
    save(next);
  }

  function setAllGrades(patch: Partial<GradeTimeSetting>) {
    const grades = { ...cfg.grades };
    GRADES.forEach(g => { grades[g] = { ...grades[g], ...patch }; });
    update({ grades });
  }

  function toggleDay(day: string) {
    const days = cfg.schedule.days.includes(day)
      ? cfg.schedule.days.filter(d => d !== day)
      : [...cfg.schedule.days, day];
    updateSchedule({ days });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-4xl">

      {/* Save indicator */}
      <AnimatePresence>
        {(saving || saved) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-xl font-bold text-white text-sm shadow-lg ${saving ? 'bg-slate-700' : 'bg-emerald-500'}`}
          >
            {saving ? '💾 Saving…' : '✅ Saved'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Master Switch ── */}
      <div className={`rounded-2xl border-2 p-5 transition-colors ${cfg.global_enabled ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg text-slate-800">Platform Status</h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {cfg.global_enabled ? '🟢 Platform is OPEN — students can access games' : '🔴 Platform is CLOSED — all access blocked'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`font-black text-sm ${cfg.global_enabled ? 'text-emerald-600' : 'text-red-500'}`}>
              {cfg.global_enabled ? 'OPEN' : 'CLOSED'}
            </span>
            <Toggle on={cfg.global_enabled} onChange={v => update({ global_enabled: v })} />
          </div>
        </div>
      </div>

      {/* ── Global Schedule ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-800">Global Schedule</h2>
            <p className="text-slate-400 text-xs mt-0.5">Set a daily time window when the platform is accessible</p>
          </div>
          <Toggle on={cfg.schedule.enabled} onChange={v => updateSchedule({ enabled: v })} />
        </div>

        <AnimatePresence>
          {cfg.schedule.enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Day selector */}
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Active Days</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => (
                    <button key={d}
                      onClick={() => toggleDay(d)}
                      className={`w-12 h-10 rounded-xl font-black text-sm transition-all ${
                        cfg.schedule.days.includes(d)
                          ? 'bg-violet-600 text-white'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {d.slice(0, 2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time range */}
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Opens At</p>
                  <TimeInput value={cfg.schedule.open_time} onChange={v => updateSchedule({ open_time: v })} />
                </div>
                <div className="text-slate-400 font-black mt-4">→</div>
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Closes At</p>
                  <TimeInput value={cfg.schedule.close_time} onChange={v => updateSchedule({ close_time: v })} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Grade Settings ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header + Quick actions */}
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-black text-slate-800 mb-3">Grade Settings</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '🟢 Enable All',   action: () => setAllGrades({ enabled: true })  },
              { label: '🔴 Disable All',  action: () => setAllGrades({ enabled: false }) },
              { label: '⏱ 30 min / All', action: () => setAllGrades({ daily_minutes: 30 }) },
              { label: '⏱ 45 min / All', action: () => setAllGrades({ daily_minutes: 45 }) },
              { label: '♾ Unlimited / All', action: () => setAllGrades({ daily_minutes: 0 }) },
            ].map(btn => (
              <button key={btn.label}
                onClick={btn.action}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grade rows */}
        <div className="divide-y divide-slate-100">
          {GRADES.map(grade => {
            const gs      = cfg.grades[grade] ?? DEFAULT_GRADE_SETTING;
            const expanded = expandedGrade === grade;
            return (
              <div key={grade}>
                {/* Main row */}
                <div className="flex items-center gap-3 px-5 py-3">
                  {/* Grade badge */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    gs.enabled ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    G{grade}
                  </div>

                  {/* Status toggle */}
                  <Toggle on={gs.enabled} onChange={v => updateGrade(grade, { enabled: v })} />

                  {/* Daily limit */}
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-slate-400 text-xs font-bold shrink-0">⏱</span>
                    <input
                      type="number"
                      min={0}
                      max={480}
                      step={5}
                      value={gs.daily_minutes}
                      onChange={e => updateGrade(grade, { daily_minutes: parseInt(e.target.value) || 0 })}
                      className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-700 outline-none focus:border-violet-400 text-center"
                    />
                    <span className="text-slate-400 text-xs shrink-0">
                      {gs.daily_minutes === 0 ? 'min (∞)' : 'min / day'}
                    </span>
                  </div>

                  {/* Custom schedule toggle */}
                  <button
                    onClick={() => {
                      updateGrade(grade, { custom_schedule: !gs.custom_schedule });
                      setExpandedGrade(!gs.custom_schedule ? grade : null);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                      gs.custom_schedule
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {gs.custom_schedule ? '🕐 Custom' : 'Global'}
                  </button>

                  {/* Expand arrow */}
                  {gs.custom_schedule && (
                    <button
                      onClick={() => setExpandedGrade(expanded ? null : grade)}
                      className="text-slate-400 hover:text-slate-700 transition-colors text-xs font-bold px-2"
                    >
                      {expanded ? '▲' : '▼'}
                    </button>
                  )}
                </div>

                {/* Expanded custom schedule */}
                <AnimatePresence>
                  {gs.custom_schedule && expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden bg-indigo-50 border-t border-indigo-100"
                    >
                      <div className="px-5 py-3 space-y-3">
                        <p className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                          Custom Schedule for Grade {grade}
                        </p>
                        {/* Day overrides — inherit from global but allow override */}
                        <div className="flex flex-wrap gap-2 items-center">
                          <div>
                            <p className="text-[10px] font-bold text-indigo-400 mb-1">Opens At</p>
                            <TimeInput value={gs.open_time} onChange={v => updateGrade(grade, { open_time: v })} />
                          </div>
                          <div className="text-indigo-300 font-black mt-4">→</div>
                          <div>
                            <p className="text-[10px] font-bold text-indigo-400 mb-1">Closes At</p>
                            <TimeInput value={gs.close_time} onChange={v => updateGrade(grade, { close_time: v })} />
                          </div>
                        </div>
                        <p className="text-[10px] text-indigo-400 font-medium">
                          Active days inherited from global schedule above.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Reset / Debug ── */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-black text-slate-700 text-sm">Admin Tools</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { resetScreenTime(); alert('Daily screen-time counters reset on this device.'); }}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-sm rounded-xl transition-colors">
            🔄 Reset Daily Timers (this device)
          </button>
          <button
            onClick={() => {
              const next = withDefaults({});
              setCfg(next);
              save(next);
            }}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm rounded-xl transition-colors">
            ↩ Restore Defaults
          </button>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Screen-time counters are stored per-device in the browser. "Reset" clears today's counter on this machine only.
        </p>
      </div>

    </div>
  );
}
