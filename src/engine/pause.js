// A pause stack keyed by reason. The world is paused while any reason is held,
// so a panel opened from the menu, or the tab hiding, never unpauses early.

export class PauseStack {
  constructor() { this.reasons = new Map(); this.listeners = new Set(); }

  push(reason) {
    const n = (this.reasons.get(reason) || 0) + 1;
    this.reasons.set(reason, n);
    if (n === 1 && this.reasons.size === 1) this.#emit();
  }

  pop(reason) {
    const n = this.reasons.get(reason) || 0;
    if (n <= 1) this.reasons.delete(reason); else this.reasons.set(reason, n - 1);
    if (n >= 1 && this.reasons.size === 0) this.#emit();
  }

  clear(reason) { if (this.reasons.delete(reason) && this.reasons.size === 0) this.#emit(); }

  has(reason) { return this.reasons.has(reason); }
  get paused() { return this.reasons.size > 0; }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  #emit() { for (const fn of this.listeners) fn(this.paused); }
}
