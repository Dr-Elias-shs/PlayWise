import { RoomKey } from '@/store/useWorldStore';
import { LeveledQuestion } from './questionBank';

export interface RoomQuestion {
  text: string;
  choices: string[];
  answer: number; // index into choices
}

export interface RoomBounds {
  // All values in MAP_W / MAP_H fractions (0–1)
  x1: number; y1: number;   // top-left corner
  x2: number; y2: number;   // bottom-right corner
}

export interface RoomDef {
  key: RoomKey;
  label: string;
  emoji: string;
  color: string;
  door: { x: number; y: number }; // door centre (0–1 fractions)
  bounds: RoomBounds;               // collision rectangle (0–1 fractions)
  questions?: LeveledQuestion[];    // optional now as we use QUESTION_BANK
  mission: string;                  // Mission prompt for HUD
}

// Coordinate reference: map is 900×600 internal units.
// Percentages below are door centres in those units.
export const ROOMS: RoomDef[] = [
  {
    key: 'math',
    label: 'Math Classroom',
    emoji: '➕',
    color: 'from-blue-500 to-cyan-500',
    door: { x: 0.27, y: 0.52 },
    bounds: { x1: 0.00, y1: 0.42, x2: 0.27, y2: 0.68 },
    mission: 'Calculate the energy needed for the Wisdom Robot!',
  },
  {
    key: 'science',
    label: 'Science Lab',
    emoji: '🔬',
    color: 'from-green-500 to-emerald-500',
    door: { x: 0.13, y: 0.44 },
    bounds: { x1: 0.00, y1: 0.00, x2: 0.22, y2: 0.44 },
    mission: 'Synthesize the power core in the Lab!',
  },
  {
    key: 'computer',
    label: 'Computer Lab',
    emoji: '💻',
    color: 'from-violet-500 to-purple-600',
    door: { x: 0.32, y: 0.44 },
    bounds: { x1: 0.22, y1: 0.00, x2: 0.42, y2: 0.44 },
    mission: 'Write the operating system for our Robot!',
  },
  {
    key: 'robotics',
    label: 'Robotics Room',
    emoji: '🤖',
    color: 'from-orange-500 to-amber-500',
    door: { x: 0.50, y: 0.44 },
    bounds: { x1: 0.42, y1: 0.00, x2: 0.60, y2: 0.44 },
    mission: 'Assemble the Wisdom Robot gears!',
  },
  {
    key: 'library',
    label: 'Library',
    emoji: '📚',
    color: 'from-amber-600 to-yellow-500',
    door: { x: 0.65, y: 0.44 },
    bounds: { x1: 0.60, y1: 0.00, x2: 0.75, y2: 0.44 },
    mission: 'Research ancient robot designs in the Library!',
  },
  {
    key: 'history',
    label: 'History Room',
    emoji: '🏛️',
    color: 'from-rose-600 to-red-500',
    door: { x: 0.80, y: 0.44 },
    bounds: { x1: 0.75, y1: 0.00, x2: 1.00, y2: 0.44 },
    mission: 'Learn the History of Wisdom!',
  },
  {
    key: 'language_arts',
    label: 'Language Arts',
    emoji: '✏️',
    color: 'from-pink-500 to-rose-500',
    door: { x: 0.55, y: 0.62 },
    bounds: { x1: 0.45, y1: 0.44, x2: 0.76, y2: 0.68 },
    mission: 'Teach the Robot how to speak properly!',
  },
  {
    key: 'reading',
    label: 'Reading Corner',
    emoji: '📖',
    color: 'from-teal-500 to-cyan-600',
    door: { x: 0.82, y: 0.62 },
    bounds: { x1: 0.76, y1: 0.44, x2: 1.00, y2: 0.68 },
    mission: 'Read the manual to your new mechanical friend!',
  },
  {
    key: 'art',
    label: 'Art Room',
    emoji: '🎨',
    color: 'from-fuchsia-500 to-purple-500',
    door: { x: 0.12, y: 0.72 },
    bounds: { x1: 0.00, y1: 0.68, x2: 0.22, y2: 1.00 },
    mission: 'Paint the Robot to make it look friendly!',
  },
  {
    key: 'music',
    label: 'Music Room',
    emoji: '🎵',
    color: 'from-indigo-500 to-blue-600',
    door: { x: 0.27, y: 0.72 },
    bounds: { x1: 0.22, y1: 0.68, x2: 0.38, y2: 1.00 },
    mission: 'Compose a startup theme for the Robot!',
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    emoji: '🍎',
    color: 'from-lime-500 to-green-600',
    door: { x: 0.62, y: 0.72 },
    bounds: { x1: 0.53, y1: 0.68, x2: 0.73, y2: 1.00 },
    mission: 'Prepare organic fuel for the journey!',
  },
  {
    key: 'cafeteria',
    label: 'Cafeteria',
    emoji: '🍽️',
    color: 'from-yellow-500 to-orange-500',
    door: { x: 0.80, y: 0.72 },
    bounds: { x1: 0.73, y1: 0.68, x2: 1.00, y2: 1.00 },
    mission: 'Celebrate the Robot activation with a feast!',
  },
];

// Map internal dimensions (must match the scale factor in WorldMap)
export const MAP_W = 900;
export const MAP_H = 600;
export const DOOR_RADIUS   = 48;  // px — how close player must be to trigger entry
export const PLAYER_RADIUS = 18;  // px — character collision circle radius

// ── Wall collision types & helpers ────────────────────────────────────────────

export interface WallDef {
  id: string;
  bounds: RoomBounds; // re-uses the same 0-1 fraction format
}

function rectToPx(r: RoomBounds) {
  return {
    x1: r.x1 * MAP_W, y1: r.y1 * MAP_H,
    x2: r.x2 * MAP_W, y2: r.y2 * MAP_H,
  };
}

function circleIntersectsRect(cx: number, cy: number, radius: number, rect: RoomBounds): boolean {
  const r = rectToPx(rect);
  const closestX = Math.max(r.x1, Math.min(cx, r.x2));
  const closestY = Math.max(r.y1, Math.min(cy, r.y2));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

export function collidesWithWalls(x: number, y: number, radius = PLAYER_RADIUS): boolean {
  return WALLS.some(w => circleIntersectsRect(x, y, radius, w.bounds));
}

export function getRoomAtDoor(playerX: number, playerY: number): RoomDef | null {
  for (const room of ROOMS) {
    const dx = room.door.x * MAP_W - playerX;
    const dy = room.door.y * MAP_H - playerY;
    if (dx * dx + dy * dy <= DOOR_RADIUS * DOOR_RADIUS) return room;
  }
  return null;
}

// ── WALLS ─────────────────────────────────────────────────────────────────────
// Edit these with the visual editor at /wall-editor
// Each entry is a thin rectangle (in 0-1 fractions) that blocks movement.

export const WALLS: WallDef[] = [
  // Outer border
  { id: 'outer_top',          bounds: { x1: 0.00, y1: 0.00, x2: 1.00, y2: 0.015 } },
  { id: 'outer_left',         bounds: { x1: 0.00, y1: 0.00, x2: 0.015, y2: 1.00 } },
  { id: 'outer_right',        bounds: { x1: 0.985, y1: 0.00, x2: 1.00, y2: 1.00 } },
  { id: 'outer_bottom_left',  bounds: { x1: 0.00, y1: 0.985, x2: 0.44, y2: 1.00 } },
  { id: 'outer_bottom_right', bounds: { x1: 0.56, y1: 0.985, x2: 1.00, y2: 1.00 } },

  // Horizontal divider: top rooms from corridor (with door gaps)
  { id: 'h_top_seg1', bounds: { x1: 0.00, y1: 0.435, x2: 0.085, y2: 0.45 } },
  { id: 'h_top_seg2', bounds: { x1: 0.175, y1: 0.435, x2: 0.285, y2: 0.45 } },
  { id: 'h_top_seg3', bounds: { x1: 0.375, y1: 0.435, x2: 0.455, y2: 0.45 } },
  { id: 'h_top_seg4', bounds: { x1: 0.545, y1: 0.435, x2: 0.615, y2: 0.45 } },
  { id: 'h_top_seg5', bounds: { x1: 0.705, y1: 0.435, x2: 0.755, y2: 0.45 } },
  { id: 'h_top_seg6', bounds: { x1: 0.875, y1: 0.435, x2: 1.00, y2: 0.45 } },

  // Horizontal divider: corridor from bottom rooms (with door gaps)
  { id: 'h_bot_seg1', bounds: { x1: 0.00, y1: 0.675, x2: 0.09, y2: 0.69 } },
  { id: 'h_bot_seg2', bounds: { x1: 0.15, y1: 0.675, x2: 0.35, y2: 0.69 } },
  { id: 'h_bot_seg3', bounds: { x1: 0.44, y1: 0.675, x2: 0.61, y2: 0.69 } },
  { id: 'h_bot_seg4', bounds: { x1: 0.67, y1: 0.675, x2: 0.745, y2: 0.69 } },
  { id: 'h_bot_seg5', bounds: { x1: 0.80, y1: 0.675, x2: 1.00, y2: 0.69 } },

  // Vertical dividers between top rooms
  { id: 'v_sci_comp',   bounds: { x1: 0.218, y1: 0.00, x2: 0.228, y2: 0.44 } },
  { id: 'v_comp_rob',   bounds: { x1: 0.418, y1: 0.00, x2: 0.428, y2: 0.44 } },
  { id: 'v_rob_lib',    bounds: { x1: 0.598, y1: 0.00, x2: 0.608, y2: 0.44 } },
  { id: 'v_lib_hist',   bounds: { x1: 0.748, y1: 0.00, x2: 0.758, y2: 0.44 } },

  // Left side: Math Classroom wall (right side, with door gap)
  { id: 'math_right_top', bounds: { x1: 0.268, y1: 0.44, x2: 0.278, y2: 0.50 } },
  { id: 'math_right_bot', bounds: { x1: 0.268, y1: 0.62, x2: 0.278, y2: 0.68 } },

  // Right side: Language Arts + Reading corner (left wall with door gaps)
  { id: 'lang_left_top',  bounds: { x1: 0.598, y1: 0.44, x2: 0.608, y2: 0.50 } },
  { id: 'lang_left_bot',  bounds: { x1: 0.598, y1: 0.62, x2: 0.608, y2: 0.68 } },
  { id: 'read_left_top',  bounds: { x1: 0.818, y1: 0.44, x2: 0.828, y2: 0.50 } },
  { id: 'read_left_bot',  bounds: { x1: 0.818, y1: 0.62, x2: 0.828, y2: 0.68 } },
  { id: 'lang_read_div',  bounds: { x1: 0.818, y1: 0.44, x2: 0.828, y2: 0.68 } },

  // Vertical dividers between bottom rooms
  { id: 'v_art_music',   bounds: { x1: 0.238, y1: 0.69, x2: 0.248, y2: 1.00 } },
  { id: 'v_mus_kit',     bounds: { x1: 0.528, y1: 0.69, x2: 0.538, y2: 1.00 } },
  { id: 'v_kit_caf',     bounds: { x1: 0.728, y1: 0.69, x2: 0.738, y2: 1.00 } },

  // Entrance corridor walls (bottom centre)
  { id: 'entrance_left',  bounds: { x1: 0.44, y1: 0.88, x2: 0.45, y2: 1.00 } },
  { id: 'entrance_right', bounds: { x1: 0.55, y1: 0.88, x2: 0.56, y2: 1.00 } },
];
