// The 24x32 figure (Phase 14). Same looks as figure.js, painted bigger and shaded.
//
// How a frame is made:
//   1. Parts are painted as *materials* (skin, hair, coat, sleeve, ...) into a grid,
//      facing down, up or right. Left is right, mirrored, before shading, so the light
//      still comes from the same side.
//   2. Every material is shaded from its own edges: lit from the top left (lamplight),
//      darker toward the bottom right, a cast shadow under hair and hat brims.
//   3. Flat details go on top (eyes, buttons, the loupe's glint, stripes).
//   4. A dark outline tinted by whatever it borders, and a faint cool rim of moonlight
//      down the right side. Noir: warm key light, cold edge.
//
// Poses: walk (4 frames), idle (2, breathing), carry (4, the haul sack on your back),
// appraise (2, loupe to the eye, facing down), ko (1, lying down, 32x24).
// The feet sit at column 12, row 30, so a figure lines up with the old 16x16 one by
// drawing it at (x - 4, y - 15).

import { makeCanvas } from './sprites.js';
import { cleanLook, MOODS, shade, SKINS, HAIR_COLORS, CLOTH, EYE_COLORS, PARTS } from './figure.js';

export const HD_W = 24, HD_H = 32;
export const HD_OFFSET = { x: -4, y: -15 };   // from the 16x16 entity box to the 24x32 sprite
export const KO_OFFSET = { x: -8, y: -8 };    // the 32x24 knocked-out frame

// Phase 29: a Navy uniform's ribbons, name tag and collar stripes.
const RIBBONS = ['#b8322e', '#e6c24a', '#2f5fa8', '#3a8a4a'], TAG = '#15161a';
const AV_FRAME = '#9aa0ac', AVIATOR = '#6a3ad0', AVIATOR_L = '#b08cf0', AVIATOR_D = '#3a1e7a';
const INK = '#0b0a10', SHIRT = '#d8d0bc', WHITE = '#efe8d8', GOLD = '#e0a64a', SILVER = '#d4d6dc', LENS = '#9fc6d6', SACK = '#7a6446',
  SHOE = '#2a201c', LIP = '#8e4a44', MOON = '#a8bcd8', STRAP = '#4a3220', BANDAGE = '#e4dccb';

// ---------- colors ----------

export function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
// deep, dark, base, light
const ramp = hex => [shade(hex, 0.42), shade(hex, 0.68), hex, shade(hex, 1.22)];

// ---------- the layer: materials, then details ----------

export function makeLayer(W, H) {
  const mat = Array.from({ length: H }, () => Array(W).fill(null));
  const ov = Array.from({ length: H }, () => Array(W).fill(null));
  const inb = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
  const L = {
    W, H, mat, ov,
    // m: material name; t: a fixed tone (-2..1) instead of shading by edges; d: darker by this much.
    P(x, y, m, t = null, d = 0) { x = Math.round(x); y = Math.round(y); if (inb(x, y)) mat[y][x] = m ? { m, t, d } : null; },
    R(x, y, w, h, m, t, d) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) L.P(x + i, y + j, m, t, d); },
    // rows: { y: [x0, x1] | [[x0, x1], [x0, x1]] }
    S(rows, m, t, d, dy = 0) {
      for (const [y, spans] of Object.entries(rows)) for (const [a, b] of (Array.isArray(spans[0]) ? spans : [spans])) for (let x = a; x <= b; x++) L.P(x, +y + dy, m, t, d);
    },
    E(cx, cy, rx, ry, m, t, d) {   // a filled ellipse
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) L.P(x, y, m, t, d);
      }
    },
    erase(test) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (mat[y][x] && test(x, y, mat[y][x].m)) mat[y][x] = null; },
    // A flat detail: a color, or a function of the color underneath.
    O(x, y, c) { x = Math.round(x); y = Math.round(y); if (inb(x, y)) ov[y][x] = c; },
    at: (x, y) => (inb(x, y) ? mat[y][x]?.m ?? null : null),
    mirror() { for (const g of [mat, ov]) for (const r of g) r.reverse(); },
  };
  return L;
}

// Materials that sit in front of skin and throw a shadow on it.
const CASTS = new Set(['hair', 'hat', 'band', 'brim']);
const SKINLIKE = new Set(['skin', 'ear', 'neckSkin', 'hand', 'arm']);

// Shade, add details, outline, rim. band: how many pixels of light and shadow each edge gets.
export function compose(L, ramps, { band = 1, rim = true, outline = true } = {}) {
  const { W, H, mat, ov } = L;
  const out = Array.from({ length: H }, () => Array(W).fill(null));
  const base = Array.from({ length: H }, () => Array(W).fill(null));
  const same = (x, y, m) => (y >= 0 && y < H && x >= 0 && x < W ? mat[y][x]?.m === m : false);
  const dist = (x, y, dx, dy, m) => { for (let i = 1; i <= band + 1; i++) if (!same(x + dx * i, y + dy * i, m)) return i; return 99; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = mat[y][x];
    if (!c) continue;
    const r = ramps[c.m] ?? ramps.fallback;
    let t = c.t;
    if (t == null) {
      const right = dist(x, y, 1, 0, c.m), down = dist(x, y, 0, 1, c.m), left = dist(x, y, -1, 0, c.m), up = dist(x, y, 0, -1, c.m);
      if (right === 1 && down === 1) t = -2;
      else if (right === 1 || down === 1) t = -1;
      else if (band > 1 && (right === 2 || down === 2)) t = -1;
      else if (up <= band || left <= band) t = 1;
      else t = 0;
      if (SKINLIKE.has(c.m)) for (let i = 1; i <= band; i++) if (CASTS.has(mat[y - i]?.[x]?.m)) { t = Math.min(t, i === 1 ? -1 : 0); break; }
    }
    t = Math.max(-2, Math.min(1, t - (c.d || 0)));
    out[y][x] = r[t + 2]; base[y][x] = r[2];
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = ov[y][x];
    if (!o) continue;
    const c = typeof o === 'function' ? o(out[y][x]) : o;
    if (!c) continue;
    if (!out[y][x]) base[y][x] = c;
    out[y][x] = c;
  }
  const filled = out.map(r => r.map(Boolean));
  if (rim) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (filled[y][x] && mat[y][x] && !filled[y][x + 1] && x + 1 < W) out[y][x] = mix(out[y][x], MOON, 0.24);
  if (outline) {
    const res = out.map(r => [...r]);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (filled[y][x]) continue;
      let pick = null;
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) { const b = base[y + dy]?.[x + dx]; if (b) { pick = b; break; } }
      if (pick) res[y][x] = mix(shade(pick, 0.3), INK, 0.55);
    }
    return res;
  }
  return out;
}

// ---------- the look, as colors ----------

function palette(L, opts = {}) {
  const skin = SKINS[L.skin], hair = HAIR_COLORS[L.hairColor], hat = CLOTH[L.hatColor], top = CLOTH[L.topColor];
  const bot = CLOTH[L.bottomColor], ex = CLOTH[L.extraColor], neck = CLOTH[L.neckColor];
  const topName = PARTS.top[L.top], extraName = PARTS.extra[L.extra];
  const gloves = extraName === 'Gloves';
  const R = {
    skin: ramp(skin), ear: ramp(shade(skin, 0.94)), neckSkin: ramp(skin), arm: ramp(skin),
    hand: ramp(gloves ? shade(ex, 0.8) : skin),
    hair: ramp(hair), hat: ramp(hat), band: ramp(shade(hat, 0.55)), brim: ramp(hat),
    top: ramp(top), sleeve: ramp(topName === 'Vest' ? SHIRT : top), sleeveF: ramp(shade(topName === 'Vest' ? SHIRT : top, 0.8)), hood: ramp(shade(top, 0.9)),
    shirt: ramp(topName === 'Shirtsleeves' ? top : SHIRT), cuff: ramp(shade(topName === 'Shirtsleeves' ? top : SHIRT, 1.08)),
    legN: ramp(bot), legF: ramp(shade(bot, 0.8)), skirt: ramp(bot), stocking: ramp(shade(skin, 0.72)),
    shoe: ramp(SHOE), shoeF: ramp(shade(SHOE, 0.8)),
    neckw: ramp(neck), ex: ramp(ex), strap: ramp(STRAP), sack: ramp(SACK), gold: ramp(GOLD),
    wood: ramp('#8a6a3a'), steel: ramp('#8e939e'), cig: ramp('#ece6da'),
    fallback: ramp('#808080'),
  };
  return {
    R, skin, hair, top, ex, neck, eye: EYE_COLORS[L.eyeColor],
    beard: HAIR_COLORS[L.beardColor ?? L.hairColor], beardD: shade(HAIR_COLORS[L.beardColor ?? L.hairColor], 0.62),
    skinD: shade(skin, 0.7), skinDD: shade(skin, 0.55), hairD: shade(hair, 0.62), hairL: shade(hair, 1.3),
  };
}

// ---------- painting a frame ----------

// facing: down | up | left | right. pose: walk | idle | carry | appraise | ko.
// opts.signature: the appraiser's loupe on its cord (the player always wears it).
export function paintHD(lookIn, facing = 'down', frame = 0, pose = 'walk', opts = {}) {
  const look = cleanLook(lookIn);
  if (pose === 'ko') return paintKO(look, opts);
  if (pose === 'appraise') facing = 'down';
  const L = makeLayer(HD_W, HD_H);
  const C = palette(look, opts);
  const view = facing === 'left' ? 'right' : facing;
  paintBody(L, look, C, view, frame, pose, opts);
  if (facing === 'left') L.mirror();
  const g = compose(L, C.R);
  return look.height === 3 ? stretchTall(g, 4) : look.height === 2 || (!look.height && look.short) ? squashShort(g) : look.height ? stretchTall(g) : g;
}

// Short (v2.4, for Mike): two rows out of the body and the legs, the head and feet kept.
function squashShort(g) {
  const drop = new Set([21, 26]);
  const out = g.filter((_, y) => !drop.has(y));
  return [...Array.from({ length: drop.size }, () => Array(g[0].length).fill(null)), ...out];
}

// Tall (Phase 23, for Dex): the finished figure, a few pixels longer in the body and the
// legs, using the empty rows above the head. Same face, same width, same feet.
function stretchTall(g, most = 3) {
  let empty = 0;
  while (empty < g.length && g[empty].every(c => !c)) empty++;
  const k = Math.min(most, empty), extra = new Set([21, 27, 24, 18].slice(0, k));
  const out = [];
  for (let y = k; y < g.length; y++) { out.push(g[y]); if (extra.has(y)) out.push([...g[y]]); }
  return out;
}

function paintKO(look, opts) {
  const L = makeLayer(HD_W, HD_H);
  const C = palette(look, opts);
  paintBody(L, look, C, 'down', 0, 'ko', opts);
  const g = compose(L, C.R);
  // Lying on the floor, head to the left: the standing frame turned on its side.
  return Array.from({ length: HD_W }, (_, y) => Array.from({ length: HD_H }, (_, x) => g[x][y]));
}

const HD_NEAREST = {
  hair: { Pixie: 'Crop', 'Space buns': 'Bun', Pigtails: 'Bob', Dreadlocks: 'Shaggy', 'Top knot': 'Bun', 'Side shave': 'Undercut', 'Bowl cut': 'Bob', Pompadour: 'Slick back', Cornrows: 'Crop', Mullet: 'Shaggy' },
  hat: { Newsboy: 'Flat cap', Deerstalker: 'Flat cap', 'Cowboy hat': 'Wide brim', 'Bucket hat': 'Bowler', Headscarf: 'Beret', 'Hood up': 'Beanie', Veil: 'Trilby', Pillbox: 'Beret', 'Gas mask': 'None', Bandana: 'Beanie' },
  eyes: { Almond: 'Round', Downturned: 'Hooded' },
  brows: { Bushy: 'Heavy', Unibrow: 'Heavy', Shaved: 'Thin' },
  mark: { 'Burn scar': 'Cheek scar', Birthmark: 'Mole', 'Stitched scar': 'Cheek scar', 'Eye scar': 'Brow scar' },
  facial: { Handlebar: 'Mustache', 'Soul patch': 'Goatee', Chinstrap: 'Beard' },
};
// Widths by build: Slim, Regular, Broad, Lean, Stocky, Heavyset, Athletic. The first three are
// as they have always been; Heavyset also gets the round belly.
const BODY_HW = [4, 5, 6, 4, 6, 7, 6];
const BODY_SIDE = [[9, 13], [9, 14], [8, 15], [9, 13], [8, 15], [7, 16], [8, 14]];
const BODY_RX = [15, 17, 19, 16, 18, 21, 20];
const BELLY = 5;

function paintBody(L, look, C, view, frame, pose, opts) {
  const { P, R, S, O } = L;
  const near = (k, n) => HD_NEAREST[k]?.[n] ?? n;   // the small figure draws the newer options as their nearest older one
  const names = {
    hair: near('hair', PARTS.hair[look.hair]), hat: near('hat', PARTS.hat[look.hat]), top: PARTS.top[look.top], bottom: PARTS.bottom[look.bottom],
    extra: PARTS.extra[look.extra], facial: PARTS.facial[look.facial], face: PARTS.face[look.face],
    eyes: near('eyes', PARTS.eyes[look.eyes]), brows: near('brows', PARTS.brows[look.brows]), mouth: PARTS.mouth[look.mouth], mark: near('mark', PARTS.mark[look.mark]),
    pattern: PARTS.pattern[look.pattern], neck: PARTS.neck[look.neck],
  };
  names.facial = near('facial', names.facial);
  const walking = pose === 'walk' || pose === 'carry';
  const bob = (walking && frame % 2 === 1) || (pose === 'idle' && frame === 1) ? 1 : 0;
  // Which leg is forward: +1 the left (or near) leg, -1 the other, 0 both under you.
  const stride = walking ? [1, 0, -1, 0][frame % 4] : 0;
  const longCoat = names.top === 'Trench coat' || names.top === 'Overcoat';
  const b = look.build;
  const ctx = { look, C, names, view, frame, pose, bob, stride, longCoat, b, opts };

  if (view === 'right') return paintSide(L, ctx);

  const front = view === 'down';
  const hw = BODY_HW[b], x0 = 12 - hw, x1 = 11 + hw;
  const U = y => y - bob;
  ctx.x0 = x0; ctx.x1 = x1; ctx.U = U;

  // Behind everything: a ponytail peeking out, the haul sack on a back.
  if (front && names.hair === 'Ponytail' && names.hat === 'None') { R(17, U(11), 2, 6, 'hair'); P(18, U(17), 'hair'); }
  if (pose === 'carry' && front) { S({ 9: [17, 20], 10: [16, 21], 11: [16, 21], 12: [16, 21], 13: [16, 21], 14: [17, 21], 15: [17, 20] }, 'sack', null, 0, -bob); }

  // --- legs and shoes ---
  const legTop = 24 - bob;
  const legs = [[8, 1], [13, -1]];   // left leg x 8-10 forward on stride +1, right leg x 13-15 on -1
  for (const [lx, side] of legs) {
    const lifted = stride !== 0 && stride !== side;  // the back leg lifts its heel
    const bottom = lifted ? 27 : 28;
    if (names.bottom === 'Skirt' || names.bottom === 'Long skirt') R(lx, legTop, 3, bottom - legTop + 1, 'stocking');
    else R(lx, legTop, 3, bottom - legTop + 1, 'legN');
    const sy = bottom + 1, toe = lx === 8 ? lx - 1 : lx;
    R(lx, sy, 3, 1, 'shoe'); R(toe, sy + 1, 4, 1, 'shoe');
    if (names.bottom === 'Work pants') { O(lx + 1, 26, c => c && shade(c, 0.8)); R(lx, bottom, 3, 1, 'legN', 1); }
  }
  if (names.bottom === 'Skirt') { S({ 24: [x0, x1], 25: [x0, x1], 26: [x0 - 1, x1 + 1] }, 'skirt', null, 0, -bob); }
  if (names.bottom === 'Long skirt') { S({ 24: [x0, x1], 25: [x0, x1], 26: [x0 - 1, x1 + 1], 27: [x0 - 1, x1 + 1], 28: [x0 - 1, x1 + 1] }, 'skirt', null, 0, -bob); }

  // v2.4: a shovel held at the side, blade on the ground (the hand closes over the shaft).
  if (look.prop === 'shovel' && pose !== 'ko') paintShovelFront(L, ctx);

  // --- arms (behind the torso's edge) ---
  const raised = pose === 'appraise' || (pose === 'carry' && front);
  paintArmsFront(L, ctx, raised);

  // --- torso ---
  paintTopFront(L, ctx);
  // v2.4: a round belly over the belt.
  if (look.plump || b === BELLY) for (let y = 19; y <= 23; y++) { const w = y === 19 || y === 23 ? 0 : 1; if (w) { P(x0 - 1, U(y), 'top'); P(x1 + 1, U(y), 'top'); } }
  if ((look.plump || b === BELLY) && front) for (let x = x0 + 1; x < x1; x++) L.O(x, U(23), c => c && shade(c, 0.72));

  // --- head ---
  S({ 4: [9, 14], 5: [8, 15], 6: [7, 16], 7: [7, 16], 8: [7, 16], 9: [7, 16], 10: [7, 16], 11: [7, 16], 12: [7, 16], 13: [7, 16], 14: [8, 15], 15: [9, 14] }, 'skin', null, 0, -bob);
  R(6, U(10), 1, 3, 'ear'); R(17, U(10), 1, 3, 'ear');
  if (names.neck !== 'Turtleneck') R(10, U(16), 4, 1, 'neckSkin', -1);
  if (front) paintFaceFront(L, ctx);

  paintHair(L, ctx);
  paintHat(L, ctx);
  paintExtrasFront(L, ctx);
  if (pose === 'carry' && !front) {
    // The sack, full, across your back; knotted at the top.
    S({ 12: [10, 13], 13: [8, 15], 14: [7, 16], 15: [7, 16], 16: [7, 16], 17: [7, 16], 18: [7, 16], 19: [7, 16], 20: [7, 16], 21: [8, 15], 22: [8, 15] }, 'sack', null, 0, -bob);
    R(11, U(11), 2, 1, 'strap');
    O(9, U(16), c => c && shade(c, 0.8)); O(14, U(19), c => c && shade(c, 0.8)); O(10, U(20), c => c && shade(c, 0.85));
  }
  if (pose === 'appraise') paintLoupeRaised(L, ctx);
  if (pose === 'ko') {
    // Out cold: eyes shut.
    for (const x of [9, 10, 13, 14]) { O(x, 10, null); O(x, 11, C.skinDD); }
  }
}

function paintShovelFront(L, ctx) {
  const { P, R } = L;
  const { x1, U, view } = ctx;
  const sx = view === 'up' ? ctx.x0 - 3 : x1 + 2;
  for (let y = 12; y <= 24; y++) P(sx, U(y), 'wood', y % 4 ? 0 : 1);
  R(sx - 1, U(10), 3, 1, 'wood', 1); P(sx - 1, U(11), 'wood', 0); P(sx + 1, U(11), 'wood', 0);
  // The blade, its point in the dirt.
  R(sx - 2, 25, 5, 1, 'steel', 1); R(sx - 2, 26, 5, 3, 'steel'); R(sx - 1, 29, 3, 1, 'steel', -1);
  L.O(sx, 25, c => c && shade(c, 0.7));
}

function paintArmsFront(L, ctx, raised) {
  const { R, P } = L;
  const { x0, x1, U, stride, pose, names } = ctx;
  const shirtsleeves = names.top === 'Shirtsleeves';
  const sl = names.top === 'Tank top' ? 'arm' : 'sleeve';   // Phase 20: bare arms in a tank top
  // The forward arm swings down a pixel, the back one up (the legs do the opposite).
  const drop = side => (stride === 0 ? 0 : stride === side ? -1 : 1);
  const arm = (ax, side) => {
    const dy = drop(side);
    if (shirtsleeves) { R(ax, U(18), 2, 3, 'sleeve'); R(ax, U(21) , 2, 1, 'cuff'); R(ax, U(22), 2, 1 + dy, 'arm'); }
    else if (names.top === 'Uniform shirt') { R(ax, U(18), 2, 3, 'sleeve'); R(ax, U(21), 2, 2 + dy, 'arm'); L.O(ax, U(20), c => c && shade(c, 0.8)); L.O(ax + 1, U(20), c => c && shade(c, 0.8)); }
    else { R(ax, U(18), 2, 5 + dy, sl); if (names.top === 'Jumper') { L.O(ax, U(21) + dy, WHITE); L.O(ax + 1, U(21) + dy, WHITE); } }
    R(ax, U(23) + dy, 2, 2, 'hand');
  };
  arm(x0 - 2, -1);
  if (!raised) arm(x1 + 1, 1);
  else if (pose === 'carry') {
    // Right arm up over the shoulder, holding the sack's neck.
    R(x1 + 1, U(13), 2, 6, sl); R(x1 + 1, U(11), 2, 2, 'hand');
  } else {
    // Appraising: the right hand comes up to the eye.
    R(x1 + 1, U(18), 2, 2, sl); R(x1, U(16), 2, 2, sl); R(15, U(14), 2, 2, sl); R(14, U(12), 2, 2, 'hand');
    P(x1 + 2, U(17), null);
  }
}

function paintTopFront(L, ctx) {
  const { R, S, P, O } = L;
  const { x0, x1, U, names, view, longCoat, C, bob, stride, look } = ctx;
  const front = view === 'down';
  const top = names.top;
  const hem = longCoat ? 27 : top === 'Jacket' || top === 'Suit jacket' || top === 'Hoodie' ? 24 : 23;
  // Shoulders a pixel in from the arms, then straight down.
  R(x0 + 1, U(17), x1 - x0 - 1, 1, 'top');
  R(x0, U(18), x1 - x0 + 1, hem - 17 - (hem > 23 ? 0 : 0), 'top');
  if (hem > 23) {
    // Below the waist the hem is fixed (it doesn't bob), and a long coat swings with the stride.
    const swing = longCoat ? stride : 0;
    for (let y = 24; y <= hem; y++) {
      const flare = longCoat && y >= 26 ? 1 : 0;
      R(x0 - flare, y, x1 - x0 + 1 + flare * 2, 1, 'top');
    }
    if (longCoat && front) { for (let y = 24; y <= hem; y++) { P(11, y, null); P(12, y, null); } if (swing) { P(swing > 0 ? x0 - 1 : x1 + 1, hem, null); } }
    if (longCoat && !front) for (let y = 24; y <= hem; y++) L.O(11, y, c => c && shade(c, 0.75));   // the back vent
  }
  const opening = front && ['Trench coat', 'Jacket', 'Vest', 'Suit jacket', 'Overcoat'].includes(top);
  if (front) {
    if (top === 'Shirtsleeves') {
      // Suspenders over the shirt.
      for (let y = 17; y <= 23; y++) { O(9, U(y), shade(C.ex, 0.7)); O(14, U(y), shade(C.ex, 0.7)); }
      O(9, U(17), null); O(14, U(17), null);
    }
    if (opening) {
      const v = top === 'Suit jacket' ? { 17: [10, 13], 18: [10, 13], 19: [11, 12], 20: [11, 12] }
        : top === 'Vest' ? { 17: [10, 13], 18: [11, 12], 19: [11, 12] }
        : top === 'Jacket' ? { 17: [10, 13], 18: [11, 12], 19: [11, 12], 20: [11, 12], 21: [11, 12], 22: [11, 12], 23: [11, 12] }
        : { 17: [10, 13], 18: [11, 12], 19: [11, 12] };
      S(v, 'shirt', null, 0, -bob);
      // Lapels: a lit edge on the left of the opening, a dark one on the right.
      const ys = Object.keys(v).map(Number);
      for (const y of ys) { const [a, b2] = v[y]; O(a - 1, U(y), c => c && shade(c, 1.18)); O(b2 + 1, U(y), c => c && shade(c, 0.7)); }
    }
    if (top === 'Trench coat') {
      R(x0, U(21), x1 - x0 + 1, 1, 'top', -1);                    // the belt
      O(11, U(21), GOLD); O(12, U(21), shade(GOLD, 0.7));
      for (const [x, y] of [[9, 19], [14, 19], [9, 23], [14, 23]]) O(x, U(y), c => c && shade(c, 0.6));
    }
    if (top === 'Overcoat') {
      R(x0 + 1, U(17), x1 - x0 - 1, 1, 'top', 1);                 // a wide collar
      for (const y of [19, 21, 23]) { O(9, U(y), c => c && shade(c, 0.55)); O(14, U(y), c => c && shade(c, 0.55)); }
    }
    if (top === 'Jacket') for (const y of [20, 22]) O(10, U(y), c => c && shade(c, 0.6));
    if (top === 'Suit jacket') { O(12, U(22), c => c && shade(c, 0.55)); O(x1 - 2, U(19), WHITE); O(x1 - 1, U(19), WHITE); }
    if (top === 'Vest') for (const y of [20, 22]) O(12, U(y), c => c && shade(c, 0.55));
    if (top === 'Sweater') { R(10, U(17), 4, 1, 'top', -1); for (let x = x0; x <= x1; x++) O(x, 23, c => c && shade(c, x % 2 ? 0.8 : 1.1)); }
    if (top === 'Tank top') S({ 17: [x0 + 2, x1 - 2], 18: [10, 13] }, 'neckSkin', null, 0, -bob);
    if (top === 'Uniform shirt') {
      // A short-sleeved service shirt: open collar, a button placket, two pocket flaps,
      // ribbons over the left pocket and a name tag over the right.
      S({ 17: [11, 12] }, 'neckSkin', null, 0, -bob);
      O(11, U(17), WHITE); O(12, U(17), shade(WHITE, 0.85));
      O(10, U(17), c => c && shade(c, 1.25)); O(13, U(17), c => c && shade(c, 1.25));
      for (const y of [21, 22, 23]) { O(x0 + 2, U(y), c => c && shade(c, 0.86)); O(x1 - 2, U(y), c => c && shade(c, 0.86)); }   // darts
      for (const y of [18, 20, 22]) O(12, U(y), c => c && shade(c, 0.7));
      for (const x of [x0 + 1, x0 + 2, x1 - 2, x1 - 1]) O(x, U(20), c => c && shade(c, 0.78));
      O(x1 - 2, U(19), RIBBONS[0]); O(x1 - 1, U(19), RIBBONS[2]); O(x1 - 3, U(19), RIBBONS[1]);
      O(x0 + 1, U(19), TAG); O(x0 + 2, U(19), WHITE);
    }
    if (top === 'Jumper') {
      // Dress blues: a V neck over a white undershirt, the striped collar's edges, and the
      // black neckerchief knotted at the bottom of the V.
      S({ 17: [10, 13], 18: [11, 12] }, 'neckSkin', null, 0, -bob);
      O(11, U(17), WHITE); O(12, U(17), WHITE);
      for (const [x, y] of [[9, 17], [10, 18], [14, 17], [13, 18]]) O(x, U(y), WHITE);
      O(11, U(19), C.neck); O(12, U(19), shade(C.neck, 0.7)); O(11, U(20), shade(C.neck, 0.8)); O(12, U(20), C.neck);
      O(10, U(18), WHITE); O(11, U(21), shade(C.neck, 0.8));
    }
    if (top === 'Hoodie') {
      S({ 16: [8, 15] }, 'hood', null, 0, -bob); R(9, U(21), 6, 2, 'top', -1);
      O(10, U(18), WHITE); O(10, U(19), WHITE); O(13, U(18), WHITE); O(13, U(19), WHITE);
    }
  } else {
    if (top === 'Trench coat') R(x0, U(21), x1 - x0 + 1, 1, 'top', -1);
    if (top === 'Hoodie') S({ 15: [9, 14], 16: [8, 15], 17: [8, 15] }, 'hood', null, 0, -bob);
    if (top === 'Overcoat') R(x0 + 1, U(17), x1 - x0 - 1, 1, 'top', 1);
    if (top === 'Sweater') for (let x = x0; x <= x1; x++) O(x, 23, c => c && shade(c, x % 2 ? 0.8 : 1.1));
    if (top === 'Tank top') S({ 17: [x0 + 2, x1 - 2] }, 'neckSkin', null, 0, -bob);
    if (top === 'Jumper') {
      // The square sailor collar across the back, edged with white stripes.
      for (let x = x0 + 1; x <= x1 - 1; x++) { O(x, U(21), WHITE); O(x, U(22), c => c && shade(c, 0.7)); }
      for (let y = 17; y <= 21; y++) { O(x0 + 1, U(y), WHITE); O(x1 - 1, U(y), WHITE); }
      for (let x = x0 + 2; x <= x1 - 2; x++) for (let y = 17; y <= 20; y++) O(x, U(y), c => c && shade(c, 1.12));
    }
  }
  paintPattern(L, ctx);
  if (front) paintNeckFront(L, ctx, opening);
}

// Pinstripe, check or patches, over the top and sleeves, after shading.
function paintPattern(L, ctx) {
  const name = ctx.names.pattern;
  if (name === 'Plain') return;
  for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
    const m = L.mat[y][x]?.m;
    if (m !== 'top' && m !== 'sleeve' && m !== 'hood') continue;
    if (L.ov[y][x]) continue;
    if (name === 'Pinstripe' && x % 3 === 0 && y % 2 === 0) L.O(x, y, c => c && shade(c, 1.35));
    if (name === 'Check' && (x % 4 === 0 || y % 4 === 0)) L.O(x, y, c => c && shade(c, (x % 4 === 0 && y % 4 === 0) ? 0.62 : 0.8));
  }
  if (name === 'Patched') {
    const { view, x0, x1, U } = ctx;
    const px = view === 'right' ? 10 : x1 - 3, py = U(20);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) L.O(px + i, py + j, mix(ctx.C.top, '#8a7a5a', 0.6));
    L.O(px - 1, py, c => c && shade(c, 0.6)); L.O(px + 3, py + 1, c => c && shade(c, 0.6));
    if (view !== 'right') { L.O(x0 + 1, U(22), mix(ctx.C.top, '#6a5a4a', 0.5)); }
  }
}

function paintNeckFront(L, ctx, opening) {
  const { O, R, S } = L;
  const { U, names, C, bob, x0, x1 } = ctx;
  const n = names.neck, top = names.top;
  const shirtShows = opening || top === 'Shirtsleeves';
  const onShirt = (x, y) => L.at(x, U(y)) === 'shirt' || top === 'Shirtsleeves';
  const tie = C.neck, tieD = shade(C.neck, 0.7);
  if (n === 'Open collar' && shirtShows) { O(10, U(17), WHITE); O(13, U(17), WHITE); }
  if (n === 'Necktie' && shirtShows) {
    O(11, U(17), tieD); O(12, U(17), tieD);
    for (let y = 18; y <= 22; y++) if (onShirt(11, y)) { O(11, U(y), tie); O(12, U(y), tieD); }
    if (top === 'Shirtsleeves') { O(11, U(23), tie); }
  }
  if (n === 'Bow tie') { for (const x of [10, 13]) O(x, U(17), tie); O(11, U(17), tieD); O(12, U(17), tieD); }
  if (n === 'Turtleneck') { R(9, U(16), 6, 1, 'neckw'); R(10, U(17), 4, 1, 'neckw'); }
  if (n === 'Bandana') { S({ 16: [9, 14], 17: [10, 13] }, 'neckw', null, 0, -bob); O(11, U(18), tie); O(12, U(18), tieD); }
}

function paintFaceFront(L, ctx) {
  const { O } = L;
  const { U, C, names } = ctx;
  const ink = INK, eye = C.eye;
  // Eyes: left at x 9-10, right at 13-14, rows 10-11. Lit from the top left.
  const eyesOf = {
    Round: [[0, 0, WHITE], [1, 0, eye], [0, 1, eye], [1, 1, ink]],
    Narrow: [[0, 0, C.skinD], [1, 0, C.skinD], [0, 1, ink], [1, 1, eye]],
    Hooded: [[0, 0, C.skinDD], [1, 0, C.skinDD], [0, 1, eye], [1, 1, ink]],
    Wide: [[0, 0, WHITE], [0, 1, WHITE], [1, 0, eye], [1, 1, ink]],
    Lashes: [[0, 0, WHITE], [1, 0, eye], [0, 1, eye], [1, 1, ink], [-1, 0, ink]],
  }[names.eyes];
  for (const [dx, dy, c] of eyesOf) {
    O(9 + dx, U(10 + dy), c);
    // The right eye mirrors the shape, not the light.
    const mx = dx === -1 ? 2 : 1 - dx;
    const mc = c === WHITE && (names.eyes === 'Round' || names.eyes === 'Lashes') ? (dy === 0 ? WHITE : c) : c;
    O(13 + mx, U(10 + dy), names.eyes === 'Round' || names.eyes === 'Lashes' ? ({ '0,0': WHITE, '1,0': eye, '0,1': eye, '1,1': ink }[`${dx},${dy}`] ?? ink) : mc);
  }
  if (names.eyes === 'Round' || names.eyes === 'Lashes') { O(13, U(10), WHITE); O(14, U(10), eye); O(13, U(11), eye); O(14, U(11), ink); if (names.eyes === 'Lashes') O(15, U(10), ink); }

  // Brows, row 9 (or 8 when raised).
  const brow = names.hair === 'Bald' ? shade(C.skin, 0.5) : C.hairD;
  const browOf = {
    Straight: [[9, 9], [10, 9], [13, 9], [14, 9]],
    Arched: [[8, 9], [9, 8], [10, 8], [13, 8], [14, 8], [15, 9]],
    Heavy: [[8, 9], [9, 9], [10, 9], [13, 9], [14, 9], [15, 9], [9, 8], [14, 8]],
    Thin: [[9, 9], [10, 9], [13, 9], [14, 9]],
    Furrowed: [[9, 8], [10, 9], [13, 9], [14, 8]],
  }[names.brows];
  for (const [x, y] of browOf) O(x, U(y), names.brows === 'Thin' ? mix(brow, C.skin, 0.4) : brow);

  // Nose: a shadow on the side away from the light.
  O(12, U(12), C.skinD); O(11, U(12), c => c && shade(c, 0.9));

  // Mouth, row 14.
  const lip = mix(C.skinDD, LIP, 0.45);
  const mouthOf = {
    Neutral: [[11, 14, lip], [12, 14, lip]],
    Smirk: [[11, 14, lip], [12, 14, lip], [13, 13, lip]],
    Frown: [[11, 14, lip], [12, 14, lip], [10, 15, lip], [13, 15, lip]],
    Full: [[11, 14, LIP], [12, 14, shade(LIP, 0.8)], [11, 15, shade(LIP, 1.15)], [12, 15, LIP]],
    Grin: [[10, 14, lip], [11, 14, WHITE], [12, 14, WHITE], [13, 14, lip]],
    Smile: [[10, 13, lip], [11, 14, lip], [12, 14, lip], [13, 13, lip]],
    // Phase 29b: a closed smile with a little color in the lips.
    'Soft smile': [[10, 13, mix(lip, LIP, 0.5)], [11, 14, mix(LIP, '#c46a6e', 0.4)], [12, 14, mix(LIP, '#c46a6e', 0.25)], [13, 13, mix(lip, LIP, 0.5)]],
  }[names.mouth];
  for (const [x, y, c] of mouthOf) O(x, U(y), c);

  // Skin details.
  if (names.face === 'Freckles') for (const [x, y] of [[8, 12], [10, 12], [13, 12], [15, 12], [9, 13], [14, 13]]) O(x, U(y), c => c && shade(c, 0.78));
  if (names.face === 'Tired eyes') for (const x of [9, 10, 13, 14]) O(x, U(12), c => c && mix(c, '#5a4a6a', 0.3));
  if (names.face === 'Rosy') for (const [x, y] of [[8, 13], [9, 13], [14, 13], [15, 13]]) O(x, U(y), c => c && mix(c, '#c46a5e', 0.55));
  if (names.mark === 'Brow scar') { O(10, U(8), mix(C.skin, '#e8d0c0', 0.6)); O(10, U(9), mix(C.skin, '#e8d0c0', 0.6)); O(10, U(10), c => c && mix(c, '#e8d0c0', 0.3)); }
  if (names.mark === 'Cheek scar') { O(14, U(12), mix(C.skin, '#e8d0c0', 0.55)); O(15, U(13), mix(C.skin, '#e8d0c0', 0.55)); O(13, U(13), C.skinD); }
  if (names.mark === 'Mole') O(14, U(13), shade(C.skin, 0.42));
  if (names.mark === 'Bandage') { O(14, U(12), BANDAGE); O(15, U(12), BANDAGE); O(14, U(13), shade(BANDAGE, 0.85)); O(15, U(13), BANDAGE); }

  // Facial hair.
  const fh = names.facial, H = C.beard, HD = C.beardD;
  if (fh === 'Stubble') for (let x = 8; x <= 15; x++) for (const y of [13, 14, 15]) if (!(y === 14 && x >= 11 && x <= 12) && !(y === 15 && (x < 9 || x > 14))) O(x, U(y), c => c && mix(c, H, 0.28));
  if (fh === 'Mustache') { for (let x = 10; x <= 13; x++) O(x, U(13), H); O(10, U(14), HD); O(13, U(14), HD); }
  if (fh === 'Beard') {
    for (const [y, a, b2] of [[12, 7, 7], [12, 16, 16], [13, 7, 16], [14, 8, 15], [15, 9, 14], [16, 10, 13]]) for (let x = a; x <= b2; x++) O(x, U(y), x % 2 ? H : HD);
    O(11, U(14), lip); O(12, U(14), lip);
  }
  if (fh === 'Goatee') { for (const x of [11, 12]) { O(x, U(15), H); O(x, U(16), HD); } O(10, U(13), H); O(13, U(13), H); }
  if (fh === 'Sideburns') for (const y of [10, 11, 12, 13]) { O(7, U(y), H); O(16, U(y), H); }
}

// ---------- hair ----------

const HAIR_FRONT = {
  Crop: { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [7, 16], 7: [[7, 7], [16, 16]] },
  'Side part': { 2: [10, 14], 3: [9, 15], 4: [8, 16], 5: [7, 16], 6: [7, 16], 7: [[7, 7], [11, 16]], 8: [[7, 7], [15, 16]] },
  Long: { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [6, 17], 7: [[6, 9], [14, 17]], 8: [[6, 7], [16, 17]], 9: [[6, 7], [16, 17]], 10: [[5, 6], [17, 18]], 11: [[5, 6], [17, 18]], 12: [[5, 6], [17, 18]], 13: [[5, 6], [17, 18]], 14: [[5, 7], [16, 18]], 15: [[5, 7], [16, 18]], 16: [[5, 7], [16, 18]], 17: [[5, 6], [17, 18]], 18: [[5, 6], [17, 18]], 19: [[5, 5], [18, 18]] },
  Bun: { 0: [10, 13], 1: [10, 13], 2: [11, 12], 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [7, 16], 7: [[7, 7], [16, 16]] },
  Curls: { 1: [9, 14], 2: [7, 16], 3: [6, 17], 4: [6, 17], 5: [6, 17], 6: [6, 17], 7: [[6, 8], [10, 10], [13, 13], [15, 17]], 8: [[6, 7], [16, 17]], 9: [[6, 6], [17, 17]] },
  Mohawk: { 0: [11, 12], 1: [10, 13], 2: [10, 13], 3: [10, 13], 4: [10, 13], 5: [10, 13], 6: [11, 12] },
  Bob: { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [6, 17], 7: [6, 17], 8: [[6, 8], [15, 17]], 9: [[6, 7], [16, 17]], 10: [[5, 6], [17, 18]], 11: [[5, 6], [17, 18]], 12: [[5, 6], [17, 18]], 13: [[5, 7], [16, 18]], 14: [[5, 7], [16, 18]] },
  'Slick back': { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [7, 16], 7: [[7, 7], [16, 16]] },
  Ponytail: { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [7, 16], 7: [[7, 8], [15, 16]] },
  Afro: { 0: [9, 14], 1: [7, 16], 2: [6, 17], 3: [5, 18], 4: [5, 18], 5: [5, 18], 6: [5, 18], 7: [[5, 7], [16, 18]], 8: [[5, 6], [17, 18]], 9: [[5, 6], [17, 18]], 10: [[5, 6], [17, 18]], 11: [[5, 5], [18, 18]] },
  Undercut: { 1: [10, 14], 2: [9, 16], 3: [8, 16], 4: [8, 16], 5: [8, 16], 6: [12, 16] },
  Braid: { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [7, 16], 7: [[6, 8], [15, 16]], 8: [[6, 7], [16, 16]], 9: [6, 7], 10: [5, 6], 11: [5, 6], 12: [5, 6], 13: [5, 6] },
};
const HAIR_BACK = {
  Crop: { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [7, 16], 7: [7, 16], 8: [7, 16], 9: [7, 16], 10: [7, 16], 11: [7, 16], 12: [7, 16], 13: [8, 15] },
  Long: { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [6, 17], 7: [6, 17], 8: [6, 17], 9: [6, 17], 10: [5, 18], 11: [5, 18], 12: [5, 18], 13: [5, 18], 14: [5, 18], 15: [5, 18], 16: [6, 17], 17: [6, 17], 18: [7, 16], 19: [8, 15] },
  Curls: { 1: [9, 14], 2: [7, 16], 3: [6, 17], 4: [6, 17], 5: [6, 17], 6: [6, 17], 7: [6, 17], 8: [6, 17], 9: [6, 17], 10: [6, 17], 11: [6, 17], 12: [7, 16], 13: [7, 16], 14: [8, 15] },
  Mohawk: { 0: [11, 12], 1: [10, 13], 2: [10, 13], 3: [10, 13], 4: [10, 13], 5: [10, 13], 6: [10, 13], 7: [10, 13], 8: [10, 13], 9: [10, 13], 10: [10, 13], 11: [10, 13], 12: [10, 13], 13: [11, 12] },
  Bob: { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [6, 17], 7: [6, 17], 8: [6, 17], 9: [6, 17], 10: [5, 18], 11: [5, 18], 12: [5, 18], 13: [5, 18], 14: [5, 18] },
  Afro: { 0: [9, 14], 1: [7, 16], 2: [6, 17], 3: [5, 18], 4: [5, 18], 5: [5, 18], 6: [5, 18], 7: [5, 18], 8: [5, 18], 9: [5, 18], 10: [5, 18], 11: [5, 18], 12: [6, 17], 13: [7, 16] },
  Undercut: { 1: [10, 14], 2: [9, 15], 3: [8, 15], 4: [8, 15], 5: [8, 15], 6: [8, 15], 7: [8, 15] },
};
HAIR_BACK['Side part'] = HAIR_BACK['Slick back'] = HAIR_BACK.Crop;
HAIR_BACK.Bun = { 0: [10, 13], 1: [10, 13], 2: [11, 12], ...HAIR_BACK.Crop };
HAIR_BACK.Ponytail = { ...HAIR_BACK.Crop, 14: [10, 13], 15: [10, 13], 16: [10, 13], 17: [10, 13], 18: [11, 12], 19: [11, 12], 20: [11, 12] };
HAIR_BACK.Braid = { ...HAIR_BACK.Crop, 14: [10, 13], 15: [10, 13], 16: [10, 13], 17: [10, 13], 18: [10, 13], 19: [10, 13], 20: [10, 13], 21: [10, 13], 22: [11, 12] };
const HAIR_SIDE = {
  Crop: { 3: [10, 14], 4: [9, 15], 5: [8, 16], 6: [8, 15], 7: [8, 12], 8: [[8, 10], [12, 12]], 9: [[8, 10], [12, 12]], 10: [8, 10], 11: [8, 10], 12: [8, 10], 13: [8, 9] },
  'Side part': { 2: [10, 14], 3: [9, 15], 4: [8, 16], 5: [8, 17], 6: [8, 17], 7: [[8, 12], [16, 17]], 8: [[8, 10], [12, 12]], 9: [[8, 10], [12, 12]], 10: [8, 10], 11: [8, 10], 12: [8, 10], 13: [8, 9] },
  Long: { 3: [10, 14], 4: [9, 15], 5: [8, 16], 6: [7, 16], 7: [7, 12], 8: [6, 12], 9: [6, 12], 10: [6, 10], 11: [6, 10], 12: [6, 10], 13: [6, 10], 14: [6, 10], 15: [6, 10], 16: [6, 10], 17: [6, 9], 18: [6, 9], 19: [7, 8] },
  Bun: { 3: [7, 14], 4: [6, 15], 5: [6, 16], 6: [6, 15], 7: [7, 12], 8: [[8, 10], [12, 12]], 9: [[8, 10], [12, 12]], 10: [8, 10], 11: [8, 10], 12: [8, 10], 13: [8, 9] },
  Curls: { 1: [9, 14], 2: [8, 16], 3: [7, 17], 4: [7, 17], 5: [7, 17], 6: [7, 17], 7: [[7, 12], [16, 16]], 8: [7, 12], 9: [7, 11], 10: [7, 10], 11: [7, 10], 12: [7, 10], 13: [7, 10], 14: [8, 9] },
  Mohawk: { 0: [10, 14], 1: [9, 15], 2: [9, 15], 3: [9, 15], 4: [9, 14], 5: [8, 10], 6: [8, 9], 7: [8, 9], 8: [8, 9], 9: [8, 9] },
  Bob: { 3: [10, 14], 4: [9, 15], 5: [8, 16], 6: [7, 17], 7: [[7, 12], [15, 17]], 8: [7, 12], 9: [7, 11], 10: [7, 11], 11: [7, 11], 12: [7, 11], 13: [7, 11], 14: [7, 11] },
  'Slick back': { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [7, 15], 7: [7, 12], 8: [[7, 10], [12, 12]], 9: [[8, 10], [12, 12]], 10: [8, 10], 11: [8, 10], 12: [8, 10], 13: [8, 9] },
  Ponytail: { 3: [10, 14], 4: [9, 15], 5: [8, 16], 6: [7, 15], 7: [6, 12], 8: [5, 10], 9: [5, 8], 10: [5, 7], 11: [5, 7], 12: [5, 7], 13: [5, 6], 14: [5, 6], 15: [5, 6] },
  Afro: { 0: [9, 14], 1: [8, 16], 2: [6, 17], 3: [6, 18], 4: [6, 18], 5: [6, 18], 6: [6, 17], 7: [6, 12], 8: [6, 11], 9: [6, 11], 10: [6, 10], 11: [6, 10], 12: [6, 10], 13: [7, 10] },
  Undercut: { 1: [10, 15], 2: [9, 17], 3: [8, 17], 4: [8, 16], 5: [8, 15], 6: [8, 10] },
  Braid: { 3: [10, 14], 4: [9, 15], 5: [8, 16], 6: [8, 15], 7: [8, 12], 8: [7, 10], 9: [7, 10], 10: [7, 10], 11: [7, 10], 12: [7, 10], 13: [7, 9], 14: [6, 8], 15: [6, 8], 16: [6, 8], 17: [6, 8], 18: [6, 8], 19: [6, 8], 20: [6, 8], 21: [7, 7] },
};

// Phase 20: long hair with a bright strand through it (drawn over the Long shapes).
for (const T of [HAIR_FRONT, HAIR_BACK, HAIR_SIDE]) { T['Streaked long'] = T.Long; T.Shaggy = T.Bob; }   // Shaggy: roughed up below
const STREAK = '#d0682e';
// Waves (Phase 23b): shoulder-length, swept to one side, curling at the ends, with dark
// roots fading to honey at the tips.
const OMBRE = '#c9995e';
HAIR_FRONT.Waves = { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [6, 17], 7: [[6, 8], [11, 17]], 8: [[6, 7], [14, 17]], 9: [[6, 7], [16, 17]],
  10: [[5, 6], [17, 18]], 11: [[4, 6], [17, 19]], 12: [[5, 6], [17, 18]], 13: [[5, 7], [16, 18]], 14: [[4, 7], [16, 19]], 15: [[5, 7], [16, 18]], 16: [[4, 6], [17, 19]], 17: [[5, 5], [18, 18]] };
HAIR_BACK.Waves = { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [6, 17], 7: [6, 17], 8: [6, 17], 9: [6, 17], 10: [5, 18], 11: [4, 19], 12: [5, 18], 13: [5, 18], 14: [4, 19], 15: [5, 18], 16: [[4, 7], [9, 14], [16, 19]], 17: [[5, 6], [10, 13], [17, 18]] };
HAIR_SIDE.Waves = { 3: [10, 14], 4: [9, 15], 5: [8, 16], 6: [7, 17], 7: [[7, 12], [15, 17]], 8: [6, 12], 9: [6, 11], 10: [6, 10], 11: [5, 10], 12: [6, 10], 13: [6, 9], 14: [5, 9], 15: [6, 9], 16: [5, 8], 17: [6, 7] };

// Where a hat cuts the hair off (rows above this go under the hat). A hair bow cuts nothing.
const HAT_CUT = { 'Garrison cap': 4, 'Sailor cap': 5, 'Top hat': 7, Fedora: 8, 'Flat cap': 8, Beanie: 8, Bowler: 7, 'Wide brim': 8, Trilby: 7, Beret: 7 };

function paintHair(L, ctx) {
  const { names, view, bob, C, U } = ctx;
  const style = names.hair;
  if (style === 'Bald') return;
  // v2.4: balding: a fringe round the sides and the back, the crown bare and shining.
  if (ctx.look.balding) {
    const rows = view === 'down' ? { 7: [[6, 7], [16, 17]], 8: [[6, 7], [16, 17]], 9: [[6, 6], [17, 17]], 10: [[6, 6], [17, 17]] }
      : view === 'up' ? { 7: [[7, 8], [15, 16]], 8: [7, 16], 9: [7, 16], 10: [7, 16], 11: [7, 16], 12: [8, 15], 13: [9, 14] }
      : { 7: [8, 9], 8: [7, 10], 9: [7, 10], 10: [7, 10], 11: [8, 10], 12: [8, 10], 13: [9, 10] };
    L.S(rows, 'hair', null, 0, -bob);
    const shine = view === 'down' ? [[10, 5], [11, 5], [10, 6]] : view === 'up' ? [[10, 5], [11, 5]] : [[12, 5], [13, 5]];
    if (names.hat === 'None') for (const [x, y] of shine) L.O(x, U(y), c => c && shade(c, 1.22));
    return;
  }
  const table = view === 'down' ? HAIR_FRONT : view === 'up' ? HAIR_BACK : HAIR_SIDE;
  const rows = table[style];
  if (!rows) return;
  const cut = names.hat !== 'None' ? (HAT_CUT[names.hat] ?? -1) : -1;
  const kept = {};
  for (const [y, spans] of Object.entries(rows)) if (+y >= cut) kept[y] = spans;
  L.S(kept, 'hair', null, 0, -bob);
  // A garrison cap sits high: the hair is swept back under it, so the forehead shows.
  if (names.hat === 'Garrison cap' && view === 'down') for (let y = 5; y <= 6; y++) for (let x = 9; x <= 14; x++) if (L.at(x, U(y)) === 'hair') L.P(x, U(y), 'skin');
  // Texture and shine.
  const hairPx = (fn) => { for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) if (L.mat[y][x]?.m === 'hair') fn(x, y); };
  // Curls: little lit loops with a shadow under each.
  if (style === 'Curls' || style === 'Afro') hairPx((x, y) => { const k = (x + (Math.floor(y / 2) % 2) * 2) % 4; if (y % 2 === 0 && k === 0) L.O(x, y, c => c && shade(c, 1.3)); else if (y % 2 === 1 && k === 1) L.O(x, y, c => c && shade(c, 0.72)); });
  if (style === 'Slick back' && cut < 0) for (const [x, y] of view === 'right' ? [[10, 4], [11, 4], [12, 5]] : [[9, 4], [10, 4], [11, 5], [12, 5]]) L.O(x, U(y), C.hairL);
  if (style === 'Side part' && view === 'down' && cut < 0) { L.O(10, U(3), C.hairD); L.O(10, U(4), C.hairD); }
  if ((style === 'Long' || style === 'Streaked long') && view === 'down' && cut < 0) { L.O(11, U(4), C.hairD); L.O(12, U(4), C.hairD); }
  if (style === 'Streaked long') {
    // A warm strand down one side (the near side in profile), and a reddish shadow underneath.
    const strand = view === 'down' ? [[15, 4], [16, 5], [16, 6], [17, 7], [17, 8], [17, 9], [17, 10], [17, 11], [17, 12], [17, 13], [17, 14], [17, 15], [17, 16]]
      : view === 'up' ? [[8, 5], [7, 6], [7, 7], [6, 8], [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14], [6, 15]]
      : [[11, 4], [10, 5], [10, 6], [9, 7], [9, 8], [9, 9], [9, 10], [9, 11], [9, 12], [9, 13], [9, 14], [9, 15]];
    for (const [x, y] of strand) if (L.at(x, U(y)) === 'hair') L.O(x, U(y), (x + y) % 3 ? STREAK : shade(STREAK, 0.78));
    hairPx((x, y) => { if (y >= 14 - bob && (x + y) % 3 === 0) L.O(x, y, c => c && mix(c, '#5a1e1a', 0.45)); });
  }
  if (style === 'Shaggy') {
    // A mop that hasn't seen a comb: tufts on the crown, a choppy fringe, ragged ends.
    const top = {}, bottom = {};
    hairPx((x, y) => { top[x] ??= y; bottom[x] = Math.max(bottom[x] ?? -1, y); });
    for (const x of Object.keys(top).map(Number)) {
      if (cut < 0 && x % 3 === 1 && !L.mat[top[x] - 1]?.[x]) L.P(x, top[x] - 1, 'hair');
      const yb = bottom[x];
      if (x % 2 === 0 && L.mat[yb + 1]?.[x]?.m !== 'hair' && (!L.mat[yb + 1]?.[x] || L.mat[yb + 1][x].m === 'skin')) L.P(x, yb + 1, 'hair');
      if (x % 4 === 1 && !L.mat[yb + 2]?.[x] && !L.mat[yb + 1]?.[x]) { L.P(x, yb + 1, 'hair'); L.P(x, yb + 2, 'hair'); }
    }
    hairPx((x, y) => { if ((x * 3 + y) % 5 === 0) L.O(x, y, C.hairD); else if ((x + y * 2) % 7 === 0) L.O(x, y, C.hairL); });
  }
  if (style === 'Waves') {
    // The roots stay dark; the lengths lighten to honey; a wave of shine every few rows.
    hairPx((x, y) => {
      const r = y + bob, t = Math.max(0, Math.min(1, (r - 10) / 7));
      if (t > 0) L.O(x, y, c => c && mix(c, OMBRE, t * 0.75));
    });
    if (view === 'down' && cut < 0) { L.O(8, U(4), C.hairD); L.O(8, U(5), C.hairD); }
  }
  if (style === 'Braid') hairPx((x, y) => { if (y >= 14 + 0 - bob && (x + y) % 2 === 0) L.O(x, y, c => c && shade(c, 0.72)); });
  if (style === 'Braid' && view === 'down') {
    // The braid comes over the left shoulder, on top of the coat.
    for (let y = 14; y <= 22; y++) for (const x of [7, 8]) { L.P(x, U(y), 'hair'); if ((x + y) % 2 === 0) L.O(x, U(y), c => c && shade(c, 0.72)); }
    L.O(7, U(23), C.ex); L.O(8, U(23), C.ex);
  }
  if (style === 'Ponytail' && view === 'up') { L.O(10, U(14), C.ex); L.O(11, U(14), C.ex); L.O(12, U(14), C.ex); L.O(13, U(14), C.ex); }
  // Shaved sides: a shadow of stubble on the scalp.
  if ((style === 'Mohawk' || style === 'Undercut') && view !== 'up') {
    const pts = view === 'down' ? [[7, 6], [8, 6], [7, 7], [8, 7], [15, 6], [16, 6], [15, 7], [16, 7], [7, 8], [16, 8], [9, 5], [14, 5]] : [[9, 6], [10, 6], [11, 6], [10, 7], [11, 7], [10, 8], [11, 8], [12, 6], [13, 6]];
    for (const [x, y] of pts) if (L.at(x, U(y)) === 'skin') L.O(x, U(y), c => c && mix(c, C.hair, 0.35));
  }
  if (style === 'Undercut' && view === 'up') for (let y = 8; y <= 13; y++) for (let x = 8; x <= 15; x++) if (L.at(x, U(y)) === 'skin') L.O(x, U(y), c => c && mix(c, C.hair, 0.3));
}

// ---------- hats ----------

const HAT_FRONT = {
  Fedora: [['hat', { 1: [[9, 10], [13, 14]], 2: [8, 15], 3: [8, 15], 4: [8, 15] }], ['band', { 5: [8, 15] }], ['brim', { 6: [4, 19] }], ['brim', { 7: [6, 17] }, -1]],
  'Flat cap': [['hat', { 3: [9, 14], 4: [8, 15], 5: [7, 16], 6: [7, 16] }], ['brim', { 7: [7, 16] }, -1]],
  Beanie: [['hat', { 1: [10, 13], 2: [8, 15], 3: [7, 16], 4: [7, 16], 5: [7, 16] }], ['band', { 6: [6, 17], 7: [6, 17] }]],
  Bowler: [['hat', { 1: [9, 14], 2: [8, 15], 3: [8, 15], 4: [8, 15] }], ['band', { 5: [8, 15] }], ['brim', { 5: [[6, 6], [17, 17]], 6: [6, 17] }]],
  'Wide brim': [['hat', { 2: [9, 14], 3: [9, 14], 4: [9, 14] }], ['band', { 5: [9, 14] }], ['brim', { 6: [2, 21] }], ['brim', { 7: [3, 20] }, -1]],
  Trilby: [['hat', { 2: [[9, 10], [13, 14]], 3: [8, 15], 4: [8, 15] }], ['band', { 5: [8, 15] }], ['brim', { 6: [6, 17] }], ['brim', { 7: [9, 14] }, -1]],
  Beret: [['hat', { 2: [12, 13], 3: [9, 16], 4: [7, 17], 5: [6, 18] }], ['band', { 6: [7, 16] }]],
};
// A magician's top hat (Phase 26): a tall crown, a band, a narrow brim.
HAT_FRONT['Top hat'] = [['hat', { 0: [9, 14], 1: [9, 14], 2: [9, 14], 3: [9, 14] }], ['band', { 4: [9, 14] }], ['hat', { 5: [8, 15] }], ['brim', { 6: [5, 18] }]];
// Phase 29: the Navy's caps. A garrison cap, folded flat and worn a touch to one side, with
// a small device; the white "dixie cup" sailor cap with its rolled brim.
HAT_FRONT['Garrison cap'] = [['hat', { 1: [10, 11], 2: [9, 13], 3: [8, 15] }], ['band', { 4: [8, 16] }]];
HAT_FRONT['Sailor cap'] = [['hat', { 1: [10, 13], 2: [9, 14], 3: [8, 15], 4: [8, 15] }], ['brim', { 5: [7, 16], 6: [7, 16] }]];
HAT_FRONT['Hair bow'] = [['hat', { 1: [[8, 9], [12, 13]], 2: [8, 13], 3: [[8, 9], [12, 13]] }], ['band', { 2: [10, 11] }]];
const HAT_SIDE = {
  Fedora: [['hat', { 1: [[10, 11], [13, 14]], 2: [9, 15], 3: [9, 15], 4: [9, 15] }], ['band', { 5: [9, 15] }], ['brim', { 6: [5, 20] }], ['brim', { 7: [17, 20] }, -1]],
  'Flat cap': [['hat', { 3: [9, 15], 4: [8, 16], 5: [8, 16], 6: [8, 17] }], ['brim', { 7: [14, 19] }, -1]],
  Beanie: [['hat', { 1: [10, 14], 2: [9, 15], 3: [8, 16], 4: [8, 16], 5: [8, 16] }], ['band', { 6: [7, 17], 7: [7, 17] }]],
  Bowler: [['hat', { 1: [10, 14], 2: [9, 15], 3: [9, 15], 4: [9, 15] }], ['band', { 5: [9, 15] }], ['brim', { 5: [[7, 7], [18, 18]], 6: [7, 18] }]],
  'Wide brim': [['hat', { 2: [10, 14], 3: [10, 14], 4: [10, 14] }], ['band', { 5: [10, 14] }], ['brim', { 6: [3, 21] }], ['brim', { 7: [18, 21] }, -1]],
  Trilby: [['hat', { 2: [[10, 11], [13, 14]], 3: [9, 15], 4: [9, 15] }], ['band', { 5: [9, 15] }], ['brim', { 6: [7, 19] }], ['brim', { 5: [6, 7] }]],
  Beret: [['hat', { 3: [9, 16], 4: [7, 17], 5: [7, 17] }], ['band', { 6: [8, 16] }], ['hat', { 2: [11, 12] }]],
  'Hair bow': [['hat', { 1: [[9, 10], [13, 14]], 2: [9, 14], 3: [[9, 10], [13, 14]] }], ['band', { 2: [11, 12] }]],
  'Top hat': [['hat', { 0: [10, 15], 1: [10, 15], 2: [10, 15], 3: [10, 15] }], ['band', { 4: [10, 15] }], ['hat', { 5: [9, 16] }], ['brim', { 6: [6, 19] }]],
  'Garrison cap': [['hat', { 1: [12, 14], 2: [10, 15], 3: [8, 16] }], ['band', { 4: [8, 15] }]],
  'Sailor cap': [['hat', { 1: [10, 14], 2: [9, 15], 3: [9, 15], 4: [9, 15] }], ['brim', { 5: [8, 16], 6: [8, 16] }]],
};

function paintHat(L, ctx) {
  const { names, view, bob } = ctx;
  if (names.hat === 'None') return;
  const parts = (view === 'right' ? HAT_SIDE : HAT_FRONT)[names.hat];
  for (const [m, rows, t] of parts) L.S(rows, m, t ?? null, 0, -bob);
  // A crease in the crown.
  if ((names.hat === 'Fedora' || names.hat === 'Trilby') && view !== 'right') { L.O(11, ctx.U(2), c => c && shade(c, 0.7)); L.O(12, ctx.U(2), c => c && shade(c, 0.7)); }
  if (names.hat === 'Beanie') for (let x = 6; x <= 17; x += 2) L.O(x, ctx.U(6), c => c && shade(c, 0.8));
  if (names.hat === 'Garrison cap') {
    // The fold along the top, and the device on the left side.
    // Worn high and set to one side; the fold catches the light; the rating badge on the left
    // side (a silver eagle over gold chevrons).
    if (view !== 'right') { for (const [x, y] of [[10, 1], [11, 1], [12, 2], [13, 2], [14, 3], [15, 3]]) L.O(x, ctx.U(y), c => c && shade(c, 1.35)); }
    if (view === 'down') { L.O(14, ctx.U(2), SILVER); L.O(14, ctx.U(3), GOLD); L.O(13, ctx.U(3), shade(GOLD, 0.75)); }
    if (view === 'right') { for (const [x, y] of [[12, 1], [13, 1], [14, 1], [15, 2]]) L.O(x, ctx.U(y), c => c && shade(c, 1.35)); L.O(13, ctx.U(3), GOLD); L.O(13, ctx.U(2), SILVER); }
  }
  if (names.hat === 'Sailor cap') for (let x = 7; x <= 16; x++) L.O(x, ctx.U(5), c => c && shade(c, 1.08));
  if (names.hat === 'Top hat') { const x = view === 'right' ? 11 : 10; for (let y = 0; y <= 3; y++) L.O(x, ctx.U(y), c => c && shade(c, 1.35)); }
}

// ---------- extras and the loupe ----------

function paintExtrasFront(L, ctx) {
  const { R, O, S, P } = L;
  const { names, view, U, x0, x1, C, bob, opts, pose } = ctx;
  const ex = names.extra, front = view === 'down';
  if (ex === 'Scarf') {
    S({ 16: [8, 15], 17: [8, 15] }, 'ex', null, 0, -bob);
    if (front) { R(13, U(18), 2, 3, 'ex'); for (const y of [18, 20]) O(13, U(y), c => c && shade(c, 0.8)); }
  }
  if (ex === 'Glasses' && front) {
    for (const [x, y] of [[8, 10], [8, 11], [11, 10], [12, 10], [15, 10], [15, 11]]) O(x, U(y), INK);
    for (const x of [9, 10, 13, 14]) for (const y of [10, 11]) { const prev = L.ov[U(y)]?.[x]; O(x, U(y), c => mix(typeof prev === 'string' ? prev : (c || '#808080'), LENS, 0.35)); }
    O(9, U(10), '#f4f8fb');
  }
  if (ex === 'Aviators' && front) {
    // Mirrored purple lenses in a thin silver frame.
    for (const [x, y] of [[8, 10], [15, 10], [11, 10], [12, 10]]) O(x, U(y), AV_FRAME);
    for (const [x, y, c] of [[9, 10, AVIATOR_L], [10, 10, AVIATOR], [9, 11, AVIATOR], [10, 11, AVIATOR_D], [13, 10, AVIATOR_L], [14, 10, AVIATOR], [13, 11, AVIATOR], [14, 11, AVIATOR_D], [8, 11, AVIATOR_D], [15, 11, AVIATOR_D]]) O(x, U(y), c);
  }
  if (ex === 'Aviators' && view === 'up') { O(8, U(10), AV_FRAME); O(15, U(10), AV_FRAME); }
  if (ex === 'Pendant' && front) { O(10, U(17), GOLD); O(13, U(17), GOLD); O(11, U(18), shade(GOLD, 0.8)); O(12, U(18), GOLD); O(12, U(19), shade(GOLD, 0.7)); O(11, U(19), GOLD); }
  if (ex === 'Satchel') {
    if (front) { for (let i = 0; i < 6; i++) O(x1 - 1 - i, U(17 + i), STRAP); R(x0 - 3, U(22), 4, 3, 'ex'); O(x0 - 2, U(22), c => c && shade(c, 0.7)); O(x0 - 1, U(22), c => c && shade(c, 0.7)); }
    else { for (let i = 0; i < 6; i++) O(x0 + 1 + i, U(17 + i), STRAP); R(x1, U(22), 4, 3, 'ex'); }
  }
  if (ex === 'Hair clips') {
    // Two little clips in the hair, one each side (the color is the accessory color).
    const clips = front ? [[8, 6], [8, 7], [15, 5], [16, 6]] : [[8, 7], [9, 7], [15, 7], [16, 7]];
    for (const [x, y] of clips) O(x, U(y), (x + y) % 2 ? C.ex : shade(C.ex, 1.3));
  }
  if (ex === 'Small hoops' && view === 'down') for (const x of [6, 17]) L.O(x, U(13), SILVER);
  if (ex === 'Earrings' && view === 'down') for (const x of [5, 18]) { L.O(x, U(13), SILVER); L.O(x, U(14), shade(SILVER, 0.75)); }
  if (ex === 'Pocket watch' && front) { O(x1 - 2, U(20), GOLD); O(x1 - 3, U(21), shade(GOLD, 0.8)); O(x1 - 4, U(21), shade(GOLD, 0.8)); O(x1 - 1, U(20), shade(GOLD, 0.7)); }
  // v2.4: a cigarette in the corner of the mouth, smoke curling off it.
  if (ctx.look.smoke && front && pose !== 'ko') {
    O(13, U(14), '#ece6da'); O(14, U(14), '#ece6da'); O(15, U(14), '#e0602e');
    const f = ctx.frame % 2;
    for (const [x, y] of f ? [[16, 13], [17, 12], [17, 10], [18, 9]] : [[16, 13], [17, 11], [18, 10], [18, 8]]) O(x, U(y), (y % 2) ? '#9e9ea8' : '#7e7e8a');
  }
  // The appraiser's loupe on its cord, always.
  if (opts.signature && pose !== 'appraise') {
    if (front) {
      O(10, U(17), '#3a2a20'); O(9, U(18), '#3a2a20');
      O(8, U(19), GOLD); O(9, U(19), GOLD); O(8, U(20), shade(GOLD, 0.7)); O(9, U(20), LENS);
      if (ctx.frame % 2 === 0) O(9, U(20), '#e8f4f8');
    } else { O(10, U(16), '#3a2a20'); O(13, U(16), '#3a2a20'); }
  }
  void P;
}

function paintLoupeRaised(L, ctx) {
  const { O } = L;
  const { U, frame } = ctx;
  // The brass ring around the right eye, the lens catching the lamp on the second frame.
  for (const [x, y] of [[13, 9], [14, 9], [12, 10], [12, 11], [15, 10], [15, 11], [13, 12], [14, 12]]) O(x, U(y), (x + y) % 2 ? GOLD : shade(GOLD, 0.75));
  O(13, U(10), frame ? '#f4fbff' : mix(LENS, WHITE, 0.3)); O(14, U(10), LENS); O(13, U(11), LENS); O(14, U(11), mix(LENS, INK, 0.4));
}

// ---------- the side view (facing right) ----------

function paintSide(L, ctx) {
  const { R, S, P, O } = L;
  const { names, bob, stride, longCoat, b, pose, C, look, opts } = ctx;
  const U = y => y - bob;
  ctx.U = U;
  const [sx0, sx1] = BODY_SIDE[b];
  ctx.x0 = sx0; ctx.x1 = sx1;
  const top = names.top;
  const skirt = names.bottom === 'Skirt' || names.bottom === 'Long skirt';

  if (pose === 'carry') S({ 12: [4, 8], 13: [3, 9], 14: [3, 9], 15: [3, 9], 16: [3, 9], 17: [3, 9], 18: [3, 9], 19: [3, 9], 20: [3, 9], 21: [4, 8], 22: [4, 8] }, 'sack', null, 0, -bob);
  if (names.hair === 'Ponytail' && names.hat !== 'None') R(6, U(9), 2, 6, 'hair');

  // --- legs: near (in front) and far (behind, darker) ---
  const legTop = 24 - bob;
  const legAt = (pos, m, shoeM) => {
    // pos: -1 back, 0 under, +1 forward
    const leg = skirt ? 'stocking' : m;
    if (pos === 0) { R(10, legTop, 3, 29 - legTop, leg); R(10, 29, 3, 1, shoeM); R(10, 30, 5, 1, shoeM); }
    if (pos === 1) { R(11, legTop, 3, 27 - legTop, leg); R(12, 27, 3, 2, leg); R(12, 29, 3, 1, shoeM); R(12, 30, 5, 1, shoeM); }
    if (pos === -1) { R(9, legTop, 3, 27 - legTop, leg); R(8, 27, 3, 1, leg); R(7, 28, 3, 1, shoeM); R(6, 29, 4, 1, shoeM); }
  };
  const near = stride, far = -stride;
  legAt(far, 'legF', 'shoeF');
  legAt(near, 'legN', 'shoe');
  if (names.bottom === 'Work pants') O(11 + near, 26, c => c && shade(c, 0.8));

  // --- the far arm, behind the body ---
  const armAt = (pos, m, d) => {
    if (pos === 0) { R(11, U(18), 2, 5, m, null, d); R(11, U(23), 2, 2, 'hand', null, d); }
    if (pos === 1) { R(12, U(18), 2, 2, m, null, d); R(13, U(20), 2, 2, m, null, d); R(14, U(22), 2, 2, 'hand', null, d); }
    if (pos === -1) { R(10, U(18), 2, 2, m, null, d); R(9, U(20), 2, 2, m, null, d); R(8, U(22), 2, 2, 'hand', null, d); }
  };
  const armM = top === 'Tank top' ? 'arm' : 'sleeve';
  armAt(stride, armM, 1);
  if (top === 'Jumper') for (let x = 7; x <= 16; x++) if (L.at(x, U(22)) === 'sleeve') O(x, U(22), shade(WHITE, 0.7));   // the far arm swings with the near leg

  // --- torso ---
  const hem = longCoat ? 27 : top === 'Jacket' || top === 'Suit jacket' || top === 'Hoodie' ? 24 : 23;
  R(sx0, U(17), sx1 - sx0 + 1, 7, 'top');
  for (let y = 24; y <= hem; y++) R(sx0 - (longCoat && y >= 25 ? 1 : 0), y, sx1 - sx0 + 1 + (longCoat && y >= 25 ? 1 : 0), 1, 'top');
  if (longCoat && stride) for (let y = 25; y <= hem; y++) P(sx0 - 2, y, 'top');
  if (skirt) { S({ 24: [sx0, sx1], 25: [sx0, sx1], 26: [sx0 - 1, sx1 + 1] }, 'skirt'); if (names.bottom === 'Long skirt') S({ 27: [sx0 - 1, sx1 + 1], 28: [sx0 - 1, sx1 + 1] }, 'skirt'); }
  if (['Trench coat', 'Jacket', 'Vest', 'Suit jacket', 'Overcoat'].includes(top)) { R(sx1, U(17), 1, 3, 'shirt'); O(sx1 - 1, U(17), c => c && shade(c, 1.2)); O(sx1 - 1, U(18), c => c && shade(c, 1.2)); }
  if (top === 'Shirtsleeves') for (let y = 17; y <= 23; y++) O(sx0 + 2, U(y), shade(C.ex, 0.7));
  if (top === 'Trench coat') { R(sx0, U(21), sx1 - sx0 + 1, 1, 'top', -1); O(sx1, U(21), GOLD); }
  if (top === 'Hoodie') { S({ 15: [8, 10], 16: [8, 11], 17: [8, 10] }, 'hood', null, 0, -bob); O(sx1, U(18), WHITE); O(sx1, U(19), WHITE); }
  if (top === 'Sweater') for (let x = sx0; x <= sx1; x++) O(x, 23, c => c && shade(c, x % 2 ? 0.8 : 1.1));
  if (top === 'Overcoat') for (const y of [19, 21, 23]) O(sx1 - 1, U(y), c => c && shade(c, 0.55));
  if (top === 'Suit jacket') O(sx1 - 1, U(22), c => c && shade(c, 0.55));
  if (top === 'Uniform shirt') { R(sx1 - 1, U(17), 2, 1, 'neckSkin'); O(sx1, U(19), RIBBONS[0]); O(sx1 - 1, U(19), RIBBONS[2]); O(sx1 - 1, U(20), c => c && shade(c, 0.78)); }
  if (top === 'Jumper') {
    // The collar hangs down the back; the neckerchief shows at the front.
    for (let y = 17; y <= 21; y++) { O(sx0, U(y), WHITE); O(sx0 + 1, U(y), c => c && shade(c, 1.12)); }
    R(sx1 - 1, U(17), 2, 1, 'neckSkin'); O(sx1, U(18), C.neck); O(sx1, U(19), C.neck); O(sx1 - 1, U(19), shade(C.neck, 0.7));
  }
  if (look.plump || b === BELLY) { for (let y = 19; y <= 22; y++) P(sx1 + 1, U(y), 'top'); for (const y of [20, 21]) P(sx1 + 2, U(y), 'top'); }
  if (look.prop === 'shovel' && pose !== 'ko') {
    // Over the shoulder: the shaft from the near hand up behind the head, the blade behind.
    for (let i = 0; i <= 12; i++) P(Math.round(16 - i), U(Math.round(20 - i * 0.9)), 'wood');
    for (const [x, y] of [[2, 6], [3, 6], [4, 6], [1, 7], [2, 7], [3, 7], [4, 7], [1, 8], [2, 8], [3, 8], [4, 8], [2, 9], [3, 9], [2, 10]]) P(x, U(y), 'steel');
  }
  paintPattern(L, ctx);
  const n = names.neck;
  if (n === 'Necktie' && ['Trench coat', 'Jacket', 'Vest', 'Suit jacket', 'Overcoat', 'Shirtsleeves'].includes(top)) { O(sx1, U(17), shade(C.neck, 0.7)); O(sx1, U(18), C.neck); O(sx1, U(19), C.neck); }
  if (n === 'Bow tie') { O(sx1, U(17), C.neck); O(sx1 + 1, U(17), shade(C.neck, 0.7)); }
  if (n === 'Bandana') { S({ 16: [10, 14], 17: [12, 14] }, 'neckw', null, 0, -bob); P(sx1 + 1, U(17), 'neckw'); }

  // --- the near arm ---
  if (pose !== 'carry' || true) {
    if (top === 'Shirtsleeves' || top === 'Uniform shirt') {
      armAt(-stride, 'sleeve', 0);
      for (let y = 21; y <= 22; y++) for (let x = 7; x <= 16; x++) if (L.at(x, U(y)) === 'sleeve' && !L.mat[U(y)][x].d) L.P(x, U(y), 'arm');
    } else armAt(-stride, armM, 0);
  }
  if (pose === 'carry') { for (let i = 0; i < 5; i++) O(sx1 - i, U(17 + i), STRAP); }
  // A bare arm in profile: a shadow down its back edge, so it reads apart from the body.
  if (top === 'Tank top') for (let x = 0; x < 24; x++) if (L.at(x, U(18)) === 'arm') L.P(x, U(18), 'top');   // the strap over the shoulder
  if (top === 'Tank top') for (let y = 19; y <= 23; y++) { const x = [...Array(24).keys()].find(xx => L.at(xx, U(y)) === 'arm'); if (x != null) O(x, U(y), c => c && shade(c, 0.78)); }

  // --- head ---
  S({ 4: [10, 14], 5: [9, 15], 6: [8, 16], 7: [8, 16], 8: [8, 16], 9: [8, 16], 10: [8, 16], 11: [8, 17], 12: [8, 17], 13: [8, 16], 14: [9, 16], 15: [11, 15] }, 'skin', null, 0, -bob);
  if (n !== 'Turtleneck') R(11, U(16), 3, 1, 'neckSkin', -1);
  else { R(10, U(16), 5, 1, 'neckw'); R(sx1 - 2, U(17), 3, 1, 'neckw'); }
  R(11, U(10), 2, 3, 'ear');
  O(12, U(11), c => c && shade(c, 0.75));

  // Face, in profile.
  const eye = C.eye;
  const eyeRows = {
    Round: [[15, 10, eye], [15, 11, INK], [16, 10, null]],
    Narrow: [[15, 10, C.skinD], [15, 11, INK]],
    Hooded: [[15, 10, C.skinDD], [15, 11, eye]],
    Wide: [[14, 10, WHITE], [14, 11, WHITE], [15, 10, eye], [15, 11, INK]],
    Lashes: [[15, 10, eye], [15, 11, INK], [16, 10, INK]],
  }[names.eyes];
  if (pose !== 'ko') for (const [x, y, c] of eyeRows) if (c) O(x, U(y), c);
  const brow = names.hair === 'Bald' ? shade(C.skin, 0.5) : C.hairD;
  const browSide = { Straight: [[15, 9], [16, 9]], Arched: [[14, 9], [15, 8], [16, 8]], Heavy: [[14, 9], [15, 9], [16, 9], [15, 8]], Thin: [[15, 9], [16, 9]], Furrowed: [[15, 8], [16, 9]] }[names.brows];
  for (const [x, y] of browSide) O(x, U(y), names.brows === 'Thin' ? mix(brow, C.skin, 0.4) : brow);
  O(17, U(12), C.skinD);
  const lip = mix(C.skinDD, LIP, 0.45);
  const mouthSide = { Neutral: [[16, 14, lip]], Smirk: [[16, 14, lip], [16, 13, lip]], Frown: [[16, 14, lip], [15, 15, lip]], Full: [[16, 14, LIP], [16, 15, shade(LIP, 1.1)]], Grin: [[16, 14, WHITE], [15, 14, lip]], Smile: [[16, 14, lip], [15, 13, lip]], 'Soft smile': [[16, 14, mix(LIP, '#c46a6e', 0.4)], [15, 13, lip]] }[names.mouth];
  for (const [x, y, c] of mouthSide) O(x, U(y), c);
  if (names.face === 'Freckles') for (const [x, y] of [[14, 12], [16, 12], [15, 13]]) O(x, U(y), c => c && shade(c, 0.78));
  if (names.face === 'Rosy') for (const [x, y] of [[14, 13], [15, 13]]) O(x, U(y), c => c && mix(c, '#c46a5e', 0.55));
  if (names.face === 'Tired eyes') O(15, U(12), c => c && mix(c, '#5a4a6a', 0.3));
  if (names.mark === 'Cheek scar') { O(14, U(12), mix(C.skin, '#e8d0c0', 0.55)); O(15, U(13), mix(C.skin, '#e8d0c0', 0.55)); }
  if (names.mark === 'Brow scar') { O(15, U(8), mix(C.skin, '#e8d0c0', 0.6)); O(15, U(9), mix(C.skin, '#e8d0c0', 0.6)); }
  if (names.mark === 'Mole') O(15, U(13), shade(C.skin, 0.42));
  if (names.mark === 'Bandage') { O(13, U(12), BANDAGE); O(14, U(12), BANDAGE); O(13, U(13), BANDAGE); O(14, U(13), shade(BANDAGE, 0.85)); }
  const fh = names.facial, H = C.beard, HD2 = C.beardD;
  if (fh === 'Stubble') for (const [x, y] of [[13, 13], [14, 13], [14, 14], [15, 14], [13, 14], [12, 13], [14, 15], [13, 15]]) O(x, U(y), c => c && mix(c, H, 0.28));
  if (fh === 'Mustache') { O(16, U(13), H); O(17, U(13), HD2); }
  if (fh === 'Beard') { for (const [y, a, bb] of [[12, 12, 13], [13, 12, 16], [14, 11, 15], [15, 11, 15], [16, 12, 14]]) for (let x = a; x <= bb; x++) O(x, U(y), x % 2 ? H : HD2); O(16, U(14), lip); }
  if (fh === 'Goatee') { O(16, U(15), H); O(15, U(15), HD2); O(15, U(16), HD2); O(16, U(13), H); }
  if (fh === 'Sideburns') for (const y of [10, 11, 12, 13]) O(13, U(y), H);
  if (pose === 'ko') { O(15, U(11), C.skinDD); }
  if (look.smoke && pose !== 'ko') {
    O(17, U(14), '#ece6da'); O(18, U(14), '#ece6da'); O(19, U(14), '#e0602e');
    for (const [x, y] of ctx.frame % 2 ? [[19, 12], [20, 11], [20, 9]] : [[20, 12], [19, 10], [20, 8]]) O(x, U(y), (y % 2) ? '#8e8e98' : '#6e6e7a');
  }

  paintHair(L, ctx);
  paintHat(L, ctx);

  // Extras in profile.
  const ex = names.extra;
  if (ex === 'Scarf') { S({ 16: [9, 15], 17: [9, 15] }, 'ex', null, 0, -bob); R(8, U(18), 2, 3, 'ex'); }
  if (ex === 'Glasses') { O(14, U(10), INK); O(16, U(10), INK); O(15, U(10), c => mix(c || eye, LENS, 0.4)); O(15, U(11), c => mix(c || INK, LENS, 0.3)); O(13, U(10), INK); O(12, U(10), INK); }
  if (ex === 'Aviators') { for (const [x, c] of [[15, AVIATOR_L], [16, AVIATOR], [14, AV_FRAME], [13, AV_FRAME], [12, AV_FRAME]]) O(x, U(10), c); O(15, U(11), AVIATOR_D); O(16, U(11), AVIATOR); }
  if (ex === 'Pendant') O(sx1, U(19), GOLD);
  if (ex === 'Satchel') { for (let i = 0; i < 5; i++) O(sx1 - 1 - i, U(17 + i), STRAP); R(sx0 - 2, U(21), 3, 3, 'ex'); }
  if (ex === 'Pocket watch') O(sx1 - 1, U(20), GOLD);
  if (ex === 'Hair clips') { O(9, U(6), C.ex); O(10, U(6), shade(C.ex, 1.3)); O(9, U(7), shade(C.ex, 0.8)); }
  if (ex === 'Small hoops') O(11, U(13), SILVER);
  if (ex === 'Earrings') { O(11, U(12), SILVER); O(11, U(13), shade(SILVER, 0.75)); }
  if (opts.signature) { O(sx1, U(19), GOLD); O(sx1, U(20), ctx.frame % 2 ? LENS : '#e8f4f8'); O(sx1 - 1, U(18), '#3a2a20'); }
  void look;
}

// ---------- baking ----------

// A color grid onto a canvas, in one write.
const RGB = new Map();
const rgb = hex => { let v = RGB.get(hex); if (!v) { v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); RGB.set(hex, v); } return v; };
export function hdCanvas(grid) {
  const h = grid.length, w = grid[0].length;
  const cv = makeCanvas(w, h), g = cv.getContext('2d');
  if (typeof g.createImageData !== 'function') { grid.forEach((row, y) => row.forEach((c, x) => { if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } })); return cv; }
  const img = g.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = grid[y][x]; if (!c) continue;
    const [r, gg, b] = rgb(c), o = (y * w + x) * 4;
    d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// ---------- sprites for everyone else (Phase 15) ----------
//
// The street can hold thirty people, so nobody is baked whole: each frame is painted the
// first time it's drawn, and only a few new frames are painted per screen frame. When the
// budget's spent, a frame already painted stands in (the same facing if there is one).
let budget = 4;
export function tickBudget(n = 4) { budget = n; }

export class HDSprites {
  constructor(look, opts = {}) { this.look = cleanLook(look); this.opts = opts; this.cache = new Map(); }
  get(pose, facing, frame) {
    if (pose === 'appraise' || pose === 'ko') facing = 'down';
    const k = `${pose}:${facing}:${frame}`;
    let c = this.cache.get(k);
    if (c) return c;
    if (budget <= 0) {
      // Over budget: a frame already painted stands in, or nothing this frame (a fade hides it).
      for (const [kk, v] of this.cache) if (kk.split(':')[1] === facing) return v;
      return this.cache.size ? this.cache.values().next().value : null;
    }
    budget--;
    c = hdCanvas(paintHD(this.look, facing, frame, pose, this.opts));
    this.cache.set(k, c);
    return c;
  }
  // Paint ahead of time (the player's set: there's only one of you).
  warm() {
    for (const f of FACINGS) { for (let i = 0; i < 4; i++) { this.#put('walk', f, i); this.#put('carry', f, i); } for (let i = 0; i < 2; i++) this.#put('idle', f, i); }
    for (let i = 0; i < 2; i++) this.#put('appraise', 'down', i);
    this.#put('ko', 'down', 0);
    return this;
  }
  #put(pose, f, fr) { const k = `${pose}:${f}:${fr}`; if (!this.cache.has(k)) this.cache.set(k, hdCanvas(paintHD(this.look, f, fr, pose, this.opts))); }
}

// Which frame of a person to show right now. e: { moving, frame, facing, breathPhase? }.
export function frameOf(e, time, pose = null) {
  if (pose === 'appraise') return ['appraise', 'down', Math.floor(time * 1.4) % 2];
  if (pose === 'ko') return ['ko', 'down', 0];
  if (pose === 'carry') return ['carry', e.facing, e.moving ? e.frame % 4 : 0];
  if (e.moving) return ['walk', e.facing, e.frame % 4];
  const ph = e.breathPhase ?? 0;
  return ['idle', e.facing, (time + ph) % 1.5 < 0.55 ? 1 : 0];
}

export const FACINGS = ['down', 'up', 'left', 'right'];

// Every frame a figure needs, as canvases:
// { walk, idle, carry: { down|up|left|right: [frames] }, appraise: [2], ko, hd: true }
export function bakeHD(look, opts = {}) {
  const set = { hd: true, walk: {}, idle: {}, carry: {} };
  for (const f of FACINGS) {
    set.walk[f] = [0, 1, 2, 3].map(fr => hdCanvas(paintHD(look, f, fr, 'walk', opts)));
    set.idle[f] = [0, 1].map(fr => hdCanvas(paintHD(look, f, fr, 'idle', opts)));
    set.carry[f] = [0, 1, 2, 3].map(fr => hdCanvas(paintHD(look, f, fr, 'carry', opts)));
  }
  set.appraise = [0, 1].map(fr => hdCanvas(paintHD(look, 'down', fr, 'appraise', opts)));
  set.ko = hdCanvas(paintHD(look, 'down', 0, 'ko', opts));
  return set;
}

// ---------- portraits (48x48) ----------
//
// A head-and-shoulders bust from the same look, for the creator, the speech strip and
// the panels: the sprite carries the silhouette, the portrait carries the face. Drawn
// from shapes (ellipses and bands) rather than a pixel table, then shaded two pixels deep.

export const PORTRAIT_SIZE = 48;
const PHAT_BOTTOM = { 'Garrison cap': 6, 'Sailor cap': 12, 'Top hat': 15, Fedora: 16, 'Flat cap': 16, Beanie: 17, Bowler: 15, 'Wide brim': 17, Trilby: 15, Beret: 15, Newsboy: 16, Deerstalker: 16, 'Cowboy hat': 14, 'Bucket hat': 15, Headscarf: 14, 'Hood up': 16, Pillbox: 9, Bandana: 12 };


// Phase 31b: what each mood changes on the portrait. brows: [offset from the outer end, y]
// pairs for the left brow (browsR for the right, else mirrored); mouth: pixels drawn instead
// of the chosen mouth; eyes: a different eye shape; lid: 'half' or 'heavy'; and touches.
const MOOD_SPECS = {
  neutral: {},
  happy: { brows: [[0, 18], [1, 17], [2, 16], [3, 16], [4, 17]], mouth: m => [[20, 30, m.lip], [21, 31, m.lip], [22, 31, m.WHITE], [23, 31, m.WHITE], [24, 31, m.WHITE], [25, 31, m.WHITE], [26, 31, m.lip], [27, 30, m.lip], [22, 32, m.lip], [23, 32, m.lip], [24, 32, m.lip], [25, 32, m.lip]], blush: 0.18 },
  sad: { brows: [[0, 19], [1, 18], [2, 18], [3, 17], [4, 17]], mouth: m => [[21, 32, m.lip], [22, 31, m.lip], [23, 31, m.lip], [24, 31, m.lip], [25, 31, m.lip], [26, 32, m.lip], [23, 33, m.lipL], [24, 33, m.lipL]], tears: 1 },
  annoyed: { brows: [[0, 18], [1, 18], [2, 18], [3, 19], [4, 19]], lid: 'half', mouth: m => [[21, 32, m.lip], [22, 32, m.lip], [23, 32, m.lip], [24, 32, m.lip], [25, 31, m.lip], [26, 31, m.lip]] },
  angry: { brows: [[0, 17], [1, 17], [2, 18], [3, 18], [4, 19], [1, 18], [3, 19]], mouth: m => [[21, 30, m.lip], [22, 30, m.lip], [23, 30, m.lip], [24, 30, m.lip], [25, 30, m.lip], [22, 31, m.WHITE], [23, 31, m.WHITE], [24, 31, m.WHITE], [25, 31, m.WHITE], [22, 32, shade(m.WHITE, 0.78)], [23, 32, shade(m.WHITE, 0.78)], [24, 32, shade(m.WHITE, 0.78)], [25, 32, shade(m.WHITE, 0.78)], [21, 33, m.lip], [22, 33, m.lip], [23, 33, m.lip], [24, 33, m.lip], [25, 33, m.lip], [26, 33, m.lip]], flush: 0.2 },
  upset: { brows: [[0, 19], [1, 18], [2, 18], [3, 17], [4, 16]], mouth: m => [[20, 33, m.lip], [21, 32, m.lip], [22, 31, m.lip], [23, 32, m.lip], [24, 32, m.lip], [25, 31, m.lip], [26, 32, m.lip], [27, 33, m.lip]], tears: 2 },
  flirty: { brows: [[0, 18], [1, 17], [2, 17], [3, 17], [4, 18]], browsR: [[0, 18], [1, 16], [2, 16], [3, 16], [4, 17]], lid: 'half', mouth: m => [[21, 31, m.lip], [22, 31, m.lip], [23, 31, m.lip], [24, 31, m.lip], [25, 30, m.lip], [26, 29, m.lip], [22, 32, m.LIP], [23, 32, m.LIP], [24, 32, m.LIP]], blush: 0.3 },
  surprised: { brows: [[0, 16], [1, 15], [2, 15], [3, 15], [4, 16]], eyes: 'Wide', mouth: m => [[23, 30, m.lip], [24, 30, m.lip], [22, 31, m.lip], [25, 31, m.lip], [22, 32, m.lip], [25, 32, m.lip], [23, 33, m.lip], [24, 33, m.lip], [23, 31, m.dark], [24, 31, m.dark], [23, 32, m.dark], [24, 32, m.dark]] },
  scared: { brows: [[0, 17], [1, 16], [2, 16], [3, 15], [4, 15]], eyes: 'Wide', mouth: m => [[21, 31, m.lip], [22, 31, m.WHITE], [23, 31, m.WHITE], [24, 31, m.WHITE], [25, 31, m.WHITE], [26, 31, m.lip], [22, 32, m.dark], [23, 32, m.dark], [24, 32, m.dark], [25, 32, m.dark], [23, 33, m.lip], [24, 33, m.lip]], sweat: true, pale: 0.18 },
  embarrassed: { brows: [[0, 18], [1, 17], [2, 17], [3, 16], [4, 16]], mouth: m => [[21, 31, m.lip], [22, 32, m.lip], [23, 31, m.lip], [24, 32, m.lip], [25, 31, m.lip], [26, 30, m.lip]], blush: 0.5, sweat: true },
  smug: { brows: [[0, 18], [1, 18], [2, 18], [3, 18], [4, 18]], browsR: [[0, 18], [1, 16], [2, 16], [3, 16], [4, 17]], lid: 'half', mouth: m => [[20, 31, m.lip], [21, 31, m.lip], [22, 31, m.lip], [23, 31, m.lip], [24, 31, m.lip], [25, 30, m.lip], [26, 29, m.lip], [27, 29, m.lip], [22, 32, m.lipL], [23, 32, m.lipL]] },
  tired: { brows: [[0, 19], [1, 19], [2, 18], [3, 18], [4, 18]], lid: 'heavy', mouth: m => [[21, 32, m.lip], [22, 32, m.lip], [23, 32, m.lip], [24, 32, m.lip], [25, 32, m.lip], [23, 33, m.lipL], [24, 33, m.lipL]] },
};
export { MOOD_SPECS };

// Lids, bags, blush, tears and sweat for a mood, drawn over the finished face.
function paintMoodTouches(mood, { O, each, inEll, C, L }) {
  const eyes = [[16, 19], [28, 31]];
  if (mood.lid) for (const [a, b] of eyes) {
    for (let x = a; x <= b; x++) O(x, 22, C.skinD);
    if (mood.lid === 'heavy') { for (let x = a; x <= b; x++) { O(x, 21, C.skinDD); O(x, 25, c => c && mix(c, '#5a4a6a', 0.35)); } }
  }
  const tint = (ex, ey, rx, ry, col, amt) => each((x, y) => { if (inEll(x, y, ex, ey, rx, ry) && L.at(x, y) === 'skin' && L.ov[y][x] == null) O(x, y, c => c && mix(c, col, amt)); });
  if (mood.blush) for (const ex of [16.5, 30.5]) tint(ex, 27.5, 3, 1.9, '#d0504e', mood.blush);
  if (mood.flush) tint(23.5, 22, 11, 8, '#c04040', mood.flush);
  if (mood.pale) tint(23.5, 24, 10, 9, '#cfd8d4', mood.pale);
  if (mood.tears) {
    for (const x of [16, 17, 18, 19, 28, 29, 30, 31]) O(x, 24, c => c && mix(c, '#d06a6a', 0.45));
    const drops = mood.tears === 2 ? [[17, 25], [17, 26], [17, 27], [17, 28], [30, 25], [30, 26], [30, 27], [30, 28]] : [[17, 25], [17, 26], [17, 27], [30, 25], [30, 26]];
    for (const [x, y] of drops) O(x, y, y % 2 ? '#bcd8ee' : '#8fb8d8');
  }
  if (mood.sweat) for (const [x, y, c] of [[35, 16, '#8ab4d4'], [34, 17, '#cfe6f5'], [35, 17, '#cfe6f5'], [35, 18, '#8ab4d4']]) O(x, y, c);
}

// Phase 31c: makeup, eye details, piercings and skin details, drawn over the finished face.
function paintLookFx(look, { O, each, inEll, C, L, mouthPx, eye }) {
  const tint = (ex, ey, rx, ry, col, amt, test = () => true) => each((x, y) => { if (inEll(x, y, ex, ey, rx, ry) && L.at(x, y) === 'skin' && L.ov[y][x] == null && test(x, y)) O(x, y, c => c && mix(c, col, amt)); });
  const SILVER_ = '#cfd2da', GOLD_ = '#e8cf7a';
  const sf = look.skinFx, ef = look.eyeFx, mk = look.makeup, pc = look.piercing;
  if (sf === 1) { tint(17, 27, 3.2, 2.4, '#f2e2d6', 0.7); tint(26, 14, 3, 2, '#f2e2d6', 0.65, (x, y) => (x + y) % 3); tint(34, 31, 2.4, 2.2, '#f2e2d6', 0.7); }
  if (sf === 2) { tint(23.5, 26, 8, 3.5, '#d8624e', 0.28); tint(23.5, 22, 11, 8, '#d8624e', 0.1); }
  if (sf === 3) { tint(23.5, 22, 11, 10, '#c8d4e6', 0.28); for (const [x, y] of [[13, 18], [14, 19], [14, 20], [34, 18], [33, 19], [33, 20]]) O(x, y, c => c && mix(c, '#6a7eb8', 0.45)); }
  if (mk === 4) for (const ex of [16.5, 30.5]) tint(ex, 27.5, 3, 1.9, '#d0504e', 0.4);
  if (mk === 5) for (let y = 21; y <= 26; y++) for (const x of [14, 33]) O(x, y, '#e8e0d0');
  if (mk >= 1 && mk <= 3) {
    const col = ['', '#b8283a', '#6a2a5a', '#2a1a2a'][mk];
    for (const [x, y, c] of mouthPx) { const [r, g, b] = rgb(c); if ((r + g + b) / 3 < 170) O(x, y, mix(c, col, 0.8)); }
  }
  const ink = INK, ring = [[16, 19], [28, 31]];
  if (ef === 1) { for (const [a, b] of ring) for (let x = a; x <= b; x++) O(x, 20, ink); O(15, 19, ink); O(32, 19, ink); }
  if (ef === 2) for (const [a, b] of ring) for (let x = a - 1; x <= b + 1; x++) for (const y of [19, 20]) if (L.ov[y][x] == null) O(x, y, c => c && mix(c, '#6a4a8a', 0.55));
  if (ef === 3) { for (const [x, y] of [[17, 23], [17, 22], [29, 22], [30, 23]]) O(x, y, '#aff4ee'); for (const [a, b] of ring) for (let x = a; x <= b; x++) O(x, 25, c => c && mix(c, '#8fe6e0', 0.45)); }
  if (ef === 4) for (const [x, y] of [[29, 22], [30, 23]]) O(x, y, mix(eye, '#5a9ad8', 0.85));
  if (ef === 5) {
    each((x, y) => { if (inEll(x, y, 18, 22.5, 3.4, 3.4)) O(x, y, '#15131a'); });
    for (let x = 15; x <= 34; x++) O(x, Math.round(20 - (x - 15) * 0.32), '#15131a');
    O(17, 21, '#3a3a48');
  }
  if (pc === 1) O(21, 28, GOLD_);
  if (pc === 2) { O(23, 29, SILVER_); O(24, 29, SILVER_); }
  if (pc === 3) { O(19, 17, SILVER_); O(19, 19, SILVER_); }
  if (pc === 4) { O(22, 33, SILVER_); O(22, 34, SILVER_); }
  if (pc === 5) for (const x of [10, 37]) for (const y of [22, 23, 24]) O(x, y, SILVER_);
}

export function paintPortrait(lookIn, opts = {}) {
  const look = cleanLook(lookIn);
  const N = PORTRAIT_SIZE, L = makeLayer(N, N), C = palette(look, opts);
  const { P, E, O } = L;
  const nm = k => PARTS[k][look[k]];
  const hair = nm('hair'), hat = nm('hat'), top = nm('top'), neck = nm('neck'), extra = nm('extra');
  const each = fn => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) fn(x, y); };
  const fill = (pred, m, t = null, d = 0) => each((x, y) => { if (pred(x, y)) P(x, y, m, t, d); });
  const cx = 23.5;
  // The head: a skull and a narrower jaw.
  const inEll = (x, y, ex, ey, rx, ry) => ((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 <= 1;
  const head = (x, y, g = 0) => inEll(x, y, cx, 20, 11.5 + g, 11.5 + g) || inEll(x, y, cx, 26, 9.2 + g, 8.6 + g);
  const hatCut = hat === 'None' ? -1 : (PHAT_BOTTOM[hat] ?? -1);

  // --- behind: a ponytail, long hair falling behind the shoulders ---
  if (hair === 'Ponytail' && hat === 'None') { E(37, 26, 3, 9, 'hair'); }
  if (hair === 'Pigtails' && hatCut < 0) { E(9.5, 28, 3, 10, 'hair'); E(37.5, 28, 3, 10, 'hair'); }
  if (hair === 'Dreadlocks') fill((x, y) => y >= 16 && y <= 34 + ((x * 5) % 7) && Math.abs(x - cx) >= 7 && Math.abs(x - cx) <= 14 && x % 3 !== 0, 'hair', null, 1);
  if (hair === 'Mullet') fill((x, y) => y >= 16 && y <= 38 && Math.abs(x - cx) <= 10 - Math.max(0, y - 30) * 0.8 && Math.abs(x - cx) >= 4, 'hair', null, 1);
  if (hair === 'Long' || hair === 'Streaked long') fill((x, y) => y >= 16 && y <= 44 && Math.abs(x - cx) <= 12 + Math.min(2.5, (y - 16) * 0.2) && Math.abs(x - cx) >= 6, 'hair', null, 1);
  if (hair === 'Waves') fill((x, y) => y >= 16 && y <= 40 && Math.abs(x - cx) <= 12 && Math.abs(x - cx) >= 6, 'hair', null, 1);
  if (hair === 'Bob') fill((x, y) => y >= 16 && y <= 34 && Math.abs(x - cx) <= 13.5 - Math.max(0, y - 29) * 1.1 && Math.abs(x - cx) >= 6, 'hair', null, 1);
  if (hair === 'Afro') fill((x, y) => inEll(x, y, cx, 17, 17, 15) && y >= Math.max(hatCut, 0), 'hair', null, 1);

  // --- shoulders and clothes ---
  const rx = BODY_RX[look.build];
  fill((x, y) => inEll(x, y, cx, 53, rx, 16) && y >= 36, 'top');
  const opening = ['Trench coat', 'Jacket', 'Vest', 'Suit jacket', 'Overcoat'].includes(top);
  if (opening || top === 'Shirtsleeves') {
    const wide = top === 'Suit jacket' ? 5 : top === 'Vest' ? 4 : 3.5;
    fill((x, y) => y >= 37 && Math.abs(x - cx) <= (top === 'Shirtsleeves' ? 30 : wide - (y - 37) * (top === 'Jacket' ? 0.15 : 0.45)) && inEll(x, y, cx, 53, rx, 16), 'shirt');
    if (top !== 'Shirtsleeves') each((x, y) => {
      const edge = wide - (y - 37) * (top === 'Jacket' ? 0.15 : 0.45);
      if (y >= 37 && y < 48 && edge > 0) { if (Math.abs(x - (cx - edge - 1)) < 0.6) O(x, y, c => c && shade(c, 1.25)); if (Math.abs(x - (cx + edge + 1)) < 0.6) O(x, y, c => c && shade(c, 0.65)); }
    });
  }
  if (top === 'Shirtsleeves') for (let y = 38; y < 48; y++) { O(15, y, shade(C.ex, 0.7)); O(32, y, shade(C.ex, 0.7)); }
  if (top === 'Sweater') { fill((x, y) => y >= 36 && y <= 38 && Math.abs(x - cx) <= 6, 'top', -1); }
  // A tank top: bare shoulders, two straps, a scooped neck.
  // A tank top with a high neck is a halter: the shoulders are bare and it cuts in to the collar.
  if (top === 'Tank top' && neck === 'Turtleneck') each((x, y) => { if (L.at(x, y) === 'top' && Math.abs(x - cx) >= 8 + (y - 38) * 0.8) P(x, y, 'neckSkin'); });
  if (top === 'Tank top') each((x, y) => { const d = Math.abs(x - cx); if (L.at(x, y) === 'top' && (y < 41 - Math.max(0, 7 - d) * 0.6) && !(d >= 6.5 && d <= 8.5)) P(x, y, 'neckSkin'); });
  if (top === 'Hoodie') { fill((x, y) => y >= 34 && y <= 40 && Math.abs(x - cx) <= 11 && !(Math.abs(x - cx) <= 6 && y >= 36), 'hood'); for (const x of [20, 27]) for (let y = 40; y <= 44; y++) O(x, y, WHITE); }
  if (top === 'Overcoat' || top === 'Trench coat') fill((x, y) => y >= 35 && y <= 39 && Math.abs(x - cx) <= 12 && Math.abs(x - cx) >= 5, 'top', 1);
  if (top === 'Trench coat' || top === 'Overcoat') for (const [x, y] of [[17, 43], [30, 43], [17, 47], [30, 47]]) { O(x, y, c => c && shade(c, 0.55)); }
  if (top === 'Suit jacket') { O(33, 41, WHITE); O(34, 41, WHITE); O(33, 42, WHITE); }
  if (top === 'Uniform shirt') {
    // Open collar points, the placket, pocket flaps, ribbons (her left) and a name tag (her right).
    fill((x, y) => y >= 36 && y <= 42 && Math.abs(x - cx) <= 3.6 - (y - 36) * 0.55, 'neckSkin');
    each((x, y) => { if (y >= 39 && y <= 42 && Math.abs(x - cx) <= 3.6 - (y - 36) * 0.55) O(x, y, y === 39 ? shade(WHITE, 0.82) : WHITE); });   // the white undershirt
    each((x, y) => { const d = Math.abs(x - cx); if (y >= 36 && y <= 41 && d > 3.6 - (y - 36) * 0.55 && d <= 8 - (y - 36) * 0.4 && L.at(x, y) === 'top') O(x, y, c => c && shade(c, 1.18)); });
    for (const [x, y] of [[17, 38], [18, 38], [17, 39], [29, 38], [30, 38], [30, 39]]) O(x, y, TAG);   // collar devices
    for (let y = 44; y < 48; y++) { O(17, y, c => c && shade(c, 0.85)); O(30, y, c => c && shade(c, 0.85)); }   // darts
    for (const [x, y] of [[29, 40], [30, 39], [31, 39], [32, 39], [33, 40]]) O(x, y, SILVER);   // a warfare pin over the ribbons
    for (let y = 42; y < 48; y++) O(24, y, c => c && shade(c, 0.72));
    for (const y of [43, 46]) O(23, y, c => c && shade(c, 0.6));
    for (const [a, b2] of [[13, 19], [28, 34]]) for (let x = a; x <= b2; x++) { O(x, 44, c => c && shade(c, 0.74)); O(x, 45, c => c && shade(c, 0.9)); }
    for (let x = 28; x <= 34; x++) for (const y of [41, 42]) O(x, y, RIBBONS[Math.floor((x - 28) / 2.4) % 3 + (y - 41)]);
    for (let x = 14; x <= 19; x++) { O(x, 41, TAG); O(x, 42, TAG); } for (const x of [16, 17, 18]) O(x, 41, WHITE); O(14, 41, '#b8322e');
  }
  if (top === 'Jumper') {
    // The V neck over a white undershirt, the collar's white stripes along it, and the
    // black neckerchief knotted where the V closes.
    const vEdge = y => 7 - (y - 36) * 0.62;
    fill((x, y) => y >= 35 && y <= 46 && Math.abs(x - cx) <= vEdge(y), 'neckSkin');
    fill((x, y) => y >= 35 && y <= 38 && Math.abs(x - cx) <= vEdge(y) && y >= 37 - (Math.abs(x - cx) > 4 ? 0 : 0), 'shirt');
    each((x, y) => { const d = Math.abs(x - cx), e = vEdge(y); if (y >= 35 && y < 48 && L.at(x, y) === 'top') { if (Math.abs(d - (e + 1.5)) < 0.55 || Math.abs(d - (e + 3.5)) < 0.55) O(x, y, WHITE); } });
    for (let y = 42; y <= 47; y++) for (let x = 21; x <= 26; x++) { const d = Math.abs(x - cx); if ((y <= 44 && d <= 2.6) || (y > 44 && d <= 1.6 + (y - 45) * 0.2)) O(x, y, (x + y) % 3 ? C.neck : shade(C.neck, 0.7)); }
    for (let i = 0; i < 6; i++) { O(17 + i, 37 + i, C.neck); O(30 - i, 37 + i, C.neck); }
  }
  // Pattern over the coat.
  const pat = nm('pattern');
  if (pat !== 'Plain') each((x, y) => {
    const m = L.mat[y][x]?.m; if (m !== 'top' && m !== 'hood') return;
    if (pat === 'Pinstripe' && x % 3 === 0 && y % 2 === 0) O(x, y, c => c && shade(c, 1.35));
    if (pat === 'Check' && (x % 4 === 0 || y % 4 === 0)) O(x, y, c => c && shade(c, x % 4 === 0 && y % 4 === 0 ? 0.62 : 0.82));
  });
  if (pat === 'Patched') for (let y = 42; y <= 45; y++) for (let x = 30; x <= 34; x++) O(x, y, (x === 30 || y === 45) ? shade(mix(C.top, '#8a7a5a', 0.6), 0.7) : mix(C.top, '#8a7a5a', 0.6));

  // --- neck ---
  if (neck !== 'Turtleneck') fill((x, y) => x >= 19 && x <= 28 && y >= 30 && y <= 38, 'neckSkin');
  if (neck === 'Turtleneck') fill((x, y) => x >= 18 && x <= 29 && y >= 31 && y <= 39, 'neckw');
  const tie = C.neck, tieD = shade(C.neck, 0.7);
  if (neck === 'Necktie' && (opening || top === 'Shirtsleeves')) { for (let y = 37; y <= 39; y++) for (let x = 22; x <= 25; x++) O(x, y, tieD); for (let y = 40; y < 48; y++) for (let x = 22; x <= 25; x++) if (L.at(x, y) === 'shirt') O(x, y, x < 24 ? tie : tieD); }
  if (neck === 'Bow tie') { for (const [x, y] of [[19, 37], [20, 37], [19, 38], [20, 38], [21, 38], [26, 38], [27, 37], [28, 37], [27, 38], [28, 38], [19, 39], [28, 39]]) O(x, y, tie); for (const [x, y] of [[22, 38], [23, 38], [24, 38], [25, 38]]) O(x, y, tieD); }
  if (neck === 'Open collar' && opening) { for (const [x, y] of [[20, 37], [21, 38], [27, 37], [26, 38]]) O(x, y, WHITE); }
  if (neck === 'Bandana') fill((x, y) => y >= 34 && y <= 40 && Math.abs(x - cx) <= 9 - Math.max(0, y - 37) * 2, 'neckw');

  // --- head and ears ---
  fill((x, y) => head(x, y), 'skin');
  E(12, 23, 2, 3.4, 'ear'); E(35, 23, 2, 3.4, 'ear');
  O(12, 23, c => c && shade(c, 0.75)); O(35, 23, c => c && shade(c, 0.75));

  // A softer face (Lashes, Phase 29b): no heavy shadow along the jaw under the mouth, just a
  // thin line at the chin.
  if (nm('eyes') === 'Lashes') each((x, y) => {
    if (y < 29 || Math.abs(x - cx) > 7 || L.at(x, y) !== 'skin') return;
    P(x, y, 'skin', L.at(x, y + 1) === 'skin' ? 0 : -1);
  });

  // --- face ---
  const mood = MOOD_SPECS[MOODS.includes(opts.mood) ? opts.mood : 'neutral'];
  const eye = C.eye, ink = INK;
  const drawEye = (x0, flip) => {
    const X = i => (flip ? x0 + 3 - i : x0 + i);
    const shape = mood.eyes ?? nm('eyes');
    const lid = (y, c, w = 4) => { for (let i = 0; i < w; i++) O(X(i), y, c); };
    if (shape === 'Narrow') { lid(22, ink); lid(23, WHITE); O(X(2), 23, eye); O(X(3), 23, ink); lid(24, C.skinD); return; }
    if (shape === 'Wide') { lid(20, ink); for (const y of [21, 22, 23, 24]) lid(y, WHITE); for (const y of [22, 23]) { O(X(1), y, eye); O(X(2), y, y === 23 ? ink : eye); } O(X(1), 22, '#f4f8fb'); return; }
    const Wd = shade(WHITE, 0.82);
    if (shape === 'Almond' || shape === 'Downturned') {
      for (let i = shape === 'Almond' ? 0 : 1; i < 4; i++) O(X(i), 21, ink);
      if (shape === 'Almond') O(X(-1), 20, ink); else { O(X(0), 22, ink); O(X(-1), 23, ink); }
      O(X(1), 22, WHITE); O(X(2), 22, eye); O(X(3), 22, Wd);
      O(X(0), 23, shape === 'Almond' ? WHITE : ink); O(X(1), 23, eye); O(X(2), 23, ink); O(X(3), 23, Wd);
      lid(24, C.skinD, 3);
      return;
    }
    lid(21, ink);
    if (shape === 'Hooded') lid(22, C.skinDD);
    else { O(X(0), 22, WHITE); O(X(1), 22, '#f4f8fb'); O(X(2), 22, eye); O(X(3), 22, Wd); }
    O(X(0), 23, WHITE); O(X(1), 23, eye); O(X(2), 23, ink); O(X(3), 23, Wd);
    lid(24, C.skinD, 3);
    if (shape === 'Lashes') { O(X(-1), 21, ink); O(X(-1), 20, ink); O(X(0), 20, ink); }
  };
  drawEye(16, false); drawEye(28, true);
  const brow = hair === 'Bald' ? shade(C.skin, 0.5) : C.hairD;
  const bc = nm('brows') === 'Thin' ? mix(brow, C.skin, 0.4) : nm('brows') === 'Shaved' ? mix(brow, C.skin, 0.8) : brow;
  const browsBase = {
    Straight: [[0, 18], [1, 18], [2, 18], [3, 18], [4, 18]],
    Arched: [[-1, 19], [0, 18], [1, 17], [2, 17], [3, 17], [4, 18]],
    Heavy: [[-1, 18], [0, 18], [1, 18], [2, 18], [3, 18], [4, 18], [0, 17], [1, 17], [2, 17], [3, 17], [4, 19]],
    Thin: [[0, 18], [1, 18], [2, 18], [3, 18]],
    Furrowed: [[0, 17], [1, 17], [2, 18], [3, 18], [4, 19]],
    Bushy: [[-1, 18], [0, 18], [1, 18], [2, 18], [3, 18], [4, 18], [-1, 17], [0, 17], [1, 17], [2, 17], [3, 17], [4, 17], [1, 16], [2, 16], [3, 16]],
    Unibrow: [[0, 18], [1, 18], [2, 18], [3, 18], [4, 18]],
    Shaved: [[1, 18], [2, 18], [3, 18]],
  }[nm('brows')];
  const browsL = mood.brows ?? browsBase, browsR = mood.browsR ?? browsL;
  for (const [i, y] of browsL) O(16 + i, y, bc);
  for (const [i, y] of browsR) O(31 - i, y, bc);
  if (nm('brows') === 'Unibrow' && !mood.brows) for (let x = 21; x <= 26; x++) O(x, 18, bc);
  // Nose: the shadow side of the bridge, the tip, the nostrils.
  // Lashes (a softer face, Phase 29b): a shorter, lighter line down the nose.
  for (let y = nm('eyes') === 'Lashes' ? 25 : 23; y <= 27; y++) O(25, y, nm('eyes') === 'Lashes' ? mix(C.skin, C.skinD, 0.6) : C.skinD);
  O(23, 27, c => c && shade(c, 1.12)); O(22, 28, C.skinD); O(25, 28, C.skinDD); O(24, 28, C.skinD);
  // Mouth.
  const lip = mix(C.skinDD, LIP, 0.5), lipL = mix(C.skin, LIP, 0.45);
  const mouth = {
    Neutral: [[21, 31, lip], [22, 31, lip], [23, 31, lip], [24, 31, lip], [25, 31, lip], [22, 32, lipL], [23, 32, lipL], [24, 32, lipL]],
    Smirk: [[21, 31, lip], [22, 31, lip], [23, 31, lip], [24, 31, lip], [25, 30, lip], [26, 29, lip], [22, 32, lipL], [23, 32, lipL]],
    Frown: [[20, 32, lip], [21, 31, lip], [22, 31, lip], [23, 31, lip], [24, 31, lip], [25, 31, lip], [26, 32, lip]],
    Full: [[21, 31, LIP], [22, 30, LIP], [23, 31, shade(LIP, 0.7)], [24, 31, shade(LIP, 0.7)], [25, 30, LIP], [26, 31, LIP], [22, 32, shade(LIP, 1.15)], [23, 32, LIP], [24, 32, LIP], [25, 32, shade(LIP, 1.1)]],
    Grin: [[20, 30, lip], [21, 31, lip], [22, 31, WHITE], [23, 31, WHITE], [24, 31, WHITE], [25, 31, WHITE], [26, 31, lip], [27, 30, lip], [22, 32, lip], [23, 32, lip], [24, 32, lip], [25, 32, lip]],
    // A closed smile: lips together, the corners turned up, no teeth.
    Smile: [[20, 30, lip], [21, 31, lip], [22, 32, lip], [23, 32, lip], [24, 32, lip], [25, 32, lip], [26, 31, lip], [27, 30, lip], [22, 33, lipL], [23, 33, lipL], [24, 33, lipL], [25, 33, lipL]],
    // Closed and smiling, softly colored: a rosy upper lip, a fuller lower one with a highlight.
    'Soft smile': [[21, 31, mix(C.skin, '#c46a6e', 0.45)], [22, 32, mix(LIP, '#c8686c', 0.55)], [23, 32, mix(LIP, '#b8585e', 0.4)], [24, 32, mix(LIP, '#b8585e', 0.4)], [25, 32, mix(LIP, '#c8686c', 0.55)], [26, 31, mix(C.skin, '#c46a6e', 0.45)],
      [22, 33, mix(C.skin, '#d8888a', 0.55)], [23, 33, mix(C.skin, '#e8a8a4', 0.7)], [24, 33, mix(C.skin, '#d8888a', 0.6)], [25, 33, mix(C.skin, '#d8888a', 0.5)]],
  }[nm('mouth')];
  const mouthPx = mood.mouth ? mood.mouth({ lip, lipL, LIP, WHITE, dark: shade(LIP, 0.35) }) : mouth;
  for (const [x, y, c] of mouthPx) O(x, y, c);
  paintMoodTouches(mood, { O, each, inEll, C, L });
  const face = nm('face'), mark = nm('mark');
  if (face === 'Freckles') for (const [x, y] of [[16, 26], [18, 27], [17, 28], [20, 26], [27, 26], [29, 27], [30, 26], [31, 28]]) O(x, y, c => c && shade(c, 0.8));
  if (face === 'Tired eyes') for (let i = 0; i < 4; i++) { O(16 + i, 25, c => c && mix(c, '#5a4a6a', 0.3)); O(28 + i, 25, c => c && mix(c, '#5a4a6a', 0.3)); }
  if (face === 'Rosy') for (const ex of [16.5, 30.5]) each((x, y) => { if (inEll(x, y, ex, 27.5, 2.6, 1.6)) O(x, y, c => c && mix(c, '#c46a5e', 0.42)); });
  const scar = mix(C.skin, '#ecd6c8', 0.6);
  if (mark === 'Brow scar') for (const [x, y] of [[18, 16], [18, 17], [19, 18], [19, 19], [19, 20]]) O(x, y, scar);
  if (mark === 'Cheek scar') for (const [x, y] of [[28, 26], [29, 27], [30, 28], [31, 29]]) { O(x, y, scar); O(x + 1, y, C.skinD); }
  if (mark === 'Mole') O(29, 29, shade(C.skin, 0.4));
  if (mark === 'Bandage') for (let y = 26; y <= 28; y++) for (let x = 28; x <= 32; x++) O(x, y, (x === 30) ? shade(BANDAGE, 0.86) : BANDAGE);
  const fh = nm('facial'), H = C.beard, HD2 = C.beardD;
  if (fh === 'Stubble') each((x, y) => { if (head(x, y) && y >= 28 && (x + y) % 2 === 0 && L.ov[y][x] == null && !(y >= 30 && y <= 32 && x >= 20 && x <= 27)) O(x, y, c => c && mix(c, H, 0.35)); });
  if (fh === 'Mustache') for (let x = 20; x <= 27; x++) { O(x, 29, H); O(x, 30, x === 20 || x === 27 ? HD2 : H); }
  if (fh === 'Beard') each((x, y) => { if (head(x, y) && (y >= 29 || (y >= 24 && Math.abs(x - cx) >= 8)) && !(y >= 31 && y <= 32 && x >= 21 && x <= 26)) O(x, y, (x + y) % 3 ? H : HD2); });
  // Phase 31c: newer marks, beards, and the extras (makeup, eye details, piercings, skin).
  if (mark === 'Burn scar') each((x, y) => { if (inEll(x, y, 17.5, 28, 3.2, 3.4) && (x * 7 + y * 3) % 5 && L.at(x, y) === 'skin') O(x, y, c => c && mix(c, '#d4888a', 0.5)); });
  if (mark === 'Birthmark') each((x, y) => { if (inEll(x, y, 30, 27, 2.2, 1.8) && L.at(x, y) === 'skin') O(x, y, c => c && mix(c, '#7a3a34', 0.5)); });
  if (mark === 'Stitched scar') for (let y = 25; y <= 31; y++) { O(29, y, scar); if (y % 2) { O(28, y, C.skinDD); O(30, y, C.skinDD); } }
  if (mark === 'Eye scar') for (let y = 15; y <= 26; y++) O(y <= 21 ? 18 : 19, y, scar);
  if (fh === 'Handlebar') { for (let x = 20; x <= 27; x++) { O(x, 29, H); O(x, 30, x === 20 || x === 27 ? HD2 : H); } for (const [x, y] of [[19, 30], [19, 29], [28, 30], [28, 29], [18, 28], [29, 28]]) O(x, y, H); }
  if (fh === 'Soul patch') for (const [x, y] of [[23, 34], [24, 34], [23, 33], [24, 33]]) O(x, y, (x + y) % 2 ? H : HD2);
  if (fh === 'Chinstrap') each((x, y) => { if (head(x, y) && !head(x, y, -2.2) && y >= 25) O(x, y, (x + y) % 3 ? H : HD2); });
  paintLookFx(look, { O, each, inEll, C, L, mouthPx, eye });
  if (fh === 'Goatee') { each((x, y) => { if (head(x, y) && y >= 33 && Math.abs(x - cx) <= 3.5) O(x, y, (x + y) % 3 ? H : HD2); }); for (let x = 21; x <= 26; x++) O(x, 30, H); }
  if (fh === 'Sideburns') for (let y = 17; y <= 27; y++) for (const x of [13, 14, 33, 34]) if (head(x, y)) O(x, y, H);

  // --- hair ---
  const keep = (x, y) => hatCut < 0 || y >= hatCut;
  const cap = (g, line) => (x, y) => head(x, y, g) && (y <= line || (Math.abs(x - cx) >= 10 && y <= line + 6));
  const styles = {
    Crop: cap(1.5, 13),
    'Side part': (x, y) => head(x, y, 2) && (y <= 12 || (x >= 23 && y <= 15 - (x - 23) * 0.2 + 2) || (Math.abs(x - cx) >= 10 && y <= 19)),
    Long: (x, y) => head(x, y, 2) && (y <= 14 || Math.abs(x - cx) >= 9.5) && !(Math.abs(x - cx) < 1 && y > 10 && y < 14 && false),
    Bun: (x, y) => cap(1.5, 13)(x, y) || inEll(x, y, cx, 3.5, 5, 3.5),
    Curls: (x, y) => (head(x, y, 4) && (y <= 15 || Math.abs(x - cx) >= 10.5) && y <= 27),
    Mohawk: (x, y) => Math.abs(x - cx) <= 4 && y >= 1 && y <= 13 && (head(x, y, 1) || y < 10),
    Bob: (x, y) => head(x, y, 3) && (y <= 16 || Math.abs(x - cx) >= 9.5) && y <= 34 - Math.max(0, Math.abs(x - cx) - 11) * 1.5,
    'Slick back': cap(1.5, 11),
    Ponytail: cap(1.5, 12),
    Afro: (x, y) => inEll(x, y, cx, 17, 17, 15) && (y <= 14 || Math.abs(x - cx) >= 11.5),
    Undercut: (x, y) => head(x, y, 2) && (y <= 9 || (y <= 14 && x >= 21 && x <= 33 - (y - 9))),
    Braid: cap(1.5, 13),
    Pixie: cap(1, 10),
    'Space buns': (x, y) => cap(1.5, 12)(x, y) || inEll(x, y, 14, 6, 4, 3.5) || inEll(x, y, 33, 6, 4, 3.5),
    Pigtails: cap(1.5, 13),
    Dreadlocks: (x, y) => head(x, y, 3.5) && (y <= 15 || Math.abs(x - cx) >= 10) && y <= 30,
    'Top knot': (x, y) => (head(x, y, 1.2) && y <= 11 && Math.abs(x - cx) <= 8.5) || inEll(x, y, cx, 3, 3.5, 3.5),
    'Side shave': (x, y) => head(x, y, 2.5) && (y <= 10 || (x >= 22 && y <= 14)),
    'Bowl cut': (x, y) => head(x, y, 3) && y <= 17 - (Math.abs(x - cx) < 6 ? 0 : 1),
    Pompadour: (x, y) => cap(1.5, 12)(x, y) || (inEll(x, y, cx + 3, 6, 11, 6) && y >= 0),
    Cornrows: cap(1.5, 12),
    Mullet: cap(1.5, 13),
  };
  styles['Streaked long'] = styles.Long;
  // Waves: a deep side part on the left, the hair swept across the forehead to the right.
  // The lengths fall in waves in front of the shoulders and flip out at the ends.
  const waveOut = y => 14.5 + Math.sin(y / 2.3) * 1.4 + Math.min(3, Math.max(0, y - 22) * 0.22);
  styles.Waves = (x, y) => {
    const d = Math.abs(x - cx);
    if (head(x, y, 2.5) && (y <= 11 || (x >= 19 && y <= 11 + (x - 19) * 0.55))) return true;
    return y >= 10 && y <= 43 - Math.max(0, d - 13) * 0.8 && d >= 10 && d <= waveOut(y) && (head(x, y, 4.5) || y >= 18);
  };
  // Shaggy: a bob with a choppy fringe and ragged, uneven ends.
  styles.Shaggy = (x, y) => head(x, y, 3) && (y <= 16 + ((x * 7) % 3) || Math.abs(x - cx) >= 9.5) && y <= 35 + ((x * 5) % 4) - Math.max(0, Math.abs(x - cx) - 11) * 1.5;
  const hm = look.balding ? (x, y) => head(x, y, 1.5) && Math.abs(x - cx) >= 9.5 && y >= 14 && y <= 25 - Math.max(0, 10.5 - Math.abs(x - cx)) * 2 : styles[hair];
  if (hm) fill((x, y) => hm(x, y) && keep(x, y) && !(hat === 'Garrison cap' && Math.abs(x - cx) < 9 && y >= 10), 'hair');
  if (look.balding && hatCut < 0) for (const [x, y] of [[19, 10], [20, 9], [21, 9], [22, 9], [19, 11], [20, 10]]) O(x, y, c => c && shade(c, 1.25));
  if (look.balding) each((x, y) => { if (L.mat[y][x]?.m === 'hair' && (x + y) % 3 === 0) O(x, y, c => c && shade(c, 1.15)); });
  if (hair === 'Braid') for (let y = 26; y <= 46; y++) for (let x = 11; x <= 15; x++) { if (Math.abs(x - 13 + Math.sin(y / 2)) <= 2) { P(x, y, 'hair'); if ((x + y) % 3 === 0) O(x, y, c => c && shade(c, 0.7)); } }
  if (hair === 'Curls' || hair === 'Afro') each((x, y) => { if (L.mat[y][x]?.m !== 'hair') return; const k = (x + (Math.floor(y / 3) % 2) * 3) % 5; if (y % 3 === 0 && k === 0) O(x, y, c => c && shade(c, 1.3)); else if (y % 3 === 1 && k === 1) O(x, y, c => c && shade(c, 0.7)); });
  if (hair === 'Cornrows') each((x, y) => { if (L.mat[y][x]?.m === 'hair' && y <= 14 && x % 3 === 0) O(x, y, c => c && shade(c, 0.6)); });
  if (hair === 'Dreadlocks') each((x, y) => { if (L.mat[y][x]?.m === 'hair' && y % 4 === 0 && (x + y) % 2 === 0) O(x, y, c => c && shade(c, 0.7)); });
  if (hair === 'Pigtails' && hatCut < 0) for (const x of [9, 10, 37, 38]) O(x, 17, C.hairD);
  if (hair === 'Side shave') each((x, y) => { if (L.at(x, y) === 'skin' && x < 20 && y >= 7 && y <= 17 && L.ov[y][x] == null && Math.abs(x - cx) >= 4) O(x, y, c => c && mix(c, C.hair, 0.3)); });
  if (hair === 'Top knot' && hatCut < 0) for (const x of [21, 22, 23, 24, 25, 26]) O(x, 6, C.hairD);
  if (hair === 'Bun' && hatCut < 0) for (let x = 21; x <= 26; x++) O(x, 7, C.hairD);
  if (hair === 'Waves') each((x, y) => {
    if (L.mat[y][x]?.m !== 'hair') return;
    const t = Math.max(0, Math.min(1, (y - 20) / 18));
    if (t > 0) O(x, y, c => c && mix(c, OMBRE, t * 0.85));
    const band = Math.sin(y / 2.3 + Math.abs(x - cx) * 0.5);
    if (band > 0.8) O(x, y, c => c && shade(c, 0.8)); else if (band < -0.9 && y > 14) O(x, y, c => c && shade(c, 1.18));
  });
  if (hair === 'Waves' && hatCut < 0) for (let y = 7; y <= 10; y++) if (L.mat[y][18]?.m === 'hair') O(18, y, C.hairD);
  if (hair === 'Shaggy') each((x, y) => { if (L.mat[y][x]?.m !== 'hair') return; if ((x * 3 + y) % 5 === 0) O(x, y, C.hairD); else if ((x + y * 2) % 9 === 0) O(x, y, C.hairL); });
  if (hair === 'Shaggy' && hatCut < 0) for (const x of [16, 20, 25, 30]) for (let y = 4; y <= 5; y++) if (!L.mat[y][x] && L.mat[y + 2]?.[x]?.m === 'hair') P(x, y, 'hair');
  if (hair === 'Slick back' && hatCut < 0) for (const [x, y] of [[18, 10], [19, 9], [20, 9], [21, 8], [22, 8]]) O(x, y, C.hairL);
  if (hair === 'Side part' && hatCut < 0) for (let y = 9; y <= 12; y++) O(18, y, C.hairD);
  if ((hair === 'Long' || hair === 'Streaked long') && hatCut < 0) for (let y = 9; y <= 14; y++) O(23, y, C.hairD);
  if (hair === 'Streaked long') {
    // The bright strand falls down the right side of the face; a red shadow in the lengths.
    each((x, y) => { if (L.mat[y][x]?.m !== 'hair') return; const t = x - (30 + Math.floor((y - 8) / 6)); if (t >= 0 && t <= 1 && y >= 8 && y <= 40) O(x, y, (y % 3) ? STREAK : shade(STREAK, 0.78)); else if (y >= 26 && (x + y) % 3 === 0) O(x, y, c => c && mix(c, '#5a1e1a', 0.45)); });
  }
  if (hair === 'Mohawk' || hair === 'Undercut') each((x, y) => { if (L.at(x, y) === 'skin' && y >= 9 && y <= 20 && Math.abs(x - cx) >= 8 && (x + y) % 2 === 0) O(x, y, c => c && mix(c, C.hair, 0.3)); });

  // --- hat ---
  if (hat === 'Fedora') { fill((x, y) => y >= 2 && y <= 12 && Math.abs(x - cx) <= 10.5 - (y < 4 ? 1.5 : 0) && !(y === 2 && Math.abs(x - cx) < 3), 'hat'); fill((x, y) => y >= 11 && y <= 13 && Math.abs(x - cx) <= 10.5, 'band'); fill((x, y) => inEll(x, y, cx, 14.5, 20, 2.6) && y >= 14, 'brim'); }
  if (hat === 'Flat cap') { fill((x, y) => inEll(x, y, cx, 13, 13.5, 8) && y <= 15, 'hat'); fill((x, y) => y >= 15 && y <= 17 && Math.abs(x - cx) <= 12 - (y - 15), 'brim', -1); }
  if (hat === 'Beanie') { fill((x, y) => inEll(x, y, cx, 14, 13, 12) && y <= 13, 'hat'); fill((x, y) => y >= 13 && y <= 17 && Math.abs(x - cx) <= 13.5, 'band'); for (let x = 11; x <= 36; x += 2) for (let y = 13; y <= 17; y++) O(x, y, c => c && shade(c, 0.82)); }
  if (hat === 'Bowler') { fill((x, y) => inEll(x, y, cx, 11, 10.5, 9) && y <= 13, 'hat'); fill((x, y) => y >= 11 && y <= 13 && Math.abs(x - cx) <= 10, 'band'); fill((x, y) => inEll(x, y, cx, 14, 15, 2.2) && y >= 13, 'brim'); }
  if (hat === 'Wide brim') { fill((x, y) => y >= 3 && y <= 12 && Math.abs(x - cx) <= 9, 'hat'); fill((x, y) => y >= 10 && y <= 12 && Math.abs(x - cx) <= 9, 'band'); fill((x, y) => inEll(x, y, cx, 14.5, 24, 3.2) && y >= 13, 'brim'); }
  if (hat === 'Trilby') { fill((x, y) => y >= 4 && y <= 12 && Math.abs(x - cx) <= 9.5 && !(y === 4 && Math.abs(x - cx) < 3), 'hat'); fill((x, y) => y >= 10 && y <= 12 && Math.abs(x - cx) <= 9.5, 'band'); fill((x, y) => inEll(x, y, cx, 14, 15.5, 2) && y >= 13, 'brim'); fill((x, y) => y === 15 && Math.abs(x - cx) <= 7, 'brim', -1); }
  if (hat === 'Beret') { fill((x, y) => inEll(x, y, 25.5, 10, 15.5, 6.5) && y <= 14, 'hat'); fill((x, y) => y >= 13 && y <= 15 && Math.abs(x - cx) <= 12, 'band'); fill((x, y) => x >= 26 && x <= 27 && y >= 2 && y <= 4, 'hat'); }
  if (hat === 'Fedora' || hat === 'Trilby') for (const x of [22, 23, 24, 25]) O(x, hat === 'Fedora' ? 3 : 5, c => c && shade(c, 0.7));
  if (hat === 'Top hat') {
    fill((x, y) => y >= 0 && y <= 13 && Math.abs(x - cx) <= 8.5 - (y < 1 ? 0.5 : 0), 'hat');
    fill((x, y) => y >= 10 && y <= 12 && Math.abs(x - cx) <= 8.5, 'band');
    fill((x, y) => inEll(x, y, cx, 14.5, 16, 2.4) && y >= 13, 'brim');
    for (let y = 1; y <= 9; y++) { O(17, y, c => c && shade(c, 1.35)); O(18, y, c => c && shade(c, 1.15)); }
  }
  if (hat === 'Garrison cap') {
    // Folded flat, set a little to one side: a long low wedge, the fold along the top.
    // Worn high on the head and tilted: a peak toward one side, sloping away; the hair shows
    // beneath it. The rating badge on the front of the other side.
    const topY = x => (x < 20 ? 1.5 + (20 - x) * 1.25 : 1.5 + (x - 20) * 0.4), botY = x => 12.6 - (x - 12) * 0.08;
    fill((x, y) => x >= 12 && x <= 35 && y >= topY(x) && y <= botY(x), 'hat');
    fill((x, y) => x >= 12 && x <= 35 && y > botY(x) - 1.4 && y <= botY(x), 'band');
    for (let x = 13; x <= 34; x++) O(x, Math.ceil(topY(x)), c => c && shade(c, 1.4));
    for (const [x, y, c] of [[29, 6, SILVER], [30, 6, SILVER], [28, 7, shade(SILVER, 0.8)], [31, 7, shade(SILVER, 0.8)], [29, 7, SILVER], [30, 7, SILVER],
      [28, 9, GOLD], [29, 8, GOLD], [30, 8, GOLD], [31, 9, GOLD], [28, 10, shade(GOLD, 0.75)], [29, 9, shade(GOLD, 0.75)], [30, 9, shade(GOLD, 0.75)], [31, 10, shade(GOLD, 0.75)]]) O(x, y, c);
  }
  if (hat === 'Sailor cap') {
    fill((x, y) => inEll(x, y, cx, 9, 11, 8) && y <= 11, 'hat');
    fill((x, y) => y >= 10 && y <= 13 && Math.abs(x - cx) <= 13.5 - (y === 13 ? 0.5 : 0), 'brim');
    for (let x = 11; x <= 36; x++) O(x, 10, c => c && shade(c, 1.1));
    for (const y of [5, 7]) for (let x = 16; x <= 31; x++) if (L.at(x, y) === 'hat' && x % 2) O(x, y, c => c && shade(c, 0.88));
  }
  if (look.hairFx) each((x, y) => {
    if (L.mat[y][x]?.m !== 'hair') return;
    if (look.hairFx === 1 && x < cx) O(x, y, c => c && mix(c, '#efe6d6', 0.6));
    if (look.hairFx === 2) O(x, y, c => c && mix(c, '#d890c0', Math.min(0.75, Math.max(0.1, (y - 3) * 0.04))));
  });
  const clearOv = pred => each((x, y) => { if (pred(x, y)) L.ov[y][x] = null; });
  const dd = x => Math.abs(x - cx), HATC = CLOTH[look.hatColor];
  if (hat === 'Newsboy') { fill((x, y) => inEll(x, y, cx, 11, 14, 8.5) && y <= 15, 'hat'); fill((x, y) => y >= 15 && y <= 17 && dd(x) <= 12 - (y - 15), 'brim'); O(cx, 3, shade(HATC, 1.4)); O(cx + 1, 3, shade(HATC, 1.4)); for (let y = 5; y <= 13; y++) O(cx - 6 - (y > 9 ? 1 : 0), y, c => c && shade(c, 0.78)); }
  if (hat === 'Deerstalker') {
    fill((x, y) => inEll(x, y, cx, 11, 12.5, 8) && y <= 14, 'hat'); fill((x, y) => y >= 14 && y <= 16 && dd(x) <= 11, 'band');
    fill((x, y) => y >= 16 && y <= 18 && dd(x) <= 9.5, 'brim'); fill((x, y) => y >= 2 && y <= 5 && dd(x) <= 6, 'brim');
    fill((x, y) => y >= 14 && y <= 27 && dd(x) >= 11 && dd(x) <= 13.5 - (y - 14) * 0.12, 'hat');
    for (let x = 22; x <= 25; x++) O(x, 1, shade(HATC, 0.6));
  }
  if (hat === 'Cowboy hat') {
    fill((x, y) => y >= 3 && y <= 12 && dd(x) <= 8.5 - (y < 5 ? 2 : 0) && !(y <= 5 && dd(x) < 1.5), 'hat');
    fill((x, y) => y >= 10 && y <= 12 && dd(x) <= 8.5, 'band');
    fill((x, y) => y >= 12 && y <= 15 && dd(x) <= 19 && (y >= 13 || dd(x) <= 15) && !(y === 12 && dd(x) <= 8.5) && (dd(x) < 13 || y <= 14 - (dd(x) - 13) * 0.4), 'brim');
    for (let x = 4; x <= 43; x++) if (L.at(x, 14) === 'brim' && dd(x) > 13) O(x, 14, c => c && shade(c, 1.25));
  }
  if (hat === 'Bucket hat') { fill((x, y) => inEll(x, y, cx, 10, 11, 7) && y <= 12, 'hat'); fill((x, y) => y >= 11 && y <= 12 && dd(x) <= 11.5, 'band'); fill((x, y) => y >= 12 && y <= 16 && dd(x) <= 12 + (y - 12) * 1.1 - (dd(x) > 15 ? 1 : 0), 'brim'); for (let x = 12; x <= 36; x++) O(x, 13, c => c && shade(c, 0.82)); }
  if (hat === 'Headscarf') {
    fill((x, y) => head(x, y, 2.5) && !inEll(x, y, cx, 24, 8.6, 10.5) && y >= 2 && y <= 30, 'hat');
    fill((x, y) => inEll(x, y, cx, 35, 3.5, 2.5), 'band');
    for (let y = 2; y <= 30; y++) for (let x = 8; x <= 40; x++) if (L.at(x, y) === 'hat' && (x * 3 + y * 5) % 7 === 0) O(x, y, c => c && shade(c, 1.45));
  }
  if (hat === 'Hood up') {
    clearOv((x, y) => inEll(x, y, cx, 19, 15.5, 16) && !inEll(x, y, cx, 25, 9.2, 11) && y >= 2);
    fill((x, y) => inEll(x, y, cx, 19, 15.5, 16) && !inEll(x, y, cx, 25, 9.2, 11) && y >= 2, 'hat');
    each((x, y) => { if (L.at(x, y) === 'hat' && inEll(x, y, cx, 25, 11.2, 13) && !inEll(x, y, cx, 25, 9.2, 11)) O(x, y, c => c && shade(c, 0.6)); });
  }
  if (hat === 'Veil') {
    fill((x, y) => inEll(x, y, cx + 5, 7, 8, 3.8) && y <= 9, 'hat'); E(cx + 5, 6, 3, 2, 'band');
    each((x, y) => { if (y >= 14 && y <= 29 && head(x, y) && (L.at(x, y) === 'skin') && L.ov[y][x] == null && (x + y) % 2 === 0) O(x, y, c => c && mix(c, '#101018', 0.32)); });
  }
  if (hat === 'Pillbox') { fill((x, y) => y >= 3 && y <= 10 && dd(x) <= 8 - (y === 3 ? 1.5 : 0), 'hat'); fill((x, y) => y >= 9 && y <= 10 && dd(x) <= 8, 'band'); for (let x = 16; x <= 31; x++) O(x, 4, c => c && shade(c, 1.25)); }
  if (hat === 'Gas mask') {
    fill((x, y) => y >= 15 && y <= 16 && dd(x) <= 13.5, 'band');
    clearOv((x, y) => inEll(x, y, cx, 29, 9.2, 8.5) && y >= 24);
    fill((x, y) => inEll(x, y, cx, 29, 9.2, 8.5) && y >= 24 && head(x, y, 0.5), 'hat');
    for (const lx of [19, 28]) { fill((x, y) => inEll(x, y, lx, 22.5, 3.6, 3.6), 'brim'); each((x, y) => { if (inEll(x, y, lx, 22.5, 2.4, 2.4)) O(x, y, (x + y) % 3 ? '#4a7a6a' : '#7ab0a0'); }); }
    fill((x, y) => inEll(x, y, cx, 32, 3.4, 3.4), 'brim'); for (const y of [30, 32, 34]) for (let x = 21; x <= 26; x++) O(x, y, c => c && shade(c, 0.6));
  }
  if (hat === 'Bandana') {
    fill((x, y) => head(x, y, 2) && y <= 13 && (y <= 10 || dd(x) >= 9), 'hat');
    fill((x, y) => y >= 12 && y <= 13 && dd(x) <= 12, 'band');
    E(37, 14, 3, 2.4, 'band'); for (const [x, y] of [[38, 17], [39, 18], [37, 18], [38, 19]]) P(x, y, 'band');
    for (let y = 3; y <= 11; y++) for (let x = 10; x <= 38; x++) if (L.at(x, y) === 'hat' && (x + y * 2) % 6 === 0) O(x, y, c => c && shade(c, 1.4));
  }
  if (hat === 'Hair bow') { E(19.5, 6.5, 3.6, 2.6, 'hat'); E(27.5, 6.5, 3.6, 2.6, 'hat'); E(23.5, 6.5, 1.8, 1.8, 'band'); }

  // --- extras ---
  if (extra === 'Scarf') { fill((x, y) => y >= 33 && y <= 39 && Math.abs(x - cx) <= 11 - Math.max(0, 36 - y), 'ex'); fill((x, y) => x >= 27 && x <= 31 && y >= 39 && y <= 47, 'ex'); for (const y of [41, 44]) for (let x = 27; x <= 31; x++) O(x, y, c => c && shade(c, 0.78)); }
  if (extra === 'Glasses') {
    for (const x0 of [15, 27]) for (let y = 20; y <= 25; y++) for (let x = x0; x <= x0 + 5; x++) {
      const edge = y === 20 || y === 25 || x === x0 || x === x0 + 5;
      if (edge) O(x, y, INK); else O(x, y, c => c && mix(c, LENS, 0.28));
    }
    for (const x of [21, 22, 23, 24, 25, 26]) O(x, 21, INK);
    O(16, 21, '#f4f8fb'); O(28, 21, '#f4f8fb'); O(13, 22, INK); O(14, 21, INK); O(33, 21, INK); O(34, 22, INK);
  }
  if (extra === 'Aviators') {
    // Teardrop lenses, mirrored purple, a double bridge in silver.
    for (const lx of [18.5, 28.5]) each((x, y) => {
      const dx = (x - lx) / 4.4, dy = (y - (y < 22 ? 21.6 : 22)) / (y < 22 ? 2.4 : 3.4);
      const r = dx * dx + dy * dy;
      if (r <= 1.25 && r > 0.9) O(x, y, AV_FRAME);
      else if (r <= 0.9) O(x, y, y <= 20 ? AVIATOR_L : y >= 24 ? AVIATOR_D : ((x + y) % 5 === 0 ? '#c9a8ff' : AVIATOR));
    });
    for (let x = 22; x <= 25; x++) { O(x, 19, AV_FRAME); O(x, 21, shade(AV_FRAME, 0.8)); }
    for (const [x, y] of [[13, 21], [12, 21], [34, 21], [35, 21]]) O(x, y, AV_FRAME);
  }
  if (extra === 'Pendant') { for (let i = 0; i < 5; i++) { O(19 + i, 37 + i, GOLD); O(28 - i, 37 + i, GOLD); } for (const [x, y] of [[23, 42], [24, 42], [23, 43], [24, 43]]) O(x, y, x === 23 && y === 42 ? '#fff0c8' : GOLD); }
  if (extra === 'Satchel') for (let i = 0; i < 12; i++) { O(33 - i, 36 + i, STRAP); O(34 - i, 36 + i, shade(STRAP, 1.3)); }
  if (extra === 'Pocket watch') { for (let x = 29; x <= 34; x++) O(x, 44 + (x % 2), GOLD); }
  if (extra === 'Small hoops') for (const ex0 of [12, 35]) for (const [dx, dy] of [[0, 27], [-1, 28], [1, 28], [0, 29]]) O(ex0 + dx, dy, dy === 29 ? shade(SILVER, 0.7) : SILVER);
  if (extra === 'Earrings') for (const ex0 of [12, 35]) { O(ex0, 27, SILVER); for (const [dx, dy] of [[-1, 29], [0, 29], [1, 29], [-1, 30], [0, 30], [1, 30], [-1, 31], [0, 31], [1, 31], [0, 32]]) O(ex0 + dx, dy, (dx + dy) % 2 ? SILVER : shade(SILVER, 0.75)); O(ex0, 28, shade(SILVER, 0.8)); }
  if (extra === 'Hair clips') for (const [x0, y0] of [[13, 13], [31, 11], [33, 15]]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) O(x0 + dx, y0 + dy, dx + dy === 0 ? shade(C.ex, 1.3) : C.ex);
  // v2.4: a cigarette at the corner of the mouth, and a shovel's handle over the shoulder.
  if (look.smoke) {
    for (let x = 26; x <= 31; x++) { O(x, 31 + (x > 29 ? 1 : 0), '#ece6da'); }
    O(32, 32, '#e0602e'); O(33, 32, '#f0a040');
    for (const [x, y] of [[33, 30], [34, 29], [34, 27], [35, 26], [35, 24], [34, 23]]) O(x, y, y % 2 ? '#8e8e98' : '#a8a8b2');
  }
  if (look.prop === 'shovel') { for (let i = 0; i < 14; i++) { P(38 + Math.round(i * 0.5), 47 - i, 'wood'); P(39 + Math.round(i * 0.5), 47 - i, 'wood'); } for (const [x, y] of [[43, 33], [44, 33], [45, 33], [46, 33], [43, 32], [46, 32], [43, 31], [44, 31], [45, 31], [46, 31]]) P(x, y, 'wood'); }
  if (opts.signature) {
    // The loupe on its cord, on your chest.
    for (let i = 0; i < 6; i++) O(20 - i, 37 + i, '#3a2a20');
    for (const [x, y] of [[13, 43], [14, 42], [15, 42], [16, 43], [16, 44], [15, 45], [14, 45], [13, 44]]) O(x, y, (x + y) % 2 ? GOLD : shade(GOLD, 0.72));
    O(14, 43, '#f4fbff'); O(15, 43, LENS); O(14, 44, LENS); O(15, 44, mix(LENS, INK, 0.35));
  }

  return compose(L, C.R, { band: 2, rim: true, outline: true });
}

export function portraitCanvas(look, opts = {}) { return hdCanvas(paintPortrait(look, opts)); }
