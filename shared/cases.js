/* data/cases.js — Case files (Phase 12c): the game's achievements.
   Each one: id, name, icon (js/ui/icons.js), goal (shown while it is still closed),
   text (one noir line, shown once it is opened), secret (hidden until opened),
   mode ('campaign' | 'endless' | undefined for both), and when(st) → true once earned.
   Checked after every change by Cases.check (js/cases.js). Never in a modded save. */
'use strict';

Object.assign(DATA, {
  cases: [
    /* ----- the counter ----- */
    { id: 'first-ticket', name: 'First Ticket', icon: 'tagbuy', goal: 'Sell your first item.',
      text: 'The bell rang, the drawer opened, and the shop was yours.', when: st => st.counters.sold >= 1 },
    { id: 'big-ticket', name: 'Big Ticket', icon: 'coins', goal: 'Make a single sale of $200 or more.',
      text: 'You kept a straight face until the door closed behind them.', when: st => (st.counters.bestSale || 0) >= 200 },
    { id: 'hard-bargain', name: 'Hard Bargain', icon: 'cash', goal: 'Buy from a seller for half their opening price or less.',
      text: 'They walked out lighter and thanked you for it.', when: st => (st.counters.haggled || 0) >= 1 },
    { id: 'by-name', name: 'By Name', icon: 'seal', goal: 'Sell a faction an anomaly tagged with its right name.',
      text: 'They tested it on the spot. It was exactly what the tag said.', when: st => (st.counters.named || 0) >= 1 },
    { id: 'reputation', name: 'Reputation Precedes You', icon: 'glasses', goal: 'Name ten anomalies correctly for buyers.',
      text: 'Collectors across town have started saying your name like a guarantee.', when: st => (st.counters.named || 0) >= 10 },
    { id: 'second-opinion', name: 'Second Opinion', icon: 'pen', goal: 'Get ten appraisals right.',
      text: 'People bring you things now just to hear what you will say.', when: st => (st.counters.appraisalsRight || 0) >= 10 },

    /* ----- the lab ----- */
    { id: 'bench-hand', name: 'Bench Hand', icon: 'loupe', goal: 'Run 25 tests at the bench.',
      text: 'Your fingertips smell of reagent and your lamp has a scorch mark.', when: st => st.counters.tests >= 25 },
    { id: 'clean-hands', name: 'Clean Hands', icon: 'office', goal: 'Turn in three cursed items at the Office.',
      text: 'The clerk has stopped going pale when you walk in.', when: st => (st.counters.surrendered || 0) >= 3 },

    /* ----- the night ----- */
    { id: 'first-light', name: 'First Light', icon: 'flashlight', goal: 'Come back from your first night run.',
      text: 'Dawn found you on the sidewalk with your bag and all ten fingers.', when: st => (st.counters.runs || 0) >= 1 },
    { id: 'night-shift', name: 'Night Shift', icon: 'moon', goal: 'Come back from 25 night runs.',
      text: 'You sleep through the day now. The city does not miss you.', when: st => (st.counters.runs || 0) >= 25 },
    { id: 'full-pockets', name: 'Full Pockets', icon: 'bag', goal: 'Come back from a run with a full bag.',
      text: 'You had to leave a perfectly good lamp behind. You still think about it.', when: st => (st.counters.fullBags || 0) >= 1 },
    { id: 'bump', name: 'Bump in the Night', icon: 'hand', goal: 'Drive off a cryptid in a fight.',
      text: 'It ran. You did not. Your hands shook for an hour.', when: st => Object.values(st.bestiary).some(b => b.banished > 0) },
    { id: 'specimen', name: 'Specimen', icon: 'jar', goal: 'Capture a cryptid and bring it home.',
      text: 'Something in the basement is scratching at the glass. It is yours now.', when: st => (st.counters.captives || 0) >= 1 },
    { id: 'field-guide', name: 'Field Guide', icon: 'book', goal: 'Meet every kind of cryptid in the four places on the Night tab.',
      text: 'Twelve pages of notes, and every one of them was earned in the dark.',
      when: st => DATA.species.filter(s => s.zone !== 'undercroft').every(s => st.bestiary[s.id] && st.bestiary[s.id].seen) },
    { id: 'know-enemy', name: 'Know Your Enemy', icon: 'script', goal: 'Research one cryptid all the way.',
      text: 'You know what it wants, what it fears, and what it does just before it lunges.', when: st => Object.values(st.bestiary).some(b => b.research >= 100) },

    /* ----- the shop's affairs ----- */
    { id: 'good-tenant', name: 'Good Tenant', icon: 'key', goal: 'Pay the rent on time five times.',
      text: 'The landlord nodded at you on the stairs. Nodded.', when: st => (st.counters.rentOnTime || 0) >= 5 },
    { id: 'cash-on-hand', name: 'Cash on Hand', icon: 'token', goal: 'Hold $2,000 at once.',
      text: 'You count it twice and hide it in three different places.', when: st => st.cash >= 2000 },
    { id: 'low-profile', name: 'Low Profile', icon: 'glint', goal: 'Start a morning with no Heat at all.',
      text: 'Nobody at the Office could pick your shop out of a lineup.', when: st => st.day > 1 && st.phase === 'morning' && st.heat <= 0 && !st.gameOver },
    { id: 'hot-seat', name: 'Hot Seat', icon: 'flame', goal: 'Wake up at 80 Heat or more and still open the doors.',
      text: 'There is a sedan across the street and it has not moved since Tuesday.', when: st => st.phase === 'day' && st.heat >= 80 && !st.gameOver },
    { id: 'top-ride', name: 'Top of the Line', icon: 'bus', goal: 'Upgrade your ride all the way.',
      text: 'You get around this city faster than the rumors do.', when: st => st.ride.tier > 0 && !Ride.next(st) },
    { id: 'open-seven', name: 'Open Seven Days', icon: 'sun', goal: 'Make it to day 8.',
      text: 'One week. The sign still says your parents’ name. For now.', when: st => st.day >= 8 },
    { id: 'long-haul', name: 'The Long Haul', icon: 'ledger', goal: 'Make it to day 30.',
      text: 'A month of mornings, and the radiator still knocks three times.', when: st => st.day >= 30 },

    /* ----- the campaign ----- */
    { id: 'paper-trail', name: 'Paper Trail', icon: 'envelope', goal: 'Find every page of your parents’ ledger.', mode: 'campaign',
      text: 'Six pages, in their handwriting. You read them until the creases tear.', when: st => st.story.pages.length >= DATA.pages.length },
    { id: 'passed', name: 'Passed Inspection', icon: 'check', goal: 'Clear the audit.', mode: 'campaign',
      text: 'The inspector signed the form without looking up. The shop stays yours.', when: st => !!st.gameOver && st.gameOver.type === 'audit' && st.gameOver.outcome === 'cleared' },
    { id: 'other-door', name: 'The Other Door', icon: 'door', goal: 'Come back up from Beneath Old Market.', secret: true,
      text: 'You climbed the last step and closed the door behind you. It did not want to close.', when: st => (st.counters.undercroft || 0) >= 1 },
    { id: 'homecoming', name: 'Homecoming', icon: 'lighter', goal: 'Find your parents’ camp.', secret: true,
      text: 'Two bedrolls, a cold stove, and a note with your name on it.', when: st => !!st.story.camp },
    { id: 'own-name', name: 'In Your Own Name', icon: 'shop', goal: 'Reach the true ending.', mode: 'campaign', secret: true,
      text: 'New paint on the door. Your name, and nobody else’s.', when: st => !!st.gameOver && !!st.gameOver.ending && st.gameOver.ending.kind === 'true' },

    /* ----- endless ----- */
    { id: 'collector', name: 'Collector', icon: 'gear', goal: 'Reach the Collector rank in Endless.', mode: 'endless',
      text: 'There are people in this city who would sell their mother to see your back room.', when: st => st.endless.rank >= 4 },
    { id: 'still-standing', name: 'Still Standing', icon: 'lock', goal: 'Last 100 days in Endless.', mode: 'endless',
      text: 'A hundred mornings. The Office has a whole drawer just for you.', when: st => st.day >= 101 }
  ]
});
