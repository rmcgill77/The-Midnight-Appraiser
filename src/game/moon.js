// The moon (v2.4), from the real calendar: the world's dates are real dates (game/calendar.js),
// so the moon over the city is the one that was really up that night in 1999. A synodic
// month from a known new moon (6 January 2000, 18:14 UTC), taken at about midnight.
//
// What it does: a full moon lights the streets (shallower dark, slower to be noticed) but
// brings more of the strange out; a new moon is darkest of all. Pure.

import { dateOf } from './calendar.js';

export const SYNODIC = 29.530588853;
const REF = Date.UTC(2000, 0, 6, 18, 14);
const DAY_MS = 86400000;

export const PHASES = [
  { id: 'new', name: 'New moon', icon: '●' },
  { id: 'waxcres', name: 'Waxing crescent', icon: '☽' },
  { id: 'first', name: 'First quarter', icon: '◐' },
  { id: 'waxgib', name: 'Waxing gibbous', icon: '◐' },
  { id: 'full', name: 'Full moon', icon: '○' },
  { id: 'wangib', name: 'Waning gibbous', icon: '◑' },
  { id: 'last', name: 'Last quarter', icon: '◑' },
  { id: 'wancres', name: 'Waning crescent', icon: '☾' },
];

// The moon on the night of `day` (around midnight after it).
export function moonOn(day) {
  const { y, m, d } = dateOf(day);
  const t = Date.UTC(y, m, d, 23, 59);
  const age = ((((t - REF) / DAY_MS) % SYNODIC) + SYNODIC) % SYNODIC;
  const frac = age / SYNODIC;
  const light = (1 - Math.cos(2 * Math.PI * frac)) / 2;   // 0 new .. 1 full
  const phase = PHASES[Math.floor(frac * 8 + 0.5) % 8];
  return { age, frac, light, ...phase, waxing: frac < 0.5 };
}

// How the moon changes a night out: darkness over the streets (0..1), how fast the dark
// notices you, and how likely something strange turns up.
export function moonEffects(moon) {
  const L = moon.light;
  return { dark: 0.86 - 0.18 * L, notice: 1.3 - 0.5 * L, strange: 0.8 + 0.7 * L };
}
