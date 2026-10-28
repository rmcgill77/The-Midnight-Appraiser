// What you ride on the street (Phase 22), drawn around the player figure. Bikes and
// scooters go in two layers (back: wheels and frame behind you; front: the handlebars
// and the near side in front of you), with you sitting a few pixels higher. The van
// replaces you altogether. x, y: the player's 16x16 box on screen (feet at y + 14).

const IRON = '#0c0d12', TIRE = '#141418', RIM = '#8d93a6', SEAT = '#2a1e16', CHROME = '#c9c2b0', LAMP = '#f6d48a';
const COLORS = { bike: '#8a3a34', trike: '#2e6a5a', ebike: '#2e5a7a', scooter: '#c9a24a', motorcycle: '#3a3a42', van: '#6a5440' };

// How much higher you sit, by kind.
export const SEAT_RISE = { bike: 4, trike: 4, ebike: 4, scooter: 3, motorcycle: 4, van: 0 };

const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
function wheel(g, cx, cy, r, spin) {
  g.fillStyle = TIRE;
  for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
  g.fillStyle = RIM;
  for (let dy = -(r - 2); dy <= r - 2; dy++) { const w = Math.round(Math.sqrt((r - 2) ** 2 - dy * dy)); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
  g.fillStyle = TIRE;
  for (let dy = -(r - 3); dy <= r - 3; dy++) { const w = Math.round(Math.sqrt(Math.max(0, (r - 3) ** 2 - dy * dy))); g.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
  g.fillStyle = RIM; g.fillRect(cx, cy, 1, 1);
  const a = spin * Math.PI / 2, sx = Math.round(Math.cos(a) * (r - 2)), sy = Math.round(Math.sin(a) * (r - 2));
  g.fillRect(cx + sx, cy + sy, 1, 1); g.fillRect(cx - sx, cy - sy, 1, 1);
}
// A line of 1px dots from (x0,y0) to (x1,y1).
function line(g, x0, y0, x1, y1, c, w = 1) {
  g.fillStyle = c;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), w, w);
}

// Behind you. kind: from game/rides.js; f: facing; t: time; moving: wheels turn.
export function drawRideBack(g, kind, x, y, f, t, moving) {
  const col = COLORS[kind] ?? COLORS.bike, spin = moving ? Math.floor(t * 10) % 4 : 0;
  const shadow = () => R(g, x - 6, y + 15, 28, 2, 'rgba(0,0,0,0.4)');
  if (kind === 'van') return;
  if (f === 'left' || f === 'right') {
    const dir = f === 'right' ? 1 : -1, cx = x + 8;
    shadow();
    const rear = cx - dir * 10, front = cx + dir * 10, wy = y + 11;
    if (kind === 'scooter' || kind === 'motorcycle') {
      const big = kind === 'motorcycle';
      wheel(g, rear, wy, big ? 5 : 4, spin); wheel(g, front, wy, big ? 5 : 4, spin);
      return;
    }
    wheel(g, rear, wy, 5, spin);
    if (kind === 'trike') { wheel(g, front, wy, 4, spin); return; }
    wheel(g, front, wy, 5, spin);
    return;
  }
  // Toward you or away: one wheel under you, end on.
  shadow();
  R(g, x + 6, y + 6, 4, 11, TIRE); R(g, x + 7, y + 7, 2, 9, RIM); R(g, x + 7, y + 10, 2, 1, TIRE);
  if (kind === 'trike' && f === 'down') { R(g, x - 2, y + 9, 3, 8, TIRE); R(g, x + 15, y + 9, 3, 8, TIRE); }
  if (f === 'up') {
    // From behind: the handlebars stick out either side of you.
    R(g, x - 1, y + 3, 18, 1, CHROME); R(g, x - 2, y + 2, 2, 3, IRON); R(g, x + 16, y + 2, 2, 3, IRON);
  }
}

// In front of you.
export function drawRideFront(g, kind, x, y, f, t, moving, lit = false) {
  const col = COLORS[kind] ?? COLORS.bike;
  if (kind === 'van') return drawVan(g, x, y, f, t, moving, lit);
  if (f === 'left' || f === 'right') {
    const dir = f === 'right' ? 1 : -1, cx = x + 8, wy = y + 11;
    const rear = cx - dir * 10, front = cx + dir * 10;
    if (kind === 'scooter' || kind === 'motorcycle') {
      const big = kind === 'motorcycle';
      // The body under you: a curved deck (scooter) or a tank and engine (motorcycle).
      if (big) { R(g, Math.min(rear, front) + 3, y + 5, 16, 5, col); R(g, cx - 4, y + 9, 8, 3, '#4a4a52'); R(g, cx - 3, y + 10, 6, 1, CHROME); R(g, rear - dir * 2 - 2, y + 4, 6, 2, SEAT); }
      else { R(g, Math.min(rear, front) + 4, y + 9, 14, 3, col); R(g, rear - 3, y + 5, 7, 5, col); R(g, rear - 3, y + 4, 7, 2, SEAT); }
      line(g, front, wy, front - dir * 3, y - 2, IRON, 2);
      R(g, front - dir * 3 - 2, y - 3, 5, 1, CHROME);
      R(g, front - dir * 1 - 1, y + 1, 3, 2, LAMP);
      return;
    }
    // Bicycles: the frame, the pedals going round, the bars at your hands.
    line(g, rear, wy, cx, wy, col); line(g, rear, wy, cx - dir * 2, y + 4, col); line(g, cx, wy, front - dir * 2, y + 3, col, 1);
    line(g, cx - dir * 2, y + 4, front - dir * 2, y + 3, col);
    line(g, front, wy, front - dir * 3, y + 1, CHROME);
    R(g, front - dir * 3 - 2, y, 4, 1, IRON);
    const p = moving ? Math.floor(t * 8) % 4 : 0, pdx = [3, 0, -3, 0][p], pdy = [0, 3, 0, -3][p];
    R(g, cx + pdx - 1, wy + pdy, 3, 1, IRON); R(g, cx - pdx - 1, wy - pdy, 3, 1, '#2a2c34');
    if (kind === 'trike') { R(g, front - 6, y + 2, 12, 7, '#5a4130'); R(g, front - 6, y + 2, 12, 1, '#7a5a40'); }
    if (kind === 'ebike') { R(g, cx - dir * 6 - 2, y + 6, 5, 3, '#1c2a30'); R(g, cx - dir * 6 - 1, y + 7, 3, 1, '#9fd08a'); }
    return;
  }
  if (f === 'down') {
    // Facing you: the bars across in front, a headlamp, (trike) the bin.
    if (kind === 'trike') { R(g, x - 1, y + 7, 18, 8, '#5a4130'); R(g, x - 1, y + 7, 18, 1, '#7a5a40'); }
    const hy = kind === 'scooter' || kind === 'motorcycle' ? y + 4 : y + 5;
    R(g, x - 2, hy, 20, 1, CHROME); R(g, x - 3, hy - 1, 2, 3, IRON); R(g, x + 17, hy - 1, 2, 3, IRON);
    R(g, x + 6, hy + 1, 4, 3, col); R(g, x + 7, hy + 2, 2, 1, LAMP);
    if (kind === 'scooter' || kind === 'motorcycle') { R(g, x + 3, y + 9, 10, 4, col); R(g, x + 4, y + 10, 8, 1, kind === 'motorcycle' ? CHROME : '#f3e3c0'); }
  } else {
    // From behind: a tail light, the rear fender.
    R(g, x + 5, y + 11, 6, 3, col); R(g, x + 7, y + 12, 2, 1, '#c84a3a');
    if (kind === 'scooter' || kind === 'motorcycle') { R(g, x + 3, y + 8, 10, 4, col); R(g, x + 4, y + 8, 8, 1, SEAT); }
    if (kind === 'ebike') R(g, x + 5, y + 8, 6, 3, '#1c2a30');
  }
}

// Dad's van: side on (left/right) or end on (up/down), centered on your box.
function drawVan(g, x, y, f, t, moving, lit) {
  const col = COLORS.van, dark = '#4a3a2c', win = '#1c2a30', winL = '#2a3e46';
  const bob = moving && Math.floor(t * 12) % 2 ? 1 : 0;
  if (f === 'left' || f === 'right') {
    const dir = f === 'right' ? 1 : -1, x0 = x + 8 - 20, yb = y + 14;
    R(g, x0 - 1, yb + 1, 42, 3, 'rgba(0,0,0,0.45)');
    R(g, x0, yb - 20 - bob, 40, 18, col); R(g, x0, yb - 20 - bob, 40, 2, '#7a6450'); R(g, x0, yb - 6 - bob, 40, 2, dark);
    const nose = dir > 0 ? x0 + 30 : x0;
    R(g, nose, yb - 18 - bob, 10, 7, win); R(g, nose + (dir > 0 ? 1 : 2), yb - 17 - bob, 3, 1, winL);
    for (let i = 0; i < 2; i++) R(g, (dir > 0 ? x0 + 4 : x0 + 14) + i * 11, yb - 17 - bob, 9, 6, win);
    R(g, dir > 0 ? x0 + 40 - 2 : x0, yb - 10 - bob, 2, 2, lit ? LAMP : '#c9b98f');
    R(g, dir > 0 ? x0 : x0 + 38, yb - 10 - bob, 2, 2, '#8a2a2a');
    R(g, x0 + 18, yb - 12 - bob, 2, 1, IRON);
    wheel(g, x0 + 8, yb - 2, 4, moving ? Math.floor(t * 12) % 4 : 0); wheel(g, x0 + 32, yb - 2, 4, moving ? Math.floor(t * 12) % 4 : 0);
    if (lit && dir > 0) { g.fillStyle = 'rgba(246,212,138,0.14)'; g.fillRect(x0 + 40, yb - 12, 18, 6); }
    if (lit && dir < 0) { g.fillStyle = 'rgba(246,212,138,0.14)'; g.fillRect(x0 - 18, yb - 12, 18, 6); }
    return;
  }
  const x0 = x + 8 - 11, yb = y + 15;
  R(g, x0 - 1, yb, 24, 3, 'rgba(0,0,0,0.45)');
  R(g, x0, yb - 28 - bob, 22, 27, col); R(g, x0, yb - 28 - bob, 22, 2, '#7a6450');
  if (f === 'down') {
    R(g, x0 + 2, yb - 22 - bob, 18, 7, win); R(g, x0 + 3, yb - 21 - bob, 4, 1, winL);
    R(g, x0 + 2, yb - 12 - bob, 18, 3, dark); for (let i = 0; i < 4; i++) R(g, x0 + 4 + i * 4, yb - 12 - bob, 2, 3, IRON);
    R(g, x0 + 1, yb - 8 - bob, 3, 2, lit ? LAMP : '#c9b98f'); R(g, x0 + 18, yb - 8 - bob, 3, 2, lit ? LAMP : '#c9b98f');
    if (lit) { g.fillStyle = 'rgba(246,212,138,0.14)'; g.fillRect(x0, yb, 22, 16); }
  } else {
    R(g, x0 + 3, yb - 24 - bob, 16, 8, win); R(g, x0 + 4, yb - 23 - bob, 3, 1, winL);
    R(g, x0 + 10, yb - 24 - bob, 2, 18, dark);
    R(g, x0 + 1, yb - 9 - bob, 3, 2, '#8a2a2a'); R(g, x0 + 18, yb - 9 - bob, 3, 2, '#8a2a2a');
    R(g, x0 + 7, yb - 5 - bob, 8, 2, '#c9b98f');
  }
  R(g, x0 - 1, yb - 4, 3, 4, TIRE); R(g, x0 + 20, yb - 4, 3, 4, TIRE);
}
