// Browser test of the pacing rules that keep the continuous day from being easier than the original
// (?continuous=1): errands spend a daily budget of hours that waking refills, and a night allows one run.
// Run: node tests/economy.mjs
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
const settle = async () => { await T(() => __tma.speech.clear()); await page.waitForFunction(() => !__tma.pause.paused); };
await settle();

// 1. the day starts with the original's errand budget
const start = await T(() => ({ left: __tma.st.ap.left, max: __tma.st.ap.max }));
assert.ok(start.max >= 4 && start.left === start.max, `a full budget (${start.left}/${start.max})`);

// 2. an errand costs hours, and the budget isn't reset by the clock (which has a day's worth of hours)
const spent = await T(() => {
  const { st, clock, CR, S } = __tma;
  for (const loc of S.DATA.locations) for (const id of loc.actions ?? []) {
    const a = S.DATA.cityActions[id];
    if (!a?.hours || CR.blocker(st, clock, loc.id, id)) continue;
    const left0 = st.ap.left, t0 = clock.cycle.t;
    const r = CR.act(st, clock, loc.id, id);
    if (!r) continue;
    return { loc: loc.id, id, hours: a.hours, left0, left1: st.ap.left, minutes: clock.cycle.t - t0 };
  }
  return null;
});
assert.ok(spent, 'found an errand to run');
assert.equal(spent.left1, spent.left0 - spent.hours, `the errand cost its ${spent.hours} hours`);
assert.ok(Math.abs(spent.minutes - spent.hours * 60) < 1, 'and the clock moved by the same time');
const again = await T(sp => { __tma.CR.blocker(__tma.st, __tma.clock, sp.loc, sp.id); return __tma.st.ap.left; }, spent);
assert.equal(again, spent.left1, 'asking about another errand does not refill the budget from the clock');

// 3. with no hours left an errand is refused
const refused = await T(() => {
  const { st, clock, CR, S } = __tma;
  st.ap.left = 0.5;
  for (const loc of S.DATA.locations) for (const id of loc.actions ?? []) {
    if (S.DATA.cityActions[id]?.hours >= 1) { const why = CR.blocker(st, clock, loc.id, id); if (why) return why; }
  }
  return null;
});
assert.match(refused ?? '', /Not enough hours/);

// 4. sleeping refills the budget
await T(() => { __tma.st.ap.left = 1; __tma.clock.cycle.t = 22 * 60; });
await T(() => __tma.continuousBed());
await page.click('#sleep-min');
await clearCards(page);
const morning = await T(() => ({ left: __tma.st.ap.left, max: __tma.st.ap.max }));
assert.equal(morning.left, morning.max, 'a fresh budget in the morning');

// 5. one night run a night
await T(() => { __tma.placeAt('apartment', 5, 5, 'down'); __tma.clock.cycle.t = 3 * 1440 + 22 * 60; });
await T(() => __tma.openHomeDoor());
await page.waitForFunction(() => __tma.world.night === 'city', null, { timeout: 8000 });
await settle();
// the walk is over (the player went home): back to free time, still the same night
await T(() => { __tma.clock.cycle.t = 3 * 1440 + 23 * 60; __tma.clock.timed = null; __tma.world.night = null; __tma.st.phase = 'errands'; __tma.world.dayMode = 'city'; __tma.clock.state = 'running'; __tma.placeAt('apartment', 5, 5, 'down'); });
await T(() => __tma.openHomeDoor());
await page.waitForFunction(() => __tma.world.room === 'city');
await page.waitForTimeout(1200);
assert.equal(await T(() => __tma.world.night), null, 'no second run tonight');
// the next night it's available again
await T(() => { __tma.placeAt('apartment', 5, 5, 'down'); __tma.clock.cycle.t = 4 * 1440 + 22 * 60; });
await T(() => __tma.openHomeDoor());
await page.waitForFunction(() => __tma.world.night === 'city', null, { timeout: 8000 });

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: errands spend a daily budget, waking refills it, and a night allows one run');
