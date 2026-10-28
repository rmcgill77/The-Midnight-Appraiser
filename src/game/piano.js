// The back room's music (Phase 18): a slow, soft piano instead of the rain-noise bed that
// sounded like static. Generated as it plays, so it never loops the same way twice:
// broken chords in the left hand (I, vi, IV, V in F major, two bars each, now and then a
// Sunday-afternoon ii or iii), and a sparse right-hand melody that moves by small steps
// and rests often. Each note is a few sine partials with a hammer-soft attack, a brightness
// that fades as the note rings, and a long decay, sent through the game's own reverb and
// music volume (the original's Sound engine owns the audio graph).

import { S } from '../rules/index.js';

const BPM = 54, BEAT = 60 / BPM;
const KEY = 53;                                // F3
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
// Chords as scale degrees (0 = I). Each lasts two bars.
const PROG = [[0, 5, 3, 4], [0, 5, 1, 4], [0, 2, 3, 4], [3, 0, 1, 4], [5, 3, 0, 4]];
const PARTIALS = [[1, 1], [2, 0.32], [3, 0.11], [4, 0.05], [5.02, 0.02]];

// Phase 23: the weather's mood. Rain and storms bring it to the minor, slower and softer;
// snow lifts it (lydian, a touch slower); a clear day, a little brighter and quicker.
const MOODS = {
  rain: { scale: [0, 2, 3, 5, 7, 8, 10], tempo: 0.88, vel: 0.85 },
  storm: { scale: [0, 2, 3, 5, 7, 8, 10], tempo: 0.82, vel: 0.8 },
  fog: { scale: [0, 2, 3, 5, 7, 9, 10], tempo: 0.86, vel: 0.85 },
  snow: { scale: [0, 2, 4, 6, 7, 9, 11], tempo: 0.85, vel: 0.9 },
  clear: { scale: MAJOR, tempo: 1.06, vel: 1 },
};
let mood = { scale: MAJOR, tempo: 1, vel: 1 };
export function setPianoMood(type) { mood = MOODS[type] ?? { scale: MAJOR, tempo: 1, vel: 1 }; }
const midiOf = deg => KEY + Math.floor(deg / 7) * 12 + mood.scale[((deg % 7) + 7) % 7];
const hz = m => 440 * 2 ** ((m - 69) / 12);

export class Piano {
  constructor() { this.on = false; this.out = null; this.timer = null; this.rng = Math.random; }

  start() {
    const Snd = S.Sound, c = Snd.ctx;
    if (this.on || !c || !Snd.music) return;
    this.on = true;
    this.out = c.createGain(); this.out.gain.value = 0;
    this.out.gain.setTargetAtTime(1, c.currentTime, 0.8);       // fade in
    this.out.connect(Snd.music);
    if (Snd.verbIn) { this.wet = c.createGain(); this.wet.gain.value = 0.45; this.out.connect(this.wet); this.wet.connect(Snd.verbIn); }
    this.next = c.currentTime + 0.3; this.step = 0; this.phrase = PROG[0]; this.mel = 7 + 2; // melody starts on the third, an octave up
    this.timer = setInterval(() => this.tick(), 90);
  }

  stop() {
    if (!this.on) return;
    this.on = false;
    clearInterval(this.timer); this.timer = null;
    const c = S.Sound.ctx, out = this.out, wet = this.wet;
    this.out = null; this.wet = null;
    if (!c || !out) return;
    out.gain.cancelScheduledValues(c.currentTime);
    out.gain.setTargetAtTime(0, c.currentTime, 0.5);           // fade out, then let go
    setTimeout(() => { try { out.disconnect(); wet?.disconnect(); } catch { /* already gone */ } }, 3500);
  }

  // Schedule a little ahead of the clock, one eighth note at a time.
  tick() {
    const c = S.Sound.ctx;
    if (!this.on || !c || c.state !== 'running') return;
    const ahead = c.currentTime + 0.45;
    if (this.next < c.currentTime - 1) this.next = c.currentTime + 0.1;   // came back from a pause
    while (this.next < ahead) { this.eighth(this.next, this.step); this.next += BEAT / 2 / mood.tempo; this.step += 1; }
  }

  eighth(t, step) {
    const r = this.rng;
    const bar = Math.floor(step / 8), pos = step % 8;
    if (pos === 0 && bar % 8 === 0) this.phrase = PROG[Math.floor(r() * PROG.length)];
    const chord = this.phrase[Math.floor(bar / 2) % 4];
    const tones = [chord, chord + 2, chord + 4];
    const resting = bar % 8 === 7;                              // the last bar of a phrase breathes
    // Left hand: root, fifth, tenth, fifth, low and soft.
    if (pos % 2 === 0) {
      const lh = [chord - 7, chord - 3, chord + 2, chord - 3][pos / 2];
      if (!(resting && pos > 0)) this.note(t, midiOf(lh), pos === 0 ? 0.16 : 0.1, 3.2);
    }
    // Right hand: sparse; mostly on the beat, moving by small steps toward a chord tone.
    if (resting) { if (pos === 0) this.note(t + 0.02, midiOf(tones[2] + 7), 0.09, 4); return; }
    const want = pos === 0 ? 0.7 : pos === 4 ? 0.5 : pos % 2 === 0 ? 0.18 : 0.06;
    if (r() > want) return;
    const target = tones[Math.floor(r() * 3)] + 7;
    let m = this.mel + Math.sign(target - this.mel) * (1 + (r() < 0.3 ? 1 : 0));
    if (pos === 0 || r() < 0.5) m = tones.map(x => x + 7).reduce((b, x) => (Math.abs(x - this.mel) < Math.abs(b - this.mel) ? x : b));
    this.mel = Math.max(4, Math.min(16, m));
    this.note(t + (r() * 0.02), midiOf(this.mel), 0.07 + r() * 0.05, 2.6);
  }

  note(t, midi, vel, ring) {
    vel *= mood.vel;
    const c = S.Sound.ctx, out = this.out;
    if (!out) return;
    const f = hz(midi);
    const amp = c.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vel, t + 0.008);
    amp.gain.setTargetAtTime(vel * 0.4, t + 0.008, 0.18);       // the strike fades into the ring
    amp.gain.setTargetAtTime(0, t + 0.4, ring * (midi < 55 ? 0.5 : 0.36));
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.3;
    lp.frequency.setValueAtTime(Math.min(7000, f * 9), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2.2), t + 1.4);
    lp.connect(amp); amp.connect(out);
    const end = t + ring + 1.5;
    for (const [mul, g] of PARTIALS) {
      const o = c.createOscillator(), pg = c.createGain();
      o.type = 'sine'; o.frequency.value = f * mul; o.detune.value = (Math.random() - 0.5) * 4;
      pg.gain.value = g;
      o.connect(pg); pg.connect(lp);
      o.start(t); o.stop(end);
    }
  }
}
