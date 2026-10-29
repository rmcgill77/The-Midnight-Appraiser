'use strict';

/* ===================================================================== sound
   Everything you hear is synthesized here with Web Audio; the game ships no
   audio files. Browsers only allow sound after the first tap or key press, so
   the engine boots then (unlock).

   Graph:  scene layers ─┐                     ┌→ reverb ─┐
                         ├→ music bus ─┐       │          ├→ master → compressor → out
           effects ──────┴→ sfx bus ───┴───────┴→ echo ───┘

   Music: Sound.setScene(name) crossfades to a recipe from DATA.scenes.
   Tension: Sound.setTension(0–1) adds a heartbeat and a tritone and opens the filters.
   Effects: Sound.play(name). Each one is a short synth recipe in SFX below. */
const Sound = {
  ctx: null, offline: false,
  master: null, music: null, sfx: null, verbIn: null, echoIn: null,
  white: null, brown: null, crackle: null,
  scene: null, sceneName: '', tension: 0, timer: 0,

  /* ---------- boot ---------- */
  boot(ctx) {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!ctx && !AC) return null;
    const c = this.ctx = ctx || new AC({ latencyHint: 'playback' });
    this.offline = !!ctx;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -22; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = .006; comp.release.value = .3;
    const makeup = c.createGain(); makeup.gain.value = 4.5;   // the layers are mixed quiet; this brings the whole game up to phone-speaker level
    const limit = c.createDynamicsCompressor();             // a brick wall at the end, so nothing ever clips
    limit.threshold.value = -2; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = .001; limit.release.value = .1;
    // a low-pass at the front of the chain, wide open (22 kHz) unless the game muffles the sound (tiredness)
    this.muffle = c.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 22000; this.muffle.Q.value = 0.5;
    this.muffle.connect(comp);
    this.master = c.createGain(); this.master.connect(this.muffle); comp.connect(makeup); makeup.connect(limit); limit.connect(c.destination);
    this.music = c.createGain(); this.music.connect(this.master);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    // reverb: a generated room, a little dark
    const verb = c.createConvolver(); verb.buffer = this.impulse(2.6, 2.4);
    this.verbIn = c.createGain(); this.verbIn.gain.value = .9;
    const verbOut = c.createGain(); verbOut.gain.value = .45;
    this.verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(this.master);
    // echo for bells: dotted-eighth-ish, filtered feedback
    const echo = c.createDelay(1.5); echo.delayTime.value = .42;
    const fb = c.createGain(); fb.gain.value = .33;
    const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2400;
    this.echoIn = c.createGain();
    this.echoIn.connect(echo); echo.connect(tone); tone.connect(fb); fb.connect(echo);
    const echoOut = c.createGain(); echoOut.gain.value = .32; tone.connect(echoOut); echoOut.connect(this.master); echoOut.connect(this.verbIn);
    this.white = this.noiseBuffer('white', 4); this.brown = this.noiseBuffer('brown', 4); this.crackle = this.noiseBuffer('crackle', 6);
    this.applyVolumes();
    if (!this.offline) this.timer = setInterval(() => this.tick(), 50);
    return c;
  },
  unlock() {
    if (!Settings.v.sound) return;
    const c = this.boot(); if (!c) return;
    if (c.state === 'suspended' && !document.hidden) c.resume().catch(() => {});
    if (this.sceneName && (!this.scene || this.scene.name !== this.sceneName)) this.startScene(this.sceneName);
  },
  ready() { return !!this.ctx && (this.offline || this.ctx.state === 'running'); },
  applyVolumes() {
    if (!this.ctx) return;
    const v = Settings.v, t = this.ctx.currentTime, sq = x => Math.max(0, Math.min(1, x)) ** 2;
    this.master.gain.setTargetAtTime(v.sound ? sq(v.volMaster) : 0, t, .05);
    this.music.gain.setTargetAtTime(sq(v.volMusic), t, .05);
    this.sfx.gain.setTargetAtTime(sq(v.volSfx), t, .05);
    if (!this.offline) {
      if (!v.sound && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
      else if (v.sound && this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume().catch(() => {});
    }
  },

  /* ---------- buffers ---------- */
  noiseBuffer(kind, sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + .02 * w) / 1.02; d[i] = last * 3.2; }
      else if (kind === 'crackle') d[i] = Math.random() < .0009 ? (Math.random() * 2 - 1) * .9 : w * .015;
      else d[i] = w;
    }
    return b;
  },
  impulse(sec, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** decay; }
    return b;
  },

  /* ---------- small builders ---------- */
  hz: midi => 440 * 2 ** ((midi - 69) / 12),
  noteOf(def, degree, oct) {
    const sc = DATA.scales[def.scale], n = sc.length;
    const o = Math.floor(degree / n), i = ((degree % n) + n) % n;
    return this.hz(def.root + sc[i] + 12 * (o + oct));
  },
  env(g, t, peak, attack, hold, release) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(.0001, t + attack + hold + release);
  },
  pan(out, p) {
    if (!this.ctx.createStereoPanner) return out;
    const s = this.ctx.createStereoPanner(); s.pan.value = p; s.connect(out); return s;
  },
  /* one enveloped tone: wave, freq (optionally sliding to `to`), sent to `out` */
  tone(out, { f, to, wave = 'sine', t, a = .005, h = 0, r = .3, g = .1, cutoff, q, detune = 0 }) {
    const c = this.ctx, o = c.createOscillator(), e = c.createGain();
    o.type = wave; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + a + h + r);
    let head = o;
    if (cutoff) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; if (q) fl.Q.value = q; o.connect(fl); head = fl; }
    head.connect(e); e.connect(out);
    this.env(e, t, g, a, h, r);
    o.start(t); o.stop(t + a + h + r + .05);
    return o;
  },
  /* filtered noise burst, with an optional filter sweep */
  hiss(out, { t, d = .2, g = .1, type = 'bandpass', f = 1000, to, q = 1, a = .005, buf = 'white' }) {
    const c = this.ctx, s = c.createBufferSource(), fl = c.createBiquadFilter(), e = c.createGain();
    s.buffer = this[buf]; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + d);
    s.connect(fl); fl.connect(e); e.connect(out);
    this.env(e, t, g, a, 0, d);
    s.start(t, Math.random() * 2); s.stop(t + a + d + .05);
  },

  /* ---------- music ---------- */
  setScene(name) {
    if (name === this.sceneName) return;
    this.sceneName = name;
    if (this.ready() || this.offline) this.startScene(name);
  },
  setTension(t) { this.tension = Math.max(0, Math.min(1, t || 0)); },

  startScene(name) {
    const c = this.ctx; if (!c) return;
    const now = c.currentTime, def = DATA.scenes[name], old = this.scene;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + 1.6);
      old.nodes.forEach(n => { try { n.stop(now + 1.8); } catch (e) {} });
      old.ended = true;
    }
    if (!def) { this.scene = null; return; }
    const L = def.layers, g = c.createGain();
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + 2);
    g.connect(this.music);
    const send = c.createGain(); send.gain.value = .35; g.connect(send); send.connect(this.verbIn);
    const s = { name, def, gain: g, nodes: [], next: now + .15, step: 0, voices: [], tSmooth: this.tension };
    const keep = n => { s.nodes.push(n); n.start(now); return n; };

    if (L.drone) {
      const D = L.drone, f = c.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = D.cutoff; f.Q.value = .8; f.connect(g);
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = D.lfo; lg.gain.value = D.cutoff * .45; lfo.connect(lg); lg.connect(f.frequency); keep(lfo);
      D.notes.forEach(n => [-7, 7].forEach(cents => {
        const o = c.createOscillator(), og = c.createGain();
        o.type = D.wave; o.frequency.value = this.hz(def.root + n + 12 * D.oct); o.detune.value = cents;
        og.gain.value = D.gain / D.notes.length / 2; o.connect(og); og.connect(f); keep(o);
      }));
      s.droneFilter = f; s.droneCut = D.cutoff;
    }
    if (L.noise) this.noiseBed(s, L.noise, keep);
    // tension voice: a tritone that fades in as things get bad
    const tri = c.createOscillator(), tg = c.createGain(), tf = c.createBiquadFilter();
    tri.type = 'sawtooth'; tri.frequency.value = this.hz(def.root + 6 - 12); tf.type = 'lowpass'; tf.frequency.value = 700;
    tg.gain.value = 0; tri.connect(tf); tf.connect(tg); tg.connect(g); keep(tri);
    s.tri = tg;
    this.scene = s;
    if (this.offline) this.tick(0);
  },

  noiseBed(s, N, keep) {
    const c = this.ctx, out = c.createGain(); out.gain.value = N.gain; out.connect(s.gain);
    const src = (buf) => { const b = c.createBufferSource(); b.buffer = this[buf]; b.loop = true; return b; };
    const filt = (type, f, q = .7) => { const x = c.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
    const lfoTo = (param, rate, depth) => { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = rate; lg.gain.value = depth; l.connect(lg); lg.connect(param); keep(l); };
    if (N.kind === 'hum') {   // fluorescent tubes
      [60, 120, 180, 240].forEach((f, i) => { const o = c.createOscillator(), og = c.createGain(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f; og.gain.value = [.5, .35, .15, .08][i]; o.connect(og); og.connect(out); keep(o); });
      const b = src('white'), hp = filt('bandpass', 3200, 4), bg = c.createGain(); bg.gain.value = .05; b.connect(hp); hp.connect(bg); bg.connect(out); keep(b);
      return;
    }
    if (N.kind === 'crackle') { const b = src('crackle'), hp = filt('highpass', 900); b.connect(hp); hp.connect(out); keep(b); out.gain.value = N.gain * 6; return; }
    const map = {
      rain:   ['white', [['highpass', 1100], ['lowpass', 7000]]],
      rumble: ['brown', [['lowpass', 160, 1.2]]],
      wind:   ['brown', [['bandpass', 520, .9]]],
      street: ['brown', [['lowpass', 650]]],
      drip:   ['brown', [['lowpass', 280]]]
    }[N.kind] || ['white', [['lowpass', 800]]];
    const b = src(map[0]); let head = b;
    const filters = map[1].map(([t, f, q]) => filt(t, f, q));
    filters.forEach(f => { head.connect(f); head = f; });
    head.connect(out); keep(b);
    if (N.kind === 'wind') lfoTo(filters[0].frequency, .07, 260);
    if (N.kind === 'rumble' || N.kind === 'street') lfoTo(out.gain, .06, N.gain * .5);
  },

  /* the scheduler: called every 50 ms, books notes a quarter second ahead */
  tick(ahead = .25) {
    const s = this.scene, c = this.ctx;
    if (!s || !c || s.ended || !this.ready()) return;
    const def = s.def, L = def.layers, eighth = 60 / def.bpm / 2, now = c.currentTime;
    s.tSmooth += (this.tension - s.tSmooth) * .08;
    const ts = s.tSmooth;
    if (s.droneFilter) s.droneFilter.frequency.setTargetAtTime(s.droneCut * (1 + ts * 1.6), now, .4);
    s.tri.gain.setTargetAtTime(ts > .25 ? (ts - .25) * .05 : 0, now, .6);
    const horizon = this.offline ? now + (ahead || 30) : now + ahead;
    while (s.next < horizon) {
      const t = s.next, step = s.step;
      if (L.pad && step % (8 * L.pad.bars) === 0) this.padChord(s, t, L.pad, step / (8 * L.pad.bars));
      if (L.bass) { const d = L.bass.steps[step % 16]; if (d !== null && d !== undefined) this.pluck(s, this.noteOf(def, d, L.bass.oct), t, L.bass.gain * (1 + ts * .4)); }
      if (L.beep && L.beep.steps[step % 16]) this.tone(s.gain, { f: this.hz(L.beep.note), wave: 'sine', t, a: .004, h: .06, r: .08, g: L.beep.gain });
      if (L.bells && Math.random() < L.bells.density * (1 + ts * .8) * (step % 2 ? .6 : 1)) {
        const deg = Math.floor(Math.random() * 9) - 1;
        this.bell(s, this.noteOf(def, deg, L.bells.oct), t, L.bells);
      }
      if (ts > .3 && step % (ts > .7 ? 2 : 4) === 0) this.heartbeat(s.gain, t, .1 + ts * .12);
      s.next += eighth; s.step++;
    }
  },
  padChord(s, t, P, i) {
    const c = this.ctx, chord = P.prog[i % P.prog.length], len = 60 / s.def.bpm * 4 * P.bars;
    s.voices.forEach(v => { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, .5); try { v.o.stop(t + 3); } catch (e) {} });
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = P.cutoff; f.connect(s.gain);
    s.voices = chord.map((deg, k) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = P.wave; o.frequency.value = this.noteOf(s.def, deg, 0); o.detune.value = (k - 1) * 4 + (P.detune ? (Math.random() - .5) * P.detune : 0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(P.gain / chord.length * 1.6, t + Math.min(1.4, len * .3));
      o.connect(g); g.connect(f); o.start(t); o.stop(t + len + 4);
      s.nodes.push(o);
      return { o, g };
    });
  },
  pluck(s, f, t, g) {
    const c = this.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), e = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(1100, t); fl.frequency.exponentialRampToValueAtTime(180, t + .35);
    o.connect(fl); fl.connect(e); e.connect(s.gain);
    this.env(e, t, g, .006, .02, .5); o.start(t); o.stop(t + .6);
  },
  bell(s, f, t, B) {
    const c = this.ctx, out = this.pan(s.gain, (Math.random() - .5) * 1.1), detune = B.detune ? (Math.random() - .5) * B.detune : 0;
    const echo = c.createGain(); echo.gain.value = .5; out.connect(echo); echo.connect(this.echoIn);
    const g = B.gain, d = B.decay;
    if (B.timbre === 'box') {            // music box: pure tone with a bright tine
      this.tone(out, { f, t, a: .003, r: d, g, detune });
      this.tone(out, { f: f * 4.01, t, a: .002, r: d * .18, g: g * .25, detune });
    } else if (B.timbre === 'vibes') {   // vibraphone: tone with a slow tremolo
      const o = c.createOscillator(), e = c.createGain(), trem = c.createOscillator(), tg = c.createGain(), mix = c.createGain();
      o.frequency.value = f; trem.frequency.value = 5.2; tg.gain.value = .35; mix.gain.value = .65;
      trem.connect(tg); tg.connect(mix.gain); o.connect(mix); mix.connect(e); e.connect(out);
      this.env(e, t, g, .004, 0, d); o.start(t); trem.start(t); o.stop(t + d + .1); trem.stop(t + d + .1);
    } else if (B.timbre === 'drip') {    // a drop in a big room
      this.tone(out, { f: f * 1.7, to: f, t, a: .002, r: d * (.3 + Math.random() * .5), g });
    } else {                            // glass and metal: FM bells (metal is inharmonic and darker)
      const ratio = B.timbre === 'metal' ? 1.41 : 3.5, o = c.createOscillator(), m = c.createOscillator(), mg = c.createGain(), e = c.createGain();
      o.frequency.value = f; o.detune.value = detune; m.frequency.value = f * ratio;
      mg.gain.setValueAtTime(f * (B.timbre === 'metal' ? 2.2 : 1.2), t); mg.gain.exponentialRampToValueAtTime(1, t + d * .6);
      m.connect(mg); mg.connect(o.frequency); o.connect(e); e.connect(out);
      this.env(e, t, g, .003, 0, d); o.start(t); m.start(t); o.stop(t + d + .1); m.stop(t + d + .1);
    }
  },
  heartbeat(out, t, g) {
    this.tone(out, { f: 95, to: 42, t, a: .004, r: .16, g });
    this.tone(out, { f: 80, to: 38, t: t + .19, a: .004, r: .14, g: g * .7 });
  },

  /* ---------- effects ---------- */
  play(name, opts = {}) {
    Sound.caption(name);
    if (!this.ready() || !Settings.v.sound) return;
    const fx = SFX[name]; if (!fx) return;
    const c = this.ctx, t = c.currentTime + .01;
    const out = c.createGain(); out.connect(this.sfx);
    const wet = c.createGain(); wet.gain.value = opts.wet ?? .25; out.connect(wet); wet.connect(this.verbIn);
    try { fx(this, out, t, opts); } catch (e) { /* a broken effect never breaks the game */ }
  },
  caption(name) {
    const text = DATA.captions[name];
    if (!text || !Settings.v.captions) return;
    const box = document.getElementById('captions'); if (!box) return;
    const el = document.createElement('div'); el.className = 'caption'; el.textContent = `[ ${text} ]`;
    box.appendChild(el);
    while (box.children.length > 2) box.firstChild.remove();
    setTimeout(() => el.remove(), 2800);
  }
};

/* Each effect: (Sound, out, startTime, opts). Kept short and quiet; the mix is music-first. */
const SFX = {
  tap:     (S, o, t) => S.tone(o, { f: 2200, t, a: .001, r: .03, g: .025 }),
  tab:     (S, o, t) => S.hiss(o, { t, d: .14, g: .05, f: 1100, to: 2600, q: 1.4 }),
  page:    (S, o, t) => S.hiss(o, { t, d: .22, g: .06, f: 900, to: 2200, q: 1.2, a: .02 }),
  bell:    (S, o, t) => { S.tone(o, { f: 1318, t, a: .002, r: 1.1, g: .07 }); S.tone(o, { f: 1046, t: t + .16, a: .002, r: 1.3, g: .06 }); S.tone(o, { f: 2636, t, a: .001, r: .3, g: .02 }); },
  sale:    (S, o, t) => { S.hiss(o, { t, d: .05, g: .1, type: 'highpass', f: 2500 }); S.tone(o, { f: 1568, t: t + .05, r: .5, g: .07 }); S.tone(o, { f: 2093, t: t + .12, r: .8, g: .07 }); S.tone(o, { f: 110, to: 70, t, r: .15, g: .08 }); },
  counter: (S, o, t) => { S.tone(o, { f: 660, wave: 'triangle', t, r: .14, g: .06 }); S.tone(o, { f: 880, wave: 'triangle', t: t + .1, r: .2, g: .06 }); },
  refuse:  (S, o, t) => S.tone(o, { f: 190, to: 110, wave: 'square', t, r: .22, g: .05, cutoff: 700 }),
  stamp:   (S, o, t) => { S.hiss(o, { t, d: .07, g: .22, type: 'lowpass', f: 380, buf: 'brown' }); S.tone(o, { f: 96, to: 48, t, r: .12, g: .14 }); },
  scrap:   (S, o, t) => { for (let i = 0; i < 4; i++) S.hiss(o, { t: t + i * .05, d: .08, g: .05, f: 1800 + Math.random() * 1200, q: 2 }); },
  coins:   (S, o, t) => [2637, 3136, 2349].forEach((f, i) => S.tone(o, { f, t: t + i * .055, r: .35, g: .04 })),
  upgrade: (S, o, t) => [523, 659, 784, 1046].forEach((f, i) => S.tone(o, { f, wave: 'triangle', t: t + i * .07, r: .4, g: .05 })),
  unlock:  (S, o, t) => { S.hiss(o, { t, d: .04, g: .12, type: 'highpass', f: 3000 }); S.hiss(o, { t: t + .12, d: .05, g: .14, type: 'bandpass', f: 1600, q: 3 }); S.tone(o, { f: 160, to: 110, t: t + .12, r: .12, g: .06 }); },
  emf:     (S, o, t) => { S.hiss(o, { t, d: .35, g: .05, type: 'highpass', f: 2800, buf: 'crackle' }); S.tone(o, { f: 1250, wave: 'square', t: t + .1, r: .06, g: .025, cutoff: 3000 }); S.tone(o, { f: 1250, wave: 'square', t: t + .28, r: .06, g: .025, cutoff: 3000 }); },
  uv:      (S, o, t) => { S.tone(o, { f: 120, wave: 'sawtooth', t, a: .08, h: .3, r: .25, g: .05, cutoff: 900 }); S.tone(o, { f: 4100, t, a: .1, h: .25, r: .2, g: .008 }); },
  reagent: (S, o, t) => { for (let i = 0; i < 6; i++) { const f = 280 + Math.random() * 600; S.tone(o, { f, to: f * 1.6, t: t + i * .08 + Math.random() * .04, a: .003, r: .07, g: .045 }); } },
  exact:   (S, o, t) => { S.tone(o, { f: 1046, t, r: .7, g: .05 }); S.tone(o, { f: 1568, t: t + .06, r: .9, g: .045 }); },
  fuzzy:   (S, o, t) => { S.tone(o, { f: 600, t, r: .45, g: .04 }); S.tone(o, { f: 613, t, r: .45, g: .04 }); },
  mishap:  (S, o, t) => { S.hiss(o, { t, d: .8, g: .06, type: 'bandpass', f: 300, to: 1400, a: .7, q: 2 }); [0, .2, .4].forEach(k => S.tone(o, { f: 120, to: 60, t: t + .9 + k, r: .12, g: .13 })); },
  step:    (S, o, t, { floor = 'concrete' } = {}) => {
    const f = { checker: 1500, subway: 950, concrete: 650, linoleum: 1900 }[floor] || 900;
    S.hiss(o, { t, d: .06, g: .09, type: 'bandpass', f: f * (.9 + Math.random() * .2), q: 1.4 });
    if (floor === 'linoleum' && Math.random() < .25) S.tone(o, { f: 2400, to: 2900, t: t + .02, r: .06, g: .008 });
  },
  find:    (S, o, t) => { for (let i = 0; i < 4; i++) S.tone(o, { f: 1800 + Math.random() * 1600, t: t + i * .05, r: .35, g: .035 }); },
  supply:  (S, o, t) => S.tone(o, { f: 880, to: 1320, wave: 'triangle', t, r: .18, g: .06 }),
  zap:     (S, o, t) => { S.hiss(o, { t, d: .3, g: .12, type: 'highpass', f: 1800, buf: 'crackle' }); S.tone(o, { f: 60, wave: 'square', t, a: .002, r: .3, g: .05, cutoff: 1500 }); S.hiss(o, { t, d: .12, g: .08, type: 'highpass', f: 3500 }); },
  splash:  (S, o, t) => S.hiss(o, { t, d: .45, g: .12, f: 900, to: 260, q: .9, a: .01 }),
  slip:    (S, o, t) => { S.hiss(o, { t, d: .3, g: .08, f: 1600, to: 380, q: 1.2 }); S.tone(o, { f: 110, to: 55, t: t + .28, r: .14, g: .12 }); },
  spin:    (S, o, t) => { S.hiss(o, { t, d: 1.1, g: .1, type: 'lowpass', f: 160, to: 320, a: .3, buf: 'brown' }); S.tone(o, { f: 48, wave: 'triangle', t, a: .3, h: .3, r: .5, g: .05 }); },
  alarm:   (S, o, t) => { for (let i = 0; i < 4; i++) S.tone(o, { f: i % 2 ? 980 : 720, wave: 'sawtooth', t: t + i * .24, a: .01, h: .2, r: .03, g: .035, cutoff: 2400 }); },
  pa:      (S, o, t) => { S.hiss(o, { t, d: .2, g: .04, f: 1800, q: 2 }); S.tone(o, { f: 784, wave: 'triangle', t: t + .2, r: .5, g: .05, cutoff: 1800 }); S.tone(o, { f: 622, wave: 'triangle', t: t + .55, r: .7, g: .05, cutoff: 1800 }); },
  needle:  (S, o, t) => { S.tone(o, { f: 3200, t, a: .001, r: .05, g: .03 }); S.tone(o, { f: 130, to: 80, t: t + .04, r: .1, g: .08 }); },
  powerdown: (S, o, t) => { S.hiss(o, { t, d: .03, g: .1, type: 'highpass', f: 3000 }); S.tone(o, { f: 900, to: 70, t, r: 1, g: .05 }); },
  breath:  (S, o, t) => S.hiss(o, { t, d: 1.2, g: .16, f: 420, to: 300, q: 2.2, a: .6, buf: 'brown' }),
  encounter: (S, o, t) => {
    [0, 6, 1].forEach(n => S.tone(o, { f: S.hz(46 + n), wave: 'sawtooth', t, a: .005, r: 1.3, g: .034, cutoff: 2200 }));
    S.hiss(o, { t, d: .5, g: .1, type: 'highpass', f: 1200 });
    S.tone(o, { f: 70, to: 35, t, r: .4, g: .12 });
  },
  flash:   (S, o, t) => { S.hiss(o, { t, d: .35, g: .1, type: 'highpass', f: 2000, to: 6000 }); S.tone(o, { f: 1800, to: 4200, t, r: .3, g: .03 }); },
  run:     (S, o, t) => S.hiss(o, { t, d: .4, g: .1, f: 500, to: 2200, q: .8 }),
  toss:    (S, o, t) => { S.tone(o, { f: 300, to: 140, wave: 'triangle', t, r: .2, g: .07 }); S.hiss(o, { t: t + .18, d: .1, g: .1, type: 'lowpass', f: 400, buf: 'brown' }); },
  panic:   (S, o, t) => { for (let i = 0; i < 5; i++) S.heartbeat(o, t + i * .32, .2); S.hiss(o, { t, d: 1.4, g: .06, f: 300, to: 2400, a: 1.2, q: 3 }); },
  extract: (S, o, t) => { S.tone(o, { f: 120, to: 190, wave: 'sawtooth', t, a: .05, h: .2, r: .2, g: .03, cutoff: 900, q: 6 }); [0, 4, 7].forEach(n => S.tone(o, { f: S.hz(60 + n), wave: 'triangle', t: t + .45, a: .3, h: .3, r: 1, g: .04 })); },
  bail:    (S, o, t) => { S.hiss(o, { t, d: .35, g: .1, f: 1800, to: 300 }); S.tone(o, { f: 90, to: 45, t: t + .3, r: .2, g: .12 }); },
  morning: (S, o, t) => [76, 79, 83, 88].forEach((m, i) => S.tone(o, { f: S.hz(m), t: t + i * .18, r: 1.2, g: .045 })),
  warn:    (S, o, t) => { S.tone(o, { f: 233, wave: 'square', t, r: .25, g: .045, cutoff: 900 }); S.tone(o, { f: 196, wave: 'square', t: t + .26, r: .35, g: .045, cutoff: 900 }); },
  news:    (S, o, t) => { S.hiss(o, { t, d: .3, g: .06, type: 'highpass', f: 2000 }); [72, 76, 79, 84].forEach((m, i) => S.tone(o, { f: S.hz(m), wave: 'triangle', t: t + .3 + i * .1, r: .3, g: .04 })); },
  siren:   (S, o, t) => { for (let i = 0; i < 6; i++) S.tone(o, { f: i % 2 ? 900 : 620, to: i % 2 ? 620 : 900, wave: 'sawtooth', t: t + i * .35, a: .02, h: .25, r: .08, g: .04, cutoff: 2000 }); },
  audit:   (S, o, t) => { SFX.stamp(S, o, t); S.bell({ gain: o }, S.hz(48), t + .2, { timbre: 'metal', gain: .09, decay: 4 }); },
  /* lab (Phase 4) */
  spirit:  (S, o, t) => {             // dial sweep through static, a voice-like formant underneath
    S.hiss(o, { t, d: .6, g: .07, f: 600, to: 2600, q: 4, buf: 'crackle' });
    S.tone(o, { f: 220, to: 330, wave: 'sawtooth', t: t + .15, a: .08, h: .15, r: .2, g: .025, cutoff: 900, q: 8 });
  },
  wash:    (S, o, t) => { S.hiss(o, { t, d: .6, g: .09, f: 700, to: 1400, q: .7, a: .05 }); for (let i = 0; i < 5; i++) S.tone(o, { f: 500 + Math.random() * 500, to: 1100, t: t + .1 + i * .09, a: .002, r: .05, g: .03 }); },
  restore: (S, o, t) => { for (let i = 0; i < 3; i++) S.hiss(o, { t: t + i * .16, d: .13, g: .07, f: 2200, to: 1400, q: 1.6 }); S.tone(o, { f: 1760, t: t + .5, r: .4, g: .03 }); },
  seal:    (S, o, t) => { S.tone(o, { f: 2400, t, a: .001, r: .25, g: .04 }); S.tone(o, { f: 3100, t: t + .03, a: .001, r: .2, g: .025 }); S.tone(o, { f: 180, to: 90, t: t + .18, r: .08, g: .1 }); S.hiss(o, { t: t + .18, d: .05, g: .08, type: 'lowpass', f: 600, buf: 'brown' }); },
  craft:   (S, o, t) => { [0, .14, .26].forEach((k, i) => S.tone(o, { f: [880, 1175, 1568][i], wave: 'triangle', t: t + k, r: .2, g: .045 })); S.hiss(o, { t, d: .1, g: .06, type: 'bandpass', f: 2600, q: 3 }); },
  research: (S, o, t) => { for (let i = 0; i < 6; i++) S.hiss(o, { t: t + i * .07, d: .05, g: .04, type: 'bandpass', f: 3000 + Math.random() * 1500, q: 5 }); },
  calibrate: (S, o, t) => [0, 1, 2, 3].forEach(i => S.tone(o, { f: 900 + i * 180 + (i === 3 ? 0 : 23), t: t + i * .09, a: .002, r: .07, g: .03, wave: 'square', cutoff: 2600 })),
  rite:    (S, o, t) => { [0, 7, 12].forEach((n, i) => S.tone(o, { f: S.hz(57 + n), wave: 'triangle', t: t + i * .05, a: .4, h: .4, r: 1.2, g: .035 })); },
  purify:  (S, o, t) => { [0, 4, 7, 12].forEach((n, i) => S.tone(o, { f: S.hz(60 + n), wave: 'triangle', t: t + i * .04, a: .3, h: .5, r: 1.6, g: .035 })); S.bell({ gain: o }, S.hz(84), t + .6, { timbre: 'glass', gain: .06, decay: 2.5 }); },
  ritefail: (S, o, t) => { [0, 1, 6].forEach(n => S.tone(o, { f: S.hz(45 + n), wave: 'sawtooth', t, a: .2, h: .3, r: .8, g: .03, cutoff: 1100 })); S.tone(o, { f: 90, to: 40, t: t + .2, r: .5, g: .1 }); },
  travel:  (S, o, t) => { for (let i = 0; i < 4; i++) S.hiss(o, { t: t + i * .14, d: .06, g: .06, type: 'bandpass', f: 700 + (i % 2) * 200, q: 1.4 }); S.tone(o, { f: 523, wave: 'triangle', t: t + .6, r: .3, g: .03 }); },
  /* fights (Phase 5) */
  scan:    (S, o, t) => { S.tone(o, { f: 400, to: 2400, wave: 'sine', t, a: .02, r: .35, g: .04 }); S.hiss(o, { t, d: .4, g: .04, type: 'bandpass', f: 1200, to: 4000, q: 6 }); },
  hit:     (S, o, t) => { S.hiss(o, { t, d: .18, g: .1, f: 1400, to: 500, q: 1.2 }); S.tone(o, { f: 160, to: 80, t, r: .2, g: .1 }); },
  hitweak: (S, o, t) => { S.hiss(o, { t, d: .3, g: .12, type: 'highpass', f: 2500 }); S.tone(o, { f: 220, to: 60, t, r: .35, g: .12 }); [79, 86].forEach((m, i) => S.tone(o, { f: S.hz(m), t: t + .08 + i * .05, r: .4, g: .03 })); },
  hitresist: (S, o, t) => { S.tone(o, { f: 120, to: 100, wave: 'triangle', t, r: .25, g: .07 }); S.hiss(o, { t, d: .1, g: .05, type: 'lowpass', f: 500, buf: 'brown' }); },
  brace:   (S, o, t) => { S.tone(o, { f: 90, t, a: .01, r: .3, g: .09 }); S.hiss(o, { t, d: .2, g: .05, type: 'lowpass', f: 700, buf: 'brown' }); },
  lash:    (S, o, t) => { S.hiss(o, { t, d: .25, g: .1, f: 600, to: 2600, q: 2 }); S.tone(o, { f: 70, to: 40, t: t + .05, r: .3, g: .12 }); },
  banish:  (S, o, t) => { S.hiss(o, { t, d: .9, g: .08, f: 3000, to: 300, q: 1, a: .05 }); [60, 64, 67, 72].forEach((n, i) => S.tone(o, { f: S.hz(n), wave: 'triangle', t: t + .3 + i * .06, a: .05, r: 1.2, g: .035 })); },
  capture: (S, o, t) => { SFX.seal(S, o, t); [67, 71, 74, 79].forEach((n, i) => S.tone(o, { f: S.hz(n), t: t + .3 + i * .07, r: .9, g: .035 })); },
  capturefail: (S, o, t) => { for (let i = 0; i < 6; i++) S.tone(o, { f: 2400 + Math.random() * 2400, t: t + i * .03, a: .001, r: .2, g: .03 }); S.hiss(o, { t, d: .3, g: .1, type: 'highpass', f: 3000 }); },
  /* ----- stingers (Phase 12d): short musical moments on top of the effects ----- */
  bigsale: (S, o, t) => {               // the register rings, then a bright brass-and-bell lift
    SFX.sale(S, o, t);
    [72, 76, 79, 83, 84].forEach((m, i) => S.tone(o, { f: S.hz(m), wave: 'triangle', t: t + .32 + i * .07, a: .01, r: .5 + i * .1, g: .045 }));
    [60, 67].forEach(m => S.tone(o, { f: S.hz(m), wave: 'sawtooth', t: t + .3, a: .06, h: .25, r: .7, g: .03, cutoff: 1400 }));
    S.bell({ gain: o }, S.hz(96), t + .62, { timbre: 'glass', gain: .05, decay: 1.8 });
  },
  knock:   (S, o, t) => {               // three hard knocks at the door, then a low muted brass sting
    [0, .2, .42].forEach(k => { S.hiss(o, { t: t + k, d: .06, g: .2, type: 'lowpass', f: 520, buf: 'brown' }); S.tone(o, { f: 120, to: 62, t: t + k, a: .002, r: .11, g: .11 }); });
    [43, 44].forEach(m => S.tone(o, { f: S.hz(m), wave: 'sawtooth', t: t + .78, a: .12, h: .35, r: .9, g: .045, cutoff: 650, q: 2 }));
  },
  door:    (S, o, t) => {               // a heavy hinge groans, then the room underneath answers
    const c = S.ctx, cr = c.createOscillator(), wob = c.createOscillator(), wg = c.createGain(), bp = c.createBiquadFilter(), e = c.createGain();
    cr.type = 'sawtooth'; cr.frequency.setValueAtTime(70, t); cr.frequency.linearRampToValueAtTime(150, t + 1.1);
    wob.frequency.value = 23; wg.gain.value = 18; wob.connect(wg); wg.connect(cr.frequency);
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6;
    cr.connect(bp); bp.connect(e); e.connect(o); S.env(e, t, .07, .15, .7, .35);
    cr.start(t); wob.start(t); cr.stop(t + 1.3); wob.stop(t + 1.3);
    S.hiss(o, { t: t + 1.1, d: .5, g: .1, type: 'lowpass', f: 300, buf: 'brown' });
    [38, 45, 50, 52].forEach((m, i) => S.tone(o, { f: S.hz(m), wave: 'triangle', t: t + 1.25 + i * .05, a: .5, h: .6, r: 2, g: .04 }));
    S.bell({ gain: o }, S.hz(50), t + 1.3, { timbre: 'metal', gain: .08, decay: 4 });
  },
  casefile: (S, o, t) => {              // a folder slides out, a stamp, and the typewriter bell
    S.hiss(o, { t, d: .2, g: .06, f: 900, to: 2400, q: 1.2, a: .02 });
    S.hiss(o, { t: t + .2, d: .06, g: .16, type: 'lowpass', f: 420, buf: 'brown' }); S.tone(o, { f: 110, to: 60, t: t + .2, r: .1, g: .1 });
    S.tone(o, { f: 2093, t: t + .38, a: .001, r: .9, g: .05 }); S.tone(o, { f: 4186, t: t + .38, a: .001, r: .25, g: .015 });
    [67, 74].forEach((m, i) => S.tone(o, { f: S.hz(m), wave: 'triangle', t: t + .5 + i * .14, r: .6, g: .035 }));
  },
  discover: (S, o, t) => {              // something new: glass falling a tritone over a cold swell
    const t0 = t + .35;
    S.tone(o, { f: S.hz(41), wave: 'sawtooth', t: t0, a: .6, h: .4, r: 1.2, g: .03, cutoff: 500 });
    [[88, 0], [82, .18], [78, .36]].forEach(([m, k]) => S.bell({ gain: o }, S.hz(m), t0 + k, { timbre: 'glass', gain: .045, decay: 1.6 }));
  },
  ward:    (S, o, t) => { S.hiss(o, { t, d: .4, g: .08, type: 'highpass', f: 3000, to: 7000 }); [76, 83, 88].forEach((m, i) => S.tone(o, { f: S.hz(m), t: t + i * .05, r: .7, g: .04 })); }
};
