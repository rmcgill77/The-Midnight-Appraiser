// The light of the sky through the day (Phase 32), from the real clock and the season. Pure.
//
// skylight(season, minute, { nightDark }) -> { alpha, rgb, night, sun }
//   alpha/rgb: the colour wash laid over the street (0 alpha at midday, the dark navy at night)
//   night: 0 in daylight up to 1 in the dead of night (how much the lamps and windows should glow)
//   sun: { dir, len, strength } for shadows: dir -1 (the sun low in the east, shadows fall west)
//        to +1 (low in the west, shadows fall east); len a shadow length multiplier; strength 0..1
//
// The seasons' dusk and dawn come from game/nightwindow.js: full dark between them.

import { DARKNESS } from './nightwindow.js';

const DAY = 24 * 60;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], clamp(t))));

const NAVY = [6, 8, 16], ROSE = [196, 108, 96], AMBER = [226, 150, 70], VIOLET = [60, 44, 96], GOLD = [232, 178, 96];

export function skylight(season, minuteIn, { nightDark = 0.6 } = {}) {
  const d = DARKNESS[season] ?? DARKNESS.autumn;
  const m = ((minuteIn % DAY) + DAY) % DAY;
  const dawn = d.dawn, dusk = d.dusk;
  let alpha = 0, rgb = GOLD, night = 0, sunT = 0.5;      // sunT: 0 sunrise .. 1 sunset

  if (m < dawn - 60 || m >= dusk) {                       // the dark
    alpha = nightDark; rgb = NAVY; night = 1; sunT = m >= dusk ? 1 : 0;
  } else if (m < dawn + 60) {                             // dawn: the dark thins, the sky goes rose then clear
    const t = (m - (dawn - 60)) / 120;                    // 0 at the start of twilight, 1 an hour after dawn
    night = 1 - smooth(t * 1.2);
    alpha = lerp(nightDark, 0.14, smooth(t * 1.4)) * (t < 0.6 ? 1 : 1 - smooth((t - 0.6) / 0.4));
    rgb = t < 0.5 ? mixRgb(NAVY, ROSE, t * 2) : mixRgb(ROSE, AMBER, (t - 0.5) * 2);
    sunT = 0;
  } else if (m < dusk - 150) {                            // day: clear, a touch of gold early
    const early = clamp(1 - (m - (dawn + 60)) / 90);
    alpha = 0.06 * early; rgb = GOLD; night = 0;
    sunT = clamp((m - (dawn + 60)) / ((dusk - 150) - (dawn + 60)) * 0.9 + 0.05);
  } else if (m < dusk - 60) {                             // golden afternoon
    const t = (m - (dusk - 150)) / 90;
    alpha = lerp(0.0, 0.13, smooth(t)); rgb = GOLD; night = 0; sunT = 0.9 + 0.05 * t;
  } else {                                                // dusk: gold, rose, violet, then dark
    const t = (m - (dusk - 60)) / 60;
    night = smooth(t);
    alpha = lerp(0.13, nightDark, smooth(t));
    rgb = t < 0.4 ? mixRgb(GOLD, ROSE, t / 0.4) : t < 0.75 ? mixRgb(ROSE, VIOLET, (t - 0.4) / 0.35) : mixRgb(VIOLET, NAVY, (t - 0.75) / 0.25);
    sunT = 1;
  }
  // The sun: low at the ends of the day (long shadows), high at noon (short ones); none in the dark.
  const alt = Math.sin(Math.PI * clamp(sunT));                  // 0 at the horizon, 1 at noon
  const sun = {
    dir: sunT * 2 - 1,
    len: 0.35 + 2.6 * (1 - alt) ** 1.5,
    strength: night >= 0.999 ? 0 : clamp(1 - night * 1.4),
  };
  return { alpha: +alpha.toFixed(3), rgb, night: +night.toFixed(3), sun };
}
