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
// In their own voices (Phase 30): what each friend says when you pass out and lose a day.
const FRIEND_LINES = {
  Kristen: {
    worried: 'Kristen was frantic. “A whole day, shipmate! I checked your pulse in my head the entire shift. Sleep. That’s an order.”',
    annoyed: 'Kristen is annoyed. “I run a tight ship. You went down like an anchor and left me short. Rest, then report in.”',
    unaware: 'Kristen was on a double and never noticed you were gone.',
  },
  Ryan: {
    worried: 'Ryan, for once, had no jokes. “Don’t do that again. I mean it. I couldn’t find a single card trick for it.”',
    annoyed: 'Ryan is annoyed. “You vanished for a day without telling me the trick. That’s rude, even for a magician.”',
    unaware: 'Ryan didn’t notice. He thought it was a very long weekend.',
  },
  Erin: {
    worried: 'Erin was frantic. “Honey, you scared me half to death. Please, please sleep.”',
    annoyed: 'Erin is annoyed. “I made you a plate and you didn’t come. I worry, you know. It makes me cranky.”',
    unaware: 'Erin was run off her feet and didn’t notice you were gone.',
  },
  Stuart: {
    worried: 'Stuart was waiting outside before you woke. “The dark nearly kept you. Please do not feed it again.”',
    annoyed: 'Stuart is annoyed. “A day, wasted. The night is patient, and you are not. Mind it.”',
    unaware: 'Stuart didn’t notice. Days are loose things to Stuart.',
  },
  Pablo: {
    worried: 'Pablo was frantic. “You don’t eat, you don’t sleep, you fall over! Eat this. Then sleep. Then eat again.”',
    annoyed: 'Pablo is annoyed. “I held your order a whole day. It went cold. Don’t make me waste a burrito.”',
    unaware: 'Pablo was slammed and didn’t notice you were gone.',
  },
  Dex: {
    worried: 'Dex was frantic. “I almost called somebody. Please sleep, okay? I can’t carry you and the groceries.”',
    annoyed: 'Dex is annoyed. “You went dark for a whole day. I had a whole speech ready, and nobody to give it to.”',
    unaware: 'Dex didn’t notice. He’d been up for two days himself.',
  },
  Morgan: {
    worried: 'Morgan was frantic. “I HAD A FEELING. I told Dex. A whole day! Promise me you’ll sleep.”',
    annoyed: 'Morgan is annoyed. “I felt a disturbance, and you were just asleep on a sidewalk? Unacceptable.”',
    unaware: 'Morgan didn’t notice. Her feelings were busy elsewhere.',
  },
  Jade: {
    worried: 'Jade was frantic. “I made you a little card! It says please sleep! It has a frog on it!”',
    annoyed: 'Jade is annoyed. “I saved you a seat and everything. A WHOLE day. Humph.”',
    unaware: 'Jade didn’t notice. Jade was humming and lost track of the days.',
  },
  Kip: {
    worried: 'Kip was frantic. “Whole day, gone. Water takes folks that way too. Sleep, kid. Please.”',
    annoyed: 'Kip is annoyed. “Left the shop unlocked waiting on you. Bait doesn’t wait, y’know.”',
    unaware: 'Kip didn’t notice. The tide doesn’t keep a calendar and neither does he.',
  },
  Mike: {
    worried: 'Mike was frantic, in his way. “Told you to mind the bell. Rest, or I’ll dig you a spot myself.”',
    annoyed: 'Mike is annoyed. “A day lost? In my line of work, we don’t get those back.”',
    unaware: 'Mike didn’t notice. The graves keep their own hours.',
  },
  Jackson: {
    worried: 'Jackson was frantic. “Dude. A whole day. I rode past your window forty times. Please sleep.”',
    annoyed: 'Jackson is annoyed. “I came by to hang out and you were gone. You owe me, like, a whole day.”',
    unaware: 'Jackson didn’t notice. He’d lost track of the days following the bus.',
  },
};

// people: [{ name, hearts }], the ones the player has a relationship with. Returns the closest few,
// each with a tier and a line.
export function collapseReactions(people, rng, max = 3) {
  return people.filter(p => p.hearts > 0).sort((a, b) => b.hearts - a.hearts || a.name.localeCompare(b.name)).slice(0, max)
    .map(p => { const tier = reactionTier(p.hearts, rng.next()); return { name: p.name, tier, line: FRIEND_LINES[p.name]?.[tier] ?? LINES[tier](p.name) }; });
}
