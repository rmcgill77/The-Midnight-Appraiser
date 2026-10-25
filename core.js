'use strict';

/* ===================================================================== utils */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const money = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US');
const pad = n => String(n).padStart(4, '0');
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const byId = (list, id) => list.find(x => x.id === id);
const baseOf = it => byId(DATA.bases, it.baseId);
const prefixOf = it => byId(DATA.prefixes, it.prefixId);
const anomalyOf = it => byId(DATA.anomalies, it.hidden.anomalyId);
const zoneOf = id => byId(DATA.zones, id);
const toolOf = id => byId(DATA.tools, id);
const roundPrice = x => Math.max(1, x >= 20 ? Math.floor(x / 5) * 5 : Math.floor(x));
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const repLabel = v => DATA.repLabels.find(([max]) => v < max)?.[1] || 'Trusted';
const midName = n => n.replace(/^The /, 'the ');               // "Signed with the Faraday Circle"
const an = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;   // "an Unmarked Token", "a Mint Pen"
/* Bench time in minutes as text: 45m · 1h · 1h 30m */
const dur = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`; };
const orList = arr => arr.length < 3 ? arr.join(' or ') : arr.slice(0, -1).join(', ') + ' or ' + arr[arr.length - 1];

function mulberry32(a) {           // seeded RNG so any item can be rebuilt from its seed
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
/* ---------- seeded play (Phase 12e) ----------
   Every random roll in the game's rules comes from rnd(), never Math.random, so a run is
   fully decided by its seed and the player's choices. Each save has state.seed (a 32-bit
   number) and state.rngN (how many rolls the main stream has used).
   Shared content is drawn from keyed streams instead (RNG.within), so everyone playing the
   same seed meets the same customers, maps, market lots and nights on the same day, whatever
   they did in between: e.g. RNG.within(st, ['map', zone, day, n], () => ...).
   Only sound and screen effects (shake, flicker) still use Math.random. */
function hash32(...parts) {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    h ^= 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
  }
  return h >>> 0;
}
const RNG = {
  stream: null,     // a keyed stream, while RNG.within is running
  override: null,   // tests only: force every roll
  state: () => (typeof Game !== 'undefined' && Game.state) || null,
  within(st, keys, fn) {
    const prev = RNG.stream;
    RNG.stream = mulberry32(hash32(st && st.seed != null ? st.seed : Math.random() * 4294967296 >>> 0, ...keys));
    try { return fn(); } finally { RNG.stream = prev; }
  },
  newSeed: () => (Math.random() * 4294967296) >>> 0,
  /* Seed codes: 8 letters and digits (no 0/O/1/I), shown as XXXX-XXXX. */
  ABC: '23456789ABCDEFGHJKLMNPQRSTUVWXYZ',
  code(seed) {
    let n = seed >>> 0, s = '';
    for (let i = 0; i < 7; i++) { s = RNG.ABC[n % 32] + s; n = Math.floor(n / 32); }
    s = RNG.ABC[(hash32('chk', seed) % 32)] + s;   // the first letter is a check letter, so typos are caught
    return s.slice(0, 4) + '-' + s.slice(4);
  },
  parse(text) {
    const s = String(text || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (s.length !== 8 || [...s].some(ch => !RNG.ABC.includes(ch))) return null;
    let n = 0;
    for (const ch of s.slice(1)) n = n * 32 + RNG.ABC.indexOf(ch);
    if (n > 4294967295) return null;
    return RNG.code(n).replace('-', '') === s ? n >>> 0 : null;
  },
  /* The Daily run: one seed per calendar day, the same for everyone. */
  today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  dailySeed: date => hash32('ssp-daily', date)
};
function rnd() {
  if (RNG.override) return RNG.override();
  if (RNG.stream) return RNG.stream();
  const st = RNG.state();
  if (!st || st.seed == null) return Math.random();
  st.rngN = (st.rngN || 0) + 1;
  return hash32(st.seed, 'main', st.rngN) / 4294967296;
}
const randInt = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function weighted(rng, entries) { // entries: [[value, weight], ...]
  const total = entries.reduce((s, e) => s + e[1], 0);
  let r = rng() * total;
  for (const [v, w] of entries) { if ((r -= w) <= 0) return v; }
  return entries[entries.length - 1][0];
}
