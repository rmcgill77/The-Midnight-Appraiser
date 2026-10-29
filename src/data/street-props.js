// Street furniture and clutter (Phase 32): the small things that make a street look used. Fire hydrants and mail
// boxes at the kerb, newspaper boxes, litter bins, bike racks, parking meters downtown, sandwich boards outside the
// shops, pots by the house doors, and bags and boxes left in the alleys. They are painted on the ground as part of
// the map (not solid: you walk past them), placed by a hash of the tile so the town is the same for everyone, and
// kept away from doors and lamps. Pure drawing.

const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const IRON = '#0c0d12', GREY = '#6a6f7e', GREY_L = '#8e939e', SHADOW = 'rgba(0,0,0,0.32)';

// Which way is the road from this tile, and how far can a prop go toward it and still stand on the pavement?
function kerbSpot(net, tx, ty) {
  const cx = tx * 16 + 8, cy = ty * 16 + 8;
  let best = null;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const f = net.field(cx + dx * 8, cy + dy * 8)?.f;
    if (f != null && f < 16 && (!best || f < best.f)) best = { dx, dy, f };
  }
  if (!best) return null;
  let o = 0;
  for (let k = 0; k <= 7; k++) { const F = net.field(cx + best.dx * k, cy + best.dy * k); if (F && F.f > 6) o = k; }
  return { x: cx + best.dx * o, y: cy + best.dy * o, dx: best.dx, dy: best.dy, f: net.field(cx + best.dx * o, cy + best.dy * o)?.f ?? 99 };
}

const hydrant = (g, x, y) => {            // 5 x 7, centred at (x, y)
  R(g, x - 3, y + 2, 7, 2, SHADOW);
  R(g, x - 2, y - 3, 5, 6, '#a63a34'); R(g, x - 2, y - 3, 1, 6, '#c8584e'); R(g, x - 1, y - 4, 3, 1, '#8a2a28'); R(g, x - 3, y - 1, 1, 2, '#8a2a28'); R(g, x + 3, y - 1, 1, 2, '#8a2a28'); R(g, x, y - 5, 1, 1, '#d8d0bc');
};
const mailbox = (g, x, y) => {            // 6 x 9
  R(g, x - 3, y + 3, 8, 2, SHADOW);
  R(g, x, y, 1, 4, IRON); R(g, x - 3, y - 5, 7, 5, '#3d63b5'); R(g, x - 3, y - 5, 7, 1, '#6a8ad0'); R(g, x - 3, y - 1, 7, 1, '#26407a'); R(g, x - 2, y - 3, 3, 1, IRON); R(g, x + 2, y - 4, 1, 2, '#d8d0bc');
};
const paperBox = (g, x, y, c) => {        // 5 x 6
  R(g, x - 3, y + 2, 7, 2, SHADOW);
  R(g, x - 2, y - 3, 5, 6, c); R(g, x - 2, y - 3, 5, 1, '#d8d0bc'); R(g, x - 1, y - 1, 3, 2, '#1c2a30'); R(g, x - 2, y + 3, 1, 1, IRON); R(g, x + 2, y + 3, 1, 1, IRON);
};
const bin = (g, x, y) => {                // 6 x 8
  R(g, x - 4, y + 3, 8, 2, SHADOW);
  R(g, x - 3, y - 3, 6, 7, '#3a4a3e'); R(g, x - 3, y - 3, 6, 1, '#586a5a'); R(g, x - 4, y - 4, 8, 1, '#2a3a2e'); for (const i of [-1, 1]) R(g, x + i, y - 1, 1, 4, '#2a3a2e');
};
const bikeRack = (g, x, y, c) => {        // 10 x 6, one bike locked to it
  R(g, x - 5, y + 2, 11, 2, SHADOW);
  for (const i of [-4, 0, 4]) { R(g, x + i, y - 2, 1, 5, GREY_L); R(g, x + i + 1, y - 2, 1, 1, GREY_L); }
  R(g, x - 3, y - 1, 3, 4, IRON); R(g, x - 3, y, 3, 1, c); R(g, x - 2, y - 2, 1, 6, '#5a5f6e');
};
const meter = (g, x, y) => {              // 4 x 9
  R(g, x - 2, y + 3, 5, 2, SHADOW);
  R(g, x, y - 1, 1, 5, '#5a5f6e'); R(g, x - 1, y - 5, 3, 4, '#7a8090'); R(g, x - 1, y - 5, 3, 1, '#a8aeba'); R(g, x, y - 3, 1, 1, '#1c2a30');
};
const board = (g, x, y, c) => {           // an A-frame sandwich board, 8 x 10
  R(g, x - 4, y + 4, 9, 2, SHADOW);
  R(g, x - 3, y - 4, 7, 9, '#4a3220'); R(g, x - 2, y - 3, 5, 7, '#1c2420');
  R(g, x - 1, y - 2, 3, 1, '#e8e4d8'); R(g, x - 1, y, 3, 1, c); R(g, x - 2, y + 2, 4, 1, '#e8e4d8'); R(g, x - 3, y + 5, 1, 1, '#4a3220'); R(g, x + 3, y + 5, 1, 1, '#4a3220');
};
const pot = (g, x, y, season) => {        // 5 x 7
  R(g, x - 3, y + 3, 7, 1, SHADOW);
  R(g, x - 2, y, 5, 4, '#7a4a30'); R(g, x - 2, y, 5, 1, '#9a6a4a');
  const leaf = season === 'autumn' ? '#a0602a' : season === 'winter' ? '#c8ccd2' : '#3a6a42';
  R(g, x - 2, y - 3, 5, 3, leaf); R(g, x - 1, y - 4, 3, 1, leaf);
  if (season === 'spring' || season === 'summer') { R(g, x - 1, y - 3, 1, 1, '#e8a0b8'); R(g, x + 1, y - 2, 1, 1, '#e8d070'); }
};

// tx, ty: a pavement tile (','), the alley cobbles ('y') or a house door ('o'/'Z'/'J').
export function dressProps(g, map, net, tx, ty, ch, h, season, { district = null, nearDoor = false } = {}) {
  const x = tx * 16, y = ty * 16;
  if (ch === 'y') {                                                  // the alleys: bags, boxes, a puddle's reflection
    if (h % 13 === 0) { R(g, x + 3, y + 8, 5, 4, '#1a1c22'); R(g, x + 3, y + 8, 5, 1, '#2e3238'); R(g, x + 4, y + 7, 1, 1, '#1a1c22'); }
    else if (h % 17 === 3) { R(g, x + 6, y + 6, 7, 6, '#7a5a40'); R(g, x + 6, y + 6, 7, 1, '#9a7a58'); R(g, x + 9, y + 6, 1, 6, '#5a4130'); }
    return;
  }
  if (ch === 'o' || ch === 'Z' || ch === 'J') {                      // pots beside the door
    if (h % 3 !== 0) { pot(g, x + 1, y + 13, season); if (h % 2) pot(g, x + 15, y + 13, season); }
    return;
  }
  if (nearDoor || !net) return;
  const spot = kerbSpot(net, tx, ty);
  if (!spot) return;
  const dens = district === 'oldmarket' ? 1.6 : district === 'narrows' || district === 'harbor' ? 1.2 : 1;
  const k = (h >>> 3) % 1000, along = (spot.dx === 0 ? tx : ty);
  if (k < 14 * dens) hydrant(g, spot.x, spot.y);
  else if (k < 24 * dens) mailbox(g, spot.x, spot.y);
  else if (k < 36 * dens && district !== 'kessler') paperBox(g, spot.x, spot.y, ['#a63a34', '#c8a23a', '#3d63b5'][h % 3]);
  else if (k < 52 * dens) bin(g, spot.x, spot.y);
  else if (k < 60 * dens && (district === 'narrows' || district === 'oldmarket' || district === 'eastgate')) bikeRack(g, spot.x, spot.y, ['#a63a34', '#3d63b5', '#4e9a52', '#c8642e'][h % 4]);
  else if (district === 'oldmarket' && along % 3 === 0 && k < 220) meter(g, spot.x, spot.y);
}

// A sandwich board beside a shop door (stand: the pavement tile below the door).
export function dressShopFront(g, tx, ty, h) {
  board(g, tx * 16 + 8, ty * 16 + 8, ['#c0503a', '#d8b040', '#7a6ad0', '#4e9a52'][h % 4]);
}
