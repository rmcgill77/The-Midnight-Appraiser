// Browser test of shop traffic and floor pricing (?continuous=1): arrivals follow the shift and the
// time of day, a short shift brings fewer people, and prices can be changed on the shop floor.
// Run: node tests/shop-traffic.mjs [screenshot-prefix]
import assert from 'node:assert/strict';
import { openGame, startNewGame } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
await T(() => __tma.speech.clear());
await page.waitForFunction(() => !__tma.pause.paused);

// 1. open at 10 AM for the full eight hours: the hooks see a full shift
await T(() => { __tma.clock.cycle.t = 10 * 60; __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard(); });
await page.click('#open-shop');
const hooks = () => T(() => {
  const w = __tma.crowd.world, rng = { next: Math.random };
  const lunch = [], mid = [];
  const times = w.arrivals(600, () => Math.random());
  for (const p of times) { const m = 10 * 60 + p * 8 * 60; if (m >= 12 * 60 && m < 13.5 * 60) lunch.push(p); else if (m >= 10 * 60 && m < 12 * 60) mid.push(p); }
  return { scale: w.hoursScale(), n: times.length, sorted: times.every((x, i) => !i || x >= times[i - 1]), inside: times.every(x => x >= 0 && x <= 0.97), lunchPerHour: lunch.length / 1.5, midPerHour: mid.length / 2 };
});
let h = await hooks();
assert.equal(h.scale, 1, 'a full shift brings the full crowd');
assert.equal(h.n, 600); assert.ok(h.sorted && h.inside);
assert.ok(h.lunchPerHour > h.midPerHour * 1.3, `lunch (${h.lunchPerHour}/h) is busier than mid-morning (${h.midPerHour}/h)`);
await T(() => __tma.simulate(0.2));
const plan = await T(() => __tma.crowd.plan.map(p => p.at));
assert.ok(plan.length >= 1 && plan.every(x => x >= 0 && x <= 0.97), 'the day was planned');
await T(() => __tma.endShopSession('early'));
await page.click('#lock-up');

// 2. opening late (two hours before closing) brings a quarter of the crowd
await T(() => { __tma.world.shopClosedDate = null; const d = __tma.clock.cycle.date; __tma.clock.cycle.t = (d + 1) * 1440 + 16 * 60; __tma.placeAt('shop', 11, 11, 'up'); __tma.shopSignCard(); });
await page.click('#open-shop');
h = await hooks();
assert.equal(h.scale, 0.25, 'two hours of an eight-hour shift');
await T(() => __tma.endShopSession('early'));
await page.click('#lock-up');

// 3. prices on the shop floor
await T(() => {
  const st = __tma.st, it = __tma.S.Items.generate(st, {});
  const truth = __tma.S.byId(__tma.S.DATA.anomalies, it.hidden.anomalyId);
  it.appraisal = { alignment: truth.alignment, anomalyId: truth.id, price: 0, day: st.day, tests: 0 };
  it.price = __tma.A.shelfSuggest(st, it);
  it.appraisal.price = it.price;
  st.inventory.stock.push(it); __tma.world.displays['3,4'] = it.uid; window.__it = it.uid;
});
await T(() => __tma.openDisplay('3,4'));
await page.waitForSelector('#shelf-price');
await shot('price');
const sug = await T(() => __tma.A.shelfSuggest(__tma.st, __tma.st.stock?.[0] ?? __tma.st.inventory.stock.find(x => x.uid === window.__it)));
const priceOf = () => T(() => __tma.st.inventory.stock.find(x => x.uid === window.__it).price);
const step = Math.max(1, Math.round(sug * 0.1));
assert.equal(await priceOf(), sug);
assert.match(await page.innerText('#shelf-price-read'), /Fair/);
await page.click('#price-up');
assert.equal(await priceOf(), sug + step);
assert.equal(await T(() => __tma.st.inventory.stock.find(x => x.uid === window.__it).appraisal.price), sug + step, 'the tag follows');
await page.click('#price-up'); await page.click('#price-up'); await page.click('#price-up'); await page.click('#price-up');
assert.match(await page.innerText('#shelf-price-read'), /Steep|Too dear/);
await page.click('#price-reset');
assert.equal(await priceOf(), sug);
await page.click('#price-down'); await page.click('#price-down');
assert.equal(await priceOf(), sug - 2 * step);
assert.match(await page.innerText('#shelf-price-read'), /Fair|Cheap/);
for (let i = 0; i < 30; i++) await page.click('#price-down');
assert.equal(await priceOf(), Math.max(1, Math.round(sug * 0.5)), 'no lower than half the suggested price');
for (let i = 0; i < 60; i++) await page.click('#price-up');
assert.equal(await priceOf(), Math.round(sug * 2.5), 'no higher than two and a half times it');
assert.match(await page.innerText('#shelf-price-read'), /Too dear/);

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: traffic follows the shift and the time of day, and prices can be changed on the shop floor');
