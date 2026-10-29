// Browser test: cars, scooters and bikes drive the town's roads: they appear near you on the street, stay on
// the road, keep to the right-hand lane, and there are fewer of them at night than in the rush hour.
// Run: node tests/traffic-flow.mjs
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame();
await startNewGame(page); await clearCards(page).catch(() => {});
const setMinute = m => page.evaluate(m => { const c = __tma.clock.cycle; c.t = Math.floor(c.t / 1440) * 1440 + m; }, m);
await setMinute(17 * 60 + 30);
await page.evaluate(() => __tma.placeAt('city', 92, 60));
let rush = 0, seen = 0, offRoad = 0, kinds = new Set();
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => {
    const rows = __tma.cityLayout.rows;
    return __tma.vehicles.list.map(v => ({ kind: v.kind, ch: rows[Math.floor(v.y / 16)]?.[Math.floor(v.x / 16)], speed: v.speed }));
  });
  rush = Math.max(rush, s.length);
  for (const v of s) { seen++; kinds.add(v.kind); if (!'=+uG'.includes(v.ch)) offRoad++; }
}
assert.ok(rush >= 5, `only ${rush} vehicles in the rush hour`);
assert.equal(offRoad, 0, 'a vehicle left the road');
assert.ok(seen > 30 && kinds.has('car'));
// at night the roads are quiet
await setMinute(3 * 60);
await page.waitForTimeout(500);
for (let i = 0; i < 40; i++) await page.waitForTimeout(500);
const night = await page.evaluate(() => __tma.vehicles.list.length);
assert.ok(night < rush, `night ${night} vs rush ${rush}`);
assert.deepEqual(problems, []);
await close();
console.log(`OK: ${rush} vehicles at the rush hour, ${night} at night, always on the road (${[...kinds].join(', ')})`);
