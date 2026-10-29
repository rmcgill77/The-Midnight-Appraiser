// Errand days, run by the original City and Ride rules. The one change: the
// original counted hours in st.ap.left; here the day clock is the budget, so
// before each rule call ap.left is set from the clock, and after an action the
// clock moves forward by that action's hours. Walking costs real time instead
// of the original's flat 1-or-2-hour trips.

import { S } from './index.js';
import { cue } from './cues.js';
import { CONFIG } from '../config.js';
import { citySpeed } from '../game/rides.js';
const { DATA } = S;

export function startErrandDay(st, clock) {
  const note = S.Calendar.takeErrandDay(st) ? '' : null;
  const hours = st.ap.max;
  clock.setSpan({ startMin: CONFIG.city.startMinute, endMin: CONFIG.city.startMinute + hours * 60, lengthMs: hours * CONFIG.city.hourMs });
  clock.load({ ...clock.save(), state: 'stopped', elapsedMs: 0, day: st.day });
  return note;
}

function sync(st, clock, locId) {
  st.city.at = locId;
  // The normal game: the day clock is the errand budget. The continuous day keeps the original's budget of
  // errand hours (st.ap), spent by actions and refilled at waking, so free time doesn't make errands unlimited.
  if (!clock.continuous) st.ap.left = clock.hoursLeft;
}

export function blocker(st, clock, locId, actId) {
  sync(st, clock, locId);
  return S.City.blocker(st, locId, actId);
}

// Returns the original's result ({toast, text, bad}) or null.
export function act(st, clock, locId, actId, arg) {
  sync(st, clock, locId);
  const a = DATA.cityActions[actId];
  const r = S.City.act(st, locId, actId, arg);
  if (r) { clock.advanceMinutes(a.hours * 60); cue(r.sfx); }
  return r;
}

export function buyBlocker(st, clock, locId, id) { sync(st, clock, locId); return S.City.buyBlocker(st, locId, id); }
export function buy(st, clock, locId, id) { sync(st, clock, locId); const r = S.City.buy(st, locId, id); if (r) cue('coins'); return r; }
export function buyLot(st, clock, i) { sync(st, clock, 'market'); const r = S.City.buyLot(st, i); if (r) cue('coins'); return r; }
export function peekLot(st, clock, i) { sync(st, clock, 'market'); const r = S.City.peekLot(st, i); if (r) cue('emf'); return r; }

export function rideBlocker(st, clock, locId) { sync(st, clock, locId); return S.Ride.upBlocker(st); }

// A ride upgrade's extra errand hours start today, so the day clock grows to fit.
export function upgradeRide(st, clock, locId) {
  sync(st, clock, locId);
  const before = S.City.maxHours(st);
  const n = S.Ride.upgrade(st);
  if (!n) return null;
  cue('travel');
  const extra = S.City.maxHours(st) - before;
  if (extra > 0) clock.extend(extra * 60, extra * CONFIG.city.hourMs);
  return n;
}

// Phase 22: how fast you get around the street, by what you're riding (game/rides.js).
export const walkSpeed = (st, riding = true) => citySpeed(st, riding);
