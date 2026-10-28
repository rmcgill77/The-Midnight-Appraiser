// What happens when you walk up to something at night (v2.4): one conversation per sight in
// game/night-city.js SIGHTS. They're ordinary conversations (game/talk.js), with a few extra
// things on the context, from main.js:
//   c.nc.step      how far along this mystery is (0 the first time)
//   c.nc.advance() moves the mystery on a step (returns notices)
//   c.nc.bench(odds, n)  things for your bench; c.nc.time: the time, as said aloud
//   c.nc.flag(k)   a lasting flag (the watch Stuart gave you, ...); c.nc.jolt(n): the dark notices
//   c.nc.befriend(name, n, note): someone you know hears about it
// A sight leaves when the conversation ends, whatever you chose.

const run = fn => ({ run: c => fn(c) });

export const NIGHT_TALK = {
  // ---------- the Lamplighter (four nights) ----------
  lamplighter: {
    name: 'The Lamplighter',
    start: c => `s${Math.min(3, c.nc.step)}`,
    nodes: {
      s0: { say: ['A man in a long coat and a wide hat holds a brass pole up to a streetlight. It’s already lit. He lights it anyway.', 'The light goes a shade warmer. He doesn’t look at you.'],
        choices: [{ text: 'Who are you?', effects: run(c => c.nc.advance()), next: 's0b' }, { text: 'Leave him to it.', tone: 'quiet' }] },
      s0b: { say: ['He touches the brim of his hat and walks into the dark between two lamps.', 'He doesn’t come out the other side.'] },
      s1: { say: ['The man in the long coat again, at another lamp. This time he speaks.', '“Every light in this city was lit by hand, once. Somebody has to remember how.”'],
        choices: [{ text: 'Remember what?', effects: run(c => c.nc.advance()), next: 's1b' }, { text: 'Say nothing.', tone: 'quiet', effects: run(c => c.nc.advance()) }] },
      s1b: { say: ['“That the dark was here first. The lamps are a promise. Promises want keeping.”', 'He moves on to the next lamp, and the next.'] },
      s2: { say: ['He holds the brass pole out to you. “Your turn.”'],
        choices: [{ text: 'Light the lamp.', effects: { ...run(c => c.nc.advance()), stress: -6 }, next: 's2b' }, { text: '“I don’t know how.”', next: 's2c' }] },
      s2b: { say: ['You raise the pole. The lamp catches with a soft cough and burns blue for a moment before it settles.', 'When you turn round, the pole is gone from your hands, and so is he.'] },
      s2c: { say: ['“Nobody does, the first time.” He waits. You don’t take it. He nods, and goes.'] },
      s3: { say: ['He’s waiting under the lamp outside your shop. It’s dark. It’s been dark since you moved in.', '“Your mother lit this one. Every night, for twenty years. Then nobody did.”'],
        choices: [{ text: '“Show me.”', effects: { ...run(c => c.nc.advance()), flag: { lamplighter: true } }, next: 's3b' }] },
      s3b: { say: ['He puts the pole in your hands and closes your fingers round it. The lamp over your door catches and burns gold.', 'When you look up, he’s gone. The lamps on every street you walk will burn a little brighter now. You’re sure of it.'] },
    },
  },

  // ---------- the 3:13 (three nights) ----------
  bus313: {
    name: 'The 3:13',
    start: c => `s${Math.min(2, c.nc.step)}`,
    nodes: {
      s0: { say: ['A bus pulls up to the stop at exactly 3:13. No route number. The windows are fogged from inside.', 'The doors fold open. The driver doesn’t turn around.'],
        choices: [{ text: 'Step back.', tone: 'quiet', effects: run(c => c.nc.advance()), next: 's0b' }] },
      s0b: { say: ['The doors close. It pulls away without a sound and turns a corner that isn’t there.'] },
      s1: { say: ['The 3:13 again. The windows have cleared a little. There are passengers.', 'You know some of the faces. You’ve seen them on posters taped to lampposts. MISSING. HAVE YOU SEEN.'],
        choices: [{ text: 'Look closer.', effects: { ...run(c => c.nc.advance()), stress: 6 }, next: 's1b' }, { text: 'Look away.', tone: 'quiet', effects: run(c => c.nc.advance()) }] },
      s1b: { say: ['A girl in the back seat lifts her hand to the glass. She isn’t frightened. She looks like she’s going home.'] },
      s2: { say: ['The 3:13. The doors open. The driver turns his head, just a little.', '“Last stop’s yours,” he says. “If you want it.”'],
        choices: [{ text: 'Get on.', effects: { ...run(c => [...c.nc.advance(), ...c.nc.bench({ inert: 20, enchanted: 45, cursed: 35 }, 2)]), stress: 12, flag: { rodeBus: true } }, next: 's2b' }, { text: 'Not tonight.', tone: 'quiet' }] },
      s2b: { say: ['You ride through streets you’ve never seen, past a lit window where a family is eating dinner at three in the morning.', 'The passengers get off one by one, each at a dark stop, each one smiling.', 'Then the doors open on your own front step. On the seat beside you: a bag of things nobody came back for. The bus is gone.'] },
    },
  },

  // ---------- the woman on the bridge (three nights; Stuart knows her) ----------
  della: {
    name: 'The woman on the bridge',
    start: c => `s${Math.min(2, c.nc.step)}`,
    nodes: {
      s0: { say: ['A woman stands at the rail, soaked through, though it hasn’t rained. Her hair is pinned the way people wore it fifty years ago.', '“Excuse me. What time is it?”'],
        choices: [{ text: c => `“It’s ${c.nc.time}.”`, effects: run(c => c.nc.advance()), next: 's0b' }, { text: '“It’s late.”', tone: 'cold', effects: { stress: 6 }, next: 's0c' }] },
      s0b: { say: ['“Thank you.” She looks down the river. “He’s only a little late, then.”', 'The fog moves. She isn’t there. The rail is wet where her hands were.'] },
      s0c: { say: ['Her face crumples. “Late. Yes. It’s always late.”', 'A gust of cold off the river, and she’s gone. You feel you said the wrong thing.'] },
      s1: { say: ['The woman on the bridge. “Excuse me. What time is it?”', 'You tell her. She smiles a little this time. “My name’s Della. He said he’d meet me here at one. He works the boats.”'],
        choices: [{ text: '“Who are you waiting for?”', effects: run(c => c.nc.advance()), next: 's1b' }] },
      s1b: { say: ['“Tommy. He’s getting me a ring. He doesn’t think I know.”', '“If you see a boy with a stopped watch, tell him I waited.” Then the fog, and she’s gone.'] },
      s2: { say: c => ['Della, at the rail. “Excuse me. What time is it?”', ...(c.nc.flag('stygWatch') ? ['You take out Stuart’s watch, his brother’s watch, and hold it up for her to read.', 'She goes very still. “That’s Tommy’s watch.” She touches the glass. “It’s going again.”'] : [`You tell her: ${c.nc.time}.`, '“Then he isn’t coming. He was never coming, was he.”'])],
        choices: [{ text: c => (c.nc.flag('stygWatch') ? '“He didn’t forget you.”' : '“I’m sorry.”'), effects: { run: c => [...c.nc.advance(), ...c.nc.bench({ inert: 0, enchanted: 100, cursed: 0 }, 1), ...(c.nc.flag('stygWatch') ? c.nc.befriend('Stuart', 10, 'Stuart will want to hear about this.') : [])], stress: -10 }, next: 's2b' }] },
      s2b: { say: c => [c.nc.flag('stygWatch') ? '“Tell his brother I said thank you.” She takes a ring from her finger and puts it in your palm. It’s warm.' : 'She takes a ring from her finger and puts it in your palm. “Sell it to someone who’ll be on time.”', 'The fog closes over the bridge. When it clears, there’s nobody at the rail, and the river is quiet.'] },
    },
  },

  // ---------- one-offs ----------
  dryers: { name: 'Spinning dryers', start: 's0', nodes: {
    s0: { say: ['Through the window of a shut laundromat: every dryer turning, lit from inside. Nobody there.', 'On the bench by the door, a single sock, folded neatly. It’s warm.'],
      choices: [{ text: 'Take the sock.', effects: { research: { species: 'sockling', n: 6 }, stress: 3 }, next: 's1' }, { text: 'Leave it.', tone: 'quiet' }] },
    s1: { say: ['The dryers stop all at once. In the quiet, something inside them sighs.'] },
  } },
  stray: { name: 'A stray', start: 's0', nodes: {
    s0: { say: ['Two round lights at knee height in an alley. Headlights, small and yellow. They blink.', 'Something low and long-bodied watches you from behind them. Its engine ticks as it cools.'],
      choices: [{ text: 'Hold still.', effects: { research: { species: 'hound', n: 8 } }, next: 's1' }, { text: 'Back away slowly.', tone: 'quiet', effects: { stress: 2 } }] },
    s1: { say: ['It decides you aren’t worth it. The lights dip, and it trots off into the dark toward the parking garage.'] },
  } },
  singer: { name: 'A voice by the fountain', start: 's0', nodes: {
    s0: { say: ['Someone is singing on the square. An old song, the kind your grandmother would know. You can’t see the singer.', 'It’s hard to feel afraid while it lasts.'],
      choices: [{ text: 'Sit and listen.', effects: { stress: -12 }, next: 's1' }, { text: 'Walk on.', tone: 'quiet' }] },
    s1: { say: ['The song ends. The fountain splashes. You feel steadier than you have all week.'] },
  } },
  watcher: { name: 'Someone on the corner', start: 's0', nodes: {
    s0: { say: ['A figure on the corner, just past the light. Hat, coat, hands in pockets. It hasn’t moved since you saw it.'],
      choices: [{ text: '“Can I help you?”', effects: c => ({ stress: 6, run: () => c.nc.jolt(30) }), next: 's1' }, { text: 'Cross the street.', tone: 'quiet' }] },
    s1: { say: ['It turns its head toward you. There’s no face, just more of the dark.', 'Then the streetlight flickers, and the corner is empty. You feel it watching from somewhere else now.'] },
  } },
  wallet: { name: 'A wallet', start: 's0', nodes: {
    s0: { say: ['A brown leather wallet on the sidewalk. Twenty dollars inside, and a library card. The name’s worn off.'],
      choices: [{ text: 'Keep the cash.', effects: { cash: 20 }, next: 's1' }, { text: 'Leave it at the diner counter.', tone: 'quiet', effects: { stress: -4 }, next: 's2' }] },
    s1: { say: ['Twenty dollars. Nobody saw. Somewhere a dog barks, once.'] },
    s2: { say: ['The waitress at the Owl takes it and puts it by the register. “Somebody’ll come for it,” she says. “Somebody always does.”'] },
  } },
};
