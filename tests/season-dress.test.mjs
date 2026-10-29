import test from 'node:test';
import assert from 'node:assert/strict';
import { dressSeason } from '../src/data/season-dress.js';

const calls = [];
const g = { set fillStyle(v) { calls.push(['style', v]); }, fillRect(x, y, w, h) { calls.push(['rect', x, y, w, h]); }, };
test('every season dresses trees, grass, doors, fences and eaves with well-formed drawing', () => {
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const before = calls.length;
    for (let h = 0; h < 3000; h += 5) for (const ch of ['t', 'T', '"', 'o', 'Z', 'i', 'W', ',']) {
      assert.doesNotThrow(() => dressSeason(g, 4, 5, ch, (h * 2654435761) >>> 0, season, { isFace: ch === 'W', isRoofAbove: true }));
    }
    assert.ok(calls.length > before + 200, `${season} drew something`);
  }
  assert.ok(calls.every(c => c[0] === 'style' ? typeof c[1] === 'string' && !c[1].includes('undefined') && !c[1].includes('NaN') : c.slice(1).every(Number.isFinite)));
});
