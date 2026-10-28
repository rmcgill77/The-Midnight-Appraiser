// Seeded RNG (mulberry32). Its state is one integer, so it saves and restores exactly.

export class RNG {
  constructor(seed = 1) { this.state = RNG.hash(seed) >>> 0; }

  static hash(seed) {
    if (typeof seed === 'number') return seed >>> 0;
    let h = 2166136261;
    for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }

  save() { return this.state; }
  load(state) { this.state = state >>> 0; return this; }
}
