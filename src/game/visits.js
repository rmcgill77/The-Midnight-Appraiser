// When the town's people drop by the shop (Phase 30), pure. In the continuous day the shop can be open at
// any hour, so a friend's visit has to fit their own day: asleep in the small hours, working while
// their place is open, free otherwise. And the closer they are to you, the more often they come.

import { weightAt } from './traffic.js';

const DAY = 24 * 60;
export const ASLEEP = [1 * 60, 7 * 60];       // nobody drops by between 1 AM and 7 AM
export const isAsleep = minute => { const m = ((minute % DAY) + DAY) % DAY; return m >= ASLEEP[0] && m < ASLEEP[1]; };

// Is `npc` (an entry with an optional `job`: a place id) free to drop by at this absolute game minute?
// ctx.jobOpen(placeId, minuteOfDay) says whether their workplace is open.
export function canVisit(npc, minute, { jobOpen = () => false } = {}) {
  if (isAsleep(minute)) return false;
  if (npc?.job && jobOpen(npc.job, ((minute % DAY) + DAY) % DAY)) return false;
  return true;
}

// More hearts, more visits: a stranger comes as often as before, a close friend about twice as often.
export const visitBoost = hearts => 1 + 0.1 * Math.max(0, Math.min(10, hearts ?? 0));

// When a friend drops by: a fraction (0..0.97) of the time from `opened` to `closes` (absolute game minutes),
// picked among the times they're free, more likely when it's busy. null when they're never free.
// rng has next().
export function visitProgress(npc, opened, closes, ctx, rng, step = 10) {
  const span = Math.max(1, closes - opened);
  const slots = [];
  for (let t = opened; t < closes; t += step) {
    const at = t + step / 2;
    if (canVisit(npc, at, ctx)) slots.push({ at: t, w: weightAt(at) });
  }
  if (!slots.length) return null;
  const total = slots.reduce((s, x) => s + x.w, 0);
  let r = rng.next() * total, pick = slots[slots.length - 1];
  for (const s of slots) { if ((r -= s.w) <= 0) { pick = s; break; } }
  return Math.min(0.97, Math.max(0, (pick.at + rng.next() * step - opened) / span));
}
