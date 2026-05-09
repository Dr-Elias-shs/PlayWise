import { useEffect } from 'react';
import { getGlobalConfig } from '@/lib/wallet';
import { setAccessoryPositionOverrides } from '@/lib/avatar-items';

let loaded = false; // module-level flag — only fetch once per session

export function useAccessoryPositions() {
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    getGlobalConfig('accessory_positions').then(data => {
      if (data) setAccessoryPositionOverrides(data);
    });
  }, []);
}
