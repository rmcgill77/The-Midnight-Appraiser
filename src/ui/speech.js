// Someone talking (Phase 16 rebuild). Three kinds of line:
//   'talk'  someone in the room, you included. The world waits: the box rises from the
//           bottom with a sound, the line types out, and it stays until you tap (the
//           strip, anywhere on the screen, the round button, E/Space/Enter or A).
//   'text'  a text message on your phone. Same as talk, styled as a message.
//   'radio' Mina on the radio during a night run. The world doesn't wait: a compact box
//           at the top of the screen, on a timer you can see, a little slower than reading
//           pace. Tap it to skip ahead.
// Every line, and every notice the game shows, goes into a log you can reopen from the
// menu (or with L), so nothing said is ever lost.
//
// A line is a string (said by whoever the say() call names) or { who, text } for a
// different speaker mid-conversation: { who: 'you', text } is the player.
//
// Phase 20: a line can end in choices: { text, choices: [{ text }], onChoose(i) }. Once it
// has typed out, the choices show under it and the conversation waits for one (tap it,
// press its number, or move with the arrows / d-pad and press E, Enter or A). What you
// picked goes into the log in your own voice, then onChoose decides what's said next.

import { fillPronouns } from '../game/pronouns.js';
import { el } from './ui.js';

// How long a radio line stays up once it has finished typing, and how long a talk line
// waits before moving on by itself when auto-advance is on.
export const radioTime = text => Math.min(11, Math.max(4, 2 + text.length * 0.07));
export const readTime = text => Math.min(9, Math.max(2.8, 1.6 + text.length * 0.06));
// Typing speed, characters a second.
export const TEXT_SPEEDS = { slow: 28, normal: 50, fast: 95, instant: Infinity };
export const LOG_MAX = 120;

export class Speech {
  constructor(root, { hintEl = null, dimEl = null } = {}) {
    this.root = root; this.hintEl = hintEl; this.dimEl = dimEl;
    this.queue = []; this.cur = null; this.t = 0; this.shown = 0; this.hint = null;
    this.history = [];
    // Hooks main fills in: who -> portrait canvas, who -> display name, the key to press,
    // the settings (text speed, auto-advance, reduced motion), a sound for an arrival,
    // and the day for log entries.
    this.portraitFor = null; this.nameOf = who => (who === 'you' ? 'You' : who);
    this.keyLabel = () => 'Tap'; this.settings = {}; this.onArrive = null; this.onLine = null; this.dayOf = () => null;
    this.faceOf = undefined; this.visible = false; this.sel = 0; this.onChoice = null;
    if (!root) return;
    this.faceEl = el('span', { class: 'say-face', 'aria-hidden': 'true' });
    this.whoEl = el('span', { class: 'say-who' });
    this.titleEl = el('span', { class: 'say-title' });   // Phase 21: "The Nerdy Librarian"
    this.titleOf = () => null;
    this.countEl = el('span', { class: 'say-count', 'aria-hidden': 'true' });
    this.typedEl = el('span', { class: 'say-typed' });
    this.restEl = el('span', { class: 'say-rest' });
    this.textEl = el('p', { class: 'say-text', 'aria-hidden': 'true' }, this.typedEl, this.restEl);
    this.srEl = el('p', { class: 'sr-only' });
    this.barEl = el('i');
    this.timerEl = el('span', { class: 'say-timer', 'aria-hidden': 'true' }, this.barEl);
    this.nextEl = el('span', { class: 'say-next', 'aria-hidden': 'true' });
    this.choicesEl = el('div', { class: 'say-choices', role: 'group', 'aria-label': 'Your answer' });
    this.choicesEl.hidden = true;
    this.bodyEl = el('div', { class: 'say-body' },
      el('div', { class: 'say-head' }, el('span', { class: 'say-name' }, this.whoEl, this.titleEl), this.countEl),
      this.textEl, this.srEl, this.choicesEl,
      el('div', { class: 'say-foot' }, this.timerEl, this.nextEl));
    root.append(this.faceEl, this.bodyEl);
    root.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (e.target.closest?.('.say-choice')) return;      // the button's own click picks it
      e.preventDefault(); this.tap();
    });
    root.addEventListener('animationend', () => root.classList.remove('arrive', 'swap'));
    this.#paint();
  }

  // Replace what's being said (or add to it) with these lines.
  say(lines, { who = 'Mina', kind = 'talk', replace = true } = {}) {
    const add = [].concat(lines).filter(Boolean).map(l => (typeof l === 'string' ? { text: l, who, kind } : { who, kind, ...l }))
      .map(l => (this.pronounsOf && typeof l.text === 'string' && l.text.includes('{') ? { ...l, text: fillPronouns(l.text, this.pronounsOf()) } : l));
    if (!add.length) return;
    if (replace) { this.queue = add; this.cur = null; } else this.queue.push(...add);
    if (!this.cur) this.next();
    else this.#paintCount();
  }

  setHint(text) { if (this.hint !== text) { this.hint = text || null; this.#paintHint(); } }

  // The next line, or nothing.
  next() {
    const was = this.cur;
    this.cur = this.queue.shift() ?? null; this.t = 0;
    this.index =this.cur ? (was ? this.index + 1 : 1) : 0;
    if (this.cur) {
      this.shown = this.#instant() ? this.cur.text.length : 0;
      this.#log({ who: this.cur.who, kind: this.cur.kind, text: this.cur.text });
      this.onLine?.(this.cur);
    }
    this.#paint(was);
  }

  // A tap: finish the line if it's still typing, otherwise move on. A tap on the box
  // never picks an answer for you: only the choices themselves (or confirm) do.
  tap() {
    if (!this.cur) return false;
    if (this.typing) { this.shown = this.cur.text.length; this.#paintText(); return true; }
    if (this.choosing) return false;
    this.next();
    return true;
  }

  // The round button (E, Space, Enter, A): pick the highlighted answer, or tap.
  confirm() { return this.choosing ? this.choose(this.sel) : this.tap(); }
  // Move the highlight up or down the answers.
  move(d) {
    if (!this.choosing) return false;
    const n = this.cur.choices.length;
    this.sel = (this.sel + d + n) % n;
    this.#paintChoices();
    return true;
  }
  // Pick an answer: it's said in your voice (in the log), then the conversation goes on.
  choose(i) {
    if (!this.choosing) return false;
    const c = this.cur.choices[i];
    if (!c) return false;
    const line = this.cur;
    this.#log({ who: 'you', kind: line.kind, text: c.log ?? c.text });
    this.onChoice?.(i);
    this.queue = []; this.cur = null; this.index = 0;
    line.onChoose?.(i, c);
    if (!this.cur) this.#paint();
    return true;
  }

  clear() { this.queue = []; this.cur = null; this.hint = null; this.index = 0; this.#paint(); this.#paintHint(); }

  // A notice the game showed (a toast): kept in the log with everything said.
  note(text) { if (text) this.#log({ who: null, kind: 'note', text }); }

  get busy() { return !!this.cur || this.queue.length > 0; }
  get typing() { return !!this.cur && this.shown < this.cur.text.length; }
  // A line that holds the world until it's tapped through: everything but the radio.
  get waiting() { return !!this.cur && this.cur.kind !== 'radio'; }
  get talking() { return this.cur && this.cur.kind === 'talk' ? this.cur.who : null; }
  get more() { return this.queue.length > 0; }
  // Waiting on you to pick an answer.
  get choosing() { return !!this.cur?.choices?.length && !this.typing; }

  // Called every frame. While a panel is open the box hides and the line waits.
  update(dt, hidden) {
    if (this.root) {
      const show = !hidden && !!this.cur;
      if (show && !this.visible) this.#arrive();
      this.visible = show;
      this.root.hidden = !show;
      this.dimEl && (this.dimEl.hidden = !show || this.cur.kind === 'radio');
      if (this.hintEl) this.hintEl.hidden = hidden || !!this.cur || !this.hint;
    }
    if (hidden || !this.cur) return;
    const c = this.cur;
    if (this.typing) {
      const cps = TEXT_SPEEDS[this.settings.textSpeed] ?? TEXT_SPEEDS.normal;
      this.shown = this.#instant() ? c.text.length : Math.min(c.text.length, this.shown + dt * cps);
      this.#paintText();
      return;
    }
    this.t += dt;
    if (c.kind === 'radio') {
      const T = radioTime(c.text);
      if (this.barEl) this.barEl.style.transform = `scaleX(${Math.max(0, 1 - this.t / T).toFixed(3)})`;
      if (this.t >= T) this.next();
    } else if (this.settings.autoAdvance && !c.choices?.length && this.t >= readTime(c.text)) this.next();
  }

  // The log, oldest first. Kept in the save (see main.js), trimmed to LOG_MAX.
  load(list) { this.history = Array.isArray(list) ? list.filter(x => x && typeof x.text === 'string').slice(-LOG_MAX) : []; }

  #instant() { return !!this.settings.reducedMotion || this.settings.textSpeed === 'instant'; }

  #log(entry) {
    const name = entry.who ? this.nameOf(entry.who) : null;
    const last = this.history[this.history.length - 1];
    if (last && last.text === entry.text && last.kind === entry.kind) return;   // the same notice twice in a row
    this.history.push({ ...entry, name, day: this.dayOf() ?? null });
    if (this.history.length > LOG_MAX) this.history.splice(0, this.history.length - LOG_MAX);
  }

  #arrive() {
    if (!this.root) return;
    this.root.classList.remove('swap');
    if (!this.settings.reducedMotion) { void this.root.offsetWidth; this.root.classList.add('arrive'); }
    this.onArrive?.(this.cur.kind, this.cur.who);
  }

  #paint(was = null) {
    if (!this.root) return;
    const c = this.cur;
    if (!c) { this.root.hidden = true; this.visible = false; if (this.dimEl) this.dimEl.hidden = true; this.choicesEl.hidden = true; return; }
    this.sel = 0;
    const r = this.root;
    r.dataset.kind = c.kind;
    r.dataset.side = c.who === 'you' ? 'right' : 'left';
    const name = this.nameOf(c.who);
    this.whoEl.textContent = c.kind === 'radio' ? `${name} · radio` : c.kind === 'text' ? `Text from ${name}` : name;
    this.titleEl.textContent = c.kind === 'talk' ? (this.titleOf?.(c.who) ?? '') : '';
    this.srEl.textContent = `${this.whoEl.textContent}: ${c.text}`;
    if (this.faceOf !== c.who) {
      this.faceOf = c.who;
      const face = this.portraitFor?.(c.who) ?? null;
      this.faceEl.replaceChildren(...(face ? [face] : []));
    }
    r.classList.toggle('has-face', !!this.faceEl.firstChild);
    // A new speaker mid-conversation: a quick swap so it's clear someone else is talking.
    if (was && was.who !== c.who && this.visible && !this.settings.reducedMotion) { r.classList.remove('swap'); void r.offsetWidth; r.classList.add('swap'); this.onArrive?.(c.kind, c.who, true); }
    if (this.barEl) this.barEl.style.transform = 'scaleX(1)';
    this.#paintCount();
    this.#paintText();
  }

  #paintCount() {
    if (!this.root || !this.cur) return;
    const total = (this.index || 1) + this.queue.length;
    this.countEl.textContent = total > 1 ? `${this.index} / ${total}` : '';
  }

  #paintText() {
    if (!this.root || !this.cur) return;
    const t = this.cur.text, n = Math.floor(this.shown);
    this.typedEl.textContent = t.slice(0, n);
    this.restEl.textContent = t.slice(n);
    const done = n >= t.length;
    this.root.classList.toggle('typing', !done);
    if (this.cur.kind === 'radio') { this.nextEl.textContent = done ? 'skip' : ''; return; }
    const asking = done && !!this.cur.choices?.length;
    this.root.classList.toggle('asking', asking);
    if (asking && this.choicesEl.hidden) this.#paintChoices();
    else if (!asking && !this.choicesEl.hidden) { this.choicesEl.hidden = true; this.choicesEl.replaceChildren(); }
    this.nextEl.textContent = asking ? '' : done ? `${this.queue.length ? 'Next' : 'Close'} · ${this.keyLabel()}` : '';
  }

  #paintChoices() {
    const list = this.cur?.choices ?? [];
    const keys = this.keyLabel() !== 'tap';
    this.choicesEl.replaceChildren(...list.map((c, i) => {
      const b = el('button', { type: 'button', class: `say-choice${i === this.sel ? ' sel' : ''}${c.tone ? ` ${c.tone}` : ''}`, id: `say-choice-${i}`,
        onclick: e => { e.stopPropagation(); this.choose(i); } },
        keys ? el('kbd', {}, String(i + 1)) : null, el('span', {}, c.text), c.note ? el('small', {}, c.note) : null);
      return b;
    }));
    this.choicesEl.hidden = !list.length;
  }

  #paintHint() {
    if (!this.hintEl) return;
    this.hintEl.textContent = this.hint || '';
    this.hintEl.hidden = !this.hint || !!this.cur;
  }
}
