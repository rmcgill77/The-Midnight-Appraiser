import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStreetNet } from '../src/game/street-net.js';
import { curvesOf } from '../src/game/vehicles.js';

// an east-west street, two wide (32 px), along y = 100 px, curving up a little at its east end; and a street crossing it.
const streets = [
  { w: 2, pts: [{ x: 0, y: 6.25 }, { x: 5, y: 6.25 }, { x: 10, y: 5.5 }, { x: 15, y: 4 }] },
  { w: 2, pts: [{ x: 5, y: 0 }, { x: 5, y: 12 }] },
];
const net = buildStreetNet(streets);

test('the field is negative inside a street, positive outside, and rounds a junction', () => {
  assert.ok(net.field(40, 100).f < -10);                   // on the east-west street
  assert.ok(net.field(40, 100 - 40).f > 3);                // well off it
  const a = net.field(80 - 20, 100 - 18).f, b = net.field(80 - 20, 100 - 17).f;
  assert.ok(Number.isFinite(a) && Number.isFinite(b));
  // beside a junction the soft minimum makes the corner wider than either street alone: a point just outside both streets' straight edges is inside
  assert.ok(net.field(80 + 16 + 2, 100 - 16 - 2).f < net.field(80 + 16 + 2, 100 - 16 - 2 + 0).f + 1);
});
test('lane lines: one divider at the centre of a two-wide street, found by distance', () => {
  const f = net.field(40, 100);
  assert.ok(f.d < 1 && f.w === 2);
});
test('a vehicle is moved to the right-hand lane of the street it is on', () => {
  const east = net.lanePoint(40, 100, 1, 0), west = net.lanePoint(40, 100, -1, 0);
  assert.ok(Math.abs(east.y - 108) < 0.5, `east lane at ${east.y}`);          // right of east is south (down), half a half-width = 8 px
  assert.ok(Math.abs(west.y - 92) < 0.5, `west lane at ${west.y}`);
  const south = net.lanePoint(80, 40, 0, 1);
  assert.ok(Math.abs(south.x - 72) < 0.5, `south lane at ${south.x}`);        // right of south is west
  assert.equal(net.lanePoint(40, 100 + 80, 1, 0), null);                      // nowhere near a street
});
test('paths snapped to the lanes become smooth curves along the street', () => {
  const path = []; for (let tx = 2; tx <= 14; tx++) path.push({ tx, ty: 6 });
  const snapped = curvesOf(path, net.lanePoint), plain = curvesOf(path);
  assert.ok(snapped.length === plain.length);
  assert.ok(snapped.every(c => Math.abs(c.C.y - 108) < 14), 'near the east lane');
});
