// People you can have a real relationship with (Phase 22): hearts, gifts, birthdays and
// heart events (game/relationships.js). Only the people listed here get it; everyone
// else keeps the everyday friendship from Phase 20. Phase 26: Ryan, The Mystic Magician, is
// the first (a friendship, not a romance): his heart scenes tell you what the city is.
// Phase 29: Erin (married to Ryan; a friendship too, and ten hearts gets you her family
// rate) and Kristen (whose friendship steadies your nerve on a night out).
//
// An entry looks like this:
//
//   'Brit': {
//     loves: ['photo'], likes: ['electronics', 'personal'], dislikes: ['medical'],   // item categories:
//                              // photo, hardware, electronics, coin, medical, personal
//     birthday: '07-12',       // month and day ('MM-DD'), on the world's real calendar
//     reactions: { love: '…', like: '…', neutral: '…', dislike: '…' },   // optional, what they say to a gift
//     events: {                // optional: a scene the first time you talk at that many hearts
//       2: ['line', { who: 'you', text: 'your line' }, 'line'],
//       5: [...], 8: [...], 10: [...],
//     },
//   },
//
// v2.4: every custom townsperson has hearts now, as a friendship (nobody here is a romance;
// partners for the player come later). `rewards` (optional): effects (game/talk.js apply)
// given once, with the heart scene at that level.

import { cemeteryOf } from '../game/graves.js';

export const RELATIONSHIPS = {
  Ryan: {
    fish: 'like', fishReactions: { like: 'A fish! You know, I can make one disappear. Watch. …Okay, I put it in the cooler. Still counts.' },
    loves: ['coin'], likes: ['photo', 'personal'], dislikes: ['medical'],
    birthday: '09-25',
    reactions: {
      love: 'A coin with a story! Watch: now you see it… and now it’s mine. Thank you. Really.',
      like: 'Oh, I can use this in the act. You have an eye for props.',
      neutral: 'Hm. I’ll make it disappear later. Kidding! Thanks.',
      dislike: 'A… medical thing. I don’t do tricks with those. Bad luck. But thanks.',
    },
    // What the city is, a little at a time (two, four, six, eight and ten hearts).
    events: {
      2: [
        'Hey. Can I show you something that isn’t a trick?',
        'You know what a magic trick really is? It’s something everybody agrees not to look at too closely.',
        'This whole city runs on that. A laundromat open all night that nobody works at. A subway line sealed since ’78 where the lights still cycle. Everybody sees it. Nobody looks.',
        { who: 'you', text: 'I look. It’s sort of my job now.' },
        'I know. That’s why I like you.',
      ],
      4: [
        'I’ve got a theory about the things you find out there. Want it? It’s free. The good ones always are.',
        'Things that get left behind don’t just stop. A sock the dryer ate. A car somebody left running. A conductor nobody told the shift was over.',
        'They keep going, out of habit. Leave anything alone long enough in this town and it starts to want something back.',
        { who: 'you', text: 'Want what?' },
        'Whatever it lost. A pair. A passenger. A patient. A picture. Read your own lab notes sometime. They all want one thing.',
      ],
      6: [
        'Under this city there’s a lost-and-found. Not a room. More like a… low place. Everything the city forgets rolls downhill into it eventually.',
        'Most of it stays down there. Some of it finds a crack and climbs back up, looking for whatever it lost.',
        'That’s your night shift. That’s what’s on your bench. The flood in ’78 washed half a city’s worth of forgotten things down at once. It’s been crowded ever since.',
        { who: 'you', text: 'And storms?' },
        'Rain carries things downhill. Basements. Tunnels. Yours, especially.',
      ],
      8: [
        'Your folks used to stop by my table, you know. Your mom picked the queen every single time. Your dad tipped me in a coin I still can’t spend.',
        'Second Sight was never just a pawn shop. It was a cork in a bottle. Every cursed thing that got named and put on a shelf was one less thing climbing out of the dark.',
        'The other door in your basement goes straight down to the lost-and-found. And it’s been filling up faster.',
        { who: 'you', text: 'So they went down to stop it.' },
        'Somebody had to close the drain from the other side. That’s all I know. The rest is yours to find out.',
      ],
      10: [
        'Can I tell you a secret? The real one. Not for the tourists.',
        'I didn’t learn magic. I wrote it. The cards, the hounds, the hymn about rising water, this street, the bell over your door that always sticks.',
        'Every story needs somebody shuffling the deck. This one’s mine.',
        { who: 'you', text: 'Then how does it end?' },
        'That’s the one trick I can’t do. I make the rules; you’re the one playing. Here: my lucky coin. It doubles your luck at my table. Probably. Now go on. Find the lady.',
      ],
    },
  },
  Erin: {
    fish: 'neutral', fishReactions: { neutral: 'Oh! A… fish. Thank you. I’ll give it to Ryan. He’ll know what to do with it.' },
    loves: ['photo'], likes: ['personal', 'hardware'], dislikes: ['electronics'],
    birthday: '07-24',
    reactions: {
      love: 'Oh, look at this. I know exactly which wall it goes on. Thank you, honey.',
      like: 'This has character. Like you. Thank you.',
      neutral: 'That’s sweet. I’ll find a home for it. I always do.',
      dislike: 'Oh. It… hums. Why does it hum? Thank you, though. Really.',
    },
    events: {
      2: [
        'Can I tell you something odd? Every room I walk into, I can tell what the people who lived there lost.',
        'An empty hook by the door. A chair nobody sits in. A frame turned to the wall. Rooms remember.',
        { who: 'you', text: 'What does my apartment remember?' },
        'Your mom’s plant stand, by the window. You should put something on it.',
      ],
      4: [
        'Ryan proposed with a card trick. Of course he did. “Is this your card?” and it was a little paper ring.',
        'I said yes before he got to the end. He still complains about that. He had a whole bit.',
        { who: 'you', text: 'Do you still have it?' },
        'In my wallet, next to the real one. The paper one gets more compliments.',
      ],
      6: [
        'Can I be honest? I worry about you. You come in with dark circles and mud on your shoes, and you buy lamps like they’re armor.',
        'Maybe they are. Light changes what can stand in a room. I believe that.',
        { who: 'you', text: 'So the lamps are working.' },
        'The lamps are working. So are you. Too hard.',
      ],
      8: [
        'Ryan tells me things he doesn’t tell anyone. About this city. About your parents.',
        'I don’t understand half of it. I don’t have to. I understand that he loves this place, he’s scared for it, and he thinks you can help it.',
        { who: 'you', text: 'No pressure, then.' },
        'None at all. Come for dinner sometime. He makes a terrible lasagna and a wonderful evening.',
      ],
      10: [
        'I’ve decided something, and you don’t get a vote.',
        'Family rate. From now on, everything in here is thirty percent off for you. Ryan says that’s bad business. Ryan does card tricks on a sidewalk.',
        { who: 'you', text: 'Erin, you don’t have to…' },
        'I know. That’s what makes it a gift. Now go home and put that lamp where I told you.',
      ],
    },
  },
  Kristen: {
    fish: 'love', fishReactions: { love: 'Now that’s a proper catch. Reminds me of fishing off the fantail on a slow watch. Thank you.' },
    loves: ['medical'], likes: ['coin', 'photo'], dislikes: ['personal'],
    birthday: '07-07',
    reactions: {
      love: 'Is this… where did you even find this? It’s beautiful. It’s also expired. I love it.',
      like: 'Oh, nice. This is going on the shelf with my challenge coins.',
      neutral: 'Thanks, shipmate. I’ll find a spot for it.',
      dislike: 'This feels like somebody else’s stuff. Like going through a dead guy’s seabag. Thanks, though.',
    },
    events: {
      2: [
        'Hold still. You’ve got a cut on your hand and you haven’t even noticed.',
        'There. Clean, closed, done. You handle old junk all day. Keep your tetanus up to date.',
        { who: 'you', text: 'Thanks, Doc.' },
        'Oh no. Now you’re doing it too.',
      ],
      4: [
        'You go out at night, don’t you? I can tell by your hands. You come in shaking and think nobody sees.',
        'I won’t ask what’s out there. I’ll teach you something instead. Box breathing. In four. Hold four. Out four. Hold four.',
        { who: 'you', text: 'In four… hold four…' },
        'Good. Do that before you go anywhere dark. Your nerve will hold a little longer. Promise.',
      ],
      6: [
        'On my ship there was a sailor who swore somebody walked the passageway at 0300 every night. Nobody was ever there.',
        'I sat up with him one night. I heard it too. Footsteps. Then a knock on the hatch. Polite.',
        'We didn’t open it. In the morning there was a neat little line of salt on the deck outside.',
        { who: 'you', text: 'Salt. Like at the shop.' },
        'Yeah. So when you tell me about your basement, I believe you. All of it.',
      ],
      8: [
        'I lost somebody once, on a night like the ones you go out in. I did everything right. It wasn’t enough.',
        'It took me a long time to learn that doing everything right is the job. The rest isn’t yours to carry.',
        { who: 'you', text: 'Does it get easier?' },
        'No. You get stronger. Different thing. Better thing.',
      ],
      10: [
        'I got you something. Don’t make it weird.',
        'My corpsman’s pin. They gave it to me when I made my rate. Wear it when you go out there.',
        'You’re not alone in the dark anymore. Somebody’s keeping watch. Breathe in four, kid.',
        { who: 'you', text: 'Out four.' },
        'That’s it. Now go. And come back.',
      ],
    },
  },

  // ---------- v2.4: the rest of the custom townsfolk ----------
  Brit: {
    fish: 'dislike', fishReactions: { dislike: 'Oh no. It’s looking at me. Why is it looking at me? Thank you, but please take it back to the sea.' },
    loves: ['personal'], likes: ['photo', 'coin'], dislikes: ['electronics'],
    birthday: '07-08',
    reactions: {
      love: 'A diary? Letters? Somebody’s whole life in a box? This is the best day. I’m cataloguing it tonight.',
      like: 'Ooh. I can date this from the wear alone. Thank you!',
      neutral: 'Thank you! I’ll find it a shelf. I always find a shelf.',
      dislike: 'It’s… beeping? Why do the things you find always beep. Thanks, though.',
    },
    events: {
      2: ['Can I tell you a library secret? Every book that comes back late has a reason. I write them down.', 'Someone returned a cookbook nine years late with every recipe crossed out but one. Soup. Just soup.', { who: 'you', text: 'What did you write?' }, '“Somebody got better.” I like to think so.'],
      4: ['There’s a book in the stacks that isn’t in the catalog. Nobody checks it out. It moves shelves on its own.', 'I followed it for a month. It always ends up next to whatever I’m about to need.', { who: 'you', text: 'That’s… helpful?' }, 'Very. Slightly terrifying. Mostly helpful.'],
      6: ['Dex thinks I collect rumors because I like gossip. I collect them because rumors are how a town warns itself.', 'Half of what I tell you is nonsense. The other half kept somebody out of a basement after dark.', { who: 'you', text: 'Which half is which?' }, 'If I knew that, I wouldn’t need the notebook.'],
      8: ['Your mom used to come in on Thursdays. Always the same table, always the same question: “Anything new about the flood?”', 'I pulled every clipping for her. I still have the folder. I didn’t know what to do with it.', { who: 'you', text: 'Can I see it?' }, 'It’s yours. It was always going to be yours. Come by the desk.'],
      10: ['I made you something. Don’t laugh.', 'A card. A real one, for the special collections. I signed it myself, which I’m not technically allowed to do.', 'And my own copy of the town’s ghost stories, with my notes in the margins. Every one I could check, I checked.', { who: 'you', text: 'Brit. Thank you.' }, 'Shh. It’s a library.'],
    },
    rewards: { 10: { research: { species: 'wraith', n: 20 } } },
  },
  Dex: {
    fish: 'like', fishReactions: { like: 'Nice one. I’ll grill it. Brit will read the whole time and say it’s the best fish she ever had.' },
    loves: ['hardware'], likes: ['coin', 'electronics'], dislikes: ['photo'],
    birthday: '09-01',
    reactions: {
      love: 'Oh, that’s a good tool. Look at the balance on it. Thanks. Really.',
      like: 'Huh. I’ll figure out what it does. Thanks.',
      neutral: 'Thanks. Brit will know what it is.',
      dislike: 'Somebody’s old photos. Feels like reading their mail. Thanks, though.',
    },
    events: {
      2: ['I fix things. Bikes, sinks, Lou’s jukebox twice a month. Not much else to know.', 'If something in your shop breaks, don’t call a guy. Call me. I’m the guy.', { who: 'you', text: 'What do I owe you?' }, 'A beer. And let me look at your basement door. I hear it hums.'],
      4: ['First of September birthday. Growing up it was always back-to-school week. Nobody had time. Cake out of a box, if I was lucky.', 'Brit makes a whole thing of it now. A theme. Last year the theme was “tall.” She’s not funny. She’s very funny.', { who: 'you', text: 'That’s a good wife.' }, 'Best there is. Don’t tell her I said it. She’ll write it down.'],
      6: ['That thing that followed me home, across the street? It came back.', 'I stood under a streetlight and it stopped at the edge of the light. Just sat there. Like a dog that knows it isn’t allowed in.', { who: 'you', text: 'What did you do?' }, 'Waited till sunrise. It got bored first. I didn’t.'],
      8: ['I was supposed to go into the family business. Demolition. Knocking down old buildings.', 'First week, we took down an old house on the river. I found a room in it that wasn’t on the plans. Full of shoes. Just shoes, all lined up.', 'I quit that day. Fixing things felt better than knocking them down.', { who: 'you', text: 'Whose shoes were they?' }, 'Never found out. That’s what bugs me.'],
      10: ['Here. Don’t make a fuss.', 'My old toolbox. Everything you need to fix a ward or patch a door. I’ve got a new one; Brit bought it. She labeled the drawers.', { who: 'you', text: 'I can’t take your toolbox.' }, 'You can. Somebody should use it on something that matters.'],
    },
    rewards: { 10: { kit: { ward: 2 }, supplies: { scrap: 6 } } },
  },
  Paco: {
    fish: 'love', fishReactions: { love: 'Fish tacos! You read my mind! Lime, cabbage, a little crema. I’m cooking for everyone tonight!' },
    loves: ['coin'], likes: ['personal', 'hardware'], dislikes: ['medical'],
    birthday: '05-05',
    reactions: {
      love: 'Is this real? I’m putting it in the jar by the register. For luck. Thank you, friend!',
      like: 'Oh, nice! I know a guy who’ll love this. Me. I’m the guy.',
      neutral: 'Thank you! You’re good people.',
      dislike: 'Ay, hospital stuff. My stomach just turned. Thank you, though, really.',
    },
    events: {
      2: ['You want to know the secret to a good taco? It isn’t the meat. It’s the tortilla.', 'Warm it on the flat top until it puffs a little. If it doesn’t puff, it isn’t ready. Same with people.', { who: 'you', text: 'Same with people?' }, 'Give everybody a minute on the heat. They puff up. You’ll see.'],
      4: ['My abuela fed the whole block. Every Sunday. Didn’t matter who you were. You came, you ate.', 'One Sunday a man came nobody knew. Wet hair, no coat, in July. She fed him. He thanked her and walked into the river.', { who: 'you', text: 'He what?' }, 'Walked right in. She set a plate for him every Sunday after. The plate was always clean on Monday.'],
      6: ['You don’t eat. I watch you. Coffee and nerves.', 'Here. A burrito. Don’t argue. Eat it while it’s warm and don’t tell Kristen, she’ll say something about salt.', { who: 'you', text: 'Thanks, Paco.' }, 'Somebody has to look after the people who look after everybody.'],
      8: ['I want to open a place. Small. Six stools and a window. My abuela’s recipes on the wall.', 'I’ve been saving. I keep the money in a coffee can, which Dex says is a terrible idea.', { who: 'you', text: 'It is a terrible idea.' }, 'It’s a good can! It has a lid!'],
      10: ['I wrote something down for you. My abuela’s remedy, for after a bad night. Ginger, honey, a little chile.', 'She swore it would scare off anything. Even the things out there.', { who: 'you', text: 'Does it work?' }, 'It works on hangovers. The rest, you tell me. I made you a few bottles.'],
    },
    rewards: { 10: { kit: { tincture: 3 } } },
  },
  Rando: {
    fish: 'neutral', fishReactions: { neutral: 'A fish! Do fish know they’re wet? Probably not. Thanks!' },
    loves: ['electronics'], likes: ['hardware', 'personal'], dislikes: ['coin'],
    birthday: '01-21',
    reactions: {
      love: 'It still has a battery in it! It’s practically alive! I’m going to take it apart and never put it back together.',
      like: 'Ooh. I have a theory about this already.',
      neutral: 'Thanks! I’ll put it with the other things. I have a box.',
      dislike: 'Coins are just tiny lies about how much things are worth. But thanks!',
    },
    events: {
      2: ['Okay, theory. What if every lost sock goes to the same place? A sock place. Sock heaven.', 'And what if the dryers are the door? And what if someone’s on the other side, matching them up?', { who: 'you', text: 'That’s… not entirely wrong.' }, 'I KNEW it. Nobody ever says that. Can you say it again louder?'],
      4: ['My real name’s not Rando. It’s Randolph. Nobody’s called me that since my grandfather.', 'He said a man should know exactly one thing about everything. I know a lot of things about nothing. Close enough.', { who: 'you', text: 'Randolph suits you.' }, 'Never call me that in front of Paco. He’ll put it on a taco.'],
      6: ['I followed the bus that’s always late. All the way to the depot.', 'It parks. The driver gets out. Then the bus leaves again, without the driver. I checked. Twice.', { who: 'you', text: 'Where does it go?' }, 'I don’t know yet. I’m getting a bike.'],
      8: ['People think I don’t take anything seriously. I do. I just take it seriously in a funny voice.', 'My sister got lost when we were kids. Two days. Found her asleep in the laundromat, holding one sock.', 'She never said where she’d been. That’s why I have theories.', { who: 'you', text: 'Is she all right?' }, 'She’s fine. She’s an accountant. Which is its own kind of lost.'],
      10: ['Here. My Theory Notebook. Volume six. The good one.', 'Pigeons, buses, socks, the change machine at the laundromat, the moon. All cross-referenced.', { who: 'you', text: 'You’re giving me your notes?' }, 'You’re the only one who ever read past page two. That’s a theory too. It turned out true.'],
    },
    rewards: { 10: { research: { species: 'sockling', n: 20 } } },
  },
  Styg: {
    fish: 'like', fishReactions: { like: 'Hm. It looks the way I feel on Mondays. Thank you. I mean that.' },
    loves: ['photo'], likes: ['personal', 'medical'], dislikes: ['electronics'],
    birthday: '10-31',
    reactions: {
      love: 'Somebody’s face, from before. Nobody remembers their name. I will. Thank you.',
      like: 'This belonged to someone. I can tell. Thank you.',
      neutral: '…Thank you. Genuinely.',
      dislike: 'Too bright. Too loud. Too new. Thank you, though.',
    },
    events: {
      2: ['People ask why I dress like this. I tell them it’s respect.', 'Everybody you pass on the street is going to be missed by someone, one day. I like to be ready.', { who: 'you', text: 'That’s grim.' }, 'It’s honest. Grim is just honest in a nice coat.'],
      4: ['I laughed at a funeral once. Not at the dead man. At a joke he’d told me, years ago. It came back during the hymn.', 'His widow came over after. I thought she’d be angry. She asked me to tell her the joke.', { who: 'you', text: 'Did you?' }, 'She laughed too. Then she cried. Then we got coffee. Funerals are for the living.'],
      6: ['The woman on the bridge. I’ve seen her three times now. Always the same night of the week.', 'She asks the time and I tell her. Then she thanks me, and she’s gone, and the air smells like river.', { who: 'you', text: 'Does she ever say anything else?' }, 'Once. “Is it late?” I told her yes. I think that was the wrong answer.'],
      8: ['My brother drowned when I was twelve. In the harbor, in the fog. They never found him.', 'I used to go to the end of the pier every night and wait. I think that’s when I stopped being afraid of the dark.', { who: 'you', text: 'I’m sorry.' }, 'Don’t be. He’d have hated me moping. He’d have liked you. He liked people who poke at things.'],
      10: ['I want you to have this. My watch. It was my brother’s.', 'It stopped the night he went. It started again the night I met you. I don’t know what that means. I’d rather you had it.', 'If the woman on the bridge asks you the time, you’ll know what to say now.', { who: 'you', text: 'Styg…' }, 'Go on. Before I say something warm. I have a reputation.'],
    },
    rewards: { 10: { supplies: { salt: 4 }, flag: { stygWatch: true } } },
  },
  Jae: {
    fish: 'like', fishReactions: { like: 'For me? I’m going to name it. Is that weird? I’m naming it Gerald.' },
    loves: ['personal'], likes: ['photo', 'medical'], dislikes: ['hardware'],
    birthday: '04-16',
    reactions: {
      love: 'Oh, this is so thoughtful. I’m going to cry. I’m not going to cry. I’m crying a little.',
      like: 'You remembered I like these! Thank you!',
      neutral: 'Aw, thank you! Seriously, you didn’t have to.',
      dislike: 'It’s… a wrench? Thank you! I’ll give it to Dex. He’ll love it.',
    },
    events: {
      2: ['Can I tell you why I’m always at the Hub? My apartment is very quiet. Too quiet.', 'Here, somebody’s always talking. Paco’s cooking, Rando’s theorizing, Lou’s pretending he doesn’t like us.', { who: 'you', text: 'He likes you.' }, 'I know. He keeps the corner booth for me. Don’t tell him I noticed.'],
      4: ['I’m learning the piano so I can play at Erin and Ryan’s anniversary. It’s a secret.', 'I only know one song. It’s a sad one. I’m going to play it fast so it sounds happy.', { who: 'you', text: 'That might work.' }, 'Ryan says that’s basically how magic works.'],
      6: ['I went back to St. Agnes. To hear the choir again.', 'I didn’t go in this time. I sat on the steps and listened all the way to the end. There’s a part where one voice is a little off. Every time.', { who: 'you', text: 'One voice off?' }, 'Like someone learning the words. I think they let someone new in. I think that’s kind of beautiful.'],
      8: ['I keep everybody’s birthdays in a notebook. And their favorite cakes. And who isn’t talking to who.', 'It started because nobody remembered mine, one year. So I decided to be the person who remembers.', { who: 'you', text: 'I’ll remember yours.' }, 'April sixteenth. Lemon cake. I’m writing down that you said that.'],
      10: ['Okay, sit down. I wrote you a song. It’s short. Don’t look at me while I sing it.', 'It’s about a pawn shop. And someone who keeps everything everyone else forgot.', { who: 'you', text: '…That was lovely.' }, 'It’s yours. Whenever you’ve had a bad night, hum it. It helps. I tested it on Styg.'],
    },
    rewards: { 10: { stress: -40 } },
  },
  // Kip, the fisherman (v2.4). Hearts warm up his tips, and he pays a little more for your
  // catch: one percent a heart, while he's minding the shack.
  Kip: {
    fish: 'neutral', fishReactions: { neutral: 'A fish. For the fish man. You want me to buy it off you, or is this a joke?' },
    loves: ['hardware'], likes: ['coin', 'photo'], dislikes: ['electronics'],
    birthday: '11-09',
    reactions: {
      love: 'Hm. Good steel. Somebody took care of this. …Thanks.',
      like: 'Mm. That’ll do.',
      neutral: 'All right.',
      dislike: 'Batteries. Leaks into everything. Thanks, I suppose.',
    },
    events: {
      2: ['You fish like you’re in a hurry. Fish can tell.', 'Sit. Let the line go slack. Watch the water, not the bobber.', { who: 'you', text: 'What am I watching for?' }, 'You’ll know. That’s the whole lesson. Don’t ask for another.'],
      4: ['My father ran this shack. His father built it. Out of a boat that came ashore in the ’38 hurricane.', 'Nobody claimed the boat. So they made a shack. Still smells like a boat when it rains.', { who: 'you', text: 'Whose boat was it?' }, 'Name on the bow was rubbed off. Some things you don’t ask the sea.'],
      6: ['Things come up on the magnet lines. You know that. You sell them.', 'Sometimes I throw them back. The ones that are warm. A thing that’s been in that water for years shouldn’t be warm.', { who: 'you', text: 'Next time bring them to me.' }, 'Mm. Maybe. Some things want to stay down.'],
      8: ['I had a wife. Dot knew her. She liked the night tide; she said the water talks after dark.', 'One night she went out to listen and the fog came in. I found her lantern on the end of the pier. Still lit.', { who: 'you', text: 'Kip, I’m so sorry.' }, 'It was a long time ago. Still lit, though. That’s the part I can’t get past.'],
      10: ['Here. Squid. Cut the way I cut it, for the big ones.', 'And from now on, you get my best price. Don’t tell anybody. They’ll want it too.', { who: 'you', text: 'Thank you, Kip.' }, 'Mm. Go on. The tide won’t wait for you to get sentimental.'],
    },
    rewards: { 10: { bait: { squid: 10 } } },
  },

  // Mike, the Gravekeeper (v2.5). Hearts open the deeper churchyard (his keys at four and
  // eight) and, at ten, his map: every epitaph tells the truth.
  Mike: {
    fish: 'like', fishReactions: { like: 'A fish. Huh. I’ll fry it on the shed stove. Don’t tell the chapel ladies.' },
    loves: ['coin'], likes: ['personal', 'photo'], dislikes: ['electronics'],
    birthday: '01-13',
    reactions: {
      love: 'Now that’s an old coin. Somebody’s fare for the ferryman. I’ll keep it safe for them.',
      like: 'Mm. Somebody loved this. Thanks, kid.',
      neutral: 'Thanks. I’ll find a shelf in the shed. Shed’s mostly shelves.',
      dislike: 'Batteries. Nothing in this yard needs batteries. Thanks anyway.',
    },
    events: {
      2: ['Forty-three years I’ve kept this yard. My father before me. His before him.', 'You know what the job is? It isn’t digging. It’s remembering. Every name. Who visits, who doesn’t.', { who: 'you', text: 'Who doesn’t?' }, 'Most of ’em, after a while. That’s why I talk to ’em. Somebody should.'],
      4: ['You’re digging at night. Don’t look at me like that, I can see the fresh earth.', 'I won’t stop you. Your folks did it too. Somebody has to take back what shouldn’t be buried.', 'Here. The key to the Lower Rows. Mind the bell.', { who: 'you', text: 'The bell?' }, 'Make enough noise and the old bell rings itself. Then they get up. Then you run.'],
      6: ['My wife’s over by the yew. Thirty-one years. I cut her grass first, every morning, before anybody else’s.', 'She used to say I’d rather talk to the dead than the living. Wasn’t true. I just talked to her more.', { who: 'you', text: 'What was her name?' }, 'Rosalind. Rosie. She’d have liked you. She liked anybody who asked.'],
      8: ['The Crypts. Up the top. The old families. Your parents went in there, the last summer.', 'They came out with something wrapped in a coat and didn’t tell me what. Then they weren’t around anymore.', 'Here’s the key. It’s not a gift. It’s a warning with a handle.', { who: 'you', text: 'What’s up there?' }, 'Money. Secrets. And the ones who don’t like either being took.'],
      10: ['Sit down. I want to give you something, and I’m only doing it once.', 'My map. Every grave in this yard, and what’s really in it. Three generations of keepers wrote in the margins.', 'The stones lie sometimes. The map doesn’t.', { who: 'you', text: 'Mike, I don’t know what to say.' }, 'Say nothing. Light a cigarette for the old man. …You don’t smoke. Fine. Just sit, then.'],
    },
    rewards: { 10: { run: c => { cemeteryOf(c.world).mikeMap = true; return ['Mike’s map: every epitaph tells the truth now.']; } } },
  },
};
