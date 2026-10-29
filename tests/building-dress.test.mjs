import test from 'node:test';
import assert from 'node:assert/strict';
import { dressBuildingTile } from '../src/data/building-dress.js';

const calls = [];
const g = { set fillStyle(v) { calls.push(['style', v]); }, fillRect(x, y, w, h) { calls.push(['rect', x, y, w, h]); } };
const D = 'awkenh';
const api = { districtOf: () => ({ roof: '#222222', roofDark: '#111111', roofLight: '#333333', brick: '#444444', brickDark: '#222222', trim: '#555555' }), isRoof: c => D.includes(c) && c !== '', isFace: c => !!c && c !== c.toLowerCase() && D.includes(c.toLowerCase()), isHouseDoor: c => 'oZJ'.includes(c) };

test('every kind of building tile dresses without error, in every season, over a few thousand different tiles', () => {
  const rows = ['aaaaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'WWWWWWWW', 'WWWWWWWW', 'WWoWWWWW', ',,,,,,,,', 'nnnnnnnn', 'nnnnnnnn', 'NNNNNNNN', 'NNNNNNNN', 'NNNNoNNN'];
  const map = { at: (x, y) => rows[y]?.[x] ?? '#' };
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    for (let h = 0; h < 3000; h += 7) for (let y = 0; y < rows.length; y++) for (let x = 0; x < 8; x++) {
      assert.doesNotThrow(() => dressBuildingTile(g, map, x, y, map.at(x, y), (h * 2654435761) >>> 0, season, api));
    }
  }
  assert.ok(calls.length > 1000);
  assert.ok(calls.every(c => c[0] === 'style' ? typeof c[1] === 'string' && !c[1].includes('undefined') && !c[1].includes('NaN') : c.slice(1).every(Number.isFinite)));
});
