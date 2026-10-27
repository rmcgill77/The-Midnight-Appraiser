// Rearranging (Phase 24 for the shop floor, Phase 27 for the apartment too): a cursor on
// the floor plan, one piece in your hands at a time. Pick up a piece; put it down anywhere
// it fits (the kit says where that is, and why not: game/shop-layout.js `shopKit`,
// game/home.js `homeKit`). On the shop floor, whatever's on display in a case goes with
// the case. The game waits while you do this.

import { shopKit } from './shop-layout.js';
import { decorDef } from '../data/decor.js';

const key = (x, y) => `${x},${y}`;
export const PIECE_NAME = { case: 'display case', till: 'till', register: 'register' };
export const pieceName = p => (p.kind === 'decor' ? decorDef(p.id)?.name.toLowerCase() : PIECE_NAME[p.kind]);

export class Arranger {
  constructor() { this.on = false; this.hand = null; this.cursor = { tx: 0, ty: 0 }; this.size = { w: 26, h: 14 }; this.kit = null; }

  start(world, cursor, size = this.size, kit = null) {
    this.world = world; this.size = size; this.kit = kit ?? shopKit(world);
    this.on = true; this.hand = null; this.moved = 0;
    this.cursor = { ...cursor };
    this.clamp();
  }

  get layout() { return this.kit.layout(); }
  get where() { return this.kit.name; }

  clamp() {
    this.cursor.tx = Math.max(1, Math.min(this.size.w - 2, this.cursor.tx));
    this.cursor.ty = Math.max(this.kit?.minRow ?? 1, Math.min(this.size.h - 2, this.cursor.ty));
  }
  step(dx, dy) { this.cursor.tx += dx; this.cursor.ty += dy; this.clamp(); }
  point(tx, ty) { this.cursor = { tx, ty }; this.clamp(); }

  // What the cursor's over, and whether what you're holding could go there.
  under() { return this.kit.pieceAt(this.layout, this.cursor.tx, this.cursor.ty); }
  why() { return this.hand ? this.kit.whyNot(this.layout, this.hand, this.cursor.tx, this.cursor.ty) : null; }

  // Pick up what's under the cursor, or put down what you're holding. Returns
  // { picked } | { placed } | { error } | null (nothing there).
  primary() { return this.hand ? this.put() : this.pick(); }

  pick() {
    const L = this.layout, { tx, ty } = this.cursor;
    const p = this.kit.lift(L, tx, ty);
    if (!p) return null;
    if (p.kind === 'case') { const s = key(tx, ty); p.item = this.world.displays?.[s] ?? null; if (p.item) delete this.world.displays[s]; }
    this.hand = p;
    return { picked: p };
  }

  put(at = this.cursor) {
    if (!this.hand) return null;
    const why = this.kit.whyNot(this.layout, this.hand, at.tx, at.ty);
    if (why) return { error: why };
    const L = this.layout;
    Object.assign(L, this.kit.withPiece(L, this.hand, at.tx, at.ty));
    const p = this.hand;
    if (p.kind === 'case' && p.item) this.world.displays[key(at.tx, at.ty)] = p.item;
    if (!p.from || p.from.tx !== at.tx || p.from.ty !== at.ty) this.moved += 1;
    this.hand = null;
    return { placed: p };
  }

  // Put it back where it came from (or, if it came out of storage, back in storage).
  cancel() {
    const p = this.hand;
    if (!p) return null;
    if (!p.from) { this.kit.store(p.id); this.hand = null; return { stored: p }; }
    const L = this.layout;
    Object.assign(L, this.kit.withPiece(L, p, p.from.tx, p.from.ty));
    if (p.kind === 'case' && p.item) this.world.displays[key(p.from.tx, p.from.ty)] = p.item;
    this.hand = null;
    return { returned: p };
  }

  // Decor in your hands goes into storage.
  store() {
    const p = this.hand;
    if (!p || p.kind !== 'decor') return null;
    this.kit.store(p.id); this.hand = null; this.moved += 1;
    return { stored: p };
  }

  // Take a stored piece out to place it.
  takeOut(id) {
    if (this.hand) this.cancel();
    if (this.layout.decor.length >= this.kit.maxPieces) return { error: `That’s plenty. ${this.kit.maxPieces} pieces is as much as the floor can take.` };
    if (!this.kit.takeStored(id)) return null;
    this.hand = { kind: 'decor', id, from: null };
    return { picked: this.hand };
  }

  finish() { if (this.hand) this.cancel(); this.on = false; const m = this.moved; this.moved = 0; return m; }
}
