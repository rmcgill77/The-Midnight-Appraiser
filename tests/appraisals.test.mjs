// Tests for appraisal due dates. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG } from '../src/engine/rng.js';
import { dueDays, dueDate, daysLeft, leftText, isExpired, extendForMissedDay, MAX_DAYS } from '../src/game/appraisals.js';

test('owners give between 1 and 7 days', () => {
  const rng = new RNG(1);
  for (let i = 0; i < 500; i++) for (const fee of [15, 25, 40]) {
    const d = dueDays(fee, [15, 40], rng);
    assert.ok(d >= 1 && d <= MAX_DAYS, `${d} days`);
  }
});

test('harder objects (bigger fees) get longer on average', () => {
  const rng = new RNG(2), avg = fee => { let s = 0; for (let i = 0; i < 2000; i++) s += dueDays(fee, [15, 40], rng); return s / 2000; };
  assert.ok(avg(40) > avg(15) + 2, 'a top-fee job waits much longer than a cheap one');
});

test('a fee outside the range, or a flat range, still gives a valid number of days', () => {
  const rng = new RNG(3);
  for (const fee of [1, 500]) { const d = dueDays(fee, [15, 40], rng); assert.ok(d >= 1 && d <= 7); }
  const d = dueDays(20, [20, 20], rng); assert.ok(d >= 1 && d <= 7);
});

test('the due day is that many days on, skipping the days the shop is closed', () => {
  assert.equal(dueDate(10, 3), 13);
  const closedOn = new Set([13, 14]);
  assert.equal(dueDate(10, 3, d => closedOn.has(d)), 15, 'a job due on a closed day is collected the next open day');
  assert.equal(dueDate(10, 3, () => true), 20, 'never loops forever');
});

test('days left and the text for them', () => {
  const job = { due: 15 };
  assert.equal(daysLeft(job, 12), 3);
  assert.equal(leftText(3), 'due in 3 days');
  assert.equal(leftText(1), 'due tomorrow');
  assert.equal(leftText(0), 'due today');
  assert.equal(daysLeft({}, 12), null);
  assert.equal(leftText(null), '');
});

test('a job expires at the end of its due day', () => {
  assert.equal(isExpired({ due: 15 }, 14), false);
  assert.equal(isExpired({ due: 15 }, 15), true);
  assert.equal(isExpired({}, 99), false, 'a job with no due day never expires this way');
});

test('a missed day gives every open job one more day', () => {
  const jobs = [{ due: 15 }, { due: 18 }, {}];
  extendForMissedDay(jobs);
  assert.deepEqual(jobs, [{ due: 16 }, { due: 19 }, {}]);
});
