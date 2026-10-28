// Grid pathfinding (breadth-first, 4-way). Rooms are small, so BFS is plenty
// and always returns a shortest path in tile steps.

export function findPath(from, to, passable, cols, rows) {
  if (from.tx === to.tx && from.ty === to.ty) return [];
  if (!passable(to.tx, to.ty)) return null;
  const key = (x, y) => y * cols + x;
  const prev = new Int32Array(cols * rows).fill(-1);
  const start = key(from.tx, from.ty);
  prev[start] = start;
  const q = [start];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let h = 0; h < q.length; h++) {
    const k = q[h], x = k % cols, y = (k - x) / cols;
    if (x === to.tx && y === to.ty) {
      const out = [];
      for (let c = k; c !== start; c = prev[c]) out.push({ tx: c % cols, ty: Math.floor(c / cols) });
      return out.reverse();
    }
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const nk = key(nx, ny);
      if (prev[nk] !== -1 || !passable(nx, ny)) continue;
      prev[nk] = k; q.push(nk);
    }
  }
  return null;
}
