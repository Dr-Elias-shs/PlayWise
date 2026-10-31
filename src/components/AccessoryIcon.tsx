"use client";
import { useState } from 'react';
import type { AccessoryItem } from '@/lib/avatar-items';

// A shop accessory: its Higgsfield picture (public/accessories/<id>.webp) when there
// is one, otherwise the emoji. `size` is the emoji font size in px; the picture gets
// a matching box.
// The picture fills its whole box, where an emoji glyph leaves room around it, so a
// hat picture is lifted a little to rest on the head instead of covering the eyes.
export function AccessoryIcon({ item, size, onCharacter = false }: {
  item: Pick<AccessoryItem, 'id' | 'emoji' | 'name' | 'image'> & { category?: string };
  size: number;
  onCharacter?: boolean;   // true where it is worn on the character (not in shop lists)
}) {
  const [failed, setFailed] = useState(false);
  if (!item.image || failed) return <>{item.emoji}</>;
  const px = Math.round(size);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.image} alt={item.name} draggable={false} onError={() => setFailed(true)}
      style={{ width: px, height: px, objectFit: 'contain', display: 'block',
               transform: onCharacter && item.category === 'hat' ? 'translateY(-27%)' : undefined }} />
  );
}
