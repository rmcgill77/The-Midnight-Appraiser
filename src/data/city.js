// The city, laid out from Second Sight Pawn's own data: its six districts and fourteen
// locations keep the positions the original's map gave them (x, y in percent), and
// everything else is filled in deterministically, the same town for everyone.
//
// v2.3: a real town, not a grid. Streets wander: the long ones bend, cross streets jog
// where they meet them, some stop short at a T and leave a long block, and some blocks
// are cut by a footpath instead of a road. The river winds down from the north to the
// harbor, crossed by four bridges. The blocks are whatever shapes the streets leave, and
// each fills in its own district's way: rowhouses and shops downtown, houses with yards on
// the Westside, tight buildings and alleys in the Narrows, halls on lawns up in Kessler
// Heights, warehouses and lots down on Harbor Row. Along the bottom of town, the harbor:
// the waterfront road, the quay, a couple of jetties, and the boardwalk out to the beach.
//
// Legend: X hedge (edge of the map), = road, + crossing, , sidewalk, " grass,
// t tree, L street lamp, b bench, p parking, c car (v its front half), O location door,
// o house door, roofs a w k e n h (one per district), facades A W K E N H.
// v2.2: ~ water, u bridge, P square paving, F fountain, B bench on paving, T tree in a
// planter, f flower bed, i picket fence, y alley cobbles, z bins, x crates, q campus path,
// G the park gate. v2.3: d dock planks (the jetties and the boardwalk).
// Phase 21: buildings are in scale with people. A front is three tiles tall (FACADE),
// the door fills the bottom two, and a car takes two tiles. Every building faces south,
// onto the sidewalk below it.

import { RNG } from '../engine/rng.js';

// land: the rows the original's map is spread over (v2.5b: the dunes are below them, down to
// the bottom edge, where the boardwalk leaves town for the beach; no sea until you're there).
export const CITY = { W: 202, H: 134, land: 126 };
export const FACADE = 3;   // rows of wall between the roof and the sidewalk
// The park gate (columns of the top edge, at the top of Gate Street) and the boardwalk to
// the beach (columns of the bottom edge).
export const GATE = { x0: 127, x1: 128 };
export const BEACH = { x0: 150, x1: 152 };
// The river: where it runs (its middle, by row) and how wide it is.
export const RIVER = { width: 5, midAt: y => 60 + Math.round(3 * Math.sin(y / 19 + 0.5) + 1.2 * Math.sin(y / 7.3 + 2)) };
// The waterfront road's top row, by column. The quay is below it, then the dunes.
export const coastAt = x => 118 + Math.round(1.5 * Math.sin(x / 23 + 0.7));

const DISTRICT_ROOF = { oldmarket: 'a', westside: 'w', kessler: 'k', eastgate: 'e', narrows: 'n', harbor: 'h' };

// The streets, as lines through a few points (smoothly curved between them). North-south
// ones run the height of town (x: about where; a: how far they wander), east-west ones its
// width (y; Main Street runs straight, three wide). `full`: never broken; `skip`: stretches
// (between east-west streets) left out, for the shop's block. An old road cuts across on
// the slant: Old Post Road up through the Westside.
// Phase 32c: the streets sweep further and more often (a longer wander, a point every 16-18 tiles), so they
// curve instead of running dead straight; the gate street stays straight.
const NS = [
  { x: 17, a: 6, full: true }, { x: 37, a: 6 }, { x: 73, a: 4 }, { x: 90, a: 5, full: true },
  { x: 108, a: 5, skip: [4] }, { x: 127, a: 0, full: true }, { x: 147, a: 3 }, { x: 167, a: 5, w: 3, full: true }, { x: 186, a: 6 },
];
// Phase 32c: every east-west street crosses the river on a bridge, so none of them stops at the water.
const EW = [
  { y: 13, a: 5, bridge: true }, { y: 26, a: 4, bridge: true }, { y: 39, a: 3, bridge: true }, { y: 50, a: 2, bridge: true }, { y: 65, w: 3, main: true, bridge: true }, { y: 80, a: 5, bridge: true }, { y: 93, a: 4, bridge: true }, { y: 106, a: 5, bridge: true },
];
const SLANTS = [
  { pts: [[1, 76], [14, 70], [30, 58], [50, 47]] },            // Old Post Road
  // (Hill Road, up to Kessler Heights, used to cut across here; the curving streets now do that job and it only tangled with them.)
];

// Smooth curve through points [[t, v], ...] (t increasing): the value at t, rounded.
function along(pts, t) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) {
    const [t0, v0] = pts[i - 1], [t1, v1] = pts[i], f = (t - t0) / (t1 - t0);
    return Math.round(v0 + (v1 - v0) * (1 - Math.cos(Math.PI * f)) / 2);
  }
  return pts[pts.length - 1][1];
}
// Points every `step` along 0..len, wandering up to `a` from `base` (never so steeply that a
// two-wide street comes apart).
function wander(rng, base, a, len, step) {
  const pts = [];
  for (let t = 0; t <= len + step; t += step) pts.push([t, base + (a ? rng.int(-a, a) : 0)]);
  return pts;
}

const pctToTile = (x, y) => ({ tx: Math.round(6 + (x / 100) * (CITY.W - 12)), ty: Math.round(6 + (y / 100) * (CITY.land - 12)) });
const tileToPct = (tx, ty) => ({ x: ((tx - 6) / (CITY.W - 12)) * 100, y: ((ty - 6) / (CITY.land - 12)) * 100 });

export function districtAtPct(districts, x, y) {
  let best = null, bd = Infinity;
  for (const d of districts) { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = d; } }
  return best;
}

const LOC_W = 12;   // a location's building; one tile of grass either side

// `extra` are this game's own places (data/places.js): they take their spots after the
// original's locations, so those never move.
export function buildCityLayout(DATA, extra = [], { stops = [] } = {}) {
  const { W, H } = CITY;
  const g = Array.from({ length: H }, () => Array(W).fill('?'));
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const set = (x, y, ch) => { if (inside(x, y)) g[y][x] = ch; };
  const at = (x, y) => (inside(x, y) ? g[y][x] : 'X');
  const rng = new RNG('second-sight-city');

  // ---------- streets ----------
  const road = new Int16Array(W * H), lane = new Uint8Array(W * H), cross = new Uint8Array(W * H);
  const mark = (x, y, id, ns) => { if (!inside(x, y)) return; const i = y * W + x; if (road[i] && ns !== (road[i] > 0)) cross[i] = 1; if (!road[i] || ns) road[i] = ns ? 1 : -(id + 1); };
  const ns = NS.map(s => ({ ...s, w: s.w ?? 2, pts: wander(rng, s.x, s.a, H, 17) }));
  const nsX = (s, y) => along(s.pts, y);
  const ew = EW.map(s => ({ ...s, w: s.w ?? 2, pts: wander(rng, s.y, s.main ? 0 : s.a, W, 19), kind: [] }));
  const ewY = (s, x) => along(s.pts, x);
  // East-west streets, in stretches between the north-south ones: mostly road, now and then
  // a footpath instead (never Main Street, never over the river).
  ew.forEach((s, j) => {
    for (let i = 0; i <= ns.length; i++) {
      const a = i === 0 ? 1 : nsX(ns[i - 1], s.y), b = i === ns.length ? W - 2 : nsX(ns[i], s.y) + ns[i].w - 1;
      const riverHere = a < RIVER.midAt(s.y) + 4 && b > RIVER.midAt(s.y) - 4;
      const r = rng.next(), path = !s.main && !riverHere && i > 0 && i < ns.length && r < 0.14;
      // ...or nothing at all, and two blocks are one deep one.
      if (!s.main && !s.bridge && !riverHere && i > 0 && i < ns.length && r > 0.9) { s.kind[i] = 'none'; continue; }
      s.kind[i] = path ? 'path' : 'road';
      for (let x = a; x <= b; x++) {
        const y = ewY(s, x);
        for (let k = 0; k < s.w; k++) {
          if (path) { if (k === 0) lane[(y + k) * W + x] = 1; }
          else mark(x, y + k, j, false);
        }
      }
    }
  });
  // The old roads on the slant.
  SLANTS.forEach((r, j) => { for (let x = r.pts[0][0]; x <= r.pts[r.pts.length - 1][0]; x++) { const y = along(r.pts, x); mark(x, y, 50 + j, false); mark(x, y + 1, 50 + j, false); } });
  // Phase 32c: a few curving roads that cut across the grid from one crossing to the next, so the streets are not
  // all right angles. Each is an S of two-wide road, found from where the streets actually run.
  const crossing = (si, ej) => { const x = nsX(ns[si], ew[ej].y), y = ewY(ew[ej], x); return { x, y }; };
  for (const [j, [si0, ej0, si1, ej1]] of [[2, 1, 3, 2], [4, 5, 5, 6], [0, 3, 1, 4]].entries()) {
    const A = crossing(si0, ej0), B = crossing(si1, ej1), id = 60 + j;
    // (where the curve is steep, fill the steps between so the road never comes apart)
    if (Math.abs(B.x - A.x) >= Math.abs(B.y - A.y)) {
      let last = A.y;
      for (let x = Math.min(A.x, B.x); x <= Math.max(A.x, B.x); x++) {
        const t = (x - A.x) / (B.x - A.x), y = Math.round(A.y + (B.y - A.y) * (1 - Math.cos(Math.PI * t)) / 2);
        for (let yy = Math.min(last, y); yy <= Math.max(last, y) + 1; yy++) mark(x, yy, id, false);
        last = y;
      }
    } else {
      let last = A.x;
      for (let y = Math.min(A.y, B.y); y <= Math.max(A.y, B.y); y++) {
        const t = (y - A.y) / (B.y - A.y), x = Math.round(A.x + (B.x - A.x) * (1 - Math.cos(Math.PI * t)) / 2);
        for (let xx = Math.min(last, x); xx <= Math.max(last, x) + 1; xx++) mark(xx, y, id, false);
        last = x;
      }
    }
  }
  // The waterfront road along the harbor.
  for (let x = 1; x < W - 1; x++) for (let k = 0; k < 3; k++) mark(x, coastAt(x) + k, 99, false);
  // North-south streets, stretch by stretch (between east-west streets): a road, a
  // footpath, or nothing (a long block, the street stopping at a T).
  ns.forEach((s, i) => {
    for (let k = 0; k <= ew.length; k++) {
      const meet = e => ewY(e, nsX(s, ewY(e, nsX(s, e.y))));
      const yA = k === 0 ? 1 : meet(ew[k - 1]), yB = k === ew.length ? coastAt(nsX(s, 118)) + 2 : meet(ew[k]) + ew[k].w - 1;
      let kind = s.full ? 'road' : s.skip?.includes(k) ? 'none' : (r => (r < 0.6 ? 'road' : r < 0.86 ? 'none' : 'path'))(rng.next());
      if (k === 0 && kind === 'none' && !s.skip) kind = 'road';
      for (let y = yA; y <= yB; y++) {
        const x0 = nsX(s, y);
        for (let c = 0; c < s.w; c++) {
          if (kind === 'road') mark(x0 + c, y, i, true);
          else if (kind === 'path' && c === 0) lane[y * W + x0] = 1;
        }
      }
    }
  });
  // ---------- Phase 32c: no street just ends ----------
  // A road down each side of town, from the top east-west street to the waterfront road, so the streets that
  // used to run into the edge now meet it (and cars can go round).
  const yTop = Math.min(...ew.map(e => ewY(e, 1)));
  // The woods trail is at the top of the last street west of the park gate (roped off until the woods open):
  // work out which street, so the road along the top of town can leave a gap there.
  let woodsPair = null;
  for (let x = GATE.x0 - 21; x > 2 && !woodsPair; x--) if (road[W + x] && road[W + x - 1] && !road[W + x + 1]) woodsPair = { x0: x - 1, x1: x };
  for (let x = 1; x <= W - 2; x++) if (!woodsPair || x < woodsPair.x0 - 2 || x > woodsPair.x1 + 2) for (const y of [1, 2]) mark(x, y, 92, false);
  for (let y = yTop; y <= coastAt(1) + 2; y++) for (const x of [1, 2]) mark(x, y, 90, true);
  for (let y = yTop; y <= coastAt(W - 2) + 2; y++) for (const x of [W - 3, W - 2]) mark(x, y, 91, true);
  // A roundabout where Garden Street (the long north-south street at x 90) meets the street at y 50.
  const islands = [], circles = [];
  const stampCircle = (px, py, rIn, rOut, id, kind, entries) => {
    circles.push({ kind, x: px, y: py, rIn, rOut, entries });
    for (let y = Math.floor(py - rOut) - 1; y <= Math.ceil(py + rOut) + 1; y++) for (let x = Math.floor(px - rOut) - 1; x <= Math.ceil(px + rOut) + 1; x++) {
      if (!inside(x, y)) continue;
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py), i = y * W + x;
      if (d <= rIn) { road[i] = 0; cross[i] = 0; lane[i] = 0; islands.push({ x, y, d }); }
      else if (d <= rOut) { road[i] = -(id + 1); cross[i] = 0; }
    }
  };
  {
    const sx = ns[3], sy = ew[3];
    const cy0 = ewY(sy, nsX(sx, sy.y)), cx0 = nsX(sx, cy0);
    stampCircle(cx0 + 1, cy0 + 1, 3.8, 7.4, 120, 'roundabout', [{ axis: 'x' }, { axis: 'y' }]);
  }
  // A few dead-end streets that finish in a turning circle: found by looking along the east-west streets for
  // a stretch with room to run a short street into the block and swing round.
  const spurs = [];
  {
    const sat = new Int32Array((W + 1) * (H + 1));
    const blocked = (x, y) => !inside(x, y) || road[y * W + x] !== 0 || lane[y * W + x] !== 0 || Math.abs(x - RIVER.midAt(y)) <= Math.floor(RIVER.width / 2) + 5 || y > coastAt(x) - 3 || y < 3 || x < 6 || x > W - 7;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sat[(y + 1) * (W + 1) + x + 1] = sat[y * (W + 1) + x + 1] + sat[(y + 1) * (W + 1) + x] - sat[y * (W + 1) + x] + (blocked(x, y) ? 1 : 0);
    const clear = (x0, y0, x1, y1) => x0 >= 0 && y0 >= 0 && x1 < W && y1 < H && sat[(y1 + 1) * (W + 1) + x1 + 1] - sat[y0 * (W + 1) + x1 + 1] - sat[(y1 + 1) * (W + 1) + x0] + sat[y0 * (W + 1) + x0] === 0;
    const LEN = 5, R_OUT = 4.4, R_IN = 1.5, ROOM = 14;      // a spur's length, its circle, and the room it needs
    const want = [[3, 1], [5, -1], [6, 1], [1, 1], [7, -1], [2, 1], [4, -1], [0, 1], [5, 1], [6, -1], [3, -1], [1, -1], [2, -1], [4, 1], [7, 1], [0, -1]];   // (east-west street, side: -1 north of it, 1 south); the first three that fit
    for (const [j, side] of want) {
      if (spurs.length >= 3) break;
      const e = ew[j];
      let best = null;
      for (let x = 20; x < W - 20; x++) {
        const yr = ewY(e, x), edge = side < 0 ? yr - 1 : yr + e.w;       // the first tile off the street
        const y0 = side < 0 ? edge - ROOM + 1 : edge, y1 = side < 0 ? edge : edge + ROOM - 1;
        if (!clear(x - 6, y0, x + 7, y1)) continue;
        if (!road[(side < 0 ? yr : yr + e.w - 1) * W + x] || !road[(side < 0 ? yr : yr + e.w - 1) * W + x + 1]) continue;
        const dist = spurs.reduce((m, s) => Math.min(m, Math.abs(s.x - x) + Math.abs(s.y - edge)), 999);
        if (dist < 40) continue;
        const score = -Math.abs(x - W / 2);
        if (!best || score > best.score) best = { x, edge, score };
      }
      if (!best) continue;
      const { x, edge } = best;
      for (let k = 0; k < LEN; k++) for (const c of [0, 1]) mark(x + c, edge + side * k, 130 + spurs.length, true);
      stampCircle(x + 1, edge + side * (LEN + 2.4), R_IN, R_OUT, 140 + spurs.length, 'cul-de-sac', [{ axis: 'y', dir: -side }]);
      spurs.push({ x, y: edge, side, cx: x + 1, cy: edge + side * (LEN + 2.4) });
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (road[i]) g[y][x] = cross[i] ? '+' : '=';
    else if (lane[i]) g[y][x] = ',';
  }
  // The islands in the middle of the circles: a paved ring and a tree in a planter.
  for (const { x, y, d } of islands) g[y][x] = d < 1.2 ? 'T' : ',';

  // ---------- the harbor, the river, the edges ----------
  for (let x = 0; x < W; x++) {
    const c = coastAt(x);
    for (let y = c + 3; y < H; y++) g[y][x] = y <= c + 4 ? ',' : 's';
  }
  const river = { cols: [], bridges: [] }, half = Math.floor(RIVER.width / 2);
  const bridgeIds = new Set([...ew.map((s, j) => (s.bridge ? -(j + 1) : 0)).filter(Boolean), -100, -93]);
  for (let y = 0; y < H; y++) {
    const m = RIVER.midAt(y), x0 = m - half, x1 = m + half;
    river.cols[y] = { x0, x1 };
    for (let x = x0; x <= x1; x++) g[y][x] = bridgeIds.has(road[y * W + x]) ? 'u' : '~';
  }
  for (let y = 0; y < H; y++) if (g[y][river.cols[y].x0] === 'u' && g[y - 1]?.[river.cols[y].x0] !== 'u') {
    let y1 = y; while (g[y1 + 1]?.[river.cols[y].x0] === 'u') y1++;
    river.bridges.push({ y0: y, y1, x0: river.cols[y].x0, x1: river.cols[y].x1 });
  }
  const gate = { x0: GATE.x0, x1: GATE.x1 };
  for (let x = 0; x < W; x++) if (g[0][x] !== '~') g[0][x] = x >= gate.x0 && x <= gate.x1 ? 'G' : 'X';
  for (let y = 1; y < H; y++) for (const x of [0, W - 1]) g[y][x] = y < coastAt(x) + 3 ? 'X' : g[y][x] === '~' ? '~' : '}';
  // The bottom edge is a line of dune fence: only the river and the boardwalk get through.
  for (let x = 0; x < W; x++) if (g[H - 1][x] !== '~') g[H - 1][x] = '}';
  // The boardwalk through the dunes to the beach, and a signpost at the top of it.
  const docks = [];
  for (const [x0, x1] of [[BEACH.x0, BEACH.x1]]) {
    for (let x = x0; x <= x1; x++) for (let y = coastAt(x) + 3; y < H; y++) if (g[y][x] !== '~') g[y][x] = 'd';
    docks.push({ x0, x1 });
  }
  { const y = coastAt(BEACH.x1 + 1) + 5; g[y][BEACH.x1 + 1] = '>'; }
  const beachArchY = coastAt(BEACH.x0) + 6;
  const beach = { x0: BEACH.x0, x1: BEACH.x1 };

  // ---------- blocks: what the streets leave ----------
  const regionOf = new Int16Array(W * H), blocks = [];
  const findBlocks = () => {
  regionOf.fill(-1); blocks.length = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== '?' || regionOf[y * W + x] >= 0) continue;
    const id = blocks.length, cells = [], stack = [[x, y]];
    regionOf[y * W + x] = id;
    while (stack.length) {
      const [cx, cy] = stack.pop(); cells.push([cx, cy]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (inside(nx, ny) && g[ny][nx] === '?' && regionOf[ny * W + nx] < 0) { regionOf[ny * W + nx] = id; stack.push([nx, ny]); }
      }
    }
    let x0 = W, y0 = H, x1 = 0, y1 = 0, sx = 0, sy = 0;
    for (const [cx, cy] of cells) { x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy); sx += cx; sy += cy; }
    const c = tileToPct(sx / cells.length, sy / cells.length);
    blocks.push({ id, x0, y0, x1, y1, cells, district: districtAtPct(DATA.districts, c.x, c.y).id, loc: null, kind: null });
  }
  };
  findBlocks();
  // A block left too deep or too long (a street stopped short) gets a footpath through it,
  // so the buildings behind have somewhere to face.
  let cut = false;
  for (const b of blocks) {
    const midY = b.y1 - b.y0 > 17 ? b.y0 + Math.round((b.y1 - b.y0) / 2) : null, midX = b.x1 - b.x0 > 44 ? b.x0 + Math.round((b.x1 - b.x0) / 2) : null;
    for (const [x, y] of b.cells) if (y === midY || x === midX) { g[y][x] = ','; cut = true; }
  }
  if (cut) findBlocks();
  const same = (b, x, y) => inside(x, y) && regionOf[y * W + x] === b.id;
  const interior = new Uint8Array(W * H);
  for (const b of blocks) for (const [x, y] of b.cells) {
    let edge = false;
    for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !same(b, x + dx, y + dy)) { edge = true; break; }
    if (edge) g[y][x] = ','; else interior[y * W + x] = 1;
  }
  const inner = (b, x, y) => same(b, x, y) && interior[y * W + x];
  // Each block's frontage: runs of columns, each with the bottom of its inside (`bot`, just
  // above the sidewalk) and how far up it goes (`top`). Streets curve, so a front isn't
  // level: a building sits on its run's highest bottom, with a forecourt below it where the
  // sidewalk drops away. Whatever's behind the buildings is the block's back.
  for (const b of blocks) {
    b.spans = [];
    let cur = null;
    for (let x = b.x0; x <= b.x1; x++) {
      let yb = -1;
      for (let y = b.y1; y >= b.y0; y--) if (inner(b, x, y)) { yb = y; break; }
      let yt = yb;
      while (yb >= 0 && inner(b, x, yt - 1)) yt--;
      if (yb < 0) { cur = null; continue; }
      const overlap = cur && cur.x1 === x - 1 ? Math.min(yb, cur.bot[x - 1]) - Math.max(yt, cur.top[x - 1]) + 1 : 0;
      if (overlap < 4) { cur = { x0: x, x1: x, bot: {}, top: {}, used: new Set() }; b.spans.push(cur); }
      cur.x1 = x; cur.top[x] = yt; cur.bot[x] = yb;
    }
  }
  const spanTop = (sp, a, z) => { let t = -Infinity; for (let x = a; x <= z; x++) t = Math.max(t, sp.top[x]); return t; };
  const spanBot = (sp, a, z) => { let t = Infinity; for (let x = a; x <= z; x++) t = Math.min(t, sp.bot[x]); return t; };
  const free = (sp, a, z) => { for (let x = a; x <= z; x++) if (x < sp.x0 || x > sp.x1 || sp.used.has(x)) return false; return true; };
  const take = (sp, a, z) => { for (let x = a; x <= z; x++) sp.used.add(x); };
  const forecourt = (sp, a, z, yb, ch) => { for (let x = a; x <= z; x++) for (let y = yb + 1; y <= sp.bot[x]; y++) set(x, y, ch); };

  // A building: roof from `top` down to three rows above the bottom, then its front, with
  // a door on the bottom row.
  const building = (x0, w, ybot, top, roof, doorCh, doorX) => {
    for (let x = x0; x < x0 + w; x++) {
      for (let y = top; y <= ybot - FACADE; y++) set(x, y, roof);
      for (let y = ybot - FACADE + 1; y <= ybot; y++) set(x, y, roof.toUpperCase());
    }
    if (doorCh) set(doorX, ybot, doorCh);
  };

  // ---------- the places ----------
  const locs = {};
  const placed = [...[...DATA.locations].sort((a, b) => (b.home ? 1 : 0) - (a.home ? 1 : 0)), ...extra];
  const homeId = DATA.locations.find(l => l.home)?.id ?? 'shop';
  let plaza = null;
  for (const L of placed) {
    const t = pctToTile(L.x, L.y);
    let best = null, bd = Infinity;
    for (const b of blocks) for (const sp of b.spans) {
      if (sp.x1 - sp.x0 + 1 < LOC_W + 2) continue;
      const s = Math.max(sp.x0, Math.min(sp.x1 - LOC_W - 1, t.tx - LOC_W / 2 - 1));
      for (const start of [s, s - 3, s + 3, sp.x0, sp.x1 - LOC_W - 1]) {
        if (!free(sp, start, start + LOC_W + 1)) continue;
        const yb = spanBot(sp, start + 1, start + LOC_W);
        if (yb - spanTop(sp, start + 1, start + LOC_W) < 5) continue;
        const d = Math.hypot(start + 1 + LOC_W / 2 - t.tx, yb - t.ty);
        if (d < bd) { bd = d; best = { b, sp, start, yb }; }
      }
    }
    if (!best) throw new Error(`no room in town for ${L.id}`);
    const { b, sp, start, yb } = best, bx0 = start + 1, doorX = bx0 + LOC_W / 2;
    const rtop = Math.max(spanTop(sp, bx0, bx0 + LOC_W - 1), yb - 9);
    take(sp, start, start + LOC_W + 1);
    b.loc ??= L.id;
    for (let x = start; x <= start + LOC_W + 1; x++) for (let y = sp.top[x]; y <= sp.bot[x]; y++) set(x, y, '"');
    building(bx0, LOC_W, yb, rtop, DISTRICT_ROOF[L.district] || 'a', 'O', doorX);
    forecourt(sp, bx0, bx0 + LOC_W - 1, yb, ',');
    for (const x of [start, start + LOC_W + 1]) if (sp.bot[x] >= yb) set(x, yb, 't');
    locs[L.id] = { id: L.id, district: L.district, door: { tx: doorX, ty: yb }, stand: { tx: doorX, ty: yb + 1 }, roof: { tx: bx0, ty: rtop, w: LOC_W, h: yb - FACADE + 1 - rtop } };
    // Old Market Square: beside the shop, on its side of the street.
    if (L.id === homeId) {
      for (const [a, z] of [[start + LOC_W + 2, start + LOC_W + 17], [start - 16, start - 1]]) {
        if (!free(sp, a, z) || spanBot(sp, a, z) !== yb || yb - spanTop(sp, a, z) < 8) continue;
        take(sp, a, z);
        b.kind = 'square';
        plaza = square(a, spanTop(sp, a, z), z, yb, sp);
        break;
      }
    }
  }

  // Old Market Square: paving, a fountain in the middle, benches, planters, flowers, lamps.
  function square(X, Y, X1, B, sp) {
    for (let x = X; x <= X1; x++) { for (let y = sp.top[x]; y < Y; y++) set(x, y, 'f'); for (let y = Y; y <= sp.bot[x]; y++) set(x, y, 'P'); }
    const mx = Math.floor((X + X1) / 2) - 1, my = Y + Math.floor((B - Y) / 2) - 1;
    for (let y = my; y <= my + 2; y++) for (let x = mx; x <= mx + 3; x++) set(x, y, 'F');
    set(mx - 2, my + 1, 'B'); set(mx + 5, my + 1, 'B'); set(mx + 1, my + 4, 'B'); set(mx + 2, Y, 'B');
    for (const [tx, ty] of [[X, Y], [X1, Y], [X, B - 1], [X1, B - 1]]) set(tx, ty, 'T');
    for (const [tx, ty] of [[X + 2, Y], [X1 - 2, Y], [X + 2, B - 1], [X1 - 2, B - 1], [X + 3, B - 1], [X1 - 3, B - 1]]) set(tx, ty, 'f');
    set(mx - 1, my - 1, 'L'); set(mx + 4, my + 3, 'L');
    return { x0: X, y0: Y, x1: X1, y1: B, fountain: { tx: mx, ty: my, w: 4, h: 3 } };
  }

  // ---------- everything else, each district its own way ----------
  const back = { oldmarket: ',', eastgate: '"', westside: '"', kessler: '"', narrows: 'y', harbor: 'p' };
  const front = { oldmarket: ',', eastgate: ',', westside: '"', kessler: '"', narrows: 'y', harbor: 'y' };
  const runs = sp => {
    const out = []; let a = null;
    for (let x = sp.x0; x <= sp.x1 + 1; x++) {
      const ok = x <= sp.x1 && !sp.used.has(x) && sp.bot[x] - sp.top[x] >= FACADE;
      if (ok && a === null) a = x;
      if (!ok && a !== null) { out.push([a, x - 1]); a = null; }
    }
    return out;
  };
  // Buildings along a run, of widths from `widths`, with `gap` between. A building that
  // would come out too shallow (the front drops away too far under it) is cut narrower.
  const terrace = (sp, a, z, roof, widths, gapOf, height, gapFill, fore) => {
    let x = a;
    while (x <= z) {
      let w = Math.min(rng.pick(widths), z - x + 1);
      const rest = z - (x + w) + 1;
      if (rest > 0 && rest < 3 && w + rest <= Math.max(...widths) + 2) w += rest;
      while (w >= 3 && spanBot(sp, x, x + w - 1) - spanTop(sp, x, x + w - 1) < FACADE) w--;
      if (w < 3) { gapFill(x, sp); x++; continue; }
      const yb = spanBot(sp, x, x + w - 1);
      const top = Math.min(Math.max(spanTop(sp, x, x + w - 1), height(yb)), yb - FACADE);
      building(x, w, yb, top, roof, 'o', x + Math.floor(w / 2));
      forecourt(sp, x, x + w - 1, yb, fore);
      x += w;
      const gap = Math.min(gapOf(), z - x + 1);
      for (let k = 0; k < gap; k++) gapFill(x + k, sp);
      x += gap;
    }
  };
  const column = (x, sp, ch) => { for (let y = sp.top[x]; y <= sp.bot[x]; y++) set(x, y, ch); };

  for (const b of blocks) {
    const roof = DISTRICT_ROOF[b.district] || 'a', d = b.district;
    const area = b.cells.filter(([x, y]) => interior[y * W + x]).length;
    // Fill the whole inside first with the block's back; buildings go over it.
    let bk = back[d] ?? '"';
    if (!b.loc && b.kind !== 'square') {
      const deep = b.spans.some(sp => sp.x1 - sp.x0 >= 4 && runs(sp).length);
      const r = rng.next();
      if (area < 24 || !deep) b.kind = 'green';
      else if (d !== 'narrows' && d !== 'kessler' && r < 0.12) b.kind = 'park';
      else if ((d === 'oldmarket' || d === 'eastgate' || d === 'harbor') && r < (d === 'harbor' ? 0.3 : 0.2)) b.kind = 'lot';
      else b.kind = 'built';
      if (b.kind === 'green' || b.kind === 'park') bk = '"';
      if (b.kind === 'lot') bk = 'p';
    } else b.kind ??= 'built';
    for (const [x, y] of b.cells) if (interior[y * W + x] && g[y][x] === '?') g[y][x] = bk;
    if (b.kind === 'green' || b.kind === 'park') {
      const cx = Math.round((b.x0 + b.x1) / 2), cy = Math.round((b.y0 + b.y1) / 2);
      if (b.kind === 'park') {
        for (const [x, y] of b.cells) if (interior[y * W + x] && (x === cx || y === cy)) g[y][x] = ',';
        for (const [x, y, ch] of [[cx - 2, cy - 1, 'b'], [cx + 3, cy + 1, 'b'], [cx + 1, cy - 1, 'L']]) if (at(x, y) === '"' && inner(b, x, y)) set(x, y, ch);
      }
      for (const [x, y] of b.cells) if (g[y][x] === '"' && rng.chance(b.kind === 'park' ? 0.16 : 0.1) && at(x - 1, y) !== 't' && at(x, y - 1) !== 't') g[y][x] = 't';
      continue;
    }
    if (b.kind === 'lot') {
      for (const sp of b.spans) for (let x = sp.x0 + 1; x < sp.x1; x += 2) {
        const yb = sp.bot[x];
        if (sp.used.has(x) || g[yb][x] !== 'p') continue;
        if (yb - sp.top[x] >= 1 && g[yb - 1][x] === 'p' && rng.chance(0.6)) { set(x, yb, 'c'); set(x, yb - 1, 'v'); }
        const ty = sp.top[x] + 1;
        if (yb - sp.top[x] >= 4 && g[ty][x] === 'p' && g[ty - 1][x] === 'p' && rng.chance(0.5)) { set(x, ty, 'c'); set(x, ty - 1, 'v'); }
      }
      continue;
    }
    const fore = front[d] ?? ',';
    for (const sp of b.spans) for (const [a, z] of runs(sp)) {
      if (d === 'westside') {
        // Houses with yards; picket fences out front between them, flowers by the fence.
        terrace(sp, a, z, roof, [3, 4, 4, 5], () => rng.int(1, 3), yb => yb - FACADE - rng.int(1, 2), (x, s) => { set(x, s.bot[x], 'i'); if (rng.chance(0.3) && s.bot[x] - 1 > s.top[x]) set(x, s.bot[x] - 1, 'f'); }, fore);
      } else if (d === 'narrows') {
        // Tall, narrow buildings shoulder to shoulder, cobbled alleys between, bins at the back.
        terrace(sp, a, z, roof, [3, 3, 4, 5], () => 1, () => -Infinity, (x, s) => { column(x, s, 'y'); if (rng.chance(0.6)) set(x, s.top[x], rng.chance(0.5) ? 'z' : 'x'); }, fore);
      } else if (d === 'kessler') {
        // Halls set back on lawns, gravel paths between them.
        terrace(sp, a, z, roof, [7, 8, 10], () => rng.int(2, 4), yb => yb - FACADE - rng.int(2, 3), (x, s) => column(x, s, '"'), fore);
        for (let x = a; x <= z; x++) if (g[sp.top[x]][x] === '"') set(x, sp.top[x], 'q');
      } else if (d === 'harbor') {
        // Warehouses, crates stacked between them.
        terrace(sp, a, z, roof, [6, 8, 9, 11], () => rng.int(1, 2), () => -Infinity, (x, s) => { column(x, s, 'y'); if (rng.chance(0.8)) set(x, s.bot[x] - 1, 'x'); if (rng.chance(0.4)) set(x, s.top[x], 'x'); }, fore);
      } else {
        // Downtown: shops and rowhouses, some tall, some low, now and then a passage.
        terrace(sp, a, z, roof, [3, 4, 5, 6, 7, 8], () => (rng.chance(0.4) ? 1 : 0), yb => (rng.chance(0.6) ? -Infinity : yb - FACADE - rng.int(1, 4)), (x, s) => column(x, s, ','), fore);
      }
    }
    // Trees in the yards.
    if (bk === '"' || fore === '"') for (const [x, y] of b.cells) if (g[y][x] === '"' && rng.chance(0.12) && at(x - 1, y) !== 't' && at(x, y - 1) !== 't' && !'awkenhAWKENHoO'.includes(at(x, y + 1)) && at(x, y + 1) !== ',' ) g[y][x] = 't';
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '?') g[y][x] = '"';

  // Phase 22: bus stops (Q) on the sidewalk a few steps from these places' doors.
  const busStops = {};
  for (const id of stops) {
    const L = locs[id];
    if (!L) continue;
    const tx = L.stand.tx + 3, ty = L.stand.ty;
    if (g[ty][tx] !== ',') continue;
    set(tx, ty, 'Q');
    busStops[id] = { id, tx, ty, stand: { tx: tx - 1, ty } };
  }

  // Street lamps along the curbs, spaced out, never in front of a door.
  const lamps = [], keepClear = [...Object.values(locs).map(L => L.stand), ...Object.values(busStops)];
  const roadside = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => '=+'.includes(at(x + dx, y + dy)));
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (g[y][x] !== ',' || !roadside(x, y) || 'oOGQ'.includes(at(x, y - 1)) || at(x, y - 1) === ',' && at(x, y + 1) === ',') continue;
    if (lamps.some(l => Math.abs(l.x - x) < 9 && Math.abs(l.y - y) < 7)) continue;
    if (keepClear.some(s => Math.abs(s.tx - x) <= 3 && Math.abs(s.ty - y) <= 1)) continue;
    if (Math.abs(x - gate.x0) < 4 && y < 3) continue;
    set(x, y, 'L'); lamps.push({ x, y });
  }
  // And along the quay, between the jetties.
  for (let x = 6; x < W - 6; x += 11) {
    const y = coastAt(x) + 4;
    if (g[y][x] === ',' && !docks.some(d => x >= d.x0 - 1 && x <= d.x1 + 1)) set(x, y, 'L');
  }

  // v2.5: the woods trail, at the top of the last street west of the park gate past Kessler
  // Heights: roped off, with a sign, until the woods open.
  const woods = woodsPair;
  if (woods) { set(woods.x0, 1, '%'); set(woods.x1, 1, '&'); }

  const doors = {};
  for (const L of Object.values(locs)) doors[`${L.door.tx},${L.door.ty}`] = L.id;
  const home = locs[homeId];

  return {
    rows: g.map(r => r.join('')),
    blocks: blocks.map(({ cells, spans, ...b }) => ({ ...b, size: cells.length })),
    locs, doors, busStops, plaza, river, gate, beach, docks, woods, beachArchY,
    circles, spurs,
    spawn: home.stand,
    blockAt(tx, ty) { const i = inside(tx, ty) ? regionOf[ty * W + tx] : -1; return i >= 0 ? this.blocks[i] : null; },
    districtAt(tx, ty) {
      const b = this.blockAt(tx, ty);
      if (b) return DATA.districts.find(d => d.id === b.district);
      const p = tileToPct(tx, Math.min(ty, CITY.land)); return districtAtPct(DATA.districts, p.x, p.y);
    },
  };
}

// v2.2: plaza paving, bridges, alley cobbles, campus paths and the park gate are walkable
// too; v2.3: the jetties and the boardwalk.
export const CITY_WALKABLE = new Set(['=', '+', ',', '"', 'p', 'P', 'u', 'y', 'q', 'G', 'd']);
