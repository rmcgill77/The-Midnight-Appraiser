// The churchyard's rules (v2.5). Pure: data in data/cemetery.js, state in world.cemetery.
//
// Every grave has its fate fixed by the save's seed and where it is: rich (things worth
// having), empty, cursed (a cursed thing comes up with you) or angry (something comes up
// after you). The stone says which, most of the time: three times in four the epitaph is
// the true one; Mike's map (his ten-heart scene) makes them all true. A tomb in the Crypts
// holds a relic the first time.
//
// Digging is night work, with a spade, a few graves a week (the dead need their rest). It
// takes time and it's loud: the noise wakes the yard (game/attention.js), and when the yard
// is fully awake the chapel bell tolls by itself and the dead get up. Deeper sections pay
// better and wake faster.

import { CEMETERY, GEAR, RELICS, FIRST, LAST, LINES, FATES } from '../data/cemetery.js';

export const DIG = { minutes: 40, perWeek: 3, noise: { old: 30, lower: 38, crypts: 46 }, truth: 0.75 };
export const FATE_IDS = ['rich', 'empty', 'cursed', 'angry'];

export function cemeteryOf(world) {
  world.cemetery ??= { met: false, gear: {}, oil: 0, dug: {}, read: {}, week: null, digs: 0, relics: [], tolls: 0, mikeMap: false };
  return world.cemetery;
}
const h32 = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } h ^= h >>> 15; return (Math.imul(h, 0x2c1b3c6d) >>> 0) / 4294967296; };

export const sectionAt = ty => CEMETERY.sections.find(s => ty >= s.y0 && ty <= s.y1) ?? CEMETERY.sections[2];
export const graveKey = (tx, ty) => `${tx},${ty}`;
export const kindOf = ch => ({ 1: 'stone', 2: 'cross', 3: 'obelisk', M: 'tomb' }[ch] ?? null);
// The tombs, in order along the row: one relic each.
export function tombRelic(tx, ty) {
  const doors = [];
  CEMETERY.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'M') doors.push(`${x},${y}`); }));
  const i = doors.indexOf(graveKey(tx, ty));
  return i >= 0 ? RELICS[i % RELICS.length] : null;
}

export function fateOf(seed, tx, ty) {
  const sec = sectionAt(ty), w = FATES[sec.id];
  const ch = CEMETERY.rows[ty]?.[tx];
  if (ch === 'M') return 'rich';   // a tomb always has something (and the first time, a relic)
  let r = h32(`${seed}:grave:${tx},${ty}`) * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return FATE_IDS[i]; }
  return 'empty';
}
// The stone: { name, years, line, truthful }. truth: chance the line tells the truth.
export function epitaph(seed, tx, ty, { mikeMap = false } = {}) {
  const r = k => h32(`${seed}:epi:${tx},${ty}:${k}`);
  const fate = fateOf(seed, tx, ty);
  const truthful = mikeMap || r('t') < DIG.truth;
  const shown = truthful ? fate : FATE_IDS[Math.floor(r('f') * 4)];
  const born = 1820 + Math.floor(r('b') * 110), died = born + 8 + Math.floor(r('d') * 80);
  const name = `${FIRST[Math.floor(r('n') * FIRST.length)]} ${LAST[Math.floor(r('l') * LAST.length)]}`;
  const ch = CEMETERY.rows[ty]?.[tx];
  if (ch === 'M') return { name: `The ${LAST[Math.floor(r('l') * LAST.length)]} family`, years: `${born}–${died}`, line: 'Sealed. Let the family rest together.', truthful: true, hint: 'rich' };
  return { name, years: `${born}–${died}`, line: LINES[shown][Math.floor(r('x') * LINES[shown].length)], truthful, hint: shown };
}

// ---------- the week ----------
export const weekStartOf = (day, weekdayOf) => day - weekdayOf(day);
export function digsLeft(world, day, weekdayOf) {
  const C = cemeteryOf(world), cap = DIG.perWeek + (C.relics.includes('coin') ? 1 : 0);
  return C.week === weekStartOf(day, weekdayOf) ? Math.max(0, cap - C.digs) : cap;
}
// Why you can't dig here now, or null. ctx: { night, day, weekdayOf }
export function cantDig(world, tx, ty, ctx) {
  const C = cemeteryOf(world);
  if (!kindOf(CEMETERY.rows[ty]?.[tx])) return 'Nothing to dig here';
  if (!ctx.night) return 'Not in daylight. Not with Mike watching.';
  if (!C.gear.shovel) return 'You’d need a spade. Mike sells them.';
  if (C.dug[graveKey(tx, ty)] != null) return 'Already turned over. Whatever was here is gone.';
  if (digsLeft(world, ctx.day, ctx.weekdayOf) <= 0) return 'Enough for one week. The yard needs to settle.';
  return null;
}
// Dig. Returns { fate, section, items: [odds…], cash, relic, angry, stress, noise, text }.
// The caller makes the items (the original's Items.generate) and spawns anything angry.
export function dig(world, seed, tx, ty, ctx) {
  const C = cemeteryOf(world), sec = sectionAt(ty), key = graveKey(tx, ty), ch = CEMETERY.rows[ty][tx];
  const wk = weekStartOf(ctx.day, ctx.weekdayOf);
  if (C.week !== wk) { C.week = wk; C.digs = 0; }
  C.digs += 1; C.dug[key] = ctx.day;
  const fate = fateOf(seed, tx, ty), depth = sec.depth, r = k => h32(`${seed}:dig:${key}:${k}`);
  const out = { fate, section: sec.id, items: [], cash: 0, relic: null, angry: false, stress: 0, noise: DIG.noise[sec.id] };
  if (fate === 'rich') {
    const n = depth >= 3 ? 2 : 1;
    for (let i = 0; i < n; i++) out.items.push(depth >= 2 ? { inert: 20, enchanted: 65, cursed: 15 } : { inert: 50, enchanted: 40, cursed: 10 });
    out.cash = Math.round((10 + r('c') * 30) * depth);
    if (ch === 'M') {
      const relic = tombRelic(tx, ty);
      if (relic && !C.relics.includes(relic.id)) { C.relics.push(relic.id); out.relic = relic; }
    }
    out.text = ch === 'M' ? 'The tomb door gives with a groan. Inside, on a stone shelf, the family kept their treasures.' : TEXTS.rich[Math.floor(r('t') * TEXTS.rich.length)];
  } else if (fate === 'empty') {
    out.text = TEXTS.empty[Math.floor(r('t') * TEXTS.empty.length)];
  } else if (fate === 'cursed') {
    out.items.push({ inert: 0, enchanted: 0, cursed: 100 }); out.stress = 6 + depth * 2;
    out.text = TEXTS.cursed[Math.floor(r('t') * TEXTS.cursed.length)];
  } else {
    out.angry = true; out.stress = 8 + depth * 2;
    if (r('i') < 0.5) out.items.push({ inert: 30, enchanted: 40, cursed: 30 });
    out.text = TEXTS.angry[Math.floor(r('t') * TEXTS.angry.length)];
  }
  return out;
}
const TEXTS = {
  rich: ['Under the lid: a velvet bag, still knotted. Whoever buried this wanted it kept.', 'Bones, a good suit, and in the breast pocket something nobody thought to take back.', 'A tin box at the foot of the coffin, sealed with wax. It rattles.', 'Rings on every finger. You apologize out loud as you take them.'],
  empty: ['Bones and a button. Nothing else. You put the earth back and feel foolish.', 'The coffin is empty. Not robbed: empty. Just a pillow with a dent in it.', 'Mud, roots and an old boot. Whoever this was, they went light.', 'A rusted cross on a chain. Worthless. You leave it where it was.'],
  cursed: ['Something wrapped in black cloth, cold through your gloves. You know what it is before you look.', 'A box nailed shut, with a warning burned into the lid. Your hands open it anyway.', 'It was in the dead man’s hands. They didn’t want to let go.'],
  angry: ['The coffin lid is already open. From the inside.', 'The earth gives way under you, and something underneath it breathes out.', 'A hand closes round your ankle, then lets go. Behind you, the ground shifts.'],
};

// Buying from Mike's shed. Returns why not, or null. hearts: Mike's hearts.
export function cantBuy(world, id, cash, hearts) {
  const g = GEAR[id], C = cemeteryOf(world);
  if (!g) return 'Not for sale';
  if (g.once && C.gear[id]) return 'You have it';
  if (g.need === 'met' && !C.met) return 'Talk to Mike first';
  if (typeof g.need === 'number' && hearts < g.need) return `Mike doesn’t trust you that far yet (${g.need} hearts)`;
  if (cash < g.price) return 'Not enough cash';
  return null;
}
export function buy(world, id) {
  const C = cemeteryOf(world), g = GEAR[id];
  if (id === 'oil') C.oil += 1; else C.gear[id] = true;
  return g.price;
}
// A locked section gate: which key it needs, or null if you can pass.
export function gateLock(world, ty) {
  const gt = CEMETERY.gates.find(g => g.ty === ty);
  if (!gt) return null;
  return cemeteryOf(world).gear[gt.key] ? null : gt.key;
}
