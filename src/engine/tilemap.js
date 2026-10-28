// Tile map: parses a room, answers collision queries, and bakes the static
// layers into one offscreen canvas so each frame is a single drawImage.

import { makeCanvas } from './sprites.js';
import { outsideOpen } from '../game/edges.js';

const mix = n => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; };

export class TileMap {
  constructor(room, tileset, tile = 16) {
    this.room = room; this.ts = tileset; this.tile = tile;
    this.rows = room.rows;
    this.cols = room.rows[0].length; this.rowsN = room.rows.length;
    this.rows.forEach((r, i) => {
      if (r.length !== this.cols) throw new Error(`room row ${i} is ${r.length} wide, expected ${this.cols}`);
    });
    this.pxW = this.cols * tile; this.pxH = this.rowsN * tile;
    this.lights = [];
    // Phase 21: tall things (a tree's crown, a lamp's head) stand above their tile. They're
    // drawn with the people, sorted by where they stand, so you can walk behind them.
    this.overs = [];
    this.forEach((ch, tx, ty) => {
      const def = this.def(ch);
      if (def?.light) this.lights.push({ x: tx * tile + 8, y: ty * tile + 4 + (def.lightDy ?? 0), r: def.light, flicker: !!def.flicker });
      if (def?.over) {
        const imgs = [].concat(def.over.img), h = mix((tx * 73856093) ^ (ty * 19349663));
        this.overs.push({ x: tx * tile + (def.over.dx ?? 0), y: ty * tile + (def.over.dy ?? 0), img: imgs[h % imgs.length], sortY: ty * tile - 2 });
      }
    });
  }

  at(tx, ty) {
    if (ty < 0 || ty >= this.rowsN || tx < 0 || tx >= this.cols) return '#';
    return this.rows[ty][tx];
  }
  def(ch) { return this.ts?.defs[ch] ?? null; }
  isSolid = (tx, ty) => {
    if (ty < 0 || ty >= this.rowsN || tx < 0 || tx >= this.cols) return !(this.room.edges && outsideOpen(this.room, tx, ty, this.walkable));
    const d = this.def(this.rows[ty][tx]); return d ? d.solid : true;
  };
  walkable = (tx, ty) => { const d = this.def(this.at(tx, ty)); return d ? !d.solid : false; };

  forEach(fn) {
    for (let ty = 0; ty < this.rowsN; ty++) for (let tx = 0; tx < this.cols; tx++) fn(this.rows[ty][tx], tx, ty);
  }

  // Small rooms bake into one canvas. Big maps (the city) bake lazily in chunks,
  // so a phone never holds one enormous canvas.
  bake() {
    if (this.pxW * this.pxH > 2_000_000) { this.chunks = new Map(); this.chunkPx = 512; return null; }
    const cv = makeCanvas(this.pxW, this.pxH), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    this.#paint(g, 0, 0, this.cols - 1, this.rowsN - 1);
    this.room.decorate?.(g, this, { tx0: 0, ty0: 0, tx1: this.cols - 1, ty1: this.rowsN - 1 });
    this.baked = cv;
    return cv;
  }

  draw(ctx, camX, camY, viewW, viewH) {
    if (this.baked) { ctx.drawImage(this.baked, -camX, -camY); return; }
    const P = this.chunkPx;
    for (let cy = Math.max(0, Math.floor(camY / P)); cy * P < Math.min(this.pxH, camY + viewH); cy++) {
      for (let cx = Math.max(0, Math.floor(camX / P)); cx * P < Math.min(this.pxW, camX + viewW); cx++) {
        ctx.drawImage(this.#chunk(cx, cy), cx * P - camX, cy * P - camY);
      }
    }
  }

  #chunk(cx, cy) {
    const key = cy * 1000 + cx;
    let cv = this.chunks.get(key);
    if (cv) return cv;
    const P = this.chunkPx, n = P / this.tile;
    cv = makeCanvas(P, P);
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.translate(-cx * P, -cy * P);
    const range = { tx0: cx * n, ty0: cy * n, tx1: Math.min(this.cols - 1, cx * n + n - 1), ty1: Math.min(this.rowsN - 1, cy * n + n - 1) };
    this.#paint(g, range.tx0, range.ty0, range.tx1, range.ty1);
    this.room.decorate?.(g, this, range);
    this.chunks.set(key, cv);
    return cv;
  }

  #paint(g, tx0, ty0, tx1, ty1) {
    const t = this.tile, { ts } = this;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const ch = this.rows[ty][tx];
      const x = tx * t, y = ty * t, d = this.def(ch);
      const hash = (tx * 73856093) ^ (ty * 19349663);
      // Self-contained art (city tiles): its own ground, then the tile on top.
      if (d?.art) {
        // `scatter` tiles mix the hash so sparse variants never line up in rows.
        const h = d.scatter ? mix(hash) : Math.abs(hash);
        if (d.ground) g.drawImage(Array.isArray(d.ground) ? d.ground[h % d.ground.length] : d.ground, x, y);
        g.drawImage(Array.isArray(d.art) ? d.art[h % d.art.length] : d.art, x, y);
        continue;
      }
      // Ground under everything that isn't a wall
      if (!d?.wall) g.drawImage(d?.ground ?? ts.floors[Math.abs(hash) % ts.floors.length], x, y);
      if (d?.wall) {
        const below = this.def(this.at(tx, ty + 1));
        const faces = below && !below.wall && !below.inWall && ty + 1 < this.rowsN;
        const pick = list => list[Math.abs(hash) % list.length];
        if (d.shelf && faces) g.drawImage(pick(d.shelfArt ?? ts.shelves), x, y);
        else g.drawImage(faces ? (ts.wallFaces ? pick(ts.wallFaces) : ts.wallFace) : ts.wallTop, x, y);
      } else if (d?.rug) {
        const up = this.def(this.at(tx, ty - 1))?.rug, down = this.def(this.at(tx, ty + 1))?.rug;
        g.drawImage(!up ? ts.rugTop : !down ? ts.rugBottom : ts.rugMid, x, y);
      } else if (d?.prop) {
        g.drawImage(d.prop, x, y);
      }
    }
  }

  // The tall tops in view (see `overs`), for the renderer to sort in with people.
  oversIn(camX, camY, viewW, viewH) {
    return this.overs.filter(o => o.x < camX + viewW && o.x + 40 > camX && o.y < camY + viewH && o.y + 48 > camY);
  }

  // Tiles with an interaction id near a point, nearest first.
  interactablesNear(px, py, range) {
    const t = this.tile, hits = [];
    const tx0 = Math.floor((px - range) / t), tx1 = Math.floor((px + range) / t);
    const ty0 = Math.floor((py - range) / t), ty1 = Math.floor((py + range) / t);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const d = this.def(this.at(tx, ty));
      if (!d?.interact) continue;
      const cx = Math.max(tx * t, Math.min(px, tx * t + t)), cy = Math.max(ty * t, Math.min(py, ty * t + t));
      const dist = Math.hypot(px - cx, py - cy);
      if (dist <= range) hits.push({ id: d.interact, tx, ty, dist });
    }
    return hits.sort((a, b) => a.dist - b.dist);
  }
}
