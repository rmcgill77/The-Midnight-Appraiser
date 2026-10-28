'use strict';

/* ===================================================================== state
   Two save slots, campaign and endless, each in its own localStorage key.
   Game.state is null while the title screen is up. */
const SAVE_VERSION = 2;
const SLOT_KEYS = { campaign: 'ssp.save.campaign', endless: 'ssp.save.endless', daily: 'ssp.save.daily' };

function log(st, text, kind = 'note') {
  st.log.unshift({ day: st.day, phase: st.phase, text, kind });
  if (st.log.length > DATA.config.logMax) st.log.length = DATA.config.logMax;
}

const Game = {
  state: null,
  slot: null,
  listeners: new Set(),
  storageOk: true,

  blank(mode = 'campaign', difficulty = 'medium', name = 'Owner', ride = 'foot') {
    const c = DATA.config, d = DATA.difficulty[mode === 'endless' ? 'endless' : difficulty];
    return {
      version: SAVE_VERSION,
      mode, difficulty: mode === 'endless' ? 'endless' : difficulty,
      player: { name },
      day: 1, phase: 'morning',
      auditDay: d.days ? d.days + 1 : null,
      cash: d.startCash, heat: 8,
      energy: c.maxEnergy, maxEnergy: c.maxEnergy,
      battery: 100, stress: 0,
      ap: { max: c.apBase, left: 0 },
      assist: { cryptids: false, stamina: false, battery: false, stress: false },
      bench: { mins: c.benchMins, max: c.benchMins },   // minutes
      supplies: { ...DATA.startSupplies },
      kit: { ...DATA.startKit },
      pack: { ward: true, tincture: true, cell: true },     // which consumables ride along on night runs
      cal: { emf: 100, uv: 100, reagent: 100, spirit: 100 }, // instrument calibration
      archive: { catalogued: [], restored: [] },
      research: { progress: {}, done: [] },
      rent: { amount: d.rent, every: d.rentEvery, dueDay: d.rentEvery, arrears: 0, strikes: 0, lateFees: 0 },
      inventory: { loot: [], stock: [] },
      upgrades: { emf: 1, uv: 1, reagent: 1, lore: 1, flashlight: 1, boots: 1, bag: 1, lamp: 1, circle: 1, spirit: 0, cells: 1 },
      counters: { ticket: 0, sold: 0, incidents: 0, appraised: 0, tests: 0, customer: 0, runs: 0, captives: 0, surrendered: 0, breakouts: 0 },
      bestiary: Object.fromEntries(DATA.species.map(s => [s.id, { seen: false, research: 0, weak: false, resist: false, banished: 0, captured: 0 }])),
      containment: [],
      city: { at: 'shop', done: {}, scouted: {}, market: null, trips: 0, carried: 0, noFuel: null },
      ride: { id: DATA.rides[ride] ? ride : 'foot', tier: 0 },
      rep: { techmage: 0, corporate: 0, hunters: 0, office: 0 },
      tutorial: { on: false, step: 0, base: { stock: 0, day: 1, runs: 0 }, flags: {} },
      tips: { seen: [], current: null },
      endless: { score: 0, by: {}, rank: 0, newRank: null, commission: null, lastCommission: 0, estate: null, lastEstate: 0 },
      story: { pledge: null, pledgeDue: false, pledgeDayTaken: null, name: 0, pages: [], seen: [], inbox: [], hidden: null, door: null, doorDay: null, doorForced: false, camp: null },
      shop: { day: 0, total: 0, queue: [], served: 0, current: null, sales: [], bought: [], jobs: [], pending: null, say: null },
      report: null,
      run: null,
      morningLine: DATA.morningLines[0],
      overnight: null, overnightCells: null,
      seed: null,                // this run's seed (js/core.js, Phase 12e); every random roll follows from it
      rngN: 0,                   // rolls used from the main stream
      seedKind: null,            // null (a random city) · 'code' (started from a seed code) · 'daily' (the Daily run)
      daily: null,               // the date of a Daily run, YYYY-MM-DD
      dayStart: null,            // cash and Heat at the start of the day, for the top boxes
      today: null,               // what happened today, for the end-of-day recap (js/recap.js)
      recap: null,               // last night's recap
      cases: [],                 // case files opened in this save: [{id, day}] (js/cases.js)
      log: [],
      gameOver: null,
      ui: { tab: 'shop', bench: null, station: 'bench' },
      dev: { showTruth: false }
    };
  },

  newGame({ mode, difficulty, name, ride, seed = null, seedKind = null, daily = null, slot = null }) {
    const st = this.blank(mode, difficulty, name, ride);
    st.seed = seed == null ? RNG.newSeed() : seed >>> 0;
    st.seedKind = seed == null ? null : (seedKind || 'code');
    st.daily = daily;
    st.cash += Ride.def(st).startCash || 0;
    st.dayStart = { cash: st.cash, heat: st.heat };
    RNG.within(st, ['start'], () => { for (let i = 0; i < 3; i++) st.inventory.loot.push(Items.generate(st, { zoneId: 'laundromat' })); });
    log(st, `${name} took over ${DATA.shopName}. Rent is ${money(st.rent.amount)} every ${st.rent.every} days.`, 'note');
    log(st, 'Three boxes from your parents’ last pickup are waiting in the basement lab.', 'loot');
    log(st, `Getting around: ${Ride.tier(st).name.toLowerCase()}.`, 'note');
    if (Settings.v.tutorial) Tutorial.start(st);
    if (st.auditDay) log(st, `The Office of Anomalous Property will audit the shop in ${st.auditDay - 1} days.`, 'warn');
    this.slot = slot || mode;
    this.state = st;
    this.rules();
    this.save();
    this.emit();
  },

  normalize(d) {             // merge over current defaults so fields added during development appear
    const def = this.blank(d.mode, d.difficulty, d.player && d.player.name, d.ride && d.ride.id);
    const st = { ...def, ...d };
    for (const k of ['player', 'ap', 'assist', 'bench', 'supplies', 'kit', 'pack', 'cal', 'archive', 'research', 'bestiary', 'city', 'ride', 'rent', 'inventory', 'upgrades', 'counters', 'rep', 'story', 'endless', 'tutorial', 'tips', 'shop', 'ui', 'dev'])
      st[k] = { ...def[k], ...d[k] };
    st.inventory.loot.forEach(Items.ensure);
    st.inventory.stock.forEach(Items.ensure);
    if (st.seed == null) st.seed = RNG.newSeed();   // saves from before seeded play get a seed of their own
    return st;
  },

  read(slot) {
    try {
      const raw = localStorage.getItem(SLOT_KEYS[slot]);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.version === SAVE_VERSION ? d : null;
    } catch (e) { this.storageOk = false; return null; }
  },
  open(slot) {
    const d = this.read(slot);
    if (!d) return false;
    this.slot = slot;
    this.state = this.normalize(d);
    this.rules();
    this.emit();
    return true;
  },
  save() {
    if (!this.state || !this.slot) return;
    try { localStorage.setItem(SLOT_KEYS[this.slot], JSON.stringify(this.state)); this.storageOk = true; }
    catch (e) { this.storageOk = false; }
  },
  erase(slot) {
    try { localStorage.removeItem(SLOT_KEYS[slot]); } catch (e) {}
    if (this.slot === slot) { this.state = null; this.slot = null; }
    this.emit();
  },
  quit() {
    this.save();
    this.state = null; this.slot = null;
    this.emit();
  },

  commit(mutator) {          // the only way state changes: mutate, enforce rules, save, re-render
    if (!this.state) return;
    mutator(this.state);
    this.rules();
    this.save();
    this.emit();
  },
  rules() {
    const st = this.state, c = DATA.config;
    st.heat = clamp(Math.round(st.heat), 0, c.heatMax);
    st.energy = clamp(st.energy, 0, st.maxEnergy);
    st.battery = clamp(st.battery, 0, 100);
    st.stress = clamp(st.stress, 0, 100);
    st.bench.max = Lab.benchMax(st);
    st.bench.mins = clamp(Math.round(st.bench.mins ?? st.bench.max), 0, st.bench.max);
    for (const k in st.cal) st.cal[k] = clamp(Math.round(st.cal[k]), 0, 100);
    st.ap.max = City.maxHours(st);
    st.ap.left = clamp(st.ap.left, 0, st.ap.max);
    for (const k in st.rep) st.rep[k] = clamp(Math.round(st.rep[k]), -50, Rep.cap(st, k));
    if (st.ui.bench && !st.inventory.loot.some(x => x.uid === st.ui.bench)) st.ui.bench = null;
    if (!st.gameOver && st.heat >= c.heatMax) {
      st.gameOver = { type: 'raid', day: st.day, reason: 'The Office of Anomalous Property kicked in the back door and sealed the lab.', recap: Audit.recap(st) };
      Bests.record(st);
      log(st, 'RAID. The shop has been seized.', 'warn');
    }
    Story.check(st);
    Cases.check(st);
    Shop.tick(st);
    Tutorial.advance(st);
    Tips.pick(st);
  },
  emit() { this.listeners.forEach(fn => fn(this.state)); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
};
