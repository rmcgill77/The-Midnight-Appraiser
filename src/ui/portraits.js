// Portraits in the interface (Phase 14): the 48x48 busts from engine/figure-hd.js, for
// the speech strip, the creator, and anyone with a name and a face in a panel. Painted
// once per look and copied into a fresh <canvas> wherever one's needed.

import { artImage, drawPortraitArt } from '../engine/art.js';
import { paintPortrait, PORTRAIT_SIZE } from '../engine/figure-hd.js';
import { ALL_KEYS } from '../engine/figure.js';
import { SIGNATURE, nameOfLook } from '../game/people.js';

const cache = new Map();
let player = null;   // { name, look }

const keyOf = (look, sig, mood) => ALL_KEYS.map(k => look[k] ?? '').join('.') + (sig ? '*' : '') + (mood && mood !== 'neutral' ? `:${mood}` : '');

function grid(look, sig, mood) {
  const k = keyOf(look, sig, mood);
  let g = cache.get(k);
  if (!g) { g = paintPortrait(look, { signature: sig, mood }); cache.set(k, g); if (cache.size > 64) cache.delete(cache.keys().next().value); }
  return g;
}

// Phase 22: faces for people who are only passing through (a street musician, a stranger
// in the diner), registered while they're around.
const passing = new Map();
export function setPassingLook(who, look) { if (look) passing.set(who, look); else passing.delete(who); }

// Who's who: the player (by name, or 'you'), or a signature character.
export function setPlayerPortrait(name, look) { player = look ? { name: name || null, look } : null; }
export function lookOf(who) {
  if (!who) return null;
  if (player && (who === 'you' || who === player.name)) return { look: player.look, sig: true };
  if (SIGNATURE[who]) return { look: SIGNATURE[who], sig: false };
  if (passing.has(who)) return { look: passing.get(who), sig: false };
  return null;
}

// A <canvas> with the portrait painted on it, sized by CSS.
export function portraitCanvas(look, { signature = false, cls = 'portrait', label = '', mood = null } = {}) {
  const cv = document.createElement('canvas');
  cv.width = PORTRAIT_SIZE; cv.height = PORTRAIT_SIZE; cv.className = cls;
  if (label) { cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label); } else cv.setAttribute('aria-hidden', 'true');
  paintInto(cv, look, signature, mood);
  return cv;
}

export function paintInto(cv, look, signature = false, mood = null) {
  // v2.1: a named character with a hand-made portrait (data/art.js) uses it.
  const art = artImage(`portraits/${nameOfLook(look) ?? ''}`);
  if (art) return drawPortraitArt(cv, art);
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  grid(look, signature, mood).forEach((row, y) => row.forEach((c, x) => { if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } }));
}

export function portraitFor(who, opts = {}) {
  const l = lookOf(who);
  return l ? portraitCanvas(l.look, { signature: l.sig, ...opts }) : null;
}

// A speech line with the speaker's face beside it (or just the line, for a face we don't have).
export function faceRow(look, name, line) {
  if (!look) return line;
  const row = document.createElement('div');
  row.className = 'who-row';
  row.append(portraitCanvas(look, { label: name || '' }), line);
  return row;
}
