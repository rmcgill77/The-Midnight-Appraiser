import test from 'node:test';
import assert from 'node:assert/strict';
import { Vehicles, lanePath, curvesOf, density, ROAD, TILE, KINDS } from '../src/game/vehicles.js';
import { RNG } from '../src/engine/rng.js';

// A little town: a big ring of two-wide road, with a cross street, grass outside.
const W = 60, H = 40;
const rows = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => {
  const ring = (x >= 5 && x <= 54 && ((y >= 5 && y <= 6) || (y >= 33 && y <= 34))) || (y >= 5 && y <= 34 && ((x >= 5 && x <= 6) || (x >= 53 && x <= 54)));
  const cross = (y >= 5 && y <= 34 && x >= 29 && x <= 30);
  return ring || cross ? '=' : '"';
}).join(''));
const map = { cols: W, rowsN: H, at: (x, y) => (rows[y]?.[x] ?? '#') };

test('a path follows the roads, from one tile to another', () => {
  const p = lanePath(map, { tx: 5, ty: 5 }, { tx: 54, ty: 34 });
  assert.ok(p && p.length > 60);
  assert.ok(p.every(t => ROAD.has(map.at(t.tx, t.ty))));
  assert.equal(lanePath(map, { tx: 5, ty: 5 }, { tx: 20, ty: 20 }), null);   // grass is not road
});
test('traffic keeps to the right: opposite ways use different lanes of a two-wide road', () => {
  // along the top road (rows 5-6): going east should favour the south row (right-hand), west the north row
  const east = lanePath(map, { tx: 7, ty: 5 }, { tx: 27, ty: 5 }) , east2 = lanePath(map, { tx: 7, ty: 6 }, { tx: 27, ty: 6 });
  const westP = lanePath(map, { tx: 27, ty: 5 }, { tx: 7, ty: 5 }), west2 = lanePath(map, { tx: 27, ty: 6 }, { tx: 7, ty: 6 });
  const mid = p => p[Math.floor(p.length / 2)].ty;
  assert.equal(mid(east2), 6); assert.equal(mid(west2) === 5 || mid(westP) === 5, true);
  assert.equal(mid(east), mid(east2) === 6 ? 6 : mid(east));
});
test('turns are curves, not right angles', () => {
  const p = lanePath(map, { tx: 6, ty: 20 }, { tx: 20, ty: 6 });
  const c = curvesOf(p);
  assert.ok(c.length >= p.length - 1);
  assert.ok(c.some(k => Math.abs(k.A.x - k.B.x) > 3 && Math.abs(k.A.y - k.B.y) > 3), 'a turning curve');
});
test('vehicles spawn out of sight, stay on the road, and keep moving', () => {
  const v = new Vehicles(map, new RNG(3), { max: 10 });
  const player = { x: 30 * TILE, y: 20 * TILE };
  for (let i = 0; i < 20 * 60; i++) v.update(1 / 20, { player, density: 1 });
  assert.ok(v.list.length >= 6, `only ${v.list.length}`);
  for (const c of v.list) {
    const d = Math.hypot(c.x - player.x, c.y - player.y);
    assert.ok(d < 36 * TILE);
    assert.ok(ROAD.has(map.at(Math.floor(c.x / TILE), Math.floor(c.y / TILE))), `${c.kind} left the road at ${c.x | 0},${c.y | 0}`);
  }
  const before = v.list.map(c => [c.x, c.y]);
  for (let i = 0; i < 40; i++) v.update(1 / 20, { player, density: 1 });
  assert.ok(v.list.some((c, i) => before[i] && Math.hypot(c.x - before[i][0], c.y - before[i][1]) > 5), 'moving');
});
test('they stop for you in the road', () => {
  const v = new Vehicles(map, new RNG(9), { max: 1 });
  v.list.push({ id: 1, kind: 'car', x: 100, y: 5 * TILE + 8, heading: 0, dir: 'right', speed: 45, top: 45, color: '#444', moving: true, stuck: 0, patience: 0, curves: curvesOf(lanePath(map, { tx: 6, ty: 5 }, { tx: 50, ty: 5 })), ci: 0, t: 0.3 });
  const car = v.list[0], node = car.curves[8].C, walker = { x: node.x, y: node.y };
  for (let i = 0; i < 100; i++) v.update(1 / 20, { player: null, density: 0, others: [walker] });
  assert.ok(car.speed < 1, `speed ${car.speed}`);
  assert.ok(car.x < walker.x - 14, 'stopped short of the walker');
});
test('the roads are busy at the rush hours and quiet at night', () => {
  assert.ok(density(8 * 60 + 20) > density(13 * 60) && density(17 * 60 + 30) > density(13 * 60));
  assert.ok(density(3 * 60) < 0.3);
  assert.ok(KINDS.car.w === 14);
});
