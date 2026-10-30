"use client";
import { useState } from 'react';

// Prize pictures ship as static files: public/prizes/<slug>.webp, where slug is the
// prize name lower-cased with non-letters as dashes. Prizes not listed here (or whose
// picture fails to load) show their emoji, so admins can still add prizes freely.
const PRIZE_IMAGES = new Set([
  'sticker-pack',
  'playwise-bookmark',
  'class-dj',
  'sit-anywhere-day',
  'tech-helper-for-a-day',
  'extra-computer-time',
  'playwise-notebook',
  'champion-certificate',
  'playwise-keychain',
]);

export function prizeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function PrizeIcon({ name, emoji, size }: { name: string; emoji: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const slug = prizeSlug(name);

  if (failed || !PRIZE_IMAGES.has(slug)) {
    return <span style={{ fontSize: size * 0.75, lineHeight: 1 }}>{emoji}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/prizes/${slug}.webp`} alt={name} width={size} height={size} loading="lazy"
      className="rounded-2xl object-cover" style={{ width: size, height: size }}
      onError={() => setFailed(true)} />
  );
}
