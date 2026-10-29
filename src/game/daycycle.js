// The continuous day and night (Phase 30). One clock runs through the whole day and night;
// the player's day runs from waking up to going to sleep. Pure: no DOM, no storage.
//
// Time is a count of in-game minutes since midnight at the start of date 0 (`t`), so the
// calendar date (which changes at midnight) and the time of day both come from it.
//
// Sleep rules: sleeping is only allowed from 8 PM to 10 AM, once per window. It fast-forwards,
// and takes at least 6 hours, unless 10 AM arrives first (a cut-short sleep: slow walking until
// the next full sleep). A window that closes with no sleep taken in it is a skipped night:
//   1 skipped: slower, and mistakes in the shop
//   2 skipped: the screen plays tricks as well
//   3 skipped: the player collapses and misses a whole day (wakes at 10 AM two dates later)
// A full sleep clears the count.
//
// Events from advance()/tick(): 'midnight' (the calendar date changed), 'skipped' and 'collapse'.
// A sleep fast-forwards without events; the caller catches up on the dates it crossed (`dates`).

import { formatMinute } from './clock.js';

const DAY = 24 * 60;

export class DayCycle {
  // startT: where the game begins (default 8 AM on date 0). cfg: CONFIG.cycle.
  // wokeUp: the player has just woken, so a sleep window that is already open counts as slept.
  constructor(cfg, { startT = 8 * 60, wokeUp = true } = {}) {
    this.cfg = cfg;
    this.t = startT;
    this.skipped = 0;          // nights skipped in a row
    this.shortSleep = false;   // the last sleep was cut short; cleared by the next full sleep
    this.collapses = 0;
    this.sleptWindow = null;   // the newest window a sleep was taken in
    const k = this.#windowAt(startT);
    this.sleptWindow = wokeUp ? k : null;
    this.nextClose = k ?? this.#nextWindowAfter(startT);
    this.running = true;
  }

  // ---- the two clocks ----
  get date() { return Math.floor(this.t / DAY); }               // changes at midnight
  get minuteOfDay() { return Math.floor(this.t - this.date * DAY); }
  get label() { return formatMinute(this.minuteOfDay); }

  // ---- sleep windows: window k runs from 8 PM on date k to 10 AM on date k+1 ----
  #start(k) { return k * DAY + this.cfg.sleepFrom; }
  #close(k) { return (k + 1) * DAY + this.cfg.sleepTo; }
  // The window `t` is inside, or null between 10 AM and 8 PM.
  #windowAt(t) {
    const base = Math.floor(t / DAY);
    for (const k of [base - 1, base]) if (t >= this.#start(k) && t < this.#close(k)) return k;
    return null;
  }
  #nextWindowAfter(t) {
    for (let k = Math.floor(t / DAY) - 2; ; k++) if (this.#close(k) > t) return k;
  }

  get window() { return this.#windowAt(this.t); }
  // When the window the player is in closes (10 AM), or null outside a window.
  get windowEnd() { const k = this.#windowAt(this.t); return k === null ? null : this.#close(k); }
  get canSleep() { const k = this.#windowAt(this.t); return this.running && k !== null && this.sleptWindow !== k; }
  // Why not, for the bed's message.
  get sleepBlock() {
    if (this.canSleep) return null;
    const k = this.#windowAt(this.t);
    return k === null ? 'tooEarly' : 'alreadySlept';
  }

  // ---- what the player is suffering ----
  get penalties() {
    const n = this.skipped;
    return { slow: n >= 1 || this.shortSleep, shopMistakes: n >= 1, screenEffects: n >= 2, collapseNext: n >= this.cfg.skipsToCollapse - 1 };
  }

  // Advance by real milliseconds of awake play. Returns the events that happened, in order.
  tick(dtMs, paused = false) {
    if (!this.running || paused) return [];
    return this.advance(dtMs / this.cfg.msPerGameMinute);
  }

  // Advance by in-game minutes. Stops at each window close so skipped nights are counted.
  advance(minutes) {
    const events = [];
    let left = minutes;
    while (left > 1e-9) {
      const close = this.#close(this.nextClose);
      const midnight = (Math.floor(this.t / DAY) + 1) * DAY;
      const step = Math.min(left, Math.min(close, midnight) - this.t);
      this.t += step; left -= step;
      if (this.t >= midnight - 1e-9) { this.t = Math.max(this.t, midnight); events.push({ type: 'midnight', date: midnight / DAY }); }
      if (this.t >= close - 1e-9) { this.t = close; events.push(...this.#windowClosed(this.nextClose)); this.nextClose = this.#nextWindowAfter(this.t); }
    }
    return events;
  }

  #windowClosed(k) {
    if (this.sleptWindow === k) return [];
    this.skipped += 1;
    const events = [{ type: 'skipped', count: this.skipped, date: this.date }];
    if (this.skipped >= this.cfg.skipsToCollapse) events.push(this.#collapse());
    return events;
  }

  // The third skipped night: the player passes out and the whole next date is lost.
  #collapse() {
    const missedDate = this.date;                      // the date that just began
    this.t = (missedDate + 1) * DAY + this.cfg.sleepTo; // wakes at 10 AM the day after
    this.skipped = 0; this.shortSleep = false; this.collapses += 1;
    this.sleptWindow = this.#windowAt(this.t);
    return { type: 'collapse', missedDate };
  }

  // Go to sleep now. `until` (optional, in-game minute) is when to wake: never earlier than
  // 6 hours, never later than 10 AM. Returns { ok, ... }.
  sleep({ until = null } = {}) {
    const k = this.#windowAt(this.t);
    if (!this.canSleep) return { ok: false, reason: this.sleepBlock };
    const start = this.t, close = this.#close(k);
    const earliest = start + this.cfg.minSleepMinutes;
    const wake = Math.min(close, Math.max(earliest, until ?? earliest));
    const slept = wake - start, full = slept >= this.cfg.minSleepMinutes, dates = Math.floor(wake / DAY) - Math.floor(start / DAY);
    this.sleptWindow = k;
    this.skipped = full ? 0 : this.skipped;
    this.shortSleep = !full;
    this.t = wake;
    this.nextClose = wake >= close ? this.#nextWindowAfter(wake) : this.nextClose;
    return { ok: true, start, wake, sleptMinutes: slept, full, cutShort: !full, dates };
  }

  // ---- saving ----
  save() { return { t: this.t, skipped: this.skipped, shortSleep: this.shortSleep, collapses: this.collapses, sleptWindow: this.sleptWindow }; }
  load(d) {
    if (!d || !Number.isFinite(d.t)) return this;
    this.t = d.t; this.skipped = Math.max(0, d.skipped | 0); this.shortSleep = !!d.shortSleep;
    this.collapses = Math.max(0, d.collapses | 0); this.sleptWindow = d.sleptWindow ?? null;
    this.nextClose = this.#nextWindowAfter(this.t);
    return this;
  }
}
