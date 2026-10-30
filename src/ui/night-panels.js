// Night panels: choosing a zone and packing, the fight (the original Combat,
// one round per tap), the bag with its secured slots, the end of a run, and the
// basement's containment cells.

import { formatDate } from '../game/calendar.js';
import { el } from './ui.js';
import { itemArt, iconSvg } from './glyphs.js';
import { S } from '../rules/index.js';
import * as N from '../rules/night.js';
import { cue } from '../rules/cues.js';

const { DATA } = S;
const money = n => S.money(n);

// ---------- choosing a zone ----------

export function openZones(g, onEnter, onBack, extra = {}) {
  const { ui } = g, st = g.st;
  const zones = N.nightZones(st);
  const pack = Object.entries(DATA.kit).filter(([, k]) => k.run);
  ui.open({
    id: 'zones', size: 'wide', eyebrow: `Night · energy ${st.energy}/${st.maxEnergy} · stress ${st.stress}`, title: 'Where tonight?',
    reason: 'night', dismissable: false,
    body: [
      el('details', { class: 'notes rules' },
        el('summary', {}, 'Climb out where you came in to keep everything.'),
        el('p', { class: 'note' }, 'The zone clock starts when you go in. If the night runs out you lose a third of what you carry; if your nerve breaks you lose half and someone sees you. Secured finds are always safe.')),
      // Phase 29: Kristen's shield, if you're close enough for her to have taught you.
      extra.shield ? el('p', { class: 'note shield-note' }, `Kristen’s shield: the first ${extra.shield} stress you take tonight won’t touch your nerve. It soaks up scares, hazards and hits first, and can save you from a knockout. Watch the blue Shield bar.`) : null,
      el('div', { class: 'rows' }, zones.map(z => {
        const block = N.enterBlocker(st, z), scouted = st.city?.scouted?.[z.id] === st.day;
        return el('article', { class: `row-card ${z.secret ? 'secret-zone' : ''}` }, iconSvg(z.icon, 'px-icon'),
          el('div', { class: 'row-text' }, el('strong', {}, z.name), el('span', {}, z.sub),
            el('small', {}, `Danger ${'▮'.repeat(z.danger)}${'▯'.repeat(4 - z.danger)} · ${z.energy} energy${scouted ? ' · scouted today' : ''}`),
            block ? el('small', { class: 'warnline' }, block) : null),
          el('button', { type: 'button', class: `btn small ${block ? '' : 'primary'}`, id: `zone-${z.id}`, disabled: !!block, onclick: () => onEnter(z.id) }, z.secret ? 'Open the door' : 'Go in'));
      })),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Pack for the run'),
        pack.map(([key, k]) => el('label', { class: 'toggle', for: `pack-${key}` },
          el('span', {}, `${k.name} ×${st.kit[key]}`, el('small', { class: 'block-note' }, k.note)),
          el('input', { type: 'checkbox', id: `pack-${key}`, checked: !!st.pack[key], disabled: !(st.kit[key] > 0), onchange: e => { st.pack[key] = e.target.checked; } })))),
    ],
    actions: [{ label: 'Back', kind: 'quiet', onClick: onBack }],
  });
}

// Phase 30 (the flow): there is no "where tonight?" menu. After dark you go to the place itself; at its door this card
// shows what is in there and lets you pack for it. onEnter(zoneId) starts the run.
export function openZoneDoor(g, zone, onEnter, extra = {}) {
  const { ui } = g, st = g.st;
  const pack = Object.entries(DATA.kit).filter(([, k]) => k.run);
  const block = N.enterBlocker(st, zone);
  ui.open({
    id: 'zone-door', eyebrow: `${extra.eyebrow ?? 'Night'} · energy ${st.energy}/${st.maxEnergy} · stress ${st.stress}`, title: zone.name,
    body: [
      iconSvg(zone.icon, 'px-icon'),
      el('p', {}, zone.sub),
      el('p', { class: 'note' }, `Danger ${'▮'.repeat(zone.danger)}${'▯'.repeat(4 - zone.danger)} · ${zone.energy} energy. Climb out where you came in to keep everything. If the night runs out you lose a third of what you carry; if your nerve breaks you lose half and some Heat.`),
      extra.shield ? el('p', { class: 'note shield-note' }, `Kristen’s shield: the first ${extra.shield} stress you take tonight won’t touch your nerve.`) : null,
      block ? el('p', { class: 'note warnline', id: 'zone-block' }, block) : null,
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Pack for the run'),
        pack.map(([key, k]) => el('label', { class: 'toggle', for: `pack-${key}` },
          el('span', {}, `${k.name} ×${st.kit[key]}`, el('small', { class: 'block-note' }, k.note)),
          el('input', { type: 'checkbox', id: `pack-${key}`, checked: !!st.pack[key], disabled: !(st.kit[key] > 0), onchange: e => { st.pack[key] = e.target.checked; } })))),
    ],
    actions: [
      { id: `zone-${zone.id}`, label: zone.secret ? 'Open the other door' : 'Go in', kind: block ? '' : 'primary', disabled: !!block, onClick: () => onEnter(zone.id) },
      { label: 'Not tonight', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}

// ---------- the fight ----------

export function openFight(g, { onEnd, onKnockout }) {
  const { ui } = g;
  const render = () => {
    const st = g.st, run = st.run, f = run?.encounter;
    if (!f) return;
    const sp = S.Combat.byId(f.sid), e = S.Combat.entry(st, sp.id), T = DATA.combat.tiers;
    const m = S.Combat.move(sp, f.next);
    const exact = S.Combat.knows(st, sp.id, 'telegraph');
    const fx = [m.stress && `+${m.stress} stress`, m.stamina && `−${m.stamina} stamina`, m.battery && `−${m.battery}% light`, m.heal && `it recovers ${m.heal}`, m.steal && 'steals from your bag', m.restrain && 'you can’t run'].filter(Boolean).join(', ');
    const weak = S.Combat.knowsWeak(st, sp.id), resist = S.Combat.knowsResist(st, sp.id);
    const capBlock = S.Combat.captureBlocker(st, f);
    const act = (action, arg) => {
      const before = st.run;
      const r = N.fight(st, action, arg);
      g.changed();
      if (!r) return;
      if (!st.run) { ui.close(); onKnockout(before); return; }
      if (r.ended) { ui.close(); onEnd(r.note); return; }
      render();
    };
    ui.open({
      id: 'fight', size: 'wide', eyebrow: `${S.zoneOf(run.zoneId).name} · round ${f.turn}`, title: sp.name, reason: 'fight', dismissable: false,
      body: [
        el('div', { class: 'foe' },
          el('span', { class: 'foe-art' }, iconSvg(sp.icon)),
          el('div', { class: 'foe-meta' },
            el('div', { class: 'meter-row' }, el('span', { class: 'label' }, 'Presence'), el('div', { class: 'progress big' }, el('i', { class: 'low', style: `width:${(f.presence / f.max) * 100}%` })), el('b', { class: 'mono' }, `${f.presence}/${f.max}`)),
            el('div', { class: 'meter-row' }, el('span', { class: 'label' }, 'Research'), el('div', { class: 'progress big' }, el('i', { style: `width:${e.research}%` })), el('b', { class: 'mono' }, `${e.research}%`)),
            el('p', { class: 'note' }, [weak ? `Weak to ${DATA.combat.attacks[sp.weak].name.toLowerCase()}.` : `Research ${T.weak}% to learn its weakness.`, resist ? ` Shrugs off ${DATA.combat.attacks[sp.resist].name.toLowerCase()}.` : ''].join('')))),
        el('div', { class: 'telegraph' }, el('span', { class: 'label' }, 'Next'),
          el('p', {}, el('i', {}, m.tell), exact ? el('b', {}, ` ${m.name}: ${fx}.`) : el('span', { class: 'note' }, ` Research ${T.telegraph}% to read exactly what it will do.`))),
        el('div', { class: 'fight-grid' },
          btn('fight-scan', 'Scan', 'Research it', () => act('scan')),
          ...Object.entries(DATA.combat.attacks).map(([tool, A]) => {
            const info = S.Combat.attackInfo(st, sp.id, tool);
            const tag = info.known ? (info.mult > 1 ? ' · weak!' : info.mult < 1 ? ' · resists' : '') : '';
            const cost = A.battery ? `${A.battery}% light` : A.salt ? `${A.salt} salt` : 'wears EMF';
            return btn(`fight-${tool}`, A.name, info.block || `${info.dmg} dmg${tag} · ${cost}`, () => act('attack', tool), !!info.block, info.known && info.mult > 1);
          }),
          btn('fight-brace', 'Brace', 'Take less, keep your bag', () => act('brace')),
          btn('fight-capture', 'Capture', capBlock || `${Math.round(S.Combat.captureChance(st, f) * 100)}% · uses a jar`, () => act('capture'), !!capBlock),
          btn('fight-flee', 'Flee', f.restrained ? 'Restrained' : `${Math.round(S.Combat.fleeChance(st, f) * 100)}% · ${DATA.combat.flee.stamina} stamina`, () => act('flee'), !!f.restrained),
          btn('fight-offer', 'Offer a find', run.bag.length ? 'It takes one at random' : 'Nothing in the bag', () => act('offer'), !run.bag.length)),
        f.log.length ? el('ul', { class: 'fightlog' }, f.log.map(t => el('li', {}, t))) : null,
        el('div', { class: 'you' },
          el('span', {}, `Stress ${st.stress}`), el('span', {}, `Stamina ${run.stamina}`), el('span', {}, `Light ${st.battery}%`), el('span', {}, `Salt ${st.supplies.salt}`), el('span', {}, `Jars ${st.kit.jar}`),
          f.restrained ? el('span', { class: 'warnline' }, 'Restrained') : null),
      ],
      actions: [],
    });
  };
  render();
}

function btn(id, label, sub, onclick, disabled = false, hot = false) {
  return el('button', { type: 'button', class: `fight-btn ${hot ? 'hot' : ''}`, id, disabled, onclick }, el('strong', {}, label), el('small', {}, sub));
}

// ---------- the bag ----------

export function openBag(g, onBack) {
  const { ui } = g, st = g.st, run = st.run;
  if (!run) return onBack();
  const slots = N.secureSlots(st);
  const row = (it, secured) => el('article', { class: 'row-card' }, itemArt(it, 'item-art sm'),
    el('div', { class: 'row-text' }, el('strong', {}, S.Items.name(it)), el('span', {}, `Surface estimate ${money(S.Items.estimate(it))}`)),
    secured
      ? el('button', { type: 'button', class: 'btn small', id: `unsecure-${it.uid}`, onclick: () => { N.unsecure(st, it.uid); openBag(g, onBack); } }, 'Unsecure')
      : el('button', { type: 'button', class: 'btn small primary', id: `secure-${it.uid}`, disabled: run.secured.length >= slots, onclick: () => { N.secure(st, it.uid); openBag(g, onBack); } }, 'Secure'));
  ui.open({
    id: 'bag', eyebrow: `${N.carried(run)} of ${S.Crawl.bagCap(st)} carried`, title: 'Your bag',
    body: [
      el('p', { class: 'note' }, `Secured finds can’t be dropped, stolen or lost, whatever happens. ${slots} secure slot${slots === 1 ? '' : 's'} (more with a bigger bag).`),
      run.secured.length ? el('div', { class: 'rows' }, run.secured.map(it => row(it, true))) : null,
      run.bag.length ? el('div', { class: 'rows' }, run.bag.map(it => row(it, false))) : el('p', {}, 'Nothing loose in the bag.'),
    ],
    actions: [{ label: 'Back', kind: 'primary', onClick: onBack }],
  });
}

// ---------- the end of a run ----------

export function openRunEnd(g, result, onHome) {
  const { ui } = g, st = g.st;
  const title = { exit: 'You climb out', clock: 'The night runs out', knockout: 'Your nerve breaks' }[result.how] || 'Out';
  const line = st.log[0]?.text;
  ui.open({
    id: 'runend', eyebrow: `${formatDate(st.day)} · Night`, title, reason: 'night', dismissable: false,
    body: [
      line ? el('p', {}, line) : null,
      result.how === 'clock' && result.lost ? el('p', { class: 'note warnline' }, `Dropped ${result.lost} find${result.lost === 1 ? '' : 's'} on the way out.`) : null,
      result.how === 'knockout' ? el('p', { class: 'note warnline' }, `You dropped half of what wasn’t secured. +${3} Heat.`) : null,
      el('dl', { class: 'readout' },
        el('dt', {}, 'Stress'), el('dd', {}, String(st.stress)),
        el('dt', {}, 'Heat'), el('dd', {}, String(st.heat)),
        el('dt', {}, 'Basement'), el('dd', {}, `${st.inventory.loot.length} waiting to be tested`),
        el('dt', {}, 'Cells'), el('dd', {}, `${st.containment.length} of ${S.Containment.cap(st)}`)),
    ],
    actions: [{ id: 'head-home', label: 'Head home to bed', kind: 'primary', onClick: onHome }],
  });
}

// ---------- the basement's cells ----------

export function openCellsStation(g) {
  const { ui } = g, st = g.st, K = DATA.containment;
  let confirm = null;
  const render = () => {
    const cap = S.Containment.cap(st);
    ui.open({
      id: 'cells', size: 'wide', eyebrow: `Station · Cells · ${st.containment.length} of ${cap}`, title: 'Containment',
      body: [
        el('p', { class: 'note' }, `Seals weaken every night. A breakout costs ${K.breakout.stress} stress and ${K.breakout.heat} Heat. Selling a captive draws a little Heat.`),
        st.containment.length ? el('div', { class: 'rows' }, st.containment.map(c => {
          const sp = S.Combat.byId(c.sid), z = S.zoneOf(sp.zone), decay = K.decay.base + K.decay.perDanger * z.danger;
          const hb = S.Containment.harvestBlocker(st, c);
          const done = (msg, sfx) => { cue(sfx); g.changed(); ui.toast(msg); render(); };
          return el('article', { class: 'row-card cell' }, iconSvg(sp.icon, 'px-icon'),
            el('div', { class: 'row-text' }, el('strong', {}, sp.name), el('span', {}, `Caught day ${c.day} in ${z.name}`),
              el('div', { class: 'progress' }, el('i', { class: c.stability > 60 ? 'good' : c.stability > K.warnAt ? 'mid' : 'low', style: `width:${c.stability}%` })),
              el('small', { class: c.stability - decay <= 0 ? 'warnline' : '' }, `Seals ${c.stability}% · lose ${decay}% a night${c.stability - decay <= 0 ? ' · breaks out tonight unless re-salted' : ''}`),
              el('div', { class: 'btnrow' },
                el('button', { type: 'button', class: 'btn small', id: `feed-${c.uid}`, disabled: c.stability >= 100 || !!S.Lab.missing(st, K.feed.cost), onclick: () => S.Containment.feed(st, c.uid) && done('Seals re-salted', 'seal') }, `Re-salt +${K.feed.amount}%`),
                el('button', { type: 'button', class: 'btn small', id: `harvest-${c.uid}`, disabled: !!hb, onclick: () => S.Containment.harvest(st, c.uid) && done('+1 essence', 'craft') }, hb || `Draw essence · ${S.dur(K.harvest.mins)}`),
                ...S.Containment.buyers(st, sp).map(f => el('button', { type: 'button', class: 'btn small', id: `sell-${c.uid}-${f}`, onclick: () => { const p = S.Containment.sell(st, c.uid, f); if (p) done(`Sold for ${money(p)}`, 'coins'); } }, `Sell to ${S.byId(DATA.factions, f).name} · ${money(S.Containment.price(st, sp, f))}`)),
                el('button', { type: 'button', class: `btn small ${confirm === c.uid ? 'danger' : 'quiet'}`, id: `release-${c.uid}`, onclick: () => { if (confirm !== c.uid) { confirm = c.uid; return render(); } confirm = null; S.Containment.release(st, c.uid) && done('Released', 'run'); } }, confirm === c.uid ? 'Tap again to release' : 'Release'))));
        })) : el('p', {}, 'Empty. Wear something down on a night run, then use a jar.'),
      ],
      actions: [{ label: 'Step away', kind: 'quiet', onClick: () => ui.close() }],
    });
  };
  render();
}
