"use client";
import { useEffect, useState } from 'react';
import { LoopVideo } from './LoopVideo';
import { MASCOT } from '@/lib/world';

// The owl in a round window: waves hello when the hub opens, then thinks quietly.
// mood 'cheer' plays the celebration clip (after a good round).
export function MascotBubble({ size = 64, mood }: { size?: number; mood?: 'cheer' }) {
  const [clip, setClip] = useState<'wave' | 'think'>('wave');
  useEffect(() => {
    if (mood) return;
    const t = setTimeout(() => setClip('think'), 5200);
    return () => clearTimeout(t);
  }, [mood]);
  const src = mood === 'cheer' ? MASCOT.cheer : clip === 'wave' ? MASCOT.wave : MASCOT.think;
  return (
    <div className="relative shrink-0 rounded-full overflow-hidden bg-sky-200"
      style={{ width: size, height: size, boxShadow: '0 0 0 4px #fff, 0 6px 16px -4px rgba(15,60,40,0.4)' }}>
      <LoopVideo key={src} src={src} poster={MASCOT.still} className="absolute inset-0 w-full h-full scale-110" />
    </div>
  );
}
