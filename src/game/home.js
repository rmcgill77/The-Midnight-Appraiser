// Your apartment (Phase 27): the furniture you've put out, what it does, and the rules for
// moving it (the same arranger as the shop floor, game/arranger.js, through `homeKit`).
// State in world.home: { layout: { decor: [{ id, tx, ty }] }, stored: [ids], coffee: day }.
// Pure: no DOM.

import { APARTMENT, COMFORT, RADIO_START } from '../data/home.js';
import { DECOR, decorDef } from '../data/decor.js';

const BUILD_ON = new Set(['.', 'r']);
const WALK = new Set(['.', 'r', ...DECOR.filter(d => !d.solid).map(d => d.char)]);
const key = (x, y) => `${x},${y}`;
const ROWS = APARTMENT.rows, H = ROWS.length, W = ROWS[0].length;
// The things you use at home: each needs a free tile beside it (on the floor, in front).
const USES = [];
ROWS.forEach((row, ty) => { for (let tx = 0; tx < W; tx++) if ('[](=+,"/:<>'.includes(row[tx])) USES.push({ tx, ty }); });

export function homeState(world) {
  const h = world.home && typeof world.home === 'object' ? world.home : {};
  if (!h.layout || !Array.isArray(h.layout.decor)) h.layout = { decor: [] };
  h.layout.decor = h.layout.decor.filter(d => decorDef(d.id));
  if (!Array.isArray(h.stored)) h.stored = [];
  // v2.5b: the radio, once a fixture on the kitchen wall, is a piece of furniture now. Everyone
  // gets theirs, set down by the kitchen (or in a box, if that floor's taken).
  if (!h.radio) {
    h.radio = true;
    const spot = RADIO_START.find(s => !h.layout.decor.some(d => d.tx === s.tx && d.ty === s.ty));
    if (spot) h.layout.decor.push({ id: 'radio', tx: spot.tx, ty: spot.ty }); else h.stored.push('radio');
  }
  world.home = h;
  return h;
}
export const homeLayout = world => homeState(world).layout;

export function homeRows(L) {
  const g = ROWS.map(r => [...r]);
  for (const d of L.decor) g[d.ty][d.tx] = decorDef(d.id).char;
  return g.map(r => r.join(''));
}
export const homeKey = L => `home|${L.decor.map(d => `${d.id}@${d.tx},${d.ty}`).join(';')}`;
const roomCache = new Map();
export function homeRoom(L) {
  const k = homeKey(L);
  if (!roomCache.has(k)) { if (roomCache.size > 30) roomCache.clear(); roomCache.set(k, { ...APARTMENT, rows: homeRows(L), layoutKey: k }); }
  return roomCache.get(k);
}

// Why this layout won't do (something walled off, or you can't reach the bed), or null.
export function homeCheck(L) {
  const rows = homeRows(L), walk = (x, y) => WALK.has(rows[y]?.[x]);
  const start = APARTMENT.door, seen = new Set([key(start.tx, start.ty)]), q = [start];
  while (q.length) {
    const { tx, ty } = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = tx + dx, y = ty + dy, k = key(x, y);
      if (seen.has(k) || !walk(x, y)) continue;
      seen.add(k); q.push({ tx: x, ty: y });
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(x, y) && !seen.has(key(x, y))) return 'That would wall off part of the apartment.';
  for (const u of USES) if (![[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(key(u.tx + dx, u.ty + dy)))) return 'You need to be able to get to that.';
  return null;
}

export function homePieceAt(L, tx, ty) {
  const d = L.decor.find(x => x.tx === tx && x.ty === ty);
  return d ? { kind: 'decor', id: d.id, tx, ty } : null;
}
export function homeLift(L, tx, ty) {
  const p = homePieceAt(L, tx, ty);
  if (!p) return null;
  L.decor = L.decor.filter(d => !(d.tx === tx && d.ty === ty));
  return { ...p, from: { tx, ty } };
}
export function homeWith(L, piece, tx, ty) { return { ...L, decor: [...L.decor.map(d => ({ ...d })), { id: piece.id, tx, ty }] }; }
export function homeWhyNot(L, piece, tx, ty) {
  if (piece.kind !== 'decor') return 'Not at home.';
  if (ty < 2 || ty >= H - 1 || !BUILD_ON.has(ROWS[ty]?.[tx])) return 'Not on the open floor.';
  if (homePieceAt(L, tx, ty)) return 'Something’s already there.';
  if (tx === APARTMENT.door.tx && ty === APARTMENT.door.ty) return 'Keep the doorway clear.';
  return homeCheck(homeWith(L, piece, tx, ty));
}

// What the furniture does.
export function comfortOf(L) {
  const counts = {};
  let c = 0;
  for (const p of L?.decor ?? []) {
    const d = decorDef(p.id); if (!d) continue;
    counts[d.id] = (counts[d.id] ?? 0) + 1;
    if (counts[d.id] <= COMFORT.perKind) c += d.charm;
  }
  return c;
}
export const sleepStress = comfort => Math.min(COMFORT.stressMax, comfort * COMFORT.stressPer);
export const wellRested = comfort => comfort >= COMFORT.restedAt;

// Buying for home (Phase 28: from Erin, at her Wandering Brush): delivered to the apartment,
// in storage until you put it out. `price`: what she charges you (friends get a discount).
export const ERIN_DISCOUNT = { friend: 0.1, close: 0.2, family: 0.3 };   // family: ten hearts with her (Phase 29)
export function priceFor(id, tier = null) {
  const d = decorDef(id);
  return d ? Math.round(d.cost * (1 - (ERIN_DISCOUNT[tier] ?? 0))) : 0;
}
export function homeBuyBlocker(st, id, price = decorDef(id)?.cost) {
  const d = decorDef(id);
  if (!d) return 'Not for sale';
  if (st.cash < price) return `Needs $${price}`;
  return null;
}
export function buyForHome(world, st, id, price = decorDef(id)?.cost) {
  const why = homeBuyBlocker(st, id, price);
  if (why) return { error: why };
  const d = decorDef(id);
  st.cash -= price;
  homeState(world).stored.push(id);
  return { def: d, price };
}

// Erin's advice: what she'd add next (the most comfort for the money, of what you don't
// have two of yet), and what she thinks of the place.
export function designAdvice(world, tier = null) {
  const L = homeLayout(world), c = comfortOf(L), owned = id => homeOwned(world, id);
  const next = DECOR.filter(d => owned(d.id) < COMFORT.perKind).sort((a, b) => priceFor(a.id, tier) / a.charm - priceFor(b.id, tier) / b.charm)[0] ?? null;
  const stored = homeState(world).stored.length;
  return { comfort: c, next, stored, rested: c >= COMFORT.restedAt, toRested: Math.max(0, COMFORT.restedAt - c) };
}
export const homeOwned = (world, id) => homeLayout(world).decor.filter(d => d.id === id).length + homeState(world).stored.filter(x => x === id).length;

// The arranger's view of the apartment (see game/arranger.js).
export function homeKit(world) {
  return {
    name: 'home',
    layout: () => homeLayout(world),
    pieceAt: (L, x, y) => homePieceAt(L, x, y),
    lift: (L, x, y) => homeLift(L, x, y),
    withPiece: (L, p, x, y) => homeWith(L, p, x, y),
    whyNot: (L, p, x, y) => homeWhyNot(L, p, x, y),
    store: id => { homeState(world).stored.push(id); },
    takeStored: id => { const s = homeState(world).stored, i = s.indexOf(id); if (i < 0) return false; s.splice(i, 1); return true; },
    maxPieces: COMFORT.maxPieces,
    minRow: 2,
  };
}
