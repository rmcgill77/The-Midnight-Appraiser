// Browser test of the continuous day and night (?continuous=1): a new game starts as free time with
// the clock running, bed is refused before 8 PM, and sleeping fast-forwards and starts the next day.
// Run: node tests/continuous-flow.mjs [screenshot-prefix]
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };
const T = (fn, arg) => page.evaluate(fn, arg);

await startNewGame(page);
await shot('start');

const start = await T(() => ({ phase: __tma.st.phase, mode: __tma.world.dayMode, state: __tma.clock.state, day: __tma.st.day, label: __tma.clock.label, cont: !!__tma.clock.cycle }));
assert.equal(start.cont, true, 'the continuous clock is in use');
assert.equal(start.state, 'running');
assert.equal(start.phase, 'errands');
assert.equal(start.mode, 'city');
assert.equal(start.day, 1);

// time passes
await T(() => __tma.simulate(10));
const later = await T(() => __tma.clock.cycle.t);
assert.ok(later > 8 * 60 + 5, `the clock moved (${later})`);

// 1. too early to sleep: the bed just says so
await T(() => __tma.continuousBed());
assert.equal(await T(() => __tma.ui.isOpen), false, 'no sleep card before 8 PM');

// 2. at 9 PM it offers sleep; sleeping fast-forwards at least six hours and starts the next day
await T(() => { __tma.clock.cycle.t = 21 * 60; });
await T(() => __tma.continuousBed());
await page.waitForSelector('#sleep-min');
await shot('bed');
await page.click('#sleep-min');
await clearCards(page);                        // the morning's ledger card and any letter
const woke = await T(() => ({ t: __tma.clock.cycle.t, day: __tma.st.day, phase: __tma.st.phase, state: __tma.clock.state, mode: __tma.world.dayMode, canSleep: __tma.clock.cycle.canSleep, open: __tma.ui.isOpen }));
assert.ok(woke.t >= 24 * 60 + 3 * 60 && woke.t < 24 * 60 + 3 * 60 + 5, `woke at 3 AM, six hours after 9 PM (${woke.t})`);
assert.equal(woke.day, 2, 'the sim moved to day 2');
assert.equal(woke.state, 'running');
assert.equal(woke.canSleep, false, 'already slept in this window');
assert.equal(woke.phase, 'errands');
assert.equal(woke.mode, 'city');

// 3. the second night, a long sleep
await T(() => { __tma.clock.cycle.t = 2 * 1440 + 22 * 60; __tma.clock.cycle.sleptWindow = null; });
await T(() => __tma.continuousBed());
await page.click('#sleep-long');
await clearCards(page);
const second = await T(() => ({ t: __tma.clock.cycle.t, day: __tma.st.day }));
assert.ok(second.t > 3 * 1440 + 3 * 60 && second.t < 3 * 1440 + 10 * 60 + 5, `slept in (${second.t})`);
await shot('woke');

// 4. the shop: closed outside its hours, flip the sign inside them, locked in, closing time ends it
//    Day 1 is a Wednesday (the sim's calendar), so the default hours (10 AM-6 PM, closed Sundays) apply.
await T(() => { const w = __tma.world; w.shopSession = null; w.shopClosedDate = null; });
const dateNow = await T(() => __tma.clock.cycle.date);
await T((d) => { __tma.clock.cycle.t = d * 1440 + 8 * 60; __tma.placeAt('shop', 11, 11, 'up'); }, dateNow);
await T(() => __tma.shopSignCard());
await page.waitForSelector('#sign-home');
assert.equal(await page.locator('#open-shop').count(), 0, 'no sign to flip at 8 AM');
await page.click('#sign-home');
await T((d) => { __tma.clock.cycle.t = d * 1440 + 11 * 60; }, dateNow);
await T(() => { __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard(); });
await page.waitForSelector('#open-shop', { timeout: 4000 }).catch(async e => { throw new Error(`no sign to flip at 11 AM: ${(await page.evaluate(() => document.body.innerText)).slice(0, 400)} date=${dateNow}`); });
await shot('sign');
await page.click('#open-shop');
const open = await T(() => ({ phase: __tma.st.phase, mode: __tma.world.dayMode, ses: !!__tma.world.shopSession, to: __tma.world.shopSession?.to }));
assert.equal(open.phase, 'day'); assert.equal(open.mode, 'shop'); assert.equal(open.ses, true);
assert.equal(open.to, dateNow * 1440 + 18 * 60, 'open until 6 PM');
await T(() => __tma.simulate(20));
const crowdCount = await T(() => __tma.crowd.list.length);
assert.ok(crowdCount >= 0);
await T(() => __tma.shopSignCard());
await page.waitForSelector('#close-early');                // locked in: only "close early" or "keep going"
assert.equal(await page.locator('#sign-home').count(), 0);
await page.click('button:has-text("Keep going")');
// closing time
await T((d) => { __tma.clock.cycle.t = d * 1440 + 18 * 60; }, dateNow);
await T(() => __tma.simulate(1));
await page.waitForSelector('#lock-up');
await shot('closed');
await page.click('#lock-up');
const closed = await T(() => ({ phase: __tma.st.phase, mode: __tma.world.dayMode, ses: __tma.world.shopSession, shut: __tma.world.shopClosedDate }));
assert.equal(closed.phase, 'errands'); assert.equal(closed.mode, 'city'); assert.equal(closed.ses, null);
assert.equal(closed.shut, dateNow);
// it can't be run twice in a day
await T(() => { __tma.clock.cycle.t = __tma.world.shopClosedDate * 1440 + 12 * 60; __tma.shopSignCard(); });
await page.waitForSelector('#sign-home');
assert.equal(await page.locator('#open-shop').count(), 0, 'already ran the shop today');
await page.click('#sign-home');

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: continuous mode starts, refuses early sleep, and fast-forwards a sleep');
