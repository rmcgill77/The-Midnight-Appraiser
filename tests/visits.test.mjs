// Tests for when friends drop by. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG } from '../src/engine/rng.js';
import { isAsleep, canVisit, visitBoost, visitProgress } from '../src/game/visits.js';
import { shopVisitors } from '../src/data/townsfolk.js';

const H = 60;
const open9to5 = (place, m) => place === 'library' && m >= 9 * H && m < 17 * H && !(m >= 12 * H && m < 13 * H);   // lunch 12-1

test('nobody drops by in the small hours', () => {
  assert.equal(isAsleep(2 * H), true);
  assert.equal(isAsleep(0), false);
  assert.equal(isAsleep(7 * H), false);
  assert.equal(isAsleep(24 * H + 3 * H), true, 'works past midnight');
  assert.equal(canVisit({}, 3 * H), false);
});

test('people with a job are busy while their place is open', () => {
  const librarian = { job: 'library' }, ctx = { jobOpen: open9to5 };
  assert.equal(canVisit(librarian, 10 * H, ctx), false);
  assert.equal(canVisit(librarian, 12 * H + 30, ctx), true, 'free at lunch');
  assert.equal(canVisit(librarian, 18 * H, ctx), true, 'free after work');
  assert.equal(canVisit({ job: null }, 10 * H, ctx), true, 'people without a job are free');
  assert.equal(canVisit({ job: 'street' }, 10 * H, ctx), true, 'a job the schedule knows nothing about does not block');
});

test('closer friends come more often', () => {
  assert.equal(visitBoost(0), 1);
  assert.equal(visitBoost(5), 1.5);
  assert.equal(visitBoost(10), 2);
  assert.equal(visitBoost(99), 2);
  assert.equal(visitBoost(undefined), 1);
});

test('a working friend only drops by at lunch or after work', () => {
  const rng = new RNG(1), librarian = { job: 'library' }, ctx = { jobOpen: open9to5 };
  for (let i = 0; i < 300; i++) {
    const p = visitProgress(librarian, 8 * H, 20 * H, ctx, rng);
    assert.notEqual(p, null);
    const minute = 8 * H + p * 12 * H;
    assert.ok(minute < 9 * H || (minute >= 12 * H && minute < 13 * H) || minute >= 17 * H, `came at ${minute / H}h`);
  }
});

test('a friend who is never free is dropped', () => {
  const rng = new RNG(2);
  assert.equal(visitProgress({ job: 'library' }, 10 * H, 12 * H, { jobOpen: open9to5 }, rng), null, 'at work the whole shift');
  assert.equal(visitProgress({}, 2 * H, 6 * H, {}, rng), null, 'asleep the whole shift');
});

test('visits are more likely when it is busy', () => {
  const rng = new RNG(3);
  let lunch = 0, morning = 0;
  for (let i = 0; i < 4000; i++) {
    const m = 10 * H + visitProgress({}, 10 * H, 18 * H, {}, rng) * 8 * H;
    if (m >= 12 * H && m < 13.5 * H) lunch++; else if (m >= 10 * H && m < 12 * H) morning++;
  }
  assert.ok(lunch / 1.5 > morning / 2 * 1.3, 'lunch brings more visitors than mid-morning');
});

test('visits fit inside the shift and the same seed gives the same time', () => {
  const a = visitProgress({}, 10 * H, 18 * H, {}, new RNG(5)), b = visitProgress({}, 10 * H, 18 * H, {}, new RNG(5));
  assert.equal(a, b);
  assert.ok(a >= 0 && a <= 0.97);
});

test('a boost makes a friend drop by more often; without one nothing changes', () => {
  const count = boost => { let n = 0; for (let day = 1; day <= 3000; day++) if (shopVisitors(day, 7, boost).includes('Dex')) n++; return n; };
  const base = count(undefined), same = count(() => 1), boosted = count(name => (name === 'Dex' ? 2 : 1));
  assert.equal(base, same, 'a boost of 1 is the old behaviour');
  assert.ok(boosted > base * 1.3, `${boosted} visits with a boost of 2 vs ${base} without`);
});
