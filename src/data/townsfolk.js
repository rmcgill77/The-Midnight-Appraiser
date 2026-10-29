// The people this game adds to town (Phase 20, 21), beyond the original's shopkeepers.
//
// Custom townsfolk are people made for this game (the first is Morgan, drawn from a
// tester's own avatar). Each can have a job: a place id (an original location or one of
// this game's own) where they're found while it's open. With no job, or when their place
// is shut, they hang around the Brass Lantern, where most of the town ends up sooner or later.

export const CUSTOM_NPCS = [
  { id: 'Morgan', name: 'Morgan', title: 'The Nerdy Librarian', job: 'library', spouse: 'Dex',
    blurb: 'Runs the circulation desk at the Kessler University Library. Knows every rumor in town and has a book about most of them.' },
  // Phase 24: testers with no job yet. They're regulars at the Lantern until they get one.
  { id: 'Dex', name: 'Dex', title: 'Lantern regular', job: null, spouse: 'Morgan', blurb: 'Tall, unhurried, married to Morgan. Saves her a seat at the Lantern every night.' },
  { id: 'Pablo', name: 'Pablo', title: 'Lantern regular', job: null, blurb: 'Knows the best cheap food in every district and will tell you about all of it.' },
  { id: 'Jackson', name: 'Jackson', title: 'Lantern regular', job: null, blurb: 'Has a theory about everything. Some of them are even right.' },
  { id: 'Stuart', name: 'Stuart', title: 'Lantern regular', job: null, blurb: 'Dresses for a funeral, laughs at the wrong moments, reads the obituaries for fun.' },
  { id: 'Jade', name: 'Jade', title: 'Lantern regular', job: null, blurb: 'Friendly to everybody, and somehow already knows your name.' },
  // Phase 28: Erin has a job now: interior designer, at her own shop in Westside.
  { id: 'Erin', name: 'Erin', title: 'Interior Designer', job: 'brush', spouse: 'Ryan', blurb: 'Runs Erin’s Wandering Brush. Married to Ryan. Kind, sharp, and the one everybody goes to for advice, about rooms and everything else.' },
  // Phase 26: a street act. 'street' is his stand on the sidewalk outside the Lantern; on a wet
  // day (or whenever it's not open) he takes the act inside.
  { id: 'Ryan', name: 'Ryan', title: 'The Mystic Magician', job: 'street', spouse: 'Erin', blurb: 'Does card tricks outside the Brass Lantern for $5 a go. Married to Erin, who still can’t work out the coin trick. Sometimes the tricks pay you.' },
  // Phase 29: a Navy hospital corpsman. Mostly at the Lantern with a coffee or a beer; some days
  // she's out walking the town instead, and now and then she drops by your shop.
  { id: 'Kristen', name: 'Kristen', title: 'Navy Corpsman', job: null, wander: 0.3, visits: 0.3, blurb: 'A Navy hospital corpsman on shore leave that never seems to end. Coffee before five, a beer after, and a steady hand either way.' },
  // v2.4: the fisherman. His job is the Bait & Tackle shack on the beach boardwalk (Sundays
  // he's out on the end of the pier). He's never at the Lantern, in the park or out walking.
  { id: 'Kip', name: 'Kip', title: 'Bait & Tackle', job: 'tackle', visits: 0, blurb: 'Runs the Bait & Tackle shack on the Gull Point boardwalk. Says little, knows every fish in the harbor, and won’t tell you where they are until he likes you.' },
  // v2.5: the gravekeeper at St. Brigid's. Always in the churchyard, by his shed.
  { id: 'Mike', name: 'Mike', title: 'The Gravekeeper', job: 'cemetery', visits: 0, blurb: 'Keeps the churchyard behind St. Brigid’s. Knows every grave and who’s in it. Gruff, dry, and kinder than he lets on.' },
];
// Phase 29: how often the others are out walking instead of at the Lantern, and how often
// anyone drops into your shop as a customer while it's open (per person, per shop day).
export const WANDER_CHANCE = 0.12, VISIT_CHANCE = 0.12, MAX_FRIEND_VISITS = 2;
export const spouseOf = name => CUSTOM_NPCS.find(n => n.name === name)?.spouse ?? CUSTOM_NPCS.find(n => n.spouse === name)?.name ?? null;
// Phase 30: the day is long now, so people move about it. `part` is the part of the day (0 morning,
// 1 afternoon, 2 evening, 3 night); part 0 keeps the old once-a-day rolls.
const atPart = (day, part) => (part ? day * 8 + part : day);
const pick = (name, day, seed, salt, part = 0) => dayHash(`${name}:${salt}`, atPart(day, part), seed);
// Out walking the streets today (only people without a job wander: the rest are at work).
export const outWalking = (npc, day, seed = 0, part = 0) => !npc.job && pick(npc.name, day, seed, 'walk', part) < (npc.wander ?? WANDER_CHANCE);
export const streetWalkers = (day, seed = 0, part = 0) => CUSTOM_NPCS.filter(n => outWalking(n, day, seed, part));
// v2.2: Lantern Park on a fine day. Townsfolk without a job sometimes spend it there
// instead of the Lantern (and never if they're out walking). On someone's birthday, they and a
// few friends (their spouse among them) have a little party in the park.
export const PARK_CHANCE = 0.25;
export function parkPeople(day, seed = 0, birthdayOn = () => false, part = 0) {
  const free = CUSTOM_NPCS.filter(n => !n.job && !outWalking(n, day, seed, part));
  const party = free.find(n => birthdayOn(n.name)) ?? null;
  const names = new Set(free.filter(n => pick(n.name, day, seed, 'park', part) < PARK_CHANCE).map(n => n.name));
  const guests = [];
  if (party) {
    guests.push(party.name);
    const sp = spouseOf(party.name);
    if (sp) guests.push(sp);
    free.filter(n => n !== party && n.name !== sp).sort((a, b) => pick(a.name, day, seed, 'party') - pick(b.name, day, seed, 'party')).slice(0, 2).forEach(n => guests.push(n.name));
    guests.forEach(n => names.add(n));
  }
  // A couple comes together, if both are free.
  for (const n of [...names]) { const sp = spouseOf(n); if (sp && free.some(f => f.name === sp)) names.add(sp); }
  return { names: [...names], party: party?.name ?? null, guests };
}

// v2.3: who spends the day at the beach. Like the park, but never someone already in the
// park; mostly in summer, a few hardy souls in spring and autumn, nobody in winter.
export const BEACH_CHANCE = { summer: 0.3, spring: 0.12, autumn: 0.1, winter: 0 };
export function beachPeople(day, seed = 0, season = 'summer', inPark = [], part = 0) {
  const busy = new Set(inPark);
  const free = CUSTOM_NPCS.filter(n => !n.job && !outWalking(n, day, seed, part) && !busy.has(n.name));
  const names = new Set(free.filter(n => pick(n.name, day, seed, 'beach', part) < (BEACH_CHANCE[season] ?? 0)).map(n => n.name));
  for (const n of [...names]) { const sp = spouseOf(n); if (sp && free.some(f => f.name === sp)) names.add(sp); }
  return { names: [...names] };
}

// Who drops by the shop today (in this order), at most MAX_FRIEND_VISITS visits of them. A
// married couple comes in together (one visit, two people, side by side in the list).
// boost(name): a multiplier on someone's chance (Phase 30: closer friends come more often).
export function shopVisitors(day, seed = 0, boost = () => 1) {
  const names = CUSTOM_NPCS.filter(n => pick(n.name, day, seed, 'visit') < (n.visits ?? VISIT_CHANCE) * boost(n.name))
    .sort((a, b) => pick(a.name, day, seed, 'order') - pick(b.name, day, seed, 'order')).map(n => n.name);
  const out = [];
  let visits = 0;
  for (const name of names) {
    if (out.includes(name) || visits >= MAX_FRIEND_VISITS) continue;
    out.push(name); visits++;
    const sp = spouseOf(name);
    if (sp && !out.includes(sp)) out.push(sp);
  }
  return out;
}
// The couples: [[a, b], ...], each pair once.
export const COUPLES = [...new Set(CUSTOM_NPCS.filter(n => spouseOf(n.name)).map(n => [n.name, spouseOf(n.name)].sort().join('|')))].map(k => k.split('|'));

// Who works where in this game's own places (they're always in when you are).
export const STAFF = {
  Lou: { place: 'bar', title: 'Barkeep' },
  Dot: { place: 'diner', title: 'The Owl’s waitress' },
  Teddy: { place: 'bijou', title: 'Usher and projectionist' },
  Rose: { place: 'thrift', title: 'Owner, Second Hand Rose' },
  Abernathy: { place: 'chapel', title: 'Sexton of St. Brigid’s' },
};
export const BARKEEP = { id: 'Lou', name: 'Lou' };

// Phase 22: where the shopkeepers spend a day off, by preference. Most days off they're
// at one of these; now and then they just wander the street instead. Phase 24: the
// Brass Lantern is where the town gathers, so it's everybody's first choice: about half
// of anyone's days off are spent there, the rest at their other haunts.
export const DAY_OFF = {
  'Mrs. Kowalski': ['bar', 'chapel', 'diner'],
  'Ray Delgado': ['bar', 'diner'],
  'Ms. Achterberg': ['bar', 'bijou', 'chapel'],
  'Clerk Dunmore': ['bar', 'diner'],
  'Professor Okoye': ['bar', 'bijou', 'library'],
  'Mr. Pryce': ['bar', 'bijou'],
  'Captain Rourke': ['bar', 'diner'],
  'Tarp Sal': ['bar', 'thrift', 'diner'],
};
export const STREET_CHANCE = 0.2;
export const HUB_SHARE = 0.55;   // of the days off not spent on the street
const dayHash = (name, day, seed) => { let h = (seed ^ Math.imul(day, 2654435761)) >>> 0; for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619) >>> 0; h ^= h >>> 15; return (Math.imul(h, 0x2c1b3c6d) >>> 0) / 4294967296; };
// Where a keeper spends today off: a place id, or null for the street. isOpen(placeId) can
// rule a place out (the library's shut on Sundays). The same all day.
export function dayOffSpot(name, day, seed = 0, isOpen = () => true, part = 0) {
  const prefs = (DAY_OFF[name] ?? []).filter(p => isOpen(p));
  if (!prefs.length) return null;
  const r = dayHash(name, atPart(day, part), seed);
  if (r < STREET_CHANCE) return null;
  const u = (r - STREET_CHANCE) / (1 - STREET_CHANCE);
  if (prefs[0] === 'bar') {
    if (u < HUB_SHARE || prefs.length === 1) return 'bar';
    const rest = prefs.slice(1);
    return rest[Math.floor((u - HUB_SHARE) / (1 - HUB_SHARE) * rest.length) % rest.length];
  }
  return prefs[Math.floor(u * prefs.length) % prefs.length];
}

// A short title under someone's name in the dialog box.
export function titleOf(name) {
  return CUSTOM_NPCS.find(n => n.name === name)?.title ?? STAFF[name]?.title ?? null;
}

// Where someone is to be found: at their job while it's open, otherwise the bar.
// isOpen(placeId) says whether a place is open right now.
export const hangoutOf = (npc, isOpen = () => true) => (npc.job && isOpen(npc.job) ? npc.job : 'bar');
// out: names to leave out (Phase 29: whoever's out walking the streets today).
export const regularsAt = (place, isOpen = () => true, out = new Set()) => CUSTOM_NPCS.filter(n => !out.has(n.name) && hangoutOf(n, isOpen) === place);
export const barRegulars = (isOpen = () => true) => regularsAt('bar', isOpen);
