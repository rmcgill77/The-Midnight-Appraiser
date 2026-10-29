// The weather (Phase 23). Every day has weather, the same for the whole day and night,
// chosen from the save's seed: tomorrow's tends to follow today's (a rainy spell, a cold
// snap), and the season decides what's likely (autumn rains, winter snow, a spring thaw,
// summer storms).
// It reaches into most of the game:
//   the shop:    how many buyers and sellers come in, and how long they'll wait
//   the city:    walking and riding pace, which places stay shut, the bus, what happens
//   night runs:  how bold the cryptids are, how fast your light drains, what you can see
//   sound:       an ambient bed (rain, wind, thunder) and the music's mood
//   the screen:  rain, snow, fog banks, cloud shadows, lightning (ui/weather-fx.js)
// Pure: no DOM. Everything reads `weatherOn(seed, day)`.

export const TYPES = {
  clear: {
    name: 'Clear', icon: 'sun', tone: 'good',
    blurb: 'Clear skies. Busy streets, more people browsing.',
    buyers: 1.2, sellers: 1, patience: 1, walk: 1, ride: 1.05, cryptidStep: 1.05, lightEvery: 1.15, closes: [],
    perks: ['More buyers in the shop', 'Your light lasts a little longer tonight'],
  },
  overcast: {
    name: 'Overcast', icon: 'cloud', tone: 'calm',
    blurb: 'Grey and still. An ordinary day.',
    buyers: 1, sellers: 1, patience: 1, walk: 1, ride: 1, cryptidStep: 1, lightEvery: 1, closes: [],
    perks: [],
  },
  fog: {
    name: 'Fog', icon: 'fog', tone: 'mixed',
    blurb: 'Thick fog off the harbor. You can’t see the end of the block.',
    buyers: 0.9, sellers: 1.1, patience: 1.1, walk: 1, ride: 0.9, cryptidStep: 1.2, lightEvery: 1, closes: [],
    pickpockets: 2, mist: true,
    perks: ['Cryptids lose your trail in the fog tonight'], cons: ['Pickpockets work the fog'],
  },
  rain: {
    name: 'Rain', icon: 'rain', tone: 'mixed',
    blurb: 'Steady rain. Fewer shoppers, but people clear out their attics on days like this.',
    buyers: 0.8, sellers: 1.3, patience: 1.15, walk: 1, ride: 0.85, cryptidStep: 1.1, lightEvery: 1, closes: [['market', 0.5]],
    perks: ['More sellers at the counter', 'The rain covers your footsteps tonight'], cons: ['Fewer buyers', 'Bikes are slower'],
  },
  storm: {
    name: 'Thunderstorm', icon: 'storm', tone: 'bad',
    blurb: 'A thunderstorm. Shops are shutting early and everything out there is restless.',
    buyers: 0.55, sellers: 0.9, patience: 1.25, walk: 0.95, ride: 0.75, cryptidStep: 0.72, lightEvery: 1, closes: [['market', 1], ['hardware', 0.3], ['autoshop', 0.4], ['relay', 0.3], ['library', 0.25], ['tower', 0.2]],
    lightning: true, busMinutes: 45,
    perks: ['Lightning lights up the laundromat and St. Agnes tonight'], cons: ['Cryptids are far more aggressive tonight', 'Some places close', 'Few buyers'],
  },
  snow: {
    name: 'Snow', icon: 'snow', tone: 'mixed',
    blurb: 'Snow. The city goes quiet and slow.',
    buyers: 0.85, sellers: 0.9, patience: 1.4, walk: 0.9, ride: 0.7, vanRide: 0.85, cryptidStep: 1.3, lightEvery: 0.67, closes: [['market', 0.6], ['autoshop', 0.4]],
    perks: ['Customers wait longer', 'The cold makes cryptids sluggish'], cons: ['The cold drains your light faster', 'Slow going on the street'],
  },
};
export const ORDER = ['clear', 'overcast', 'fog', 'rain', 'storm', 'snow'];

// The season comes from the calendar (game/calendar.js): real seasons from v2.0, the old
// autumn-winter-spring run for older saves.
import { seasonOf, calendarKey } from './calendar.js';
export { seasonOf };

// Tomorrow, given today (weights, before the season's say).
const NEXT = {
  clear: { clear: 4, overcast: 3, fog: 1, rain: 1.2, storm: 0.3, snow: 0.6 },
  overcast: { clear: 2.5, overcast: 3, fog: 1, rain: 2.5, storm: 0.7, snow: 1 },
  fog: { clear: 3, overcast: 3, fog: 1.5, rain: 1.5, storm: 0.2, snow: 0.5 },
  rain: { clear: 1.5, overcast: 3, fog: 0.6, rain: 3, storm: 2, snow: 0.6 },
  storm: { clear: 2, overcast: 3, fog: 0.5, rain: 3.5, storm: 0.8, snow: 0.3 },
  snow: { clear: 2, overcast: 3, fog: 1, rain: 0.4, storm: 0.2, snow: 4 },
};
const SEASON = {
  autumn: { snow: 0, rain: 1.3, storm: 1.2, fog: 1.2 },
  winter: { snow: 1.6, rain: 0.6, storm: 0.4, clear: 1.1 },
  spring: { snow: 0.15, rain: 1.2, storm: 1.1, clear: 1.2 },
  summer: { snow: 0, clear: 1.5, storm: 1.3, fog: 0.8, rain: 0.7 },
};

function rand(seed, day) {
  let h = (seed ^ Math.imul(day + 101, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// God mode can set the weather by hand (for testing); null goes back to the forecast.
let override = null;
export function setWeatherOverride(type) { override = TYPES[type] ? type : null; }
export const weatherOverride = () => override;

// The weather on a day (1 = the first day: always overcast, an easy start). Cached per seed.
const cache = new Map();
// Phase 30: the continuous day swaps the one-type-a-day forecast for the climate (game/climate.js): the
// provider gives each day's single answer (midday), for the things that need one a day.
let climateProvider = null;
export function setClimateProvider(fn) { climateProvider = fn; }

export function weatherOn(seed = 0, day = 1) {
  if (override) return override;
  if (climateProvider) return climateProvider(seed, day);
  if (day <= 1) return 'overcast';
  const key = `${seed}:${calendarKey()}`;
  let list = cache.get(key);
  if (!list) { list = ['overcast', 'overcast']; cache.set(key, list); if (cache.size > 8) cache.delete(cache.keys().next().value); }
  for (let d = list.length; d <= day; d++) {
    const prev = list[d - 1], s = SEASON[seasonOf(d)];
    const w = ORDER.map(t => [t, NEXT[prev][t] * (s[t] ?? 1)]);
    const total = w.reduce((a, [, v]) => a + v, 0);
    let r = rand(seed, d) * total, pick = w[w.length - 1][0];
    for (const [t, v] of w) { if ((r -= v) <= 0) { pick = t; break; } }
    list[d] = pick;
  }
  return list[day];
}
export const weatherDef = (seed, day) => TYPES[weatherOn(seed, day)];

// Whether a place in town is shut for the weather today (the same all day).
export function closedByWeather(placeId, seed, day) {
  const w = TYPES[weatherOn(seed, day)];
  const rule = w.closes.find(([id]) => id === placeId);
  if (!rule) return false;
  return rand(seed ^ hashStr(placeId), day) < rule[1];
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

// The shop: drop or add arrivals to fit the weather, before the shop's own limits apply.
// kinds: the original planner's list ('buy', 'sell', 'appraise'); rng(): [0, 1).
export function adjustArrivals(kinds, type, rng) {
  const w = TYPES[type] ?? TYPES.overcast, out = [];
  const by = k => (k === 'buy' ? w.buyers : k === 'sell' ? w.sellers : 1);
  for (const k of kinds) {
    const m = by(k);
    if (m >= 1) { out.push(k); if (rng() < m - 1) out.push(k); }
    else if (rng() < m) out.push(k);
  }
  return out;
}

// How fast you get around the street in this weather (riding or walking).
export function streetPace(type, riding, vehicleKind) {
  const w = TYPES[type] ?? TYPES.overcast;
  if (!riding) return w.walk;
  return vehicleKind === 'van' ? (w.vanRide ?? Math.max(w.ride, 0.9)) : w.ride;
}

// One line for the morning: what it is and what it means.
export function forecastLine(type) {
  const w = TYPES[type];
  const bits = [...(w.perks ?? []), ...(w.cons ?? [])];
  return bits.length ? `${w.blurb} ${bits.join('. ')}.` : w.blurb;
}
