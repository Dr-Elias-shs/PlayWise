"use client";

import { useEffect, useRef, useState } from 'react';
import { getGlobalConfig } from '@/lib/wallet';
import {
  TimeManagementConfig, DEFAULT_CONFIG,
  checkAccess, AccessResult, addUsedMinutes,
} from '@/lib/timeManagement';

const CONFIG_KEY = 'time_management';

function withDefaults(raw: any): TimeManagementConfig {
  if (!raw) return DEFAULT_CONFIG;
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    schedule: { ...DEFAULT_CONFIG.schedule, ...(raw.schedule ?? {}) },
    grades:   Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => {
        const g = String(i + 1);
        return [g, { ...DEFAULT_CONFIG.grades[g], ...(raw.grades?.[g] ?? {}) }];
      })
    ),
  };
}

interface UseTimeGuardResult {
  loading:  boolean;
  access:   AccessResult;
  config:   TimeManagementConfig;
  refresh:  () => void;   // call to immediately re-fetch config
}

/**
 * useTimeGuard
 *
 * Fetches the time-management config, evaluates access for the current
 * player's grade, and tracks screen time in the background (1-minute ticks).
 *
 * @param grade  - The student's grade string ('1'–'12'). Pass '' to skip checks.
 * @param active - Set false to pause screen-time tracking (e.g. modal open).
 */
export function useTimeGuard(grade: string, active = true): UseTimeGuardResult {
  // Start as NOT loading — fail open by default.
  // The gate only activates once we have an explicit "denied" from Supabase.
  const [loading, setLoading] = useState(false);
  const [config,  setConfig]  = useState<TimeManagementConfig>(DEFAULT_CONFIG);
  const [access,  setAccess]  = useState<AccessResult>({ allowed: true, minutesLeft: null });
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  // Shared fetch — used on mount, interval, and manual refresh
  function fetchConfig() {
    if (!grade) return;
    getGlobalConfig(CONFIG_KEY)
      .then(raw => {
        const cfg = withDefaults(raw);
        setConfig(cfg);
        setAccess(checkAccess(cfg, grade));
      })
      .catch(() => {
        // Network / Supabase error → fail open so students aren't blocked
        setAccess({ allowed: true, minutesLeft: null });
      })
      .finally(() => setLoading(false));
  }

  // Fetch on mount
  useEffect(() => {
    if (!grade) return;
    fetchConfig();
  }, [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch from Supabase every 15 s so admin changes propagate quickly
  useEffect(() => {
    if (!grade) return;
    const t = setInterval(fetchConfig, 15_000);
    return () => clearInterval(t);
  }, [grade]); // eslint-disable-line react-hooks/exhaustive-deps

  // Screen-time tick — adds 1 minute every 60 s while active
  useEffect(() => {
    if (!grade || !active) return;
    tickRef.current = setInterval(() => {
      addUsedMinutes(grade, 1);
      setConfig(prev => { setAccess(checkAccess(prev, grade)); return prev; });
    }, 60_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [grade, active]); // eslint-disable-line react-hooks/exhaustive-deps

  return { loading, access, config, refresh: fetchConfig };
}
