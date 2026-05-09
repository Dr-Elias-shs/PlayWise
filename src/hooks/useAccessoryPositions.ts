import { useEffect, useState } from 'react';
import { getGlobalConfig } from '@/lib/wallet';
import { setAccessoryPositionOverrides } from '@/lib/avatar-items';

// Shared promise — deduplicates the network request across all callers
let _promise: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  if (!_promise) {
    _promise = getGlobalConfig('accessory_positions').then(data => {
      if (data) setAccessoryPositionOverrides(data);
    });
  }
  return _promise;
}

export function useAccessoryPositions() {
  const [, setReady] = useState(false);
  useEffect(() => {
    // When the promise resolves, flip state → triggers a re-render so
    // resolveAccessory() is called again with the loaded overrides.
    ensureLoaded().then(() => setReady(true));
  }, []);
}
