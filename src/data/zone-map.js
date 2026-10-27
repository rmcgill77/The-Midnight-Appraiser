// Turns an original night-run map (run.tiles, one cell per grid square) into a
// walkable room: every cell becomes cellTiles x cellTiles tiles. Walls keep the
// original's art: 'edge' plain wall, the zone's own wall (washers, subway tile,
// garage pillars, ward panels, brick) and the per-cell overrides the original
// layouts place ('counter', 'car', 'bed', 'bars'). The subway's tracks keep
// their rail floor. Each zone has its own palette.

import { bakePainter } from '../engine/sprites.js';
import { RNG } from '../engine/rng.js';

// Tile chars: '.' floor, ',' rail floor, 'x' the way out, then wall art in pairs (top, face).
const ART = { edge: ['#', 'w'], counter: ['C', 'c'], bed: ['H', 'h'], bars: ['I', 'i'] };
const ZONE_WALL = ['Q', 'q'];
// Parked cars come in three colors; a car (a run of 'car' cells in a row) keeps one color.
const CARS = [['A', 'a'], ['E', 'e'], ['G', 'g']];

function carColors(run) {
  const out = new Map();
  for (let y = 0; y < run.H; y++) {
    let start = -1;
    for (let x = 0; x <= run.W; x++) {
      const car = x < run.W && run.tiles[y][x].art === 'car';
      if (car && start < 0) start = x;
      if (car) out.set(`${x},${y}`, (start * 7 + y * 3) % CARS.length);
      else start = -1;
    }
  }
  return out;
}

export function buildZoneRoom(run, zone, k) {
  const W = run.W * k, H = run.H * k;
  const rows = Array.from({ length: H }, () => Array(W).fill('#'));
  const cars = carColors(run);
  for (let cy = 0; cy < run.H; cy++) for (let cx = 0; cx < run.W; cx++) {
    const t = run.tiles[cy][cx];
    const below = run.tiles[cy + 1]?.[cx];
    const pair = t.art === 'car' ? CARS[cars.get(`${cx},${cy}`) || 0] : (t.art && ART[t.art]) || ZONE_WALL;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      let ch;
      if (!t.wall) ch = t.floor === 'rail' ? ',' : '.';
      else ch = j === k - 1 && below && !below.wall ? pair[1] : pair[0];
      rows[cy * k + j][cx * k + i] = ch;
    }
  }
  const ex = run.exit, mid = Math.floor(k / 2);
  rows[ex.y * k + mid][ex.x * k + mid] = 'x';
  return {
    id: 'zone', name: zone.name, rows: rows.map(r => r.join('')),
    spawn: { tx: ex.x * k + mid, ty: ex.y * k + mid - 1 },
    interactions: { exit: { label: zone.id === 'undercroft' ? 'Climb the stairs' : 'Climb out', panel: 'exit' } },
    cellTiles: k,
  };
}

// ---------- palettes ----------

const BASE = {
  iron: '#0c0d12', amber: '#e0a64a', mat: '#3b2a1f', wood: '#5a4130', woodLight: '#7a5a40', woodDark: '#3c2b20',
};
const THEMES = {
  laundromat: { floor: 'checker', wall: 'machine', a: '#2b2a33', b: '#3a3944', line: '#1c1b22', fleck: '#45444f',
    top: '#121318', topEdge: '#1b1d24', face: '#2c3242', grout: '#1d2230', trim: '#3b4256' },
  subway: { floor: 'subway', wall: 'tile', a: '#34363a', b: '#3d4044', line: '#232528', fleck: '#4a4d52',
    top: '#101214', topEdge: '#1a1d20', face: '#bdb9a8', grout: '#8f8b7c', trim: '#2f6b4f', stripe: '#2f6b4f',
    gravel: '#2a2622', gravelB: '#3a342d', rail: '#8a8c90', tie: '#4a3826' },
  garage: { floor: 'concrete', wall: 'pillar', a: '#3a3a3c', b: '#424244', line: '#2a2a2c', fleck: '#4e4e50', paint: '#b8a24a',
    top: '#141416', topEdge: '#1f1f22', face: '#55575a', grout: '#46484b', trim: '#c9a227' },
  hospital: { floor: 'linoleum', wall: 'panel', a: '#5d6a62', b: '#66746b', line: '#46524a', fleck: '#7a877e',
    top: '#121614', topEdge: '#1b211e', face: '#8aa596', grout: '#6f8a7c', trim: '#c8ccd0', rail: '#a8acb0' },
  undercroft: { floor: 'stone', wall: 'brick', a: '#37312c', b: '#2f2a26', line: '#1f1b18', fleck: '#46403a',
    top: '#120f0d', topEdge: '#1d1815', face: '#6a3b2c', grout: '#3a241c', trim: '#2a1d17', chalk: '#d8d0bc' },
};
export const zoneTheme = id => THEMES[id] || THEMES.laundromat;

// ---------- floors ----------

function floor(T, seed) {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    if (T.floor === 'checker') {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) rect(x * 8, y * 8, 8, 8, (x + y) % 2 ? T.a : T.b);
      rect(0, 15, 16, 1, T.line);
    } else if (T.floor === 'subway') {
      rect(0, 0, 16, 16, T.a);
      for (let y = 0; y < 16; y += 4) rect(0, y, 16, 1, T.line);
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 2 : 6; x < 16; x += 8) rect(x, y, 1, 4, T.line);
    } else if (T.floor === 'concrete') {
      rect(0, 0, 16, 16, seed % 2 ? T.a : T.b);
      rect(0, 15, 16, 1, T.line); rect(15, 0, 1, 16, T.line);            // slab joints
      if (seed === 3) rect(r.int(2, 8), r.int(2, 8), 5, 3, '#2f2f31');  // an oil stain
    } else if (T.floor === 'linoleum') {
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) rect(x * 8, y * 8, 8, 8, (x + y) % 2 ? T.a : T.b);
      rect(0, 0, 16, 1, T.line); rect(0, 0, 1, 16, T.line);
    } else {                                                          // stone flags
      rect(0, 0, 16, 16, T.a);
      rect(0, 7, 16, 1, T.line); rect(r.int(3, 6), 0, 1, 7, T.line); rect(r.int(9, 13), 8, 1, 8, T.line);
      if (r.chance(0.12)) { rect(5, 10, 6, 1, T.chalk); rect(10, 9, 1, 3, T.chalk); }   // a chalk arrow
    }
    for (let i = 0; i < 5; i++) px(r.int(0, 15), r.int(0, 15), r.chance(0.5) ? T.line : T.fleck);
  });
}

// The subway's tracks: gravel, sleepers and two rails.
const rails = (T, seed) => bakePainter(({ px, rect }) => {
  const r = new RNG(seed);
  rect(0, 0, 16, 16, T.gravel);
  for (let i = 0; i < 14; i++) px(r.int(0, 15), r.int(0, 15), T.gravelB);
  for (let x = 1; x < 16; x += 5) rect(x, 0, 3, 16, T.tie);
  rect(0, 4, 16, 2, T.rail); rect(0, 11, 16, 2, T.rail); rect(0, 4, 16, 1, '#b4b6ba'); rect(0, 11, 16, 1, '#b4b6ba');
});

// ---------- walls ----------

const wallTop = T => bakePainter(({ px, rect }) => { rect(0, 0, 16, 16, T.top); px(3, 5, T.topEdge); px(12, 11, T.topEdge); });

function wallFace(T, seed) {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, T.face); rect(0, 0, 16, 2, T.top);
    if (T.wall === 'brick') {
      for (let y = 2; y < 16; y += 3) { rect(0, y, 16, 1, T.grout); for (let x = (y % 2 ? 1 : 4); x < 16; x += 6) rect(x, y, 1, 3, T.grout); }
      if (r.chance(0.2)) { rect(4, 7, 7, 1, T.chalk); rect(9, 6, 1, 3, T.chalk); }       // your parents' chalk
    } else if (T.wall === 'panel') {
      for (let x = 0; x < 16; x += 8) rect(x, 2, 1, 14, T.grout);
      rect(0, 8, 16, 2, T.rail); rect(0, 10, 16, 1, '#5f6f66');                          // the handrail
      rect(0, 14, 16, 2, T.trim);
    } else {
      for (let y = 4; y < 14; y += 4) rect(0, y, 16, 1, T.grout);
      for (let x = 0; x < 16; x += 4) rect(x, 2, 1, 12, T.grout);
      if (T.wall === 'tile') rect(0, 7, 16, 2, T.stripe);                                 // the Line 9 band
      else if (r.chance(0.3)) { rect(4, 5, 7, 5, '#5a4130'); rect(5, 6, 5, 3, '#d8d0bc'); } // a faded notice
      rect(0, 14, 16, 2, T.trim);
    }
  });
}

// The zone's own wall: what the original's floor plan is built out of.
function zoneWall(T) {
  if (T.wall === 'machine') {
    const E = { e: '#c8ccd4', d: '#9aa0ab', s: '#7a808c', g: '#3a4a52', gl: '#5d7a86' };
    const top = bakePainter(({ px, rect }) => {
      rect(0, 0, 16, 16, E.d); rect(1, 1, 14, 14, E.e); rect(4, 4, 8, 8, E.s); rect(5, 5, 6, 6, E.d);
      rect(11, 2, 3, 1, BASE.iron); px(2, 2, BASE.amber);
    });
    const front = seed => bakePainter(({ rect }) => {
      const r = new RNG(seed);
      rect(0, 0, 16, 16, E.e); rect(0, 0, 16, 1, E.d); rect(0, 15, 16, 1, BASE.iron);
      rect(0, 1, 16, 3, E.d); rect(2, 2, 2, 1, r.chance(0.5) ? BASE.amber : '#5a5a5a'); rect(11, 2, 3, 1, BASE.iron);
      rect(3, 5, 10, 9, E.s); rect(4, 6, 8, 7, E.g); rect(5, 7, 3, 2, E.gl);
      if (r.chance(0.25)) rect(6, 10, 4, 2, '#4a1f24');
    });
    return [top, [front(7), front(8), front(9)]];
  }
  if (T.wall === 'pillar') {
    const top = bakePainter(({ rect }) => { rect(0, 0, 16, 16, T.top); rect(3, 3, 10, 10, '#4a4c50'); rect(4, 4, 8, 8, '#5a5c60'); });
    const face = bakePainter(({ rect }) => {
      rect(0, 0, 16, 16, T.top); rect(3, 0, 10, 16, T.face); rect(3, 0, 1, 16, '#6a6c70');
      for (let y = 10; y < 16; y += 2) { rect(3, y, 10, 1, T.trim); }
      for (let y = 11; y < 16; y += 2) rect(3, y, 10, 1, '#16161a');
    });
    return [top, face];
  }
  return [wallTop(T), [wallFace(T, 4), wallFace(T, 5), wallFace(T, 6)]];
}

const counterTop = () => bakePainter(({ rect }) => { rect(0, 0, 16, 16, BASE.woodDark); rect(0, 1, 16, 12, BASE.wood); rect(0, 1, 16, 2, BASE.woodLight); });
const counterFace = T => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, BASE.woodDark); rect(0, 0, 16, 4, BASE.wood); rect(0, 0, 16, 1, BASE.woodLight);
  if (T.wall === 'tile') { rect(1, 5, 14, 8, '#2a3a40'); rect(2, 6, 4, 3, '#4d6a74'); }            // a token booth's glass
  else for (let x = 2; x < 16; x += 5) rect(x, 6, 3, 8, '#2c2018');
});

// Parked cars, seen from above: the roof on top, the front with its headlights facing the aisle.
const CAR_COLORS = ['#6b2a2a', '#2a3f5f', '#4a5a3a'];
const carTop = i => bakePainter(({ px, rect }) => {
  const c = CAR_COLORS[i];
  rect(0, 0, 16, 16, c); rect(0, 0, 16, 1, '#00000040'); rect(0, 6, 16, 4, '#202a30'); rect(0, 7, 16, 1, '#3a4a54');
  px(3, 2, '#ffffff30'); px(11, 12, '#ffffff20');
});
const carFace = i => bakePainter(({ rect }) => {
  const c = CAR_COLORS[i];
  rect(0, 0, 16, 16, '#1a1a1c'); rect(0, 0, 16, 10, c); rect(0, 2, 16, 4, '#2c3a44');
  rect(0, 10, 16, 3, '#5a5c60'); rect(2, 10, 3, 2, '#e8d9a0'); rect(11, 10, 3, 2, '#e8d9a0'); rect(2, 13, 3, 3, BASE.iron); rect(11, 13, 3, 3, BASE.iron);
});

// Ward beds: white sheets, an iron frame.
const bedTop = () => bakePainter(({ rect }) => { rect(0, 0, 16, 16, '#3a3f3c'); rect(1, 1, 14, 14, '#d8dad6'); rect(2, 2, 12, 4, '#f0f0ec'); rect(1, 9, 14, 6, '#b8c4be'); });
const bedFace = () => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, '#3a3f3c'); rect(1, 0, 14, 7, '#b8c4be'); rect(0, 7, 16, 2, '#8c9094');
  rect(1, 9, 1, 7, '#8c9094'); rect(14, 9, 1, 7, '#8c9094'); rect(0, 15, 16, 1, BASE.iron);
});

// The old cells: iron bars.
const barsTop = T => bakePainter(({ rect }) => { rect(0, 0, 16, 16, T.a); for (let x = 1; x < 16; x += 3) rect(x, 0, 1, 16, '#2a2c30'); rect(0, 7, 16, 1, '#2a2c30'); });
const barsFace = T => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, T.b); for (let x = 1; x < 16; x += 3) { rect(x, 0, 2, 16, '#3a3c42'); rect(x, 0, 1, 16, '#5a5c62'); }
  rect(0, 2, 16, 1, '#2a2c30'); rect(0, 13, 16, 1, '#2a2c30');
});

// The way out: a worn mat with an arrow (stairs for the places you came down into).
const exitTile = (T, zoneId) => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, T.a);
  if (zoneId === 'subway' || zoneId === 'undercroft') {
    for (let y = 1; y < 16; y += 3) { rect(1, y, 14, 2, zoneId === 'subway' ? '#5a5c60' : '#4a4038'); rect(1, y, 14, 1, zoneId === 'subway' ? '#7a7c80' : '#5e5248'); }
    rect(7, 4, 2, 8, BASE.amber); rect(5, 6, 6, 2, BASE.amber);
    return;
  }
  rect(1, 1, 14, 14, BASE.mat);
  rect(3, 3, 10, 1, BASE.amber); rect(3, 12, 10, 1, BASE.amber); rect(3, 3, 1, 10, BASE.amber); rect(12, 3, 1, 10, BASE.amber);
  rect(7, 5, 2, 6, BASE.amber); rect(5, 7, 6, 2, BASE.amber);
});

const cache = new Map();
export function buildZoneTiles(zoneId = 'laundromat') {
  if (cache.has(zoneId)) return cache.get(zoneId);
  const T = zoneTheme(zoneId);
  const floors = [floor(T, 1), floor(T, 2), floor(T, 3)];
  const edgeTop = wallTop(T), edgeFaces = [wallFace({ ...T, wall: T.wall === 'machine' || T.wall === 'pillar' ? 'plain' : T.wall }, 4), wallFace({ ...T, wall: T.wall === 'machine' || T.wall === 'pillar' ? 'plain' : T.wall }, 5)];
  const [zTop, zFace] = zoneWall(T);
  const set = {
    floors,
    defs: {
      '.': { solid: false, art: floors },
      ',': { solid: false, art: [rails(T, 11), rails(T, 12)] },
      'x': { solid: false, art: exitTile(T, zoneId), interact: 'exit' },
      '#': { solid: true, art: edgeTop }, 'w': { solid: true, art: edgeFaces },
      'Q': { solid: true, art: zTop }, 'q': { solid: true, art: zFace },
      'C': { solid: true, art: counterTop() }, 'c': { solid: true, art: counterFace(T) },
      ...Object.fromEntries(CARS.flatMap(([t, f], i) => [[t, { solid: true, art: carTop(i) }], [f, { solid: true, art: carFace(i) }]])),
      'H': { solid: true, art: bedTop() }, 'h': { solid: true, art: bedFace() },
      'I': { solid: true, art: barsTop(T) }, 'i': { solid: true, art: barsFace(T) },
    },
  };
  cache.set(zoneId, set);
  return set;
}
