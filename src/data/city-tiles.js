// The city's tiles, painted as 16x16 data like the rest of the game. Each district
// has its own roof and brick so you can tell where you are at a glance; the only
// warm color on the street is lamplight and the signs over the places you can visit.
//
// Phase 21: in scale with people. Fronts are three tiles tall (a cornice and upper
// windows, a string course, the ground floor), doors are two tiles tall, every place has
// a storefront of its own with its icon on a sign over the door, cars are two tiles long,
// and street lamps and trees stand taller than you (their tops are drawn in depth order
// with people, so you can walk behind them: see `over` and TileMap.overs).

import { bakePainter, makeCanvas } from '../engine/sprites.js';
import { RNG } from '../engine/rng.js';
import { iconRects } from '../rules/index.js';
import { frontOf, mapIcon } from './places.js';

const C = {
  asphalt: '#1b1d24', asphaltLight: '#23262f', asphaltDark: '#14161b', lane: '#6b6550',
  curb: '#3b4052', pave: '#2c3039', paveLine: '#24272f', paveLight: '#353a45',
  grass: '#1f2b22', grassLight: '#283729', grassDark: '#18221a',
  leaf: '#22382a', leafLight: '#2f4a36', leafDark: '#16261c', leafEdge: '#0f1a13', trunk: '#3c2b20', trunkDark: '#2a1e16',
  hedge: '#14231a', iron: '#0c0d12', ironLight: '#262a34', amber: '#e0a64a', amberDim: '#8a5a22', glass: '#5d7a86', window: '#1c2a30', windowLight: '#2a3e46', windowLit: '#c9a24a',
  car: ['#4a1f24', '#2e3a4a', '#3a3a22', '#4a4f63', '#2a2e38', '#5a4a3a'],
  stone: '#4a4a4e', stoneDark: '#38383c', stoneLight: '#5c5c62',
};

const DISTRICTS = {
  a: { roof: '#4a2a26', roofDark: '#3a201d', roofLight: '#5a342e', brick: '#3b2622', brickDark: '#2c1c19', trim: '#5a3c30' }, // Old Market
  w: { roof: '#24393a', roofDark: '#1b2c2d', roofLight: '#2d4647', brick: '#2b3536', brickDark: '#202829', trim: '#3e4d4e' }, // Westside
  k: { roof: '#2c3448', roofDark: '#222838', roofLight: '#363f56', brick: '#2e3342', brickDark: '#232733', trim: '#454c60' }, // Kessler Heights
  e: { roof: '#4a3a22', roofDark: '#3a2d1a', roofLight: '#5a472b', brick: '#3b3122', brickDark: '#2c2519', trim: '#57492f' }, // Eastgate
  n: { roof: '#33263f', roofDark: '#271d31', roofLight: '#3e2f4c', brick: '#30283a', brickDark: '#241e2c', trim: '#483c54' }, // The Narrows
  h: { roof: '#2a3430', roofDark: '#202825', roofLight: '#33403a', brick: '#2b302d', brickDark: '#202422', trim: '#414a45' }, // Harbor Row
};
const districtOf = ch => DISTRICTS[ch?.toLowerCase?.()] ?? DISTRICTS.a;
const isRoof = ch => !!ch && ch in DISTRICTS;
const isFace = ch => !!ch && ch !== ch.toLowerCase() && ch.toLowerCase() in DISTRICTS;
const isDoor = ch => 'oOZJD'.includes(ch ?? '_') && !!ch;
const isHouseDoor = ch => !!ch && 'oZJ'.includes(ch);

function sprinkle(px, seed, n, cols) { const r = new RNG(seed); for (let i = 0; i < n; i++) px(r.int(0, 15), r.int(0, 15), r.pick(cols)); }
const mixHash = (x, y) => { let n = Math.imul(x, 73856093) ^ Math.imul(y, 19349663); n = Math.imul(n ^ (n >>> 13), 0x5bd1e995); return (n ^ (n >>> 15)) >>> 0; };

const road = seed => bakePainter(({ px, rect }) => { rect(0, 0, 16, 16, C.asphalt); sprinkle(px, seed, 7, [C.asphaltLight, C.asphaltDark]); });
const crossing = () => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, C.asphalt);
  for (let i = 1; i < 16; i += 4) { rect(i, 1, 2, 2, C.lane); rect(i, 13, 2, 2, C.lane); }
});
const sidewalk = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, C.pave);
  rect(0, 7, 16, 1, C.paveLine); rect(0, 15, 16, 1, C.paveLine); rect(7, 0, 1, 7, C.paveLine); rect(11, 8, 1, 7, C.paveLine);
  sprinkle(px, seed, 4, [C.paveLight, C.paveLine]);
});
// v2.2: the seasons. Grass and trees change with the time of year (game/calendar.js).
export const SEASON_LOOK = {
  spring: { grass: ['#1f2d21', '#2a3a2a', '#18241a'], leaves: { edge: '#0f1a13', dark: '#19301f', mid: '#264a30', light: '#356040' }, bloom: '#c98a9a', flowers: ['#c98a9a', '#d8c070', '#a07ac0'] },
  summer: { grass: [C.grass, C.grassLight, C.grassDark], leaves: { edge: C.leafEdge, dark: C.leafDark, mid: C.leaf, light: C.leafLight }, flowers: ['#c0503a', '#d8b040', '#7a6ad0', '#e0e0d0'] },
  autumn: { grass: ['#262a1e', '#30331f', '#1c2018'], litter: ['#6a3a1c', '#8a5a22', '#5a2a18'], leaves: { edge: '#1e120c', dark: '#4a2416', mid: '#7a3a1c', light: '#a0602a' }, flowers: ['#c0702a', '#a0402a', '#d0a040'] },
  winter: { grass: ['#232a28', '#2e3634', '#1c2220'], frost: '#5a6266', bare: true, snow: '#c8ccd2', flowers: null },
};
const grass = (seed, season = 'summer') => {
  const L = SEASON_LOOK[season] ?? SEASON_LOOK.summer;
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, L.grass[0]); sprinkle(px, seed, 14, [L.grass[1], L.grass[2]]);
    if (L.litter) sprinkle(px, seed + 50, 4, L.litter);
    if (L.frost) sprinkle(px, seed + 70, 6, [L.frost]);
  });
};
const parking = () => bakePainter(({ rect }) => { rect(0, 0, 16, 16, C.asphaltDark); rect(0, 0, 1, 16, C.lane); });
const hedge = seed => bakePainter(({ px, rect }) => { rect(0, 0, 16, 16, C.hedge); sprinkle(px, seed, 20, [C.leafDark, C.leaf]); });
const blank = () => bakePainter(() => {});

// A tree: the trunk and its shadow on the ground tile; the crown (32x32) stands above it.
const trunk = () => bakePainter(({ rect }) => {
  rect(2, 12, 13, 3, 'rgba(0,0,0,0.35)');
  rect(6, 4, 4, 11, C.trunk); rect(6, 4, 1, 11, C.trunkDark); rect(5, 13, 6, 2, C.trunkDark);
});
function crown(seed, season = 'summer') {
  const cv = makeCanvas(32, 32), g = cv.getContext('2d'), r = new RNG(seed);
  const L = SEASON_LOOK[season] ?? SEASON_LOOK.summer;
  const blob = (cx, cy, rad, col) => { g.fillStyle = col; for (let y = -rad; y <= rad; y++) { const w = Math.round(Math.sqrt(rad * rad - y * y)); g.fillRect(cx - w, cy + y, w * 2, 1); } };
  if (L.bare) {
    // Winter: bare branches with snow along their tops.
    const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    P(14, 10, 4, 22, C.trunk); P(14, 10, 1, 22, C.trunkDark);
    for (let i = 0; i < 7; i++) {
      const y = 4 + i * 3 + r.int(0, 1), left = i % 2 === 0, len = r.int(5, 10);
      for (let k = 0; k < len; k++) { const x = left ? 14 - k : 17 + k, yy = y + Math.floor(k / 3); P(x, yy, 1, 1, C.trunkDark); if (k % 2 === 0) P(x, yy - 1, 1, 1, L.snow); }
    }
    P(13, 9, 6, 1, L.snow);
    return cv;
  }
  blob(16, 15, 13, L.leaves.edge); blob(16, 14, 12, L.leaves.dark);
  for (let i = 0; i < 5; i++) blob(10 + r.int(0, 12), 9 + r.int(0, 8), r.int(4, 7), L.leaves.mid);
  for (let i = 0; i < 4; i++) blob(9 + r.int(0, 10), 6 + r.int(0, 6), r.int(2, 4), L.leaves.light);
  if (L.bloom) { g.fillStyle = L.bloom; for (let i = 0; i < 14; i++) g.fillRect(6 + r.int(0, 20), 4 + r.int(0, 18), 1, 1); }
  g.fillStyle = C.trunk; g.fillRect(14, 26, 4, 6);
  return cv;
}

// ---------- v2.2: the river, the square, the districts, the park ----------

const W_ = { deep: '#14222e', mid: '#1a2c3a', ripple: '#24404f', glint: '#3a5e6e', bank: '#2a2a24', bankLight: '#3a3a30', foam: '#6a8a96' };
const water = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, W_.deep);
  const r = new RNG(seed);
  for (let i = 0; i < 4; i++) { const x = r.int(0, 11), y = r.int(1, 14); rect(x, y, r.int(3, 5), 1, W_.ripple); }
  for (let i = 0; i < 3; i++) px(r.int(0, 15), r.int(0, 15), W_.mid);
  px(r.int(2, 13), r.int(2, 13), W_.glint);
});
const bridge = () => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, '#4a3828');
  for (let x = 0; x < 16; x += 4) rect(x, 0, 1, 16, '#33261a');
  rect(0, 7, 16, 1, '#3c2c1e');
});
// v2.3: dock planks (the jetties and the boardwalk), boards running across, posts at the sides.
const dock = () => bakePainter(({ rect, px }) => {
  rect(0, 0, 16, 16, '#5a4430');
  for (let y = 0; y < 16; y += 4) { rect(0, y + 3, 16, 1, '#3a2a1c'); px((y * 5) % 13 + 1, y + 1, '#6a5038'); }
  rect(0, 0, 1, 16, '#2a1e16'); rect(15, 0, 1, 16, '#2a1e16');
});
const paving = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, '#3a3836');
  for (let y = 0; y < 16; y += 4) { rect(0, y + 3, 16, 1, '#2c2a29'); const o = (y / 4) % 2 ? 2 : 6; for (let x = o; x < 16; x += 8) rect(x, y, 1, 3, '#2c2a29'); }
  sprinkle(px, seed, 5, ['#46423f', '#302e2d']);
});
const cobbles = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, '#222128');
  const r = new RNG(seed);
  for (let y = 0; y < 16; y += 3) for (let x = (y / 3) % 2 ? 0 : 2; x < 16; x += 4) rect(x, y, 3, 2, r.chance(0.5) ? '#2a2830' : '#26242c');
  if (seed % 3 === 0) { rect(4, 9, 7, 3, '#1a2430'); rect(5, 9, 3, 1, '#2e4450'); }   // a puddle
});
const gravel = seed => bakePainter(({ px, rect }) => { rect(0, 0, 16, 16, '#43403a'); sprinkle(px, seed, 20, ['#504c45', '#38352f', '#5a564e']); });
const planter = () => bakePainter(({ rect }) => {
  rect(1, 3, 14, 12, '#4a4a4e'); rect(1, 3, 14, 1, '#5c5c62'); rect(2, 4, 12, 9, '#2a1e16');
  rect(6, 4, 4, 9, C.trunk); rect(6, 4, 1, 9, C.trunkDark);
});
function flowerbed(seed, season = 'summer') {
  const L = SEASON_LOOK[season] ?? SEASON_LOOK.summer, r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 1, 16, 15, '#4a4a4e'); rect(0, 1, 16, 1, '#5c5c62'); rect(1, 2, 14, 12, '#2a1e16');
    if (!L.flowers) { rect(2, 4, 12, 8, '#1c2e22'); for (let i = 0; i < 10; i++) px(r.int(2, 13), r.int(3, 6), L.snow ?? '#c8ccd2'); return; }
    for (let i = 0; i < 9; i++) { const x = r.int(2, 12), y = r.int(3, 11); rect(x, y + 1, 1, 2, '#2a4a30'); px(x, y, r.pick(L.flowers)); }
  });
}
const fence = () => bakePainter(({ rect }) => {
  rect(0, 9, 16, 1, '#8a867c'); rect(0, 5, 16, 1, '#8a867c');
  for (let x = 1; x < 16; x += 4) { rect(x, 3, 2, 10, '#b8b4a8'); rect(x, 2, 2, 1, '#d0ccc0'); rect(x + 1, 3, 1, 10, '#8a867c'); }
  rect(0, 13, 16, 1, 'rgba(0,0,0,0.3)');
});
const bins = () => bakePainter(({ rect }) => {
  rect(1, 13, 14, 2, 'rgba(0,0,0,0.4)');
  rect(1, 4, 14, 10, '#24402c'); rect(1, 4, 14, 2, '#2e5238'); rect(0, 3, 16, 2, '#1a2e20'); rect(3, 7, 10, 1, '#1a2e20'); rect(2, 13, 2, 2, C.iron); rect(12, 13, 2, 2, C.iron);
});
const crates = () => bakePainter(({ rect }) => {
  rect(1, 13, 14, 2, 'rgba(0,0,0,0.4)');
  rect(1, 6, 9, 8, '#5a4130'); rect(2, 7, 7, 6, '#7a5a40'); rect(2, 9, 7, 1, '#5a4130');
  rect(7, 2, 8, 7, '#4a3528'); rect(8, 3, 6, 5, '#6a4e38'); rect(8, 5, 6, 1, '#4a3528');
});
// Lantern Park's lamps: a short iron post, a warm lantern a tile above.
const lanternPost = () => bakePainter(({ rect }) => { rect(5, 13, 6, 2, 'rgba(0,0,0,0.35)'); rect(7, 0, 2, 14, C.iron); rect(6, 13, 4, 2, C.ironLight); });
const lanternHead = () => bakePainter(({ rect }) => {
  rect(7, 13, 2, 3, C.iron);
  rect(5, 5, 6, 8, C.iron); rect(6, 6, 4, 6, '#d89a40'); rect(7, 7, 2, 3, '#f6d48a'); rect(4, 4, 8, 1, C.iron); rect(6, 2, 4, 2, C.iron);
});
// A street lamp: the post on its tile, the head a tile above.
const lampPost = () => bakePainter(({ rect }) => {
  rect(4, 13, 8, 2, 'rgba(0,0,0,0.35)');
  rect(7, 0, 2, 14, C.iron); rect(6, 12, 4, 3, C.iron); rect(5, 14, 6, 1, C.ironLight); rect(8, 2, 1, 9, C.ironLight);
});
const lampHead = () => bakePainter(({ rect }) => {
  rect(7, 9, 2, 7, C.iron);
  rect(4, 5, 8, 4, C.iron); rect(5, 2, 6, 3, C.iron); rect(7, 1, 2, 1, C.iron);
  rect(5, 8, 6, 2, C.amberDim); rect(6, 8, 4, 1, '#f6d48a');
});
// A bus stop: a post on the curb, the sign (blue, a bus on it) a tile above.
const stopPost = () => bakePainter(({ rect }) => {
  rect(3, 13, 10, 2, 'rgba(0,0,0,0.35)');
  rect(7, 0, 2, 14, C.iron); rect(6, 13, 4, 2, C.ironLight);
  rect(1, 8, 14, 3, '#5a4130'); rect(1, 8, 14, 1, '#7a5a40'); rect(2, 11, 1, 3, C.iron); rect(13, 11, 1, 3, C.iron);
});
const stopSign = () => bakePainter(({ rect }) => {
  rect(7, 12, 2, 4, C.iron);
  rect(2, 1, 12, 11, C.iron); rect(3, 2, 10, 9, '#3d63b5');
  rect(5, 4, 6, 4, '#e8e4d8'); rect(6, 5, 4, 1, '#3d63b5'); rect(5, 8, 1, 1, C.iron); rect(10, 8, 1, 1, C.iron);
});
const bench = () => bakePainter(({ rect }) => {
  rect(1, 6, 14, 3, '#5a4130'); rect(1, 5, 14, 1, '#7a5a40'); rect(1, 10, 14, 2, '#3c2b20');
  rect(2, 12, 2, 3, C.iron); rect(12, 12, 2, 3, C.iron);
});

// A parked car seen from above, nose up: 14 x 30, over two tiles.
function car(g, x, y, col) {
  const P = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(x + a, y + b, w, h); };
  P(0, 2, 14, 28, 'rgba(0,0,0,0.35)');
  P(1, 1, 12, 28, C.iron); P(2, 2, 10, 26, col);
  P(3, 8, 8, 5, C.window); P(4, 9, 3, 1, C.windowLight);
  P(3, 19, 8, 3, C.window);
  P(2, 13, 10, 6, shadeHex(col, 1.15));
  P(2, 2, 3, 2, '#f6d48a'); P(9, 2, 3, 2, '#f6d48a');
  P(2, 26, 2, 1, '#8a2a2a'); P(10, 26, 2, 1, '#8a2a2a');
  P(0, 6, 1, 4, C.iron); P(13, 6, 1, 4, C.iron); P(0, 20, 1, 4, C.iron); P(13, 20, 1, 4, C.iron);
}
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

function roof(d, seed) {
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, d.roof);
    for (let y = 3; y < 16; y += 4) rect(0, y, 16, 1, d.roofDark);
    sprinkle(px, seed, 6, [d.roofLight, d.roofDark]);
  });
}
// Brick, the base under every row of a front (the rows are dressed in decorateCity).
function brick(d, seed) {
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, d.brick);
    for (let y = 3; y < 16; y += 4) rect(0, y, 16, 1, d.brickDark);
    for (let y = 0; y < 16; y += 4) { const o = (y / 4) % 2 ? 4 : 0; for (let x = o; x < 16; x += 8) rect(x, y, 1, 3, d.brickDark); }
    sprinkle(px, seed, 3, [d.trim]);
  });
}

// ---------- v2.3: the beach ----------
const SAND = { sand: '#5e5440', sandLight: '#6c6149', sandDark: '#4e4535', wet: '#3e3a30', wetLight: '#4a463a', wetDark: '#34312a', rock: '#3a3c42', rockLight: '#4c4f57', rockDark: '#26272c' };
const sand = seed => bakePainter(({ px, rect }) => { rect(0, 0, 16, 16, SAND.sand); sprinkle(px, seed, 10, [SAND.sandLight, SAND.sandDark]); });
const wetSand = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, SAND.wet); sprinkle(px, seed, 8, [SAND.wetLight, SAND.wetDark]);
  const r = new RNG(seed); rect(r.int(0, 8), r.int(2, 13), r.int(4, 7), 1, SAND.wetLight);
});
const rocks = seed => bakePainter(({ rect }) => {
  const r = new RNG(seed);
  rect(0, 0, 16, 16, SAND.wet);
  for (let i = 0; i < 3; i++) { const x = r.int(0, 8), y = r.int(1, 8), w = r.int(6, 9), h = r.int(5, 8); rect(x, y + 1, w, h, SAND.rockDark); rect(x, y, w, h, SAND.rock); rect(x + 1, y, w - 2, 2, SAND.rockLight); }
});
// A beach umbrella: the pole on its tile, the canopy (striped) above and around it.
const umbrellaPole = () => bakePainter(({ rect }) => { rect(3, 11, 11, 4, 'rgba(0,0,0,0.3)'); rect(7, 0, 2, 15, '#bcb7a8'); rect(7, 0, 1, 15, '#8a8678'); });
function umbrellaTop(a, b) {
  const cv = makeCanvas(32, 24), g = cv.getContext('2d');
  for (let y = 0; y < 12; y++) {
    const w = Math.round(4 + y * 1.1);
    for (let x = 16 - w; x < 16 + w; x++) { g.fillStyle = Math.floor((x - 16 + 32) / 4) % 2 ? a : b; g.fillRect(x, y + 6, 1, 1); }
  }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(4, 17, 24, 1);
  g.fillStyle = '#d8d2c0'; g.fillRect(15, 4, 2, 3);
  return cv;
}
const towel = (a, b) => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, SAND.sand); sprinkle(px, 77, 6, [SAND.sandLight, SAND.sandDark]);
  rect(0, 3, 16, 10, a); for (let x = 1; x < 16; x += 4) rect(x, 3, 2, 10, b); rect(0, 3, 16, 1, 'rgba(255,255,255,0.15)');
});
const net = () => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, SAND.sand); sprinkle(px, 91, 8, [SAND.sandLight, SAND.sandDark]);
  rect(0, 13, 16, 2, 'rgba(0,0,0,0.25)');
  rect(0, 2, 16, 1, '#d8d2c0'); for (let y = 3; y < 10; y += 2) rect(0, y, 16, 1, 'rgba(200,196,180,0.55)'); for (let x = 1; x < 16; x += 3) rect(x, 3, 1, 7, 'rgba(200,196,180,0.55)');
  rect(0, 9, 16, 1, '#d8d2c0');
});
// The lifeguard chair: white legs on the sand, the seat and its red cross a tile above.
const chairLegs = () => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, SAND.sand); sprinkle(px, 93, 8, [SAND.sandLight, SAND.sandDark]);
  rect(2, 12, 13, 3, 'rgba(0,0,0,0.3)'); rect(3, 0, 2, 14, '#d8d2c0'); rect(11, 0, 2, 14, '#d8d2c0'); rect(3, 5, 10, 1, '#a8a294'); rect(5, 9, 6, 1, '#a8a294');
});
const chairTop = () => bakePainter(({ rect }) => {
  rect(2, 4, 12, 3, '#d8d2c0'); rect(3, 0, 10, 4, '#a63a34'); rect(7, 0, 2, 4, '#e6e3da'); rect(6, 1, 4, 2, '#e6e3da'); rect(3, 7, 2, 9, '#d8d2c0'); rect(11, 7, 2, 9, '#d8d2c0');
});
// The ice cream cart: a white box on wheels, a little striped canopy over it.
const cart = () => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, SAND.sand); sprinkle(px, 95, 8, [SAND.sandLight, SAND.sandDark]);
  rect(1, 12, 15, 3, 'rgba(0,0,0,0.3)'); rect(1, 4, 14, 8, '#d8d2c0'); rect(1, 4, 14, 1, '#f0ece0'); rect(3, 6, 10, 3, '#9fd0d0'); rect(2, 12, 3, 3, C.iron); rect(11, 12, 3, 3, C.iron); rect(7, 0, 2, 4, '#bcb7a8');
});
const cartTop = () => bakePainter(({ rect }) => { for (let x = 0; x < 16; x += 4) { rect(x, 8, 2, 5, '#c95a8e'); rect(x + 2, 8, 2, 5, '#e6e3da'); } rect(0, 13, 16, 1, 'rgba(0,0,0,0.3)'); });

// ---------- v2.5b: the dunes below the quay, and the way to the beach ----------
const dune = (seed, season) => bakePainter(({ px, rect }) => {
  const winter = season === 'winter';
  rect(0, 0, 16, 16, SAND.sand); sprinkle(px, seed, 10, [SAND.sandLight, SAND.sandDark]);
  const r = new RNG(seed * 7 + 3), grass = winter ? ['#8a8a6a', '#6a6a52'] : ['#6a7a3a', '#8a9a4a', '#4e5e2e'];
  for (let i = 0; i < 4; i++) { const x = r.int(1, 13), y = r.int(3, 13); for (let k = 0; k < 4; k++) px(x + k - 1, y - (k % 2 ? 2 : 1) - (k === 1 ? 1 : 0), r.pick(grass)); px(x, y, grass[2] ?? grass[1]); }
});
const duneFence = () => bakePainter(({ rect }) => { for (let x = 1; x < 16; x += 3) rect(x, 4, 1, 9, '#7a6a4a'); rect(0, 6, 16, 1, '#5a4a32'); rect(0, 10, 16, 1, '#5a4a32'); rect(0, 13, 16, 1, 'rgba(0,0,0,0.25)'); });
// A wooden signpost by the boardwalk: an arrow down to the beach and a little umbrella.
const beachPost = () => bakePainter(({ rect, px }) => {
  rect(5, 12, 7, 3, 'rgba(0,0,0,0.35)'); rect(7, 4, 2, 11, '#5a4130');
  rect(1, 1, 14, 7, '#2a1e14'); rect(2, 2, 12, 5, '#d8c890');
  rect(4, 3, 4, 1, '#a63a34'); rect(3, 4, 6, 1, '#e6e3da'); rect(5, 4, 1, 3, '#3a2a20');
  rect(10, 3, 1, 3, '#24474a'); rect(9, 5, 3, 1, '#24474a'); px(10, 6, '#24474a');
});
// Over the top of the boardwalk: two posts and a board, GULL POINT BEACH in small letters.
export function beachArch(g, x0, x1, y) {
  R(g, x0 - 6, y - 10, 5, 26, '#4a3626'); R(g, x1 + 1, y - 10, 5, 26, '#4a3626');
  R(g, x0 - 6, y - 10, 5, 2, '#6a5038'); R(g, x1 + 1, y - 10, 5, 2, '#6a5038');
  R(g, x0 - 4, y - 7, x1 - x0 + 8, 9, '#2a1e14'); R(g, x0 - 3, y - 6, x1 - x0 + 6, 7, '#24474a');
  const t = '#e6e3da', lx = Math.round((x0 + x1) / 2) - 9;
  // B E A C H, 3 x 5 letters.
  const L = { B: ['110', '101', '110', '101', '110'], E: ['111', '100', '110', '100', '111'], A: ['010', '101', '111', '101', '101'], C: ['011', '100', '100', '100', '011'], H: ['101', '101', '111', '101', '101'] };
  [...'BEACH'].forEach((ch, i) => L[ch].forEach((row, yy) => [...row].forEach((b, xx) => { if (b === '1') R(g, lx + i * 4 + xx, y - 5 + yy, 1, 1, t); })));
  R(g, x0 - 5, y - 13, 3, 3, '#f6d48a'); R(g, x1 + 2, y - 13, 3, 3, '#f6d48a');
}

// ---------- v2.5: St. Brigid's churchyard, and the rope across the woods trail ----------
const STONE = { base: '#8a8a86', light: '#b0b0aa', dark: '#5e5e5a', moss: '#4a5a3a', shadow: 'rgba(0,0,0,0.35)' };
// A headstone: rounded top, a little moss, an inscription line or two.
const headstone = seed => bakePainter(({ px, rect }) => {
  rect(3, 13, 11, 2, STONE.shadow);
  rect(4, 4, 8, 10, STONE.base); rect(5, 3, 6, 1, STONE.base); rect(6, 2, 4, 1, STONE.base);
  rect(4, 4, 1, 10, STONE.light); rect(5, 3, 1, 1, STONE.light); rect(11, 4, 1, 10, STONE.dark); rect(4, 13, 8, 1, STONE.dark);
  rect(6, 6, 4, 1, STONE.dark); rect(6, 8, 4, 1, STONE.dark); if (seed % 2) rect(7, 10, 2, 1, STONE.dark);
  sprinkle(px, seed, 4, [STONE.moss]);
});
const crossStone = seed => bakePainter(({ px, rect }) => {
  rect(3, 13, 11, 2, STONE.shadow);
  rect(7, 1, 3, 13, STONE.base); rect(4, 4, 9, 3, STONE.base); rect(7, 1, 1, 13, STONE.light); rect(4, 4, 9, 1, STONE.light);
  rect(9, 1, 1, 13, STONE.dark); rect(4, 6, 9, 1, STONE.dark); rect(6, 13, 5, 1, STONE.dark);
  sprinkle(px, seed, 3, [STONE.moss]);
});
const obeliskBase = () => bakePainter(({ rect }) => { rect(2, 12, 13, 3, STONE.shadow); rect(4, 9, 9, 5, STONE.dark); rect(5, 0, 7, 10, STONE.base); rect(5, 0, 1, 10, STONE.light); rect(11, 0, 1, 10, STONE.dark); rect(7, 4, 3, 1, STONE.dark); });
const obeliskTop = () => bakePainter(({ rect }) => { rect(6, 6, 5, 10, STONE.base); rect(7, 3, 3, 3, STONE.base); rect(8, 1, 1, 2, STONE.base); rect(6, 6, 1, 10, STONE.light); rect(10, 6, 1, 10, STONE.dark); });
const cryptWall = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, '#5a5a58'); for (let y = 3; y < 16; y += 4) rect(0, y, 16, 1, '#3e3e3c'); for (let y = 0; y < 16; y += 4) rect((y / 4) % 2 ? 4 : 10, y, 1, 3, '#3e3e3c');
  sprinkle(px, seed, 6, ['#6a6a66', STONE.moss]);
});
const cryptDoor = () => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, '#5a5a58'); rect(3, 2, 10, 14, '#3e3e3c'); rect(4, 3, 8, 13, '#2a2622'); rect(4, 3, 8, 1, '#4a4038');
  for (let x = 5; x < 12; x += 2) rect(x, 4, 1, 12, '#3a3632'); rect(10, 9, 1, 2, '#a8a294');
});
const ironFence = ground => bakePainter(({ px, rect }) => {
  if (ground) { rect(0, 0, 16, 16, ground[0]); sprinkle(px, 77, 12, [ground[1], ground[2]]); }
  rect(0, 13, 16, 1, 'rgba(0,0,0,0.3)'); rect(0, 4, 16, 1, '#1c1c20'); rect(0, 10, 16, 1, '#1c1c20');
  for (let x = 1; x < 16; x += 3) { rect(x, 2, 1, 11, '#26262c'); rect(x, 1, 1, 1, '#3a3a42'); }
});
const ironGate = (ground, open = false) => bakePainter(({ px, rect }) => {
  if (ground) { rect(0, 0, 16, 16, ground[0]); sprinkle(px, 79, 10, [ground[1], ground[2]]); }
  if (open) { rect(0, 2, 2, 12, '#26262c'); rect(14, 2, 2, 12, '#26262c'); return; }
  rect(0, 13, 16, 1, 'rgba(0,0,0,0.3)'); rect(0, 3, 16, 1, '#26262c'); rect(0, 8, 16, 1, '#26262c'); rect(0, 12, 16, 1, '#26262c');
  for (let x = 0; x < 16; x += 2) rect(x, 2, 1, 11, '#2e2e36'); rect(7, 0, 2, 2, '#3a3a42'); rect(6, 7, 4, 3, '#6a5a3a');
});
const shedDoor = () => bakePainter(({ rect }) => { rect(0, 0, 16, 16, '#4a3a2a'); rect(3, 2, 10, 14, '#2a1e14'); rect(4, 3, 8, 13, '#5a4130'); for (let x = 6; x < 12; x += 2) rect(x, 3, 1, 13, '#4a3626'); rect(10, 9, 1, 2, '#c9a24a'); });
// The woods trail, roped off: two posts, a sagging rope, a hand-painted sign hanging from it.
const ropeTrail = (side) => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, '#3a3022'); sprinkle(px, 91 + side, 14, ['#4a3e2c', '#2a2218', '#2f4a2a']);
  const post = side ? 13 : 1; rect(post, 3, 2, 11, '#5a4130'); rect(post, 3, 2, 1, '#7a5a40'); rect(post - 1, 13, 4, 2, 'rgba(0,0,0,0.4)');
  for (let x = 0; x < 16; x++) px(x, 6 + Math.round(Math.sin((x + side * 16) / 32 * Math.PI) * 2), '#c8b890');
  if (!side) { rect(6, 7, 10, 7, '#1c1610'); rect(7, 8, 9, 5, '#d8c890'); rect(8, 9, 7, 1, '#a63a34'); rect(8, 11, 5, 1, '#3a2a20'); }
  else { rect(0, 7, 6, 7, '#1c1610'); rect(0, 8, 5, 5, '#d8c890'); rect(0, 9, 4, 1, '#a63a34'); rect(1, 11, 3, 1, '#3a2a20'); }
});

export function buildCityTiles(season = 'summer') {
  const roads = [road(1), road(2), road(3)];
  const walks = [sidewalk(4), sidewalk(5), sidewalk(6)];
  const lawns = [grass(7, season), grass(8, season), grass(9, season)];
  const lots = parking();
  const crowns = [crown(3, season), crown(8, season), crown(13, season), crown(21, season)];
  const paves = [paving(31), paving(32), paving(33)], alley = [cobbles(40), cobbles(41), cobbles(42)];
  const defs = {
    '=': { solid: false, art: roads },
    '+': { solid: false, art: crossing() },
    ',': { solid: false, art: walks },
    '"': { solid: false, art: lawns },
    'p': { solid: false, art: lots },
    'X': { solid: true, art: [hedge(10), hedge(11)] },
    't': { solid: true, ground: lawns, art: trunk(), over: { img: crowns, dx: -8, dy: -26 } },
    'L': { solid: true, ground: walks, art: lampPost(), light: 46, lightDy: -10, over: { img: lampHead(), dx: 0, dy: -16 } },
    'b': { solid: true, ground: lawns, art: bench() },
    'Q': { solid: true, ground: walks, art: stopPost(), interact: 'bus', over: { img: stopSign(), dx: 0, dy: -16 } },
    'c': { solid: true, ground: lots, art: blank() },
    'v': { solid: true, ground: lots, art: blank() },
    // v2.2
    '~': { solid: true, art: [water(51), water(52), water(53), water(54)], water: true },
    'u': { solid: false, art: bridge() },
    'd': { solid: false, art: dock() },
    'P': { solid: false, art: paves },
    'F': { solid: true, art: paves },                      // the fountain is painted over these (decorateCity)
    'B': { solid: true, ground: paves, art: bench() },
    'T': { solid: true, ground: paves, art: planter(), over: { img: crowns, dx: -8, dy: -26 } },
    'f': { solid: true, art: [flowerbed(61, season), flowerbed(62, season), flowerbed(63, season)] },
    'i': { solid: true, ground: lawns, art: fence() },
    'y': { solid: false, art: alley },
    'z': { solid: true, ground: alley, art: bins() },
    'x': { solid: true, ground: alley, art: crates() },
    'q': { solid: false, art: [gravel(71), gravel(72)] },
    'G': { solid: false, art: roads },                     // the park gate (its posts and sign: decorateCity)
    'S': { solid: true, art: paves },                      // the park's bandstand (painted over: decorateArea)
    'l': { solid: true, ground: lawns, art: lanternPost(), light: 40, lightDy: -10, flicker: false, over: { img: lanternHead(), dx: 0, dy: -16 } },
  };
  // v2.3: the beach. In winter the umbrellas, towels, the net and the cart are packed away.
  const sands = [sand(81), sand(82), sand(83)], cold = season === 'winter';
  Object.assign(defs, {
    '_': { solid: false, art: sands },
    ':': { solid: false, art: [wetSand(84), wetSand(85), wetSand(86)] },
    'r': { solid: true, art: [rocks(87), rocks(88), rocks(89)] },
    'm': cold ? { solid: false, art: sands } : { solid: true, ground: sands, art: umbrellaPole(), over: { img: [umbrellaTop('#a63a34', '#e6e3da'), umbrellaTop('#3d63b5', '#e6e3da'), umbrellaTop('#c8642e', '#e6c86a'), umbrellaTop('#4e9a52', '#e6e3da')], dx: -8, dy: -22 } },
    'j': cold ? { solid: false, art: sands } : { solid: false, art: [towel('#a63a34', '#e6e3da'), towel('#3d63b5', '#e6c86a'), towel('#c95a8e', '#e6e3da'), towel('#24474a', '#e6c86a')] },
    'V': cold ? { solid: false, art: sands } : { solid: true, art: net() },
    'g': { solid: true, art: chairLegs(), over: { img: chairTop(), dx: 0, dy: -16 } },
    'I': cold ? { solid: false, art: sands } : { solid: true, art: cart(), over: { img: cartTop(), dx: 0, dy: -16 } },
  });
  // v2.5: the churchyard behind St. Brigid's (data/cemetery.js), and the woods trail roped off.
  Object.assign(defs, {
    '1': { solid: true, ground: lawns, art: [headstone(101), headstone(102), headstone(103), headstone(104)], interact: 'grave' },
    '2': { solid: true, ground: lawns, art: [crossStone(105), crossStone(106), crossStone(107)], interact: 'grave' },
    '3': { solid: true, ground: lawns, art: obeliskBase(), over: { img: obeliskTop(), dx: 0, dy: -16 }, interact: 'grave' },
    'C': { solid: true, art: [cryptWall(111), cryptWall(112)] },
    'M': { solid: true, art: cryptDoor(), interact: 'grave' },
    'Y': { solid: true, art: ironFence(null), ground: lawns },
    'R': { solid: false, art: ironGate(null), ground: walks, interact: 'gate' },   // locked gates block you (main.js)
    '!': { solid: true, art: ironGate(null), ground: walks, interact: 'cemExit' },
    'U': { solid: true, art: shedDoor(), interact: 'shed' },
    '%': { solid: true, art: ropeTrail(0), interact: 'woodsRope' },
    // v2.5b: the dunes, and the signpost at the top of the boardwalk.
    's': { solid: false, art: [dune(121, season), dune(122, season), dune(123, season), dune(124, season)] },
    '>': { solid: true, ground: [dune(125, season)], art: beachPost(), interact: 'beachSign' },
    '}': { solid: true, ground: [dune(126, season), dune(127, season)], art: duneFence() },
    '&': { solid: true, art: ropeTrail(1), interact: 'woodsRope' },
  });
  for (const [ch, d] of Object.entries(DISTRICTS)) {
    defs[ch] = { solid: true, art: [roof(d, ch.charCodeAt(0)), roof(d, ch.charCodeAt(0) + 9)] };
    defs[ch.toUpperCase()] = { solid: true, art: [brick(d, ch.charCodeAt(0) * 3), brick(d, ch.charCodeAt(0) * 5)] };
  }
  defs.o = { solid: true, art: brick(DISTRICTS.a, 1) };
  defs.O = { solid: true, art: brick(DISTRICTS.a, 2), interact: 'loc' };
  // v2.3: the doors along the beach boardwalk.
  defs.D = { solid: true, art: brick(DISTRICTS.h, 2), interact: 'tackle' };
  defs.Z = { solid: true, art: brick(DISTRICTS.h, 3), interact: 'snack' };
  defs.J = { solid: true, art: brick(DISTRICTS.h, 4), interact: 'lifeguard' };
  // Phase 32: which tiles are buildings (roofs and fronts), for the sun's shadows.
  const mass = new Set([...Object.keys(DISTRICTS), ...Object.keys(DISTRICTS).map(c => c.toUpperCase()), 'o', 'O', 'D', 'Z', 'J']);
  return { defs, floors: walks, mass, trees: new Set(['t', 'T']), posts: new Set(['L', 'l', 'Q']), glowRgb: [0xc9, 0xa2, 0x4a], season };   // glowRgb: the lit windows' colour (Phase 32: they glow at night)
}

// ---------- dressing the fronts ----------

const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

// One row of a front. row 0: cornice and the tops of the upper windows; 1: the window
// bottoms, a sill and a string course; 2: the ground floor.
function frontRow(g, x, y, d, row, h, edgeL, edgeR) {
  const lit = (h >>> 3) % 5 === 0, lit2 = (h >>> 6) % 7 === 0, curtain = (h >>> 9) % 4 === 0;
  const win = (wy, wh, on) => {
    R(g, x + 3, y + wy, 10, wh, C.iron);
    R(g, x + 4, y + wy + 1, 8, wh - 1, on ? C.windowLit : C.window);
    if (!on) R(g, x + 5, y + wy + 1, 2, 1, C.windowLight);
    if (on && curtain) R(g, x + 4, y + wy + 1, 3, wh - 1, '#8a5a2e');
  };
  if (row === 0) {
    R(g, x, y, 16, 3, d.roofDark); R(g, x, y + 3, 16, 1, d.trim); R(g, x, y + 4, 16, 1, 'rgba(0,0,0,0.35)');
    win(7, 9, lit);
    R(g, x + 3, y + 6, 10, 1, d.trim);
  } else if (row === 1) {
    R(g, x + 3, y, 10, 6, C.iron);
    R(g, x + 4, y, 8, 6, lit ? C.windowLit : C.window);
    if (lit && curtain) R(g, x + 4, y, 3, 6, '#8a5a2e');
    R(g, x + 7, y, 2, 6, C.iron);
    R(g, x + 2, y + 6, 12, 2, d.trim); R(g, x + 2, y + 8, 12, 1, 'rgba(0,0,0,0.4)');
    R(g, x, y + 12, 16, 2, d.trim); R(g, x, y + 14, 16, 1, 'rgba(0,0,0,0.3)');
  } else {
    win(2, 10, lit2);
    R(g, x + 3, y + 12, 10, 1, d.trim);
    R(g, x, y + 14, 16, 2, d.brickDark); R(g, x, y + 15, 16, 1, C.iron);
  }
  if (edgeL) { R(g, x, y, 2, 16, d.trim); R(g, x + 2, y, 1, 16, 'rgba(0,0,0,0.25)'); }
  if (edgeR) { R(g, x + 14, y, 2, 16, d.brickDark); }
}

// A plain door, two tiles tall (x, y: the top tile).
function houseDoor(g, x, y, d) {
  R(g, x + 3, y + 4, 10, 28, C.iron);
  R(g, x + 4, y + 5, 8, 27, '#3c2b20');
  R(g, x + 5, y + 7, 6, 6, C.window); R(g, x + 5, y + 7, 6, 1, C.windowLight);
  R(g, x + 5, y + 16, 6, 6, '#2c1f16'); R(g, x + 5, y + 24, 6, 6, '#2c1f16');
  R(g, x + 10, y + 21, 1, 2, C.amber);
  R(g, x + 2, y + 2, 12, 2, d.trim);
  R(g, x + 1, y + 30, 14, 2, C.stoneLight);
}

// A place's door: wider, lit, two tiles tall (x, y: the top tile).
function placeDoor(g, x, y, f) {
  if (f.stone) {
    // An arched wooden door in stone.
    R(g, x - 4, y + 1, 24, 31, C.stoneDark);
    R(g, x - 2, y + 6, 20, 26, C.iron); R(g, x, y + 3, 16, 3, C.iron); R(g, x + 3, y + 1, 10, 2, C.iron);
    R(g, x - 1, y + 7, 18, 25, '#4a3020'); R(g, x + 1, y + 4, 14, 3, '#4a3020');
    R(g, x + 7, y + 4, 2, 28, '#2c1c12');
    for (const yy of [12, 22]) R(g, x - 1, y + yy, 18, 1, C.iron);
    R(g, x + 10, y + 18, 2, 2, C.amber);
    return;
  }
  R(g, x - 3, y + 2, 22, 30, C.iron);
  R(g, x - 2, y + 4, 20, 28, '#2c1f16');
  R(g, x - 1, y + 5, 8, 26, '#4a3020'); R(g, x + 9, y + 5, 8, 26, '#4a3020');
  R(g, x, y + 7, 6, 11, f.boarded ? '#3c2b20' : '#1c2a30'); R(g, x + 10, y + 7, 6, 11, f.boarded ? '#3c2b20' : '#1c2a30');
  if (!f.boarded) { R(g, x, y + 7, 6, 11, hexA(f.glow, 0.28)); R(g, x + 10, y + 7, 6, 11, hexA(f.glow, 0.28)); R(g, x + 1, y + 8, 2, 1, C.windowLight); R(g, x + 11, y + 8, 2, 1, C.windowLight); }
  else for (const yy of [9, 14]) R(g, x - 1, y + yy, 18, 2, '#5a4130');
  R(g, x + 5, y + 20, 1, 2, C.amber); R(g, x + 10, y + 20, 1, 2, C.amber);
  R(g, x - 3, y + 30, 22, 2, C.stoneLight);
}

// A storefront along the ground floor (shop windows lit warm, an awning above them),
// the sign over the door, and touches by kind (a marquee, a rose window, boards).
function storefront(g, L, loc, d) {
  const f = frontOf(loc);
  const x0 = L.roof.tx * 16, x1 = (L.roof.tx + L.roof.w) * 16, dx = L.door.tx * 16, fy = L.door.ty * 16;
  const top = fy - 32, upper = fy - 16;   // the top row of the front, and the middle one
  if (f.stone) {
    // Stone all the way up, narrow lit windows, a rose window over the door.
    for (let tx = L.roof.tx; tx < L.roof.tx + L.roof.w; tx++) for (const yy of [top, upper, fy]) {
      const x = tx * 16;
      R(g, x, yy, 16, 16, C.stone); R(g, x, yy + 7, 16, 1, C.stoneDark); R(g, x, yy + 15, 16, 1, C.stoneDark);
      R(g, x + (tx % 2 ? 8 : 0), yy, 1, 7, C.stoneDark); R(g, x + (tx % 2 ? 0 : 8), yy + 8, 1, 7, C.stoneDark);
      if (yy === top) R(g, x, yy, 16, 3, C.stoneDark);
      if (yy === fy) R(g, x, yy + 15, 16, 1, C.iron);
      if (yy !== top && tx % 3 === 0 && Math.abs(tx - L.door.tx) > 1) {
        R(g, x + 5, yy + 2, 6, 13, C.iron); R(g, x + 6, yy + 3, 4, 12, '#2e4a74'); R(g, x + 7, yy + 6, 2, 3, hexA(f.glow, 0.8)); R(g, x + 6, yy + 10, 4, 1, C.iron); R(g, x + 7, yy + 1, 2, 1, C.iron);
      }
    }
    const cx = dx + 8, cy = upper - 4;
    for (let yy = -9; yy <= 9; yy++) { const w = Math.round(Math.sqrt(81 - yy * yy)); R(g, cx - w, cy + yy, w * 2, 1, C.iron); }
    for (let yy = -7; yy <= 7; yy++) { const w = Math.round(Math.sqrt(49 - yy * yy)); R(g, cx - w, cy + yy, w * 2, 1, (yy + 7) % 4 < 2 ? '#7a3a5e' : '#3a5a8a'); }
    R(g, cx - 1, cy - 7, 2, 14, C.iron); R(g, cx - 7, cy - 1, 14, 2, C.iron); R(g, cx - 2, cy - 2, 4, 4, hexA(f.glow, 0.9));
    placeDoor(g, dx, fy - 16, f);
    return;
  }
  // Ground-floor windows: big panes either side of the door.
  for (let tx = L.roof.tx; tx < L.roof.tx + L.roof.w; tx++) {
    if (Math.abs(tx - L.door.tx) <= 1) continue;
    const x = tx * 16;
    R(g, x, fy + 1, 16, 12, C.iron);
    R(g, x + 1, fy + 2, 14, 10, f.boarded ? '#3c2b20' : '#1c2a30');
    if (f.boarded) { R(g, x, fy + 4, 16, 2, '#5a4130'); R(g, x, fy + 9, 16, 2, '#4a3426'); }
    else {
      R(g, x + 1, fy + 2, 14, 10, hexA(f.glow, 0.22));
      R(g, x + 2, fy + 3, 3, 1, C.windowLight);
      const h = mixHash(tx, L.door.ty);
      R(g, x + 3 + (h % 6), fy + 8, 3, 4, hexA(f.sign, 0.5)); R(g, x + 9 - (h % 4), fy + 6, 2, 6, '#2c3039');
    }
    R(g, x, fy + 13, 16, 3, d.brickDark); R(g, x, fy + 15, 16, 1, C.iron);
  }
  // The awning over the ground floor (stripes, a scalloped edge).
  if (f.awning) {
    const ay = upper + 8;
    for (let x = x0; x < x1; x++) {
      if (x >= dx - 4 && x < dx + 20) continue;
      const col = f.awning[Math.floor((x - x0) / 4) % 2];
      R(g, x, ay, 1, 7, col);
      R(g, x, ay + 7, 1, (x % 4 === 1 || x % 4 === 2) ? 2 : 1, col);
    }
    R(g, x0, ay - 1, x1 - x0, 1, C.iron);
    R(g, x0, ay + 9, x1 - x0, 1, 'rgba(0,0,0,0.3)');
  }
  // A marquee: a lit board across the front, bulbs all round.
  if (f.marquee) {
    const mx = dx - 40, mw = 96, my = upper - 4;
    R(g, mx - 2, my - 2, mw + 4, 20, C.iron); R(g, mx, my, mw, 16, '#6e2e3e'); R(g, mx + 3, my + 4, mw - 6, 8, '#f3e3c0');
    for (let i = 0; i < 9; i++) R(g, mx + 8 + i * 9, my + 6, 5, 4, '#2a1e1a');
    for (let x = mx; x < mx + mw; x += 4) { R(g, x + 1, my + 1, 2, 2, '#f6d48a'); R(g, x + 1, my + 13, 2, 2, '#f6d48a'); }
  }
  placeDoor(g, dx, fy - 16, f);
  // The sign: a board over the door with the place's icon on it.
  const sx = dx - 6, sy = f.marquee ? top - 18 : top - 6;
  R(g, sx - 2, sy - 2, 32, 24, C.iron);
  R(g, sx, sy, 28, 20, '#15171d');
  R(g, sx, sy, 28, 1, f.sign); R(g, sx, sy + 19, 28, 1, f.sign); R(g, sx, sy, 1, 20, f.sign); R(g, sx + 27, sy, 1, 20, f.sign);
  g.fillStyle = f.sign;
  for (const [ix, iy, w] of iconRects(mapIcon(loc))) g.fillRect(sx + 6 + ix, sy + 2 + iy, w, 1);
}
// v2.2: the edge of water: a bank where it meets land, a little foam along it.
export function waterEdge(g, map, tx, ty) {
  // Planks (a bridge, a jetty) stand over the water: no bank under them, just a little foam.
  const x = tx * 16, y = ty * 16, wet = (a, b) => map.def?.(map.at(a, b))?.water || '~ud'.includes(map.at(a, b));
  if (!wet(tx, ty - 1)) { R(g, x, y, 16, 3, W_.bank); R(g, x, y + 2, 16, 1, W_.bankLight); R(g, x + 2, y + 3, 9, 1, W_.foam); }
  if (!wet(tx, ty + 1)) { R(g, x, y + 14, 16, 2, W_.bank); R(g, x + 5, y + 13, 8, 1, W_.foam); }
  if (!wet(tx - 1, ty)) { R(g, x, y, 2, 16, W_.bank); R(g, x + 2, y + 3, 1, 9, W_.foam); }
  if (!wet(tx + 1, ty)) { R(g, x + 14, y, 2, 16, W_.bank); R(g, x + 13, y + 5, 1, 8, W_.foam); }
  if (map.at(tx - 1, ty) === 'd') R(g, x, y + 4, 1, 6, W_.foam);
  if (map.at(tx + 1, ty) === 'd') R(g, x + 15, y + 6, 1, 6, W_.foam);
}
// v2.2: an outdoor area's dressing (Lantern Park): water's edges and the bandstand.
export function decorateArea(room) {
  return (g, map, r) => {
    for (let ty = r.ty0; ty <= r.ty1; ty++) for (let tx = r.tx0; tx <= r.tx1; tx++) if (map.at(tx, ty) === '~') waterEdge(g, map, tx, ty);
    const b = room.bandstand;
    if (b && b.tx <= r.tx1 && b.tx + b.w >= r.tx0 && b.ty <= r.ty1 && b.ty + b.h >= r.ty0) bandstand(g, b.tx * 16, b.ty * 16, b.w * 16, b.h * 16);
  };
}
// Lantern Park's bandstand from above: a round wooden floor, white rail posts, a green roof
// over the back half, steps down to the path in front.
function bandstand(g, x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  const ell = (rx, ry, col, oy = 0) => { g.fillStyle = col; for (let k = -ry; k <= ry; k++) { const ww = Math.round(rx * Math.sqrt(Math.max(0, 1 - (k * k) / (ry * ry)))); g.fillRect(cx - ww, cy + oy + k, ww * 2, 1); } };
  ell(w / 2, h / 2 - 2, 'rgba(0,0,0,0.35)', 4);
  ell(w / 2 - 1, h / 2 - 3, '#3a2a1c', 1); ell(w / 2 - 3, h / 2 - 5, '#5a4130', 1);
  for (let k = -w / 2 + 6; k < w / 2 - 4; k += 4) R(g, cx + k, cy - h / 2 + 8, 1, h - 14, '#4a3626');
  for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; R(g, Math.round(cx + Math.cos(t) * (w / 2 - 3)), Math.round(cy + 1 + Math.sin(t) * (h / 2 - 5)), 2, 3, '#d8d4c8'); }
  ell(w / 2 - 6, h / 4, '#2a4a3a', -8); ell(w / 2 - 9, h / 4 - 3, '#35604a', -9); R(g, cx - 1, cy - 20, 2, 4, '#d8c890');
  R(g, cx - 8, y + h - 4, 16, 4, '#4a3626'); R(g, cx - 8, y + h - 4, 16, 1, '#6a5038');
}

// Old Market Square's fountain, over the tiles marked F.
function fountain(g, x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  const ell = (rx, ry, col, oy = 0) => { g.fillStyle = col; for (let k = -ry; k <= ry; k++) { const ww = Math.round(rx * Math.sqrt(1 - (k * k) / (ry * ry))); g.fillRect(cx - ww, cy + oy + k, ww * 2, 1); } };
  ell(w / 2 - 1, h / 2 - 2, 'rgba(0,0,0,0.35)', 3);
  ell(w / 2 - 2, h / 2 - 3, '#5c5c62'); ell(w / 2 - 5, h / 2 - 6, '#4a4a4e'); ell(w / 2 - 6, h / 2 - 7, W_.mid);
  for (let k = 0; k < 10; k++) R(g, cx - 18 + ((k * 7) % 36), cy - 6 + ((k * 5) % 12), 3, 1, W_.ripple);
  ell(6, 4, '#5c5c62', 2); R(g, cx - 2, cy - 14, 4, 16, '#6a6a70'); R(g, cx - 2, cy - 14, 1, 16, '#808088');
  ell(5, 2, '#6a6a70', -14);
  for (let k = 0; k < 12; k++) R(g, cx - 7 + ((k * 5) % 15), cy - 18 + ((k * 3) % 7), 1, 1, W_.foam);
}
// The gate to Lantern Park: stone posts either side of the road and a sign across the top.
function parkGate(g, x0, x1) {
  R(g, x0 - 12, 0, 10, 16, '#4a4a4e'); R(g, x0 - 12, 0, 10, 2, '#5c5c62'); R(g, x1 + 2, 0, 10, 16, '#4a4a4e'); R(g, x1 + 2, 0, 10, 2, '#5c5c62');
  R(g, x0 - 4, 2, x1 - x0 + 8, 9, C.iron); R(g, x0 - 3, 3, x1 - x0 + 6, 7, '#2a3a2a');
  // "PARK" in tiny letters, and a lantern each side.
  const t = '#d8c890', lx = x0 + (x1 - x0) / 2 - 9;
  [[0,0,1,5],[1,0,2,1],[1,2,2,1],[3,0,1,3],[5,0,1,5],[8,0,1,5],[6,0,2,1],[6,2,2,1],[10,0,1,5],[11,0,2,1],[11,2,2,1],[13,0,1,2],[12,3,1,1],[13,4,1,1],[15,0,1,5],[16,2,1,1],[17,1,1,1],[17,3,1,1],[18,0,1,1],[18,4,1,1]].forEach(([a, b, w, h]) => R(g, lx + a, 4 + b, w, h, t));
  R(g, x0 - 9, 3, 3, 4, '#f6d48a'); R(g, x1 + 6, 3, 3, 4, '#f6d48a');
}


// After the base bake: fronts dressed row by row, doors two tiles tall, a parapet along
// every roof edge, parked cars, each place's storefront, and its sign on the roof.
// Everything is drawn for a margin around the chunk too, so pieces that cross a chunk
// edge (a car, a sign, a wide door) come out whole.
// ---------- Phase 32b: the streets ----------
// Streets are dressed after the tiles are laid, because what a road tile should look like depends on its
// neighbours: curbs where it meets the pavement, lane markings down the middle, drains in the gutter, and
// the odd manhole, crack, patch or oil stain so no two stretches look alike.
const ROADISH = new Set(['=', '+', 'G']);
const isRoadCh = c => ROADISH.has(c);
const isWalkCh = c => c === ',';
const span = (map, tx, ty, dx, dy) => { let n = 0; while (isRoadCh(map.at(tx + dx * (n + 1), ty + dy * (n + 1)))) n++; return n; };

const CURB = { hi: '#555b72', mid: '#3d4256', lo: '#23262f', gutter: '#101217' };
function dressRoad(g, map, tx, ty, h, season) {
  const x = tx * 16, y = ty * 16, here = map.at(tx, ty);
  const up = map.at(tx, ty - 1), down = map.at(tx, ty + 1), left = map.at(tx - 1, ty), right = map.at(tx + 1, ty);
  // the gutter beside a curb, with a drain now and then
  if (here === '=') {
    if (isWalkCh(up)) { R(g, x, y, 16, 1, CURB.gutter); if (h % 7 === 0) { R(g, x + 5, y + 1, 5, 2, CURB.gutter); R(g, x + 6, y + 1, 1, 2, '#2a2d38'); R(g, x + 8, y + 1, 1, 2, '#2a2d38'); } }
    if (isWalkCh(down)) { R(g, x, y + 15, 16, 1, CURB.gutter); if (h % 7 === 3) { R(g, x + 5, y + 13, 5, 2, CURB.gutter); R(g, x + 6, y + 13, 1, 2, '#2a2d38'); R(g, x + 8, y + 13, 1, 2, '#2a2d38'); } }
    if (isWalkCh(left)) R(g, x, y, 1, 16, CURB.gutter);
    if (isWalkCh(right)) R(g, x + 15, y, 1, 16, CURB.gutter);
    if (season === 'autumn' && (isWalkCh(up) || isWalkCh(down)) && h % 3 === 0) { const gy = isWalkCh(up) ? y + 1 : y + 14; for (let i = 0; i < 4; i++) R(g, x + ((h >> (i + 2)) % 13) + 1, gy, 2, 1, i % 2 ? '#8a5a22' : '#6a3a1c'); }
    if (season === 'winter' && (isWalkCh(up) || isWalkCh(down)) && h % 2 === 0) R(g, x + (h % 5), isWalkCh(up) ? y + 1 : y + 14, 6 + (h % 5), 1, '#6a7078');
  }
  // lane markings: a dashed line between the two middle lanes of a road (down its middle if it is two wide)
  if (here === '=') {
    const vUp = span(map, tx, ty, 0, -1), vDn = span(map, tx, ty, 0, 1), hL = span(map, tx, ty, -1, 0), hR = span(map, tx, ty, 1, 0);
    const vN = vUp + vDn + 1, hN = hL + hR + 1;
    if (hN > vN && vN >= 2 && vN <= 4) {                         // a road running left to right
      if (isRoadCh(down) && vUp === Math.floor((vN - 1) / 2)) R(g, x + 1 + ((hL % 2) ? 8 : 0), y + 15, 6, 1, C.lane);
    } else if (vN > hN && hN >= 2 && hN <= 4) {                  // a road running top to bottom
      if (isRoadCh(right) && hL === Math.floor((hN - 1) / 2)) R(g, x + 15, y + 1 + ((vUp % 2) ? 8 : 0), 1, 6, C.lane);
    }
  }
  // wear: a crack, a patch of newer tar, an oil stain, a manhole
  if (here === '=') {
    const k = h % 41;
    if (k === 0) { const px = x + 3 + (h >> 3) % 8, py = y + 3 + (h >> 6) % 8; R(g, px, py, 1, 3, '#0c0d11'); R(g, px + 1, py + 2, 2, 1, '#0c0d11'); R(g, px + 3, py + 3, 1, 2, '#0c0d11'); }
    else if (k === 1) { R(g, x + 3, y + 4, 9, 6, '#181a20'); R(g, x + 3, y + 4, 9, 1, '#1f222a'); }
    else if (k === 2) { R(g, x + 5, y + 6, 6, 4, 'rgba(10,8,18,0.55)'); R(g, x + 6, y + 7, 3, 1, 'rgba(60,46,86,0.45)'); }
    else if (k === 3 && isRoadCh(up) && isRoadCh(down)) {         // a manhole
      R(g, x + 4, y + 4, 8, 8, '#2a2c34'); R(g, x + 5, y + 3, 6, 10, '#2a2c34'); R(g, x + 5, y + 5, 6, 6, '#1a1c22');
      R(g, x + 5, y + 8, 6, 1, '#2a2c34'); R(g, x + 8, y + 5, 1, 6, '#2a2c34'); R(g, x + 5, y + 5, 6, 1, '#3a3d48');
    }
  }
  // rounded corners where the pavement turns the road's edge: both neighbours at that corner are not road
  const nonRoad = c => !isRoadCh(c) && c !== '#' && c !== '~';
  const corners = [[up, left, 0], [up, right, 1], [down, left, 2], [down, right, 3]];
  for (const [n1, n2, k] of corners) if (nonRoad(n1) && nonRoad(n2) && (isWalkCh(n1) || isWalkCh(n2))) fillet(g, x, y, k, FILLET, C.pave, true);
  if (here === '+') {
    // a stop line before the crossing on the way in
    const horiz = isRoadCh(left) || isRoadCh(right);
    void horiz;
  }
}

// Rounded corners (Phase 32b): where a road turns, or steps along a diagonal, its edge should curve, not
// make a square notch. fillet() rounds one corner of a tile: the pixels outside a quarter circle go to
// `fill`, and the curb is drawn as an arc around it. corner: 0 NW, 1 NE, 2 SW, 3 SE.
function fillet(g, x, y, corner, r, fill, roadInside) {
  const ex = corner % 2 === 1, sy = corner >= 2;
  for (let b = 0; b < r; b++) for (let a = 0; a < r; a++) {
    const d = Math.hypot(a + 0.5 - r, b + 0.5 - r);
    let col = null;
    if (roadInside) {                                         // a road corner: the road is the circle, curb and pavement beyond it
      if (d > r) col = d <= r + 1 ? CURB.hi : d <= r + 2 ? CURB.mid : CURB.lo;
    } else if (d > r) col = fill;                             // a pavement corner: the road fills what is outside the circle
    else if (d > r - 1) col = CURB.hi; else if (d > r - 2) col = CURB.mid; else if (d > r - 3) col = CURB.lo;
    if (col != null) R(g, x + (ex ? 15 - a : a), y + (sy ? 15 - b : b), 1, 1, col);
  }
}
const FILLET = 6;

function dressWalk(g, map, tx, ty, h, season) {
  const x = tx * 16, y = ty * 16;
  const up = map.at(tx, ty - 1), down = map.at(tx, ty + 1), left = map.at(tx - 1, ty), right = map.at(tx + 1, ty);
  // the curb: a raised stone edge where the pavement meets the road
  const curb = (cx, cy, w, hgt, horizontal) => {
    if (horizontal) { R(g, cx, cy, w, 1, CURB.hi); R(g, cx, cy + 1, w, 1, CURB.mid); R(g, cx, cy + 2, w, 1, CURB.lo); }
    else { R(g, cx, cy, 1, hgt, CURB.hi); R(g, cx + 1, cy, 1, hgt, CURB.mid); R(g, cx + 2, cy, 1, hgt, CURB.lo); }
  };
  if (isRoadCh(up)) curb(x, y, 16, 0, true);
  if (isRoadCh(down)) { R(g, x, y + 13, 16, 1, CURB.lo); R(g, x, y + 14, 16, 1, CURB.mid); R(g, x, y + 15, 16, 1, CURB.hi); }
  if (isRoadCh(left)) curb(x, y, 0, 16, false);
  if (isRoadCh(right)) { R(g, x + 13, y, 1, 16, CURB.lo); R(g, x + 14, y, 1, 16, CURB.mid); R(g, x + 15, y, 1, 16, CURB.hi); }
  // the pavement's corner, where it bulges into a road on two sides: round it
  const corners = [[up, left, 0], [up, right, 1], [down, left, 2], [down, right, 3]];
  for (const [n1, n2, k] of corners) if (isRoadCh(n1) && isRoadCh(n2)) fillet(g, x, y, k, FILLET, C.asphalt, false);
  // a dropped kerb where a crossing meets the pavement (a ramp, with its bumpy yellow strip)
  if (map.at(tx, ty - 1) === '+' || map.at(tx, ty + 1) === '+') {
    const yy = map.at(tx, ty - 1) === '+' ? y : y + 13;
    for (let i = 0; i < 16; i += 2) R(g, x + i, yy, 1, 3, '#8a7a3a');
  }
  // wear and litter
  const k = h % 29;
  if (k === 0) R(g, x + 3 + (h >> 4) % 9, y + 3 + (h >> 7) % 9, 2, 1, '#4a4c50');             // a stain
  if (k === 1) { const px = x + 2 + (h >> 5) % 10, py = y + 2 + (h >> 8) % 10; R(g, px, py, 1, 2, '#1c1e24'); R(g, px + 1, py + 2, 1, 1, '#1c1e24'); }   // a crack
  if (k === 2) R(g, x + 4 + (h >> 3) % 8, y + 5 + (h >> 6) % 7, 1, 1, '#5a5a62');             // chewing gum, mostly
  if (season === 'autumn' && h % 4 === 0) for (let i = 0; i < 3; i++) R(g, x + ((h >> (i + 1)) % 14), y + ((h >> (i + 5)) % 14), 2, 1, ['#8a5a22', '#6a3a1c', '#a0602a'][i]);
  if (season === 'winter' && h % 5 === 0) R(g, x + (h % 8), y + 8 + (h >> 3) % 6, 4, 2, 'rgba(120,130,140,0.35)');
  if (season === 'spring' && h % 6 === 0) R(g, x + (h >> 2) % 14, y + (h >> 5) % 14, 2, 1, '#c98a9a');   // blossom petals
}

export function decorateCity(layout, DATA, tiles, extra = []) {
  const locOf = id => DATA.locations.find(l => l.id === id) ?? extra.find(l => l.id === id);
  return (g, map, r) => {
    const m = 3, tx0 = r.tx0 - m, tx1 = r.tx1 + m, ty0 = r.ty0 - m, ty1 = r.ty1 + m;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const ch = map.at(tx, ty), x = tx * 16, y = ty * 16, h = mixHash(tx, ty);
      if (isRoof(ch) && isFace(map.at(tx, ty + 1))) {
        const d = districtOf(ch);
        R(g, x, y + 12, 16, 4, d.roofLight); R(g, x, y + 12, 16, 1, d.trim); R(g, x, y + 15, 16, 1, d.roofDark);
      } else if (isRoof(ch) && h % 37 === 0 && isRoof(map.at(tx, ty + 1)) && isRoof(map.at(tx + 1, ty))) {
        const d = districtOf(ch);   // a vent or a skylight on the roof
        R(g, x + 3, y + 4, 9, 7, C.iron); R(g, x + 4, y + 4, 7, 5, h % 2 ? d.roofLight : C.window);
      } else if (isFace(ch)) {
        const d = districtOf(ch), below = map.at(tx, ty + 1), above = map.at(tx, ty - 1);
        const row = isRoof(above) ? 0 : (isFace(below) || isDoor(below)) ? 1 : 2;
        const edgeL = !isFace(map.at(tx - 1, ty)) && !isDoor(map.at(tx - 1, ty)), edgeR = !isFace(map.at(tx + 1, ty)) && !isDoor(map.at(tx + 1, ty));
        frontRow(g, x, y, d, row, h, edgeL, edgeR);
        if (row === 1 && isHouseDoor(below)) houseDoor(g, x, y, d);
      } else if (isHouseDoor(ch)) {
        const d = districtOf([map.at(tx - 1, ty), map.at(tx + 1, ty), map.at(tx, ty - 1)].find(isFace) ?? 'a');
        frontRow(g, x, y, d, 2, h, false, false);
        houseDoor(g, x, y - 16, d);
      } else if (isRoadCh(ch)) {
        dressRoad(g, map, tx, ty, h, tiles.season ?? 'summer');
      } else if (isWalkCh(ch)) {
        dressWalk(g, map, tx, ty, h, tiles.season ?? 'summer');
      } else if (ch === 'c') {
        car(g, x + 1, y - 14, C.car[h % C.car.length]);
      } else if (ch === '~') {
        waterEdge(g, map, tx, ty);
      } else if (ch === 'u') {
        // Railings along the sides of a bridge that face the water.
        if (map.at(tx, ty - 1) === '~') { R(g, x, y, 16, 2, '#2a1e16'); R(g, x, y, 16, 1, '#6a5038'); for (let k = 1; k < 16; k += 5) R(g, x + k, y + 2, 1, 2, '#2a1e16'); }
        if (map.at(tx, ty + 1) === '~') { R(g, x, y + 14, 16, 2, '#2a1e16'); R(g, x, y + 14, 16, 1, '#6a5038'); }
      }
    }
    if (layout.plaza) {
      const f = layout.plaza.fountain;
      if (f.tx <= tx1 && f.tx + f.w >= tx0 && f.ty <= ty1 && f.ty + f.h >= ty0) fountain(g, f.tx * 16, f.ty * 16, f.w * 16, f.h * 16);
    }
    if (layout.gate && layout.gate.x0 - 2 <= tx1 && layout.gate.x1 + 2 >= tx0 && ty0 <= 1) parkGate(g, layout.gate.x0 * 16, (layout.gate.x1 + 1) * 16);
    // v2.5b: the arch over the boardwalk, where the town ends and the beach begins.
    const bw = layout.beach, by = bw ? layout.beachArchY : null;
    if (bw && by != null && bw.x0 - 2 <= tx1 && bw.x1 + 2 >= tx0 && by >= ty0 - 2 && by <= ty1 + 2) beachArch(g, bw.x0 * 16, (bw.x1 + 1) * 16, by * 16 + 6);
    for (const L of Object.values(layout.locs)) {
      if (L.roof.tx > tx1 || L.roof.tx + L.roof.w < tx0 || L.roof.ty > ty1 || L.door.ty < ty0) continue;
      const loc = locOf(L.id);
      if (!loc) continue;
      const d = districtOf(map.at(L.door.tx - 1, L.door.ty - 1));
      storefront(g, L, loc, d);
      // The sign on the roof, for anyone looking down from above.
      const cx = (L.roof.tx + L.roof.w / 2) * 16, cy = (L.roof.ty + 2) * 16;
      g.fillStyle = '#07080c'; g.fillRect(cx - 14, cy - 14, 28, 28);
      g.fillStyle = loc.faction ? '#1c2a30' : loc.zone ? '#24182c' : '#2a2018';
      g.fillRect(cx - 12, cy - 12, 24, 24);
      g.fillStyle = frontOf(loc).sign;
      for (const [x, y, w] of iconRects(mapIcon(loc))) g.fillRect(cx - 8 + x, cy - 8 + y, w, 1);
    }
  };
}
