// Browser test of appraisal jobs that take up to a week (?continuous=1): a job gets a due day (never a
// closed shop day), survives sleeping, is collected unpaid at the end of its due day, pays at once when
// the report is filed early, and a lost day gives open jobs one more.
// Run: node tests/appraisal-jobs.mjs
import assert from 'node:assert/strict';
import { openGame, startNewGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame('?continuous=1');
const T = (fn, arg) => page.evaluate(fn, arg);
await startNewGame(page);
await T(() => __tma.speech.clear());
await page.waitForFunction(() => !__tma.pause.paused);

// 1. taking a job gives it a due day between 1 and 7 days out, never on a day the shop is closed
const jobs = await T(() => {
  const out = [];
  for (let i = 0; i < 40; i++) {
    const c = __tma.S.Shop.makeAppraiser(__tma.st);
    __tma.A.takeJob(__tma.st, c);
    __tma.afterTakeJob(c);
    out.push({ due: c.item.job.due, day: __tma.st.day, wd: __tma.CAL.weekdayOf(c.item.job.due) });
    __tma.st.inventory.loot = __tma.st.inventory.loot.filter(x => x !== c.item);
  }
  return out;
});
for (const j of jobs) {
  assert.ok(j.due >= j.day + 1 && j.due <= j.day + 8, `due ${j.due} on day ${j.day}`);   // 7 days, +1 when pushed off a closed day
  assert.notEqual(j.wd, 6, 'never due on a Sunday (the shop is closed Sundays)');
}
assert.ok(new Set(jobs.map(j => j.due - j.day)).size > 2, 'the owners give different lengths');

// 2. a job survives a night's sleep
await T(() => {
  const c = __tma.S.Shop.makeAppraiser(__tma.st);
  __tma.A.takeJob(__tma.st, c); __tma.afterTakeJob(c);
  c.item.job.due = __tma.st.day + 3;
  window.__job = c.item;
  __tma.clock.cycle.t = 22 * 60;
});
await T(() => __tma.continuousBed());
await page.click('#sleep-min');
await clearCards(page);
assert.equal(await T(() => __tma.st.inventory.loot.some(x => x === window.__job || x.uid === window.__job.uid)), true, 'still on the bench');
assert.equal(await T(() => __tma.st.inventory.loot.find(x => x.uid === window.__job.uid).job.due - __tma.st.day), 2);

// 3. on the due day, the end of the day takes it back unpaid
await T(() => { const j = __tma.st.inventory.loot.find(x => x.uid === window.__job.uid).job; j.due = __tma.st.day; window.__cash = __tma.st.cash; __tma.clock.cycle.t = (__tma.clock.cycle.date + 1) * 1440 - 20; __tma.simulate(40); });
const gone = await T(() => ({ onBench: __tma.st.inventory.loot.some(x => x.uid === window.__job.uid), cash: __tma.st.cash - window.__cash, news: (__tma.st.rollJobs || []).map(x => x.text) }));
assert.equal(gone.onBench, false, 'taken back at midnight');
assert.equal(gone.cash, 0, 'unpaid');
assert.match(gone.news[0], /took it back unpaid/);

// 4. the next morning's ledger carries the news
await T(() => { __tma.clock.cycle.t = (__tma.clock.cycle.date) * 1440 + 22 * 60; __tma.clock.cycle.sleptWindow = null; });
await T(() => __tma.continuousBed());
await page.click('#sleep-min');
const text = [];
for (let i = 0; i < 10 && (await T(() => __tma.ui.isOpen)); i++) { text.push(await T(() => document.body.innerText)); await page.locator('.btn.primary:visible').first().click(); await page.waitForTimeout(150); }
assert.ok(text.some(t => /took it back unpaid/.test(t)), 'the morning ledger mentions the job that was taken back');

// 5. filing early pays at once
const paid = await T(() => {
  const st = __tma.st, c = __tma.S.Shop.makeAppraiser(st);
  __tma.A.takeJob(st, c); __tma.afterTakeJob(c);
  const it = c.item, truth = __tma.S.byId(__tma.S.DATA.anomalies, it.hidden.anomalyId);
  it.draft = { alignment: truth.alignment, anomalyId: null };
  const before = st.cash, pay = __tma.S.Shop.jobPay(it.job).right;
  const r = __tma.A.fileReportNow(st, it.uid);
  return { gain: st.cash - before, pay, items: r.items.length, onBench: st.inventory.loot.some(x => x.uid === it.uid), filed: st.shop.jobs.length };
});
assert.equal(paid.gain, paid.pay, 'paid the moment the report was filed');
assert.equal(paid.items, 1); assert.equal(paid.onBench, false); assert.equal(paid.filed, 0);

// 6. a lost day (a collapse) gives open jobs one more day
const ext = await T(() => {
  const st = __tma.st, c = __tma.S.Shop.makeAppraiser(st);
  __tma.A.takeJob(st, c); c.item.job.due = st.day + 2; window.__j2 = c.item.uid; window.__due0 = c.item.job.due;
  const cy = __tma.clock.cycle; cy.skipped = 2; cy.t = (cy.date + 1) * 1440 + 9 * 60 + 59; __tma.simulate(120);
  return true;
});
await page.waitForFunction(() => __tma.ui.isOpen, null, { timeout: 8000 });
for (let i = 0; i < 12 && (await T(() => __tma.ui.current?.id)) !== 'collapse'; i++) { await page.locator('.btn.primary:visible').first().click(); await page.waitForTimeout(200); }
await page.waitForSelector('#collapse-ok');
const j2 = await T(() => ({ due: __tma.st.inventory.loot.find(x => x.uid === window.__j2)?.job.due, day: __tma.st.day }));
assert.ok(j2.due !== undefined, 'still there after the collapse');
assert.equal(j2.due, await T(() => window.__due0) + 1, 'the lost day gave the job one more day');

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: appraisal jobs get a due day, survive sleep, pay on early filing, and are collected unpaid when overdue');
