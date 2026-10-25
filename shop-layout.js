// Arranging the shop yourself (Phase 24). Each renovation stage is built with its cases,
// till and register where the crew put them (data/shop-tiers.js). From there they're
// yours to move: cases anywhere on the open floor, the till and the register anywhere
// along the counter, and decor you buy (data/decor.js) wherever it looks good.
//
// The layout lives in world.shop.layout: { tier, cases: ["tx,ty"], till, register,
// decor: [{ id, tx, ty }] }, and decor you've bought but put away in world.shop.stored.
// A renovation starts the cases, till and register over in the new stage's places; your
// decor stays where it is if it still fits, and goes into storage if it doesn't.
//
// Nothing here may leave the shop unworkable: customers have to get from the door to
// every case and both lines and back out, and you have to get from behind the counter
// to the floor. `check` says why a layout won't do; the arranger won't put a piece
// down anywhere that fails it. Pure: no DOM.

import { tierRows, tierLines, shopTierRoom, clampTier } from '../data/shop-tiers.js';
import { SHOP_FLOOR } from '../data/rooms.js';
import { DECOR, decorDef, decorByChar, CHARM } from '../data/decor.js';
import { shopState } from './shop-growth.js';

export const COUNTER_ROW = 4;
export const FLOOR_TOP = SHOP_FLOOR.customerMinRow;          // customers' side of the counter
const ENTRANCE = SHOP_FLOOR.entrance, EXITS = SHOP_FLOOR.exit;
const BEHIND = { tx: 14, ty: 3 };                             // where you come in from the back
const BUILD_ON = new Set(['.', 'v', 'r']);                    // floor you can put things on
const WALK = new Set(['.', 'v', 'r', ...DECOR.filter(d => !d.solid).map(d => d.char)]);
const MOVABLE = { V: '.', T: 'K', R: 'K' };

const parse = slot => slot.split(',').map(Number);
const key = (x, y) => `${x},${y}`;

// ---------- the layout ----------

// The stage as the crew built it.
export function defaultLayout(tier) {
  tier = clampTier(tier);
  const L = { tier, cases: [], till: 16, register: 9, decor: [] };
  tierRows(tier).forEach((row, ty) => {
    for (let tx = 0; tx < row.length; tx++) {
      if (row[tx] === 'V') L.cases.push(key(tx, ty));
      if (ty === COUNTER_ROW && row[tx] === 'T') L.till = tx;
      if (ty === COUNTER_ROW && row[tx] === 'R') L.register = tx;
    }
  });
  return L;
}

// The stage's rows with everything movable taken out.
const bareCache = new Map();
export function bareRows(tier) {
  tier = clampTier(tier);
  if (!bareCache.has(tier)) bareCache.set(tier, tierRows(tier).map((r, ty) => [...r].map(ch => (ch === 'V' || ty === COUNTER_ROW ? MOVABLE[ch] ?? ch : ch)).join('')));
  return bareCache.get(tier);
}

// The rows with your pieces where you put them. A piece in your hands (null) isn't drawn.
export function layoutRows(tier, L) {
  const g = bareRows(tier).map(r => [...r]);
  for (const s of L.cases) { const [x, y] = parse(s); g[y][x] = 'V'; }
  if (L.till != null) g[COUNTER_ROW][L.till] = 'T';
  if (L.register != null) g[COUNTER_ROW][L.register] = 'R';
  for (const d of L.decor) g[d.ty][d.tx] = decorDef(d.id).char;
  return g.map(r => r.join(''));
}

// The two lines run straight out from the register (sellers) and the till (buyers).
export function linesFor(tier, L) {
  const n = tierLines(tier).sell.length;
  const col = x => (x == null ? [] : Array.from({ length: n }, (_, i) => ({ tx: x, ty: FLOOR_TOP + i })));
  return { sell: col(L.register), buy: col(L.till) };
}

export const layoutKey = L => `${L.tier}|${L.cases.join(';')}|${L.till}|${L.register}|${L.decor.map(d => `${d.id}@${d.tx},${d.ty}`).join(';')}`;

// The room for a layout, in the shape every room has (data/shop-tiers.js shopTierRoom).
const roomCache = new Map();
export function layoutRoom(tier, L) {
  const k = layoutKey(L);
  if (roomCache.has(k)) return roomCache.get(k);
  const base = shopTierRoom(tier);
  const room = {
    ...base, rows: layoutRows(tier, L), lines: linesFor(tier, L), layoutKey: k,
    counter: { tx: L.register, ty: COUNTER_ROW }, till: { tx: L.till, ty: COUNTER_ROW },
    tillZone: { x0: L.till - 2, x1: L.till + 2, y0: 2, y1: 3 },
  };
  if (roomCache.size > 40) roomCache.clear();
  roomCache.set(k, room);
  return room;
}

const copy = L => ({ ...L, cases: [...L.cases], decor: L.decor.map(d => ({ ...d })) });
const validShape = L => L && typeof L === 'object' && Array.isArray(L.cases) && Array.isArray(L.decor) && Number.isInteger(L.till) && Number.isInteger(L.register);

// ---------- what's allowed ----------

// Why this layout won't work, or null if it will.
export function check(tier, L) {
  const rows = layoutRows(tier, L), H = rows.length, W = rows[0].length;
  const walk = (x, y) => WALK.has(rows[y]?.[x]);
  const lines = linesFor(tier, L);
  for (const s of [...lines.sell, ...lines.buy]) if (!walk(s.tx, s.ty)) return 'Keep the space in front of the counter clear for the line.';
  if (!walk(L.till, COUNTER_ROW - 1) || !walk(L.register, COUNTER_ROW - 1)) return 'You need room to stand behind it.';
  const flood = (from, minRow) => {
    const seen = new Set([key(from.tx, from.ty)]), q = [from];
    while (q.length) {
      const { tx, ty } = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = tx + dx, y = ty + dy, k = key(x, y);
        if (x < 0 || y < minRow || x >= W || y >= H || seen.has(k) || !walk(x, y)) continue;
        seen.add(k); q.push({ tx: x, ty: y });
      }
    }
    return seen;
  };
  if (!walk(ENTRANCE.tx, ENTRANCE.ty) || EXITS.some(e => !walk(e.tx, e.ty))) return 'Keep the doorway clear.';
  const shoppers = flood(ENTRANCE, FLOOR_TOP);
  for (let y = FLOOR_TOP; y < H; y++) for (let x = 0; x < W; x++) if (walk(x, y) && !shoppers.has(key(x, y))) return 'That would wall off part of the floor.';
  for (const s of L.cases) {
    const [x, y] = parse(s);
    if (![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => shoppers.has(key(x + dx, y + dy)))) return 'Nobody could get to that case.';
  }
  const you = flood(BEHIND, 0);
  if (!you.has(key(ENTRANCE.tx, ENTRANCE.ty))) return 'You’d be stuck behind the counter.';
  if (!you.has(key(L.till, COUNTER_ROW - 1)) || !you.has(key(L.register, COUNTER_ROW - 1))) return 'You need to be able to get behind it.';
  return null;
}

// What's at a tile: { kind: 'case' | 'till' | 'register' | 'decor', id?, tx, ty } or null.
export function pieceAt(L, tx, ty) {
  if (ty === COUNTER_ROW && tx === L.till) return { kind: 'till', tx, ty };
  if (ty === COUNTER_ROW && tx === L.register) return { kind: 'register', tx, ty };
  if (L.cases.includes(key(tx, ty))) return { kind: 'case', tx, ty };
  const d = L.decor.find(x => x.tx === tx && x.ty === ty);
  return d ? { kind: 'decor', id: d.id, tx, ty } : null;
}

// Take a piece out of the layout (into your hands). Returns the piece, or null.
export function lift(L, tx, ty) {
  const p = pieceAt(L, tx, ty);
  if (!p) return null;
  if (p.kind === 'till') L.till = null;
  else if (p.kind === 'register') L.register = null;
  else if (p.kind === 'case') L.cases = L.cases.filter(s => s !== key(tx, ty));
  else L.decor = L.decor.filter(d => !(d.tx === tx && d.ty === ty));
  return { ...p, from: { tx, ty } };
}

// Put a piece in your hands down here. Returns the layout it would make.
export function withPiece(L, piece, tx, ty) {
  const N = copy(L);
  if (piece.kind === 'till') N.till = tx;
  else if (piece.kind === 'register') N.register = tx;
  else if (piece.kind === 'case') N.cases.push(key(tx, ty));
  else N.decor.push({ id: piece.id, tx, ty });
  return N;
}

// Why a piece in your hands can't go down here, or null if it can.
export function whyNot(tier, L, piece, tx, ty) {
  const bare = bareRows(tier), H = bare.length;
  const occupied = pieceAt({ ...L, till: L.till ?? -1, register: L.register ?? -1 }, tx, ty);
  if (piece.kind === 'till' || piece.kind === 'register') {
    if (ty !== COUNTER_ROW || bare[ty]?.[tx] !== 'K') return `The ${piece.kind} goes on the counter.`;
    const other = piece.kind === 'till' ? L.register : L.till;
    if (other != null && Math.abs(other - tx) < 2) return 'Too close to the other end of the counter.';
  } else {
    if (ty < FLOOR_TOP || ty >= H - 1 || !BUILD_ON.has(bare[ty]?.[tx])) return 'Not on the open floor.';
    if (occupied) return 'Something’s already there.';
    if (piece.kind === 'decor') {
      const d = decorDef(piece.id);
      if (!d.solid && L.decor.some(x => x.tx === tx && x.ty === ty)) return 'Something’s already there.';
    }
  }
  if (occupied && piece.kind !== 'till' && piece.kind !== 'register') return 'Something’s already there.';
  const N = withPiece(L, piece, tx, ty);
  if (N.till == null || N.register == null) return null;   // checked once both are back
  return check(tier, N);
}

// ---------- state ----------

// This shop's layout, for the stage it's at now (a renovation starts it over: see above).
export function layoutOf(world) {
  const s = shopState(world);
  if (!Array.isArray(s.stored)) s.stored = [];
  s.stored = s.stored.filter(id => decorDef(id));
  let L = s.layout;
  if (!validShape(L) || L.tier !== s.tier) {
    const fresh = defaultLayout(s.tier);
    for (const d of validShape(L) ? L.decor : []) {
      if (!decorDef(d.id)) continue;
      if (whyNot(s.tier, fresh, { kind: 'decor', id: d.id }, d.tx, d.ty) == null) fresh.decor.push({ id: d.id, tx: d.tx, ty: d.ty });
      else s.stored.push(d.id);
    }
    L = s.layout = fresh;
  }
  return L;
}
export const caseSlotsOf = world => layoutOf(world).cases;
export const layoutRoomOf = world => layoutRoom(shopState(world).tier, layoutOf(world));

// Move what's on display in a case along with the case.
export function moveDisplay(world, from, to) {
  const a = key(from.tx, from.ty), b = key(to.tx, to.ty);
  if (a === b || !world.displays?.[a]) return;
  world.displays[b] = world.displays[a];
  delete world.displays[a];
}

// ---------- decor ----------

export const piecesOut = L => L.decor.length;
export const ownedCount = (world, id) => layoutOf(world).decor.filter(d => d.id === id).length + shopState(world).stored.filter(x => x === id).length;

export function decorBlocker(world, st, id) {
  const d = decorDef(id);
  if (!d) return 'Not for sale';
  if (shopState(world).tier < d.unlock) return 'unlock';
  if (st.cash < d.cost) return `Needs $${d.cost}`;
  return null;
}
// Buy a piece: it goes into storage until you put it out.
export function buyDecor(world, st, id) {
  const why = decorBlocker(world, st, id);
  if (why) return { error: why === 'unlock' ? 'Not until the shop’s fixed up more.' : why };
  const d = decorDef(id);
  st.cash -= d.cost;
  layoutOf(world);
  shopState(world).stored.push(id);
  return { def: d };
}
export function storeDecor(world, id) { layoutOf(world); shopState(world).stored.push(id); }
export function takeStored(world, id) {
  const s = shopState(world), i = (s.stored ?? []).indexOf(id);
  if (i < 0) return false;
  s.stored.splice(i, 1);
  return true;
}

// What the decor on the floor does: charm, and from it patience, spending and browsers.
const WET = new Set(['rain', 'storm', 'snow']);
export function decorMods(L, wx = null) {
  const counts = {};
  let charm = 0, extra = 0;
  const seen = new Set();
  for (const p of L?.decor ?? []) {
    const d = decorDef(p.id);
    if (!d) continue;
    counts[d.id] = (counts[d.id] ?? 0) + 1;
    if (counts[d.id] > CHARM.perKind) continue;
    charm += d.charm;
    extra += d.patience ?? 0;
    if (d.wet && WET.has(wx) && !seen.has(d.id)) { extra += d.wet; seen.add(d.id); }
  }
  return {
    charm,
    patience: Math.min(CHARM.patienceMax, charm * CHARM.patiencePer) + extra,
    spend: Math.min(CHARM.spendMax, charm * CHARM.spendPer),
    browsers: CHARM.browsersAt.filter(c => charm >= c).length,
  };
}
export { decorByChar };

// The arranger's view of the shop floor (see game/arranger.js; the apartment has its own).
export function shopKit(world) {
  return {
    name: 'shop',
    layout: () => layoutOf(world),
    pieceAt: (L, x, y) => pieceAt(L, x, y),
    lift: (L, x, y) => lift(L, x, y),
    withPiece: (L, p, x, y) => withPiece(L, p, x, y),
    whyNot: (L, p, x, y) => whyNot(shopState(world).tier, L, p, x, y),
    store: id => storeDecor(world, id),
    takeStored: id => takeStored(world, id),
    maxPieces: CHARM.maxPieces,
    minRow: COUNTER_ROW,
  };
}
