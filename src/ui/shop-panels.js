// Shop panels: haggling with a seller at the counter, counter-offers at the till,
// putting tagged stock in the display cases, and the evening news at closing.
// All numbers and decisions come from Second Sight Pawn's own rules.

import { daysLeft, leftText } from '../game/appraisals.js';
import { formatDate } from '../game/calendar.js';
import { el } from './ui.js';
import { portraitFor, faceRow } from './portraits.js';
import { lookFor } from '../game/people.js';
import { itemArt, iconSvg } from './glyphs.js';
import { S } from '../rules/index.js';
import * as A from '../rules/actions.js';
import { SHOP_TIERS, hoursText } from '../data/shop-tiers.js';
import { ADS, STOREFRONT, COMFORTS, REGULARS } from '../data/marketing.js';
import { drawState, adOn, adBooked, owns, buy, buyBlocker, regulars, crowdSummary, defOf } from '../game/marketing.js';
import { shopState, nextStage, renovationBlocker, bookRenovation, stageFacts } from '../game/shop-growth.js';
import { ROLES, ROLE_ORDER } from '../data/staff.js';
import { staffState, hire, letGo, hireBlocker, roleOpen, todaysApplicant, wagesDue } from '../game/staff.js';
import { DECOR, CHARM } from '../data/decor.js';
import { layoutOf, decorMods, buyDecor, decorBlocker, ownedCount } from '../game/shop-layout.js';

const { DATA } = S;
export const money = n => S.money(n);

export function tagLine(it) {
  const claim = S.Shop.claimText(it);
  return el('span', { class: `tagline al-${it.appraisal?.alignment || 'none'}` }, iconSvg(it.appraisal?.alignment || 'unknown', 'px-icon sm'), `${claim} · ${money(it.price ?? 0)}`);
}

export function itemCard(it, extra = []) {
  return el('div', { class: 'item-card' },
    itemArt(it),
    el('div', { class: 'item-meta' },
      el('strong', {}, S.Items.name(it)),
      el('span', {}, `No. ${String(it.ticket).padStart(4, '0')} · ${S.Items.condLabel(it)} (${it.condition}%)`),
      ...extra));
}

const pips = (n, max) => el('span', { class: 'pips', 'aria-label': `Patience ${n} of ${max}` },
  Array.from({ length: max }, (_, i) => el('i', { class: i < n ? 'on' : '' })));

// ---- The counter: a seller ----

export function openSeller(g, customer) {
  const { ui, crowd } = g;
  const c = customer.sim, it = c.item;
  let finished = false;
  const finish = (mood, msg) => { finished = true; ui.close(); crowd.dismiss(customer, mood); if (msg) ui.toast(msg); };

  const render = () => {
    const st = g.st;
    const emf = it.revealed.emf ? S.Lab.readingText('emf', it.revealed.emf) : null;
    ui.open({
      id: 'seller', size: 'wide', eyebrow: 'Counter', title: c.name,
      // Phase 19: who and what on one side, the haggling on the other, when there's room.
      body: [el('div', { class: 'split' }, el('div', { class: 'split-a' },
        faceRow(customer.face, c.name, el('p', { class: `speech ${c.say?.kind || ''}` }, c.say?.text || `“${c.line}”`)),
        itemCard(it, [
          el('span', {}, `Surface estimate ${money(S.Items.estimate(it))}`),
          emf ? el('span', { class: 'reading-mini' }, `EMF: ${emf}`) : null,
        ]),
        el('p', { class: 'tell' }, S.prefixOf(it).tell)),
        el('div', { class: 'split-b' }, el('div', { class: 'haggle' },
          el('div', { class: 'haggle-row' },
            el('span', { class: 'label' }, 'They ask'), el('strong', { class: 'mono' }, money(c.ask)),
            el('span', { class: 'label' }, 'Patience'), pips(c.patience, c.maxPatience)),
          el('div', { class: 'pricer' },
            el('button', { type: 'button', class: 'btn', id: 'offer-down', 'aria-label': 'Lower your offer', onclick: () => { A.barterNudge(c, -1); render(); } }, '−'),
            el('div', { class: 'price-big' }, money(c.offer), el('small', {}, 'your offer')),
            el('button', { type: 'button', class: 'btn', id: 'offer-up', 'aria-label': 'Raise your offer', onclick: () => { A.barterNudge(c, 1); render(); } }, '+'))),
        el('div', { class: 'sheet-actions' },
          el('button', { type: 'button', class: 'btn primary', id: 'make-offer', onclick: () => offer(false) }, `Offer ${money(c.offer)}`),
          el('button', { type: 'button', class: 'btn', id: 'pay-ask', onclick: () => offer(true) }, `Pay what they ask · ${money(c.ask)}`),
          !c.peeked && c.patience > 1 ? el('button', { type: 'button', class: 'btn', id: 'peek', onclick: peek }, 'Wave the EMF meter over it (costs patience)') : null,
          el('button', { type: 'button', class: 'btn quiet', id: 'send-away', onclick: () => { S.log(g.st, `Sent ${c.name} away.`, 'note'); S.Shop.leave(g.st); finish(null); } }, 'Send them away'))))],
      onClose: () => { if (!finished) customer.patience = Math.max(customer.patience, 10); },
    });
  };

  const peek = () => { A.barterPeek(g.st, c); g.changed(); render(); };
  const offer = takeAsk => {
    const r = A.barterOffer(g.st, c, takeAsk);
    g.changed();
    if (r.result === 'broke') return ui.toast('Not enough cash.');
    if (r.result === 'deal') return finish('content', `Bought for ${money(r.price)}. It’s waiting in the basement.`);
    if (r.result === 'leave') return finish('angry', r.say);
    render();
  };
  render();
}

// ---- The till: buyers, counter-offers, and the day so far ----

export function openTill(g) {
  const { ui, crowd } = g, st = g.st;
  const front = crowd.front('buy');
  if (front?.pending) {
    const p = front.pending, it = st.inventory.stock.find(x => x.uid === p.uid);
    if (it) {
      const counter = p.counter;
      ui.open({
        id: 'till', eyebrow: `Till · ${front.sim.name}`, title: counter ? 'A counter-offer' : 'Ready to pay',
        body: [
          faceRow(front.face, front.sim.name, el('p', { class: 'speech warn' }, counter ? `“${money(it.price)}? I can do ${money(p.amount)}. Take it or leave it.”` : `“I’ll take it.”`)),
          itemCard(it, [tagLine(it)]),
        ],
        actions: [
          { id: 'accept', label: counter ? `Accept ${money(p.amount)}` : `Ring it up · ${money(p.amount)}`, kind: 'primary', onClick: () => { ui.close(); crowd.complete(front, p.amount); g.changed(); } },
          ...(counter ? [{ id: 'decline', label: 'Decline', onClick: () => { S.log(st, `${front.sim.name} would not meet your price and left.`, 'note'); ui.close(); crowd.dismiss(front, null); } }] : []),
          { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() },
        ],
      });
      return;
    }
  }
  openLedger(g);
}

export function openLedger(g) {
  const { ui } = g, st = g.st;
  const sales = st.shop.sales || [], bought = st.shop.bought || [];
  const earned = sales.reduce((s, x) => s + x.price, 0), spent = bought.reduce((s, x) => s + x.price, 0);
  ui.open({
    id: 'ledger', eyebrow: `${formatDate(st.day)} · Heat ${st.heat}`, title: `${money(st.cash)} in the till`,
    body: [
      el('dl', { class: 'readout' },
        el('dt', {}, 'Sold'), el('dd', {}, `${sales.length} for ${money(earned)}`),
        el('dt', {}, 'Bought'), el('dd', {}, `${bought.length} for ${money(spent)}`),
        el('dt', {}, 'Basement'), el('dd', {}, `${st.inventory.loot.length} untagged`),
        el('dt', {}, 'Tagged'), el('dd', {}, `${st.inventory.stock.length} in stock`)),
      el('p', { class: 'note' }, 'Buyers who agree to a tag pay on their own while you stand at the till. Counter-offers wait for your answer here. Every sale is checked against the truth on the evening news.'),
    ],
    actions: [{ label: 'Close', kind: 'primary', onClick: () => ui.close() }],
  });
}

// ---- Display cases: tagged stock only ----

export function openDisplay(g, slot) {
  const { ui, crowd, world } = g, st = g.st;
  const uid = world.displays[slot];
  const it = uid && st.inventory.stock.find(x => x.uid === uid);
  if (uid && !it) delete world.displays[slot];

  if (it) {
    const reserved = crowd?.reserved.has(slot);
    ui.open({
      id: 'display', eyebrow: 'Display case', title: reserved ? 'A buyer has it' : 'On display',
      body: [
        itemCard(it, [tagLine(it)]),
        reserved ? el('p', { class: 'note' }, 'The buyer is waiting at the till.') :
          el('p', { class: 'note' }, 'Customers only see the tag. Walk-ins won’t touch anything tagged cursed; factions want a named anomaly with the trait they’re after.'),
      ],
      actions: reserved ? [{ label: 'Close', kind: 'primary', onClick: () => ui.close() }] : [
        { id: 'take-down', label: 'Take it down', onClick: () => { delete world.displays[slot]; ui.close(); } },
        { id: 'back-to-lab', label: 'Send it back to the basement', onClick: () => { delete world.displays[slot]; A.returnToBench(st, it); g.changed(); ui.close(); ui.toast('Back on the bench, tag kept as a draft.'); } },
        { label: 'Close', kind: 'quiet', onClick: () => ui.close() },
      ],
    });
    return;
  }

  const shown = new Set(Object.values(world.displays));
  const free = st.inventory.stock.filter(x => !shown.has(x.uid));
  ui.open({
    id: 'display', eyebrow: 'Display case', title: 'Empty case',
    body: free.length
      ? [el('p', { class: 'label' }, `Tagged stock · ${free.length}`),
         el('ul', { class: 'stock' }, free.map(x => el('li', {},
           el('button', { type: 'button', class: 'stock-row', id: `stock-${x.uid}`, onclick: () => { world.displays[slot] = x.uid; ui.close(); ui.toast(`${S.Items.name(x)} is on display.`); } },
             itemArt(x, 'item-art sm'),
             el('span', { class: 'stock-text' }, el('strong', {}, S.Items.name(x)), tagLine(x))))))]
      : [el('p', {}, st.inventory.loot.length
          ? `Nothing tagged yet. ${st.inventory.loot.length} piece${st.inventory.loot.length === 1 ? ' is' : 's are'} waiting on the bench in the basement. Tag them at night, then put them out here.`
          : 'Nothing to put out. Buy from sellers at the counter, then tag what you bought in the basement at night.')],
    actions: [{ label: 'Close', kind: 'quiet', onClick: () => ui.close() }],
  });
}

// ---- The evening news ----

export function newsBody(r, st, heat0) {
  if (!r) return [];
  const items = r.items.map(x => el('li', { class: `news ${x.kind}` }, el('span', {}, x.text), x.tag ? el('b', {}, x.tag) : null));
  return [
    el('dl', { class: 'readout' },
      el('dt', {}, 'Sold'), el('dd', {}, `${r.sold} for ${money(r.revenue)}`),
      el('dt', {}, 'Bought'), el('dd', {}, money(r.spent || 0)),
      r.refunds ? el('dt', {}, 'Refunds') : null, r.refunds ? el('dd', { class: 'neg' }, `−${money(r.refunds)}`) : null,
      el('dt', {}, 'Heat'), el('dd', { class: r.heat > 0 ? 'neg' : '' }, `${st.heat}${r.heat ? ` (${r.heat > 0 ? '+' : ''}${r.heat})` : ''}`)),
    el('ul', { class: 'newslist' }, items),
  ];
}

// ---- The counter: someone who wants a thing identified ----

export function openAppraiser(g, customer) {
  const { ui, crowd } = g, st = g.st, c = customer.sim, it = c.item, P = DATA.appraisal.pay;
  ui.open({
    id: 'appraiser', eyebrow: `Counter · appraisal`, title: c.name,
    body: [
      faceRow(customer.face, c.name, el('p', { class: 'speech' }, `“${c.line}”`)),
      itemCard(it, [el('span', {}, `Surface estimate ${money(S.Items.estimate(it))}`)]),
      el('dl', { class: 'readout' },
        el('dt', {}, 'Fee'), el('dd', {}, money(c.fee)),
        el('dt', {}, 'Right'), el('dd', {}, `${money(Math.round(c.fee * P.right))}, or ${money(Math.round(c.fee * P.named))} if you name it`),
        el('dt', {}, 'Wrong'), el('dd', {}, `only ${money(Math.round(c.fee * P.wrong))}`)),
      el('p', { class: 'note' }, g.continuous
        ? 'It goes on the bench in the basement. The owner gives you up to a week (longer for harder objects). File your report before the due day: they collect it the moment you do, and pay. After the due day they take it back unpaid.'
        : 'It goes on the bench in the basement. Test it tonight and file your report; they come back for it when you close up for the night. An unfinished report earns nothing.'),
    ],
    actions: [
      { id: 'take-job', label: 'Take the job', kind: 'primary', onClick: () => { A.takeJob(st, c); g.afterTakeJob?.(c); g.changed(); ui.close(); crowd.dismiss(customer, 'content'); ui.toast(g.continuous ? `The ${S.baseOf(it).name} is on the bench, ${leftText(daysLeft(c.item.job, st.day))}.` : `The ${S.baseOf(it).name} is on the bench. File the report tonight.`, 3000); } },
      { id: 'send-away', label: 'Send them away', kind: 'quiet', onClick: () => { S.Shop.leave(st); ui.close(); crowd.dismiss(customer, null); } },
    ],
  });
}

// ---- The counter: Inspector Vance ----

export function openInspector(g, customer) {
  const { ui, crowd } = g, st = g.st, c = customer.sim;
  ui.open({
    id: 'inspector', eyebrow: `Counter · Heat ${st.heat}`, title: c.name, reason: 'inspector', dismissable: false,
    body: [
      el('div', { class: 'who-row' }, portraitFor(c.name, { label: c.name }), el('p', { class: 'speech warn' }, `“${c.line}”`)),
      el('p', { class: 'note' }, `Anything truly cursed in the back case gets confiscated: +6 Heat each unless it’s sealed in a jar. If he finds nothing, Heat drops by 15 and the Office notices. ${st.inventory.stock.length} piece${st.inventory.stock.length === 1 ? '' : 's'} in stock.`),
    ],
    actions: [
      { id: 'let-look', label: 'Let him look', kind: 'primary', onClick: () => { const r = A.inspectLook(st); cleanDisplays(g, r.confiscated); g.changed(); ui.close(); crowd.dismiss(customer, null); ui.toast(r.msg, 3200); } },
      { id: 'bribe', label: `Slip him ${money(c.bribe)}`, disabled: st.cash < c.bribe, onClick: () => { if (A.inspectBribe(st, c)) { g.changed(); ui.close(); crowd.dismiss(customer, null); ui.toast('He pockets it and leaves.'); } } },
    ],
  });
}

export function cleanDisplays(g, uids) {
  for (const [slot, uid] of Object.entries(g.world.displays)) if (uids.includes(uid)) delete g.world.displays[slot];
}

// ---- The contractor's estimate: renovating the shop ----

function stageLine(tier) {
  const f = stageFacts(tier);
  return `Open ${hoursText(tier)} · ${f.cases} case${f.cases === 1 ? '' : 's'} · ${f.customers == null ? 'every customer who comes' : `up to ${f.customers} customers a day`}${f.bonus ? ` · +${f.bonus} a day` : ''} · room for ${SHOP_TIERS[tier].room}`;
}

// The notice board by the back door: the contractor's estimate, and Help Wanted.
// opts: { tab: 'renovate' | 'draw' | 'staff' | 'arrange', onBooked(stage), onHired(role) }
// g.arrange(): start rearranging the floor (main.js), returns false if you can't right now.
export function openRenovation(g, opts = {}) {
  const { ui, world } = g, st = g.st;
  if (typeof opts === 'function') opts = { onBooked: opts };
  const tab = opts.tab || 'renovate';
  const go = t => openRenovation(g, { ...opts, tab: t });
  const tabs = el('div', { class: 'seg n4', role: 'tablist', 'aria-label': 'Notice board' },
    [['renovate', 'Renovations'], ['arrange', 'Arrange'], ['draw', 'Customers'], ['staff', `Staff${wagesDue(world) ? ` · ${money(wagesDue(world))}/day` : ''}`]].map(([id, label]) =>
      el('button', { type: 'button', role: 'tab', id: `board-${id}`, 'aria-selected': String(id === tab), class: id === tab ? 'on' : '', onclick: () => go(id) }, label)));

  const s = shopState(world), cur = SHOP_TIERS[s.tier], next = nextStage(world);
  if (tab === 'staff') return openStaffTab(g, opts, tabs, cur);
  if (tab === 'draw') return openDrawTab(g, opts, tabs, cur);
  if (tab === 'arrange') return openArrangeTab(g, opts, tabs);
  const why = renovationBlocker(world, st);
  const rows = SHOP_TIERS.map(t => {
    const status = t.tier < s.tier ? 'done' : t.tier === s.tier ? 'now' : t.tier === s.booked ? 'booked' : t.tier === s.tier + 1 ? 'next' : 'later';
    const unlocks = ROLE_ORDER.filter(r => ROLES[r].unlock === t.tier).map(r => `hire a ${ROLES[r].name.toLowerCase()}`);
    return el('li', { class: `stage ${status}` },
      el('div', { class: 'stage-head' }, el('strong', {}, t.name),
        el('span', { class: 'stage-tag' }, status === 'done' ? 'Done' : status === 'now' ? 'Now' : status === 'booked' ? 'Tonight' : money(t.cost))),
      el('span', {}, t.tier <= s.tier ? t.blurb : t.work),
      el('small', {}, stageLine(t.tier) + (unlocks.length ? ` · ${unlocks.join(', ')}` : '')));
  });
  ui.open({
    id: 'renovate', eyebrow: 'Notice board', title: 'Fixing the place up',
    body: [
      tabs,
      el('ol', { class: 'stages' }, rows),
      el('p', { class: 'note' }, s.booked != null
        ? 'The crew comes in after you lock up tonight. It’ll be done by morning.'
        : next ? 'Pay now and the crew works overnight: the shop changes when you wake up. Rent still comes first.' : 'Nothing left to fix.'),
    ],
    actions: [
      ...(next && s.booked == null ? [{ id: 'book-crew', label: why && !/^Needs/.test(why) ? why : `Book the crew · ${money(next.cost)}`, kind: 'primary', disabled: !!why,
        onClick: () => { const r = bookRenovation(world, st); g.changed(); if (r.error) return ui.toast(r.error); ui.close(); ui.toast(`Booked: ${r.stage.name}. Done by morning.`, 2800); opts.onBooked?.(r.stage); } }] : []),
      { id: 'renovate-close', label: 'Close', kind: next && s.booked == null ? 'quiet' : 'primary', onClick: () => ui.close() },
    ],
  });
}

function openStaffTab(g, opts, tabs, cur) {
  const { ui, world } = g, st = g.st;
  const rows = ROLE_ORDER.map(role => {
    const R = ROLES[role], w = staffState(world)[role], why = hireBlocker(world, role);
    if (w) return el('li', { class: 'stage now' },
      el('div', { class: 'stage-head' }, el('strong', {}, `${w.name} · ${R.name}`), el('span', { class: 'stage-tag' }, `${money(R.wage)}/day`)),
      el('span', {}, R.does),
      el('small', {}, `Since day ${w.since} · ${w.days} day${w.days === 1 ? '' : 's'} paid`),
      el('button', { type: 'button', class: 'btn small quiet', id: `letgo-${role}`, onclick: () => { letGo(world, st, role); g.changed(); ui.toast(`You let ${w.name} go.`); openRenovation(g, { ...opts, tab: 'staff' }); } }, `Let ${w.name.split(' ')[0]} go`));
    if (why && !roleOpen(world, role)) return el('li', { class: 'stage later' },
      el('div', { class: 'stage-head' }, el('strong', {}, R.name), el('span', { class: 'stage-tag' }, `${money(R.wage)}/day`)),
      el('span', {}, R.does),
      el('small', {}, `Opens with the ${SHOP_TIERS[R.unlock].name} renovation. There isn’t room for anyone yet.`));
    const a = todaysApplicant(st, role);
    return el('li', { class: 'stage next' },
      el('div', { class: 'stage-head' }, el('strong', {}, `${R.name}: ${a.name}`), el('span', { class: 'stage-tag' }, `${money(R.wage)}/day`)),
      faceRow(lookFor(a.name), a.name, el('span', { class: 'speech' }, `“${a.line}”`)),
      el('small', {}, R.does),
      el('button', { type: 'button', class: 'btn small primary', id: `hire-${role}`, onclick: () => { const r = hire(world, st, role); g.changed(); if (r.error) return ui.toast(r.error); ui.toast(`${r.name} starts the next time you open.`, 2600); opts.onHired?.(role); openRenovation(g, { ...opts, tab: 'staff' }); } }, `Hire ${a.name.split(' ')[0]}`));
  });
  ui.open({
    id: 'renovate', eyebrow: 'Notice board', title: 'Help wanted',
    body: [
      tabs,
      el('ol', { class: 'stages' }, rows),
      el('p', { class: 'note' }, `Wages are paid at closing, only on days the shop opens. If you can’t cover them, they quit. A different applicant answers the sign each day. ${cur.name}.`),
    ],
    actions: [{ id: 'renovate-close', label: 'Close', kind: 'primary', onClick: () => ui.close() }],
  });
}

// ---- Arranging the floor and decor (Phase 24) ----

const pct = x => `${Math.round(x * 100)}%`;
export function charmLine(world, wx = null) {
  const m = decorMods(layoutOf(world), wx);
  if (!m.charm) return 'No decor out yet. A bare shop is a shop people pass by.';
  const bits = [`people wait ${pct(m.patience)} longer`, m.spend ? `spend ${pct(m.spend)} more` : null, m.browsers ? `${m.browsers} extra browser${m.browsers === 1 ? '' : 's'} a day` : `${CHARM.browsersAt[0] - m.charm} more charm brings in browsers`].filter(Boolean);
  return `Charm ${m.charm}: ${bits.join(', ')}.`;
}

// The decor list: buy pieces (into storage), and, while arranging, take one out to place.
// opts: { onPlace(id) } while arranging; `again` re-renders the panel around it.
function decorRows(g, opts, again) {
  const { ui, world } = g, st = g.st, L = layoutOf(world), stored = shopState(world).stored ?? [];
  return DECOR.filter(d => !d.homeOnly).map(d => {
    const why = decorBlocker(world, st, d.id), locked = why === 'unlock';
    const out = L.decor.filter(x => x.id === d.id).length, inStore = stored.filter(x => x === d.id).length;
    const have = out + inStore;
    const extra = [d.patience ? `people wait ${pct(d.patience)} longer` : null, d.wet ? `on wet days, people wait ${pct(d.wet)} longer` : null, d.light ? 'lights its corner' : null, d.solid ? null : 'walk on it'].filter(Boolean);
    return el('li', { class: `stage ${have ? 'now' : locked ? 'later' : 'next'}`, id: `decor-${d.id}` },
      el('div', { class: 'stage-head' }, el('strong', {}, d.name), el('span', { class: 'stage-tag' }, money(d.cost))),
      el('span', {}, d.blurb),
      el('small', {}, [locked ? `Opens with the ${SHOP_TIERS[d.unlock].name} renovation` : null, `Charm +${d.charm}`, ...extra, have ? `You have ${have}${inStore ? ` (${inStore} put away)` : ''}` : null].filter(Boolean).join(' · ')),
      el('div', { class: 'row-btns' },
        opts.onPlace && inStore ? el('button', { type: 'button', class: 'btn small primary', id: `place-${d.id}`, onclick: () => opts.onPlace(d.id) }, 'Place it') : null,
        !locked ? el('button', { type: 'button', class: `btn small ${opts.onPlace && inStore ? '' : 'primary'}`, id: `buy-${d.id}`, disabled: !!why,
          onclick: () => { const r = buyDecor(world, st, d.id); g.changed(); if (r.error) return ui.toast(r.error); ui.toast(opts.onPlace ? `${d.name}: bought. Place it?` : `${d.name}: bought. It’s in the back until you put it out.`, 2200); again(); } },
          why && !/^Needs/.test(why) ? why : `Buy · ${money(d.cost)}`) : null));
  });
}

function openArrangeTab(g, opts, tabs) {
  const { ui, world } = g, L = layoutOf(world);
  const again = () => openRenovation(g, { ...opts, tab: 'arrange' });
  ui.open({
    id: 'renovate', eyebrow: 'Notice board', title: 'Arranging the shop',
    body: [
      tabs,
      el('p', { class: 'note' }, 'Move the cases, the till and the register wherever they work for you, and put out decor. Whatever’s in a case goes with it. The shop has to be empty of customers while you do it.'),
      el('dl', { class: 'readout' },
        el('dt', {}, 'Cases'), el('dd', {}, `${L.cases.length}`),
        el('dt', {}, 'Decor out'), el('dd', {}, `${L.decor.length} of ${CHARM.maxPieces}${(shopState(world).stored ?? []).length ? ` · ${(shopState(world).stored ?? []).length} put away` : ''}`),
        el('dt', {}, 'Charm'), el('dd', {}, charmLine(world, g.weather?.()))),
      el('h3', { class: 'sec-title' }, el('span', {}, 'Decor'), el('span', {}, 'only the first two of a kind add charm')),
      el('ol', { class: 'stages' }, decorRows(g, {}, again)),
    ],
    actions: [
      { id: 'arrange-start', label: 'Rearrange the floor', kind: 'primary', onClick: () => g.arrange?.() },
      { id: 'renovate-close', label: 'Close', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}

// While arranging: the decor you have, to place, and more to buy.
export function openDecor(g, onPlace) {
  const { ui, world } = g;
  const again = () => openDecor(g, onPlace);
  ui.open({
    id: 'decor', eyebrow: 'Arranging the shop', title: 'Decor',
    body: [
      el('p', { class: 'note' }, charmLine(world, g.weather?.())),
      el('ol', { class: 'stages' }, decorRows(g, { onPlace }, again)),
    ],
    actions: [{ id: 'decor-close', label: 'Back', kind: 'quiet', onClick: () => ui.close() }],
  });
}

// ---- Bringing people in: ads, the storefront, comforts, regulars ----

const FACTION_NAME = id => DATA.factions.find(f => f.id === id)?.name ?? id;

function openDrawTab(g, opts, tabs, cur) {
  const { ui, world } = g, st = g.st;
  const again = () => openRenovation(g, { ...opts, tab: 'draw' });
  const pay = (kind, id) => {
    const r = buy(world, st, kind, id); g.changed();
    if (r.error) return ui.toast(r.error);
    ui.toast(kind === 'ad' ? `${r.def.name}: starts tomorrow, runs ${r.def.days} days.` : `${r.def.name}: done.`, 2600);
    again();
  };
  const row = (kind, d, effect) => {
    const why = buyBlocker(world, st, kind, d.id);
    const locked = shopState(world).tier < d.unlock;
    const have = kind !== 'ad' && owns(world, kind, d.id);
    const running = kind === 'ad' && drawState(world).ad?.id === d.id && adBooked(world, st.day);
    const status = have || running ? 'now' : locked ? 'later' : 'next';
    const tag = have ? 'Done' : running ? (adOn(world, st.day) ? `Through day ${drawState(world).ad.until}` : 'Starts tomorrow') : money(d.cost);
    return el('li', { class: `stage ${status}` },
      el('div', { class: 'stage-head' }, el('strong', {}, d.name), el('span', { class: 'stage-tag' }, tag)),
      el('span', {}, d.blurb),
      el('small', {}, locked ? `Opens with the ${SHOP_TIERS[d.unlock].name} renovation · ${effect}` : effect),
      !have && !running && !locked ? el('button', { type: 'button', class: 'btn small primary', id: `draw-${kind}-${d.id}`, disabled: !!why, onclick: () => pay(kind, d.id) },
        why && !/^Needs \$/.test(why) ? why : `${kind === 'ad' ? 'Run it' : 'Buy'} · ${money(d.cost)}`) : null);
  };
  const sum = crowdSummary(world, st);
  const extraBits = [sum.regulars && `${sum.regulars} regular${sum.regulars === 1 ? '' : 's'}`, sum.ads && `${sum.ads} from the ads`, sum.front && `${sum.front} from the storefront`].filter(Boolean);
  const regs = regulars(st);
  const trust = Object.entries(st.rep || {}).map(([f, v]) => `${FACTION_NAME(f)} ${v}`).join(' · ');
  ui.open({
    id: 'renovate', eyebrow: 'Notice board', title: 'Bringing people in',
    body: [
      tabs,
      el('dl', { class: 'readout' },
        el('dt', {}, 'Walk-ins'), el('dd', {}, sum.base == null ? 'Everyone the day brings, +1' : `Up to ${sum.base} a day`),
        el('dt', {}, 'Extra'), el('dd', {}, extraBits.length ? extraBits.join(' · ') : 'Nobody yet'),
        el('dt', {}, 'Room'), el('dd', {}, `${sum.room} people a day, ${hoursText(cur.tier)}. A bigger shop holds more.`)),
      el('h3', { class: 'sec-title' }, el('span', {}, 'Advertising'), el('span', {}, 'one campaign at a time')),
      el('ol', { class: 'stages' }, ADS.map(d => row('ad', d, `+${d.extra} customer${d.extra === 1 ? '' : 's'} a day for ${d.days} days`))),
      el('h3', { class: 'sec-title' }, el('span', {}, 'Storefront'), el('span', {}, 'for good')),
      el('ol', { class: 'stages' }, STOREFRONT.map(d => row('front', d, `+${d.extra} customer a day`))),
      el('h3', { class: 'sec-title' }, el('span', {}, 'Comforts'), el('span', {}, 'for good')),
      el('ol', { class: 'stages' }, COMFORTS.map(d => row('comfort', d, `People wait ${Math.round(d.patience * 100)}% longer${d.spend ? ` and spend ${Math.round(d.spend * 100)}% more` : ''}`))),
      el('h3', { class: 'sec-title' }, el('span', {}, 'Regulars'), el('span', {}, `${regs.length} of ${REGULARS.max}`)),
      el('p', { class: 'note' }, `Regulars can’t be bought. Every faction whose standing reaches ${REGULARS.trust} sends one a day, and keeping Heat at ${REGULARS.cleanHeat} or under gets the neighborhood talking: one more. Standing now: ${trust}. Heat ${st.heat}.`),
    ],
    actions: [{ id: 'renovate-close', label: 'Close', kind: 'primary', onClick: () => ui.close() }],
  });
}
