// Browser test: nothing stands in the street. Every street lamp and bus stop is clear of the painted road
// (the smooth curves can run up to half a tile over the tile edge), and every place still has its bus stop.
// Run: node tests/lamps-clear.mjs
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

const { page, problems, close } = await openGame();
await page.waitForFunction(() => globalThis.__tma?.cityLayout, null, { timeout: 8000 });
const r = await page.evaluate(async () => {
  const { buildStreetNet } = await import('/src/game/street-net.js');
  const L = __tma.cityLayout, net = buildStreetNet(L.streets), bad = [], count = { L: 0, Q: 0 };
  for (let y = 0; y < L.rows.length; y++) for (let x = 0; x < L.rows[0].length; x++) {
    const ch = L.rows[y][x];
    if (ch !== 'L' && ch !== 'Q') continue;
    count[ch]++;
    const F = net.field(x * 16 + 8, y * 16 + 8);
    if (F && F.f < 7) bad.push([ch, x, y, Math.round(F.f)]);
  }
  return { bad, count, stops: Object.keys(L.busStops).length };
});
assert.deepEqual(r.bad, [], `props in the road: ${JSON.stringify(r.bad.slice(0, 5))}`);
assert.ok(r.count.L > 150, `only ${r.count.L} street lamps`);
assert.ok(r.stops >= 10, `only ${r.stops} bus stops`);
assert.deepEqual(problems, []);
await close();
console.log(`OK: ${r.count.L} street lamps and ${r.count.Q} bus stops, none in the road`);
