// What tiredness does (Phase 30), the rules only. The clock (game/daycycle.js) says how many nights
// in a row were skipped; this says what that costs. Pure: no DOM, no storage.

// A tired player walks slower: after a cut-short sleep, and after a skipped night.
export const SLOW = 0.8;

// First skipped night: mistakes in the shop. About one sale in four is rung up wrong, and the
// buyer pays 10-30% less. Returns { amount, slipped }.
export const FUMBLE_CHANCE = 0.25;
export function fumbleAmount(amount, rng, chance = FUMBLE_CHANCE) {
  if (amount < 2 || !rng.chance(chance)) return { amount, slipped: 0 };
  const slipped = Math.max(1, Math.round(amount * (0.1 + rng.next() * 0.2)));
  return { amount: amount - slipped, slipped };
}

// A missed day (the third skipped night): half a heart with everyone you have a relationship with.
// The game keeps ten points to a heart.
export const MISSED_DAY_POINTS = 5;
export const afterMissedDay = rel => (rel > 0 ? Math.max(0, rel - MISSED_DAY_POINTS) : rel);

// How a friend takes it when you pass out and miss a day: the closer they are, the more worried.
//   worried: close friends; annoyed: some; didn't notice: the rest, and more often the less they know you.
export function reactionTier(hearts, roll) {
  const worried = Math.min(0.95, hearts / 6);
  if (roll < worried) return 'worried';
  if (roll < worried + 0.45) return 'annoyed';
  return 'unaware';
}
const LINES = {
  worried: n => `${n} was frantic. “You scared me half to death. Please, please sleep.”`,
  annoyed: n => `${n} is annoyed. “A whole day, gone. I was counting on you.”`,
  unaware: n => `${n} didn’t even notice you were gone.`,
};
// people: [{ name, hearts }], the ones the player has a relationship with. Returns the closest few,
// each with a tier and a line.
export function collapseReactions(people, rng, max = 3) {
  return people.filter(p => p.hearts > 0).sort((a, b) => b.hearts - a.hearts || a.name.localeCompare(b.name)).slice(0, max)
    .map(p => { const tier = reactionTier(p.hearts, rng.next()); return { name: p.name, tier, line: LINES[tier](p.name) }; });
}
