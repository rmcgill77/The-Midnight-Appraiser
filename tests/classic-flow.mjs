// Browser test of the normal game (no switch): a new game still starts at the morning card, the
// clock is the old one, and the front door still offers the shop-or-city choice.
// Run: node tests/classic-flow.mjs
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

const { page, problems, close } = await openGame();
await page.click('#new-game');
await page.click('#season-ok');
await page.click('#look-ok');
await page.locator('[id^="bg-"]:not(#bg-ok)').first().click();
await page.click('#bg-ok');
await page.fill('#owner-name', 'Tester');
await page.click('#name-ok');
for (let i = 0; i < 12 && !(await page.locator('#ride-ok').count()); i++) await page.click('#story-next');
await page.click('#ride-ok');
await page.click('#skip-walkthrough');
await page.waitForSelector('#get-up');
const s = await page.evaluate(() => ({ cur: __tma.ui.current?.id, phase: __tma.st.phase, cont: !!__tma.clock.cycle, state: __tma.clock.state }));
assert.equal(s.cur, 'morning'); assert.equal(s.phase, 'morning'); assert.equal(s.cont, false); assert.equal(s.state, 'stopped');
await page.click('#get-up');
await page.evaluate(() => __tma.openHomeDoor());
await page.waitForSelector('#choose-shop');
assert.equal(await page.locator('#choose-city').count(), 1);
// The appraisal settling the normal game uses at bedtime still works after being split in two:
// a filed report is paid, an unfiled one is taken back unpaid, and the day report gets both lines.
const settled = await page.evaluate(() => {
  const st = __tma.st, S = __tma.S;
  const filed = S.Shop.makeAppraiser(st), open = S.Shop.makeAppraiser(st);
  __tma.A.takeJob(st, filed); __tma.A.takeJob(st, open);
  const truth = S.byId(S.DATA.anomalies, filed.item.hidden.anomalyId);
  filed.item.draft = { alignment: truth.alignment, anomalyId: null };
  __tma.A.fileReport(st, filed.item.uid);
  const cash0 = st.cash, appraisals0 = st.counters.appraisals || 0, r = { items: [], rep: {} };
  const fees = S.Shop.settleJobs(st, r);
  return { fees, gain: st.cash - cash0, pay: S.Shop.jobPay(filed.item.job).right, rFees: r.fees, items: r.items.map(i => i.kind), left: st.inventory.loot.filter(x => x.job).length, filedLeft: st.shop.jobs.length, count: (st.counters.appraisals || 0) - appraisals0 };
});
assert.equal(settled.fees, settled.pay); assert.equal(settled.gain, settled.pay); assert.equal(settled.rFees, settled.pay);
assert.deepEqual(settled.items, ['ok', 'bad']);
assert.equal(settled.left, 0); assert.equal(settled.filedLeft, 0); assert.equal(settled.count, 1);
await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: the normal game still opens on the morning card and offers the shop-or-city choice');
