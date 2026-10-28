// The city at night (v2.4). A night choice of its own, beside the basement lab, the zones and
// bed: the same streets from 10 PM to 4 AM, dark between the lamps.
//
//  - Hours: the night runs, the night city and the shop's night openings all share them.
//  - Late-open places: the Brass Lantern until two, the Owl Diner all night, the Bijou's late
//    show until midnight. Everything else is shut.
//  - The dark notices you (game/attention.js), faster under a new moon.
//  - Sights: things you come across, some once, some again and again (the mysteries, each a
//    few nights long, with something at the end).
//  - Night stalls: Tarp Sal's real night market on the square, Friday and Saturday; a noodle
//    cart that turns up somewhere different every night but Monday.
//  - People you know, out late: who and where depends on the night.
//  - Out too late (shared with the woods later): a warning at 3:30, a half-hour's grace after
//    four, then someone sees you home and you start late in the morning.
//
// Pure: data and rules over world.nightCity. main.js places things and draws them.

export const NIGHT_HOURS = { start: 22 * 60, end: 28 * 60, warn: 27 * 60 + 30, grace: 30 };
export const LATE = { hours: 2 };
export const fmtNight = m => { const h = Math.floor(m / 60) % 24, mm = m % 60, h12 = h % 12 || 12; return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };

// ---------- the state ----------

export function nightCityOf(world) {
  world.nightCity ??= { mysteries: {}, done: [], seen: {}, nights: 0, late: null, noodles: null, tables: null };
  return world.nightCity;
}

// ---------- late-open places (this game's own places; the original's are shut by their hours) ----------

export const NIGHT_PLACES = {
  bar: { until: 26 * 60, shut: 'Lou’s stacking the chairs. Last call was at two.' },
  diner: { until: null },
  bijou: { until: 24 * 60, shut: 'The marquee’s dark. The late show let out at midnight.' },
};
const SHUT = { thrift: 'Second Hand Rose is dark. A cat watches you from the window display.', chapel: 'St. Brigid’s is locked. A single candle burns somewhere inside.', brush: 'Erin’s shop is dark. A lamp she forgot to switch off glows in the back.' };
export function nightOpen(placeId, minute) {
  const p = NIGHT_PLACES[placeId];
  if (!p) return { open: false, sign: SHUT[placeId] ?? 'Closed for the night.' };
  if (p.until != null && minute >= p.until) return { open: false, sign: p.shut };
  return { open: true, sign: null };
}

// ---------- out too late ----------

// 'ok', 'warn' (from 3:30), 'late' (4:00 on, the grace half hour), 'caught' (after it).
export function lateStage(minute, graceUsed = false) {
  if (minute < NIGHT_HOURS.warn) return 'ok';
  if (minute < NIGHT_HOURS.end) return 'warn';
  return graceUsed ? 'caught' : 'late';
}
// Who sees you home. friends: [{ name, hearts }] (people who'd come looking). place: 'city',
// later 'woods'. Returns { who, lines }.
export function seenHome(place, friends = [], seed = 0) {
  if (place === 'cemetery') return { who: 'Mike', lines: ['You come to on the path with Mike’s coat over you and his lantern by your head. “Told you to mind the bell.”', 'He walks you out the side gate and all the way home, smoking the whole way, and doesn’t say another word about it.'] };
  if (place === 'beach') return { who: 'Kip', lines: ['Somebody’s dragging you up the sand by your collar. Kip. “Water had you. Breathe.”', 'He drives you home in the bait-shop truck, the heater on full, and makes you promise to stay off his beach after dark.'] };
  if (place === 'woods') return { who: 'The ranger', lines: ['A flashlight finds you between the trees. “Woods are closed, friend. Let’s get you out.”', 'The ranger walks you to the trailhead and waits until you’re on the road.'] };
  const close = friends.filter(f => f.hearts >= 4).sort((a, b) => b.hearts - a.hearts || a.name.localeCompare(b.name));
  if (close.length) {
    const f = close[seed % close.length];
    const say = FRIEND_HOME[f.name] ?? `${f.name} spots you on the corner and walks you all the way to your door. Neither of you says much.`;
    return { who: f.name, lines: [say] };
  }
  return { who: 'A patrol car', lines: ['Headlights pull up beside you. A tired officer leans out. “Little late for a walk. Get in, I’ll run you home.”', 'He drops you at your door and waits until the light goes on upstairs.'] };
}
const FRIEND_HOME = {
  Kristen: 'Kristen falls into step beside you. “Four in the morning, shipmate. Come on. I’ve got you.” She walks you to your door and checks your pupils on the stoop.',
  Ryan: 'Ryan steps out of a doorway as if he’d been waiting. “Your carriage awaits.” It’s his old car. He drives you home doing card tricks at the red lights.',
  Erin: 'Erin’s car slows beside you. “Ryan said he saw you out. Get in, honey.” She drives you home and makes you promise to sleep.',
  Stuart: 'Stuart is suddenly beside you, as if he’d always been. “The dark’s getting curious about you. Let’s not.” He walks you home without a word.',
  Pablo: 'Pablo pulls up in his truck. “You eat? No? Get in.” There’s a foil-wrapped burrito on the passenger seat. It’s for you.',
  Dex: 'Dex finds you. “Morgan sent me. She had a feeling.” He walks you home, ducking under every awning.',
  Morgan: 'Morgan and Dex find you. “I had a FEELING,” Morgan says. They walk you home and Morgan lectures you the whole way.',
  Jade: 'Jade finds you on the corner. “I was walking home too! Okay, I wasn’t. Come on.” Jade hums the whole way to your door.',
  Jackson: 'Jackson appears on a bicycle. “I was following the bus. Hop on the pegs.” You arrive home alive, which surprises you both.',
};

// ---------- sights ----------
// kind: where it turns up ('lamp', 'bus', 'bridge', 'square', 'dark', 'walk', 'harbor').
// from/to: in-game minutes (24 h + the small hours as 24..28). days: weekdays (0 = Monday).
// mystery: steps, in order, over several nights. weight: how often it's picked.

export const SIGHTS = {
  lamplighter: { name: 'The Lamplighter', kind: 'lamp', mystery: 4, weight: 4, from: 22 * 60, to: 27 * 60, look: 'lamplighter', label: 'Look',
    blurb: 'A man in a long coat lighting lamps that are already lit.' },
  bus313: { name: 'The 3:13', kind: 'bus', mystery: 3, weight: 9, from: 27 * 60, to: 27 * 60 + 40, look: 'bus', label: 'Look',
    blurb: 'A bus with no route number, at 3:13 in the morning.' },
  della: { name: 'The woman on the bridge', kind: 'bridge', mystery: 3, weight: 6, days: [2, 3], from: 25 * 60, to: 27 * 60 + 30, look: 'della', label: 'Talk',
    blurb: 'A woman on the bridge, soaked through, asking the time.' },
  dryers: { name: 'Spinning dryers', kind: 'walk', weight: 3, look: 'glow', label: 'Look', blurb: 'Every dryer in a dark laundromat, turning.' },
  stray: { name: 'A stray', kind: 'dark', weight: 3, look: 'eyes', label: 'Look', blurb: 'Two lights at knee height in an alley.' },
  singer: { name: 'A voice by the fountain', kind: 'square', weight: 2, look: 'singer', label: 'Listen', blurb: 'Someone singing on the square.' },
  watcher: { name: 'Someone on the corner', kind: 'dark', weight: 3, look: 'watcher', label: 'Look', blurb: 'A figure on the corner, not moving.' },
  wallet: { name: 'A wallet', kind: 'walk', weight: 2, look: 'wallet', label: 'Pick up', blurb: 'A wallet on the sidewalk.' },
};
export const MYSTERIES = Object.keys(SIGHTS).filter(id => SIGHTS[id].mystery);
export const mysteryStep = (world, id) => nightCityOf(world).mysteries[id] ?? 0;
export const mysteryDone = (world, id) => nightCityOf(world).done.includes(id);
export function advanceMystery(world, id) {
  const N = nightCityOf(world), n = (N.mysteries[id] ?? 0) + 1;
  N.mysteries[id] = n;
  if (n >= SIGHTS[id].mystery && !N.done.includes(id)) N.done.push(id);
  return n;
}
// Can it turn up now? ctx: { minute, weekday, night (a counter), moon, seenTonight: Set }
export function sightEligible(id, world, ctx) {
  const s = SIGHTS[id];
  if (s.mystery && mysteryDone(world, id)) return false;
  if (ctx.seenTonight?.has(id)) return false;
  if (s.days && !s.days.includes(ctx.weekday)) return false;
  if (s.from != null && (ctx.minute < s.from || ctx.minute >= s.to)) return false;
  // A mystery moves on at most once a night, and never two nights running.
  if (s.mystery && nightCityOf(world).seen[id] === ctx.night - 1) return false;
  return true;
}
// Roll for something new (once each in-game half hour, while nothing's out). rand: () => [0, 1).
export const SIGHT_CHANCE = 0.42;
export function rollSight(world, ctx, rand) {
  if (rand() > SIGHT_CHANCE * (ctx.strange ?? 1)) return null;
  const pool = Object.keys(SIGHTS).filter(id => sightEligible(id, world, ctx));
  // The bus only comes at 3:13: if it's due, it's the one.
  if (pool.includes('bus313') && ctx.minute >= 27 * 60 + 10) return 'bus313';
  const total = pool.reduce((a, id) => a + SIGHTS[id].weight, 0);
  let r = rand() * total;
  for (const id of pool) { r -= SIGHTS[id].weight; if (r <= 0) return id; }
  return pool[pool.length - 1] ?? null;
}

// ---------- night stalls ----------

// Tarp Sal's tables on the square: Friday and Saturday nights, 11 PM to 3 AM.
export const TABLES = { days: [4, 5], from: 23 * 60, to: 27 * 60 };
export const tablesOut = (weekday, minute) => TABLES.days.includes(weekday) && minute >= TABLES.from && minute < TABLES.to;
// What's on the tables: supplies a little under day prices, and a grab bag.
export const TABLE_GOODS = [
  { id: 'salt', kind: 'supplies', n: 2, price: 7, name: 'Two bags of rock salt', blurb: 'Off the back of a road crew’s truck. Don’t ask.' },
  { id: 'vials', kind: 'supplies', n: 2, price: 9, name: 'Two reagent vials', blurb: 'Stoppered with wax. The labels are in someone’s handwriting.' },
  { id: 'cell', kind: 'kit', n: 2, price: 8, name: 'Two flashlight cells', blurb: 'Still in the blister pack. Mostly.' },
  { id: 'ward', kind: 'kit', n: 1, price: 14, name: 'A chalk ward', blurb: 'Drawn on slate by somebody who knew what they were doing.' },
  { id: 'grab', kind: 'grab', n: 1, price: 22, name: 'A grab bag', blurb: 'A knotted pillowcase. Something’s in it. Sal won’t say what. It goes on your bench.' },
];
export const GRAB_ODDS = { inert: 40, enchanted: 30, cursed: 30 };

// The noodle cart: every night but Monday, 10 PM to 3 AM, at one of a few corners.
export const NOODLES = { from: 22 * 60, to: 27 * 60, price: 3, stress: -10 };
export const noodlesOut = (weekday, minute) => weekday !== 0 && minute >= NOODLES.from && minute < NOODLES.to;
export const noodleSpot = (day, n) => ((day * 7 + 3) % n + n) % n;

// ---------- people out late ----------
// Who you might meet and where (a kind of spot, as for sights), by weekday. moon: 'full'
// only on a full moon.
export const NIGHT_PEOPLE = [
  { name: 'Stuart', where: 'bridge', days: [2, 3], from: 23 * 60, to: 27 * 60 },
  { name: 'Kristen', where: 'diner', days: [4], from: 22 * 60, to: 26 * 60 },
  { name: 'Ryan', where: 'square', days: [5], from: 22 * 60, to: 24 * 60 },
  { name: 'Pablo', where: 'noodles', days: [1, 3], from: 22 * 60, to: 26 * 60 },
  { name: 'Dex', where: 'harbor', moon: 'full', from: 22 * 60, to: 25 * 60 },
  { name: 'Morgan', where: 'harbor', moon: 'full', from: 22 * 60, to: 25 * 60 },
  { name: 'Jackson', where: 'bus', days: [0, 6], from: 23 * 60, to: 27 * 60 },
  { name: 'Jade', where: 'square', days: [6], from: 22 * 60, to: 25 * 60 },
];
export function nightPeople(weekday, minute, moonId) {
  return NIGHT_PEOPLE.filter(p => (!p.days || p.days.includes(weekday)) && (!p.moon || p.moon === moonId) && minute >= p.from && minute < p.to);
}
// What they say when you find them out late (their usual conversation, with this hello).
export const NIGHT_HELLO = {
  Stuart: ['Ah. You found the bridge too. Good place to think. Bad place to stand still.', 'Shh. Listen. The river talks more at night.', 'I’m waiting for someone. She might come. She might not. I brought a watch.'],
  Kristen: ['Couldn’t sleep either? Pie helps. Pie and bad coffee.', 'Night shift habits. Body still thinks it’s on watch.', 'Sit for a minute. Breathe. Then go home, okay?'],
  Ryan: ['Practicing. Tricks look different by streetlight. Better. Spookier.', 'Pick a card. No, really, I need the practice.', 'Erin thinks I’m asleep. I’m a very convincing pillow.'],
  Pablo: ['Midnight noodles! The best meal of the day is the one you shouldn’t be eating.', 'This guy makes broth like my abuela. I’d marry him, but he’s married to the cart.', 'Eat. You look like you’ve been walking in the dark. You have, haven’t you?'],
  Dex: ['Full moon. Morgan says you can see the craters. I see a moon.', 'She drags me out here every full moon. I pretend I don’t like it.', 'Pull up a bit of wall.'],
  Morgan: ['Look at it! You can see the Sea of Tranquility! Dex, are you looking?', 'Did you know the harbor tide is highest on a full moon? I wrote a whole chapter on it.', 'Hi! Moon party. Very exclusive. You’re invited.'],
  Jackson: ['I’m waiting for the bus that doesn’t exist. For science.', 'Did you see it? No? It’s fine. Science is mostly waiting.', 'Theory: the 3:13 is early for the 3:14. Write that down.'],
  Jade: ['The square’s so quiet at night. Listen. You can hear the fountain think.', 'I come here to practice singing where nobody can hear me. Hi, nobody.', 'Walk me to the corner? It’s more fun with two.'],
};

// ---------- what the dark does when it finds you ----------
// rand: () => [0, 1). Returns { text, stress, cash } (cash: taken, as a positive number).
export function darkFinds(cash, rand) {
  if (rand() < 0.5 && cash > 0) {
    const took = Math.min(60, Math.max(1, Math.round(cash * 0.12)));
    return { text: `Something brushes past you in the dark. You never see it. Your pocket is ${took > 1 ? 'lighter' : 'a dollar lighter'}.`, stress: 8, cash: took };
  }
  return { text: 'A hand on your shoulder in the dark. You turn. Nobody. The hand was cold, and it’s still there, a little.', stress: 16, cash: 0 };
}
