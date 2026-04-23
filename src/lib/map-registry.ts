/**
 * Map registry — add a new entry here for every new game map.
 * The wall editor and WorldMap both key off this list.
 *
 * Each map needs:
 *   - A unique `id` (lowercase, no spaces)
 *   - A map image at  public/maps/{id}.png
 *   - A config file at public/maps/{id}.json  (created by the wall editor)
 */
export interface MapMeta {
  id:    string;
  name:  string;
  image: string;   // path relative to /public
}

export const MAP_REGISTRY: MapMeta[] = [
  { id: 'school', name: 'School',  image: '/maps/floor_map.png' },
  // { id: 'hospital', name: 'Hospital', image: '/maps/hospital.png' },
];

export const DEFAULT_MAP_ID = 'school';
