// The shop grows as you put money into it. Five stages, from boarded up to restored.
// Every stage is the same 26 x 14 room with the back door, front door, till and
// notice board in the same places, so doors and saves line up across stages; what
// changes is how much of the floor is open, how many cases work, and how it looks.
//
// Extra legend (see rooms.js for the rest):
//   P boards nailed across a closed-off section, j closed-off floor (dust sheets, boxes),
//   x a broken display case, v cracked floorboards (walkable), g a junk pile,
//   s a dusty empty shelf, l a bare work lamp that flickers, N the contractor's estimate.
//
// Each stage also limits the day: how many customers walk in (a boarded-up shop
// doesn't draw a crowd), how long it's open (short hours early on, so a thin day is
// a short day), how many people it can hold once advertising and the storefront bring
// in more (`room`), and, through its cases, how much stock can be out.

import { SHOP_FLOOR } from './rooms.js';
import { CONFIG } from '../config.js';

const SEAM = [
  '##########################',
];

const TIER_ROWS = [
  // 0 · Boarded up: the middle of the shop, two working cases, one bare bulb.
  [
    ...SEAM,
    '#########s###eEN##########',
    '#jjjjjjP.v........Pjjjjjj#',
    '#jjjjjjP..c.....v.Pjjjjjj#',
    '#jjjjjjPKRK..KKKTKPjjjjjj#',
    '#jjjjjjP..........Pjjjjjj#',
    '#jjjjjjPV...x....VPjjjjjj#',
    '#jjjjjjP...v......Pjjjjjj#',
    '#jjjjjjP..........Pjjjjjj#',
    '#jjjjjjP.g...x....Pjjjjjj#',
    '#jjjjjjP....v.....Pjjjjjj#',
    '#jjjjjjP.l......v.Pjjjjjj#',
    '#jjjjjjP.......g..Pjjjjjj#',
    '###########Ff#############',
  ],
  // 1 · Swept and patched: debris out, two cases re-glazed, real lamps.
  [
    ...SEAM,
    '#########S###eEN##########',
    '#jjjjjjP..........Pjjjjjj#',
    '#jjjjjjP..c.......Pjjjjjj#',
    '#jjjjjjPKRK..KKKTKPjjjjjj#',
    '#jjjjjjP..........Pjjjjjj#',
    '#jjjjjjPV...V....VPjjjjjj#',
    '#jjjjjjP...v......Pjjjjjj#',
    '#jjjjjjP..........Pjjjjjj#',
    '#jjjjjjP.....V....Pjjjjjj#',
    '#jjjjjjP..........Pjjjjjj#',
    '#jjjjjjP.L......L.Pjjjjjj#',
    '#jjjjjjP..........Pjjjjjj#',
    '###########Ff#############',
  ],
  // 2 · West wing: the west boards come down; the long counter and its seller's end.
  [
    ...SEAM,
    '#SSss###SS###eEN##########',
    '#.................Pjjjjjj#',
    '#.cc..............Pjjjjjj#',
    '#KKKKRKKKKK..KKKTKPjjjjjj#',
    '#.................Pjjjjjj#',
    '#.VV....VV.......VPjjjjjj#',
    '#.................Pjjjjjj#',
    '#.....v...........Pjjjjjj#',
    '#............V....Pjjjjjj#',
    '#.................Pjjjjjj#',
    '#.L.......L.....L.Pjjjjjj#',
    '#.................Pjjjjjj#',
    '###########Ff#############',
  ],
  // 3 · East wing: the whole floor is open; the old wallpaper is stripped.
  [
    ...SEAM,
    '#SSSS###SSSS#eENSSSS#SSs##',
    '#........................#',
    '#.cc................c....#',
    '#KKKKRKKKKK..KKKTKKKKKKKK#',
    '#........................#',
    '#.VV....VV.......VV...V..#',
    '#........................#',
    '#........................#',
    '#.VV.....................#',
    '#........................#',
    '#.L.........L..........L.#',
    '#........................#',
    '###########Ff#############',
  ],
  // 4 · Restored: the shop as your parents kept it (the Phase 1 to 7 layout).
  SHOP_FLOOR.rows,
];

// Two lines in every stage: sellers at the counter, buyers at the till (always column 16).
const narrowLines = { sell: [{ tx: 9, ty: 5 }, { tx: 9, ty: 6 }, { tx: 9, ty: 7 }], buy: [{ tx: 16, ty: 5 }, { tx: 16, ty: 6 }, { tx: 16, ty: 7 }] };
const fullLines = SHOP_FLOOR.lines;

export const SHOP_TIERS = [
  { tier: 0, name: 'Boarded up', look: 'grime', cost: 0, customers: 4, hours: [11, 16], room: 7, bonus: 0, dark: 0.58, lines: narrowLines, counter: { tx: 9, ty: 4 },
    blurb: 'Six weeks shut, and a year of nobody fixing anything before that. Most of the floor is boarded off. Two cases still lock.' },
  { tier: 1, name: 'Swept and patched', look: 'grime', cost: 150, customers: 5, hours: [10, 16], room: 9, bonus: 0, dark: 0.52, lines: narrowLines, counter: { tx: 9, ty: 4 },
    work: 'Haul out the junk, re-glaze the two broken cases and hang real lamps.',
    blurb: 'Clean enough that people come in out of curiosity. Four working cases.' },
  { tier: 2, name: 'West wing', look: 'worn', cost: 400, customers: 6, hours: [10, 18], room: 11, bonus: 0, dark: 0.47, lines: fullLines, counter: { tx: 5, ty: 4 },
    work: 'Pull the boards off the west side: the full counter, shelving, two more cases.',
    blurb: 'Half the shop is back. The bell over the door gets a workout.' },
  { tier: 3, name: 'East wing', look: 'clean', cost: 750, customers: 8, hours: [9, 19], room: 14, bonus: 0, dark: 0.44, lines: fullLines, counter: { tx: 5, ty: 4 },
    work: 'Open the east side and strip the peeling wallpaper. Three more cases.',
    blurb: 'The whole floor is open again. It looks like a business.' },
  { tier: 4, name: 'Restored', look: 'clean', cost: 1400, customers: null, hours: [8, 20], room: 18, bonus: 1, dark: 0.42, lines: fullLines, counter: { tx: 5, ty: 4 },
    work: 'The rug, the brass lamps and the last three cases, the way your parents had it.',
    blurb: 'Second Sight Pawn, as it was. Word gets around: one more customer every day.' },
];
export const MAX_TIER = SHOP_TIERS.length - 1;

// The room for one stage, in the shape every room has (rows, spawn, interactions)
// plus what the shop floor needs (lines, counter, till, entrance and exits).
const rooms = new Map();
export function shopTierRoom(tier) {
  const t = SHOP_TIERS[clampTier(tier)];
  if (rooms.has(t.tier)) return rooms.get(t.tier);
  const room = {
    ...SHOP_FLOOR,
    id: 'shop', tier: t.tier, look: t.look,
    name: `The Shop Floor · ${t.name}`,
    rows: TIER_ROWS[t.tier],
    spawn: { tx: 14, ty: 3 },
    lines: t.lines, counter: t.counter, till: { tx: 16, ty: 4 },
    interactions: {
      ...SHOP_FLOOR.interactions,
      renovate: { label: 'Notice board', panel: 'renovate' },
      boards: { label: 'Boarded off', panel: 'renovate' },
      broken: { label: 'Broken case', panel: 'renovate' },
      frontdoor: { label: 'Front door', panel: 'frontdoor' },
    },
  };
  rooms.set(t.tier, room);
  return room;
}

// A stage's rows as built (before you move anything around: game/shop-layout.js).
export const tierRows = tier => TIER_ROWS[clampTier(tier)];
export const tierLines = tier => SHOP_TIERS[clampTier(tier)].lines;

export const clampTier = n => Math.max(0, Math.min(MAX_TIER, Number.isInteger(n) ? n : 0));

// Every working display case in a stage, as "tx,ty" slots in reading order.
export function caseSlots(tier) {
  const out = [];
  TIER_ROWS[clampTier(tier)].forEach((row, ty) => { for (let tx = 0; tx < row.length; tx++) if (row[tx] === 'V') out.push(`${tx},${ty}`); });
  return out;
}

// A boarded-up shop doesn't draw a crowd: trim the original's day plan to the stage's
// limit (the inspector, if he's coming, is always first in line), then add the bonus,
// then whoever the ads, the storefront and your regulars bring in, up to what the room
// holds. Extras are { kind, faction? } (a regular comes from a faction that trusts you).
export function capPlan(kinds, tier, extras = []) {
  const t = SHOP_TIERS[clampTier(tier)];
  const out = (t.customers == null ? [...kinds] : kinds.slice(0, t.customers)).map(k => (typeof k === 'string' ? { kind: k } : k));
  for (let i = 0; i < t.bonus; i++) out.push({ kind: 'buy' });
  for (const x of extras) { if (out.length >= Math.max(t.room, kinds.length + t.bonus)) break; out.push(typeof x === 'string' ? { kind: x } : x); }
  return out;
}

// One in-game hour on a shop day takes the same real time at every stage (a full 8 AM to
// 8 PM day is CONFIG.dayLengthMs); earlier stages just keep shorter hours.
export const SHOP_HOUR_MS = CONFIG.dayLengthMs / ((CONFIG.dayEndMinute - CONFIG.dayStartMinute) / 60);
export function shopSpan(tier) {
  const [open, close] = SHOP_TIERS[clampTier(tier)].hours;
  return { startMin: open * 60, endMin: close * 60, lengthMs: (close - open) * SHOP_HOUR_MS };
}
export const hoursText = tier => {
  const [o, c] = SHOP_TIERS[clampTier(tier)].hours, f = h => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
  return `${f(o)} to ${f(c)}`;
};

// After a renovation the cases may sit somewhere else. Items already in a case that
// still exists stay put; the rest move into the free cases in order.
// `slots`: a stage (its cases as built) or a list of "tx,ty" slots (the cases where you put them).
export function reslotDisplays(displays, slots) {
  if (!Array.isArray(slots)) slots = caseSlots(slots);
  const keep = {}, homeless = [];
  for (const [slot, uid] of Object.entries(displays || {})) (slots.includes(slot) && !(slot in keep) ? keep[slot] = uid : homeless.push(uid));
  for (const uid of homeless) { const free = slots.find(s => !(s in keep)); if (!free) break; keep[free] = uid; }
  return keep;
}
