// Ryan, The Mystic Magician (Phase 26): a street act outside the Brass Lantern. $5 a
// trick, three tricks to choose from, and every win has a 1% chance of turning into a
// $1,000 payout. He does a few shows a day; each one takes a quarter of an hour.
// Pure rules (no DOM); ui/magic-panels.js draws the tricks. State in world.magic.

export const PRICE = 5;
export const SHOWS_PER_DAY = 5;
export const SHOW_HOURS = 0.25;
export const JACKPOT = 1000, JACKPOT_CHANCE = 0.01;

export const TRICKS = {
  monte: {
    name: 'Find the Lady', icon: 'card',
    blurb: 'Three cards, one queen. Keep your eye on her while he shuffles, then point.',
    pays: 'Win $12',
  },
  hilo: {
    name: 'Higher or Lower', icon: 'deck',
    blurb: 'He turns a card. Call the next one higher or lower. Every right call raises the pot; walk away whenever you like.',
    pays: '$7, $12, $20, then $35',
  },
  crystal: {
    name: 'The Crystal Ball', icon: 'ball',
    blurb: 'He thinks of a number from 1 to 30. You get four guesses, and the ball tells you higher or lower.',
    pays: '$40 first guess, $20, $12, $8',
  },
};
export const TRICK_ORDER = ['monte', 'hilo', 'crystal'];

export const MONTE_PRIZE = 12;
export const HILO_LADDER = [7, 12, 20, 35];
export const CRYSTAL_MAX = 30, CRYSTAL_GUESSES = 4, CRYSTAL_PRIZES = [40, 20, 12, 8];

export function magicState(world, day) {
  if (world.magic?.day !== day) world.magic = { day, shows: 0, won: world.magic?.won ?? 0, jackpots: world.magic?.jackpots ?? 0 };
  return world.magic;
}
export const showsLeft = (world, day) => Math.max(0, SHOWS_PER_DAY - magicState(world, day).shows);

// Why you can't watch a trick right now, or null.
export function showBlocker(world, st, hoursLeft = Infinity) {
  if (!showsLeft(world, st.day)) return 'That’s all the shows for today.';
  if (st.cash < PRICE) return `Needs $${PRICE}`;
  if (hoursLeft < SHOW_HOURS) return 'No time left today';
  return null;
}
// Pay for a trick. Returns an error string or null.
export function payForShow(world, st, hoursLeft) {
  const why = showBlocker(world, st, hoursLeft);
  if (why) return why;
  st.cash -= PRICE;
  magicState(world, st.day).shows += 1;
  return null;
}

// A win: the prize, or (1% of the time) the jackpot. rand(): [0, 1). chance: his lucky
// coin (ten hearts with him) doubles it.
export function payout(world, st, prize, rand = Math.random, chance = JACKPOT_CHANCE) {
  const jackpot = prize > 0 && rand() < chance;
  const amount = jackpot ? JACKPOT : prize;
  st.cash += amount;
  const m = magicState(world, st.day);
  m.won += amount; if (jackpot) m.jackpots += 1;
  return { amount, jackpot };
}

// ---------- Find the Lady ----------
// The queen starts in `start`; the shuffle is a list of swaps of positions [a, b].
export function monteShuffle(rand = Math.random, swaps = 7) {
  const start = Math.floor(rand() * 3), list = [];
  for (let i = 0; i < swaps; i++) { const a = Math.floor(rand() * 3); let b = Math.floor(rand() * 2); if (b >= a) b += 1; list.push([a, b]); }
  return { start, swaps: list };
}
export function monteWhere({ start, swaps }) {
  let q = start;
  for (const [a, b] of swaps) { if (q === a) q = b; else if (q === b) q = a; }
  return q;
}

// ---------- Higher or Lower ----------
// Cards are 1 (ace) to 13 (king), drawn with replacement; a tie is no call: draw again.
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['♠', '♥', '♦', '♣'];
export const drawCard = (rand = Math.random, not = null) => {
  for (;;) { const c = { v: 1 + Math.floor(rand() * 13), s: Math.floor(rand() * 4) }; if (!not || c.v !== not.v) return c; }
};
// Was the call right? next is never a tie (drawCard(rand, cur)).
export const hiloRight = (cur, next, call) => (call === 'higher' ? next.v > cur.v : next.v < cur.v);
export const hiloPot = streak => (streak <= 0 ? 0 : HILO_LADDER[Math.min(streak, HILO_LADDER.length) - 1]);

// ---------- The Crystal Ball ----------
export const crystalNumber = (rand = Math.random) => 1 + Math.floor(rand() * CRYSTAL_MAX);
export const crystalPrize = guessNo => CRYSTAL_PRIZES[guessNo - 1] ?? 0;
export const crystalHint = (n, guess) => (guess === n ? 'yes' : guess < n ? 'higher' : 'lower');

// What he says before a trick, a few to rotate through.
export const PATTER = [
  'Step right up! Nothing up my sleeves. Well. Nothing you’ll find.',
  'Five dollars to see the impossible. Ten if you want to see it twice.',
  'The hand is quicker than the eye. Mine is quicker than both.',
  'Every trick is honest. It’s the cards that lie.',
  'You run the pawn shop! You of all people know: everything has a price, and a story.',
];
export const WIN_LINES = ['Well, well. A natural.', 'You’ve got the eye. Don’t tell anyone.', 'Bravo! Take it, before I change my mind.'];
export const LOSE_LINES = ['Ah, so close. The lady is shy.', 'The cards had other plans.', 'Magic! Or just bad luck. Hard to say.'];
export const JACKPOT_LINE = 'The card bursts into sparks, and when they clear there’s a thousand-dollar bill in your hand. Ryan looks as surprised as you are.';
