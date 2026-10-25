/* data/market.js — customers, factions, request lines, evening-news text and reputation labels. */
'use strict';

Object.assign(DATA, {
  /* Customers. Civilians judge by the tag and avoid anything marked cursed.
     Factions want specific traits and pay full price only for a named anomaly. */
  factions: [
    { id:'civilian',  name:'Walk-in',            wants:[],
      people:['Dolores Aguirre','Kevin from upstairs','Priya Nair','Old Man Szabo','Tasha Greene','Mr. Lindqvist','Rosa Delgado','A nervous student','Declan Byrne','Mrs. Okonkwo'],
      desc:'Regular folks after a bargain. Selling them a curse makes the news.' },
    { id:'techmage',  name:'The Faraday Circle', wants:['divination','signal','time','memory'],
      people:['Wren Okafor','Patch','Dr. Ilse Varga','Tomás "Ohm" Ruiz'],
      desc:'Tech-mages. Pay well for anything that hears the other side.' },
    { id:'corporate', name:'Halberd & Vane',     wants:['fortune','binding','possession'],
      people:['Mr. Castellane','Ms. Holloway','A Halberd & Vane courier','Junior Associate Pike'],
      desc:'Corporate occultists. Leverage, luck and deniability.' },
    { id:'hunters',   name:'The Night Shift',    wants:['warding','hunger'],
      people:['Big Teo','Sister Agathe','Marisol Reyes','Dutch'],
      desc:'Monster hunters. Wards for the door, bait for the trap.' },
    { id:'office',    name:'The Office',         wants:['drain','possession','time'],
      people:['Clerk Abernathy-Pryce','Agent Ruth Mbeki','Deputy Assessor Lund','An Office courier'],
      desc:'The city’s own. They buy curses to lock away, if the tag tells the truth.',
      lines:{
        drain:      'The Office is collecting anything that drains. For the vault, not for use. Is it on the tag?',
        possession: 'We are taking occupied objects off the street. Properly labeled, properly paid.',
        time:       'Anything that loops time belongs in our vault, not in somebody’s kitchen. Do you have one?'
      } }
  ],

  traitLines: {
    signal:     'Anything that picks up voices between stations? I collect frequencies nobody should hear.',
    divination: 'I need something that listens to the other side. Clean signal, no static.',
    time:       'Got anything that sticks a night on repeat? It is for research, mostly.',
    memory:     'We archive memories. If it remembers someone else’s afternoon, I want it.',
    fortune:    'The board wants luck on a leash. Something the carrier can win with.',
    binding:    'Something that binds. Contracts, people, outcomes. Discreetly.',
    possession: 'We need a vessel. Something that is already occupied.',
    warding:    'Something for the door. Keeps uninvited things on the other side.',
    hunger:     'Bait. The hungrier the better. We are setting a trap under the Line 9 platform.',
    drain:      'Something that pulls the warmth out of a room. I have uses for that.'
  },
  civLines: {
    any:         ['Just browsing for a gift. Something old and safe.', 'My apartment looks empty. What have you got that is cheap?', 'Do you have anything with a bit of character?'],
    photo:       ['Looking for an old camera for my daughter. She is into film now.', 'Any old tapes? I digitize home movies.'],
    hardware:    ['My dad collected lighters and keys. Anything like that?', 'I need a key for a door that has no key. Long story.'],
    electronics: ['Anything retro that still works? Phones, radios, a Walkman?', 'My grandson wants a real rotary phone, of all things.'],
    coin:        ['I collect transit tokens and old watches.', 'Got any old coins or a pocket watch? It is for a wedding.'],
    medical:     ['I am a nursing student. Anything vintage for my desk?'],
    personal:    ['Something personal for my mother. A pen, a music box, glasses chain?', 'Looking for a music box like the one I had as a kid.']
  },
  tooRich: ['Too rich for me.', 'For that? You are dreaming.', 'I am not paying that. Not even close.', 'That price is a joke, right?'],
  places: ['Eastgate', 'Westside', 'the Narrows', 'Harbor Row', 'Kessler Heights', 'Old Market'],
  incidents: {
    curse_hunger: ['A {place} family says their new {item} "eats the heat out of the room." Firefighters found frost on the inside of the windows.',
                   'Three dogs in {place} would not stop howling at one apartment. The tenant had just bought a {item} at a local pawn shop.'],
    curse_loop:   ['A {place} man has called the station every night this week. He says it is the same night, and he bought a {item} the day it started.'],
    curse_tenant: ['Neighbors report furniture moving in an empty {place} apartment. The tenant recently bought a {item} secondhand.',
                   'A {place} grandmother says someone keeps using her {item} at 3 a.m. She lives alone.'],
    curse_listener: ['A {place} couple says their {item} repeats their arguments back to them, word for word, a day later.',
                     'A {place} councilman resigned after private calls leaked. His aide says it started when he bought a {item}.'],
    curse_choir:  ['Neighbors in {place} keep losing the same hour every night. All of them heard singing from one apartment with a new {item}.'],
    curse_jinx:   ['Three fender-benders, a grease fire and a broken hip: a {place} shopper’s worst week started with a {item} from a pawn shop.']
  },
  luckyNews: ['A {place} shopper swears their new {item} does something strange and wonderful. You sold it as ordinary.',
              'Word from {place}: the {item} you let go cheap is worth a lot more than they paid.'],

  /* Sellers bring something in and haggle. floor = the least they will take, as a share of the
     surface estimate; ask = their opening price over the floor. Shrewd sellers know when they hold
     something special and price it in; nervous ones want a curse out of the house. */
  barter: {
    moods: {
      desperate: { weight: 25, floor: [0.5, 0.7],  ask: [1.3, 1.6], patience: 4,
        lines: ['I need rent money by tonight. What will you give me for this?', 'Car broke down. I just need cash for it, today.', 'Name a number. I am not picky right now.'] },
      clearing:  { weight: 35, floor: [0.75, 0.95], ask: [1.4, 1.8], patience: 3,
        lines: ['Clearing out my late uncle’s apartment. No idea what half of it is.', 'Moving across the country. This does not fit in the van.', 'Spring cleaning. Somebody might as well get some use out of it.'] },
      shrewd:    { weight: 20, floor: [0.9, 1.1],   ask: [1.5, 1.9], patience: 3, knows: true, odds: { inert: 30, enchanted: 55, cursed: 15 },
        lines: ['I know what this is. Do not lowball me.', 'Had this looked at once. The man went very quiet.', 'Before you start: I have been offered more than you think.'] },
      nervous:   { weight: 20, floor: [0.35, 0.55], ask: [1.2, 1.5], patience: 2, odds: { inert: 20, enchanted: 15, cursed: 65 },
        lines: ['Just take it. Please. I do not want it in the house anymore.', 'It keeps ending up back on my nightstand. I threw it out twice.', 'My dog will not go in the room with it. Cash, and it is gone.'] }
    },
    close: 0.1,       // within 10% of their floor
    warm: 0.3,        // within 30%
    insult: 0.6,      // under 60% of their floor costs two patience
    counterStep: 0.35,
    say: {
      close: ['So close. Come up a little.', 'Almost. Meet me there.', 'Nearly. A touch more.'],
      warm:  ['Not there yet.', 'Getting warmer, but no.', 'Come on, it is worth more than that.'],
      cold:  ['That is insulting.', 'Are you serious?', 'I am not giving it away.'],
      deal:  ['Deal.', 'Fine. It is yours.', 'Done. Pleasure doing business.'],
      leave: ['Forget it. I will try across town.', 'You are wasting my time.', 'No. I am out of here.'],
      peek:  ['Hey, careful with that thing.', 'What is that beeping? Just make an offer.']
    }
  },
  sellerNames: ['A man in a wet raincoat', 'Gloria Pasternak', 'A teenager with a skateboard', 'Mr. Abernathy', 'Lucía Ferrante', 'A woman in hospital scrubs',
                'Benny Two-Phones', 'Nadia Volkova', 'A delivery driver', 'Reverend Hollis'],

  /* Appraisals: the customer leaves an object for you to identify on the bench and comes back at closing.
     Pay: right alignment = fee × 1.5; right name too = fee × 2; wrong = fee × 0.5; not done = nothing. */
  appraisal: {
    fee: { civilian: [15, 25], faction: [25, 40] },
    pay: { named: 2, right: 1.5, wrong: 0.5 },
    rep: { named: 3, wrong: -3, unfinished: -2 },
    civLines: ['My grandmother swore this {item} was lucky. Can you tell me what it really is?', 'Found this {item} inside a wall when we renovated. Is it safe?',
               'My ex left this {item} behind. Should I be worried?', 'Insurance wants a professional opinion on this {item}.', 'This {item} hums at night. Is that normal?'],
    facLines: ['We want an independent read on this {item}. Get the name right and we pay well.', 'Tell us what this {item} really is. Do not guess.']
  },

  /* Standing runs −50 to 50. Only a faction you pledged to can pass 40, and 45 or more is maxed. */
  repLabels: [[-39,'Blacklisted'],[-15,'Hostile'],[-5,'Wary'],[5,'Neutral'],[20,'Friendly'],[45,'Trusted'],[51,'Inner circle']],

  news: [
    'Transit authority denies "humming" reports from the sealed Line 9.',
    'A Westside man says his microwave spoke Latin. Police blamed a gas leak.',
    'Halberd & Vane Holdings posts a record quarter. Shareholders decline comment.',
    'Streetlights on 14th flickered in sequence again. The utility blames squirrels.',
    'Missing-cat flyers in Eastgate now ask: "Has your cat come back different?"',
    'Council tables the St. Agnes demolition vote for the third time.',
    'Laundromat machines seen running with no one inside. Owner says it is fine.',
    'Mayor’s office opens a hotline for "unusual household objects."'
  ]
});
