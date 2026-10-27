// The calendar (v2.0). The world runs on a real calendar, for flavor: day 1 is a real
// date, and weekdays, months, seasons and leap years follow from it. It is not tied to
// the player's own clock. Every game is set in WORLD_YEAR and starts on the first day of
// the season the player picks (meteorological seasons: March, June, September, December).
//
// Saves from before v2.0 keep their old rhythm: day 1 is Monday 6 September 1999 (so the
// weekdays they had don't move) and their weather seasons keep the old 90-day pattern.
//
// Pure apart from one setting: which calendar is in use. The game sets it when a save
// is loaded or started (useSim), so the many day-based helpers don't need it passed in.

export const WORLD_YEAR = 1999;
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAMES = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };
const SEASON_MONTH = { spring: 2, summer: 5, autumn: 8, winter: 11 };   // 0-based first month
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_MS = 86400000;

export const LEGACY_START = '1999-09-06';   // a Monday, so old saves keep their weekdays

const parse = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const iso = ms => new Date(ms).toISOString().slice(0, 10);

let cal = { start: parse(LEGACY_START), legacy: true, key: `L${LEGACY_START}` };

// { start: 'YYYY-MM-DD', legacy?: bool }
// No argument: back to the older saves' calendar.
export function setCalendar({ start = LEGACY_START, legacy = false } = { legacy: true }) {
  cal = { start: parse(start), legacy: !!legacy, key: `${legacy ? 'L' : 'R'}${start}` };
}
export const calendarOf = st => (st?.year?.start ? { start: st.year.start, legacy: false } : { start: LEGACY_START, legacy: true });
export function useSim(st) { const c = calendarOf(st); const k = `${c.legacy ? 'L' : 'R'}${c.start}`; if (k !== cal.key) setCalendar(c); }
export const calendarKey = () => cal.key;
export const isLegacy = () => cal.legacy;

// The first day of a season in the world year, as YYYY-MM-DD.
export const seasonStartIso = (season, year = WORLD_YEAR) => iso(Date.UTC(year, SEASON_MONTH[season], 1));

// ---------- days and dates ----------

const msOf = day => cal.start + (Math.max(1, day) - 1) * DAY_MS;
export function dateOf(day) {
  const t = new Date(msOf(day));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), wd: (t.getUTCDay() + 6) % 7 };
}
// The day number of a date (can be 0 or negative for dates before day 1).
export const dayOfDate = (y, m, d) => Math.round((Date.UTC(y, m, d) - cal.start) / DAY_MS) + 1;

export const weekdayOf = day => dateOf(day).wd;               // 0 = Monday
export const weekdayName = day => WEEKDAY_NAMES[weekdayOf(day)];
export const monthDay = day => { const { m, d } = dateOf(day); return `${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; };
export const isLeapYear = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// "Mon, Mar 1" / "Monday, March 1, 1999"
export function formatDate(day, { long = false, year = false } = {}) {
  const { y, m, d, wd } = dateOf(day);
  const w = long ? WEEKDAY_NAMES[wd] : WEEKDAY_NAMES[wd].slice(0, 3), mo = long ? MONTHS[m] : MONTHS[m].slice(0, 3);
  return `${w}, ${mo} ${d}${year ? `, ${y}` : ''}`;
}
// The same, for a date given as YYYY-MM-DD (whatever calendar is in use).
export function formatIso(isoDate, { long = true, year = true } = {}) {
  const t = new Date(parse(isoDate)), wd = (t.getUTCDay() + 6) % 7, m = t.getUTCMonth();
  return `${long ? WEEKDAY_NAMES[wd] : WEEKDAY_NAMES[wd].slice(0, 3)}, ${long ? MONTHS[m] : MONTHS[m].slice(0, 3)} ${t.getUTCDate()}${year ? `, ${t.getUTCFullYear()}` : ''}`;
}
// The first day of the season after the one starting on `isoDate`.
export function nextSeasonIso(isoDate) {
  const t = new Date(parse(isoDate));
  return iso(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 3, 1));
}
export const shortDate = day => { const { m, d } = dateOf(day); return `${MONTHS[m].slice(0, 3)} ${d}`; };

// Days from `day` until the next time a month-day ('MM-DD') comes round (0 = today).
// A 29 February birthday is kept on 28 February in other years.
export function daysUntil(md, day) {
  for (let k = 0; k < 367; k++) {
    const here = monthDay(day + k);
    if (here === md) return k;
    if (md === '02-29' && here === '02-28' && !isLeapYear(dateOf(day + k).y)) return k;
  }
  return null;
}
export const isMonthDay = (md, day) => daysUntil(md, day) === 0;

// ---------- seasons ----------

const LEGACY_SEASON = day => (day <= 21 ? 'autumn' : day <= 49 ? 'winter' : 'spring');
const seasonOfMonth = m => (m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter');

// The season on a day (for the weather). Old saves keep their old pattern.
export function seasonOf(day) { return cal.legacy ? LEGACY_SEASON(day) : seasonOfMonth(dateOf(day).m); }
// The real season of a day, whatever the save.
export const realSeasonOf = day => seasonOfMonth(dateOf(day).m);

// Is this day the first day of a season (1 March, 1 June, 1 September, 1 December)?
export function isSeasonStart(day) { const { m, d } = dateOf(day); return d === 1 && Object.values(SEASON_MONTH).includes(m); }
// The first day of the next season after `day`.
export function nextSeasonStart(day) {
  let k = day + 1;
  while (!isSeasonStart(k)) k++;
  return k;
}
// The first day of the season `n` seasons after the one that starts on (or contains) `day`.
export function seasonStartAfter(day, n) {
  let k = day; while (!isSeasonStart(k) && k > -400) k--;
  for (let i = 0; i < n; i++) k = nextSeasonStart(k);
  return k;
}
// The season that ends the day before `day` (the one an audit on `day` looks back on).
export const seasonEndingBefore = day => realSeasonOf(day - 1);
