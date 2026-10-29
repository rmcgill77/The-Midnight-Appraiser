// Traffic on the town's roads (Phase 32): cars, scooters and bikes that drive the streets, in the right-hand
// lane, round the roundabout, into the turning circles and out again, slowing for one another, for you and for
// people on the road. They are scenery with manners: not saved, not part of any rule, spawned just out of sight
// near the player and gone again when they are far away. Pure: no DOM, so it can be tested.
//
// map: { at(tx, ty), cols, rowsN }. Roads are the tiles listed in ROAD.

export const TILE = 16;
export const ROAD = new Set(['=', '+', 'u', 'G']);
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const NAMES = ['right', 'down', 'left', 'up'];

export const KINDS = {
  car: { w: 14, h: 28, speed: [38, 52], radius: 15, weight: 0.62 },
  scooter: { w: 8, h: 16, speed: [34, 44], radius: 9, weight: 0.2 },
  bike: { w: 6, h: 14, speed: [22, 30], radius: 8, weight: 0.18 },
};
export const CAR_COLORS = ['#4a1f24', '#2e3a4a', '#3a3a22', '#4a4f63', '#2a2e38', '#5a4a3a', '#7a3a34', '#24474a', '#c9b98f', '#a3843e'];
export const RIDER_COLORS = ['#a63a34', '#3d63b5', '#4e9a52', '#c8642e', '#c95a8e', '#e6c86a', '#6a3a5e'];

// How busy the roads are through the day: quiet at night, busy at the rush hours.
export function density(minuteOfDay) {
  const h = ((minuteOfDay % 1440) + 1440) % 1440 / 60;
  const bump = (c, w) => Math.exp(-(((h - c) / w) ** 2));
  return Math.max(0.12, Math.min(1, 0.22 + 0.5 * bump(13, 5) + 0.45 * bump(8.3, 1.3) + 0.5 * bump(17.5, 1.5) - (h < 5 || h > 23 ? 0.1 : 0)));
}

class MinHeap {
  constructor() { this.a = []; }
  push(c, v) { const a = this.a; a.push([c, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

// The cheapest way along the roads from one tile to another, keeping to the right: a road tile whose right-hand
// neighbour is also road (so, not the kerb lane) costs more, so two-way traffic sorts itself into two lanes.
// Returns [{ tx, ty }, ...] or null.
export function lanePath(map, from, to, { limit = 14000 } = {}) {
  const W = map.cols, H = map.rowsN, road = (x, y) => x >= 0 && y >= 0 && x < W && y < H && ROAD.has(map.at(x, y));
  const start = from.ty * W + from.tx, goal = to.ty * W + to.tx;
  if (!road(from.tx, from.ty) || !road(to.tx, to.ty)) return null;
  const cost = new Float64Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1);
  const heap = new MinHeap(); cost[start] = 0; heap.push(0, start);
  let n = 0;
  while (heap.size && n++ < limit) {
    const [c, i] = heap.pop();
    if (c > cost[i]) continue;
    if (i === goal) break;
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (!road(nx, ny)) continue;
      const rx = -dy, ry = dx;                                  // the right-hand side of this heading
      const step = 1 + (road(nx + rx, ny + ry) ? 0.7 : 0) + (road(nx - rx, ny - ry) ? 0 : 0.15);
      const j = ny * W + nx, nc = c + step;
      if (nc < cost[j]) { cost[j] = nc; prev[j] = i; heap.push(nc, j); }
    }
  }
  if (prev[goal] < 0 && goal !== start) return null;
  const out = []; for (let i = goal; i !== -1; i = prev[i]) out.push({ tx: i % W, ty: (i / W) | 0 });
  return out.reverse();
}

// A path as a chain of smooth curves (quadratic, between the midpoints of the tile-to-tile steps), so a turn
// is a curve, not a right angle.
// snap(x, y, hx, hy), if given, moves each point onto the right-hand lane of the smooth street it is on (game/street-net.js).
export function curvesOf(path, snap = null) {
  let P = path.map(t => ({ x: t.tx * TILE + TILE / 2, y: t.ty * TILE + TILE / 2 }));
  if (snap) {
    const n0 = P.length;
    P = P.map((p, i) => {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(n0 - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      return snap(p.x, p.y, dx / len, dy / len) ?? p;
    });
  }
  const n = P.length, mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = i === 0 ? P[0] : mid(P[i - 1], P[i]), B = i === n - 1 ? P[n - 1] : mid(P[i], P[i + 1]), C = P[i];
    const len = (Math.hypot(C.x - A.x, C.y - A.y) + Math.hypot(B.x - C.x, B.y - C.y) + Math.hypot(B.x - A.x, B.y - A.y)) / 2;
    if (len > 0.01) out.push({ A, C, B, len });
  }
  return out;
}
const bez = (c, t) => { const u = 1 - t; return { x: u * u * c.A.x + 2 * u * t * c.C.x + t * t * c.B.x, y: u * u * c.A.y + 2 * u * t * c.C.y + t * t * c.B.y, dx: 2 * u * (c.C.x - c.A.x) + 2 * t * (c.B.x - c.C.x), dy: 2 * u * (c.C.y - c.A.y) + 2 * t * (c.B.y - c.C.y) }; };

export class Vehicles {
  constructor(map, rng, { max = 14, snap = null } = {}) {
    this.map = map; this.rng = rng; this.max = max; this.snap = snap; this.list = []; this.nextId = 1; this.spawnT = 0; this.roads = null;
  }

  // Every road tile, for picking spots (built once).
  #roadTiles() {
    if (this.roads) return this.roads;
    const out = [], { cols, rowsN } = this.map;
    for (let y = 0; y < rowsN; y++) for (let x = 0; x < cols; x++) if (ROAD.has(this.map.at(x, y))) out.push({ tx: x, ty: y });
    return (this.roads = out);
  }

  #randomRoad(near, rMin, rMax) {
    const roads = this.#roadTiles();
    for (let i = 0; i < 60; i++) {
      const t = roads[Math.floor(this.rng.next() * roads.length)];
      if (!near) return t;
      const d = Math.hypot(t.tx * TILE - near.x, t.ty * TILE - near.y);
      if (d >= rMin && d <= rMax) return t;
    }
    return null;
  }

  #pickKind(wet) {
    let r = this.rng.next();
    const bikeK = wet ? 0.3 : 1;
    const w = { car: KINDS.car.weight, scooter: KINDS.scooter.weight, bike: KINDS.bike.weight * bikeK };
    const total = w.car + w.scooter + w.bike; r *= total;
    return r < w.car ? 'car' : r < w.car + w.scooter ? 'scooter' : 'bike';
  }

  #route(v, from) {
    for (let k = 0; k < 4; k++) {
      const to = this.#randomRoad({ x: from.tx * TILE, y: from.ty * TILE }, 12 * TILE, 48 * TILE);
      if (!to) continue;
      const path = lanePath(this.map, from, to);
      if (path && path.length > 6) { v.curves = curvesOf(path, this.snap); v.ci = 0; v.t = 0; return true; }
    }
    return false;
  }

  spawn(player, wet = false) {
    const from = this.#randomRoad(player, 17 * TILE, 30 * TILE);
    if (!from) return false;
    const x = from.tx * TILE + 8, y = from.ty * TILE + 8;
    if (this.list.some(o => Math.hypot(o.x - x, o.y - y) < 30)) return false;
    const kind = this.#pickKind(wet), K = KINDS[kind], r = this.rng;
    const v = { id: this.nextId++, kind, x, y, heading: 0, dir: 'right', speed: 0, top: K.speed[0] + r.next() * (K.speed[1] - K.speed[0]), color: kind === 'car' ? r.pick(CAR_COLORS) : r.pick(RIDER_COLORS), moving: false, stuck: 0, patience: 0 };
    if (!this.#route(v, from)) return false;
    const p = bez(v.curves[0], 0); v.heading = Math.atan2(p.dy, p.dx); v.dir = NAMES[Math.round(((v.heading / (Math.PI / 2)) % 4 + 4) % 4) % 4];
    this.list.push(v);
    return true;
  }

  // dt seconds. player: { x, y } (feet); density 0..1; others: [{ x, y }] things on the road to give way to;
  // wet: raining or slushy (fewer bikes, slower).
  update(dt, { player, density: dens = 0.6, others = [], wet = false } = {}) {
    const want = Math.round(this.max * dens);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.list.length < want && player) { this.spawnT = 0.4; this.spawn(player, wet); }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const v = this.list[i];
      if (player && Math.hypot(v.x - player.x, v.y - player.y) > 36 * TILE || (this.list.length > want + 2 && player && Math.hypot(v.x - player.x, v.y - player.y) > 24 * TILE)) { this.list.splice(i, 1); continue; }
      this.#step(v, dt, player, others, wet);
    }
  }

  #step(v, dt, player, others, wet) {
    const K = KINDS[v.kind], hx = Math.cos(v.heading), hy = Math.sin(v.heading);
    // give way: anything just ahead on my side of the road
    let target = v.top * (wet ? 0.8 : 1);
    const check = (o, always) => {
      const rx = o.x - v.x, ry = o.y - v.y, along = rx * hx + ry * hy, lat = -rx * hy + ry * hx;
      if (along <= 0 || Math.abs(lat) > (always ? 12 : 11)) return;
      const reach = K.radius + (o.radius ?? 9) + 10;
      if (along < reach) target = 0; else if (along < reach + 22) target = Math.min(target, v.top * 0.45);
    };
    if (v.patience <= 0) {
      for (const o of this.list) {
        if (o === v) continue;
        const same = Math.cos(o.heading - v.heading) > 0.7;
        if (same || o.id < v.id) check({ x: o.x, y: o.y, radius: KINDS[o.kind].radius }, false);
      }
      if (player) check({ x: player.x, y: player.y, radius: 8 }, true);
      for (const o of others) check({ x: o.x, y: o.y, radius: 8 }, true);
    } else v.patience -= dt;
    // speed toward target (brakes harder than it accelerates)
    v.speed += Math.max(-dt * 140, Math.min(dt * 60, target - v.speed));
    v.moving = v.speed > 1;
    if (v.speed < 1) { v.stuck += dt; if (v.stuck > 6) { v.patience = 3; v.stuck = 0; } } else v.stuck = 0;
    // along the curves
    let travel = v.speed * dt;
    while (travel > 0 && v.curves) {
      const c = v.curves[v.ci], left = (1 - v.t) * c.len;
      if (travel < left) { v.t += travel / c.len; travel = 0; } else { travel -= left; v.ci++; v.t = 0; if (v.ci >= v.curves.length) { this.#continue(v); break; } }
    }
    if (v.curves && v.ci < v.curves.length) {
      const p = bez(v.curves[v.ci], v.t);
      v.x = p.x; v.y = p.y;
      const want = Math.atan2(p.dy, p.dx);
      let d = want - v.heading; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      v.heading += Math.max(-dt * 6, Math.min(dt * 6, d));
      v.dir = NAMES[Math.round((((v.heading / (Math.PI / 2)) % 4) + 4) % 4) % 4];
    }
  }

  // The end of a trip: plan another from here.
  #continue(v) {
    const from = { tx: Math.floor(v.x / TILE), ty: Math.floor(v.y / TILE) };
    if (!this.#route(v, from)) v.curves = null;
    if (!v.curves) v.dead = true;
    this.list = this.list.filter(o => !o.dead);
  }

  // Headlights for the dark: where each vehicle shines.
  lights() {
    return this.list.filter(v => v.kind !== 'bike').map(v => ({ x: v.x + Math.cos(v.heading) * 22, y: v.y + Math.sin(v.heading) * 22, r: v.kind === 'car' ? 28 : 20 }));
  }
}
