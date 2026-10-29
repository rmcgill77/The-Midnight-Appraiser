// The basement's stations. Each panel mirrors a station from Second Sight Pawn's
// lab and calls the same rules; only the layout is new. Everything here spends
// bench time (6 hours a night to start), never the day clock.

import { daysLeft, leftText } from '../game/appraisals.js';
import { el } from './ui.js';
import { itemArt, iconSvg } from './glyphs.js';
import { S } from '../rules/index.js';
import * as A from '../rules/actions.js';
import * as B from '../game/bench-logic.js';
import { BenchStage } from './bench-stage.js';

const { DATA } = S;
const money = n => S.money(n);
const dur = m => S.dur(m);

// Phase 19: one compact line: bench time left, its bar, and what's on the shelf.
function benchBar(st) {
  const left = st.bench.mins, max = st.bench.max;
  return el('div', { class: 'benchbar' },
    el('div', { class: 'benchbar-row' }, el('span', { class: 'label' }, 'Bench'), el('strong', { class: 'mono' }, `${dur(left)} left`)),
    el('div', { class: 'hours', role: 'progressbar', 'aria-label': 'Bench time left', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(left) },
      Array.from({ length: Math.ceil(max / 60) }, (_, i) => {
        const fill = S.clamp((left - i * 60) / 60, 0, 1);
        return el('i', { style: `--f:${fill}` });
      })),
    el('div', { class: 'mats' }, Object.entries(DATA.materials).map(([k, m]) =>
      el('span', { class: 'mat' }, iconSvg(m.icon, 'px-icon sm'), `${st.supplies[k]} ${m.name.split(' ')[0].toLowerCase()}`)),
      el('span', { class: 'mat' }, iconSvg('jar', 'px-icon sm'), `${st.kit.jar} jar${st.kit.jar === 1 ? '' : 's'}`)));
}

// ---------- Bench: the evidence bin ----------

// Phase 17: each find says where it stands, so you can see which ones are ready to tag.
export function openBench(g) {
  const { ui } = g, st = g.st;
  const loot = st.inventory.loot;
  ui.open({
    id: 'bench', size: 'wide', eyebrow: 'Station · Bench', title: 'Evidence bin',
    stickActions: false,
    body: [
      benchBar(st),
      el('p', { class: 'note' }, 'Pick a find. Test it until everything left is one kind, then tag it for the shop.'),
      loot.length
        ? el('ul', { class: 'stock' }, loot.map(it => {
            const s = B.status(st, it);
            return el('li', {},
              el('button', { type: 'button', class: `stock-row bin-${s.kind}`, id: `find-${it.uid}`, onclick: () => openSpecimen(g, it.uid) },
                itemArt(it, 'item-art sm'),
                el('span', { class: 'stock-text' }, el('strong', {}, S.Items.name(it)),
                  el('span', {}, `${it.job ? `Appraisal for ${it.job.who} · ${g.continuous && it.job.due != null ? `${leftText(daysLeft(it.job, st.day))} · ` : ''}` : ''}${S.Lab.testsRun(it)} test${S.Lab.testsRun(it) === 1 ? '' : 's'}`)),
                el('span', { class: `bin-status ${s.alignment ? `al-${s.alignment}` : ''} st-${s.kind}` }, s.kind === 'settled' ? 'Ready to tag' : s.kind === 'new' ? 'New' : s.kind === 'unknown' ? 'Unknown' : `${S.Lab.candidates(st, it).length} left`)));
          }))
        : el('p', {}, 'Nothing on the bench. Buy from sellers at the counter by day, or scavenge at night once the zones open.'),
    ],
    actions: [
      { id: 'open-archive', label: 'Open the Lore Archive', kind: 'quiet', onClick: () => openArchive(g, () => openBench(g)) },
    ],
  });
}

// ---------- Bench: one find under the lamp ----------
// Phase 17: the find under a lamp that shows each test happening; a guide line that always
// says what to do next; plain words for every reading; a board of everything it could be,
// crossed off as you go; and a tag step that shows what the evidence supports.

export function openSpecimen(g, uid) {
  const { ui } = g;
  let confirmRite = false, last = null, stage = null, busy = false;

  const render = () => {
    const st = g.st;
    const it = st.inventory.loot.find(x => x.uid === uid);
    if (!it) return openBench(g);
    if (!stage) stage = new BenchStage(it, { reducedMotion: !!g.settings?.reducedMotion });
    const idx = st.inventory.loot.indexOf(it), next = st.inventory.loot[(idx + 1) % st.inventory.loot.length];
    const adv = B.advice(st, it);
    // Once the evidence settles it, the tag starts on the answer (you can still change it).
    if (adv.alignment && !it.draft?.alignment) A.setAlignment(st, it, adv.alignment);
    const cands = S.Lab.candidates(st, it), known = S.Lab.known(st);
    const firstTime = (st.counters.appraised || 0) === 0 && S.Lab.testsRun(it) < 2;
    ui.open({
      id: 'specimen', size: 'wide', eyebrow: `Bench · No. ${String(it.ticket).padStart(4, '0')}`, title: S.Items.name(it),
      back: () => openBench(g), stickActions: false,
      body: [
        el('div', { class: 'spec-meta' },
          el('span', {}, `${S.Items.condLabel(it)} (${it.condition}%)`),
          el('span', {}, `Looks like ${money(S.Items.estimate(it))}`),
          it.source ? el('span', {}, `Paid ${money(it.source.price)}`) : el('span', {}, `From the ${S.byId(DATA.zones, it.zoneId)?.name ?? 'city'}`),
          el('span', { class: 'mono' }, `${dur(st.bench.mins)} bench time`)),
        guideBox(adv),
        el('details', { class: 'howto', open: firstTime },
          el('summary', {}, 'How the bench works'),
          el('ol', {},
            el('li', {}, el('b', {}, 'Test it. '), 'Each instrument reads something different. ', S.Lab.tools(st).map(t => `${t.name}: ${B.TOOL_HELP[t.id]?.what ?? t.reads}`).join(' ')),
            el('li', {}, el('b', {}, 'Cross off. '), 'Every reading rules out what would have read differently. Readings never lie, but an unsure one keeps a few options open: run it again.'),
            el('li', {}, el('b', {}, 'Tag it. '), 'When everything left is one kind (inert, enchanted or cursed), tag it with that. Name it too and factions pay more.'))),
        section('Tests', `${dur(st.bench.mins)} left · ${st.supplies.vials} vial${st.supplies.vials === 1 ? '' : 's'}`, el('div', { class: 'bench-lab' },
          el('div', { class: 'stage-wrap' }, stage.canvas, it.contam ? el('span', { class: 'chip warn stage-chip' }, `${DATA.contaminants[it.contam.id].name}: clouds the ${S.toolOf(it.contam.tool)?.name ?? 'instruments'}`) : null),
          tests(st, it, adv),
          last ? resultBox(last) : null)),
        S.Lab.tools(st).length < DATA.tools.length ? el('p', { class: 'note' }, 'A Spirit Box (Gear station) would hear what a find is built around.') : null,
        section('What it could be', `${cands.length} of ${known.length} left`, suspects(st, it, cands)),
        it.job ? section('Appraisal report', `For ${it.job.who}${g.continuous && it.job.due != null ? ` · ${leftText(daysLeft(it.job, st.day))}` : ''}`, jobReport(st, it, cands)) : section('Tag it', `Looks like ${money(S.Items.estimate(it))}`, verdict(st, it, cands)),
        el('details', { class: 'notes', open: !!it.contam || confirmRite },
          el('summary', {}, it.contam ? 'Basin · it needs washing' : 'Basin · wash, restore, purify, seal'), basinTiles(st, it)),
        el('details', { class: 'notes' },
          el('summary', {}, 'Surface notes'),
          el('p', { class: 'tell' }, S.prefixOf(it).tell),
          el('p', {}, S.baseOf(it).desc),
          el('p', { class: 'note' }, `Materials: ${S.baseOf(it).materials.join(', ')}`)),
      ],
      actions: [
        ...(next && next.uid !== it.uid ? [{ id: 'next-find', label: 'Next find', onClick: () => openSpecimen(g, next.uid) }] : []),
        { id: 'to-bin', label: 'Back to the evidence bin', kind: 'quiet', onClick: () => openBench(g) },
      ],
    });
    stage.hold(stage.last);
  };

  const guideBox = adv => el('div', { class: `bench-guide g-${adv.kind}`, role: 'status' },
    el('span', { class: 'bench-guide-tag' }, adv.kind === 'settled' ? 'Ready' : adv.kind === 'unknown' ? 'New' : adv.kind === 'wash' ? 'First' : adv.kind === 'blocked' || adv.kind === 'stuck' ? 'Stuck' : 'Next'),
    el('p', {}, adv.text));

  // One card per instrument: what it reads, what it last said, how sure it tends to be.
  const tests = (st, it, adv) => el('div', { class: 'tools' }, S.Lab.tools(st).map(t => {
    const r = it.revealed[t.id], block = S.Lab.blocker(st, it, t.id);
    const sure = r && r.length === 1;
    const label = sure ? 'Sure reading' : block === 'Out of bench time' ? 'No time left' : block === 'No reagent vials' ? 'No vials' : r ? 'Run it again' : 'Run test';
    const clouded = it.contam && it.contam.tool === t.id;
    const suggested = adv.tool === t.id && !sure && !block;
    const p = S.Lab.exactChance(st, it, t.id);
    return el('article', { class: `tool ${sure ? 'exact' : ''} ${suggested ? 'suggested' : ''}`, 'data-tool': t.id },
      el('div', { class: 'tool-head' }, iconSvg(B.TOOL_HELP[t.id]?.icon ?? 'loupe', 'px-icon sm'), el('strong', {}, t.name),
        suggested ? el('span', { class: 'tool-badge' }, 'Suggested') : null),
      el('p', { class: 'tool-reads' }, `Reads ${t.reads.toLowerCase()} · ${dur(t.mins)}${t.vials ? ` + ${t.vials} vial` : ''}`),
      el('p', { class: `reading ${r ? '' : 'pending'}` }, r ? (sure ? B.valueWords(t.id, r[0]) : S.Lab.readingText(t.id, r)) : 'Not tested yet',
        r && !sure ? el('span', { class: 'unsure' }, ' · not sure') : null),
      el('p', { class: `odds ${clouded ? 'warnline' : ''}` }, sure ? 'Pinned down' : clouded ? `Clouded: ${B.accuracyWords(p).toLowerCase()}. Wash it first.` : `${B.accuracyWords(p)}${st.cal[t.id] < 60 ? ' · needs recalibrating' : ''}`),
      el('button', { type: 'button', class: `btn small tool-run ${block || sure ? '' : 'primary'}`, id: `test-${t.id}`, disabled: !!block || busy, onclick: () => run(t) }, label));
  }));

  // Run a test: the reading is decided at once (the original's rules); the lamp shows it
  // happening, then the board crosses off what it ruled out.
  async function run(t) {
    const st = g.st, it = st.inventory.loot.find(x => x.uid === uid);
    if (busy || !it) return;
    const before = S.Lab.candidates(st, it);
    const res = A.runTest(st, it, t.id);
    if (!res) return render();
    busy = true;
    ui.sheet.querySelectorAll('.tool-run').forEach(b => { b.disabled = true; });
    ui.sheet.querySelector(`[data-tool="${t.id}"]`)?.classList.add('running');
    stage.canvas.parentNode?.scrollIntoView?.({ block: 'nearest', behavior: g.settings?.reducedMotion ? 'auto' : 'smooth' });
    await stage.play(t.id, it.revealed[t.id]);
    busy = false;
    g.changed();
    last = { tool: t.id, ...B.resultWords(st, it, t.id, before) };
    if (res.mishap) ui.toast(`Lab mishap · +8 Stress. ${res.mishap}`, 3600);
    if (ui.current?.id === 'specimen') render();
  }

  const resultBox = l => el('div', { class: `bench-result ${l.sure ? 'sure' : 'unsure'}`, role: 'status' },
    el('p', { class: 'res-head' }, iconSvg(B.TOOL_HELP[l.tool]?.icon ?? 'loupe', 'px-icon sm'), el('strong', {}, `${S.toolOf(l.tool).name}: `), l.reading,
      el('span', { class: 'res-tag' }, l.sure ? 'Sure' : 'Not sure')),
    l.unsure ? el('p', { class: 'note' }, l.unsure) : null,
    el('p', {}, l.out.length
      ? [el('b', {}, `Crossed off ${l.out.length}: `), l.out.map(a => a.name).join(', '), `. ${l.left} left.`]
      : `Nothing new crossed off: everything left would read that way. ${l.left} left.`));

  // Everything in the archive, in order, crossed off as the readings rule it out.
  const suspects = (st, it, cands) => {
    const rows = B.board(st, it), c = B.alignCounts(cands);
    const justOut = new Set(last?.out?.map(a => a.id) ?? []);
    return el('div', { class: 'suspects-wrap' },
      el('div', { class: 'align-bar' }, B.ALIGN_ORDER.map(al => el('span', { class: `align-pill al-${al} ${c[al] ? '' : 'none'}` }, iconSvg(al, 'px-icon sm'), `${c[al]} ${al}`))),
      S.Lab.unrecordedFits(st, it) && cands.length ? el('p', { class: 'note warnline' }, 'Something the archive has never recorded would also fit these readings.') : null,
      el('div', { class: 'suspects' }, rows.map(({ a, fits, checks }) =>
        el('article', { class: `suspect al-${a.alignment} ${fits ? '' : 'out'} ${justOut.has(a.id) ? 'just-out' : ''} ${fits && cands.length === 1 ? 'only' : ''}`, 'aria-label': `${a.name}, ${a.alignment}${fits ? '' : ', ruled out'}` },
          el('div', { class: 'suspect-name' }, iconSvg(a.alignment, 'px-icon sm'), el('strong', {}, a.name)),
          checks.length ? el('div', { class: 'suspect-checks' }, checks.map(ch => el('span', { class: `sc ${ch.cell}` }, `${{ emf: 'EMF', uv: 'UV', reagent: 'Chem', spirit: 'Spirit' }[ch.tool]} ${ch.cell === 'torn' ? '? torn page' : `${ch.label} ${ch.cell === 'match' ? '✓' : '✕'}`}`))) : el('small', {}, S.cap(a.alignment)),
          fits ? null : el('span', { class: 'stamp-out', 'aria-hidden': 'true' }, 'Ruled out')))));
  };

  // Inert / Enchanted / Cursed, each saying how many of the possibilities left it covers.
  const alignButtons = (st, it, cands, note) => {
    const d = it.draft || {}, c = B.alignCounts(cands);
    return el('div', { class: 'seg n3 align-pick', role: 'radiogroup', 'aria-label': 'Alignment' }, DATA.alignments.map(al => {
      const n = c[al.id], all = cands.length && n === cands.length;
      return el('button', { type: 'button', role: 'radio', id: `align-${al.id}`, class: `al-${al.id} ${d.alignment === al.id ? 'on' : ''} ${all ? 'evidence' : ''} ${cands.length && !n ? 'against' : ''}`, 'aria-checked': String(d.alignment === al.id),
        onclick: () => { A.setAlignment(g.st, it, al.id); g.changed(); render(); } },
        al.name, el('small', {}, all ? 'Fits the evidence' : !cands.length ? (note ? al.note : '') : n ? `${n} of ${cands.length} fit` : 'Ruled out'));
    }));
  };

  // An appraisal job: say what it is. No price, no shelving; the owner collects it tonight.
  const jobReport = (st, it, cands) => {
    const d = it.draft || {}, P = DATA.appraisal.pay, j = it.job;
    const ids = d.alignment ? cands.filter(a => a.alignment === d.alignment) : [];
    return el('div', { class: 'verdict' },
      el('dl', { class: 'readout' },
        el('dt', {}, 'Right'), el('dd', {}, `${money(Math.round(j.fee * P.right))} · name it too: ${money(Math.round(j.fee * P.named))}`),
        el('dt', {}, 'Wrong'), el('dd', {}, `only ${money(Math.round(j.fee * P.wrong))}`)),
      alignButtons(st, it, cands, false),
      d.alignment ? el('div', { class: 'idchips' },
        el('button', { type: 'button', class: `idchip ${!d.anomalyId ? 'on' : ''}`, id: 'ident-none', onclick: () => { A.setIdentity(g.st, it, null); render(); } }, 'Alignment only'),
        ids.map(a => el('button', { type: 'button', class: `idchip al-${a.alignment} ${d.anomalyId === a.id ? 'on' : ''}`, id: `ident-${a.id}`, onclick: () => { A.setIdentity(g.st, it, a.id); render(); } }, a.name))) : null,
      d.alignment && cands.length && !cands.some(a => a.alignment === d.alignment) ? el('p', { class: 'notice' }, `Nothing that fits your readings is ${d.alignment}. That’s a guess against the evidence.`) : null,
      el('button', { type: 'button', class: 'btn primary block', id: 'file-report', disabled: !d.alignment, onclick: () => {
        if (g.continuous) {
          const r = A.fileReportNow(g.st, it.uid);
          if (r) { g.changed(); ui.toast(r.items[0]?.text ?? `Report filed. ${j.who} collected it.`, 5200); openBench(g); }
        } else if (A.fileReport(g.st, it.uid)) { g.changed(); ui.toast(`Report filed. ${j.who} collects it tonight.`); openBench(g); }
      } }, d.alignment ? `File report: ${S.cap(d.alignment)}${d.anomalyId ? ` · ${S.byId(DATA.anomalies, d.anomalyId).name}` : ''}` : 'File report'),
      el('p', { class: 'note' }, 'You can wash it, but restoring, purifying, sealing or breaking it down is not yours to do.'));
  };

  const verdict = (st, it, cands) => {
    const d = it.draft || {};
    const ids = d.alignment ? cands.filter(a => a.alignment === d.alignment) : [];
    const sug = S.Lab.suggest(st, it, d);
    const pct = d.alignment && sug ? Math.round((d.price / sug) * 100) : 100;
    let warn = null;
    if (d.alignment === 'cursed') warn = 'Walk-ins won’t buy anything tagged cursed. Only a faction that wants its trait will. A curse sold under another tag ends up on the evening news.';
    else if (d.alignment && cands.length && !cands.some(a => a.alignment === d.alignment)) warn = `Nothing that fits your readings is ${d.alignment}. That’s a guess against the evidence.`;
    else if (d.alignment && cands.some(a => a.alignment !== d.alignment)) { const n = cands.filter(a => a.alignment !== d.alignment).length; warn = `A gamble: ${n} of the ${cands.length} possibilities left ${n === 1 ? 'is' : 'are'} something else. Another test would settle it.`; }
    const bd = Math.max(1, Math.round(S.Items.estimate(it) * DATA.breakdown.cashRate));
    return el('div', { class: 'verdict' },
      alignButtons(st, it, cands, true),
      d.alignment ? el('div', { class: 'field' },
        el('p', { class: 'label' }, 'Name it (optional)'),
        el('div', { class: 'idchips' },
          el('button', { type: 'button', class: `idchip ${!d.anomalyId ? 'on' : ''}`, id: 'ident-none', onclick: () => { A.setIdentity(g.st, it, null); g.changed(); render(); } }, 'Alignment only'),
          ids.map(a => el('button', { type: 'button', class: `idchip al-${a.alignment} ${d.anomalyId === a.id ? 'on' : ''}`, id: `ident-${a.id}`, onclick: () => { A.setIdentity(g.st, it, a.id); g.changed(); render(); } }, a.name))),
        ids.length ? el('p', { class: 'note' }, ids.length === 1 ? 'Only one thing fits, so naming it is safe. Factions pay full price for a name.' : 'Factions pay full price only for a named piece. Name the wrong one and they want a refund.') : null) : null,
      warn ? el('p', { class: 'notice' }, warn) : null,
      d.alignment ? el('div', { class: 'pricer' },
        el('button', { type: 'button', class: 'btn', id: 'price-down', 'aria-label': 'Lower price', onclick: () => { A.nudgePrice(g.st, it, -1); render(); } }, '−'),
        el('div', { class: 'price-big' }, money(d.price), el('small', {}, `${pct}% of suggested ${money(sug)}`)),
        el('button', { type: 'button', class: 'btn', id: 'price-up', 'aria-label': 'Raise price', onclick: () => { A.nudgePrice(g.st, it, 1); render(); } }, '+')) : el('p', { class: 'note' }, 'Pick what it is to price it. You can guess without testing, at your own risk.'),
      d.alignment ? el('button', { type: 'button', class: 'btn primary block', id: 'shelve', onclick: () => {
        const name = S.Items.name(it);
        if (A.tagAndShelve(g.st, it)) { g.changed(); ui.toast(`${name} is tagged and ready for the shop.`); openBench(g); }
      } }, `Tag and shelve at ${money(d.price)}`) : null,
      el('button', { type: 'button', class: 'btn quiet block', id: 'scrap', onclick: () => {
        const r = A.scrap(g.st, it); g.changed();
        if (r) { ui.toast(`+${money(r.cash)} · +${r.scrap} scrap${r.essence ? ` · +${r.essence} essence` : ''}${r.cursed ? ' · it bit back' : ''}`); openBench(g); }
      } }, `Break down · ${money(bd)} + scrap`));
  };

  const basinTiles = (st, it) => {
    const weak = Math.round(S.Lab.purifyChance(st, { danger: 1 }) * 100), strong = Math.round(S.Lab.purifyChance(st, { danger: 3 }) * 100);
    const status = {
      wash: it.contam ? DATA.contaminants[it.contam.id].name : 'Clean',
      restore: `Now ${it.condition}%`, purify: 'Breaks curses',
      seal: it.sealed ? 'Sealed' : `${st.kit.jar} jar${st.kit.jar === 1 ? '' : 's'} left`,
    };
    return el('div', {},
      el('div', { class: 'basin' }, Object.entries(DATA.basin).map(([act, b]) => {
        const block = S.Lab.basinBlocker(st, it, act);
        const cost = [dur(b.mins), S.Lab.costText(b.cost)].filter(Boolean).join(' · ');
        const confirming = act === 'purify' && confirmRite;
        return el('button', { type: 'button', class: `basin-tile ${act === 'purify' ? 'rite' : ''} ${confirming ? 'confirm' : ''}`, id: `basin-${act}`, disabled: !!block,
          onclick: () => {
            if (act === 'purify' && !confirmRite) { confirmRite = true; return render(); }
            confirmRite = false;
            const r = A.basin(g.st, it, act); g.changed();
            if (r) ui.toast(r.toast);
            render();
          } },
          el('strong', {}, confirming ? 'Begin the rite?' : b.name), el('small', {}, cost), el('span', {}, block || status[act]));
      })),
      el('p', { class: `note ${confirmRite ? 'warnline' : ''}` }, confirmRite
        ? `The rite strips enchantments too, and does nothing to an ordinary find. It breaks a weak curse about ${weak}% of the time, a strong one ${strong}%. Tap again to begin.`
        : `Wash clears contamination. Restore adds ${DATA.basin.restore.amount} condition. Purify breaks curses (weak ~${weak}%, strong ~${strong}%) but strips enchantments. A jar stops a curse leaking overnight.`));
  };

  render();
}

function section(title, aside, body) {
  return el('section', { class: 'lab-sec' }, el('div', { class: 'sec-title' }, el('span', {}, title), el('span', {}, aside)), body);
}

// ---------- Workshop ----------

export function openWorkshop(g) {
  const { ui } = g, st = g.st;
  ui.open({
    id: 'workshop', size: 'wide', eyebrow: 'Station · Workshop', title: 'The workbench',
    body: [
      benchBar(st),
      el('p', { class: 'note' }, 'Make jars, wards and other things worth carrying. Materials come from the hardware store, night runs, and breaking down finds.'),
      section('Workbench', 'Bench time + materials', el('div', { class: 'rows' }, DATA.recipes.map(r => {
        const k = DATA.kit[r.id], block = S.Lab.recipeBlocker(st, r), locked = r.needs && !st.research.done.includes(r.needs);
        return el('article', { class: 'row-card' },
          iconSvg(k.icon, 'px-icon'),
          el('div', { class: 'row-text' }, el('strong', {}, `${k.name} ×${st.kit[r.id]}`), el('span', {}, k.note), el('small', {}, [dur(r.mins), S.Lab.costText(r.cost)].join(' · ')), block ? el('small', { class: 'warnline' }, block) : null),
          el('button', { type: 'button', class: `btn small ${block ? '' : 'primary'}`, id: `craft-${r.id}`, disabled: !!block, onclick: () => { if (A.craft(g.st, r.id)) { g.changed(); ui.toast(`+1 ${k.name.toLowerCase()}`); openWorkshop(g); } } }, locked ? 'Locked' : 'Make'));
      }))),
      section('Materials', 'On hand', el('div', { class: 'rows' }, Object.entries(DATA.materials).map(([key, m]) =>
        el('article', { class: 'row-card' }, iconSvg(m.icon, 'px-icon'),
          el('div', { class: 'row-text' }, el('strong', {}, `${m.name} · ${st.supplies[key]}`), el('span', {}, m.note), el('small', {}, `Get more: ${m.from.join(' · ')}`)))))),
    ],
    actions: [{ label: 'Step away', kind: 'quiet', onClick: () => ui.close() }],
  });
}

// ---------- Desk: research and the archive ----------

export function openDesk(g) {
  const { ui } = g, st = g.st;
  const projects = S.Lab.openProjects(st);
  const known = S.Lab.known(st).length, unk = DATA.anomalies.length - known, torn = S.Lab.torn(st).length;
  const done = DATA.projects.filter(p => st.research.done.includes(p.id));
  ui.open({
    id: 'desk', size: 'wide', eyebrow: 'Station · Desk', title: 'Research desk',
    body: [
      benchBar(st),
      el('p', { class: 'note' }, `Lore Archive Lv ${st.upgrades.lore}: ${known} pages${torn ? `, ${torn} torn` : ''}${unk ? `, ${unk} anomal${unk === 1 ? 'y' : 'ies'} never catalogued` : ''}. Long projects run over several nights.`),
      section('Projects', `${projects.length} open`, projects.length ? el('div', { class: 'rows' }, projects.map(p => {
        const left = p.mins - p.done, can = Math.min(left, st.bench.mins), step = Math.min(30, can);
        const work = mins => { const msg = A.research(g.st, p.key, mins); g.changed(); if (msg) ui.toast(msg); openDesk(g); };
        return el('article', { class: 'row-card project' },
          iconSvg(p.icon, 'px-icon'),
          el('div', { class: 'row-text' }, el('strong', {}, p.name), el('span', {}, p.note),
            el('div', { class: 'progress' }, el('i', { style: `width:${(p.done / p.mins) * 100}%` })),
            el('small', {}, `${dur(p.done)} of ${dur(p.mins)}`)),
          el('div', { class: 'btncol' },
            el('button', { type: 'button', class: 'btn small', id: `work-${p.key}`, disabled: can < 1, onclick: () => work(step) }, `Work ${dur(step || 30)}`),
            can > step ? el('button', { type: 'button', class: 'btn small primary', id: `workall-${p.key}`, onclick: () => work(can) }, `Work ${dur(can)}`) : null));
      })) : el('p', {}, 'Nothing left to research right now.')),
      done.length ? section('Finished', String(done.length), el('div', { class: 'chipline' }, done.map(p => el('span', { class: 'chip' }, p.name)))) : null,
    ],
    actions: [
      { id: 'open-archive', label: 'Open the Lore Archive', onClick: () => openArchive(g, () => openDesk(g)) },
      { label: 'Step away', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}

export function openArchive(g, back) {
  const { ui } = g, st = g.st;
  const short = DATA.short;
  ui.open({
    id: 'archive', size: 'wide', eyebrow: `Lore Archive · Lv ${st.upgrades.lore}`, title: 'What the readings mean',
    body: [
      el('p', { class: 'note' }, 'Each anomaly leaves its own readings. A ? is a torn page: it never rules an entry out.'),
      el('div', { class: 'rows' }, S.Lab.known(st).map(a => {
        const pg = S.Lab.page(st, a);
        const sig = ['emf', 'uv', 'reagent', 'spirit'].map(k => `${{ emf: 'EMF', uv: 'UV', reagent: 'Chem', spirit: 'Spirit' }[k]} ${pg[k] == null ? '?' : short[k][pg[k]]}`).join(' · ');
        return el('article', { class: `row-card al-${a.alignment}` },
          iconSvg(a.alignment, 'px-icon'),
          el('div', { class: 'row-text' }, el('strong', {}, `${a.name} · ${S.cap(a.alignment)}`), el('span', {}, a.effect), el('small', { class: 'mono' }, sig)));
      })),
    ],
    actions: [{ label: 'Back', kind: 'primary', onClick: back }],
  });
}

// ---------- Cells ----------

export { openCellsStation as openCells } from './night-panels.js';

// ---------- Gear ----------

export function openGear(g) {
  const { ui } = g, st = g.st, C = DATA.calibration;
  const rows = [
    ...DATA.tools.map(t => ({ key: t.id, name: t.name, perks: t.perks })),
    { key: 'lore', name: DATA.lore.name, perks: DATA.lore.perks },
    ...Object.entries(DATA.labGear).map(([key, gd]) => ({ key, name: gd.name, perks: gd.perks })),
    // Night-run gear: flashlight, boots, bag.
    ...Object.entries(DATA.gear).map(([key, gd]) => ({ key, name: gd.name, perks: gd.perks })),
  ];
  ui.open({
    id: 'gear', size: 'wide', eyebrow: 'Station · Gear', title: 'Instruments and upgrades',
    body: [
      benchBar(st),
      section('Calibration', 'Every test wears it down', el('div', { class: 'rows' }, S.Lab.tools(st).map(t => {
        const cal = st.cal[t.id];
        return el('article', { class: 'row-card' },
          el('div', { class: 'row-text' }, el('strong', {}, t.name),
            el('div', { class: 'progress' }, el('i', { style: `width:${cal}%`, class: cal >= 70 ? 'good' : cal >= 40 ? 'mid' : 'low' })),
            el('small', {}, `${cal}% · sure reading ~${Math.round(S.Lab.exactChance(st, null, t.id) * 100)}%`)),
          el('button', { type: 'button', class: 'btn small', id: `recal-${t.id}`, disabled: cal >= 100 || st.cash < C.cost || st.bench.mins < C.mins,
            onclick: () => { const why = A.recalibrate(g.st, t.id); g.changed(); ui.toast(why || `${t.name} recalibrated.`); openGear(g); } },
            cal >= 100 ? 'True' : `Recalibrate · ${dur(C.mins)} · ${money(C.cost)}`));
      }))),
      el('p', { class: 'note' }, `A drifting instrument still tells the truth, just less often exactly.${st.research.done.includes('manual') ? ' Your calibration manual halves the drift.' : ''}`),
      section('Equipment', 'Upgrades', el('div', { class: 'rows' }, rows.map(r => {
        const lv = st.upgrades[r.key] || 0, cost = A.upgradeCostOf(r.key, lv);
        return el('article', { class: 'row-card' },
          el('div', { class: 'row-text' }, el('strong', {}, `${r.name}${lv ? ` · Lv ${lv}` : ''}`),
            el('span', {}, lv ? r.perks[lv - 1] : 'Not installed. Hears the trait an anomaly is built around, which is what factions shop for.')),
          lv >= 3 ? el('span', { class: 'chip' }, 'Maxed') :
            el('button', { type: 'button', class: 'btn small', id: `upgrade-${r.key}`, disabled: st.cash < cost,
              onclick: () => { const why = A.upgrade(g.st, r.key); g.changed(); ui.toast(why || (lv ? 'Upgrade installed.' : 'Installed.')); openGear(g); } },
              `${lv ? `Lv ${lv + 1}` : 'Buy'} · ${money(cost)}`));
      }))),
    ],
    actions: [{ label: 'Step away', kind: 'quiet', onClick: () => ui.close() }],
  });
}
