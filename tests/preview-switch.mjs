// Browser test of the way into the preview (the new day and night) and back, from the title screen.
// Run: node tests/preview-switch.mjs
import assert from 'node:assert/strict';
import { openGame } from './helpers.mjs';

const { page, problems, close } = await openGame();
await page.waitForSelector('#try-new-day');
assert.equal(await page.locator('#preview-note').count(), 0, 'the normal title has no preview note');
assert.doesNotMatch(await page.innerText('body'), /· preview/i, 'the normal title is not marked as the preview');
await page.click('#try-new-day');
await page.waitForURL(/\?continuous=1/);
await page.waitForSelector('#back-to-normal');
assert.match(await page.innerText('#preview-note'), /its own saves/);
assert.match(await page.innerText('body'), /· preview/i, 'the version line says preview');
assert.equal(await page.locator('#try-new-day').count(), 0);
await page.click('#back-to-normal');
await page.waitForFunction(() => !location.search.includes('continuous'));
await page.waitForSelector('#try-new-day');
assert.equal(await page.locator('#preview-note').count(), 0);

await close();
if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: the title offers the preview, marks it clearly, and takes you back');
