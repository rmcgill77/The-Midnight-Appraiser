// Cryptids at the new scale (Phase 15). The original draws each one as a 16x16 line
// icon in a single color. Here that icon becomes a solid creature twice the size:
//   1. close any one-pixel gaps in the outline and fill the inside, so it has a body;
//   2. scale it up with Scale2x, which rounds the stair-steps instead of fattening them;
//   3. shade, outline and rim-light it the same way as the people (engine/figure-hd.js);
//   4. lines inside the icon stay as dark markings, and its smallest marks (the eyes)
//      glow in the color that says what it's doing: violet roaming, red hunting, grey stunned.

import { iconRects } from '../rules/index.js';
import { makeLayer, compose, hdCanvas, mix } from '../engine/figure-hd.js';
import { shade } from '../engine/figure.js';

export const CRYPTID_SIZE = 32;
export const CRYPTID_OFFSET = { x: -8, y: -16 };   // from the 16x16 cell it stood in before

const ramp = hex => [shade(hex, 0.42), shade(hex, 0.68), hex, shade(hex, 1.22)];

function maskOf(name) {
  const m = Array.from({ length: 16 }, () => Array(16).fill(false));
  for (const [x, y, w] of iconRects(name)) for (let i = 0; i < w; i++) if (y < 16 && x + i < 16) m[y][x + i] = true;
  return m;
}
const at = (m, x, y) => (y >= 0 && y < m.length && x >= 0 && x < m[0].length ? m[y][x] : false);
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Dilate, then erode: shuts one-pixel gaps without growing the shape.
function close(m) {
  const H = m.length, W = m[0].length;
  const dil = m.map((r, y) => r.map((v, x) => v || N4.some(([dx, dy]) => at(m, x + dx, y + dy))));
  return dil.map((r, y) => r.map((v, x) => v && N4.every(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx < 0 || ny < 0 || nx >= W || ny >= H ? m[y][x] : dil[ny][nx]; })));
}

function outsideOf(m) {
  const H = m.length, W = m[0].length, out = m.map(r => r.map(() => false)), q = [];
  for (let x = 0; x < W; x++) q.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) q.push([0, y], [W - 1, y]);
  while (q.length) {
    const [x, y] = q.pop();
    if (x < 0 || y < 0 || x >= W || y >= H || out[y][x] || m[y][x]) continue;
    out[y][x] = true;
    for (const [dx, dy] of N4) q.push([x + dx, y + dy]);
  }
  return out;
}

function scale2x(m) {
  const H = m.length, W = m[0].length, o = Array.from({ length: H * 2 }, () => Array(W * 2).fill(false));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const P = m[y][x], A = at(m, x, y - 1), B = at(m, x + 1, y), C = at(m, x - 1, y), D = at(m, x, y + 1);
    o[y * 2][x * 2] = C === A && C !== D && A !== B ? A : P;
    o[y * 2][x * 2 + 1] = A === B && A !== C && B !== D ? B : P;
    o[y * 2 + 1][x * 2] = D === C && D !== B && C !== A ? C : P;
    o[y * 2 + 1][x * 2 + 1] = B === D && B !== A && D !== C ? D : P;
  }
  return o;
}

// Groups of touching marks (corners count), for telling eyes (tiny) from markings (lines).
function groups(m) {
  const seen = m.map(r => r.map(() => false)), out = [];
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m[0].length; x++) {
    if (!m[y][x] || seen[y][x]) continue;
    const g = [], q = [[x, y]]; seen[y][x] = true;
    while (q.length) { const [a, b] = q.pop(); g.push([a, b]); for (const [dx, dy] of N8) if (at(m, a + dx, b + dy) && !seen[b + dy][a + dx]) { seen[b + dy][a + dx] = true; q.push([a + dx, b + dy]); } }
    out.push(g);
  }
  return out;
}

export const STATE_COLORS = { roam: '#b9a0ec', hunt: '#e07a70', stun: '#8d93a6' };

export function paintCryptid(name, state = 'roam') {
  const glow = STATE_COLORS[state] ?? STATE_COLORS.roam;
  const lines = maskOf(name);
  const solid16 = outsideOf(close(lines)).map(r => r.map(v => !v));
  const outside16 = solid16.map(r => r.map(v => !v));
  // Inner lines: icon strokes that don't touch the outside.
  const inner = lines.map((r, y) => r.map((v, x) => v && !N4.some(([dx, dy]) => at(outside16, x + dx, y + dy)) && !at(outside16, x, y)));
  // Eyes: a mark that stands alone, touching no other stroke at all (corners included).
  const marks = groups(lines).filter(g => g.every(([x, y]) => inner[y][x]));
  const eyes = new Set(), lineSet = new Set();
  const small = marks.filter(g => g.length <= 2).sort((a, b) => a[0][1] - b[0][1]).slice(0, 3);
  for (const g of marks) for (const [x, y] of g) (small.includes(g) ? eyes : lineSet).add(`${x},${y}`);
  // Inner lines that belong to the outline (a mouth, a seam) are markings too.
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (inner[y][x] && !eyes.has(`${x},${y}`)) lineSet.add(`${x},${y}`);
  // A body that's all outline (nothing inside to fill) keeps its strokes as the body.
  const solid = scale2x(solid16);
  const L = makeLayer(CRYPTID_SIZE, CRYPTID_SIZE);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (solid[y][x]) L.P(x, y, 'body');
  for (const k of lineSet) { const [x, y] = k.split(',').map(Number); L.P(x * 2, y * 2, 'mark'); L.P(x * 2 + 1, y * 2, 'mark'); L.P(x * 2, y * 2 + 1, 'mark'); L.P(x * 2 + 1, y * 2 + 1, 'mark'); }
  const bodyHex = mix(glow, '#1c1824', 0.32);
  const R = { body: ramp(bodyHex), mark: ramp(shade(bodyHex, 0.7)) };
  const eye = (ex, ey) => { L.O(ex, ey, '#fff6ee'); L.O(ex + 1, ey, glow); L.O(ex, ey + 1, glow); L.O(ex + 1, ey + 1, shade(glow, 0.7)); };
  for (const k of eyes) { const [x, y] = k.split(',').map(Number); eye(x * 2, y * 2); }
  // No eyes in the icon: give it a pair, a quarter of the way down its body, where it's wide enough.
  if (!eyes.size) {
    const ys = []; for (let y = 0; y < 32; y++) if (solid[y].some(Boolean)) ys.push(y);
    const top = ys[0], bot = ys[ys.length - 1];
    // Two eyes where it's wide enough; closer together where it's narrow; one, if it's thin.
    const tries = [[9, [-4, 2]], [7, [-3, 1]], [4, [-1]]];
    let done = false;
    for (const [minW, offs] of tries) {
      for (let y = top + Math.round((bot - top) * 0.22); y <= bot - 4 && !done; y++) {
        const xs = []; for (let x = 0; x < 32; x++) if (solid[y][x] && solid[y + 1][x]) xs.push(x);
        if (xs.length < minW) continue;
        const mid = Math.round((xs[0] + xs[xs.length - 1]) / 2);
        if (offs.every(o => [mid + o, mid + o + 1].every(x => solid[y][x] && solid[y + 1][x] && L.at(x, y) === 'body'))) { for (const o of offs) eye(mid + o, y); done = true; }
      }
      if (done) break;
    }
  }
  return compose(L, R, { band: 2, rim: true, outline: true });
}

const cache = new Map();
export function cryptidSprite(name, state) {
  const k = `${name}:${state}`;
  let c = cache.get(k);
  if (!c) { c = hdCanvas(paintCryptid(name, state)); cache.set(k, c); }
  return c;
}
