// Tests for shop traffic through the day. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG } from '../src/engine/rng.js';
import { weightAt, hoursScale, arrivalProgress } from '../src/game/traffic.js';

const H = 60;

test('lunch and after work are the busiest, the small hours the quietest', () => {
  assert.ok(weightAt(12 * H + 30) > weightAt(10 * H + 30));
  assert.ok(weightAt(17 * H + 30) > weightAt(12 * H + 30));
  assert.ok(weightAt(2 * H) < weightAt(10 * H));
  assert.ok(weightAt(6 * H) < weightAt(2 * H) + 0.1);
  assert.equal(weightAt(24 * H + 17 * H + 30), weightAt(17 * H + 30), 'works past midnight too');
});

test('fewer hours bring fewer customers, never none', () => {
  assert.equal(hoursScale(8 * H, 8 * H), 1);
  assert.equal(hoursScale(4 * H, 8 * H), 0.5);
  assert.equal(hoursScale(12 * H, 8 * H), 1);
  assert.equal(hoursScale(5, 8 * H), 0.15);
});

test('arrivals: the right number, sorted, inside the shift', () => {
  const r = arrivalProgress(9, 10 * H, 18 * H, new RNG(4));
  assert.equal(r.length, 9);
  assert.deepEqual([...r].sort((a, b) => a - b), r);
  assert.ok(r.every(x => x >= 0 && x <= 0.97));
  assert.deepEqual(arrivalProgress(0, 10 * H, 18 * H, new RNG(4)), []);
});

test('arrivals bunch up at lunch and after work', () => {
  // A 10 AM-6 PM shift: count what share of 4000 arrivals land at lunch (12-1:30) vs the dull stretch (10-12)
  const rng = new RNG(9);
  let lunch = 0, early = 0, evening = 0, n = 0;
  for (let rep = 0; rep < 400; rep++) {
    for (const p of arrivalProgress(10, 10 * H, 18 * H, rng)) {
      const minute = 10 * H + p * 8 * H;
      n++;
      if (minute >= 12 * H && minute < 13.5 * H) lunch++;
      else if (minute >= 10 * H && minute < 12 * H) early++;
      else if (minute >= 17 * H) evening++;
    }
  }
  const perHour = { lunch: lunch / n / 1.5, early: early / n / 2, evening: evening / n / 1 };
  assert.ok(perHour.lunch > perHour.early * 1.3, 'lunch is busier than mid-morning');
  assert.ok(perHour.evening > perHour.early * 1.3, 'the last hour (after work) is busier than mid-morning');
});

test('a late-night shift gets sparse traffic, but still spreads across the shift', () => {
  const r = arrivalProgress(5, 22 * H, 30 * H, new RNG(2));        // 10 PM to 6 AM
  assert.ok(r[0] < r[4]);
  assert.ok(r[4] <= 0.97);
});

test('the same seed gives the same arrivals', () => {
  assert.deepEqual(arrivalProgress(8, 10 * H, 18 * H, new RNG(3)), arrivalProgress(8, 10 * H, 18 * H, new RNG(3)));
});
