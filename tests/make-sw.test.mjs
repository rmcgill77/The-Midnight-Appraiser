// Tests for the service-worker updater. Run from the repo root: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { build, listFiles } from '../scripts/make-sw.mjs';

test('the offline file list covers the game and nothing else', () => {
  const files = listFiles();
  for (const f of ['index.html', 'manifest.webmanifest', 'privacy.html', 'src/main.js', 'src/game/daycycle.js', 'shared/js/shop.js', 'icons/icon-512.png']) assert.ok(files.includes(f), f);
  assert.ok(files.every(f => !/^(tests|scripts|\.github|node_modules)\//.test(f)), 'no tests, scripts or workflows');
  assert.ok(files.every(f => !f.endsWith('.zip') && !f.endsWith('.mjs') && !f.endsWith('.py')));
  assert.deepEqual([...files].sort(), files, 'sorted, so the cache name is stable');
});

test('the rebuilt sw.js has a versioned cache name, the file list, and keeps the rest', () => {
  const { sw, cache, count } = build();
  assert.match(cache, /^tma-\d+\.\d+\.\d+-[0-9a-f]{10}$/);
  assert.ok(sw.includes(`const CACHE = "${cache}";`));
  assert.ok(sw.includes('"src/game/daycycle.js"') && sw.includes('"./"'));
  assert.ok(count > 100);
  assert.ok(sw.includes("addEventListener('install'") && sw.includes("addEventListener('fetch'"), 'the worker itself is untouched');
  assert.equal(build().cache, cache, 'the same files give the same name');
});
