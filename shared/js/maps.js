'use strict';

/* ===================================================================== night-run maps
   Each zone has a layout builder that carves rooms and corridors out of solid wall,
   so every run is different but each place keeps its own shape:
     laundromat  a machine floor with aisles of dead washers, back rooms behind it
     subway      two platforms either side of the tracks, a concourse below
     garage      a pillar grid with parked cars, a lobby and a booth, ramp exit
     hospital    one long corridor with wards and rooms off both sides
   A builder returns { tiles, rooms, exit }. tiles[y][x] = { wall, art? } where art
   overrides the zone's wall art ('edge' plain wall, 'car', 'bed', 'counter').
   rooms = [{ name, x, y, w, h }] for "you step into…" lines and the minimap. */

const MapGen = {
  grid(W, H) { return Array.from({ length: H }, () => Array.from({ length: W }, () => ({ wall: true, art: 'edge' }))); },
  carve(t, x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (t[j] && t[j][i]) t[j][i] = { wall: false }; },
  wall(t, x, y, art) { if (t[y] && t[y][x]) t[y][x] = { wall: true, art }; },
  room(rooms, name, x, y, w, h) { rooms.push({ name, x, y, w, h }); },
  /* "You step onto the tracks", "into the boiler room". */
  ONTO: /platform|tracks|parking level|ramp/,
  enterLine: name => `You step ${MapGen.ONTO.test(name) ? 'onto' : 'into'} the ${name}.`,

  build(z, rng) {
    const B = MapGen.layouts[z.layout];
    return B(z, rng);
  },

  layouts: {
    /* The machine floor fills the front; aisles of washers run front to back with gaps
       to cut across. Two or three back rooms sit behind a wall with one door each. */
    aisles(z, rng) {
      const W = z.cols, H = z.rows, t = MapGen.grid(W, H), rooms = [];
      const hallTop = randInt(rng, 7, 8), hallBot = H - 2;
      MapGen.carve(t, 1, hallTop, W - 2, hallBot - hallTop + 1);
      MapGen.room(rooms, 'machine floor', 1, hallTop, W - 2, hallBot - hallTop + 1);
      // aisles of machines: every 4th column, each with one or two gaps
      const start = randInt(rng, 2, 3);
      for (let x = start; x < W - 2; x += 4) {
        const gaps = new Set([randInt(rng, hallTop + 2, hallBot - 2)]);
        if (rng() < 0.6) gaps.add(randInt(rng, hallTop + 2, hallBot - 2));
        for (let y = hallTop + 2; y <= hallBot - 2; y++) if (!gaps.has(y)) MapGen.wall(t, x, y);
      }
      // a folding counter near the door
      const cx = Math.floor(W / 2) + (rng() < 0.5 ? -3 : 2);
      MapGen.wall(t, cx, hallBot - 1, 'counter'); MapGen.wall(t, cx + 1, hallBot - 1, 'counter');
      // back rooms
      const names = ['back office', 'storage room', 'boiler room', 'staff toilet', 'lost and found'].sort(() => rng() - 0.5);
      const n = randInt(rng, 2, 3), widths = [];
      let left = W - 2 - (n - 1);
      for (let i = 0; i < n; i++) { const w = i === n - 1 ? left : randInt(rng, 3, Math.max(3, left - 3 * (n - 1 - i))); widths.push(w); left -= w; }
      let x = 1;
      widths.forEach((w, i) => {
        const y = 1, h = hallTop - 2;
        MapGen.carve(t, x, y, w, h);
        MapGen.room(rooms, names[i], x, y, w, h);
        t[hallTop - 1][randInt(rng, x, x + w - 1)] = { wall: false };   // the door
        x += w + 1;
      });
      const exit = { x: Math.floor(W / 2), y: H - 1 };
      MapGen.carve(t, exit.x, exit.y, 1, 1);
      return { tiles: t, rooms, exit };
    },

    /* Two platforms with pillars, the tracks between them reachable through a few
       gaps in the platform edge, and a concourse of rooms down by the stairs. */
    platforms(z, rng) {
      const W = z.cols, H = z.rows, t = MapGen.grid(W, H), rooms = [];
      const A = 1, tr = 5, B = 8;                       // platform A rows 1-3, tracks 5-6, platform B 8-10
      MapGen.carve(t, 1, A, W - 2, 3); MapGen.room(rooms, 'northbound platform', 1, A, W - 2, 3);
      MapGen.carve(t, 0, tr, W, 2);   MapGen.room(rooms, 'tracks', 0, tr, W, 2);
      for (let x = 0; x < W; x++) { t[tr][x].floor = 'rail'; t[tr + 1][x].floor = 'rail'; }
      MapGen.carve(t, 1, B, W - 2, 3); MapGen.room(rooms, 'southbound platform', 1, B, W - 2, 3);
      for (const edge of [tr - 1, tr + 2]) {               // platform edges with a few ladders down
        const n = randInt(rng, 2, 3);
        for (let i = 0; i < n; i++) t[edge][randInt(rng, 2, W - 3)] = { wall: false };
      }
      t[tr][0] = { wall: true, art: 'edge' }; t[tr + 1][0] = { wall: true, art: 'edge' };   // tunnel mouths stay dark rubble
      t[tr][W - 1] = { wall: true, art: 'edge' }; t[tr + 1][W - 1] = { wall: true, art: 'edge' };
      const off = randInt(rng, 2, 4);
      for (let x = off; x < W - 2; x += 4) { if (rng() < 0.85) MapGen.wall(t, x, A + 1); if (rng() < 0.85) MapGen.wall(t, x, B + 1); }
      // concourse
      const cTop = B + 4, cH = H - 2 - cTop;
      MapGen.carve(t, 1, cTop, W - 2, cH);
      MapGen.room(rooms, 'concourse', 1, cTop, W - 2, cH);
      const stairs = [randInt(rng, 2, Math.floor(W / 2) - 2), randInt(rng, Math.floor(W / 2) + 2, W - 3)];
      stairs.forEach(x => { t[B + 3][x] = { wall: false }; });
      // a token booth and a service room carved out of the concourse
      const bx = randInt(rng, 2, W - 7);
      for (let i = bx; i < bx + 4; i++) { MapGen.wall(t, i, cTop + 1, 'counter'); }
      MapGen.room(rooms, 'token booth', bx, cTop, 4, 2);
      const sx = rng() < 0.5 ? 1 : W - 5;
      for (let y = cTop; y < cTop + cH; y++) MapGen.wall(t, sx === 1 ? 5 : W - 6, y, 'edge');
      t[cTop + randInt(rng, 0, cH - 1)][sx === 1 ? 5 : W - 6] = { wall: false };
      MapGen.room(rooms, 'service room', sx, cTop, 4, cH);
      let ex = randInt(rng, 3, W - 4);
      if ((sx === 1 && ex <= 5) || (sx !== 1 && ex >= W - 6)) ex = Math.floor(W / 2);
      const exit = { x: ex, y: H - 1 };
      MapGen.carve(t, exit.x, H - 2, 1, 2);
      return { tiles: t, rooms, exit };
    },

    /* A level of the garage: pillars on a grid, parked cars between them, an elevator
       lobby and an attendant's booth. You come in down the ramp in one corner. */
    levels(z, rng) {
      const W = z.cols, H = z.rows, t = MapGen.grid(W, H), rooms = [];
      MapGen.carve(t, 1, 1, W - 2, H - 2);
      MapGen.room(rooms, 'parking level', 1, 1, W - 2, H - 2);
      const ox = randInt(rng, 2, 3), oy = randInt(rng, 2, 3);
      for (let y = oy; y < H - 1; y += 4) for (let x = ox; x < W - 1; x += 4) MapGen.wall(t, x, y);
      // parked cars: 2-tile blocks in the bays between pillar rows
      for (let y = oy + 2; y < H - 2; y += 4) for (let x = ox + 1; x < W - 3; x += 2) {
        if (rng() < 0.32 && !t[y][x].wall && !t[y][x + 1].wall) { MapGen.wall(t, x, y, 'car'); MapGen.wall(t, x + 1, y, 'car'); x += 1; }
      }
      // elevator lobby in a corner away from the ramp
      const right = rng() < 0.5;
      const lx = right ? W - 5 : 1, ly = 1;
      for (let i = lx; i < lx + 4; i++) MapGen.wall(t, i, ly + 3, 'edge');
      for (let j = ly; j < ly + 4; j++) MapGen.wall(t, right ? lx - 1 : lx + 4, j, 'edge');
      MapGen.carve(t, lx, ly, 4, 3);
      t[ly + 3][lx + randInt(rng, 0, 3)] = { wall: false };
      MapGen.room(rooms, 'elevator lobby', lx, ly, 4, 3);
      // attendant's booth on the far side
      const bx = right ? 2 : W - 5, by = Math.floor(H / 2) + randInt(rng, -2, 1);
      for (let i = bx; i < bx + 3; i++) { MapGen.wall(t, i, by, 'edge'); MapGen.wall(t, i, by + 3, 'edge'); }
      for (let j = by; j <= by + 3; j++) { MapGen.wall(t, bx, j, 'edge'); MapGen.wall(t, bx + 3, j, 'edge'); }
      MapGen.carve(t, bx + 1, by + 1, 2, 2);
      t[by + randInt(rng, 1, 2)][right ? bx + 3 : bx] = { wall: false };
      MapGen.room(rooms, 'attendant’s booth', bx + 1, by + 1, 2, 2);
      // the ramp in the bottom corner opposite the lobby
      const exit = { x: right ? 2 : W - 3, y: H - 1 };
      MapGen.carve(t, exit.x, exit.y, 1, 1);
      MapGen.carve(t, exit.x - 1, H - 3, 3, 2);
      MapGen.room(rooms, 'ramp', exit.x - 1, H - 3, 3, 3);
      return { tiles: t, rooms, exit };
    },

    /* One long corridor up the middle with rooms off both sides, each with one door.
       A nurses' station sits at a crossing halfway up. */
    wards(z, rng) {
      const W = z.cols, H = z.rows, t = MapGen.grid(W, H), rooms = [];
      const cx = Math.floor(W / 2), cw = 1;
      MapGen.carve(t, cx, 1, cw, H - 1);
      MapGen.room(rooms, 'fourth-floor corridor', cx, 1, cw, H - 2);
      const midY = randInt(rng, Math.floor(H / 2) - 2, Math.floor(H / 2) + 1);
      MapGen.carve(t, cx - 2, midY - 1, 5, 3);
      MapGen.wall(t, cx - 1, midY, 'counter'); MapGen.wall(t, cx + 1, midY, 'counter');
      MapGen.room(rooms, 'nurses’ station', cx - 2, midY - 1, 5, 3);
      const names = ['ward 4A', 'ward 4B', 'ward 4C', 'exam room', 'supply closet', 'X-ray', 'records room', 'chapel', 'staff lounge', 'operating theatre', 'linen room', 'isolation room']
        .sort(() => rng() - 0.5);
      let ni = 0;
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? 1 : cx + 2, x1 = side < 0 ? cx - 2 : W - 2, w = x1 - x0 + 1;
        let y = 1;
        while (y < H - 3) {
          const h = Math.min(randInt(rng, 3, 5), H - 2 - y);
          if (h < 2) break;
          const blocked = y <= midY + 1 && y + h - 1 >= midY - 1 && false;
          if (!blocked) {
            MapGen.carve(t, x0, y, w, h);
            const name = names[ni++ % names.length];
            MapGen.room(rooms, name, x0, y, w, h);
            const doorY = randInt(rng, y, y + h - 1);
            t[doorY][side < 0 ? cx - 1 : cx + 1] = { wall: false };
            if (/^ward/.test(name)) {                      // beds along the outer wall
              for (let j = y; j < y + h; j += 2) MapGen.wall(t, side < 0 ? x0 : x1, j, 'bed');
            }
          }
          y += h + 1;
        }
      }
      // the station opening stays clear of room walls
      MapGen.carve(t, cx - 2, midY - 1, 1, 3); MapGen.carve(t, cx + 2, midY - 1, 1, 3);
      MapGen.wall(t, cx - 1, midY, 'counter'); MapGen.wall(t, cx + 1, midY, 'counter');
      const exit = { x: cx, y: H - 1 };
      MapGen.carve(t, exit.x, exit.y, 1, 1);
      return { tiles: t, rooms, exit };
    }
  }
};

/* Behind the other door: old brick passages under Old Market, a maze with loops,
   and a few rooms your parents used. Their camp always has something left in it. */
MapGen.layouts.undercroft = function (z, rng) {
  const W = z.cols, H = z.rows, t = MapGen.grid(W, H), rooms = [];
  for (const row of t) for (const c of row) c.art = undefined;          // brick throughout
  const cx = Math.floor((W - 1) / 2), cy = Math.floor((H - 1) / 2);   // cells at odd coordinates
  const seen = Array.from({ length: cy }, () => Array(cx).fill(false));
  const open = (i, j) => { t[2 * j + 1][2 * i + 1] = { wall: false }; };
  const stack = [[randInt(rng, 0, cx - 1), cy - 1]];
  seen[cy - 1][stack[0][0]] = true; open(stack[0][0], cy - 1);
  while (stack.length) {
    const [i, j] = stack[stack.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [i + dx, j + dy, dx, dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < cx && b < cy && !seen[b][a]);
    if (!nb.length) { stack.pop(); continue; }
    const [a, b, dx, dy] = nb[Math.floor(rng() * nb.length)];
    seen[b][a] = true; open(a, b);
    t[2 * j + 1 + dy][2 * i + 1 + dx] = { wall: false };
    stack.push([a, b]);
  }
  // knock through extra walls so there is more than one way back
  for (let k = 0; k < Math.round(cx * cy * 0.22); k++) {
    const x = randInt(rng, 1, W - 2), y = randInt(rng, 1, H - 2);
    if (t[y][x].wall && ((x % 2 === 0 && y % 2 === 1) || (x % 2 === 1 && y % 2 === 0))) t[y][x] = { wall: false };
  }
  const names = ['your parents’ camp', 'sorting room', 'drowned chapel', 'old cells', 'coal cellar'];
  const placed = [];
  for (const name of names) {
    for (let tries = 0; tries < 40; tries++) {
      const w = randInt(rng, 2, 3) * 2 + 1, h = randInt(rng, 1, 2) * 2 + 1;
      const x = randInt(rng, 0, Math.floor((W - w - 2) / 2)) * 2 + 1, y = randInt(rng, 0, Math.floor((H - h - 4) / 2)) * 2 + 1;
      if (placed.some(r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
      MapGen.carve(t, x, y, w, h);
      if (name === 'old cells') for (let i = x; i < x + w; i += 2) MapGen.wall(t, i, y, 'bars');
      placed.push({ x, y, w, h }); MapGen.room(rooms, name, x, y, w, h);
      break;
    }
  }
  MapGen.room(rooms, 'passages', 0, 0, W, H);
  const exit = { x: 2 * Math.floor(cx / 2) + 1, y: H - 1 };
  t[exit.y][exit.x] = { wall: false };
  const camp = rooms.find(r => r.name === names[0]);
  return { tiles: t, rooms, exit, keep: camp ? { x: camp.x + Math.floor(camp.w / 2), y: camp.y + Math.floor(camp.h / 2) } : null };
};

Object.assign(MapGen, {
  /* Which named room a tile is in (the smallest that contains it). */
  roomAt(run, x, y) {
    let best = null;
    for (const r of run.rooms || []) if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h && (!best || r.w * r.h < best.w * best.h)) best = r;
    return best;
  }
});
