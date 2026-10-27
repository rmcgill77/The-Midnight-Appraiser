// Runs a night zone in real time on top of the original run state (st.run):
// turns the player's movement into original steps cell by cell, moves cryptids
// on a timer, and draws everything the original map knows about: finds, supplies,
// known hazards, the exit, cryptids under your light, and the fog of the unseen.

import { TileMap } from '../engine/tilemap.js';
import { makeCanvas } from '../engine/sprites.js';
import { buildZoneRoom, buildZoneTiles } from '../data/zone-map.js';
import { cryptidSprite, CRYPTID_OFFSET } from './cryptid-art.js';
import { S, iconRects } from '../rules/index.js';
import * as N from '../rules/night.js';
import { CONFIG } from '../config.js';
import { cue } from '../rules/cues.js';

const { DATA } = S;
const K = CONFIG.night.cellTiles, CELL = K * 16;

// Small icon helper: draw an original 16x16 pixel icon in one color.
function icon(ctx, name, x, y, color, shadow = '#07080c') {
  const rects = iconRects(name);
  if (shadow) { ctx.fillStyle = shadow; for (const [rx, ry, w] of rects) ctx.fillRect(x + rx, y + ry + 1, w, 1); }
  ctx.fillStyle = color; for (const [rx, ry, w] of rects) ctx.fillRect(x + rx, y + ry, w, 1);
}

export class ZoneRunner {
  constructor(player) {
    this.player = player; this.tiles = null;
    this.map = null; this.room = null; this.t = 0; this.lastLog = null; this.breathAt = -99; this.ghosts = new Map();
    this.fog = makeCanvas(1, 1);
  }

  // Build the walkable room for the current run (a new run, or a loaded save).
  build(st) {
    const run = st.run, z = S.zoneOf(run.zoneId);
    this.room = buildZoneRoom(run, z, K);
    this.tiles = buildZoneTiles(z.id);
    this.map = new TileMap(this.room, this.tiles, 16);
    this.map.bake();
    this.fog = makeCanvas(run.W, run.H);
    this.ghosts.clear();
    this.lastLog = run.log[0];
    this.timer = N.cryptidInterval(st);
    return this.map;
  }

  cellOfPlayer() {
    const c = this.player.center;
    return { x: Math.floor(c.x / CELL), y: Math.floor((c.y + 2) / CELL) };
  }

  // Put the player in the middle of run.pos (after a flee, or on load).
  snapToRun(st) {
    const p = st.run.pos;
    this.player.place(p.x * CELL + (CELL - 16) / 2, p.y * CELL + (CELL - 16) / 2 - 6);
  }

  // Returns events for main: { encounter, knockout, notes[] }.
  update(st, dt) {
    const run = st.run, out = { notes: [] };
    if (!run || run.encounter) return out;
    this.t += dt;

    // The player crossed into new cells: take one original step per cell.
    const cell = this.cellOfPlayer();
    let guard = 0;
    while ((cell.x !== run.pos.x || cell.y !== run.pos.y) && guard++ < 4 && st.run && !st.run.encounter) {
      const dx = Math.sign(cell.x - run.pos.x), dy = Math.sign(cell.y - run.pos.y);
      const tries = dx && dy ? [[dx, 0], [0, dy]] : [[dx, dy]];
      let moved = false;
      for (const [sx, sy] of tries) {
        if (!S.Crawl.open(run, run.pos.x + sx, run.pos.y + sy)) continue;
        const before = st.run;
        const note = N.step(st, sx, sy);
        moved = true;
        if (!st.run) { out.knockout = N.knockedOut(st, before); return out; }
        if (note === 'encounter') out.encounter = true;
        else if (note) out.notes.push(note);
        break;
      }
      if (!moved) break;
    }
    if (out.encounter) return out;

    // Cryptids hunt in real time.
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = N.cryptidInterval(st);
      const r = N.cryptidTick(st);
      if (r === 'encounter') out.encounter = true;
      else if (r === 'breathing' && this.t - this.breathAt > 6) { this.breathAt = this.t; cue('breath'); out.notes.push('Something is breathing nearby.'); }
    }
    if (run.log[0] !== this.lastLog) { this.lastLog = run.log[0]; out.log = run.log[0]; }
    return out;
  }

  // ---------- drawing ----------

  drawObjects(ctx, st, cx, cy, time) {
    const run = st.run, z = S.zoneOf(run.zoneId);
    const ox = (CELL - 16) / 2;
    for (let y = 0; y < run.H; y++) for (let x = 0; x < run.W; x++) {
      if (!run.seen[S.Crawl.idx(run, x, y)]) continue;
      const t = run.tiles[y][x], px = x * CELL - cx + ox, py = y * CELL - cy + ox;
      if (px < -CELL || py < -CELL || px > 2000 || py > 2000) continue;
      if (t.loot) {
        const tw = Math.sin(time * 4 + x * 1.7 + y) > 0.2;
        icon(ctx, 'glint', px, py, tw ? '#f0d48a' : '#e0a64a');
      } else if (t.supply !== undefined) {
        icon(ctx, DATA.supplies[t.supply].icon, px, py, '#9fd08a');
      }
      if (t.hazard !== undefined && t.known) icon(ctx, z.hazardTypes[t.hazard].icon, px, py, '#d0584e');
    }
  }

  // Cryptids you can see, as entities for the y-sorted draw. Positions glide between cells.
  cryptidEntities(st, dt) {
    const run = st.run, lit = S.Crawl.lit(st, run), out = [];
    for (const c of run.cryptids) {
      const gx = c.x * CELL + (CELL - 16) / 2, gy = c.y * CELL + (CELL - 16) / 2 - 4;
      let gh = this.ghosts.get(c.id);
      if (!gh) { gh = { x: gx, y: gy }; this.ghosts.set(c.id, gh); }
      const k = 1 - Math.exp(-10 * dt);
      gh.x += (gx - gh.x) * k; gh.y += (gy - gh.y) * k;
      if (!S.Crawl.visibleCryptid(st, run, lit, c.x, c.y)) continue;
      out.push({ kind: 'cryptid', y: gh.y, e: { x: gh.x, y: gh.y, sid: c.sid, hunting: c.hunting, stun: c.stun } });
    }
    return out;
  }

  drawCryptid(ctx, e, cx, cy, time) {
    const sp = S.Combat.byId(e.sid);
    const bob = Math.round(Math.sin(time * 5 + e.x) * 1.5);
    const x = Math.round(e.x) - cx, y = Math.round(e.y) - cy + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x - 1, y + 15 - bob, 18, 2); ctx.fillRect(x + 1, y + 17 - bob, 14, 1);
    // Phase 15: the original's icon, filled out and drawn at twice the size (game/cryptid-art.js).
    ctx.drawImage(cryptidSprite(sp.icon, e.stun > 0 ? 'stun' : e.hunting ? 'hunt' : 'roam'), x + CRYPTID_OFFSET.x, y + CRYPTID_OFFSET.y);
  }

  // The fog: unseen cells are black, seen cells dim, your light reveals what's around you.
  drawFog(ctx, st, cx, cy) {
    const run = st.run, lit = S.Crawl.lit(st, run), r = S.Crawl.radius(st);
    const g = this.fog.getContext('2d'), img = g.createImageData(run.W, run.H);
    for (let y = 0; y < run.H; y++) for (let x = 0; x < run.W; x++) {
      const i = S.Crawl.idx(run, x, y), d = lit.get(i);
      let a;
      if (d !== undefined && st.battery > 0) a = Math.min(0.55, (d / (r + 0.6)) ** 2 * 0.55);
      else if (d !== undefined) a = 0.5;
      else a = run.seen[i] ? 0.74 : 0.97;
      const o = i * 4; img.data[o] = 4; img.data[o + 1] = 5; img.data[o + 2] = 10; img.data[o + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fog, -cx, -cy, run.W * CELL, run.H * CELL);
    ctx.restore();
    // A warm edge to the flashlight.
    if (st.battery > 0) {
      const pc = this.player.center, R = (r + 0.5) * CELL;
      const gr = ctx.createRadialGradient(pc.x - cx, pc.y - cy, 0, pc.x - cx, pc.y - cy, R);
      gr.addColorStop(0, 'rgba(224,166,74,0.10)'); gr.addColorStop(1, 'rgba(224,166,74,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(pc.x - cx - R, pc.y - cy - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over';
    }
  }
}

export const ZONE_CELL = CELL;
