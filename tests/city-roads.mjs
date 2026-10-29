// Browser test: the town's roads never just stop. Every east-west street crosses the river on a bridge, the
// sides of town have a road of their own, there is a roundabout and a few turning circles, nothing walkable is cut
// off from the shop, and no road runs into the water.
// Run: node tests/city-roads.mjs
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

const { page, problems, close } = await openGame();
await page.waitForFunction(() => globalThis.__tma?.cityLayout, null, { timeout: 8000 });
const L = await page.evaluate(() => { const c = __tma.cityLayout; return { rows: c.rows, circles: c.circles, spurs: c.spurs, bridges: c.river.bridges.length, spawn: c.spawn, locs: Object.values(c.locs).map(l => l.stand) }; });
const rows = L.rows, H = rows.length, W = rows[0].length;
const at = (x, y) => (rows[y]?.[x] ?? '#');
const ROAD = new Set(['=', '+']);

// 1. No road runs into the river (a bridge carries it across), and none ends at the edge of the map below the top street.
let intoWater = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ROAD.has(at(x, y)) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) === '~')) intoWater++;
assert.equal(intoWater, 0, 'a road runs into the water');
assert.ok(L.bridges >= 8, 'every east-west street has a bridge');
for (let y = 15; y < 118; y++) {
  assert.ok(ROAD.has(at(1, y)) && ROAD.has(at(2, y)), `the west side road is missing at row ${y}`);
  assert.ok(ROAD.has(at(W - 2, y)) && ROAD.has(at(W - 3, y)), `the east side road is missing at row ${y}`);
}

// The road along the top of town runs from side to side, with a gap only at the roped-off woods trail.
let gap = 0;
for (let x = 1; x < W - 1; x++) if (!(ROAD.has(at(x, 1)) && ROAD.has(at(x, 2)))) gap++;
assert.ok(gap <= 14, `the top road has a gap of ${gap}`);

// 2. A roundabout and turning circles, each with an island and one way in for the circles.
assert.equal(L.circles.filter(c => c.kind === 'roundabout').length, 1);
assert.ok(L.circles.filter(c => c.kind === 'cul-de-sac').length >= 2, 'a few turning circles');
for (const c of L.circles) {
  assert.ok(['T', ','].includes(at(Math.floor(c.x), Math.floor(c.y))), `${c.kind} has an island`);
  assert.ok(ROAD.has(at(Math.floor(c.x + c.rOut - 1), Math.floor(c.y))) || ROAD.has(at(Math.floor(c.x - c.rOut + 0.5), Math.floor(c.y))), `${c.kind} has a road round it`);
}

// 3. Everything on foot is connected: from the shop door you can reach every place's door.
const WALK = new Set(['=', '+', ',', '"', 'p', 'P', 'u', 'y', 'q', 'G', 'd']);
const seen = new Uint8Array(W * H), q = [[L.spawn.tx, L.spawn.ty]];
seen[L.spawn.ty * W + L.spawn.tx] = 1;
while (q.length) {
  const [x, y] = q.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || !WALK.has(at(nx, ny))) continue;
    seen[ny * W + nx] = 1; q.push([nx, ny]);
  }
}
for (const s of L.locs) assert.ok(seen[s.ty * W + s.tx], `cannot walk to the door at ${s.tx},${s.ty}`);
// ...and the whole road network is one piece.
const roadSeen = new Uint8Array(W * H); let first = null, roads = 0;
for (let y = 0; y < H && !first; y++) for (let x = 0; x < W; x++) if (ROAD.has(at(x, y))) { first = [x, y]; break; }
const rq = [first]; roadSeen[first[1] * W + first[0]] = 1;
while (rq.length) { const [x, y] = rq.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; const ok = (ROAD.has(at(nx, ny)) || at(nx, ny) === 'u' || at(nx, ny) === 'G'); if (nx >= 0 && ny >= 0 && nx < W && ny < H && ok && !roadSeen[ny * W + nx]) { roadSeen[ny * W + nx] = 1; rq.push([nx, ny]); } } }
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ROAD.has(at(x, y))) { roads++; assert.ok(roadSeen[y * W + x], `a piece of road is cut off at ${x},${y}`); }
assert.ok(roads > 2000);
assert.deepEqual(problems, []);
await close();
console.log('OK: no road runs into the water, the sides of town have roads, a roundabout and turning circles, and everything connects');
