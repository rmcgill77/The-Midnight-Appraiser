// Places this game adds to the original's city (Phase 20, more in Phase 21). They sit on
// the same street grid and the same maps, but they aren't part of the original rules: no
// errands, no hours of their own. You walk in through the door instead of opening a panel.
// Phase 21 also gives every place on the map an icon that says what it is (MAP_ICON), and
// every storefront its own look (FRONTS).

// A 16x16 pixel icon, drawn as rows ('#' ink, '.' empty), registered alongside the
// original's icon set so the map, the roof signs and the panels can all draw it.
export function iconFromRows(rows) {
  let d = '';
  rows.forEach((r, y) => { for (let x = 0; x < r.length;) { if (r[x] !== '#') { x++; continue; } let w = 0; while (r[x + w] === '#') w++; d += `M${x} ${y}h${w}v1h-${w}z`; x += w; } });
  return d;
}
export const PLACE_ICONS = {
  mug: iconFromRows([
    '................',
    '................',
    '....##.##.#.....',
    '...#########....',
    '...#########....',
    '...#.......####.',
    '...#.#.#.#.#..#.',
    '...#.#.#.#.#..#.',
    '...#.#.#.#.#..#.',
    '...#.#.#.#.#..#.',
    '...#.#.#.#.#..#.',
    '...#.#.#.#.####.',
    '...#.......#....',
    '...#########....',
    '................',
    '................',
  ]),
  // The diner: a slice of pie with steam.
  pie: iconFromRows([
    '................',
    '.....#...#......',
    '....#...#.......',
    '.....#...#......',
    '................',
    '.......#........',
    '......###.......',
    '.....#.#.#......',
    '....#######.....',
    '...#.#.#.#.#....',
    '..###########...',
    '.#...........#..',
    '..###########...',
    '................',
    '................',
    '................',
  ]),
  // The movie theater: a strip of film.
  film: iconFromRows([
    '................',
    '..############..',
    '..#.#......#.#..',
    '..############..',
    '..#.#......#.#..',
    '..#.#......#.#..',
    '..############..',
    '..#.#......#.#..',
    '..#.#......#.#..',
    '..############..',
    '..#.#......#.#..',
    '..#.#......#.#..',
    '..############..',
    '..#.#......#.#..',
    '..############..',
    '................',
  ]),
  // The thrift store: a coat hanger.
  hanger: iconFromRows([
    '................',
    '.......##.......',
    '......#..#......',
    '.........#......',
    '........#.......',
    '.......#........',
    '......###.......',
    '.....#...#......',
    '....#.....#.....',
    '...#.......#....',
    '..#.........#...',
    '.#...........#..',
    '.#############..',
    '................',
    '................',
    '................',
  ]),
  // The chapel: a candle.
  candle: iconFromRows([
    '................',
    '.......#........',
    '......###.......',
    '......###.......',
    '.......#........',
    '......###.......',
    '......###.......',
    '......###.......',
    '......###.......',
    '......###.......',
    '......###.......',
    '....#######.....',
    '...#########....',
    '....#######.....',
    '................',
    '................',
  ]),
  // Erin's Wandering Brush: a paintbrush.
  brush: iconFromRows([
    '................',
    '...........###..',
    '..........####..',
    '.........####...',
    '........####....',
    '.......####.....',
    '......####......',
    '.....#.##.......',
    '....###.........',
    '...####.........',
    '..####..........',
    '..###...........',
    '.##.............',
    '.#..............',
    '................',
    '................',
  ]),
  // Your apartment: a little house.
  home: iconFromRows([
    '................',
    '.......##.......',
    '......####......',
    '.....##..##.....',
    '....##....##....',
    '...##......##...',
    '..############..',
    '...#........#...',
    '...#.##..##.#...',
    '...#.##..##.#...',
    '...#........#...',
    '...#...##...#...',
    '...#...##...#...',
    '...##########...',
    '................',
    '................',
  ]),
  // Halberd & Vane: a tower.
  tower: iconFromRows([
    '.......#........',
    '.......#........',
    '......###.......',
    '.....#####......',
    '.....#.#.#......',
    '.....#####......',
    '.....#.#.#......',
    '....#######.....',
    '....#.#.#.#.....',
    '....#######.....',
    '....#.#.#.#.....',
    '....#######.....',
    '....#.#.#.#.....',
    '....#######.....',
    '..###########...',
    '................',
  ]),
  // v2.3: Bait & Tackle, on the beach boardwalk: a fish.
  fish: iconFromRows([
    '................',
    '................',
    '................',
    '.......####.....',
    '.....########...',
    '#...##########..',
    '##.###########..',
    '.############.#.',
    '.##############.',
    '.############.#.',
    '##.###########..',
    '#...##########..',
    '.....########...',
    '.......####.....',
    '................',
    '................',
  ]),
};
export function registerPlaceIcons() {
  const icons = globalThis.SSP_ICONS;
  if (icons) for (const [k, d] of Object.entries(PLACE_ICONS)) icons[k] ??= d;
}
registerPlaceIcons();

// Phase 21: the icon each place shows on the maps and over its door. Most are the
// original's own; a few are swapped for one that says what the building is.
const MAP_ICON = { apartment: 'home', relay: 'radio', tower: 'tower', firehouse: 'flame', office: 'seal' };
export const mapIcon = loc => MAP_ICON[loc.id] ?? loc.icon;

// v2.3: the Bait & Tackle shack on the beach boardwalk (data/areas.js BEACH). Not on the
// city's street, so not one of the places below: only its storefront and sign.
export const TACKLE = { id: 'tackle', name: 'Bait & Tackle', icon: 'fish', front: { awning: ['#24474a', '#d8d0bc'], sign: '#9fd0d0', glow: '#e0a64a' } };

// The places themselves. `enter.room` is the room you walk into; `staff` are the people
// who work there (they stand at `spot`s in data/rooms.js); `front` is how the storefront
// looks from the street (awning stripes, the sign's color).
export const EXTRA_PLACES = [
  {
    id: 'bar', name: 'The Brass Lantern', icon: 'mug', district: 'oldmarket', x: 58, y: 42,
    blurb: 'The corner bar where the whole town ends up sooner or later. A piano nobody owns, a booth everybody wants, and regulars at all hours.',
    enter: { room: 'bar' }, front: { awning: ['#4a1a1e', '#8a6a3a'], sign: '#e0a64a', glow: '#e0a64a' },
  },
  {
    id: 'diner', name: 'The Owl Diner', icon: 'pie', district: 'narrows', x: 44, y: 70,
    blurb: 'Open all night, every night. The coffee is bottomless and the pie is better than it has any right to be.',
    enter: { room: 'diner' }, front: { awning: ['#24474a', '#d8d0bc'], sign: '#9fd0d0', glow: '#9fd0d0' },
  },
  {
    id: 'bijou', name: 'The Bijou', icon: 'film', district: 'oldmarket', x: 66, y: 54,
    blurb: 'A movie palace from 1928 with one screen, two hundred seats and a balcony that has been closed since 1961.',
    enter: { room: 'bijou' }, front: { awning: ['#6e2e3e', '#e0a64a'], sign: '#f0c060', glow: '#f6d48a', marquee: true },
  },
  {
    id: 'thrift', name: 'Second Hand Rose', icon: 'hanger', district: 'westside', x: 22, y: 48,
    blurb: 'A thrift store packed to the ceiling. Rose prices everything by how she feels about it that morning.',
    enter: { room: 'thrift' }, front: { awning: ['#6a3a5e', '#c9b98f'], sign: '#d6a0c8', glow: '#e0a64a' },
  },
  {
    id: 'chapel', name: 'St. Brigid’s Chapel', icon: 'candle', district: 'kessler', x: 46, y: 20,
    blurb: 'A small stone chapel, always unlocked. Candles burn in the side aisle whether anyone lights them or not.',
    enter: { room: 'chapel' }, front: { stone: true, sign: '#c9c2b0', glow: '#e0a64a' },
  },
  {
    id: 'brush', name: 'Erin’s Wandering Brush', icon: 'brush', district: 'westside', x: 30, y: 62,
    blurb: 'Erin’s interior design studio: paint chips, fabric bolts, and furniture set out like rooms you could live in. She’ll help with your apartment.',
    enter: { room: 'brush' }, front: { awning: ['#3a6a5a', '#e8e0cc'], sign: '#e8c8a0', glow: '#f0c88a' },
  },
];
export const extraPlace = id => EXTRA_PLACES.find(p => p.id === id) ?? null;

// Original locations you can now walk into (Phase 21): the library's reading room.
// When the place is shut, its door shows the hours instead (as before).
export const WALK_INS = { library: { room: 'library' } };

// Storefronts for the original's places (by kind), and for the night zones.
export function frontOf(loc) {
  if (loc.front) return loc.front;
  if (loc.home) return { awning: ['#3a201d', '#ddd5c1'], sign: '#ddd5c1', glow: '#e0a64a' };
  if (loc.zone) return { sign: '#a98be0', glow: '#a98be0', boarded: loc.id !== 'z-laundromat' };
  if (loc.faction) return { sign: '#9fb4bf', glow: '#e0a64a', plain: true };
  return { awning: ['#2e3442', '#a3843e'], sign: '#e0a64a', glow: '#e0a64a' };
}
