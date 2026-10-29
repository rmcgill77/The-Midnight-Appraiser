// The original game's verbs (js/actions.js in Second Sight Pawn), ported line for
// line minus its UI calls (toasts, sound, re-render). Each takes the sim `st` and
// returns what happened so the panels can say it.

import { S } from './index.js';
import { cue } from './cues.js';
import * as Y from './year.js';
const { DATA } = S;
const upgradeCostOf = (key, lv) => (lv === 0 ? DATA.spiritCost : DATA.upgradeCost[lv]);
export { upgradeCostOf };

// ---------- the bench ----------

export function runTest(st, it, toolId) {
  if (S.Lab.blocker(st, it, toolId)) return null;
  const t = S.toolOf(toolId), a = S.anomalyOf(it);
  const oldSuggest = it.draft ? S.Lab.suggest(st, it, it.draft) : null;
  const fresh = S.Lab.read(toolId, S.Lab.truth(a, toolId), S.Lab.exactChance(st, it, toolId), S.rnd);
  st.cal[toolId] = Math.max(0, (st.cal[toolId] ?? 100) - S.Lab.wear(st, toolId));
  const prev = it.revealed[toolId];
  it.revealed[toolId] = prev ? prev.filter(v => fresh.includes(v)) : fresh;
  it.tests[toolId] += 1;
  st.bench.mins -= t.mins;
  st.supplies.vials -= t.vials;
  st.counters.tests += 1;
  let mishap = null;
  if (a.alignment === 'cursed' && S.rnd() < 0.08 * a.danger) {
    mishap = DATA.mishaps[Math.floor(S.rnd() * DATA.mishaps.length)];
    st.stress += 8;
    S.log(st, `${S.Items.name(it)}: ${mishap} +8 Stress.`, 'warn');
  }
  if (it.draft) {
    if (it.draft.anomalyId && !S.Lab.fits(st, it, S.byId(DATA.anomalies, it.draft.anomalyId))) it.draft.anomalyId = null;
    if (it.draft.price === oldSuggest) it.draft.price = S.Lab.suggest(st, it, it.draft);
  }
  cue(mishap ? 'mishap' : toolId);
  return { text: S.Lab.readingText(toolId, it.revealed[toolId]), mishap };
}

export function setAlignment(st, it, alignment) {
  const d = { alignment, anomalyId: null, price: 0 };
  d.price = S.Lab.suggest(st, it, d);
  it.draft = d;
}

export function setIdentity(st, it, anomalyId) {
  if (!it.draft) return;
  it.draft.anomalyId = anomalyId || null;
  it.draft.price = S.Lab.suggest(st, it, it.draft);
}

export function nudgePrice(st, it, dir) {
  if (!it.draft) return;
  const s = S.Lab.suggest(st, it, it.draft);
  const step = Math.max(1, Math.round(s * 0.1));
  it.draft.price = S.clamp(it.draft.price + dir * step, Math.max(1, Math.round(s * 0.5)), Math.round(s * 2.5));
}

export function tagAndShelve(st, it) {
  const f = S.Items.find(st, it.uid);
  if (!f || f.list !== 'loot' || it.job || !it.draft || !it.draft.alignment) return false;
  const d = it.draft;
  it.appraisal = { alignment: d.alignment, anomalyId: d.anomalyId, price: d.price, day: st.day, tests: S.Lab.testsRun(it) };
  it.verdict = d.alignment;
  it.price = d.price;
  st.inventory.loot.splice(f.index, 1);
  st.inventory.stock.push(it);
  st.counters.appraised += 1;
  const idName = d.anomalyId ? ` (${S.byId(DATA.anomalies, d.anomalyId).name})` : '';
  cue('stamp');
  S.log(st, `Tagged ${S.Items.name(it)} as ${S.cap(d.alignment)}${idName} at ${S.money(d.price)}.`, 'note');
  return true;
}

export function scrap(st, it) {
  const f = S.Items.find(st, it.uid);
  if (!f || f.list !== 'loot' || it.job) return null;
  const r = S.Lab.breakdown(st, it);
  st.inventory.loot.splice(f.index, 1);
  cue('scrap');
  return r;
}

export function basin(st, it, act) {
  const old = it.draft ? S.Lab.suggest(st, it, it.draft) : null;
  const r = S.Lab.basin(st, it, act);
  if (r && it.draft && it.draft.price === old) it.draft.price = S.Lab.suggest(st, it, it.draft);
  if (r) cue(r.sfx);
  return r;
}

export function returnToBench(st, it) {
  const f = S.Items.find(st, it.uid);
  if (!f || f.list !== 'stock') return false;
  st.inventory.stock.splice(f.index, 1);
  if (it.appraisal) it.draft = { alignment: it.appraisal.alignment, anomalyId: it.appraisal.anomalyId, price: it.appraisal.price };
  it.appraisal = null; it.verdict = null; it.price = null;
  st.inventory.loot.push(it);
  return true;
}

// ---------- workshop, desk, gear ----------

export function craft(st, id) {
  const r = S.byId(DATA.recipes, id);
  if (S.Lab.recipeBlocker(st, r)) return false;
  S.Lab.pay(st, r.cost);
  st.bench.mins -= r.mins;
  st.kit[id] += 1;
  S.log(st, `Made a ${DATA.kit[id].name.toLowerCase()} at the workbench.`, 'note');
  cue('craft');
  return true;
}

export function research(st, key, mins) { const r = S.Lab.work(st, key, mins); cue(r ? 'unlock' : 'research'); return r; }

export function recalibrate(st, toolId) {
  const C = DATA.calibration;
  if (st.cash < C.cost) return `Needs ${S.money(C.cost)}`;
  if (st.bench.mins < C.mins) return 'Out of bench time';
  st.cash -= C.cost; st.bench.mins -= C.mins; st.cal[toolId] = 100;
  S.log(st, `Recalibrated the ${S.toolOf(toolId).name}.`, 'note');
  cue('calibrate');
  return null;
}

export function gearName(key) {
  return key === 'lore' ? DATA.lore.name : DATA.gear[key] ? DATA.gear[key].name : DATA.labGear[key] ? DATA.labGear[key].name : S.toolOf(key)?.name ?? key;
}

export function upgrade(st, key) {
  const lv = st.upgrades[key] || 0;
  if (lv >= 3) return 'Maxed';
  const cost = upgradeCostOf(key, lv);
  if (st.cash < cost) return `Needs ${S.money(cost)}`;
  st.cash -= cost;
  st.upgrades[key] = lv + 1;
  if (key === 'lamp') st.bench.mins += 60;
  if (lv === 0) st.cal[key] = 100;
  cue('upgrade');
  S.log(st, lv === 0 ? `Installed the ${gearName(key)} in the lab.` : `Upgraded the ${gearName(key)} to Lv ${st.upgrades[key]}.`, 'note');
  return null;
}

// ---------- the counter ----------

export function barterNudge(c, dir) {
  const step = Math.max(1, S.roundPrice(c.ask * 0.05));
  c.offer = S.clamp(c.offer + dir * step, 1, c.ask);
}

// Returns {result: deal|counter|leave|broke, price?, say}
export function barterOffer(st, c, takeAsk = false) {
  const offer = takeAsk ? c.ask : c.offer;
  if (st.cash < offer) return { result: 'broke' };
  const res = S.Shop.barter(c, offer);
  if (res.result === 'deal') S.Shop.buyFrom(st, c, res.price);
  else if (res.result === 'leave') { S.log(st, `${c.name} took the ${S.baseOf(c.item).name} somewhere else.`, 'note'); S.Shop.leave(st); }
  else { c.say = { kind: res.band, text: `“${res.say}”` }; c.offer = Math.min(c.offer, c.ask); }
  cue(res.result === 'deal' ? 'coins' : res.result === 'leave' ? 'refuse' : 'counter');
  return res;
}

// Wave the EMF meter over a seller's item: one free reading, but it costs patience.
export function barterPeek(st, c) {
  if (c.peeked || c.patience <= 1) return null;
  const it = c.item, a = S.anomalyOf(it);
  const r = S.Lab.read('emf', S.Lab.truth(a, 'emf'), S.Lab.exactChance(st, it, 'emf'), S.rnd);
  it.revealed.emf = r; it.tests.emf = 1;
  st.cal.emf = Math.max(0, st.cal.emf - S.Lab.wear(st, 'emf'));
  c.peeked = true; c.patience -= 1;
  cue('emf');
  c.say = { kind: 'warm', text: `“${S.pick(S.rnd, DATA.barter.say.peek)}”` };
  return S.Lab.readingText('emf', r);
}

// ---------- the day ----------

// Closing time. The original settles appraisal jobs at closing because its lab works
// by day; here the lab is night work, so jobs still on the bench stay overnight and
// their owners settle up at bedtime instead (settleJobs, below).
export function closeShop(st) {
  if (st.phase !== 'day') return null;
  const open = st.inventory.loot.filter(x => x.job);
  st.inventory.loot = st.inventory.loot.filter(x => !x.job);
  const filed = st.shop.jobs || [];
  st.shop.jobs = [];
  S.Shop.resolveDay(st);
  st.inventory.loot.push(...open);
  st.shop.jobs = filed;
  st.shop.current = null; st.shop.pending = null; st.shop.say = null;
  st.phase = 'night';
  cue('news');
  S.log(st, `Pulled the shutters down. ${st.report.sold} sale${st.report.sold === 1 ? '' : 's'} today.`, 'note');
  return st.report;
}

// Bedtime: appraisal owners collect (paid for filed reports, nothing for unfinished
// ones), then the original Calendar.sleep, with the year's inspections around it
// (rules/year.js). Returns { rentNote, jobs }.
export function sleep(st) {
  const r = { items: [], rep: {} };
  const fees = S.Shop.settleJobs(st, r);
  Y.beforeSleep(st);                        // v2.0: the finale's timing
  const rentNote = S.Calendar.sleep(st);
  Y.afterSleep(st);                         // v2.0: the season's inspection, re-inspections
  cue(rentNote && /short/i.test(rentNote) ? 'warn' : rentNote ? 'coins' : 'morning');
  return { rentNote, jobs: r.items, fees };
}

// ---------- the continuous day (Phase 30): the date and the morning are separate ----------

// Midnight: rent if it's due, the new date, and the year's inspections queued for the morning.
export function rollDate(st) {
  Y.beforeSleep(st);                        // v2.0: the finale's timing
  const rentNote = S.Calendar.rollDate(st);
  Y.afterSleep(st);                         // v2.0: the season's inspection, re-inspections
  if (rentNote) cue(/short/i.test(rentNote) ? 'warn' : 'coins');
  return { rentNote };
}

// Waking up: appraisal owners collect, then the morning.
export function wake(st) {
  const r = { items: [], rep: {} };
  const fees = S.Shop.settleJobs(st, r);
  S.Calendar.wake(st);
  cue('morning');
  return { rentNote: null, jobs: r.items, fees };
}

// ---------- appraisal jobs and the inspector ----------

export function takeJob(st, c) { S.Shop.takeJob(st, c); cue('stamp'); }
export function fileReport(st, uid) { const r = S.Shop.fileReport(st, uid); if (r) cue('stamp'); return r; }

export function inspectLook(st) {
  const hot = st.inventory.stock.filter(it => S.anomalyOf(it).alignment === 'cursed');
  let msg;
  if (hot.length) {
    const heat = 6 * hot.filter(it => !it.sealed).length;
    st.inventory.stock = st.inventory.stock.filter(it => !hot.includes(it));
    st.heat += heat;
    msg = `Confiscated ${hot.length} item${hot.length > 1 ? 's' : ''}${heat ? ` · +${heat} Heat` : ' · sealed, no Heat'}`;
    S.log(st, `Inspector Vance confiscated ${hot.map(it => 'the ' + S.Items.name(it) + (it.sealed ? ' (sealed)' : '')).join(', ')}.${heat ? ` +${heat} Heat.` : ' They were sealed properly, so no Heat.'}`, 'warn');
  } else {
    st.heat -= 15;
    S.Rep.add(st, 'office', 3);
    msg = 'Clean books · −15 Heat';
    S.log(st, 'Inspector Vance found nothing in the back case. −15 Heat, and the Office makes a note of it.', 'note');
  }
  S.Shop.leave(st);
  cue(hot.length ? 'warn' : 'stamp');
  return { msg, confiscated: hot.map(x => x.uid) };
}

export function inspectBribe(st, c) {
  if (st.cash < c.bribe) return null;
  st.cash -= c.bribe;
  cue('coins');
  S.log(st, `Slipped Inspector Vance ${S.money(c.bribe)}. He did not look in the back case.`, 'warn');
  S.Shop.leave(st);
  return true;
}

// ---------- mornings ----------

export function payArrears(st) { const p = S.Calendar.payArrears(st); if (p) cue('coins'); return p; }
export function readLetter(st) { cue('page'); return S.Story.read(st); }
export function pledge(st, fac) { const ok = S.Story.pledge(st, fac); if (ok) cue('stamp'); return ok; }
export function hideBasement(st, how) { const ok = S.Audit.hide(st, how); if (ok) cue(how === 'brick' ? 'seal' : 'stamp'); return ok; }

// ---------- Endless ----------

export function fulfilCommission(st, uid) { const r = S.Endless.fulfil(st, uid); if (r) cue(r.right ? S.saleSfx(r.pay) : 'refuse'); return r; }
export function buyEstate(st) { const e = S.Endless.buyEstate(st); if (e) cue('coins'); return e; }
export const passEstate = st => S.Endless.passEstate(st);
export const retire = st => S.Endless.retire(st);
