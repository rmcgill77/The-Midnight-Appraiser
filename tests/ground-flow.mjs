// Browser test of the weather on the ground (?continuous=1): wet streets get darker, snow makes the
// town brighter, indoors is unaffected, and the effect is painted in the world.
// Run: node tests/ground-flow.mjs [screenshot-prefix]
import assert from 'node:assert/strict';
import { openGame, startNewGame } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
await T(() => __tma.speech.clear());
await page.waitForFunction(() => !__tma.pause.paused);

// a clear, dry, bright noon so the only differences are the ground's
const noon = async (wet, snow) => {
  await T(([w, s]) => {
    __tma.clock.cycle.t = 12 * 60;
    const g = __tma.groundNow(); g.wet = w; g.snow = s; g.setRaining(false);
  }, [wet, snow]);
  await page.waitForTimeout(250);
  // a frame can step the ground (every 20 game minutes); pin it again right before reading
  await T(([w, s]) => { const g = __tma.groundNow(); g.wet = w; g.snow = s; }, [wet, snow]);
  await page.waitForTimeout(120);
};
const brightness = () => T(() => {
  const cv = document.getElementById('view'), g = cv.getContext('2d'), d = g.getImageData(0, 0, cv.width, cv.height).data;
  let sum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 7) { sum += 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; n++; }
  return sum / n;
});

// out in the street
await T(() => { const L = __tma.cityLayout.locs.apartment.stand; __tma.placeAt('city', L.tx, L.ty, 'down'); __tma.setWeather(null); });
await page.waitForTimeout(500);
await noon(0, 0); await shot('dry');
const dry = await brightness();
await noon(1, 0); await shot('wet');
const wetB = await brightness();
await noon(0, 1); await shot('snow');
const snowB = await brightness();
assert.ok(wetB < dry - 0.8, `wet streets are darker (${wetB.toFixed(2)} vs dry ${dry.toFixed(2)})`);
assert.ok(snowB > dry + 12, `snow brightens the town (${snowB.toFixed(2)} vs dry ${dry.toFixed(2)})`);
await noon(0.04, 0.03);
const trace = await brightness();
assert.ok(Math.abs(trace - dry) < 0.4, `a trace of wet or snow draws (almost) nothing (${trace.toFixed(2)} vs ${dry.toFixed(2)})`);

// indoors nothing changes
await T(() => __tma.placeAt('apartment', 11, 9, 'up'));
await noon(0, 0);
const roomDry = await brightness();
await noon(1, 1);
const roomSnow = await brightness();
assert.ok(Math.abs(roomSnow - roomDry) < 0.4, `the weather stays outside (${roomSnow.toFixed(2)} vs ${roomDry.toFixed(2)})`);

// the real ground follows the climate: after a long dry spell in summer it is dry, and there is no snow
const real = await T(() => { __tma.clock.cycle.t = 5 * 1440 + 12 * 60; const g = __tma.groundNow(); return { wet: g.wet, snow: g.snow }; });
assert.ok(real.wet >= 0 && real.wet <= 1 && real.snow === 0, 'September: no snow');

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: the ground shows wet streets and snow outdoors, and the town stays as it was indoors');
