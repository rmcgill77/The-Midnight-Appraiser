// What the player is told about the weather (Phase 30), pure: the readings in plain words and the
// outlook for the next day. Units are metric (C, km/h) or US (F, mph), by the player's setting.

import { sample, typeOf, outlook, pressureTrend } from './climate.js';

export const fmtTemp = (c, unit = 'c') => (unit === 'f' ? `${Math.round(c * 9 / 5 + 32)}°F` : `${Math.round(c)}°C`);
export const fmtWind = (ms, unit = 'c') => (unit === 'f' ? `${Math.round(ms * 2.237)} mph` : `${Math.round(ms * 3.6)} km/h`);

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const compass = deg => POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

// Beaufort-ish words for the wind, by metres per second.
export function windWord(ms) {
  if (ms < 1.5) return 'Calm';
  if (ms < 5) return 'Light breeze';
  if (ms < 9) return 'Breezy';
  if (ms < 14) return 'Windy';
  return 'Gale';
}

// hPa change over three hours.
export function trendWord(d) {
  if (d <= -3) return 'Falling fast';
  if (d <= -0.8) return 'Falling';
  if (d < 0.8) return 'Steady';
  if (d < 3) return 'Rising';
  return 'Rising fast';
}

// What the pressure means for the next few hours, in a sentence.
export function summary(trend, nowType, later) {
  const wet = new Set(['rain', 'storm', 'snow']);
  const soonWet = later.find(l => l.hours <= 12 && wet.has(l.type) && !wet.has(nowType));
  const soonClear = later.find(l => l.hours <= 12 && !wet.has(l.type) && wet.has(nowType));
  if (wet.has(nowType)) return soonClear ? `It should ease off in about ${soonClear.hours} hours.` : 'It looks set in for a while.';
  if (soonWet) return `${soonWet.type === 'snow' ? 'Snow' : soonWet.type === 'storm' ? 'A storm' : 'Rain'} is on the way: ${trend <= -0.8 ? 'the pressure is falling' : 'it should arrive'} within about ${soonWet.hours} hours.`;
  if (trend <= -3) return 'The pressure is dropping fast. Something is coming.';
  if (trend >= 3) return 'The pressure is climbing. It should stay fair.';
  return 'Nothing much is coming.';
}

// Everything the weather panel shows, for the moment t. unit: 'c' or 'f'.
export function forecastView(seed, t, opts, unit = 'c') {
  const s = sample(seed, t, opts), type = typeOf(s), trend = pressureTrend(seed, t, opts);
  const later = outlook(seed, t, opts).map(o => {
    const f = sample(seed, t + o.hours * 60, opts);
    return { hours: o.hours, type: o.type, temp: fmtTemp(f.temp, unit) };
  });
  return {
    type,
    temp: fmtTemp(s.temp, unit),
    humidity: `${Math.round(s.humidity * 100)}%`,
    wind: `${windWord(s.wind)}, ${compass(s.windDir)} ${fmtWind(s.wind, unit)}`,
    pressure: `${Math.round(s.pressure)} hPa`,
    trend: trendWord(trend),
    later,
    summary: summary(trend, type, later),
  };
}
