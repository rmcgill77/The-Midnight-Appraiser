import test from 'node:test';
import assert from 'node:assert/strict';
import { dressProps, dressShopFront } from '../src/data/street-props.js';

const calls = [];
const g = { set fillStyle(v) { calls.push(['style', v]); }, fillRect(x, y, w, h) { calls.push(['rect', x, y, w, h]); } };
// a pavement beside a road: f falls toward the road at the top of the tile
const net = { field: (x, y) => ({ f: y - 40 + 0.5 * 0 }) };
const map = { at: () => ',' };

test('props draw well-formed shapes on pavements, in alleys and at doors, in every district and season', () => {
  for (const season of ['spring', 'summer', 'autumn', 'winter']) for (const district of ['oldmarket', 'westside', 'narrows', 'kessler', 'harbor', 'eastgate', null]) {
    for (let h = 0; h < 4000; h += 3) {
      assert.doesNotThrow(() => { dressProps(g, map, net, 5, 3, ',', (h * 2654435761) >>> 0, season, { district }); dressProps(g, map, net, 5, 3, 'y', h, season, {}); dressProps(g, map, net, 5, 3, 'o', h, season, {}); });
    }
    dressShopFront(g, 4, 4, 7);
  }
  assert.ok(calls.length > 500);
  assert.ok(calls.every(c => c[0] === 'style' ? typeof c[1] === 'string' && !c[1].includes('undefined') && !c[1].includes('NaN') : c.slice(1).every(Number.isFinite)));
});
test('nothing is drawn beside a door or where there is no road', () => {
  calls.length = 0;
  dressProps(g, map, net, 5, 3, ',', 5, 'summer', { district: 'oldmarket', nearDoor: true });
  dressProps(g, map, { field: () => null }, 5, 3, ',', 5, 'summer', { district: 'oldmarket' });
  assert.equal(calls.length, 0);
});
