// Layered characters (Phase 12). A look is a small set of choices, each an index into a
// list (so saves stay tiny and the same look always draws the same way):
//   build, skin, hair, hairColor, face, facial, hat, hatColor, top, topColor,
//   bottom, bottomColor, extra, extraColor
// paintFigure() draws one 16x16 frame into a color grid, part by part, then adds the
// dark outline around the whole silhouette. bakeFigure() turns a look into the same
// { down, up, left, right } x 2 walk frames that bakePlayer() makes.

import { makeCanvas } from './sprites.js';

export const OUTLINE = '#07080c';
const SHOE = '#1c1614', EYE = '#141016', SHIRT = '#d8d0bc', LENS = '#9fc6d6', GOLD = '#e0a64a', STRAP = '#5a3b24';

export const SKINS = ['#c9a88a', '#f0d2b8', '#e3b994', '#d6a77e', '#b88f70', '#a07a5e', '#8a6248', '#6e4a36', '#573826', '#3f281c'];
export const HAIR_COLORS = ['#2a1e1a', '#0e0c0c', '#4a2e1c', '#6e4424', '#8a5a2e', '#b07a3e', '#d6b46a', '#9a3a22', '#7a7470', '#cfc8bc', '#3a4a6e', '#6a3a5e',
  // Phase 31c: silver, pastels and a few vivid dyes.
  '#c9ced6', '#e8a0b8', '#8ab8e8', '#2aa59a', '#7a3ad0', '#d8581e'];
// Cloth: the first few are the original appraiser's (hat felt, coat), then a noir range.
export const CLOTH = ['#23202a', '#4a4f63', '#3a3542', '#5a4a3a', '#2e3442', '#4a2a2e', '#3a4a3e', '#6a5a72', '#7a3a34', '#24474a', '#5a5f6e', '#8a7a5a',
  '#1e2a2a', '#4a4a2c', '#2a3a5a', '#7a6230', '#c9b98f', '#6e2e3e', '#16181e', '#a3843e',
  // Phase 20: a few brighter accents (bows, clips, sneakers) for people who don't dress noir.
  '#4e9a52', '#c95a8e', '#3d63b5', '#c8642e',
  // Phase 23b: a soft peach (Erin's halter).
  '#c98a6c',
  // Phase 29: Navy whites, service khaki, dress blue (Kristen's uniforms).
  '#e6e3da', '#b39a68', '#1b2236'];

export const EYE_COLORS = ['#3a2a1e', '#1c1a18', '#4a6a3a', '#3a5a7a', '#6a6a6e', '#7a5a2a',
  // Phase 29b: a clear green (Kristen's).
  '#4f9a5a'];

// Options are only ever added at the end of a list, so a stored index keeps its meaning.
export const PARTS = {
  pronouns: ['They/them', 'She/her', 'He/him'],
  build: ['Slim', 'Regular', 'Broad', 'Lean', 'Stocky', 'Heavyset', 'Athletic'],
  hair: ['Bald', 'Crop', 'Side part', 'Long', 'Bun', 'Curls', 'Mohawk', 'Bob', 'Slick back', 'Ponytail', 'Afro', 'Undercut', 'Braid', 'Streaked long', 'Shaggy', 'Waves', 'Pixie', 'Space buns', 'Pigtails', 'Dreadlocks', 'Top knot', 'Side shave', 'Bowl cut', 'Pompadour', 'Cornrows', 'Mullet'],
  face: ['Plain', 'Freckles', 'Tired eyes', 'Rosy'],
  facial: ['None', 'Stubble', 'Mustache', 'Beard', 'Goatee', 'Sideburns', 'Handlebar', 'Soul patch', 'Chinstrap'],
  hat: ['None', 'Fedora', 'Flat cap', 'Beanie', 'Bowler', 'Wide brim', 'Trilby', 'Beret', 'Hair bow', 'Top hat', 'Garrison cap', 'Sailor cap', 'Newsboy', 'Deerstalker', 'Cowboy hat', 'Bucket hat', 'Headscarf', 'Hood up', 'Veil', 'Pillbox', 'Gas mask', 'Bandana'],
  top: ['Trench coat', 'Jacket', 'Sweater', 'Vest', 'Hoodie', 'Overcoat', 'Suit jacket', 'Shirtsleeves', 'Tank top', 'Uniform shirt', 'Jumper', 'Dress', 'Poncho', 'Kimono robe', 'Cardigan', 'Apron', 'Lab coat', 'Cloak', 'Waistcoat', 'Leather jacket', 'Raincoat'],
  bottom: ['Trousers', 'Skirt', 'Work pants', 'Long skirt', 'Shorts', 'Jeans', 'Pleated skirt', 'Wide-leg trousers', 'Cargo pants', 'Overalls', 'Leggings'],
  extra: ['None', 'Scarf', 'Glasses', 'Pendant', 'Satchel', 'Gloves', 'Pocket watch', 'Hair clips', 'Earrings', 'Aviators', 'Small hoops'],
  // Phase 14: the finer details the bigger figure has room for.
  eyes: ['Round', 'Narrow', 'Hooded', 'Wide', 'Lashes', 'Almond', 'Downturned'],
  brows: ['Straight', 'Arched', 'Heavy', 'Thin', 'Furrowed', 'Bushy', 'Unibrow', 'Shaved'],
  mouth: ['Neutral', 'Smirk', 'Frown', 'Full', 'Grin', 'Smile', 'Soft smile'],
  mark: ['None', 'Brow scar', 'Cheek scar', 'Mole', 'Bandage', 'Burn scar', 'Birthmark', 'Stitched scar', 'Eye scar'],
  pattern: ['Plain', 'Pinstripe', 'Check', 'Patched', 'Stripes', 'Polka dots', 'Plaid', 'Floral', 'Embroidered trim'],
  neck: ['Open collar', 'Necktie', 'Bow tie', 'Turtleneck', 'Bandana'],
  // Phase 31c: extras only the portrait shows (and height, which stretches the whole figure).
  // Stored only when not 'None'/'Average', so nobody else's look changes.
  height: ['Average', 'Tall', 'Short', 'Very tall'],
  skinFx: ['None', 'Vitiligo', 'Sun-flushed', 'Pale and veined'],
  eyeFx: ['None', 'Eyeliner', 'Eyeshadow', 'Faint glow', 'Mismatched eyes', 'Eye patch'],
  makeup: ['None', 'Red lipstick', 'Plum lipstick', 'Dark lips', 'Blush', 'Face-paint stripe'],
  shoes: ['Default', 'Boots', 'Sneakers', 'Heels', 'Sandals', 'Wellingtons', 'Barefoot'],
  hairFx: ['None', 'Two-tone', 'Faded ends'],
  piercing: ['None', 'Nose stud', 'Septum ring', 'Brow ring', 'Lip ring', 'Ear cuffs'],
};
// The keys outside ALL_KEYS that are stored on a look only when set.
export const EXTRA_KEYS = ['skinFx', 'eyeFx', 'makeup', 'piercing', 'hairFx', 'shoes'];
// Which list each color choice comes from.
// Phase 31b: the faces a portrait can make. 'neutral' is the face as the creator draws it.
export const MOODS = ['neutral', 'happy', 'sad', 'annoyed', 'angry', 'upset', 'flirty', 'surprised', 'scared', 'embarrassed', 'smug', 'tired'];

export const COLOR_OF = { skin: SKINS, hairColor: HAIR_COLORS, hatColor: CLOTH, topColor: CLOTH, bottomColor: CLOTH, extraColor: CLOTH, eyeColor: EYE_COLORS, neckColor: CLOTH };
// The 14 choices every figure has had since Phase 12 (and what tells two people apart in a crowd)...
export const LOOK_KEYS = ['build', 'skin', 'hair', 'hairColor', 'face', 'facial', 'hat', 'hatColor', 'top', 'topColor', 'bottom', 'bottomColor', 'extra', 'extraColor'];
// ...and the Phase 14 details, which only the 24x32 figure and the portraits show.
export const DETAIL_KEYS = ['eyes', 'eyeColor', 'brows', 'mouth', 'mark', 'pattern', 'neck', 'neckColor'];
export const ALL_KEYS = [...LOOK_KEYS, ...DETAIL_KEYS];
const LIST_OF = { ...PARTS, ...COLOR_OF };
// How long each list was in Phase 12. Crowds are still drawn small (until Phase 15), so
// they only pick from these, and the small painter maps any newer choice to its nearest.
export const LEGACY_SIZE = { build: 3, skin: 10, hair: 8, hairColor: 12, face: 4, facial: 4, hat: 6, hatColor: 20, top: 6, topColor: 20, bottom: 3, bottomColor: 20, extra: 5, extraColor: 20 };
const LEGACY_MAP = { build: { 3: 0, 4: 2, 5: 2, 6: 1 }, hair: { 8: 2, 9: 1, 10: 5, 11: 1, 12: 3, 13: 3, 14: 7, 15: 3, 16: 1, 17: 3, 18: 7, 19: 5, 20: 3, 21: 1, 22: 7, 23: 2, 24: 1, 25: 7 }, hat: { 6: 1, 7: 3, 8: 0, 9: 4, 10: 2, 11: 3, 12: 1, 13: 1, 14: 5, 15: 4, 16: 3, 17: 3, 18: 0, 19: 3, 20: 0, 21: 3 }, facial: { 4: 1, 5: 1 }, top: { 6: 1, 7: 3, 8: 2, 9: 3, 10: 2, 11: 2, 12: 2, 13: 0, 14: 1, 15: 3, 16: 0, 17: 0, 18: 3, 19: 1, 20: 0 }, bottom: { 3: 1, 4: 0, 5: 0, 6: 1, 7: 0, 8: 2, 9: 2, 10: 0 }, extra: { 5: 0, 6: 3, 7: 0, 8: 0, 9: 2, 10: 0 } };
// How long each list was at the end of Phase 19. Seeded rolls (townsfolk, details) draw from
// these, so adding options (Phase 20 on) never changes anyone already in town.
export const ROLL_SIZE = { build: 3, hair: 13, hat: 8, top: 8, facial: 6, bottom: 4, extra: 7, eyes: 5, eyeColor: 6, brows: 5, mouth: 5, mark: 5, pattern: 4, neck: 5, neckColor: 20 };
const legacy = L => { const o = { ...L }; for (const [k, m] of Object.entries(LEGACY_MAP)) if (m[o[k]] != null) o[k] = m[o[k]]; return o; };

// The original appraiser, rebuilt from parts: fedora, trench coat, dark hair, a dark tie.
export const CLASSIC_LOOK = { build: 1, skin: 0, hair: 1, hairColor: 0, face: 0, facial: 0, hat: 1, hatColor: 0, top: 0, topColor: 1, bottom: 0, bottomColor: 4, extra: 0, extraColor: 7,
  eyes: 0, eyeColor: 0, brows: 0, mouth: 0, mark: 0, pattern: 0, neck: 1, neckColor: 5 };
const DETAIL_DEFAULT = { eyes: 0, eyeColor: 0, brows: 0, mouth: 0, mark: 0, pattern: 0, neck: 0, neckColor: 5 };

// Any stored look, made safe: every key present and in range. A look saved before
// Phase 14 gets plain details (and keeps everything it had).
export function cleanLook(look) {
  const out = {};
  for (const k of ALL_KEYS) {
    const fallback = k in DETAIL_DEFAULT ? DETAIL_DEFAULT[k] : CLASSIC_LOOK[k];
    const n = Number.isInteger(look?.[k]) ? look[k] : fallback;
    out[k] = Math.max(0, Math.min(LIST_OF[k].length - 1, n));
  }
  // height: 1 was always 'tall' (Dex); 2 short and 3 very tall came with Phase 31c.
  if (look?.height) out.height = Number.isInteger(look.height) && look.height >= 1 && look.height < PARTS.height.length ? look.height : 1;
  for (const k of EXTRA_KEYS) if (Number.isInteger(look?.[k]) && look[k] > 0 && look[k] < PARTS[k].length) out[k] = look[k];
  // Phase 31a: pronouns NPCs use for the player (0 they, 1 she, 2 he). Outside ALL_KEYS so painters ignore it.
  if (Number.isInteger(look?.pronouns) && look.pronouns > 0 && look.pronouns < PARTS.pronouns.length) out.pronouns = look.pronouns;
  // v2.4: a few touches for one-off characters (Mike, the Gravekeeper): a balding crown, a
  // round belly, a shorter frame, a cigarette, and a tool in hand. Outside the rolled keys.
  for (const k of ['balding', 'plump', 'short', 'smoke']) if (look?.[k]) out[k] = 1;
  if (look?.prop === 'shovel') out.prop = 'shovel';
  if (Number.isInteger(look?.beardColor) && look.beardColor >= 0 && look.beardColor < HAIR_COLORS.length) out.beardColor = look.beardColor;   // a beard its own color   // tall (outside the rolled keys, so nobody else's look changes)
  return out;
}

export const sameLook = (a, b) => ALL_KEYS.every(k => a[k] === b[k]);

// A random look from a random() in [0, 1). By default it picks the way Phase 12 did (the
// same draws, so everyone in town keeps their face); { full: true } uses every option.
export function randomLook(random = Math.random, { full = false } = {}) {
  const out = {};
  for (const k of LOOK_KEYS) out[k] = Math.floor(random() * (full ? LIST_OF[k].length : LEGACY_SIZE[k]));
  if (random() < 0.4) out.hat = 0;
  if (random() < 0.5) out.extra = 0;
  if (random() < 0.55) out.facial = 0;
  if (!full) return { ...out, ...DETAIL_DEFAULT };
  for (const k of DETAIL_KEYS) out[k] = Math.floor(random() * (ROLL_SIZE[k] ?? LIST_OF[k].length));
  if (random() < 0.6) out.mark = 0;
  if (random() < 0.5) out.pattern = 0;
  return out;
}

// What 'Surprise me' adds on top of randomLook({ full: true }): the Phase 31c extras, each set now and then.
export function randomExtras(random = Math.random) {
  const out = {};
  for (const k of EXTRA_KEYS) if (random() < 0.25) out[k] = 1 + Math.floor(random() * (PARTS[k].length - 1));
  if (random() < 0.2) out.height = 1 + Math.floor(random() * 3);
  return out;
}

// Lighter or darker by a factor (0.8 = 20% darker).
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

// ---------- painting ----------

export function paintFigure(lookIn, facing = 'down', frame = 0) {
  const L = legacy(cleanLook(lookIn));
  const g = Array.from({ length: 16 }, () => Array(16).fill(null));
  const px = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = c; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); };
  const side = facing === 'left' || facing === 'right', back = facing === 'up';

  const skin = SKINS[L.skin], skinD = shade(skin, 0.82);
  const hair = HAIR_COLORS[L.hairColor], hairD = shade(hair, 0.75), hairL = shade(hair, 1.25);
  const hat = CLOTH[L.hatColor], hatD = shade(hat, 0.72), hatL = shade(hat, 1.35);
  const top = CLOTH[L.topColor], topD = shade(top, 0.74), topL = shade(top, 1.3);
  const bot = CLOTH[L.bottomColor], botD = shade(bot, 0.75);
  const ex = CLOTH[L.extraColor], exD = shade(ex, 0.72);
  const hatName = PARTS.hat[L.hat], hairName = PARTS.hair[L.hair], topName = PARTS.top[L.top], botName = PARTS.bottom[L.bottom];
  const longCoat = topName === 'Trench coat' || topName === 'Overcoat';

  // Torso columns by build (front and back); the side view is a little narrower.
  const [x0, x1] = side ? [[6, 10], [5, 10], [5, 11]][L.build] : [[5, 10], [4, 11], [3, 12]][L.build];

  // --- legs and shoes (rows 13-14), two walk frames ---
  const legs = side ? (frame ? [[7, 8]] : [[5, 6], [9, 10]]) : (frame ? [[5, 6], [9, 10]] : [[4, 5], [10, 11]]);
  const legColor = botName === 'Skirt' ? skinD : bot;
  const paintLegs = () => {
    for (const [a, b] of legs) { rect(a, 13, b - a + 1, 1, legColor); rect(a, 14, b - a + 1, 1, SHOE); }
    if (botName === 'Skirt') rect(x0 + (side ? 0 : 1), 13, x1 - x0 + (side ? 1 : -1), 1, bot);
    if (botName === 'Work pants') for (const [a] of legs) px(a, 13, botD);
  };
  paintLegs();

  // --- torso and arms (rows 9-12; long coats reach row 13) ---
  const torsoBottom = longCoat ? 13 : 12;
  rect(x0, 9, x1 - x0 + 1, torsoBottom - 8, top);
  if (!side) {
    rect(x0, 10, 1, torsoBottom - 9, topD); rect(x1, 10, 1, torsoBottom - 9, topD);
    rect(x0 - 1, 9, 1, 3, topD); rect(x1 + 1, 9, 1, 3, topD);     // sleeves
    px(x0 - 1, 12, skin); px(x1 + 1, 12, skin);                     // hands
  } else {
    rect(7, 10, 2, 2, topD); px(8, 12, skin);                        // the near arm
  }
  // A long coat's hem hangs behind the legs: the trousers (or skirt) still show in front.
  if (longCoat) { paintLegs(); if (!side) { px(x0, 13, topD); px(x1, 13, topD); } }
  const mid = 7;   // the two center columns in front views are 7 and 8
  if (!back && !side) {
    if (topName === 'Trench coat') { rect(mid, 9, 2, 2, SHIRT); px(mid - 1, 9, topL); px(mid + 2, 9, topL); rect(x0, 11, x1 - x0 + 1, 1, topD); }
    if (topName === 'Jacket') { rect(mid, 9, 2, 3, SHIRT); px(mid - 1, 10, topD); px(mid + 2, 10, topD); }
    if (topName === 'Sweater') { rect(mid - 1, 9, 4, 1, topD); rect(x0, 11, x1 - x0 + 1, 1, topL); }
    if (topName === 'Vest') { rect(x0 - 1, 9, 1, 3, SHIRT); rect(x1 + 1, 9, 1, 3, SHIRT); rect(mid, 9, 2, 4, SHIRT); px(mid - 1, 11, topL); }
    if (topName === 'Hoodie') { rect(mid - 1, 9, 4, 1, topD); rect(mid - 1, 11, 4, 2, topD); px(mid, 10, SHIRT); px(mid + 1, 10, SHIRT); }
    if (topName === 'Overcoat') { for (const [x, y] of [[mid - 1, 10], [mid + 2, 10], [mid - 1, 12], [mid + 2, 12]]) px(x, y, topL); rect(mid, 9, 2, 1, SHIRT); }
  } else if (back) {
    if (topName === 'Trench coat') rect(x0, 11, x1 - x0 + 1, 1, topD);
    if (topName === 'Hoodie') rect(mid - 1, 9, 4, 2, topD);
    if (topName === 'Vest') { rect(x0 - 1, 9, 1, 3, SHIRT); rect(x1 + 1, 9, 1, 3, SHIRT); }
  } else {
    if (topName === 'Trench coat') { rect(x0, 11, x1 - x0 + 1, 1, topD); px(x1, 9, SHIRT); }
    if (topName === 'Jacket' || topName === 'Overcoat') px(x1, 9, SHIRT);
    if (topName === 'Hoodie') rect(x0, 9, 2, 1, topD);
  }

  // --- head (rows 3-8) ---
  if (side) { rect(6, 3, 4, 1, skin); rect(5, 4, 6, 5, skin); px(11, 6, skin); }
  else { rect(6, 3, 4, 1, skin); rect(5, 4, 6, 5, skin); px(5, 8, skinD); px(10, 8, skinD); }

  // --- face ---
  const faceName = PARTS.face[L.face], facialName = PARTS.facial[L.facial];
  if (!back) {
    const eyes = side ? [[9, 6]] : [[6, 6], [9, 6]];
    for (const [x, y] of eyes) px(x, y, EYE);
    if (faceName === 'Freckles') for (const [x, y] of (side ? [[9, 7], [10, 7]] : [[6, 7], [9, 7]])) px(x, y, shade(skin, 0.7));
    if (faceName === 'Tired eyes') for (const [x] of eyes) px(x, 7, shade(skin, 0.75));
    if (faceName === 'Rosy') for (const [x, y] of (side ? [[9, 7]] : [[5, 7], [10, 7]])) px(x, y, '#c46a5e');
    if (facialName === 'Stubble') { if (side) rect(8, 8, 3, 1, shade(skin, 0.7)); else rect(6, 8, 4, 1, shade(skin, 0.72)); }
    if (facialName === 'Mustache') { if (side) rect(10, 7, 2, 1, hair); else rect(6, 7, 4, 1, hair); }
    if (facialName === 'Beard') { if (side) { rect(7, 7, 4, 2, hair); px(11, 7, hair); } else { rect(5, 7, 1, 2, hair); rect(10, 7, 1, 2, hair); rect(6, 8, 4, 1, hair); rect(7, 7, 2, 1, hairD); } }
  }

  // --- hair ---
  const H = (x, y, w, h) => rect(x, y, w, h, hair);
  const covered = hatName !== 'None';   // a hat hides the top of the hair
  if (hairName !== 'Bald') {
    if (back) {
      const sides = { Crop: [3, 7], 'Side part': [3, 7], Long: [3, 10], Bun: [3, 7], Curls: [2, 8], Mohawk: null, Bob: [3, 8] }[hairName];
      if (sides) { H(5, sides[0] + (covered ? 2 : 0), 6, sides[1] - sides[0] + 1 - (covered ? 2 : 0)); if (sides[0] < 4 && !covered) H(6, 3, 4, 1); }
      if (hairName === 'Long' || hairName === 'Bob') { H(4, 5, 1, hairName === 'Long' ? 6 : 3); H(11, 5, 1, hairName === 'Long' ? 6 : 3); }
      if (hairName === 'Curls') { H(4, 4, 1, 4); H(11, 4, 1, 4); for (let y = 3; y < 8; y += 2) px(7, y, hairL); }
      if (hairName === 'Mohawk') { H(7, covered ? 4 : 1, 2, covered ? 4 : 7); }
      if (hairName === 'Bun' && !covered) { H(7, 1, 2, 2); }
      if (hairName === 'Side part') px(8, covered ? 6 : 4, hairD);
    } else if (side) {
      if (!covered) {
        if (hairName === 'Mohawk') H(6, 1, 3, 3);
        else { H(6, 3, 4, 1); H(5, 4, 5, 1); if (hairName === 'Curls') { H(5, 2, 5, 1); px(7, 3, hairL); } }
        if (hairName === 'Bun') { H(4, 3, 2, 2); }
        if (hairName === 'Side part') px(10, 4, hair);
      }
      if (hairName !== 'Mohawk') H(5, 5, 2, hairName === 'Long' ? 6 : hairName === 'Bob' ? 4 : 2);
      if (hairName === 'Long') H(4, 6, 1, 4);
    } else {
      if (!covered) {
        if (hairName === 'Mohawk') { H(7, 1, 2, 3); px(6, 3, hair); px(9, 3, hair); }
        else {
          H(6, 3, 4, 1); H(5, 4, 6, 1);
          if (hairName === 'Side part') { H(5, 5, 2, 1); px(9, 4, hairD); }
          if (hairName === 'Curls') { H(5, 2, 6, 1); H(4, 3, 1, 3); H(11, 3, 1, 3); px(7, 3, hairL); px(9, 4, hairL); }
          if (hairName === 'Bun') H(7, 1, 2, 2);
          if (hairName === 'Bob') { H(4, 4, 1, 4); H(11, 4, 1, 4); }
        }
      }
      if (hairName === 'Long') { H(4, 4, 1, 6); H(11, 4, 1, 6); }
      if (hairName === 'Bob' && covered) { H(4, 5, 1, 3); H(11, 5, 1, 3); }
      if (hairName === 'Curls' && covered) { H(4, 5, 1, 2); H(11, 5, 1, 2); }
    }
  }

  // --- hat ---
  if (hatName !== 'None') {
    const brim = (a, b, c = hat) => rect(a, 4, b - a + 1, 1, c);
    if (hatName === 'Fedora') { rect(6, 1, 4, 1, hat); rect(5, 2, 6, 1, hat); rect(5, 3, 6, 1, hatL); side ? brim(3, 12) : brim(3, 12); px(side ? 9 : 7, 1, hatD); }
    if (hatName === 'Flat cap') { rect(6, 2, 4, 1, hat); rect(5, 3, 6, 1, hat); side ? rect(8, 4, 5, 1, hatD) : (rect(5, 4, 6, 1, hatD), px(4, 4, hatD), px(11, 4, hatD)); }
    if (hatName === 'Beanie') { rect(6, 1, 4, 1, hat); rect(5, 2, 6, 2, hat); rect(5, 4, 6, 1, hatL); px(7, 2, hatD); px(9, 2, hatD); }
    if (hatName === 'Bowler') { rect(6, 1, 4, 1, hat); rect(5, 2, 6, 2, hat); rect(6, 2, 1, 1, hatL); brim(4, 11, hatD); }
    if (hatName === 'Wide brim') { rect(6, 2, 4, 1, hat); rect(6, 3, 4, 1, hatL); brim(2, 13); }
  }

  // --- extras ---
  const extraName = PARTS.extra[L.extra];
  if (extraName === 'Scarf') { if (side) rect(6, 9, 5, 1, ex); else { rect(x0, 9, x1 - x0 + 1, 1, ex); if (!back) { px(mid + 1, 10, exD); px(mid + 1, 11, ex); } } }
  if (extraName === 'Glasses' && !back) { if (side) { px(9, 6, LENS); px(10, 6, OUTLINE); px(8, 6, OUTLINE); } else { px(6, 6, LENS); px(9, 6, LENS); px(7, 6, OUTLINE); px(8, 6, OUTLINE); px(5, 6, OUTLINE); px(10, 6, OUTLINE); } }
  if (extraName === 'Pendant' && !back && !side) { px(mid, 10, GOLD); px(mid + 1, 10, GOLD); }
  if (extraName === 'Satchel') {
    if (side) { rect(5, 11, 2, 2, ex); px(5, 11, exD); }
    else if (back) { for (let i = 0; i < 4; i++) px(x0 + i, 9 + i, STRAP); rect(x1 - 1, 11, 2, 2, ex); px(x1 - 1, 11, exD); }
    else { for (let i = 0; i < 4; i++) px(x1 - i, 9 + i, STRAP); rect(x0, 11, 2, 2, ex); px(x0, 11, exD); }
  }

  // --- outline: every empty pixel touching the figure ---
  const out = g.map(r => [...r]);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (g[y][x]) continue;
    if ((g[y - 1]?.[x]) || (g[y + 1]?.[x]) || g[y][x - 1] || g[y][x + 1]) out[y][x] = OUTLINE;
  }
  if (facing === 'left') return out.map(r => r.reverse());
  return out;
}

export function gridCanvas(grid, scale = 1) {
  const cv = makeCanvas(16 * scale, 16 * scale), g = cv.getContext('2d');
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) { g.fillStyle = c; g.fillRect(x * scale, y * scale, scale, scale); } }));
  return cv;
}

export function bakeFigure(look) {
  const set = {};
  for (const f of ['down', 'up', 'left', 'right']) set[f] = [0, 1].map(fr => gridCanvas(paintFigure(look, f, fr)));
  return set;
}
