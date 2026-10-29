// Tests for the ground (wet streets and snow). Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { Ground } from '../src/game/ground.js';
import { sample } from '../src/game/climate.js';

const H = 60, DAY = 1440;
const month = m => () => m;

// find a time (searching forward) when `pred(sample)` first holds
function find(seed, from, pred, month, limit = 120 * DAY) {
  for (let t = from; t < from + limit; t += 20) if (pred(sample(seed, t, { month }))) return t;
  return null;
}

test('a dry spell leaves the ground dry', () => {
  const seed = 5, t = find(seed, 2 * DAY, s => s.precip === 0, 8);
  const g = new Ground(seed, month(8)).advanceTo(t);
  assert.ok(g.wet >= 0 && g.wet <= 1 && g.snow === 0);
});

test('rain wets the street and it dries out afterwards', () => {
  let ok = 0;
  for (const seed of [1, 7, 42, 1999, 31337]) {
    const rain = find(seed, 3 * DAY, s => s.precip > 0.4 && s.temp > 3, 8);
    if (rain === null) continue;
    const g = new Ground(seed, month(8));
    g.advanceTo(rain + 4 * H);
    const wetDuring = g.wet;
    g.advanceTo(rain + 4 * H + 3 * DAY);
    if (wetDuring > 0.3 && g.wet < wetDuring * 0.5) ok++;
  }
  assert.ok(ok >= 3, `${ok} of 5 seeds got wet and dried`);
});

test('snow settles in a cold spell, never in summer, and melts in a thaw', () => {
  let settled = 0, melted = 0;
  for (const seed of [1, 7, 42, 1999, 31337]) {
    const g = new Ground(seed, month(0));
    let peak = 0, peakT = 0;
    for (let t = 2 * DAY; t < 60 * DAY; t += 6 * H) { g.advanceTo(t); if (g.snow > peak) { peak = g.snow; peakT = t; } }
    if (peak > 0.3) settled++;
    // after the peak, in a warm month, it melts away
    const w = new Ground(seed, month(0)); w.advanceTo(peakT);
    const thaw = new Ground(seed, month(0)); thaw.advanceTo(peakT); thaw.snow = peak;
    if (peak > 0.3) { let t = peakT; let low = peak; for (; t < peakT + 20 * DAY; t += 6 * H) { thaw.advanceTo(t); low = Math.min(low, thaw.snow); } if (low < peak * 0.7) melted++; }
  }
  assert.ok(settled >= 3, `snow settled for ${settled} of 5 seeds in January`);
  assert.ok(melted >= 2, `and melted for ${melted}`);
  for (const seed of [1, 7, 42]) { const g = new Ground(seed, month(6)); for (let t = 2 * DAY; t < 60 * DAY; t += 6 * H) { g.advanceTo(t); assert.equal(g.snow, 0, 'no snow in July'); } }
});

test('the same moment gives the same ground however you get there', () => {
  const seed = 42, t = 20 * DAY + 7 * H;
  const jump = new Ground(seed, month(8)).advanceTo(t);
  const walk = new Ground(seed, month(8));
  for (let x = t - 4 * DAY; x <= t; x += 3 * H) walk.advanceTo(x);
  walk.advanceTo(t);
  assert.ok(Math.abs(jump.wet - walk.wet) < 0.02 && Math.abs(jump.snow - walk.snow) < 0.02, `jump ${jump.wet.toFixed(3)}/${jump.snow.toFixed(3)} vs walk ${walk.wet.toFixed(3)}/${walk.snow.toFixed(3)}`);
});

test('time going backwards, or a long jump, rebuilds the ground', () => {
  const g = new Ground(7, month(8)).advanceTo(30 * DAY);
  const a = { wet: g.wet, snow: g.snow };
  g.advanceTo(10 * DAY);
  g.advanceTo(30 * DAY);
  assert.ok(Math.abs(g.wet - a.wet) < 0.02 && Math.abs(g.snow - a.snow) < 0.02);
});

test('values stay between 0 and 1, and puddles need a properly wet street', () => {
  const g = new Ground(3, month(8));
  for (let t = 2 * DAY; t < 40 * DAY; t += 2 * H) { g.advanceTo(t); assert.ok(g.wet >= 0 && g.wet <= 1 && g.snow >= 0 && g.snow <= 1); assert.ok(g.puddles >= 0 && g.puddles <= 1); }
  const dry = new Ground(1, month(8)); dry.wet = 0.3; assert.equal(dry.puddles, 0);
  dry.wet = 0.85; assert.equal(dry.puddles, 1);
});
