// Everybody's birthday (Phase 29; real dates from v2.0, as 'MM-DD'). The corkboard in your
// apartment lists the week's birthdays and WKNT reads them out on the radio. On the day,
// wish someone a happy birthday when you talk to them; Ryan, Erin and Kristen also take a
// gift, which counts double (their birthdays are kept in data/relationships.js too).

import { RELATIONSHIPS } from './relationships.js';
import { isMonthDay, weekdayName, MONTHS } from '../game/calendar.js';

export const BIRTHDAYS = {
  // The townsfolk.
  Jackson: '01-21', Morgan: '07-08', Kristen: '07-07', Pablo: '05-05', Ryan: '09-25', Jade: '04-16', Erin: '07-24', Dex: '09-01', Stuart: '10-31',
  // Staff in town.
  Lou: '02-05', Teddy: '06-11', Abernathy: '08-18', Dot: '11-22', Rose: '06-26',
  // The shopkeepers.
  'Clerk Dunmore': '01-02', 'Mrs. Kowalski': '03-09', 'Mr. Pryce': '04-12', 'Ray Delgado': '07-14', 'Tarp Sal': '08-15',
  'Professor Okoye': '09-19', 'Ms. Achterberg': '11-25', 'Captain Rourke': '12-28',
};
for (const [name, def] of Object.entries(RELATIONSHIPS)) if (def.birthday) BIRTHDAYS[name] = def.birthday;

export const birthdayOf = name => BIRTHDAYS[name] ?? null;
export const isBirthdayToday = (name, day) => !!birthdayOf(name) && isMonthDay(birthdayOf(name), day);
// 'MM-DD' as "July 7".
export const birthdayText = md => { const [m, d] = md.split('-').map(Number); return `${MONTHS[m - 1]} ${d}`; };
// Birthdays from today through the next `days` days: [{ name, inDays, day }], soonest first.
export function birthdaysAhead(day, days = 6) {
  const out = [];
  for (let k = 0; k <= days; k++) for (const [name, md] of Object.entries(BIRTHDAYS)) if (isMonthDay(md, day + k)) out.push({ name, inDays: k, day: day + k });
  return out;
}
export const whenText = (inDays, day) => (inDays === 0 ? 'today' : inDays === 1 ? 'tomorrow' : `on ${weekdayName(day)}`);

// What they say when you remember.
const THANKS = {
  Lou: 'Nobody remembers that. Fine. This one’s on the house. Don’t tell anybody.',
  Dot: 'Oh, hon. Fifty-two years and you’re the first customer who’s ever asked. Extra whipped cream for you.',
  Morgan: 'You remembered! I made a list of everyone who’d remember. It was one name long. Now it’s two!',
  Dex: 'Huh. Thanks. Morgan’s making a cake. Morgan’s making a cake shaped like a book. Of course she is.',
  Ryan: 'For me? Watch: I’ll pull a candle out of your ear. …Okay, Erin hid the candles. Thanks, really.',
  Erin: 'Oh, sweetheart. Ryan’s been weird all week; I think he’s planning something with doves. Thank you.',
  Kristen: 'Thanks, shipmate. I don’t do candles. I do one beer and an early night. Okay, two beers.',
  Stuart: '…Another year closer. Thank you. Genuinely.',
  Pablo: 'Ayy! Birthday tamales, my treat. Well, the cart’s treat. I’ll ask.',
  Jackson: 'Thanks! Did you know you share a birthday with about twenty million people? None of them remembered.',
  Jade: 'You remembered! Okay, now I have to cry a little. Give me a second.',
  Mike: 'Seventy-one. Don’t tell the yard. They’ll want me to join them. …Thanks, kid.',
  Kip: 'Hm. Nobody’s said that to me in a while. …Take a pack of worms. On the house.',
};
export const birthdayThanks = name => THANKS[name] ?? 'My birthday? You remembered. That’s… thank you. Truly.';
