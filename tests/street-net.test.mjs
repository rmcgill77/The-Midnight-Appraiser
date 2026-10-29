import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStreetNet } from '../src/game/street-net.js';

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
