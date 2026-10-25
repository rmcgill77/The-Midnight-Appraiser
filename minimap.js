// The city minimap (Phase 21): the streets around you, always in the corner while you're
// out on the town, with every place marked by its own icon (data/places.js mapIcon) so
// you can tell at a glance what's where. Tap it for the whole city map.

import { iconRects } from '../rules/index.js';
import { frontOf, mapIcon } from '../data/places.js';
import { makeCanvas } from '../engine/sprites.js';

// The colors of the map, by tile (shared with the full city map).
export function cityColor(ch) {
  return { '=': '#14161b', '+': '#14161b', ',': '#2c3039', '"': '#1f2b22', t: '#22382a', p: '#181a20', c: '#3a3d48', v: '#3a3d48', L: '#2c3039', b: '#1f2b22', X: '#0c140f', o: '#1a1214', O: '#e0a64a', Q: '#3d63b5',
    // v2.2: the river, the square, the districts' own ground, the park gate.
    '~': '#1d3a52', u: '#5a4430', P: '#46423f', F: '#3a6a86', B: '#46423f', T: '#22382a', f: '#5a3a3a', i: '#6a675e', y: '#26242c', z: '#26242c', x: '#26242c', q: '#4a463f', G: '#7a9a6a', l: '#1f2b22', d: '#6a5038', s: '#5a5338', '}': '#4a4430', '>': '#c9a24a', '%': '#8a6a3a', '&': '#8a6a3a' }[ch]
    ?? ({ a: '#4a2a26', w: '#24393a', k: '#2c3448', e: '#4a3a22', n: '#33263f', h: '#2a3430' }[ch.toLowerCase()] ?? '#3b2622');
}

// The whole city at one pixel a tile, painted once.
export function cityPixels(layout) {
  const W = layout.rows[0].length, H = layout.rows.length;
  const cv = makeCanvas(W, H), g = cv.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = layout.rows[y][x];
    // Fronts a shade darker than roofs, so blocks read as buildings.
    g.fillStyle = ch !== ch.toLowerCase() && !'OXLQPFBTG'.includes(ch) ? '#191a20' : cityColor(ch);
    g.fillRect(x, y, 1, 1);
  }
  return cv;
}

// A place's badge: its icon, in its sign color, on a dark plate. s: pixels per icon pixel.
export function drawBadge(g, loc, cx, cy, s = 1) {
  const f = frontOf(loc), half = 10 * s;
  g.fillStyle = '#07080c'; g.fillRect(cx - half - s, cy - half - s, (half + s) * 2, (half + s) * 2);
  g.fillStyle = f.sign; g.fillRect(cx - half, cy - half, half * 2, half * 2);
  g.fillStyle = '#12141a'; g.fillRect(cx - half + s, cy - half + s, half * 2 - 2 * s, half * 2 - 2 * s);
  g.fillStyle = f.sign;
  for (const [x, y, w] of iconRects(mapIcon(loc))) g.fillRect(cx - 8 * s + x * s, cy - 8 * s + y * s, w * s, s);
}

export class Minimap {
  // el: a <button> with a <canvas> in it. places: [{ loc, door: {tx, ty} }].
  constructor(el, layout, places, onOpen) {
    this.el = el; this.cv = el.querySelector('canvas'); this.g = this.cv.getContext('2d');
    this.layout = layout; this.places = places; this.base = null;
    this.tile = 4;            // CSS pixels a tile
    this.last = '';
    el.addEventListener('click', e => { e.stopPropagation(); onOpen?.(); });
    el.addEventListener('pointerdown', e => e.stopPropagation());
  }

  show(on) { if (this.el.hidden === on) this.el.hidden = !on; if (!on) this.last = ''; }

  // Redraw when you've moved, or the size changed.
  // marks: [{ tx, ty, color }] — something happening on the street (Phase 22).
  draw(px, py, facing, marks = []) {
    const cssW = this.el.clientWidth, cssH = this.el.clientHeight;
    if (!cssW || !cssH) return;
    const dpr = Math.min(3, globalThis.devicePixelRatio || 1);
    const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
    const key = `${Math.round(px / 4)},${Math.round(py / 4)},${facing},${W},${H},${marks.map(m => `${m.tx}.${m.ty}`).join('|')}`;
    if (key === this.last) return;
    this.last = key;
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; }
    this.base ??= cityPixels(this.layout);
    const g = this.g, s = this.tile * dpr;              // device pixels a tile
    const ptx = px / 16, pty = py / 16;                 // where you are, in tiles
    const ox = W / 2 - ptx * s, oy = H / 2 - pty * s;   // tile (0,0) on the canvas
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#0a0b10'; g.fillRect(0, 0, W, H);
    g.drawImage(this.base, ox, oy, this.base.width * s, this.base.height * s);
    // Every place, by its icon (the ones just off the edge still peek in).
    const k = Math.max(1, Math.round(dpr * 0.75));
    // Bus stops first (smaller), so places sit on top of them.
    const sorted = [...this.places].sort((a, b) => (b.small ? 1 : 0) - (a.small ? 1 : 0));
    for (const { loc, door, small } of sorted) {
      const x = ox + (door.tx + 0.5) * s, y = oy + (door.ty - 1) * s;
      if (x < -20 * k || y < -20 * k || x > W + 20 * k || y > H + 20 * k) continue;
      drawBadge(g, loc, Math.round(x), Math.round(y), small ? Math.max(1, Math.round(k * 0.6)) : k);
    }
    for (const mk of marks) {
      const x = Math.round(ox + (mk.tx + 0.5) * s), y = Math.round(oy + (mk.ty + 0.5) * s), rr = Math.round(4 * dpr);
      g.fillStyle = '#07080c'; g.fillRect(x - rr - 1, y - rr - 1, rr * 2 + 2, rr * 2 + 2);
      g.fillStyle = mk.color ?? '#e0a64a'; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      g.fillStyle = '#07080c'; g.fillRect(x - 1, y - rr + 2, 2, rr); g.fillRect(x - 1, y + rr - 3, 2, 2);
    }
    // You: an arrow the way you're facing.
    const cx = W / 2, cy = H / 2, r = 5 * dpr;
    const ang = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[facing] ?? Math.PI / 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(ang) * r * 1.4, cy + Math.sin(ang) * r * 1.4);
    g.lineTo(cx + Math.cos(ang + 2.4) * r, cy + Math.sin(ang + 2.4) * r);
    g.lineTo(cx + Math.cos(ang - 2.4) * r, cy + Math.sin(ang - 2.4) * r);
    g.closePath();
    g.fillStyle = '#9fd08a'; g.fill(); g.lineWidth = Math.max(1, dpr); g.strokeStyle = '#07080c'; g.stroke();
  }
}
