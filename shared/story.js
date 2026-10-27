/* data/story.js — the opening cards and other story text.
   {name}, {days} and {shop} are filled in when shown. */
'use strict';

Object.assign(DATA, {
  shopName: 'Second Sight Pawn',

  intro: {
    nameCard: {
      eyebrow: 'Transfer of lease',
      title: 'Whose name goes on the door?',
      text: 'The lawyer slides the paperwork across. The shop needs a licensee, and you are all that is left.',
      placeholder: 'Your name'
    },
    backstory: [
      { eyebrow: 'Second Sight Pawn', text: 'Your parents ran Second Sight Pawn for as long as you can remember. Thrift up front, antiques in the window, a brass bell over the door that always stuck.' },
      { eyebrow: 'House rules',       text: 'Growing up, there were two rules. Never go in the back room. Never go down to the basement. You figured it was about inventory.' },
      { eyebrow: 'Six weeks ago',     text: 'They locked up one night and never came home. The police found the register balanced, the lights off and the basement door standing open. Nobody has seen them since.' },
      { eyebrow: 'The keys',          text: 'The shop is yours now, {name}. So are the keys they never let you use.' }
    ],
    rideCard: {
      eyebrow: 'Getting around',
      title: 'How do you get around town?',
      text: 'Errand days are spent crossing the city. Whatever you pick has a catch, and every ride can be upgraded later.'
    },
    notice: {
      eyebrow: 'Delivered this morning',
      from: 'Office of Anomalous Property',
      title: 'Notice of Audit',
      body: '{shop}, licensee {name}. This establishment will be inspected in {days} days. Premises found in violation will be closed and their contents seized.',
      after: 'You have never heard of the Office of Anomalous Property. They seem to have heard of you.'
    },
    daily: {
      eyebrow: 'Daily run',
      title: 'Today’s city',
      text: 'Everyone who opens the shop today gets the same city: the same customers at the door, the same maps at night, the same finds in the dark. What you make of it is yours. Endless rules: no audit, the rent climbs, and the score is what counts.'
    },
    endless: {
      eyebrow: 'No notice came',
      text: 'No audit is coming. Just the rent, the Heat and whatever is waiting in the basement. The rent goes up every week, and the Office looks a little harder every two. Climb the ranks and keep the doors open as long as you can.'
    }
  },

  /* Campaign story. Letters arrive in the morning: faction letters when your standing
     reaches `rep` (the last one only for the faction you pledged to), Office letters at a
     share of the campaign (`at`), and neighborhood letters as the shop's own name grows
     (`name`, a share of the target). Each faction tells a different story about your parents. */
  letters: [
    { id: 'techmage1', fac: 'techmage', rep: 10, from: 'Wren Okafor · the Faraday Circle', title: 'A receiver with your father’s initials',
      text: 'Your father built half the receivers at the Relay. He stopped coming the year you were born and never said why. We always assumed he heard something under the shop that he did not want to share. We would like to hear it too.' },
    { id: 'techmage2', fac: 'techmage', rep: 25, from: 'Dr. Ilse Varga · the Faraday Circle', title: 'Two voices on a dead band',
      text: 'For three weeks the Relay has picked up two voices on a band nobody broadcasts on. They count backward from a thousand and start over. Last night one of them stopped counting and said “{name}.” We would like you to come listen.' },
    { id: 'techmage3', fac: 'techmage', rep: 45, pledged: true, from: 'Patch · the Faraday Circle', title: 'We triangulated',
      text: 'The voices are not coming from anywhere in the city. They are coming from under it, from directly below your shop. Leave the basement as it is. The day the Office comes, we will be there with every antenna we own.' },

    { id: 'corporate1', fac: 'corporate', rep: 10, from: 'Mr. Castellane · Halberd & Vane', title: 'Regarding an open account',
      text: 'Your parents held an account with the firm for nineteen years. Accounts outlive their holders, legally speaking. We would be pleased to discuss the balance with you, at your convenience and at ours.' },
    { id: 'corporate2', fac: 'corporate', rep: 25, from: 'Ms. Holloway · Halberd & Vane', title: 'The collateral clause',
      text: 'Your parents’ contract pledged “the contents of the lower premises” as collateral. It also names a successor to the agreement. The successor is you, {name}. Nobody reads the whole contract. We always do.' },
    { id: 'corporate3', fac: 'corporate', rep: 45, pledged: true, from: 'Mr. Castellane · Halberd & Vane', title: 'The thirteenth floor',
      text: 'The thirteenth floor is expecting you after the audit. The elevator will know. Wear something you do not mind losing. Your parents did.' },

    { id: 'hunters1', fac: 'hunters', rep: 10, from: 'Big Teo · the Night Shift', title: 'Your mom set the best traps',
      text: 'Your mom ran with the Shift before you were born. Best trap-setter we ever had, and she could not stand the sight of blood. Your dad kept the salt dry. They were ours before they were yours, kid.' },
    { id: 'hunters2', fac: 'hunters', rep: 25, from: 'Sister Agathe · the Night Shift', title: 'We found her coat',
      text: 'Six weeks ago your parents went down Line 9 after the thing that nests under the Narrows. They did not come up. Last week we found your mother’s coat on the third platform. It was folded. Things down there do not fold coats.' },
    { id: 'hunters3', fac: 'hunters', rep: 45, pledged: true, from: 'Marisol Reyes · the Night Shift', title: 'We found the nest',
      text: 'We found the nest. We found something else too. You should see it before you decide what you are. After the audit, bring salt and do not bring hope.' },

    { id: 'office1', fac: 'office', rep: 10, from: 'Agent Ruth Mbeki · Office of Anomalous Property', title: 'Off the record',
      text: 'Your parents were registered informants with this Office for twelve years. That is more than I am permitted to tell you. It is less than you deserve to know.' },
    { id: 'office2', fac: 'office', rep: 25, from: 'Deputy Assessor Lund · Office of Anomalous Property', title: 'File 77-B',
      text: 'Your parents appear in File 77-B under the status “retained.” I have worked here thirty years. Retained is not a word we use for people.' },
    { id: 'office3', fac: 'office', rep: 45, pledged: true, from: 'Agent Ruth Mbeki · Office of Anomalous Property', title: 'Clearance granted',
      text: 'Your clearance came through. Sub-basement four, under the City Hall annex. After the audit, bring your badge and leave your expectations upstairs.' },

    { id: 'reminder', at: 0.25, from: 'Office of Anomalous Property', title: 'Reminder of audit',
      text: 'The inspection of {shop} is scheduled in {days} days. It covers the storefront, the back case and all lower premises. Premises found in violation will be closed.' },
    { id: 'checklist', left: 7, from: 'Office of Anomalous Property', title: 'Inspection checklist',
      text: 'Inspectors will check: cursed stock offered for sale; cursed objects left unsealed in the lower premises; contained entities and the state of their seals; incidents reported to the news; current Heat; back rent owed; and your record with this Office.' },

    { id: 'okonkwo1', name: 0.2, from: 'Mrs. Okonkwo · across the street', title: 'Whose shop is it now?',
      text: 'Your mother sold me my first radio. Everybody on this block bought something here once. People are starting to say your name instead of hers, you know. So tell me: whose shop is this now? Theirs? The men in the good suits? Or yours?' },
    { id: 'okonkwo2', name: 0.5, page: 'p5', from: 'Mrs. Okonkwo · across the street', title: 'Something from the estate sale',
      text: 'After your parents went missing, a man sold off a box of their things on the sidewalk. I bought what I could. This page was folded inside a cookbook. I think it was meant for you.' }
  ],

  /* The pledge, halfway through the campaign. */
  pledge: {
    eyebrow: 'Halfway to the audit',
    title: 'Four letters on the mat',
    text: 'Every faction wants the same thing this morning: your signature. Whoever you sign with can trust you with everything. Everyone else will only ever be a friend, and your pledge’s rival will take it personally.',
    offers: {
      techmage:  'Sign with the Circle and every antenna in the city turns to the dead band your parents are talking on.',
      corporate: 'Sign the successor clause. The firm assumes your parents’ debt, and tells you where the collateral went.',
      hunters:   'Swear in with the Shift, and when we go down Line 9 for them, you come with us.',
      office:    'Pledge to the Office and receive clearance. Clearance opens File 77-B.'
    },
    self: 'Or sign nothing, and put your own name on the door.',
    selfDone: 'You put the four letters in a drawer. The shop answers to you.'
  },

  /* Your parents' ledger: six loose pages. Found as you go; each one is a hint. */
  pages: [
    { id: 'p1', how: 'Found in the back room, wedged behind a shelf.', text: 'If you are reading this, we did not come back up. Do not trust anyone who says they know where we went. They all want the basement, and they will all tell you a different story.' },
    { id: 'p2', how: 'Taped inside a containment cell door.', text: 'The cells hold. The other door does not, not on its own. Whatever you catch, keep it close. Every one you sell is a key handed to someone else.' },
    { id: 'p3', how: 'Tucked into the research notes.', text: 'All four of them offered us a deal. Each one wanted the shop to wear their name. Your father said a shop is only as safe as the name on the door, and that name should be ours.' },
    { id: 'p4', how: 'The librarian kept it for you.', text: 'The door downstairs opens from this side for one kind of person only: someone the neighborhood vouches for and nobody owns.' },
    { id: 'p5', how: 'Mrs. Okonkwo bought it at the estate sale.', text: 'Serve the walk-ins. Tell the truth on the tags. The city remembers, and the city is what the door listens to.' },
    { id: 'p6', how: 'Pinned under a stone in one of the zones.', text: 'Whatever happens, do not brick up the basement, and do not let anyone buy it. We will need it open. Love, Mom and Dad.' }
  ],

  /* The other door in the basement (Phase 11e). */
  door: {
    open: 'In the night the other door in the basement opened by itself. Behind it, stairs go down under Old Market, and your parents’ chalk arrows point the way. It is on the Night tab now.',
    reopen: 'The other door in the basement is open again.',
    shut: 'The other door in the basement is shut, and it will not move. It does not open for anyone who belongs to someone.',
    campRoom: 'your parents’ camp',
    camp: 'Two bedrolls, a camp stove gone cold, and your father’s handwriting on the wall: a tally of days that stops in the middle of a week. Under it, in your mother’s: “Not yet. Keep the name.”',
    hints: [
      'The basement door rattles once in the night, from the wrong side.',
      'There is chalk on the basement floor this morning: an arrow pointing at the back wall.',
      'You hear your name from downstairs. Nobody is down there.',
      'The back wall of the basement is warm to the touch, like a door with a room behind it.'
    ]
  },

  /* The shop's own name, once people start saying it. Shown in Standing from 20% of the target. */
  nameLabels: [[0.5, 'Known on the block'], [1, 'Talked about'], [Infinity, 'A name of its own']],
  nameLines: [
    'A kid on the stoop calls it “the honest pawn place.” Not your parents’ place. Yours.',
    'Someone has chalked SECOND SIGHT on the sidewalk with an arrow pointing at your door.',
    'The bell over the door sticks. A regular fixes it with a paperclip on the way in.'
  ],

  morningLines: [
    'The bell over the door sticks, like always.',
    'Someone slid a flyer under the door overnight. It is blank.',
    'The radiator knocks three times and stops.',
    'Coffee, keys, a long look at the basement door.',
    'A pigeon watches you unlock the shutters. It does not blink.'
  ],

  /* The last line of the end-of-day recap (js/recap.js), by how the day went. */
  recapLines: {
    good: [
      'You count the drawer twice. It comes out the same both times. Good night.',
      'The neon buzzes like it approves. You turn it off anyway.',
      'A good day. In this city, that means nobody followed you home.',
      'You lock the cash box and, for once, sleep before the radiator starts knocking.'
    ],
    flat: [
      'Nothing gained, nothing lost. The basement door stays shut.',
      'The kind of day nobody writes down. You write it down anyway.',
      'Rain on the shutters. The ledger closes on a quiet page.',
      'Same street, same bell, same long look at the basement door.'
    ],
    bad: [
      'You pour a short one and do not look at the ledger again tonight.',
      'Somewhere across town, someone is saying the name of your shop. Not kindly.',
      'The drawer is lighter than this morning. So is your luck.',
      'You check the locks twice. Then a third time.'
    ]
  }
});
