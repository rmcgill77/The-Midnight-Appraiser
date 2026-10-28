// A deeper relationship with a chosen few (Phase 22). Hearts (0 to 10) come from the same
// friendship as everyone's (world.people[name].rel, ten points a heart), but these people
// also take gifts (one a day, from your stock; what they think depends on the kind of
// thing it is, double on their birthday), have heart events the first time you talk at a
// new heart level, and drift apart if you don't come by for a week.
// Who gets it: data/relationships.js. Pure functions; main.js does the screens.

import { S } from '../rules/index.js';
import { RELATIONSHIPS } from '../data/relationships.js';
import { isMonthDay, daysUntil } from './calendar.js';
import { personOf, REL_MAX } from './talk.js';
import { fishOpinion, takeFish, fishById } from './fishing.js';

export const POINTS_PER_HEART = 10, MAX_HEARTS = 10;
export const GIFT_REL = { love: 8, like: 4, neutral: 1, dislike: -5 };
export const DRIFT_AFTER = 7;      // days without a visit before it starts to fade
const DEFAULT_REACTIONS = {
  love: 'You remembered! I love it. I really, really love it.',
  like: 'Oh, that’s nice. Thank you.',
  neutral: 'Huh. Thanks, I guess.',
  dislike: '…Oh. You shouldn’t have. Really.',
};

export const relDef = (name, defs = RELATIONSHIPS) => defs[name] ?? null;
export const hasRelationship = (name, defs = RELATIONSHIPS) => !!relDef(name, defs);
export const relationshipNames = (defs = RELATIONSHIPS) => Object.keys(defs);
export const heartsOf = rel => Math.max(0, Math.min(MAX_HEARTS, Math.floor((rel ?? 0) / POINTS_PER_HEART)));
// Birthdays are real dates ('MM-DD') from v2.0 (game/calendar.js).
export const isBirthday = (def, day) => !!def?.birthday && isMonthDay(def.birthday, day);
export const daysToBirthday = (def, day) => (def?.birthday ? daysUntil(def.birthday, day) : null);

// What they think of a thing, by its category.
export function opinion(def, item) {
  const cat = S.baseOf(item)?.category;
  if (def.loves?.includes(cat)) return 'love';
  if (def.likes?.includes(cat)) return 'like';
  if (def.dislikes?.includes(cat)) return 'dislike';
  return 'neutral';
}

// Things you could give: your stock, minus whatever's out in a display case.
export function giftable(st, world) {
  const shown = new Set(Object.values(world.displays ?? {}));
  return st.inventory.stock.filter(it => !shown.has(it.uid));
}
export const canGiftToday = (world, name, day) => personOf(world, name).flags.giftDay !== day;

// Give a gift. Returns { kind, line, change } or null (not today, or not yours to give).
export function giveGift(world, st, name, uid, defs = RELATIONSHIPS) {
  const def = relDef(name, defs);
  if (!def || !canGiftToday(world, name, st.day)) return null;
  const i = st.inventory.stock.findIndex(it => it.uid === uid);
  if (i < 0 || !giftable(st, world).some(it => it.uid === uid)) return null;
  const item = st.inventory.stock[i];
  const kind = opinion(def, item), bday = isBirthday(def, st.day);
  const p = personOf(world, name);
  const before = p.rel;
  const n = GIFT_REL[kind] * (bday && kind !== 'dislike' ? 2 : 1);
  p.rel = Math.max(-30, Math.min(REL_MAX, p.rel + n));
  p.flags.giftDay = st.day;
  p.flags.known = { ...(p.flags.known ?? {}), [S.baseOf(item)?.category]: kind };
  p.lastDay = st.day;
  st.inventory.stock.splice(i, 1);
  const line = (bday && kind !== 'dislike' ? 'For my birthday? ' : '') + (def.reactions?.[kind] ?? DEFAULT_REACTIONS[kind]);
  return { kind, line, change: p.rel - before, birthday: bday };
}

// v2.3: a fish from your cooler, as a gift. Their taste for fish (`fish` in
// data/relationships.js), a rare one a step warmer; it counts as the day's gift.
export function giveFish(world, st, name, uid, defs = RELATIONSHIPS) {
  const def = relDef(name, defs);
  if (!def || !canGiftToday(world, name, st.day)) return null;
  const c = (world.fishing?.cooler ?? []).find(x => x.uid === uid);
  if (!c) return null;
  const kind = fishOpinion(def, c), bday = isBirthday(def, st.day), p = personOf(world, name), before = p.rel;
  p.rel = Math.max(-30, Math.min(REL_MAX, p.rel + GIFT_REL[kind] * (bday && kind !== 'dislike' ? 2 : 1)));
  p.flags.giftDay = st.day; p.lastDay = st.day;
  p.flags.known = { ...(p.flags.known ?? {}), fish: kind };
  takeFish(world, uid);
  const line = (bday && kind !== 'dislike' ? 'For my birthday? ' : '') + (def.fishReactions?.[kind] ?? def.reactions?.[kind] ?? DEFAULT_REACTIONS[kind]);
  return { kind, line, change: p.rel - before, birthday: bday, fish: fishById(c.id) };
}

// A heart event that's waiting: the lowest heart level you've reached and haven't seen.
export function pendingEvent(world, name, defs = RELATIONSHIPS) {
  const def = relDef(name, defs);
  if (!def?.events) return null;
  const p = personOf(world, name), h = heartsOf(p.rel);
  const levels = Object.keys(def.events).map(Number).sort((a, b) => a - b);
  return levels.find(k => k <= h && !p.flags[`event:${k}`]) ?? null;
}
export function seeEvent(world, name, k) { personOf(world, name).flags[`event:${k}`] = true; }

// A new day: anyone you haven't seen in a week drifts a little further away.
export function driftAll(world, day, defs = RELATIONSHIPS) {
  const out = [];
  for (const name of relationshipNames(defs)) {
    const p = personOf(world, name);
    if (!p.met || p.lastDay == null) continue;
    if (day - p.lastDay > DRIFT_AFTER && p.rel > 0) { p.rel -= 1; out.push(name); }
  }
  return out;
}
