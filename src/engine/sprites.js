// 16x16 pixel art defined as character grids. Each character maps to a palette
// color; '.' is transparent. Sprites are baked once into small canvases.

export const PALETTE = {
  k: '#07080c', // outline
  h: '#23202a', // hat felt
  H: '#3a3542', // hat band / highlight
  s: '#c9a88a', // skin
  d: '#2a1e1a', // hair
  c: '#4a4f63', // coat
  C: '#343849', // coat shadow
  b: '#d8d0bc', // shirt
  a: '#e0a64a', // lamp amber
  A: '#8a5a22', // amber shadow
};

export function parseGrid(rows, size = 16) {
  if (rows.length !== size) throw new Error(`sprite needs ${size} rows, got ${rows.length}`);
  rows.forEach((r, i) => { if (r.length !== size) throw new Error(`row ${i} is ${r.length} wide: "${r}"`); });
  return rows;
}

export function bakeGrid(rows, palette = PALETTE, flip = false) {
  parseGrid(rows);
  const cv = makeCanvas(16, 16), g = cv.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[flip ? 15 - x : x];
      if (ch === '.') continue;
      const col = palette[ch];
      if (!col) throw new Error(`no palette color for "${ch}"`);
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
  });
  return cv;
}

// Procedural tiles: painted pixel by pixel from a seed, still pure 16x16 data.
export function bakePainter(paint) {
  const cv = makeCanvas(16, 16), g = cv.getContext('2d');
  const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x, y, 1, 1); };
  const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  paint({ px, rect });
  return cv;
}

export function makeCanvas(w, h) {
  if (globalThis.OffscreenCanvas) return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

// --- The appraiser: fedora and trench coat. Two walk frames per facing. ---

const LEGS = {
  down: ['...kkk....kkk...', '....kkk..kkk....'],
  side: ['....kkk..kkk....', '...kkk....kkk...'],
};

const BODY = {
  down: [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '..kkhHHHHHHhkk..',
    '.khhhhhhhhhhhhk.',
    '...kssssssssk...',
    '...kskssssksk...',
    '...kssssssssk...',
    '..kcccbbbbccck..',
    '.kccccbbbbcccck.',
    '.kcCcccbbcccCck.',
    '.kscCcccccccCsk.',
    '..kcCcccccccCk..',
    '..kcccckkcccck..',
  ],
  up: [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '..kkhHHHHHHhkk..',
    '.khhhhhhhhhhhhk.',
    '...kddddddddk...',
    '...kddddddddk...',
    '...kkddddddkk...',
    '..kcccccccccck..',
    '.kcccccccccccck.',
    '.kcCccccccccCck.',
    '.kscCcccccccCsk.',
    '..kcCcccccccCk..',
    '..kcccckkcccck..',
  ],
  side: [
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khHHHHHHhk...',
    '..khhhhhhhhhhhk.',
    '....kdssssssk...',
    '....kdssssksk...',
    '....kdsssssssk..',
    '....kccbbbcck...',
    '...kcccbbcccck..',
    '...kcCccccccck..',
    '...kcCcccsscck..',
    '...kcCccccccck..',
    '...kcccckcccck..',
  ],
};

export function bakePlayer(overrides = {}) {
  const blank = '................';
  const pal = { ...PALETTE, ...overrides };
  const make = (body, legs, flip) => bakeGrid([...body, legs, blank], pal, flip);
  return {
    down: LEGS.down.map(l => make(BODY.down, l)),
    up: LEGS.down.map(l => make(BODY.up, l)),
    right: LEGS.side.map(l => make(BODY.side, l)),
    left: LEGS.side.map(l => make(BODY.side, l, true)),
  };
}

export const PLAYER_GRIDS = { BODY, LEGS };

// Townsfolk: the same body with swapped felt, coat and skin.
export const CUSTOMER_LOOKS = [
  { h: '#4a2a2e', H: '#6a3a40', c: '#5a4a3a', C: '#463a2e', s: '#b88f70', d: '#1a1210' },
  { h: '#2e3a4a', H: '#4a5a6e', c: '#3a4a3e', C: '#2c3a30', s: '#d6b498', d: '#5a3a1a' },
  { h: '#3a3a3a', H: '#5a5a5a', c: '#6a5a72', C: '#54465c', s: '#8a6a52', d: '#0e0c0c' },
  { h: '#5a4a2a', H: '#7a6a3a', c: '#2e3442', C: '#22262f', s: '#e0c4aa', d: '#8a7a5a' },
  { h: '#1e2a2a', H: '#2e4040', c: '#7a3a34', C: '#5e2c28', s: '#a07a5e', d: '#2a1a12' },
  { h: '#3e2a4a', H: '#56406a', c: '#4a5a5a', C: '#384646', s: '#c9a88a', d: '#3a2a1a' },
  // Faction regulars: Faraday Circle, Halberd & Vane, the Night Shift, the Office
  { h: '#1e3a3a', H: '#5ed6c1', c: '#24474a', C: '#1a3436', s: '#c9a88a', d: '#1a1210' },
  { h: '#101114', H: '#8a6a3a', c: '#16181e', C: '#0e0f13', s: '#d6b498', d: '#0e0c0c' },
  { h: '#3a3a22', H: '#5a5a32', c: '#4a4a2c', C: '#383820', s: '#a07a5e', d: '#2a1a12' },
  { h: '#3a3e48', H: '#c9c2b0', c: '#5a5f6e', C: '#464a56', s: '#e0c4aa', d: '#3a2a1a' },
];
