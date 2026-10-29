// Browser test of the shop-hours panel in continuous mode (?continuous=1): set the hours with the
// sliders, refuse to open every day, go day by day, and run an overnight shift to its close.
// Run: node tests/hours-panel.mjs [screenshot-prefix]
import assert from 'node:assert/strict';
import { openGame, startNewGame } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
// Range inputs clamp what you set, like a finger on the slider; Playwright's fill refuses out-of-range values.
const setRange = (id, v) => page.evaluate(([i, n]) => { const e = document.getElementById(i); e.value = n; e.dispatchEvent(new Event('input', { bubbles: true })); }, [id, v]);

await T(() => { __tma.clock.cycle.t = 12 * 60; __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard(); });
await page.click('#sign-hours');
await page.waitForSelector('#hours-open');
await shot('same');

// the default week: closed on Sundays only
let week = await T(() => __tma.world.shopHours?.week ?? null);
assert.equal(week, null, 'hours are only saved once the player saves them');

// "Same every day": 8 PM for 10 hours (the slider stops at 8), closed on Sundays and Mondays
await setRange('hours-open', 1200);
await setRange('hours-length', 600);
assert.equal(await page.locator('#hours-length').inputValue(), '480', 'the slider tops out at 8 hours');
await page.click('#closed-0');
assert.match(await page.innerText('#hours-summary'), /Closed: Monday, Sunday/);
// the last closed day can't be opened up: take Monday and Sunday off, then try Sunday again
await page.click('#closed-6');
assert.match(await page.innerText('#hours-summary'), /Closed: Monday\./);
await page.click('#closed-0');                          // would leave no closed day: refused
assert.match(await page.innerText('#hours-summary'), /Closed: Monday\./);
await page.click('#closed-6');
await page.click('#hours-save');
await page.waitForSelector('#shop-sign, #open-shop, #sign-home');
week = await T(() => __tma.world.shopHours.week);
assert.equal(week[0], null); assert.equal(week[6], null);
assert.deepEqual(week[1], { open: 1200, minutes: 480 });
assert.equal(week.filter(x => x === null).length, 2);

// "Day by day": Tuesday only 2 hours at noon
await T(() => __tma.openShopHoursPanel());
await page.click('#hours-mode-perDay');
await page.waitForSelector('#day-start-1');
await shot('perday');
await setRange('day-start-1', 720);
await setRange('day-length-1', 120);
await page.click('#hours-save');
week = await T(() => __tma.world.shopHours.week);
assert.deepEqual(week[1], { open: 720, minutes: 120 });
assert.deepEqual(week[2], { open: 1200, minutes: 480 });

// an overnight shift: Wednesday (day 1) opens 8 PM and closes 4 AM, which is still Wednesday's hours
await T(() => { __tma.clock.cycle.t = 21 * 60; __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard(); });
await page.waitForSelector('#open-shop');
await page.click('#open-shop');
const ses = await T(() => __tma.world.shopSession);
assert.equal(ses.to, 1440 + 4 * 60, 'closes at 4 AM the next date');
await T(() => __tma.openShopHoursPanel());               // refused while open
assert.equal(await page.locator('#hours-save').count(), 0);
await T(() => { __tma.clock.cycle.t = 1440 + 4 * 60; __tma.simulate(1); });
await page.waitForSelector('#lock-up');
await page.click('#lock-up');
assert.equal(await T(() => __tma.world.shopSession), null);

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: the hours panel sets the week, enforces the closed day, and an overnight shift closes on time');
