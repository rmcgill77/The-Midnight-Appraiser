// A stand-in for the old Clock (game/clock.js) for the continuous day and night (Phase 30).
// It has the same members the rest of the game already calls (state, minute, label, progress,
// hoursLeft, start, stop, tick, advanceMinutes, endDay, setSpan, extend, save, load, onDayEnd),
// backed by DayCycle, so the old code can run on the new clock a piece at a time.
//
// Differences from the old clock, on purpose:
//  - there are no spans: `setSpan` and `extend` do nothing, the clock just runs;
//  - `day` is the calendar date, 1-based like the sim's `st.day`, and changes at midnight;
//  - `minute` runs past midnight the way the night code expects (1 AM is 25:00, 4 AM is 28:00)
//    until 6 AM, when it goes back to plain clock minutes for the day;
//  - the clock only reaches 'ended' during a timed window (`beginTimed`), which is how a night run
//    gets its time limit. Closing time and the end of the day are the game's calls.

import { DayCycle } from './daycycle.js';
import { formatMinute } from './clock.js';

const DAY = 24 * 60;
const DAWN = 6 * 60;           // before this, the minute counts on from the evening (1 AM = 25:00)
const clamp01 = v => Math.max(0, Math.min(1, v));

export class ContinuousClock {
  constructor(config, { startT } = {}) {
    this.cfg = config;
    this.displayStep = config.clockDisplayStep;
    this.cycle = new DayCycle(config.cycle, startT == null ? {} : { startT });
    this.state = 'stopped';        // 'stopped' | 'running'
    this.onDayEnd = null;          // endDay(): "I'm done for the day": the game decides what that means
    this.onEvent = null;           // skipped nights and collapses, from the cycle
    this.timed = null;             // { start, end } in absolute game minutes: a night run's time limit
    this.errandHours = null;       // () => hours of errands left today; set by the game (the day's errand budget)
  }

  get continuous() { return true; }

  // ---- reading the time ----
  get day() { return this.cycle.date + 1; }
  get minuteOfDay() { return this.cycle.minuteOfDay; }
  // Minutes with the night after midnight counted on (1 AM = 25:00), until the window closes.
  get exactMinute() { const m = this.cycle.minuteOfDay; return m < DAWN ? m + DAY : m; }
  get minute() { return Math.floor(this.exactMinute / this.displayStep) * this.displayStep; }
  get label() { return formatMinute(this.cycle.minuteOfDay - (this.cycle.minuteOfDay % this.displayStep)); }

  // How far into the evening it is, as the old visuals expect: 0 in full daylight, rising through
  // the afternoon, 1 from 8 PM until 6 AM, and falling back to 0 by 8 AM.
  get progress() {
    if (this.timed) return clamp01((this.cycle.t - this.timed.start) / (this.timed.end - this.timed.start));
    const m = this.cycle.minuteOfDay;
    if (m >= 20 * 60 || m < 6 * 60) return 1;
    if (m < 8 * 60) return clamp01(1 - (m - 6 * 60) / 120);
    return clamp01((m - 8 * 60) / (12 * 60));
  }

  // The old errand and shop budgets are gone, so "hours left" is the time until the sleep window
  // closes, which is as long as anyone can stay up.
  get hoursLeft() {
    if (this.timed) return Math.max(0, (this.timed.end - this.cycle.t) / 60);
    const m = this.cycle.minuteOfDay, close = this.cfg.cycle.sleepTo;
    return (m < close ? close - m : DAY + close - m) / 60;
  }

  // ---- running it ----
  start() { if (this.state !== 'ended') this.state = 'running'; }
  stop() { if (this.state === 'running') this.state = 'stopped'; }
  setSpan() { /* no spans on the continuous clock */ }
  // Only a timed window can be extended (the night's grace period). Extending an ended one revives it.
  extend(min) {
    if (!this.timed) return;
    this.timed.end += min;
    if (this.state === 'ended') this.state = 'running';
  }

  // A time limit that starts now: when it runs out the clock reads 'ended' and onDayEnd('timeout')
  // is called once. Used for night runs. `endTimed` drops it (the run is over some other way).
  beginTimed(minutes) { this.timed = { start: this.cycle.t, end: this.cycle.t + minutes }; if (this.state === 'ended') this.state = 'stopped'; }
  endTimed() { this.timed = null; if (this.state === 'ended') this.state = 'stopped'; }

  // dtMs of real time. `paused` comes from the pause stack. True when a timed window just ran out.
  tick(dtMs, paused) {
    if (this.state !== 'running' || paused) return false;
    const left = this.timed ? this.timed.end - this.cycle.t : Infinity;
    this.#emit(this.cycle.tick(Math.min(dtMs, left * this.cfg.cycle.msPerGameMinute)));
    return this.#checkTimed();
  }
  #checkTimed() {
    if (!this.timed || this.cycle.t < this.timed.end - 1e-9) return false;
    if (this.state === 'ended') return false;
    this.state = 'ended';                 // the window stays until endTimed(), so a grace period can extend it
    this.onDayEnd?.('timeout', this.day);
    return true;
  }
  advanceMinutes(min) {
    if (this.state === 'ended') return false;
    this.#emit(this.cycle.advance(this.timed ? Math.min(min, Math.max(0, this.timed.end - this.cycle.t)) : min));
    return this.#checkTimed();
  }
  #emit(events) { for (const e of events) this.onEvent?.(e); }

  // "End the day": the game maps this to going to bed, or to closing the shop.
  endDay() { this.onDayEnd?.('early', this.day); }
  nextDay() { /* the date changes at midnight on its own */ }

  // ---- saving ----
  save() { return { state: this.state, cycle: this.cycle.save(), timed: this.timed ? { ...this.timed } : null }; }
  load(d) {
    if (d?.cycle) this.cycle.load(d.cycle);
    this.timed = d?.timed && Number.isFinite(d.timed.end) ? { start: d.timed.start, end: d.timed.end } : (d?.cycle ? null : this.timed);
    this.state = d?.state === 'running' ? 'running' : d?.state === 'ended' && this.timed ? 'ended' : 'stopped';
    return this;
  }
}
