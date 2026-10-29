// The climate (Phase 30), pure: weather that changes through the day and follows the season, the way real
// weather does. Everything is a function of the game's seed and the time (absolute game minutes), so it is
// the same on a reload and nothing about it needs saving.
//
//   Fronts roll through every two and a half to five days: first the cloud thickens, the wind picks up and
//   the pressure falls; then rain (or snow, when it's cold) for several hours; then it clears, cooler and
//   breezy. In between the weather is fair. Fog forms on calm, damp nights and burns off by late morning;
//   in the warm months an unstable afternoon can build into a thunderstorm; the temperature follows the
//   month, rises to a peak mid-afternoon and falls to a low before dawn.
//
// sample() gives the continuous readings (temperature, humidity, wind, pressure, cloud, precipitation, fog,
// thunder); typeOf() boils them down to the game's six weather types (clear, overcast, fog, rain, storm, snow)
// so everything that already reads the weather keeps working.

const H = 60, DAY = 1440;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

// A temperate coastal town. Index 0 is January. Mean temperature (C), the swing between night and
// afternoon, and how damp the air usually is.
const MEAN = [-1, 0.5, 5, 10.5, 15.5, 20, 23, 22, 18, 12, 6, 1.5];
const SWING = [6, 7, 8, 9, 10, 10, 11, 10, 9, 8, 6, 5];
const HUMID = [0.78, 0.74, 0.7, 0.66, 0.65, 0.64, 0.66, 0.68, 0.7, 0.74, 0.78, 0.8];
const byMonth = (table, month) => { const m = ((month % 12) + 12) % 12, i = Math.floor(m); return lerp(table[i], table[(i + 1) % 12], m - i); };

// ---- seeded randomness ----
function hash(seed, a, b = 0) {
  let h = (seed ^ Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Smooth value noise: 0..1, changing over about `scale` minutes.
function noise(seed, t, scale, salt = 0) {
  const x = t / scale, i = Math.floor(x), f = smooth(x - i);
  return lerp(hash(seed, i, salt), hash(seed, i + 1, salt), f);
}

// ---- fronts ----
const frontCache = new Map();
function frontsFor(seed, upTo) {
  let list = frontCache.get(seed);
  if (!list) { list = [{ at: 36 * H + hash(seed, 0, 1) * 30 * H, k: 0 }]; frontCache.set(seed, list); if (frontCache.size > 8) frontCache.delete(frontCache.keys().next().value); }
  while (list[list.length - 1].at < upTo + 6 * DAY) {
    const k = list.length;
    list.push({ at: list[k - 1].at + (60 + hash(seed, k, 2) * 60) * H, k });
  }
  return list.map(f => f);
}
function frontDetail(seed, f) {
  return { at: f.at, dur: (6 + hash(seed, f.k, 3) * 8) * H, strength: 0.3 + 0.7 * Math.pow(hash(seed, f.k, 4), 1.1), cold: hash(seed, f.k, 5) < 0.5, k: f.k };
}

// What the nearest fronts are doing to the sky at time t: lead (approaching), main (the rain), trail (clearing).
function frontState(seed, t) {
  const fronts = frontsFor(seed, t);
  let best = { lead: 0, main: 0, trail: 0, strength: 0, cold: false, x: 0, dur: 1 };
  for (const raw of fronts) {
    if (raw.at - 14 * H > t) break;
    const f = frontDetail(seed, raw), x = t - f.at;
    let lead = 0, main = 0, trail = 0;
    if (x < 0) lead = smooth((x + 12 * H) / (12 * H));
    else if (x < f.dur) {
      const u = x / f.dur;
      // a cold front is fierce and quick, a warm one steady and broad
      main = f.cold ? Math.sin(Math.PI * Math.pow(u, 0.7)) : Math.pow(Math.sin(Math.PI * u), 0.6);
      lead = 1;
    } else trail = 1 - smooth((x - f.dur) / (10 * H));
    if (x >= f.dur + 10 * H) continue;
    const score = lead * 0.4 + main + trail * 0.6;
    if (score > best.lead * 0.4 + best.main + best.trail * 0.6) best = { lead, main, trail, strength: f.strength, cold: f.cold, x, dur: f.dur };
  }
  return best;
}

// ---- the readings ----
// month: 0-12 fractional (Sep 1 = 8). Returns the continuous weather at absolute game minute t.
export function sample(seed, t, { month = 8 } = {}) {
  const hour = ((t % DAY) + DAY) % DAY / H, day = Math.floor(t / DAY);
  const f = frontState(seed, t), slow = noise(seed, t, 7 * H, 11);
  const calm = t < 30 * H;                                  // the first morning and day are an easy start

  let cloud = clamp(0.2 + 0.62 * slow + 0.45 * f.lead + 0.5 * f.main + 0.2 * f.trail);
  let precip = f.main * f.strength;
  if (calm) { precip = 0; cloud = Math.min(cloud, 0.6); }
  if (cloud < 0.55) precip = 0;                             // no rain from a clear sky

  const mean = byMonth(MEAN, month), swing = byMonth(SWING, month);
  const shift = (f.cold ? -4.5 * f.trail - 1.5 * f.main : 1.8 * (f.lead + f.main * 0.6)) * f.strength + (noise(seed, t, 30 * H, 13) - 0.5) * 6;
  const temp = mean + shift + (swing / 2) * Math.cos((2 * Math.PI * (hour - 15)) / 24) * (1 - 0.45 * cloud) - 1.2 * precip;

  const wind = Math.max(0, 1.8 + 4.5 * slow + 8 * f.lead * f.strength + 7 * f.main * f.strength + (f.cold ? 7 : 3) * f.trail * f.strength);
  const dirBase = hash(seed, day, 21) * 360, windDir = (dirBase + 80 * (f.lead - f.trail) + 360) % 360;
  const pressure = 1014 + (noise(seed, t, 40 * H, 17) - 0.5) * 8 - 24 * f.strength * (0.5 * f.lead + f.main) + 7 * f.trail * f.strength;

  // Convective storms: an unstable, hot afternoon in spring and summer can build into a thunderstorm.
  let convect = 0;
  if (!calm && mean + shift > 14 && hash(seed, day, 31) < clamp((temp - 17) / 30, 0, 0.3)) {
    const centre = 15 + hash(seed, day, 32) * 4, width = 1.2 + hash(seed, day, 33) * 1.2;
    convect = Math.exp(-(((hour - centre) / width) ** 2));
    cloud = Math.max(cloud, 0.55 + 0.4 * convect);
  }
  const thunder = clamp((f.cold && temp > 6 ? Math.max(0, f.main * f.strength * 1.5 - 0.35) : 0) + convect * 0.9 - 0.15) * (precip > 0.2 || convect > 0.3 ? 1 : 0.4);
  precip = clamp(Math.max(precip, convect * 0.8));

  const humidity = clamp(byMonth(HUMID, month) + 0.22 * cloud + 0.25 * precip + 0.15 * Math.cos((2 * Math.PI * (hour - 5)) / 24));

  // Fog: calm, damp nights and mornings, burning off by about 10:30.
  const night = hour >= 21 || hour < 10.5;
  const burn = hour < 10.5 && hour > 6 ? smooth((10.5 - hour) / 3.5) : hour >= 21 || hour <= 6 ? 1 : 0;
  const fog = night && !calm ? clamp((humidity - 0.73) * 6) * clamp(1 - Math.max(0, wind - 1.5) / 4) * (cloud < 0.85 ? 1 : 0.3) * (precip < 0.1 ? 1 : 0) * burn : 0;

  return { temp, humidity, wind, windDir, pressure, cloud, precip, fog, thunder, front: f.lead + f.main > 0.05 ? { cold: f.cold, strength: f.strength } : null };
}

export const TYPES = ['clear', 'overcast', 'fog', 'rain', 'storm', 'snow'];
// The game's weather type for a reading.
export function typeOf(s) {
  if (s.thunder > 0.45 && s.precip > 0.2) return 'storm';
  if (s.precip > 0.1) return s.temp <= 0.8 ? 'snow' : 'rain';
  if (s.fog > 0.5) return 'fog';
  if (s.cloud > 0.62) return 'overcast';
  return 'clear';
}
export const typeAt = (seed, t, opts) => typeOf(sample(seed, t, opts));

// How the pressure is moving (hPa over the last three hours): falling means weather on the way.
export function pressureTrend(seed, t, opts) { return sample(seed, t, opts).pressure - sample(seed, t - 3 * H, opts).pressure; }

// What it will be like later: the types at 3, 6, 12 and 24 hours on.
export const outlook = (seed, t, opts) => [3, 6, 12, 24].map(h => ({ hours: h, type: typeAt(seed, t + h * H, opts) }));

// A day's weather for the things that need one answer per day (a shop shut for the storm): midday.
export const dayType = (seed, date, opts) => typeAt(seed, date * DAY + 12 * H, opts);
