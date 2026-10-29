// Tests for the continuous day and night. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { DayCycle } from '../src/game/daycycle.js';
import { CONFIG } from '../src/config.js';

const H = 60;
const cfg = CONFIG.cycle;
const at = (date, hour, min = 0) => date * 24 * H + hour * H + min;
const sans = ev => ev.filter(e => e.type !== 'midnight');       // most tests aren't about midnight
const make = (date = 0, hour = 8, wokeUp = false) => new DayCycle(cfg, { startT: at(date, hour), wokeUp });

test('real time: one real minute is one in-game hour, so 18 awake hours take 18 minutes', () => {
  const c = make(0, 8, true);
  c.tick(60 * 1000);
  assert.equal(c.t, at(0, 9));
  const full = make(0, 10); full.tick(18 * 60 * 1000);
  assert.equal(full.t, at(1, 4));
});

test('the calendar date changes at midnight and the label follows the time of day', () => {
  const c = make(0, 23);
  assert.equal(c.date, 0);
  c.advance(2 * H);
  assert.equal(c.date, 1);
  assert.equal(c.minuteOfDay, 1 * H);
  assert.equal(c.label, '1:00 AM');
});

test('sleep is only allowed between 8 PM and 10 AM', () => {
  assert.equal(make(0, 19).canSleep, false);
  assert.equal(make(0, 19).sleepBlock, 'tooEarly');
  assert.equal(make(0, 20).canSleep, true);
  assert.equal(make(1, 3).canSleep, true);
  assert.equal(make(1, 10).canSleep, false);
  assert.equal(make(1, 15).canSleep, false);
});

test('sleeping at 8 PM wakes at 2 AM the earliest, and can run longer', () => {
  const c = make(0, 20);
  const r = c.sleep();
  assert.equal(r.ok, true); assert.equal(r.full, true);
  assert.equal(c.t, at(1, 2));
  const d = make(0, 20);
  d.sleep({ until: at(1, 7) });
  assert.equal(d.t, at(1, 7));
});

test('sleeping can never run past 10 AM, and a short sleep is cut short', () => {
  const c = make(1, 5);               // 5 AM: only 5 hours until 10 AM
  const r = c.sleep();
  assert.equal(c.t, at(1, 10));
  assert.equal(r.full, false); assert.equal(r.cutShort, true);
  assert.equal(c.penalties.slow, true);
  // a longer request is still capped at 10 AM
  const d = make(0, 20); d.sleep({ until: at(2, 12) });
  assert.equal(d.t, at(1, 10)); assert.equal(d.shortSleep, false);
});

test('4 AM is the latest start that still gives a full 6 hours', () => {
  const c = make(1, 4); const r = c.sleep();
  assert.equal(r.full, true); assert.equal(c.t, at(1, 10));
});

test('only one sleep per window', () => {
  const c = make(0, 22);
  assert.equal(c.sleep().ok, true);
  assert.equal(c.canSleep, false);
  assert.equal(c.sleep().reason, 'alreadySlept');   // woke at 4 AM: still in the window
});

test('already-slept is reported inside the window', () => {
  const c = make(0, 20); c.sleep({ until: at(1, 2) });
  assert.equal(c.t, at(1, 2));
  assert.equal(c.canSleep, false);
  assert.equal(c.sleepBlock, 'alreadySlept');
  c.advance(18 * H);                    // through the day to 8 PM
  assert.equal(c.canSleep, true);
});

test('a full sleep after a cut-short one clears the slow-walking penalty', () => {
  const c = make(1, 5); c.sleep();
  assert.equal(c.shortSleep, true);
  c.advance(10 * H);                    // 8 PM
  c.sleep();
  assert.equal(c.shortSleep, false);
  assert.equal(c.penalties.slow, false);
});

test('no skipped night when the first window closes (the player just woke up)', () => {
  const c = make(0, 8, true);           // a new game starts just after waking
  assert.equal(c.canSleep, false);      // the open window already counts as slept
  const events = c.advance(4 * H);      // through 10 AM to noon
  assert.deepEqual(events, []);
  assert.equal(c.skipped, 0);
});

test('skipping a night: slower and shop mistakes; two: screen effects; the penalties stack', () => {
  const c = make(0, 12);
  const e1 = c.advance(22 * H);         // noon -> 10 AM next day, the window closes unslept
  assert.deepEqual(sans(e1).map(e => e.type), ['skipped']);
  assert.equal(c.skipped, 1);
  assert.deepEqual({ ...c.penalties }, { slow: true, shopMistakes: true, screenEffects: false, collapseNext: false });
  const e2 = c.advance(24 * H);
  assert.deepEqual(sans(e2).map(e => e.type), ['skipped']);
  assert.equal(c.skipped, 2);
  assert.equal(c.penalties.screenEffects, true);
  assert.equal(c.penalties.collapseNext, true);
});

test('the third skipped night is a collapse that loses a whole date', () => {
  const c = make(0, 12);
  c.advance(22 * H); c.advance(24 * H);
  const e3 = c.advance(24 * H);
  assert.deepEqual(sans(e3).map(e => e.type), ['skipped', 'collapse']);
  assert.equal(sans(e3)[1].missedDate, 3);
  assert.equal(c.t, at(4, 10));         // wakes at 10 AM the day after the missed date
  assert.equal(c.skipped, 0);
  assert.equal(c.collapses, 1);
  assert.equal(c.shortSleep, false);
});

test('a full sleep resets the skipped-night count', () => {
  const c = make(0, 12);
  c.advance(22 * H);                    // one skipped night
  assert.equal(c.skipped, 1);
  c.advance(10 * H);                    // 8 PM
  c.sleep();
  assert.equal(c.skipped, 0);
  assert.equal(c.penalties.slow, false);
});

test('a cut-short sleep does not clear the count, but it does stop it growing', () => {
  const c = make(0, 12);
  c.advance(22 * H);                    // skipped: 1
  c.advance(18 * H);                    // 4 AM of the next date... stay up
  c.sleep();                            // 4 AM: 6 hours to 10 AM, a full sleep, clears it
  assert.equal(c.skipped, 0);
  const d = make(0, 12);
  d.advance(22 * H); d.advance(19 * H); // 5 AM, window open, skipped = 1
  assert.equal(d.skipped, 1);
  d.sleep();                            // 5 AM: cut short
  assert.equal(d.skipped, 1);
  d.advance(5 * H);                     // the window closes with a sleep taken in it
  assert.equal(d.skipped, 1);
});

test('big time jumps still count every closed window', () => {
  const c = make(0, 12);
  const events = c.advance(24 * H * 3 - 2 * H);
  assert.equal(events.filter(e => e.type === 'skipped').length, 3);
  assert.equal(events.filter(e => e.type === 'collapse').length, 1);
});

test('paused or stopped time does not advance', () => {
  const c = make(0, 12);
  c.tick(60 * 1000, true);
  assert.equal(c.t, at(0, 12));
  c.running = false; c.tick(60 * 1000);
  assert.equal(c.t, at(0, 12));
});

test('save and load round-trip', () => {
  const c = make(0, 12); c.advance(22 * H); c.advance(5 * H);
  const d = new DayCycle(cfg).load(JSON.parse(JSON.stringify(c.save())));
  assert.deepEqual(d.save(), c.save());
  assert.equal(d.sleepBlock, c.sleepBlock);
  d.advance(10 * H); c.advance(10 * H);
  assert.deepEqual(d.save(), c.save());
});

test('windowEnd is when the current sleep window closes (10 AM), or null outside one', () => {
  assert.equal(make(0, 22).windowEnd, at(1, 10));
  assert.equal(make(1, 3).windowEnd, at(1, 10));
  assert.equal(make(1, 15).windowEnd, null);
});

test('midnight is an event, once per date, in order with the other events', () => {
  const c = make(0, 22);
  const e = c.advance(26 * H);                         // 10 PM -> midnight -> 2 AM next day... to midnight again
  assert.deepEqual(e.filter(x => x.type === 'midnight').map(x => x.date), [1, 2]);
  const d = make(0, 22);
  assert.deepEqual(d.advance(1 * H), []);              // not yet
  assert.deepEqual(d.advance(1 * H).map(x => x.type), ['midnight']);
  assert.equal(d.date, 1);
  assert.deepEqual(d.advance(10 * H).filter(x => x.type === 'midnight'), []);   // no second midnight in the same date
});

test('a sleep reports how many dates it crossed, and fires no midnight events itself', () => {
  const c = make(0, 22);
  const r = c.sleep();
  assert.equal(r.dates, 1);                            // 10 PM to 4 AM crosses midnight
  const d = make(1, 3);
  assert.equal(d.sleep().dates, 0);                    // 3 AM to 9 AM stays on the same date
});
