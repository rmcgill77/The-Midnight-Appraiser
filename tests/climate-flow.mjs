// Browser test of the changing weather (?continuous=1): the game's weather is the climate at this moment
// (so it changes through the day), the per-day answer is the climate at midday, and the HUD shows the
// temperature. The normal game keeps its one-weather-a-day forecast.
// Run: node tests/climate-flow.mjs
import assert from 'node:assert/strict';
import { openGame, startNewGame } from './helpers.mjs';
import { typeAt, dayType, sample } from '../src/game/climate.js';

const { page, problems, close } = await openGame('?continuous=1');
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
await T(() => __tma.speech.clear());
await page.waitForFunction(() => !__tma.pause.paused);

const seed = await T(() => __tma.st.seed ?? 0);
const month = date => T(d => { const x = __tma.CAL.dateOf(d + 1); return x.m + (x.d - 1) / 31; }, date);

// 1. the game's weather is the climate at that moment, every few hours for a week
const seen = new Set(); let checked = 0;
for (let date = 0; date < 8; date++) {
  const m = await month(date);
  for (let h = 0; h < 24; h += 3) {
    const t = date * 1440 + h * 60;
    const got = await T(t => { __tma.clock.cycle.t = t; return __tma.weather; }, t);
    assert.equal(got, typeAt(seed, t, { month: m }), `day ${date} ${h}:00`);
    seen.add(got); checked++;
  }
}
assert.equal(checked, 64);
assert.ok(seen.size >= 2, `the weather changed over the week (${[...seen].join(', ')})`);

// 2. the per-day answer (shops shut for a storm, tomorrow's forecast) is the climate at midday
for (const day of [2, 3, 5, 8]) {
  const expected = dayType(seed, day - 1, { month: await month(day - 1) });
  assert.equal(await T(d => __tma.weatherOn(d), day), expected, `day ${day}`);
}

// 3. the HUD icon tells the temperature
await T(() => { __tma.clock.cycle.t = 2 * 1440 + 15 * 60; });
await page.waitForTimeout(500);                      // the HUD is redrawn with the frame
const title = await T(() => document.querySelector('.clock-wx')?.title ?? document.querySelector('[class*="clock-wx"]')?.getAttribute('title'));
const temp = Math.round(sample(seed, 2 * 1440 + 15 * 60, { month: await month(2) }).temp);
assert.match(title ?? '', new RegExp(`${temp}°C`), `HUD says ${title}`);

// 4. a weather override (the test hook) still wins
await T(() => __tma.setWeather('storm'));
assert.equal(await T(() => __tma.weather), 'storm');
await T(() => __tma.setWeather(null));

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: the weather is the climate at this moment, changes through the day, and the HUD shows the temperature');
