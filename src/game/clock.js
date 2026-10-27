// The day clock. States: stopped (morning choice, night before a dungeon),
// running (shop open, city, inside a dungeon). Pausing comes from the pause
// stack, so panels freeze time without the clock needing to know about them.

export class Clock {
  constructor({ dayLengthMs, dayStartMinute, dayEndMinute, clockDisplayStep }) {
    this.dayLengthMs = dayLengthMs;
    this.startMin = dayStartMinute; this.endMin = dayEndMinute;
    this.displayStep = clockDisplayStep;
    this.state = 'stopped';
    this.elapsedMs = 0;
    this.day = 1;
    this.onDayEnd = null;
  }

  // Each kind of day can set its own hours. Shop days run 8 AM to 8 PM over ten
  // minutes; errand days run the original's errand hours at a quicker pace.
  setSpan({ startMin, endMin, lengthMs }) {
    this.startMin = startMin; this.endMin = endMin; this.dayLengthMs = lengthMs;
    this.elapsedMs = Math.min(this.elapsedMs, lengthMs);
  }

  // Add time to the end of today (a ride upgrade's extra hours) without moving the clock.
  extend(min, ms) { this.endMin += min; this.dayLengthMs += ms; if (this.state === 'ended') this.state = 'running'; }

  get exactMinute() { return this.startMin + (this.endMin - this.startMin) * this.progress; }
  get hoursLeft() { return Math.max(0, (this.endMin - this.exactMinute) / 60); }

  start() { if (this.state !== 'ended') this.state = 'running'; }
  stop() { if (this.state === 'running') this.state = 'stopped'; }

  // dtMs of real time. `paused` comes from the pause stack.
  tick(dtMs, paused) {
    if (this.state !== 'running' || paused) return false;
    this.elapsedMs = Math.min(this.dayLengthMs, this.elapsedMs + dtMs);
    if (this.elapsedMs >= this.dayLengthMs) { this.#finish('timeout'); return true; }
    return false;
  }

  // Spend in-game minutes at once (a close appraisal, later the lab's segments).
  advanceMinutes(min) {
    if (this.state === 'ended') return false;
    this.elapsedMs = Math.min(this.dayLengthMs, this.elapsedMs + (min / (this.endMin - this.startMin)) * this.dayLengthMs);
    if (this.elapsedMs >= this.dayLengthMs) { this.#finish('timeout'); return true; }
    return false;
  }

  endDay() { if (this.state !== 'ended') this.#finish('early'); }

  nextDay() { this.day += 1; this.elapsedMs = 0; this.state = 'stopped'; }

  #finish(reason) { this.state = 'ended'; this.onDayEnd?.(reason, this.day); }

  get progress() { return this.elapsedMs / this.dayLengthMs; }

  // In-game minute since midnight, snapped to the display step like Stardew's 10-minute ticks.
  get minute() {
    const span = this.endMin - this.startMin;
    const raw = this.startMin + span * this.progress;
    return Math.floor(raw / this.displayStep) * this.displayStep;
  }

  get label() { return formatMinute(this.minute); }

  save() { return { state: this.state, elapsedMs: this.elapsedMs, day: this.day, span: { startMin: this.startMin, endMin: this.endMin, lengthMs: this.dayLengthMs } }; }
  load(d) {
    if (d?.span && d.span.lengthMs > 0) this.setSpan(d.span);
    this.state = ['stopped', 'running', 'ended'].includes(d?.state) ? d.state : 'stopped';
    this.elapsedMs = Math.max(0, Math.min(this.dayLengthMs, +d?.elapsedMs || 0));
    this.day = Math.max(1, Math.floor(+d?.day || 1));
    return this;
  }
}

export function formatMinute(m) {
  const h24 = Math.floor(m / 60) % 24, mm = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}
