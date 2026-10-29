// Panels for places in the city. Each one lists the original location's actions
// with their hour costs and blockers, its shop counter, its ride upgrades, and the
// Night Market's lots, all decided by the original City and Ride rules.

import { el } from './ui.js';
import { itemArt, iconSvg } from './glyphs.js';
import { itemCard, tagLine } from './shop-panels.js';
import { S } from '../rules/index.js';
import * as C from '../rules/city.js';
import { statusAt, weekStrip, scheduleOf, weekday } from '../game/schedule.js';
import { portraitFor } from './portraits.js';
import { extraPlace, mapIcon, WALK_INS } from '../data/places.js';
import { cityPixels, drawBadge } from './minimap.js';

// A place on the map: one of the original's locations, or one this game adds.
const placeOf = id => S.City.loc(id) ?? extraPlace(id);

const { DATA } = S;
const money = n => S.money(n);
const hrs = h => `${h}h`;

// hooks.talk(name): start a conversation with the keeper (Phase 20).
export function openLocation(g, locId, pick = null, hooks = {}) {
  const { ui, clock } = g, st = g.st;
  const loc = S.City.loc(locId), dist = S.City.district(loc.district);
  const fac = loc.faction ? S.byId(DATA.factions, loc.faction) : null;
  const reopen = (p = null) => openLocation(g, locId, p, hooks);
  const after = r => {
    g.changed();
    if (!r) return;
    ui.toast(r.text || r.toast, r.text ? 4200 : 2200);
    if (clock.state === 'ended') return;     // the day ran out; the evening takes over
    reopen(locId === 'market' && r ? 'browse' : null);
  };

  if (loc.home) {
    ui.open({
      id: 'loc', eyebrow: `${dist.name} · ${clock.label}`, title: loc.name,
      body: [el('p', {}, loc.blurb), g.continuous ? null : el('p', { class: 'note' }, `${hoursText(clock)} of errands left today.`)],
      actions: [
        { id: 'go-home', label: g.continuous ? 'Head home' : 'Head home and end the day', kind: 'primary', onClick: () => { ui.close(); if (g.continuous) g.goHome(); else clock.endDay(); } },
        { label: 'Keep going', kind: 'quiet', onClick: () => ui.close() },
      ],
    });
    return;
  }

  // Shut: the sign on the door, the week's hours, and when it opens again.
  const status = statusAt(locId, st.day, clock.minute, st.seed), sched = scheduleOf(locId);
  if (!status.open) {
    ui.open({
      id: 'loc', eyebrow: `${dist.name} · ${clock.label}`, title: `${loc.name} · Closed`,
      body: [
        el('p', { class: 'document door-sign' }, status.why === 'sick' ? sched.sickNote : status.sign),
        status.why === 'sick' ? el('p', { class: 'note' }, status.sign) : null,
        status.why === 'lunch' || status.why === 'off' ? el('p', { class: 'note' }, status.why === 'off' && hooks.offSpot?.(sched.keeper) ? `It’s ${sched.keeper}’s day off. A note under the sign says: “Try ${hooks.offSpot(sched.keeper)}.”` : `${sched.keeper} isn’t in. You might catch them on the street nearby.`) : null,
        el('div', { class: 'week-strip', role: 'list', 'aria-label': 'Opening hours this week' }, weekStrip(locId, weekday(st.day)).map(d =>
          el('div', { class: `wk ${d.open ? '' : 'shut'} ${d.today ? 'today' : ''}`, role: 'listitem' }, el('b', {}, d.day), el('span', {}, d.hours)))),
      ],
      actions: [{ label: 'Back to the street', kind: 'quiet', onClick: () => ui.close() }],
    });
    return;
  }

  const body = [
    el('p', {}, loc.blurb),
    sched ? el('div', { class: 'who-row keeper-row' }, portraitFor(sched.keeper, { label: sched.keeper }),
      el('div', {}, el('strong', {}, `${sched.keeper} is in`), el('small', {}, sched.door.split(' · ').slice(1).join(' · '))),
      hooks.talk ? el('button', { type: 'button', class: 'btn small', id: 'talk-keeper', onclick: () => { ui.close(); hooks.talk(sched.keeper); } }, 'Talk') : null) : null,
    fac ? el('p', { class: 'note' }, `${fac.name}: ${S.repLabel(st.rep[fac.id])} (${st.rep[fac.id] > 0 ? '+' : ''}${st.rep[fac.id]}). ${fac.desc}`) : null,
  ];

  // Things to do here.
  if (loc.actions?.length) body.push(section('Things to do', loc.actions.map(actId => {
    const a = DATA.cityActions[actId], block = C.blocker(st, clock, locId, actId);
    const needs = S.City.needsPick(actId);
    const row = el('article', { class: 'row-card' },
      el('div', { class: 'row-text' }, el('strong', {}, `${a.name} · ${hrs(a.hours)}${a.cost ? ` · ${money(a.cost)}` : ''}`), el('span', {}, a.note), block ? el('small', { class: 'warnline' }, block) : null),
      el('button', { type: 'button', class: `btn small ${block ? '' : 'primary'}`, id: `act-${actId}`, disabled: !!block,
        onclick: () => needs ? reopen(pick === actId ? null : actId) : after(C.act(st, clock, locId, actId)) }, needs ? (pick === actId ? 'Cancel' : 'Choose…') : 'Do it'));
    return pick === actId ? [row, pickList(g, locId, actId, after)] : row;
  }).flat()));

  // The hardware store's counter. Buying costs no time.
  if (loc.sells?.length) body.push(section('For sale', `${Number.isFinite(S.Ride.carryLeft(st)) ? `${S.Ride.carryLeft(st)} more you can carry · ` : ''}buying takes no time`, loc.sells.map(id => {
    const it = DATA.shopItems[id], block = C.buyBlocker(st, clock, locId, id);
    const have = it.mat ? st.supplies[it.mat] : st.kit[it.kit];
    return el('article', { class: 'row-card' },
      el('div', { class: 'row-text' }, el('strong', {}, `${it.name} ×${it.qty} · ${money(it.cost)}`), el('span', {}, `You have ${have}.`), block ? el('small', { class: 'warnline' }, block) : null),
      el('button', { type: 'button', class: 'btn small', id: `buy-${id}`, disabled: !!block, onclick: () => { if (C.buy(st, clock, locId, id)) { g.changed(); ui.toast(`+${it.qty} ${it.name.toLowerCase()}`); reopen(); } } }, 'Buy'));
  })));

  // Ride upgrades, where your ride gets serviced.
  if (S.Ride.def(st).upgradeAt === locId) {
    const n = S.Ride.next(st), tier = S.Ride.tier(st), block = C.rideBlocker(st, clock, locId);
    body.push(section('Your ride', tier.name, [
      el('p', { class: 'note' }, S.Ride.def(st).catch),
      n ? el('article', { class: 'row-card' },
        el('div', { class: 'row-text' }, el('strong', {}, `${n.name} · ${money(n.cost)}`), el('span', {}, n.note), el('small', {}, 'In this game an upgrade also gets you around town faster.'), block ? el('small', { class: 'warnline' }, block) : null),
        el('button', { type: 'button', class: 'btn small primary', id: 'ride-up', disabled: !!block, onclick: () => { const r = C.upgradeRide(st, clock, locId); g.changed(); if (r) { ui.toast(`Traded up to a ${r.name.toLowerCase()}.`); reopen(); } } }, 'Trade up'))
        : el('p', {}, 'Fully upgraded.'),
    ]));
  }

  // The Night Market's lots, once you've browsed today.
  if (locId === 'market' && st.city.market?.day === st.day) {
    const lots = st.city.market.lots;
    body.push(section('On the tables', `${lots.length} lot${lots.length === 1 ? '' : 's'}`, lots.length ? lots.map((lot, i) =>
      el('article', { class: 'row-card' }, itemArt(lot.item, 'item-art sm'),
        el('div', { class: 'row-text' }, el('strong', {}, `${S.Items.name(lot.item)} · ${money(lot.price)}`),
          el('span', {}, `Surface estimate ${money(S.Items.estimate(lot.item))}${lot.item.revealed.emf ? ` · EMF ${S.Lab.readingText('emf', lot.item.revealed.emf)}` : ''}`)),
        el('div', { class: 'btncol' },
          !lot.peeked ? el('button', { type: 'button', class: 'btn small', id: `peek-${i}`, onclick: () => { C.peekLot(st, clock, i); g.changed(); reopen('browse'); } }, 'EMF') : null,
          el('button', { type: 'button', class: 'btn small primary', id: `lot-${i}`, disabled: st.cash < lot.price || S.Ride.carryLeft(st) <= 0,
            onclick: () => { if (C.buyLot(st, clock, i)) { g.changed(); ui.toast('Bought. It’s waiting in the basement.'); reopen('browse'); } } }, 'Buy'))))
      : [el('p', {}, 'The tables are bare.')]));
  }

  // Phase 27: anything else this place offers (the hardware store's furniture aisle).
  if (hooks.extra) body.push(...hooks.extra(locId, () => reopen()));

  ui.open({
    id: 'loc', size: 'wide', eyebrow: `${dist.name} · ${clock.label}`, title: loc.name, body,
    actions: [{ label: 'Back to the street', kind: 'quiet', onClick: () => ui.close() }],
  });
}

function pickList(g, locId, actId, after) {
  const st = g.st, clock = g.clock, loc = S.City.loc(locId);
  const go = arg => after(C.act(st, clock, locId, actId, arg));
  let rows = [];
  if (actId === 'deliver') rows = st.inventory.stock.map(it => {
    const q = S.City.quote(st, loc, it);
    return choice(it, [tagLine(it), el('small', { class: q.fit === 'no' ? 'warnline' : '' }, q.fit === 'no' ? q.why : `They pay ${money(q.pay)}${q.fit === 'gamble' ? ' (a gamble)' : ''}`)], q.fit !== 'no', () => go(it.uid), 'Deliver');
  });
  if (actId === 'fence') rows = st.inventory.stock.map(it => choice(it, [tagLine(it), el('small', {}, `Fences for ${money(S.City.fencePrice(st, it))}`)], true, () => go(it.uid), 'Fence'));
  if (actId === 'surrender') rows = st.inventory.stock.map(it => choice(it, [tagLine(it)], true, () => go(it.uid), 'Turn in'));
  if (actId === 'study') rows = S.Lab.openProjects(st).map(p => el('article', { class: 'row-card pick' },
    iconSvg(p.icon, 'px-icon'), el('div', { class: 'row-text' }, el('strong', {}, p.name), el('small', {}, `${S.dur(p.done)} of ${S.dur(p.mins)}`)),
    el('button', { type: 'button', class: 'btn small primary', id: `pick-${p.key}`, onclick: () => go(p.key) }, 'Study')));
  if (actId === 'readup') rows = DATA.species.filter(s => S.Combat.entry(st, s.id).seen && S.Combat.entry(st, s.id).research < 100).map(s => el('article', { class: 'row-card pick' },
    el('div', { class: 'row-text' }, el('strong', {}, s.name), el('small', {}, `${S.Combat.entry(st, s.id).research}% researched`)),
    el('button', { type: 'button', class: 'btn small primary', id: `pick-${s.id}`, onclick: () => go(s.id) }, 'Read up')));
  return el('div', { class: 'rows picklist' }, rows.length ? rows : el('p', { class: 'note' }, 'Nothing to choose from.'));
}

function choice(it, extra, ok, onPick, label) {
  return el('article', { class: 'row-card pick' }, itemArt(it, 'item-art sm'),
    el('div', { class: 'row-text' }, el('strong', {}, S.Items.name(it)), ...extra),
    el('button', { type: 'button', class: 'btn small primary', id: `pick-${it.uid}`, disabled: !ok, onclick: onPick }, label));
}

function section(title, aside, kids) {
  return el('section', { class: 'lab-sec' }, el('div', { class: 'sec-title' }, el('span', {}, title), el('span', {}, aside || '')), el('div', { class: 'rows' }, kids));
}

export function hoursText(clock) {
  const h = clock.errandHours ? clock.errandHours() : clock.hoursLeft;
  const whole = Math.floor(h), mins = Math.round((h - whole) * 60 / 10) * 10;
  return mins === 60 ? `${whole + 1}h` : whole ? (mins ? `${whole}h ${mins}m` : `${whole}h`) : `${mins}m`;
}

// ---------- the city map ----------

export function openCityMap(g, layout, player, onBack) {
  const { ui, clock } = g, st = g.st;
  const W = layout.rows[0].length, H = layout.rows.length, scale = 4;
  const cv = document.createElement('canvas');
  cv.width = W * scale; cv.height = H * scale; cv.className = 'citymap';
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cityPixels(layout), 0, 0, W * scale, H * scale);
  const ptx = Math.floor(player.center.x / 16), pty = Math.floor(player.center.y / 16);
  // Phase 21: every place by its own icon, the same as over its door and on the minimap.
  for (const L of Object.values(layout.locs)) {
    const loc = placeOf(L.id);
    if (loc) drawBadge(ctx, loc, Math.round((L.door.tx + 0.5) * scale), Math.round((L.door.ty - 3) * scale), 2);
  }
  for (const b of Object.values(layout.busStops ?? {})) drawBadge(ctx, { id: 'bus-stop', icon: 'bus', front: { sign: '#7fa0e0' } }, Math.round((b.tx + 0.5) * scale), Math.round((b.ty - 1) * scale), 1);
  ctx.fillStyle = '#07080c'; ctx.fillRect(ptx * scale - 7, pty * scale - 7, 15, 15);
  ctx.fillStyle = '#9fd08a'; ctx.fillRect(ptx * scale - 5, pty * scale - 5, 11, 11);
  ctx.fillStyle = '#07080c'; ctx.fillRect(ptx * scale - 1, pty * scale - 1, 3, 3);

  const dirName = (dx, dy) => {
    const a = (Math.atan2(dy, dx) * 180 / Math.PI + 360 + 90) % 360;
    return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(a / 45) % 8];
  };
  const list = Object.values(layout.locs).map(L => {
    const loc = placeOf(L.id), dx = L.stand.tx - ptx, dy = L.stand.ty - pty;
    const steps = (Math.abs(dx) + Math.abs(dy)) * 1.08;
    const hours = steps * 16 / (68 * C.walkSpeed(st)) * 1000 / g.cityHourMs;
    return { loc, L, dx, dy, steps, hours };
  }).sort((a, b) => a.steps - b.steps);

  ui.open({
    id: 'citymap', size: 'wide', eyebrow: `${hoursText(clock)} of errands left`, title: 'The city',
    body: [
      el('div', { class: 'citymap-wrap' }, cv),
      el('div', { class: 'chipline' },
        el('span', { class: 'chip' }, el('i', { class: 'dot', style: 'background:#9fd08a' }), 'You'),
        el('span', { class: 'chip' }, 'Each place shows its own icon'),
        el('span', { class: 'chip' }, el('i', { class: 'dot', style: 'background:#7fa0e0' }), 'Bus stops'),
        el('span', { class: 'chip' }, el('i', { class: 'dot', style: 'background:#a98be0' }), 'Night zones')),
      el('div', { class: 'rows' }, list.map(({ loc, dx, dy, steps, hours }) => {
        const sch = scheduleOf(loc.id), stt = sch ? statusAt(loc.id, st.day, clock.minute, st.seed) : null;
        return el('article', { class: 'row-card' },
          iconSvg(mapIcon(loc), 'px-icon'),
          el('div', { class: 'row-text' }, el('strong', {}, loc.name), el('span', {}, `${S.City.district(loc.district).name}${steps < 2 ? ' · you are here' : ` · ${dirName(dx, dy)}, about ${hours < 0.75 ? `${Math.max(10, Math.round(hours * 6) * 10)}m` : `${Math.round(hours * 2) / 2}h`} on foot`}`),
            stt ? el('small', { class: stt.open ? '' : 'warnline' }, stt.open ? 'Open now' : stt.sign) : null));
      })),
    ],
    actions: [{ label: 'Back', kind: 'primary', onClick: onBack }],
  });
}
