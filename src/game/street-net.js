// The street network as smooth curves (Phase 32): the centre line of every street, in tile coordinates, indexed
// for quick queries. Used to paint the roads as true curves (data/city-tiles.js) and the snow on them. Pure.

const SOFT = 5;           // how softly two streets blend (px): the rounding at a junction

// An index of a street network for quick distance queries: its segments in a grid of 64 px cells.
export function buildStreetNet(streets, tile = 16) {
  const segs = [], CELL = 64, cells = new Map();
  streets.forEach((st, si) => {
    let arc = 0;
    for (let k = 0; k + 1 < st.pts.length; k++) {
      const a = st.pts[k], b = st.pts[k + 1], ax = a.x * tile, ay = a.y * tile, bx = b.x * tile, by = b.y * tile, len = Math.hypot(bx - ax, by - ay);
      if (len < 0.01) continue;
      const seg = { si, ax, ay, bx, by, len, arc, hw: st.w * tile / 2, w: st.w };
      const id = segs.push(seg) - 1;
      const reach = seg.hw + 24;
      for (let cx = Math.floor((Math.min(ax, bx) - reach) / CELL); cx <= Math.floor((Math.max(ax, bx) + reach) / CELL); cx++) {
        for (let cy = Math.floor((Math.min(ay, by) - reach) / CELL); cy <= Math.floor((Math.max(ay, by) + reach) / CELL); cy++) {
          const key = cx * 100003 + cy; let l = cells.get(key); if (!l) cells.set(key, l = []); l.push(id);
        }
      }
      arc += len;
    }
  });
  // Zebra crossings: where two streets cross or meet, a crossing over each arm that carries on (a crossing is a row of
  // stripes laid across the street, just outside the junction).
  const crossings = [], crossCells = new Map();
  const distToStreet = (si, px, py) => { let best = Infinity; for (const g of segs) { if (g.si !== si) continue; const dx = g.bx - g.ax, dy = g.by - g.ay; let t = ((px - g.ax) * dx + (py - g.ay) * dy) / (g.len * g.len); t = t < 0 ? 0 : t > 1 ? 1 : t; best = Math.min(best, Math.hypot(px - g.ax - dx * t, py - g.ay - dy * t)); } return best; };
  {
    const seen = [];
    for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i], b = segs[j];
      if (a.si === b.si) continue;
      const rx = a.bx - a.ax, ry = a.by - a.ay, sx = b.bx - b.ax, sy = b.by - b.ay, den = rx * sy - ry * sx;
      if (Math.abs(den) < 1e-6) continue;
      const t = ((b.ax - a.ax) * sy - (b.ay - a.ay) * sx) / den, u = ((b.ax - a.ax) * ry - (b.ay - a.ay) * rx) / den;
      const slack = 0.08;
      if (t < -slack || t > 1 + slack || u < -slack || u > 1 + slack) continue;
      const px = a.ax + rx * t, py = a.ay + ry * t;
      if (seen.some(q => Math.hypot(q.x - px, q.y - py) < 12 && ((q.a === a.si && q.b === b.si) || (q.a === b.si && q.b === a.si)))) continue;
      seen.push({ x: px, y: py, a: a.si, b: b.si });
      for (const [g, other] of [[a, b], [b, a]]) {
        const dx = (g.bx - g.ax) / g.len, dy = (g.by - g.ay) / g.len;
        for (const sgn of [-1, 1]) {
          const reach = other.hw + 16;
          if (distToStreet(g.si, px + sgn * dx * reach, py + sgn * dy * reach) > 5) continue;        // the street stops at the junction on this side
          const off = other.hw + 9, cx = px + sgn * dx * off, cy = py + sgn * dy * off;
          const c = { cx, cy, dx, dy, half: g.hw - 2, depth: 4 };
          const id = crossings.push(c) - 1;
          for (let gx = Math.floor((cx - g.hw) / CELL); gx <= Math.floor((cx + g.hw) / CELL); gx++) for (let gy = Math.floor((cy - g.hw) / CELL); gy <= Math.floor((cy + g.hw) / CELL); gy++) { const k = gx * 100003 + gy; let l = crossCells.get(k); if (!l) crossCells.set(k, l = []); l.push(id); }
        }
      }
    }
  }
  // Is this point a stripe of a crossing?
  function crosswalk(px, py) {
    const ids = crossCells.get(Math.floor(px / CELL) * 100003 + Math.floor(py / CELL));
    if (!ids) return false;
    for (const id of ids) {
      const c = crossings[id], rx = px - c.cx, ry = py - c.cy, along = rx * c.dx + ry * c.dy, across = -rx * c.dy + ry * c.dx;
      if (Math.abs(along) <= c.depth && Math.abs(across) <= c.half) return Math.floor((across + c.half) / 3) % 2 === 0;
    }
    return false;
  }
  const bs = [], bd = [], bsArc = [], bw = [], bhw = [];       // the nearest approach to each street near a point (reused)
  // At a point: f (negative inside the asphalt: px from the edge, blended across streets), and the nearest street's
  // distance, arc position and width (for the lane lines) and how many streets are close.
  function field(px, py) {
    const ids = cells.get(Math.floor(px / CELL) * 100003 + Math.floor(py / CELL));
    if (!ids) return null;
    let n = 0;
    for (let q = 0; q < ids.length; q++) {
      const g = segs[ids[q]], dx = g.bx - g.ax, dy = g.by - g.ay;
      let t = ((px - g.ax) * dx + (py - g.ay) * dy) / (g.len * g.len); t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = px - (g.ax + dx * t), ey = py - (g.ay + dy * t), d = Math.sqrt(ex * ex + ey * ey);
      let k = 0; while (k < n && bs[k] !== g.si) k++;
      if (k === n) { bs[n] = g.si; bd[n] = d; bsArc[n] = g.arc + g.len * t; bw[n] = g.w; bhw[n] = g.hw; n++; }
      else if (d < bd[k]) { bd[k] = d; bsArc[k] = g.arc + g.len * t; }
    }
    if (!n) return null;
    let sum = 0, close = 0, nk = 0, nf = Infinity;
    for (let k = 0; k < n; k++) {
      const fi = bd[k] - bhw[k]; sum += Math.exp(-fi / SOFT);
      if (fi < 6) close++;
      if (fi < nf) { nf = fi; nk = k; }
    }
    return { f: -SOFT * Math.log(sum), d: bd[nk], s: bsArc[nk], w: bw[nk], close };
  }
  return { field, segs, crosswalk, crossings };
}

