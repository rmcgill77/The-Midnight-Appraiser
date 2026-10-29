// Browser test of the date changing at midnight (?continuous=1): the sim's day moves when the clock
// passes midnight (rent too), waits for closing time during an overnight shift, and a sleep only
// rolls the dates it crossed.
// Run: node tests/midnight.mjs
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
const settle = async () => { await T(() => __tma.speech.clear()); await page.waitForFunction(() => !__tma.pause.paused); };
await settle();

// 1. staying up past midnight rolls the day, and rent due that day is collected as it ends
const before = await T(() => ({ day: __tma.st.day, cash: __tma.st.cash, rent: __tma.st.rent.amount }));
assert.equal(before.day, 1);
await T(() => { __tma.st.rent.dueDay = 1; __tma.clock.cycle.t = 23 * 60 + 30; __tma.simulate(40); });
const after = await T(() => ({ day: __tma.st.day, date: __tma.clock.cycle.date, cash: __tma.st.cash, phase: __tma.st.phase, label: __tma.clock.label }));
assert.equal(after.date, 1);
assert.equal(after.day, 2, 'the sim\'s day moved at midnight, without sleeping');
assert.equal(after.cash, before.cash - before.rent, 'rent was due on day 1 and was paid as it ended');
assert.equal(after.phase, 'errands', 'still up, still free time');
// one midnight, one roll
await T(() => __tma.simulate(5));
assert.equal(await T(() => __tma.st.day), 2);

// 2. an overnight shift stays one day: the roll waits for closing time
await T(() => {
  const w = __tma.world; const day = { open: 20 * 60, minutes: 8 * 60 };
  w.shopHours = { mode: 'same', week: [day, day, day, day, day, day, null] };
  w.shopClosedDate = null;
  __tma.clock.cycle.t = 1440 + 22 * 60;                 // 10 PM on date 1 (Thursday, day 2)
  __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard();
});
await page.click('#open-shop');
await settle();
// customers walk in and talk, which pauses the clock: keep clearing them until midnight has passed
for (let i = 0; i < 80 && (await T(() => __tma.clock.cycle.date)) < 2; i++) await T(() => { __tma.speech.clear(); if (__tma.ui.isOpen) __tma.ui.close(); __tma.simulate(5); });
const during = await T(() => ({ date: __tma.clock.cycle.date, day: __tma.st.day, open: !!__tma.world.shopSession, ledgerDay: __tma.st.shop.day }));
assert.equal(during.date, 2); assert.equal(during.open, true);
assert.equal(during.day, 2, 'the sim\'s day waits while the shop is open');
assert.equal(during.ledgerDay, 2, 'one ledger for the whole shift');
await T(() => { __tma.clock.cycle.t = 2 * 1440 + 4 * 60; __tma.simulate(1); });   // 4 AM: closing
await page.waitForSelector('#lock-up');
assert.equal(await T(() => __tma.st.day), 2, 'still waiting behind the closing card');
await page.click('#lock-up');
assert.equal(await T(() => __tma.st.day), 3, 'the day rolls once the shop is locked up');

// 3. sleeping rolls only what the sleep crossed
await T(() => { __tma.clock.cycle.t = 2 * 1440 + 22 * 60; });   // 10 PM on date 2 (day 3)
await T(() => __tma.continuousBed());
await page.click('#sleep-min');
await clearCards(page);
const woke = await T(() => ({ day: __tma.st.day, date: __tma.clock.cycle.date, phase: __tma.st.phase }));
assert.equal(woke.date, 3); assert.equal(woke.day, 4, 'sleeping through midnight rolled exactly one day');
assert.equal(woke.phase, 'errands');
// sleeping after midnight (the day already rolled while awake) adds none
await T(() => { __tma.clock.cycle.t = 3 * 1440 + 20 * 60; __tma.clock.cycle.sleptWindow = null; __tma.simulate(5 * 60); });
const mid = await T(() => ({ day: __tma.st.day, date: __tma.clock.cycle.date, t: __tma.clock.cycle.t }));
assert.equal(mid.day, mid.date + 1);
await T(() => { __tma.clock.cycle.sleptWindow = null; });
await T(() => __tma.continuousBed());
await page.click('#sleep-min');
await clearCards(page);
const woke2 = await T(() => ({ day: __tma.st.day, date: __tma.clock.cycle.date }));
assert.equal(woke2.day, woke2.date + 1, 'the sim and the clock agree after a sleep');

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: the date changes at midnight, waits out an overnight shift, and a sleep only rolls what it crossed');
