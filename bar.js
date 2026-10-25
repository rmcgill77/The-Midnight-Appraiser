// The people inside a place you walk into (Phase 20 for the bar, Phase 21 for every
// place): the staff at their posts, the regulars (custom townsfolk whose job is here, or
// who have nowhere else to be) and a few passers-by. Regulars and passers-by drift between
// the room's spots now and then, and stop to face you when you come close.

import { Guide } from './guide.js';
import { SIGNATURE, dress } from './people.js';
import { spouseOf } from '../data/townsfolk.js';

export class RoomCrowd {
  // people: [{ name, spot, stay }] (stay: never wanders); extras: spots for passers-by,
  // dressed from `seed` so the same faces are here all day.
  constructor(room, people = [], { extras = [], seed = 'x', taken = new Set() } = {}) {
    this.room = room;
    this.people = [];
    people.forEach((p, i) => { const g = this.#add(p.name, p.spot, i, p.look ?? SIGNATURE[p.name], !!p.stay); g.still = !!p.still; });
    extras.forEach((spot, i) => {
      const { look } = dress(`${room.id}:extra:${seed}:${i}`, taken);
      const g = this.#add(null, spot, i + 3, look, false);
      g.extra = i;
    });
  }

  #add(name, spot, i, look, stay) {
    const g = new Guide(30, look);
    g.who = name; g.place(this.room.id, spot.tx, spot.ty, spot.facing);
    g.home = spot; g.spot = spot; g.wait = 6 + i * 3.7; g.talking = false; g.stay = stay;
    this.people.push(g);
    return g;
  }

  get names() { return this.people.filter(p => p.who).map(p => p.who); }
  find(name) { return this.people.find(p => p.who === name) ?? null; }

  // The nearest person you could talk to, within reach (staff behind a counter are
  // talked to across it, through the counter itself).
  near(x, y, reach = 18) {
    let best = null, bd = reach;
    for (const p of this.people) { if (p.stay) continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  // Turn to face you and stand still while you talk.
  face(p, x, y) {
    const dx = x - p.x, dy = y - p.y;
    p.path = []; p.then = null;
    p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  update(dt, map, player, talkingTo = null, rand = Math.random) {
    const spots = [...(this.room.spots ?? []), ...(this.room.extras ?? [])];
    const taken = new Set(this.people.map(p => `${p.spot.tx},${p.spot.ty}`));
    for (const p of this.people) {
      p.talking = !!talkingTo && (p.who === talkingTo || p === talkingTo);
      if (p.talking) { p.moving = false; continue; }
      // Staff watch the room; everyone else only looks at you when you're close.
      const near = player && Math.hypot(player.x - p.x, player.y - p.y) < (p.stay ? 90 : 40);
      p.update(dt, near ? player : null);
      if (!p.path.length && !near && !p.stay) p.facing = p.spot.facing ?? p.facing;
      if (p.stay || p.still || p.path.length || near) continue;   // still: a couple sitting together (Phase 29)
      if ((p.wait -= dt) > 0) continue;
      p.wait = 9 + rand() * 12;
      const free = spots.filter(s => !taken.has(`${s.tx},${s.ty}`));
      if (!free.length || rand() < 0.35) continue;
      const s = free[Math.floor(rand() * free.length)];
      taken.delete(`${p.spot.tx},${p.spot.ty}`); taken.add(`${s.tx},${s.ty}`);
      p.spot = s;
      p.walkTo(map, s.tx, s.ty, () => { p.facing = s.facing ?? p.facing; });
    }
  }
}

// Who's in a place right now: its staff, the keeper of an original location when it's
// open (they stand by `keeperSpot`), and the regulars (`regulars`: names of custom
// townsfolk to be found here, placed at their job spot or the room's free spots).
// Phase 29: `looks` overrides someone's look (Ryan off duty); a room's `sitSpots` put
// someone in a set place, still but talkable; and a married couple who are both here sit
// side by side (the two closest free spots) and stay together.
export function peopleIn(room, { keeper = null, regulars = [], looks = {} } = {}) {
  const out = (room.staff ?? []).map(s => ({ name: s.name, spot: s.spot, stay: true }));
  if (keeper && room.keeperSpot) out.push({ name: keeper, spot: room.keeperSpot, stay: true });
  const used = new Set();
  const key = sp => `${sp.tx},${sp.ty}`;
  const placed = new Map();
  for (const name of regulars) {
    const job = room.jobSpots?.[name], sit = room.sitSpots?.[name];
    if (job) placed.set(name, { name, spot: job, stay: true });
    else if (sit) { placed.set(name, { name, spot: sit, stay: false, still: true }); used.add(key(sit)); }
  }
  // Couples: the two closest free spots.
  const spots = room.spots ?? [];
  for (const name of regulars) {
    const sp = spouseOf(name);
    if (placed.has(name) || !sp || !regulars.includes(sp) || placed.has(sp)) continue;
    let best = null;
    for (const a of spots) for (const b of spots) {
      if (a === b || used.has(key(a)) || used.has(key(b))) continue;
      const d = Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
      if (!best || d < best.d) best = { a, b, d };
    }
    if (!best) continue;
    used.add(key(best.a)); used.add(key(best.b));
    const face = (from, to) => (Math.abs(to.tx - from.tx) >= Math.abs(to.ty - from.ty) ? (to.tx > from.tx ? 'right' : 'left') : (to.ty > from.ty ? 'down' : 'up'));
    placed.set(name, { name, spot: { ...best.a, facing: face(best.a, best.b) }, stay: false, still: true });
    placed.set(sp, { name: sp, spot: { ...best.b, facing: face(best.b, best.a) }, stay: false, still: true });
  }
  const free = spots.filter(sp => !used.has(key(sp)));
  let i = 0;
  for (const name of regulars) {
    const p = placed.get(name) ?? { name, spot: (free.length ? free : spots)[i++ % (free.length || spots.length)], stay: false };
    out.push(looks[name] ? { ...p, look: looks[name] } : p);
  }
  return out;
}
