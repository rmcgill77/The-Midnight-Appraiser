import test from 'node:test';
import assert from 'node:assert/strict';
import { paintPortrait, paintHD } from '../src/engine/figure-hd.js';
import { PARTS, EXTRA_KEYS, CLASSIC_LOOK, cleanLook, randomExtras } from '../src/engine/figure.js';
import { lookFor } from '../src/game/people.js';

const sig = g => JSON.stringify(g);

test('extras are stored only when set and kept in range', () => {
  const c = cleanLook({ ...CLASSIC_LOOK, makeup: 2, piercing: 99, eyeFx: 0, height: 3 });
  assert.equal(c.makeup, 2); assert.equal('piercing' in c, false);
  assert.equal('extra2Color' in c, false);
  assert.equal(cleanLook({ ...CLASSIC_LOOK, extra2: 3, extra2Color: 5 }).extra2Color, 5);
  assert.equal('extra2Color' in cleanLook({ ...CLASSIC_LOOK, extra2Color: 5 }), false); assert.equal('eyeFx' in c, false); assert.equal(c.height, 3);
  assert.equal(cleanLook({ ...CLASSIC_LOOK, height: true }).height, 1);   // the old tall flag
  for (const k of EXTRA_KEYS) assert.ok(['None', 'Default'].includes(PARTS[k][0]));
});
test('every new option paints, in the portrait and on the figure, and changes the face', () => {
  const B = { ...CLASSIC_LOOK, hat: 0 }, base = paintPortrait(B);
  const tries = [['eyes', 5, 6], ['brows', 5, 7], ['mark', 5, 8], ['facial', 6, 8], ['build', 3, 6], ['hair', 16, 25], ['hat', 12, 21], ['hairColor', 12, 17], ['top', 11, 20], ['pattern', 4, 8], ...EXTRA_KEYS.filter(k => k !== 'shoes' && k !== 'extra2').map(k => [k, 1, PARTS[k].length - 1])];
  for (const [k, a, b] of tries) for (let v = a; v <= b; v++) {
    const look = { ...B, [k]: v };
    assert.doesNotThrow(() => { for (const f of ['down', 'up', 'right']) paintHD(look, f, 0, 'walk', {}); paintHD(look, 'down', 0, 'ko', {}); });
    if (k !== 'build' && k !== 'facial') assert.notEqual(sig(paintPortrait(look)), sig(base), `${k}=${v}`);
  }
  for (let v = 4; v <= 10; v++) for (const f of ['down', 'up', 'right']) assert.doesNotThrow(() => paintHD({ ...CLASSIC_LOOK, bottom: v }, f, 1, 'walk', {}));
  // Accessories: the ones a bust can show change the portrait (in both slots); every one paints on the figure.
  const HELD = ['Bracelet', 'Rings', 'Fingerless gloves', 'Umbrella', 'Cane', 'Lantern', 'Belt pouches'];
  for (let v = 11; v < PARTS.extra.length; v++) {
    const name = PARTS.extra[v];
    for (const slot of ['extra', 'extra2']) {
      const look = { ...B, [slot]: v };
      assert.doesNotThrow(() => { for (const f of ['down', 'up', 'right']) paintHD(look, f, 0, 'walk', {}); });
      if (!HELD.includes(name)) assert.notEqual(sig(paintPortrait(look)), sig(base), `${slot}=${name}`);
    }
    if (['Umbrella', 'Cane', 'Lantern', 'Bracelet', 'Rings', 'Belt pouches'].includes(name)) assert.notEqual(sig(paintHD({ ...B, extra: v }, 'down', 0, 'idle', {})), sig(paintHD(B, 'down', 0, 'idle', {})), name);
  }
  // Shoes show on the walking figure, not the portrait.
  const plain = sig(paintHD(B, 'down', 0, 'idle', {}));
  for (let v = 1; v <= 6; v++) assert.notEqual(sig(paintHD({ ...B, shoes: v }, 'down', 0, 'idle', {})), plain, `shoes=${v}`);
  for (const h of [1, 2, 3]) assert.doesNotThrow(() => paintHD({ ...CLASSIC_LOOK, height: h }));
});
test('townsfolk looks do not change with the new options', () => {
  const l = lookFor('Morgan');
  for (const k of EXTRA_KEYS) assert.equal(k in l, false);
  assert.ok(l.build <= 2 && l.eyes <= 4 && l.brows <= 4 && l.mark <= 4 && l.facial <= 5 && l.hair <= 15 && l.hat <= 11 && l.hairColor <= 11 && l.top <= 10 && l.bottom <= 3 && l.pattern <= 3 && l.extra <= 10);
});
test('surprise extras are valid', () => {
  let n = 0; const r = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 50; i++) cleanLook({ ...CLASSIC_LOOK, ...randomExtras(r) });
});
