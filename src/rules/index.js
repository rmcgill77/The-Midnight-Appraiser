// The doorway between the new game and Second Sight Pawn's original rules.
// Those rules run unchanged as classic scripts (see ssp-files.js); the bridge puts
// them on globalThis.SSP. The original keeps its whole simulation in one plain
// object, `st` (Game.blank's shape). Here it is called the sim, and it is saved
// inside this game's save next to the world (rooms, player, clock, display cases).

export const S = globalThis.SSP;
if (!S) throw new Error('Second Sight Pawn rules did not load (shared/ scripts missing).');

export const RULES_SOURCE = 'second-sight-pawn';
const { DATA } = S;

// As the original Game.newGame: campaign or endless, a difficulty, a name and a ride.
// From v2.0 new games are always the campaign at the original's standard balance, and the
// caller adds the year (rules/year.js initYear); `year: true` leaves out the original's
// one-audit notice, since the year has its own.
export function newSim({ seed, mode = 'campaign', difficulty = 'medium', name = 'Owner', ride = 'foot', year = false }) {
  const st = S.Game.blank(mode, difficulty, name, ride);
  st.seed = seed >>> 0;
  adopt(st);
  st.cash += S.Ride.def(st).startCash || 0;
  st.dayStart = { cash: st.cash, heat: st.heat };
  // The original opening: three boxes from your parents' last pickup wait in the basement.
  S.RNG.within(st, ['start'], () => { for (let i = 0; i < 3; i++) st.inventory.loot.push(S.Items.generate(st, { zoneId: 'laundromat' })); });
  st.today = S.Recap.fresh(st);
  S.log(st, `${name} took over ${DATA.shopName}. Rent is ${S.money(st.rent.amount)} every ${st.rent.every} days.`, 'note');
  S.log(st, 'Three boxes from your parents’ last pickup are waiting in the basement lab.', 'loot');
  if (st.auditDay && !year) S.log(st, `The Office of Anomalous Property will audit the shop in ${st.auditDay - 1} days.`, 'warn');
  return st;
}

// Make `st` the live sim: the original's rnd() draws from Game.state's seed.
export function adopt(st) { S.Game.state = st; return st; }

// Restore a saved sim, filling in any fields the original adds over time.
export function restoreSim(saved) { const st = S.Game.normalize(saved); if (!st.today) st.today = S.Recap.fresh(st); return adopt(st); }

// The parts of Game.rules that keep numbers in range, plus the story and case files.
// Shop.tick, the tutorial and tips are left out on purpose: this game runs its own
// customers and panels.
export function simRules(st) {
  const c = DATA.config;
  st.heat = S.clamp(Math.round(st.heat), 0, c.heatMax);
  st.energy = S.clamp(st.energy, 0, st.maxEnergy);
  st.battery = S.clamp(st.battery, 0, 100);
  st.stress = S.clamp(st.stress, 0, 100);
  st.bench.max = S.Lab.benchMax(st);
  st.bench.mins = S.clamp(Math.round(st.bench.mins ?? st.bench.max), 0, st.bench.max);
  for (const k in st.cal) st.cal[k] = S.clamp(Math.round(st.cal[k]), 0, 100);
  for (const k in st.rep) st.rep[k] = S.clamp(Math.round(st.rep[k]), -50, S.Rep.cap(st, k));
  if (!st.gameOver && st.heat >= c.heatMax) {
    st.gameOver = { type: 'raid', day: st.day, reason: 'The Office of Anomalous Property kicked in the back door and sealed the lab.', recap: S.Audit.recap(st) };
    S.Bests.record(st);
    S.log(st, 'RAID. The shop has been seized.', 'warn');
  }
  // Ledger pages earned by what you've done, and the other door in the basement.
  S.Story.check(st);
  // Case files (the original's achievements). Newly opened ones wait in Cases.pending for a toast.
  S.Cases.check(st);
}

// Case files opened since the last call, for toasts.
export function takeOpenedCases() { return S.Cases.pending.splice(0).map(x => S.Cases.byId(x.id)).filter(Boolean); }

// ---- Endless ----
export const endless = st => S.Endless.on(st);

// A fresh day's shop ledger, in the shape Shop.tick would have made.
export function openShopDay(st) {
  S.Calendar.openShop(st);
  st.shop = { day: st.day, total: 0, queue: [], served: 0, current: null, sales: [], bought: [], jobs: [], pending: null, say: null, seen: [] };
}

// ---- Reading items for display ----

export const itemName = it => S.Items.name(it);
export const baseOf = it => S.baseOf(it);
export const estimate = it => S.Items.estimate(it);
export const claimText = it => S.Shop.claimText(it);
export const tagAlignment = it => it.appraisal?.alignment ?? null;

// Pixel icons: the original's 16x16 set, stored as runs of `Mx yhwv1h-wz`.
export function iconRects(name) {
  const d = globalThis.SSP_ICONS?.[name];
  if (!d) return [];
  const out = [], re = /M(\d+) (\d+)h(\d+)v1h-\d+z/g;
  let m;
  while ((m = re.exec(d))) out.push([+m[1], +m[2], +m[3]]);
  return out;
}
export const iconPath = name => globalThis.SSP_ICONS?.[name] ?? '';
