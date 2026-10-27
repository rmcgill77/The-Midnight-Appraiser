'use strict';

/* ===================================================================== crawl rules
   A run is a grid built by MapGen from the zone's layout. Every floor tile is reachable from the exit.
   Light uses line of sight; walls block it. What you carry only counts
   once you climb back out through the exit. */
const Crawl = {
  W: 9,                       // default map width; zones set their own cols
  DIRS: [[0, -1], [1, 0], [0, 1], [-1, 0]],
  radius: st => st.battery <= 0 ? 1 : st.upgrades.flashlight >= 3 ? 3 : 2,
  drain(st, z) {
    const d = Math.max(1, z.drain - (st.upgrades.flashlight >= 2 ? 1 : 0));
    return assistOn(st, 'battery') ? Math.max(1, Math.ceil(d / 2)) : d;
  },
  maxStamina: st => Math.round((DATA.runTuning.stamina + DATA.runTuning.staminaPerBoots * st.upgrades.boots) * (assistOn(st, 'stamina') ? 1.5 : 1)),
  /* All night-run stress goes through here so the Gentler stress assist applies. */
  addStress(st, n) {
    if (n > 0 && assistOn(st, 'stress')) n = Math.ceil(n / 2);
    st.stress = clamp(st.stress + n, 0, 100);
    const T = DATA.kitEffects.tincture;
    if (n > 0 && st.run && st.stress >= T.at && Crawl.useKit(st, 'tincture')) {
      st.stress = Math.max(0, st.stress - T.stress);
      Crawl.say(st.run, `You knock back the calming tincture. Your hands stop shaking. −${T.stress} Stress.`);
    }
  },
  /* Consumables from the workbench: each kind fires at most once per run, if packed. */
  useKit(st, key) {
    const run = st.run;
    if (!run || !st.pack[key] || !(st.kit[key] > 0)) return false;
    run.used = run.used || {};
    if (run.used[key]) return false;
    run.used[key] = run.turn;
    st.kit[key] -= 1;
    run.kitNote = DATA.kit[key].name;
    return true;
  },
  bagCap: st => 3 + (st.upgrades.bag || 1) + Ride.bag(st) + (Endless.has(st, 'bag') ? 1 : 0),
  idx: (run, x, y) => y * run.W + x,
  inside: (run, x, y) => x >= 0 && y >= 0 && x < run.W && y < run.H,
  open: (run, x, y) => Crawl.inside(run, x, y) && !run.tiles[y][x].wall,

  bfs(run, from, passable = (x, y) => Crawl.open(run, x, y)) {
    const d = Array.from({ length: run.H }, () => Array(run.W).fill(-1));
    const q = [[from.x, from.y]]; d[from.y][from.x] = 0;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of Crawl.DIRS) {
        const nx = x + dx, ny = y + dy;
        if (Crawl.inside(run, nx, ny) && d[ny][nx] < 0 && passable(nx, ny)) { d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); }
      }
    }
    return d;
  },

  generate(st, z) {
    const rng = rnd, W = z.cols || Crawl.W, H = z.rows, T = DATA.runTuning;
    for (let attempt = 0; attempt < 80; attempt++) {
      const built = MapGen.build(z, rng), ex = built.exit;
      const run = { zoneId: z.id, W, H, seed: (rng() * 1e9) >>> 0, tiles: built.tiles, rooms: built.rooms, roomsSeen: [],
        pos: { x: ex.x, y: ex.y }, exit: { x: ex.x, y: ex.y }, facing: [0, -1] };
      const d = Crawl.bfs(run, run.exit);
      const cells = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const t = run.tiles[y][x];
        if (t.wall) continue;
        if (d[y][x] < 0) { run.tiles[y][x] = { wall: true, art: 'edge' }; continue; }
        if (d[y][x] > 0) cells.push({ x, y, d: d[y][x] });
      }
      if (cells.length < W * H * T.minFloor) continue;
      const shuffled = cells.sort(() => rng() - 0.5);
      const take = (n, minD, ok = () => true) => {
        const out = [];
        for (let i = 0; i < shuffled.length && out.length < n; i++) {
          const c = shuffled[i];
          if (c.used || c.d < minD || !ok(c)) continue;
          c.used = true; out.push(c);
        }
        return out;
      };
      const scouted = st.city && st.city.scouted && st.city.scouted[z.id] === st.day;   // scouted in daylight today
      const loot = take(randInt(rng, z.haul[0], z.haul[1]) + (scouted ? DATA.scout.extraFind : 0), T.lootMin);
      if (loot.length < z.haul[0]) continue;
      loot.forEach(c => { run.tiles[c.y][c.x].loot = true; });
      const keep = built.keep && cells.find(c => c.x === built.keep.x && c.y === built.keep.y);   // a find that is always there (your parents' camp)
      if (keep) { keep.used = true; run.tiles[keep.y][keep.x].loot = true; }
      const roomy = c => Crawl.DIRS.filter(([dx, dy]) => Crawl.open(run, c.x + dx, c.y + dy)).length >= 3;   // hazards stay out of one-tile corridors and doorways
      take(z.hazards, T.hazardMin, roomy).forEach(c => { run.tiles[c.y][c.x].hazard = randInt(rng, 0, z.hazardTypes.length - 1); if (scouted) run.tiles[c.y][c.x].known = true; });
      run.scouted = !!scouted;
      const plain = DATA.supplies.map((s, i) => s.mat ? -1 : i).filter(i => i >= 0);
      take(z.supplies, 3).forEach(c => { run.tiles[c.y][c.x].supply = plain[randInt(rng, 0, plain.length - 1)]; });
      take(z.caches || 0, 3).forEach(c => { const id = pick(rng, z.cachePool); run.tiles[c.y][c.x].supply = DATA.supplies.findIndex(s => s.id === id); });
      run.cryptids = take(z.cryptids, T.cryptidMin).map((c, i) => ({ id: i, x: c.x, y: c.y, stun: 0, sid: weighted(rng, z.pool) }));
      Object.assign(run, {
        seen: Array(W * H).fill(0), bag: [], stamina: Crawl.maxStamina(st), turn: 0,
        encounter: null, confirmBail: false, log: [`${z.enter || `You squeeze in through the service door of ${z.name}.`}${run.scouted ? ' Your scouting notes mark every hazard.' : ''}`]
      });
      Crawl.reveal(st, run);
      const r0 = MapGen.roomAt(run, run.pos.x, run.pos.y);
      if (r0) run.roomsSeen.push(r0.name);
      return run;
    }
    throw new Error('Map generation failed');
  },

  los(run, a, b) {   // Bresenham; the target tile itself may be a wall
    let x = a.x, y = a.y;
    const dx = Math.abs(b.x - x), dy = -Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (x === b.x && y === b.y) return true;
      if ((x !== a.x || y !== a.y) && run.tiles[y][x].wall) return false;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  },
  lit(st, run) {     // Map of tile index -> distance, for tiles your light reaches
    const r = Crawl.radius(st), out = new Map(), p = run.pos;
    for (let y = Math.max(0, p.y - r); y <= Math.min(run.H - 1, p.y + r); y++)
      for (let x = Math.max(0, p.x - r); x <= Math.min(run.W - 1, p.x + r); x++) {
        const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
        if (d2 <= r * r + (r > 1 ? 1 : 0) && Crawl.los(run, p, { x, y })) out.set(Crawl.idx(run, x, y), Math.sqrt(d2));
      }
    return out;
  },
  reveal(st, run) {
    const torch = st.battery > 0;
    for (const i of Crawl.lit(st, run).keys()) {
      run.seen[i] = 1;
      const t = run.tiles[Math.floor(i / run.W)][i % run.W];
      if (torch && t.hazard !== undefined) t.known = true;   // hazards only show under the flashlight
    }
  },
  cryptidAt: (run, x, y) => run.cryptids.find(c => c.x === x && c.y === y),
  say(run, text) { run.log.unshift(text); run.log.length = Math.min(run.log.length, 4); },

  /* Walk toward a tapped tile along known floor; returns the first step. */
  stepToward(run, tx, ty) {
    const p = run.pos;
    if (Math.abs(tx - p.x) + Math.abs(ty - p.y) === 1) return [tx - p.x, ty - p.y];
    const d = Crawl.bfs(run, { x: tx, y: ty }, (x, y) => Crawl.open(run, x, y) && (run.seen[Crawl.idx(run, x, y)] || (x === p.x && y === p.y)));
    if (d[p.y][p.x] < 0) return null;
    for (const [dx, dy] of Crawl.DIRS) {
      const nx = p.x + dx, ny = p.y + dy;
      if (Crawl.inside(run, nx, ny) && d[ny][nx] >= 0 && d[ny][nx] < d[p.y][p.x]) return [dx, dy];
    }
    return null;
  },

  apply(st, run, fx) {
    if (fx.stamina) run.stamina = Math.max(0, run.stamina - fx.stamina);
    if (fx.stress) Crawl.addStress(st, fx.stress);
    if (fx.battery) st.battery = clamp(st.battery + (fx.supply ? fx.battery : -fx.battery), 0, 100);
  },

  /* One player step. Returns a short message for a toast, if any. */
  move(st, dx, dy) {
    const run = st.run, z = zoneOf(run.zoneId);
    if (!run || run.encounter) return null;
    const nx = run.pos.x + dx, ny = run.pos.y + dy;
    if (!Crawl.open(run, nx, ny)) return null;
    let note = null;
    run.confirmBail = false;
    run.kitNote = null;
    run.turn += 1;
    if (run.stamina > 0) run.stamina -= 1;
    else { Crawl.addStress(st, 6); Crawl.say(run, 'Your legs are done. Every step costs you nerve now.'); }
    if (st.battery > 0 && run.turn % DATA.runTuning.drainEvery === 0) {
      st.battery = Math.max(0, st.battery - Crawl.drain(st, z));
      if (st.battery === 0) {
        if (Crawl.useKit(st, 'cell')) { st.battery = DATA.kitEffects.cell.battery; Crawl.say(run, 'The light dies. You snap in the spare battery pack before the dark gets close.'); }
        else { Crawl.say(run, 'Your flashlight dies. The dark comes right up to your face.'); note = 'Flashlight dead'; }
      }
    } else if (st.battery <= 0) Crawl.addStress(st, 3);
    run.pos = { x: nx, y: ny };
    run.facing = [dx, dy];
    const t = run.tiles[ny][nx];
    const room = MapGen.roomAt(run, nx, ny);
    if (room && run.roomsSeen && !run.roomsSeen.includes(room.name)) {
      run.roomsSeen.push(room.name);
      Crawl.say(run, MapGen.enterLine(room.name));
      const story = Story.onRoom(st, room);
      if (story) { Crawl.say(run, story); note = note || 'Your parents’ camp'; }
    }

    if (t.loot) {
      if (run.bag.length < Crawl.bagCap(st)) {
        const it = RNG.within(st, ['find', run.seed, run.pos.x, run.pos.y], () => Items.generate(st, { zoneId: z.id }));   // the same find on the same tile for everyone on this seed
        run.bag.push(it); t.loot = false;
        Crawl.say(run, `Bagged ${an(Items.name(it))}.`);
        note = `Found: ${Items.name(it)}`;
      } else Crawl.say(run, 'Something glints here, but your bag is full.');
    }
    if (t.hazard !== undefined) {
      const h = z.hazardTypes[t.hazard];
      const blind = !t.known;
      const fx = blind ? { stamina: (h.stamina || 0) + 1, stress: (h.stress || 0) + 5, battery: h.battery } : h;
      Crawl.apply(st, run, fx);
      t.known = true;
      Crawl.say(run, `${h.name}! ${h.text}${blind ? ' You never saw it coming.' : ''}`);
      note = h.name;
    }
    if (t.supply !== undefined) {
      const sp = DATA.supplies[t.supply];
      delete t.supply;
      if (sp.mat) {
        const got = Object.entries(sp.mat).map(([k, [lo, hi]]) => { const n = randInt(rnd, lo, hi); st.supplies[k] += n; return `+${n} ${DATA.materials[k].name.toLowerCase()}`; }).join(', ');
        run.mats = (run.mats || 0) + 1;
        Crawl.say(run, `${sp.name}. ${sp.text} ${got}.`);
        note = `${sp.name} · ${got}`;
      } else {
        Crawl.apply(st, run, { ...sp, supply: true, stamina: sp.stamina ? -sp.stamina : 0 });
        if (sp.stamina) run.stamina = Math.min(Crawl.maxStamina(st), run.stamina);
        Crawl.say(run, `${sp.name}. ${sp.text}`);
        note = sp.name;
      }
    }
    if (Crawl.cryptidAt(run, nx, ny)) Crawl.contact(st, run);
    else Crawl.cryptidsAct(st, run);
    Crawl.reveal(st, run);
    return Crawl.checkPanic(st) || (run.encounter ? 'encounter' : run.kitNote || note);
  },
  /* A spoken summary of what is in each direction, for screen readers. */
  describe(st) {
    const run = st.run;
    if (!run) return '';
    const z = zoneOf(run.zoneId), lit = Crawl.lit(st, run), r = Crawl.radius(st);
    const names = ['North', 'East', 'South', 'West'];
    const parts = Crawl.DIRS.map(([dx, dy], i) => {
      for (let k = 1; k <= r; k++) {
        const x = run.pos.x + dx * k, y = run.pos.y + dy * k;
        if (!Crawl.inside(run, x, y) || run.tiles[y][x].wall) return `${names[i]}: ${k === 1 ? 'wall' : `open ${k - 1}, then wall`}`;
        const t = run.tiles[y][x];
        const what = Crawl.visibleCryptid(st, run, lit, x, y) ? Combat.of(Crawl.cryptidAt(run, x, y), run.zoneId).name
          : x === run.exit.x && y === run.exit.y ? 'the exit'
          : t.loot ? 'something glinting'
          : t.supply !== undefined ? DATA.supplies[t.supply].name
          : t.hazard !== undefined && t.known ? z.hazardTypes[t.hazard].name : null;
        if (what) return `${names[i]}: ${what}, ${k} step${k > 1 ? 's' : ''}`;
      }
      return `${names[i]}: open`;
    });
    const atExit = run.pos.x === run.exit.x && run.pos.y === run.exit.y;
    return `${atExit ? 'You are at the exit. ' : ''}${parts.join('. ')}. Stamina ${run.stamina}, light ${st.battery} percent, stress ${st.stress}.`;
  },

  visibleCryptid(st, run, lit, x, y) {
    return st.battery > 0 && lit.has(Crawl.idx(run, x, y)) && Crawl.cryptidAt(run, x, y);
  },

  cryptidsAct(st, run) {
    const z = zoneOf(run.zoneId);
    if (run.turn % (assistOn(st, 'cryptids') ? 3 : 2)) return;   // they move every other turn (every third with the assist)
    const d = Crawl.bfs(run, run.pos);
    const aware = 4 + z.danger + (st.battery <= 0 ? 2 : 0);
    for (const c of run.cryptids) {
      if (c.stun > 0) { c.stun -= 1; continue; }
      const opts = Crawl.DIRS.map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy }))
        .filter(o => Crawl.open(run, o.x, o.y) && !run.cryptids.some(k => k !== c && k.x === o.x && k.y === o.y));
      if (!opts.length) continue;
      const step = d[c.y][c.x] >= 0 && d[c.y][c.x] <= aware
        ? opts.reduce((b, o) => (d[o.y][o.x] < d[b.y][b.x] ? o : b))
        : pick(rnd, opts);
      c.x = step.x; c.y = step.y;
    }
    if (Crawl.cryptidAt(run, run.pos.x, run.pos.y)) { Crawl.contact(st, run); return; }
    const lit = Crawl.lit(st, run);
    const unseenNear = run.cryptids.some(c => Math.abs(c.x - run.pos.x) + Math.abs(c.y - run.pos.y) <= 2 && !Crawl.visibleCryptid(st, run, lit, c.x, c.y));
    if (unseenNear) { Crawl.say(run, 'Something is breathing nearby. You cannot see it.'); run.breathTurn = run.turn; }
  },

  contact(st, run) {
    const z = zoneOf(run.zoneId), c = Crawl.cryptidAt(run, run.pos.x, run.pos.y);
    if (!c) return;
    if (Crawl.useKit(st, 'ward')) {
      // the salt ward drives it off: no stress, no fight, it is flung away and stunned
      Crawl.scatter(run, c, 4);
      Crawl.say(run, `${Combat.of(c, run.zoneId).name} hits your salt ward and recoils. The line holds. It flees into the dark.`);
      return;
    }
    Combat.start(st, run, c);
  },

  /* Send a cryptid to the farthest free floor tile and stun it. */
  scatter(run, c, stun) {
    const d = Crawl.bfs(run, run.pos);
    let far = c;
    for (let y = 0; y < run.H; y++) for (let x = 0; x < run.W; x++)
      if (d[y][x] > (d[far.y][far.x] || 0) && !Crawl.cryptidAt(run, x, y)) far = { x, y };
    c.x = far.x; c.y = far.y; c.stun = stun;
  },

  checkPanic(st) {
    const run = st.run;
    if (!run || st.stress < 100) return null;
    const lose = Math.ceil(run.bag.length / 2);
    const dropped = [];
    for (let i = 0; i < lose; i++) dropped.push(run.bag.splice(Math.floor(rnd() * run.bag.length), 1)[0]);
    const z = zoneOf(run.zoneId);
    Crawl.finish(st, `Panic. You ran blind out of ${z.name}${dropped.length ? ` and dropped ${dropped.length} find${dropped.length > 1 ? 's' : ''} on the way` : ''}.`);
    st.stress = 85;
    return 'panic';
  },

  finish(st, text) {
    const run = st.run, n = run.bag.length;
    const zn = zoneOf(run.zoneId);
    run.bag.forEach(it => { st.inventory.loot.push(it); Recap.find(st, it, zn ? zn.name : 'a night run'); });
    Recap.run(st, run.zoneId, n, /^Panic/.test(text));
    st.counters.runs = (st.counters.runs || 0) + 1;
    if (n && n >= Crawl.bagCap(st)) st.counters.fullBags = (st.counters.fullBags || 0) + 1;
    if (run.zoneId === 'undercroft') st.counters.undercroft = (st.counters.undercroft || 0) + 1;
    log(st, text + (n ? ` Brought back ${n} find${n > 1 ? 's' : ''}.` : ''), n ? 'loot' : 'warn');
    st.run = null;
  }
};
