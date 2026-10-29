// Browser test of the weather panel (?continuous=1): tapping the weather icon shows the conditions and
// the outlook, in Celsius or Fahrenheit by the setting.
// Run: node tests/weather-panel.mjs [screenshot-prefix]
import assert from 'node:assert/strict';
import { openGame, startNewGame } from './helpers.mjs';
import { forecastView } from '../src/game/forecast.js';

const { page, problems, close } = await openGame('?continuous=1');
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
await T(() => __tma.speech.clear());
await page.waitForFunction(() => !__tma.pause.paused);
const seed = await T(() => __tma.st.seed ?? 0);

// a mid-afternoon on day 3
const t = 2 * 1440 + 15 * 60;
await T(t => { __tma.clock.cycle.t = t; __tma.settings.tempUnit = 'c'; }, t);
await page.waitForTimeout(400);                       // a frame draws the HUD
const month = await T(d => { const x = __tma.CAL.dateOf(d + 1); return x.m + (x.d - 1) / 31; }, 2);

// tapping the icon opens the panel
await page.click('#clock-wx');
await page.waitForSelector('#wx-now');
await shot('panel');
const v = forecastView(seed, t, { month }, 'c');
assert.match(await page.innerText('#wx-now'), new RegExp(v.temp.replace('°', '°')));
assert.equal((await page.innerText('#wx-wind')).trim(), v.wind);
assert.match(await page.innerText('#wx-pressure'), new RegExp(v.pressure));
assert.equal(await page.locator('#wx-outlook li').count(), 4, 'four outlook rows');
assert.match(await page.innerText('#wx-outlook'), /In 3 hours/); assert.match(await page.innerText('#wx-outlook'), /In 24 hours/);
assert.equal((await page.innerText('#wx-summary')).trim(), v.summary);
await page.getByRole('button', { name: 'Close', exact: true }).click();

// Fahrenheit
await T(() => { __tma.settings.tempUnit = 'f'; });
await page.waitForTimeout(300);
await page.click('#clock-wx');
await page.waitForSelector('#wx-now');
const f = forecastView(seed, t, { month }, 'f');
assert.match(await page.innerText('#wx-now'), /°F/);
assert.equal((await page.innerText('#wx-wind')).trim(), f.wind);
assert.match(await page.locator('#clock-wx').getAttribute('title'), /°F/, 'the HUD tooltip follows the unit');
await page.getByRole('button', { name: 'Close', exact: true }).click();

// the setting is in Settings (Screen tab) and changes the unit
await T(() => { __tma.settings.tempUnit = 'c'; __tma.openSettings('screen'); });
await page.waitForSelector('#set-temp-f');
assert.equal(await page.locator('#set-temp-c').getAttribute('aria-checked'), 'true');
await page.click('#set-temp-f');
assert.equal(await T(() => __tma.settings.tempUnit), 'f');
await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: the weather panel shows the conditions and outlook, in the unit the player picked');
