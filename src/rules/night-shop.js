// Night openings (v2.4): the shop can open after dark, twice a calendar week (Monday to
// Sunday). Whoever comes in at night doesn't ask questions. They come for what's tagged
// cursed, and they pay well for it; ordinary things barely interest them.
//
// The cost: every sale is Heat, and cursed sales more so; cursed things sold at night are
// counted, and the next seasonal inspection marks you down for them (rules/year.js, the
// "Night trade" row). Night buyers ignore the Office's restrictions, which is the point,
// and the danger: now and then one of them is an inspector. Rarely, normally; much more
// often while you're on notice (an unpaid fine, or restrictions). If you sell to one:
//   - the fine doubles (what's owed; or, with nothing owed, twice the last fine),
//   - the cursed-sales restriction goes on, and stays at least two more weeks,
//   - a booked re-inspection is put off a week,
//   - and it is NOT a strike: strikes only come from seasonal inspections.
//
// State: st.nightShop, beside the original's sim (this game's layer, like st.year).

import { S } from './index.js';
import * as Y from './year.js';
import * as C from '../game/calendar.js';

export const NIGHT_SHOP = {
  perWeek: 2,
  buyers: [3, 6],                 // how many come in a night (more with Heat, up to the cap)
  heat: { cursed: 3, other: 1 },
  undercover: { base: 0.03, notice: 0.35 },
  mult: { cursed: 1.8, untested: 1.05, enchanted: 0.9, inert: 0.45 },   // × budget, by the tag
  budget: [40, 140],
  row: { per: 3, max: 3 },        // at inspection: −1 per 3 cursed night sales, at most −3
  extend: 14, delay: 7,
};

const NAMES = ['A man in a wet raincoat', 'A woman in dark glasses', 'Somebody’s chauffeur', 'A collector in kid gloves', 'A priest who isn’t', 'A boy with an old man’s eyes', 'A woman with a hatbox', 'A man who smells of the river', 'A nurse, off shift', 'Two brothers, one coat'];
const LINES = ['Don’t tell me what it does. Tell me what it costs.', 'I was told you’d have something. Something with a history.', 'No receipt. No name. Cash.', 'The worse the tag, the better.', 'I’m not here. You haven’t seen me.', 'Whatever’s in the back case. The one you don’t show in daylight.'];

export function nightShopOf(st) {
  st.nightShop ??= { week: null, used: [], sales: 0, cursed: 0, cursedSince: 0, caught: [] };
  return st.nightShop;
}
export const weekStart = day => day - C.weekdayOf(day);
export function opensLeft(st, day = st.day) {
  const N = nightShopOf(st);
  if (N.week !== weekStart(day)) return NIGHT_SHOP.perWeek;
  return Math.max(0, NIGHT_SHOP.perWeek - N.used.length);
}
export const onNotice = st => Y.on(st) && (st.year.restrict.length > 0 || st.year.fine.owed > 0);
// Why you can't open tonight, or null.
export function cantOpen(st, displays = 1) {
  if (opensLeft(st) <= 0) return 'Twice a week is all you dare';
  if (nightShopOf(st).used.includes(st.day)) return 'Already open tonight';
  if (!displays) return 'Nothing in your cases';
  return null;
}
export function openTonight(st) {
  const N = nightShopOf(st), wk = weekStart(st.day);
  if (N.week !== wk) { N.week = wk; N.used = []; }
  N.used.push(st.day);
  return opensLeft(st);
}

// Tonight's buyers. rand: () => [0, 1).
export function planNight(st, rand) {
  const [a, b] = NIGHT_SHOP.buyers;
  const n = Math.min(b, a + Math.floor(rand() * (b - a)) + (st.heat >= 30 ? 1 : 0));
  const p = onNotice(st) ? NIGHT_SHOP.undercover.notice : NIGHT_SHOP.undercover.base;
  const out = [];
  for (let i = 0; i < n; i++) {
    const [lo, hi] = NIGHT_SHOP.budget;
    const undercover = rand() < p;
    out.push({ id: `night-${st.day}-${i}`, kind: 'buy', faction: 'night', shady: true, undercover, refusals: 0,
      name: NAMES[Math.floor(rand() * NAMES.length)], line: LINES[Math.floor(rand() * LINES.length)],
      budget: Math.round(lo + rand() * (hi - lo)) });
  }
  return out;
}

// How a night buyer reads a tag: { fit, mult, why }.
export function judge(c, it) {
  const al = it?.appraisal?.alignment ?? null, M = NIGHT_SHOP.mult;
  if (al === 'cursed') return { fit: 'yes', mult: M.cursed, why: 'Exactly what they came for' };
  if (!al) return { fit: 'gamble', mult: M.untested, why: 'Untested. They like a gamble' };
  if (al === 'enchanted') return { fit: 'gamble', mult: M.enchanted, why: 'Not cursed, but it’ll do' };
  return { fit: 'yes', mult: M.inert, why: 'Ordinary. They’ll take it cheap' };
}
export function offer(c, it) {
  const j = judge(c, it), max = c.budget * j.mult;
  if (it.price <= max) return { result: 'deal', amount: it.price, fit: j.fit };
  if (it.price <= max * 1.3) return { result: 'counter', amount: Math.max(1, Math.round(max)), fit: j.fit };
  return { result: 'refuse', say: 'Too rich for a night like this.' };
}

// A sale at night. Returns { heat, caught } (caught: the record, if it was an inspector).
export function sell(st, c, it, price) {
  const f = S.Items.find(st, it.uid);
  if (!f || f.list !== 'stock') return null;
  st.inventory.stock.splice(f.index, 1);
  const N = nightShopOf(st), cursed = it.appraisal?.alignment === 'cursed';
  if (c.undercover) {
    // He takes it as evidence. No money changes hands.
    const rec = bust(st, it);
    S.log(st, `Sold the ${S.Items.name(it)} after dark to an inspector from the Office. ${rec.text}`, 'warn');
    return { heat: 0, caught: rec };
  }
  st.cash += price;
  const h = cursed ? NIGHT_SHOP.heat.cursed : NIGHT_SHOP.heat.other;
  st.heat += h;
  N.sales += 1;
  if (cursed) { N.cursed += 1; N.cursedSince += 1; }
  st.counters.sold += 1;
  st.counters.bestSale = Math.max(st.counters.bestSale || 0, price);
  S.log(st, `Sold the ${S.Items.name(it)} after dark to ${c.name} for ${S.money(price)}.`, 'note');
  return { heat: h, caught: null };
}

// Caught selling to an inspector at night.
export function bust(st, it) {
  const N = nightShopOf(st), Y0 = st.year;
  const rec = { day: st.day, item: S.Items.name(it), fine: 0, text: '' };
  if (Y0) {
    const last = [...Y0.audits].reverse().find(a => a.fine > 0)?.fine ?? Y.fineFor(st, 'probation', 0);
    const add = Y0.fine.owed > 0 ? Y0.fine.owed : last * 2;
    Y0.fine.owed += add; Y0.fine.total += add; rec.fine = add;
    if (!Y0.restrict.includes('cursed')) Y0.restrict.push('cursed');
    Y0.reinspect.after = Math.max(Y0.reinspect.after ?? 0, st.day + NIGHT_SHOP.extend);
    if (Y0.reinspect.due) Y0.reinspect.due += NIGHT_SHOP.delay;
    rec.text = `The fine is now ${S.money(Y0.fine.owed)}. No cursed sales until a re-inspection, and none before ${C.formatDate(Y0.reinspect.after)}.`;
  } else {
    st.heat += 15;
    rec.text = 'The Office will remember. Heat +15.';
  }
  N.caught.push(rec);
  return rec;
}

// For the seasonal inspection: the "Night trade" row, or null. Counted since the last one.
export function inspectionRow(st) {
  const n = st.nightShop?.cursedSince ?? 0, R = NIGHT_SHOP.row;
  if (n < R.per) return null;
  return { id: 'night', label: 'Cursed goods sold after hours', value: String(n), pts: -Math.min(R.max, Math.floor(n / R.per)) };
}
export function resetSinceInspection(st) { if (st.nightShop) st.nightShop.cursedSince = 0; }
