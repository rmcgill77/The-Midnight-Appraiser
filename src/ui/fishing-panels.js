// Fishing's screens (v2.3): the Bait & Tackle shack on the beach boardwalk (today's board,
// selling your catch, rods and bait), your tackle box (the rod, the bait on your hook, the
// cooler) and the fishing log. The rules are in game/fishing.js.
//
// hooks: { season(), money (st.cash), tide(), sold(n), bought(cost), owner: null | { name, look, line } }

import { el } from './ui.js';
import { S } from '../rules/index.js';
import * as F from '../game/fishing.js';
import { faceRow } from './portraits.js';
import { FISH_LOOK } from './fishing-art.js';

const money = n => S.money(n);
const lb = n => (n < 1 ? `${Math.round(n * 16)} oz` : `${n.toFixed(1)} lb`);

// A fish, drawn: the same silhouette for every kind, in its own colors.
const LOOK = FISH_LOOK;
const SHAPE = ['.......####.....', '.....########...', '#...##########..', '##.###########..', '.############.#.', '.##############.', '.############.#.', '##.###########..', '#...##########..', '.....########...', '.......####.....'];
export function fishArt(id, scale = 2) {
  const [body, belly] = LOOK[id] ?? ['#5a6070', '#a0a6b0'];
  const cv = document.createElement('canvas'); cv.width = 16 * scale; cv.height = 16 * scale;
  const g = cv.getContext('2d');
  SHAPE.forEach((r, y) => { for (let x = 0; x < 16; x++) if (r[x] === '#') { g.fillStyle = y >= 6 && x > 3 ? belly : body; g.fillRect(x * scale, (y + 2) * scale, scale, scale); } });
  g.fillStyle = '#0c0d12'; g.fillRect(12 * scale, 5 * scale, scale, scale);
  cv.className = 'fish-art';
  return cv;
}
const fishName = id => F.fishById(id)?.name ?? id;

function tabs(cur, list, go) {
  return el('div', { class: `seg n${list.length}`, role: 'tablist' }, list.map(([id, label]) =>
    el('button', { type: 'button', role: 'tab', id: `fish-tab-${id}`, 'aria-selected': String(id === cur), class: id === cur ? 'on' : '', onclick: () => go(id) }, label)));
}
const section = (title, aside, kids) => el('section', { class: 'lab-sec' }, el('div', { class: 'sec-title' }, el('span', {}, title), el('span', {}, aside || '')), el('div', { class: 'rows' }, kids));

// ---------- the shack ----------

export function openTackle(g, hooks, tab = 'board') {
  const { ui, world } = g, st = g.st, day = st.day, season = hooks.season();
  const Fs = F.fishingOf(world);
  const go = t => openTackle(g, hooks, t);
  const hot = F.hotFish(day, season);
  const owner = hooks.owner;
  const intro = owner ? faceRow(owner.look, owner.name, el('div', {}, el('p', { class: 'speech' }, `“${owner.line}”`), owner.bonus ? el('small', { class: 'note' }, `${owner.name} pays you ${Math.round(owner.bonus * 100)}% over the board.`) : null))
    : el('p', { class: 'document door-sign' }, 'GONE OUT ON THE PIER. PRICES ON THE BOARD. PAY THE TIN. — MGMT');
  let body;
  if (tab === 'board') {
    const inSeason = F.FISH.filter(f => f.seasons.includes(season) && !f.legend);
    const board = el('div', { class: 'fish-board' }, inSeason.map(f => el('div', { class: `fish-price${f.id === hot ? ' hot' : ''}` },
      fishArt(f.id, 1), el('span', {}, f.name), el('strong', {}, money(F.boardPrice(f.id, day, season))))));
    const cooler = Fs.cooler;
    const total = cooler.reduce((a, c) => a + F.fishPrice(c, day, season), 0);
    body = [
      tabs(tab, [['board', 'Today’s board'], ['gear', 'Rods & bait']], go), intro,
      section('Today’s board', hot ? `Catch of the day: ${fishName(hot)}` : '', [board]),
      section('Your cooler', `${cooler.length} of ${F.COOLER_MAX}`, cooler.length ? cooler.map(c => el('article', { class: 'row-card' }, fishArt(c.id),
        el('div', { class: 'row-text' }, el('strong', {}, fishName(c.id)), el('span', {}, `${lb(c.lb)}${c.id === hot ? ' · catch of the day' : ''}`)),
        el('button', { type: 'button', class: 'btn small primary', id: `sell-${c.uid}`, onclick: () => { const n = F.sellFish(world, [c.uid], day, season); hooks.sold(n); go('board'); } }, `Sell ${money(F.fishPrice(c, day, season))}`)))
        : [el('p', { class: 'note' }, 'Nothing in the cooler. Fish sell here and only here; anything else you pull up goes to your bench.')]),
    ];
    if (cooler.length > 1) body.push(el('button', { type: 'button', class: 'btn primary', id: 'sell-all', onclick: () => { const n = F.sellFish(world, cooler.map(c => c.uid), day, season); hooks.sold(n); go('board'); } }, `Sell them all · ${money(total)}`));
  } else {
    const rods = ['cane', 'glass', 'carbon'].map(id => {
      const r = F.RODS[id], have = Fs.rods.includes(id);
      return el('article', { class: 'row-card' }, el('div', { class: 'row-text' }, el('strong', {}, r.name), el('span', {}, r.blurb)),
        el('button', { type: 'button', class: 'btn small primary', id: `buy-rod-${id}`, disabled: have || st.cash < r.price, onclick: () => { const c = F.buy(world, 'rod', id); if (c != null) hooks.bought(c); go('gear'); } }, have ? 'Yours' : money(r.price)));
    });
    const bait = F.BAIT_ORDER.map(id => {
      const b = F.BAIT[id];
      return el('article', { class: 'row-card' }, el('div', { class: 'row-text' }, el('strong', {}, `${b.name} · ${b.pack}`), el('span', {}, `${b.blurb} You have ${F.baitLeft(world, id)}.`)),
        el('button', { type: 'button', class: 'btn small primary', id: `buy-bait-${id}`, disabled: st.cash < b.price, onclick: () => { const c = F.buy(world, 'bait', id); if (c != null) hooks.bought(c); go('gear'); } }, money(b.price)));
    });
    body = [tabs(tab, [['board', 'Today’s board'], ['gear', 'Rods & bait']], go), intro, section('Rods', F.rodOf(world) ? `Fishing with: ${F.rodOf(world).name}` : 'You don’t have one yet', rods), section('Bait', `${money(st.cash)} on you`, bait)];
  }
  ui.open({ id: 'tackle', size: 'wide', eyebrow: 'Gull Point boardwalk', title: 'Bait & Tackle', body, actions: [{ id: 'tackle-leave', label: 'Back to the beach', kind: 'quiet', onClick: () => ui.close() }] });
}

// ---------- your tackle box, and the log ----------

export function openTackleBox(g, hooks, tab = 'box', back = null) {
  const { ui, world } = g;
  const Fs = F.fishingOf(world), go = t => openTackleBox(g, hooks, t, back);
  let body;
  if (tab === 'box') {
    const rod = F.rodOf(world), using = F.baitInUse(world);
    const bait = F.BAIT_ORDER.filter(id => F.baitLeft(world, id) > 0).map(id => el('article', { class: 'row-card' },
      el('div', { class: 'row-text' }, el('strong', {}, F.BAIT[id].name), el('span', {}, `${F.baitLeft(world, id)} left`)),
      el('button', { type: 'button', class: `btn small${id === using ? '' : ' primary'}`, id: `use-bait-${id}`, disabled: id === using, onclick: () => { Fs.using = id; go('box'); } }, id === using ? 'On the hook' : 'Use')));
    body = [
      tabs(tab, [['box', 'Tackle box'], ['log', `Log · ${F.kindsCaught(world)}/${F.FISH.length}`]], go),
      el('p', { class: 'note' }, hooks.conditions()),
      section('Rod', '', [el('p', {}, rod ? `${rod.name}. ${rod.blurb}` : 'No rod. The Bait & Tackle shack on the beach boardwalk sells them.')]),
      section('Bait', using ? `On the hook: ${F.BAIT[using].name}` : 'A bare hook', bait.length ? bait : [el('p', { class: 'note' }, 'No bait. A bare hook still catches things, mostly the wrong ones.')]),
      section('Cooler', `${Fs.cooler.length} of ${F.COOLER_MAX}`, Fs.cooler.length ? Fs.cooler.map(c => el('article', { class: 'row-card' }, fishArt(c.id), el('div', { class: 'row-text' }, el('strong', {}, fishName(c.id)), el('span', {}, lb(c.lb)))))
        : [el('p', { class: 'note' }, 'Empty. Fish sell to the Bait & Tackle shack, or make a fine gift.')]),
    ];
  } else {
    const rows = F.FISH.map(f => {
      const e = Fs.log[f.id];
      return el('article', { class: `row-card${e ? '' : ' unseen'}` }, e ? fishArt(f.id) : el('span', { class: 'fish-art unknown' }, '?'),
        el('div', { class: 'row-text' }, el('strong', {}, e ? f.name : '???'),
          el('span', {}, e ? `${f.note} Caught ${e.n} · biggest ${lb(e.best)}` : hint(f))));
    });
    const next = F.LOG_REWARDS.find(r => !Fs.rewards.includes(r.id));
    body = [
      tabs(tab, [['box', 'Tackle box'], ['log', `Log · ${F.kindsCaught(world)}/${F.FISH.length}`]], go),
      el('p', { class: 'note' }, next ? `${F.kindsCaught(world)} kinds so far. Something for you at ${next.at}.` : 'Every kind in the harbor. Your name is on the board at the bait shop.'),
      el('div', { class: 'rows' }, rows),
    ];
  }
  ui.open({ id: 'tacklebox', size: 'wide', eyebrow: 'Fishing', title: tab === 'log' ? 'The fishing log' : 'Your tackle box', body, back,
    actions: [{ id: 'tacklebox-close', label: back ? 'Back' : 'Close', kind: 'quiet', onClick: () => (back ? back() : ui.close()) }] });
}
// A clue for a kind you haven't caught: where, and when.
function hint(f) {
  const where = { pier: 'off the pier', surf: 'in the surf', rocks: 'by the rocks', harbor: 'at the river mouth, down by the dunes', river: 'in the river' };
  const when = f.times.length === 4 ? 'any time' : f.times.join(' or ');
  const seasons = f.seasons.length === 4 ? 'all year' : f.seasons.join(', ');
  return f.legend ? 'They say it only comes up in a storm, on the high tide, for squid.' : `Somewhere ${f.where.map(w => where[w]).join(' or ')}, ${when}, ${seasons}.`;
}
