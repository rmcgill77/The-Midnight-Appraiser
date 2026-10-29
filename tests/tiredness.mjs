// Browser test of what skipped nights do (?continuous=1): slow walking and shop mistakes after one,
// screen effects after two, and the collapse after three (a lost day, half a heart, a scene).
// Run: node tests/tiredness.mjs [screenshot-prefix]
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
const settle = async () => { await T(() => __tma.speech.clear()); await page.waitForFunction(() => !__tma.pause.paused); };
await settle();

// rested: nothing is wrong
await T(() => { __tma.clock.cycle.t = 12 * 60; __tma.simulate(0.2); });
assert.equal(await T(() => __tma.player.speedMul), 1);
assert.equal(await T(() => { let n = 0; for (let i = 0; i < 100; i++) if (__tma.crowd.fumble(100) !== 100) n++; return n; }), 0, 'no mistakes when rested');
assert.equal(await T(() => document.getElementById('view').style.transform), '');
const blurOf = () => T(() => document.getElementById('sleepfx-dim')?.style.backdropFilter ?? '');
assert.equal(await blurOf(), '');

// one skipped night: slower, and mistakes at the till
await T(() => { __tma.clock.cycle.skipped = 1; __tma.simulate(0.2); });
assert.equal(await T(() => __tma.player.speedMul), 0.8);
const slips = await T(() => { const a = []; for (let i = 0; i < 300; i++) a.push(__tma.crowd.fumble(100)); return a; });
const wrong = slips.filter(x => x !== 100);
assert.ok(wrong.length > 30 && wrong.length < 130, `${wrong.length} of 300 rung up wrong`);
assert.ok(wrong.every(x => x >= 70 && x <= 90), 'each short by 10-30%');
assert.equal(await blurOf(), '', 'no screen effects yet');

// a cut-short sleep is slow too, but no mistakes
await T(() => { __tma.clock.cycle.skipped = 0; __tma.clock.cycle.shortSleep = true; __tma.simulate(0.2); });
assert.equal(await T(() => __tma.player.speedMul), 0.8);
assert.equal(await T(() => { let n = 0; for (let i = 0; i < 100; i++) if (__tma.crowd.fumble(100) !== 100) n++; return n; }), 0);
await T(() => { __tma.clock.cycle.shortSleep = false; });

// two skipped nights: the screen goes wrong
await T(() => { __tma.clock.cycle.skipped = 2; __tma.simulate(1); });
assert.match(await blurOf(), /blur/);
assert.notEqual(await T(() => document.getElementById('view').style.transform), '');
assert.equal(await page.locator('#sleepfx-dim').count(), 1);
await shot('stage2');
await T(() => { __tma.clock.cycle.skipped = 0; __tma.simulate(0.2); });
assert.equal(await blurOf(), '', 'a full sleep clears the effects');
assert.equal(await T(() => document.getElementById('view').style.transform), '');

// the clock really counts a skipped night: the sleep window closes at 10 AM with no sleep in it
await T(() => { __tma.clock.cycle.t = 1440 + 9 * 60 + 59; __tma.simulate(120); });
assert.equal(await T(() => __tma.clock.cycle.skipped), 1);

// the third skipped night: a collapse
await T(() => { const p = __tma.T.personOf(__tma.world, 'Kristen'); p.met = true; p.rel = 40; });
await T(() => { const c = __tma.clock.cycle; c.skipped = 2; c.t = 2 * 1440 + 9 * 60 + 59; __tma.simulate(120); });
await page.waitForFunction(() => __tma.ui.isOpen, null, { timeout: 8000 });
for (let i = 0; i < 12 && (await T(() => __tma.ui.current?.id)) !== 'collapse'; i++) { await page.locator('.btn.primary:visible').first().click(); await page.waitForTimeout(200); }
await page.waitForSelector('#collapse-ok');
const card = await page.innerText('.panel, #panel, body');
assert.match(card, /lost a whole day/i);
assert.match(card, /Kristen/);
await shot('collapse');
await page.click('#collapse-ok');
const after = await T(() => ({
  day: __tma.st.day, date: __tma.clock.cycle.date, t: __tma.clock.cycle.t, skipped: __tma.clock.cycle.skipped, phase: __tma.st.phase, state: __tma.clock.state,
  rel: __tma.T.personOf(__tma.world, 'Kristen').rel, collapses: __tma.clock.cycle.collapses,
}));
assert.equal(after.collapses, 1);
assert.equal(after.skipped, 0);
assert.equal(after.rel, 35, 'half a heart (five points) lost');
assert.equal(after.day, after.date + 1, 'the sim has caught up with the clock');
assert.ok(after.t >= 3 * 1440 + 10 * 60 && after.t < 3 * 1440 + 10 * 60 + 5, `woke at 10 AM the next day, 24 hours later (${after.t})`);
assert.equal(after.phase, 'errands'); assert.equal(after.state, 'running');

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: skipped nights slow you, cause mistakes, warp the screen, and the third one collapses you');
