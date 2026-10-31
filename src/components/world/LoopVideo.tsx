"use client";
import { useEffect, useRef, useState } from 'react';

// A silent looping clip with its still picture as poster. It only plays while
// `play` is true and the picture is on screen; with reduced motion, or if the
// clip cannot load (slow Wi-Fi, blocked media), the still picture stays.
export function LoopVideo({ src, poster, play = true, className, style }: {
  src?: string;
  poster: string;
  play?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || failed) return;
    if (play && visible && !reduced) el.play().catch(() => { /* autoplay refused: poster stays */ });
    else el.pause();
  }, [play, visible, reduced, failed]);

  if (!src || failed || reduced) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={poster} alt="" draggable={false} className={className} style={{ objectFit: 'cover', ...style }} />;
  }
  return (
    <video ref={ref} src={src} poster={poster} muted loop playsInline preload="none"
      onError={() => setFailed(true)} className={className}
      style={{ objectFit: 'cover', ...style }} />
  );
}
