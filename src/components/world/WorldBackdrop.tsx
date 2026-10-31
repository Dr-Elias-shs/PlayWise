"use client";
import { LoopVideo } from './LoopVideo';
import { VALLEY } from '@/lib/world';

// PlayWise Valley behind the hub, sign-in and shop: the gently moving valley loop,
// softened with a light wash so cards and text stay easy to read.
export function WorldBackdrop({ wash = 0.35 }: { wash?: number }) {
  return (
    <div className="fixed inset-0 -z-0 pointer-events-none overflow-hidden" aria-hidden>
      <LoopVideo src={VALLEY.loop} poster={VALLEY.image} className="w-full h-full" />
      <div className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, rgba(255,255,255,${wash * 0.4}) 0%, rgba(240,249,255,${wash}) 45%, rgba(236,253,245,${Math.min(0.95, wash + 0.35)}) 100%)` }} />
    </div>
  );
}
