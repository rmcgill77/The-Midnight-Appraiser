// Tests for the shop's weekly hours. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { ShopHours } from '../src/game/shophours.js';
import { CONFIG } from '../src/config.js';

const cfg = CONFIG.shopHours;
const H = 60, DAY = 24 * H;
const MON = 0, FRI = 4, SAT = 5, SUN = 6;
const weekdayOf = date => ((date % 7) + 7) % 7;            // date 0 is a Monday here
const at = (date, hour, min = 0) => date * DAY + hour * H + min;

test('a new shop opens 10 AM to 6 PM and is closed on Sundays', () => {
  const s = new ShopHours(cfg);
  assert.deepEqual(s.closedDays, [SUN]);
  assert.deepEqual(s.hoursOn(MON), { open: 10 * H, minutes: 8 * H, close: 18 * H });
  assert.equal(s.hoursOn(SUN), null);
  assert.equal(s.mode, 'same');
});

test('open and closed times follow the hours, with the end exclusive', () => {
  const s = new ShopHours(cfg);
  assert.equal(s.isOpen(at(0, 9, 59), weekdayOf), false);
  assert.equal(s.isOpen(at(0, 10), weekdayOf), true);
  assert.equal(s.isOpen(at(0, 17, 59), weekdayOf), true);
  assert.equal(s.isOpen(at(0, 18), weekdayOf), false);
  assert.equal(s.isOpen(at(SUN, 12), weekdayOf), false);
});

test('hours are never longer than eight hours', () => {
  const s = new ShopHours(cfg);
  s.setSame({ open: 9 * H, minutes: 12 * H }, SUN);
  assert.equal(s.hoursOn(MON).minutes, 8 * H);
  s.setDay(FRI, { open: 8 * H, minutes: 20 * H });
  assert.equal(s.hoursOn(FRI).minutes, 8 * H);
  s.setDay(FRI, { open: 8 * H, minutes: 5 });
  assert.equal(s.hoursOn(FRI).minutes, cfg.minMinutes);
});

test('the slider snaps to half hours', () => {
  const s = new ShopHours(cfg);
  s.setSame({ open: 9 * H + 16, minutes: 4 * H + 20 }, SUN);
  assert.equal(s.hoursOn(MON).open, 9 * H + 30);
  assert.equal(s.hoursOn(MON).minutes, 4 * H + 30);
});

test('the shop can open at any time of day, including overnight', () => {
  const s = new ShopHours(cfg);
  s.setSame({ open: 20 * H, minutes: 8 * H }, SUN);               // 8 PM to 4 AM
  assert.equal(s.isOpen(at(MON, 22), weekdayOf), true);
  assert.equal(s.isOpen(at(MON + 1, 3), weekdayOf), true);        // Tuesday 3 AM: still Monday's hours
  assert.equal(s.openDate(at(MON + 1, 3), weekdayOf), MON);
  assert.equal(s.isOpen(at(MON + 1, 4), weekdayOf), false);
});

test('hours that run past midnight belong to the date they started on', () => {
  const s = new ShopHours(cfg);
  s.setSame({ open: 20 * H, minutes: 8 * H }, SUN);
  // Saturday's shift runs into Sunday morning, even though Sunday is the closed day.
  assert.equal(s.isOpen(at(SAT, 23), weekdayOf), true);
  assert.equal(s.isOpen(at(SUN, 2), weekdayOf), true);
  assert.equal(s.openDate(at(SUN, 2), weekdayOf), SAT);
  assert.equal(s.isOpen(at(SUN, 21), weekdayOf), false);           // nothing starts on Sunday
});

test('at least one day a week has to be closed: refusing changes that would break it', () => {
  const s = new ShopHours(cfg);
  assert.throws(() => s.setDay(SUN, { open: 10 * H, minutes: 6 * H }), /closed at least one day/);
  assert.throws(() => s.setSame({ open: 10 * H, minutes: 8 * H }, [0, 1, 2, 3, 4, 5, 6]), /open at least one day/);
  assert.throws(() => s.setSame({ open: 10 * H, minutes: 8 * H }, []), /closed day/);
  assert.deepEqual(s.closedDays, [SUN]);                            // the refused changes did nothing
});

test('the player picks the closed day, and more than one is fine', () => {
  const s = new ShopHours(cfg);
  s.setSame({ open: 11 * H, minutes: 6 * H }, [MON, SUN]);
  assert.deepEqual(s.closedDays, [MON, SUN]);
  assert.deepEqual(s.openDays, [1, 2, 3, 4, 5]);
  assert.equal(s.weekMinutes, 5 * 6 * H);
});

test('per-day hours: each day can differ', () => {
  const s = new ShopHours(cfg);
  s.setDay(FRI, { open: 17 * H, minutes: 7 * H });
  assert.equal(s.mode, 'perDay');
  assert.equal(s.hoursOn(FRI).open, 17 * H);
  assert.equal(s.hoursOn(MON).open, 10 * H);
});

test('nextChange: minutes until the shop opens or closes', () => {
  const s = new ShopHours(cfg);
  assert.equal(s.nextChange(at(0, 9), weekdayOf), 1 * H);           // opens in an hour
  assert.equal(s.nextChange(at(0, 12), weekdayOf), 6 * H);          // closes at 6 PM
  assert.equal(s.nextChange(at(SAT, 19), weekdayOf), 39 * H);       // Sunday is shut: Monday 10 AM
});

test('save and load round-trip, and a bad save keeps the defaults', () => {
  const s = new ShopHours(cfg);
  s.setDay(FRI, { open: 17 * H, minutes: 7 * H });
  const d = new ShopHours(cfg).load(JSON.parse(JSON.stringify(s.save())));
  assert.deepEqual(d.save(), s.save());
  const bad = new ShopHours(cfg);
  const before = bad.save();
  bad.load({ mode: 'same', week: [1, 2, 3] });
  bad.load({ mode: 'same', week: Array(7).fill({ open: 600, minutes: 300 }) });   // no closed day
  bad.load(null);
  assert.deepEqual(bad.save(), before);
});
