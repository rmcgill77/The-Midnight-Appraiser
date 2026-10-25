// The appraiser. Position is the top-left of the 16x16 box the world thinks in; the
// 24x32 figure (Phase 14) is drawn standing on it, so the head and hat overlap whatever
// is behind. Collision uses a small box at the feet.
// Walking runs a 4-frame cycle; standing still, you breathe (two frames, slowly).
// `pose` overrides both: 'appraise', 'carry' or 'ko' (set by the game).

import { moveAndCollide } from '../engine/collision.js';

export class Player {
  constructor(cfg) {
    this.cfg = cfg;
    this.x = 0; this.y = 0;
    this.facing = 'down';
    this.moving = false;
    this.animT = 0; this.frame = 0;
    this.breathT = 0; this.breath = 0;
    this.pose = null;
  }

  place(x, y) { this.x = x; this.y = y; }

  get feet() { const b = this.cfg.box; return { x: this.x + b.ox, y: this.y + b.oy, w: b.w, h: b.h }; }
  get center() { return { x: this.x + 8, y: this.y + 12 }; }

  // Point just in front of the player, used to find what the action button targets.
  get probe() {
    const c = this.center, d = 7;
    return {
      down: { x: c.x, y: c.y + d }, up: { x: c.x, y: c.y - d - 2 },
      left: { x: c.x - d, y: c.y }, right: { x: c.x + d, y: c.y },
    }[this.facing];
  }

  update(dt, move, map) {
    this.moving = move.mag > 0;
    if (this.moving) {
      if (Math.abs(move.x) > Math.abs(move.y) * 1.1) this.facing = move.x > 0 ? 'right' : 'left';
      else if (Math.abs(move.y) > 0) this.facing = move.y > 0 ? 'down' : 'up';
      const sp = this.cfg.speed * (this.speedMul ?? 1) * dt;
      const box = this.feet;
      moveAndCollide(box, move.x * sp, move.y * sp, map.isSolid, map.tile);
      this.x = box.x - this.cfg.box.ox; this.y = box.y - this.cfg.box.oy;
      this.animT += dt * (0.5 + move.mag * 0.5);
      if (this.animT >= this.cfg.walkFrameTime) { this.animT = 0; this.frame = (this.frame + 1) % 4; }
      this.breathT = 0; this.breath = 0;
    } else {
      this.frame = 0; this.animT = 0;
      this.breathT += dt;
      if (this.breathT >= (this.breath ? 0.55 : 0.95)) { this.breathT = 0; this.breath ^= 1; }
    }
  }

  save() { return { x: +this.x.toFixed(2), y: +this.y.toFixed(2), facing: this.facing }; }
  load(d) {
    if (Number.isFinite(d?.x)) this.x = d.x;
    if (Number.isFinite(d?.y)) this.y = d.y;
    if (['up', 'down', 'left', 'right'].includes(d?.facing)) this.facing = d.facing;
    return this;
  }
}
