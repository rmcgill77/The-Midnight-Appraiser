// Browser test of the normal game (no switch): a new game still starts at the morning card, the
// clock is the old one, and the front door still offers the shop-or-city choice.
// Run: node tests/classic-flow.mjs
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

const { page, problems, close } = await openGame();
await page.click('#new-game');
await page.click('#season-ok');
await page.click('#look-ok');
await page.locator('[id^="bg-"]:not(#bg-ok)').first().click();
await page.click('#bg-ok');
await page.fill('#owner-name', 'Tester');
await page.click('#name-ok');
for (let i = 0; i < 12 && !(await page.locator('#ride-ok').count()); i++) await page.click('#story-next');
await page.click('#ride-ok');
await page.click('#skip-walkthrough');
await page.waitForSelector('#get-up');
const s = await page.evaluate(() => ({ cur: __tma.ui.current?.id, phase: __tma.st.phase, cont: !!__tma.clock.cycle, state: __tma.clock.state }));
assert.equal(s.cur, 'morning'); assert.equal(s.phase, 'morning'); assert.equal(s.cont, false); assert.equal(s.state, 'stopped');
await page.click('#get-up');
await page.evaluate(() => __tma.openHomeDoor());
await page.waitForSelector('#choose-shop');
assert.equal(await page.locator('#choose-city').count(), 1);
await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: the normal game still opens on the morning card and offers the shop-or-city choice');
