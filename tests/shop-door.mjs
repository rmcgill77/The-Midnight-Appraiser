// Browser test: you can walk into your own shop from the street and back out again, any time it is not open,
// without being sent home first; while it is open the door stays shut.
// Run: node tests/shop-door.mjs
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame();
await startNewGame(page); await clearCards(page).catch(() => {});
const room = () => page.evaluate(() => __tma.world.room);
const door = await page.evaluate(() => { const L = __tma.cityLayout.locs[Object.keys(__tma.cityLayout.locs).find(k => __tma.cityLayout.locs[k].id === 'shop') ?? 'shop']; return { door: L.door, stand: L.stand }; });
for (let round = 0; round < 3; round++) {
  await page.evaluate(({ stand }) => __tma.placeAt('city', stand.tx, stand.ty, 'up'), door);
  await page.waitForTimeout(300);
  assert.equal(await room(), 'city');
  await page.evaluate(({ door }) => __tma.interact({ panel: 'loc', hit: { tx: door.tx, ty: door.ty } }), door);
  await page.waitForTimeout(300);
  assert.equal(await room(), 'shop', 'the shop door takes you straight in');
  assert.equal(await page.locator('#go-home').count(), 0, 'no "head home" card in the way');
  // the front door from inside: the sign card, with a way out to the street
  await page.evaluate(() => __tma.interact({ panel: 'frontdoor' }));
  await page.waitForSelector('#sign-out', { timeout: 3000 });
  await page.click('#sign-out');
  await page.waitForTimeout(300);
  assert.equal(await room(), 'city', 'back out on the street');
  const at = await page.evaluate(() => { const p = __tma.player; return [Math.floor((p.x + 8) / 16), Math.floor((p.y + 12) / 16)]; });
  assert.ok(Math.abs(at[0] - door.stand.tx) <= 1 && Math.abs(at[1] - door.stand.ty) <= 1, `outside the shop door, at ${at}`);
}
assert.deepEqual(problems, []);
await close();
console.log('OK: the shop door takes you in and out freely while the shop is closed');
