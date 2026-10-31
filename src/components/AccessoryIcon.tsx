"use client";
import { useState } from 'react';
import type { AccessoryItem } from '@/lib/avatar-items';

// A shop accessory: its Higgsfield picture (public/accessories/<id>.webp) when there
// is one, otherwise the emoji. `size` is the emoji font size in px; the picture gets
// a matching box.
export function AccessoryIcon({ item, size }: { item: Pick<AccessoryItem, 'id' | 'emoji' | 'name' | 'image'>; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!item.image || failed) return <>{item.emoji}</>;
  const px = Math.round(size * 1.15);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image} alt={item.name} draggable={false} onError={() => setFailed(true)}
      style={{ width: px, height: px, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle' }} />
  );
}
