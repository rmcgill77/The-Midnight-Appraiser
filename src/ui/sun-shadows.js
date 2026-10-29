// The sun's shadows on the street (Phase 32): buildings, trees and lamps cast long shadows at the ends of
// the day and short ones at noon, falling west in the morning and east in the evening, fading as the sun
// goes and as cloud thickens. Drawn onto the ground in world space, under the people and the light.
// sun: { dir, len, strength } from game/skylight.js.

const TILE = 16;

// Length in pixels of a building's shadow, capped so the evening ones stay inside the street.
export const shadowLength = (sun, height = 22) => Math.min(58, Math.round(height * sun.len));

export function drawSunShadows(ctx, m, camX, camY, w, h, sun, { cloud = 0, wetness = 0 } = {}) {
  const ts = m.ts;
  if (!ts?.mass || !sun || sun.strength < 0.05) return;
  const a = Math.min(0.2, 0.18 * sun.strength * (1 - cloud * 0.85) * (1 - wetness * 0.6));
  if (a < 0.02) return;
  const side = sun.dir < 0 ? -1 : 1;                       // the way shadows fall along the street
  const L = shadowLength(sun), north = Math.round(L * (1 - Math.abs(sun.dir)) * 0.7);
  const tx0 = Math.max(0, Math.floor((camX - L) / TILE)), ty0 = Math.max(0, Math.floor((camY - north) / TILE));
  const tx1 = Math.min(m.cols - 1, Math.floor((camX + w + L) / TILE)), ty1 = Math.min(m.rowsN - 1, Math.floor((camY + h) / TILE));
  const open = (tx, ty) => { const c = m.at(tx, ty); return !ts.mass.has(c) && c !== '#'; };
  const fade = (x0, y0, x1, y1, horizontal, towardsEnd) => {
    const g = horizontal ? ctx.createLinearGradient(towardsEnd ? x0 : x1, 0, towardsEnd ? x1 : x0, 0) : ctx.createLinearGradient(0, y1, 0, y0);
    g.addColorStop(0, `rgba(6,10,24,${a.toFixed(3)})`); g.addColorStop(0.45, `rgba(6,10,24,${(a * 0.5).toFixed(3)})`); g.addColorStop(1, 'rgba(6,10,24,0)');
    ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  };
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ch = m.at(tx, ty), x = tx * TILE - camX, y = ty * TILE - camY;
      if (ts.mass.has(ch)) {
        if (open(tx + side, ty)) {
          // shadow runs out from this edge
          const ex = side > 0 ? x + TILE : x;
          if (side > 0) fade(ex, y, ex + L, y + TILE, true, true); else fade(ex - L, y, ex, y + TILE, true, false);
        }
        if (north > 3 && open(tx, ty - 1)) fade(x, y - north, x + TILE, y, false, false);
      } else if (ts.trees?.has(ch)) {
        // a crown's shadow: an ellipse thrown along the ground
        const bx = x + 8, by = y + 13, len = Math.min(34, 6 + L * 0.45);
        ctx.fillStyle = `rgba(6,10,24,${(a * 0.85).toFixed(3)})`;
        ctx.beginPath(); ctx.ellipse(bx + side * len * 0.5, by - north * 0.25, len * 0.5 + 5, 4 + north * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      } else if (ts.posts?.has(ch)) {
        ctx.fillStyle = `rgba(6,10,24,${(a * 0.8).toFixed(3)})`;
        const len = Math.min(40, 5 + L * 0.5);
        for (let i = 0; i < len; i += 2) ctx.fillRect(Math.round(x + 8 + side * i), Math.round(y + 14 - north * 0.3 * (i / len)), 2, 1);
      }
    }
  }
}

// A person's shadow: a blob under the feet by night and at noon; thrown along the ground when the sun is low.
export function drawFigureShadow(ctx, footX, footY, sun) {
  if (!sun || sun.strength < 0.15 || sun.len < 0.8) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(footX - 6, footY, 12, 2); ctx.fillRect(footX - 7, footY + 1, 14, 1);
    return;
  }
  const side = sun.dir < 0 ? -1 : 1, len = Math.min(26, Math.round(5 + sun.len * 5)), a = 0.32 * sun.strength + 0.08;
  ctx.fillStyle = `rgba(6,10,24,${a.toFixed(3)})`;
  ctx.beginPath(); ctx.ellipse(footX + side * len * 0.45, footY + 1.5, len * 0.5 + 4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
}
