// Appraisal jobs that take up to a week (Phase 30). Each job carries a due day; the owner
// collects on that day, paid if the report is filed, nothing if not. Pure: no DOM, no storage.
// Days here are the sim's day numbers (st.day).

export const MAX_DAYS = 7;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// How many days an owner gives: 1 to 7. A bigger fee means a harder object, so a longer wait.
// range: the fee range for that kind of customer, [lo, hi]. rng: a seeded RNG (has int()).
export function dueDays(fee, range, rng) {
  const [lo, hi] = range;
  const q = hi > lo ? clamp((fee - lo) / (hi - lo), 0, 1) : 0.5;
  return clamp(1 + Math.round(q * 4) + rng.int(0, 2), 1, MAX_DAYS);
}

// The due day for a job taken on `today`: `days` later, pushed to the next open day when the shop is
// closed on that day (the owner comes by when the shop is open). isClosed(day) -> boolean.
export function dueDate(today, days, isClosed = () => false) {
  let day = today + days;
  for (let i = 0; i < MAX_DAYS && isClosed(day); i++) day += 1;
  return day;
}

// Days left on a job, or null for a job with no due day (the old same-day kind).
export const daysLeft = (job, today) => (job?.due == null ? null : job.due - today);

export function leftText(n) {
  if (n == null) return '';
  if (n <= 0) return 'due today';
  return n === 1 ? 'due tomorrow' : `due in ${n} days`;
}

// A job still open on its due day is collected unpaid at the end of that day.
export const isExpired = (job, today) => job?.due != null && job.due <= today;

// A missed day (a collapse) gives every open job one more day.
export function extendForMissedDay(jobs) { for (const j of jobs) if (j?.due != null) j.due += 1; }
