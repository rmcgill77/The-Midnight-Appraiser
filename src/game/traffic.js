// How busy the shop is through the day (Phase 30), pure. In the continuous day the shop opens for the
// hours the player set, so the customers should come when real people would: a trickle in the early
// morning and late at night, a rush at lunch and another after work. And fewer hours, or a late opening,
// means fewer customers. Weather is applied elsewhere (game/weather.js), as before.

// Relative busyness by minute of the day.
const BANDS = [
  [0, 4 * 60, 0.3],        // the dead of night
  [4 * 60, 8 * 60, 0.25],  // before anyone's up
  [8 * 60, 10 * 60, 0.7],  // morning
  [10 * 60, 12 * 60, 1.0],
  [12 * 60, 13 * 60 + 30, 1.6],   // lunch
  [13 * 60 + 30, 16 * 60, 1.0],
  [16 * 60, 17 * 60, 1.3],
  [17 * 60, 19 * 60, 1.7],        // after work
  [19 * 60, 21 * 60, 1.1],        // evening
  [21 * 60, 24 * 60, 0.6],        // late
];
export function weightAt(minuteOfDay) {
  const m = ((minuteOfDay % 1440) + 1440) % 1440;
  for (const [a, b, w] of BANDS) if (m >= a && m < b) return w;
  return 1;
}

// A shift shorter than the full day (or opened late) brings proportionally fewer customers.
export function hoursScale(openMinutes, fullMinutes) {
  return Math.max(0.15, Math.min(1, openMinutes / fullMinutes));
}

// n arrival times as fractions (0..1) of the time from `opened` to `closes` (absolute game minutes),
// spread by the busyness above: one per equal share of the expected traffic, jittered a little.
// rng has next(). The result is sorted.
export function arrivalProgress(n, opened, closes, rng, step = 10) {
  if (n <= 0) return [];
  const span = Math.max(1, closes - opened), slots = Math.max(1, Math.ceil(span / step));
  const cum = [];
  let total = 0;
  for (let i = 0; i < slots; i++) { total += weightAt(opened + (i + 0.5) * step); cum.push(total); }
  const out = [];
  for (let k = 0; k < n; k++) {
    const target = ((k + 0.35 + rng.next() * 0.3) / n) * total;
    let i = cum.findIndex(c => c >= target);
    if (i < 0) i = slots - 1;
    const before = i ? cum[i - 1] : 0, within = (target - before) / Math.max(1e-9, cum[i] - before);
    out.push(Math.min(0.97, Math.max(0, ((i + within) * step) / span)));
  }
  return out.sort((a, b) => a - b);
}
