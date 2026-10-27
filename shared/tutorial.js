/* data/tutorial.js — the guided first day, just-in-time tips, and the codex.
   Tutorial steps wait for the real action: each has done(st) and, optionally, skip(st)
   for when the moment has passed. `at` lists spotlight targets in order of preference;
   the first one on screen gets the spotlight (later ones point the way there).
   `t` is the tutorial state: t.base is a snapshot taken when the tutorial started,
   t.flags holds anything a step needs to remember. */
'use strict';

const _benchIt = st => st.ui.bench && st.inventory.loot.find(x => x.uid === st.ui.bench && !x.job);
const _hasFind = st => st.inventory.loot.some(x => !x.job);
const _shelved = (st, t) => st.inventory.stock.length > t.base.stock;
const _nextDay = (st, t) => st.day > t.base.day;

Object.assign(DATA, {
  tutorial: [
    { id: 'welcome', manual: true, title: 'Your first day',
      text: 'This is your parents’ shop, and now yours. I can walk you through one whole day: the lab, the counter and the night. Each step waits for you to actually do it, and you can skip any of them.',
      buttons: [['Show me around', 'next'], ['I know the ropes', 'end']] },
    { id: 'lab', title: 'Downstairs',
      text: 'Your parents left three boxes in the basement lab. Head down.',
      at: ['#tab-lab'], done: st => st.ui.tab === 'lab', skip: (st, t) => !_hasFind(st) || _shelved(st, t) },
    { id: 'pick', title: 'The evidence bin',
      text: 'Everything you find or buy lands here, unidentified. Tap one to put it under the lamp.',
      at: ['#screen .tag:not(.is-job)', '#tab-lab'], done: st => !!_benchIt(st), skip: (st, t) => !_hasFind(st) || _shelved(st, t) },
    { id: 'test', title: 'Run the tests',
      text: 'Each instrument gives a reading, and each reading rules out what the find can’t be. Run two of them. Every test costs bench time, shown at the top.',
      at: ['[data-act="test"]:not([disabled])', '#screen .tag:not(.is-job)', '#tab-lab'],
      done: (st, t) => { const it = _benchIt(st); return it ? Lab.testsRun(it) >= 2 : _shelved(st, t); }, skip: (st, t) => !_hasFind(st) && !_shelved(st, t) },
    { id: 'verdict', title: 'Make the call',
      text: 'Pick the alignment that fits what is left: inert is safe for anyone, enchanted is faction money, cursed is trouble. If one anomaly is left, you can name it for a better price.',
      at: ['[data-act="align"]', '#screen .tag:not(.is-job)', '#tab-lab'],
      done: (st, t) => { const it = _benchIt(st); return it ? !!(it.draft && it.draft.alignment) : _shelved(st, t); }, skip: (st, t) => !_hasFind(st) && !_shelved(st, t) },
    { id: 'shelve', title: 'Tag it',
      text: 'Set a price and tag it for the back case. Customers only ever see your tag, never the truth.',
      at: ['[data-act="shelve"]', '[data-act="align"]', '#screen .tag:not(.is-job)', '#tab-lab'],
      done: _shelved, skip: (st, t) => !_hasFind(st) && !_shelved(st, t) },
    { id: 'open', title: 'Morning choice',
      text: 'Back upstairs. Every morning you choose: open the shop for customers, or close it for an errand day around the city.',
      at: ['[data-act="open-shop"]', '#tab-shop'], done: (st, t) => st.phase !== 'morning' || _nextDay(st, t) },
    { id: 'customer', title: 'A customer',
      text: 'Walk-ins want something safe and cheap. Faction buyers want a trait and pay full price only for a named anomaly. Offer something that fits, or send them on.',
      at: ['.panel.customer', '#tab-shop'], done: (st, t) => st.shop.served >= 1 || st.phase !== 'day' || _nextDay(st, t), skip: st => st.phase === 'errands' },
    { id: 'close', title: 'Closing time',
      text: 'Close up whenever you like. The evening news checks every sale against the truth, so a wrong tag comes back to bite.',
      at: ['[data-act="close-shop"]', '#tab-shop'], done: (st, t) => st.phase === 'night' || _nextDay(st, t), skip: st => st.phase === 'errands' },
    { id: 'errands', title: 'An errand day',
      text: 'Tap a pin to see a place. Trips cost hours, and so do most errands. Buying costs nothing. Head home when you are done.',
      at: ['.city-map', '#tab-city'], done: (st, t) => st.phase === 'night' || _nextDay(st, t) },
    { id: 'night', title: 'After dark',
      text: 'Night is for scavenging. Pick a zone for new finds, or just sleep. Inside, your light, stamina and nerves all run down.',
      at: ['[data-act="enter"]:not([disabled])', '#tab-scavenge'], done: (st, t) => !!st.run || _nextDay(st, t) || t.flags.inRun },
    { id: 'run', title: 'In the zone',
      text: 'Move with the pad or tap the map. Pick up what glints, avoid hazards, and get back to the exit before your light dies. Anything that reaches you starts a fight.',
      at: ['#map-vp'], done: (st, t) => !st.run && !!t.flags.inRun, skip: (st, t) => !st.run && !t.flags.inRun && _nextDay(st, t) },
    { id: 'sleep', title: 'Home to bed',
      text: 'Sleep to start the next day. Rent comes due every week, and if you are short it becomes back rent with a late fee, never a game over.',
      at: ['[data-act="sleep"]', '#tab-shop'], done: _nextDay },
    { id: 'done', manual: true, title: 'That’s a day',
      text: 'That is the whole loop. New things get a short tip the first time they turn up, and the Codex in the Menu explains everything in detail.',
      buttons: [['Got it', 'end']] }
  ],

  /* Shown once per save, the first time each situation comes up. */
  tips: [
    { id: 'seller', when: st => st.shop.current && st.shop.current.kind === 'sell',
      text: 'Sellers haggle. Offer below their asking price; they will tell you when you are close. Go too low and they walk out.' },
    { id: 'appraiser', when: st => st.shop.current && st.shop.current.kind === 'appraise',
      text: 'An appraisal job: the owner leaves the object for you to identify on the bench. File a report before you close. A right name pays double.' },
    { id: 'inspector', when: st => st.shop.current && st.shop.current.faction === 'inspector',
      text: 'An inspector from the Office. Let him look and he takes anything cursed from the back case, sealed or not. Clean books lower Heat.' },
    { id: 'faction', when: st => st.shop.current && st.shop.current.kind === 'buy' && st.shop.current.faction !== 'civilian',
      text: 'Faction buyers want a trait, and only pay full price for an anomaly named on the tag. A wrong name means a refund and lost standing.' },
    { id: 'heat', when: st => st.heat >= 40,
      text: 'Heat is the Office’s attention. Faction deals, news incidents and breakouts raise it; it cools a little every night. At 100, they raid the shop.' },
    { id: 'rent', when: st => st.day > 1 && st.rent.dueDay - st.day === 1,
      text: 'Rent is due tomorrow night. Whatever you cannot pay becomes back rent with a late fee, and the notice on the door scares customers off.' },
    { id: 'city', when: st => st.phase === 'errands' && st.ui.tab === 'city',
      text: 'Errand day. Your ride panel shows what each trip costs. Faction offices take deliveries and jobs; the library and the zones are worth a visit too.' },
    { id: 'contam', when: st => { const it = _benchIt(st); return !!(it && it.contam); },
      text: 'This find is contaminated. Readings through the grime are less often exact. Wash it at the basin first.' },
    { id: 'leak', when: st => !!st.overnight && st.phase === 'morning',
      text: 'An unsealed curse leaked overnight. Seal cursed finds in a jar at the basin, or get them out of the shop.' },
    { id: 'calibration', when: st => Object.values(st.cal).some(v => v < 60),
      text: 'Your instruments are drifting. Drifted tools still read honestly, just less often exactly. Recalibrate them at the Gear station.' },
    { id: 'fight', when: st => !!(st.run && st.run.encounter),
      text: 'A fight. Its next move is shown before it makes it. Scanning teaches you about it, and research makes captures and escapes easier next time.' },
    { id: 'stress', when: st => !!st.run && st.stress >= 60,
      text: 'Your nerves are going. At 100 you panic, run for the exit and drop half your bag. Leaving early is always allowed.' },
    { id: 'battery', when: st => !!st.run && st.battery <= 25,
      text: 'Your light is almost gone. In the dark you see less, and cryptids get closer before you notice them.' },
    { id: 'cells', when: st => st.containment.length > 0,
      text: 'Something is in a basement cell. Its seal weakens every night. Re-salt it at the Cells station before it reaches zero.' },
    { id: 'letter', when: st => !!(st.story && st.story.inbox.length),
      text: 'Something came for you. Letters and ledger pages wait on the Counter until you read them.' },
    { id: 'pledge', when: st => !!(st.story && st.story.pledgeDue),
      text: 'The pledge. Whoever you sign with decides how your story ends, and it is permanent. Read every offer.' },
    { id: 'lastweek', when: st => Audit.hideOpen(st),
      text: 'One week to the audit. Check the inspection checklist, seal anything cursed, and clear your back rent.' },
    { id: 'commission', when: st => !!(st.endless && st.endless.commission),
      text: 'A commission. Name the anomaly they want on a tag in the lab, then hand it over from the Counter before it is due.' },
    { id: 'lowmats', when: st => !st.run && (st.supplies.vials <= 1 || st.supplies.salt <= 1),
      text: 'Running low on materials. Kowalski Hardware sells vials and salt on an errand day, night runs turn up caches, and breaking down medical or photo finds gives vials.' }
  ],

  /* The codex: what everything means. Paragraphs are plain text. */
  codex: [
    { id: 'basics', title: 'The basics', icon: 'shop', body: [
      'Each day starts in the morning. Open the shop for customers, or close it for an errand day in the city. Either way, the night is for scavenging, and sleeping starts the next day.',
      'Cash pays the rent. Heat is how closely the Office of Anomalous Property is watching; at 100 they raid you and the run ends. Energy is spent on night runs and comes back when you sleep.',
      'Rent comes due every week. It never ends the game: what you cannot pay becomes back rent with a late fee and a little Heat, and the landlord’s notice costs you customers until it is paid.'] },
    { id: 'lab', title: 'The lab', icon: 'flask', body: [
      'Every find arrives unidentified. Under the lamp, each instrument gives a reading: the EMF meter, the UV lamp, chemical reagents and, once you buy one, the Spirit Box. Each reading rules out anomalies that could not produce it. The Lore Archive lists what is left.',
      'Readings are always honest, but not always exact. Worn instruments, contamination and drift make a reading a range instead of a single value. Higher tool levels and good calibration make exact readings more likely.',
      'Every test, wash, repair and project spends bench time, counted in minutes, with 6 hours a day (more with the Bench Lamp).',
      'Materials (reagent vials, salt, scrap and essence) are never sold in the lab. Buy vials, salt and scrap at Kowalski Hardware on an errand day, pick them up from caches on night runs, or break down finds: every find gives scrap, medical and photo finds give vials, and enchanted or cursed ones give essence.',
      'At the basin you can wash off contamination, restore condition, purify a curse with a rite, or seal a find in a jar. The Workshop crafts jars, wards, tinctures and battery packs; it makes things but sells nothing. The Desk runs research projects, and catalogues anomalies the archive has never seen.'] },
    { id: 'tags', title: 'Tags and alignment', icon: 'tagbuy', body: [
      'Inert finds are ordinary and safe for anyone. Enchanted finds do something good and are what factions pay for. Cursed finds do harm.',
      'Your tag is all a customer ever sees. Tag an item with only an alignment, or name the exact anomaly for full faction prices. Untested items can be shelved too, but factions will not touch them.',
      'Sell a curse to a walk-in and it makes the evening news: Heat, and a worse name for the shop. Name an anomaly wrong to a faction and they want their money back.'] },
    { id: 'counter', title: 'The counter', icon: 'walkin', body: [
      'An open day brings a queue of people. Buyers ask for something; offer from the back case at your tag price, and they may counter. Sellers bring something to haggle over, and whatever you buy goes to the lab. Appraisers leave an object to identify and pay when they pick it up at closing.',
      'When you close, the evening news checks every sale against the truth. Honest sales raise a faction’s standing; wrong ones cost it.'] },
    { id: 'night', title: 'Night runs', icon: 'flashlight', body: [
      'Each zone costs energy to enter. Your flashlight battery drains as you move, stamina falls with every step, and stress rises in the dark and around cryptids. At 100 stress you panic and drop half your bag.',
      'Each zone is a building with its own shape: aisles of machines and back rooms at the laundromat, platforms and tracks in the subway, a pillared parking level in the garage, wards off one long corridor at St. Agnes. The layout changes every night. The minimap in the corner remembers everything you have seen.',
      'Hazards are hidden until you are close or have scouted the zone. Supplies on the floor top you up, and material caches (salt, scrap, lab glassware) restock the workshop. Get back to the exit to keep everything you found.',
      'Pack salt wards, calming tinctures and battery packs at the Workshop; each fires once per run when needed.'] },
    { id: 'fights', title: 'Fights and the bestiary', icon: 'wraith', body: [
      'A cryptid that reaches you starts a fight. Its next move is shown before it acts. Scan to learn about it, attack with an instrument, brace for a hit, try to capture it, or flee.',
      'Every cryptid shares the lab’s three clue axes: one instrument hits it twice as hard, one barely hurts it. Research carries over between fights and is kept in the Bestiary: past 50% you see its exact next move, and higher research makes captures and escapes easier.',
      'Captured cryptids live in basement cells. Their seals weaken every night; re-salt them or they break out. You can draw essence from them, sell them to a faction, or let them go.'] },
    { id: 'city', title: 'The city and your ride', icon: 'map', body: [
      'An errand day gives you hours to spend on the City tab. Trips cost hours by distance and by your ride; most errands cost an hour or two; buying costs nothing.',
      'Each ride has a catch: the bike carries little, the bus pass runs out of rides, the van costs gas and draws Heat, and walking is slow across town. Every ride upgrades twice, up to 8 errand hours.',
      'Faction offices take deliveries and jobs and offer a perk. The Office takes paperwork and curses. Kowalski Hardware sells vials, salt, scrap, jars and battery packs. The Night Market sells mystery lots and fences stock. The library speeds research. Scouting a zone in daylight marks its hazards for that night.'] },
    { id: 'factions', title: 'Factions and standing', icon: 'techmage', body: [
      'Four factions buy from you: the Faraday Circle, Halberd & Vane, the Night Shift and the Office. Each wants different traits. Standing rises with honest sales and falls with false ones; at Blacklisted they stop coming in.',
      'The factions come in rival pairs: the Circle and the Night Shift, Halberd & Vane and the Office. Standing gained with one costs a little with its rival.'] },
    { id: 'campaign', title: 'The campaign', icon: 'office', body: [
      'The Office will audit the shop the morning after the last day. Halfway there comes the pledge: every faction asks you to sign with them. Only the faction you sign with can trust you completely, and its rival takes it personally.',
      'The audit inspects the storefront, the back case and the basement. Cursed stock, unsealed curses, weak cells, incidents, Heat, back rent and your record with the Office all count. The result is cleared, probation or closed.',
      'Letters arrive as you go, and loose pages of your parents’ ledger turn up. Read them closely. Not every ending belongs to a faction.'] },
    { id: 'endless', title: 'Endless', icon: 'seal', body: [
      'No audit and no story. Rent climbs every week, and every two weeks the Office pays closer attention: Heat cools more slowly, until it creeps up on its own, and the inspector comes sooner.',
      'Sales, captures and good work earn points. Points raise the shop’s rank, and each rank unlocks something: commissions, estate sales, more customers, a bigger bag, and slower Heat. Retire from the Menu to end a run and keep your score.'] },
    { id: 'cases', title: 'Case files', icon: 'seal', body: [
      'Case files are goals to chase across every game: sales, night runs, cryptids, the shop’s affairs, and a few sealed files that only open for those who keep digging. Open them from the Menu, the title screen or the end of a game.',
      'Opened files stay opened on this device, whichever save opened them. A save changed in god mode cannot open any more.'] },
    { id: 'seeds', title: 'Seeds and the Daily run', icon: 'key', body: [
      'Every game has a seed, a code like T4K2-DE56 shown in the Menu. Start a new game with that code and you get the same city: the same customers walking in, the same night maps and the same finds, day by day. What you do with them is up to you, so two players on one code soon have very different shops.',
      'The Daily run on the title screen uses one seed for everyone each calendar day, with Endless rules and a ride picked by the day. Your best score for each day is kept. Runs from a code are marked in your Endless best, and modded runs never count.'] }
  ],

  glossary: [
    ['Alignment', 'Inert, enchanted or cursed: what kind of thing an anomaly is.'],
    ['Anomaly', 'What a find really is. Each one gives a unique set of readings.'],
    ['Back case', 'Your shelf of tagged stock. Customers only buy from here.'],
    ['Back rent', 'Rent you could not pay, plus a late fee. It costs customers and Heat until cleared.'],
    ['Bench time', 'Minutes of lab work per day. Every test and job spends some.'],
    ['Breakout', 'A captured cryptid whose seal hit zero. Stress, Heat and a contaminated find.'],
    ['Calibration', 'How true an instrument reads. Drift makes exact readings rarer.'],
    ['Catalogue', 'Adding an anomaly the archive has never seen, from three exact readings.'],
    ['Commission', 'Endless: a faction’s request for one named anomaly, due within days.'],
    ['Condition', 'How well kept a find is. Better condition sells for more.'],
    ['Contamination', 'Grime that clouds one instrument’s readings until washed.'],
    ['Errand hours', 'Time to spend on an errand day: 6, up to 8 with ride upgrades.'],
    ['Essence', 'Residue from enchanted or cursed things, used in rites and crafting.'],
    ['Materials', 'Vials, salt, scrap and essence. Bought at Kowalski Hardware, found on night runs, or broken out of finds. Never sold in the lab.'],
    ['Evening news', 'The end-of-day report that checks every sale against the truth.'],
    ['Fence', 'Selling at the Night Market for 70% of fair price, with a little Heat.'],
    ['Heat', 'How closely the Office is watching. At 100 the shop is raided.'],
    ['Inner circle', 'Standing 45 or more with the faction you pledged to.'],
    ['Named', 'A tag that names the exact anomaly, not just its alignment.'],
    ['Office attention', 'Endless: rises every two weeks, slowing how fast Heat cools.'],
    ['Pledge', 'Campaign: signing with one faction halfway to the audit. Permanent.'],
    ['Rank', 'Endless: the shop’s standing in the trade, raised by points.'],
    ['Research', 'Desk projects that unlock recipes and skills, or cryptid study in the Bestiary.'],
    ['Rival', 'The faction paired against another. Helping one costs standing with the other.'],
    ['Scout', 'Walking a zone in daylight. That night its hazards are marked.'],
    ['Seal', 'A jar around a find (no overnight leaks) or a cell’s hold on a cryptid.'],
    ['Standing', 'A faction’s opinion of you, from −50 to 50.'],
    ['Stress', 'Your nerves in a zone. At 100 you panic and drop half your bag.'],
    ['Telegraph', 'A cryptid’s next move, shown before it acts.']
  ]
});
