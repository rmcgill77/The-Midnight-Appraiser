// People on the street. They walk the sidewalks between random spots so the city
// feels lived in. They don't block anyone and aren't saved. Each one has their own
// face (game/people.js); `dress(i)` gives it. Keepers are the shopkeepers who are out
// while their place is closed: they stay near their own door and you can talk to them.

import { findPath } from '../engine/path.js';

export class Pedestrians {
  constructor(map, walkable, rng, count, dress = null) {
    this.map = map; this.rng = rng; this.list = []; this.dress = dress;
    this.walk = (x, y) => walkable.has(map.at(x, y));
    this.sidewalk = (x, y) => map.at(x, y) === ',';
    for (let i = 0; i < count; i++) {
      const t = this.#randomTile();
      const d = dress?.(i) ?? null;
      this.list.push(this.#person(t, { look: rng.int(0, 5), sprites: d?.sprites ?? null, lookKey: d?.key ?? null }));
    }
  }

  #person(t, extra) {
    return { x: t.tx * 16, y: t.ty * 16 - 4, facing: 'down', frame: 0, animT: 0, moving: false, path: [], wait: this.rng.next() * 4, speed: 22 + this.rng.next() * 12, breathPhase: this.rng.next() * 1.5, ...extra };
  }

  #randomTile(near, r = 24) {
    for (let i = 0; i < 200; i++) {
      const tx = near ? near.tx + this.rng.int(-r, r) : this.rng.int(1, this.map.cols - 2);
      const ty = near ? near.ty + this.rng.int(-Math.ceil(r * 2 / 3), Math.ceil(r * 2 / 3)) : this.rng.int(1, this.map.rowsN - 2);
      if (this.sidewalk(tx, ty)) return { tx, ty };
    }
    return near ?? { tx: 2, ty: 2 };
  }

  // Keepers out on the street: [{ id, name, home: {tx, ty}, sprites, lines }]. Ones no
  // longer out leave; new ones step out of their door.
  setKeepers(list) {
    const want = new Map(list.map(k => [k.id, k]));
    this.list = this.list.filter(p => !p.keeper || want.has(p.keeper.id));
    for (const k of list) {
      if (this.list.some(p => p.keeper?.id === k.id)) continue;
      this.list.push(this.#person(k.home, { keeper: k, sprites: k.sprites, lookKey: k.key, wait: 0.5, speed: 20 }));
    }
  }

  get keepers() { return this.list.filter(p => p.keeper); }

  update(dt) {
    for (const p of this.list) {
      p.moving = false;
      if (p.paused > 0) { p.paused -= dt; continue; }
      if (!p.path.length) {
        p.wait -= dt;
        if (p.wait > 0) continue;
        const from = { tx: Math.round(p.x / 16), ty: Math.round((p.y + 4) / 16) };
        const to = p.keeper ? this.#randomTile(p.keeper.home, 6) : this.#randomTile(from);
        p.path = findPath(from, to, this.walk, this.map.cols, this.map.rowsN) ?? [];
        p.wait = p.keeper ? 2 + this.rng.next() * 4 : 1 + this.rng.next() * 5;
        continue;
      }
      const n = p.path[0], gx = n.tx * 16, gy = n.ty * 16 - 4;
      const dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy), sp = p.speed * dt;
      if (d <= sp) { p.x = gx; p.y = gy; p.path.shift(); } else { p.x += dx / d * sp; p.y += dy / d * sp; }
      p.moving = true;
      p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      p.animT += dt; if (p.animT > 0.14) { p.animT = 0; p.frame = (p.frame + 1) % 4; }
    }
  }
}
