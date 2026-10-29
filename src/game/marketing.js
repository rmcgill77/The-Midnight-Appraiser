// Drawing more customers in (Phase 11): ad campaigns, storefront work, comforts, and
// the regulars a fair record earns you. World state, kept in world.draw; the original
// game has nothing like it, so every number lives in data/marketing.js.

import { holidayOn } from '../data/holidays.js';
import { S } from '../rules/index.js';
import { cue } from '../rules/cues.js';
import { ADS, STOREFRONT, COMFORTS, REGULARS } from '../data/marketing.js';
import { SHOP_TIERS } from '../data/shop-tiers.js';
import { shopState } from './shop-growth.js';
import { layoutOf, decorMods } from './shop-layout.js';
import { shopVisitors, spouseOf } from '../data/townsfolk.js';

export const freshDraw = () => ({ ad: null, runs: 0, front: [], comforts: [] });

export function drawState(world) {
  const d = world.draw && typeof world.draw === 'object' ? world.draw : freshDraw();
  if (d.ad && !(ADS.some(a => a.id === d.ad.id) && Number.isFinite(d.ad.from) && Number.isFinite(d.ad.until))) d.ad = null;
  d.runs = Math.max(0, d.runs | 0);
  d.front = Array.isArray(d.front) ? d.front.filter(id => STOREFRONT.some(x => x.id === id)) : [];
  d.comforts = Array.isArray(d.comforts) ? d.comforts.filter(id => COMFORTS.some(x => x.id === id)) : [];
  world.draw = d;
  return d;
}

const LISTS = { ad: ADS, front: STOREFRONT, comfort: COMFORTS };
export const defOf = (kind, id) => LISTS[kind]?.find(x => x.id === id) ?? null;

// The campaign running on `day`, or null; and whether one is booked for later.
export function adOn(world, day) {
  const a = drawState(world).ad;
  return a && day >= a.from && day <= a.until ? defOf('ad', a.id) : null;
}
export const adBooked = (world, day) => { const a = drawState(world).ad; return a && day <= a.until ? a : null; };
export const owns = (world, kind, id) => (kind === 'front' ? drawState(world).front : drawState(world).comforts).includes(id);

// Factions that trust you enough to send a regular, plus word of mouth.
export function regulars(st) {
  const out = Object.entries(st.rep || {}).filter(([, v]) => v >= REGULARS.trust).sort((a, b) => b[1] - a[1]).map(([f]) => ({ kind: 'buy', faction: f, why: 'regular' }));
  if ((st.heat ?? 0) <= REGULARS.cleanHeat && st.day >= 2) out.push({ kind: 'buy', faction: 'civilian', why: 'word' });
  return out.slice(0, REGULARS.max);
}

// Everyone extra who comes in today, in arrival order (regulars first: they know the hours).
// Phase 29: friends from around town drop by too, first of all (they'd hate to miss you).
// Phase 30: the continuous day makes closer friends drop by more often (set once, by main.js).
let visitBoost = () => 1;
export const setVisitBoost = f => { visitBoost = f ?? (() => 1); };

export function extrasToday(world, st) {
  const friends = shopVisitors(st.day, st.seed ?? 0, visitBoost);
  const out = [...friends.map((friend, i) => ({ kind: 'buy', why: 'friend', friend, with: i && spouseOf(friend) === friends[i - 1] ? friends[i - 1] : null })), ...regulars(st)];
  const ad = adOn(world, st.day);
  if (ad) for (let i = 0; i < ad.extra; i++) out.push({ kind: ad.mix[i % ad.mix.length], why: 'ad' });
  for (const id of drawState(world).front) for (let i = 0; i < defOf('front', id).extra; i++) out.push({ kind: 'buy', why: 'front' });
  // Phase 24: a charming shop gets talked about. Browsers who heard it's worth a look.
  for (let i = 0; i < decorMods(layoutOf(world)).browsers; i++) out.push({ kind: 'buy', why: 'decor' });
  // v2.2: a holiday brings shoppers in (fewer on the quiet ones: see game/customers.js).
  const hol = holidayOn(st.day);
  for (let i = 0; i < Math.max(0, hol?.shop?.buyers ?? 0); i++) out.push({ kind: 'buy', why: 'holiday' });
  return out;
}

// Comforts, and (Phase 24) the decor on the floor. wx: today's weather (an umbrella stand
// only helps on a wet day).
export function comfortMods(world, wx = null) {
  const d = decorMods(layoutOf(world), wx);
  return drawState(world).comforts.reduce((m, id) => { const c = defOf('comfort', id); return { patience: m.patience + c.patience, spend: m.spend + c.spend }; }, { patience: d.patience, spend: d.spend });
}

// How today's crowd adds up, for the notice board and the morning readout.
export function crowdSummary(world, st) {
  const t = SHOP_TIERS[shopState(world).tier], ex = extrasToday(world, st);
  const count = why => ex.filter(x => x.why === why || (why === 'regular' && x.why === 'word')).length;
  const base = t.customers == null ? null : t.customers;
  const room = Math.max(t.room, (base ?? 0) + t.bonus);
  return { base, bonus: t.bonus, ads: count('ad'), front: count('front'), regulars: count('regular'), decor: count('decor'), friends: ex.filter(x => x.why === 'friend').map(x => x.friend), extras: ex.length, room };
}

export function buyBlocker(world, st, kind, id) {
  const d = defOf(kind, id);
  if (!d) return 'Not for sale';
  if (shopState(world).tier < d.unlock) return `Needs the ${SHOP_TIERS[d.unlock].name.toLowerCase()} renovation`;
  if (kind === 'ad') { const b = adBooked(world, st.day); if (b) return b.from > st.day ? 'A campaign is already booked' : 'A campaign is already running'; }
  else if (owns(world, kind, id)) return 'Done';
  if (st.cash < d.cost) return `Needs ${S.money(d.cost)}`;
  return null;
}

// Pay for it. Ads start tomorrow; storefront work and comforts are there right away
// (the extra customer from the storefront counts from tomorrow's plan on).
export function buy(world, st, kind, id) {
  const why = buyBlocker(world, st, kind, id);
  if (why) return { error: why };
  const d = defOf(kind, id), s = drawState(world);
  st.cash -= d.cost;
  if (kind === 'ad') { s.ad = { id, from: st.day + 1, until: st.day + d.days }; s.runs += 1; }
  else (kind === 'front' ? s.front : s.comforts).push(id);
  cue('stamp');
  S.log(st, kind === 'ad' ? `Paid ${S.money(d.cost)} for ${d.name.toLowerCase()}: day ${st.day + 1} to day ${st.day + d.days}.` : `Paid ${S.money(d.cost)}: ${d.name.toLowerCase()}.`, 'note');
  return { def: d };
}
