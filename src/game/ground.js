// What the weather leaves on the ground (Phase 30), pure: how wet the streets are and how much snow
// lies on them. Rain wets the ground and it dries out slowly (faster on a bright, breezy, warm day);
// snow falls when it's cold, settles, and melts when it warms up (the meltwater wets the street).
// It is rebuilt from the climate, not saved: the first time it's asked for a moment it spins up from
// three days earlier, which is longer than the ground remembers.

import { sample } from './climate.js';

const H = 60, STEP = 20;                  // game minutes per step
const SPIN_UP = 72 * H;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export class Ground {
  // monthOf(date): the fractional month for a calendar date (see climate.js).
  constructor(seed, monthOf = () => 8) {
    this.seed = seed; this.monthOf = monthOf;
    this.t = null; this.wet = 0; this.snow = 0;
  }

  advanceTo(t) {
    if (this.t === null || t < this.t || t - this.t > SPIN_UP) {
      this.wet = 0; this.snow = 0;
      this.t = Math.max(0, t - SPIN_UP);
      this.t = Math.floor(this.t / STEP) * STEP;
    }
    while (this.t + STEP <= t) { this.#step(this.t + STEP / 2); this.t += STEP; }
    return this;
  }

  #step(at) {
    const s = sample(this.seed, at, { month: this.monthOf(Math.floor(at / 1440)) }), dh = STEP / H;
    const falling = s.precip > 0.1 ? s.precip : 0, cold = s.temp <= 0.8;
    // rain wets the ground; snow settles on it
    if (!cold) this.wet += falling * 1.4 * dh;
    else this.snow += falling * 0.35 * dh;
    // snow melts when it's above freezing, a little faster in rain, and the meltwater wets the street
    if (this.snow > 0 && s.temp > 0.3) {
      const melt = Math.min(this.snow, (0.03 * s.temp + (cold ? 0 : falling * 0.06)) * dh);
      this.snow -= melt; this.wet += melt * 0.9;
    }
    // drying: sun, warmth and wind take the water off, slowly when it's cold and grey
    const dry = (0.03 + 0.05 * (1 - s.cloud) + 0.012 * s.wind + 0.004 * Math.max(0, s.temp)) * dh * (s.temp < -1 ? 0.3 : 1);
    if (!(falling && !cold)) this.wet -= dry;
    this.wet = clamp(this.wet); this.snow = clamp(this.snow);
  }

  // Puddles stand once the street is properly wet.
  get puddles() { return clamp((this.wet - 0.35) / 0.5); }
  get raining() { return this.wet > 0 && this.#raining; }
  #raining = false;
  setRaining(on) { this.#raining = !!on; }
}
