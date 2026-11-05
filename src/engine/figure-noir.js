// Phase 34: the noir figure. Same looks, same 24x32 frame and the same feet (column 12, row 30)
// as figure-hd.js, drawn in the style of the noir mockup the owner approved:
//   - adult proportions: an 8-pixel head on a longer body (the old figure is a big-headed one);
//   - each material shaded across its own width, lit from the upper left, in four tones
//     (light, base, dark, deep) that lean warm in the light and cool in the shadow;
//   - a dark seam wherever a part sits in front of another (arms over the coat, the coat over the legs);
//   - the dark outline tinted by whatever it touches.
// 34a is the body and clothes. Heads use stand-in hair and hats until 34b draws each style.
// Left is right, mirrored, after painting (the light stays on the same side, as before).

import { makeLayer, mix } from './figure-hd.js';
import { PARTS, SKINS, HAIR_COLORS, CLOTH, EYE_COLORS, shade } from './figure.js';

const W = 24, H = 32;
const INK = '#0b0a10', SHIRT = '#d8d0bc', WHITE = '#efe8d8', GOLD = '#e0a64a', SILVER = '#d4d6dc', LENS = '#9fc6d6',
  SACK = '#7a6446', SHOE = '#2a201c', STRAP = '#4a3220', EYE = '#221418', EYE_W = '#e0d8cc';
const RIBBONS = ['#b8322e', '#e6c24a', '#2f5fa8'];

// ---------- colour ----------

// deep, dark, base, light: shadows lean cool (violet), light leans warm.
export const noirRamp = hex => [mix(shade(hex, 0.42), '#1c1228', 0.3), mix(shade(hex, 0.7), '#2c2238', 0.14), hex, mix(shade(hex, 1.2), '#f2dcae', 0.1)];

const SHOE_OF = (style, skin) => [SHOE, '#4a3020', '#e8e8ee', '#a8283a', shade(skin, 0.88), '#3a7a4a', shade(skin, 0.94)][style ?? 0] ?? SHOE;

function palette(look) {
  const skin = SKINS[look.skin], hair = HAIR_COLORS[look.hairColor], hat = CLOTH[look.hatColor], top = CLOTH[look.topColor];
  const bot = CLOTH[look.bottomColor], ex = CLOTH[look.extraColor], neck = CLOTH[look.neckColor];
  const topName = PARTS.top[look.top];
  const extras = [PARTS.extra[look.extra], PARTS.extra[look.extra2 ?? 0]];
  const gloves = extras.includes('Gloves') || extras.includes('Fingerless gloves');
  const shirtLike = ['Shirtsleeves', 'Uniform shirt'].includes(topName);
  const sleeveCol = ['Vest', 'Waistcoat', 'Apron'].includes(topName) ? SHIRT : top;
  const r = noirRamp;
  return {
    R: {
      skin: r(skin), neckSkin: r(skin), arm: r(skin), hand: r(gloves ? shade(ex, 0.8) : skin), stocking: r(shade(skin, 0.72)),
      hair: r(hair), hat: r(hat),
      top: r(top), sleeve: r(sleeveCol), sleeveF: r(shade(sleeveCol, 0.78)), hood: r(shade(top, 0.9)),
      shirt: r(shirtLike ? top : SHIRT), cuff: r(shade(shirtLike ? top : SHIRT, 1.06)),
      legN: r(bot), legF: r(shade(bot, 0.78)), skirt: r(bot), bib: r(bot),
      shoe: r(SHOE_OF(look.shoes, skin)), shoeF: r(shade(SHOE_OF(look.shoes, skin), 0.8)), sole: r(look.shoes === 2 ? '#f4f4f6' : shade(SHOE_OF(look.shoes, skin), 0.6)),
      neckw: r(neck), ex: r(ex), ex2: r(CLOTH[look.extra2Color ?? look.extraColor]), strap: r(STRAP), sack: r(SACK), gold: r(GOLD),
      wood: r('#8a6a3a'), steel: r('#8e939e'), cape: r(shade(top, 0.92)), apron: r(mix(top, '#e6dccb', 0.75)),
      fallback: r('#808080'),
    },
    skin, hair, top, bot, ex, neck, eye: EYE_COLORS[look.eyeColor], hat,
  };
}

// Which part sits in front of which, for the seams. Higher is nearer.
const RANK = {
  legF: 0, shoeF: 0, sleeveF: 0.5, legN: 1, stocking: 1, shoe: 1.2, sole: 1.2, skirt: 2, bib: 2.2, top: 3, apron: 3.3, shirt: 3.2,
  hood: 2.8, cape: 3.6, sleeve: 4, arm: 4, cuff: 4.1, hand: 4.2, neckSkin: 2.6, neckw: 3.4, ex: 4.4, strap: 4.5,
  sack: 1.5, skin: 5, hair: 6, hat: 7, wood: 4.6, steel: 4.6, gold: 4.7,
};
// Templated parts (heads) carry their tones; cloth gets shaded here.
function shadeNoir(L, ramps) {
  const { mat, ov } = L;
  const out = Array.from({ length: H }, () => Array(W).fill(null));
  const base = Array.from({ length: H }, () => Array(W).fill(null));
  const m = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? mat[y][x]?.m ?? null : null);
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = mat[y][x];
      if (!c) { x++; continue; }
      let e = x; while (e + 1 < W && mat[y][e + 1]?.m === c.m) e++;
      const len = e - x + 1;
      for (let i = x; i <= e; i++) {
        const cell = mat[y][i], r = ramps[cell.m] ?? ramps.fallback;
        let t = cell.t;
        if (t == null) {
          // across the run: light on the left, dark then deep on the right
          const u = len === 1 ? 0.5 : (i - x) / (len - 1);
          t = len >= 4 ? (u <= 0.2 ? 1 : u >= 0.84 ? -2 : u >= 0.55 ? -1 : 0) : len === 3 ? [0, 0, -1][i - x] : len === 2 ? [0, -1][i - x] : 0;
          // down the column: the top edge catches the light, the bottom edge turns away
          if (m(i, y - 1) !== cell.m && t < 1 && t > -2) t += 1;
          else if (m(i, y + 1) !== cell.m && m(i, y + 1) && t > -2) t -= 1;
          // a seam where something nearer touches this part
          const rk = RANK[cell.m] ?? 3;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1]]) {
            const o = m(i + dx, y + dy);
            if (o && o !== cell.m && (RANK[o] ?? 3) > rk + 0.05 && (RANK[o] ?? 3) < 5 && rk < 5) { t = -2; break; }
          }
        }
        t = Math.max(-2, Math.min(1, t - (cell.d || 0)));
        out[y][i] = r[t + 2]; base[y][i] = r[2];
      }
      x = e + 1;
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = ov[y][x];
    if (!o) continue;
    const c = typeof o === 'function' ? o(out[y][x]) : o;
    if (!c) continue;
    if (!out[y][x]) base[y][x] = c;
    out[y][x] = c;
  }
  // the outline: a darkened, inked version of whatever it touches
  const res = out.map(r => [...r]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (out[y][x]) continue;
    let pick = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const b = base[y + dy]?.[x + dx]; if (b) { pick = b; break; } }
    if (pick) res[y][x] = mix(shade(pick, 0.32), INK, 0.55);
  }
  return res;
}

// ---------- builds ----------

// Half-widths of the shoulders by build: Slim, Regular, Broad, Lean, Stocky, Heavyset, Athletic.
const HW = [4, 5, 6, 4, 6, 6, 6];
const WAIST = [0, 1, 0, 1, 0, -1, 1];            // how far the waist comes in (Heavyset goes out)
const SIDE = [[10, 14], [9, 14], [9, 15], [10, 14], [9, 15], [8, 15], [9, 15]];
const BELLY = 5;

// The rows (front view, standing, not bobbing).
const HEAD_TOP = 3, NECK = 10, SHOULDER = 11, WAIST_Y = 18, HIP = 20, KNEE = 25, ANKLE = 28;

const LONG = new Set(['Trench coat', 'Overcoat', 'Lab coat', 'Kimono robe', 'Cloak', 'Raincoat']);
const HEM = { 'Trench coat': 25, Overcoat: 25, 'Lab coat': 25, 'Kimono robe': 26, Cloak: 25, Raincoat: 24, Jacket: 21, 'Suit jacket': 21, Hoodie: 21, Cardigan: 21, 'Leather jacket': 20, Sweater: 20, Jumper: 20, Poncho: 20, Dress: 20 };
const OPEN = new Set(['Trench coat', 'Jacket', 'Vest', 'Suit jacket', 'Overcoat', 'Cardigan', 'Lab coat', 'Waistcoat', 'Raincoat']);
const SKIRTS = new Set(['Skirt', 'Long skirt', 'Pleated skirt']);

// ---------- painting ----------

export function paintNoir(look, facing = 'down', frame = 0, pose = 'walk', opts = {}) {
  if (pose === 'ko') {
    const g = paintNoir(look, 'down', 0, 'ko-stand', opts);
    return Array.from({ length: W }, (_, y) => Array.from({ length: H }, (_, x) => g[x][y]));
  }
  if (pose === 'appraise') facing = 'down';
  const L = makeLayer(W, H);
  const C = palette(look);
  const view = facing === 'left' ? 'right' : facing;
  const walking = pose === 'walk' || pose === 'carry';
  const ctx = {
    L, look, C, view, frame, pose: pose === 'ko-stand' ? 'ko' : pose, opts,
    bob: (walking && frame % 2 === 1) || (pose === 'idle' && frame === 1) ? 1 : 0,
    stride: walking ? [1, 0, -1, 0][frame % 4] : 0,
    top: PARTS.top[look.top], bottom: PARTS.bottom[look.bottom],
    extras: [PARTS.extra[look.extra], PARTS.extra[look.extra2 ?? 0]].filter(e => e && e !== 'None'),
    neck: PARTS.neck[look.neck], pattern: PARTS.pattern[look.pattern], b: look.build,
  };
  ctx.U = y => y - ctx.bob;
  ctx.has = e => ctx.extras.includes(e);
  if (view === 'right') paintSide(ctx); else paintFront(ctx);
  if (facing === 'left') L.mirror();
  const g = shadeNoir(L, C.R);
  if (look.height === 3) return stretch(g, 4);
  if (look.height === 2 || (!look.height && look.short)) return squash(g);
  if (look.height) return stretch(g, 3);
  return g;
}

// Taller: rows in the body and legs doubled, using the empty rows above the head.
function stretch(g, most) {
  let empty = 0;
  while (empty < g.length && g[empty].every(c => !c)) empty++;
  const k = Math.min(most, empty), extra = new Set([15, 24, 19, 27].slice(0, k));
  const out = [];
  for (let y = k; y < g.length; y++) { out.push(g[y]); if (extra.has(y)) out.push([...g[y]]); }
  return out;
}
// Shorter: a row out of the body and one out of the legs.
function squash(g) {
  const drop = new Set([16, 24]);
  return [...Array.from({ length: drop.size }, () => Array(W).fill(null)), ...g.filter((_, y) => !drop.has(y))];
}

// ---------- front and back ----------

function paintFront(ctx) {
  const { L, look, C, view, pose, stride, U, top, bottom, b } = ctx;
  const { P, R, O } = L;
  const front = view === 'down';
  const hw = HW[b], x0 = 12 - hw, x1 = 11 + hw;
  ctx.x0 = x0; ctx.x1 = x1;
  const longTop = LONG.has(top);
  const hem = HEM[top] ?? 19;
  const skirt = SKIRTS.has(bottom) || top === 'Dress';

  // behind everything
  if (pose === 'carry' && front) for (let y = 7; y <= 13; y++) R(x1 - 2, U(y), 4, 1, 'sack');
  if (look.prop === 'shovel' && pose !== 'ko') paintShovel(ctx, front);

  // --- legs and shoes (they don't bob) ---
  for (const [lx, side] of [[8, 1], [13, -1]]) {
    const lifted = stride !== 0 && stride !== side;
    const foot = lifted ? ANKLE - 1 : ANKLE;
    const bare = skirt || bottom === 'Shorts' ? (bottom === 'Leggings' ? 'legN' : 'stocking') : 'legN';
    R(lx, HIP, 3, foot - HIP + 1, bare);
    if (bottom === 'Shorts') R(lx, HIP, 3, 3, 'legN');
    if (bottom === 'Wide-leg trousers') { R(lx + (side > 0 ? -1 : 0), KNEE, 4, foot - KNEE + 1, 'legN'); }
    if (bottom === 'Jeans' || bottom === 'Work pants' || bottom === 'Cargo pants') R(lx, foot, 3, 1, 'legN', 1);       // turned-up cuffs
    if (bottom === 'Jeans') for (let y = HIP + 1; y < foot; y += 2) O(lx + (side > 0 ? 2 : 0), y, c => c && mix(c, '#d8a860', 0.45));
    if (bottom === 'Cargo pants') { R(lx + (side > 0 ? 0 : 1), 23, 2, 2, 'legN', 1); O(lx + (side > 0 ? 0 : 1), 23, c => c && shade(c, 0.7)); }
    if (bottom === 'Work pants') O(lx + 1, KNEE, c => c && shade(c, 0.78));
    paintShoe(ctx, lx, foot + 1, side, lx === 8);
  }

  // --- skirts and the dress's skirt ---
  if (skirt) {
    const end = bottom === 'Long skirt' ? 27 : top === 'Dress' ? 24 : 23;
    for (let y = HIP - 1; y <= end; y++) { const f = Math.min(2, Math.max(0, Math.floor((y - HIP) / 2))); R(x0 + 1 - f, y, x1 - x0 - 1 + f * 2, 1, top === 'Dress' && !SKIRTS.has(bottom) ? 'top' : 'skirt'); }
    if (bottom === 'Pleated skirt') for (let x = x0; x <= x1; x += 2) for (let y = HIP; y <= end; y++) O(x, y, c => c && shade(c, 0.8));
  } else {
    // the trousers' seat between the legs
    R(x0 + 1, U(HIP - 1), x1 - x0 - 1, 1, 'legN'); R(11, HIP, 2, 1, 'legN');
  }

  // --- arms, behind the torso's edge ---
  paintArmsFront(ctx);

  // --- torso ---
  const w = y => (y >= WAIST_Y - 2 && y <= WAIST_Y + 1 ? WAIST[b] : 0);
  R(x0 + 1, U(SHOULDER), x1 - x0 - 1, 1, 'top');
  for (let y = SHOULDER + 1; y <= Math.min(hem, HIP - 1); y++) R(x0 + w(y), U(y), x1 - x0 + 1 - w(y) * 2, 1, 'top');
  if (hem >= HIP) for (let y = HIP; y <= hem; y++) {
    const flare = longTop && y >= HIP + 2 ? 1 : 0;
    R(x0 - flare, y, x1 - x0 + 1 + flare * 2, 1, top === 'Cloak' ? 'cape' : 'top');
  }
  if (longTop && front && top !== 'Cloak' && top !== 'Kimono robe') for (let y = HIP; y <= hem; y++) { P(11, y, y > HIP ? null : 'top'); P(12, y, y > HIP ? null : 'top'); }   // the coat opens over the legs
  if (longTop && stride && front) P(stride > 0 ? x0 - 1 : x1 + 1, hem, null);
  if ((look.plump || b === BELLY)) for (let y = 15; y <= 18; y++) { P(x0 - 1, U(y), 'top'); P(x1 + 1, U(y), 'top'); }

  if (bottom === 'Overalls') { R(10, U(14), 4, HIP - 14, 'bib'); P(10, U(12), 'bib'); P(10, U(13), 'bib'); P(13, U(12), 'bib'); P(13, U(13), 'bib'); if (front) { O(10, U(14), GOLD); O(13, U(14), GOLD); } }
  if (front) paintTopFront(ctx, hem); else paintTopBack(ctx, hem);
  paintPattern(ctx);
  paintNeck(ctx);

  // --- the head (34a: stand-ins; 34b draws each style) ---
  R(10, U(NECK), 4, 2, 'neckSkin', -1);
  paintHead(ctx, front ? 'down' : 'up');
  paintBodyExtras(ctx);
  if (pose === 'carry' && !front) {
    // the sack, full, across your back
    for (let y = 9; y <= 19; y++) { const a = y < 11 || y > 17 ? 1 : 0; R(x0 + a, U(y), x1 - x0 + 1 - a * 2, 1, 'sack'); }
    R(11, U(8), 2, 1, 'strap'); O(x0 + 2, U(12), c => c && shade(c, 0.8)); O(x1 - 2, U(16), c => c && shade(c, 0.8));
  }
  if (pose === 'appraise') paintLoupeRaised(ctx);
  if (ctx.opts.signature && pose !== 'appraise') {
    if (front) { O(10, U(12), '#3a2a20'); O(9, U(13), '#3a2a20'); O(8, U(14), GOLD); O(9, U(14), GOLD); O(8, U(15), shade(GOLD, 0.7)); O(9, U(15), ctx.frame % 2 ? LENS : '#e8f4f8'); }
    else { O(10, U(11), '#3a2a20'); O(13, U(11), '#3a2a20'); }
  }
  void C;
}

function paintShoe(ctx, lx, sy, side, leftFoot) {
  const { L, look } = ctx;
  const { R, P } = L;
  const style = look.shoes ?? 0;
  const toe = leftFoot ? lx - 1 : lx;
  if (style === 6) { R(lx, sy, 3, 1, 'stocking'); R(toe, sy + 1, 4, 1, 'stocking'); return; }
  if (style === 4) { R(lx, sy, 3, 1, 'stocking'); R(toe, sy + 1, 4, 1, 'sole'); P(lx + 1, sy, 'shoe'); return; }   // sandals: a strap and a sole
  R(lx, sy, 3, 1, 'shoe'); R(toe, sy + 1, 4, 1, style === 2 ? 'sole' : 'shoe');
  if (style === 3) { P(leftFoot ? lx + 2 : lx, sy + 1, 'sole'); }                                                  // a heel
  if (style === 1) R(lx, sy - 2, 3, 2, 'shoe');                                                                   // boots
  if (style === 5) R(lx, sy - 4, 3, 4, 'shoe');                                                                   // wellingtons
  void side;
}

function paintArmsFront(ctx) {
  const { L, U, stride, pose, top, x0, x1, view } = ctx;
  const { R, P, O } = L;
  const bare = top === 'Tank top';
  const shortSleeve = top === 'Shirtsleeves' || top === 'Uniform shirt' || top === 'Apron';
  const cape = top === 'Cloak' || top === 'Poncho';
  const drop = side => (stride === 0 ? 0 : stride === side ? 1 : -1);
  const raised = pose === 'appraise' || (pose === 'carry' && view === 'down');
  const arm = (ax, side) => {
    const dy = drop(side), endY = 19 + dy;
    if (bare) R(ax, U(12), 2, endY - 11, 'arm');
    else if (shortSleeve) { R(ax, U(12), 2, 4, 'sleeve'); R(ax, U(15), 2, 1, 'cuff'); R(ax, U(16), 2, endY - 15, 'arm'); if (top === 'Shirtsleeves') { R(ax, U(15), 2, 1, 'cuff'); } }
    else { R(ax, U(12), 2, endY - 11, 'sleeve'); if (top !== 'Jumper' && top !== 'Leather jacket') R(ax, U(endY), 2, 1, 'sleeve', -1); }
    if (top === 'Jumper') { O(ax, U(endY), WHITE); O(ax + 1, U(endY), shade(WHITE, 0.8)); }
    R(ax, U(endY + 1), 2, 2, 'hand');
    if (cape) R(ax, U(12), 2, 6, top === 'Cloak' ? 'cape' : 'top');
  };
  arm(x0 - 2, -1);
  if (!raised) { arm(x1 + 1, 1); return; }
  const sl = bare ? 'arm' : 'sleeve';
  if (pose === 'carry') { R(x1 + 1, U(9), 2, 5, sl); R(x1 + 1, U(7), 2, 2, 'hand'); return; }
  // appraising: the right hand comes up to the eye
  R(x1 + 1, U(12), 2, 3, sl); R(x1, U(10), 2, 2, sl); R(14, U(8), 2, 2, 'hand'); P(x1 + 2, U(12), null);
}

function paintTopFront(ctx, hem) {
  const { L, U, top, x0, x1, C, bottom } = ctx;
  const { R, S, P, O } = L;
  const mid = 11.5;
  const dark = k => c => c && shade(c, k);
  if (OPEN.has(top)) {
    // the shirt in the V of the opening, lapels lit on the left and dark on the right
    const depth = top === 'Suit jacket' ? 16 : top === 'Vest' || top === 'Waistcoat' ? 14 : top === 'Lab coat' || top === 'Cardigan' ? 17 : 15;
    for (let y = SHOULDER; y <= depth; y++) {
      const half = y <= SHOULDER + 1 ? 1 : 0;
      const a = Math.floor(mid) - half, b2 = Math.ceil(mid) + half;
      R(a, U(y), b2 - a + 1, 1, 'shirt');
      O(a - 1, U(y), c => c && shade(c, 1.2)); O(b2 + 1, U(y), dark(0.62));
    }
    if (top === 'Cardigan' || top === 'Lab coat') for (let y = depth + 1; y <= Math.min(hem, 19); y++) { O(11, U(y), dark(0.7)); }
  }
  if (top === 'Trench coat') {
    R(x0, U(WAIST_Y), x1 - x0 + 1, 1, 'top', -1);                          // the belt
    O(11, U(WAIST_Y), GOLD); O(12, U(WAIST_Y), shade(GOLD, 0.7));
    for (const [x, y] of [[9, 14], [14, 14], [9, 16], [14, 16]]) O(x, U(y), dark(0.55));   // double-breasted
    O(x0 + 1, U(12), c => c && shade(c, 1.15)); O(x1 - 1, U(12), dark(0.75));              // storm flaps
  }
  if (top === 'Overcoat') { R(x0 + 1, U(SHOULDER), x1 - x0 - 1, 1, 'top', 1); for (const y of [14, 16, 18]) { O(10, U(y), dark(0.55)); O(13, U(y), dark(0.55)); } }
  if (top === 'Lab coat') { O(x1 - 2, U(14), dark(0.8)); O(x1 - 1, U(14), dark(0.8)); for (const y of [21, 22]) { O(x0 + 1, y, dark(0.82)); O(x0 + 2, y, dark(0.82)); } }
  if (top === 'Raincoat') { for (const y of [13, 15, 17]) O(12, U(y), GOLD); for (let y = 12; y <= hem; y += 3) O(x0 + 1, U(y) > HIP ? y : U(y), c => c && shade(c, 1.3)); }
  if (top === 'Jacket') { for (const y of [16, 18]) O(10, U(y), dark(0.6)); R(x0, U(hem > 20 ? 20 : hem), x1 - x0 + 1, 1, 'top', -1); }
  if (top === 'Suit jacket') { O(12, U(17), dark(0.55)); O(12, U(19), dark(0.55)); O(x1 - 2, U(13), WHITE); O(x1 - 1, U(13), WHITE); }
  if (top === 'Vest' || top === 'Waistcoat') { for (const y of [15, 17]) O(12, U(y), dark(0.55)); if (top === 'Waistcoat') { O(x0 + 2, U(16), dark(0.7)); O(x1 - 2, U(16), dark(0.7)); } }
  if (top === 'Cardigan') for (const y of [17, 19]) O(12, U(y), dark(0.55));
  if (top === 'Sweater') { R(10, U(SHOULDER), 4, 1, 'top', -1); for (let x = x0; x <= x1; x++) O(x, U(20), dark(x % 2 ? 0.8 : 1.12)); }
  if (top === 'Hoodie') { S({ [U(10)]: [8, 15] }, 'hood'); R(9, U(16), 6, 2, 'top', -1); O(10, U(12), WHITE); O(10, U(13), WHITE); O(13, U(12), WHITE); O(13, U(13), WHITE); }
  if (top === 'Tank top') { R(x0 + 2, U(SHOULDER), x1 - x0 - 3, 1, 'neckSkin'); R(10, U(12), 4, 1, 'neckSkin'); }
  if (top === 'Leather jacket') { for (let i = 0; i < 7; i++) O(13 - Math.floor(i / 2), U(12 + i), SILVER); O(x0 + 1, U(13), c => c && shade(c, 1.5)); O(x0 + 2, U(13), c => c && shade(c, 1.35)); R(x0 + 1, U(SHOULDER), 3, 1, 'top', 1); R(x1 - 3, U(SHOULDER), 3, 1, 'top', 1); }
  if (top === 'Uniform shirt') {
    P(11, U(SHOULDER), 'neckSkin'); P(12, U(SHOULDER), 'neckSkin');
    for (const y of [13, 15, 17]) O(12, U(y), dark(0.7));
    for (const x of [x0 + 1, x0 + 2, x1 - 2, x1 - 1]) O(x, U(14), dark(0.78));
    O(x1 - 2, U(13), RIBBONS[0]); O(x1 - 1, U(13), RIBBONS[2]); O(x1 - 3, U(13), RIBBONS[1]);
    O(x0 + 1, U(13), '#15161a'); O(x0 + 2, U(13), WHITE);
  }
  if (top === 'Jumper') {
    S({ [U(SHOULDER)]: [10, 13], [U(12)]: [11, 12] }, 'neckSkin');
    for (const [x, y] of [[9, 11], [10, 12], [14, 11], [13, 12]]) O(x, U(y), WHITE);
    O(11, U(13), C.neck); O(12, U(13), shade(C.neck, 0.7)); O(11, U(14), shade(C.neck, 0.8)); O(12, U(14), C.neck);
  }
  if (top === 'Shirtsleeves') for (let y = SHOULDER; y <= 18; y++) { O(9, U(y), shade(C.ex, 0.7)); O(14, U(y), shade(C.ex, 0.7)); }
  if (top === 'Apron') {
    for (let y = 13; y <= 23; y++) R(x0 + 2, y >= HIP ? y : U(y), x1 - x0 - 3, 1, 'apron');
    O(x0 + 2, U(SHOULDER), mix(C.top, '#e6dccb', 0.75)); O(x1 - 2, U(SHOULDER), mix(C.top, '#e6dccb', 0.75));
    R(x0 + 1, U(WAIST_Y), x1 - x0 - 1, 1, 'apron', -1);
  }
  if (top === 'Kimono robe') {
    for (let y = SHOULDER; y <= 17; y++) { const x = 10 + Math.floor((y - SHOULDER) * 0.6); O(x, U(y), c => c && shade(c, 1.25)); O(x + 1, U(y), dark(0.62)); }
    R(x0, U(WAIST_Y), x1 - x0 + 1, 2, 'ex');                                   // the sash
  }
  if (top === 'Cloak') { O(x0 + 2, U(SHOULDER), GOLD); O(x1 - 2, U(SHOULDER), GOLD); for (let y = 13; y <= 24; y++) { if (y < HIP) { O(11, U(y), dark(0.65)); } } }
  if (top === 'Poncho') { for (let x = x0 - 2; x <= x1 + 2; x++) { P(x, U(17), 'top'); O(x, U(17), x % 2 ? dark(0.7) : c => c && shade(c, 1.2)); } for (let x = x0 - 1; x <= x1 + 1; x++) P(x, U(16), 'top'); }
  if (top === 'Dress') { R(x0, U(WAIST_Y), x1 - x0 + 1, 1, 'top', -1); P(11, U(SHOULDER), 'neckSkin'); P(12, U(SHOULDER), 'neckSkin'); P(11, U(12), 'neckSkin'); P(12, U(12), 'neckSkin'); }
  if (!OPEN.has(top) && !['Dress', 'Tank top', 'Jumper', 'Uniform shirt', 'Hoodie', 'Poncho', 'Cloak', 'Kimono robe'].includes(top) && !SKIRTS.has(bottom) && hem < HIP) {
    R(x0 + 1, U(HIP - 1), x1 - x0 - 1, 1, 'legN', -1);                      // a belt line where the top meets the trousers
  }
}

function paintTopBack(ctx, hem) {
  const { L, U, top, x0, x1 } = ctx;
  const { R, S, O } = L;
  const dark = k => c => c && shade(c, k);
  if (LONG.has(top) && top !== 'Cloak') for (let y = HIP + 1; y <= hem; y++) O(11, y, dark(0.7));      // the back vent
  if (top === 'Trench coat') R(x0, U(WAIST_Y), x1 - x0 + 1, 1, 'top', -1);
  if (top === 'Hoodie') S({ [U(SHOULDER)]: [8, 15], [U(12)]: [9, 14], [U(13)]: [10, 13] }, 'hood');
  if (top === 'Overcoat') R(x0 + 1, U(SHOULDER), x1 - x0 - 1, 1, 'top', 1);
  if (top === 'Sweater') for (let x = x0; x <= x1; x++) O(x, U(20), dark(x % 2 ? 0.8 : 1.12));
  if (top === 'Tank top') R(x0 + 2, U(SHOULDER), x1 - x0 - 3, 1, 'neckSkin');
  if (top === 'Shirtsleeves') for (let y = SHOULDER; y <= 18; y++) { const x = 9 + Math.round((y - SHOULDER) * 0.35); O(x, U(y), shade(ctx.C.ex, 0.7)); O(23 - x, U(y), shade(ctx.C.ex, 0.7)); }
  if (top === 'Jumper') { for (let x = x0 + 1; x <= x1 - 1; x++) { O(x, U(15), WHITE); O(x, U(16), dark(0.7)); } for (let y = SHOULDER; y <= 15; y++) { O(x0 + 1, U(y), WHITE); O(x1 - 1, U(y), WHITE); } }
  if (top === 'Kimono robe' || top === 'Apron') R(x0, U(WAIST_Y), x1 - x0 + 1, top === 'Apron' ? 1 : 2, top === 'Apron' ? 'apron' : 'ex');
  if (top === 'Cloak') for (let y = SHOULDER + 1; y <= hem; y++) O(11, y >= HIP ? y : U(y), dark(0.82));
  if (top === 'Dress') R(x0, U(WAIST_Y), x1 - x0 + 1, 1, 'top', -1);
}

function paintPattern(ctx) {
  const { L, pattern } = ctx;
  if (pattern === 'Plain') return;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const m = L.mat[y][x]?.m;
    if (m !== 'top' && m !== 'sleeve' && m !== 'hood' && m !== 'cape') continue;
    if (L.ov[y][x]) continue;
    if (pattern === 'Pinstripe' && x % 3 === 0 && y % 2 === 0) L.O(x, y, c => c && shade(c, 1.32));
    if (pattern === 'Check' && (x % 4 === 0 || y % 4 === 0)) L.O(x, y, c => c && shade(c, x % 4 === 0 && y % 4 === 0 ? 0.62 : 0.8));
    if (pattern === 'Stripes' && y % 3 === 0) L.O(x, y, c => c && shade(c, 1.28));
    if (pattern === 'Polka dots' && x % 4 === 1 && y % 4 === 1) L.O(x, y, c => c && shade(c, 1.45));
    if (pattern === 'Plaid' && (x % 5 === 0 || y % 5 === 0)) L.O(x, y, c => c && mix(c, '#b8483e', x % 5 === 0 && y % 5 === 0 ? 0.6 : 0.35));
    if (pattern === 'Floral' && (x * 5 + y * 3) % 11 === 0) L.O(x, y, (x + y) % 2 ? '#e8a0b8' : '#e8d070');
    if (pattern === 'Patched' && x === (ctx.view === 'right' ? 11 : ctx.x1 - 2) && y >= ctx.U(14) && y <= ctx.U(15)) L.O(x, y, mix(ctx.C.top, '#8a7a5a', 0.6));
  }
  if (pattern === 'Embroidered trim') for (let x = 0; x < W; x++) for (const y of [ctx.U(19), ctx.U(SHOULDER)]) if (L.mat[y]?.[x]?.m === 'top') L.O(x, y, x % 2 ? '#d8b86a' : '#a8884a');
}

function paintNeck(ctx) {
  const { L, U, neck, top, C, view } = ctx;
  const { O, R } = L;
  const front = view === 'down';
  const tie = C.neck, tieD = shade(C.neck, 0.7);
  const shirtShows = OPEN.has(top) || top === 'Shirtsleeves';
  if (neck === 'Turtleneck') { R(10, U(NECK), 4, 2, 'neckw'); R(9, U(SHOULDER), 6, 1, 'neckw'); return; }
  if (!front) { if (neck === 'Bandana') R(10, U(SHOULDER), 4, 1, 'neckw'); return; }
  if (neck === 'Open collar' && shirtShows) { O(10, U(SHOULDER), WHITE); O(13, U(SHOULDER), WHITE); }
  if (neck === 'Necktie' && shirtShows) {
    O(11, U(SHOULDER), tieD); O(12, U(SHOULDER), tieD);
    for (let y = SHOULDER + 1; y <= (top === 'Shirtsleeves' ? 17 : 16); y++) if (L.at(11, U(y)) === 'shirt' || top === 'Shirtsleeves') { O(11, U(y), tie); O(12, U(y), tieD); }
  }
  if (neck === 'Bow tie') { O(10, U(SHOULDER), tie); O(13, U(SHOULDER), tie); O(11, U(SHOULDER), tieD); O(12, U(SHOULDER), tieD); }
  if (neck === 'Bandana') { R(9, U(SHOULDER), 6, 1, 'neckw'); R(10, U(12), 4, 1, 'neckw'); O(11, U(13), tie); O(12, U(13), tieD); }
}

// Things worn on the body (head extras, like glasses and earrings, come with 34b's heads).
function paintBodyExtras(ctx) {
  const { L, U, view, x0, x1, C, has } = ctx;
  const { R, O, P } = L;
  const front = view === 'down', side = view === 'right';
  const hx = x0 - 3;
  if (has('Scarf')) {
    if (side) { R(10, U(NECK + 1), 6, 1, 'ex'); R(9, U(SHOULDER + 1), 2, 3, 'ex'); }
    else { R(9, U(NECK + 1), 6, 1, 'ex'); R(9, U(SHOULDER), 6, 1, 'ex'); if (front) { R(13, U(12), 2, 3, 'ex'); O(13, U(13), c => c && shade(c, 0.8)); } }
  }
  if (has('Pendant') && front) { O(10, U(12), GOLD); O(13, U(12), GOLD); O(11, U(13), shade(GOLD, 0.8)); O(12, U(13), GOLD); O(12, U(14), shade(GOLD, 0.7)); }
  if (has('Pendant') && side) O(ctx.x1, U(13), GOLD);
  if (has('Satchel') || has('Backpack')) {
    const pack = has('Backpack');
    if (front) { for (let i = 0; i < 6; i++) O(pack ? x0 + 1 : x1 - 1 - i, U(12 + i), STRAP); if (pack) for (let i = 0; i < 6; i++) O(x1 - 1, U(12 + i), STRAP); else R(x0 - 3, U(18), 3, 3, 'ex'); }
    else if (!side) { if (pack) R(x0 + 1, U(12), x1 - x0 - 1, 7, 'ex'); else { for (let i = 0; i < 6; i++) O(x0 + 1 + i, U(12 + i), STRAP); R(x1, U(18), 3, 3, 'ex'); } }
    else { if (pack) R(ctx.x0 - 3, U(12), 3, 7, 'ex'); else { for (let i = 0; i < 5; i++) O(ctx.x1 - 1 - i, U(12 + i), STRAP); R(ctx.x0 - 2, U(17), 3, 3, 'ex'); } }
  }
  if (has('Pocket watch') && front) { O(x1 - 2, U(16), GOLD); O(x1 - 3, U(17), shade(GOLD, 0.8)); O(x1 - 4, U(17), shade(GOLD, 0.8)); }
  if (!front) return;
  if (has('Umbrella')) { for (let y = 10; y <= 21; y++) P(hx, U(y), 'ex', y % 3 ? 0 : -1); for (let y = 22; y <= 30; y++) P(hx, y, 'wood'); P(hx, U(9), 'steel'); }
  if (has('Cane')) { for (let y = 21; y <= 30; y++) P(hx, y, 'wood'); P(hx + 1, U(20), 'wood'); P(hx, U(20), 'wood'); }
  if (has('Lantern')) { P(hx, U(21), 'steel'); P(hx, U(22), 'steel'); R(hx - 1, U(23), 3, 3, 'steel'); O(hx, U(24), GOLD); O(hx, U(23), '#fff0c8'); }
  if (has('Bracelet')) { O(x0 - 2, U(18), C.ex); O(x0 - 1, U(18), shade(C.ex, 0.8)); }
  if (has('Rings')) { O(x1 + 1, U(21), GOLD); O(x0 - 2, U(21), SILVER); }
  if (has('Armband')) { for (const y of [13, 14]) { O(x0 - 2, U(y), y === 13 ? C.ex : shade(C.ex, 0.8)); O(x0 - 1, U(y), y === 13 ? C.ex : shade(C.ex, 0.8)); } }
  if (has('Belt pouches')) for (const bx of [x0 + 1, x1 - 2]) { R(bx, U(18), 2, 2, 'ex'); O(bx, U(18), c => c && shade(c, 1.2)); }
  if (has('Choker')) for (let x = 10; x <= 13; x++) O(x, U(NECK + 1), x % 2 ? C.ex : shade(C.ex, 0.8));
  if (has('Brooch')) { O(x0 + 2, U(13), GOLD); O(x0 + 2, U(14), '#c95a8e'); }
}

function paintShovel(ctx, front) {
  const { L, U, x0, x1 } = ctx;
  const { P, R } = L;
  const sx = front ? x1 + 2 : x0 - 3;
  for (let y = 8; y <= 21; y++) P(sx, U(y), 'wood', y % 4 ? 0 : 1);
  R(sx - 1, U(7), 3, 1, 'wood', 1);
  R(sx - 2, 22, 5, 1, 'steel', 1); R(sx - 2, 23, 5, 3, 'steel'); R(sx - 1, 26, 3, 1, 'steel', -1);
}

function paintLoupeRaised(ctx) {
  const { L, U, frame } = ctx;
  for (const [x, y] of [[13, 6], [14, 6], [12, 7], [12, 8], [15, 7], [15, 8], [13, 9], [14, 9]]) L.O(x, U(y), (x + y) % 2 ? GOLD : shade(GOLD, 0.75));
  L.O(13, U(7), frame ? '#f4fbff' : mix(LENS, WHITE, 0.3)); L.O(14, U(7), LENS); L.O(13, U(8), LENS); L.O(14, U(8), mix(LENS, INK, 0.4));
}

// ---------- the side view (facing right) ----------

function paintSide(ctx) {
  const { L, look, U, stride, pose, top, bottom, b, C } = ctx;
  const { R, P, O } = L;
  const [sx0, sx1] = SIDE[b];
  ctx.x0 = sx0; ctx.x1 = sx1;
  const longTop = LONG.has(top);
  const hem = HEM[top] ?? 19;
  const skirt = SKIRTS.has(bottom) || top === 'Dress';
  if (pose === 'carry') for (let y = 9; y <= 19; y++) R(sx0 - 4, U(y), 5 - (y < 11 || y > 17 ? 1 : 0), 1, 'sack');
  if (look.prop === 'shovel' && pose !== 'ko') {
    for (let i = 0; i <= 12; i++) P(Math.round(16 - i), U(Math.round(17 - i * 0.9)), 'wood');
    for (const [x, y] of [[2, 3], [3, 3], [4, 3], [1, 4], [2, 4], [3, 4], [4, 4], [1, 5], [2, 5], [3, 5], [2, 6]]) P(x, U(y), 'steel');
  }

  // --- legs: far (behind, darker) then near ---
  const leg = (pos, m, shoeM) => {
    const lm = skirt || bottom === 'Shorts' ? 'stocking' : m;
    if (pos === 0) { R(11, HIP, 3, ANKLE - HIP + 1, lm); R(11, ANKLE + 1, 3, 1, shoeM); R(11, ANKLE + 2, 5, 1, shoeM); }
    if (pos === 1) { R(12, HIP, 3, KNEE - HIP, lm); R(13, KNEE, 3, ANKLE - KNEE + 1 - 1, lm); R(13, ANKLE, 3, 1, shoeM); R(13, ANKLE + 1, 5, 1, shoeM); }
    if (pos === -1) { R(10, HIP, 3, KNEE - HIP, lm); R(9, KNEE, 3, 2, lm); R(8, KNEE + 2, 3, 1, lm); R(7, ANKLE, 3, 1, shoeM); R(6, ANKLE + 1, 4, 1, shoeM); }
    if (bottom === 'Shorts') { if (pos === 0) R(11, HIP, 3, 3, m); if (pos === 1) R(12, HIP, 3, 3, m); if (pos === -1) R(10, HIP, 3, 3, m); }
  };
  leg(-stride, 'legF', 'shoeF');
  leg(stride, 'legN', 'shoe');

  // --- the far arm, behind the body ---
  const sl = top === 'Tank top' ? 'arm' : 'sleeve';
  const arm = (pos, d) => {
    const ax = pos === 0 ? 11 : pos === 1 ? 13 : 9;
    R(11, U(12), 2, 3, sl, null, d);
    if (pos === 0) { R(11, U(15), 2, 4, sl, null, d); R(11, U(19), 2, 2, 'hand', null, d); }
    else { R(pos > 0 ? 12 : 10, U(15), 2, 2, sl, null, d); R(ax, U(17), 2, 2, sl, null, d); R(ax + (pos > 0 ? 1 : -1), U(19), 2, 2, 'hand', null, d); }
  };
  arm(stride, 1);

  // --- torso ---
  R(sx0, U(SHOULDER), sx1 - sx0 + 1, 1, 'top');
  for (let y = SHOULDER + 1; y <= Math.min(hem, HIP - 1); y++) R(sx0, U(y), sx1 - sx0 + 1 + (y >= 12 && y <= 15 && top !== 'Tank top' ? 0 : 0), 1, 'top');
  if (hem >= HIP) for (let y = HIP; y <= hem; y++) R(sx0 - (longTop && y >= HIP + 2 ? 1 : 0), y, sx1 - sx0 + 1 + (longTop && y >= HIP + 2 ? 1 : 0), 1, top === 'Cloak' ? 'cape' : 'top');
  if (longTop && stride) for (let y = HIP + 2; y <= hem; y++) P(stride > 0 ? sx0 - 2 : sx1 + 2, y, top === 'Cloak' ? 'cape' : 'top');
  if (skirt) {
    const end = bottom === 'Long skirt' ? 27 : top === 'Dress' ? 24 : 23;
    for (let y = HIP - 1; y <= end; y++) { const f = Math.min(2, Math.max(0, Math.floor((y - HIP) / 2))); R(sx0 - f, y, sx1 - sx0 + 1 + f * 2, 1, top === 'Dress' && !SKIRTS.has(bottom) ? 'top' : 'skirt'); }
  } else R(sx0, U(HIP - 1), sx1 - sx0 + 1, 1, 'legN');
  if (look.plump || b === BELLY) { for (let y = 14; y <= 18; y++) P(sx1 + 1, U(y), 'top'); for (const y of [15, 16, 17]) P(sx1 + 2, U(y), 'top'); }
  if (bottom === 'Overalls') { R(sx1 - 2, U(14), 3, HIP - 14, 'bib'); P(sx1 - 1, U(12), 'bib'); P(sx1 - 1, U(13), 'bib'); }
  if (top === 'Cloak' || top === 'Poncho') for (let y = SHOULDER; y <= 17; y++) R(sx0 - 1, U(y), sx1 - sx0 + 3, 1, top === 'Cloak' ? 'cape' : 'top');

  // details in profile
  const dark = k => c => c && shade(c, k);
  if (OPEN.has(top)) { R(sx1, U(SHOULDER), 1, 3, 'shirt'); O(sx1 - 1, U(SHOULDER), c => c && shade(c, 1.2)); O(sx1 - 1, U(12), c => c && shade(c, 1.2)); }
  if (top === 'Trench coat') { R(sx0, U(WAIST_Y), sx1 - sx0 + 1, 1, 'top', -1); O(sx1, U(WAIST_Y), GOLD); }
  if (top === 'Hoodie') { R(sx0 - 1, U(NECK), 3, 3, 'hood'); O(sx1, U(12), WHITE); O(sx1, U(13), WHITE); }
  if (top === 'Sweater') for (let x = sx0; x <= sx1; x++) O(x, U(20), dark(x % 2 ? 0.8 : 1.12));
  if (top === 'Overcoat' || top === 'Raincoat') for (const y of [14, 16, 18]) O(sx1 - 1, U(y), top === 'Raincoat' ? GOLD : dark(0.55));
  if (top === 'Shirtsleeves') for (let y = SHOULDER; y <= 18; y++) O(sx0 + 2, U(y), shade(C.ex, 0.7));
  if (top === 'Uniform shirt') { R(sx1 - 1, U(SHOULDER), 2, 1, 'neckSkin'); O(sx1, U(13), RIBBONS[0]); O(sx1 - 1, U(13), RIBBONS[2]); }
  if (top === 'Jumper') { for (let y = SHOULDER; y <= 15; y++) { O(sx0, U(y), WHITE); O(sx0 + 1, U(y), c => c && shade(c, 1.12)); } O(sx1, U(12), C.neck); O(sx1, U(13), C.neck); }
  if (top === 'Kimono robe' || top === 'Apron') R(sx0, U(WAIST_Y), sx1 - sx0 + 1, top === 'Apron' ? 1 : 2, top === 'Apron' ? 'apron' : 'ex');
  if (top === 'Apron') for (let y = 13; y <= 23; y++) P(sx1, y >= HIP ? y : U(y), 'apron');
  if (top === 'Leather jacket') { O(sx1 - 1, U(13), SILVER); O(sx1 - 1, U(15), SILVER); O(sx0 + 1, U(13), c => c && shade(c, 1.45)); }
  if (top === 'Cloak') O(sx1, U(SHOULDER), GOLD);
  if (top === 'Dress' || top === 'Tank top') R(sx1 - 1, U(SHOULDER), 2, 1, 'neckSkin');
  paintPattern(ctx);
  const n = ctx.neck;
  if (n === 'Necktie' && (OPEN.has(top) || top === 'Shirtsleeves')) { O(sx1, U(SHOULDER), shade(C.neck, 0.7)); O(sx1, U(12), C.neck); O(sx1, U(13), C.neck); }
  if (n === 'Bow tie') { O(sx1, U(SHOULDER), C.neck); O(sx1 + 1, U(SHOULDER), shade(C.neck, 0.7)); }
  if (n === 'Bandana') { R(10, U(SHOULDER), 5, 1, 'neckw'); P(sx1 + 1, U(12), 'neckw'); }

  // --- the near arm ---
  arm(-stride, 0);
  if (top === 'Shirtsleeves' || top === 'Uniform shirt' || top === 'Apron') for (let y = 16; y <= 18; y++) for (let x = 7; x <= 16; x++) if (L.at(x, U(y)) === 'sleeve' && !L.mat[U(y)][x].d) L.P(x, U(y), 'arm');
  if (pose === 'carry') for (let i = 0; i < 5; i++) O(sx1 - i, U(12 + i), STRAP);

  // --- the head ---
  if (n === 'Turtleneck') { R(11, U(NECK), 4, 2, 'neckw'); } else R(11, U(NECK), 3, 2, 'neckSkin', -1);
  paintHead(ctx, 'right');
  paintBodyExtras(ctx);
  if (ctx.opts.signature) { O(sx1, U(13), GOLD); O(sx1, U(14), ctx.frame % 2 ? LENS : '#e8f4f8'); O(sx1 - 1, U(12), '#3a2a20'); }
}

// ---------- heads (34a stand-ins: three hair shapes and one hat shape) ----------
// Templates are 12 wide, placed at column 6, so the head is columns 8-15; template row 2 is
// the top of the head (row 3 of the frame). Skin 1-4 = light..deep; w eye white; e eye;
// b brow; m mouth. Hair and hat H h d D = light..deep.

const FACE = {
  down: ['............', '............', '...122223...', '..12222223..', '..12222223..', '..1bb22bb3..', '.21we22ew33.', '..1222n233..', '...22mm23...', '....2233....'],
  up: ['............', '............', '...122223...', '..12222223..', '..12222223..', '..12222233..', '.2122222333.', '..12222233..', '...222233...', '....2233....'],
  right: ['............', '............', '...122223...', '..12222223..', '..12222222..', '..122222bb..', '..123322e2..', '..123322222.', '..122222m2..', '....22223...'],
};
const FACE_LASH = {
  down: [...FACE.down.slice(0, 6), '.2ewe22ewe3.', ...FACE.down.slice(7)],
  right: [...FACE.right.slice(0, 5), '..122222be..', ...FACE.right.slice(6)],
};
const HAIR = {
  short: {
    down: ['....Hhhh....', '..HHhhhhdd..', '..Hhhhhhdd..', '..hh....dd..', '..h......d..'],
    up: ['....Hhhh....', '..HHhhhhdd..', '..Hhhhhhdd..', '..hhhhhhdD..', '..hhhhhhdD..', '..hhhhhhdD..', '..hhhhhddd..', '...dddddD...'],
    right: ['...Hhhh.....', '..HHhhhhhd..', '..Hhhhhhhhd.', '..hhhhhd....', '..hhhh......', '..hhh.......', '..hd........', '..dd........'],
  },
  bob: {
    down: ['...HHhhh....', '..HHhhhhdd..', '.HHhhhhhhdd.', '.Hhhhhh.hdD.', '.hh......dD.', '.hh......dD.', '.hh......dD.', '.hd......DD.', '.dd......DD.'],
    up: ['...HHhhh....', '..HHhhhhdd..', '.HHhhhhhhdd.', '.Hhhhhhhhdd.', '.hhhhhhhhdD.', '.hhhhhhhhdD.', '.hhhhhhhhdD.', '.hhhhhhhddD.', '.hhhhhhdddD.', '.ddddddDDDD.'],
    right: ['...HHhhh....', '..HHhhhhhd..', '.HHhhhhhhhd.', '.Hhhhhhhhd..', '.hhhhhh.....', '.hhhhhh.....', '.hhhhhd.....', '.hhhhdd.....', '.dddDD......', '..DD........'],
  },
};
HAIR.long = {
  down: [...HAIR.bob.down, '.dd......DD.', '.dd......DD.', '.D........D.'],
  up: [...HAIR.bob.up, '.dhhhhhhddD.', '.ddddddDDDD.', '..DDDDDDDD..'],
  right: [...HAIR.bob.right.slice(0, 8), '.dhhhhd.....', '.dddddd.....', '.DDDDD......', '..DDD.......'],
};
const HAT = {
  down: ['...hhhhhh...', '..Hhhhhhhd..', '..DDDDDDDD..', 'HHhhhhhhhhdd'],
  up: ['...hhhhhh...', '..Hhhhhhhd..', '..DDDDDDDD..', 'HHhhhhhhhhdd'],
  right: ['....hhhhh...', '...Hhhhhhd..', '...DDDDDDD..', '.Hhhhhhhhhhd'],
};
const CAP = {   // brimless hats (beanies, berets, caps, scarves) until 34b
  down: ['...hhhhhh...', '..Hhhhhhhd..', '..Hhhhhhhd..', '..DDDDDDDD..'],
  up: ['...hhhhhh...', '..Hhhhhhhd..', '..Hhhhhhhd..', '..DDDDDDDD..'],
  right: ['...hhhhhh...', '..Hhhhhhhhd.', '..Hhhhhhhhd.', '..DDDDDDDD..'],
};
const LONG_HAIR = new Set(['Long', 'Streaked long', 'Waves', 'Braid', 'Dreadlocks', 'Pigtails']);
const BOB_HAIR = new Set(['Bob', 'Curls', 'Shaggy', 'Ponytail', 'Bun', 'Space buns', 'Top knot', 'Afro', 'Mullet', 'Pixie']);
const BRIMS = new Set(['Fedora', 'Bowler', 'Wide brim', 'Trilby', 'Top hat', 'Cowboy hat', 'Bucket hat', 'Deerstalker']);
const TONE = { H: 1, h: 0, d: -1, D: -2 };
const SKIN_T = { 1: 1, 2: 0, 3: -1, 4: -2, n: -1 };

function paintHead(ctx, view) {
  const { L, U, look, C, pose } = ctx;
  const ox = 6, oy = U(HEAD_TOP - 2);
  const hairName = PARTS.hair[look.hair], hatName = PARTS.hat[look.hat];
  const lashes = PARTS.eyes[look.eyes] === 'Lashes';
  const face = (lashes && FACE_LASH[view]) || FACE[view];
  const lip = mix(shade(C.skin, 0.6), '#8e4a44', 0.5);
  face.forEach((row, r) => [...row].forEach((ch, c) => {
    const x = ox + c, y = oy + r;
    if (ch === '.') return;
    if (ch in SKIN_T) { L.P(x, y, 'skin', SKIN_T[ch]); return; }
    L.P(x, y, 'skin', 0);
    if (pose === 'ko' && (ch === 'w' || ch === 'e')) { L.O(x, y, shade(C.skin, 0.62)); return; }
    if (ch === 'w') L.O(x, y, EYE_W);
    if (ch === 'e') L.O(x, y, EYE);
    if (ch === 'b') L.O(x, y, hairName === 'Bald' || hatName !== 'None' ? shade(C.skin, 0.55) : shade(C.hair, 0.6));
    if (ch === 'm') L.O(x, y, lip);
  }));
  const kind = hairName === 'Bald' ? null : LONG_HAIR.has(hairName) ? 'long' : BOB_HAIR.has(hairName) ? 'bob' : 'short';
  const hatted = hatName !== 'None' && hatName !== 'Hair bow';
  if (kind) HAIR[kind][view].forEach((row, r) => {
    if (hatted && r < 4) return;
    [...row].forEach((ch, c) => { if (ch in TONE) L.P(ox + c, oy + r, 'hair', TONE[ch]); });
  });
  if (hatted) (BRIMS.has(hatName) ? HAT : CAP)[view].forEach((row, r) => [...row].forEach((ch, c) => { if (ch in TONE) L.P(ox + c, oy + r, 'hat', TONE[ch]); }));
}
