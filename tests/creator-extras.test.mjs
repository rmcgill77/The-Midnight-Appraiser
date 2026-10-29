import test from 'node:test';
import assert from 'node:assert/strict';
import { paintPortrait, paintHD } from '../src/engine/figure-hd.js';
import { PARTS, EXTRA_KEYS, CLASSIC_LOOK, cleanLook, randomExtras } from '../src/engine/figure.js';
import { lookFor } from '../src/game/people.js';

const sig = g => JSON.stringify(g);

test('extras are stored only when set and kept in range', () => {
  const c = cleanLook({ ...CLASSIC_LOOK, makeup: 2, piercing: 99, eyeFx: 0, height: 3 });
  assert.equal(c.makeup, 2); assert.equal('piercing' in c, false); assert.equal('eyeFx' in c, false); assert.equal(c.height, 3);
  assert.equal(cleanLook({ ...CLASSIC_LOOK, height: true }).height, 1);   // the old tall flag
  for (const k of EXTRA_KEYS) assert.ok(PARTS[k][0] === 'None');
});
test('every new option paints, in the portrait and on the figure, and changes the face', () => {
  const base = paintPortrait(CLASSIC_LOOK);
  const tries = [['eyes', 5, 6], ['brows', 5, 7], ['mark', 5, 8], ['facial', 6, 8], ['build', 3, 6], ...EXTRA_KEYS.map(k => [k, 1, PARTS[k].length - 1])];
  for (const [k, a, b] of tries) for (let v = a; v <= b; v++) {
    const look = { ...CLASSIC_LOOK, [k]: v };
    assert.doesNotThrow(() => { for (const f of ['down', 'up', 'right']) paintHD(look, f, 0, 'walk', {}); paintHD(look, 'down', 0, 'ko', {}); });
    if (k !== 'build' && k !== 'facial') assert.notEqual(sig(paintPortrait(look)), sig(base), `${k}=${v}`);
  }
  for (const h of [1, 2, 3]) assert.doesNotThrow(() => paintHD({ ...CLASSIC_LOOK, height: h }));
});
test('townsfolk looks do not change with the new options', () => {
  const l = lookFor('Morgan');
  for (const k of EXTRA_KEYS) assert.equal(k in l, false);
  assert.ok(l.build <= 2 && l.eyes <= 4 && l.brows <= 4 && l.mark <= 4 && l.facial <= 5);
});
test('surprise extras are valid', () => {
  let n = 0; const r = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 50; i++) cleanLook({ ...CLASSIC_LOOK, ...randomExtras(r) });
});
