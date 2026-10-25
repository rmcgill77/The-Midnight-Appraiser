// Hand-made art over code-drawn art (v2.1). loadArt() reads the list in data/art.js once,
// before the maps are built; after that, anything with a picture uses it and everything else
// keeps its code-drawn look. Nothing here is required: an empty list changes nothing.

import { makeCanvas } from './sprites.js';
import { TILE_NAMES } from '../data/art.js';

const images = new Map();            // 'tiles/city/grass' → image
export const problems = [];          // files that couldn't be loaded, for god mode and tests

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`couldn't load ${src}`));
    img.src = src;
  });
}

// Load every picture listed. Never throws: a picture that fails is noted and skipped.
export async function loadArt(manifest, { base = 'assets/', load = loadImage } = {}) {
  const jobs = [];
  for (const [kind, list] of Object.entries(manifest ?? {})) for (const [key, path] of Object.entries(list ?? {})) {
    jobs.push(load(base + path).then(img => images.set(`${kind}/${key}`, img), err => problems.push(`${kind}/${key}: ${err.message}`)));
  }
  await Promise.all(jobs);
  return images.size;
}

export const artImage = key => images.get(key) ?? null;
export const setArt = (key, img) => (img ? images.set(key, img) : images.delete(key));
export const artCount = () => images.size;
export const clearArt = () => { images.clear(); problems.length = 0; };

// Cut an image into w x h cells, left to right (one row), as canvases.
export function cells(img, w, h, row = 0) {
  const out = [], n = Math.floor((img.width ?? 0) / w);
  for (let i = 0; i < n; i++) {
    const cv = makeCanvas(w, h), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, i * w, row * h, w, h, 0, 0, w, h);
    out.push(cv);
  }
  return out;
}

// ---------- tiles ----------

// Put hand-made tiles into a built tile set (in place). set: 'city' or 'base'; season: today's,
// for seasonal pictures.
// Returns the names that were swapped.
export function applyTileArt(ts, set, season = null) {
  const names = TILE_NAMES[set] ?? {}, done = [];
  // v2.2: a picture for this season ('grass-winter') wins over the all-year one ('grass').
  const pic = name => (season && artImage(`tiles/${set}/${name}-${season}`)) || artImage(`tiles/${set}/${name}`);
  if (set === 'base') {
    const f = pic(names.floor); if (f) { ts.floors = cells(f, 16, 16); done.push('floor'); }
    const t = pic(names.wallTop); if (t) { ts.wallTop = cells(t, 16, 16)[0]; done.push('wall-top'); }
    const w = pic(names.wallFace); if (w) { const c = cells(w, 16, 16); ts.wallFace = c[0]; if (c.length > 1) ts.wallFaces = c; done.push('wall-face'); }
    for (const ch of ['c']) { const p = pic(names[ch]); if (p && ts.defs[ch]) { ts.defs[ch].prop = cells(p, 16, 16)[0]; done.push(names[ch]); } }
    return done;
  }
  const swapped = new Map();   // old art → new, so tiles standing on it (a tree on grass) get the new ground too
  for (const [ch, name] of Object.entries(names)) {
    const p = pic(name), d = ts.defs?.[ch];
    if (!p || !d) continue;
    const c = cells(p, 16, 16);
    if (!c.length) continue;
    const art = c.length === 1 ? c[0] : c;
    if (d.art) swapped.set(d.art, art);
    d.art = art;
    done.push(name);
  }
  for (const d of Object.values(ts.defs ?? {})) if (d.ground && swapped.has(d.ground)) d.ground = swapped.get(d.ground);
  if (ts.floors && swapped.has(ts.floors)) ts.floors = [].concat(swapped.get(ts.floors));
  for (const [ch, tall] of Object.entries(TILE_NAMES[`${set}Tall`] ?? {})) {
    const p = pic(tall.name), d = ts.defs?.[ch];
    if (!p || !d?.over) continue;
    const c = cells(p, tall.size[0], tall.size[1]);
    if (c.length) { d.over = { ...d.over, img: c.length === 1 ? c[0] : c }; done.push(tall.name); }
  }
  return done;
}

// ---------- people ----------

const FACE_ROW = { down: 0, up: 1, left: 2, right: 3 };

// A person's frames from a hand-made sheet, with their code-drawn set (`fallback`) for any
// pose the sheet doesn't have (appraising, knocked out). Same shape as HDSprites.
export class SheetSprites {
  constructor(img, fallback = null) {
    this.img = img; this.fallback = fallback; this.cache = new Map();
    this.rows = Math.floor((img.height ?? 0) / 32);
    this.cols = Math.max(1, Math.floor((img.width ?? 0) / 24));
    this.hasLeft = this.rows >= 4;
    this.hasIdle = this.rows >= 8;
  }
  #cell(row, col, flip = false) {
    const k = `${row}:${col}:${flip ? 1 : 0}`;
    let c = this.cache.get(k);
    if (c) return c;
    c = makeCanvas(24, 32);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    if (flip) { g.translate(24, 0); g.scale(-1, 1); }
    g.drawImage(this.img, (col % this.cols) * 24, row * 32, 24, 32, 0, 0, 24, 32);
    this.cache.set(k, c);
    return c;
  }
  get(pose, facing, frame = 0) {
    if ((pose === 'appraise' || pose === 'ko') && this.fallback) return this.fallback.get(pose, facing, frame);
    const left = facing === 'left' && !this.hasLeft;
    // A three-row sheet is down, up, right; its left is the right row, mirrored.
    const base = !this.hasLeft && (facing === 'left' || facing === 'right') ? 2 : FACE_ROW[facing] ?? 0;
    if (pose === 'idle') return this.hasIdle ? this.#cell(4 + base, frame % 2, left) : this.#cell(base, 0, left);
    return this.#cell(base, frame % 4, left);   // walk and carry
  }
  warm() { return this; }
}

// A portrait from a hand-made 48x48 picture, drawn onto a canvas.
export function drawPortraitArt(cv, img) {
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, cv.width, cv.height);
  g.drawImage(img, 0, 0, cv.width, cv.height);
}
