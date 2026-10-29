// Tests for the climate model. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { sample, typeOf, typeAt, TYPES, outlook, pressureTrend, dayType } from '../src/game/climate.js';

const H = 60, DAY = 1440;
const SEEDS = [1, 7, 42, 1999, 31337];
const SEP = 8, JAN = 0, JUL = 6;

// every reading, hourly, for `days` days, across a few seeds
function* readings(month, days = 60, seeds = SEEDS) {
  for (const seed of seeds) for (let d = 0; d < days; d++) for (let h = 0; h < 24; h++) yield { seed, d, h, t: d * DAY + h * H, s: sample(seed, d * DAY + h * H, { month }) };
}

test('the same seed and time always give the same weather', () => {
  assert.deepEqual(sample(5, 12345, { month: 3 }), sample(5, 12345, { month: 3 }));
  assert.notDeepEqual(sample(5, 12345, { month: 3 }), sample(6, 12345, { month: 3 }));
});

test('readings stay in sensible ranges, and types are valid', () => {
  for (const month of [JAN, 4, JUL, SEP]) for (const { s } of readings(month, 20)) {
    assert.ok(s.temp > -25 && s.temp < 42, `temp ${s.temp}`);
    for (const k of ['humidity', 'cloud', 'precip', 'fog', 'thunder']) assert.ok(s[k] >= 0 && s[k] <= 1, `${k} ${s[k]}`);
    assert.ok(s.wind >= 0 && s.wind < 30, `wind ${s.wind}`);
    assert.ok(s.pressure > 960 && s.pressure < 1050, `pressure ${s.pressure}`);
    assert.ok(TYPES.includes(typeOf(s)));
  }
});

test('the first day is an easy start: no rain or storm in the first 30 hours', () => {
  for (const seed of SEEDS) for (let m = 0; m < 30 * H; m += 30) {
    const s = sample(seed, m, { month: SEP });
    assert.equal(s.precip, 0); assert.equal(s.fog, 0);
  }
});

test('summer is much warmer than winter, and the afternoon warmer than before dawn', () => {
  const avg = (month, hour) => { let n = 0, sum = 0; for (const { s, h } of readings(month, 40)) if (h === hour) { n++; sum += s.temp; } return sum / n; };
  assert.ok(avg(JUL, 15) - avg(JAN, 15) > 15, 'July afternoons are far warmer than January ones');
  assert.ok(avg(SEP, 15) - avg(SEP, 5) > 3.5, 'a September afternoon is warmer than its pre-dawn');
});

test('fronts bring rain on and off: it rains a fair share of the time, in several separate spells', () => {
  let wet = 0, total = 0, spells = 0;
  for (const seed of SEEDS) {
    let was = false;
    for (let t = 0; t < 90 * DAY; t += 30) {
      const raining = sample(seed, t, { month: SEP }).precip > 0.1;
      total++; if (raining) wet++;
      if (raining && !was) spells++;
      was = raining;
    }
  }
  const share = wet / total, perSeed = spells / SEEDS.length;
  assert.ok(share > 0.08 && share < 0.4, `it rains ${(share * 100).toFixed(0)}% of the time`);
  assert.ok(perSeed > 10 && perSeed < 60, `${perSeed} separate wet spells in 90 days`);
});

test('the weather changes through the day on a good share of days', () => {
  let changed = 0, days = 0;
  for (const seed of SEEDS) for (let d = 2; d < 62; d++) {
    const types = new Set(); for (let h = 8; h < 22; h += 2) types.add(typeAt(seed, d * DAY + h * H, { month: SEP }));
    days++; if (types.size >= 2) changed++;
  }
  assert.ok(changed / days > 0.3, `${Math.round(100 * changed / days)}% of days change`);
});

test('pressure falls before the rain arrives', () => {
  let falls = 0, onsets = 0;
  for (const seed of SEEDS) {
    let was = false;
    for (let t = 2 * DAY; t < 80 * DAY; t += 30) {
      const raining = sample(seed, t, { month: SEP }).precip > 0.15;
      if (raining && !was) { onsets++; if (pressureTrend(seed, t - 3 * H, { month: SEP }) < -0.3) falls++; }
      was = raining;
    }
  }
  assert.ok(onsets > 20);
  assert.ok(falls / onsets > 0.6, `pressure was falling before ${falls} of ${onsets} rains`);
});

test('snow only when it is cold, rain only when it is not', () => {
  for (const month of [JAN, 3, SEP]) for (const { s } of readings(month, 40)) {
    const t = typeOf(s);
    if (t === 'snow') assert.ok(s.temp <= 0.8 + 1e-9, `snow at ${s.temp}`);
    if (t === 'rain' || t === 'storm') assert.ok(s.precip > 0.1);
  }
  let janSnow = 0, julSnow = 0;
  for (const { s } of readings(JAN, 90)) if (typeOf(s) === 'snow') janSnow++;
  for (const { s } of readings(JUL, 90)) if (typeOf(s) === 'snow') julSnow++;
  assert.ok(janSnow > 20, `${janSnow} snowy hours in January`);
  assert.equal(julSnow, 0, 'never snow in July');
});

test('fog forms in the small hours of damp, calm days and is gone by midday', () => {
  let fogHours = 0, outsideMorning = 0, atNoon = 0;
  for (const month of [SEP, 9, 10]) for (const { s, h } of readings(month, 60)) {
    if (typeOf(s) === 'fog') { fogHours++; if (h >= 11 && h < 21) outsideMorning++; if (h >= 12 && h <= 14) atNoon++; }
  }
  assert.ok(fogHours > 20, `${fogHours} foggy hours`);
  assert.ok(fogHours < 0.1 * 3 * 60 * 24 * SEEDS.length, `fog is occasional, not constant (${fogHours} hours)`);
  assert.equal(atNoon, 0, 'no fog at midday');
  assert.equal(outsideMorning, 0, 'no fog between 11 AM and 9 PM');
});

test('thunderstorms: common on hot summer afternoons, rare in winter, and only when it is warm', () => {
  const storms = month => { let n = 0; for (const { s } of readings(month, 60)) if (typeOf(s) === 'storm') n++; return n; };
  const summer = storms(JUL), winter = storms(JAN);
  assert.ok(summer > 15, `${summer} storm hours in July`);
  assert.ok(summer > winter * 3, `${summer} in July vs ${winter} in January`);
  for (const { s } of readings(JAN, 60)) if (typeOf(s) === 'storm') assert.ok(s.temp > 4, `a thunderstorm at ${s.temp}`);
});

test('summer storms come in the afternoon and evening', () => {
  const hours = [];
  for (const { s, h } of readings(JUL, 60)) if (s.thunder > 0.5 && s.precip > 0.3) hours.push(h);
  const afternoon = hours.filter(h => h >= 12 && h <= 22).length;
  assert.ok(hours.length > 10);
  assert.ok(afternoon / hours.length > 0.6, `${afternoon} of ${hours.length} storm hours were in the afternoon or evening`);
});

test('the outlook looks ahead, and a day has a single midday type', () => {
  const o = outlook(3, 5 * DAY, { month: SEP });
  assert.deepEqual(o.map(x => x.hours), [3, 6, 12, 24]);
  assert.ok(o.every(x => TYPES.includes(x.type)));
  assert.equal(dayType(3, 5, { month: SEP }), typeAt(3, 5 * DAY + 12 * H, { month: SEP }));
});

test('every kind of weather turns up over a season', () => {
  const seen = new Set();
  for (const month of [SEP, 10, JAN, 4, JUL]) for (const { s } of readings(month, 40)) seen.add(typeOf(s));
  assert.deepEqual([...seen].sort(), [...TYPES].sort());
});
