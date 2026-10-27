// Gull Point after dark (v2.5). The same beach, but the sea is awake:
//  - The tide rises through the night, from the wet sand at ten up the beach toward the
//    umbrellas by four. Standing in it, the water pulls at you (nerve) and the dark notices
//    you faster. It also brings things in: flotsam along the tide line, for your bench.
//  - Bioluminescent jellies light the shallows; glass-eyed gulls on the boardwalk rail watch
//    you (being near them is like standing in the dark); a voice in the water sings your
//    name when you get close to the tide line.
//  - Crabs come up out of the surf after your bait; tide hounds come out of the water when
//    the dark has found you.
//  - Sights: the drowned lantern-bearer at the end of the pier (Kip's wife, three nights),
//    and now and then, far out, a ship with its lanterns lit and nobody at the wheel.
// Pure.

export const TIDE = { from: 26, to: 21, start: 22 * 60, end: 28 * 60 };
// The first row the water reaches at this minute (higher on the screen as the night goes on).
export function tideRow(minute) {
  const k = Math.max(0, Math.min(1, (minute - TIDE.start) / (TIDE.end - TIDE.start)));
  return Math.round(TIDE.from - (TIDE.from - TIDE.to) * k);
}
export const inTide = (ty, minute) => ty >= tideRow(minute);
export const TIDE_STRESS = 2.5;   // nerve a second, standing in it

// Flotsam: a couple of things washed up each night, on the tide line.
export const FLOTSAM = { perNight: 3, odds: { inert: 45, enchanted: 35, cursed: 20 } };
// The gulls on the boardwalk rail, by column (row 10, the rail's edge).
export const GULLS = [6, 19, 33, 47, 55];
export const GULL_ROW = 10;

// The lantern-bearer: Kip's wife, Mae, still looking for him (three nights; Wednesday to Saturday,
// after midnight). The ghost ship: rare, after two, any night.
export const BEACH_SIGHTS = {
  lantern: { name: 'A lantern on the pier', steps: 3, days: [2, 3, 4, 5], from: 24 * 60, to: 27 * 60 + 30, at: { tx: 44, ty: 30 } },
  ship: { name: 'A ship, far out', chance: 0.18, from: 26 * 60, to: 27 * 60 + 50, at: { tx: 22, ty: 31 } },
};

export const BEACH_TALK = {
  lantern: {
    name: 'The lantern-bearer',
    start: c => `s${Math.min(2, c.nc.step)}`,
    nodes: {
      s0: { say: ['At the end of the pier, a woman in oilskins holds up a lantern. The light doesn’t reach the planks under her feet.', '“Have you seen my husband? He’ll be worried. He worries.”'],
        choices: [{ text: '“Who’s your husband?”', effects: { run: c => c.nc.advance() }, next: 's0b' }, { text: 'Back away.', tone: 'quiet', effects: { stress: 4 } }] },
      s0b: { say: ['“He runs the bait shop. Quiet man. Gray mustache, though he’s too young for it.”', 'A wave breaks over the end of the pier, and when the spray clears she’s gone. The lantern light goes last.'] },
      s1: { say: ['The woman with the lantern. “The water talks after dark. I only came out to listen.”', '“Tell him that. He thinks I went out to be brave. I wasn’t. I was curious.”'],
        choices: [{ text: '“I’ll tell him.”', effects: { run: c => c.nc.advance() } }] },
      s2: { say: ['She’s waiting for you. She holds out the lantern. It’s warm, and it’s been lit for twenty years.', '“Give it to him. Tell him to stop waiting at the end of the pier on Sundays. Tell him I said the fish are biting somewhere else now.”'],
        choices: [{ text: 'Take the lantern.', effects: { run: c => [...c.nc.advance(), 'You have Mae’s lantern. Kip should have it.'], flag: { maeLantern: true } }, next: 's2b' }] },
      s2b: { say: ['She smiles. Then she isn’t there, and the end of the pier is just the end of the pier.'] },
    },
  },
  ship: {
    name: 'A ship, far out',
    start: 's0',
    nodes: {
      s0: { say: ['Far out past the breakwater: a sailing ship, three masts, every lantern lit. There’s no wind, and it’s moving.', 'Figures line the rail. All of them are facing the shore. All of them are facing you.'],
        choices: [{ text: 'Raise a hand.', effects: { stress: 6, run: c => c.nc.bench({ inert: 20, enchanted: 50, cursed: 30 }, 1) }, next: 's1' }, { text: 'Look away.', tone: 'quiet', effects: { stress: 2 } }] },
      s1: { say: ['Every figure on the rail raises a hand back. Then the lanterns go out all at once.', 'In the morning something will have washed up for you. You find it now, at your feet, still wet: a bottle with something heavy inside.'] },
    },
  },
};
