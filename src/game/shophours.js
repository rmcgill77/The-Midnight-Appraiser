// The shop's weekly hours (Phase 30). The player sets them: up to eight hours on any day, at any
// time of day, set per day or the same every day, and at least one day a week the shop is closed.
// Pure: no DOM, no storage. Weekdays are 0 = Monday, like game/calendar.js.
//
// Hours that run past midnight belong to the date they started on: a Friday 8 PM-4 AM shift is
// Friday's hours, and the Saturday-morning part of it still counts as Friday's opening.

const DAY = 24 * 60;

const snap = (v, step) => Math.round(v / step) * step;

export class ShopHours {
  // cfg: CONFIG.shopHours.
  constructor(cfg) {
    this.cfg = cfg;
    this.mode = 'same';     // 'same': every open day uses `hours`; 'perDay': each day has its own
    this.week = Array.from({ length: 7 }, () => null);
    this.setSame({ open: cfg.defaultOpen, minutes: cfg.maxMinutes }, cfg.defaultClosedDay);
  }

  // A day's hours cleaned up: snapped to the slider's step, inside the limits. Throws on nonsense.
  clean({ open, minutes }) {
    if (!Number.isFinite(open) || !Number.isFinite(minutes)) throw new Error('hours need an opening time and a length');
    const { maxMinutes, minMinutes, stepMinutes } = this.cfg;
    const m = Math.min(maxMinutes, Math.max(minMinutes, snap(minutes, stepMinutes)));
    const o = ((snap(open, stepMinutes) % DAY) + DAY) % DAY;
    return { open: o, minutes: m };
  }

  // Every day the same, except the closed day(s). `closed` is a weekday or a list of weekdays.
  setSame(hours, closed) {
    const shut = new Set([].concat(closed));
    if (!shut.size || [...shut].some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('pick a closed day');
    if (shut.size > 6) throw new Error('the shop has to be open at least one day a week');
    const h = this.clean(hours);
    this.mode = 'same';
    this.week = Array.from({ length: 7 }, (_, d) => (shut.has(d) ? null : { ...h }));
  }

  // Set one day on its own (or close it with null). Refuses to leave the week with no closed day.
  setDay(weekday, hours) {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error('not a weekday');
    const next = this.week.map(h => (h ? { ...h } : null));
    next[weekday] = hours ? this.clean(hours) : null;
    if (!next.some(h => h === null)) throw new Error('the shop has to be closed at least one day a week');
    this.mode = 'perDay';
    this.week = next;
  }

  // ---- reading the hours ----
  hoursOn(weekday) { return this.week[weekday] ? { ...this.week[weekday], close: this.week[weekday].open + this.week[weekday].minutes } : null; }
  get closedDays() { return this.week.map((h, d) => (h ? null : d)).filter(d => d !== null); }
  get openDays() { return this.week.map((h, d) => (h ? d : null)).filter(d => d !== null); }

  // Is the shop open at absolute game minute `t`? `weekdayOf(date)` gives a date's weekday.
  // Returns the date whose hours cover `t` (the opening date, which may be yesterday), or null.
  openDate(t, weekdayOf) {
    const date = Math.floor(t / DAY);
    for (const d of [date, date - 1]) {
      const h = this.week[weekdayOf(d)];
      if (!h) continue;
      const from = d * DAY + h.open;
      if (t >= from && t < from + h.minutes) return d;
    }
    return null;
  }
  isOpen(t, weekdayOf) { return this.openDate(t, weekdayOf) !== null; }

  // How many in-game minutes until the shop next opens or closes, or null if it never opens.
  nextChange(t, weekdayOf) {
    const open = this.openDate(t, weekdayOf) !== null;
    for (let m = 1; m <= 8 * DAY; m++) if ((this.openDate(t + m, weekdayOf) !== null) !== open) return m;
    return null;
  }

  // The most hours the week allows, for a summary line.
  get weekMinutes() { return this.week.reduce((n, h) => n + (h ? h.minutes : 0), 0); }

  // ---- saving ----
  save() { return { mode: this.mode, week: this.week.map(h => (h ? { open: h.open, minutes: h.minutes } : null)) }; }
  load(d) {
    if (!d || !Array.isArray(d.week) || d.week.length !== 7) return this;
    try {
      const week = d.week.map(h => (h ? this.clean(h) : null));
      if (!week.some(h => h === null)) return this;
      this.week = week; this.mode = d.mode === 'perDay' ? 'perDay' : 'same';
    } catch { /* keep the defaults */ }
    return this;
  }
}
