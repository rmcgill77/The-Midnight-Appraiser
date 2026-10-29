// When it's dark enough for a night run (Phase 30). The nights are long in winter and short in
// summer, so how much of the night is left to run depends on the season. Pure.
//
// Times are minutes since midnight; dawn is the next morning's.

const DAY = 24 * 60;
const t = (h, m = 0) => h * 60 + m;

export const DARKNESS = {
  winter: { dusk: t(17), dawn: t(7, 30) },
  spring: { dusk: t(19, 30), dawn: t(5, 30) },
  summer: { dusk: t(21), dawn: t(4, 30) },
  autumn: { dusk: t(18, 30), dawn: t(6, 30) },
};

// Minutes of dark left at `minuteOfDay`, 0 in daylight.
export function darkLeft(season, minuteOfDay) {
  const d = DARKNESS[season] ?? DARKNESS.autumn;
  if (minuteOfDay >= d.dusk) return DAY - minuteOfDay + d.dawn;
  if (minuteOfDay < d.dawn) return d.dawn - minuteOfDay;
  return 0;
}

// A night run needs at least an hour of dark to be worth starting.
export const MIN_RUN = 60;
export const canRun = (season, minuteOfDay) => darkLeft(season, minuteOfDay) >= MIN_RUN;

// How long a run may last: the usual length, or less if dawn is coming sooner.
export const runMinutes = (season, minuteOfDay, maxMinutes) => Math.min(maxMinutes, darkLeft(season, minuteOfDay));

// The clock time dawn comes, for messages.
export const dawnMinute = season => (DARKNESS[season] ?? DARKNESS.autumn).dawn;
