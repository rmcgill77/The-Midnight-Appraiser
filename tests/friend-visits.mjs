// Browser test of friends visiting the open shop on their own schedule (?continuous=1): a librarian
// only drops by after the library closes, and is dropped if the shift ends before then.
// Run: node tests/friend-visits.mjs
import assert from 'node:assert/strict';
import { openGame, startNewGame } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
await T(() => __tma.speech.clear());
await page.waitForFunction(() => !__tma.pause.paused);
const planOf = () => T(() => __tma.crowd.plan?.filter(p => p.friend).map(p => ({ friend: p.friend, at: p.at })));

// Day 1 is a Wednesday. Morgan (the librarian) works at the library 9-5, unless the library is shut that
// day (a sick day, a storm), which depends on the game's seed: pick a seed where it's open.
await T(() => {
  __tma.clock.cycle.t = 10 * 60;
  for (let seed = 1; seed < 500; seed++) { __tma.st.seed = seed; if (__tma.placeStatus('library').open) return seed; }
  throw new Error('no seed with the library open');
});
// 1. a 10 AM to 6 PM shift: she can only come in the last hour (5-6 PM), which is 87.5% of the way through
await T(() => { __tma.clock.cycle.t = 10 * 60; __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard(); });
await page.click('#open-shop');
await T(() => { const c = __tma.crowd; c.world.extras = () => [{ kind: 'buy', why: 'friend', friend: 'Morgan', with: null }, { kind: 'buy', why: 'friend', friend: 'Pablo', with: null }]; c.plan = null; __tma.simulate(0.1); });
let plan = await planOf();
const morgan = plan.find(p => p.friend === 'Morgan'), pablo = plan.find(p => p.friend === 'Pablo');
assert.ok(morgan, 'Morgan comes, but late');
assert.ok(morgan.at >= 0.87 && morgan.at <= 0.97, `Morgan arrives at ${morgan.at}: after the library closes`);
assert.ok(pablo, 'Pablo has no job, so he can come any time');
await T(() => __tma.endShopSession('early'));
await page.click('#lock-up');

// 2. a short shift, 10 AM to 2 PM: Morgan is at work the whole time, so she doesn't come
await T(() => {
  const w = __tma.world, day = { open: 10 * 60, minutes: 4 * 60 };
  w.shopHours = { mode: 'same', week: [day, day, day, day, day, day, null] };
  w.shopClosedDate = null;
  const d = __tma.clock.cycle.date;
  __tma.clock.cycle.t = (d + 1) * 1440 + 10 * 60;      // Thursday 10 AM
  __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard();
});
await page.click('#open-shop');
await T(() => { const c = __tma.crowd; c.world.extras = () => [{ kind: 'buy', why: 'friend', friend: 'Morgan', with: null }, { kind: 'buy', why: 'friend', friend: 'Pablo', with: null }]; c.plan = null; __tma.simulate(0.1); });
plan = await planOf();
assert.equal(plan.find(p => p.friend === 'Morgan'), undefined, 'Morgan is at work all shift');
assert.ok(plan.find(p => p.friend === 'Pablo'), 'Pablo still comes');
await T(() => __tma.endShopSession('early'));
await page.click('#lock-up');

// 3. a night shift (8 PM-4 AM): nobody drops by while the town sleeps
await T(() => {
  const w = __tma.world, day = { open: 20 * 60, minutes: 8 * 60 };
  w.shopHours = { mode: 'same', week: [day, day, day, day, day, day, null] };
  w.shopClosedDate = null;
  const d = __tma.clock.cycle.date;
  __tma.clock.cycle.t = (d + 1) * 1440 + 20 * 60;      // Friday 8 PM
  __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard();
});
await page.click('#open-shop');
await T(() => { const c = __tma.crowd; c.world.extras = () => [{ kind: 'buy', why: 'friend', friend: 'Pablo', with: null }]; c.plan = null; __tma.simulate(0.1); });
plan = await planOf();
const night = plan.find(p => p.friend === 'Pablo');
assert.ok(night, 'Pablo comes in the evening');
assert.ok(night.at < 5 / 8 + 1e-9, `he comes before 1 AM (progress ${night.at}), not while asleep`);

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: friends drop by the open shop when they are free, and not while they work or sleep');
