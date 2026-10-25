// Fishing (v2.3): the beach, the pier, the rocks, the harbor jetties and the river.
//
// "The Scales": once something bites, a brass pawn-shop scale appears. Whatever's on the
// line pushes the beam one way and then the other; you lean the other way (the stick, or
// left and right) to keep the needle in the middle. Balanced, you reel it in. Pinned at
// either end too long, the line snaps. A fish fights: it darts and pulls and changes its
// mind. A thing (hooked junk, or something better) doesn't fight at all. It just comes up
// heavy, the beam leaning steadily one way, and a good appraiser feels the difference.
//
// What bites depends on where you are, the season, the time of day, the weather, the tide
// and your bait. Fish sell only to the fisherman on the boardwalk, whose prices move every
// day; they can also be given as gifts. Things you hook go to your bench, to be looked at
// and sold in your own shop like anything else. The fishing log keeps every kind you've
// caught and the biggest of each, with something for you at 5, 10, 15 and every kind.
//
// Pure functions over world.fishing; main.js does the screen.

import { RNG } from '../engine/rng.js';

// ---------- the gear ----------

// band: how wide the balanced zone is; reel: how fast a balanced line comes in (per
// second, before weight); line: seconds the line holds pinned at an end; window: seconds
// to set the hook after a bite; max: the weight (lb) it handles before big fish get the
// better of it.
export const RODS = {
  cane: { id: 'cane', name: 'Bamboo pole', price: 25, band: 0.24, reel: 0.17, line: 1.6, window: 0.9, max: 12, blurb: 'Light and forgiving with small fish. Anything big will walk all over it.' },
  glass: { id: 'glass', name: 'Fiberglass rod', price: 90, band: 0.29, reel: 0.22, line: 2.3, window: 1.1, max: 40, blurb: 'A proper rod. Holds a decent fish, bends instead of breaking.' },
  carbon: { id: 'carbon', name: 'Carbon rod', price: 240, band: 0.33, reel: 0.29, line: 3.0, window: 1.25, max: 150, blurb: 'Stiff, quick, strong. For the big ones off the end of the pier.' },
  // A reward (15 kinds in the log): brass fittings, an appraiser's feel for the line. It
  // tells you at the bite whether it's a fish or a thing.
  brass: { id: 'brass', name: 'The Appraiser’s Rod', price: 0, band: 0.38, reel: 0.33, line: 3.6, window: 1.4, max: 400, tell: true, reward: true, blurb: 'Brass fittings and a cork grip worn to your hand. You can feel what’s on the line before you see it.' },
};
export const ROD_ORDER = ['cane', 'glass', 'carbon', 'brass'];

// Bait, by the pack. bite: how soon things bite; things: how likely you hook a thing
// instead of a fish; big: bigger fish (and the kinds that only take it).
export const BAIT = {
  worms: { id: 'worms', name: 'Bloodworms', pack: 10, price: 4, bite: 1, things: 1, big: 0, blurb: 'Everything eats worms.' },
  shrimp: { id: 'shrimp', name: 'Shrimp', pack: 10, price: 8, bite: 1.2, things: 1, big: 0.15, blurb: 'Bass and cod go for shrimp. Bigger fish, quicker bites.' },
  squid: { id: 'squid', name: 'Squid strips', pack: 8, price: 12, bite: 1.1, things: 1, big: 0.35, blurb: 'For the big ones. Some fish won’t look at anything else.' },
  magnet: { id: 'magnet', name: 'Magnet lure', pack: 5, price: 15, bite: 0.9, things: 4, big: 0, fishOnly: false, blurb: 'Not for fish. For what people threw off the pier. Strictly for the pawn trade.' },
};
export const BAIT_ORDER = ['worms', 'shrimp', 'squid', 'magnet'];
export const COOLER_MAX = 20;

// ---------- the fish ----------

// where: pier (deep water off the end), surf (from the wet sand), rocks (by the
// breakwater), harbor (v2.5b: the river mouth, where it runs out through the dunes), river. seasons and times
// ('morning' 6-12, 'afternoon' 12-17, 'evening' 17-21, 'night'), weather it favors,
// tide it favors, rarity (a weight), lb: [min, max], fight: { pull, dart } (how hard it
// pushes, how often it changes its mind), price: base, per fish of average size.
const ALL = ['spring', 'summer', 'autumn', 'winter'];
const DAY = ['morning', 'afternoon'];
export const FISH = [
  { id: 'mackerel', name: 'Atlantic mackerel', where: ['pier', 'harbor'], seasons: ['spring', 'summer', 'autumn'], times: [...DAY, 'evening'], rarity: 10, lb: [0.5, 2], fight: { pull: 0.45, dart: 0.8 }, price: 6, note: 'Quick, striped, everywhere in summer.' },
  { id: 'herring', name: 'Herring', where: ['harbor', 'pier'], seasons: ['spring', 'winter'], times: ['morning', 'afternoon', 'evening'], rarity: 9, lb: [0.3, 1], fight: { pull: 0.3, dart: 0.7 }, price: 3, note: 'Silver and nervous. Comes in shoals.' },
  { id: 'smelt', name: 'Rainbow smelt', where: ['harbor', 'river'], seasons: ['winter'], times: ALL_TIMES(), rarity: 8, lb: [0.1, 0.4], fight: { pull: 0.2, dart: 0.6 }, price: 2, note: 'Smells like cucumber. Nobody knows why.' },
  { id: 'flounder', name: 'Winter flounder', where: ['surf', 'harbor'], seasons: ALL, times: DAY, tide: 'low', rarity: 8, lb: [0.5, 3], fight: { pull: 0.35, dart: 0.25 }, price: 8, note: 'Lies flat and looks up with both eyes on one side.' },
  { id: 'scup', name: 'Scup', where: ['pier', 'rocks'], seasons: ['summer'], times: DAY, rarity: 9, lb: [0.5, 2], fight: { pull: 0.4, dart: 0.5 }, price: 5, note: 'A panfish. Dot will fry it if you ask nicely.' },
  { id: 'pollock', name: 'Pollock', where: ['pier', 'harbor', 'rocks'], seasons: ['winter', 'spring'], times: ALL_TIMES(), rarity: 8, lb: [1, 6], fight: { pull: 0.5, dart: 0.4 }, price: 7, note: 'Cod’s plainer cousin. Plenty of it.' },
  { id: 'cod', name: 'Atlantic cod', where: ['pier'], seasons: ['autumn', 'winter'], times: DAY, rarity: 6, lb: [2, 15], fight: { pull: 0.55, dart: 0.3 }, price: 12, likes: 'shrimp', note: 'The fish this harbor was built on.' },
  { id: 'bluefish', name: 'Bluefish', where: ['surf', 'pier'], seasons: ['summer', 'autumn'], times: DAY, rarity: 5, lb: [3, 12], fight: { pull: 0.75, dart: 0.75 }, price: 15, likes: 'squid', note: 'All teeth and temper. Mind your fingers.' },
  { id: 'seabass', name: 'Black sea bass', where: ['pier', 'rocks'], seasons: ['summer', 'autumn'], times: ['morning', 'evening'], rarity: 5, lb: [1, 6], fight: { pull: 0.6, dart: 0.5 }, price: 18, likes: 'shrimp', note: 'Dark as harbor water, sweet as anything.' },
  { id: 'striper', name: 'Striped bass', where: ['surf', 'rocks'], seasons: ['spring', 'autumn'], times: ['morning', 'evening', 'night'], tide: 'high', rarity: 4, lb: [5, 30], fight: { pull: 0.8, dart: 0.45 }, price: 30, likes: 'squid', note: 'The one everybody on the beach is after.' },
  { id: 'tautog', name: 'Tautog', where: ['rocks'], seasons: ['spring', 'autumn'], times: DAY, rarity: 5, lb: [2, 10], fight: { pull: 0.7, dart: 0.2 }, price: 16, note: 'Lives in the rocks and pulls you into them.' },
  { id: 'skate', name: 'Little skate', where: ['surf'], seasons: ALL, times: ALL_TIMES(), tide: 'low', rarity: 6, lb: [1, 5], fight: { pull: 0.5, dart: 0.1 }, price: 6, note: 'A kite with a tail. Comes in like a wet doormat.' },
  { id: 'dogfish', name: 'Spiny dogfish', where: ['pier', 'surf'], seasons: ['summer', 'autumn'], times: ['evening', 'night'], rarity: 7, lb: [3, 10], fight: { pull: 0.55, dart: 0.55 }, price: 4, note: 'A small shark. The fisherman calls it a nuisance.' },
  { id: 'eel', name: 'American eel', where: ['harbor', 'rocks', 'river'], seasons: ['summer', 'autumn'], times: ['evening', 'night'], weather: ['rain', 'storm', 'fog'], rarity: 5, lb: [1, 5], fight: { pull: 0.5, dart: 1 }, price: 14, note: 'Ties itself in knots. Ties you in knots.' },
  { id: 'perch', name: 'Yellow perch', where: ['river'], seasons: ['spring', 'summer', 'autumn'], times: DAY, rarity: 9, lb: [0.3, 1.5], fight: { pull: 0.35, dart: 0.6 }, price: 4, note: 'Golden, barred, easy. Kids catch them off the bridges.' },
  { id: 'catfish', name: 'Channel catfish', where: ['river'], seasons: ['summer', 'autumn'], times: ['evening', 'night'], weather: ['rain', 'overcast'], rarity: 6, lb: [2, 15], fight: { pull: 0.7, dart: 0.25 }, price: 11, note: 'Whiskers, and a face only a mother could love.' },
  { id: 'carp', name: 'Mirror carp', where: ['river'], seasons: ALL, times: DAY, rarity: 5, lb: [3, 25], fight: { pull: 0.75, dart: 0.3 }, price: 9, note: 'Big golden scales like coins. You’d think a pawnbroker would like it.' },
  { id: 'monkfish', name: 'Monkfish', where: ['pier'], seasons: ['winter'], times: ALL_TIMES(), rarity: 2, lb: [5, 30], fight: { pull: 0.7, dart: 0.15 }, price: 40, likes: 'squid', note: 'All mouth. Ugly enough to scare the gulls.' },
  { id: 'tuna', name: 'Bluefin tuna', where: ['pier'], seasons: ['summer'], times: ['morning'], rarity: 1, lb: [30, 120], fight: { pull: 1, dart: 0.6 }, price: 150, needs: 'squid', note: 'Comes in close in high summer, some mornings. Strong as a car.' },
  { id: 'lanternfish', name: 'Lanternfish', where: ['pier'], seasons: ALL, times: ['night'], rarity: 2, lb: [0.1, 0.3], fight: { pull: 0.25, dart: 0.9 }, price: 45, note: 'It glows. It keeps glowing in the cooler. It keeps glowing after.' },
  { id: 'glasseel', name: 'Glass eel', where: ['harbor', 'river'], seasons: ['spring'], times: ['night'], rarity: 2, lb: [0.05, 0.1], fight: { pull: 0.2, dart: 1 }, price: 60, note: 'Clear as water. You can see its heart going.' },
  { id: 'grandfather', name: 'The Old Grandfather', where: ['pier', 'rocks'], seasons: ALL, times: ALL_TIMES(), weather: ['storm'], tide: 'high', needs: 'squid', rarity: 0.4, lb: [180, 260], fight: { pull: 1, dart: 0.35 }, price: 500, legend: true, note: 'A sturgeon older than the harbor. They say he only comes up in a storm, on the high tide.' },
];
function ALL_TIMES() { return ['morning', 'afternoon', 'evening', 'night']; }
export const fishById = id => FISH.find(f => f.id === id) ?? null;

// Rewards in the log, by the number of kinds caught.
export const LOG_REWARDS = [
  { at: 5, id: 'r5', text: 'Five kinds. The fisherman throws in a pack of squid and says you’re not hopeless.', bait: { squid: 8 }, cash: 0 },
  { at: 10, id: 'r10', text: 'Ten kinds. A carbon rod, “on the house, before I change my mind.”', rod: 'carbon' },
  { at: 15, id: 'r15', text: 'Fifteen kinds. The Appraiser’s Rod: brass fittings and a cork grip. You can feel what’s on the line.', rod: 'brass' },
  { at: FISH.length, id: 'rall', text: 'Every kind in the harbor, the Old Grandfather too. Your name goes on the board at the bait shop, and $500.', cash: 500 },
];

// ---------- the water ----------

// Two tides a day, about 12 hours 25 minutes apart, from a fixed start.
export const TIDE_PERIOD = 745;
export function tideAt(day, minute) {
  const t = (((day * 1440 + minute + 200) % TIDE_PERIOD) + TIDE_PERIOD) % TIDE_PERIOD / TIDE_PERIOD;
  const level = Math.cos(2 * Math.PI * t), rising = Math.sin(2 * Math.PI * t) < 0;
  const name = level > 0.6 ? 'high' : level < -0.6 ? 'low' : rising ? 'rising' : 'falling';
  return { level, name, rising, label: name === 'high' ? 'High tide' : name === 'low' ? 'Low tide' : rising ? 'Tide coming in' : 'Tide going out' };
}
export const timeOfDay = m => (m >= 6 * 60 && m < 12 * 60 ? 'morning' : m >= 12 * 60 && m < 17 * 60 ? 'afternoon' : m >= 17 * 60 && m < 21 * 60 ? 'evening' : 'night');

// ---------- the state ----------

export function fishingOf(world) {
  world.fishing ??= { rod: null, rods: [], bait: {}, using: null, cooler: [], log: {}, rewards: [], casts: 0, next: 1 };
  return world.fishing;
}
export const hasRod = world => !!fishingOf(world).rod;
export const rodOf = world => RODS[fishingOf(world).rod] ?? null;
export const baitLeft = (world, id) => fishingOf(world).bait[id] ?? 0;
// The bait on the hook: the one you chose, if you have any left; otherwise the first you have.
export function baitInUse(world) {
  const F = fishingOf(world);
  if (F.using && baitLeft(world, F.using) > 0) return F.using;
  return BAIT_ORDER.find(id => baitLeft(world, id) > 0) ?? null;
}

// What could bite here and now, and how likely each is. cond: { spot, season, time,
// weather, tide (name), bait (id or null) }.
export function chances(cond) {
  const bait = BAIT[cond.bait] ?? null;
  const out = [];
  for (const f of FISH) {
    if (!f.where.includes(cond.spot) || !f.seasons.includes(cond.season) || !f.times.includes(cond.time)) continue;
    if (f.needs && f.needs !== cond.bait) continue;
    if (f.legend && !(f.weather?.includes(cond.weather) && (!f.tide || cond.tide === f.tide))) continue;
    let w = f.rarity;
    if (f.tide && (cond.tide === f.tide || (f.tide === 'high' && cond.tide === 'rising') || (f.tide === 'low' && cond.tide === 'falling'))) w *= cond.tide === f.tide ? 2 : 1.4;
    if (f.weather?.includes(cond.weather)) w *= 2;
    if (f.likes && f.likes === cond.bait) w *= 2;
    if (bait?.big && f.lb[1] >= 10) w *= 1 + bait.big * 2;
    out.push({ fish: f, w });
  }
  return out;
}
// How likely the next bite is a thing rather than a fish.
export function thingChance(cond) {
  if (cond.noThings) return 0;          // the water's given up what it had today
  const base = cond.spot === 'harbor' ? 0.2 : cond.spot === 'river' ? 0.16 : 0.1;
  const bait = BAIT[cond.bait];
  if (!bait) return Math.min(0.6, base * 2.5);
  return Math.min(0.75, base * bait.things);
}
// Seconds until something bites (a fresh one each cast). Slower in the cold, the storm,
// the middle of the day; quicker at the turn of the tide and with better bait.
export function biteDelay(cond, rng) {
  const bait = BAIT[cond.bait];
  let s = 3 + rng.next() * 7;
  if (cond.season === 'winter') s *= 1.3;
  if (cond.time === 'afternoon') s *= 1.15;
  if (cond.tide === 'rising' || cond.tide === 'falling') s *= 0.85;
  return s / (bait ? bait.bite : 0.7);
}

// Roll the bite. Returns { kind: 'fish', fish, lb } or { kind: 'thing' }, or null (nothing
// takes it: nothing lives there now).
export function rollBite(cond, rng) {
  if (rng.next() < thingChance(cond)) return { kind: 'thing' };
  if (cond.bait === 'magnet' && rng.next() < 0.6) return null;      // a magnet doesn't interest fish much
  const list = chances(cond);
  if (!list.length) return cond.bait === 'magnet' && !cond.noThings ? { kind: 'thing' } : null;
  let r = rng.next() * list.reduce((a, c) => a + c.w, 0), pick = list[0].fish;
  for (const c of list) { r -= c.w; if (r <= 0) { pick = c.fish; break; } }
  const big = BAIT[cond.bait]?.big ?? 0;
  const u = Math.min(1, Math.pow(rng.next(), 1.6 - big));
  const lb = Math.round((pick.lb[0] + (pick.lb[1] - pick.lb[0]) * u) * 10) / 10;
  return { kind: 'fish', fish: pick, lb };
}

// ---------- The Scales ----------

// A fight on the scale. The beam angle is -1 (pinned left) to 1 (pinned right).
export function startReel(bite, rod, rng) {
  const heavy = bite.kind === 'thing';
  const f = bite.fish;
  // Over the rod's limit, a fish pulls harder still.
  const over = !heavy && bite.lb > rod.max ? Math.min(1.6, 1 + (bite.lb - rod.max) / rod.max) : 1;
  return {
    bite, rod, heavy, t: 0, angle: 0, vel: 0, reel: 0, strain: 0, done: null,
    pull: heavy ? 0.55 + rng.next() * 0.25 : (f.fight.pull * 0.9 + 0.1) * over,
    dart: heavy ? 0 : f.fight.dart,
    dir: rng.next() < 0.5 ? -1 : 1, force: 0, target: 0, nextTurn: 0.4,
    // How much each fish weighs on the reel: a big one takes longer to bring in.
    weight: heavy ? 1.6 : 1 + Math.min(2.2, Math.log10(1 + bite.lb)),
    told: false,
  };
}

// One step. lean: the stick, -1..1 (lean left pushes the beam left). Returns the fight.
export function stepReel(R, dt, lean, rng) {
  if (R.done) return R;
  R.t += dt;
  if (R.heavy) {
    // A thing doesn't fight. It hangs there, heavy, and leans the beam one way, steadily.
    R.target = R.dir * R.pull * (0.9 + 0.1 * Math.sin(R.t * 0.7));
  } else {
    R.nextTurn -= dt;
    if (R.nextTurn <= 0) {
      // A fish changes its mind: a dart one way or the other, harder the stronger it is.
      R.dir = rng.next() < 0.35 + R.dart * 0.3 ? -R.dir : R.dir;
      R.target = R.dir * R.pull * (0.55 + rng.next() * 0.65);
      R.nextTurn = (0.5 + rng.next() * 1.4) / (0.6 + R.dart);
    }
    R.target += (rng.next() - 0.5) * R.dart * 0.6 * dt * 10 * R.pull;
  }
  R.force += (R.target - R.force) * Math.min(1, dt * (R.heavy ? 1.5 : 4 + R.dart * 6));
  const acc = (R.force - lean * 0.95) * 3.2 - R.vel * 2.4 - R.angle * 0.6;
  R.vel += acc * dt;
  R.angle = Math.max(-1, Math.min(1, R.angle + R.vel * dt));
  if (Math.abs(R.angle) >= 1) R.vel *= -0.2;
  const balanced = Math.abs(R.angle) < R.rod.band;
  R.reel = Math.max(0, Math.min(1, R.reel + (balanced ? R.rod.reel / R.weight : -0.04) * dt));
  R.strain = Math.max(0, R.strain + (Math.abs(R.angle) > 0.88 ? dt / R.rod.line : -dt * 0.5));
  if (R.strain >= 1) R.done = 'snapped';
  else if (R.reel >= 1) R.done = 'landed';
  return R;
}
export const balanced = R => Math.abs(R.angle) < R.rod.band;
// The tell: after a second on the line, a thing has never once fought you.
export const feelsHeavy = R => R.heavy && (R.t > 1.2 || !!R.rod.tell);

// ---------- what you catch ----------

// Land a fish: into the cooler (if there's room) and the log. Returns { fish, lb, record,
// first, rewards: [...] } (rewards newly earned, already applied).
export function landFish(world, day, bite) {
  const F = fishingOf(world), f = bite.fish;
  const entry = F.log[f.id] ?? { n: 0, best: 0, first: day };
  const first = entry.n === 0, record = bite.lb > entry.best;
  entry.n += 1; entry.best = Math.max(entry.best, bite.lb);
  F.log[f.id] = entry;
  const kept = F.cooler.length < COOLER_MAX;
  if (kept) F.cooler.push({ uid: `F${F.next++}`, id: f.id, lb: bite.lb, day });
  return { fish: f, lb: bite.lb, first, record: record && !first, kept, rewards: claimRewards(world) };
}
export const kindsCaught = world => Object.keys(fishingOf(world).log).length;
export function claimRewards(world) {
  const F = fishingOf(world), n = kindsCaught(world), got = [];
  for (const r of LOG_REWARDS) {
    if (n < r.at || F.rewards.includes(r.id)) continue;
    F.rewards.push(r.id);
    if (r.bait) for (const [id, k] of Object.entries(r.bait)) F.bait[id] = (F.bait[id] ?? 0) + k;
    if (r.rod) giveRod(world, r.rod);
    got.push(r);
  }
  return got;
}
export function giveRod(world, id) {
  const F = fishingOf(world);
  if (!F.rods.includes(id)) F.rods.push(id);
  // You fish with the best rod you own.
  F.rod = ROD_ORDER.filter(r => F.rods.includes(r)).pop() ?? null;
}
export function useBait(world, id) { const F = fishingOf(world); if ((F.bait[id] ?? 0) > 0) F.bait[id] -= 1; }

// ---------- the fisherman's board ----------

const hash01 = (...k) => new RNG(k.join(':')).next();
// Today's catch of the day: one kind in season pays half again.
export function hotFish(day, season) {
  const pool = FISH.filter(f => f.seasons.includes(season) && !f.legend);
  return pool[Math.floor(hash01('hot', day) * pool.length)]?.id ?? null;
}
// What the fisherman pays today for a kind, at its average size; prices drift day to day.
export function boardPrice(id, day, season) {
  const f = fishById(id);
  if (!f) return 0;
  const drift = 0.75 + 0.5 * hash01('board', day, id);
  const off = f.seasons.includes(season) ? 1 : 1.3;          // out of season: scarcer, dearer
  const hot = hotFish(day, season) === id ? 1.5 : 1;
  return Math.max(1, Math.round(f.price * drift * off * hot));
}
// One fish, by its size: bigger than average pays more, smaller less.
export function fishPrice(catchEntry, day, season) {
  const f = fishById(catchEntry.id);
  if (!f) return 0;
  const avg = (f.lb[0] + f.lb[1]) / 2;
  return Math.max(1, Math.round(boardPrice(f.id, day, season) * Math.pow(catchEntry.lb / avg, 0.6)));
}
export function sellFish(world, uids, day, season) {
  const F = fishingOf(world);
  let total = 0;
  F.cooler = F.cooler.filter(c => { if (!uids.includes(c.uid)) return true; total += fishPrice(c, day, season); return false; });
  return total;
}
// Buying: a rod (once each) or a pack of bait. Returns the cost, or null if it can't be had.
export function buy(world, kind, id) {
  const F = fishingOf(world);
  if (kind === 'rod') { const r = RODS[id]; if (!r || r.reward || F.rods.includes(id)) return null; giveRod(world, id); return r.price; }
  const b = BAIT[id]; if (!b) return null;
  F.bait[id] = (F.bait[id] ?? 0) + b.pack; return b.price;
}

// ---------- fish as gifts ----------

// What someone thinks of a fish: their own taste for fish (data/relationships.js `fish`),
// a step warmer for a rare one.
const STEPS = ['dislike', 'neutral', 'like', 'love'];
export function fishOpinion(def, catchEntry) {
  const base = def?.fish ?? 'like', f = fishById(catchEntry.id);
  const i = STEPS.indexOf(base);
  return f && f.rarity <= 2 && base !== 'dislike' ? STEPS[Math.min(3, i + 1)] : base;
}
export function takeFish(world, uid) {
  const F = fishingOf(world), i = F.cooler.findIndex(c => c.uid === uid);
  return i < 0 ? null : F.cooler.splice(i, 1)[0];
}
