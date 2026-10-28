/* data/city.js — the City tab. On an errand day the shop is closed and you get a few
   hours (6, up to 8 as your ride is upgraded) to spend around town. On foot, getting
   somewhere costs 1 hour if it is close, 2 if it is across town; most rides make
   every trip an hour, each with a catch. Each place has things to do, most costing
   an hour or two. Buying things costs no time.

   x, y are positions on the map, in percent. */
'use strict';

Object.assign(DATA, {
  districts: [
    { id: 'oldmarket', name: 'Old Market',      x: 50, y: 52 },
    { id: 'westside',  name: 'Westside',        x: 16, y: 30 },
    { id: 'kessler',   name: 'Kessler Heights', x: 76, y: 16 },
    { id: 'eastgate',  name: 'Eastgate',        x: 84, y: 54 },
    { id: 'narrows',   name: 'The Narrows',     x: 28, y: 76 },
    { id: 'harbor',    name: 'Harbor Row',      x: 70, y: 86 }
  ],
  travel: { near: 36, nearCost: 1, farCost: 2 },   // distance on the map under `near` costs 1 hour

  locations: [
    { id: 'shop', name: 'Second Sight Pawn', icon: 'shop', district: 'oldmarket', x: 50, y: 50, home: true,
      blurb: 'The shop. The sign says CLOSED. Head home from anywhere when you are done.' },
    { id: 'apartment', name: 'Your apartment', icon: 'door', district: 'oldmarket', x: 40, y: 60,
      blurb: 'Two rooms above a dry cleaner on Pell Street. The landlord lives downstairs.',
      actions: ['rest', 'landlord'] },
    { id: 'relay', name: 'The Relay', icon: 'techmage', district: 'westside', x: 14, y: 22, faction: 'techmage',
      blurb: 'The Faraday Circle meets above a shuttered radio-repair shop. Every surface hums.',
      actions: ['deliver', 'job', 'calibrate'] },
    { id: 'tower', name: 'Halberd & Vane Tower', icon: 'corporate', district: 'kessler', x: 86, y: 12, faction: 'corporate',
      blurb: 'Forty floors of black glass. The thirteenth is not on the elevator panel, but you are expected there.',
      actions: ['deliver', 'job', 'lawyers'] },
    { id: 'firehouse', name: 'Engine 9 Firehouse', icon: 'hunters', district: 'harbor', x: 82, y: 82, faction: 'hunters',
      blurb: 'Decommissioned in 1981. The Night Shift keeps the pole polished and the salt dry.',
      actions: ['deliver', 'job', 'train'] },
    { id: 'office', name: 'Office of Anomalous Property', icon: 'office', district: 'eastgate', x: 88, y: 46, faction: 'office',
      blurb: 'A City Hall annex with frosted glass and a take-a-number machine that never moves. The transit authority keeps a window in the lobby.',
      actions: ['paperwork', 'surrender', 'deliver', 'job'] },
    { id: 'hardware', name: 'Kowalski Hardware', icon: 'hammer', district: 'eastgate', x: 74, y: 62,
      blurb: 'Third-generation hardware store. Mrs. Kowalski sells salt by the sack and asks no questions.',
      sells: ['salt', 'scrap', 'vials', 'jar', 'cell'] },
    { id: 'autoshop', name: 'Delgado Cycle & Auto', icon: 'wrench', district: 'harbor', x: 46, y: 93,
      blurb: 'Bikes hang from the ceiling and a van is always up on the lift. Ray Delgado fixed your dad’s van for twenty years and never once asked about the scorch marks.' },
    { id: 'market', name: 'The Night Market', icon: 'glint', district: 'narrows', x: 18, y: 84,
      blurb: 'Folding tables under the Route 9 overpass. Open in daylight if you know which tarp to knock on.',
      actions: ['browse', 'fence'] },
    { id: 'library', name: 'Kessler University Library', icon: 'book', district: 'kessler', x: 64, y: 22,
      blurb: 'The special collections room has a lock on the inside and a librarian who knew your parents.',
      actions: ['study', 'readup'] },
    { id: 'z-laundromat', name: 'Suds 24-Hr Laundromat', icon: 'washer', district: 'westside', x: 26, y: 38, zone: 'laundromat',
      blurb: 'In daylight it is just a laundromat. Mostly.', actions: ['scout'] },
    { id: 'z-subway', name: 'Line 9 entrance', icon: 'train', district: 'narrows', x: 36, y: 86, zone: 'subway',
      blurb: 'A chained gate at the bottom of the stairs. The chain has been cut and put back.', actions: ['scout'] },
    { id: 'z-garage', name: 'Level B4 Garage', icon: 'car', district: 'harbor', x: 60, y: 80, zone: 'garage',
      blurb: 'A parking structure with a lot of empty levels and one that is never empty.', actions: ['scout'] },
    { id: 'z-hospital', name: 'St. Agnes Hospital', icon: 'hospital', district: 'kessler', x: 76, y: 30, zone: 'hospital',
      blurb: 'Condemned, fenced, and lit on the fourth floor.', actions: ['scout'] }
  ],

  /* Things to do. hours = errand hours spent. once: 'day' (once per errand day) or 'rent' (once per rent period). */
  cityActions: {
    rest:      { name: 'Rest',                hours: 1, once: 'day', stress: 15, note: 'Lie down for an hour. −15 Stress before tonight.' },
    landlord:  { name: 'Talk to the landlord', hours: 1, once: 'rent', forgive: 30, note: 'Clears the strikes against you and forgives up to $30 of back rent. Once per rent period.' },
    deliver:   { name: 'Make a delivery',     hours: 1, note: 'Sell them something from the back case directly. They test it on the spot.' },
    job:       { name: 'Take a job',          hours: 2, once: 'day', rep: 5, note: 'Do them a favor. +5 standing and some cash, but their rival hears about it.' },
    calibrate: { name: 'Borrow their bench',  hours: 1, once: 'day', note: 'The Circle recalibrates every instrument you own, free.' },
    lawyers:   { name: 'Use their lawyers',   hours: 1, once: 'day', cost: 40, heat: -12, note: 'For $40, a letter on Halberd & Vane paper makes the Office look elsewhere. −12 Heat.' },
    train:     { name: 'Train with them',     hours: 1, once: 'day', research: 10, note: 'They walk you through their case files. +10% research on every cryptid you have met.' },
    paperwork: { name: 'File paperwork',      hours: 2, once: 'day', heat: -10, note: 'Fill out the forms nobody else bothers with. −10 Heat.' },
    surrender: { name: 'Turn in a curse',     hours: 1, heat: -8, bounty: 15, note: 'Hand over something from the back case. If it really is cursed: −8 Heat and a $15 bounty. If not, they keep it anyway.' },
    browse:    { name: 'Browse the stalls',   hours: 1, once: 'day', note: 'Three unmarked lots, priced by people who think they know what they have.' },
    fence:     { name: 'Fence an item',       hours: 1, rate: 0.7, heat: 2, note: 'Sell from the back case for 70% of its fair price. No questions, no evening news. +2 Heat.' },
    study:     { name: 'Study',               hours: 1, mins: 60, note: 'Put an hour into a research project without using bench time.' },
    readup:    { name: 'Read up on a cryptid', hours: 1, research: 20, note: '+20% research on one cryptid you have met.' },
    scout:     { name: 'Scout it',            hours: 1, once: 'day', note: 'Walk the outside in daylight. Tonight every hazard inside is already marked, and you know where one more find is.' }
  },

  /* Faction jobs: what the favor is, and what it pays. */
  jobs: {
    techmage:  { text: 'You bolt a listening coil to a water tower in the Narrows. It starts humming before you finish.', cash: 40 },
    corporate: { text: 'You deliver a sealed envelope to a judge’s house and do not look inside.', cash: 60, heat: 2 },
    hunters:   { text: 'You help bait a trap under the Line 9 platform. Something tested the bait while you were still there.', cash: 40, stress: 10 },
    office:    { text: 'You inventory a condemned estate in Eastgate for the Office and initial every page. Two items on the list were not in the house.', cash: 30, heat: -4 }
  },
  /* Rival pairs: standing gained with one costs a third as much with the other. */
  rivals: { techmage: 'hunters', hunters: 'techmage', corporate: 'office', office: 'corporate' },

  /* Things for sale. Buying takes no time. kit = goes to state.kit. */
  shopItems: {
    salt:    { name: 'Sack of salt',      qty: 4, cost: 12, mat: 'salt' },
    scrap:   { name: 'Box of scrap',      qty: 3, cost: 25, mat: 'scrap' },
    vials:   { name: 'Reagent vials',     qty: 4, cost: 20, mat: 'vials' },
    jar:     { name: 'Containment jar',   qty: 1, cost: 20, kit: 'jar' },
    cell:    { name: 'Battery pack',      qty: 1, cost: 25, kit: 'cell' }
  },

  /* How you get around. Picked on the opening cards; each ride upgrades twice, and the
     last tier always reaches 8 errand hours with the catch gone.
       far:   hours for a trip across town (a near trip is always 1)
       trips: rides per errand day before you are back on foot (bus)
       carry: purchases you can carry home per errand day (bike)
       fuel:  cash per errand day; heat: Heat per errand day (van)
       bag:   extra night-run bag slots (van) */
  rides: {
    bike: {
      name: 'Mom’s ten-speed', icon: 'bike', upgradeAt: 'autoshop',
      pitch: 'Every trip is an hour, near or far.', catch: 'A wire basket: carry home only two purchases per errand day.',
      tiers: [
        { name: 'Ten-speed bicycle', hours: 0, far: 1, carry: 2 },
        { name: 'Cargo trike', cost: 200, hours: 1, far: 1, carry: 4, note: 'A big front bin. Carry four purchases a day, and +1 errand hour.' },
        { name: 'Electric cargo bike', cost: 400, hours: 2, far: 1, note: 'No carry limit, and +2 errand hours.' }
      ] },
    bus: {
      name: 'A bus pass', icon: 'bus', upgradeAt: 'office',
      pitch: 'Every ride is an hour, near or far.', catch: 'The pass covers three rides per errand day. After that you walk.',
      tiers: [
        { name: 'Weekly bus pass', hours: 0, far: 1, trips: 3 },
        { name: 'Monthly transit pass', cost: 180, hours: 1, far: 1, trips: 5, note: 'Five rides a day, and +1 errand hour.' },
        { name: 'Express card', cost: 380, hours: 2, far: 1, note: 'Bus and subway, unlimited rides, and +2 errand hours.' }
      ] },
    van: {
      name: 'Dad’s van', icon: 'van', upgradeAt: 'autoshop',
      pitch: 'Every trip is an hour, and two extra bag slots on night runs.', catch: 'Gas costs $12 every errand day, and the Office knows the plates: +3 Heat each time you drive.',
      tiers: [
        { name: 'Rust-bucket van', hours: 0, far: 1, fuel: 12, heat: 3, bag: 2 },
        { name: 'Rebuilt engine', cost: 220, hours: 1, far: 1, fuel: 6, heat: 3, bag: 2, note: 'Half the gas, and +1 errand hour. The plates are still the plates.' },
        { name: 'New paint, new plates', cost: 420, hours: 2, far: 1, fuel: 6, bag: 2, note: 'Nobody recognizes it now. No Heat, and +2 errand hours.' }
      ] },
    foot: {
      name: 'Your own two feet', icon: 'boot', upgradeAt: 'autoshop', startCash: 150,
      pitch: 'You sold the old car to pay the lawyer: start with $150 more.', catch: 'Close trips are an hour. Crossing town takes two.',
      tiers: [
        { name: 'On foot', hours: 0, far: 2 },
        { name: 'Secondhand scooter', cost: 250, hours: 1, far: 1, note: 'Every trip is an hour, and +1 errand hour.' },
        { name: 'Motorcycle', cost: 450, hours: 2, far: 1, note: 'Every trip is an hour, and +2 errand hours.' }
      ] }
  },
  rideOrder: ['bike', 'bus', 'van', 'foot'],

  /* The Night Market's lots: leaning magical, priced well over the surface estimate. */
  nightMarket: { lots: 3, odds: { inert: 25, enchanted: 45, cursed: 30 }, price: [1.4, 2.6] },

  /* Scouting: hazards known, plus one extra find. */
  scout: { extraFind: 1 }
});
