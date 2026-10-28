// Small pixel glyphs drawn straight onto the canvas: item shapes on display
// cases, and the thought icons customers show above their heads.

import { baseOf, iconRects, iconPath } from '../rules/index.js';

const ALIGN_COLOR = { inert: '#c9c2b0', enchanted: '#a98be0', cursed: '#d0584e' };
export const alignColor = a => ALIGN_COLOR[a] ?? '#e0a64a';

// Draw an item's 16x16 icon at half size (each 2x2 block that has ink becomes one pixel),
// small enough to sit inside a display case.
const halfCache = new Map();
export function drawItem(ctx, it, x, y, color = '#ddd5c1') {
  const name = baseOf(it)?.icon;
  let cells = halfCache.get(name);
  if (!cells) {
    const on = new Set();
    for (const [rx, ry, w] of iconRects(name)) for (let i = 0; i < w; i++) on.add(`${(rx + i) >> 1},${ry >> 1}`);
    cells = [...on].map(k => k.split(',').map(Number));
    halfCache.set(name, cells);
  }
  ctx.fillStyle = '#07080c';
  for (const [cx, cy] of cells) ctx.fillRect(x + cx, y + cy + 1, 1, 1);
  ctx.fillStyle = color;
  for (const [cx, cy] of cells) ctx.fillRect(x + cx, y + cy, 1, 1);
}

// Crisp inline SVG of any original pixel icon, for panels.
export function iconSvg(name, cls = 'px-icon') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('class', cls); svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', iconPath(name)); path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

export function itemArt(it, cls = 'item-art') {
  const box = document.createElement('span');
  box.className = cls;
  box.append(iconSvg(baseOf(it)?.icon));
  return box;
}

// 7x7 icons inside a speech bubble. k = ink, a = accent.
const ICONS = {
  music:     { a: '#e0a64a', rows: ['...aaaa', '...a..a', '...a..a', '...a..a', '.aaa.aa', 'aaaa.aa', '.aa....'] },
  alert:     { a: '#e0a64a', rows: ['...a...', '..aaa..', '..aaa..', '..aaa..', '...a...', '.......', '...a...'] },
  deal:      { a: '#e0a64a', rows: ['...a...', '...a...', '...a...', '...a...', '...a...', '.......', '...a...'] },
  pay:       { a: '#9fd08a', rows: ['...a...', '.aaaaa.', 'a..a...', '.aaaaa.', '...a..a', '.aaaaa.', '...a...'] },
  browse:    { a: '#8d93a6', rows: ['.......', '.......', '.......', 'a..a..a', '.......', '.......', '.......'] },
  delighted: { a: '#e86a7a', rows: ['.......', '.aa.aa.', 'aaaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'] },
  content:   { a: '#9fd08a', rows: ['.......', '.a...a.', '.......', '.......', 'a.....a', '.aaaaa.', '.......'] },
  hesitant:  { a: '#e0a64a', rows: ['..aaa..', '.a...a.', '.....a.', '...aa..', '...a...', '.......', '...a...'] },
  offended:  { a: '#d0584e', rows: ['a.....a', '.a...a.', '..a.a..', '...a...', '..a.a..', '.a...a.', 'a.....a'] },
  ask:       { a: '#a98be0', rows: ['..aaa..', '.a...a.', '.....a.', '...aa..', '...a...', '.......', '...a...'] },
  inspect:   { a: '#ddd5c1', rows: ['.aaa...', 'a...a..', 'a...a..', 'a...a..', '.aaa...', '....aa.', '.....aa'] },
  angry:     { a: '#d0584e', rows: ['.a...a.', '..a.a..', '.......', '.......', '.aaaaa.', 'a.....a', '.......'] },
};

export function drawBubble(ctx, kind, cx, top) {
  const ic = ICONS[kind]; if (!ic) return;
  const x = Math.round(cx - 5), y = Math.round(top - 11);
  ctx.fillStyle = '#07080c'; ctx.fillRect(x, y, 11, 10); ctx.fillRect(x + 4, y + 10, 3, 1);
  ctx.fillStyle = '#ddd5c1'; ctx.fillRect(x + 1, y + 1, 9, 8); ctx.fillRect(x + 5, y + 9, 1, 1);
  ctx.fillStyle = '#13151d'; ctx.fillRect(x + 1, y + 1, 9, 8);
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    if (ic.rows[r][c] !== 'a') continue;
    ctx.fillStyle = ic.a; ctx.fillRect(x + 2 + c, y + 1 + r, 1, 1);
  }
}

export function drawPatience(ctx, cx, top, frac) {
  const x = Math.round(cx - 6), y = Math.round(top - 14);
  ctx.fillStyle = '#07080c'; ctx.fillRect(x, y, 12, 3);
  ctx.fillStyle = frac > 0.5 ? '#9fd08a' : frac > 0.25 ? '#e0a64a' : '#d0584e';
  ctx.fillRect(x + 1, y + 1, Math.max(1, Math.round(10 * frac)), 1);
}
