// DOM overlays drawn above the canvas: HUD, modal panels, toasts.
// Opening a panel holds a pause reason; closing releases it.

import { formatDate, calendarKey } from '../game/calendar.js';

const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
}

// The way out of a panel: spec.back, or an action called Back/Close/Done/Not yet/Resume, or plain close.
const OUT_LABELS = /^(back|close|done|not yet|resume|cancel|step away|back to the street|back to the evidence bin)$/i;
// Phase 19: exits the corner button already covers, so they needn't take a row at the bottom too.
const REDUNDANT = /^(back|close|done|cancel|step away|back to the street|back to the evidence bin)$/i;
function backOf(s) {
  if (s.back) return { go: s.back, label: 'Back', text: '‹ Back' };
  const a = s.actions?.find(x => OUT_LABELS.test(String(x.label).trim()) && !x.disabled);
  if (a) return { go: () => a.onClick?.(), label: a.label, text: /^back$/i.test(a.label) ? '‹ Back' : null };
  if (s.dismissable !== false) return { go: null, label: 'Close', text: null };
  return null;
}

const PRESS_KEYS = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyE']);

export class UI {
  constructor(pause) {
    this.pause = pause;
    this.modal = $('#modal'); this.sheet = $('#sheet');
    this.toastEl = $('#toast');
    this.clockEl = $('#clock-time'); this.dayEl = $('#clock-day'); this.stateEl = $('#clock-state');
    this.barEl = $('#clock-bar'); this.fpsEl = $('#fps'); this.cashEl = $('#cash'); this.heatEl = $('#heat'); this.runEl = $('#runbar');
    this.actionEl = $('#action'); this.actionLabel = $('#action-label');
    this.current = null;
    this._tq = []; this._toast = null; this.toastHold = null; this.onToast = null;
    this.toastEl.addEventListener('pointerdown', e => { e.stopPropagation(); this.#hideToast(); this.#pumpToast(); });
    this.modal.addEventListener('pointerdown', e => e.stopPropagation());
    // 1.0.1: the press that opens a panel never also presses something in it. A tap's click
    // only counts if the finger came down on the panel after it opened, and a key held from
    // before (Space, Enter, E) is ignored until it's let go and pressed again.
    this.pressedIn = false; this.held = new Set(); this.heldBefore = new Set();
    this.modal.addEventListener('pointerdown', () => { this.pressedIn = true; }, true);
    this.modal.addEventListener('click', e => {
      // A real tap or click (not a key, not the gamepad's programmatic press). Touch clicks can
      // arrive with detail 0, so the pointer type decides.
      const pointer = e.isTrusted && (e.pointerType ? e.pointerType !== '' : e.detail > 0);
      if (pointer && !this.pressedIn && e.target.closest?.('button, input, label, select')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    addEventListener('keydown', e => {
      if (this.current && this.heldBefore.has(e.code)) { e.preventDefault(); if (PRESS_KEYS.has(e.code)) e.stopImmediatePropagation(); return; }
      this.held.add(e.code);
    }, true);
    addEventListener('keyup', e => {
      const stale = this.heldBefore.delete(e.code);
      this.held.delete(e.code);
      if (stale && this.current) e.preventDefault();   // no activation on release; everyone still hears the key go up
    }, true);
    addEventListener('blur', () => { this.held.clear(); this.heldBefore.clear(); });
    // Where the reader last scrolled to. Read from here rather than from the sheet when a panel
    // re-renders: building the new body can briefly empty the old one, which snaps it to the top.
    this.sheet.addEventListener('scroll', () => { this.scrollY = this.sheet.scrollTop; }, { passive: true });
    this.scrollY = 0;
    addEventListener('keydown', e => {
      if (!this.current) return;
      if (e.code === 'Escape' && this.current.dismissable !== false) { e.preventDefault(); this.close(); return; }
      const typing = e.target?.closest?.('input[type="text"], textarea, select');
      // Keyboard play: arrows (or WASD) walk the panel's buttons; Tab stays inside the panel.
      if (!typing && ['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD'].includes(e.code)) { e.preventDefault(); this.focusStep(1); }
      else if (!typing && ['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA'].includes(e.code)) { e.preventDefault(); this.focusStep(-1); }
      else if (e.code === 'Tab') { e.preventDefault(); this.focusStep(e.shiftKey ? -1 : 1); }
    });
  }

  get isOpen() { return !!this.current; }

  // spec: { id, eyebrow, title, body: Node|Node[], actions: [{label, onClick, kind}], reason, dismissable, onClose }
  open(spec) {
    // Re-opening the same panel (a re-render) keeps the reader's scroll position.
    const keepScroll = this.current && this.current.id && this.current.id === spec.id ? Math.max(this.scrollY, this.sheet.scrollTop) : 0;
    if (this.current) this.#teardown(false);
    // A fresh panel (not a re-render of this one): whatever's being pressed right now belongs to before.
    this.pressedIn = false;
    if (!keepScroll) this.heldBefore = new Set(this.held);
    this.current = { reason: 'panel', dismissable: true, ...spec };
    this.pause.push(this.current.reason);
    const s = this.current;
    // Getting out is always one tap away: a Back/close button pinned to the top of the panel,
    // and short action rows pinned to the bottom, so you never scroll to leave.
    const out = backOf(s);
    if (out && !out.go) out.go = () => this.close();
    // An exit the corner button already covers (Back, Close, Done, Step away...) isn't repeated at the
    // bottom, unless it's the only way to go on. Exits that stay are never the bright main button.
    const isExit = a => REDUNDANT.test(String(a.label).trim());
    const all = s.actions || [];
    const others = all.filter(a => !isExit(a));
    const acts = (out && others.length ? others : out ? [] : all)
      .map(a => (isExit(a) && a.kind === 'primary' ? { ...a, kind: 'quiet' } : a));
    const head = el('div', { class: 'sheet-head' },
      el('p', { class: 'eyebrow' }, s.eyebrow || ''),
      out ? el('button', { type: 'button', class: `sheet-back ${out.text ? 'text' : ''}`, id: 'sheet-back', 'aria-label': out.label, onclick: () => out.go() }, out.text || '✕') : null);
    this.sheet.replaceChildren(...[
      head,
      el('h2', { id: 'sheet-title' }, s.title),
      el('div', { class: 'sheet-body' }, s.body ?? []),
      acts.length ? el('div', { class: `sheet-actions ${acts.length <= 3 && s.stickActions !== false ? 'stick' : ''}` },
        acts.map(a => el('button', { type: 'button', class: `btn ${a.kind || ''}`, id: a.id, disabled: !!a.disabled, onclick: () => a.onClick?.() }, a.label))) : null,
    ].filter(Boolean));
    this.modal.dataset.panel = s.id || '';
    this.modal.dataset.size = s.size || '';
    this.modal.hidden = false;
    this.sheet.scrollTop = keepScroll;
    this.scrollY = this.sheet.scrollTop;
    if (!keepScroll) requestAnimationFrame(() => this.sheet.querySelector('.btn.primary, .btn')?.focus({ preventScroll: true }));
    else this.sheet.classList.add('still');
  }

  close() { if (this.current) { this.#teardown(true); this.sheet.classList.remove('still'); } }

  #teardown(hide) {
    const s = this.current; this.current = null;
    this.pause.pop(s.reason);
    if (hide) this.modal.hidden = true;
    s.onClose?.();
  }

  // Notices (Phase 16): one at a time, in order, each up long enough to read (never shorter
  // than its length needs), a tap clears it early, and they wait while someone's talking.
  // A minor notice (a district name, a stock hand's note) is dropped if something else is up.
  toast(text, ms = 2200, { minor = false } = {}) {
    if (!text) return;
    this.onToast?.(text);
    const busy = !!this._toast || this._tq.length > 0;
    if (minor && busy) return;
    if (this._toast?.text === text || this._tq.some(t => t.text === text)) return;
    this._tq.push({ text, at: performance.now(), left: Math.max(ms, Math.min(7000, 1500 + text.length * 48)) });
    if (this._tq.length > 4) this._tq.splice(0, this._tq.length - 4);
    this.#pumpToast();
  }

  // Called every frame by main with the frame time in ms.
  tickToasts(ms) {
    const held = !!this.toastHold?.();
    const t = this._toast;
    if (t) {
      this.toastEl.hidden = held;
      if (!held) { t.left -= ms; if (t.left <= 0) this.#hideToast(); }
    }
    if (!held) this.#pumpToast();
  }

  #pumpToast() {
    if (this._toast || this.toastHold?.()) return;
    // A notice that waited too long (behind a long conversation) is stale by now: it's in the log.
    const now = performance.now();
    while (this._tq.length && now - this._tq[0].at > 12000) this._tq.shift();
    if (!this._tq.length) return;
    this._toast = this._tq.shift();
    this.toastEl.textContent = this._toast.text; this.toastEl.hidden = false;
    this.toastEl.classList.remove('in'); void this.toastEl.offsetWidth; this.toastEl.classList.add('in');
  }

  #hideToast() { this._toast = null; this.toastEl.hidden = true; }
  clearToasts() { this._tq = []; this.#hideToast(); }

  setClock({ day, label, state, progress }) {
    if (this._ck !== label) { this.clockEl.textContent = label; this._ck = label; }
    const dk = `${day}|${calendarKey()}`;   // v2.0: the date, from the world's calendar
    if (this._dy !== dk) { this.dayEl.textContent = formatDate(day); this.dayEl.title = `Day ${day}`; this._dy = dk; }
    if (this._st !== state) { this.stateEl.dataset.state = state; this.stateEl.textContent = state; this._st = state; }
    const w = (progress * 100).toFixed(1) + '%';
    if (this._pw !== w) { this.barEl.style.width = w; this._pw = w; }
  }

  setCash(n) {
    if (this._cash === n) return;
    this._cash = n; this.cashEl.textContent = `$${Math.round(n).toLocaleString()}`;
  }

  setHeat(n) {
    if (this._heat === n) return;
    this._heat = n; this.heatEl.textContent = `Heat ${n}`;
    this.heatEl.dataset.level = n >= 75 ? 'high' : n >= 50 ? 'mid' : 'low';
  }

  // Night-run meters under the clock: light, stamina, stress, bag. null hides them.
  setRun(r) {
    const key = r ? `${r.light}|${r.stamina}|${r.stress}|${r.bag}|${r.cap}|${r.tired}|${r.shield}` : '';
    if (this._run === key) return;
    this._run = key;
    this.runEl.hidden = !r;
    if (!r) return;
    const set = (name, frac, text) => {
      const row = this.runEl.querySelector(`[data-m="${name}"]`);
      row.querySelector('i').style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
      row.querySelector('b').textContent = text;
    };
    set('light', r.light / 100, `${r.light}%`);
    set('stamina', r.stamina / r.maxStamina, r.tired ? 'winded' : String(r.stamina));
    this.runEl.querySelector('[data-m="stamina"]').classList.toggle('low', !!r.tired);
    set('stress', r.stress / 100, String(r.stress));
    set('bag', r.bag / r.cap, `${r.bag}/${r.cap}`);
    // Phase 29: Kristen's shield, while it lasts: stress soaks into it first.
    const sh = this.runEl.querySelector('[data-m="shield"]');
    if (sh) { sh.hidden = !(r.shield > 0); if (r.shield > 0) set('shield', r.shield / (r.shieldMax || r.shield), String(r.shield)); }
    this.runEl.querySelector('[data-m="light"]').classList.toggle('low', r.light < 25);
    this.runEl.querySelector('[data-m="stress"]').classList.toggle('low', r.stress >= 75);
  }

  // v2.4: out in the city at night: how much the dark has noticed you, and your nerve.
  setNight(r) {
    const key = r ? `${Math.round(r.seen)}|${r.stress}` : '';
    if (this._night === key) return;
    this._night = key;
    const box = this.nightEl ??= document.getElementById('nightbar');
    if (!box) return;
    box.hidden = !r;
    if (!r) return;
    const set = (name, frac, text) => { const row = box.querySelector(`[data-m="${name}"]`); row.querySelector('i').style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`; row.querySelector('b').textContent = text; };
    set('seen', r.seen / 100, r.seen >= 70 ? 'followed' : r.seen >= 35 ? 'watched' : r.seen > 5 ? 'noticed' : 'unseen');
    box.querySelector('[data-m="seen"]').classList.toggle('high', r.seen >= 70);
    set('nerve', r.stress / 100, String(r.stress));
    box.querySelector('[data-m="nerve"]').classList.toggle('low', r.stress >= 75);
  }

  // Phase 18: the Run button, shown only on night runs. null hides it.
  setSprint(r) {
    const key = r ? `${r.on}|${r.tired}` : '';
    if (this._sp === key) return;
    this._sp = key;
    const b = this.sprintEl ??= document.getElementById('sprint');
    if (!b) return;
    b.hidden = !r;
    if (!r) return;
    b.classList.toggle('on', !!r.on); b.classList.toggle('tired', !!r.tired);
    b.setAttribute('aria-label', r.tired ? 'Out of breath' : 'Sprint (hold)');
  }

  setAction(label) {
    const on = !!label;
    if (this._al === label) return;
    this._al = label;
    this.actionLabel.textContent = label || 'Act';
    this.actionEl.classList.toggle('idle', !on);
    this.actionEl.setAttribute('aria-label', on ? label : 'Nothing to interact with');
  }

  // ---------- keyboard and gamepad navigation inside a panel ----------

  focusables() {
    return [...this.sheet.querySelectorAll('button, input, select, summary, [tabindex]:not([tabindex="-1"])')]
      .filter(n => !n.disabled && n.offsetParent !== null);
  }

  focusStep(dir) {
    const list = this.focusables(); if (!list.length) return;
    const i = list.indexOf(document.activeElement);
    const next = list[i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length];
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest' });
    this.sheet.classList.add('nav');           // show the focus ring for pad and keys
  }

  // Gamepad A: press whatever is focused (or the panel's main button).
  activate() {
    let t = document.activeElement;
    if (!t || !this.sheet.contains(t)) t = this.sheet.querySelector('.btn.primary:not(:disabled)') || this.focusables()[0];
    if (!t) return;
    if (t.matches('input[type="checkbox"]')) t.click();
    else if (t.matches('input[type="range"]')) return;
    else t.click();
  }

  // Gamepad left/right on a slider nudges it.
  nudge(dir) {
    const t = document.activeElement;
    if (t?.matches?.('input[type="range"]') && this.sheet.contains(t)) {
      t.value = String(Math.max(+t.min, Math.min(+t.max, +t.value + dir * (+t.step || 0.1))));
      t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  // Gamepad B: close, or press the panel's Back / quiet button.
  back() {
    if (!this.current) return;
    const out = this.sheet.querySelector('#sheet-back');
    if (out) return out.click();
    if (this.current.dismissable !== false) return this.close();
    const b = [...this.sheet.querySelectorAll('.sheet-actions .btn.quiet:not(:disabled)')].pop();
    b?.click();
  }

  setFps(show, v) {
    this.fpsEl.hidden = !show;
    if (show && this._fps !== v) { this.fpsEl.textContent = `${v} fps`; this._fps = v; }
  }
}
