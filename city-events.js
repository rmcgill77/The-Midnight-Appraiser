// Random things that happen in the city (Phase 22). On an errand day, at the top of each
// hour there's a chance something turns up near you: a wallet on the sidewalk, a street
// musician, a sidewalk sale, an Office man with questions, a stray cat, a newspaper
// blowing down the street, or a pickpocket. (The rain is the weather now: game/weather.js,
// which also decides what's likely: no buskers in a storm, pickpockets in the fog.) One at a time, a few a day, the same
// ones for the same day and hour (rolled from the save's seed), so reloading doesn't
// reroll them. Most are a short conversation with choices (game/talk.js); the pickpocket
// is a chase, and the rain just changes the street.
//
// The state lives in world.cityEvents: { day, rolled: [hours], count, active }.

import { S } from '../rules/index.js';
import { pickToday } from './talk.js';

export const MAX_PER_DAY = 4;
export const CHANCE = 0.55;          // each hour, if nothing's going on
export const PICKPOCKET_GRACE = 12;  // seconds to catch them

const you = text => ({ who: 'you', text });
const hasCash = n => c => c.st.cash >= n;

// The events. weight(st, wx): how likely (0 = can't happen now; wx is today's weather).
// kind: what's on the street. minutes: how long it stays if you leave it be.
const wet = wx => wx === 'rain' || wx === 'storm' || wx === 'snow';
export const EVENTS = {
  wallet: { kind: 'item', art: 'wallet', minutes: 120, weight: () => 1, label: 'Pick up' },
  busker: { kind: 'npc', name: 'Street musician', minutes: 120, weight: (st, wx) => (wet(wx) ? 0 : wx === 'clear' ? 1.8 : 1.2), label: 'Listen', bubble: 'music' },
  sale: { kind: 'npc', name: 'Sidewalk vendor', minutes: 150, weight: (st, wx) => (wx === 'storm' ? 0 : wet(wx) ? 0.4 : 1), label: 'Browse' },
  patrol: { kind: 'npc', name: 'Office man', minutes: 90, weight: st => (st.heat >= 30 ? 1.2 : 0), label: 'Talk', approach: true },
  cat: { kind: 'cat', name: 'Stray cat', minutes: 180, weight: (st, wx) => (wx === 'storm' ? 0 : 0.9), label: 'Pet' },
  paper: { kind: 'item', art: 'paper', minutes: 60, weight: (st, wx) => (wx === 'storm' || wx === 'fog' ? 1.4 : 0.8), label: 'Read' },
  pickpocket: { kind: 'thief', name: 'Pickpocket', minutes: 1, weight: (st, wx) => (st.cash >= 40 ? 0.7 * (wx === 'fog' ? 2.5 : 1) : 0) },
};

// A seeded number in [0, 1) for this save, day, hour and purpose.
export function roll(seed, day, hour, salt = 0) {
  let h = (seed ^ Math.imul(day, 0x9e3779b1) ^ Math.imul(hour + 7, 0x85ebca6b) ^ Math.imul(salt + 13, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function eventsState(world, day) {
  if (world.cityEvents?.day !== day) world.cityEvents = { day, rolled: [], count: 0, active: null };
  return world.cityEvents;
}

// Whether something new turns up this hour, and what. Returns an event id or null.
// Marks the hour as rolled either way.
export function rollHour(st, world, hour, wx = 'overcast') {
  const ev = eventsState(world, st.day);
  if (ev.rolled.includes(hour)) return null;
  ev.rolled.push(hour);
  if (ev.active || ev.count >= MAX_PER_DAY) return null;
  if (roll(st.seed ?? 0, st.day, hour, 1) >= CHANCE) return null;
  const pool = Object.entries(EVENTS).map(([id, e]) => [id, e.weight(st, wx)]).filter(([, w]) => w > 0);
  // Not the same thing twice in a day.
  const seen = new Set(ev.seen ?? []);
  const fresh = pool.filter(([id]) => !seen.has(id));
  const list = fresh.length ? fresh : pool;
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = roll(st.seed ?? 0, st.day, hour, 2) * total;
  for (const [id, w] of list) { if ((r -= w) <= 0) return id; }
  return list[list.length - 1]?.[0] ?? null;
}

export function startEvent(world, day, id, at, minute) {
  const ev = eventsState(world, day);
  ev.count += 1;
  ev.seen = [...(ev.seen ?? []), id];
  ev.active = { id, ...at, until: minute + EVENTS[id].minutes };
  return ev.active;
}
export function endEvent(world, day) { const ev = eventsState(world, day); ev.active = null; }

// ---------- what they say ----------
// The newspaper's page: a creature, the same one all day.
function paperSpecies(c) {
  const list = S.DATA.species.filter(s => (c.st.bestiary?.[s.id]?.research ?? 0) < 100);
  return list.length ? list[(c.day * 3 + 1) % list.length] : null;
}
const firstSentence = t => (String(t || '').match(/^.*?[.!?](\s|$)/)?.[0] ?? String(t || '')).trim();

export const EVENT_CONVOS = {
  wallet: {
    name: 'A wallet',
    start: () => 'found',
    nodes: {
      found: {
        say: [you('A wallet on the sidewalk. Thirty dollars and a library card. Wendell Ames, it says.')],
        choices: [
          { text: 'Pocket the cash.', tone: 'cold', effects: { cash: 30, heat: 2 }, next: 'kept' },
          { text: 'Hand it in at the Office.', effects: { rep: { office: 2 } }, next: 'returned' },
          { text: 'Leave it where it is.', tone: 'quiet' },
        ],
      },
      kept: { say: [you('Thirty dollars. Somebody across the street was watching. Probably nobody important.')] },
      returned: { say: [you('You’ll drop it with the Office on the way. Somebody there will know a Wendell.')] },
    },
  },
  busker: {
    name: 'Street musician',
    start: () => 'play',
    nodes: {
      play: {
        say: c => [pickToday(['Evening. Morning. Whatever it is. This one’s about a girl from Harbor Row.', 'You look like you need a slow one. Here’s a slow one.', 'Requests are a dollar. Silence is free, but nobody ever asks for it.'], c)],
        choices: [
          { text: 'Drop $2 in the case.', note: c => (c.st.stress > 0 ? 'steadies your nerve' : null), if: hasCash(2), effects: { cash: -2, stress: -8 }, next: 'tip' },
          { text: 'Just listen a minute.', note: '15 min', effects: { stress: -3, hours: 0.25 }, next: 'listen' },
          { text: 'Keep walking.', tone: 'quiet' },
        ],
      },
      tip: { say: ['Thank you kindly. This next one’s for you.'] },
      listen: { say: [you('The saxophone goes somewhere low and stays there. For a minute the street is very far away.')] },
    },
  },
  sale: {
    name: 'Sidewalk vendor',
    start: () => 'pitch',
    nodes: {
      pitch: {
        say: ['Everything must go! Batteries, salt, a lamp that might be haunted. The batteries are good, though.'],
        choices: [
          { text: 'Batteries.', note: '$8 · a flashlight cell', if: hasCash(8), effects: { cash: -8, kit: { cell: 1 } }, next: 'sold' },
          { text: 'A bag of salt.', note: '$5 · two bags', if: hasCash(5), effects: { cash: -5, supplies: { salt: 2 } }, next: 'sold' },
          { text: 'The haunted lamp?', next: 'lamp' },
          { text: 'No thanks.', tone: 'quiet' },
        ],
      },
      sold: { say: ['Pleasure. No refunds, no receipts, no questions.'] },
      lamp: { say: ['Ha! Kidding. It’s just a lamp. Probably. It does turn itself on.'] },
    },
  },
  patrol: {
    name: 'Office man',
    start: () => 'stop',
    nodes: {
      stop: {
        say: ['Office of Anomalous Property. Routine questions. You run the pawn shop on Old Market, don’t you?'],
        choices: [
          { text: 'Yes. How can I help?', note: '30 min', effects: { heat: -3, hours: 0.5 }, next: 'polite' },
          { text: 'Clerk Dunmore can vouch for me.', if: c => (c.world.people?.['Clerk Dunmore']?.rel ?? 0) >= 10, effects: { heat: -5 }, next: 'vouched' },
          { text: 'I’m in a hurry.', tone: 'cold', effects: { heat: 4 }, next: 'rude' },
        ],
      },
      polite: { say: ['Just checking in. Keep your back case clean and we’ll get along fine.'] },
      vouched: { say: ['Dunmore? Hm. He doesn’t vouch for anybody. All right. Have a good day.'] },
      rude: { say: ['Of course. We’ll be in touch.'] },
    },
  },
  cat: {
    name: 'Stray cat',
    start: c => (c.today('fed') ? 'again' : 'meet'),
    nodes: {
      meet: {
        say: ['Mrrp.'],
        choices: [
          { text: 'Pet the cat.', effects: { stress: -4 }, next: 'pet' },
          { text: 'Share some of your lunch.', effects: { stress: -6, flag: { fed: 'today' } }, next: 'fed' },
          { text: 'Shoo.', tone: 'cold', next: 'shoo' },
        ],
      },
      pet: { say: ['Prrrrrr.'] },
      fed: { say: ['…', 'Mrrp! (It’s decided you’re its person now. For today, anyway.)'] },
      again: { say: ['Mrrp. (It headbutts your shin.)'], effects: { stress: -2 } },
      shoo: { say: ['…', '(It looks at you like you’ve said something unforgivable, then strolls away.)'] },
    },
  },
  paper: {
    name: 'A newspaper',
    start: () => 'read',
    nodes: {
      read: {
        effects: c => { const s = paperSpecies(c); return s ? { research: { species: s.id, n: 6 } } : {}; },
        say: c => {
          const s = paperSpecies(c);
          return [you('Yesterday’s Ledger, blowing down the street. You catch it.'),
            you(s ? `Page six, between the obituaries and the bridge column: “${firstSentence(s.lore)}” Someone circled it in pencil.` : 'Nothing in it you don’t already know. The crossword’s been done, badly.')];
        },
      },
    },
  },
};

// The pickpocket: how much they take, and the line when you catch them (or don't).
export const pickpocketTakes = st => Math.min(st.cash, Math.max(10, Math.round(st.cash * 0.12)));
