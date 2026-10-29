// Browser test: with an old save in storage and the version cutoff raised, the title screen
// explains it, the slot list offers Export and Delete but no Load, and New game still works.
// Run: node tests/old-saves.mjs [screenshot-prefix]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  try {
    const file = path === '/' ? 'index.html' : path;
    let body = await readFile(join(ROOT, file));
    // Pretend a later version has shipped: every save older than this one is "old".
    if (file === '/src/game/save.js') body = Buffer.from(String(body).replace('export const FIRST_SUPPORTED = 6;', 'export const FIRST_SUPPORTED = 99;'));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const problems = [];
page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|favicon|ERR_/.test(m.text())) problems.push(`console: ${m.text()}`); });
await page.addInitScript(() => { try { if (!localStorage.getItem('seeded')) { localStorage.setItem('tma.save.1', JSON.stringify({ version: 5, sim: { cash: 1 }, savedAt: 1 })); localStorage.setItem('seeded', '1'); } } catch {} });
const shot = async n => { if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}-${n}.png` }); };

await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('#old-saves-note', { timeout: 8000 });
const note = await page.innerText('#old-saves-note');
assert.match(note, /older version/);
assert.equal(await page.locator('#continue').count(), 0, 'no Continue button for an old save');
await shot('title');

await page.click('#title-load');                               // Manage saves
await page.waitForSelector('#export-1');
assert.equal(await page.locator('#slot-1').isDisabled(), true, 'Load is disabled for an old save');
assert.equal(await page.locator('#delete-1').count(), 1);
assert.match(await page.innerText('.slots'), /older version/);
await shot('slots');

await page.getByRole('button', { name: 'Back', exact: true }).click();
await page.click('#new-game');                                 // a new game still starts
await page.waitForTimeout(1500);
await browser.close(); server.close();

if (problems.length) { console.error('FAIL\n' + problems.join('\n')); process.exit(1); }
console.log('OK: old saves are explained, can be exported or deleted, and cannot be loaded');
