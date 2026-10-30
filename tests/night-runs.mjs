// Browser test of night runs: stepping out after dark starts the night with no menu, a walk through the
// city ends at dawn, a zone run starts from the zone's own door and ends when its time runs out.
// Run: node tests/night-runs.mjs [screenshot-prefix]
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame();
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
const settle = async () => { await T(() => __tma.speech.clear()); await page.waitForFunction(() => !__tma.pause.paused); };   // text messages and the door's fade pause the clock
const state = () => T(() => ({ phase: __tma.st.phase, night: __tma.world.night, mode: __tma.world.dayMode, clock: __tma.clock.state, timed: __tma.clock.timed, room: __tma.world.room, t: __tma.clock.cycle.t }));

const zoneDoor = id => T(id => { const L = __tma.cityLayout.locs[id]; return { door: L.door, stand: L.stand }; }, id);
const goOut = () => T(() => __tma.openHomeDoor());

// 1. daylight: the front door just takes you out; nothing about the night
await T(() => { __tma.clock.cycle.t = 12 * 60; });
await goOut(); await page.waitForFunction(() => __tma.world.room === 'city');
await page.waitForTimeout(800);
assert.equal((await state()).night, null, 'no night walk in daylight');

// 2. after dark, stepping out starts the night on its own (no menu), and it is a six-hour window, ended by dawn
await T(() => { __tma.placeAt('apartment', 5, 5, 'down'); __tma.clock.cycle.t = 23 * 60; });
await goOut();
await page.waitForFunction(() => __tma.world.night === 'city', null, { timeout: 8000 });
let s = await state();
assert.equal(s.phase, 'night'); assert.equal(s.clock, 'running');
assert.equal(s.timed.end - s.timed.start, 6 * 60, 'six hours, since dawn is further off');
assert.equal(await page.locator('#door-night-city').count(), 0, 'no menu to choose it');
await shot('night');
await settle();
await T(() => { __tma.clock.cycle.t = __tma.clock.timed.end - 0.5; __tma.simulate(2); });
await page.waitForFunction(() => __tma.world.night === null);
s = await state();
assert.equal(s.phase, 'errands'); assert.equal(s.mode, 'city'); assert.equal(s.clock, 'running'); assert.equal(s.timed, null);
await page.waitForTimeout(1000);
assert.equal((await state()).night, null, 'the night was spent: stepping about does not start another');

// 3. the last quarter hour of dark: no run
await T(() => { __tma.placeAt('apartment', 5, 5, 'down'); __tma.clock.cycle.t = 6 * 60 + 15 + 1440; });
await goOut(); await page.waitForTimeout(1200);
assert.equal((await state()).night, null, 'no run in the last quarter hour of dark');

// 4. a zone run from its own door, ended by its clock running out
await T(() => { __tma.placeAt('apartment', 5, 5, 'down'); __tma.clock.cycle.t = 2 * 1440 + 22 * 60; });
await goOut();
await page.waitForFunction(() => __tma.world.night === 'city', null, { timeout: 8000 });
await settle();
const zd = await zoneDoor('z-laundromat');
await T(({ stand }) => __tma.placeAt('city', stand.tx, stand.ty, 'up'), zd);
await T(({ door }) => __tma.interact({ panel: 'loc', hit: { tx: door.tx, ty: door.ty } }), zd);
await page.waitForSelector('#zone-laundromat');
await shot('zonedoor');
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

// 5. at a zone's door by day it is an ordinary building (no run card), and "Not tonight" leaves the night as it was
await T(() => { __tma.clock.cycle.t = 3 * 1440 + 12 * 60; __tma.world.night = null; __tma.st.phase = 'errands'; });
await T(({ stand }) => __tma.placeAt('city', stand.tx, stand.ty, 'up'), zd);
await T(({ door }) => __tma.interact({ panel: 'loc', hit: { tx: door.tx, ty: door.ty } }), zd);
await page.waitForTimeout(400);
assert.equal(await page.locator('#zone-laundromat').count(), 0, 'no run card by day');
await T(() => __tma.ui.close());
await T(() => { __tma.clock.cycle.t = 3 * 1440 + 22 * 60; });
await page.waitForFunction(() => __tma.world.night === 'city', null, { timeout: 8000 });
await settle();
await T(({ door }) => __tma.interact({ panel: 'loc', hit: { tx: door.tx, ty: door.ty } }), zd);
await page.waitForSelector('#zone-laundromat');
await page.getByRole('button', { name: 'Not tonight', exact: true }).click();
s = await state();
assert.equal(s.room, 'city'); assert.equal(s.night, 'city');

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: night runs are offered in the dark, end at their time limit, and return to free time');
