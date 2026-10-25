// The year (v2.0): one continuous game in place of the original's campaign and Endless.
//
// The world runs on a real calendar (game/calendar.js). The player picks a season and the
// game starts on its first day. The Office of Anomalous Property inspects the shop on the
// first morning of every new season, scoring the original's own audit checklist
// (Audit.checks, which changes nothing). A failed inspection does not close the shop: it
// brings a hefty fine, rising with each failure that year, and selling restrictions tied
// to what failed. Paying the fine and passing a re-inspection lifts them. Three failed
// inspections in one game year (four seasons from the start) and the Office closes the
// shop for good. A clean inspection earns a rebate and a better name with the Office.
//
// The story runs on the original's rules, which count down to one audit day (st.auditDay).
// Here that day is the finale: the end of year two. Two weeks before it, if the story isn't
// complete (every ledger page and the shop's own name made, or the faction you signed with
// maxed), the finale moves to the end of year three, where it comes regardless. The
// original's Audit.run then gives the ending from what was done. After it, the shop can
// stay open: inspections go on, the story is over.
//
// Everything lives in st.year (saved inside the sim). Saves without it play by the old rules.

import { S } from './index.js';
import * as C from '../game/calendar.js';
import { inspectionRow as nightTradeRow, resetSinceInspection as resetNightTrade } from './night-shop.js';

const { DATA } = S;

export const YEAR = {
  finaleSeasons: 8,          // the end of year two
  lateSeasons: 12,           // the end of year three, if the story needs it
  decideBefore: 14,          // days before the finale when it's decided
  strikesToClose: 3,
  fine: { probation: 400, closed: 800, share: 0.2, rise: 0.5 },   // base + share of cash, × (1 + rise per earlier failure)
  reinspectDays: 3,          // the re-inspection comes this many mornings after you ask
  reinspectWait: 7,          // after a failed re-inspection, days until you can ask again
  unpaidFine: -2,            // points against you at an inspection while a fine is owed
  rebateRent: 1,             // a clean inspection: weeks of rent back
  officeRep: 3,
};

export const RESTRICTIONS = {
  cursed: { name: 'No cursed sales', text: 'Nothing tagged cursed may be sold.', say: 'The Office says you can’t sell that one. Not while you’re on notice.' },
  walkins: { name: 'No buying from walk-ins', text: 'You may not buy from sellers who walk in.' },
  factions: { name: 'Civilians only', text: 'You may not sell to faction buyers.', say: 'You’re on the Office’s list. I can’t be seen buying here right now.' },
};
// Which restriction a failed check brings.
const FROM_CHECK = { night: 'cursed', stock: 'cursed', open: 'cursed', basement: 'walkins', cells: 'walkins', breakouts: 'walkins', rent: 'walkins', fine: 'walkins', incidents: 'factions', heat: 'factions', office: 'factions' };

export const on = st => !!st?.year;
export const roundFine = n => Math.max(10, Math.round(n / 10) * 10);

// ---------- starting ----------

// A new game's year. The sim must be fresh (day 1). The finale is the end of year two.
export function initYear(st, season = 'autumn') {
  const start = C.seasonStartIso(C.SEASONS.includes(season) ? season : 'autumn');
  st.year = {
    v: 1, season, start, extended: false, finished: false,
    strikes: {}, audits: [], fine: { owed: 0, total: 0 }, base: { incidents: 0, breakouts: 0 }, restrict: [], reinspect: { due: null, after: null },
    inbox: [],
  };
  C.useSim(st);
  st.auditDay = C.seasonStartAfter(1, YEAR.finaleSeasons);
  return st.year;
}

// ---------- when ----------

export const seasonIndexOf = (st, day) => { C.useSim(st); let n = 0, k = 1; while ((k = C.nextSeasonStart(k)) <= day) n++; return n; };
// The game year a day falls in (1, 2, 3...). Inspections on the first morning of a season
// belong to the year of the season they look back on.
export const gameYearOfAudit = (st, day) => Math.floor((seasonIndexOf(st, day) - 1) / 4) + 1;
export const gameYear = (st, day = st.day) => Math.floor(seasonIndexOf(st, day) / 4) + 1;
export function nextAuditDay(st) { C.useSim(st); return C.nextSeasonStart(st.day); }
export const daysToAudit = st => nextAuditDay(st) - st.day;
export const strikesThisYear = (st, day = st.day) => st.year?.strikes?.[gameYear(st, day)] ?? 0;
export const finaleDay = st => (st.year && !st.year.finished ? st.auditDay : null);

// ---------- the story's finale ----------

export function storyReady(st) {
  const s = st.story;
  if (s.pledge && s.pledge !== 'self' && S.Rep.maxed(st, s.pledge)) return true;
  return s.pages.length >= DATA.pages.length && S.Story.nameRatio(st) >= 1;
}

// Before bed: two weeks out, decide whether the finale comes at the end of year two.
function decideFinale(st) {
  const Y = st.year;
  if (Y.extended || Y.finished || !st.auditDay) return;
  if (st.auditDay - (st.day + 1) > YEAR.decideBefore) return;
  if (storyReady(st)) return;
  C.useSim(st);
  st.auditDay = C.seasonStartAfter(1, YEAR.lateSeasons);
  Y.extended = true;
  Y.inbox.push({ kind: 'extended', day: st.day + 1, finale: st.auditDay });
  S.log(st, `The Office has extended its review of the shop by a year. Final review: ${C.formatDate(st.auditDay, { year: true })}.`, 'warn');
}

// ---------- the inspection ----------

// The original's checklist, plus any fine still owed. The original counts news incidents
// and breakouts over the whole game (it has one audit); a season's inspection counts only
// those since the last inspection, so a bad month doesn't fail you forever.
const SEASONAL = { incidents: 'Incidents in the news this season', breakouts: 'Entities that broke out this season' };
export function inspect(st) {
  const c = st.counters, base = st.year?.base ?? { incidents: 0, breakouts: 0 };
  const keep = { incidents: c.incidents || 0, breakouts: c.breakouts || 0 };
  let rows;
  try {
    for (const k of Object.keys(SEASONAL)) c[k] = Math.max(0, keep[k] - (base[k] || 0));
    rows = S.Audit.checks(st).map(r => (SEASONAL[r.id] ? { ...r, label: SEASONAL[r.id] } : r));
  } finally { Object.assign(c, keep); }
  if (st.year?.fine.owed > 0) rows.push({ id: 'fine', label: 'Office fine still owed', value: S.money(st.year.fine.owed), pts: YEAR.unpaidFine });
  // v2.4: cursed things sold at night since the last inspection (rules/night-shop.js).
  const night = nightTradeRow(st);
  if (night) rows.push(night);
  const total = rows.reduce((a, r) => a + r.pts, 0);
  return { rows, total, outcome: S.Audit.outcome(total) };
}

export function fineFor(st, outcome, earlier) {
  const F = YEAR.fine;
  return roundFine((F[outcome] + F.share * Math.max(0, st.cash)) * (1 + F.rise * earlier));
}

// Apply an inspection's result. `final`: it's the story's finale (Audit.run already ended
// the game; a third strike still closes the shop, otherwise the player may keep going).
function settle(st, res, { final = false } = {}) {
  const Y = st.year, day = st.day, yr = gameYearOfAudit(st, day);
  const pass = res.outcome === 'cleared';
  const rec = { day, season: C.seasonEndingBefore(day), year: yr, total: res.total, outcome: res.outcome, pass, rows: res.rows, fine: 0, restrict: [], final };
  if (pass) {
    const rebate = st.rent.amount * YEAR.rebateRent;
    st.cash += rebate; rec.rebate = rebate;
    S.Rep.add(st, 'office', YEAR.officeRep);
    rec.lifted = Y.restrict.slice();
    Y.restrict = []; Y.reinspect = { due: null, after: null };
    S.log(st, `The Office inspected the shop: passed. A rebate of ${S.money(rebate)} came with the paperwork.`, 'note');
  } else {
    const earlier = Y.strikes[yr] ?? 0;
    Y.strikes[yr] = earlier + 1;
    rec.strikes = Y.strikes[yr];
    if (rec.strikes >= YEAR.strikesToClose) {
      rec.closed = true;
      if (!final || st.gameOver?.outcome !== 'closed') closeForGood(st, res);
    } else {
      rec.fine = fineFor(st, res.outcome, earlier);
      Y.fine.owed += rec.fine; Y.fine.total += rec.fine;
      const add = [...new Set(res.rows.filter(r => r.pts < 0 && FROM_CHECK[r.id]).map(r => FROM_CHECK[r.id]))];
      if (!add.length) add.push('walkins');
      rec.restrict = add;
      Y.restrict = [...new Set([...Y.restrict, ...add])];
      Y.reinspect = { due: null, after: null };
      S.log(st, `The Office inspected the shop: failed (${rec.strikes} of ${YEAR.strikesToClose} this year). Fined ${S.money(rec.fine)}.`, 'warn');
    }
  }
  Y.base = { incidents: st.counters.incidents || 0, breakouts: st.counters.breakouts || 0 };   // the next season starts counting from here
  resetNightTrade(st);
  Y.audits.push({ ...rec, rows: undefined });
  if (!final) Y.inbox.push({ kind: 'audit', ...rec });
  return rec;
}

function closeForGood(st, res) {
  st.gameOver = {
    type: 'audit', day: st.day, checks: res.rows, total: res.total, outcome: 'closed',
    ending: S.Audit.ending(st, 'closed'), recap: S.Audit.recap(st), strikes: true,
  };
  S.Bests.record(st);
  S.log(st, 'Three failed inspections in one year. The Office of Anomalous Property closed the shop.', 'warn');
}

// ---------- re-inspection ----------

export function reinspectBlocker(st) {
  const Y = st.year;
  if (!Y || !Y.restrict.length) return 'Nothing to lift';
  if (Y.reinspect.due) return `Booked for ${C.formatDate(Y.reinspect.due)}`;
  if (Y.fine.owed > 0) return 'Pay the fine first';
  if (Y.reinspect.after && st.day < Y.reinspect.after) return `Not before ${C.formatDate(Y.reinspect.after)}`;
  if (daysToAudit(st) <= YEAR.reinspectDays) return 'The next inspection is too close';
  return null;
}
export function requestReinspection(st) {
  if (reinspectBlocker(st)) return false;
  st.year.reinspect.due = st.day + YEAR.reinspectDays;
  S.log(st, `Asked the Office for a re-inspection. They will come ${C.formatDate(st.year.reinspect.due)}.`, 'note');
  return true;
}
function reinspect(st) {
  const Y = st.year, res = inspect(st), pass = res.outcome === 'cleared';
  const rec = { kind: 'reinspect', day: st.day, total: res.total, outcome: res.outcome, pass, rows: res.rows, lifted: pass ? Y.restrict.slice() : [] };
  if (pass) { Y.restrict = []; Y.reinspect = { due: null, after: null }; S.log(st, 'The re-inspection passed. The restrictions are lifted.', 'note'); }
  else { Y.reinspect = { due: null, after: st.day + YEAR.reinspectWait }; S.log(st, 'The re-inspection failed. The restrictions stay.', 'warn'); }
  Y.inbox.push(rec);
  return rec;
}

export function payFine(st, amount = st.year?.fine.owed ?? 0) {
  const Y = st.year;
  if (!Y) return 0;
  const paid = Math.max(0, Math.min(st.cash, Y.fine.owed, Math.round(amount)));
  if (!paid) return 0;
  st.cash -= paid; Y.fine.owed -= paid;
  S.log(st, Y.fine.owed ? `Paid ${S.money(paid)} toward the Office fine. Still owe ${S.money(Y.fine.owed)}.` : `Paid off the Office fine (${S.money(paid)}).`, 'note');
  return paid;
}

// ---------- the night, around the original's Calendar.sleep ----------

export function beforeSleep(st) { if (on(st) && !st.gameOver) decideFinale(st); }

// After the original's sleep (st.day is the new morning).
export function afterSleep(st) {
  if (!on(st)) return;
  C.useSim(st);
  const Y = st.year;
  if (st.gameOver?.type === 'audit' && st.gameOver.day === st.day && !st.gameOver.strikes) {
    // The story's finale: the original's Audit.run gave the ending. It is this season's
    // inspection too.
    const go = st.gameOver;
    const rec = settle(st, { rows: go.checks, total: go.total, outcome: go.outcome }, { final: true });
    if (st.gameOver === go) go.year = { rec, canContinue: go.outcome !== 'closed' && !rec.closed };
    else st.gameOver.year = { rec, canContinue: false };
    return;
  }
  if (st.gameOver) return;
  if (C.isSeasonStart(st.day) && st.day > 1) {
    settle(st, inspect(st));
    if (st.gameOver) return;
  }
  if (Y.reinspect.due && st.day >= Y.reinspect.due) reinspect(st);
  if (st.day > 1 && C.isSeasonStart(st.day) && (seasonIndexOf(st, st.day) % 4 === 0)) Y.inbox.push({ kind: 'newyear', day: st.day, year: gameYear(st) });
}

// After the finale's ending cards: keep the shop open. The story is over; inspections go on.
export function continueAfterFinale(st) {
  const go = st.gameOver;
  if (!on(st) || !go?.year?.canContinue) return false;
  const s = st.story;
  if (s.door === 'open') s.doorForced = true;   // the other door stays as it was
  st.gameOver = null;
  st.auditDay = null;
  st.year.finished = true;
  st.year.endedDay = go.day;
  if (C.isSeasonStart(st.day) && seasonIndexOf(st, st.day) % 4 === 0) st.year.inbox.push({ kind: 'newyear', day: st.day, year: gameYear(st) });
  S.log(st, 'The story is told. The shop stays open, and the Office will keep coming every season.', 'note');
  return true;
}

// ---------- restrictions in the shop ----------

export const restricted = (st, id) => !!st?.year?.restrict?.includes(id);
// Why a buyer can't have this item, or null.
export function saleBlock(st, sim, it) {
  if (!on(st)) return null;
  if (restricted(st, 'cursed') && it?.appraisal?.alignment === 'cursed') return RESTRICTIONS.cursed.say;
  if (restricted(st, 'factions') && sim?.faction && sim.faction !== 'civilian' && sim.faction !== 'inspector') return RESTRICTIONS.factions.say;
  return null;
}
// Customer kinds the Office won't let in today.
export const blockedKinds = st => (restricted(st, 'walkins') ? ['sell'] : []);

// ---------- for the screens ----------

export const takeInbox = st => (st.year?.inbox?.length ? st.year.inbox.splice(0) : []);
export function auditLine(st) {
  if (!on(st)) return null;
  const d = nextAuditDay(st), left = d - st.day;
  return { day: d, left, date: C.formatDate(d), season: C.realSeasonOf(st.day) };
}
