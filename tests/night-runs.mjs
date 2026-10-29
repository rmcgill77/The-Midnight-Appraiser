// Browser test of night runs in continuous mode (?continuous=1): the front door only offers them
// in the dark, a walk through the city ends at dawn, and a zone run ends when its time runs out.
// Run: node tests/night-runs.mjs [screenshot-prefix]
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
const settle = async () => { await T(() => __tma.speech.clear()); await page.waitForFunction(() => !__tma.pause.paused); };   // text messages and the door's fade pause the clock
const state = () => T(() => ({ phase: __tma.st.phase, night: __tma.world.night, mode: __tma.world.dayMode, clock: __tma.clock.state, timed: __tma.clock.timed, room: __tma.world.room, t: __tma.clock.cycle.t }));

// 1. daylight: the front door has no night options
await T(() => { __tma.clock.cycle.t = 12 * 60; __tma.openHomeDoor(); });
await page.waitForSelector('#door-street');
assert.equal(await page.locator('#door-night-city').count(), 0);
await page.click('button:has-text("Not yet")');

// 2. after dark: both options, and the note about when it gets light
await T(() => { __tma.clock.cycle.t = 23 * 60; __tma.openHomeDoor(); });
await page.waitForSelector('#door-night-city');
assert.equal(await page.locator('#door-night-zones').count(), 1);
assert.match(await page.innerText('#door-dark'), /dark until 6:30 AM/);
await shot('door');

// 3. a walk through the city: a six-hour window, ended by dawn
await page.click('#door-night-city');
await page.waitForFunction(() => __tma.world.night === 'city');
let s = await state();
assert.equal(s.phase, 'night'); assert.equal(s.clock, 'running');
assert.equal(s.timed.end - s.timed.start, 6 * 60, 'six hours, since dawn is further off');
await settle();
await T(() => { __tma.clock.cycle.t = __tma.clock.timed.end - 0.5; __tma.simulate(2); });
await page.waitForFunction(() => __tma.world.night === null);
s = await state();
assert.equal(s.phase, 'errands'); assert.equal(s.mode, 'city'); assert.equal(s.clock, 'running'); assert.equal(s.timed, null);

// 4. the night is over at dawn: no more run
await T(() => { __tma.clock.cycle.t = 6 * 60 + 15 + 1440; __tma.openHomeDoor(); });
await page.waitForSelector('#door-street');
assert.equal(await page.locator('#door-night-city').count(), 0, 'no run in the last quarter hour of dark');
await page.click('button:has-text("Not yet")');

// 5. a zone run, ended by its clock running out
await T(() => { __tma.clock.cycle.t = 2 * 1440 + 22 * 60; __tma.openHomeDoor(); });
await page.waitForSelector('#door-night-zones');
await page.click('#door-night-zones');
await page.waitForSelector('#zone-laundromat');
await shot('zones');
await page.click('#zone-laundromat');
await page.waitForFunction(() => __tma.world.night === 'zone' && !!__tma.st.run);
s = await state();
assert.equal(s.room, 'zone'); assert.equal(s.clock, 'running'); assert.equal(s.timed.end - s.timed.start, 6 * 60);
await settle();
await T(() => { __tma.clock.cycle.t = __tma.clock.timed.end - 0.5; __tma.simulate(2); });
await page.waitForSelector('#head-home');
await shot('runend');
await page.click('#head-home');
await page.waitForFunction(() => __tma.world.night === null && __tma.clock.state === 'running');
s = await state();
assert.equal(s.phase, 'errands'); assert.equal(s.mode, 'city'); assert.equal(s.timed, null); assert.equal(s.room, 'apartment');

// 6. backing out of the zone list leaves the day as it was
await T(() => { __tma.clock.cycle.t = 3 * 1440 + 22 * 60; __tma.openHomeDoor(); });
await page.click('#door-night-zones');
await page.waitForSelector('#zone-laundromat');
await page.getByRole('button', { name: 'Back', exact: true }).click();
await page.waitForSelector('#door-street');
s = await state();
assert.equal(s.phase, 'errands');

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: night runs are offered in the dark, end at their time limit, and return to free time');
