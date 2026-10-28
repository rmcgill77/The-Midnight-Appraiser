/* data/sound.js — the music, written as recipes for the synthesizer in js/sound.js.
   Every scene is generated live from layers; nothing is a recording.

   root   MIDI note the scene is built on (57 = A3)
   scale  semitone steps above the root
   bpm    tempo for the scheduled layers (bells, bass, beeps)
   layers:
     drone  { notes:[semitones], oct, wave, gain, cutoff, lfo }   held tones under a moving filter
     pad    { prog:[[scale degrees]...], bars, wave, gain, cutoff } slow chords
     bells  { density, oct, timbre, gain, decay }                 sparse melody, chance per eighth note
     bass   { steps:[degree|null ×16], oct, gain }                plucked line, one bar loop
     beep   { steps:[1|0 ×16], note, gain }                       fixed pattern (monitor, alarm)
     noise  { kind, gain }                                        rain · rumble · wind · hum · street · crackle · drip
   Tension (0–1, from stress and nearby cryptids) adds a heartbeat and a tritone,
   opens the filters and thickens the bells in any scene. */
'use strict';

Object.assign(DATA, {
  scales: {
    minor:      [0, 2, 3, 5, 7, 8, 10],
    dorian:     [0, 2, 3, 5, 7, 9, 10],
    phrygian:   [0, 1, 3, 5, 7, 8, 10],
    lydian:     [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian:    [0, 1, 3, 5, 6, 8, 10],
    wholetone:  [0, 2, 4, 6, 8, 10]
  },

  scenes: {
    title: { root: 50, scale: 'dorian', bpm: 60, layers: {
      drone: { notes: [0, 7], oct: -1, wave: 'sawtooth', gain: .05, cutoff: 420, lfo: .05 },
      pad:   { prog: [[0, 2, 4], [5, 0, 2], [6, 1, 3], [3, 5, 0]], bars: 2, wave: 'triangle', gain: .05, cutoff: 1400 },
      bells: { density: .16, oct: 2, timbre: 'box', gain: .07, decay: 2.2 },
      noise: { kind: 'crackle', gain: .02 } } },

    morning: { root: 53, scale: 'lydian', bpm: 72, layers: {
      pad:   { prog: [[0, 2, 4], [1, 3, 5], [4, 6, 1], [0, 2, 4]], bars: 2, wave: 'sine', gain: .06, cutoff: 2200 },
      bells: { density: .22, oct: 2, timbre: 'glass', gain: .05, decay: 1.6 },
      noise: { kind: 'street', gain: .012 } } },

    shop: { root: 57, scale: 'dorian', bpm: 84, layers: {
      pad:   { prog: [[0, 2, 4, 6], [3, 5, 0, 2], [1, 3, 5, 0], [4, 6, 1, 3]], bars: 1, wave: 'triangle', gain: .045, cutoff: 1600 },
      bass:  { steps: [0, null, null, 4, null, null, 2, null, 0, null, 4, null, 5, null, 4, null], oct: -2, gain: .1 },
      bells: { density: .14, oct: 1, timbre: 'vibes', gain: .06, decay: 1.2 },
      noise: { kind: 'street', gain: .018 } } },

    errands: { root: 48, scale: 'mixolydian', bpm: 92, layers: {
      pad:   { prog: [[0, 2, 4], [6, 1, 3], [3, 5, 0], [4, 6, 1]], bars: 1, wave: 'triangle', gain: .045, cutoff: 1800 },
      bass:  { steps: [0, null, 0, null, 4, null, null, null, 3, null, 3, null, 4, null, 6, null], oct: -2, gain: .08 },
      bells: { density: .1, oct: 2, timbre: 'glass', gain: .04, decay: 1 },
      noise: { kind: 'street', gain: .025 } } },

    closed: { root: 45, scale: 'minor', bpm: 60, layers: {
      drone: { notes: [0, 7], oct: -1, wave: 'triangle', gain: .05, cutoff: 600, lfo: .04 },
      pad:   { prog: [[0, 2, 4], [5, 0, 2]], bars: 4, wave: 'sine', gain: .05, cutoff: 1100 },
      bells: { density: .07, oct: 2, timbre: 'box', gain: .05, decay: 2.5 },
      noise: { kind: 'rain', gain: .05 } } },

    street: { root: 52, scale: 'phrygian', bpm: 66, layers: {
      drone: { notes: [0, 7, 12], oct: -1, wave: 'sawtooth', gain: .075, cutoff: 420, lfo: .07 },
      bells: { density: .08, oct: 1, timbre: 'metal', gain: .06, decay: 3 },
      noise: { kind: 'wind', gain: .09 } } },

    lab: { root: 59, scale: 'wholetone', bpm: 66, layers: {
      drone: { notes: [0, 6], oct: -1, wave: 'triangle', gain: .045, cutoff: 900, lfo: .09 },
      pad:   { prog: [[0, 2, 4], [1, 3, 5]], bars: 4, wave: 'sine', gain: .04, cutoff: 2600 },
      bells: { density: .2, oct: 2, timbre: 'glass', gain: .05, decay: 2.4 },
      noise: { kind: 'hum', gain: .02 } } },

    laundromat: { root: 55, scale: 'minor', bpm: 60, layers: {
      drone: { notes: [0, 7], oct: -1, wave: 'triangle', gain: .05, cutoff: 520, lfo: .12 },
      bells: { density: .12, oct: 2, timbre: 'box', gain: .05, decay: 2.6, detune: 35 },
      noise: { kind: 'hum', gain: .028 } } },

    subway: { root: 49, scale: 'phrygian', bpm: 56, layers: {
      drone: { notes: [0, 1, 7], oct: -2, wave: 'sawtooth', gain: .05, cutoff: 300, lfo: .05 },
      bells: { density: .07, oct: 0, timbre: 'metal', gain: .06, decay: 3.2 },
      noise: { kind: 'rumble', gain: .07 } } },

    garage: { root: 53, scale: 'locrian', bpm: 54, layers: {
      drone: { notes: [0, 6], oct: -1, wave: 'sine', gain: .06, cutoff: 700, lfo: .06 },
      bells: { density: .1, oct: 3, timbre: 'drip', gain: .05, decay: .8 },
      noise: { kind: 'drip', gain: .03 } } },

    hospital: { root: 58, scale: 'minor', bpm: 60, layers: {
      drone: { notes: [0, 3, 7], oct: -1, wave: 'triangle', gain: .045, cutoff: 650, lfo: .1 },
      pad:   { prog: [[0, 2, 4], [5, 0, 2]], bars: 4, wave: 'sine', gain: .03, cutoff: 900, detune: 18 },
      beep:  { steps: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], note: 88, gain: .035 },
      noise: { kind: 'hum', gain: .03 } } },

    undercroft: { root: 45, scale: 'locrian', bpm: 48, layers: {
      drone: { notes: [0, 1, 7], oct: -2, wave: 'triangle', gain: .055, cutoff: 520, lfo: .05 },
      bells: { density: .08, oct: 3, timbre: 'drip', gain: .045, decay: 1.2 },
      noise: { kind: 'drip', gain: .035 } } },

    encounter: { root: 46, scale: 'locrian', bpm: 120, layers: {
      drone: { notes: [0, 6, 12], oct: -2, wave: 'sawtooth', gain: .06, cutoff: 900, lfo: .4 },
      bass:  { steps: [0, null, 0, null, 0, null, 4, null, 0, null, 0, null, 4, null, 1, null], oct: -2, gain: .12 },
      beep:  { steps: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1], note: 108, gain: .012 },   // fight: a ticking hat over the bass
      bells: { density: .3, oct: 2, timbre: 'metal', gain: .04, decay: .9 },
      noise: { kind: 'rumble', gain: .04 } } },

    audit: { root: 48, scale: 'minor', bpm: 50, layers: {
      drone: { notes: [0, 7], oct: -1, wave: 'triangle', gain: .05, cutoff: 700, lfo: .03 },
      pad:   { prog: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [0, 2, 4]], bars: 2, wave: 'sine', gain: .06, cutoff: 1500 },
      bells: { density: .05, oct: 1, timbre: 'metal', gain: .07, decay: 4 } } },

    raid: { root: 46, scale: 'phrygian', bpm: 60, layers: {
      drone: { notes: [0, 1, 6], oct: -2, wave: 'sawtooth', gain: .09, cutoff: 560, lfo: .2 },
      beep:  { steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], note: 70, gain: .04 },
      noise: { kind: 'wind', gain: .08 } } }
  },

  /* Sound captions: what deaf and hard-of-hearing players see for sounds that carry information. */
  captions: {
    bell: 'door bell', breath: 'something breathing nearby', encounter: 'a shriek, close', powerdown: 'flashlight clicks off',
    siren: 'sirens outside', panic: 'your heart pounding', alarm: 'car alarms wailing', pa: 'PA crackles', zap: 'electric crackle',
    splash: 'splash', spin: 'a dryer starts spinning', mishap: 'a knock from inside the bench', warn: 'warning tone', news: 'TV news jingle',
    spirit: 'radio static, voices underneath', knock: 'three knocks at the door', door: 'a heavy door groans open, far below', bigsale: 'the register rings, big', casefile: 'a file stamped, a typewriter bell', discover: 'an eerie chime: something new', capturefail: 'glass shatters', lash: 'it strikes', banish: 'it comes apart', ritefail: 'the rite backfires', ward: 'the salt ward flares'
  }
});
