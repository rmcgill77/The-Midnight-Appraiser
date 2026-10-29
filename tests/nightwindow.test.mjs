// Tests for the seasonal night window. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { DARKNESS, darkLeft, canRun, runMinutes, dawnMinute } from '../src/game/nightwindow.js';

const H = 60;

test('nights are long in winter and short in summer', () => {
  const night = s => darkLeft(s, DARKNESS[s].dusk);
  assert.ok(night('winter') > night('autumn'));
  assert.ok(night('autumn') > night('spring'));
  assert.ok(night('spring') > night('summer'));
  assert.equal(night('winter'), (24 - 17 + 7.5) * H);
  assert.equal(night('summer'), (24 - 21 + 4.5) * H);
});

test('there is no dark in the daytime', () => {
  for (const s of Object.keys(DARKNESS)) {
    assert.equal(darkLeft(s, 12 * H), 0);
    assert.equal(canRun(s, 12 * H), false);
  }
});

test('the dark runs through midnight to dawn', () => {
  assert.equal(darkLeft('autumn', 23 * H), 7.5 * H);       // 11 PM to 6:30 AM
  assert.equal(darkLeft('autumn', 2 * H), 4.5 * H);        // 2 AM to 6:30 AM
  assert.equal(darkLeft('autumn', 6 * H + 30), 0);
});

test('a run needs at least an hour of dark', () => {
  assert.equal(canRun('summer', 3 * H + 30), true);        // 3:30 AM, an hour before 4:30
  assert.equal(canRun('summer', 3 * H + 31), false);
  assert.equal(canRun('winter', 17 * H), true);
});

test('a run lasts at most its usual length, or until dawn', () => {
  assert.equal(runMinutes('winter', 18 * H, 6 * H), 6 * H);
  assert.equal(runMinutes('summer', 2 * H, 6 * H), 2.5 * H);
});

test('dawn is a season-dependent clock time', () => {
  assert.equal(dawnMinute('winter'), 7 * H + 30);
  assert.equal(dawnMinute('summer'), 4 * H + 30);
});
