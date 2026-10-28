// Holidays (v2.2), on the world's real calendar (game/calendar.js). On the day: a line in the
// morning, WKNT on the radio, a greeting you can give anyone you talk to, and a busier (or
// quieter) shop. A few close most of the town. Around some of them the street dresses up:
// jack-o'-lanterns by the doors in the week before Halloween, string lights and wreaths
// through December, flags on the lamp posts at the start of July, fireworks over the city
// on the evening of the Fourth and on New Year's Eve.

import { dateOf, monthDay } from '../game/calendar.js';

// shop: { buyers: extra buyers today (negative: fewer), spend: how much more they'll pay }.
// closed: most places in town shut (the Hub, the diner and the chapel stay open).
export const HOLIDAYS = [
  { id: 'newyear', name: 'New Year’s Day', date: '01-01', greeting: 'Happy New Year!', closed: true, shop: { buyers: -2 },
    morning: 'New Year’s Day. Most of the town is sleeping it off. The few who come in are in no hurry.',
    radio: 'Happy New Year from WKNT. If you’re hearing this, you made it. That counts for something.' },
  { id: 'valentines', name: 'Valentine’s Day', date: '02-14', greeting: 'Happy Valentine’s Day!', shop: { buyers: 1, spend: 0.1 },
    morning: 'Valentine’s Day. Someone will want something old and lovely for someone they love. Or something cursed for someone they don’t.',
    radio: 'It’s Valentine’s Day. Call somebody. Or don’t, and listen to us instead. We’re here all night.' },
  { id: 'stpatricks', name: 'St. Patrick’s Day', date: '03-17', greeting: 'Happy St. Patrick’s Day!', shop: { buyers: 1 },
    morning: 'St. Patrick’s Day. Lou has dyed the beer green again. Nobody asked him to.',
    radio: 'St. Patrick’s Day. Lou at the Gathering Hub says the green beer is “on purpose this year.”' },
  { id: 'july4', name: 'Independence Day', date: '07-04', greeting: 'Happy Fourth!', shop: { buyers: -1 }, fireworks: true,
    morning: 'The Fourth of July. Flags on every lamp post, and fireworks over the harbor tonight.',
    radio: 'Happy Fourth from WKNT. Fireworks off the harbor at dusk. Keep your pets in. Keep your basements locked.' },
  { id: 'halloween', name: 'Halloween', date: '10-31', greeting: 'Happy Halloween!', shop: { buyers: 2, spend: 0.15 },
    morning: 'Halloween. The one night a year the town pretends to be haunted. Everyone wants something spooky, and they’ll pay for it.',
    radio: 'Happy Halloween from WKNT. Lock your doors, count your children, and if something knocks twice, don’t answer.' },
  { id: 'thanksgiving', name: 'Thanksgiving', rule: 'thanksgiving', greeting: 'Happy Thanksgiving!', closed: true, shop: { buyers: -2 },
    morning: 'Thanksgiving. The town smells of turkey and is mostly shut. Dot is doing a dinner at the diner for anyone who’s alone.',
    radio: 'Happy Thanksgiving. Dot at the Owl Diner says there’s a plate for anybody who needs one. No questions asked.' },
  { id: 'blackfriday', name: 'Black Friday', rule: 'blackfriday', greeting: null, shop: { buyers: 3, spend: 0.1 },
    morning: 'Black Friday. Bargain hunters everywhere. Even your shop will be busy.',
    radio: 'It’s Black Friday. If you’re out shopping, be careful. Some bargains are cheap for a reason.' },
  { id: 'christmaseve', name: 'Christmas Eve', date: '12-24', greeting: 'Merry Christmas!', shop: { buyers: 3, spend: 0.2 },
    morning: 'Christmas Eve. The last-minute shoppers will buy anything with a bow on it.',
    radio: 'It’s Christmas Eve. Last-minute shoppers, the stores close early. The night belongs to whoever’s out in it.' },
  { id: 'christmas', name: 'Christmas Day', date: '12-25', greeting: 'Merry Christmas!', closed: true, shop: { buyers: -2 },
    morning: 'Christmas Day. Snow or no snow, the town is quiet and most doors are shut.',
    radio: 'Merry Christmas from WKNT. Whoever you’re with, and whoever you’re missing.' },
  { id: 'nye', name: 'New Year’s Eve', date: '12-31', greeting: 'Happy New Year!', shop: { buyers: 1 }, fireworks: true,
    morning: 'New Year’s Eve. Fireworks at midnight, and a lot of people out tonight who won’t remember it.',
    radio: 'New Year’s Eve. Fireworks over the harbor at midnight. Get home safe. Get home, period.' },
];
// Places that stay open on a holiday when the rest of town shuts.
export const OPEN_ON_HOLIDAYS = new Set(['bar', 'diner', 'chapel']);

// Thanksgiving: the fourth Thursday of November.
function thanksgivingDay(y) { const first = new Date(Date.UTC(y, 10, 1)).getUTCDay(); return 1 + ((4 - first + 7) % 7) + 21; }

export function holidayOn(day) {
  const md = monthDay(day), { y, m, d } = dateOf(day);
  for (const h of HOLIDAYS) {
    if (h.date === md) return h;
    if (h.rule === 'thanksgiving' && m === 10 && d === thanksgivingDay(y)) return h;
    if (h.rule === 'blackfriday' && m === 10 && d === thanksgivingDay(y) + 1) return h;
  }
  return null;
}
export const holidayClosed = (placeId, day) => !!holidayOn(day)?.closed && !OPEN_ON_HOLIDAYS.has(placeId);

// How the street is dressed today: 'halloween', 'lights' (December to New Year's Day),
// 'flags' (the first four days of July), or null.
export function decorOn(day) {
  const { m, d } = dateOf(day);
  if (m === 9 && d >= 24) return 'halloween';
  if (m === 11 || (m === 0 && d === 1)) return 'lights';
  if (m === 6 && d <= 4) return 'flags';
  return null;
}
export const fireworksOn = day => !!holidayOn(day)?.fireworks;
