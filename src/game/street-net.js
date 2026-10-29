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
  return { field, segs };
}

