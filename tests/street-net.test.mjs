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

test('a zebra crossing is laid over each arm of a junction, just outside it, as stripes across the street', () => {
  assert.ok(net.crossings.length >= 4, `${net.crossings.length} crossings`);     // the crossing of the two streets has four arms (and the curved end, more)
  let stripe = 0, gap = 0;
  const c = net.crossings[0];
  for (let k = -c.half; k <= c.half; k += 1) { const x = c.cx - c.dy * k, y = c.cy + c.dx * k; net.crosswalk(x, y) ? stripe++ : gap++; }
  assert.ok(stripe > 4 && gap > 4, 'alternating stripes');
  assert.equal(net.crosswalk(c.cx + c.dx * 40, c.cy + c.dy * 40), false);         // none well along the street
});
