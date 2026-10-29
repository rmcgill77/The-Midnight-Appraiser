// The weather's sound (Phase 23): a rain bed, a wind bed, thunder after each flash, and
// birds on a clear morning out on the street. Through the effects volume, so the sound
// settings apply. Indoors it's muffled; underground, barely there. The music changes mood
// too (weatherScene, below): the same tunes, in a darker or a brighter mode, slower or
// faster, with the weather's own noise underneath.

import { S } from '../rules/index.js';
import { windBed } from './wind.js';

// How loud each bed is, by weather (out on the street).
const BEDS = {
  clear: { rain: 0, wind: 0 },
  overcast: { rain: 0, wind: 0.012 },
  fog: { rain: 0, wind: 0.02 },
  rain: { rain: 0.055, wind: 0.01 },
  storm: { rain: 0.1, wind: 0.05 },
  snow: { rain: 0, wind: 0.04 },
};
// Where you are: how much of it reaches you, and how muffled.
const PLACES = {
  street: { gain: 1, cutoff: 12000 },
  indoor: { gain: 0.5, cutoff: 800 },
  windows: { gain: 0.35, cutoff: 900 },     // a night zone with windows (the laundromat, St. Agnes)
  under: { gain: 0.1, cutoff: 350 },        // underground
};

export class WeatherAudio {
  constructor() { this.ready = false; this.birdT = 3; }

  #build() {
    const Snd = S.Sound, c = Snd.ctx;
    if (!c || !Snd.sfx || this.ready) return !!this.ready;
    const src = buf => { const b = c.createBufferSource(); b.buffer = Snd[buf]; b.loop = true; return b; };
    const filt = (type, f, q = 0.7) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
    this.out = c.createGain(); this.out.gain.value = 1;
    this.muffle = filt('lowpass', 12000, 0.5);
    this.muffle.connect(this.out); this.out.connect(Snd.sfx);
    // Rain: bright hiss, a little patter.
    const r = src('white'), rh = filt('highpass', 900), rl = filt('lowpass', 6000);
    this.rain = c.createGain(); this.rain.gain.value = 0;
    r.connect(rh); rh.connect(rl); rl.connect(this.rain); this.rain.connect(this.muffle); r.start();
    // Wind: low and moving.
    const w = src('brown'), wb = filt('bandpass', 420, 0.9);
    this.windBand = wb;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 220; lfo.connect(lg); lg.connect(wb.frequency); lfo.start();
    this.wind = c.createGain(); this.wind.gain.value = 0;
    w.connect(wb); wb.connect(this.wind); this.wind.connect(this.muffle); w.start();
    this.ready = true;
    return true;
  }

  // Every frame: the beds follow the weather and where you are.
  update(dt, type, place, { on = true, birds = false, wind = null } = {}) {
    if (!S.Sound.ready?.() || !this.#build()) return;
    const c = S.Sound.ctx, now = c.currentTime;
    const bed = BEDS[type] ?? BEDS.overcast, P = PLACES[place] ?? PLACES.street, k = on ? P.gain : 0;
    this.rain.gain.setTargetAtTime(bed.rain * k, now, 1.2);
    const wb = wind == null ? null : windBed(wind);
    this.wind.gain.setTargetAtTime((wb ? Math.max(wb.gain, bed.wind * 0.3) : bed.wind) * k, now, 1.5);
    if (wb) this.windBand.frequency.setTargetAtTime(wb.freq, now, 2);
    this.muffle.frequency.setTargetAtTime(P.cutoff, now, 0.4);
    if (on && birds && type === 'clear' && place === 'street' && (this.birdT -= dt) <= 0) { this.birdT = 3 + Math.random() * 6; this.chirp(); }
  }

  // Thunder: a crack if it's near, then the long roll.
  thunder(near, place) {
    if (!S.Sound.ready?.() || !this.#build()) return;
    const Snd = S.Sound, t = Snd.ctx.currentTime + (near ? 0.15 : 0.6 + Math.random() * 1.2);
    const P = PLACES[place] ?? PLACES.street, g = P.gain;
    if (g < 0.05) return;
    try {
      if (near) Snd.hiss(this.muffle, { t, d: 0.25, g: 0.12 * g, type: 'highpass', f: 1500, buf: 'white' });
      Snd.hiss(this.muffle, { t: t + 0.05, d: near ? 3 : 2.4, g: (near ? 0.4 : 0.22) * g, type: 'lowpass', f: 220, to: 70, a: near ? 0.04 : 0.3, buf: 'brown' });
    } catch { /* a sound never breaks the game */ }
  }

  chirp() {
    const Snd = S.Sound, t = Snd.ctx.currentTime;
    try {
      const n = 2 + Math.floor(Math.random() * 3), f = 2400 + Math.random() * 900;
      for (let i = 0; i < n; i++) Snd.tone(this.muffle, { f: f * (1 + i * 0.04), to: f * 1.25, t: t + i * 0.11, a: 0.005, r: 0.07, g: 0.012 });
    } catch { /* no birds today */ }
  }
}

// The music, in the weather's mood: a variant of a scene registered alongside the
// original's (the original's own scenes are left as they are). Returns the scene to play.
const MOODS = {
  rain: { scale: 'minor', bpm: 0.88, bells: 0.6, noise: { kind: 'rain', gain: 0.02 } },
  storm: { scale: 'phrygian', bpm: 0.92, bells: 0.5, bass: 1.25, noise: { kind: 'rumble', gain: 0.03 } },
  snow: { scale: 'lydian', bpm: 0.8, bells: 1.5, noise: { kind: 'wind', gain: 0.015 } },
  fog: { scale: 'dorian', bpm: 0.85, bells: 0.5, noise: { kind: 'wind', gain: 0.015 } },
  clear: { bpm: 1.05, bells: 1.2 },
};
const MOODY = new Set(['errands', 'shop', 'morning', 'closed', 'street', 'title']);
export function weatherScene(base, type) {
  const m = MOODS[type], scenes = S.DATA?.scenes;
  if (!m || !scenes?.[base] || !MOODY.has(base)) return base;
  const name = `${base}~${type}`;
  if (!scenes[name]) {
    const def = structuredClone(scenes[base]), L = def.layers;
    if (m.scale) def.scale = m.scale;
    def.bpm = Math.round(def.bpm * m.bpm);
    if (L.bells && m.bells) L.bells.density *= m.bells;
    if (L.bass && m.bass) L.bass.gain *= m.bass;
    if (m.noise) L.noise = m.noise;
    scenes[name] = def;
  }
  return name;
}
