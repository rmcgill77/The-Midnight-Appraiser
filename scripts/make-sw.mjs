// Rewrites sw.js for a deploy: the list of files the offline copy keeps, and a cache name that changes
// whenever any of them does, so a changed game always reaches players (the service worker only updates
// when sw.js itself changes). Run from the repo root: node scripts/make-sw.mjs
// The Pages workflow runs this before it stages the site.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = process.cwd();
const TOP = ['index.html', 'manifest.webmanifest', 'privacy.html'];
const DIRS = ['icons', 'shared', 'src', 'assets'];

function walk(dir) {
  let out = [];
  let names = [];
  try { names = readdirSync(join(ROOT, dir)); } catch { return out; }
  for (const n of names.sort()) {
    const rel = `${dir}/${n}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out = out.concat(walk(rel));
    else out.push(rel);
  }
  return out;
}

export function listFiles() {
  return [...DIRS.flatMap(walk), ...TOP].sort();
}

export function build() {
  const files = listFiles();
  const hash = createHash('sha1');
  for (const f of files) { hash.update(f); hash.update(readFileSync(join(ROOT, f))); }
  const version = /version:\s*'([^']+)'/.exec(readFileSync(join(ROOT, 'src/config.js'), 'utf8'))?.[1] ?? '0';
  const cache = `tma-${version}-${hash.digest('hex').slice(0, 10)}`;
  let sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  sw = sw.replace(/const CACHE = "[^"]*";/, `const CACHE = ${JSON.stringify(cache)};`);
  sw = sw.replace(/const FILES = \[[^\]]*\];/, `const FILES = ${JSON.stringify(['./', ...files])};`);
  return { sw, cache, count: files.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { sw, cache, count } = build();
  writeFileSync(join(ROOT, 'sw.js'), sw);
  console.log(`sw.js: ${count} files, cache ${cache}`);
}
