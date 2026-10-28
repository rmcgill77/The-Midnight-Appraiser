// Everyone's face (Phase 13). Every person in town is built from the same parts as the
// character creator, seeded by who they are, so the same customer looks the same every
// time they come in, and no two people in the same place ever match. The people who
// matter (Mina, Inspector Vance, the shopkeepers in town) have hand-picked looks.
// Phase 15: everyone is drawn at 24x32 and has the finer details too (eyes, brows, mouth,
// marks, neckwear, patterns), rolled from a second seed so their old look underneath stays.

import { artImage, SheetSprites } from '../engine/art.js';
import { randomLook, cleanLook, ALL_KEYS, LEGACY_SIZE, PARTS, COLOR_OF, ROLL_SIZE } from '../engine/figure.js';
import { HDSprites } from '../engine/figure-hd.js';

export function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Faction members dress the part most of the time (cloth indexes from figure.js CLOTH).
const FACTION_COLORS = {
  techmage: [9, 12, 2],      // the Faraday Circle: teal and slate
  corporate: [18, 0, 4],     // Halberd & Vane: black and charcoal
  hunters: [13, 6, 3],       // the Night Shift: olive and brown
  office: [10, 1, 5],        // the Office: civil-service grey
};

// Hand-picked looks for the people who matter.
export const SIGNATURE = {
  Mina: { build: 0, skin: 4, hair: 7, hairColor: 2, face: 1, facial: 0, hat: 3, hatColor: 15, top: 1, topColor: 6, bottom: 0, bottomColor: 4, extra: 0, extraColor: 0, eyes: 0, eyeColor: 0, brows: 1, mouth: 1, mark: 0, pattern: 0, neck: 0, neckColor: 5 },
  'Inspector Vance': { build: 1, skin: 1, hair: 1, hairColor: 8, face: 2, facial: 2, hat: 4, hatColor: 2, top: 5, topColor: 10, bottom: 0, bottomColor: 18, extra: 2, extraColor: 0, eyes: 1, eyeColor: 4, brows: 4, mouth: 2, mark: 0, pattern: 1, neck: 1, neckColor: 18 },
  'Mrs. Kowalski': { build: 2, skin: 2, hair: 4, hairColor: 9, face: 3, facial: 0, hat: 0, hatColor: 0, top: 2, topColor: 7, bottom: 1, bottomColor: 3, extra: 2, extraColor: 0, eyes: 2, eyeColor: 3, brows: 1, mouth: 0, mark: 3, pattern: 2, neck: 0, neckColor: 5 },
  'Ray Delgado': { build: 2, skin: 6, hair: 1, hairColor: 1, face: 0, facial: 2, hat: 2, hatColor: 2, top: 1, topColor: 14, bottom: 2, bottomColor: 4, extra: 0, extraColor: 0, eyes: 0, eyeColor: 0, brows: 2, mouth: 4, mark: 4, pattern: 3, neck: 4, neckColor: 8 },
  'Ms. Achterberg': { build: 0, skin: 0, hair: 3, hairColor: 8, face: 0, facial: 0, hat: 0, hatColor: 0, top: 2, topColor: 16, bottom: 1, bottomColor: 5, extra: 2, extraColor: 0, eyes: 4, eyeColor: 2, brows: 3, mouth: 0, mark: 0, pattern: 0, neck: 3, neckColor: 12 },
  'Professor Okoye': { build: 1, skin: 8, hair: 5, hairColor: 1, face: 0, facial: 3, hat: 0, hatColor: 0, top: 1, topColor: 9, bottom: 0, bottomColor: 12, extra: 2, extraColor: 0, eyes: 3, eyeColor: 1, brows: 2, mouth: 3, mark: 0, pattern: 2, neck: 2, neckColor: 15 },
  'Mr. Pryce': { build: 1, skin: 1, hair: 8, hairColor: 0, face: 0, facial: 0, hat: 0, hatColor: 0, top: 6, topColor: 18, bottom: 0, bottomColor: 18, extra: 3, extraColor: 0, eyes: 1, eyeColor: 4, brows: 0, mouth: 1, mark: 0, pattern: 1, neck: 1, neckColor: 17 },
  'Captain Rourke': { build: 2, skin: 2, hair: 1, hairColor: 7, face: 3, facial: 3, hat: 2, hatColor: 13, top: 4, topColor: 13, bottom: 2, bottomColor: 3, extra: 0, extraColor: 0, eyes: 2, eyeColor: 0, brows: 2, mouth: 2, mark: 2, pattern: 0, neck: 3, neckColor: 13 },
  'Clerk Dunmore': { build: 1, skin: 5, hair: 0, hairColor: 0, face: 2, facial: 2, hat: 0, hatColor: 0, top: 3, topColor: 10, bottom: 0, bottomColor: 2, extra: 2, extraColor: 0, eyes: 2, eyeColor: 4, brows: 3, mouth: 0, mark: 0, pattern: 0, neck: 1, neckColor: 10 },
  // Phase 20: the first custom townsperson, drawn from a tester's own avatar.
  Morgan: { build: 0, skin: 1, hair: 13, hairColor: 1, face: 3, facial: 0, hat: 8, hatColor: 20, top: 8, topColor: 18, bottom: 0, bottomColor: 0, extra: 7, extraColor: 21, eyes: 4, eyeColor: 3, brows: 1, mouth: 5, mark: 0, pattern: 0, neck: 0, neckColor: 5 },
  // Phase 24: six more testers, regulars at the Brass Lantern until they're given jobs.
  Dex: { build: 1, skin: 2, hair: 14, hairColor: 1, face: 0, facial: 1, hat: 0, hatColor: 0, top: 4, topColor: 14, bottom: 2, bottomColor: 0, extra: 0, extraColor: 0, eyes: 2, eyeColor: 1, brows: 2, mouth: 1, mark: 0, pattern: 0, neck: 0, neckColor: 5, height: 1 },
  Pablo: { build: 2, skin: 5, hair: 1, hairColor: 1, face: 0, facial: 2, hat: 0, hatColor: 0, top: 1, topColor: 8, bottom: 2, bottomColor: 4, extra: 0, extraColor: 0, eyes: 0, eyeColor: 0, brows: 2, mouth: 5, mark: 0, pattern: 3, neck: 4, neckColor: 9 },
  Jackson: { build: 1, skin: 0, hair: 1, hairColor: 6, face: 1, facial: 1, hat: 3, hatColor: 8, top: 4, topColor: 13, bottom: 0, bottomColor: 2, extra: 4, extraColor: 3, eyes: 1, eyeColor: 2, brows: 0, mouth: 1, mark: 0, pattern: 0, neck: 0, neckColor: 5 },
  Stuart: { build: 1, skin: 1, hair: 8, hairColor: 1, face: 2, facial: 4, hat: 0, hatColor: 0, top: 0, topColor: 18, bottom: 0, bottomColor: 18, extra: 3, extraColor: 0, eyes: 2, eyeColor: 4, brows: 4, mouth: 0, mark: 1, pattern: 0, neck: 3, neckColor: 18 },
  Jade: { build: 0, skin: 2, hair: 3, hairColor: 3, face: 3, facial: 0, hat: 0, hatColor: 0, top: 2, topColor: 16, bottom: 1, bottomColor: 4, extra: 3, extraColor: 0, eyes: 4, eyeColor: 0, brows: 1, mouth: 5, mark: 0, pattern: 0, neck: 0, neckColor: 5 },
  Erin: { build: 0, skin: 1, hair: 15, hairColor: 2, face: 3, facial: 0, hat: 0, hatColor: 0, top: 8, topColor: 24, bottom: 0, bottomColor: 2, extra: 8, extraColor: 0, eyes: 0, eyeColor: 0, brows: 0, mouth: 5, mark: 0, pattern: 0, neck: 3, neckColor: 24 },
  // Phase 26: Ryan, The Mystic Magician (from a reference photo): beard its own color, aviators.
  Ryan: { build: 2, skin: 2, hair: 8, hairColor: 0, face: 0, facial: 3, hat: 9, hatColor: 18, top: 6, topColor: 7, bottom: 0, bottomColor: 0, extra: 9, extraColor: 0, eyes: 0, eyeColor: 0, brows: 2, mouth: 1, mark: 0, pattern: 0, neck: 2, neckColor: 18, beardColor: 4 },
  // Phase 29: Kristen, Navy Corpsman (from a reference photo): service khakis, garrison cap worn high, hair in a bun, slim, green eyes.
  Kristen: { build: 0, skin: 1, hair: 4, hairColor: 2, face: 3, facial: 0, hat: 10, hatColor: 18, top: 9, topColor: 26, bottom: 0, bottomColor: 18, extra: 10, extraColor: 0, eyes: 4, eyeColor: 6, brows: 3, mouth: 6, mark: 0, pattern: 0, neck: 0, neckColor: 18 },
  // The barkeep at the Brass Lantern: a bow tie, a vest, a mustache he's proud of.
  Lou: { build: 2, skin: 6, hair: 8, hairColor: 8, face: 2, facial: 2, hat: 0, hatColor: 0, top: 3, topColor: 17, bottom: 0, bottomColor: 18, extra: 0, extraColor: 0, eyes: 2, eyeColor: 0, brows: 2, mouth: 1, mark: 0, pattern: 1, neck: 2, neckColor: 18 },
  // Phase 21: the people behind the counters of the new places.
  Dot: { build: 1, skin: 3, hair: 4, hairColor: 7, face: 1, facial: 0, hat: 0, hatColor: 0, top: 7, topColor: 9, bottom: 1, bottomColor: 16, extra: 3, extraColor: 0, eyes: 3, eyeColor: 2, brows: 1, mouth: 4, mark: 0, pattern: 0, neck: 0, neckColor: 5 },
  Teddy: { build: 0, skin: 7, hair: 2, hairColor: 0, face: 0, facial: 0, hat: 2, hatColor: 8, top: 6, topColor: 8, bottom: 0, bottomColor: 18, extra: 0, extraColor: 0, eyes: 3, eyeColor: 0, brows: 0, mouth: 1, mark: 0, pattern: 0, neck: 2, neckColor: 18 },
  Rose: { build: 2, skin: 0, hair: 5, hairColor: 9, face: 3, facial: 0, hat: 0, hatColor: 0, top: 2, topColor: 7, bottom: 3, bottomColor: 13, extra: 2, extraColor: 0, eyes: 0, eyeColor: 4, brows: 1, mouth: 4, mark: 3, pattern: 2, neck: 4, neckColor: 21 },
  Abernathy: { build: 1, skin: 5, hair: 0, hairColor: 8, face: 2, facial: 3, hat: 0, hatColor: 0, top: 5, topColor: 18, bottom: 0, bottomColor: 18, extra: 0, extraColor: 0, eyes: 2, eyeColor: 4, brows: 2, mouth: 0, mark: 0, pattern: 0, neck: 3, neckColor: 18 },
  // v2.4: Kip, the fisherman (look C, approved): wiry, gray mustache, flat cap, rolled
  // shirtsleeves under a patched vest.
  Kip: { build: 0, skin: 5, hair: 1, hairColor: 8, face: 2, facial: 2, hat: 2, hatColor: 13, top: 3, topColor: 6, bottom: 2, bottomColor: 3, extra: 0, extraColor: 0, eyes: 1, eyeColor: 4, brows: 4, mouth: 0, mark: 1, pattern: 3, neck: 4, neckColor: 8, height: 1 },
  // v2.5: Mike, the Gravekeeper (look A, the work coat, approved): short, very plump, a big
  // white beard, balding, a cigarette always lit, a spade in hand.
  Mike: { build: 2, skin: 1, hair: 1, hairColor: 9, face: 3, facial: 3, hat: 0, hatColor: 0, top: 1, topColor: 3, bottom: 2, bottomColor: 13, extra: 5, extraColor: 11, eyes: 2, eyeColor: 3, brows: 2, mouth: 1, mark: 0, pattern: 3, neck: 0, neckColor: 5, balding: 1, plump: 1, short: 1, smoke: 1, prop: 'shovel' },
  'Tarp Sal': { build: 1, skin: 7, hair: 3, hairColor: 0, face: 0, facial: 3, hat: 5, hatColor: 11, top: 0, topColor: 3, bottom: 2, bottomColor: 4, extra: 1, extraColor: 8, eyes: 1, eyeColor: 5, brows: 4, mouth: 4, mark: 1, pattern: 3, neck: 0, neckColor: 5 },
};

// Phase 29: off duty. Ryan performs in the top hat and plum jacket; shopping, or at lunch with
// Erin, he's in the royal blue shirt from his photo.
export const OFF_DUTY = {
  Ryan: { build: 2, skin: 2, hair: 8, hairColor: 0, beardColor: 4, face: 0, facial: 3, hat: 0, hatColor: 18, top: 2, topColor: 22, bottom: 0, bottomColor: 0, extra: 9, extraColor: 0, eyes: 0, eyeColor: 0, brows: 2, mouth: 1, mark: 0, pattern: 0, neck: 0, neckColor: 5 },
};
export const offDutyLook = name => cleanLook(OFF_DUTY[name] ?? SIGNATURE[name]);

// v2.1: whose look this is, for hand-made art: a signature character's name, or
// "Name (off duty)" for an off-duty look. null for everyone else.
let NAMES = null;
export function nameOfLook(look) {
  if (!look) return null;
  if (!NAMES) {
    NAMES = new Map();
    for (const [n, l] of Object.entries(SIGNATURE)) { NAMES.set(lookKey(l), n); NAMES.set(lookKey(cleanLook(l)), n); }
    for (const [n, l] of Object.entries(OFF_DUTY)) { NAMES.set(lookKey(l), `${n} (off duty)`); NAMES.set(lookKey(cleanLook(l)), `${n} (off duty)`); }
  }
  return NAMES.get(lookKey(look)) ?? null;
}

export const lookKey = l => ALL_KEYS.map(k => l[k] ?? 0).join('.') + (l.height ? '.T' : '') + (l.beardColor != null ? `.B${l.beardColor}` : '') + ['balding', 'plump', 'short', 'smoke', 'prop'].filter(k => l[k]).map(k => `.${k}`).join('');
const SIGNATURE_KEYS = new Set([...Object.values(SIGNATURE), ...Object.values(OFF_DUTY)].map(lookKey));
const SIZES = Object.fromEntries(Object.entries({ ...PARTS, ...COLOR_OF }).map(([k, v]) => [k, v.length]));

// The look for a person: their signature, or one built from their name.
export function lookFor(id, { faction = null } = {}) {
  if (SIGNATURE[id]) return cleanLook(SIGNATURE[id]);
  const r = seeded(hash(String(id)));
  const look = randomLook(r);
  const colors = FACTION_COLORS[faction];
  if (colors && r() < 0.8) look.topColor = colors[Math.floor(r() * colors.length)];
  if (colors && look.hat && r() < 0.6) look.hatColor = colors[Math.floor(r() * colors.length)];
  // The details, from a second roll: the same person keeps the same face underneath.
  const d = seeded(hash(`${id}:details`));
  const full = randomLook(d, { full: true });
  for (const k of ['eyes', 'eyeColor', 'brows', 'mouth', 'mark', 'pattern', 'neck', 'neckColor']) look[k] = full[k];
  // Now and then, one of the newer hairstyles, hats, tops or accessories.
  for (const k of ['hair', 'hat', 'top', 'facial', 'bottom', 'extra']) {
    const n = ROLL_SIZE[k] ?? PARTS[k].length, old = LEGACY_SIZE[k];
    if (n > old && d() < (n - old) / n) look[k] = old + Math.floor(d() * (n - old));
  }
  if (look.hat && d() < 0.4) look.hat = 0;   // keep plenty of bare heads
  return cleanLook(look);
}

// Nudge a look until it matches nobody in `taken` (a Set of lookKeys) and no signature.
// Small, visible changes first: the top color, then hair color, then the hat.
const NUDGE = ['topColor', 'hairColor', 'hatColor', 'hair', 'bottomColor', 'neck', 'top', 'hat', 'extra', 'facial', 'mouth'];
export function distinct(look, taken, keepSignature = false) {
  const out = { ...look };
  const bad = l => taken.has(lookKey(l)) || (!keepSignature && SIGNATURE_KEYS.has(lookKey(l)));
  for (let i = 0; bad(out) && i < 400; i++) {
    const k = NUDGE[i % NUDGE.length];
    out[k] = (out[k] + 1 + Math.floor(i / NUDGE.length)) % SIZES[k];
  }
  return out;
}

// Sprite sets, shared by everyone who looks the same (nobody, by design) and kept for a
// while. Frames are painted the first time they're drawn (engine/figure-hd.js), so a
// set costs nothing until someone is on screen.
const cache = new Map();
const CACHE_MAX = 360;
export function spritesFor(look) {
  if (typeof document === 'undefined' && !globalThis.OffscreenCanvas) return null;
  const k = lookKey(look);
  let s = cache.get(k);
  if (s) { cache.delete(k); cache.set(k, s); return s; }
  s = new HDSprites(look);
  // v2.1: a named character with a hand-made sheet (data/art.js) uses it.
  const sheet = artImage(`characters/${nameOfLook(look) ?? ''}`);
  if (sheet) s = new SheetSprites(sheet, s);
  cache.set(k, s);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return s;
}
export const cacheSize = () => cache.size;

// Dress someone for a scene: their own look, made distinct from everyone already there.
export function dress(id, taken, opts = {}) {
  if (opts.offDuty && OFF_DUTY[id]) { const look = offDutyLook(id), key = lookKey(look); taken.add(key); return { look, key, sprites: spritesFor(look) }; }
  const base = lookFor(id, opts);
  const look = SIGNATURE[id] ? base : distinct(base, taken);
  const key = lookKey(look);
  taken.add(key);
  return { look, key, sprites: spritesFor(look) };
}
