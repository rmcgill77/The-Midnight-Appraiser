// Mina: the clerk who kept your parents' counter. She walks the shop with you on the
// evening before your first day, then goes back to college. One NPC who can be in
// one room at a time; she walks tile paths like the customers do and turns to face
// you when she's talking.

import { findPath } from '../engine/path.js';
import { SIGNATURE, lookFor, spritesFor } from './people.js';

// A mustard knit cap instead of a fedora, a green work jacket, freckles (people.js).
export const GUIDE_LOOK = SIGNATURE.Mina;
const canBake = () => !(typeof document === 'undefined' && !globalThis.OffscreenCanvas);
export const GUIDE_NAME = 'Mina';

export class Guide {
  // Also used for anyone else who walks the shop on their own (the hired staff), with their own look.
  // A look is a figure.js look (parts); an old-style palette becomes a look seeded from it.
  constructor(speed = 48, look = GUIDE_LOOK) {
    this.sprites = null; this.who = null;
    this.setLook(look);
    this.speed = speed;
    this.room = null; this.visible = false;
    this.x = 0; this.y = 0; this.facing = 'down'; this.frame = 0; this.animT = 0; this.moving = false;
    this.path = []; this.then = null;
  }

  setLook(look) {
    this.look = look && 'build' in look ? look : lookFor(`palette:${JSON.stringify(look)}`);
    this.breathPhase = (this.look.skin * 0.37 + this.look.hair * 0.21) % 1.5;
    if (canBake()) this.sprites = spritesFor(this.look);   // v2.1: shared, so hand-made sheets apply
  }

  get tile() { return { tx: Math.round(this.x / 16), ty: Math.round((this.y + 4) / 16) }; }
  get center() { return { x: this.x + 8, y: this.y + 10 }; }

  place(room, tx, ty, facing = 'down') {
    this.room = room; this.x = tx * 16; this.y = ty * 16 - 4;
    this.facing = facing; this.path = []; this.then = null; this.visible = true;
  }
  hide() { this.visible = false; this.path = []; this.then = null; }

  // Walk to a tile in her current room. `then` runs once when she arrives (or can't).
  walkTo(map, tx, ty, then = null) {
    const from = this.tile;
    const p = findPath(from, { tx, ty }, (x, y) => !map.isSolid(x, y), map.cols, map.rowsN);
    this.path = p ?? [];
    if (p && (this.x !== from.tx * 16 || this.y !== from.ty * 16 - 4)) this.path.unshift(from);
    this.then = then;
    if (!p) this.#arrive();
  }

  #arrive() { const f = this.then; this.then = null; f?.(); }

  update(dt, player) {
    this.moving = false;
    if (!this.visible) return;
    if (this.path.length) {
      const next = this.path[0], gx = next.tx * 16, gy = next.ty * 16 - 4;
      const dx = gx - this.x, dy = gy - this.y, dist = Math.hypot(dx, dy), sp = this.speed * dt;
      if (dist <= sp) { this.x = gx; this.y = gy; this.path.shift(); } else { this.x += dx / dist * sp; this.y += dy / dist * sp; }
      this.moving = true;
      this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      this.animT += dt;
      if (this.animT > 0.12) { this.animT = 0; this.frame = (this.frame + 1) % 4; }
      if (!this.path.length) this.#arrive();
      return;
    }
    this.frame = 0;
    // Standing: keep an eye on you.
    if (player) {
      const dx = player.x - this.x, dy = player.y - this.y;
      if (Math.hypot(dx, dy) < 80) this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
  }

  save() { return { room: this.room, x: this.x, y: this.y, facing: this.facing, visible: this.visible }; }
  load(d) {
    if (!d) { this.room = null; this.visible = false; return; }
    Object.assign(this, { room: d.room ?? null, x: d.x ?? 0, y: d.y ?? 0, facing: d.facing ?? 'down', visible: !!d.visible });
    this.path = []; this.then = null;
  }
}
