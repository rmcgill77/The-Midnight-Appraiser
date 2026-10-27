// The bench, explained (Phase 17). Nothing here changes the original's lab rules: it reads
// them to answer the questions players kept asking at the bench.
//   What could this still be?          board(st, it)
//   Which test should I run next?      bestTool(st, it)
//   What does that reading mean?       resultWords(st, it, toolId, before)
//   Is it settled? What do I do now?   advice(st, it)

import { S } from '../rules/index.js';

const { DATA } = S;
export const ALIGN_ORDER = ['inert', 'enchanted', 'cursed'];

// Plain words for each instrument: what it does, and what its readings look like.
export const TOOL_HELP = {
  emf: { icon: 'emf', what: 'Measures the field around it. Anything with real power in it pushes the needle.', short: 'field strength' },
  uv: { icon: 'uv', what: 'Shows marks you can’t see in normal light: handprints, sigils, script.', short: 'hidden marks' },
  reagent: { icon: 'flask', what: 'A drop of reagent. How it reacts says what it’s made of. Uses one vial.', short: 'chemical reaction' },
  spirit: { icon: 'radio', what: 'Listens for what it’s built around: the trait factions pay for.', short: 'main trait' },
};

// How often a single test gives a sure reading, in words.
export function accuracyWords(p) {
  if (p >= 0.95) return 'Always sure';
  if (p >= 0.78) return 'Usually sure';
  if (p >= 0.5) return 'Sure about half the time';
  if (p >= 0.3) return 'Often unsure';
  return 'Rarely sure';
}

const short = (toolId, v) => (v == null ? '?' : DATA.short[toolId]?.[v] ?? v);
export const valueWords = (toolId, v) => (v == null ? 'unknown (torn page)' : DATA.clues[toolId]?.[v] ?? v);

export function alignCounts(list) {
  const c = { inert: 0, enchanted: 0, cursed: 0 };
  for (const a of list) c[a.alignment] = (c[a.alignment] || 0) + 1;
  return c;
}

// The one alignment everything left agrees on, or null.
export function settledAlignment(st, it) {
  const c = S.Lab.candidates(st, it);
  const set = new Set(c.map(a => a.alignment));
  return c.length && set.size === 1 ? [...set][0] : null;
}

// Every archive entry, in a steady order (inert, enchanted, cursed), with whether it still
// fits and, for each instrument you've used, what that entry would read and whether it matches.
export function board(st, it) {
  const tools = S.Lab.tools(st);
  const known = S.Lab.known(st);
  return ALIGN_ORDER.flatMap(al => known.filter(a => a.alignment === al)).map(a => {
    const page = S.Lab.page(st, a);
    const checks = tools.filter(t => it.revealed[t.id]).map(t => {
      const cell = S.Lab.cell(st, it, a, t.id);
      return { tool: t.id, value: page[t.id], label: short(t.id, page[t.id]), cell };
    });
    const miss = checks.find(c => c.cell === 'miss');
    return { a, fits: !miss, checks, why: miss ? `${toolName(miss.tool)} would read ${miss.label}` : null };
  });
}

const the = name => (/^the /i.test(name) ? name : `the ${name}`);
const toolName = id => S.toolOf(id)?.name ?? id;

// How well a test would split what's left, if it gave a sure reading. Lower is better:
// first the number of alignments still possible, then the number of entries.
export function splitScore(st, it, toolId, cands = S.Lab.candidates(st, it)) {
  const N = cands.length;
  if (!N) return { align: 0, count: 0 };
  const vals = cands.map(a => S.Lab.page(st, a)[toolId]);
  const groups = new Map();
  vals.forEach(v => { if (v != null) groups.set(v, (groups.get(v) || 0) + 1); });
  if (!groups.size) return { align: new Set(cands.map(a => a.alignment)).size, count: N };
  const weight = [...groups.values()].reduce((s, n) => s + n, 0);
  let align = 0, count = 0;
  for (const [v, n] of groups) {
    const left = cands.filter((a, i) => vals[i] == null || vals[i] === v);
    align += (n / weight) * new Set(left.map(a => a.alignment)).size;
    count += (n / weight) * left.length;
  }
  return { align, count };
}

// Mostly how well it splits the alignments, then the entries; a little for the bench time
// and vials it costs, so a free test that does nearly as well comes first.
const cost = x => x.score.align + 0.15 * x.score.count + x.tool.mins / 100 + 0.4 * x.tool.vials;

// The test worth running next: { tool, score, blocked, alt } or null when no test would help.
// `blocked` is why the best one can't run (no vials, no time); `alt` is the best one that can.
export function bestTool(st, it) {
  const cands = S.Lab.candidates(st, it);
  if (cands.length <= 1) return null;
  const N = cands.length, A0 = new Set(cands.map(a => a.alignment)).size;
  const ranked = S.Lab.tools(st)
    .filter(t => !(it.revealed[t.id] && it.revealed[t.id].length === 1))
    .map(t => ({ tool: t, score: splitScore(st, it, t.id, cands), block: S.Lab.blocker(st, it, t.id) }))
    .filter(x => x.score.count < N - 1e-9 || x.score.align < A0 - 1e-9)
    .sort((x, y) => cost(x) - cost(y));
  if (!ranked.length) return null;
  const top = ranked[0], alt = ranked.find(x => !x.block) ?? null;
  return { tool: top.tool, score: top.score, blocked: top.block, alt: alt && alt !== top ? alt : null, left: N };
}

// What a test just showed, in words: the reading, whether it was sure, and what it crossed off.
export function resultWords(st, it, toolId, before) {
  const r = it.revealed[toolId] || [];
  const after = new Set(S.Lab.candidates(st, it).map(a => a.id));
  const out = before.filter(a => !after.has(a.id));
  const sure = r.length === 1;
  return {
    sure,
    reading: sure ? valueWords(toolId, r[0]) : S.Lab.readingText(toolId, r),
    unsure: sure ? null : `Not a sure reading: it’s one of ${r.map(v => short(toolId, v)).join(' or ')}. Run it again to narrow it down.`,
    out,
    left: after.size,
  };
}

// The one line the bench always shows: what to do next. { kind, text, tool? }
export function advice(st, it) {
  const cands = S.Lab.candidates(st, it), N = cands.length;
  const tested = S.Lab.testsRun(it) > 0;
  if (!N) return { kind: 'unknown', text: S.Lab.isUnknown(st, it)
    ? 'Nothing in the archive matches. You’ve found something new: write it up at the research desk.'
    : 'Nothing in the archive matches these readings. Get sure readings on EMF, UV and the reagent, then take it to the research desk.' };
  const al = settledAlignment(st, it);
  const strange = S.Lab.unrecordedFits(st, it) ? ' (Something the archive has never recorded could also fit.)' : '';
  const finish = it.job ? 'File the report' : 'Tag it';
  if (al && N === 1) return { kind: 'settled', alignment: al, text: `It’s ${the(cands[0].name)}: ${al}. ${finish}.${strange}` };
  const best = bestTool(st, it);
  if (al) {
    const more = best && !best.blocked ? ` To name it too (factions pay more for a name), run the ${best.tool.name}.` : '';
    return { kind: 'settled', alignment: al, tool: best && !best.blocked ? best.tool.id : null, text: `Everything left is ${al}. ${finish}.${more}${strange}` };
  }
  const c = alignCounts(cands);
  const mix = ALIGN_ORDER.filter(k => c[k]).map(k => `${c[k]} ${k}`).join(', ');
  if (!best) return { kind: 'stuck', text: `Still ${mix}, and your instruments can’t split them any further. A Spirit Box, or restoring a torn archive page at the desk, would.` };
  const pick = best.blocked ? best.alt : best;
  if (!pick) {
    return { kind: 'blocked', text: best.blocked === 'Out of bench time'
      ? `Out of bench time tonight. Still ${mix}. Tag it on what you know, or come back tomorrow night.`
      : `The ${best.tool.name} would settle this, but you’re out of reagent vials. Kowalski Hardware sells them.` };
  }
  // Contamination that clouds the instrument you need: wash it first.
  if (it.contam && it.contam.tool === pick.tool.id && !S.Lab.basinBlocker(st, it, 'wash')) {
    return { kind: 'wash', tool: pick.tool.id, text: `${DATA.contaminants[it.contam.id].name} is clouding the ${pick.tool.name}. Wash it at the basin first, then test.` };
  }
  const again = it.revealed[pick.tool.id] ? ' again: last time it wasn’t sure' : '';
  const cut = Math.max(1, Math.round(N - pick.score.count));
  const lead = tested ? `Still ${mix}.` : `${N} things in the archive could be this: ${mix}.`;
  const note = best.blocked && pick !== best ? ` (The ${best.tool.name} would do better, but: ${best.blocked.toLowerCase()}.)` : '';
  return { kind: tested ? 'test' : 'start', tool: pick.tool.id, text: `${lead} Run the ${pick.tool.name}${again}. It should cross off about ${cut}.${note}` };
}

// One line for the evidence bin: where this find stands.
export function status(st, it) {
  const cands = S.Lab.candidates(st, it);
  if (!S.Lab.testsRun(it)) return { kind: 'new', text: 'Not tested yet' };
  if (!cands.length) return { kind: 'unknown', text: 'Nothing in the archive fits' };
  const al = settledAlignment(st, it);
  if (al) return { kind: 'settled', alignment: al, text: cands.length === 1 ? `Settled: ${cands[0].name} (${al})` : `Settled: ${al}` };
  const c = alignCounts(cands);
  return { kind: 'open', text: `${cands.length} possibilities: ${ALIGN_ORDER.filter(k => c[k]).join(' or ')}` };
}
