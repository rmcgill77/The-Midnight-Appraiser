// Customers on the shop floor, driven by Second Sight Pawn's own shop rules.
//  - Sellers (Shop.makeSeller) queue at the counter and haggle with you there.
//  - Buyers (Shop.makeCustomer) browse the cases, read each tag with Shop.offer,
//    and queue at the till: a deal pays on its own while you stand at the till,
//    a counter-offer waits for your answer.
// How many come, and in what mix, follows the original's Shop.planDay for that day,
// trimmed to what the shop's current stage can draw (shop-tiers.js), plus whoever the
// ads, the storefront and your regulars bring in (game/marketing.js). Comforts make
// people wait longer and spend a little more.

import { findPath } from '../engine/path.js';
import { S } from '../rules/index.js';
import { capPlan } from '../data/shop-tiers.js';
import { adjustArrivals, TYPES } from './weather.js';

export const CUSTOMER_TUNING = {
  speed: 38,
  spreadOver: 0.82,            // customers arrive across this share of the shop day
  sellerPatience: [60, 90],    // real seconds waiting in line
  buyerPatience: [45, 65],
  browseTime: [1.6, 2.6],
  reactTime: 1.3,
  payDelay: 0.7,
};

const rand = (rng, [a, b]) => a + rng.next() * (b - a);
const FACTION_LOOK = { techmage: 6, corporate: 7, hunters: 8, office: 9 };

export class Crowd {
  // world: { sim: () => st, displays: {slot: uid}, tier?: shop stage,
  //         extras?: () => [{kind, faction?}], comforts?: () => {patience, spend},
  //         seller?: sim => sim (a background can change how a seller opens),
  //         dress?: (sim, others) => { sprites, key },
  //         barred?: () => kinds kept out today, restricted?: (sim, item) => why not | null,
  //         v2.4: offer?/judge?: (sim, item) => a reading of the tag, or null for the original's,
  //         sell?: (sim, item, amount, fit) => true if it handled the sale itself }
  constructor(room, map, world, rng, tuning = CUSTOMER_TUNING) {
    this.room = room; this.map = map; this.world = world; this.rng = rng; this.t = tuning;
    this.list = []; this.nextId = 1; this.seq = 0;
    this.plan = null; this.spawned = 0;
    this.reserved = new Set();   // display slots a buyer has committed to
    this.events = { pay: null, walkout: null, refuse: null };
    this.passable = (tx, ty) => ty >= room.customerMinRow && !map.isSolid(tx, ty);
  }

  get st() { return this.world.sim(); }

  // Phase 24: the floor was rearranged (only ever with nobody in the shop).
  setRoom(room, map) {
    this.room = room; this.map = map;
    this.passable = (tx, ty) => ty >= room.customerMinRow && !map.isSolid(tx, ty);
  }

  // The day's arrivals: kinds from the original planner, times spread over the day.
  planToday() {
    const st = this.st;
    let planned = S.RNG.within(st, ['queue', st.day], () => S.Shop.planDay(st));
    // Phase 23: the weather brings more people in, or keeps them home.
    if (this.world.weather) planned = adjustArrivals(planned, this.world.weather(), () => this.rng.next());
    // v2.0: kinds the Office has barred for now (walk-in sellers, while on notice).
    // v2.2: a quiet holiday keeps some people home.
    const fewer = this.world.fewer?.() ?? 0;
    if (fewer > 0) planned = planned.slice(0, Math.max(1, planned.length - fewer));
    const barred = this.world.barred?.() ?? [];
    if (barred.length) planned = planned.filter(k => !barred.includes(k));
    // Phase 30: a shorter shift, or a late opening, brings fewer people.
    const scale = this.world.hoursScale?.() ?? 1;
    if (scale < 1) planned = planned.slice(0, Math.max(1, Math.round(planned.length * scale)));
    const kinds = this.world.tier == null ? planned.map(kind => ({ kind })) : capPlan(planned, this.world.tier, this.world.extras?.() ?? []);
    const n = kinds.length;
    // Phase 30: when the shop is open on its own hours, the people come when real people would.
    const times = this.world.arrivals?.(n, () => this.rng.next());
    this.plan = kinds.map(({ kind, faction, friend, with: w }, i) => ({ kind, faction, friend, with: w, at: times?.length === n ? times[i] : Math.min(0.97, ((i + 0.35 + this.rng.next() * 0.3) / Math.max(1, n)) * this.t.spreadOver) }));
    // Phase 29: a couple comes in together, a step apart.
    // Phase 30: a friend drops by when they're free, not at a random moment; one who is never free doesn't come.
    if (this.world.visitAt) {
      const gone = new Set();
      this.plan = this.plan.flatMap(p => {
        if (!p.friend) return [p];
        if (p.with && gone.has(p.with)) { gone.add(p.friend); return []; }
        if (p.with) return [p];                                   // the second of a couple follows the first
        const at = this.world.visitAt(p.friend, () => this.rng.next());
        if (at == null) { gone.add(p.friend); return []; }
        return [{ ...p, at }];
      }).sort((a, b) => a.at - b.at);
    }
    this.plan.forEach((p, i) => { if (p.with && i && this.plan[i - 1].friend === p.with) p.at = Math.min(0.98, this.plan[i - 1].at + 0.004); });
    return this.plan;
  }

  clear() { this.list = []; this.reserved.clear(); }

  line(kind) { return this.list.filter(c => c.queued === kind).sort((a, b) => a.queuedAt - b.queuedAt); }
  front(kind) {
    const c = this.line(kind)[0];
    return c && c.state === 'waiting' && atTile(c, this.room.lines[kind][0]) ? c : null;
  }

  update(dt, { open, progress = 0, playerAtTill }) {
    if (open) {
      if (!this.plan) this.planToday();
      while (this.spawned < this.plan.length && progress >= this.plan[this.spawned].at) {
        const p = this.plan[this.spawned];
        const c = this.spawn(p.kind, this.spawned, { faction: p.faction, friend: p.friend, sim: p.sim });
        const next = this.plan[this.spawned + 1];
        if (p.friend) this.events.friend?.(c, { with: p.with, partner: next?.with && next.with === p.friend ? next.friend : null });
        this.spawned++;
      }
    }
    for (const c of [...this.list]) this.#think(c, dt, playerAtTill);
    this.#settleLines();
  }

  // opts.sim: a ready-made customer (the walkthrough's); opts.patient: waits as long as it takes;
  // opts.faction: a regular, a buyer from that faction.
  spawn(kind, n = this.nextId, opts = {}) {
    const st = this.st, e = this.room.entrance;
    // Sellers, appraisal jobs and the inspector all come to the counter; buyers browse.
    const seenLen = st.shop?.seen?.length ?? 0;
    let sim = opts.sim ? opts.sim : kind === 'inspector'
      ? { id: ++st.counters.customer, kind: 'inspector', faction: 'inspector', name: 'Inspector Vance', line: 'Municipal Office of Anomalous Property. Routine look at your back case. You don’t mind.', bribe: 40 + st.heat }
      : S.RNG.within(st, ['customer', st.day, n], () => kind === 'sell' ? S.Shop.makeSeller(st) : kind === 'appraise' ? S.Shop.makeAppraiser(st) : S.Shop.makeCustomer(st));
    if (opts.faction && !opts.sim && kind === 'buy') {
      for (let i = 0; i < 24 && sim.faction !== opts.faction; i++) {
        if (st.shop?.seen) st.shop.seen.length = seenLen;     // the people who didn't come in weren't seen
        sim = S.RNG.within(st, ['regular', st.day, n, i], () => S.Shop.makeCustomer(st));
      }
      sim.regular = sim.faction === opts.faction;
    }
    if (kind === 'sell' && !opts.sim && this.world.seller) sim = this.world.seller(sim);
    // Phase 29: someone you know from around town, come to browse (their own face and name).
    if (opts.friend && !opts.sim) sim = { ...sim, name: opts.friend, friend: true };
    const mods = this.world.comforts?.() ?? { patience: 0, spend: 0 };
    if (kind === 'buy' && mods.spend && !opts.sim && sim.budget) sim.budget = Math.round(sim.budget * (1 + mods.spend));
    const c = {
      id: this.nextId++, kind: kind === 'buy' ? 'buyer' : 'seller', visit: kind, sim,
      look: kind === 'inspector' ? 9 : FACTION_LOOK[sim.faction] ?? this.rng.int(0, 5),
      x: e.tx * 16, y: e.ty * 16 - 4, facing: 'up', frame: 0, animT: 0, moving: false,
      path: [], state: 'enter', timer: 0, icon: null, iconT: 0,
      queued: null, queuedAt: 0, patience: 0, maxPatience: 1, pending: null, slot: null, seen: new Set(), patient: !!opts.patient,
    };
    // Their own face, different from everyone else in the shop right now (game/people.js).
    const d = this.world.dress?.(sim, this.list);
    if (d) { c.sprites = d.sprites; c.lookKey = d.key; c.face = d.look; }
    c.breathPhase = (c.id ?? 0) * 0.37 % 1.5;
    this.list.push(c);
    if (c.kind === 'seller') this.#join(c, 'sell');
    else this.#browseNext(c);
    return c;
  }

  // The shopkeeper finished with this customer (a deal, a decline, or the day ended).
  dismiss(c, mood) { this.#leave(c, mood); }

  // ---- internals ----

  #join(c, line) {
    c.queued = line; c.queuedAt = ++this.seq;
    const calm = (1 + (this.world.comforts?.().patience ?? 0)) * (TYPES[this.world.weather?.()]?.patience ?? 1);
    const p = c.patient ? 900 : rand(this.rng, line === 'sell' ? this.t.sellerPatience : this.t.buyerPatience) * calm;
    c.patience = p; c.maxPatience = p;
    c.state = 'toLine';
    c.icon = line === 'sell' ? (c.visit === 'inspector' ? 'inspect' : c.visit === 'appraise' ? 'ask' : 'deal') : c.pending?.counter ? 'hesitant' : 'pay';
  }

  // Pick a case: prefer one whose tag this buyer would even consider.
  #browseNext(c) {
    const st = this.st;
    const open = Object.entries(this.world.displays)
      .filter(([slot, uid]) => !this.reserved.has(slot) && !c.seen.has(slot) && st.inventory.stock.some(x => x.uid === uid))
      .map(([slot, uid]) => ({ slot, it: st.inventory.stock.find(x => x.uid === uid) }));
    if (!open.length) { this.#leave(c, c.seen.size ? null : 'browse'); return; }
    const fits = open.filter(o => (this.world.judge?.(c.sim, o.it) ?? S.Shop.judge(c.sim, o.it)).fit !== 'no');
    const choice = (fits.length && this.rng.chance(0.75) ? this.rng.pick(fits) : this.rng.pick(open));
    const stand = this.#standFor(choice.slot);
    if (!stand) { c.seen.add(choice.slot); this.#browseNext(c); return; }
    c.slot = choice.slot; c.state = 'toCase';
    this.#walkTo(c, stand);
  }

  #standFor(slot) {
    const [tx, ty] = slot.split(',').map(Number);
    for (const t of [{ tx, ty: ty + 1 }, { tx, ty: ty - 1 }, { tx: tx - 1, ty }, { tx: tx + 1, ty }]) {
      if (this.passable(t.tx, t.ty)) return t;
    }
    return null;
  }

  #walkTo(c, tile) {
    const from = tileOf(c);
    const path = findPath(from, tile, this.passable, this.map.cols, this.map.rowsN);
    c.path = path ?? [];
    if (c.x !== from.tx * 16 || c.y !== from.ty * 16 - 4) c.path.unshift(from); // back onto the grid first
  }

  #leave(c, mood) {
    if (c.state === 'leaving') return;
    if (c.slot && c.pending) this.reserved.delete(c.slot);
    c.queued = null; c.state = 'leaving'; c.pending = null;
    if (mood) { c.icon = mood; c.iconT = 1.6; } else c.icon = null;
    this.#walkTo(c, this.rng.pick(this.room.exit));
  }

  #settleLines() {
    for (const kind of ['sell', 'buy']) {
      this.line(kind).forEach((c, i) => {
        const spots = this.room.lines[kind], spot = spots[Math.min(i, spots.length - 1)];
        if (c.lineSpot?.tx !== spot.tx || c.lineSpot?.ty !== spot.ty) {
          c.lineSpot = spot;
          this.#walkTo(c, spot);
          if (c.state === 'waiting') c.state = 'toLine';
        }
      });
    }
  }

  #think(c, dt, playerAtTill) {
    this.#step(c, dt);
    if (c.iconT > 0) {
      c.iconT -= dt;
      if (c.iconT <= 0 && c.state !== 'leaving') c.icon = c.queued === 'sell' ? (c.visit === 'inspector' ? 'inspect' : c.visit === 'appraise' ? 'ask' : 'deal') : c.queued === 'buy' ? (c.pending?.counter ? 'hesitant' : 'pay') : null;
    }
    const arrived = c.path.length === 0;
    const st = this.st;

    switch (c.state) {
      case 'toCase':
        if (arrived) { c.state = 'browse'; c.timer = rand(this.rng, this.t.browseTime); c.icon = 'browse'; c.facing = faceToward(c, c.slot); }
        break;
      case 'browse': {
        c.timer -= dt;
        const uid = this.world.displays[c.slot];
        const it = uid && st.inventory.stock.find(x => x.uid === uid);
        if (!it || this.reserved.has(c.slot)) { c.seen.add(c.slot); this.#browseNext(c); break; }
        if (c.timer > 0) break;
        c.seen.add(c.slot);
        // v2.0: under an Office restriction some sales can't happen (cursed stock, faction buyers).
        const no = this.world.restricted?.(c.sim, it);
        // v2.4: night buyers read tags their own way (rules/night-shop.js).
        const o = no ? { result: 'refuse', say: no } : this.world.offer?.(c.sim, it) ?? S.Shop.offer(c.sim, it);
        if (o.result === 'deal' || o.result === 'counter') {
          this.reserved.add(c.slot);
          c.pending = { uid: it.uid, amount: o.amount, fit: o.fit, counter: o.result === 'counter' };
          c.icon = o.result === 'deal' ? 'content' : 'hesitant'; c.iconT = this.t.reactTime;
          c.state = 'react'; c.timer = this.t.reactTime;
        } else {
          c.sim.refusals += 1;
          c.say = o.say;
          this.events.refuse?.(c, it, o.say);
          c.icon = 'offended'; c.iconT = this.t.reactTime;
          c.state = 'react'; c.timer = this.t.reactTime;
        }
        break;
      }
      case 'react':
        c.timer -= dt;
        if (c.timer > 0) break;
        if (c.pending) this.#join(c, 'buy');
        else if (c.sim.refusals >= S.DATA.config.maxRefusals) this.#leave(c, null);
        else this.#browseNext(c);
        break;
      case 'toLine':
        if (arrived) { c.state = 'waiting'; c.facing = 'up'; }
        break;
      case 'waiting': {
        c.patience -= dt;
        if (c.patience <= 0 && c.visit === 'inspector') {
          // The inspector doesn't give up: he lets himself into the back case.
          this.events.inspect?.(c);
          break;
        }
        if (c.patience <= 0) {
          this.events.walkout?.(c);
          S.log(st, `${c.sim.name} got tired of waiting and left.`, 'note');
          this.#leave(c, 'angry');
          break;
        }
        // A plain deal pays on its own once the shopkeeper is at the till.
        if (c.queued === 'buy' && c.pending && !c.pending.counter && this.front('buy') === c && playerAtTill) {
          c.timer = (c.timer > 0 ? c.timer : this.t.payDelay) - dt;
          if (c.timer <= 0) this.complete(c);
        } else if (c.queued === 'buy') c.timer = 0;
        break;
      }
      case 'leaving':
        if (arrived) this.list.splice(this.list.indexOf(c), 1);
        break;
    }
  }

  // Ring up a buyer at the till, at the agreed amount. Returns the price, or 0.
  complete(c, amount = c.pending?.amount) {
    const st = this.st, p = c.pending;
    if (!p) return 0;
    const it = st.inventory.stock.find(x => x.uid === p.uid);
    this.reserved.delete(c.slot);
    if (!it) { this.#leave(c, 'angry'); return 0; }
    if (this.fumble) amount = this.fumble(amount);        // a tired player rings it up wrong now and then
    if (!this.world.sell?.(c.sim, it, amount, p.fit)) S.Shop.sell(st, c.sim, it, amount, p.fit);
    for (const [slot, uid] of Object.entries(this.world.displays)) if (uid === it.uid) delete this.world.displays[slot];
    c.pending = null;
    this.events.pay?.(c, amount, it);
    this.#leave(c, 'content');
    return amount;
  }

  #step(c, dt) {
    c.moving = false;
    if (!c.path.length) return;
    const next = c.path[0];
    const gx = next.tx * 16, gy = next.ty * 16 - 4;
    const dx = gx - c.x, dy = gy - c.y, dist = Math.hypot(dx, dy);
    const sp = this.t.speed * dt;
    if (dist <= sp) { c.x = gx; c.y = gy; c.path.shift(); }
    else { c.x += dx / dist * sp; c.y += dy / dist * sp; }
    c.moving = true;
    c.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    c.animT += dt;
    if (c.animT > 0.13) { c.animT = 0; c.frame = (c.frame + 1) % 4; }
  }

  save() { return { spawned: this.spawned, day: this.st.day }; }
  load(d) { if (d && d.day === this.st.day) this.spawned = d.spawned | 0; }
}

export function tileOf(c) { return { tx: Math.round(c.x / 16), ty: Math.round((c.y + 4) / 16) }; }
function atTile(c, t) { const p = tileOf(c); return p.tx === t.tx && p.ty === t.ty && !c.path.length; }
function faceToward(c, slot) {
  const [tx, ty] = slot.split(',').map(Number), p = tileOf(c);
  if (ty < p.ty) return 'up'; if (ty > p.ty) return 'down';
  return tx < p.tx ? 'left' : 'right';
}
