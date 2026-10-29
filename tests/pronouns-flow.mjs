// Browser test: pick she/her in the creator; NPC lines with {they} tokens come out as "she".
// Run: node tests/pronouns-flow.mjs
import assert from 'node:assert/strict';
import { openGame, clearCards } from './helpers.mjs';

const { page, problems, close } = await openGame();
await page.click('#new-game');
await page.click('#season-ok');
assert.equal(await page.innerText('#val-pronouns'), 'They/them');
await page.click('#next-pronouns');
assert.equal(await page.innerText('#val-pronouns'), 'She/her');
await page.click('#look-ok');
await page.locator('[id^="bg-"]:not(#bg-ok)').first().click();
await page.click('#bg-ok');
await page.fill('#owner-name', 'Tester');
await page.click('#name-ok');
for (let i = 0; i < 12 && !(await page.locator('#ride-ok').count()); i++) await page.click('#story-next');
await page.click('#ride-ok');
await page.click('#skip-walkthrough');
await page.waitForFunction(() => globalThis.__tma?.st, null, { timeout: 8000 });
await clearCards(page);
const text = await page.evaluate(async () => {
  const { speech } = __tma;
  speech.say('{They} {are} late; ask {them} about {their} coat.', { who: 'Mina' });
  return speech.cur?.text;
});
assert.equal(text, 'she is late; ask her about her coat.'.replace(/^s/, 'S'));
assert.deepEqual(problems, []);
await close();
console.log('pronouns-flow ok');
