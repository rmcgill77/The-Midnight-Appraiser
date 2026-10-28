// Night runs on Second Sight Pawn's own rules. The map, the finds, hazards,
// supplies and cryptids come from the original Crawl.generate; fights are the
// original Combat. Two things change for the top-down game:
//  - Steps: each cell of the original grid you walk into is one original step
//    (stamina, light drain, loot, hazards, supplies), ported from Crawl.move
//    without its every-other-step cryptid turn...
//  - ...because cryptids hunt in real time instead (cryptidTick), faster and
//    from farther away as your light fails. Contact starts the original fight.
// Endings follow the locked rules: climb out and keep everything; the clock
// runs out and a third of the unsecured haul is lost; a knockout (stress 100,
// the original panic) loses half the unsecured haul plus a little Heat.
// Secured finds sit outside the bag, so nothing can drop or steal them.

import { S } from './index.js';
import { weatherDef } from '../game/weather.js';
import { CONFIG } from '../config.js';
import { cue, cues } from './cues.js';
const { DATA } = S;

// Beneath Old Market stays off every list until the story (or an Endless rank) opens the other door.
export const zoneVisible = (st, z) => !!z && (!z.secret || S.Story.doorOpen(st));
export const nightZones = st => DATA.zones.filter(z => zoneVisible(st, z));

export function zoneLocked(st, z) {
  if (!z.requires) return null;
  for (const [k, lv] of Object.entries(z.requires)) if ((st.upgrades[k] || 0) < lv) return `Needs ${(DATA.gear[k] || { name: S.cap(k) }).name} Lv ${lv}`;
  return null;
}

export function enterBlocker(st, z) {
  if (!zoneVisible(st, z)) return 'Unknown zone.';
  if (st.run) return 'You are already inside a zone.';
  if (st.phase !== 'night') return 'Zones open after dark.';
  const lock = zoneLocked(st, z); if (lock) return lock;
  if (st.energy < z.energy) return 'Too tired. Go home and sleep.';
  if (st.stress >= 90) return 'Your nerves are shot. Sleep it off first.';
  return null;
}

export const secureSlots = st => Math.max(1, st.upgrades.bag || 1);
export const carried = run => run.bag.length + (run.secured?.length || 0);

export function enterZone(st, zoneId) {
  const z = S.zoneOf(zoneId), why = enterBlocker(st, z);
  if (why) return { error: why };
  st.energy -= z.energy;
  st.run = S.RNG.within(st, ['map', z.id, st.day, S.Recap.today(st).runs.length], () => S.Crawl.generate(st, z));
  st.run.secured = [];
  return { run: st.run };
}

// ---------- Kristen's breathing drill (Phase 29) ----------
// A nerve shield for the night: { left, max }, set by main.js (nerveShield.get). The first
// stress you'd take soaks into it instead. It works *before* the original rules look at your
// nerve, so it can stop a knockout too: during the step or fight round your stress is lowered
// by what the shield holds, then put back with only the stress the shield couldn't take.
export const nerveShield = { get: () => null };
export function shielded(st, fn) {
  const g = nerveShield.get(st);
  if (!g || g.left <= 0 || !st.run) return fn();
  const run = st.run, s0 = st.stress, low = Math.min(g.left, s0);
  st.stress = s0 - low;
  const r = fn();
  if (st.run !== run) return r;   // the run ended (a knockout): the rules have had their say
  const gain = st.stress - (s0 - low);
  if (gain > 0) { const take = Math.min(gain, g.left); g.left -= take; st.stress = Math.min(100, s0 + gain - take); }
  else st.stress = Math.max(0, s0 + gain);
  return r;
}

// ---------- steps ----------

// One step into the next cell, as the original Crawl.move did it, minus the
// cryptids' turn. Returns a note (a find, a hazard, 'encounter', 'panic') or null.
export function step(st, dx, dy) {
  const turn0 = st.run?.turn, zoneId = st.run?.zoneId;
  const note = shielded(st, () => rawStep(st, dx, dy));
  stepSounds(note, zoneId, st.run ? st.run.turn !== turn0 : note === 'panic');
  return note;
}

// Sounds for one step, as the original stepSounds: footsteps on this zone's floor plus whatever it turned up.
function stepSounds(note, zoneId, moved) {
  const z = S.zoneOf(zoneId);
  if (moved && z) cue('step', { floor: z.floor, wet: 0.12 });
  if (!note) return;
  if (note === 'encounter') return cue('encounter');
  if (note === 'panic') return cue('panic');
  if (note === 'Flashlight dead') return cue('powerdown');
  if (/^Found/.test(note)) return cue('find');
  const h = z && z.hazardTypes.find(x => x.name === note);
  if (h) return cue(h.sfx);
  if (DATA.supplies.some(x => x.name === note || (x.mat && String(note).startsWith(x.name + ' ·')))) return cue('supply');
  if (note === DATA.kit.ward.name) return cue('ward');
  if (note === DATA.kit.tincture.name || note === DATA.kit.cell.name) return cue('supply');
}

function rawStep(st, dx, dy) {
  const run = st.run, z = S.zoneOf(run.zoneId), C = S.Crawl;
  if (!run || run.encounter) return null;
  const nx = run.pos.x + dx, ny = run.pos.y + dy;
  if (!C.open(run, nx, ny)) return null;
  let note = null;
  run.kitNote = null;
  run.turn += 1;
  // Phase 18: walking is free (stamina is for sprinting, see sprintStep), the light drains a
  // little slower than the original, and the dark no longer costs nerve on its own: it makes
  // the cryptids bolder (cryptidTick). Only the clock ends a run; cryptids and nerve knock you out.
  if (st.battery > 0 && run.turn % lightDrainEvery(st) === 0) {
    st.battery = Math.max(0, st.battery - C.drain(st, z));
    if (st.battery === 0) {
      if (C.useKit(st, 'cell')) { st.battery = DATA.kitEffects.cell.battery; C.say(run, 'The light dies. You snap in the spare battery pack before the dark gets close.'); }
      else { C.say(run, 'Your flashlight dies. The dark comes right up to your face.'); note = 'Flashlight dead'; }
    }
  }
  run.pos = { x: nx, y: ny };
  run.facing = [dx, dy];
  const t = run.tiles[ny][nx];
  const room = S.MapGen.roomAt(run, nx, ny);
  if (room && run.roomsSeen && !run.roomsSeen.includes(room.name)) {
    run.roomsSeen.push(room.name);
    C.say(run, S.MapGen.enterLine(room.name));
    const story = S.Story.onRoom(st, room);
    if (story) { C.say(run, story); note = note || 'Your parents’ camp'; }
  }
  if (t.loot) {
    if (carried(run) < C.bagCap(st)) {
      const it = S.RNG.within(st, ['find', run.seed, run.pos.x, run.pos.y], () => S.Items.generate(st, { zoneId: z.id }));
      run.bag.push(it); t.loot = false;
      C.say(run, `Bagged ${S.an(S.Items.name(it))}.`);
      note = `Found: ${S.Items.name(it)}`;
    } else C.say(run, 'Something glints here, but your bag is full.');
  }
  if (t.hazard !== undefined) {
    const h = z.hazardTypes[t.hazard], blind = !t.known;
    C.apply(st, run, blind ? { stamina: (h.stamina || 0) + 1, stress: (h.stress || 0) + 5, battery: h.battery } : h);
    t.known = true;
    C.say(run, `${h.name}! ${h.text}${blind ? ' You never saw it coming.' : ''}`);
    note = h.name;
  }
  if (t.supply !== undefined) {
    const sp = DATA.supplies[t.supply];
    delete t.supply;
    if (sp.mat) {
      const got = Object.entries(sp.mat).map(([k, [lo, hi]]) => { const n = lo + Math.floor(S.rnd() * (hi - lo + 1)); st.supplies[k] += n; return `+${n} ${DATA.materials[k].name.toLowerCase()}`; }).join(', ');
      run.mats = (run.mats || 0) + 1;
      C.say(run, `${sp.name}. ${sp.text} ${got}.`);
      note = `${sp.name} · ${got}`;
    } else {
      C.apply(st, run, { ...sp, supply: true, stamina: sp.stamina ? -sp.stamina : 0 });
      if (sp.stamina) run.stamina = Math.min(C.maxStamina(st), run.stamina);
      C.say(run, `${sp.name}. ${sp.text}`);
      note = sp.name;
    }
  }
  if (C.cryptidAt(run, nx, ny)) C.contact(st, run);
  C.reveal(st, run);
  return C.checkPanic(st) || (run.encounter ? 'encounter' : run.kitNote || note);
}

// ---------- sprinting (Phase 18) ----------

// Stamina is only for running. Holding sprint while you move spends it; it comes back slowly
// once you stop sprinting. Run it dry and you can't sprint again until it's back to a floor.
// Hazards, fleeing a fight and energy drinks still change it, as in the original.
export const SPRINT = { speed: 1.6, drain: 9, refill: 3.2, delay: 0.8, floor: 12 };

// One frame. wants: the sprint control is held; moving: the player is actually moving.
// Returns the speed multiplier for this frame.
export function sprintStep(st, dt, wants, moving) {
  const run = st.run;
  if (!run || run.encounter) return 1;
  const max = S.Crawl.maxStamina(st);
  if (run.tired && run.stamina >= SPRINT.floor) run.tired = false;
  if (wants && moving && !run.tired && run.stamina > 0) {
    run.stamina = Math.max(0, run.stamina - SPRINT.drain * dt);
    run.rest = 0;
    if (run.stamina <= 0) { run.tired = true; S.Crawl.say(run, 'You’re out of breath. Walk it off.'); }
    return SPRINT.speed;
  }
  run.rest = (run.rest || 0) + dt;
  if (run.rest >= SPRINT.delay) run.stamina = Math.min(max, run.stamina + SPRINT.refill * dt);
  return 1;
}
export const canSprint = st => !!st.run && !st.run.tired && st.run.stamina > 0;

// ---------- cryptids, in real time ----------

export function lightLevel(st) {
  return st.battery <= 0 ? 'dark' : st.battery < CONFIG.night.lowBattery ? 'low' : 'lit';
}

export function cryptidInterval(st) {
  // Phase 23: the weather too. A storm makes them restless (shorter), snow sluggish (longer).
  const base = CONFIG.night.cryptidStep[lightLevel(st)] * (weatherDef(st.seed ?? 0, st.day).cryptidStep ?? 1);
  return st.assist?.cryptids ? base * 1.5 : base;
}
// How many steps between flashlight drains tonight (the cold drains it faster).
export const lightDrainEvery = st => Math.max(1, Math.round(CONFIG.night.lightDrainEvery * (weatherDef(st.seed ?? 0, st.day).lightEvery ?? 1)));

// Every cryptid takes one step: toward you if it can sense you, otherwise it wanders.
// Returns 'encounter' if one reached you, 'breathing' if one lurks unseen nearby.
export function cryptidTick(st) { return shielded(st, () => rawCryptidTick(st)); }
function rawCryptidTick(st) {
  const run = st.run, C = S.Crawl;
  if (!run || run.encounter) return null;
  const z = S.zoneOf(run.zoneId);
  const d = C.bfs(run, run.pos);
  const level = lightLevel(st);
  const aware = 4 + z.danger + (level === 'dark' ? 2 : level === 'low' ? 1 : 0);
  for (const c of run.cryptids) {
    if (c.stun > 0) { c.stun -= 1; continue; }
    const opts = C.DIRS.map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy }))
      .filter(o => C.open(run, o.x, o.y) && !run.cryptids.some(k => k !== c && k.x === o.x && k.y === o.y));
    if (!opts.length) continue;
    const hunting = d[c.y][c.x] >= 0 && d[c.y][c.x] <= aware;
    c.hunting = hunting;
    const next = hunting ? opts.reduce((b, o) => (d[o.y][o.x] < d[b.y][b.x] ? o : b)) : S.pick(S.rnd, opts);
    c.x = next.x; c.y = next.y;
  }
  if (C.cryptidAt(run, run.pos.x, run.pos.y)) { C.contact(st, run); if (run.encounter) cue('encounter'); return run.encounter ? 'encounter' : null; }
  const lit = C.lit(st, run);
  const near = run.cryptids.some(c => Math.abs(c.x - run.pos.x) + Math.abs(c.y - run.pos.y) <= 2 && !C.visibleCryptid(st, run, lit, c.x, c.y));
  return near ? 'breathing' : null;
}

// ---------- the bag ----------

export function secure(st, uid) {
  const run = st.run;
  if (!run || run.secured.length >= secureSlots(st)) return false;
  const i = run.bag.findIndex(x => x.uid === uid);
  if (i < 0) return false;
  run.secured.push(run.bag.splice(i, 1)[0]);
  return true;
}
export function unsecure(st, uid) {
  const run = st.run;
  const i = run?.secured.findIndex(x => x.uid === uid) ?? -1;
  if (i < 0) return false;
  run.bag.push(run.secured.splice(i, 1)[0]);
  return true;
}

// ---------- fights ----------

// One round of the original fight. If it ends the run (a knockout), the secured
// finds still come home and the knockout adds its Heat.
export function fight(st, action, arg) {
  const run = st.run;
  const r = shielded(st, () => S.Combat.act(st, action, arg));
  if (r) cues(r.sfx);
  if (r && !st.run && run) afterKnockout(st, run);
  return r;
}

// ---------- endings ----------

function bringSecured(st, run) {
  for (const it of run.secured || []) { st.inventory.loot.push(it); S.Recap.find(st, it, S.zoneOf(run.zoneId)?.name ?? 'a night run'); }
  const n = run.secured?.length || 0;
  run.secured = [];
  return n;
}

function afterKnockout(st, run) {
  bringSecured(st, run);
  st.heat += CONFIG.night.knockoutHeat;
  S.log(st, `Somebody saw you stagger home. +${CONFIG.night.knockoutHeat} Heat.`, 'warn');
}

// Climb out through the exit: keep everything.
export function climbOut(st) {
  const run = st.run;
  if (!run || run.encounter || run.pos.x !== run.exit.x || run.pos.y !== run.exit.y) return null;
  run.bag.push(...run.secured); run.secured = [];
  const n = run.bag.length;
  cue('extract');
  S.Crawl.finish(st, `Climbed out of ${S.zoneOf(run.zoneId).name}.`);
  return { how: 'exit', kept: n, lost: 0 };
}

// The zone clock ran out: drop a third of what isn't secured, and stumble home.
export function clockOut(st) {
  const run = st.run;
  if (!run) return null;
  run.encounter = null;
  const lose = Math.ceil(run.bag.length * CONFIG.night.clockOutLoss);
  const dropped = [];
  for (let i = 0; i < lose; i++) dropped.push(run.bag.splice(Math.floor(S.rnd() * run.bag.length), 1)[0]);
  run.bag.push(...run.secured); run.secured = [];
  const kept = run.bag.length;
  cue('bail');
  S.Crawl.finish(st, `The night ran out in ${S.zoneOf(run.zoneId).name}. You found your way out at dawn${dropped.length ? `, ${dropped.length} find${dropped.length > 1 ? 's' : ''} lighter` : ''}.`);
  return { how: 'clock', kept, lost: dropped.length, dropped };
}

// Check after any step or fight round: did the original panic end the run?
export function knockedOut(st, runBefore) {
  if (st.run || !runBefore) return null;
  afterKnockout(st, runBefore);
  return { how: 'knockout' };
}
