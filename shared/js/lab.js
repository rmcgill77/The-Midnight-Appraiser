'use strict';

/* ===================================================================== lab rules
   Readings are honest: every candidate list contains the truth. What changes the
   odds of an exact reading is the instrument's level, its calibration, and
   whether the find is contaminated in a way that clouds that instrument.
   The archive only knows catalogued anomalies; the rest are written up at the
   research desk. */
const Lab = {
  /* Instruments the player has (the Spirit Box has to be bought). */
  tools: st => DATA.tools.filter(t => !t.station || (st.upgrades[t.id] || 0) > 0),
  benchMax: st => DATA.config.benchMins + 60 * ((st.upgrades.lamp || 1) - 1),

  /* What a tool converges on for an anomaly. The Spirit Box hears its main trait. */
  truth: (a, toolId) => toolId === 'spirit' ? (a.traits[0] || 'none') : a.signature[toolId],

  /* Chance one test gives the exact reading. */
  exactChance(st, it, toolId) {
    const t = toolOf(toolId), lv = Math.max(1, st.upgrades[toolId] || 1), c = DATA.calibration;
    let p = t.exact[lv - 1] * (c.floor + (1 - c.floor) * (st.cal[toolId] ?? 100) / 100);
    if (it && it.contam && it.contam.tool === toolId) p -= DATA.contamPenalty;
    return clamp(p, 0.05, 1);
  },

  /* One bench test with exact-reading chance p. */
  read(toolId, truth, p, rng) {
    if (rng() < p) return [truth];
    if (toolId === 'emf') {
      const o = DATA.emfOrder, i = o.indexOf(truth);
      const j = i === 0 ? 1 : i === o.length - 1 ? i - 1 : (rng() < 0.5 ? i - 1 : i + 1);
      return [o[Math.min(i, j)], o[Math.max(i, j)]];
    }
    if (toolId === 'uv') return DATA.uvGroups[truth].slice();
    const others = Object.keys(DATA.clues[toolId]).filter(k => k !== truth);
    const pair = [truth, pick(rng, others)];
    return rng() < 0.5 ? pair : pair.reverse();
  },

  /* ----- the archive ----- */
  isKnown: (st, a) => !a.uncatalogued || st.archive.catalogued.includes(a.id),
  known: st => DATA.anomalies.filter(a => Lab.isKnown(st, a)),
  /* What the archive knows about an anomaly (null = torn page). */
  page(st, a) {
    const sig = { ...a.signature, spirit: a.traits[0] || 'none' };
    if (a.tornUntil && st.upgrades.lore < a.tornUntil && !st.archive.restored.includes(a.id)) sig[a.tornField] = null;
    return sig;
  },
  torn: st => Lab.known(st).filter(a => Lab.page(st, a)[a.tornField] === null),
  cell(st, it, a, toolId) {
    const r = it.revealed[toolId];
    if (!r) return 'unk';
    const v = Lab.page(st, a)[toolId];
    if (v === null) return 'torn';
    return r.includes(v) ? 'match' : 'miss';
  },
  fits: (st, it, a) => DATA.tools.every(t => Lab.cell(st, it, a, t.id) !== 'miss'),
  candidates: (st, it) => Lab.known(st).filter(a => Lab.fits(st, it, a)),
  testsRun: it => DATA.tools.reduce((s, t) => s + (it.tests[t.id] || 0), 0),
  /* All three core readings pinned down and nothing in the archive matches: something new. */
  /* Readings are honest, so the bench admits when an anomaly the archive has never recorded would also fit. */
  unrecordedFits: (st, it) => DATA.anomalies.some(a => !Lab.isKnown(st, a) && Lab.fits(st, it, a)),
  isUnknown: (st, it) => ['emf', 'uv', 'reagent'].every(k => it.revealed[k] && it.revealed[k].length === 1) && !Lab.candidates(st, it).length,

  readingText(toolId, r) {
    if (!r) return null;
    if (r.length === 1) return DATA.clues[toolId][r[0]];
    if (toolId === 'emf') return `Needle wavers: ${orList(r.map(v => DATA.short.emf[v]))}`;
    if (toolId === 'uv') return `${DATA.uvGroupName[r.length] || 'Faint marks'}: ${orList(r.map(v => DATA.short.uv[v]))}`;
    if (toolId === 'spirit') return `Crosstalk: ${orList(r.map(v => DATA.short.spirit[v].toLowerCase()))}`;
    return `Murky: ${orList(r.map(v => DATA.clues.reagent[v].toLowerCase()))}`;
  },
  suggest(st, it, d) {
    const est = Items.estimate(it);
    if (!d || !d.alignment) return est;
    let mult;
    if (d.anomalyId) mult = byId(DATA.anomalies, d.anomalyId).valueMult;
    else {
      const fit = Lab.candidates(st, it).filter(a => a.alignment === d.alignment);
      const pool = fit.length ? fit : Lab.known(st).filter(a => a.alignment === d.alignment);
      mult = pool.reduce((s, a) => s + a.valueMult, 0) / pool.length;
    }
    const raw = est * mult;
    return Math.max(1, raw >= 20 ? Math.round(raw / 5) * 5 : Math.round(raw));
  },
  blocker(st, it, toolId) {
    const t = toolOf(toolId);
    const r = it.revealed[toolId];
    if (t.station && !(st.upgrades[toolId] > 0)) return 'Not installed';
    if (r && r.length === 1) return 'Already exact';
    if (st.bench.mins < t.mins) return 'Out of bench time';
    if (st.supplies.vials < t.vials) return 'No reagent vials';
    return null;
  },
  /* Calibration lost per test. */
  wear: (st, toolId) => DATA.calibration.wear[toolId] * (st.research.done.includes('manual') ? 0.5 : 1),

  /* ----- materials and consumables ----- */
  have: (st, k) => k === 'jar' ? st.kit.jar : st.supplies[k] || 0,
  missing(st, cost) {
    for (const [k, n] of Object.entries(cost || {})) if (Lab.have(st, k) < n) return k;
    return null;
  },
  pay(st, cost) {
    for (const [k, n] of Object.entries(cost || {})) { if (k === 'jar') st.kit.jar -= n; else st.supplies[k] -= n; }
  },
  matName: k => k === 'jar' ? 'jar' : DATA.materials[k].name.toLowerCase(),
  costText: cost => Object.entries(cost || {}).map(([k, n]) => `${n} ${k === 'jar' ? (n > 1 ? 'jars' : 'jar') : k === 'vials' ? (n > 1 ? 'vials' : 'vial') : Lab.matName(k)}`).join(' + '),

  /* ----- the basin ----- */
  basinBlocker(st, it, act) {
    const b = DATA.basin[act];
    if (it.job && act !== 'wash') return 'Not yours to change';
    if (it.sealed) return act === 'seal' ? 'Already sealed' : 'Sealed in a jar';
    if (act === 'wash' && !it.contam) return 'Already clean';
    if (act === 'restore' && it.condition >= 100) return 'Already pristine';
    if (st.bench.mins < b.mins) return 'Out of bench time';
    const m = Lab.missing(st, b.cost);
    if (m) return m === 'jar' ? 'No jars. Make one at the workbench' : `Needs ${Lab.costText({ [m]: b.cost[m] })}`;
    return null;
  },
  purifyChance(st, a) {
    const P = DATA.purify;
    return clamp(P.odds[(st.upgrades.circle || 1) - 1] - P.perDanger * a.danger + (st.research.done.includes('rite') ? P.riteBonus : 0), 0.1, 0.95);
  },
  /* Forget every reading: after a rite, the find is not what it was. */
  wipe(it) {
    it.revealed = { emf: null, uv: null, reagent: null, spirit: null };
    it.tests = { emf: 0, uv: 0, reagent: 0, spirit: 0 };
    it.draft = null;
  },
  /* Do one basin action. Returns {kind, text, toast, sfx} or null. */
  basin(st, it, act) {
    if (Lab.basinBlocker(st, it, act)) return null;
    const b = DATA.basin[act], name = Items.name(it);
    Lab.pay(st, b.cost);
    st.bench.mins -= b.mins;
    if (act === 'wash') {
      const c = DATA.contaminants[it.contam.id];
      it.contam = null;
      log(st, `Washed the ${c.name.toLowerCase()} off the ${name}.`, 'note');
      return { toast: 'Washed clean', sfx: 'wash' };
    }
    if (act === 'restore') {
      it.condition = Math.min(100, it.condition + b.amount);
      log(st, `Restored the ${name} to ${it.condition}% condition.`, 'note');
      return { toast: `Condition ${it.condition}% · ${Items.condLabel(it)}`, sfx: 'restore' };
    }
    if (act === 'seal') {
      it.sealed = true;
      log(st, `Sealed the ${name} in a containment jar.`, 'note');
      return { toast: 'Sealed in a jar', sfx: 'seal' };
    }
    // purify
    st.counters.rites = (st.counters.rites || 0) + 1;
    const a = anomalyOf(it);
    if (a.alignment === 'inert') {
      log(st, `Nothing answered the rite. The ${name} was never anything but itself.`, 'note');
      return { kind: 'nothing', toast: 'Nothing answered the rite', sfx: 'rite' };
    }
    if (a.alignment === 'enchanted') {
      it.hidden.anomalyId = 'inert_residue'; it.purified = true; it.contam = null; Lab.wipe(it);
      log(st, `The rite drained something bright out of the ${name}. Whatever it was, it is ordinary now.`, 'warn');
      return { kind: 'stripped', toast: 'The rite stripped an enchantment', bad: true, sfx: 'rite' };
    }
    if (rnd() < Lab.purifyChance(st, a)) {
      it.hidden.anomalyId = 'inert_residue'; it.purified = true; it.contam = null; Lab.wipe(it);
      st.supplies.essence += 1;
      st.counters.purified = (st.counters.purified || 0) + 1;
      log(st, `The rite took. Something left the ${name}, and you bottled what it left behind. +1 essence.`, 'note');
      return { kind: 'broken', toast: 'Curse broken · +1 essence', sfx: 'purify' };
    }
    const sp = DATA.purify.failStress;
    st.stress += sp;
    it.contam = { id: 'hex', tool: pick(rnd, ['emf', 'uv', 'reagent']) };
    log(st, `The rite failed. Something in the ${name} pushed back hard. +${sp} Stress.`, 'warn');
    return { kind: 'failed', toast: `The rite failed · +${sp} Stress`, bad: true, sfx: 'ritefail' };
  },

  /* Break a find down for cash, scrap and (if it was more than it looked) essence. */
  breakdown(st, it) {
    const B = DATA.breakdown, a = anomalyOf(it);
    const cash = Math.max(1, Math.round(Items.estimate(it) * B.cashRate));
    const scrap = 1 + (baseOf(it).materials.length >= 3 ? 1 : 0);
    const essence = B.essence[a.alignment] || 0;
    const extra = { ...(B.extra[baseOf(it).category] || {}) };
    st.cash += cash; st.supplies.scrap += scrap; st.supplies.essence += essence;
    for (const k in extra) st.supplies[k] += extra[k];
    if (a.alignment === 'cursed') st.stress += B.cursedStress;
    return { cash, scrap, essence, extra, cursed: a.alignment === 'cursed' };
  },

  /* ----- the workbench ----- */
  recipeBlocker(st, r) {
    if (r.needs && !st.research.done.includes(r.needs)) return `Research ${byId(DATA.projects, r.needs).name} first`;
    if (st.bench.mins < r.mins) return 'Out of bench time';
    const m = Lab.missing(st, r.cost);
    return m ? `Needs ${Lab.costText({ [m]: r.cost[m] })}` : null;
  },

  /* ----- the research desk ----- */
  /* Every project open right now: the fixed ones, torn pages, and unknown specimens. */
  openProjects(st) {
    const out = DATA.projects.filter(p => !st.research.done.includes(p.id))
      .map(p => ({ key: p.id, name: p.name, icon: p.icon, mins: p.hours * 60, note: p.note }));
    for (const a of Lab.torn(st)) {
      const tool = toolOf(a.tornField);
      out.push({ key: 'page:' + a.id, name: `Rebuild a torn page: ${a.name}`, icon: 'book', mins: DATA.pageHours * 60,
        note: `Piece the missing ${tool.name} entry back together from scraps in the archive.` });
    }
    const seen = new Set();
    for (const it of st.inventory.loot) {
      if (!Lab.isUnknown(st, it)) continue;
      const id = it.hidden.anomalyId;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ key: 'cat:' + id, name: `Catalogue specimen No. ${pad(it.ticket)}`, icon: 'unknown', mins: DATA.catalogueHours * 60, specimen: it.uid,
        note: `Its readings match nothing in the archive. Write it up and it gets a page of its own.` });
    }
    return out.map(p => ({ ...p, done: st.research.progress[p.key] || 0 }));
  },
  /* Put minutes into a project. Returns the finished project's message, '' if still going, null if nothing happened. */
  work(st, key, mins, free = false) {        // free: hours from somewhere else (the library), not bench time
    const p = Lab.openProjects(st).find(x => x.key === key);
    if (!p) return null;
    const m = Math.min(mins, free ? Infinity : st.bench.mins, p.mins - p.done);
    if (m <= 0) return null;
    if (!free) st.bench.mins -= m;
    st.research.progress[key] = p.done + m;
    if (p.done + m < p.mins) return '';
    delete st.research.progress[key];
    if (key.startsWith('page:')) {
      const a = byId(DATA.anomalies, key.slice(5));
      st.archive.restored.push(a.id);
      log(st, `Rebuilt the torn ${toolOf(a.tornField).name} entry for ${a.name}.`, 'note');
      return `Page restored: ${a.name}`;
    }
    if (key.startsWith('cat:')) {
      const a = byId(DATA.anomalies, key.slice(4));
      st.archive.catalogued.push(a.id);
      log(st, `Catalogued a new anomaly: ${a.name} (${a.alignment}). It has its own page in the archive now.`, 'loot');
      return `New archive page: ${a.name}`;
    }
    st.research.done.push(key);
    log(st, `Finished researching ${p.name}.`, 'note');
    return `Research done: ${p.name}`;
  },

  /* ----- overnight ----- */
  /* Unsealed curses leak while you sleep. Returns a line for the log, or null. */
  overnight(st) {
    const B = DATA.bleed;
    let stress = 0;
    const spread = [];
    for (const list of ['loot', 'stock']) {
      const items = st.inventory[list];
      for (const it of items) {
        const a = anomalyOf(it);
        if (a.alignment !== 'cursed' || it.sealed) continue;
        stress += B.stress + B.perDanger * a.danger;
        const clean = items.filter(x => x !== it && !x.sealed && !x.contam);
        if (clean.length && rnd() < B.spreadChance) {
          const v = pick(rnd, clean);
          v.contam = { id: 'hex', tool: pick(rnd, ['emf', 'uv', 'reagent']) };
          spread.push(Items.name(v));
        }
      }
    }
    if (!stress) return null;
    st.stress += stress;
    const text = `Something downstairs kept you up all night. +${stress} Stress.${spread.length ? ` Black soot crept onto the ${orList(spread)}.` : ''}`;
    log(st, text, 'warn');
    return text;
  }
};
