// PlayWise Valley (Nov 2026 redesign): every game is a place in one illustrated
// world. Pictures and loops were made with Higgsfield and live in public/world
// (left out of the PWA precache; the browser caches them as they are shown).

export interface Place {
  name: string;      // the place, e.g. "Trivia Tower"
  image: string;     // full backdrop (1280 px)
  card: string;      // hub card picture (560 px)
  loop?: string;     // short silent mp4 loop for the hub card
  tint: string;      // colour used to darken the backdrop behind game screens
}

const p = (id: string, name: string, tint: string): Place => ({
  name,
  image: `/world/places/${id}.webp`,
  card: `/world/places/${id}-card.webp`,
  loop: `/world/loops/${id}.mp4`,
  tint,
});

export const PLACES: Record<string, Place> = {
  addition:       p('addition',       'Number Rapids',      '8, 47, 73'),
  multiplication: p('multiplication', 'Times Table Castle', '49, 24, 87'),
  division:       p('division',       'Division Docks',     '12, 52, 84'),
  fractions:      p('fractions',      'Fraction Bakery',    '84, 33, 18'),
  brain:          p('brain',          'Puzzle Temple',      '28, 58, 24'),
  hangman:        p('hangman',        'Word Cliffs',        '14, 58, 82'),
  memory:         p('memory',         'Memory Garden',      '30, 56, 30'),
  trivia:         p('trivia',         'Trivia Tower',       '38, 22, 82'),
  chess:          p('chess',          'Chess Kingdom',      '40, 30, 20'),
  'spelling-bee': p('spelling-bee',   'Spelling Hive',      '92, 58, 6'),
  penalty:        p('penalty',        'Penalty Stadium',    '12, 66, 36'),
};

/** CSS background for a game screen: its place picture, dimmed so white text stays readable. */
export function placeBackground(id: string, strength = 0.72): string {
  const pl = PLACES[id];
  if (!pl) return 'linear-gradient(160deg, #134e4a, #1e3a5f)';
  const top = Math.max(0, strength - 0.18);
  return `linear-gradient(180deg, rgba(${pl.tint}, ${top}) 0%, rgba(${pl.tint}, ${strength}) 55%, rgba(${pl.tint}, ${Math.min(0.92, strength + 0.12)}) 100%), url(${pl.image}) center / cover no-repeat`;
}

export const VALLEY = { image: '/world/valley.webp', small: '/world/valley-small.webp', loop: '/world/loops/valley.mp4' };
export const MASCOT = { still: '/world/mascot.webp', wave: '/world/loops/owl-wave.mp4', cheer: '/world/loops/owl-cheer.mp4', think: '/world/loops/owl-think.mp4' };
export const INTRO = { still: '/world/intro.webp', video: '/world/intro.mp4' };
