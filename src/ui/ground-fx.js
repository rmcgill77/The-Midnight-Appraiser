// The weather on the ground (Phase 30), drawn in the world: the streets darken and shine when they're wet,
// puddles stand (with ripples while it rains), and snow lies on the grass, the paving, the roads and the
// roofs. It is painted onto the map tiles in world space, so it stays put as you walk, before the people
// and the light are drawn on top. A placeholder look: Phase 32's tile art will give it its finished form.

const ROAD = new Set('=+');                 // road, crossing
const WALK = new Set(',Pu');                // sidewalk, paving, bridge
const PARKED = new Set('pcvy');             // parking, cars (they get snow on the ground only), alley cobbles
const GRASS = new Set('"q');                // grass, campus path
const DOCK = new Set('dG');
const ROOF = new Set('awkenh');             // a roof per district

const mix = n => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return (n ^ (n >>> 16)) >>> 0; };
const unit = (tx, ty, salt = 0) => (mix((tx * 73856093) ^ (ty * 19349663) ^ (salt * 83492791)) % 10000) / 10000;

// ground: { wet, snow, puddles, raining }. tile: tile size in px.
export function drawGroundWeather(ctx, m, camX, camY, w, h, ground, { time = 0, reduced = false, tile = 16 } = {}) {
  const { wet, snow, puddles, raining } = ground;
  if (wet < 0.06 && snow < 0.05) return;
  const tx0 = Math.max(0, Math.floor(camX / tile)), ty0 = Math.max(0, Math.floor(camY / tile));
  const tx1 = Math.min(m.cols - 1, Math.floor((camX + w) / tile)), ty1 = Math.min(m.rowsN - 1, Math.floor((camY + h) / tile));
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ch = m.at(tx, ty);
      const hard = ROAD.has(ch) || WALK.has(ch) || PARKED.has(ch) || DOCK.has(ch), grass = GRASS.has(ch), roof = ROOF.has(ch);
      if (!hard && !grass && !roof) continue;
      const x = tx * tile - camX, y = ty * tile - camY;
      // wet: hard ground goes dark and glossy
      if (wet >= 0.06 && hard) {
        ctx.fillStyle = `rgba(18,28,48,${(wet * 0.3).toFixed(3)})`; ctx.fillRect(x, y, tile, tile);
        if (puddles > 0 && (ROAD.has(ch) || WALK.has(ch)) && unit(tx, ty, 1) < puddles * 0.3) {
          const px = x + 2 + Math.floor(unit(tx, ty, 2) * 5), py = y + 4 + Math.floor(unit(tx, ty, 3) * 6), pw = 5 + Math.floor(unit(tx, ty, 4) * 5);
          ctx.fillStyle = `rgba(120,150,190,${(0.22 + puddles * 0.2).toFixed(3)})`;
          ctx.fillRect(px, py, pw, 3); ctx.fillRect(px + 1, py - 1, pw - 2, 1); ctx.fillRect(px + 1, py + 3, pw - 2, 1);
          ctx.fillStyle = 'rgba(210,226,245,0.22)'; ctx.fillRect(px + 1, py, 2, 1);          // a glint of sky
          if (raining && !reduced) {
            const r = ((time * 1.6 + unit(tx, ty, 5) * 6) % 1);
            ctx.fillStyle = `rgba(200,218,240,${(0.45 * (1 - r)).toFixed(3)})`;
            const cx = px + (pw >> 1), cy = py + 1, rr = 1 + Math.round(r * 3);
            ctx.fillRect(cx - rr, cy, 1, 1); ctx.fillRect(cx + rr, cy, 1, 1); ctx.fillRect(cx, cy - 1, rr > 1 ? 1 : 0, 1);
          }
        }
      }
      // snow: white over everything that isn't a wall, thinner on the roads where traffic wears it away
      if (snow >= 0.05) {
        const k = roof ? 0.8 : ROAD.has(ch) ? 0.45 : grass ? 1 : 0.85;
        const a = Math.min(0.9, snow * 0.95) * k;
        ctx.fillStyle = `rgba(${roof ? '230,236,246' : '236,242,250'},${a.toFixed(3)})`; ctx.fillRect(x, y, tile, tile);
        if (snow > 0.15) {                                                                  // a few drifts and shadows for texture
          ctx.fillStyle = `rgba(250,252,255,${(a * 0.5).toFixed(3)})`;
          for (let i = 0; i < 3; i++) { const sx = x + Math.floor(unit(tx, ty, 10 + i) * 14), sy = y + Math.floor(unit(tx, ty, 20 + i) * 14); ctx.fillRect(sx, sy, 2, 1); }
          ctx.fillStyle = `rgba(150,170,200,${(a * 0.28).toFixed(3)})`;
          const sx = x + Math.floor(unit(tx, ty, 30) * 12), sy = y + Math.floor(unit(tx, ty, 31) * 12); ctx.fillRect(sx, sy + 1, 3, 1);
        }
      }
    }
  }
}
