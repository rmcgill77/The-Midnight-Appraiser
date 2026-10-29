// Tests for the stand-in clock. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { ContinuousClock } from '../src/game/continuous-clock.js';
import { CONFIG } from '../src/config.js';

const H = 60, DAY = 24 * H;
const at = (date, hour, min = 0) => date * DAY + hour * H + min;
const make = (date, hour, min = 0) => { const c = new ContinuousClock(CONFIG, { startT: at(date, hour, min) }); c.start(); return c; };

test('the day number is the calendar date, 1-based, and changes at midnight', () => {
  const c = make(0, 23, 30);
  assert.equal(c.day, 1);
  c.advanceMinutes(60);
  assert.equal(c.day, 2);
  assert.equal(c.label, '12:30 AM');
});

test('minutes run past midnight for the night code: 1 AM is 25:00, 4 AM is 28:00, plain from 6 AM', () => {
  assert.equal(make(0, 22).minute, 22 * H);
  assert.equal(make(1, 1).minute, 25 * H);
  assert.equal(make(1, 4).minute, 28 * H);
  assert.equal(make(1, 5).minute, 29 * H);
  assert.equal(make(1, 7).minute, 7 * H);
  assert.equal(make(1, 10).minute, 10 * H);
  assert.equal(make(1, 14).minute, 14 * H);
});

test('the displayed time snaps to the ten-minute step', () => {
  const c = make(0, 9, 47);
  assert.equal(c.minute, 9 * H + 40);
  assert.equal(c.label, '9:40 AM');
});

test('progress: bright in the morning, dusk through the day, dark at night, and fading by 8 AM', () => {
  assert.equal(make(0, 8).progress, 0);
  assert.equal(make(0, 14).progress, 0.5);
  assert.equal(make(0, 20).progress, 1);
  assert.equal(make(1, 2).progress, 1);
  assert.equal(make(1, 6).progress, 1);
  assert.equal(make(1, 7).progress, 0.5);
  assert.equal(make(1, 8).progress, 0);
});

test('hoursLeft counts down to the end of the sleep window and never goes negative', () => {
  assert.equal(make(0, 22).hoursLeft, 12);
  assert.equal(make(1, 9).hoursLeft, 1);
  assert.equal(make(1, 12).hoursLeft, 22);
});

test('it only runs while started, and not while paused', () => {
  const c = new ContinuousClock(CONFIG, { startT: at(0, 12) });
  assert.equal(c.state, 'stopped');
  c.tick(60 * 1000, false);
  assert.equal(c.minuteOfDay, 12 * H);
  c.start(); c.tick(60 * 1000, true);
  assert.equal(c.minuteOfDay, 12 * H);
  c.tick(60 * 1000, false);
  assert.equal(c.minuteOfDay, 13 * H);
  c.stop();
  assert.equal(c.state, 'stopped');
});

test('it never ends by itself: tick always reports false', () => {
  const c = make(0, 12);
  assert.equal(c.tick(60 * 1000), false);
  assert.equal(c.advanceMinutes(40 * H), false);
  assert.notEqual(c.state, 'ended');
});

test('skipped nights and collapses reach the game through onEvent', () => {
  const c = make(0, 12);
  const seen = [];
  c.onEvent = e => seen.push(e.type);
  c.advanceMinutes(22 * H);
  c.advanceMinutes(24 * H);
  c.advanceMinutes(24 * H);
  assert.deepEqual(seen.filter(t => t !== 'midnight'), ['skipped', 'skipped', 'skipped', 'collapse']);
});

test('setSpan and extend are accepted and do nothing', () => {
  const c = make(0, 12);
  c.setSpan({ startMin: 0, endMin: 60, lengthMs: 1 }); c.extend(60, 1000);
  assert.equal(c.minuteOfDay, 12 * H);
});

test('endDay asks the game, with the day number', () => {
  const c = make(0, 12);
  const calls = [];
  c.onDayEnd = (reason, day) => calls.push([reason, day]);
  c.endDay();
  assert.deepEqual(calls, [['early', 1]]);
});

test('save and load round-trip', () => {
  const c = make(0, 12); c.advanceMinutes(22 * H);
  const d = new ContinuousClock(CONFIG).load(JSON.parse(JSON.stringify(c.save())));
  assert.deepEqual(d.save(), c.save());
  assert.equal(d.state, 'running');
});

test('a timed window (a night run) runs out, reports once, and ends the clock', () => {
  const c = make(0, 22);
  const calls = [];
  c.onDayEnd = (reason, day) => calls.push([reason, day]);
  c.beginTimed(6 * H);
  assert.equal(c.progress, 0);
  assert.equal(c.hoursLeft, 6);
  c.tick(3 * 60 * 1000);                       // three game hours
  assert.equal(c.progress, 0.5);
  assert.equal(c.hoursLeft, 3);
  assert.equal(c.state, 'running');
  assert.equal(c.tick(10 * 60 * 1000), true);  // more than enough: stops exactly at the limit
  assert.equal(c.state, 'ended');
  assert.equal(c.cycle.t, at(1, 4));
  assert.deepEqual(calls, [['timeout', 2]]);          // it's 4 AM, so the date has rolled over
  assert.equal(c.tick(60 * 1000), false);      // nothing more happens
  assert.equal(calls.length, 1);
  assert.equal(c.hoursLeft, 0);
});

test('advanceMinutes inside a timed window stops at the limit too', () => {
  const c = make(0, 22);
  c.beginTimed(2 * H);
  assert.equal(c.advanceMinutes(5 * H), true);
  assert.equal(c.cycle.t, at(0, 24));
  assert.equal(c.state, 'ended');
});

test('extend gives a night run its grace period and revives an ended window', () => {
  const c = make(0, 22);
  c.beginTimed(1 * H);
  c.tick(2 * 60 * 1000);
  assert.equal(c.state, 'ended');
  c.extend(30);
  assert.equal(c.state, 'running');
  assert.equal(c.hoursLeft, 0.5);
  assert.equal(c.tick(20 * 1000), false);
  assert.equal(c.state, 'running');
  assert.equal(c.tick(20 * 1000), true);
});

test('endTimed drops the limit and the clock goes back to its normal readings', () => {
  const c = make(1, 12);
  c.beginTimed(1 * H);
  c.endTimed();
  assert.equal(c.timed, null);
  assert.equal(c.hoursLeft, 22);
  c.beginTimed(30); c.tick(60 * 1000);               // run it out, then drop it
  assert.equal(c.state, 'ended');
  c.endTimed(); c.start();
  assert.equal(c.state, 'running');
  assert.equal(c.tick(2 * 60 * 1000), false);
  assert.equal(c.state, 'running');
});

test('a timed window survives save and load', () => {
  const c = make(0, 22); c.beginTimed(3 * H); c.tick(60 * 1000);
  const d = new ContinuousClock(CONFIG).load(JSON.parse(JSON.stringify(c.save())));
  assert.equal(d.hoursLeft, c.hoursLeft);
  assert.equal(d.progress, c.progress);
});

test('it says it is the continuous clock, and the errand budget is whatever the game says', () => {
  const c = make(0, 12);
  assert.equal(c.continuous, true);
  assert.equal(c.errandHours, null);
  c.errandHours = () => 4;
  assert.equal(c.errandHours(), 4);
});
