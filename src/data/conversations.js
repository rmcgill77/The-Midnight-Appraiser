// Who says what (Phase 20). Conversations with choices, for the regulars at the
// Brass Lantern and the shopkeepers in town. See game/talk.js for how a conversation is
// put together. Choices are short (they're buttons); lines stay under two sentences
// where they can, so they read easily in the dialog box.

import { pickToday } from '../game/talk.js';
import { S } from '../rules/index.js';

const hasCash = n => c => c.st.cash >= n;

// ---------- Morgan ----------
// The first custom townsperson: a regular at the bar, cheerful, nosy, collects rumors and
// believes most of them. Her rumors are about real things out there, and each one is
// worth a little research the first time you hear it.

export const BRIT_RUMORS = [
  { id: 'washer14', species: 'wraith', text: 'I heard the laundromat is spooky at night! Machine 14 runs all by itself, and nobody’s even got quarters.' },
  { id: 'socks', species: 'sockling', text: 'Somebody at Suds lost every left sock they own. Every. Left. Sock. That’s not a dryer, that’s a hobby.' },
  { id: 'changer', species: 'changer', text: 'The change machine at the laundromat gives back more than you put in. Then it follows you to the door.' },
  { id: 'choir', species: 'choir', text: 'My cousin swears there’s singing in the Line 9 tunnels after midnight. A whole choir. Underground. Why??' },
  { id: 'tickets', species: 'conductor', text: 'The last train doesn’t stop at Line 9 anymore. Somebody down there still punches tickets, though.' },
  { id: 'headlights', species: 'hound', text: 'Don’t park on B4. My friend did, and her headlights came on by themselves. While she was in the movie!' },
  { id: 'valet', species: 'valet', text: 'There’s a valet down in the B4 garage who takes your keys. The garage doesn’t have valets.' },
  { id: 'xray', species: 'negative', text: 'St. Agnes closed the old wing, but the X-ray light still comes on at 3 a.m. Who’s getting X-rayed?!' },
  { id: 'visitors', species: 'visitor', text: 'Visiting hours at St. Agnes are over. Forever. And somebody still signs the visitors’ book.' },
];
const BRIT_GOSSIP = [
  'Mrs. Kowalski sells salt by the pound. Nobody needs that much salt. Unless they do.',
  'The Night Market only sets up on certain nights. Bring cash. Don’t bring questions.',
  'Lou says the piano plays itself after closing. Lou also says he’s forty, so.',
  'Somebody keeps leaving salt lines on the doorstep here. Lou sweeps them up, then puts them back.',
];
export const RUMOR_RESEARCH = 12;

// Today's rumor: the same one all day, and a new one (that you haven't heard) next time.
export function britRumor(c) {
  const f = c.p.flags;
  if (f.rumorPick?.day === c.day) return f.rumorPick.rumor;
  const fresh = BRIT_RUMORS.filter(r => !f[`heard:${r.id}`]);
  const rumor = fresh.length ? fresh[(c.day + (c.p.talks ?? 0)) % fresh.length] : { id: null, text: BRIT_GOSSIP[c.day % BRIT_GOSSIP.length] };
  f.rumorPick = { day: c.day, rumor };
  return rumor;
}

// Something to look up for you (Phase 21, Morgan at the library): the creature you've met
// that you know least about, the same one all day.
export function britLookup(c) {
  const f = c.p.flags;
  if (f.lookupPick?.day === c.day) return f.lookupPick.species ? S.byId(S.DATA.species, f.lookupPick.species) : null;
  const seen = S.DATA.species.filter(s => c.st.bestiary?.[s.id]?.seen && c.st.bestiary[s.id].research < 100)
    .sort((a, b) => c.st.bestiary[a.id].research - c.st.bestiary[b.id].research);
  f.lookupPick = { day: c.day, species: seen[0]?.id ?? null };
  return seen[0] ?? null;
}
export const LOOKUP_RESEARCH = 8;
const firstSentence = t => (String(t || '').match(/^.*?[.!?](\s|$)/)?.[0] ?? String(t || '')).trim();

const atBar = c => c.place === 'bar';
const britHello = c => {
  if (c.flag('intro') === 'cold' && !c.at('acquaintance')) return 'Oh. Hi, Detective.';
  if (atBar(c)) return pickToday(['Library’s shut, so I’m off duty. Mostly. I brought a book.', 'Oh, hey! Pull up a stool. I’m between chapters.', c.here?.includes('Dex') ? 'Dex saved me a seat. He always saves me a seat.' : 'Have you seen Dex? Tall, shaggy, probably holding my drink.'], c);
  if (c.at('close')) return pickToday([`${c.player ?? 'You'}! My favorite patron in the whole university.`, 'There you are. I saved you the good chair. The one that doesn’t squeak.', 'Finally! I’ve been saving up gossip AND footnotes.'], c);
  if (c.at('friend')) return pickToday(['Hey, you! I pulled some books for you. Okay, for me. But you can look.', 'Oh good, it’s you. I found something weird in the archive.', 'Shh! …Kidding. Hi!'], c);
  if (c.at('acquaintance')) return pickToday(['Hi! Need anything looked up?', 'Oh, hi! How’s the creepy basement?', 'Welcome back to the stacks.'], c);
  return pickToday(['Oh, hey. It’s you again. Library card? Kidding.', 'Hi! Quietly, though.'], c);
};

// Morgan, the Nerdy Librarian: runs the circulation desk at the Kessler University Library
// (and spends her evenings off at the Brass Lantern). She collects rumors and has a book
// about most of them. Her rumors are about real things out there, worth a little research
// the first time you hear them; at her desk she'll look up a creature you've met.
export const BRIT = {
  name: 'Morgan',
  start: c => (!c.p.met ? 'intro' : c.p.rel < 0 && !c.flag('madeUp') ? 'cold' : 'hello'),
  nodes: {
    intro: {
      say: c => [atBar(c) ? 'Oh! Hi! Sorry, I was people-watching. I’m Morgan. I work at the university library, but it’s shut, so here I am.' : 'Oh! Hi! Welcome to the Kessler Library. I’m Morgan. Do you have a card? Never mind, nobody has a card.',
        'Wait, you’re the one who opened Second Sight back up. The pawn shop with the creepy basement!'],
      choices: [
        { text: 'That’s me. Nice to meet you, Morgan.', effects: { met: true, rel: 4, flag: { intro: 'warm' } }, next: 'introWarm' },
        { text: 'Creepy? It’s a perfectly normal basement.', effects: { met: true, rel: 3, flag: { intro: 'joke' } }, next: 'introJoke' },
        { text: 'Who’s asking?', tone: 'cold', effects: { met: true, rel: -3, flag: { intro: 'cold' } }, next: 'introCold' },
      ],
    },
    introWarm: { say: ['Nice to meet YOU. Everybody in town has a theory about that place.', 'Mine’s the best one. It has citations.'], after: 'introEnd' },
    introJoke: { say: ['Ha! That’s exactly what someone with a creepy basement would say.', 'I like you already.'], after: 'introEnd' },
    introCold: { say: ['Okay, Detective. Morgan’s asking. Morgan, from the library.', '…You’ll warm up. Everybody does.'], after: 'introEnd' },
    introEnd: { say: ['I’m at the circulation desk most days. If you ever need something looked up, I’m your librarian.', 'Strange things are my specialty. We have a whole shelf. I made the shelf.'] },

    cold: {
      say: c => [c.flag('intro') === 'cold' ? 'Oh. It’s the Detective.' : 'Oh. Hi.'],
      choices: [
        { text: 'Sorry I was short with you before.', effects: { rel: 6, flag: { madeUp: true } }, next: 'madeUp' },
        { text: 'Just passing through.' },
      ],
    },
    madeUp: { say: ['…Okay. Apology accepted. I don’t hold grudges. They’re heavy, like encyclopedias.', 'So! Have I got a rumor for you.'], after: 'hello' },

    hello: {
      say: c => [britHello(c)],
      choices: [
        { text: 'Can you help me look something up?', if: c => !atBar(c) && !c.today('lookup'), effects: c => {
          const s = britLookup(c);
          return s ? { flag: { lookup: 'today' }, rel: 1, research: { species: s.id, n: LOOKUP_RESEARCH + (c.at('friend') ? 4 : 0) } } : { flag: { lookup: 'today' } };
        }, next: c => (britLookup(c) ? 'lookup' : 'lookupNone') },
        { text: 'Heard anything strange lately?', if: c => !c.today('rumor'), effects: c => {
          const r = britRumor(c);
          const fresh = r.id && !c.flag(`heard:${r.id}`);
          return { flag: { rumor: 'today', ...(r.id ? { [`heard:${r.id}`]: true } : {}) }, ...(fresh ? { research: { species: r.species, n: RUMOR_RESEARCH } } : {}) };
        }, next: 'rumor' },
        { text: 'How are you doing?', if: c => !c.today('chat'), effects: { flag: { chat: 'today' }, rel: 2 }, next: 'chat' },
        { text: 'Can I buy you a drink?', note: '$6', if: c => atBar(c) && !c.today('drink') && hasCash(6)(c), effects: { flag: { drink: 'today' }, cash: -6, rel: 4 }, next: 'drink' },
        { text: 'You look like you want to tell me something.', if: c => c.at('friend') && !c.flag('charm'), next: 'charm' },
        { text: 'Is that bookmark still humming?', if: c => c.at('close') && c.flag('charm') === 'kept', effects: { flag: { charm: true }, kit: { ward: 1 } }, next: 'charmAgain' },
        { text: 'Ever think about going out there yourself?', if: c => c.at('close') && !c.flag('nightOut'), next: 'nightOut' },
        { text: 'See you around.', tone: 'quiet' },
      ],
    },

    lookup: {
      say: c => { const s = britLookup(c); return [`${s.name}? We have three books on that, and one of them is even shelved right.`, `Here: “${firstSentence(s.lore)}” I put a sticky note on the good part.`]; },
    },
    lookupNone: { say: ['Look what up, though? Bring me a name. I can’t search the catalog for “spooky thing in the dark.”', 'Well. I can. It’s a long list.'] },

    rumor: {
      say: c => [britRumor(c).text],
      choices: [
        { text: 'Thanks. That’s actually useful.', effects: { rel: 1 }, next: 'rumorThanks' },
        { text: 'You believe all that?', next: 'rumorBelieve' },
        { text: 'Be careful. That’s how people get hurt.', if: c => !c.flag('worried'), effects: { flag: { worried: true }, rel: 1 }, next: 'rumorWorried' },
      ],
    },
    rumorThanks: { say: c => [c.flag('worried') ? 'Useful AND careful. Look at me.' : 'Useful! Write that down. Morgan: useful. I’ll make a card for it.'] },
    rumorBelieve: { say: ['Believe it? I want to SEE it. From a very safe distance. Through binoculars. With a field guide.'] },
    rumorWorried: { say: ['Aw. Okay, okay. I’ll stick to reading about it, not checking it out.', 'You’re sweet. Weird, but sweet.'] },

    chat: {
      say: c => {
        if (c.flag('worried') && c.day % 3 === 0) return ['Still haven’t gone anywhere near the laundromat, by the way. I just read about it. Aggressively.'];
        const lines = [
          'Great! Somebody returned a book from 1987. The late fee is now worth more than the building.',
          'I reorganized the cryptid section. It was under Folklore. It’s now under Current Events.',
          'I’m reading three books at once. One of them is about reading three books at once.',
          'Professor Okoye asked for a book on haunted radios. We have two. He wrote one of them.',
          'Ms. Achterberg let me into Special Collections. I touched a 400-year-old map. I need to lie down.',
        ];
        if (c.at('friend')) lines.push('Can I tell you a secret? I’ve never actually been scared. I just like knowing things nobody else knows.', 'Honestly, the best part of my day is when you come in. Don’t tell the books.');
        return [pickToday(lines, c, 3)];
      },
      choices: [
        { text: 'Ha. Never change.', effects: { rel: 1 } },
        { text: 'Same, more or less.' },
      ],
    },
    drink: {
      say: c => [c.at('friend') ? 'You’re buying? Lou! The fancy cherry, please. Two cherries.' : 'You’re buying? Lou! The fancy cherry, please.',
        c.at('close') ? 'To you. And to Second Sight, and its very normal basement.' : 'To Second Sight. May its basement stay exactly as creepy as it is.'],
    },

    charm: {
      say: ['Okay, don’t laugh. Somebody returned a book with this in it as a bookmark.', 'It hums when you hold it up to the window at night. I don’t want it. I think you should have it.'],
      choices: [
        { text: 'Thank you, Morgan. Really.', effects: { flag: { charm: true }, kit: { ward: 1 }, rel: 3 }, next: 'charmYes' },
        { text: 'Keep it. It’s yours.', effects: { flag: { charm: 'kept' }, rel: 2 }, next: 'charmNo' },
      ],
    },
    charmYes: { say: ['It’s a ward, I think? I looked it up. Three sources agree. One says it’s a bottle cap.'] },
    charmNo: { say: ['Okay. But if it starts humming louder, I’m bringing it straight to you.'] },
    charmAgain: { say: ['Louder every night. It hums in the returns bin now. Take it. Please. I’m begging.'] },

    nightOut: {
      say: ['Out there? At night? I’d be reading the field guide while something ate me.', '…Okay, no. But I can help a little.'],
      choices: [
        { text: 'Help how?', effects: { flag: { nightOut: true }, kit: { cell: 2 }, rel: 2 }, next: 'nightOutGift' },
        { text: 'Don’t worry about me.', effects: { flag: { nightOut: 'declined' } }, next: 'nightOutNo' },
      ],
    },
    nightOutGift: { say: ['The A/V closet has a box of batteries nobody’s counted since 1990. Take these. Keep your light on, okay?'] },
    nightOutNo: { say: ['Too late. I worry about everything. It’s my best quality. I have a book about it.'] },
  },
};

// ---------- Lou, behind the bar ----------

export const LOU = {
  name: 'Lou',
  start: c => (!c.p.met ? 'meet' : 'hello'),
  nodes: {
    meet: {
      effects: { met: true },
      say: ['Lou. I pour, you drink, nobody bleeds on the floor. Simple.', 'You’re the Second Sight kid. Your folks drank coffee here. Black. Every morning.'],
      choices: [
        { text: 'Coffee, then. Black.', note: '$3', if: hasCash(3), effects: { cash: -3, stress: -12, flag: { coffee: 'today' }, rel: 2 }, next: 'coffee' },
        { text: 'Nice to meet you, Lou.', effects: { rel: 2 } },
      ],
    },
    hello: {
      say: c => [pickToday(['What’ll it be?', 'Back again.', 'The Lantern’s open. Always is.'], c)],
      choices: [
        { text: 'Coffee, black.', note: c => (c.st.stress > 0 ? '$3 · steadies your nerve' : '$3'), if: c => !c.today('coffee') && hasCash(3)(c), effects: { cash: -3, stress: -12, flag: { coffee: 'today' }, rel: 1 }, next: 'coffee' },
        { text: 'A beer.', note: c => (c.st.stress > 0 ? '$4 · steadies your nerve' : '$4'), if: c => !c.today('beer') && hasCash(4)(c), effects: { cash: -4, stress: -15, flag: { beer: 'today' }, rel: 1 }, next: 'beer' },
        { text: 'What’s the word on the street?', if: c => !c.today('word'), effects: { flag: { word: 'today' } }, next: 'word' },
        { text: 'Who’s the regular?', if: c => !c.world.people?.Morgan?.met && c.here?.includes('Morgan'), next: 'aboutBrit' },
        { text: 'Who are all these people?', if: c => !c.today('crowd') && TESTER_NAMES.some(n => c.here?.includes(n)), effects: { flag: { crowd: 'today' } }, next: 'crowd' },
        { text: 'Just looking around.', tone: 'quiet' },
      ],
    },
    coffee: { say: c => [pickToday(['Here. Same mug your father used. Chipped on the left.', 'Black. Hot. Don’t thank me, tip me.', 'Fresh pot. Well. Fresh this morning.'], c)] },
    // Phase 29: beer on tap (Kristen's doing).
    beer: { say: c => [pickToday(['On tap since last month. Kristen wore me down. One, then go home.', 'Cold one. Your dad never drank here. Your mom did. Don’t tell him I told you.', 'There. Coaster. Use the coaster.'], c)] },
    word: {
      say: c => {
        if (c.st.heat >= 60) return ['Two men in Office grey sat right where you are. Asked about a pawn shop.', 'I said I don’t know any pawn shops. Keep your head down.'];
        if (c.st.heat >= 35) return ['Your name came up. Nothing bad yet. Keep it that way.'];
        return [pickToday([
          'Delgado’s lift is broken again. Don’t let him tell you it isn’t.',
          'Somebody keeps leaving salt lines on my doorstep. I sweep them up. Then I put them back. Just in case.',
          'The Night Market moves around. Ask Sal, if you can find Sal.',
          'Professor from the Relay was in. Drank tonic water and wrote down what the ice was saying.',
        ], c, 1)];
      },
    },
    crowd: { say: ['The regulars. Everybody in this town ends up at the Lantern sooner or later. Some of them just never leave.', 'Dex is Morgan’s husband, the tall one. Pablo knows food, Jackson knows everything, Stuart knows the obituaries. Jade keeps the rest of them honest. Erin used to, before she opened her design shop.', 'The one in uniform is Kristen. Navy medic. Coffee till five, beer after. If you fall off a stool, she’s the one you want.'] },
    aboutBrit: { say: ['That’s Morgan. Runs the desk at the university library. When it’s shut, she’s in here.', 'Knows every rumor in town and has a book about half of them. Go say hi, she doesn’t bite.'] },
  },
};

// ---------- the shopkeepers ----------
// Each keeper: how they meet you, small talk, one thing they've noticed (a lead on
// something out there), and, once they know you, a small favor that pays off.

export const KEEPER_TALK = {
  'Mrs. Kowalski': {
    meet: 'Your mother’s child. You have her chin. Don’t let anybody sell you cheap salt.',
    chat: ['Busy. Everyone’s buying deadbolts this month. Nobody says why.', 'Slow. Rain keeps people home, and home is where the trouble is.', 'Fine, dear. My knees aren’t, but the register is.'],
    rumor: { text: 'Somebody bought every bag of rock salt I had. Paid in quarters. Wet quarters. Laundromat quarters, I’d bet.', species: 'changer' },
    favor: { ask: 'My nephew left a crate of rock salt in the back. Take it off my hands before he tries to sell it twice?', yes: 'Happy to.', give: { supplies: { salt: 3 } }, thanks: 'Good. Now he can’t.' },
  },
  'Ray Delgado': {
    meet: 'The pawn kid. If you ever want to sell that ride, I’m your guy. If you want to keep it, also me.',
    chat: ['Three flats and a Buick that screams. Literally. Fan belt. Probably.', 'Good. Parts came in. Wrong parts, but parts.', 'Slow. Gives me time to fix my own van, which hasn’t run since spring.'],
    rumor: { text: 'Towed a car out of B4 last week. Engine was stone cold. Exhaust still pouring out of it.', species: 'exhaust' },
    favor: { ask: 'Got a box of scrap I can’t sell. You’ve got a basement full of weird. Take it?', yes: 'I’ll take it.', give: { supplies: { scrap: 3 } }, thanks: 'Pleasure doing no business.' },
  },
  'Ms. Achterberg': {
    meet: 'Your mother returned every book on time. Your father did not. We’ll see which one you take after.',
    chat: ['Quiet, which is how I like it. Someone sneezed on Tuesday. I’m still upset.', 'We’re cataloguing the donated estate papers. Half are recipes, half are curses. Same handwriting.', 'Busy. Exam week. The students are more frightening than anything in Special Collections.'],
    rumor: { text: 'There’s a map in Special Collections of the tunnels under Old Market. Someone drew a door on it in pencil. It wasn’t there yesterday.', species: 'keeper' },
    favor: { ask: 'The conservation lab is throwing out old reagents. Properly labeled. Mostly. Would you dispose of them… usefully?', yes: 'I’ll put them to use.', give: { supplies: { vials: 3 } }, thanks: 'Don’t tell me what you use them for.' },
  },
  'Clerk Dunmore': {
    meet: 'Dunmore. Office of Anomalous Property. I’m not here in an official capacity. I’m never here in an official capacity.',
    chat: ['Forms. Forms about forms. A form about a chair that screams. Normal week.', 'My supervisor wants a list of every haunted object in the city. I said, “Alphabetical?”', 'Fine. The coffee in the Office is cursed, though. Literally. It’s on file.'],
    rumor: { text: 'Off the record: the Office keeps a number on every shop. Yours too. Keep it low and they forget your address.', heat: true },
    favor: { ask: 'There’s a complaint on my desk about a certain pawn shop. Complaints get misfiled. Paperwork is slippery.', yes: 'I didn’t hear any of that.', give: { heat: -8 }, thanks: 'Hear what?' },
  },
  'Professor Okoye': {
    meet: 'Ah, the appraiser. Measurement is a kind of respect, you know. Most people never learn that.',
    chat: ['Splendid. The Relay picked up a station that went off the air in 1961. It’s playing the weather.', 'Tired. I spent the night listening to a radiator. It had a great deal to say.', 'Very well. My students think I’m eccentric. My equipment agrees with me, which is what matters.'],
    rumor: { text: 'The Line 9 tunnels sing in a minor key. I recorded it. Now the recording sings back.', species: 'choir' },
    favor: { ask: 'Would you hold this tuning fork while I listen? Thirty seconds. Don’t drop it. Don’t hum.', yes: 'I won’t hum.', give: { rep: { techmage: 3 } }, thanks: 'Perfect. You have very quiet hands. The Circle will hear about it.' },
  },
  'Mr. Pryce': {
    meet: 'Pryce. Halberd & Vane. We should talk business sometime. Not today.',
    chat: ['Business is excellent. It always is, officially.', 'The tower’s elevators have opinions this week. We’ve hired a consultant.', 'I don’t make small talk. I make acquisitions. But since you asked: fine.'],
    rumor: { text: 'The firm has an interest in a certain hospital wing. The orderly on the night shift has never once been on anyone’s payroll.', species: 'orderly' },
    favor: { ask: 'Sign this. It says you saw nothing in particular, on no night in particular. You did see nothing, didn’t you?', yes: 'I saw nothing.', no: 'I’ll pass.', give: { rep: { corporate: 3 } }, thanks: 'Excellent. Halberd & Vane remembers its friends.' },
  },
  'Captain Rourke': {
    meet: 'Rourke. Engine 9. We put out fires. The other kind too.',
    chat: ['Quiet shift. I don’t trust quiet shifts.', 'Two calls last night. One was a fire. The other one was also a fire, but it was cold.', 'Good. The new kid finally stopped saluting the hydrants.'],
    rumor: { text: 'Something in the subway is eating rats bigger than my boot. Then wearing them.', species: 'ratking' },
    favor: { ask: 'We got a crate of spare lantern cells. More than the crew can use. Want a couple?', yes: 'I could use them.', give: { kit: { cell: 2 } }, thanks: 'Keep your light on out there.' },
  },
  'Tarp Sal': {
    meet: 'Sal. Tarps, tables, things under tables. Don’t touch what’s under the tables.',
    chat: ['Business is business. Today it’s mostly umbrellas. Don’t ask why.', 'Moved the stall twice this week. Something didn’t like where it was.', 'Slow. People are scared of the dark lately. Good for flashlights, bad for me.'],
    rumor: { text: 'Coats. Coats walking around under Old Market, no people in them. Don’t buy a coat from me after dark.', species: 'coats' },
    favor: { ask: 'Hold this bag. Don’t open it. …Okay, you can open it. Keep what’s in it.', yes: 'Sure, I’ll hold it.', give: { supplies: { essence: 1 } }, thanks: 'You didn’t see me. I didn’t see you.' },
  },
};

// What a keeper says when you find them somewhere on their day off.
const OFF_DUTY = ['My day off. Don’t tell anyone where I spend it.', 'Off the clock. Sit, if you want. Don’t talk shop.', 'Even I get a day off. This is where I spend it.'];

// A keeper's conversation. On the street (their place shut), it opens with why they're
// out; in their place, with a hello that knows how well they know you.
export function keeperConvo(name) {
  const k = KEEPER_TALK[name];
  if (!k) return null;
  const common = [
    { text: 'How’s business?', if: c => !c.today('chat'), effects: { met: true, flag: { chat: 'today' }, rel: 2 }, next: 'chat' },
    { text: 'Seen anything odd lately?', if: c => !c.flag('rumor'), effects: { met: true, flag: { rumor: true }, rel: 1, ...(k.rumor.species ? { research: { species: k.rumor.species, n: 10 } } : {}) }, next: 'rumor' },
    { text: 'Need a hand with anything?', if: c => c.at('acquaintance') && !c.flag('favor'), next: 'favor' },
    { text: 'I should get going.', tone: 'quiet', effects: { met: true } },
  ];
  return {
    name,
    start: c => (c.street ? 'street' : !c.p.met ? 'meet' : 'hello'),
    nodes: {
      street: { say: c => [{ who: 'you', text: c.street.ask }, c.street.line, ...(!c.p.met ? [k.meet] : [])], effects: { met: true }, choices: common },
      meet: { say: [k.meet], effects: { met: true, rel: 2 }, choices: common },
      hello: {
        say: c => [c.place && c.place !== c.workPlace ? pickToday(OFF_DUTY, c, 5) : c.at('friend') ? pickToday([`${c.player ?? 'There you are'}. Good to see you.`, 'Ah. My favorite customer.', 'Come in, come in.'], c) : c.at('acquaintance') ? pickToday(['Back again.', 'Hello again.', 'What can I do for you?'], c) : pickToday(['Help you?', 'Yes?'], c)],
        choices: common,
      },
      chat: { say: c => [pickToday(k.chat, c, 2)] },
      rumor: { say: [k.rumor.text] },
      favor: {
        say: [k.favor.ask],
        choices: [
          { text: k.favor.yes, effects: { flag: { favor: true }, rel: 5, ...k.favor.give }, next: 'favorDone' },
          { text: k.favor.no ?? 'Not today.', tone: 'quiet', effects: k.favor.no ? { flag: { favor: 'refused' }, rel: -2 } : {} },
        ],
      },
      favorDone: { say: [k.favor.thanks] },
    },
  };
}

// ---------- Phase 21: the people behind the new counters ----------

// A favor once they know you: they ask, you say yes (or not today), it pays off once.
const favor = (ask, yes, give, thanks) => ({
  favor: { say: [ask], choices: [{ text: yes, effects: { flag: { favor: true }, rel: 5, ...give }, next: 'favorDone' }, { text: 'Not today.', tone: 'quiet' }] },
  favorDone: { say: [thanks] },
});
const favorChoice = { text: 'Need a hand with anything?', if: c => c.at('acquaintance') && !c.flag('favor'), next: 'favor' };
const bye = (text = 'I should get going.') => ({ text, tone: 'quiet', effects: { met: true } });

// Dot, at the Owl Diner: pie, coffee, and who comes in at four in the morning.
export const DOT = {
  name: 'Dot',
  start: c => (!c.p.met ? 'meet' : 'hello'),
  nodes: {
    meet: { effects: { met: true, rel: 2 }, say: ['Sit anywhere, hon. I’m Dot. The coffee’s hot and the pie is cherry, apple, or a mystery.', 'You’re the new Second Sight. Your mother tipped like a saint.'], after: 'hello' },
    hello: {
      say: c => [pickToday(['What’ll it be, hon?', 'Back again? Your booth’s open.', 'Coffee’s on. It’s always on.'], c)],
      choices: [
        { text: 'Coffee and a slice of pie.', note: c => (c.st.stress > 0 ? '$5 · steadies your nerve' : '$5'), if: c => !c.today('pie') && hasCash(5)(c), effects: { cash: -5, stress: -10, flag: { pie: 'today' }, rel: 1 }, next: 'pie' },
        { text: 'What’s the mystery pie?', note: '$5', if: c => c.at('acquaintance') && !c.today('pie') && hasCash(5)(c), effects: { cash: -5, stress: -16, flag: { pie: 'today', mystery: true }, rel: 2 }, next: 'mystery' },
        { text: 'A beer.', note: c => (c.st.stress > 0 ? '$4 · steadies your nerve' : '$4'), if: c => !c.today('beer') && hasCash(4)(c), effects: { cash: -4, stress: -15, flag: { beer: 'today' }, rel: 1 }, next: 'beer' },
        { text: 'Who comes in this late?', if: c => !c.flag('rumor'), effects: { met: true, flag: { rumor: true }, rel: 1, research: { species: 'conductor', n: 10 } }, next: 'rumor' },
        favorChoice,
        bye('Just looking, thanks.'),
      ],
    },
    pie: { say: c => [pickToday(['Cherry. Warm. Don’t tell anyone I gave you the big slice.', 'Apple, with cheddar, the right way.', 'Here you go, hon. Eat. You look like you’ve seen a ghost.'], c)] },
    mystery: { say: ['Nobody knows. Not even me. The recipe came with the building.', 'People say it tastes like the best day they ever had. Eat it slow.'] },
    rumor: { say: ['Night shift, mostly. Nurses from St. Agnes, cabbies, a man in a conductor’s cap.', 'He orders coffee at four a.m., pays with a ticket punch, and there hasn’t been a train on Line 9 since ’78.'] },
    ...favor('Bless you. Carry the pie boxes to the back and I’ll send you home with something.', 'Happy to.', { kit: { tincture: 1 } }, 'My grandmother’s tonic. Tastes like a hospital. Works like a charm.'),
  },
};

// Teddy, at the Bijou: a matinee to steady your nerve (it takes two hours of your day).
export const TEDDY = {
  name: 'Teddy',
  start: c => (!c.p.met ? 'meet' : 'hello'),
  nodes: {
    meet: { effects: { met: true, rel: 2 }, say: ['Welcome to the Bijou! One screen, two hundred seats, zero ghosts. Officially.', 'I’m Teddy. I sell the tickets, tear the tickets, run the projector. And sweep.'], after: 'hello' },
    hello: {
      say: c => [pickToday(['Back for another show?', 'Today’s picture is a classic. They’re all classics. We can’t afford new ones.', 'Hey! Popcorn’s fresh. Ish.'], c)],
      choices: [
        { text: 'One ticket for the matinee.', note: c => (c.st.stress > 0 ? '$4 · 2 hours · steadies your nerve' : '$4 · 2 hours'), if: c => !c.today('show') && hasCash(4)(c) && (c.hoursLeft ?? 9) >= 2.5, effects: { cash: -4, hours: 2, stress: -25, flag: { show: 'today' }, rel: 1 }, next: 'show' },
        { text: 'When’s the next show?', if: c => !c.today('show') && (c.hoursLeft ?? 9) < 2.5, next: 'tooLate' },
        { text: 'What’s up with the balcony?', if: c => !c.flag('rumor'), effects: { met: true, flag: { rumor: true }, rel: 1, research: { species: 'negative', n: 10 } }, next: 'rumor' },
        favorChoice,
        bye(),
      ],
    },
    show: { say: ['Enjoy the show! No talking, no feet on the seats, and don’t look up at the balcony.', 'It’s an old picture, kind and funny, and nobody gets hurt in it.'] },
    tooLate: { say: ['Next one lets out after dark. You’d lose the rest of your day. Come back early and I’ll save you a seat.'] },
    rumor: { say: ['Closed since ’61. Sometimes the projector shows a reel we don’t own.', 'Faces in the crowd that aren’t in the crowd. Black and white, like a negative.'] },
    ...favor('Help me splice this reel? Hold this end. Don’t look at frame 412.', 'I won’t look.', { supplies: { essence: 1 } }, 'Something came off the film onto your hands. It glows a little. Keep it. I don’t want it.'),
  },
};

// Rose, at Second Hand Rose: the bargain bins (and she remembers if you haggle).
const BIN_FINDS = [
  { give: { supplies: { scrap: 2 } }, line: 'a tangle of old wire and clock parts' },
  { give: { supplies: { salt: 2 } }, line: 'two cartons of rock salt, unopened, labeled “just in case”' },
  { give: { supplies: { vials: 2 } }, line: 'a chemistry set from 1955, two vials still sealed' },
  { give: { supplies: { scrap: 3 } }, line: 'a broken radio with good parts inside' },
  { give: { kit: { jar: 1 } }, line: 'a heavy jar with a lid that locks' },
  { give: { supplies: { salt: 2 } }, line: 'a sack of salt somebody had sewn shut' },
  { give: { supplies: { essence: 1 } }, line: 'a hatbox, warm to the touch, with something faintly glowing inside' },
];
export const binPrice = c => (c.at('friend') ? 4 : c.flag('haggled') ? 7 : 6);
export const binFind = c => BIN_FINDS[(c.day * 5 + 3) % BIN_FINDS.length];
export const ROSE = {
  name: 'Rose',
  start: c => (!c.p.met ? 'meet' : 'hello'),
  nodes: {
    meet: { effects: { met: true, rel: 2 }, say: ['Welcome, welcome. Everything’s priced by feel. Today I feel generous. Mostly.', 'Rose. You’re the pawn shop. We’re practically cousins. Junk cousins.'], after: 'hello' },
    hello: {
      say: c => [c.flag('haggled') && !c.at('friend') ? pickToday(['Oh. The haggler.', 'Back to argue about prices?'], c) : pickToday(['Look who’s back. The bins got restocked.', 'Hello, dear. Touch anything you like. Buy what you touch.', 'Ah, a professional. Don’t appraise my stock out loud.'], c)],
      choices: [
        { text: 'Let me dig through the bins.', note: c => `$${binPrice(c)}`, if: c => !c.today('bins') && hasCash(binPrice(c))(c), effects: c => ({ met: true, cash: -binPrice(c), flag: { bins: 'today' }, rel: 1, ...binFind(c).give }), next: 'dug' },
        { text: 'Six dollars? For junk?', tone: 'cold', if: c => !c.flag('haggled') && !c.at('friend'), effects: { met: true, flag: { haggled: true }, rel: -3 }, next: 'haggle' },
        { text: 'Anything strange come through lately?', if: c => !c.flag('rumor'), effects: { met: true, flag: { rumor: true }, rel: 1, research: { species: 'coats', n: 10 } }, next: 'rumor' },
        favorChoice,
        bye('Just browsing.'),
      ],
    },
    binsAsk: {
      effects: { met: true },
      say: c => [c.today('bins') ? 'One dig a day, dear. The bins need time to think about what they’ve done.' : `The bins? ${binPrice(c) === 7 ? 'Seven' : binPrice(c) === 4 ? 'For you, four' : 'Six'} dollars a dig. Whatever you pull out is yours.`],
      choices: [
        { text: 'Let me dig.', note: c => `$${binPrice(c)}`, if: c => !c.today('bins') && hasCash(binPrice(c))(c), effects: c => ({ cash: -binPrice(c), flag: { bins: 'today' }, rel: 1, ...binFind(c).give }), next: 'dug' },
        bye('Maybe later.'),
      ],
    },
    dug: { say: c => [`You dig past a lamp shaped like a fish and come up with ${binFind(c).line}.`, pickToday(['Sold. No refunds, no regrets.', 'Good eye. Don’t tell me what it’s worth.', 'That one’s been waiting for you.'], c)] },
    haggle: { say: ['Junk? JUNK? For you, seven.', '…I’m keeping it at seven. I’ll remember that, dear.'] },
    rumor: { say: ['A man sold me six coats on Tuesday. Wednesday morning there were nine.', 'I didn’t buy three more coats. Nobody bought three more coats.'] },
    ...favor('Mind the counter five minutes? Don’t sell the mannequin. She’s not for sale. She knows.', 'I’ll watch it.', { supplies: { scrap: 2, salt: 1 } }, 'Take that box of odds and ends on your way out. Call it wages.'),
  },
};

// Abernathy, at St. Brigid's: a candle to steady you, and what's under the old church.
export const ABERNATHY = {
  name: 'Abernathy',
  start: c => (!c.p.met ? 'meet' : 'hello'),
  nodes: {
    meet: { effects: { met: true, rel: 2 }, say: ['Come in, come in. It’s always open. I’m Abernathy. I look after the place.', 'You’re from the pawn shop. Your father lit a candle here every Friday. Never said who for.'], after: 'hello' },
    hello: {
      say: c => [pickToday(['Quiet today. It usually is.', 'Welcome back.', 'The candles have been restless. Sit a while.'], c)],
      choices: [
        { text: 'I’d like to light a candle.', note: c => (c.st.stress > 0 ? '$1 · steadies your nerve' : '$1'), if: c => !c.today('candle') && hasCash(1)(c), effects: { cash: -1, stress: -8, flag: { candle: 'today' }, rel: 1 }, next: 'candle' },
        { text: 'Is there anything under the old church?', if: c => !c.flag('rumor'), effects: { met: true, flag: { rumor: true }, rel: 1, research: { species: 'keeper', n: 10 } }, next: 'rumor' },
        favorChoice,
        bye(),
      ],
    },
    candleAsk: {
      effects: { met: true },
      say: c => [c.today('candle') ? 'You’ve lit one today. It’s still burning. They tend to, in here.' : 'A dollar a candle, on the honor system. Light one for whoever you like.'],
      choices: [
        { text: 'Light one.', note: '$1', if: c => !c.today('candle') && hasCash(1)(c), effects: { cash: -1, stress: -8, flag: { candle: 'today' }, rel: 1 }, next: 'candle' },
        bye('Not now.'),
      ],
    },
    candle: { say: ['The flame catches and holds. It’s quieter in here than it was a moment ago.'] },
    rumor: { say: ['There’s a door in the crypt that was bricked up in 1890. Every spring we find the bricks stacked neatly beside it.', 'We put them back. It’s become a sort of arrangement.'] },
    ...favor('Help me carry the old hymnals down? My back isn’t what it was.', 'Of course.', { supplies: { salt: 3 } }, 'Here. Salt from the font. Blessed, or as near as I can manage. Keep it by your door.'),
  },
};

// Phase 29: beer at the Owl, too.
DOT.nodes.beer = { say: c => [pickToday(['Bottle or tap? Kidding, hon, it’s bottle. The tap’s been broken since Nixon.', 'Here. Coaster. Don’t tell Lou I’m stealing his business.', 'One beer, and you’re eating something with it. I don’t make the rules. I do, actually.'], c)] };

// The faces who are just there: a line each, different every day.
export const EXTRA_LINES = {
  bar: ['Don’t sit there. That’s Earl’s stool. Earl’s been dead since ’72, but still.', 'Lou makes a terrible martini. I’ve had nine.', 'You hear that piano? Nobody’s playing it.'],
  diner: ['The pie here could make a grown man cry. Ask me how I know.', 'I come in every night at two. Can’t sleep. Nobody can, on this block.', 'Dot’s been working here forty years. She doesn’t look a day over sixty.'],
  bijou: ['Shh. This is the good part.', 'I’ve seen this one eleven times. It ends different sometimes.', 'Don’t sit in row M. Trust me.'],
  thrift: ['I found my grandmother’s coat here. She’s still wearing hers.', 'Rose says this lamp is haunted. I’m buying it anyway.', 'Everything in here smells like 1965.'],
  chapel: ['…', 'It’s peaceful, isn’t it? Even the candles whisper.', 'I come here when the radio starts talking back.'],
  library: ['Shh.', 'I’ve been on the same page for an hour. The page keeps changing.', 'Morgan found me a book I didn’t know I needed. It’s about me. I think.'],
  brush: ['Erin told me my living room has “bad energy.” She was right. It was the couch.', 'I came in for a lamp. I’m leaving with a whole new personality.', 'Do you think this green says “cozy” or “swamp”? Erin says cozy.'],
  // v2.2: Lantern Park.
  park: ['Feed the ducks if you like. Just not the big one. The big one isn’t a duck.', 'They light the lanterns at dusk. Every one. Nobody’s ever seen who does it.', 'The band plays Sundays, when it plays. Last time it was one man and a tuba.', 'I come here to read. Mostly I watch the pond.', 'There used to be a statue where the flowers are. One morning it was gone. Nobody reported it.', 'Lovely day for it. Whatever it is.'],
  // v2.3: Gull Point Beach.
  // v2.5: St. Brigid's churchyard, by day.
  cemetery: ['Forty years. You’d think I’d have run out of things to tell him.', 'They don’t mind the noise. It’s the living who complain. (The gardener goes back to clipping.)', 'And on your left, the grave that rings its own bell. Nights only. Tickets are nonrefundable.', 'Touch the big one. Touch it. You won’t. (A kid, daring another.)', 'Same flowers every week. She’d have hated them. I keep bringing them.', 'Mike knows where everybody is. Ask him. He won’t tell you, but ask.'],
  beach: ['Don’t swim past the buoys. The lifeguard says it’s the current. The lifeguard is lying.', 'The ice cream man takes any coin you’ve got. Any coin. Even the old ones.', 'Best fishing’s off the end of the pier when the tide turns. Everyone knows that.', 'I buried my keys in the sand an hour ago. The sand won’t give them back.', 'Somebody pulled a ring out of the surf last week. Still had a finger in it. Kidding. Mostly.', 'Sun’s out, gulls are out. Watch your fries.', 'The breakwater’s older than the town. Older than the harbor. Nobody built it.'],
};
export const extraName = room => ({ bar: 'A regular', diner: 'A night owl', bijou: 'A moviegoer', thrift: 'A shopper', chapel: 'Someone praying', library: 'A student', brush: 'A browser', park: 'Someone in the park', beach: 'A beachgoer', cemetery: 'A visitor' }[room] ?? 'Someone');

// Everyone you can talk to, by name.
// ---------- Phase 24: the regulars at the Brass Lantern ----------
// Testers with no job yet. Each: how they say hello, a story worth hearing once (a lead on
// something out there), a round you can buy them, and small talk that changes day to day.
const tester = ({ name, meet, hello, smallTalk, story, species, round = 'Buy you a drink?', roundReply }) => ({
  name,
  start: c => (!c.p.met ? 'meet' : 'hello'),
  nodes: {
    meet: { effects: { met: true, rel: 2 }, say: meet, after: 'hello' },
    hello: {
      say: c => [typeof hello === 'function' ? hello(c) : pickToday(hello, c)],
      choices: [
        { text: 'What’s new?', if: c => !c.today('chat'), effects: { flag: { chat: 'today' }, rel: 1 }, next: 'chat' },
        { text: 'Heard anything strange?', if: c => !c.flag('story'), effects: { met: true, flag: { story: true }, rel: 1, research: { species, n: 10 } }, next: 'story' },
        { text: round, note: c => (c.st.stress > 0 ? '$3 · steadies your nerve' : '$3'), if: c => !c.today('round') && hasCash(3)(c), effects: { cash: -3, stress: -6, flag: { round: 'today' }, rel: 2 }, next: 'round' },
        bye('See you around.'),
      ],
    },
    chat: { say: c => [pickToday(smallTalk, c, 2)] },
    story: { say: story },
    round: { say: c => [pickToday(roundReply, c, 3)] },
  },
});

export const DEX = tester({
  name: 'Dex', species: 'hound',
  meet: ['Hey. Dex. I’m Morgan’s husband, so you’ve probably heard a lot about me. Most of it’s true.', 'You run the pawn shop. She talks about your basement like it’s a tourist attraction.'],
  hello: c => (c.here?.includes('Morgan') ? pickToday(['Hey. Morgan’s around here somewhere. Follow the sound of footnotes.', 'Pull up a chair. She’s telling the whole booth about a book again.'], c) : pickToday(['Hey. Saving Morgan a seat. She’ll be in when the library shuts.', 'Hey, you. Long day?', 'Evening. Or whatever it is.'], c)),
  smallTalk: ['I hit my head on the door frame coming in. Every time. Lou says he’ll raise it. Lou says a lot of things.', 'Morgan got me a library card. I’ve never once used it. Don’t tell her.', 'Our anniversary’s coming up. I’m thinking a book. She’ll have read it. She’s read all of them.', 'Being tall is mostly getting asked to reach things.'],
  story: ['Walking home last week, something kept pace with me on the other side of the street. Big. Low. Never in the light.', 'I stopped, it stopped. I walked, it walked. Morgan says it’s a story. Morgan wasn’t there.'],
  roundReply: ['Thanks. I’ll get the next one. Morgan will make sure I get the next one.', 'Appreciate it. Cheers.', 'You’re all right, you know that?'],
});
export const PACO = tester({
  name: 'Pablo', species: 'exhaust',
  meet: ['Pablo! Nice to meet you. You hungry? You look hungry.', 'Let me tell you about tacos. The taco is the greatest food ever made. Soft tortilla, warm, a little char. Meat, onion, cilantro, lime. It fits in one hand. It is perfect.', 'I know every taco in this town, and I respect every one of them. Ask me anything.'],
  hello: ['Hey hey! There they are!', 'You eat today? Be honest.', 'Pull up a stool, friend.'],
  smallTalk: ['The tamale cart by the Narrows moves every day. I follow it. It’s a whole system.', 'Dot gave me the big slice yesterday. I think she likes me. Or she felt bad. Either way, big slice.', 'There’s a noodle place in Harbor Row open only on Tuesdays. Nobody knows why. Nobody asks.', 'I tried cooking at home once. The smoke alarm and I don’t talk anymore.'],
  story: ['The parking garage by the depot, the bottom level. I left my truck there one night and the engine was running when I came back.', 'Keys in my pocket. Doors locked. Exhaust everywhere, like something was breathing it.'],
  roundReply: ['Ayy, thank you! Next one’s on me, and it comes with fries.', 'You’re good people.', 'Salud!'],
});
export const RANDO = tester({
  name: 'Jackson', species: 'sockling',
  meet: ['Jackson. Before you ask, yes, it’s my real name. Well. Real enough.', 'Hey, quick question. Do you think pigeons know they’re in a city?'],
  hello: ['Oh good, someone new to tell this to.', 'Okay, so, hear me out.', 'Hey! Perfect timing. I just had a thought.'],
  smallTalk: ['What if the bus is always late because it’s actually early for the next one?', 'I counted the stools in here. Then I counted again. Different number. Lou says I can’t count.', 'Library books are just rentals for words. Morgan didn’t like that one.', 'Every coin in the fountain at the market is a tiny wish. Someone should audit that.'],
  story: ['The laundromat at night. I swear the dryers keep going after everyone’s gone, and they’re eating socks. Left ones. Only left ones.', 'Where do they go? I have a theory. I have several theories.'],
  roundReply: ['A drink! For me! You’re a scholar and a gentleperson.', 'Thanks! I was going to theorize my way into a free one, but this is faster.', 'Cheers. To the pigeons.'],
});
export const STYG = tester({
  name: 'Stuart', species: 'wraith',
  meet: ['Stuart.', '…You run the pawn shop. Mm. Old things. Things that belonged to people who aren’t around anymore. I like it.'],
  hello: ['You again. Good.', 'Ah. Company.', 'Sit. The candle on this table’s the only one that doesn’t flicker.'],
  smallTalk: ['I read the obituaries every morning. You learn more about a town from how it says goodbye.', 'Abernathy at the chapel lets me help with the candles. It’s peaceful. Nobody talks.', 'Someone asked if I’m going to a funeral. I said not today.', 'The Lantern at two in the morning is the most honest room in the city.'],
  story: ['There’s a woman on the bridge some nights. Pale, soaked through, though it hasn’t rained. She asks the time.', 'I told her once. She thanked me and wasn’t there anymore. I bring a watch now. Just in case she asks again.'],
  roundReply: ['…Thank you. That was unexpectedly kind.', 'Black. Like everything else. Thanks.', 'To the departed. And to you, I suppose.'],
});
export const JAE = tester({
  name: 'Jade', species: 'choir',
  meet: ['Hi! You’re the one from Second Sight, right? I’m Jade. I feel like I already know you. Everyone here talks about everyone.', 'Welcome to the Lantern. Officially. I’m the welcome committee. Unofficially.'],
  hello: ['Hi, you! Come sit with us.', 'Oh, I was hoping you’d come by.', 'Hey! How are you, really?'],
  smallTalk: ['Pablo and Jackson have been arguing about pigeons for an hour. I’m keeping score.', 'I’m learning the piano. Lou says I can practice when it’s slow. It’s never slow.', 'Erin made me promise to stop staying out so late. So I’m here early, and also late.', 'Morgan lent me a book about local ghost stories. I’m on chapter two and I sleep with the light on now.'],
  story: ['The old church on the hill, St. Agnes? On quiet nights you can hear singing from it. A whole choir.', 'It’s been closed for years. I went to look once. The singing stopped the second I stepped inside.'],
  roundReply: ['Aw, thank you! You’re sweet.', 'You didn’t have to! But thank you.', 'Cheers! Now you have to stay for one song.'],
});
// Phase 28: Erin is the interior designer now, at Erin's Wandering Brush. Her shop counter
// opens her catalog and advice (main.js); this is her when you just want to talk.
export const ERIN = tester({
  name: 'Erin', species: 'visitor', round: 'Bring you a coffee?',
  meet: ['Hi, I’m Erin. Welcome to the Wandering Brush. You must be the new owner at Second Sight. Everyone’s been wondering when you’d come in.', 'You live across from the shop, right? Above the dry cleaner? Oh, honey. Let’s talk about that apartment.'],
  hello: ['Hey, you. How’s the apartment treating you?', 'Hi! If you see my husband out there, tell him he left his top hat on my drafting table. Again.', 'Hi! Come in, come in. Mind the wet paint.', 'There you are. Did you eat today? You never eat.'],
  smallTalk: ['Every room has a story. Most of them are just asking for a lamp.', 'Jade comes by to “help” and leaves with a new throw pillow every time.', 'Lou asked me to redo the Lantern. I said only if the piano stays exactly where it is. He looked so relieved.', 'You’re doing better than you think, by the way. With the shop, with all of it. People notice.', 'A good chair changes a whole room. A good friend changes a whole week.', 'Ryan practiced a new trick on me at breakfast. I found the card in the butter. I’m keeping the butter.', 'Being married to a magician means every “I love you” comes with a flourish. I’m not complaining.'],
  story: ['My neighbor swears someone knocks on her door at three in the morning. Polite little knocks. Never anyone there.', 'Last time she looked through the peephole first. She said someone was looking back. Smiling. She hasn’t answered since.'],
  roundReply: ['That’s sweet of you. Thank you.', 'Thank you! Next time it’s on me, no arguments.', 'Oh, you remembered I take it with oat milk. Take care of yourself out there, okay?'],
});
// Phase 26: Ryan, The Mystic Magician. His act is its own panel (ui/magic-panels.js); this is
// what he says when you just want to talk.
export const RYAN = tester({
  name: 'Ryan', species: 'valet', round: 'Buy you a coffee?',
  meet: ['Ryan. The Mystic Magician, on the posters I haven’t printed yet.', 'You’re the pawn shop! I’ve sold you nothing and bought nothing from you, which makes us the only honest relationship on this street.'],
  hello: ['The great and powerful customer returns!', 'Hey! Have you been by Erin’s shop? Tell her I said she’s the real magic. She hates when I say that. She loves it.', 'Pick a card. Any card. Actually, just say hi, I’m on a break.', 'Ah, my favorite audience. Also my only audience, right now.'],
  smallTalk: ['A good trick is ninety percent story and ten percent sleeve.', 'Lou lets me use the Lantern when it rains. I pay him in card tricks. He hates card tricks.', 'Stuart asked me to make him disappear. I said I’d need a bigger hat.', 'Someone once paid me in a cursed coin. I gave it to Rose. She gave it back. Twice.', 'My lucky deck has fifty-three cards. I’ve never found out which one is extra.', 'Erin redecorated my card table. It has a theme now. The theme is “Erin was here.”', 'My wife can spot a forced card from across the street. I married my toughest audience.'],
  story: ['The parking garage on Fifth. The valet stand at the bottom level, the one with no attendant.', 'I left my keys there once as a bit. When I came back, my car was parked better than I’ve ever parked it, and the seat was still warm.'],
  roundReply: ['Coffee! The fuel of all true magic.', 'Thanks. Watch: I’ll make it disappear.', 'A patron of the arts. I’m honored.'],
});

// The town, a little at a time: one thing a day, and more the closer you are.
// By hearts: [0+, 2+, 4+, 6+, 8+].
export const RYAN_LORE = [
  ['Old Market used to be a real market. Fish, flowers, fortune tellers. The fortune tellers left first. Make of that what you will.',
    'Ever notice the streetlights on this block flicker in the same order every night? Like they’re counting something.',
    'The Office of Anomalous Property has been auditing this city since before it was a city. Ask them about the first audit. They’ll change the subject.'],
  ['The Faraday Circle thinks the things out there are signals. Halberd & Vane think they’re assets. The Night Shift thinks they’re prey. Everybody’s a little right. That’s what makes it dangerous.',
    'Bad nights come a week after something gets thrown out. A store closes, a house gets cleared, a funeral nobody comes to. The city coughs it all back up.'],
  ['Salt works because it’s the one thing nobody ever forgets. Every kitchen, every road in winter. It’s remembered everywhere at once. You can’t haunt what’s always remembered.',
    'The things out there aren’t evil. They’re lost. Lost things bite. So do lost dogs.'],
  ['The Doorkeeper isn’t a monster. It’s a lock with opinions.',
    'Every cursed thing you name and tag is a little lighter on the other side. You didn’t just inherit a shop. You inherited a job.'],
  ['You know what the whole trick is? Once something’s named, it stops looking for itself. That’s what you do all night, down in that basement.',
    'Rose sells second-hand. You sell second sight. Same business, really: giving forgotten things a second chance.'],
];
const loreFor = c => {
  const hearts = Math.floor(Math.max(0, c.p.rel) / 10), tier = Math.min(RYAN_LORE.length - 1, Math.floor(hearts / 2));
  const seen = c.p.flags.loreSeen ?? [];
  const pool = RYAN_LORE.slice(0, tier + 1).flat();
  return pool.find(l => !seen.includes(l)) ?? pool[c.day % pool.length];
};
RYAN.nodes.hello.choices.splice(RYAN.nodes.hello.choices.length - 1, 0,
  { text: 'Tell me about this town.', if: c => !c.today('lore'), effects: c => ({ flag: { lore: 'today', loreSeen: [...(c.p.flags.loreSeen ?? []), loreFor(c)] }, rel: 1 }), next: 'lore' });
RYAN.nodes.lore = { say: c => [(c.p.flags.loreSeen ?? []).slice(-1)[0] ?? loreFor(c)] };

// ---------- Phase 29: Kristen, Navy Corpsman ----------
// A Navy hospital corpsman ("Doc"). Mostly at the Lantern, coffee before five and a beer after;
// she tells you about the Navy a little at a time, and the closer you get, the steadier
// she makes you before a night out (game/relationships.js `nerveGuard`).
export const KRISTEN = tester({
  name: 'Kristen', species: 'negative', round: 'Buy you a coffee?',
  meet: ['Hey. Kristen. Navy, hospital corpsman. The Marines called me Doc, so everybody does now.', 'You’re the pawn shop kid. You’ve got the look. The one where you haven’t slept since Tuesday. Sit.'],
  hello: ['Hey, you. Coffee’s fresh. Well, Lou says it is.', 'There you are. Sit. Let me look at you. Hm. You’ll live.', 'Evening. I’m on my second beer and my first good mood.', 'Hey. Pull up a stool. How are you sleeping? Honestly.'],
  smallTalk: ['Lou finally put a decent beer on tap. Took me three months of complaining. Worth it.', 'Coffee before five, beer after. That’s not a rule. That’s a treaty.', 'Morgan asked me to look at a paper cut. I did. It was a paper cut. She was thrilled.', 'Pablo feeds everyone. I just make sure nobody chokes.', 'Erin wants to redo my place. I told her I live out of a seabag. She took that personally.', 'Stuart asked what the worst thing I ever saw was. I said the mess deck on taco night.', 'Ryan keeps pulling coins from behind my ear. I keep checking him for a concussion.'],
  story: ['I did a few weeks of nights at St. Agnes when I got back, in the old wing, before they shut it.', 'The X-ray room would warm up on its own. Films came out with nobody on the table. Same shape every time: somebody standing very still, waiting to be seen.'],
  roundReply: ['Coffee. Good call. You’re learning.', 'Thanks. Black, no sugar, no nonsense.', 'Bless you. Now drink some water too.'],
});
// The Navy, a little at a time: one thing a day, more the closer you are. By hearts: [0+, 2+, 4+, 6+, 8+].
export const KRISTEN_NAVY = [
  ['Hospital corpsman: the Navy’s medics. Half of us end up with the Marines, and the Marines call every one of us Doc.',
    'Boot camp was Great Lakes in February. I haven’t been warm since.'],
  ['Field medicine is mostly three things: stop the bleeding, keep them breathing, keep them talking. Works on most problems, honestly.',
    'I checked everybody’s feet. You would not believe what Marines do to their feet.'],
  ['Triage is the hardest thing they teach you. Who goes first, who can wait. You make the call, and you carry it after.',
    'On the ship you sleep in a rack the size of a coffin, three high. I can sleep anywhere now. Anywhere.'],
  ['Fear is just your body getting ready. You can’t switch it off, but you can give it a job. Breathe in four, hold four, out four, hold four.',
    'On the worst nights I talked the whole time. Didn’t matter what about. A voice in the dark is half the medicine.'],
  ['I got out after my second deployment and came here because nobody asks about it. Turns out I like being asked. By you, anyway.',
    'Doc isn’t a rank. It’s a promise. Somebody’s hurt, you go. You don’t stop to think about it.'],
];
const navyFor = c => {
  const hearts = Math.floor(Math.max(0, c.p.rel) / 10), tier = Math.min(KRISTEN_NAVY.length - 1, Math.floor(hearts / 2));
  const seen = c.p.flags.navySeen ?? [], pool = KRISTEN_NAVY.slice(0, tier + 1).flat();
  return pool.find(l => !seen.includes(l)) ?? pool[c.day % pool.length];
};
// Patching you up (once a day): more the closer you are, and more after a bad night.
export const knockedOutLately = c => (c.world?.lastKnockout ?? -9) >= c.day - 1;
export const patchAmount = c => Math.min(30, 8 + 2 * Math.floor(Math.max(0, c.p.rel) / 10)) + (knockedOutLately(c) ? 10 : 0);
// What she does for your nerve on a night out, by hearts (shrugs off the first N stress).
export const KRISTEN_GUARD = [[10, 25], [8, 20], [6, 15], [4, 10], [2, 5]];
export const kristenGuard = rel => KRISTEN_GUARD.find(([h]) => Math.floor(Math.max(0, rel ?? 0) / 10) >= h)?.[1] ?? 0;
{
  const ch = KRISTEN.nodes.hello.choices, at = ch.length - 1;
  const round = ch.findIndex(x => x.next === 'round');
  ch.splice(round + 1, 0, { text: 'Buy you a beer?', note: c => (c.st.stress > 0 ? '$4 · steadies your nerve' : '$4'), if: c => !c.today('round') && hasCash(4)(c), effects: { cash: -4, stress: -8, flag: { round: 'today' }, rel: 2 }, next: 'beer' });
  ch.splice(at + 1, 0,
    { text: 'Tell me about the Navy.', if: c => !c.today('navy'), effects: c => ({ flag: { navy: 'today', navySeen: [...(c.p.flags.navySeen ?? []), navyFor(c)] }, rel: 1 }), next: 'navy' },
    { text: 'Any advice for tonight?', if: c => !c.today('advice'), effects: { flag: { advice: 'today' } }, next: 'advice' },
    { text: 'Patch me up, Doc?', note: c => `free · ${patchAmount(c)} less stress`, if: c => c.p.met && !c.today('patch') && c.st.stress >= 5, effects: c => ({ flag: { patch: 'today' }, stress: -patchAmount(c), rel: 1 }), next: 'patch' });
  KRISTEN.nodes.patch = { say: c => (knockedOutLately(c)
    ? ['Sit. No, sit. You went down last night, didn’t you? I can tell by how you’re holding your shoulder.', 'Ice, water, and you’re not going anywhere dark until you’ve eaten. There. Better. Doc’s orders.']
    : [pickToday(['Let me see. Pupils fine, pulse fast, hands shaking. Okay. Breathe with me. In four… out four. There.', 'Here: water, two aspirin, and five minutes of not talking about whatever’s in your basement. Better?', 'Shoulders down. Unclench your jaw. You carry it all right here. Okay. That’s better.'], c)]) };
  KRISTEN.nodes.navy = { say: c => [(c.p.flags.navySeen ?? []).slice(-1)[0] ?? navyFor(c)] };
  KRISTEN.nodes.beer = { say: c => [pickToday(['Cheers. Fair winds and following seas.', 'Thanks, shipmate. One. Then water.', 'Now you’re talking. To the ones still out there.'], c, 3)] };
  KRISTEN.nodes.advice = { say: c => {
    const g = kristenGuard(c.p.rel);
    if (!g) return ['Eat something. Drink water. Don’t go anywhere you can’t walk back out of.', 'Come talk to me more. I’ve got a few tricks for staying steady. I teach them to friends.'];
    return ['Same as I taught you. In four, hold four, out four, hold four. Before you go in, not after.', `Do that and the first ${g} stress you take tonight won’t touch you: scares, hazards, hits, it soaks them up first. It can keep you on your feet when you’d have gone down.`, 'You’ll see it out there as the blue Shield bar under your nerve. When it’s empty, it’s just you again. Be careful then.'];
  } };
}

// ---------- Phase 29: the married couples ----------
// Morgan and Dex, Erin and Ryan. Each tells you, once, how they met (their own version), and
// they notice when the other one is in the room.
const HOW_MET = {
  Morgan: ['Dex had sixty-three dollars in late fees. Sixty-three! On one book. A field guide to North American birds.', 'He came in to pay it off and asked me what the best book in the library was. I said it depends who’s asking. Married two years later. He never did finish the bird book.'],
  Dex: ['I had a late fee. A big one. I went in to pay it and the librarian looked at me like I’d personally hurt the book.', 'Then she smiled, and I asked her for a recommendation, and I’ve been reading whatever she hands me ever since. Best fine I ever paid.'],
  Erin: ['He did a card trick at a gallery opening I was working. He got it wrong. He pulled out my business card instead of my card. He’d pocketed it while I wasn’t looking.', 'He called the next day and said, “Is this your card?” I married him anyway.'],
  Ryan: ['She’ll tell you I got the trick wrong. I’ll have you know I got exactly the card I wanted.', 'Best trick I ever did. Only one I’ll never do again. You only need it to work once.'],
};
for (const [name, lines] of Object.entries(HOW_MET)) {
  const convo = { Morgan: BRIT, Dex: DEX, Erin: ERIN, Ryan: RYAN }[name], ch = convo.nodes.hello.choices;
  ch.splice(ch.length - 1, 0, { text: 'How did you two meet?', if: c => c.p.met && c.at('acquaintance') && !c.flag('howMet'), effects: { flag: { howMet: true }, rel: 2 }, next: 'howMet' });
  convo.nodes.howMet = { say: lines };
}
{
  // Erin with Ryan in the shop (he comes by at lunch); Ryan at her shop.
  const eh = ERIN.nodes.hello.say, rh = RYAN.nodes.hello.say;
  ERIN.nodes.hello.say = c => (c.here?.includes('Ryan') ? [pickToday(['You found us! He brings lunch every day. Today it’s a sandwich he “made disappear” from the deli.', 'Don’t mind him. He’s on his lunch break and he thinks the throw pillows are a captive audience.', 'Lunch date. Twenty years and he still brings me flowers he pulled out of his sleeve.'], c)] : eh(c));
  RYAN.nodes.hello.say = c => (c.place === 'brush' ? [pickToday(['Shh. I’m off the clock. Lunch with my wife. Best show in town and it’s free.', 'Oh, hey! The table’s closed till one. Erin says I’m not allowed to do tricks in here. I’m doing one anyway. Look: a sandwich.', 'My favorite part of the day: lunch with the most talented person on this street. Don’t tell her I said that. Tell her I said that.'], c)] : rh(c));
}

// ---------- v2.4: Kip, the fisherman ----------
// Runs the Bait & Tackle shack on the Gull Point boardwalk. Wiry, a gray mustache, a flat
// cap; dry, few words, and cagey about where the good fishing is until he knows you. He
// tells you what's biting (more of it the closer you are) and opens the shack for you.
// Sundays he's out on the end of the pier and the shack runs on the honor tin.
const KIP_WHERE = { pier: 'off the end of the pier', surf: 'in the surf', rocks: 'by the breakwater rocks', harbor: 'down at the river mouth, past the dunes', river: 'in the river' };
// What's worth fishing for right now: the best-paying fish that's about (not the legend).
export function kipTip(c) {
  const F = c.fishing;
  if (!F) return null;
  const now = F.FISH.filter(f => !f.legend && f.seasons.includes(c.season) && f.times.includes(c.timeOfDay) && (!f.weather || f.weather.includes(c.weather)));
  if (!now.length) return null;
  return now.sort((a, b) => b.price - a.price || a.id.localeCompare(b.id))[(c.day % Math.min(2, now.length))];
}
const kipHearts = c => Math.floor(Math.max(0, c.p.rel) / 10);
export const KIP = {
  name: 'Kip',
  start: c => (!c.p.met ? 'meet' : 'hello'),
  nodes: {
    meet: { effects: { met: true, rel: 2 }, say: ['Kip.', 'You’re the pawn shop. Heard you bought a dead man’s fishing reel last week and sold it for twice what it was worth.', 'Good. Somebody in this town should be making money.'], after: 'hello' },
    hello: {
      say: c => [c.atPier
        ? pickToday(['Shh. They can hear you.', 'Sunday. Shack’s on the tin. Pay what the board says.', 'Pull up a bit of pier. Don’t talk.'], c)
        : c.at('close') ? pickToday([`${c.player ?? 'Kid'}. Coffee’s in the thermos.`, 'Was hoping you’d come by. Don’t make it a thing.', 'Tide’s right. You’ll want to be out there.'], c)
          : c.at('friend') ? pickToday(['You again. Good.', 'Mm. Fish are in.', 'Sit if you’re sitting.'], c)
            : pickToday(['Mm.', 'Help you.', 'Board’s up. Prices are prices.'], c)],
      choices: [
        { text: 'What’s biting?', if: c => !c.today('tip'), effects: { flag: { tip: 'today' }, rel: 1 }, next: 'tip' },
        { text: 'Where are the good spots?', if: c => !c.today('spots'), effects: { flag: { spots: 'today' }, rel: 1 }, next: 'spots' },
        { text: 'I have something for you.', if: c => !!c.world.people?.['The lantern-bearer']?.flags?.maeLantern && !c.flag('maeGiven'), effects: { flag: { maeGiven: true }, run: c => { c.p.rel = Math.min(100, c.p.rel + 15); return ['Kip will never forget this.']; } }, next: 'mae' },
        { text: 'Open up the shack?', if: c => !c.atPier, next: 'open:tackle' },
        bye('Tight lines.'),
      ],
    },
    mae: { say: ['You hold out the lantern. Kip goes very still. He takes it in both hands like it might break.', '“Where did you…” He stops. “No. Don’t tell me. I know where.”', { who: 'you', text: 'She said to stop waiting at the end of the pier. She said the fish are biting somewhere else now.' }, 'He laughs. It comes out wet. “She would say that.” He hangs the lantern in the shack window. It stays lit.'] },
    tip: { say: c => {
      const f = kipTip(c), h = kipHearts(c);
      if (!f) return ['Nothing worth the bait right now. Come back when the light changes.'];
      const where = f.where.map(w => KIP_WHERE[w]).join(' or ');
      if (h < 2) return [`${f.name}. That’s all I’ll say.`];
      if (h < 5) return [`${f.name}, ${where}.`, 'You didn’t hear it from me.'];
      const bait = f.needs ? `It won’t look at anything but ${f.needs}.` : f.likes ? `Put ${f.likes} on.` : 'Worms do fine.';
      return [`${f.name}, ${where}. ${bait}`, f.tide ? `Wait for the ${f.tide} tide.` : 'Tide doesn’t matter to that one.'];
    } },
    spots: { say: c => {
      const h = kipHearts(c);
      if (h < 2) return ['Water. Fish are in the water. Mostly.'];
      if (h < 4) return ['End of the pier for the deep ones. That’s free. The rest you earn.'];
      if (h < 6) return ['Rocks on the west end at high tide. The fish hide in there and so does your tackle.', 'And the river by the bridges after dark. Eels.'];
      if (h < 8) return ['Harbor jetties in winter. Smelt by the bucket. Smells like cucumber, don’t ask me.', 'And the surf on a falling tide. Flounder lie right in the wash.'];
      return ['All right. Here’s one I don’t tell. Storm, high tide, squid, the end of the pier.', 'Something old lives down there. Bigger than a man. I’ve had him on twice.', 'Never landed him. Maybe you will. Don’t tell anyone it was me who told you.'];
    } },
  },
};

// ---------- v2.5: Mike, the Gravekeeper ----------
// Gruff, dry-humored, very friendly. He knows every grave, sells spades, lantern oil and
// keys from his shed (the keys to the deeper rows as you get closer), and hints at which
// graves are worth it. c.graves, c.seed, c.cemetery and c.night come from main.js.
const MIKE_SIDE = tx => (tx < 27 ? 'west side' : 'east side');
export function mikeTip(c) {
  const G = c.graves, C = c.cemetery;
  if (!G || !C) return null;
  const rows = G.CEMETERY.rows, open = s => !s.key || C.gear[s.key];
  const out = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    const sec = G.sectionAt(y);
    if (!G.kindOf(ch) || ch === 'M' || C.dug[`${x},${y}`] != null || !open(sec)) return;
    if (G.fateOf(c.seed, x, y) === 'rich') out.push({ x, y, sec });
  }));
  if (!out.length) return null;
  const t = out[(c.day * 13) % out.length];
  return { ...t, epi: G.epitaph(c.seed, t.x, t.y, { mikeMap: true }) };
}
export const MIKE = {
  name: 'Mike',
  start: c => (!c.p.met ? 'meet' : 'hello'),
  nodes: {
    meet: { effects: { met: true, rel: 2, run: c => { if (c.cemetery) c.cemetery.met = true; return []; } }, say: ['Mike. I keep the yard. You’re the pawn-shop kid. Your folks used to come by.', 'Don’t step on the graves, don’t feed the crows, don’t ask me for a light. I’m using it.'], after: 'hello' },
    hello: {
      say: c => [c.night
        ? T_pick(['Up late. So’s the yard. Keep your voice down.', 'Lantern lit? Good. Spade sharp? Good. Bell quiet? Let’s keep it that way.', 'Night shift. The best company here doesn’t talk back.'], c)
        : c.at('close') ? T_pick(['There’s my favorite trespasser.', 'Kid. Sit. The bench is warm.', 'Morning. Or whatever it is. I lose track out here.'], c)
          : c.at('friend') ? T_pick(['You again. Good. The yard likes you.', 'Mm. Back for more stories?', 'Mind the fresh one by the gate.'], c)
            : T_pick(['Help you.', 'Visiting someone? No? Then you’re visiting me.', 'Mm.'], c)],
      choices: [
        { text: 'Any graves worth a look?', if: c => !c.today('tip'), effects: { flag: { tip: 'today' }, rel: 1 }, next: 'tip' },
        { text: 'Tell me about the yard.', if: c => !c.today('lore'), effects: { flag: { lore: 'today' }, rel: 1 }, next: 'lore' },
        { text: 'What do you sell?', next: 'open:shed' },
        bye('Rest easy, Mike.'),
      ],
    },
    tip: { say: c => {
      const t = mikeTip(c), h = Math.floor(Math.max(0, c.p.rel) / 10);
      if (!t) return ['Nothing worth the trouble that you can get to. Earn a key first.'];
      if (h < 2) return ['Lot of rich folk under the Old Yard. Lot of poor ones too. Find out which yourself.'];
      if (h < 5) return [`In ${t.sec.name.replace('The ', 'the ')}, ${MIKE_SIDE(t.x)}. That’s all you get.`];
      return [`${t.epi.name}. ${t.sec.name}, ${MIKE_SIDE(t.x)}. The stone says “${t.epi.line}”`, h >= 8 ? 'Believe that one. I buried him myself.' : 'You didn’t hear it from me.'];
    } },
    lore: { say: c => {
      const h = Math.floor(Math.max(0, c.p.rel) / 10);
      const L = [
        ['Old yard’s from before the chapel was built. Some of these stones are older than the town.', 'Read ’em. The old carvers knew what was in the box. They wrote it down, in their way.'],
        ['The bell in the chapel tower hasn’t had a rope since 1938. It rings anyway. When the yard’s awake.', 'Stay in the lantern light if it rings. They don’t like the light.'],
        ['Dig quiet. Dig quick. Never more than a few a week. The yard needs to settle, same as anybody.'],
        ['Things come up angry sometimes. Not ghosts. Grudges. They don’t last long out of the ground. Outrun ’em.'],
        ['The Crypts belong to the old families. Every tomb kept one thing they couldn’t bear to sell. Your folks knew which.'],
      ];
      return L[Math.min(L.length - 1, Math.floor(h / 2))];
    } },
  },
};
const T_pick = (list, c) => list[Math.abs(c.day * 7 + (c.p?.talks ?? 0) * 3) % list.length];

export const TESTERS = { Dex: DEX, Pablo: PACO, Jackson: RANDO, Stuart: STYG, Jade: JAE, Erin: ERIN, Kristen: KRISTEN };
export const TESTER_NAMES = Object.keys(TESTERS);

export function convoFor(name) {
  return { Morgan: BRIT, Lou: LOU, Dot: DOT, Teddy: TEDDY, Rose: ROSE, Abernathy: ABERNATHY, Ryan: RYAN, Kip: KIP, Mike: MIKE, ...TESTERS }[name] ?? keeperConvo(name);
}
