// The campaign around the days: the original's opening cards, the morning recap,
// letters and ledger pages, the pledge, your standing and the rent, hiding the
// basement, and the audit with its endings. All text is Second Sight Pawn's own.

import { el } from './ui.js';
import { iconSvg, itemArt } from './glyphs.js';
import { S } from '../rules/index.js';
import * as A from '../rules/actions.js';
import { openCreator } from './creator.js';
import { BACKGROUNDS } from '../data/backgrounds.js';
import { CLASSIC_LOOK } from '../engine/figure.js';
import * as C from '../game/calendar.js';
import * as Y from '../rules/year.js';

const SEASON_BLURBS = {
  spring: 'The thaw. Rainy days, and people clearing out their attics.',
  summer: 'Long, clear days and busy streets, broken by thunderstorms.',
  autumn: 'Fog off the harbor and steady rain. How the story always began.',
  winter: 'Snow and short days. A slow, quiet start.',
};

const { DATA } = S;
const money = n => S.money(n);
const fill = (t, v) => S.fill(t, v);

// ---------- the opening ----------

// The last card offers Mina's walkthrough (the evening before Day 1) or skipping straight to the morning.
export function runOpening(ui, onDone, onBack = null) {
  // v2.0: one kind of game. No mode or difficulty to choose: you pick the season you take over in.
  const I = DATA.intro, pick = { mode: 'campaign', difficulty: 'medium', season: 'autumn', name: '', ride: 'foot', walkthrough: true, look: { ...CLASSIC_LOOK }, background: null };
  const vars = () => ({ name: pick.name || 'Owner', shop: DATA.shopName, days: '' });

  // A card of choices: tapping one selects it, Continue confirms it, Back goes back.
  const choose = ({ eyebrow, title, size, intro, key, options, next, back, okId }) => {
    const render = () => ui.open({
      id: 'intro', size, eyebrow, title, reason: 'title', dismissable: false,
      body: [intro ? el('p', {}, intro) : null, el('div', { class: 'rows', role: 'radiogroup', 'aria-label': title },
        options.map(o => el('button', {
          type: 'button', role: 'radio', class: `choice ${pick[key] === o.id ? 'on' : ''}`, id: o.domId, 'aria-checked': String(pick[key] === o.id),
          onclick: () => { pick[key] = o.id; o.also?.(); render(); },
        }, ...o.content.map(n => n.cloneNode(true)))))],   // copies: moving the originals would empty the card on screen
      actions: [
        { id: okId, label: 'Continue', kind: 'primary', disabled: !options.some(o => o.id === pick[key]), onClick: next },
        ...(back ? [{ label: 'Back', kind: 'quiet', onClick: back }] : []),
      ],
    });
    render();
  };

  const season = () => choose({
    eyebrow: 'New game', title: 'When do you take over the shop?', key: 'season', okId: 'season-ok', back: onBack, next: () => creator(),
    intro: 'The Office inspects the shop at the start of every season. Fail three in a year and they close it.',
    options: C.SEASONS.map(k => {
      const start = C.seasonStartIso(k);
      return { id: k, domId: `season-${k}`, content: [el('strong', {}, `${C.SEASON_NAMES[k]} · ${C.formatIso(start)}`), el('span', {}, SEASON_BLURBS[k]),
        el('small', {}, `First inspection ${C.formatIso(C.nextSeasonIso(start), { year: false })}`)] };
    }),
  });

  // Phase 12: your look, then who you were before the shop.
  const creator = () => openCreator(ui, {
    look: pick.look,
    onDone: look => { pick.look = look; background(); },
    onBack: look => { pick.look = look; season(); },
  });

  const background = () => choose({
    eyebrow: 'New game · You', title: 'Before the shop, you were…', size: 'wide', key: 'background', okId: 'bg-ok',
    back: creator, next: () => nameCard(),
    options: BACKGROUNDS.map(b => ({ id: b.id, domId: `bg-${b.id}`, content: [el('strong', {}, b.name), el('span', {}, b.blurb), el('small', {}, b.perk)] })),
  });

  const nameCard = () => {
    const input = el('input', { type: 'text', id: 'owner-name', maxlength: '24', placeholder: I.nameCard.placeholder, value: pick.name, autocomplete: 'off', 'aria-label': I.nameCard.placeholder });
    const sign = () => { pick.name = input.value.trim().slice(0, 24) || 'Owner'; story(0); };
    ui.open({
      id: 'intro', eyebrow: I.nameCard.eyebrow, title: I.nameCard.title, reason: 'title', dismissable: false,
      body: [el('p', {}, I.nameCard.text), input],
      actions: [{ id: 'name-ok', label: 'Sign', kind: 'primary', onClick: sign }, { label: 'Back', kind: 'quiet', onClick: () => { pick.name = input.value.trim(); background(); } }],
    });
    setTimeout(() => input.focus(), 50);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sign(); } });
  };

  const story = i => {
    const card = I.backstory[i];
    if (!card) return ride();
    ui.open({
      id: 'intro', eyebrow: i === 0 && card.eyebrow === DATA.shopName ? 'How it started' : card.eyebrow, title: i === 0 ? DATA.shopName : '', reason: 'title', dismissable: false,
      body: [el('p', { class: 'story' }, fill(card.text, vars()))],
      actions: [{ id: 'story-next', label: 'Next', kind: 'primary', onClick: () => story(i + 1) },
        { label: 'Back', kind: 'quiet', onClick: () => (i === 0 ? nameCard() : story(i - 1)) }],
    });
  };

  const ride = () => choose({
    eyebrow: I.rideCard.eyebrow, title: I.rideCard.title, size: 'wide', intro: I.rideCard.text, key: 'ride', okId: 'ride-ok',
    back: () => story(I.backstory.length - 1), next: () => notice(),
    options: DATA.rideOrder.map(id => {
      const r = DATA.rides[id];
      return { id, domId: `ride-${id}`, content: [el('span', { class: 'choice-head' }, iconSvg(r.icon, 'px-icon'), el('strong', {}, r.name)), el('span', {}, r.pitch), el('small', { class: 'warnline' }, r.catch)] };
    }),
  });

  const finish = walkthrough => onDone({ ...pick, walkthrough, name: pick.name || 'Owner' });
  const startButtons = () => [
    { id: 'open-up', label: 'Head to the shop', kind: 'primary', onClick: () => finish(true) },
    { id: 'skip-walkthrough', label: 'Skip the walkthrough', onClick: () => finish(false) },
    { label: 'Back', kind: 'quiet', onClick: ride },
  ];
  const startNote = () => el('p', { class: 'note' }, 'Mina, who ran the counter for your parents, is waiting to show you how the place works. Skip it if you know the ropes.');

  const notice = () => {
    const N = I.notice;
    ui.open({
      id: 'intro', eyebrow: N.eyebrow, title: N.title, reason: 'title', dismissable: false,
      body: [el('p', { class: 'note' }, N.from), el('p', { class: 'document' }, noticeText()), el('p', {}, N.after), startNote()],
      actions: startButtons(),
    });
  };

  // The year's own notice, in the Office's voice.
  const noticeText = () => `${DATA.shopName}, licensee ${pick.name || 'Owner'}. This establishment will be inspected at the start of every season, beginning ${C.formatIso(C.nextSeasonIso(C.seasonStartIso(pick.season)))}. Premises that fail three inspections in one year will be closed and their contents seized.`;

  season();
}

// ---------- mornings ----------

// Recap, then each letter or page in the inbox, then the pledge if it's due. Then `next`.
export function runMorning(g, extra, next) {
  const { ui } = g, st = g.st;
  const steps = [];
  if (st.recap && st.day > 1) steps.push(done => recapCard(g, extra, done));
  // v2.0: the Office's news (an inspection, a re-inspection, the review extended, a new year).
  for (const x of Y.takeInbox(st)) steps.push(done => yearCard(g, x, done));
  const inboxStep = done => {
    if (!st.story.inbox.length) return done();
    letterCard(g, () => inboxStep(done));
  };
  steps.push(inboxStep);
  steps.push(done => (st.story.pledgeDue && !st.story.pledge ? pledgeCard(g, done) : done()));
  if (S.Endless.on(st)) {
    steps.push(done => (st.endless.newRank !== null && st.endless.newRank !== undefined ? rankCard(g, done) : done()));
    steps.push(done => (st.endless.commission?.day === st.day ? commissionCard(g, done) : done()));
    steps.push(done => (st.endless.estate?.day === st.day ? estateCard(g, done) : done()));
  }
  const run = i => (i < steps.length ? steps[i](() => run(i + 1)) : next());
  run(0);
  void ui;
}

// ---------- the year (v2.0) ----------

const SEASON_LABEL = k => C.SEASON_NAMES[k] ?? k;
function checksTable(rows) {
  return el('div', { class: 'xref-wrap' }, el('table', { class: 'xref audit' },
    el('tbody', {}, rows.map(c => el('tr', { class: c.skipped ? 'out' : '' }, el('th', { scope: 'row' }, c.label), el('td', {}, String(c.value)), el('td', { class: c.pts > 0 ? 'match' : c.pts < 0 ? 'miss' : 'unk' }, c.pts > 0 ? `+${c.pts}` : String(c.pts)))))));
}
function yearCard(g, x, done) {
  const { ui } = g, st = g.st;
  const ok = [{ id: 'year-ok', label: 'Morning', kind: 'primary', onClick: done }];
  if (x.kind === 'audit') {
    const body = [checksTable(x.rows), el('p', { class: `stamp stamp-${x.pass ? 'cleared' : x.outcome}` }, x.pass ? 'PASSED' : 'FAILED')];
    if (x.pass) {
      body.push(el('p', {}, `The inspectors went through the storefront, the back case and the basement, and signed off. A rebate of ${money(x.rebate)} came with the paperwork, and the Office thinks a little better of you.`));
      if (x.lifted?.length) body.push(el('p', { class: 'note' }, `Lifted: ${x.lifted.map(id => Y.RESTRICTIONS[id].name.toLowerCase()).join(', ')}.`));
    } else {
      body.push(el('p', {}, `Failed: ${x.strikes} of ${Y.YEAR.strikesToClose} this year. A third failure this year and the Office closes the shop.`));
      body.push(el('dl', { class: 'readout' }, el('dt', {}, 'Fine'), el('dd', { class: 'neg' }, `${money(x.fine)} · owed ${money(st.year.fine.owed)}`),
        ...x.restrict.flatMap(id => [el('dt', {}, 'Restriction'), el('dd', {}, `${Y.RESTRICTIONS[id].name}. ${Y.RESTRICTIONS[id].text}`)])));
      body.push(el('p', { class: 'note' }, 'Pay the fine (all at once or a bit at a time) from the ledger, put things right, then ask for a re-inspection to lift the restrictions. An unpaid fine counts against you at the next inspection.'));
    }
    return ui.open({ id: 'year-audit', size: 'wide', eyebrow: `${C.formatDate(x.day, { long: true })} · the ${SEASON_LABEL(x.season).toLowerCase()} inspection`, title: x.pass ? 'Passed inspection' : 'Failed inspection', reason: 'morning', dismissable: false, body,
      actions: [...(x.pass ? [] : [{ id: 'year-ledger', label: 'The ledger', onClick: () => openStanding(g, () => yearCard(g, x, done)) }]), ...ok] });
  }
  if (x.kind === 'reinspect') {
    return ui.open({ id: 'year-reinspect', size: 'wide', eyebrow: `${C.formatDate(x.day, { long: true })} · re-inspection`, title: x.pass ? 'Restrictions lifted' : 'Still on notice', reason: 'morning', dismissable: false,
      body: [checksTable(x.rows), el('p', {}, x.pass ? 'The inspector went over everything again and signed the release. You can trade as usual.' : `Not good enough yet. The restrictions stay, and you can ask again from ${C.formatDate(st.year.reinspect.after)}.`)], actions: ok });
  }
  if (x.kind === 'extended') {
    return ui.open({ id: 'year-extended', eyebrow: 'Office of Anomalous Property', title: 'Review extended', reason: 'morning', dismissable: false,
      body: [el('p', { class: 'document' }, `${DATA.shopName}, licensee ${st.player.name}. The Office’s review of this establishment is not complete. It has been extended by one year. Final review: ${C.formatDate(x.finale, { long: true, year: true })}. Seasonal inspections continue.`),
        el('p', { class: 'note' }, 'There is still more to find out about your parents and the shop. You have one more year, and when the final review comes, it comes regardless. The neighborhood forgets fast: the shop’s name will need keeping up.')], actions: ok });
  }
  if (x.kind === 'newyear') {
    return ui.open({ id: 'year-new', eyebrow: C.formatDate(x.day, { long: true, year: true }), title: `Year ${x.year}`, reason: 'morning', dismissable: false,
      body: [el('p', {}, `A year since you took over the shop${x.year > 2 ? ' again' : ''}. The Office starts a fresh file: failed inspections from last year no longer count against you.`)], actions: ok });
  }
  return done();
}

function recapCard(g, extra, done) {
  const { ui } = g, st = g.st, r = st.recap;
  const net = r.cash.end - r.cash.start;
  ui.open({
    id: 'recap', size: 'wide', eyebrow: `${C.formatDate(r.day)} · the ledger`, title: r.mood === 'good' ? 'A good day' : r.mood === 'bad' ? 'A hard day' : 'A quiet day', reason: 'morning', dismissable: false,
    body: [
      el('dl', { class: 'readout' },
        el('dt', {}, 'Cash'), el('dd', { class: net >= 0 ? 'pos' : 'neg' }, `${money(r.cash.start)} → ${money(r.cash.end)}`),
        el('dt', {}, 'Heat'), el('dd', { class: r.heat.end > r.heat.start ? 'neg' : '' }, `${r.heat.start} → ${r.heat.end}`),
        r.cash.rent ? el('dt', {}, 'Rent') : null, r.cash.rent ? el('dd', { class: r.cash.short ? 'neg' : '' }, `${money(r.cash.rent)} paid${r.cash.short ? ', and still short' : ''}`) : null,
        r.shop ? el('dt', {}, 'The shop') : null, r.shop ? el('dd', {}, `${r.shop.sold} sold for ${money(r.shop.revenue)}`) : null,
        r.finds ? el('dt', {}, 'Finds') : null, r.finds ? el('dd', {}, String(r.finds)) : null,
        ...(r.runs || []).flatMap(x => [el('dt', {}, 'Night run'), el('dd', { class: x.panic ? 'neg' : '' }, `${x.zone}: ${x.n} find${x.n === 1 ? '' : 's'}${x.panic ? ', ran out in a panic' : ''}`)]),
        r.endless ? el('dt', {}, 'Rank') : null, r.endless ? el('dd', { class: r.endless.gain > 0 ? 'pos' : r.endless.gain < 0 ? 'neg' : '' }, `${r.endless.rank} · ${r.endless.gain >= 0 ? '+' : ''}${r.endless.gain} points`) : null,
        r.audit ? el('dt', {}, Y.on(st) ? 'Inspection' : 'Audit') : null, r.audit ? el('dd', { class: r.audit.standing === 'trouble' ? 'neg' : r.audit.standing === 'track' ? 'pos' : '' }, `in ${Y.on(st) ? Y.daysToAudit(st) : r.audit.left} day${(Y.on(st) ? Y.daysToAudit(st) : r.audit.left) === 1 ? '' : 's'} · ${{ track: 'on track', shaky: 'shaky', trouble: 'in trouble' }[r.audit.standing]}`) : null),
      r.best ? el('p', { class: 'note' }, `Best find: ${r.best.name} (${money(r.best.est)}), ${r.best.from}.`) : null,
      r.worst ? el('p', { class: 'note warnline' }, `Worst deal: ${r.worst.text}`) : null,
      extra?.jobs?.length ? el('ul', { class: 'newslist' }, extra.jobs.map(x => el('li', { class: `news ${x.kind}` }, el('span', {}, x.text), x.tag ? el('b', {}, x.tag) : null))) : null,
      st.overnight ? el('p', { class: 'note warnline' }, st.overnight) : null,
      st.overnightCells ? el('p', { class: 'note warnline' }, st.overnightCells) : null,
      el('p', { class: 'speech' }, r.line),
    ],
    actions: [{ id: 'recap-ok', label: 'Morning', kind: 'primary', onClick: done }],
  });
}

function letterCard(g, done) {
  const { ui } = g, st = g.st, x = st.story.inbox[0];
  const L = x.kind === 'letter' ? S.Story.letter(x.id) : null, P = x.kind === 'page' ? S.Story.page(x.id) : null;
  const vars = { name: st.player.name, shop: DATA.shopName, days: S.Calendar.daysLeft(st) };
  ui.open({
    id: 'letter', eyebrow: L ? 'A letter came' : `Your parents’ ledger · page ${st.story.pages.indexOf(x.id) + 1} of ${DATA.pages.length}`, title: L ? L.title : P.how, reason: 'morning', dismissable: false,
    body: L ? [el('p', { class: 'note' }, L.from), el('p', { class: 'document' }, fill(L.text, vars)), L.page ? el('p', { class: 'note' }, 'A loose page of your parents’ ledger was folded inside.') : null]
      : [el('p', { class: 'document hand' }, P.text)],
    actions: [{ id: 'letter-ok', label: st.story.inbox.length > 1 ? 'Next' : 'Put it away', kind: 'primary', onClick: () => { A.readLetter(st); g.changed(); done(); } }],
  });
}

function pledgeCard(g, done) {
  const { ui } = g, st = g.st, P = DATA.pledge;
  let confirm = null;
  const render = () => ui.open({
    id: 'pledge', size: 'wide', eyebrow: P.eyebrow, title: P.title, reason: 'morning', dismissable: false,
    body: [
      el('p', {}, P.text),
      el('div', { class: 'rows' }, [...Object.entries(P.offers), ['self', P.self]].map(([fac, text]) => {
        const f = fac === 'self' ? null : S.byId(DATA.factions, fac);
        const rv = f ? S.Rep.rival(fac) : null;
        return el('button', { type: 'button', class: `choice ${confirm === fac ? 'on' : ''}`, id: `pledge-${fac}`, onclick: () => {
          if (confirm !== fac) { confirm = fac; return render(); }
          A.pledge(st, fac); g.changed();
          ui.toast(fac === 'self' ? 'You signed nothing. The shop is yours.' : `Signed with ${S.midName(f.name)}.`, 3000);
          done();
        } },
          el('span', { class: 'choice-head' }, f ? iconSvg(fac, 'px-icon') : iconSvg('shop', 'px-icon'), el('strong', {}, f ? `${f.name} · ${S.repLabel(st.rep[fac])}` : 'Sign nothing')),
          el('span', {}, text),
          f && rv ? el('small', {}, `${S.byId(DATA.factions, rv).name} will take it personally.`) : null,
          confirm === fac ? el('small', { class: 'warnline' }, 'Tap again to sign. This can’t be undone.') : null);
      })),
    ],
    actions: [],
  });
  render();
}

// ---------- Endless: ranks, commissions, estate sales ----------

function rankCard(g, done) {
  const { ui } = g, st = g.st, R = DATA.endless.ranks[st.endless.newRank];
  ui.open({
    id: 'rank', eyebrow: 'The shop made a new rank', title: R.name, reason: 'morning', dismissable: false,
    body: [el('p', { class: 'stamp stamp-cleared' }, R.name.toUpperCase()), el('p', {}, R.perk)],
    actions: [{ id: 'rank-ok', label: 'Nice', kind: 'primary', onClick: () => { st.endless.newRank = null; done(); } }],
  });
}

function commissionCard(g, done) {
  const { ui } = g, st = g.st, c = st.endless.commission;
  const f = S.byId(DATA.factions, c.fac), a = S.byId(DATA.anomalies, c.anomalyId);
  ui.open({
    id: 'commission', eyebrow: `Commission · ${f.name}`, title: `One ${a.name}`, reason: 'morning', dismissable: false,
    body: [el('p', {}, `Tagged by name, within ${c.due - st.day} days. Pays ${money(c.pay)} and +${DATA.endless.commission.rep} standing. They test it on the spot, so a wrong name costs you ${-DATA.endless.commission.wrong} standing.`),
      el('p', { class: 'note' }, 'Name one in the lab, then hand it over from the ledger.')],
    actions: [{ id: 'commission-ok', label: 'Noted', kind: 'primary', onClick: done }],
  });
}

function estateCard(g, done) {
  const { ui } = g, st = g.st, e = st.endless.estate;
  ui.open({
    id: 'estate', size: 'wide', eyebrow: 'Estate sale · today only', title: e.who, reason: 'morning', dismissable: false,
    body: [el('p', {}, 'A whole box, sold as one lot. No haggling, no testing until it is yours.'),
      el('div', { class: 'rows' }, e.items.map(it => el('article', { class: 'row-card' }, itemArt(it, 'item-art sm'),
        el('div', { class: 'row-text' }, el('strong', {}, S.Items.name(it)), el('span', {}, `Surface estimate ${money(S.Items.estimate(it))}`)))))],
    actions: [
      { id: 'estate-buy', label: `Buy the box · ${money(e.price)}`, kind: 'primary', disabled: st.cash < e.price, onClick: () => { const r = A.buyEstate(st); g.changed(); if (r) ui.toast(`${r.items.length} things are waiting in the lab.`); done(); } },
      { id: 'estate-pass', label: 'Pass', kind: 'quiet', onClick: () => { A.passEstate(st); g.changed(); done(); } },
    ],
  });
}

function endlessSections(g, back) {
  const { ui } = g, st = g.st, E = st.endless, R = S.Endless.rank(st), Nx = S.Endless.nextRank(st), score = S.Endless.score(st);
  const pct = Nx ? S.clamp((score - R.at) / (Nx.at - R.at) * 100, 0, 100) : 100;
  const decay = S.Endless.heatDecay(st), c = E.commission;
  let confirmRetire = false;
  const out = [
    section('The shop’s rank', `${score.toLocaleString('en-US')} points`, [
      el('div', { class: 'meter-row' }, el('span', { class: 'label' }, R.name), el('div', { class: 'progress big' }, el('i', { style: `width:${pct}%` })), el('b', { class: 'mono' }, Nx ? `−${(Nx.at - score).toLocaleString('en-US')}` : 'top')),
      el('div', { class: 'rows' }, DATA.endless.ranks.slice(1).map((r, i) => el('article', { class: `row-card ${i + 1 <= E.rank ? 'mark-good' : ''}` },
        el('div', { class: 'row-text' }, el('strong', {}, `${r.name} · ${r.at.toLocaleString('en-US')}`), el('span', {}, r.perk))))),
      el('dl', { class: 'readout' },
        el('dt', {}, 'Office attention'), el('dd', {}, `Level ${S.Endless.attention(st)} · rises every ${DATA.endless.attentionEvery} days`),
        el('dt', {}, 'Heat each night'), el('dd', { class: decay < 0 ? 'neg' : '' }, decay > 0 ? `cools ${decay}` : decay < 0 ? `rises ${-decay}` : 'holds steady'),
        el('dt', {}, 'Inspector visits'), el('dd', {}, `from Heat ${S.Endless.inspectorHeat(st)}`),
        el('dt', {}, 'Rent'), el('dd', {}, `${money(st.rent.amount)} now${st.rent.amount < DATA.endless.rentCap ? ` · ${money(S.Endless.nextRent(st))} after the next rent day` : ' · as high as it goes'}`)),
      Object.keys(E.by).length ? el('dl', { class: 'readout' }, Object.entries(E.by).flatMap(([k, v]) => [el('dt', {}, DATA.endless.scoreNames[k] || k), el('dd', { class: v < 0 ? 'neg' : '' }, String(Math.round(v)))])) : null,
    ]),
  ];
  if (c) {
    const f = S.byId(DATA.factions, c.fac), a = S.byId(DATA.anomalies, c.anomalyId), left = c.due - st.day, cands = S.Endless.candidates(st);
    out.push(section(`Commission · ${f.name}`, left > 0 ? `${left} day${left === 1 ? '' : 's'} left` : 'Due today', [
      el('p', {}, `One ${a.name}, tagged by name. Pays ${money(c.pay)} and +${DATA.endless.commission.rep} standing. A wrong name costs you.`),
      cands.length ? el('div', { class: 'rows' }, cands.map(it => el('article', { class: 'row-card' }, itemArt(it, 'item-art sm'),
        el('div', { class: 'row-text' }, el('strong', {}, S.Items.name(it)), el('span', {}, `Tagged ${a.name} · tag ${money(it.price)}`)),
        el('button', { type: 'button', class: 'btn small primary', id: `commission-${it.uid}`, disabled: st.phase === 'night' && !!st.run, onclick: () => {
          const r = A.fulfilCommission(st, it.uid);
          if (r) { for (const [slot, uid] of Object.entries(g.world.displays)) if (uid === it.uid) delete g.world.displays[slot]; }
          g.changed(); if (r) ui.toast(r.right ? `Commission paid · ${money(r.pay)}` : `${r.fac} did not accept it`, 3000); openStanding(g, back);
        } }, 'Hand it over'))))
        : el('p', { class: 'note' }, `Nothing in the back case is tagged ${a.name} yet. Name one in the lab.`),
    ]));
  }
  const retireBox = el('div', {});
  const drawRetire = () => retireBox.replaceChildren(confirmRetire
    ? el('div', { class: 'notice warn' }, el('p', {}, `Close the shop for good? The run ends here, scored as it stands: ${score.toLocaleString('en-US')} points.`),
      el('div', { class: 'btnrow' },
        el('button', { type: 'button', class: 'btn danger small', id: 'retire-yes', onclick: () => { A.retire(st); g.changed(); } }, 'Retire'),
        el('button', { type: 'button', class: 'btn small quiet', onclick: () => { confirmRetire = false; drawRetire(); } }, 'Keep going')))
    : el('button', { type: 'button', class: 'btn quiet block', id: 'retire', disabled: !!st.run, onclick: () => { confirmRetire = true; drawRetire(); } }, 'Retire: close the shop for good'));
  drawRetire();
  out.push(retireBox);
  return out;
}

// ---------- standing, rent, the audit outlook ----------

export function openStanding(g, back) {
  const { ui } = g, st = g.st;
  const left = S.Calendar.daysLeft(st), hints = st.auditDay ? S.Audit.hints(st) : null;
  const name = S.Story.nameLabel(st);
  const facs = DATA.factions.filter(f => f.id !== 'civilian');
  ui.open({
    id: 'standing', size: 'wide', eyebrow: `${C.formatDate(st.day)}${Y.on(st) ? ` · inspection in ${Y.daysToAudit(st)} day${Y.daysToAudit(st) === 1 ? '' : 's'}` : left !== null ? ` · audit in ${left} day${left === 1 ? '' : 's'}` : S.Endless.on(st) ? ' · Endless' : ''}`, title: 'The ledger',
    body: [
      ...(S.Endless.on(st) ? endlessSections(g, back) : []),
      ...(Y.on(st) ? officeSections(g, back) : []),
      section('Rent', `${money(st.rent.amount)} every ${st.rent.every} days`, [
        el('dl', { class: 'readout' },
          el('dt', {}, 'Next due'), el('dd', {}, `${C.formatDate(st.rent.dueDay)} · ${money(S.Calendar.owed(st))}`),
          el('dt', {}, 'Back rent'), el('dd', { class: st.rent.arrears ? 'neg' : '' }, st.rent.arrears ? `${money(st.rent.arrears)} · ${st.rent.strikes} strike${st.rent.strikes === 1 ? '' : 's'}` : 'None'),
          el('dt', {}, 'Cash'), el('dd', {}, money(st.cash))),
        st.rent.arrears ? el('button', { type: 'button', class: 'btn primary block', id: 'pay-arrears', disabled: st.cash <= 0, onclick: () => { const p = A.payArrears(st); g.changed(); if (p) ui.toast(`Paid ${money(p)} toward back rent.`); openStanding(g, back); } }, `Pay back rent · up to ${money(Math.min(st.cash, st.rent.arrears))}`) : null,
        st.rent.arrears ? el('p', { class: 'note' }, 'While you owe, the landlord’s notice keeps some customers away. Short rent is never the end of the shop, but it adds Heat.') : null,
      ]),
      section('Standing', name ? `The shop: ${name}` : '', el('div', { class: 'rows' }, facs.map(f => el('article', { class: 'row-card' }, iconSvg(f.id, 'px-icon'),
        el('div', { class: 'row-text' }, el('strong', {}, `${f.name} · ${S.repLabel(st.rep[f.id])} (${st.rep[f.id] > 0 ? '+' : ''}${st.rep[f.id]})`), el('span', {}, f.desc),
          st.story.pledge === f.id ? el('small', { class: 'warnline' }, 'You signed with them.') : null))))),
      hints ? section(Y.on(st) ? 'Inspection outlook' : 'Audit outlook', { track: 'On track', shaky: 'Shaky', trouble: 'In trouble' }[hints.standing], el('div', { class: 'rows' }, hints.rows.map(h =>
        el('article', { class: `row-card mark-${h.mark}` }, el('div', { class: 'row-text' }, el('strong', {}, h.label), el('span', {}, h.text)))))) : null,
      S.Audit.hideOpen(st) ? section('Hide the basement', Y.on(st) ? 'Only before the final review' : 'Only in the last week', el('div', { class: 'rows' }, Object.entries(DATA.hide).filter(([k]) => k !== 'window').map(([how, H]) => {
        const block = S.Audit.hideBlocker(st, how);
        return el('article', { class: 'row-card' }, el('div', { class: 'row-text' }, el('strong', {}, `${H.name} · ${money(H.cost)}${H.scrap ? ` + ${H.scrap} scrap` : ''}${H.mins ? ` + ${S.dur(H.mins)} bench` : ''}`), el('span', {}, H.note), block ? el('small', { class: 'warnline' }, block) : null),
          el('button', { type: 'button', class: 'btn small', id: `hide-${how}`, disabled: !!block, onclick: () => { if (A.hideBasement(st, how)) { g.changed(); ui.toast(how === 'brick' ? 'The basement is bricked up.' : 'The call has been made.'); openStanding(g, back); } } }, 'Do it'));
      }))) : st.story.hidden ? el('p', { class: 'note warnline' }, st.story.hidden === 'brick' ? 'The basement door is bricked up.' : 'The basement is “under private review.”') : null,
      !S.Story.on(st) ? null : section('Your parents’ ledger', `${st.story.pages.length} of ${DATA.pages.length} pages`, st.story.pages.length ? el('div', { class: 'rows' }, st.story.pages.map(id => {
        const p = S.Story.page(id);
        return el('article', { class: 'row-card' }, el('div', { class: 'row-text' }, el('small', {}, p.how), el('span', { class: 'hand' }, p.text)));
      })) : el('p', { class: 'note' }, 'No pages yet.')),
      st.story.seen.length ? section('Letters', String(st.story.seen.length), el('div', { class: 'rows' }, st.story.seen.map(id => {
        const L = S.Story.letter(id);
        return el('details', { class: 'row-card letter' }, el('summary', {}, `${L.title} · ${L.from.split(' · ')[0]}`), el('p', {}, fill(L.text, { name: st.player.name, shop: DATA.shopName, days: S.Calendar.daysLeft(st) })));
      }))) : null,
    ],
    actions: [{ label: 'Back', kind: 'primary', onClick: back }],
  });
}

// v2.0: the Office, every season. Next inspection, this year's failures, the fine, the restrictions.
function officeSections(g, back) {
  const { ui } = g, st = g.st, Yr = st.year, a = Y.auditLine(st), strikes = Y.strikesThisYear(st), block = Y.reinspectBlocker(st);
  const finale = Y.finaleDay(st);
  const redo = () => openStanding(g, back);
  return [section('The Office', `${strikes} of ${Y.YEAR.strikesToClose} failed this year`, [
    el('dl', { class: 'readout' },
      el('dt', {}, 'Next inspection'), el('dd', {}, `${C.formatDate(a.day, { long: true })} · in ${a.left} day${a.left === 1 ? '' : 's'}`),
      el('dt', {}, 'This year'), el('dd', { class: strikes ? 'neg' : '' }, `Year ${Y.gameYear(st)} · ${strikes ? `${strikes} failed` : 'no failures'}`),
      finale ? el('dt', {}, 'Final review') : null, finale ? el('dd', {}, C.formatDate(finale, { year: true })) : null,
      Yr.finished ? el('dt', {}, 'The story') : null, Yr.finished ? el('dd', {}, 'Told. The shop goes on.') : null,
      el('dt', {}, 'Fine owed'), el('dd', { class: Yr.fine.owed ? 'neg' : '' }, Yr.fine.owed ? money(Yr.fine.owed) : 'None')),
    Yr.fine.owed ? el('div', { class: 'row-btns' },
      el('button', { type: 'button', class: 'btn primary', id: 'pay-fine', disabled: st.cash <= 0, onclick: () => { const p = Y.payFine(st); g.changed(); if (p) ui.toast(Yr.fine.owed ? `Paid ${money(p)}. Still owe ${money(Yr.fine.owed)}.` : 'The fine is paid.'); redo(); } }, `Pay ${money(Math.min(st.cash, Yr.fine.owed))}`),
      el('button', { type: 'button', class: 'btn', id: 'pay-fine-part', disabled: st.cash <= 0 || Yr.fine.owed <= 100, onclick: () => { const p = Y.payFine(st, Math.min(100, Yr.fine.owed)); g.changed(); if (p) ui.toast(`Paid ${money(p)} toward the fine.`); redo(); } }, `Pay ${money(100)}`)) : null,
    Yr.restrict.length ? el('div', { class: 'rows' }, Yr.restrict.map(id => el('article', { class: 'row-card mark-bad' }, el('div', { class: 'row-text' }, el('strong', {}, Y.RESTRICTIONS[id].name), el('span', {}, Y.RESTRICTIONS[id].text))))) : null,
    Yr.restrict.length ? el('button', { type: 'button', class: 'btn block', id: 'ask-reinspect', disabled: !!block, onclick: () => { if (Y.requestReinspection(st)) { g.changed(); ui.toast(`The Office will come back ${C.formatDate(Yr.reinspect.due)}.`); redo(); } } }, block ? `Re-inspection · ${block}` : `Ask for a re-inspection (${C.formatDate(st.day + Y.YEAR.reinspectDays)})`) : null,
    el('p', { class: 'note' }, 'A failed inspection costs a fine and brings restrictions until a re-inspection passes. Three failures in one year and the Office closes the shop.'),
  ])];
}

function scoreLine(st, go) {
  const score = go.score ?? S.Endless.score(st), rank = DATA.endless.ranks[go.rank ?? st.endless.rank];
  return el('p', { class: 'final-score' }, score.toLocaleString('en-US'), el('small', {}, ` points · ${rank.name}${go.best?.score ? ' · new best' : ''}`));
}

function section(title, aside, body) {
  return el('section', { class: 'lab-sec' }, el('div', { class: 'sec-title' }, el('span', {}, title), el('span', {}, aside || '')), body);
}

// ---------- endings ----------

export function runEnding(g, onNew, onContinue = null) {
  const { ui } = g, st = g.st, go = st.gameOver;
  const cards = [];
  if (go.type === 'audit') {
    const O = DATA.outcomes[go.outcome], e = go.ending;
    cards.push(() => ({
      eyebrow: go.strikes ? `${C.formatDate(go.day, { long: true })} · the third failed inspection` : go.year ? `${C.formatDate(go.day, { long: true })} · the final review` : `Day ${go.day} · the audit`, title: O.name, size: 'wide',
      body: [
        el('div', { class: 'xref-wrap' }, el('table', { class: 'xref audit' },
          el('tbody', {}, go.checks.map(c => el('tr', { class: c.skipped ? 'out' : '' }, el('th', { scope: 'row' }, c.label), el('td', {}, String(c.value)), el('td', { class: c.pts > 0 ? 'match' : c.pts < 0 ? 'miss' : 'unk' }, c.pts > 0 ? `+${c.pts}` : String(c.pts))))))),
        el('p', { class: `stamp stamp-${go.outcome}` }, O.stamp),
        el('p', {}, O.text),
      ],
    }));
    cards.push(() => ({ eyebrow: e.fac === 'self' ? 'The shop' : S.byId(DATA.factions, e.fac).name, title: 'What happened next', body: [el('p', { class: 'story' }, DATA.epilogues[e.fac][go.outcome])] }));
    if (e.kind === 'true') DATA.trueEnding.cards.forEach((t, i) => cards.push(() => ({ eyebrow: DATA.trueEnding.eyebrow, title: i === DATA.trueEnding.cards.length - 1 ? DATA.trueEnding.stamp : '', body: [el('p', { class: 'story' }, t)] })));
    else {
      const F = DATA.fates[e.fac];
      cards.push(() => ({ eyebrow: 'Your parents', title: e.maxed ? F.short : 'Unknown', body: [el('p', { class: 'story' }, e.maxed ? F.maxed : F.open)] }));
    }
    if (e.coda) cards.push(() => ({ eyebrow: 'Afterward', title: '', body: [el('p', { class: 'story' }, DATA.codas[e.coda])] }));
  } else if (go.type === 'retired') {
    cards.push(() => ({ eyebrow: `Day ${go.day} · Closing time`, title: 'Retired', body: [el('p', { class: 'story' }, 'You turn the sign to CLOSED for the last time. The bell over the door sticks, like always.'), scoreLine(st, go)] }));
  } else {
    cards.push(() => ({ eyebrow: `Day ${go.day} · Evening news`, title: 'Raided', body: [el('p', { class: 'story' }, go.reason), el('p', { class: 'stamp stamp-closed' }, 'SEIZED'), S.Endless.on(st) ? scoreLine(st, go) : null] }));
  }
  const rc = go.recap || S.Audit.recap(st), campaign = !S.Endless.on(st);
  cards.push(() => ({
    eyebrow: 'The evidence board', title: st.player.name, size: 'wide',
    body: [el('dl', { class: 'readout' },
      el('dt', {}, 'Days'), el('dd', {}, String(rc.days)),
      el('dt', {}, 'Sold'), el('dd', {}, String(rc.sold)),
      el('dt', {}, 'Bought'), el('dd', {}, String(rc.bought)),
      el('dt', {}, 'Night runs'), el('dd', {}, String(rc.runs)),
      el('dt', {}, 'Captured'), el('dd', {}, String(rc.captives)),
      el('dt', {}, 'Turned in'), el('dd', {}, String(rc.surrendered)),
      el('dt', {}, 'On the news'), el('dd', {}, String(rc.incidents)),
      ...(campaign ? [el('dt', {}, 'Pages found'), el('dd', {}, `${rc.pages} of ${DATA.pages.length}`),
        el('dt', {}, 'Signed with'), el('dd', {}, !rc.pledge ? 'No one' : rc.pledge === 'self' ? 'No one, on purpose' : S.byId(DATA.factions, rc.pledge).name)]
        : [el('dt', {}, 'Score'), el('dd', {}, (go.score ?? S.Endless.score(st)).toLocaleString('en-US')), el('dt', {}, 'Rank'), el('dd', {}, DATA.endless.ranks[go.rank ?? st.endless.rank].name)]),
      ...(st.year ? [el('dt', {}, 'Inspections'), el('dd', {}, `${st.year.audits.filter(a => a.pass).length} passed · ${st.year.audits.filter(a => !a.pass).length} failed`)] : []),
      el('dt', {}, 'Case files'), el('dd', {}, `${(st.cases || []).length} opened this run`),
      el('dt', {}, 'Cash'), el('dd', {}, money(rc.cash)),
      el('dt', {}, 'Ride'), el('dd', {}, rc.ride))],
    last: true,
  }));
  const show = i => {
    const c = cards[i]();
    ui.open({ id: `gameover-${i}`, size: c.size, eyebrow: c.eyebrow, title: c.title, reason: 'gameover', dismissable: false, body: c.body,
      actions: c.last
        ? [...(go.year?.canContinue && onContinue ? [{ id: 'keep-open', label: 'Keep the shop open', kind: 'primary', onClick: onContinue }] : []),
          { id: 'new-campaign', label: 'Start a new game', kind: go.year?.canContinue && onContinue ? 'quiet' : 'primary', onClick: onNew }]
        : [{ id: 'ending-next', label: 'Next', kind: 'primary', onClick: () => show(i + 1) }] });
  };
  show(0);
}
