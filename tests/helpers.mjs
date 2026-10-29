// Shared bits for the browser tests: a tiny static server and a headless Chromium page that
// collects page errors. Used by tests/continuous-flow.mjs.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

export async function serve() {
  const server = createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    try {
      const file = path === '/' ? 'index.html' : path;
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(await readFile(join(ROOT, file)));
    } catch { res.writeHead(404).end('not found'); }
  });
  await new Promise(r => server.listen(0, r));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

export async function openGame(query = '') {
  const srv = await serve();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const problems = [];
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.g|favicon|ERR_/.test(m.text())) problems.push(`console: ${m.text()}`); });
  await page.goto(srv.url + query, { waitUntil: 'load' });
  return { page, problems, close: async () => { await browser.close(); srv.close(); } };
}

// From the title screen to a new game with the walkthrough skipped.
export async function startNewGame(page) {
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
  await page.waitForFunction(() => globalThis.__tma?.st && !globalThis.__tma.ui.isOpen, null, { timeout: 8000 });
}

// Click through whatever cards are open (the morning ledger, a letter, ...) until the game is clear.
export async function clearCards(page, max = 12) {
  for (let i = 0; i < max && await page.evaluate(() => __tma.ui.isOpen); i++) {
    await page.locator('.btn.primary:visible').first().click();
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => !__tma.ui.isOpen, null, { timeout: 5000 });
}
