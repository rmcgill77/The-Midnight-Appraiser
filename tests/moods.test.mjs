import test from 'node:test';
import assert from 'node:assert/strict';
import { paintPortrait } from '../src/engine/figure-hd.js';
import { MOODS, CLASSIC_LOOK, randomLook } from '../src/engine/figure.js';

const sig = g => JSON.stringify(g);

test('there are twelve moods and neutral is the plain face', () => {
  assert.equal(MOODS.length, 12);
  assert.equal(sig(paintPortrait(CLASSIC_LOOK, { mood: 'neutral' })), sig(paintPortrait(CLASSIC_LOOK)));
  assert.equal(sig(paintPortrait(CLASSIC_LOOK, { mood: 'nonsense' })), sig(paintPortrait(CLASSIC_LOOK)));
});
test('every other mood changes the face, and all are distinct', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 6; n++) {
    const look = n ? randomLook(rnd, { full: true }) : CLASSIC_LOOK;
    const seen = new Set();
    for (const m of MOODS) seen.add(sig(paintPortrait(look, { mood: m })));
    assert.equal(seen.size, MOODS.length);
  }
});
