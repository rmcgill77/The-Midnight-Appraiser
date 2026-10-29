// Sound and touch feedback. Everything you hear is the original game's own
// synthesizer (shared/js/sound.js): its music scenes, its tension layer and its
// effects. This file only decides which scene is playing, feeds it the settings,
// and turns the rules' cues into sounds, captions and short vibrations.

import { S } from '../rules/index.js';
import { onCue } from '../rules/cues.js';
import { Piano, setPianoMood } from './piano.js';
import { WeatherAudio, weatherScene } from './weather-audio.js';

// Cues worth a buzz on phones that can vibrate.
const BUZZ = { encounter: [40, 120, 40], panic: [80, 60, 80, 60, 160], knock: [40, 120, 40, 120, 40], siren: [200, 100, 200], hitweak: 25, find: 15, casefile: [20, 60, 20] };

export class GameAudio {
  constructor(settings) {
    this.settings = settings;
    this.captionsEl = document.getElementById('captions');
    this.gestured = false;
    this.piano = new Piano();
    this.weather = new WeatherAudio();
    this.apply();
    onCue((name, opts) => this.play(name, opts));
    // Browsers only allow sound after the player touches, clicks or presses something.
    const unlock = () => { this.gestured = true; S.Sound.unlock(); };
    for (const ev of ['pointerdown', 'keydown', 'touchend']) addEventListener(ev, unlock, { capture: true, passive: true });
    // Gamepads count as a gesture too, once a button is pressed (main calls unlock()).
    document.addEventListener('visibilitychange', () => {
      const c = S.Sound.ctx; if (!c) return;
      if (document.hidden) c.suspend().catch(() => {});
      else if (this.settings.sound) c.resume().catch(() => {});
    });
  }

  unlock() { this.gestured = true; S.Sound.unlock(); }

  // Copy this game's settings into the original's Settings.v, which the engine reads.
  apply() {
    const v = S.Settings.v, s = this.settings;
    v.sound = !!s.sound; v.volMaster = s.volMaster; v.volMusic = s.volMusic; v.volSfx = s.volSfx; v.captions = !!s.captions;
    S.Sound.applyVolumes();
    if (s.sound && this.gestured) S.Sound.unlock();
  }

  play(name, opts) {
    S.Sound.play(name, opts);     // also writes a caption when captions are on
    const b = BUZZ[name];
    if (b && this.settings.vibration) try { navigator.vibrate?.(b); } catch { /* not supported */ }
  }

  // Phase 16: a small sound when someone starts talking, so a line never arrives unnoticed.
  // Talk: two soft notes (a little lower for you). A text: the phone's chirp. The radio: a
  // click of static. A new speaker mid-conversation: one note.
  dialog(kind, who, swap = false) {
    const Snd = S.Sound;
    if (!this.settings.sound || !Snd.ready?.() || !Snd.sfx) return;
    try {
      const c = Snd.ctx, t = c.currentTime + 0.01, out = c.createGain();
      out.gain.value = 0.9; out.connect(Snd.sfx);
      const low = who === 'you' ? 0.84 : 1;
      if (kind === 'radio') {
        Snd.hiss(out, { t, d: 0.09, g: 0.05, type: 'bandpass', f: 1800, q: 0.8, buf: 'white' });
        Snd.tone(out, { f: 1400, wave: 'square', t: t + 0.08, r: 0.04, g: 0.012, cutoff: 2600 });
      } else if (kind === 'text') {
        Snd.tone(out, { f: 1318, t, r: 0.12, g: 0.035 }); Snd.tone(out, { f: 1760, t: t + 0.11, r: 0.18, g: 0.035 });
      } else if (swap) {
        Snd.tone(out, { f: 740 * low, wave: 'triangle', t, r: 0.16, g: 0.03 });
      } else {
        Snd.tone(out, { f: 587 * low, wave: 'triangle', t, r: 0.14, g: 0.035 });
        Snd.tone(out, { f: 880 * low, wave: 'triangle', t: t + 0.09, r: 0.22, g: 0.03 });
      }
    } catch { /* a sound never breaks the game */ }
  }

  // Called every frame: the music follows where you are, as the original's renderView did.
  // Phase 18: the back room gets its own soft piano (game/piano.js); the original engine
  // has no scene by that name, so it goes quiet underneath.
  // Phase 23: wx = { type, place, birds, dt } — the weather's beds, and the music in its mood.
  update(scene, tension, wx = null) {
    if ((scene === 'backroom' || scene === 'bar') && this.settings.sound) this.piano.start(); else this.piano.stop();
    setPianoMood(wx?.type);
    S.Sound.setScene(wx?.type ? weatherScene(scene, wx.type) : scene);
    S.Sound.setTension(Math.max(tension, wx?.type === 'storm' && scene !== 'encounter' ? 0.15 : 0));
    if (wx) this.weather.update(wx.dt ?? 0.016, wx.type, wx.place, { on: !!this.settings.sound, birds: wx.birds, wind: wx.wind ?? null });
  }
  thunder(near, place) { if (this.settings.sound) this.weather.thunder(near, place); }
}

// Which music scene fits the moment, and how tense it is (the original's rules).
export function sceneFor(st, world, panelId) {
  if (!st) return { scene: 'title', tension: 0 };
  if (st.gameOver) return { scene: st.gameOver.type === 'raid' ? 'raid' : st.gameOver.type === 'retired' ? 'closed' : 'audit', tension: 0 };
  let scene, tension = 0;
  if (world.room === 'zone' && st.run) {
    const r = st.run;
    scene = r.encounter ? 'encounter' : r.zoneId;
    const near = r.cryptids.reduce((m, c) => Math.min(m, Math.abs(c.x - r.pos.x) + Math.abs(c.y - r.pos.y)), 99);
    tension = r.encounter ? 1 : Math.max(st.stress / 100 * 0.8, near < 7 ? (1 - (near - 1) / 6) * 0.85 : 0, st.battery <= 0 ? 0.45 : 0);
  } else if (st.phase === 'morning' || panelId === 'morning') scene = 'morning';
  else if (world.room === 'back-room' || world.room === 'apartment') scene = 'backroom';   // home: the soft piano
  else if (world.room === 'bar' || world.room === 'chapel') scene = 'bar';   // Phase 20: the Brass Lantern's piano (and a quiet one in the chapel)
  else if (['diner', 'bijou', 'thrift', 'library'].includes(world.room)) scene = 'errands';
  else if (world.room === 'city') scene = 'errands';
  else if (world.room === 'lab') scene = 'lab';
  else if (st.phase === 'day') scene = 'shop';
  else scene = st.phase === 'night' ? 'closed' : 'morning';
  if (!st.run && st.heat >= 70) tension = Math.max(tension, 0.2);
  return { scene, tension };
}
