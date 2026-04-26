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
  const [loading, setLoading] = useState(true);
  const [config,  setConfig]  = useState<TimeManagementConfig>(DEFAULT_CONFIG);
  const [access,  setAccess]  = useState<AccessResult>({ allowed: true, minutesLeft: null });
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch config once on mount
  useEffect(() => {
    getGlobalConfig(CONFIG_KEY).then(raw => {
      const cfg = withDefaults(raw);
      setConfig(cfg);
      if (grade) setAccess(checkAccess(cfg, grade));
      setLoading(false);
    });
  }, [grade]);

  // Re-fetch config from Supabase every 30 s so admin changes propagate live
  useEffect(() => {
    if (!grade) return;
    const t = setInterval(() => {
      getGlobalConfig(CONFIG_KEY).then(raw => {
        const cfg = withDefaults(raw);
        setConfig(cfg);
        setAccess(checkAccess(cfg, grade));
      });
    }, 30_000);
    return () => clearInterval(t);
  }, [grade]);

  // Screen-time tick — adds 1 minute every 60 s while active
  useEffect(() => {
    if (!grade || !active) return;
    tickRef.current = setInterval(() => {
      addUsedMinutes(grade, 1);
      // Re-check after adding time (limit may now be hit)
      setConfig(prev => {
        setAccess(checkAccess(prev, grade));
        return prev;
      });
    }, 60_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [grade, active]);

  return { loading, access, config };
}
