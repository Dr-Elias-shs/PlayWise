"use client";

import { useRef, useEffect, useCallback } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void; // normalized -1..1
  size?: number;
}

export function Joystick({ onMove, size = 110 }: JoystickProps) {
  const baseRef  = useRef<HTMLDivElement>(null);
  const knobRef  = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);
  const maxR     = size / 2 - 24; // max knob travel radius

  const reset = useCallback(() => {
    activeId.current = null;
    onMove(0, 0);
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, [onMove]);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    function getCenter() {
      const r = base!.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    }

    function handleMove(clientX: number, clientY: number) {
      const { cx, cy } = getCenter();
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
      const nx = dx / maxR;
      const ny = dy / maxR;
      // Dead-zone < 0.12
      onMove(Math.abs(nx) > 0.12 ? nx : 0, Math.abs(ny) > 0.12 ? ny : 0);
    }

    // Touch
    function onTouchStart(e: TouchEvent) {
      if (activeId.current !== null) return;
      const t = e.changedTouches[0];
      activeId.current = t.identifier;
      handleMove(t.clientX, t.clientY);
    }
    function onTouchMove(e: TouchEvent) {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === activeId.current) {
          handleMove(t.clientX, t.clientY);
          break;
        }
      }
    }
    function onTouchEnd(e: TouchEvent) {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === activeId.current) { reset(); break; }
      }
    }

    // Mouse (for desktop testing)
    function onMouseDown(e: MouseEvent) {
      activeId.current = -1;
      handleMove(e.clientX, e.clientY);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    function onMouseMove(e: MouseEvent) {
      if (activeId.current === -1) handleMove(e.clientX, e.clientY);
    }
    function onMouseUp() {
      reset();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    base.addEventListener('touchstart',  onTouchStart, { passive: true });
    base.addEventListener('touchmove',   onTouchMove,  { passive: true });
    base.addEventListener('touchend',    onTouchEnd,   { passive: true });
    base.addEventListener('touchcancel', onTouchEnd,   { passive: true });
    base.addEventListener('mousedown',   onMouseDown);

    return () => {
      base.removeEventListener('touchstart',  onTouchStart);
      base.removeEventListener('touchmove',   onTouchMove);
      base.removeEventListener('touchend',    onTouchEnd);
      base.removeEventListener('touchcancel', onTouchEnd);
      base.removeEventListener('mousedown',   onMouseDown);
    };
  }, [maxR, onMove, reset]);

  return (
    <div
      ref={baseRef}
      className="relative rounded-full select-none touch-none cursor-pointer"
      style={{
        width:  size,
        height: size,
        background: 'rgba(255,255,255,0.12)',
        border: '2px solid rgba(255,255,255,0.25)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Crosshair guides */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-full h-px bg-white" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="h-full w-px bg-white" />
      </div>

      {/* Knob */}
      <div
        ref={knobRef}
        className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
        style={{
          width:     size * 0.42,
          height:    size * 0.42,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(255,255,255,0.55))',
          boxShadow:  '0 4px 16px rgba(0,0,0,0.35)',
          transition: 'box-shadow 0.1s',
        }}
      />
    </div>
  );
}
