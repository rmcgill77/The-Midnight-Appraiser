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

// ---------- snow ----------
// Snow is not a white square. Each kind of ground has a texture 128 px across (it tiles seamlessly, and each map tile
// draws its own part of it, so the patches run on from tile to tile) of soft blobs of snow at nine depths: the snow
// builds from the hollows and melts first from the high places, leaving drifts. The shaded underside and lit top of
// each clump are drawn in. Roads are kept thinner down the middle (the traffic wears it clear) with banks along the
// curbs.
const LEVELS = 9, SIZE = 128;
const textures = new Map();
const SNOW = { lit: '#f6f9fc', body: '#e8eff6', under: '#b4c2d6', deep: '#9aaac4' };
let noise = null, quantiles = null;
function baseNoise() {
  if (noise) return noise;
  noise = new Float32Array(SIZE * SIZE);
  const lat = (o, i, j) => unit(((i % (SIZE / o)) + SIZE / o) % (SIZE / o), ((j % (SIZE / o)) + SIZE / o) % (SIZE / o), o * 13 + 5);
  const sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    let v = 0;
    for (const [o, wgt] of [[32, 0.5], [16, 0.3], [8, 0.2]]) {
      const fx = x / o, fy = y / o, i = Math.floor(fx), j = Math.floor(fy), tx = sm(fx - i), ty = sm(fy - j);
      const a = lat(o, i, j), b = lat(o, i + 1, j), c = lat(o, i, j + 1), d = lat(o, i + 1, j + 1);
      v += wgt * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
    }
    noise[y * SIZE + x] = v;
  }
  quantiles = [...noise].sort((p, q) => p - q);
  return noise;
}
const COVER = { grass: 1.04, hard: 1.0, bank: 1.04, plowed: 0.5, roof: 1.04 };   // (the kinds share one noise, so each is the other's patches, grown or shrunk: no seams where they meet)
function snowTexture(kind, level) {
  const key = `${kind}:${level}`;
  let cv = textures.get(key);
  if (cv) return cv;
  const n = baseNoise(), shift = 0;
  cv = document.createElement('canvas'); cv.width = SIZE; cv.height = SIZE;
  const g = cv.getContext('2d');
  const cover = Math.min(1.2, (level / (LEVELS - 1)) * COVER[kind]);
  const thr = cover >= 1 ? 9 : quantiles[Math.max(0, Math.min(SIZE * SIZE - 1, Math.floor(cover * SIZE * SIZE) - 1))];
  const at = (x, y) => n[(((y + shift) % SIZE + SIZE) % SIZE) * SIZE + (((x + shift * 2) % SIZE + SIZE) % SIZE)];
  const on = (x, y) => at(x, y) <= thr;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (!on(x, y)) continue;
    const col = !on(x, y + 1) ? SNOW.under : !on(x - 1, y) || !on(x, y - 1) ? SNOW.lit : SNOW.body;
    g.fillStyle = (x * 31 + y * 17) % 23 === 0 ? SNOW.deep : (x * 13 + y * 7) % 29 === 0 ? SNOW.lit : col;
    g.fillRect(x, y, 1, 1);
  }
  textures.set(key, cv);
  return cv;
}

// ---------- puddles ----------
const puddleSpots = new Map();
// Where, if anywhere, a puddle sits in this tile: low places by the curb and in the worn middle of the pavement.
function puddleAt(m, tx, ty, net, density) {
  const key = ty * 4096 + tx;
  let p = puddleSpots.get(key);
  if (p === undefined) {
    p = null;
    if (unit(tx, ty, 1) < 0.2) {
      let px = tx * 16 + 3 + Math.floor(unit(tx, ty, 2) * 8), py = ty * 16 + 4 + Math.floor(unit(tx, ty, 3) * 7);
      const F = net?.field(px + 3, py + 2);
      // on a road: down by the gutter (the first few px inside the curb); on pavement: anywhere clear of the curb
      if (!net || !F || (F.f < -2.5 && F.f > -11) || F.f > 6) p = { x: px, y: py, w: 6 + Math.floor(unit(tx, ty, 4) * 8), h: 3 + Math.floor(unit(tx, ty, 6) * 3), rank: unit(tx, ty, 7) };
    }
    puddleSpots.set(key, p);
  }
  return p && p.rank < density ? p : null;
}
function drawPuddle(ctx, p, x, y, wet, raining, reduced, time, sky) {
  const px = x + (p.x & 15), py = y + (p.y & 15), w = p.w, h = p.h, grow = Math.min(1, 0.5 + wet * 0.5);
  const ww = Math.max(3, Math.round(w * grow)), hh = Math.max(2, Math.round(h * grow));
  // an irregular pool: an ellipse with a darker rim, the sky mirrored in it
  const tint = sky?.rgb ? sky.rgb : [120, 150, 190], skyA = sky ? Math.min(0.6, 0.38 + sky.alpha * 0.3) : 0.4;
  ctx.fillStyle = 'rgba(14,22,38,0.3)';
  for (let j = -hh; j <= hh; j++) { const half = Math.round(ww * Math.sqrt(Math.max(0, 1 - (j / (hh + 0.6)) ** 2)) / 2 * (1 + (((p.x + j * 5) & 3) - 1.5) * 0.06)); ctx.fillRect(px + ww / 2 - half - 1, py + hh + j, half * 2 + 2, 1); }
  ctx.fillStyle = `rgba(${Math.round(130 + tint[0] * 0.2)},${Math.round(160 + tint[1] * 0.2)},${Math.round(196 + tint[2] * 0.2)},${skyA.toFixed(3)})`;
  for (let j = -hh + 1; j <= hh - 1; j++) { const half = Math.round(ww * Math.sqrt(Math.max(0, 1 - (j / (hh + 0.6)) ** 2)) / 2); ctx.fillRect(px + ww / 2 - half, py + hh + j, half * 2, 1); }
  ctx.fillStyle = 'rgba(224,236,250,0.4)'; ctx.fillRect(px + 2, py + hh - 1, Math.max(1, ww >> 2), 1);          // a glint
  if (raining && !reduced) {
    const r = ((time * 1.5 + p.rank * 6) % 1);
    ctx.fillStyle = `rgba(204,222,244,${(0.5 * (1 - r)).toFixed(3)})`;
    const cx = px + (ww >> 1), cy = py + hh, rr = 1 + Math.round(r * (ww / 2 - 1));
    ctx.fillRect(cx - rr, cy, 1, 1); ctx.fillRect(cx + rr, cy, 1, 1); ctx.fillRect(cx - (rr >> 1), cy - 1, 1, 1); ctx.fillRect(cx + (rr >> 1), cy + 1, 1, 1);
  }
}

// ground: { wet, snow, puddles, raining }. tile: tile size in px. net: the street net (game/street-net.js), if any.
export function drawGroundWeather(ctx, m, camX, camY, w, h, ground, { time = 0, reduced = false, tile = 16, lights = [], night = 0, sky = null, net = null } = {}) {
  const { wet, snow, puddles, raining } = ground;
  if (wet < 0.06 && snow < 0.05) return;
  if (wet >= 0.06) drawReflections(ctx, m, camX, camY, w, h, wet, { time, reduced, tile, lights, night, sky });
  const tx0 = Math.max(0, Math.floor(camX / tile)), ty0 = Math.max(0, Math.floor(camY / tile));
  const tx1 = Math.min(m.cols - 1, Math.floor((camX + w) / tile)), ty1 = Math.min(m.rowsN - 1, Math.floor((camY + h) / tile));
  const level = Math.max(0, Math.min(LEVELS - 1, Math.round(snow * (LEVELS - 1))));
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const ch = m.at(tx, ty);
      const hard = ROAD.has(ch) || WALK.has(ch) || PARKED.has(ch) || DOCK.has(ch), grass = GRASS.has(ch), roof = ROOF.has(ch);
      if (!hard && !grass && !roof) continue;
      const x = tx * tile - camX, y = ty * tile - camY;
      // wet: hard ground goes dark and glossy; puddles stand in the low places
      if (wet >= 0.06 && hard) {
        ctx.fillStyle = `rgba(18,28,48,${(wet * 0.3).toFixed(3)})`; ctx.fillRect(x, y, tile, tile);
        if (puddles > 0 && (ROAD.has(ch) || WALK.has(ch))) {
          const p = puddleAt(m, tx, ty, net, puddles);
          if (p) drawPuddle(ctx, p, x, y, wet, raining, reduced, time, sky);
        }
      }
      // snow
      if (level >= 1) {
        let kind = roof ? 'roof' : grass ? 'grass' : 'hard';
        if (ROAD.has(ch)) {
          const F = net?.field(tx * 16 + 8, ty * 16 + 8);
          kind = !F ? 'plowed' : F.f < -9 ? 'plowed' : F.f > 4 ? 'hard' : 'bank';                // the middle is worn clear, the edges banked up
        }
        ctx.drawImage(snowTexture(kind, level), (tx * 16) % SIZE, (ty * 16) % SIZE, 16, 16, x, y, 16, 16);
      }
    }
  }
}

// Phase 32: wet streets mirror what is above them. Under each lamp a streak of light stretches down the
// pavement and shimmers; at dawn and dusk the whole wet street picks up a wash of the sky's colour.
// lights: world-space { x, y, r } (the map's lamps); night: 0..1; sky: { rgb, alpha } from game/skylight.js.
function drawReflections(ctx, m, camX, camY, w, h, wet, { time, reduced, tile, lights, night, sky }) {
  const streetAt = (px, py) => { const c = m.at(Math.floor(px / tile), Math.floor(py / tile)); return ROAD.has(c) || WALK.has(c) || PARKED.has(c) || DOCK.has(c); };
  if (sky && sky.alpha > 0.03 && night < 0.9) {
    // The sheen: a faint stripe of sky colour on every wet street tile in view.
    const tx0 = Math.max(0, Math.floor(camX / tile)), ty0 = Math.max(0, Math.floor(camY / tile));
    const tx1 = Math.min(m.cols - 1, Math.floor((camX + w) / tile)), ty1 = Math.min(m.rowsN - 1, Math.floor((camY + h) / tile));
    ctx.fillStyle = `rgba(${sky.rgb.join(',')},${(Math.min(0.2, sky.alpha * wet * 0.7)).toFixed(3)})`;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const ch = m.at(tx, ty);
      if (ROAD.has(ch) || WALK.has(ch)) ctx.fillRect(tx * tile - camX, ty * tile - camY + 5, tile, 4);
    }
  }
  if (night < 0.25) return;
  const a = Math.min(0.5, wet * night * 0.5);
  for (let i = 0; i < lights.length; i++) {
    const l = lights[i];
    if (l.x < camX - 20 || l.x > camX + w + 20 || l.y < camY - 20 || l.y > camY + h + 60) continue;
    const baseY = l.y + 12;                                  // where the post meets the ground
    const reach = Math.min(40, 14 + l.r * 0.45);
    for (let y = 0; y < reach; y += 2) {
      if (!streetAt(l.x, baseY + y)) continue;
      const k = 1 - y / reach, wob = reduced ? 0 : Math.round(Math.sin(time * 3 + y * 0.7 + i) * (1 + y * 0.04));
      const half = 1 + Math.round(k * 2);
      ctx.fillStyle = `rgba(240,196,120,${(a * k * (0.6 + 0.4 * ((y / 2) % 2))).toFixed(3)})`;
      ctx.fillRect(Math.round(l.x - camX) - half + wob, Math.round(baseY - camY) + y, half * 2, 1);
    }
  }
}
