/**
 * timeManagement.ts
 *
 * Types, defaults, and pure helper functions for the PlayWise
 * Time Management system.  No React — safe to import anywhere.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GradeTimeSetting {
  enabled:         boolean; // grade allowed to play at all
  daily_minutes:   number;  // 0 = unlimited
  custom_schedule: boolean; // override global schedule for this grade
  open_time:       string;  // "HH:MM" 24 h
  close_time:      string;  // "HH:MM" 24 h
}

export interface TimeManagementConfig {
  global_enabled: boolean;           // master on/off switch
  schedule: {
    enabled:    boolean;             // enforce a global time window
    days:       string[];            // 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
    open_time:  string;
    close_time: string;
    all_day_days: string[];          // open days with no time window (weekends)
  };
  grades: Record<string, GradeTimeSetting>; // keyed by grade string '1'–'12'
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_GRADE_SETTING: GradeTimeSetting = {
  enabled:         true,
  daily_minutes:   0,      // unlimited
  custom_schedule: false,
  open_time:       '07:30',
  close_time:      '15:30',
};

export const DEFAULT_CONFIG: TimeManagementConfig = {
  global_enabled: true,
  schedule: {
    enabled:    false,
    days:       ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    open_time:  '15:00',
    close_time: '20:30',
    all_day_days: ['Sat', 'Sun'],
  },
  grades: Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [String(i + 1), { ...DEFAULT_GRADE_SETTING }])
  ),
};

// ─── Schedule helpers ─────────────────────────────────────────────────────────

function toMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// School time (Beirut), whatever time zone the tablet or the server is set to.
export function schoolNow(at: Date = new Date()): { day: string; mins: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Beirut', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return { day: get('weekday').slice(0, 3), mins: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Is the schedule open right now? Returns the reason when it is not. */
export function scheduleCheck(config: TimeManagementConfig, grade: string, at?: Date): string | null {
  const gs = config.grades[grade] ?? DEFAULT_GRADE_SETTING;
  if (!gs.custom_schedule && !config.schedule.enabled) return null;
  const { day, mins } = schoolNow(at);
  const sched = config.schedule;
  if (sched.enabled && !sched.days.includes(day)) return 'PlayWise is not available today.';
  if (!gs.custom_schedule && (sched.all_day_days ?? []).includes(day)) return null;
  const ot = gs.custom_schedule ? gs.open_time  : sched.open_time;
  const ct = gs.custom_schedule ? gs.close_time : sched.close_time;
  if (mins < toMins(ot) || mins >= toMins(ct)) {
    const weekend = (sched.all_day_days ?? []).length ? ' and all day at weekends' : '';
    return `PlayWise is closed during school time. Come back between ${ot} and ${ct}${weekend}.`;
  }
  return null;
}

export interface AccessResult {
  allowed:     boolean;
  reason?:     string;  // human-readable if denied
  minutesLeft: number | null; // null = unlimited
}

export function checkAccess(
  config: TimeManagementConfig,
  grade:  string,
): AccessResult {
  // 1. Master switch
  if (!config.global_enabled) {
    return { allowed: false, reason: 'The platform is currently closed by the administrator.', minutesLeft: null };
  }

  // 2. Per-grade enable
  const gs = config.grades[grade] ?? DEFAULT_GRADE_SETTING;
  if (!gs.enabled) {
    return { allowed: false, reason: `Access for Grade ${grade} is currently disabled.`, minutesLeft: null };
  }

  // 3. Schedule check
  const closed = scheduleCheck(config, grade);
  if (closed) return { allowed: false, reason: closed, minutesLeft: null };

  // 4. Daily screen time
  const used = getUsedMinutes(grade);
  if (gs.daily_minutes > 0) {
    const left = Math.max(0, gs.daily_minutes - used);
    if (left === 0) {
      return { allowed: false, reason: `Daily screen time limit (${gs.daily_minutes} min) reached for Grade ${grade}.`, minutesLeft: 0 };
    }
    return { allowed: true, minutesLeft: left };
  }

  return { allowed: true, minutesLeft: null };
}

// ─── Screen-time tracking (localStorage) ─────────────────────────────────────

function todayKey(grade: string): string {
  const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `pw_time_${grade}_${d}`;
}

export function getUsedMinutes(grade: string): number {
  try { return parseInt(localStorage.getItem(todayKey(grade)) ?? '0', 10) || 0; }
  catch { return 0; }
}

export function addUsedMinutes(grade: string, mins: number): void {
  try {
    const next = getUsedMinutes(grade) + mins;
    localStorage.setItem(todayKey(grade), String(next));
  } catch {}
}

// Reset all screen-time counters (for testing / admin)
export function resetScreenTime(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith('pw_time_'))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}
