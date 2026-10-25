/* data/endings.js — the audit and the endings.
   The audit scores a list of checks. The total decides one of three outcomes, and the
   faction you pledged to decides the epilogue. Your parents' fate is only revealed if
   you maxed that faction (standing 45+). One true ending sits outside all of that. */
'use strict';

Object.assign(DATA, {
  audit: {
    /* Points per check. A total of `cleared` or more clears the shop; `closed` or less closes it. */
    cleared: 0, closed: -5,
    mislabeled: -2, mislabeledMax: -6,         // cursed stock not tagged cursed, each
    openCurse: -1,                             // cursed stock tagged honestly but not sealed, each
    basementCurse: -1, basementMax: -3,        // unsealed cursed objects in the lab
    weakCell: -1, weakAt: 50, cellsMax: -3,    // contained entities below 50% seal, each
    breakout: -1, breakoutMax: -2,             // entities that ever broke out
    incidentsPer: 2, incidentsMax: -3,         // -1 per 2 news incidents
    heat: [[30, 1], [60, 0], [80, -1], [Infinity, -2]],
    rentShort: -1, rentDeep: -2,               // any back rent / more than one week's rent
    officeGood: 20, officeBad: -15,            // +1 / -1 for your standing with the Office
    surrendered: 3                             // +1 for turning in this many curses
  },

  /* Hiding the basement before the audit. Each passes on paper and costs you later. */
  hide: {
    window: 7,                                 // offered in the last 7 days
    brick: { name: 'Brick up the basement door', cost: 120, scrap: 4, mins: 120,
      note: 'Inspectors will find a wall. The lab and the cells stay behind it, untouched.' },
    lawyers: { name: 'Have Halberd & Vane make a call', cost: 250, rep: 20,
      note: 'The inspectors will be told the lower premises are under private review. The Office will not like it.' }
  },

  outcomes: {
    cleared:   { name: 'Cleared',   stamp: 'CLEARED',   text: 'The lead inspector signs the last page, tears off your copy and leaves without a word. The shop stays open.' },
    probation: { name: 'Probation', stamp: 'PROBATION', text: 'The shop stays open under a notice of probation. Inspectors will be back, unannounced, for as long as the Office feels like it.' },
    closed:    { name: 'Closed',    stamp: 'CLOSED',    text: 'They seal the door with orange tape and a lead stamp. Everything inside, upstairs and down, now belongs to the city.' }
  },

  /* What happens to the shop, by the faction you pledged to and the audit outcome. */
  epilogues: {
    techmage: {
      cleared:   'The Circle moves in the week after the audit. Antennas on the roof, cable down the basement stairs, someone always on headphones in the back room. The shop stays yours on paper. In practice it becomes the Relay’s best ear.',
      probation: 'The Circle keeps its equipment in your back room and its distance in public. Every surprise inspection, a van parked down the block packs up an hour before the Office arrives. You never ask how they know.',
      closed:    'The Office seals the shop with the Circle’s gear still inside. Wren Okafor buys you a coffee and says they will get it back. Months later the Relay’s lights go dark one night and do not come back on.'
    },
    corporate: {
      cleared:   'Halberd & Vane send flowers with no card. A month later the shop has new shelving, a new alarm system and a new silent partner whose name never appears on anything you sign.',
      probation: 'The firm’s lawyers turn probation into paperwork, then the paperwork into an arrangement. The bell over the door still sticks. Nobody at Halberd & Vane will authorize having it fixed.',
      closed:    'The city seizes the shop, and within the week the city sells it to a holding company with a Kessler Heights address. The sign out front still says Second Sight Pawn. You do not have a key.'
    },
    hunters: {
      cleared:   'The Shift starts using the basement as a waystation. Muddy boots on the stairs at four in the morning, salt on every windowsill, Big Teo asleep on a cot by the cells. The neighborhood has never been safer, or louder.',
      probation: 'The Shift stops coming to the front door. They come through the alley instead, after midnight, and leave things for the cells that you are told not to look at.',
      closed:    'The Office seals the shop and the Shift breaks the seal two nights later. When the inspectors come back, the cells are empty and the basement smells like burnt salt.'
    },
    office: {
      cleared:   'The Office makes Second Sight Pawn a licensed collection point. A brass plaque goes up by the door. Half the neighborhood stops coming in. The other half starts bringing you things they are afraid of.',
      probation: 'Agent Mbeki calls it a formality. She visits every week anyway, and every week she stands at the top of the basement stairs a little longer than she needs to.',
      closed:    'The Office closes the shop and offers you a desk job instead. Data entry, sub-basement two. Every file you type up is about a shop just like yours.'
    },
    self: {
      cleared:   'The shop stays open and stays yours. Nobody sends flowers. Nobody sends letters. Every faction in the city leaves you alone, which is not the same thing as being safe.',
      probation: 'The shop stays open, barely. Without anyone powerful in your corner, the inspectors come back every month, and every month they look a little longer at the basement door.',
      closed:    'The city closes the shop. None of the factions return your calls. You stand across the street and watch them carry the shelves out, one by one.'
    }
  },

  /* What happened to your parents. Maxed reveals it; otherwise it stays open. */
  fates: {
    techmage: {
      maxed: 'On the first night, with every antenna in the city turned to the dead band, you hear them clearly. Your mother is laughing at something. Your father says your name. They are alive, somewhere the signal reaches and you cannot. They do not know how to come back. The Circle records every word, and asks you to keep listening.',
      open:  'Some nights the radio in the back room catches two voices counting backward. Sometimes you are sure it is them. Sometimes it is only static that sounds like people you miss.',
      short: 'Alive, out of reach'
    },
    corporate: {
      maxed: 'The thirteenth floor is open plan. Your parents sit at facing desks behind a wall of glass, signing documents one after another. They are alive. They do not look up. Mr. Castellane explains that the contract runs ninety-nine years and is fully transferable, and that there is a desk available next to them.',
      open:  'Mr. Castellane tells you, very gently, that your parents’ account is closed. In his mouth the word sounds like a body. He will not say anything else, and his assistant shows you out.',
      short: 'Alive, bound by contract'
    },
    hunters: {
      maxed: 'Under the third platform of Line 9, the Shift finds your parents’ gear laid out neatly on a tarp, and a thing in the dark wearing your mother’s coat. It calls your name in her voice until Big Teo puts it down. You carry the coat home. You do not let yourself wonder what else was down there.',
      open:  'The Shift goes back down Line 9 without you. They do not find your parents. One of them does not come back up either. Nobody blames you out loud.',
      short: 'Gone below Line 9'
    },
    office: {
      maxed: 'Sub-basement four is a long white corridor of numbered doors. Behind 77-B, through a window of very thick glass, your parents sit at a small table playing cards. They are alive, and they wave. Agent Mbeki explains they will be retained until “the matter under the shop” is resolved. You may visit monthly.',
      open:  'File 77-B arrives in a manila envelope, redacted from the first page to the last. One word on the final page was missed by the black marker: pending.',
      short: 'Alive, retained by the city'
    },
    self: {
      open:  'The basement door at the back of the lab stays shut. Some nights you put your hand on it and feel it is warm. Some nights something on the other side knocks, twice, the way your father used to knock on your bedroom door.',
      short: 'Unknown'
    }
  },

  /* The true ending: no faction maxed, the shop's own name made, every page found, the audit
     survived and the basement left open. */
  trueEnding: {
    eyebrow: 'The shop’s own name',
    cards: [
      'The day after the audit, you take the last page of the ledger down to the basement. Past the lab and the cells there is a door you have walked by a hundred times. It has no handle on this side. It never needed one. It was waiting for someone the neighborhood vouches for and nobody owns.',
      'Each faction had a piece of the truth and sold it to you as the whole. Your parents went through to close something from the other side, and they could only come back if the person on this side belonged to no one.',
      'You put your hand on the door, and it opens. They come up the stairs thinner and older and squinting at the light, and your mother laughs at how dusty the shelves are. The bell over the door sticks. Nobody fixes it.'
    ],
    stamp: 'HOME',
    short: 'Home'
  },

  /* Added to the ending if the basement was hidden from the audit. */
  codas: {
    brick: 'Behind the new brick, something knocks every night at 3:17. Twice, then a pause, then twice again. You leave the radio on loud.',
    lawyers: 'Halberd & Vane never send a bill for the phone call. Six months later, a courier delivers a deed to the lower premises with the firm’s name on it, and a key that fits the basement door.'
  }
});
