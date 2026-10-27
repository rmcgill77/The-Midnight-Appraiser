// Tile collision for an axis-aligned box. Moves X then Y so the player slides
// along walls, and sub-steps long moves so nothing tunnels through a tile.

export function moveAndCollide(box, dx, dy, isSolid, tile) {
  const maxStep = tile / 2 - 0.01;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / maxStep));
  const sx = dx / steps, sy = dy / steps;
  let hitX = false, hitY = false;
  for (let i = 0; i < steps; i++) {
    if (sx) { const r = sweepAxis(box, sx, 'x', isSolid, tile); box.x = r.pos; hitX ||= r.hit; }
    if (sy) { const r = sweepAxis(box, sy, 'y', isSolid, tile); box.y = r.pos; hitY ||= r.hit; }
  }
  return { hitX, hitY };
}

function sweepAxis(box, d, axis, isSolid, tile) {
  const pos = box[axis] + d;
  const x0 = axis === 'x' ? pos : box.x, y0 = axis === 'y' ? pos : box.y;
  const x1 = x0 + box.w, y1 = y0 + box.h;
  const tx0 = Math.floor(x0 / tile), tx1 = Math.floor((x1 - 0.001) / tile);
  const ty0 = Math.floor(y0 / tile), ty1 = Math.floor((y1 - 0.001) / tile);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!isSolid(tx, ty)) continue;
      if (axis === 'x') return { pos: d > 0 ? tx * tile - box.w : (tx + 1) * tile, hit: true };
      return { pos: d > 0 ? ty * tile - box.h : (ty + 1) * tile, hit: true };
    }
  }
  return { pos, hit: false };
}

export function boxesOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
