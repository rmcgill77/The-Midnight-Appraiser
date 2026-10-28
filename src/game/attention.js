// Attention (v2.4): the dark noticing you. One rule for every night place this game adds:
// the city at night now, the cemetery (where digging is loud, and the bell is its
// consequence) and the beach after dark later.
//
// A meter from 0 to 100. It climbs while you're in the dark or making noise, and falls in
// the light or while you keep still and quiet. Crossing a threshold is an event:
//   35  uneasy:   you feel watched
//   70  followed: something keeps pace with you
//   100 found:    it comes for you (the place decides what that means), then it settles
//                 back to `after` so it doesn't happen again straight away
// Pure: the state is { v, peak } in the world.

export const ATTENTION = {
  max: 100,
  levels: [{ at: 35, id: 'uneasy' }, { at: 70, id: 'followed' }, { at: 100, id: 'found' }],
  after: 45,
  gain: { dark: 3.2, noise: 9, run: 2.5 },   // per second
  fall: { light: 11, still: 2.5 },             // per second
};

export const freshAttention = () => ({ v: 0, peak: 0 });
export const levelOf = v => [...ATTENTION.levels].reverse().find(l => v >= l.at)?.id ?? 'calm';

// One step. env: { dark (bool), noise (0..1, digging, a fight), running (bool), still (bool),
// k (a multiplier on gains: the moon, the place) }. Returns the level crossed upward, or null.
export function stepAttention(a, dt, env = {}) {
  const A = ATTENTION, k = env.k ?? 1;
  let d = 0;
  if (env.dark) d += A.gain.dark * k;
  if (env.noise) d += A.gain.noise * env.noise * k;
  if (env.running && env.dark) d += A.gain.run * k;
  if (!env.dark && !env.noise) d -= A.fall.light;
  else if (env.still && !env.noise) d -= Math.min(d * 0.6, A.fall.still);   // keeping still slows it, never stops it
  const was = a.v;
  a.v = Math.max(0, Math.min(A.max, a.v + d * dt));
  a.peak = Math.max(a.peak ?? 0, a.v);
  const crossed = A.levels.filter(l => was < l.at && a.v >= l.at).pop() ?? null;
  if (crossed?.id === 'found') a.v = A.after;
  return crossed?.id ?? null;
}
// Something happened that drew every eye at once (a shout, the bell).
export function jolt(a, n) {
  const was = a.v; a.v = Math.min(ATTENTION.max, a.v + n);
  const id = ATTENTION.levels.filter(l => was < l.at && a.v >= l.at).pop()?.id ?? null;
  if (id === 'found') a.v = ATTENTION.after;
  return id;
}
