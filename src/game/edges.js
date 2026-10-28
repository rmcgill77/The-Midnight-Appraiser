// Edge exits (v2.1): walk off the side of one map and arrive on the next, the way Stardew's
// town opens onto the beach or the forest. A room lists its exits under `edges`:
//
//   edges: {
//     north: { to: 'park', shift: 0 },             // shift: where along the edge you come out
//     east:  { to: 'beach', from: 4, until: 9 },   // only tiles 4..9 of that edge lead out
//   }
//
// An exit is open wherever the room's border tile is walkable (and within from..until, if
// given): the map lets you step past it, and once your feet are over the line you arrive
// just inside the opposite edge of the next map, at the same place along it (plus `shift`),
// facing the same way, on the nearest walkable tile. Pure: no DOM, no game state.

export const SIDES = ['north', 'south', 'east', 'west'];
export const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' };
export const FACING = { north: 'up', south: 'down', east: 'right', west: 'left' };
const ALONG = { north: 'x', south: 'x', east: 'y', west: 'y' };

const sizeOf = room => ({ cols: room.rows[0].length, rows: room.rows.length });

// The border tile of `side` at position `i` along it.
function borderTile(room, side, i) {
  const { cols, rows } = sizeOf(room);
  return side === 'north' ? { tx: i, ty: 0 } : side === 'south' ? { tx: i, ty: rows - 1 } : side === 'west' ? { tx: 0, ty: i } : { tx: cols - 1, ty: i };
}

// Is position `i` along `side` an open exit? isWalkable(tx, ty) answers for tiles in the room.
export function exitOpen(room, side, i, isWalkable) {
  const e = room.edges?.[side];
  if (!e) return false;
  const { cols, rows } = sizeOf(room);
  const len = ALONG[side] === 'x' ? cols : rows;
  if (i < 0 || i >= len) return false;
  if (e.from != null && i < e.from) return false;
  if (e.until != null && i > e.until) return false;
  const b = borderTile(room, side, i);
  return isWalkable(b.tx, b.ty);
}

// For the tile map: an out-of-bounds tile is open if it sits just past an open exit.
// (Only the first tile past the edge; corners stay shut.)
export function outsideOpen(room, tx, ty, isWalkable) {
  if (!room.edges) return false;
  const { cols, rows } = sizeOf(room);
  if (ty === -1 && tx >= 0 && tx < cols) return exitOpen(room, 'north', tx, isWalkable);
  if (ty === rows && tx >= 0 && tx < cols) return exitOpen(room, 'south', tx, isWalkable);
  if (tx === -1 && ty >= 0 && ty < rows) return exitOpen(room, 'west', ty, isWalkable);
  if (tx === cols && ty >= 0 && ty < rows) return exitOpen(room, 'east', ty, isWalkable);
  return false;
}

// Has someone whose feet are `box` ({x, y, w, h}, pixels) crossed an open edge? Returns
// { side, edge, at } (at: the tile along the edge) or null.
export function crossing(room, box, tile, isWalkable) {
  if (!room.edges) return null;
  const { cols, rows } = sizeOf(room);
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  const tx = Math.floor(cx / tile), ty = Math.floor(cy / tile);
  let side = null;
  if (cy < 0) side = 'north'; else if (cy >= rows * tile) side = 'south';
  else if (cx < 0) side = 'west'; else if (cx >= cols * tile) side = 'east';
  if (!side) return null;
  const at = ALONG[side] === 'x' ? Math.max(0, Math.min(cols - 1, tx)) : Math.max(0, Math.min(rows - 1, ty));
  if (!exitOpen(room, side, at, isWalkable)) return null;
  return { side, edge: room.edges[side], at };
}

// Where you arrive in `to` after leaving `from` across `side` at `at`: { tx, ty, facing }.
// isWalkableTo(tx, ty) answers for the arriving room.
export function arrival(from, side, at, to, isWalkableTo) {
  const e = from.edges[side], enter = OPPOSITE[side];
  const { cols, rows } = sizeOf(to);
  const len = ALONG[enter] === 'x' ? cols : rows;
  const want = Math.max(0, Math.min(len - 1, at + (e.shift ?? 0)));
  // The nearest open exit on the arriving side (there should be one leading back; if
  // not, the nearest walkable tile on that border, then one row in).
  const back = to.edges?.[enter];
  const ok = i => (back ? exitOpen(to, enter, i, isWalkableTo) : (() => { const b = borderTile(to, enter, i); return isWalkableTo(b.tx, b.ty); })());
  let pick = null;
  for (let d = 0; d < len && pick == null; d++) for (const i of [want - d, want + d]) if (i >= 0 && i < len && ok(i)) { pick = i; break; }
  if (pick == null) pick = want;
  const b = borderTile(to, enter, pick);
  return { tx: b.tx, ty: b.ty, facing: FACING[side] };
}

// Check a set of rooms: every edge leads somewhere that exists, and back. Returns problems.
export function checkEdges(rooms) {
  const out = [];
  for (const r of Object.values(rooms)) for (const [side, e] of Object.entries(r.edges ?? {})) {
    if (!SIDES.includes(side)) { out.push(`${r.id}: no side called ${side}`); continue; }
    const to = rooms[e.to];
    if (!to) { out.push(`${r.id} ${side}: leads to ${e.to}, which doesn't exist`); continue; }
    if (to.edges?.[OPPOSITE[side]]?.to !== r.id) out.push(`${r.id} ${side}: ${e.to} has no ${OPPOSITE[side]} edge back`);
  }
  return out;
}
