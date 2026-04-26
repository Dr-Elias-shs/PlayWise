"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { getGlobalConfig } from '@/lib/wallet';
import {
  TimeManagementConfig, DEFAULT_CONFIG,
  checkAccess, AccessResult, addUsedMinutes,
} from '@/lib/timeManagement';

const CONFIG_KEY = 'time_management';

function withDefaults(raw: any): TimeManagementConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG };
  const cfg: TimeManagementConfig = {
    global_enabled: raw.global_enabled !== false, // default TRUE unless explicitly false
    schedule: { ...DEFAULT_CONFIG.schedule, ...(raw.schedule ?? {}) },
    grades: Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => {
        const g = String(i + 1);
        const saved = raw.grades?.[g];
        return [g, {
          enabled:         saved?.enabled         !== false, // default TRUE
          daily_minutes:   saved?.daily_minutes   ?? 0,
          custom_schedule: saved?.custom_schedule ?? false,
          open_time:       saved?.open_time       ?? '07:30',
          close_time:      saved?.close_time      ?? '15:30',
        }];
      })
    ),
  };
  return cfg;
}

interface UseTimeGuardResult {
  loading:  boolean;
  access:   AccessResult;
  config:   TimeManagementConfig;
  refresh:  () => void;
}

export function useTimeGuard(grade: string, active = true): UseTimeGuardResult {
  const [loading, setLoading] = useState(false);
  const [config,  setConfig]  = useState<TimeManagementConfig>({ ...DEFAULT_CONFIG });
  const [access,  setAccess]  = useState<AccessResult>({ allowed: true, minutesLeft: null });
  const tickRef   = useRef<NodeJS.Timeout | null>(null);
  const gradeRef  = useRef(grade);
  gradeRef.current = grade;

  const fetchConfig = useCallback(() => {
    const g = gradeRef.current;
    if (!g) {
      // No grade — skip check, leave allowed=true
      setLoading(false);
      return;
    }
    getGlobalConfig(CONFIG_KEY)
      .then(raw => {
        console.log('[TimeGuard] raw config from Supabase:', JSON.stringify(raw));
        const cfg = withDefaults(raw);
        console.log('[TimeGuard] grade:', g, '| global_enabled:', cfg.global_enabled, '| grade enabled:', cfg.grades[g]?.enabled);
        const result = checkAccess(cfg, g);
        console.log('[TimeGuard] access result:', result);
        setConfig(cfg);
        setAccess(result);
      })
      .catch(err => {
        console.warn('[TimeGuard] fetch failed, failing open:', err);
        setAccess({ allowed: true, minutesLeft: null });
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch on mount and whenever grade changes
  useEffect(() => {
    fetchConfig();
  }, [grade, fetchConfig]);

  // Re-fetch every 15 s
  useEffect(() => {
    const t = setInterval(fetchConfig, 15_000);
    return () => clearInterval(t);
  }, [fetchConfig]);

  // Screen-time tick
  useEffect(() => {
    const g = gradeRef.current;
    if (!g || !active) return;
    tickRef.current = setInterval(() => {
      addUsedMinutes(g, 1);
      setConfig(prev => { setAccess(checkAccess(prev, g)); return prev; });
    }, 60_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [grade, active]);

  return { loading, access, config, refresh: fetchConfig };
}
