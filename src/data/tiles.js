// Pixel noir tileset, painted as 16x16 data. Colors stay in a narrow cold
// range so the amber of lamps and the bench light is the only warm thing.

import { bakePainter, makeCanvas } from '../engine/sprites.js';
import { DECOR } from './decor.js';
import { RNG } from '../engine/rng.js';

export const TC = {
  void: '#050608',
  floor: '#2a2420', floorDark: '#211c19', floorLine: '#181412', floorLight: '#342c27',
  wallTop: '#14161d', wallTopEdge: '#1d2029',
  wallFace: '#2b2f3c', wallFaceDark: '#222531', wallTrim: '#3b4052', wainscot: '#1b1d26',
  wood: '#5a4130', woodDark: '#3c2b20', woodLight: '#7a5a40', iron: '#0c0d12',
  rug: '#4a1f24', rugDark: '#36161a', rugGold: '#8a6a3a',
  paper: '#d8d0bc', amber: '#e0a64a', amberDim: '#8a5a22', glass: '#5d7a86',
};

function floor(seed) {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, TC.floor);
    for (let y = 0; y < 16; y += 4) {
      rect(0, y + 3, 16, 1, TC.floorLine);
      const seam = (y / 4 % 2) ? 5 : 11;
      px(seam, y, TC.floorLine); px(seam, y + 1, TC.floorLine); px(seam, y + 2, TC.floorLine);
    }
    for (let i = 0; i < 10; i++) px(r.int(0, 15), r.int(0, 15), r.chance(0.5) ? TC.floorDark : TC.floorLight);
  });
}

const wallTop = () => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, TC.wallTop);
  rect(0, 15, 16, 1, TC.wallTopEdge);
  px(4, 6, TC.wallTopEdge); px(11, 10, TC.wallTopEdge);
});

const wallFace = () => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, TC.wallFace);
  rect(0, 0, 16, 2, TC.wallTop);
  for (let x = 0; x < 16; x += 4) rect(x, 2, 1, 8, TC.wallFaceDark); // wallpaper stripes
  rect(0, 10, 16, 1, TC.wallTrim);
  rect(0, 11, 16, 5, TC.wainscot);
  rect(0, 15, 16, 1, TC.floorLine);
});

const shelf = (seed) => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, TC.wallFace);
    rect(0, 0, 16, 2, TC.wallTop);
    rect(0, 2, 16, 13, TC.woodDark);
    for (const y of [7, 13]) rect(0, y, 16, 2, TC.wood);
    rect(0, 15, 16, 1, TC.floorLine);
    // Jars, books and boxes waiting to be appraised
    for (const base of [7, 13]) {
      let x = 1;
      while (x < 14) {
        const w = r.int(1, 3), h = r.int(2, 4);
        const col = r.pick([TC.paper, TC.glass, TC.rug, TC.rugGold, TC.woodLight]);
        rect(x, base - h, w, h, col);
        if (r.chance(0.3)) px(x, base - h, TC.amber);
        x += w + r.int(0, 1);
      }
    }
  });
};

const crate = () => bakePainter(({ rect }) => {
  rect(1, 2, 14, 13, TC.woodDark);
  rect(2, 3, 12, 11, TC.wood);
  rect(2, 6, 12, 1, TC.woodDark); rect(2, 10, 12, 1, TC.woodDark);
  rect(1, 2, 14, 1, TC.woodLight);
  rect(1, 15, 14, 1, TC.iron);
});

// The bench is two tiles wide: left holds the lamp, right holds a ledger.
const benchL = () => bakePainter(({ px, rect }) => {
  rect(0, 4, 16, 9, TC.woodDark); rect(0, 4, 16, 2, TC.woodLight); rect(0, 13, 16, 2, TC.iron);
  rect(1, 13, 2, 3, TC.iron);
  rect(4, 0, 1, 5, TC.iron); rect(3, 0, 5, 2, TC.amberDim); px(5, 2, TC.amber); px(6, 2, TC.amber);
  rect(9, 6, 5, 3, TC.glass); px(10, 6, TC.paper); // loupe tray
});
const benchR = () => bakePainter(({ px, rect }) => {
  rect(0, 4, 16, 9, TC.woodDark); rect(0, 4, 16, 2, TC.woodLight); rect(0, 13, 16, 2, TC.iron);
  rect(13, 13, 2, 3, TC.iron);
  rect(2, 6, 9, 5, TC.paper); rect(6, 6, 1, 5, TC.wainscot);
  for (const y of [7, 9]) { rect(3, y, 2, 1, TC.floorLine); rect(8, y, 2, 1, TC.floorLine); }
  px(12, 7, TC.rugGold); px(12, 8, TC.rugGold);
});

const rug = (edgeTop, edgeBottom) => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, TC.rug);
  for (let i = 0; i < 16; i += 4) { rect(i, i % 8 ? 6 : 9, 2, 1, TC.rugDark); }
  if (edgeTop) { rect(0, 0, 16, 2, TC.rugGold); rect(0, 2, 16, 1, TC.rugDark); }
  if (edgeBottom) { rect(0, 14, 16, 2, TC.rugGold); rect(0, 13, 16, 1, TC.rugDark); }
});

const lamp = () => bakePainter(({ px, rect }) => {
  rect(4, 14, 8, 2, TC.iron);
  rect(7, 5, 2, 9, TC.iron);
  rect(4, 1, 8, 4, TC.amberDim); rect(5, 2, 6, 3, TC.amber);
  px(4, 1, TC.iron); px(11, 1, TC.iron);
});

const door = (side) => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, TC.wallTop);
  rect(0, 0, 16, 16, TC.woodDark);
  rect(side === 'L' ? 2 : 0, 2, 14, 14, TC.wood);
  rect(side === 'L' ? 4 : 2, 4, 10, 4, TC.woodDark);
  rect(side === 'L' ? 13 : 2, 9, 1, 2, TC.amber);
  rect(0, 0, 16, 1, TC.iron);
});

// Tile definitions. `face` swaps a wall to its front-facing art when floor is below it.
export function buildTileset() {
  const floors = [floor(11), floor(23), floor(37), floor(41)];
  const shelves = [shelf(3), shelf(8), shelf(14), shelf(21)];
  return {
    floors, shelves,
    defs: {
      '.': { solid: false },
      '#': { solid: true, wall: true },
      'S': { solid: true, wall: true, shelf: true },
      'c': { solid: true, prop: crate() },
      'B': { solid: true, prop: benchL(), interact: 'bench' },
      'b': { solid: true, prop: benchR(), interact: 'bench' },
      'r': { solid: false, rug: true },
      'L': { solid: true, prop: lamp(), light: 52 },
      'D': { solid: true, prop: door('L'), interact: 'door' },
      'd': { solid: true, prop: door('R'), interact: 'door' },
    },
    wallTop: wallTop(), wallFace: wallFace(),
    rugMid: rug(false, false), rugTop: rug(true, false), rugBottom: rug(false, true),
  };
}

// ---- Shop floor pieces ----

export function buildShopTiles(ts) {
  const counter = () => bakePainter(({ rect }) => {
    rect(0, 2, 16, 4, TC.woodLight); rect(0, 5, 16, 1, TC.woodDark);
    rect(0, 6, 16, 9, TC.wood);
    for (let x = 1; x < 16; x += 5) rect(x, 7, 3, 6, TC.woodDark);
    rect(0, 15, 16, 1, TC.iron);
  });
  const register = () => bakePainter(({ px, rect }) => {
    rect(0, 2, 16, 4, TC.woodLight); rect(0, 5, 16, 1, TC.woodDark);
    rect(0, 6, 16, 9, TC.wood); rect(0, 15, 16, 1, TC.iron);
    rect(3, 0, 10, 5, TC.rugGold); rect(4, 1, 8, 2, TC.iron);
    px(5, 1, TC.amber); px(7, 1, TC.amber); px(9, 1, TC.amber);
    rect(4, 4, 8, 1, TC.amberDim);
  });
  const display = () => bakePainter(({ px, rect }) => {
    rect(1, 3, 14, 12, TC.woodDark);
    rect(2, 4, 12, 7, '#1c2a30');
    rect(2, 4, 12, 1, TC.glass); px(3, 5, '#9fb4bf'); px(4, 5, '#9fb4bf');
    rect(1, 11, 14, 3, TC.wood); rect(1, 14, 14, 1, TC.iron);
  });
  const frontDoor = side => bakePainter(({ rect }) => {
    rect(0, 0, 16, 16, TC.wallTop);
    rect(side === 'L' ? 2 : 0, 0, 14, 16, TC.woodDark);
    rect(side === 'L' ? 3 : 0, 2, 12, 9, '#1c2a30');
    rect(side === 'L' ? 4 : 1, 3, 3, 1, TC.glass);
    rect(side === 'L' ? 14 : 1, 11, 1, 2, TC.amber);
  });
  Object.assign(ts.defs, decorTiles());
  Object.assign(ts.defs, {
    'K': { solid: true, prop: counter() },
    'R': { solid: true, prop: register(), interact: 'register' },
    'V': { solid: true, prop: display(), interact: 'display' },
    'e': { solid: true, inWall: true, prop: door('L'), interact: 'backdoor' },
    'E': { solid: true, inWall: true, prop: door('R'), interact: 'backdoor' },
    'F': { solid: true, prop: frontDoor('L'), interact: 'frontdoor' },
    'f': { solid: true, prop: frontDoor('R'), interact: 'frontdoor' },
  });
  return ts;
}

// ---- Decor (Phase 24): pieces you place yourself (data/decor.js) ----
// Each has its foot on the tile (`prop`) and, if it's tall, a top (`over`) drawn with the
// people so you can walk behind it.

function paintBox(w, h, fn) {
  const cv = makeCanvas(w, h), g = cv.getContext('2d');
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const rect = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  fn({ px, rect });
  return cv;
}
const BRASS = '#a8843e', BRASS_L = '#e0b860', LEAF = '#3e6a3a', LEAF_L = '#5e8e4a', LEAF_D = '#294a28', CLAY = '#9a5a3a', CLAY_D = '#6e3a24';
const MARBLE = '#cfc8bc', MARBLE_D = '#9a9488', VELVET = '#3e5a3e', VELVET_D = '#2a3e2a', VELVET_L = '#56785a';
const shadow = rect => { rect(2, 14, 12, 2, 'rgba(0,0,0,0.35)'); };

const DECOR_ART = {
  mat: () => ({ prop: bakePainter(({ rect, px }) => {
    rect(1, 4, 14, 9, '#5a2a24'); rect(2, 5, 12, 7, '#7a3a2e'); rect(1, 12, 14, 1, '#3a1a16');
    for (const x of [3, 5, 7, 9, 11]) rect(x, 7, 1, 3, '#b8945a');
    px(4, 8, '#b8945a'); px(10, 8, '#b8945a');
  }) }),
  fern: () => ({
    prop: bakePainter(({ rect, px }) => { shadow(rect); rect(4, 8, 8, 7, CLAY); rect(3, 7, 10, 2, '#b06a44'); rect(4, 13, 8, 2, CLAY_D); px(5, 10, '#b06a44'); rect(5, 4, 6, 4, LEAF_D); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => {
      const fronds = [[1, 12, 6, -1], [9, 12, 6, 1], [3, 7, 5, -1], [8, 7, 5, 1], [6, 3, 4, 0]];
      for (const [x, y, n, d] of fronds) for (let i = 0; i < n; i++) { rect(x + (d < 0 ? n - 1 - i : i) * (d === 0 ? 0 : 1), y - Math.floor(i / 2) + (d === 0 ? i : 0), 2, 2, i % 2 ? LEAF : LEAF_L); }
      px(7, 2, LEAF_L); px(8, 4, LEAF_D); px(4, 10, LEAF_D); px(11, 9, LEAF_D);
    }), dx: 0, dy: -8 },
  }),
  runner: () => ({ rug: true }),
  umbrella: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); rect(4, 6, 8, 9, '#2a3a4a'); rect(4, 6, 8, 1, '#4a5a6e'); rect(4, 14, 8, 1, '#1a222c');
    rect(5, 1, 1, 6, '#3a1e1a'); rect(5, 1, 3, 1, '#3a1e1a'); rect(7, 1, 1, 2, '#3a1e1a');
    rect(9, 2, 1, 5, '#24474a'); rect(8, 2, 3, 1, '#24474a');
    rect(7, 3, 1, 4, '#7a3a34'); px(6, 3, '#7a3a34');
  }) }),
  lamp: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); rect(5, 13, 6, 2, BRASS); rect(4, 14, 8, 1, '#5a4320'); rect(7, 0, 2, 13, BRASS); rect(7, 0, 1, 13, BRASS_L); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => { rect(7, 10, 2, 6, BRASS); rect(3, 3, 10, 7, '#c9a46a'); rect(4, 2, 8, 1, '#c9a46a'); rect(3, 9, 10, 1, '#8a6a3a'); rect(4, 4, 8, 4, '#f0d08a'); px(5, 5, '#fff0c8'); }), dx: 0, dy: -10 },
    light: 46, lightDy: -8,
  }),
  chair: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); rect(2, 2, 12, 7, VELVET_D); rect(3, 2, 10, 6, VELVET); rect(3, 2, 10, 1, VELVET_L);
    rect(1, 6, 3, 7, VELVET_D); rect(12, 6, 3, 7, VELVET_D); rect(1, 6, 3, 1, VELVET_L); rect(12, 6, 3, 1, VELVET_L);
    rect(4, 8, 8, 5, VELVET); rect(4, 8, 8, 1, VELVET_L); rect(2, 13, 2, 2, TC.woodDark); rect(12, 13, 2, 2, TC.woodDark);
    px(6, 4, VELVET_D); px(9, 4, VELVET_D);
  }) }),
  bust: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); rect(4, 4, 8, 11, MARBLE_D); rect(4, 4, 8, 2, MARBLE); rect(5, 6, 6, 8, MARBLE); rect(3, 13, 10, 2, MARBLE_D); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => {
      rect(3, 12, 10, 4, MARBLE); rect(3, 15, 10, 1, MARBLE_D);
      rect(6, 9, 4, 3, MARBLE_D); rect(5, 2, 6, 8, MARBLE); rect(5, 2, 6, 2, MARBLE_D); rect(10, 4, 1, 5, MARBLE_D);
      px(6, 5, MARBLE_D); px(9, 5, MARBLE_D); rect(7, 6, 1, 2, MARBLE_D); px(7, 8, MARBLE_D); px(8, 8, MARBLE_D);
    }), dx: 0, dy: -12 },
  }),
  clock: () => ({
    prop: bakePainter(({ rect, px }) => { shadow(rect); rect(3, 0, 10, 15, '#3a2418'); rect(4, 0, 8, 14, '#5a3a26'); rect(5, 2, 6, 9, '#24160e'); rect(7, 2, 2, 6, BRASS); rect(6, 8, 4, 2, BRASS_L); px(7, 9, '#fff0c8'); rect(3, 14, 10, 1, TC.iron); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => {
      rect(3, 2, 10, 14, '#3a2418'); rect(4, 3, 8, 13, '#5a3a26'); rect(2, 1, 12, 2, '#3a2418'); rect(5, 0, 6, 1, '#3a2418');
      rect(5, 5, 6, 6, '#e8e0cc'); rect(5, 5, 6, 1, '#c9c0a8'); px(8, 6, TC.iron); px(8, 7, TC.iron); px(9, 8, TC.iron); px(8, 8, TC.iron);
      for (const [x, y] of [[8, 5], [10, 8], [8, 10], [5, 8]]) px(x, y, '#5a4a3a');
      rect(5, 12, 6, 1, BRASS);
    }), dx: 0, dy: -14 },
  }),
  bookshelf: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); rect(1, 0, 14, 15, '#3a2418'); rect(2, 1, 12, 13, '#24160e');
      for (const [y, cols] of [[5, ['#6e2e3e', '#24474a', '#c9b98f', '#3a3a5a', '#7a6230', '#5a4a3a']], [11, ['#24474a', '#7a3a34', '#c9b98f', '#4e9a52', '#3a3a5a']]]) { let x = 3; for (const c of cols) { rect(x, y - 4, 2, 4, c); x += 2; } rect(2, y, 12, 1, '#5a3a26'); }
      rect(1, 14, 14, 1, TC.iron); }),
    over: { img: paintBox(16, 16, ({ rect }) => { rect(1, 6, 14, 10, '#3a2418'); rect(2, 7, 12, 9, '#24160e'); rect(0, 5, 16, 2, '#5a3a26');
      let x = 3; for (const c of ['#c9b98f', '#6e2e3e', '#3a3a5a', '#7a6230', '#24474a']) { rect(x, 10, 2, 5, c); x += 2; } rect(11, 12, 3, 3, '#cfc8bc'); }), dx: 0, dy: -10 },
  }),
  record: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); rect(1, 5, 14, 9, '#5a3a26'); rect(1, 5, 14, 1, '#7a5a40'); rect(1, 13, 14, 1, '#3a2418');
    rect(3, 6, 8, 6, '#16181e'); rect(5, 8, 4, 2, '#3a1a1a'); px(6, 8, '#b2463f'); px(7, 9, '#e0a64a');
    rect(11, 6, 1, 4, BRASS_L); px(10, 10, BRASS); rect(12, 11, 2, 1, BRASS);
    rect(2, 0, 6, 5, '#7a3a34'); rect(3, 1, 4, 3, '#c9b98f'); rect(8, 1, 5, 4, '#24474a'); rect(9, 2, 3, 2, '#cfc8bc');
  }) }),
  curio: () => ({
    prop: bakePainter(({ rect, px }) => { shadow(rect); rect(1, 0, 14, 15, '#3a2418'); rect(2, 0, 12, 13, '#1c2a30'); rect(2, 6, 12, 1, '#5a3a26'); rect(1, 13, 14, 2, '#24160e');
      px(4, 3, '#c9b98f'); px(5, 3, '#c9b98f'); px(9, 2, '#9fd0d0'); px(9, 3, '#9fd0d0'); px(11, 4, '#b2463f'); px(4, 9, BRASS_L); px(5, 10, BRASS); px(8, 9, '#cfc8bc'); px(8, 10, '#cfc8bc'); px(11, 9, '#7a4a8a'); rect(2, 0, 1, 13, '#5d7a86'); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => {
      rect(1, 4, 14, 12, '#3a2418'); rect(2, 6, 12, 10, '#1c2a30'); rect(0, 3, 16, 2, '#5a3a26'); rect(2, 6, 1, 10, '#5d7a86');
      px(5, 10, '#e8e0cc'); px(5, 11, '#e8e0cc'); px(6, 11, '#c9c0a8'); px(10, 9, '#9fd08a'); px(10, 10, '#4e9a52'); px(12, 12, BRASS_L); rect(2, 14, 12, 1, '#5a3a26');
    }), dx: 0, dy: -12 },
  }),
};

// v2.5b: more pieces.
const TABLE = (rect) => { rect(2, 7, 12, 2, '#5a3a26'); rect(2, 7, 12, 1, '#7a5a40'); rect(3, 9, 2, 6, '#3a2418'); rect(11, 9, 2, 6, '#3a2418'); };
Object.assign(DECOR_ART, {
  globe: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); rect(7, 8, 2, 6, '#3a2418'); rect(4, 13, 8, 2, '#5a3a26'); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => { rect(4, 6, 8, 8, '#3a6a7a'); rect(5, 5, 6, 10, '#3a6a7a'); rect(6, 7, 3, 3, '#7a8a4a'); rect(9, 10, 2, 3, '#8a7a4a'); px(5, 8, '#9ab0a0'); rect(3, 9, 1, 2, BRASS); rect(12, 9, 1, 2, BRASS); rect(7, 4, 2, 1, BRASS); rect(7, 15, 2, 1, BRASS); }), dx: 0, dy: -8 },
  }),
  palm: () => ({
    prop: bakePainter(({ rect, px }) => { shadow(rect); rect(5, 9, 6, 6, '#7a6a5a'); rect(4, 8, 8, 2, '#9a8a7a'); rect(7, 3, 2, 6, '#5a4a2a'); px(5, 12, '#5a4a3a'); }),
    over: { img: paintBox(16, 24, ({ rect }) => { const fr = [[1, 10, 7, 1], [8, 8, 7, -1], [0, 4, 7, 1], [9, 3, 6, -1], [5, 1, 3, 0], [2, 15, 5, 1], [10, 14, 5, -1]]; for (const [x, y, n, d] of fr) for (let i = 0; i < n; i++) rect(x + (d >= 0 ? i : n - 1 - i), y + (d === 0 ? i : Math.floor(i / 2)), 2, 2, i % 2 ? LEAF : LEAF_L); rect(7, 12, 2, 12, '#5a4a2a'); }), dx: 0, dy: -18 },
  }),
  coatrack: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); rect(7, 0, 2, 14, '#3a2418'); rect(4, 14, 8, 1, '#3a2418'); rect(5, 13, 1, 2, '#3a2418'); rect(10, 13, 1, 2, '#3a2418'); rect(4, 2, 4, 9, '#4a4f63'); rect(4, 2, 4, 1, '#5a5f74'); }),
    over: { img: paintBox(16, 16, ({ rect }) => { rect(7, 6, 2, 10, '#3a2418'); rect(4, 6, 8, 1, '#3a2418'); rect(5, 2, 6, 3, '#23202a'); rect(4, 5, 8, 1, '#23202a'); }), dx: 0, dy: -10 },
  }),
  trunk: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); rect(1, 5, 14, 9, '#5a3a26'); rect(1, 5, 14, 2, '#7a5a40'); rect(1, 8, 14, 1, '#3a2418');
    for (const x of [3, 12]) rect(x, 5, 1, 9, BRASS); rect(7, 8, 2, 3, BRASS_L); rect(4, 10, 3, 2, '#c9b98f'); rect(9, 11, 2, 2, '#a63a34'); px(5, 11, '#3a6a7a');
  }) }),
  candelabra: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); rect(7, 2, 2, 12, BRASS); rect(7, 2, 1, 12, BRASS_L); rect(5, 13, 6, 2, BRASS); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => { rect(2, 10, 12, 1, BRASS); rect(7, 10, 2, 6, BRASS); for (const x of [2, 5, 8, 11, 13]) { rect(x, 6, 1, 4, '#e6e3da'); px(x, 5, '#f0c060'); px(x, 4, '#fff0c8'); } }), dx: 0, dy: -10 },
    light: 34, lightDy: -10,
  }),
  birdcage: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); rect(7, 8, 2, 6, BRASS); rect(4, 14, 8, 1, BRASS); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => { for (let x = 3; x <= 12; x += 3) rect(x, 4, 1, 10, BRASS); rect(3, 13, 10, 1, BRASS); rect(4, 3, 8, 1, BRASS); rect(6, 2, 4, 1, BRASS); rect(7, 0, 2, 2, BRASS_L); rect(4, 9, 8, 1, '#5a4320'); px(8, 8, '#c9b98f'); }), dx: 0, dy: -10 },
  }),
  aquarium: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); TABLE(rect); rect(1, 1, 14, 7, '#1c2a30'); rect(2, 2, 12, 5, '#3a8a9a'); rect(2, 2, 12, 1, '#7ac0c8'); rect(2, 6, 12, 1, '#c9b98f');
    px(5, 4, '#e0a64a'); px(6, 4, '#e0a64a'); px(10, 3, '#e0602e'); px(11, 3, '#e0602e'); rect(8, 4, 2, 2, '#8a8a86'); px(4, 5, '#4e9a52'); px(4, 4, '#4e9a52');
  }), light: 26, lightDy: -4 }),
  gramophone: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); TABLE(rect); rect(3, 4, 8, 3, '#3a2418'); rect(4, 3, 6, 1, '#16181e'); rect(8, 1, 1, 3, BRASS); }),
    over: { img: paintBox(16, 16, ({ rect }) => { rect(8, 10, 2, 6, BRASS); rect(7, 6, 4, 4, BRASS); rect(5, 2, 9, 5, BRASS_L); rect(6, 3, 7, 3, '#5a4320'); rect(4, 1, 11, 1, BRASS); }), dx: 0, dy: -10 },
  }),
  armor: () => ({
    prop: bakePainter(({ rect }) => { shadow(rect); rect(5, 0, 6, 9, '#8a8f9a'); rect(5, 0, 2, 9, '#b0b4bc'); rect(5, 9, 2, 5, '#6a6f7a'); rect(9, 9, 2, 5, '#6a6f7a'); rect(3, 14, 10, 1, '#3a2418'); rect(3, 0, 2, 7, '#7a7f8a'); rect(11, 0, 2, 7, '#7a7f8a'); }),
    over: { img: paintBox(16, 16, ({ rect, px }) => { rect(5, 3, 6, 7, '#8a8f9a'); rect(5, 3, 2, 7, '#b0b4bc'); rect(6, 7, 4, 1, '#16181e'); rect(4, 11, 8, 5, '#8a8f9a'); rect(4, 11, 8, 1, '#b0b4bc'); rect(7, 0, 2, 3, '#a63a34'); px(12, 2, '#cfc8bc'); rect(12, 3, 1, 13, '#5a3a26'); }), dx: 0, dy: -10 },
  }),
  roundrug: () => ({ prop: bakePainter(({ rect }) => {
    rect(3, 2, 10, 12, '#7a3a34'); rect(2, 4, 12, 8, '#7a3a34'); rect(4, 4, 8, 8, '#a65a44'); rect(3, 6, 10, 4, '#a65a44'); rect(6, 6, 4, 4, '#c98a5a'); rect(5, 7, 6, 2, '#c98a5a'); rect(7, 7, 2, 2, '#7a3a34');
  }) }),
  radio: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); TABLE(rect); rect(3, 1, 10, 6, HOME.wood); rect(4, 2, 4, 4, HOME.woodD); rect(9, 2, 3, 2, '#e0a64a'); px(9, 5, '#cfc8bc'); px(11, 5, '#cfc8bc'); rect(3, 6, 10, 1, HOME.woodD);
  }) }),
  loveseat: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); rect(0, 2, 16, 7, VELVET_D); rect(1, 2, 14, 6, VELVET); rect(1, 2, 14, 1, VELVET_L);
    rect(0, 6, 2, 7, VELVET_D); rect(14, 6, 2, 7, VELVET_D); rect(2, 8, 12, 5, VELVET); rect(2, 8, 12, 1, VELVET_L); rect(7, 8, 1, 5, VELVET_D);
    rect(1, 13, 2, 2, TC.woodDark); rect(13, 13, 2, 2, TC.woodDark); px(4, 4, VELVET_D); px(11, 4, VELVET_D);
  }) }),
  desk: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); rect(1, 0, 14, 14, '#3a2418'); rect(2, 1, 12, 6, '#24160e'); for (let x = 3; x < 13; x += 3) rect(x, 2, 2, 4, '#5a3a26'); px(4, 3, '#e6e3da'); px(7, 4, '#e6e3da'); px(10, 3, '#c9b98f');
    rect(1, 7, 14, 1, '#7a5a40'); rect(2, 9, 5, 4, '#5a3a26'); rect(9, 9, 5, 4, '#5a3a26'); px(4, 11, BRASS); px(11, 11, BRASS); rect(1, 14, 14, 1, TC.iron);
  }) }),
  cactus: () => ({ prop: bakePainter(({ rect, px }) => {
    shadow(rect); rect(5, 10, 6, 5, CLAY); rect(4, 9, 8, 2, '#b06a44'); rect(7, 3, 3, 7, '#4e7a3a'); rect(7, 3, 1, 7, '#6a9a4a'); rect(5, 5, 2, 3, '#4e7a3a'); rect(10, 4, 2, 3, '#4e7a3a'); px(8, 2, '#d0608a'); px(8, 5, '#d8d4c8'); px(9, 7, '#d8d4c8');
  }) }),
});

export function decorTiles() {
  const defs = {};
  for (const d of DECOR) {
    const art = DECOR_ART[d.id]();
    defs[d.char] = { solid: d.solid, decor: d.id, ...(d.interact ? { interact: d.interact } : {}), ...art };
  }
  return defs;
}

// ---- Back room, basement lab and the second till ----

export function buildLabTiles(ts) {
  const till = () => bakePainter(({ px, rect }) => {
    rect(0, 2, 16, 4, TC.woodLight); rect(0, 5, 16, 1, TC.woodDark);
    rect(0, 6, 16, 9, TC.wood); rect(0, 15, 16, 1, TC.iron);
    rect(4, 0, 8, 5, '#3a4a3e'); rect(5, 1, 6, 2, '#9fd08a');
    px(6, 1, TC.iron); px(9, 1, TC.iron); rect(5, 4, 6, 1, TC.amberDim);
  });
  const stairsDown = () => bakePainter(({ rect }) => {
    rect(0, 0, 16, 16, TC.wallTop);
    rect(2, 2, 12, 14, '#07080c');
    for (let i = 0; i < 4; i++) rect(2, 4 + i * 3, 12, 1, i % 2 ? TC.woodDark : TC.wood);
    rect(1, 2, 1, 14, TC.wallTrim); rect(14, 2, 1, 14, TC.wallTrim);
  });
  const stairsUp = side => bakePainter(({ rect }) => {
    rect(0, 0, 16, 16, TC.wallTop);
    rect(side === 'L' ? 2 : 0, 2, 14, 14, TC.woodDark);
    for (let i = 0; i < 5; i++) rect(side === 'L' ? 2 : 0, 3 + i * 3, 14, 2, i % 2 ? TC.wood : TC.woodLight);
    rect(0, 0, 16, 2, TC.wallTop);
  });
  const cot = side => bakePainter(({ rect }) => {
    rect(0, 3, 16, 11, TC.iron);
    rect(side === 'L' ? 1 : 0, 4, 15, 9, '#3b4052');
    rect(side === 'L' ? 1 : 0, 4, 15, 2, '#4a5066');
    if (side === 'L') { rect(2, 5, 5, 4, TC.paper); rect(2, 8, 5, 1, '#b8b0a0'); }
    else rect(0, 9, 15, 4, '#2c3140');
    rect(side === 'L' ? 1 : 13, 13, 2, 3, TC.iron);
  });
  const workbench = side => bakePainter(({ px, rect }) => {
    rect(0, 4, 16, 9, TC.woodDark); rect(0, 4, 16, 2, TC.woodLight); rect(0, 13, 16, 2, TC.iron);
    rect(side === 'L' ? 1 : 13, 13, 2, 3, TC.iron);
    if (side === 'L') { rect(2, 1, 1, 5, TC.iron); rect(1, 1, 3, 1, TC.iron); rect(6, 2, 4, 3, '#5d6378'); rect(11, 3, 3, 2, TC.amberDim); }
    else { rect(2, 2, 2, 3, TC.paper); rect(5, 1, 1, 4, TC.glass); rect(8, 3, 5, 2, TC.woodLight); px(10, 2, TC.amber); }
  });
  const desk = side => bakePainter(({ px, rect }) => {
    rect(0, 4, 16, 9, TC.woodDark); rect(0, 4, 16, 2, '#6a4a36'); rect(0, 13, 16, 2, TC.iron);
    rect(side === 'L' ? 1 : 13, 13, 2, 3, TC.iron);
    if (side === 'L') { rect(2, 0, 3, 5, TC.rug); rect(5, 1, 2, 4, TC.rugGold); rect(7, 2, 2, 3, '#3a4a5e'); rect(10, 3, 5, 2, TC.paper); }
    else { rect(1, 3, 7, 2, TC.paper); rect(4, 3, 1, 2, TC.wainscot); rect(11, 0, 1, 5, TC.iron); rect(10, 0, 3, 2, TC.amberDim); px(11, 2, TC.amber); }
  });
  const gear = () => bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, TC.wallFace); rect(0, 0, 16, 2, TC.wallTop);
    rect(1, 3, 14, 11, TC.woodDark); rect(1, 8, 14, 1, TC.wood); rect(1, 13, 14, 1, TC.wood);
    rect(2, 4, 4, 4, '#2a2e38'); px(3, 5, '#9fd08a'); px(4, 6, '#9fd08a');
    rect(8, 5, 2, 3, '#7a5a9a'); rect(11, 4, 3, 4, TC.glass);
    rect(3, 10, 3, 3, TC.amberDim); rect(9, 10, 4, 3, '#5d6378');
    rect(0, 15, 16, 1, TC.floorLine);
  });
  const cell = () => bakePainter(({ rect }) => {
    rect(0, 0, 16, 16, TC.wallFace); rect(0, 0, 16, 2, TC.wallTop);
    rect(1, 2, 14, 14, '#07080c');
    for (let x = 2; x < 15; x += 3) rect(x, 2, 1, 14, '#5d6378');
    rect(1, 6, 14, 1, '#5d6378'); rect(1, 2, 14, 1, '#3b4052');
    rect(11, 9, 2, 2, TC.amberDim);
  });
  // The other door: older than the shop, painted over more than once, chalk on the frame.
  const otherDoor = side => bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, TC.wallFace); rect(0, 0, 16, 2, TC.wallTop);
    rect(side === 'L' ? 2 : 0, 2, 14, 14, '#2c2420');
    rect(side === 'L' ? 3 : 0, 3, 12, 13, '#4a3a30');
    rect(side === 'L' ? 4 : 0, 4, 10, 5, '#3a2e26'); rect(side === 'L' ? 4 : 0, 10, 10, 5, '#3a2e26');
    if (side === 'L') { rect(2, 2, 1, 14, '#d8d0bc'); px(5, 12, '#d8d0bc'); px(6, 11, '#d8d0bc'); px(6, 13, '#d8d0bc'); }
    else { rect(10, 8, 2, 2, TC.amberDim); px(11, 8, TC.amber); rect(14, 2, 1, 14, '#d8d0bc'); }
  });
  Object.assign(ts.defs, {
    'O': { solid: true, inWall: true, prop: otherDoor('L'), interact: 'otherDoor' },
    'o': { solid: true, inWall: true, prop: otherDoor('R'), interact: 'otherDoor' },
    'T': { solid: true, prop: till(), interact: 'till' },
    'n': { solid: true, inWall: true, prop: stairsDown(), interact: 'stairsDown' },
    'U': { solid: true, inWall: true, prop: stairsUp('L'), interact: 'stairsUp' },
    'u': { solid: true, inWall: true, prop: stairsUp('R'), interact: 'stairsUp' },
    'Z': { solid: true, prop: cot('L'), interact: 'cot' },
    'z': { solid: true, prop: cot('R'), interact: 'cot' },
    'W': { solid: true, prop: workbench('L'), interact: 'workshop' },
    'w': { solid: true, prop: workbench('R'), interact: 'workshop' },
    'Q': { solid: true, prop: desk('L'), interact: 'desk' },
    'q': { solid: true, prop: desk('R'), interact: 'desk' },
    'G': { solid: true, inWall: true, prop: gear(), interact: 'gear' },
    'X': { solid: true, inWall: true, prop: cell(), interact: 'cells' },
  });
  return ts;
}

// ---- The run-down shop: what the early stages look like (see shop-tiers.js) ----

const DUST = '#3d362f', GRIME = '#1a1613', SHEET = '#5b6070', SHEET_DK = '#3f4350', PLASTER = '#575043', NAIL = '#9a8f80';

function grimeFloor(seed) {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#25201c');
    for (let y = 0; y < 16; y += 4) {
      rect(0, y + 3, 16, 1, TC.floorLine);
      const seam = (y / 4 % 2) ? 5 : 11;
      px(seam, y, TC.floorLine); px(seam, y + 1, TC.floorLine); px(seam, y + 2, TC.floorLine);
    }
    // stains, grit and dust in the corners
    for (let i = 0; i < 2; i++) { const x = r.int(0, 12), y = r.int(0, 12); rect(x, y, r.int(2, 4), r.int(1, 3), GRIME); }
    for (let i = 0; i < 14; i++) px(r.int(0, 15), r.int(0, 15), r.chance(0.6) ? DUST : GRIME);
  });
}

const crackedFloor = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#25201c');
    for (let y = 0; y < 16; y += 4) rect(0, y + 3, 16, 1, TC.floorLine);
    // one board split and sunk
    const y0 = r.pick([0, 4, 8]);
    rect(2, y0, 11, 3, '#0e0c0b');
    for (let x = 3; x < 12; x += 2) px(x, y0 + (x % 4 ? 0 : 2), '#4a3e32');
    px(2, y0 + 1, '#5a4a3a'); px(12, y0 + 1, '#5a4a3a');
    for (let i = 0; i < 6; i++) px(r.int(0, 15), r.int(0, 15), DUST);
  });
};

const peelFace = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, TC.wallFace);
    rect(0, 0, 16, 2, TC.wallTop);
    for (let x = 0; x < 16; x += 4) rect(x, 2, 1, 8, TC.wallFaceDark);
    // torn paper: bare plaster underneath, a curled edge, a water stain
    const x0 = r.int(1, 8), w = r.int(3, 6);
    rect(x0, r.int(3, 5), w, r.int(3, 5), PLASTER);
    px(x0 + w, 4, '#3b4052'); px(x0 + w, 5, '#4a5066');
    if (r.chance(0.6)) { const sx = r.int(2, 13); rect(sx, 2, 2, r.int(4, 8), '#20232c'); px(sx, 10, '#20232c'); }
    rect(0, 10, 16, 1, TC.wallTrim);
    rect(0, 11, 16, 5, TC.wainscot);
    if (r.chance(0.5)) rect(r.int(2, 12), 12, 3, 1, '#2a2d38');
    rect(0, 15, 16, 1, TC.floorLine);
  });
};

const dustyShelf = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, TC.wallFace);
    rect(0, 0, 16, 2, TC.wallTop);
    rect(0, 2, 16, 13, TC.woodDark);
    for (const y of [7, 13]) { rect(0, y, 16, 2, TC.wood); rect(0, y, 16, 1, DUST); }
    // a cobweb in one corner, one forgotten jar
    for (let i = 0; i < 4; i++) { px(i, 2 + i, '#8d93a6'); px(0, 2 + i, '#5d6378'); px(i, 2, '#5d6378'); }
    if (r.chance(0.6)) { const x = r.int(5, 12); rect(x, 10, 2, 3, TC.glass); px(x, 10, '#9fb4bf'); }
    rect(0, 15, 16, 1, TC.floorLine);
  });
};

// Planks nailed across a closed-off section, with dark gaps between them.
const boards = () => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, '#0b0a09');
  const tones = ['#5a4130', '#4a3626', '#634733', '#523b2b'];
  for (let i = 0; i < 4; i++) { rect(i * 4, 0, 3, 16, tones[i]); rect(i * 4, 0, 1, 16, '#3c2b20'); px(i * 4 + 1, 5 + i * 2, '#7a5a40'); }
  rect(0, 4, 16, 2, '#6e5038'); rect(0, 11, 16, 2, '#6e5038');
  rect(0, 6, 16, 1, '#2a1e16'); rect(0, 13, 16, 1, '#2a1e16');
  for (const x of [1, 6, 9, 14]) { px(x, 4, NAIL); px(x, 11, NAIL); }
});

// The floor behind the boards: dust sheets over furniture, stacked boxes, nothing at all.
const junkGround = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#0f0d0b');
    for (let y = 0; y < 16; y += 4) rect(0, y + 3, 16, 1, '#090807');
    for (let i = 0; i < 8; i++) px(r.int(0, 15), r.int(0, 15), r.chance(0.5) ? '#1d1915' : '#090807');
  });
};
// Mostly bare floor: the odd sheet or stack, picked by an uneven hash so it never reads as a grid.
const EMPTY = bakePainter(() => {});
const junkArt = [
  EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
  bakePainter(({ px, rect }) => {           // a dust sheet over something tall
    rect(3, 3, 10, 12, SHEET_DK); rect(4, 2, 8, 12, SHEET); rect(4, 2, 8, 1, '#70768a');
    rect(6, 5, 1, 9, SHEET_DK); rect(10, 6, 1, 8, SHEET_DK); px(3, 15, SHEET_DK); px(12, 15, SHEET_DK);
  }),
  bakePainter(({ rect }) => {               // boxes
    rect(2, 7, 7, 8, '#4a3626'); rect(2, 7, 7, 1, '#634733'); rect(5, 7, 1, 8, '#3c2b20');
    rect(8, 3, 6, 6, '#523b2b'); rect(8, 3, 6, 1, '#6e5038'); rect(10, 3, 2, 6, '#3c2b20');
    rect(9, 9, 6, 6, '#4a3626'); rect(9, 9, 6, 1, '#634733');
  }),
  bakePainter(({ px, rect }) => {           // a sheet over a low cabinet
    rect(2, 7, 12, 8, SHEET_DK); rect(2, 6, 12, 7, SHEET); rect(2, 6, 12, 1, '#70768a');
    rect(5, 8, 1, 5, SHEET_DK); rect(9, 7, 1, 6, SHEET_DK); px(2, 14, '#0b0a09'); px(13, 14, '#0b0a09');
  }),
  EMPTY, EMPTY,
];

const brokenCase = () => bakePainter(({ px, rect }) => {
  rect(1, 4, 14, 11, TC.woodDark);
  rect(2, 5, 12, 6, '#121a1e');
  // shattered glass: a hole and cracks running out of it
  rect(2, 5, 5, 1, TC.glass); rect(10, 5, 4, 1, TC.glass);
  for (const [x, y] of [[7, 6], [8, 7], [7, 8], [9, 8], [10, 9], [6, 9], [5, 10]]) px(x, y, '#9fb4bf');
  rect(1, 11, 14, 3, TC.wood); rect(9, 11, 6, 1, '#3c2b20');
  rect(1, 14, 14, 1, TC.iron);
  px(3, 15, '#9fb4bf'); px(12, 15, '#9fb4bf'); px(13, 14, '#9fb4bf');
});

const junkPile = () => bakePainter(({ px, rect }) => {
  rect(1, 9, 14, 6, '#2a241f');
  rect(2, 6, 6, 6, '#4a3626'); rect(2, 6, 6, 1, '#634733');
  rect(8, 8, 6, 2, TC.paper); rect(9, 10, 5, 1, '#b8b0a0'); px(10, 8, '#8d93a6');
  rect(6, 11, 3, 3, '#3b4052'); px(12, 12, TC.glass); px(4, 13, TC.rugGold);
  rect(1, 15, 14, 1, '#0b0a09');
});

const bareLamp = () => bakePainter(({ px, rect }) => {
  rect(5, 13, 6, 2, '#4a3626'); rect(5, 15, 6, 1, TC.iron);   // an upturned crate
  rect(7, 4, 1, 9, TC.iron); rect(8, 3, 1, 1, TC.iron);
  rect(8, 4, 3, 3, TC.amberDim); px(9, 5, TC.amber); px(9, 4, '#f6d48a');
  px(6, 12, '#5d6378'); px(5, 11, '#5d6378');
});

const estimate = () => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, TC.wallFace); rect(0, 0, 16, 2, TC.wallTop);
  rect(0, 10, 16, 1, TC.wallTrim); rect(0, 11, 16, 5, TC.wainscot);
  // a clipboard on a nail: the contractor's estimate
  rect(4, 3, 8, 10, '#6a4a36'); rect(5, 5, 6, 7, TC.paper);
  rect(6, 2, 4, 2, '#8d93a6'); px(7, 2, TC.iron);
  for (const y of [6, 8, 10]) rect(6, y, 4, 1, '#8a8274');
  px(9, 10, TC.amber); px(10, 10, TC.amber);
  rect(0, 15, 16, 1, TC.floorLine);
});

export function buildGrowthTiles(ts) {
  const junkGrounds = [junkGround(5), junkGround(9), junkGround(13), junkGround(17)];
  Object.assign(ts.defs, {
    'P': { solid: true, prop: boards(), interact: 'boards' },
    'j': { solid: true, ground: junkGrounds, art: junkArt, scatter: true },
    'x': { solid: true, prop: brokenCase(), interact: 'broken' },
    'v': { solid: false, ground: crackedFloor(29) },
    'g': { solid: true, prop: junkPile() },
    's': { solid: true, wall: true, shelf: true, shelfArt: [dustyShelf(4), dustyShelf(7), dustyShelf(12)] },
    'l': { solid: true, prop: bareLamp(), light: 36, flicker: true },
    'N': { solid: true, inWall: true, prop: estimate(), interact: 'renovate' },
  });
  ts.looks = {
    grime: { floors: [grimeFloor(11), grimeFloor(23), grimeFloor(37), grimeFloor(41)], wallFace: peelFace(3), wallFaces: [peelFace(3), peelFace(8), peelFace(15)] },
    worn: { wallFace: peelFace(3), wallFaces: [peelFace(3), peelFace(8), peelFace(15), ts.wallFace, ts.wallFace] },
    clean: {},
  };
  return ts;
}

// The tileset as one stage of the shop sees it: grimy floors and peeling walls early on.
export function tierTileset(ts, look) {
  return look && ts.looks?.[look] ? { ...ts, ...ts.looks[look] } : ts;
}

// ---- The Gathering Hub (Phase 20): a corner bar, checker floor, green walls, brass ----

const BAR = {
  check1: '#2b1d1f', check2: '#1d1517', seam: '#140e10',
  paper: '#1f2c27', stripe: '#19241f', brass: '#8a6a3a', brassL: '#c49a52',
  leather: '#6e2a2e', leatherD: '#4a1a1e', leatherL: '#8e3a3a',
  mirror: '#23303a', mirrorL: '#3a4c58',
  bottles: ['#7a4a1e', '#3e6a3a', '#9fb4bf', '#a8742e', '#5a2a3a', '#c9b98f'],
};

const barFloor = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    for (let y = 0; y < 16; y += 8) for (let x = 0; x < 16; x += 8) rect(x, y, 8, 8, ((x + y) / 8) % 2 ? BAR.check2 : BAR.check1);
    rect(0, 15, 16, 1, BAR.seam); rect(15, 0, 1, 16, BAR.seam);
    for (let i = 0; i < 5; i++) px(r.int(0, 15), r.int(0, 15), BAR.seam);
  });
};
const barWall = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, BAR.paper);
  rect(0, 0, 16, 2, TC.wallTop);
  for (let x = seed % 3; x < 16; x += 3) rect(x, 2, 1, 8, BAR.stripe);
  rect(0, 9, 16, 1, BAR.brass); px(seed % 16, 9, BAR.brassL);
  rect(0, 10, 16, 5, TC.woodDark); rect(0, 12, 16, 1, TC.wood);
  rect(0, 15, 16, 1, TC.floorLine);
});
const bottleShelf = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, BAR.mirror);
    rect(0, 0, 16, 2, TC.wallTop);
    px(r.int(2, 13), 3, BAR.mirrorL); px(r.int(2, 13), 9, BAR.mirrorL);
    for (const base of [8, 14]) {
      rect(0, base, 16, 1, BAR.brass);
      let x = 1;
      while (x < 14) {
        const col = r.pick(BAR.bottles), h = r.int(3, 5);
        rect(x, base - h, 2, h, col);
        px(x, base - h - 1, TC.iron);
        px(x, base - h + 1, '#ffffff40');
        x += r.int(2, 4);
      }
    }
    rect(0, 15, 16, 1, TC.floorLine);
  });
};
const barCounter = glass => bakePainter(({ px, rect }) => {
  rect(0, 1, 16, 6, '#3a2418'); rect(0, 1, 16, 1, '#5a3a26'); rect(0, 6, 16, 1, '#24160e');
  px(3, 2, '#6e4a30'); px(11, 4, '#6e4a30');
  rect(0, 7, 16, 8, TC.woodDark);
  for (let x = 2; x < 16; x += 6) rect(x, 8, 3, 6, '#2c1f16');
  rect(0, 13, 16, 1, BAR.brass); px(5, 13, BAR.brassL); px(13, 13, BAR.brassL);
  rect(0, 15, 16, 1, TC.iron);
  if (glass === 'glass') { rect(6, 1, 3, 4, '#9fb4bf80'); rect(6, 3, 3, 2, '#a8742e'); px(6, 1, '#ffffff'); }
  if (glass === 'tap') { rect(9, 0, 2, 4, BAR.brassL); rect(8, 0, 4, 1, BAR.brass); px(10, 4, BAR.brass); }
});
const stool = () => bakePainter(({ px, rect }) => {
  rect(7, 9, 2, 5, BAR.brass); rect(5, 14, 6, 1, BAR.brass);
  rect(4, 5, 8, 4, BAR.leather); rect(5, 4, 6, 1, BAR.leatherL); rect(4, 8, 8, 1, BAR.leatherD);
  px(5, 5, BAR.leatherL);
});
const barTable = () => bakePainter(({ px, rect }) => {
  rect(7, 11, 2, 3, TC.iron); rect(5, 14, 6, 1, TC.iron);
  rect(2, 4, 12, 7, '#3a2418'); rect(3, 3, 10, 1, '#3a2418'); rect(3, 11, 10, 1, '#24160e');
  rect(3, 4, 10, 1, '#5a3a26');
  rect(7, 5, 2, 3, '#d8d0bc'); px(7, 4, TC.amber); px(8, 4, '#f6d48a');
});
const booth = () => bakePainter(({ rect }) => {
  rect(0, 2, 16, 12, BAR.leatherD); rect(0, 3, 16, 9, BAR.leather);
  for (let x = 2; x < 16; x += 4) rect(x, 4, 1, 7, BAR.leatherD);
  rect(0, 3, 16, 1, BAR.leatherL); rect(0, 14, 16, 1, TC.iron);
});
const piano = side => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, '#17110e');
  rect(0, 1, 16, 7, '#24170f'); rect(0, 1, 16, 1, '#3a2418');
  rect(0, 8, 16, 3, '#ece4d2');
  for (let x = side === 'L' ? 1 : 0; x < 16; x += 2) { if ((x + (side === 'L' ? 0 : 1)) % 7 !== 3) rect(x, 8, 1, 2, '#0c0a0a'); }
  rect(0, 11, 16, 4, '#24170f'); rect(0, 15, 16, 1, TC.iron);
  if (side === 'L') { rect(4, 3, 6, 4, TC.paper); for (const y of [4, 5]) rect(5, y, 4, 1, '#8a8274'); }
  else { rect(9, 2, 3, 2, '#d8d0bc'); px(10, 1, TC.amber); px(10, 0, '#f6d48a'); }
});
const barDoor = side => bakePainter(({ rect, px }) => {
  rect(0, 0, 16, 16, TC.wallTop);
  rect(side === 'L' ? 2 : 0, 0, 14, 16, '#3a1e1a');
  rect(side === 'L' ? 3 : 0, 2, 12, 8, '#1c2a30');
  rect(side === 'L' ? 4 : 1, 3, 3, 1, TC.glass);
  px(side === 'L' ? 9 : 6, 6, TC.amber); px(side === 'L' ? 10 : 7, 6, TC.amber);
  rect(side === 'L' ? 14 : 1, 11, 1, 2, BAR.brassL);
});

export function buildBarTiles(ts) {
  Object.assign(ts.defs, {
    'H': { solid: true, wall: true, shelf: true, shelfArt: [bottleShelf(2), bottleShelf(5), bottleShelf(9), bottleShelf(13)] },
    'A': { solid: true, prop: barCounter(''), interact: 'barkeep' },
    'a': { solid: true, prop: barCounter('glass'), interact: 'barkeep' },
    'I': { solid: true, prop: barCounter('tap'), interact: 'barkeep' },
    'i': { solid: true, prop: stool() },
    't': { solid: true, prop: barTable(), light: 22 },
    'k': { solid: true, prop: booth() },
    'Y': { solid: true, prop: piano('L'), interact: 'piano' },
    'y': { solid: true, prop: piano('R'), interact: 'piano', light: 18 },
    'M': { solid: true, prop: barDoor('L'), interact: 'barDoor' },
    'm': { solid: true, prop: barDoor('R'), interact: 'barDoor' },
  });
  ts.looks = { ...(ts.looks ?? {}), bar: { floors: [barFloor(3), barFloor(7), barFloor(11)], wallFace: barWall(1), wallFaces: [barWall(1), barWall(2), barWall(4)] } };
  return ts;
}

// ---- Phase 21: the diner, the Bijou, the thrift store, the chapel, the library ----

const checker = (a, b, seam, seed) => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    for (let y = 0; y < 16; y += 8) for (let x = 0; x < 16; x += 8) rect(x, y, 8, 8, ((x + y) / 8) % 2 ? b : a);
    for (let i = 0; i < 4; i++) px(r.int(0, 15), r.int(0, 15), seam);
  });
};
const carpet = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#4a1a24');
    for (const [x, y] of [[3, 3], [11, 11], [11, 3], [3, 11]]) { px(x, y, '#8a6a3a'); px(x + 1, y, '#6a2a34'); px(x, y + 1, '#6a2a34'); }
    px(7, 7, '#8a6a3a'); px(8, 8, '#8a6a3a');
    for (let i = 0; i < 5; i++) px(r.int(0, 15), r.int(0, 15), '#3a141c');
  });
};
const flagstone = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#3a3a3e');
    rect(0, 7, 16, 1, '#2a2a2e'); rect(0, 15, 16, 1, '#2a2a2e'); rect(r.int(3, 12), 0, 1, 7, '#2a2a2e'); rect(r.int(3, 12), 8, 1, 7, '#2a2a2e');
    for (let i = 0; i < 6; i++) px(r.int(0, 15), r.int(0, 15), r.chance(0.5) ? '#46464a' : '#323236');
  });
};
const parquet = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#4a3424');
    for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) { rect(x, y, 4, 4, '#3e2a1c'); rect(x, y, 4, 1, '#56402c'); }
    rect(0, 15, 16, 1, '#2c1f16');
    for (let i = 0; i < 4; i++) px(r.int(0, 15), r.int(0, 15), '#2c1f16');
  });
};
const tiledWall = (base, line, trim, seed) => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, base);
  rect(0, 0, 16, 2, TC.wallTop);
  for (let y = 2; y < 10; y += 4) rect(0, y, 16, 1, line);
  for (let x = seed % 4; x < 16; x += 4) rect(x, 2, 1, 8, line);
  rect(0, 10, 16, 1, trim); rect(0, 11, 16, 4, shadeHex(base, 0.7)); rect(0, 15, 16, 1, TC.floorLine);
});
const stoneWall = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#4a4a4e'); rect(0, 0, 16, 2, TC.wallTop);
    for (let y = 5; y < 16; y += 4) rect(0, y, 16, 1, '#38383c');
    for (let y = 2; y < 16; y += 4) rect((y / 4 % 2 ? 4 : 10) + r.int(-1, 1), y, 1, 3, '#38383c');
    rect(0, 15, 16, 1, TC.floorLine);
  });
};
const panelWall = () => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, '#2a1e16'); rect(0, 0, 16, 2, TC.wallTop);
  rect(2, 3, 12, 6, '#33251b'); rect(2, 3, 12, 1, '#3e2c20');
  rect(0, 10, 16, 1, '#8a6a3a'); rect(0, 11, 16, 4, '#24190f'); rect(0, 15, 16, 1, TC.floorLine);
});
function shadeHex(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

const posters = (seed, base) => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, base); rect(0, 0, 16, 2, TC.wallTop);
    rect(3, 3, 10, 11, TC.iron); rect(4, 4, 8, 9, r.pick(['#6e2e3e', '#24474a', '#7a6230', '#3a3a5a']));
    rect(5, 5, 6, 4, r.pick(['#d8d0bc', '#c9b98f', '#9fb4bf'])); rect(5, 10, 6, 1, TC.amber); px(r.int(5, 10), r.int(5, 8), TC.iron);
    rect(0, 15, 16, 1, TC.floorLine);
  });
};
const stained = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#4a4a4e'); rect(0, 0, 16, 2, TC.wallTop);
    rect(4, 2, 8, 13, TC.iron); rect(5, 4, 6, 10, '#2e4a74'); rect(6, 3, 4, 1, '#2e4a74');
    for (let i = 0; i < 6; i++) rect(5 + r.int(0, 4), 4 + r.int(0, 8), 2, 2, r.pick(['#7a3a5e', '#c9a24a', '#3a7a5e', '#8a3a2a']));
    rect(7, 4, 1, 10, TC.iron); rect(5, 9, 6, 1, TC.iron);
    rect(0, 15, 16, 1, TC.floorLine);
  });
};
const bookWall = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#24190f'); rect(0, 0, 16, 2, TC.wallTop);
    for (const base of [8, 14]) {
      rect(0, base, 16, 1, '#5a4130');
      let x = 0;
      while (x < 16) { const w = r.int(1, 2), h = r.int(4, 5); rect(x, base - h, w, h, r.pick(['#6e2e3e', '#24474a', '#5a4a3a', '#3a3a5a', '#7a6230', '#4a1f24', '#c9b98f'])); x += w + (r.chance(0.15) ? 1 : 0); }
    }
    rect(0, 15, 16, 1, TC.floorLine);
  });
};

const jukebox = () => bakePainter(({ px, rect }) => {
  rect(2, 1, 12, 14, '#2a1e16'); rect(3, 0, 10, 2, '#2a1e16');
  rect(3, 2, 10, 6, '#c9a24a'); rect(4, 3, 8, 4, '#6e2e3e'); for (let x = 4; x < 12; x += 2) px(x, 4, '#f6d48a');
  rect(4, 9, 8, 4, '#24474a'); for (let x = 5; x < 11; x += 2) rect(x, 10, 1, 2, '#9fd0d0');
  rect(2, 14, 12, 1, TC.iron);
});
const screen = () => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, '#14161d'); rect(0, 1, 16, 1, '#6e2e3e');
  rect(0, 3, 16, 11, '#b8c4cc'); rect(0, 3, 16, 1, '#d8e0e6'); rect(0, 13, 16, 1, '#8a96a0');
  rect(0, 14, 16, 2, '#4a1a24');
});
const seats = () => bakePainter(({ rect }) => {
  rect(0, 3, 16, 10, '#2a0e14');
  for (let x = 0; x < 16; x += 4) { rect(x, 4, 3, 7, '#7a2030'); rect(x, 4, 3, 1, '#9a3040'); rect(x, 10, 3, 1, '#4a1018'); }
  rect(0, 13, 16, 1, TC.iron);
});
const rack = seed => {
  const r = new RNG(seed);
  return bakePainter(({ rect }) => {
    rect(0, 2, 16, 1, '#8d93a6'); rect(1, 2, 1, 13, '#8d93a6'); rect(14, 2, 1, 13, '#8d93a6');
    for (let x = 1; x < 15; x += 2) rect(x, 3, 2, r.int(7, 10), r.pick(['#6a3a5e', '#24474a', '#7a6230', '#4a1f24', '#3a4a3e', '#c9b98f', '#5a5f6e']));
    rect(0, 14, 16, 1, TC.iron);
  });
};
const bin = () => bakePainter(({ px, rect }) => {
  rect(1, 4, 14, 11, '#3c2b20'); rect(1, 4, 14, 1, '#5a4130');
  rect(3, 5, 4, 3, '#6a3a5e'); rect(7, 6, 3, 2, '#c9b98f'); rect(10, 5, 3, 3, '#24474a'); px(5, 7, TC.amber); px(12, 6, '#9fb4bf');
  rect(1, 10, 14, 1, '#2c1f16'); rect(1, 14, 14, 1, TC.iron);
});
const pew = () => bakePainter(({ rect }) => {
  rect(0, 3, 16, 3, '#4a3020'); rect(0, 3, 16, 1, '#6a4a30');
  rect(0, 7, 16, 5, '#5a3a26'); rect(0, 7, 16, 1, '#7a5a3a'); rect(0, 12, 16, 1, '#2c1c12');
  rect(0, 13, 16, 1, TC.iron);
});
const candles = () => bakePainter(({ px, rect }) => {
  rect(2, 8, 12, 7, TC.iron); rect(3, 8, 10, 1, '#4a4a4e');
  for (const [x, h] of [[3, 3], [5, 4], [7, 2], [9, 4], [11, 3]]) { rect(x, 8 - h, 1, h, '#d8d0bc'); px(x, 7 - h, TC.amber); px(x, 6 - h, '#f6d48a'); }
});
const altar = (cap) => bakePainter(({ rect, px }) => {
  rect(0, 4, 16, 11, '#5c5c62'); rect(0, 4, 16, 2, '#d8d0bc'); rect(0, 6, 16, 4, '#d8d0bc');
  rect(0, 10, 16, 1, '#c9a24a'); rect(0, 14, 16, 1, TC.iron);
  if (cap === 'L') { rect(4, 1, 1, 4, '#c9a24a'); px(4, 0, '#f6d48a'); }
  if (cap === 'R') { rect(11, 1, 1, 4, '#c9a24a'); px(11, 0, '#f6d48a'); }
});
const bookcase = seed => {
  const r = new RNG(seed);
  return bakePainter(({ rect }) => {
    rect(0, 2, 16, 13, '#2a1e16'); rect(0, 2, 16, 1, '#4a3424');
    for (const base of [8, 13]) { let x = 1; while (x < 15) { const w = r.int(1, 2); rect(x, base - r.int(3, 4), w, 4, r.pick(['#6e2e3e', '#24474a', '#5a4a3a', '#3a3a5a', '#7a6230', '#c9b98f'])); x += w; } }
    rect(0, 14, 16, 1, TC.iron);
  });
};
const catalog = () => bakePainter(({ px, rect }) => {
  rect(1, 2, 14, 13, '#4a3424'); rect(1, 2, 14, 1, '#6a4a30');
  for (let y = 4; y < 13; y += 3) for (let x = 2; x < 14; x += 4) { rect(x, y, 3, 2, '#3a281a'); px(x + 1, y + 1, '#c9a24a'); }
  rect(1, 14, 14, 1, TC.iron);
});
const circDesk = side => bakePainter(({ px, rect }) => {
  rect(0, 2, 16, 4, '#5a4130'); rect(0, 2, 16, 1, '#7a5a40'); rect(0, 6, 16, 8, '#3c2b20');
  rect(0, 13, 16, 1, '#8a6a3a'); rect(0, 14, 16, 1, TC.iron);
  if (side === 'L') { rect(3, 0, 6, 4, '#d8d0bc'); rect(4, 1, 4, 1, '#8a8274'); }
  else { rect(4, 0, 3, 3, '#c9a24a'); px(5, 0, '#f6d48a'); rect(9, 3, 5, 2, '#6e2e3e'); }
});

export function buildPlaceTiles(ts) {
  Object.assign(ts.defs, {
    'J': { solid: true, prop: jukebox(), interact: 'jukebox', light: 20 },
    '$': { solid: true, wall: true, shelf: true, shelfArt: [posters(3, '#3a1820'), posters(8, '#3a1820'), posters(15, '#3a1820'), posters(22, '#3a1820')] },
    '^': { solid: true, inWall: true, prop: screen(), light: 30 },
    '~': { solid: true, prop: seats(), interact: 'seats' },
    '%': { solid: true, prop: rack(5) },
    '&': { solid: true, prop: bin(), interact: 'bins' },
    '-': { solid: true, prop: pew() },
    '*': { solid: true, prop: candles(), interact: 'candles', light: 30, flicker: true },
    '|': { solid: true, prop: altar('') },
    '!': { solid: true, wall: true, shelf: true, shelfArt: [stained(2), stained(6), stained(11)] },
    '{': { solid: true, wall: true, shelf: true, shelfArt: [bookWall(3), bookWall(7), bookWall(12), bookWall(19)] },
    '@': { solid: true, prop: bookcase(4) },
    ';': { solid: true, prop: catalog(), interact: 'catalog' },
    'C': { solid: true, prop: circDesk('L'), interact: 'circ' },
    'h': { solid: true, prop: circDesk('R'), interact: 'circ', light: 24 },
  });
  ts.looks = {
    ...(ts.looks ?? {}),
    diner: { floors: [checker('#8a8478', '#1c1a1e', '#6a6458', 3), checker('#8a8478', '#1c1a1e', '#6a6458', 9)], wallFace: tiledWall('#24474a', '#1c3a3c', '#9fb4bf', 1), wallFaces: [tiledWall('#24474a', '#1c3a3c', '#9fb4bf', 1), tiledWall('#24474a', '#1c3a3c', '#9fb4bf', 3)] },
    bijou: { floors: [carpet(2), carpet(5)], wallFace: tiledWall('#3a1820', '#2c1018', '#c9a24a', 2), wallFaces: [tiledWall('#3a1820', '#2c1018', '#c9a24a', 2)] },
    thrift: { wallFace: tiledWall('#3a3042', '#2e2636', '#6a3a5e', 1), wallFaces: [tiledWall('#3a3042', '#2e2636', '#6a3a5e', 1), tiledWall('#3a3042', '#2e2636', '#6a3a5e', 2)] },
    chapel: { floors: [flagstone(3), flagstone(7), flagstone(13)], wallFace: stoneWall(1), wallFaces: [stoneWall(1), stoneWall(5), stoneWall(9)] },
    library: { floors: [parquet(1), parquet(4)], wallFace: panelWall(), wallFaces: [panelWall()] },
  };
  return ts;
}


// ---- Your apartment (Phase 27): two rooms above a dry cleaner ----

const HOME = { floor: '#5a3e2a', floorD: '#4a3222', floorL: '#6a4a32', paper: '#3e4a3a', paperD: '#33402f', trim: '#7a5a40',
  quilt: '#7a3a34', quiltL: '#9a4a40', quiltD: '#5a2a26', sheet: '#d8d0bc', pillow: '#efe8d8', wood: '#5a3a26', woodD: '#3a2418', woodL: '#7a5a40' };
const homeFloor = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, HOME.floor);
    for (let y = 0; y < 16; y += 4) { rect(0, y + 3, 16, 1, HOME.floorD); const seam = (y / 4 + seed) % 2 ? 6 : 12; rect(seam, y, 1, 3, HOME.floorD); }
    for (let i = 0; i < 6; i++) px(r.int(0, 15), r.int(0, 15), r.chance(0.5) ? HOME.floorL : HOME.floorD);
  });
};
const homeWall = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, HOME.paper); rect(0, 0, 16, 2, TC.wallTop);
  for (let x = seed % 4; x < 16; x += 4) for (let y = 3; y < 10; y += 3) px(x, y, '#56664e');
  rect(0, 10, 16, 1, HOME.trim); rect(0, 11, 16, 4, HOME.woodD); rect(0, 12, 16, 1, HOME.wood); rect(0, 15, 16, 1, TC.floorLine);
});
// Things hung on the wall (drawn over the wallpaper, so they read as part of the wall).
const onWall = draw => bakePainter(api => { const { rect, px } = api;
  rect(0, 0, 16, 16, HOME.paper); rect(0, 0, 16, 2, TC.wallTop);
  rect(0, 10, 16, 1, HOME.trim); rect(0, 11, 16, 4, HOME.woodD); rect(0, 12, 16, 1, HOME.wood); rect(0, 15, 16, 1, TC.floorLine);
  draw(rect, px); });
const homePhoto = onWall((rect, px) => { rect(4, 3, 8, 6, '#2a1c14'); rect(5, 4, 6, 4, '#c9b98f'); rect(6, 5, 2, 3, '#5a4a3a'); rect(8, 5, 2, 3, '#7a3a34'); px(6, 4, '#5a4a3a'); px(9, 4, '#3a2a1e'); });
const homeWindow = onWall((rect, px) => { rect(3, 2, 10, 8, HOME.wood); rect(4, 3, 8, 6, '#1c2a38'); rect(4, 3, 8, 2, '#2a3c50'); rect(7, 3, 1, 6, HOME.wood); rect(4, 6, 8, 1, HOME.wood); px(5, 4, '#9fb4bf'); px(10, 7, '#e0a64a'); rect(2, 9, 12, 1, HOME.woodL); });
const homeBoard = onWall((rect, px) => { rect(3, 2, 10, 8, '#8a6a3a'); rect(4, 3, 8, 6, '#b08a5a'); rect(5, 4, 3, 2, '#efe8d8'); rect(8, 5, 3, 3, '#c9b98f'); px(6, 4, '#b2463f'); px(9, 5, '#3d63b5'); rect(5, 7, 2, 1, '#efe8d8'); });
const homeCounter = stove => onWall((rect, px) => {
  rect(0, 4, 16, 2, '#cfc8bc'); rect(0, 6, 16, 9, '#e8e0cc'); rect(0, 6, 16, 1, '#b8b0a0'); rect(0, 14, 16, 1, '#8a8478');
  for (const x of [3, 11]) rect(x, 9, 2, 1, '#8a8478');
  if (stove) { rect(2, 3, 12, 3, '#3a3a3e'); for (const x of [3, 9]) { rect(x, 3, 4, 2, '#16181e'); px(x + 1, 3, '#b2463f'); } rect(5, 0, 6, 3, '#6f7686'); rect(6, 1, 4, 1, '#9fb4bf'); }
  else { rect(2, 4, 6, 2, '#6f7686'); rect(3, 4, 4, 1, '#454b58'); rect(10, 1, 3, 3, '#efe8d8'); rect(11, 2, 1, 1, '#7a3a34'); }
});
const homeRadio = onWall((rect, px) => { rect(1, 6, 14, 2, HOME.woodL); rect(3, 1, 10, 6, HOME.wood); rect(4, 2, 4, 4, HOME.woodD); rect(9, 2, 3, 2, '#e0a64a'); px(9, 5, '#cfc8bc'); px(11, 5, '#cfc8bc'); rect(1, 8, 14, 1, HOME.woodD); });
const homeBed = head => bakePainter(({ rect, px }) => {
  rect(1, 0, 14, 16, HOME.woodD);
  if (head) { rect(1, 0, 14, 3, HOME.wood); rect(2, 3, 12, 13, HOME.sheet); rect(3, 4, 10, 5, HOME.pillow); rect(3, 8, 10, 1, '#c9c0a8'); rect(2, 11, 12, 5, HOME.quilt); rect(2, 11, 12, 1, HOME.quiltL); px(4, 13, HOME.quiltD); px(9, 14, HOME.quiltD); }
  else { rect(2, 0, 12, 13, HOME.quilt); for (let y = 2; y < 13; y += 4) rect(2, y, 12, 1, HOME.quiltD); for (let x = 5; x < 14; x += 4) rect(x, 0, 1, 13, HOME.quiltD); rect(1, 13, 14, 3, HOME.wood); rect(1, 15, 14, 1, TC.iron); }
});
const homeDoor = side => bakePainter(({ rect }) => {
  rect(0, 0, 16, 16, TC.wallTop);
  rect(side === 'L' ? 2 : 0, 0, 14, 16, HOME.woodD);
  rect(side === 'L' ? 3 : 0, 2, 12, 12, HOME.wood);
  rect(side === 'L' ? 5 : 2, 4, 8, 4, HOME.woodD);
  rect(side === 'L' ? 13 : 2, 9, 1, 2, TC.amber);
});
const wardrobe = () => ({
  prop: bakePainter(({ rect, px }) => { rect(1, 0, 14, 15, HOME.woodD); rect(2, 0, 12, 14, HOME.wood); rect(7, 0, 2, 14, HOME.woodD); px(6, 6, TC.amber); px(9, 6, TC.amber); rect(1, 14, 14, 1, TC.iron); rect(2, 15, 12, 1, 'rgba(0,0,0,0.35)'); }),
  over: { img: (() => { const cv = makeCanvas(16, 16), g = cv.getContext('2d'); const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    R(1, 4, 14, 12, HOME.woodD); R(2, 5, 12, 11, HOME.wood); R(0, 3, 16, 2, HOME.woodL); R(7, 5, 2, 11, HOME.woodD); R(3, 7, 3, 6, '#6a4a32'); R(10, 7, 3, 6, '#6a4a32'); return cv; })(), dx: 0, dy: -12 },
});

export function buildHomeTiles(ts) {
  const w = wardrobe();
  Object.assign(ts.defs, {
    '[': { solid: true, prop: homeBed(true), interact: 'bed' },
    ']': { solid: true, prop: homeBed(false), interact: 'bed' },
    '(': { solid: true, prop: w.prop, over: w.over, interact: 'wardrobe' },
    '=': { solid: true, wall: true, shelf: true, shelfArt: [homeCounter(false)], interact: 'kitchen' },
    '+': { solid: true, wall: true, shelf: true, shelfArt: [homeCounter(true)], interact: 'kitchen' },
    ',': { solid: true, wall: true, shelf: true, shelfArt: [homeRadio], interact: 'radio' },
    '"': { solid: true, wall: true, shelf: true, shelfArt: [homePhoto], interact: 'photo' },
    '/': { solid: true, wall: true, shelf: true, shelfArt: [homeWindow], interact: 'window', light: 26 },
    ':': { solid: true, wall: true, shelf: true, shelfArt: [homeBoard], interact: 'homeBoard' },
    '<': { solid: true, inWall: true, prop: homeDoor('L'), interact: 'homeDoor' },
    '>': { solid: true, inWall: true, prop: homeDoor('R'), interact: 'homeDoor' },
  });
  ts.looks = { ...(ts.looks ?? {}), apartment: { floors: [homeFloor(1), homeFloor(2), homeFloor(3)], wallFace: homeWall(1), wallFaces: [homeWall(1), homeWall(2), homeWall(3)] } };
  return ts;
}


// ---- Erin's Wandering Brush (Phase 28): a design studio ----

const studioFloor = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#8a7058');
    for (let y = 0; y < 16; y += 4) { rect(0, y + 3, 16, 1, '#76604a'); rect((y / 4 + seed) % 2 ? 4 : 11, y, 1, 3, '#76604a'); }
    for (let i = 0; i < 6; i++) px(r.int(0, 15), r.int(0, 15), r.chance(0.5) ? '#9a806a' : '#6e5844');
    if (seed % 3 === 0) { px(r.int(2, 13), r.int(2, 13), '#c95a8e'); px(r.int(2, 13), r.int(2, 13), '#3d63b5'); }   // paint drips
  });
};
const studioWall = seed => bakePainter(({ px, rect }) => {
  rect(0, 0, 16, 16, '#d8ccb4'); rect(0, 0, 16, 2, TC.wallTop);
  for (let x = seed % 5; x < 16; x += 5) rect(x, 3, 1, 6, '#ccc0a6');
  rect(0, 10, 16, 1, '#3a6a5a'); rect(0, 11, 16, 4, '#2e5448'); rect(0, 15, 16, 1, TC.floorLine);
});
const paintShelf = seed => {
  const r = new RNG(seed);
  return bakePainter(({ px, rect }) => {
    rect(0, 0, 16, 16, '#d8ccb4'); rect(0, 0, 16, 2, TC.wallTop);
    for (const base of [6, 12]) {
      rect(0, base, 16, 1, '#5a3a26');
      let x = 1; while (x < 14) { const c = r.pick(['#c95a8e', '#3d63b5', '#4e9a52', '#e0a64a', '#b2463f', '#efe8d8', '#3a6a5a']); rect(x, base - 4, 3, 4, '#9aa0ac'); rect(x, base - 3, 3, 2, c); px(x + 1, base - 4, '#6f7686'); x += 4; }
    }
    rect(0, 15, 16, 1, TC.floorLine);
  });
};
const easel = () => ({
  prop: bakePainter(({ rect }) => { rect(3, 4, 1, 12, '#7a5a40'); rect(12, 4, 1, 12, '#7a5a40'); rect(7, 6, 2, 10, '#5a3a26'); rect(2, 9, 12, 1, '#5a3a26'); rect(2, 14, 12, 2, 'rgba(0,0,0,0.3)'); }),
  over: { img: (() => { const cv = makeCanvas(16, 16), g = cv.getContext('2d'); const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    R(2, 3, 12, 11, '#efe8d8'); R(2, 3, 12, 1, '#c9c0a8'); R(3, 8, 10, 5, '#3a6a5a'); R(3, 6, 10, 2, '#9fb4bf'); R(9, 4, 3, 3, '#e0a64a'); R(4, 10, 3, 3, '#24474a'); R(7, 9, 2, 4, '#4e7a5a'); R(1, 14, 14, 1, '#5a3a26'); return cv; })(), dx: 0, dy: -8 },
});

export function buildStudioTiles(ts) {
  const e = easel();
  Object.assign(ts.defs, {
    'p': { solid: true, wall: true, shelf: true, shelfArt: [paintShelf(3), paintShelf(8), paintShelf(13)] },
    '`': { solid: true, prop: e.prop, over: e.over, interact: 'easel' },
  });
  ts.looks = { ...(ts.looks ?? {}), studio: { floors: [studioFloor(1), studioFloor(2), studioFloor(3)], wallFace: studioWall(1), wallFaces: [studioWall(1), studioWall(2), studioWall(4)] } };
  return ts;
}
