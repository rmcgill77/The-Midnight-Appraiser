// Sound cues. The rules layer says what just happened ('coins', 'stamp', 'hit'...),
// using the original game's effect names; whoever listens (src/game/audio.js in the
// browser, nobody in tests) decides what to play.

let listener = null;
export function onCue(fn) { listener = fn; }
export function cue(name, opts) {
  if (!name || !listener) return;
  try { listener(name, opts); } catch { /* a sound never breaks the game */ }
}
// Several cues in a row, a beat apart (the original's fight rounds).
export function cues(names, gapMs = 260) {
  (names || []).forEach((n, i) => (i ? setTimeout(() => cue(n), i * gapMs) : cue(n)));
}
