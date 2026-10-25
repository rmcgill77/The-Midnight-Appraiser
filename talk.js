// Conversations with choices (Phase 20). Anyone with a conversation in
// data/conversations.js can be talked to: what they say depends on how well they know
// you and what's happened between you, and what you pick can change things for good.
//
// A conversation is { start(ctx) -> node id, nodes: { id: node } }. A node:
//   say:     lines (strings, { who, text }, or a function of ctx returning them)
//   choices: [{ text, if?(ctx), effects?, next?, end? }]   next: a node id, or a
//            function of ctx returning one; no next ends the conversation
//   effects: applied when the node is reached (the same shape as a choice's)
//   after:   a node id to go to straight after the lines, without asking anything
// Effects: { rel, flag: { k: v }, cash, stress, heat, supplies: { k: n }, kit: { k: n },
//            research: { species, n }, rep: { faction: n }, met }
//
// Everything a person remembers lives in world.people[id] and goes into the save.

import { S } from '../rules/index.js';
import { fishingOf, BAIT } from './fishing.js';

// How well someone knows you.
export const TIERS = [
  { min: -Infinity, name: 'Wary', id: 'wary' },
  { min: 0, name: 'Stranger', id: 'stranger' },
  { min: 10, name: 'Acquaintance', id: 'acquaintance' },
  { min: 30, name: 'Friend', id: 'friend' },
  { min: 60, name: 'Close friend', id: 'close' },
];
export const REL_MIN = -30, REL_MAX = 100;
// Friendship builds a little at a time: at most this much in one day, per person.
export const DAILY_GAIN = 6;

export function tierOf(rel) {
  let t = TIERS[0];
  for (const x of TIERS) if (rel >= x.min) t = x;
  return t;
}
export const tierAtLeast = (rel, id) => rel >= TIERS.find(t => t.id === id).min;

export function peopleState(world) { return (world.people ??= {}); }
export function personOf(world, id) {
  const all = peopleState(world);
  const p = (all[id] ??= {});
  p.rel ??= 0; p.met ??= false; p.flags ??= {}; p.talks ??= 0; p.lastDay ??= null; p.gainDay ??= null; p.gained ??= 0;
  return p;
}

// What a conversation can look at: the person, the sim, the day, and some helpers.
export function makeCtx(world, st, id, extra = {}) {
  const p = personOf(world, id);
  return {
    id, world, st, p, day: st.day,
    get tier() { return tierOf(p.rel); },
    at: tid => tierAtLeast(p.rel, tid),
    flag: k => p.flags[k],
    today: k => p.flags[k] === st.day,
    player: st.player?.name && st.player.name !== 'Owner' ? st.player.name : null,
    ...extra,
  };
}

const resolve = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);
const lineList = (v, ctx) => [].concat(resolve(v, ctx) ?? []).filter(Boolean);

// The node's lines and the choices you can pick right now.
export function view(convo, nodeId, ctx) {
  const node = convo.nodes[nodeId];
  if (!node) return null;
  const choices = (node.choices ?? []).map((c, i) => ({ ...c, i })).filter(c => !c.if || c.if(ctx));
  return {
    id: nodeId, node,
    lines: lineList(node.say, ctx),
    choices: choices.map(c => ({ text: resolve(c.text, ctx), note: resolve(c.note, ctx) ?? null, tone: c.tone ?? null, i: c.i, log: c.log ?? null })),
    after: node.after ?? null,
  };
}

// Start talking: who you are to them decides where it opens.
export function begin(convo, ctx) {
  const id = ctx.entry && convo.nodes[ctx.entry] ? ctx.entry : resolve(convo.start, ctx);
  return enter(convo, id, ctx);
}

// Arrive at a node: its effects happen, and you get what to show.
export function enter(convo, nodeId, ctx) {
  const node = convo.nodes[nodeId];
  if (!node) return { view: null, notes: [] };
  const notes = node.effects ? apply(resolve(node.effects, ctx), ctx) : [];
  if (ctx.p) { if (ctx.p.lastDay !== ctx.day) ctx.p.talks += 1; ctx.p.lastDay = ctx.day; }
  return { view: view(convo, nodeId, ctx), notes };
}

// Pick a choice (by its index in the node's full list). Its effects happen; you get
// where the conversation goes next (null: it's over) and what changed.
export function choose(convo, nodeId, index, ctx) {
  const c = convo.nodes[nodeId]?.choices?.[index];
  if (!c || (c.if && !c.if(ctx))) return { next: null, notes: [] };
  const notes = c.effects ? apply(resolve(c.effects, ctx), ctx) : [];
  const next = resolve(c.next, ctx) ?? null;
  return { next, notes };
}

// ---------- effects ----------

// Friendship up (capped per day) or down (always), within bounds. Returns the change made.
export function addRel(ctx, n) {
  const p = ctx.p;
  if (!n) return 0;
  if (n > 0) {
    if (p.gainDay !== ctx.day) { p.gainDay = ctx.day; p.gained = 0; }
    n = Math.min(n, DAILY_GAIN - p.gained);
    if (n <= 0) return 0;
    p.gained += n;
  }
  const before = p.rel;
  p.rel = Math.max(REL_MIN, Math.min(REL_MAX, p.rel + n));
  return p.rel - before;
}

// Apply effects; returns short notices for what changed that you'd want to know.
export function apply(fx, ctx) {
  if (!fx) return [];
  const { st, p } = ctx, notes = [], name = ctx.name ?? ctx.id;
  if (fx.met && p) p.met = true;
  if (fx.flag && p) for (const [k, v] of Object.entries(fx.flag)) p.flags[k] = v === 'today' ? ctx.day : v;
  if (fx.rel && p) {
    const t0 = tierOf(p.rel);
    const d = addRel(ctx, fx.rel);
    const t1 = tierOf(p.rel);
    if (t1 !== t0) notes.push(d > 0 ? `${name} counts you as ${t1.id === 'close' ? 'a close friend' : t1.id === 'friend' ? 'a friend' : t1.id === 'acquaintance' ? 'an acquaintance' : 'a stranger'} now.` : `${name} has cooled on you.`);
  }
  if (fx.hours) { ctx.spend?.(fx.hours); notes.push(`${fx.hours} hours later…`); }
  if (fx.cash) { st.cash += fx.cash; notes.push(`${fx.cash > 0 ? '+' : '−'}${S.money(Math.abs(fx.cash))}`); }
  if (fx.stress) { const was = st.stress; st.stress = Math.max(0, Math.min(100, st.stress + fx.stress)); if (st.stress !== was) notes.push(fx.stress < 0 ? 'Your nerve steadies.' : 'That rattled you.'); }
  if (fx.heat) { const was = st.heat; st.heat = Math.max(0, Math.min(100, st.heat + fx.heat)); if (st.heat !== was) notes.push(`Heat ${fx.heat < 0 ? '−' : '+'}${Math.abs(st.heat - was)}`); }
  if (fx.supplies) for (const [k, n] of Object.entries(fx.supplies)) { st.supplies[k] = (st.supplies[k] ?? 0) + n; notes.push(`+${n} ${supplyName(k, n)}`); }
  if (fx.kit) for (const [k, n] of Object.entries(fx.kit)) { st.kit[k] = (st.kit[k] ?? 0) + n; notes.push(`+${n} ${kitName(k, n)}`); }
  // v2.4: bait for your tackle box (a fisherman's thanks).
  if (fx.bait && ctx.world) { const F = fishingOf(ctx.world); for (const [k, n] of Object.entries(fx.bait)) { F.bait[k] = (F.bait[k] ?? 0) + n; notes.push(`+${n} ${BAIT[k]?.name.toLowerCase() ?? k}`); } }
  // v2.4: anything else (a find for your bench, a mystery moving on): a function of ctx that
  // returns notices.
  if (typeof fx.run === 'function') notes.push(...[].concat(fx.run(ctx) ?? []));
  if (fx.rep) for (const [f, n] of Object.entries(fx.rep)) { if (f in st.rep) { st.rep[f] += n; notes.push(`${S.byId(S.DATA.factions, f)?.name ?? f} ${n > 0 ? '+' : ''}${n}`); } }
  if (fx.research) {
    const { species, n } = fx.research, b = st.bestiary?.[species];
    if (b) {
      const was = b.research;
      b.research = Math.min(100, b.research + n);
      if (b.research > was) notes.push(`Bestiary: ${S.byId(S.DATA.species, species)?.name ?? species} +${b.research - was}%`);
    }
  }
  return notes;
}

const SUPPLY = { vials: ['reagent vial', 'reagent vials'], salt: ['bag of salt', 'bags of salt'], scrap: ['scrap', 'scrap'], essence: ['essence', 'essence'] };
const KIT = { jar: ['jar', 'jars'], ward: ['ward', 'wards'], tincture: ['tincture', 'tinctures'], cell: ['flashlight cell', 'flashlight cells'] };
const supplyName = (k, n) => (SUPPLY[k] ?? [k, k])[n === 1 ? 0 : 1];
const kitName = (k, n) => (KIT[k] ?? [k, k])[n === 1 ? 0 : 1];

// Which of a list to say today: the same all day, a different one tomorrow.
export const pickToday = (list, ctx, salt = 0) => list[Math.abs((ctx.day * 7 + salt + (ctx.p?.talks ?? 0) * 3)) % list.length];
