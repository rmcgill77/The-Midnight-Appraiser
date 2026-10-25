// The weather on screen (Phase 23), drawn over the world (before the HUD). Out on the
// street it's all there: rain that splashes, snow that drifts, fog banks rolling through,
// cloud shadows crossing the blocks, sunbeams and dust on a clear day, a storm's slanting
// rain and lightning. Indoors you only see the lightning through the windows; on a night
// run, the lightning (where there are windows) and the mist.
//
// update() returns what happened this frame ({ bolt: { near } } when lightning strikes) so
// the sound and the night run can answer it.

const rnd = (a, b) => a + Math.random() * (b - a);

export class WeatherFX {
  constructor() {
    this.drops = []; this.flakes = []; this.splashes = []; this.motes = [];
    this.flash = 0; this.bolt = null; this.nextBolt = rnd(4, 10); this.t = 0;
  }

  // mode: 'street' | 'indoor' | 'zone'. windows: lightning shows (indoors, some zones).
  update(dt, type, { mode = 'street', windows = true, reducedMotion = false, w = 400, h = 300 } = {}) {
    this.t += dt;
    const out = {};
    this.flash = Math.max(0, this.flash - dt * 3.2);
    if (this.bolt && (this.bolt.life -= dt) <= 0) this.bolt = null;
    if (type === 'storm' && (mode === 'street' || windows)) {
      if ((this.nextBolt -= dt) <= 0) {
        this.nextBolt = rnd(5, 14);
        const near = Math.random() < 0.4;
        this.flash = reducedMotion ? 0.25 : near ? 0.75 : 0.45;
        if (mode === 'street' && near && !reducedMotion) this.bolt = { x: rnd(w * 0.15, w * 0.85), life: 0.22, seed: Math.random() };
        out.bolt = { near };
        if (!reducedMotion) this.flicker = 0.14;
      }
    }
    // A second flicker just after the first, the way lightning does.
    if (this.flicker > 0 && (this.flicker -= dt) <= 0) { this.flash = Math.min(1, this.flash + 0.3); this.flicker = 0; }
    if (mode !== 'street') return out;
    const heavy = type === 'storm';
    // Rain: streaks that end in a splash somewhere down the screen.
    if (type === 'rain' || type === 'storm') {
      const want = reducedMotion ? 50 : heavy ? 240 : 130, wind = heavy ? 120 : 35;
      while (this.drops.length < want) this.drops.push({ x: rnd(-40, w + 40), y: rnd(-h, 0), v: rnd(380, 520) * (heavy ? 1.2 : 1), end: rnd(h * 0.1, h * 1.05), len: heavy ? rnd(7, 11) : rnd(5, 8) });
      if (this.drops.length > want) this.drops.length = want;
      for (const d of this.drops) {
        d.y += d.v * dt; d.x += wind * dt;
        if (d.y >= d.end) {
          if (this.splashes.length < 80) this.splashes.push({ x: d.x, y: d.end, life: 0.22 });
          d.x = rnd(-60, w + 20); d.y = rnd(-40, -5); d.end = rnd(h * 0.1, h * 1.05);
        }
      }
    } else this.drops.length = 0;
    for (const s of this.splashes) s.life -= dt;
    this.splashes = this.splashes.filter(s => s.life > 0);
    // Snow: flakes that sway as they fall.
    if (type === 'snow') {
      const want = reducedMotion ? 50 : 150;
      while (this.flakes.length < want) this.flakes.push({ x: rnd(0, w), y: rnd(-h, h), v: rnd(16, 42), r: Math.random() < 0.25 ? 2 : 1, ph: rnd(0, 6.28) });
      for (const f of this.flakes) {
        f.y += f.v * dt; f.x += Math.sin(this.t * 1.3 + f.ph) * 10 * dt + 6 * dt;
        if (f.y > h + 4) { f.y = rnd(-20, -2); f.x = rnd(-10, w); }
        if (f.x > w + 4) f.x = -4;
      }
    } else this.flakes.length = 0;
    // A clear day: a few motes of dust drifting in the sun.
    if (type === 'clear' && !reducedMotion) {
      while (this.motes.length < 22) this.motes.push({ x: rnd(0, w), y: rnd(0, h), ph: rnd(0, 6.28), v: rnd(3, 8) });
      for (const m of this.motes) { m.y -= m.v * dt; m.x += Math.sin(this.t * 0.7 + m.ph) * 4 * dt; if (m.y < -4) { m.y = h + 4; m.x = rnd(0, w); } }
    } else this.motes.length = 0;
    return out;
  }

  // camX, camY: the camera, so things on the ground (cloud shadows, fog banks) stay put
  // as you walk. dusk: 0 (morning) to 1 (evening), for how strong the sun is.
  draw(ctx, type, { w, h, camX = 0, camY = 0, mode = 'street', dusk = 0, windows = true }) {
    if (mode === 'street') this.#street(ctx, type, w, h, camX, camY, dusk);
    else if (mode === 'zone' && type === 'fog') this.#mist(ctx, w, h, camX, camY, 0.5);
    if (this.flash > 0 && (mode === 'street' || windows)) {
      ctx.fillStyle = `rgba(210,220,255,${(this.flash * (mode === 'street' ? 0.55 : 0.32)).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  #street(ctx, type, w, h, camX, camY, dusk) {
    const T = this.t;
    // The light: grey for clouds, blue-grey for rain, cold for snow, a warm wash for sun.
    const tint = { overcast: 'rgba(28,32,44,0.16)', rain: 'rgba(24,32,48,0.24)', storm: 'rgba(14,18,32,0.36)', snow: 'rgba(200,214,235,0.16)', fog: 'rgba(120,128,140,0.14)' }[type];
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h); }
    // Cloud shadows drifting across the blocks.
    if (type === 'overcast' || type === 'rain' || type === 'snow' || type === 'clear') {
      const n = type === 'clear' ? 2 : 4, a = type === 'clear' ? 0.09 : 0.12;
      for (let i = 0; i < n; i++) {
        const span = 1600, R = 170 + (i * 53) % 90;
        const wx = ((i * 431 + T * (14 + i * 3)) % span) - camX % span, wy = ((i * 277) % 700) - camY % 700;
        for (const ox of [-span, 0, span]) for (const oy of [-700, 0, 700]) {
          const x = wx + ox, y = wy + oy;
          if (x < -R || x > w + R || y < -R || y > h + R) continue;
          const g = ctx.createRadialGradient(x, y, 0, x, y, R);
          g.addColorStop(0, `rgba(4,6,12,${a})`); g.addColorStop(1, 'rgba(4,6,12,0)');
          ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
        }
      }
    }
    if (type === 'fog') this.#mist(ctx, w, h, camX, camY, 1);
    // Sunbeams and dust on a clear morning.
    if (type === 'clear') {
      const s = Math.max(0, 1 - dusk * 1.4);
      if (s > 0.02) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const x0 = ((i * 380 - camX * 0.3 + T * 4) % (w + 400)) - 200;
          ctx.fillStyle = `rgba(255,214,150,${(0.035 * s).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 70, 0); ctx.lineTo(x0 + 70 + h * 0.6, h); ctx.lineTo(x0 + h * 0.6, h); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = `rgba(255,230,180,${(0.5 * s).toFixed(2)})`;
        for (const m of this.motes) ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
        ctx.restore();
      }
    }
    // Rain and its splashes.
    if (this.drops.length) {
      ctx.fillStyle = type === 'storm' ? 'rgba(180,196,225,0.45)' : 'rgba(170,190,215,0.38)';
      const slant = type === 'storm' ? 2 : 1;
      for (const d of this.drops) {
        const x = Math.round(d.x), y = Math.round(d.y);
        for (let k = 0; k < d.len; k += 2) ctx.fillRect(x - Math.round(k * slant / 4), y - k, 1, 2);
      }
      ctx.fillStyle = 'rgba(190,205,230,0.5)';
      for (const s of this.splashes) {
        const r = Math.round((0.22 - s.life) * 16) + 1, x = Math.round(s.x), y = Math.round(s.y);
        ctx.fillRect(x - r, y, 1, 1); ctx.fillRect(x + r, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1);
      }
    }
    // A bolt, for an instant, down the sky.
    if (this.bolt) {
      ctx.fillStyle = 'rgba(235,240,255,0.85)';
      let x = this.bolt.x, s = this.bolt.seed;
      for (let y = 0; y < h * 0.55; y += 4) { s = (s * 9301 + 49297) % 233280; x += ((s / 233280) - 0.5) * 8; ctx.fillRect(Math.round(x), y, 2, 4); }
    }
    // Snow.
    if (this.flakes.length) {
      ctx.fillStyle = 'rgba(235,240,250,0.85)';
      for (const f of this.flakes) ctx.fillRect(Math.round(f.x), Math.round(f.y), f.r, f.r);
    }
  }

  // Fog banks: big soft clouds of grey rolling slowly through.
  #mist(ctx, w, h, camX, camY, k) {
    ctx.fillStyle = `rgba(150,158,170,${(0.10 * k).toFixed(3)})`; ctx.fillRect(0, 0, w, h);
    const T = this.t;
    for (let i = 0; i < 7; i++) {
      const span = 1200, R = 120 + (i * 37) % 110;
      const x = ((i * 313 + T * (6 + i)) % span) - (camX * 0.9) % span, y = ((i * 191 + Math.sin(T * 0.1 + i) * 30) % 600) - (camY * 0.9) % 600;
      for (const ox of [-span, 0, span]) for (const oy of [-600, 0, 600]) {
        const X = x + ox, Y = y + oy;
        if (X < -R || X > w + R || Y < -R || Y > h + R) continue;
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, R);
        g.addColorStop(0, `rgba(170,178,190,${(0.32 * k).toFixed(3)})`); g.addColorStop(1, 'rgba(170,178,190,0)');
        ctx.fillStyle = g; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
      }
    }
  }
}

// A small weather icon (16x16) for the HUD and the morning paper, as SVG.
const ICON_ROWS = {
  sun: ['.......#........', '...#...#...#....', '....#.....#.....', '.......#........', '.....#####......', '....#######.....', '.##.#######.##..', '....#######.....', '.....#####......', '.......#........', '....#.....#.....', '...#...#...#....', '.......#........', '................', '................', '................'],
  cloud: ['................', '................', '................', '......####......', '....##....##....', '...#........#...', '..##.........##.', '.#.............#', '.#.............#', '..#############.', '................', '................', '................', '................', '................', '................'],
  fog: ['................', '................', '..##########....', '................', '....##########..', '................', '.############...', '................', '...###########..', '................', '..##########....', '................', '................', '................', '................', '................'],
  rain: ['......####......', '....##....##....', '...#........#...', '..##.........##.', '.#.............#', '..#############.', '................', '...#...#...#....', '..#...#...#.....', '................', '....#...#...#...', '...#...#...#....', '................', '................', '................', '................'],
  storm: ['......####......', '....##....##....', '...#........#...', '..##.........##.', '.#.............#', '..#############.', '.......##.......', '......##........', '.....######.....', '.......##.......', '......##........', '.....#..........', '................', '................', '................', '................'],
  snow: ['.......#........', '...#...#...#....', '....#..#..#.....', '.....#.#.#......', '.......#........', '.#############..', '.......#........', '.....#.#.#......', '....#..#..#.....', '...#...#...#....', '.......#........', '................', '................', '................', '................', '................'],
};
export function weatherIconSvg(icon, cls = 'wx-icon') {
  const rows = ICON_ROWS[icon] ?? ICON_ROWS.cloud;
  let d = '';
  rows.forEach((r, y) => { for (let x = 0; x < r.length;) { if (r[x] !== '#') { x++; continue; } let n = 0; while (r[x + n] === '#') n++; d += `M${x} ${y}h${n}v1h-${n}z`; x += n; } });
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('class', cls); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('shape-rendering', 'crispEdges');
  const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'currentColor'); svg.append(p);
  return svg;
}
