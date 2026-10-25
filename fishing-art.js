// Fishing on screen (v2.3): the line and the bobber in the water, and The Scales: a brass
// pawn-shop balance over the scene while you bring something in.

const BRASS = '#c9a24a', BRASS_D = '#8a6a2a', BRASS_L = '#ecd28a', INK = '#0c0d12', CREAM = '#e6e3da';
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// The line from your hands to the bobber (screen coordinates). phase: 'cast' (flying out,
// k 0..1), 'wait' (bobbing), 'bite' (pulled under, a "!" over it), 'reel' (taut).
export function drawLine(g, hx, hy, bx, by, phase, t, k = 1) {
  const ex = hx + (bx - hx) * k, ey = hy + (by - hy) * k - (phase === 'cast' ? Math.sin(k * Math.PI) * 18 : 0);
  g.strokeStyle = phase === 'reel' ? 'rgba(230,227,218,0.85)' : 'rgba(230,227,218,0.55)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(hx + 0.5, hy + 0.5);
  if (phase === 'reel') g.lineTo(ex + 0.5, ey + 0.5);
  else g.quadraticCurveTo((hx + ex) / 2, Math.max(hy, ey) + 6, ex + 0.5, ey + 0.5);
  g.stroke();
  if (phase === 'reel') {
    // Where the line goes in: rings on the water.
    const r = 3 + (t * 8) % 5;
    g.strokeStyle = 'rgba(230,227,218,0.35)'; g.beginPath(); g.ellipse(ex, ey + 1, r, r / 2, 0, 0, Math.PI * 2); g.stroke();
    return;
  }
  const bob = phase === 'wait' ? Math.round(Math.sin(t * 3) * 1) : phase === 'bite' ? 2 : 0;
  R(g, ex - 2, ey - 3 + bob, 4, 3, '#c0392b'); R(g, ex - 2, ey + bob, 4, 2, CREAM); R(g, ex - 1, ey - 4 + bob, 2, 1, INK);
  if (phase === 'bite') {
    g.strokeStyle = 'rgba(230,227,218,0.5)'; g.beginPath(); g.ellipse(ex, ey + 2, 6, 3, 0, 0, Math.PI * 2); g.stroke();
    R(g, ex - 3, ey - 22, 7, 12, INK); R(g, ex - 2, ey - 21, 5, 10, BRASS); R(g, ex - 1, ey - 20, 3, 6, INK); R(g, ex - 1, ey - 13, 3, 2, INK);
  }
}

// The Scales, centered on the screen's top half. w, h: the screen in game pixels. f: the
// fight (game/fishing.js), heavy: show the tell (a thing, not a fish).
export function drawScales(g, w, h, f, { heavy = false, time = 0 } = {}) {
  const cx = Math.round(w / 2), top = Math.max(18, Math.round(h * 0.12)), bw = Math.min(150, Math.round(w * 0.42));
  // A plate behind it.
  g.fillStyle = 'rgba(7,8,12,0.78)'; g.fillRect(cx - bw / 2 - 18, top - 8, bw + 36, 92);
  R(g, cx - bw / 2 - 18, top - 8, bw + 36, 1, BRASS_D); R(g, cx - bw / 2 - 18, top + 83, bw + 36, 1, BRASS_D);
  // The balanced zone on the dial: an arc under the beam's pivot.
  const py = top + 20, ang = f.angle * 0.42;
  const dialR = 34;
  for (let a = -0.42; a <= 0.42; a += 0.01) {
    const inBand = Math.abs(a / 0.42) < f.rod.band;
    R(g, cx + Math.sin(a) * dialR, py + Math.cos(a) * dialR * 0.55 + 8, 1, 2, inBand ? '#4e9a52' : Math.abs(a / 0.42) > 0.88 ? '#a63a34' : '#3a3542');
  }
  // The needle hangs from the pivot and swings with the beam.
  g.strokeStyle = BRASS_L; g.lineWidth = 1; g.beginPath(); g.moveTo(cx + 0.5, py); g.lineTo(cx + Math.sin(ang) * (dialR - 2) + 0.5, py + Math.cos(ang) * (dialR - 2) * 0.55 + 8); g.stroke();
  // The post and the base.
  R(g, cx - 2, py, 4, 50, BRASS_D); R(g, cx - 1, py, 2, 50, BRASS); R(g, cx - 16, py + 48, 32, 4, BRASS_D); R(g, cx - 14, py + 47, 28, 2, BRASS);
  // The beam, tilted.
  const half = bw / 2, dy = Math.sin(ang) * half;
  g.strokeStyle = BRASS; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - half, py - dy); g.lineTo(cx + half, py + dy); g.stroke();
  g.strokeStyle = BRASS_L; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - half, py - dy - 1); g.lineTo(cx + half, py + dy - 1); g.stroke();
  R(g, cx - 3, py - 4, 6, 6, BRASS_L); R(g, cx - 1, py - 2, 2, 2, INK);
  // The pans, on chains. The catch sits in one, your weight in the other.
  const pan = (x, y, load) => {
    g.strokeStyle = BRASS_D; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 10, y + 16); g.moveTo(x, y); g.lineTo(x + 10, y + 16); g.stroke();
    R(g, x - 13, y + 16, 26, 3, BRASS); R(g, x - 11, y + 19, 22, 2, BRASS_D);
    if (load === 'catch') { R(g, x - 6, y + 11, 12, 5, heavy ? '#4a4f63' : '#3d6a7a'); if (!heavy) R(g, x + 6, y + 12, 3, 3, '#3d6a7a'); }
    if (load === 'you') for (let i = 0; i < 3; i++) R(g, x - 7 + i * 5, y + 12 - i % 2 * 2, 4, 4, BRASS_D);
  };
  const catchLeft = f.force < 0;
  pan(cx - half, py - dy, catchLeft ? 'catch' : 'you');
  pan(cx + half, py + dy, catchLeft ? 'you' : 'catch');
  // Reeled in so far, and how close the line is to going.
  const bx = cx - bw / 2, by = top + 70;
  R(g, bx, by, bw, 4, '#1c1e26'); R(g, bx, by, Math.round(bw * f.reel), 4, '#4e9a52');
  if (f.strain > 0.02) { R(g, bx, by + 6, bw, 2, '#1c1e26'); R(g, bx, by + 6, Math.round(bw * Math.min(1, f.strain)), 2, f.strain > 0.6 && Math.floor(time * 8) % 2 ? CREAM : '#a63a34'); }
}
