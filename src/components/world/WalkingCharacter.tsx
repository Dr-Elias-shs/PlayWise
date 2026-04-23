"use client";

import { forwardRef } from 'react';

export const CHAR_H  = 72;
export const CHAR_HW = 36;

const FRAMES = [
  '/character/walk1.png',
  '/character/walk2.png',
  '/character/walk3.png',
];

interface Props {
  playerName:      string;
  colorFilter?:    string;   // CSS filter for colour skin
  accessoryEmoji?: string;   // emoji shown above the head
}

/**
 * Outer div is positioned by WorldMap's RAF loop via left / top / transform.
 * All three frame <img> tags are always in the DOM; the loop shows/hides them.
 * colorFilter and accessoryEmoji are plain React props — React updates them
 * when the avatar store changes, no RAF involvement needed.
 */
export const WalkingCharacter = forwardRef<HTMLDivElement, Props>(
  function WalkingCharacter({ playerName, colorFilter = '', accessoryEmoji }, ref) {
    return (
      <div
        ref={ref}
        className="absolute"
        style={{
          left:            0,
          top:             0,
          width:           CHAR_HW * 2,
          height:          CHAR_H,
          transformOrigin: 'center bottom',
          willChange:      'left, top, transform',
          zIndex:          20,
          pointerEvents:   'none',
          userSelect:      'none',
        }}
      >
        {/* Name tag */}
        <div className="absolute w-full flex justify-center" style={{ top: -18 }}>
          <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            {playerName}
          </span>
        </div>

        {/* Accessory above the head — outside the colour filter div */}
        {accessoryEmoji && (
          <div className="absolute w-full flex justify-center"
            style={{ top: -6, lineHeight: 1, zIndex: 1 }}>
            <span style={{ fontSize: 26 }}>{accessoryEmoji}</span>
          </div>
        )}

        {/* Sprite frames — colour filter applied here so emoji keeps its colour */}
        <div style={{ position: 'relative', height: CHAR_H, filter: colorFilter, transition: 'filter 0.2s' }}>
          {FRAMES.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain"
              style={{ display: i === 1 ? 'block' : 'none' }}
            />
          ))}
        </div>
      </div>
    );
  }
);
