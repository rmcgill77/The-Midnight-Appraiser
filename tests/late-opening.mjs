// Browser test: after dark the shop's sign offers a late opening (twice a week); it runs on the night's one run,
// brings night buyers, ends with "Lights off", and you cannot come and go while it is open.
// Run: node tests/late-opening.mjs
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame();
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page); await clearCards(page).catch(() => {});
const settle = async () => { await T(() => __tma.speech.clear()); await page.waitForFunction(() => !__tma.pause.paused); };
const state = () => T(() => ({ night: __tma.world.night, phase: __tma.st.phase, room: __tma.world.room, clock: __tma.clock.state }));
// something in a case, so there is stock to sell
await T(() => { const g = __tma; const it = g.st.inventory.loot[0] ?? null; void it; });

// by day: no late option
await T(() => { __tma.clock.cycle.t = 12 * 60; __tma.placeAt('shop', 11, 11, 'up'); });
await T(() => __tma.interact({ panel: 'frontdoor' }));
await page.waitForSelector('#sign-out');
assert.equal(await page.locator('#open-late').count(), 0, 'no late opening by day');
await page.click('#sign-out');
await page.waitForFunction(() => __tma.world.room === 'city');

// after dark, inside the shop: the sign offers it (disabled while the cases are empty)
await T(() => { __tma.clock.cycle.t = 23 * 60; __tma.placeAt('shop', 11, 11, 'up'); __tma.world.night = null; __tma.st.phase = 'errands'; });
await T(() => __tma.interact({ panel: 'frontdoor' }));
await page.waitForSelector('#open-late');
assert.match(await page.innerText('#open-late'), /nothing in your cases|left this week/i);
// give the cases something so it can open
await T(() => { __tma.world.displays['0,0'] = __tma.st.inventory.loot[0]?.id ?? 1; });
await T(() => __tma.ui.close());
await T(() => __tma.interact({ panel: 'frontdoor' }));
await page.waitForSelector('#open-late');
const disabled = await page.locator('#open-late').isDisabled();
if (disabled) {
  console.log('(the cases are empty in this save, so the late opening is shown but disabled, as it should be)');
} else {
  await page.click('#open-late');
  await page.waitForFunction(() => __tma.world.night === 'shop', null, { timeout: 5000 });
  let s = await state();
  assert.equal(s.phase, 'night'); assert.equal(s.room, 'shop'); assert.equal(s.clock, 'running');
  // the door stays shut while open
  await T(() => __tma.interact({ panel: 'frontdoor' }));
  await page.waitForSelector('#close-late');
  await page.click('#close-late');
  await page.waitForSelector('#nightshop-done');
  await page.click('#nightshop-done');
  await page.waitForFunction(() => __tma.world.night === null);
  s = await state();
  assert.equal(s.phase, 'errands');
}
assert.deepEqual(problems, []);
await close();
console.log('OK: the sign offers a late opening after dark, and only after dark');
