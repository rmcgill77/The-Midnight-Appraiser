// Is it open? (Phase 13.) Answers for a place on a given day and minute, with the reason
// and when it opens again, from data/schedules.js. Sick days come from the run's seed,
// so they're the same on a reload and different from one game to the next.

import { SCHEDULES, WEEKDAYS } from '../data/schedules.js';
import { closedByWeather } from './weather.js';
import { holidayClosed, holidayOn } from '../data/holidays.js';
import { hash } from './people.js';

import { weekdayOf } from './calendar.js';
export const weekday = day => weekdayOf(day);                 // 0 = Monday, from the calendar
export const weekdayName = day => WEEKDAYS[weekday(day)];
export const scheduleOf = locId => SCHEDULES[locId] ?? null;

export function isSick(locId, day, seed = 0) {
  const s = SCHEDULES[locId];
  if (!s?.sick || !s.days[weekday(day)]) return false;
  return (hash(`${seed}:${locId}:${day}`) % 10000) / 10000 < s.sick;
}

function hoursOn(s, day) {
  const w = weekday(day);
  if (!s.days[w]) return null;
  return s.short?.[w] ?? [s.open, s.close];
}

// Open at that minute, ignoring sick days (they're checked separately).
function openAt(s, day, minute) {
  const hrs = hoursOn(s, day);
  if (!hrs || minute < hrs[0] || minute >= hrs[1]) return false;
  return !(s.lunch && minute >= s.lunch[0] && minute < s.lunch[1]);
}

export function formatTime(m) {
  const hh = Math.floor(m / 60), mm = m % 60, h12 = hh % 12 || 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${hh < 12 ? 'AM' : 'PM'}`;
}

// Phase 23: shut all day for the weather (a storm, the snow) — data in game/weather.js.
const shutAllDay = (locId, day, seed) => isSick(locId, day, seed) || closedByWeather(locId, seed, day) || holidayClosed(locId, day);

// { open, why: 'open'|'before'|'lunch'|'after'|'off'|'sick'|'weather'|'holiday', reopens: { day, minute } | null,
//   sign: what the door says, keeperOut: whether the keeper is out on the street }
export function statusAt(locId, day, minute, seed = 0) {
  const s = SCHEDULES[locId];
  if (!s) return { open: true, why: 'open', reopens: null, sign: '', keeperOut: false };
  const sick = isSick(locId, day, seed), hrs = hoursOn(s, day);
  let why = 'open';
  if (sick) why = 'sick';
  else if (!hrs) why = 'off';
  else if (closedByWeather(locId, seed, day)) why = 'weather';
  else if (holidayClosed(locId, day)) why = 'holiday';   // v2.2
  else if (minute < hrs[0]) why = 'before';
  else if (minute >= hrs[1]) why = 'after';
  else if (s.lunch && minute >= s.lunch[0] && minute < s.lunch[1]) why = 'lunch';
  if (why === 'open') return { open: true, why, reopens: null, sign: 'OPEN', keeperOut: false };
  // When it opens next: the rest of today, then the next week, in 10-minute steps.
  let reopens = null;
  for (let d = day; d <= day + 8 && !reopens; d++) {
    if (shutAllDay(locId, d, seed)) continue;
    for (let m = d === day ? minute + 10 - (minute % 10) : 0; m < 24 * 60; m += 10) if (openAt(s, d, m)) { reopens = { day: d, minute: m }; break; }
  }
  return { open: false, why, reopens, sign: signText(why, day, reopens), keeperOut: why === 'lunch' || why === 'off' };
}

export function signText(why, day, reopens) {
  if (!reopens) return 'CLOSED';
  const when = reopens.day === day ? formatTime(reopens.minute) : reopens.day === day + 1 ? `tomorrow at ${formatTime(reopens.minute)}` : `${WEEKDAYS[weekday(reopens.day)]} at ${formatTime(reopens.minute)}`;
  if (why === 'lunch') return `Out to lunch · back at ${formatTime(reopens.minute)}`;
  if (why === 'before') return `Opens at ${formatTime(reopens.minute)}`;
  if (why === 'weather') return `Closed for the weather · opens ${when}`;
  if (why === 'holiday') return `Closed for ${holidayOn(day)?.name ?? 'the holiday'} · opens ${when}`;
  return `Closed · opens ${when}`;
}

// Places that won't open at all today, for the morning's heads-up.
export function closedAllDay(day, seed = 0) {
  return Object.keys(SCHEDULES).filter(id => shutAllDay(id, day, seed) || !hoursOn(SCHEDULES[id], day));
}

// A place's week, as lines for its door.
// Phase 19: the week at a glance, for a shut door: [{ day: 'Mon', open, hours: '9–5', today }].
export function weekStrip(locId, today = null) {
  const s = SCHEDULES[locId];
  if (!s) return [];
  const h = m => { const H = Math.floor(m / 60) % 12 || 12, M = m % 60; return M ? `${H}:${String(M).padStart(2, '0')}` : `${H}`; };
  return WEEKDAYS.map((name, w) => {
    const [o, c] = s.short?.[w] ?? [s.open, s.close];
    return { day: name.slice(0, 3), open: !!s.days[w], hours: s.days[w] ? `${h(o)}–${h(c)}` : 'Shut', today: w === today };
  });
}

export function weekLines(locId) {
  const s = SCHEDULES[locId];
  if (!s) return [];
  return WEEKDAYS.map((name, w) => {
    if (!s.days[w]) return `${name}: closed`;
    const [o, c] = s.short?.[w] ?? [s.open, s.close];
    return `${name}: ${formatTime(o)} to ${formatTime(c)}${s.lunch && !s.short?.[w] ? ` (lunch ${formatTime(s.lunch[0])} to ${formatTime(s.lunch[1])})` : ''}`;
  });
}
