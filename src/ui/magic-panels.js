// Ryan, The Mystic Magician's street act (Phase 26): pick a trick, pay $5, play it.
// The rules and payouts are in game/magic.js; this draws the tricks with plain DOM and
// CSS transitions, so they work the same with a finger, a mouse, keys or a pad.
//
// hooks: { look, hoursLeft(), spend(hours), talk(), cue(name), rand(), where }

import { el } from './ui.js';
import { faceRow } from './portraits.js';
import { S } from '../rules/index.js';
import * as M from '../game/magic.js';

const money = n => S.money(n);
const pick = (list, rand) => list[Math.floor(rand() * list.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
// The result, scrolled into view (on a short screen it lands below the cards).
const show = (out, node) => { out.replaceChildren(node); requestAnimationFrame(() => out.scrollIntoView({ block: 'nearest' })); };

// The act: who he is, what's on, how many shows are left today.
export function openMagic(g, hooks) {
  const { ui, world } = g, st = g.st, rand = hooks.rand ?? Math.random;
  const left = M.showsLeft(world, st.day), why = M.showBlocker(world, st, hooks.hoursLeft?.() ?? Infinity);
  const m = M.magicState(world, st.day);
  ui.open({
    id: 'magic', eyebrow: hooks.where ?? 'Outside the Brass Lantern', title: 'Ryan, The Mystic Magician',
    body: [
      faceRow(hooks.look, 'Ryan', el('p', { class: 'speech' }, `“${M.PATTER[(st.day + m.shows) % M.PATTER.length]}”`)),
      hooks.hearts ? el('p', { class: 'hearts-line' }, el('span', { class: 'hearts', 'aria-label': hooks.hearts.label }, hooks.hearts.text), hooks.hearts.note ? el('span', { class: 'note' }, ` ${hooks.hearts.note}`) : null) : null,
      el('p', { class: 'note' }, `${money(M.PRICE)} a trick · ${left} show${left === 1 ? '' : 's'} left today · each takes 15 minutes. Any win has a ${Math.round(100 * (hooks.jackpotChance?.() ?? M.JACKPOT_CHANCE)) === 1 ? '1 in 100' : `${Math.round(100 * (hooks.jackpotChance?.() ?? M.JACKPOT_CHANCE))} in 100`} chance of paying ${money(M.JACKPOT)}.`),
      el('div', { class: 'magic-tricks' }, M.TRICK_ORDER.map(id => {
        const t = M.TRICKS[id];
        return el('button', { type: 'button', class: 'magic-trick', id: `trick-${id}`, disabled: !!why, onclick: () => start(g, hooks, id) },
          el('span', { class: `magic-ico ico-${t.icon}`, 'aria-hidden': 'true' }),
          el('strong', {}, t.name), el('span', {}, t.blurb), el('small', {}, `${money(M.PRICE)} · ${t.pays}`));
      })),
      why ? el('p', { class: 'warnline' }, why) : null,
      m.won ? el('p', { class: 'note' }, `You’ve won ${money(m.won)} off him${m.jackpots ? `, ${m.jackpots} jackpot${m.jackpots === 1 ? '' : 's'} included` : ''}.`) : null,
    ],
    actions: [
      ...(hooks.talk ? [{ id: 'magic-chat', label: hooks.hearts?.pending ? 'He wants to tell you something' : 'Just chat', kind: hooks.hearts?.pending ? 'primary' : '', onClick: () => hooks.talk() }] : []),
      { id: 'magic-leave', label: 'Back', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
  void rand;
}

// Pay, spend the time, then play the trick.
function start(g, hooks, id) {
  const { ui, world } = g, st = g.st;
  const why = M.payForShow(world, st, hooks.hoursLeft?.() ?? Infinity);
  if (why) { ui.toast(why); return; }
  hooks.spend?.(M.SHOW_HOURS);
  st.stress = Math.max(0, (st.stress ?? 0) - 3);
  hooks.onShow?.();   // a friend in the audience (Phase 26)
  g.changed();
  ({ monte: playMonte, hilo: playHilo, crystal: playCrystal })[id](g, hooks);
}

// The end of a trick: the result, the money, and what's next.
function finish(g, hooks, id, { win, prize = 0, line }) {
  const { ui, world } = g, st = g.st, rand = hooks.rand ?? Math.random;
  let res = null;
  if (win) res = M.payout(world, st, prize, rand, hooks.jackpotChance?.() ?? M.JACKPOT_CHANCE);
  hooks.cue?.(res?.jackpot ? 'casefile' : win ? 'coins' : 'refuse');
  if (win) S.log(st, res.jackpot ? `Ryan’s ${M.TRICKS[id].name}: a ${money(M.JACKPOT)} jackpot!` : `Won ${money(res.amount)} at Ryan’s ${M.TRICKS[id].name}.`, 'note');
  g.changed();
  const why = M.showBlocker(world, st, hooks.hoursLeft?.() ?? Infinity);
  return el('div', { class: `magic-result ${res?.jackpot ? 'jackpot' : win ? 'win' : 'lose'}`, role: 'status' },
    el('strong', {}, res?.jackpot ? `Jackpot! ${money(M.JACKPOT)}` : win ? `You win ${money(res.amount)}` : 'No luck this time'),
    el('p', {}, line ?? ''),
    res?.jackpot ? el('p', { class: 'speech' }, M.JACKPOT_LINE) : el('p', { class: 'speech' }, `“${pick(win ? M.WIN_LINES : M.LOSE_LINES, rand)}”`),
    el('div', { class: 'row-btns' },
      el('button', { type: 'button', class: 'btn small primary', id: 'magic-again', disabled: !!why, onclick: () => start(g, hooks, id) }, why && !/^Needs/.test(why) ? why : `Again · ${money(M.PRICE)}`),
      el('button', { type: 'button', class: 'btn small', id: 'magic-back', onclick: () => openMagic(g, hooks) }, 'Another trick')));
}

const shell = (g, hooks, id, body) => g.ui.open({
  id: `magic-${id}`, eyebrow: 'Ryan, The Mystic Magician', title: M.TRICKS[id].name, dismissable: false,
  body, actions: [], back: null,
});

function cardFace(card) {
  const red = card.s === 1 || card.s === 2;
  return el('span', { class: `pcard ${red ? 'red' : ''}` },
    el('b', { class: 'pc-tl' }, M.RANKS[card.v - 1], el('i', {}, M.SUITS[card.s])),
    el('span', { class: 'pc-mid' }, M.SUITS[card.s]),
    el('b', { class: 'pc-br' }, M.RANKS[card.v - 1], el('i', {}, M.SUITS[card.s])));
}

// ---------- Find the Lady ----------
function playMonte(g, hooks) {
  const rand = hooks.rand ?? Math.random, reduce = !!g.settings?.reducedMotion;
  const { start, swaps } = M.monteShuffle(rand, 6 + Math.floor(rand() * 3));
  const faces = [{ v: 11, s: 0 }, { v: 11, s: 3 }];
  const cards = [0, 1, 2].map(pos => {
    const queen = pos === start;
    const c = el('button', { type: 'button', class: 'mcard', id: `lady-${pos}`, 'data-pos': String(pos), 'aria-label': `Card ${pos + 1}`, disabled: true },
      el('span', { class: 'mc-front' }, cardFace(queen ? { v: 12, s: 1 } : faces.shift())), el('span', { class: 'mc-back' }));
    c.queen = queen;
    return c;
  });
  const table = el('div', { class: 'monte-table' }, cards);
  const msg = el('p', { class: 'note', id: 'monte-msg' }, 'There she is: the queen of hearts. Watch her.');
  const go = el('button', { type: 'button', class: 'btn primary', id: 'monte-go' }, 'Shuffle');
  const out = el('div', {});
  const place = () => cards.forEach(c => { c.style.setProperty('--pos', c.dataset.pos); });
  place();
  go.onclick = async () => {
    go.disabled = true; go.hidden = true;
    msg.textContent = 'Round and round she goes…';
    cards.forEach(c => c.classList.add('down'));
    await wait(reduce ? 200 : 650);
    const speed = reduce ? 520 : 300;
    table.style.setProperty('--speed', `${speed}ms`);
    for (const [a, b] of swaps) {
      const A = cards.find(c => +c.dataset.pos === a), B = cards.find(c => +c.dataset.pos === b);
      A.dataset.pos = String(b); B.dataset.pos = String(a);
      A.classList.add('lift'); B.classList.add('sink');
      place();
      await wait(speed + 40);
      A.classList.remove('lift'); B.classList.remove('sink');
    }
    msg.textContent = 'Where’s the lady?';
    cards.forEach(c => { c.disabled = false; });
    cards.sort((p, q) => +p.dataset.pos - +q.dataset.pos)[0].focus({ preventScroll: true });
  };
  cards.forEach(c => { c.onclick = () => {
    cards.forEach(x => { x.disabled = true; x.classList.remove('down'); });
    c.classList.add('picked');
    msg.textContent = c.queen ? 'The queen of hearts. Right where you said.' : 'A jack. The queen was the other way.';
    show(out, finish(g, hooks, 'monte', { win: c.queen, prize: M.MONTE_PRIZE }));
  }; });
  shell(g, hooks, 'monte', [msg, table, el('div', { class: 'row-btns center' }, go), out]);
}

// ---------- Higher or Lower ----------
function playHilo(g, hooks) {
  const rand = hooks.rand ?? Math.random;
  let cur = M.drawCard(rand), streak = 0, over = false;
  const cardBox = el('div', { class: 'hilo-card', id: 'hilo-card' });
  const ladder = el('ol', { class: 'hilo-ladder' });
  const msg = el('p', { class: 'note', id: 'hilo-msg' }, 'Will the next card be higher or lower? Aces are low. A tie doesn’t count.');
  const btns = el('div', { class: 'row-btns center' });
  const out = el('div', {});
  const render = () => {
    cardBox.replaceChildren(cardFace(cur));
    ladder.replaceChildren(...M.HILO_LADDER.map((v, i) => el('li', { class: i < streak ? 'done' : i === streak && !over ? 'next' : '' }, money(v))));
    if (over) { btns.replaceChildren(); return; }
    btns.replaceChildren(
      el('button', { type: 'button', class: 'btn primary', id: 'hilo-higher', disabled: cur.v === 13, onclick: () => call('higher') }, 'Higher'),
      el('button', { type: 'button', class: 'btn primary', id: 'hilo-lower', disabled: cur.v === 1, onclick: () => call('lower') }, 'Lower'),
      streak ? el('button', { type: 'button', class: 'btn', id: 'hilo-take', onclick: () => end(true) }, `Take ${money(M.hiloPot(streak))}`) : null);
  };
  const end = win => {
    over = true; render();
    show(out, finish(g, hooks, 'hilo', { win, prize: M.hiloPot(streak), line: win ? `${streak} right in a row.` : null }));
  };
  const call = c => {
    const next = M.drawCard(rand, cur), right = M.hiloRight(cur, next, c);
    cardBox.classList.remove('flip'); void cardBox.offsetWidth; cardBox.classList.add('flip');
    cur = next;
    if (!right) { msg.textContent = `${M.RANKS[next.v - 1]}${M.SUITS[next.s]}. Wrong call; the pot goes back in his hat.`; end(false); return; }
    streak += 1;
    if (streak >= M.HILO_LADDER.length) { msg.textContent = 'Four in a row! The top of the ladder.'; end(true); return; }
    msg.textContent = `Right! The pot is ${money(M.hiloPot(streak))}. Call again, or take it.`;
    render();
  };
  render();
  shell(g, hooks, 'hilo', [msg, el('div', { class: 'hilo-row' }, cardBox, ladder), btns, out]);
}

// ---------- The Crystal Ball ----------
function playCrystal(g, hooks) {
  const rand = hooks.rand ?? Math.random;
  const n = M.crystalNumber(rand);
  let lo = 1, hi = M.CRYSTAL_MAX, tries = 0, over = false;
  const ball = el('div', { class: 'crystal-ball', id: 'crystal-ball', 'aria-live': 'polite' }, el('span', {}, '?'));
  const msg = el('p', { class: 'note', id: 'crystal-msg' }, `I’m thinking of a number from 1 to ${M.CRYSTAL_MAX}. The ball will guide you. You have ${M.CRYSTAL_GUESSES} guesses.`);
  const grid = el('div', { class: 'crystal-grid' });
  const out = el('div', {});
  const render = () => {
    grid.replaceChildren(...Array.from({ length: M.CRYSTAL_MAX }, (_, i) => {
      const v = i + 1, off = v < lo || v > hi;
      return el('button', { type: 'button', class: `cnum ${off ? 'off' : ''} ${over && v === n ? 'is' : ''}`, id: `crystal-${v}`, disabled: over || off, onclick: () => guess(v) }, String(v));
    }));
  };
  const say = t => { ball.replaceChildren(el('span', {}, t)); ball.classList.remove('pulse'); void ball.offsetWidth; ball.classList.add('pulse'); };
  const guess = v => {
    tries += 1;
    const h = M.crystalHint(n, v);
    if (h === 'yes') { over = true; say(String(n)); render(); show(out, finish(g, hooks, 'crystal', { win: true, prize: M.crystalPrize(tries), line: `${n}, on guess ${tries}.` })); return; }
    if (h === 'higher') lo = Math.max(lo, v + 1); else hi = Math.min(hi, v - 1);
    if (tries >= M.CRYSTAL_GUESSES) { over = true; say(String(n)); msg.textContent = `It was ${n}.`; render(); show(out, finish(g, hooks, 'crystal', { win: false })); return; }
    say(h === 'higher' ? 'Higher…' : 'Lower…');
    msg.textContent = `${M.CRYSTAL_GUESSES - tries} guess${M.CRYSTAL_GUESSES - tries === 1 ? '' : 'es'} left. Right now that’s worth ${money(M.crystalPrize(tries + 1))}.`;
    render();
  };
  render();
  shell(g, hooks, 'crystal', [msg, ball, grid, out]);
}
