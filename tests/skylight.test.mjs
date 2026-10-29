import test from 'node:test';
import assert from 'node:assert/strict';
import { skylight } from '../src/game/skylight.js';
import { DARKNESS } from '../src/game/nightwindow.js';

const at = (h, season = 'autumn', o) => skylight(season, h * 60, o);

test('midday is clear and bright, midnight is dark', () => {
  const noon = at(13), mid = at(1);
  assert.equal(noon.night, 0); assert.ok(noon.alpha < 0.05);
  assert.equal(mid.night, 1); assert.equal(mid.alpha, 0.6);
  assert.equal(skylight('autumn', 25 * 60).night, 1);             // minutes past 24 h wrap
});
test('the light turns warm toward dusk and goes dark by the season\'s dusk', () => {
  for (const season of Object.keys(DARKNESS)) {
    const d = DARKNESS[season];
    const before = skylight(season, d.dusk - 90), after = skylight(season, d.dusk + 1);
    assert.ok(before.alpha > 0 && before.alpha < 0.3 && before.night < 0.3);
    assert.equal(after.night, 1);
    // monotonic darkening through the hour of dusk
    let last = -1;
    for (let m = d.dusk - 60; m <= d.dusk; m += 5) { const s = skylight(season, m); assert.ok(s.night >= last); last = s.night; }
  }
});
test('dawn brightens: dark, then rose, then day', () => {
  const d = DARKNESS.autumn;
  assert.equal(skylight('autumn', d.dawn - 90).night, 1);
  const rose = skylight('autumn', d.dawn);
  assert.ok(rose.night < 0.8 && rose.alpha > 0.05);
  assert.ok(skylight('autumn', d.dawn + 120).night === 0);
});
test('shadows are long at the ends of the day, short at noon, and gone at night', () => {
  const morning = at(8), noon = at(13), eve = skylight('autumn', DARKNESS.autumn.dusk - 70), night = at(2);
  assert.ok(morning.sun.len > noon.sun.len && eve.sun.len > noon.sun.len);
  assert.ok(morning.sun.dir < 0 && eve.sun.dir > 0);
  assert.equal(night.sun.strength, 0);
  assert.ok(noon.sun.strength > 0.9);
});
test('a darker moon makes a darker night', () => {
  assert.ok(at(1, 'autumn', { nightDark: 0.85 }).alpha > at(1, 'autumn', { nightDark: 0.4 }).alpha);
});
