import test from 'node:test';
import assert from 'node:assert/strict';
import { scale2x, paintPortrait, paintPortraitHD, PORTRAIT_SIZE, PORTRAIT_BASE } from '../src/engine/figure-hd.js';
import { CLASSIC_LOOK } from '../src/engine/figure.js';

test('the interface portrait is 96x96, drawn from the 48x48 one', () => {
  assert.equal(PORTRAIT_SIZE, 96); assert.equal(PORTRAIT_BASE, 48);
  const hi = paintPortraitHD(CLASSIC_LOOK);
  assert.equal(hi.length, 96); assert.equal(hi[0].length, 96);
  assert.equal(paintPortrait(CLASSIC_LOOK).length, 48);
});
test('scale2x keeps flat areas and rounds a diagonal corner, adding no new colors', () => {
  const g = [['a', 'a', null], ['a', 'a', null], [null, null, null]];
  const o = scale2x(g);
  assert.equal(o.length, 6);
  assert.deepEqual(o[0].slice(0, 2), ['a', 'a']);
  const colors = new Set(o.flat()); colors.delete(null);
  assert.deepEqual([...colors], ['a']);
  // a lone pixel stays a block
  const one = scale2x([[null, null, null], [null, 'z', null], [null, null, null]]);
  assert.equal(one.flat().filter(c => c === 'z').length, 4);
  // an inside corner of a stair step is filled in
  const step = scale2x([['a', null], ['a', 'a']]);
  assert.equal(step[1][2], 'a');
});
