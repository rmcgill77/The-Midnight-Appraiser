/* data/bestiary.js — the things that live in the zones, how fights with them work,
   and the basement containment unit.

   Fights use the lab's three instruments as attacks:
     uv      Blacklight  · burns (uses flashlight battery)
     emf     Field pulse · scrambles (wears EMF calibration)
     reagent Salt        · dissolves (uses 1 salt)
   Each species is weak to one (×2) and resists one (×0.5). Research on a species is
   kept in the bestiary between fights, and what you know changes what you can see:
   at 25% its weakness, at 50% exactly what its next move will do and its resistance,
   at 75% and 100% better capture and escape odds. */
'use strict';

Object.assign(DATA, {
  species: [
    { id: 'wraith', name: 'The Lint Wraith', icon: 'wraith', text: 'A shape of grey lint and static drifts out of machine 14.', zone: 'laundromat', presence: 30, weak: 'uv', resist: 'emf', value: 70, buyers: ['hunters', 'techmage', 'office'],
      lore: 'Lint, static and something that remembers being folded. It is drawn to warmth and to people who sleep in their clothes.',
      deep: 'It is not a ghost. It is a habit a building picked up from the people in it. Starve it of static and it settles like dust.',
      moves: [
        { id: 'lash',    name: 'Static Lash', weight: 3, tell: 'Its fibres crackle and stand on end.',   text: 'A whip of static cracks across your knuckles.', stress: 7 },
        { id: 'smother', name: 'Smother',     weight: 2, tell: 'It billows wide, like a sheet on a line.', text: 'It wraps over your face. You claw it off, gasping.', stress: 3, stamina: 3 },
        { id: 'tumble',  name: 'Tumble Dry',  weight: 1, tell: 'It sinks back toward the machines.',      text: 'It spins through a dryer drum and comes out fuller.', heal: 6 }
      ] },
    { id: 'ratking', name: 'The Rat King', icon: 'rat', text: 'A knot of rats moving as one body comes up the platform.', zone: 'subway', presence: 40, weak: 'reagent', resist: 'uv', value: 95, buyers: ['hunters'],
      lore: 'Two dozen rats with their tails knotted together, moving with one mind. It has been down here since the flood.',
      deep: 'The knot is the mind. Cut it and you have two dozen frightened rats. Salt makes it loosen.',
      moves: [
        { id: 'swarm',  name: 'Swarm',      weight: 3, tell: 'The knot rears and spreads out across the tiles.', text: 'They pour over your boots and up your legs.', stress: 8 },
        { id: 'gnaw',   name: 'Gnaw',       weight: 2, tell: 'Dozens of eyes fix on your bag.',                   text: 'A dozen teeth go for your bag.', steal: true, stress: 4 },
        { id: 'squeal', name: 'Squeal',     weight: 2, tell: 'Every mouth opens at once.',                         text: 'A shriek so loud your flashlight flickers.', stress: 5, battery: 6 }
      ] },
    { id: 'hound', name: 'Headlight Hound', icon: 'hound', text: 'Two headlights blink on at knee height and start walking toward you.', zone: 'garage', presence: 45, weak: 'emf', resist: 'reagent', value: 110, buyers: ['hunters', 'techmage'],
      lore: 'A dog made of a parked car’s bad dreams. Headlights for eyes, an engine for a heart, and no off switch.',
      deep: 'It runs on the garage’s wiring. A strong field pulse stalls it like a flooded engine.',
      moves: [
        { id: 'beams',  name: 'High Beams', weight: 2, tell: 'Its headlights flick to full.',     text: 'White light floods your eyes and your flashlight dims to match.', stress: 5, battery: 10 },
        { id: 'lunge',  name: 'Lunge',      weight: 3, tell: 'It drops low, engine ticking.',     text: 'It hits you like a fender at walking speed.', stress: 11 },
        { id: 'idle',   name: 'Idle',       weight: 1, tell: 'It settles back, engine rumbling.', text: 'It idles in the dark and its lights burn brighter.', heal: 8 }
      ] },
    { id: 'orderly', name: 'The Orderly', icon: 'orderly', text: 'Someone in scrubs pushes an empty gurney toward you without looking up.', zone: 'hospital', presence: 55, weak: 'emf', resist: 'uv', value: 150, buyers: ['hunters', 'techmage', 'office'],
      lore: 'Scrubs, a name badge worn blank, and a gurney with fresh sheets. It has been doing its rounds for forty years.',
      deep: 'It is following a schedule nobody cancelled. Interfere with the hospital’s current and it loses its place.',
      moves: [
        { id: 'sedate',   name: 'Sedate',     weight: 2, tell: 'It reaches for a syringe on the tray.',             text: 'A needle in your arm. Your legs go heavy.', stress: 7, stamina: 4 },
        { id: 'restrain', name: 'Restrain',   weight: 2, tell: 'It grips the gurney rail and steps close.',          text: 'It straps your wrist to the rail. You cannot run this turn.', stress: 10, restrain: true },
        { id: 'chart',    name: 'Paperwork',  weight: 1, tell: 'It pauses to write something on a clipboard.',       text: 'It writes your name on the chart. It looks steadier.', heal: 10 }
      ] },
    /* ----- Phase 11e: two more for each zone ----- */
    { id: 'sockling', name: 'The Odd Socks', icon: 'sock', text: 'A drift of unmatched socks crawls out from under the folding table, all of them heading for you.',
      zone: 'laundromat', presence: 24, weak: 'reagent', resist: 'uv', value: 55, buyers: ['hunters', 'corporate'],
      lore: 'Every sock the machines ever ate, still looking for its pair. They move like a tide and they hate being alone.',
      deep: 'Salt breaks the static that holds them together. Give one a pair and the rest go quiet.',
      moves: [
        { id: 'tangle', name: 'Tangle',      weight: 3, tell: 'They bunch up around your ankles.',            text: 'They knot around your feet. Walking is going to hurt.', stamina: 4, stress: 3 },
        { id: 'muffle', name: 'Muffle',      weight: 2, tell: 'They pile up toward your face.',               text: 'Wool over your mouth and nose. You tear it away.', stress: 7 },
        { id: 'pair',   name: 'Find a Pair', weight: 1, tell: 'Two of them drift apart from the rest, searching.', text: 'Two socks find each other and the whole drift swells.', heal: 5 }
      ] },
    { id: 'changer', name: 'The Change Machine', icon: 'coins', text: 'The coin changer on the back wall unbolts itself and clanks toward you on four steel feet.',
      zone: 'laundromat', presence: 34, weak: 'emf', resist: 'reagent', value: 80, buyers: ['corporate', 'techmage', 'office'],
      lore: 'A coin changer that has been eating quarters since 1971 and has never once given the right change.',
      deep: 'Its mind is a coin mechanism. A field pulse jams the slots and it seizes.',
      moves: [
        { id: 'spit',  name: 'Spit Change',  weight: 3, tell: 'Its coin return rattles.',               text: 'A spray of hot quarters. One cuts your cheek.', stress: 8 },
        { id: 'take',  name: 'Exact Change', weight: 2, tell: 'Its slot swings toward your bag.',       text: 'It snaps at your bag and swallows something whole.', steal: true, stress: 3 },
        { id: 'count', name: 'Count Up',     weight: 1, tell: 'It starts counting under its breath.',   text: 'It counts its quarters and stands up straighter.', heal: 7 }
      ] },
    { id: 'conductor', name: 'The Last Conductor', icon: 'conductor', text: 'A man in a 1970s transit uniform walks the platform, punching tickets nobody is holding.',
      zone: 'subway', presence: 42, weak: 'uv', resist: 'emf', value: 120, buyers: ['office', 'hunters'],
      lore: 'He went down with the last train in the 1978 flood and kept working. He still checks tickets.',
      deep: 'He is bound to the timetable. Bright light on his badge reminds him the line is closed.',
      moves: [
        { id: 'ticket', name: 'Tickets, Please', weight: 2, tell: 'He holds out his punch and waits.',  text: 'He punches a hole in your sleeve. Something in you goes with it.', stress: 9 },
        { id: 'doors',  name: 'Doors Closing',   weight: 2, tell: 'A chime sounds somewhere in the dark.', text: 'The air slams shut around you like train doors. You cannot move.', stress: 6, restrain: true },
        { id: 'route',  name: 'Next Stop',       weight: 1, tell: 'He checks a pocket watch.',          text: 'He calls the next stop and the platform lights brighten around him.', heal: 8 }
      ] },
    { id: 'choir', name: 'The Tunnel Choir', icon: 'choir', text: 'Voices come out of the tunnel, singing in harmony, getting closer.',
      zone: 'subway', presence: 36, weak: 'emf', resist: 'reagent', value: 105, buyers: ['techmage', 'corporate'],
      lore: 'Nobody has ever seen the singers. The song is a hymn about rising water.',
      deep: 'It is a signal more than a choir. A field pulse breaks the harmony apart.',
      moves: [
        { id: 'hymn',      name: 'Hymn',      weight: 3, tell: 'The voices drop to a hum.',                 text: 'The hymn gets inside your head and will not leave.', stress: 9 },
        { id: 'crescendo', name: 'Crescendo', weight: 1, tell: 'Every voice draws breath at once.',          text: 'The song hits a note that cracks your flashlight lens.', stress: 6, battery: 12 },
        { id: 'echo',      name: 'Echo',      weight: 2, tell: 'The voices scatter down the tunnel.',        text: 'The song comes back from every direction, louder.', heal: 6, stress: 2 }
      ] },
    { id: 'valet', name: 'The Valet', icon: 'valet', text: 'A faceless attendant in a red vest holds out a gloved hand for your keys.',
      zone: 'garage', presence: 40, weak: 'uv', resist: 'emf', value: 125, buyers: ['corporate', 'office'],
      lore: 'It parks cars that are no longer there. It has your keys before you notice they are gone.',
      deep: 'Under light it remembers it is only a uniform. Blacklight empties the vest.',
      moves: [
        { id: 'keys', name: 'Keys, Please', weight: 3, tell: 'Its glove opens toward your pocket.',      text: 'It lifts something from your bag with a little bow.', steal: true, stress: 4 },
        { id: 'park', name: 'Park It',      weight: 2, tell: 'It steps behind you without seeming to move.', text: 'It steers you by the shoulders into a corner. You cannot get free this turn.', restrain: true, stress: 8 },
        { id: 'tip',  name: 'Tip',          weight: 1, tell: 'It waits, hand out, for a tip.',           text: 'You do not tip. It does not forget. It looks more solid.', heal: 8, stress: 3 }
      ] },
    { id: 'exhaust', name: 'The Exhaust', icon: 'smoke', text: 'A grey cloud rolls out of a tailpipe and comes on low along the floor.',
      zone: 'garage', presence: 38, weak: 'reagent', resist: 'uv', value: 100, buyers: ['techmage', 'hunters'],
      lore: 'Every engine ever left running down here. It is sweet, and slow, and it makes you want to sit down.',
      deep: 'Salt pulls it out of the air in clumps. It is mostly soot and patience.',
      moves: [
        { id: 'fumes', name: 'Fumes', weight: 3, tell: 'It thickens around your head.',       text: 'You breathe it in. Your legs go soft.', stamina: 5, stress: 4 },
        { id: 'choke', name: 'Choke', weight: 2, tell: 'It folds in on itself.',              text: 'It fills your throat. You cough until you see stars.', stress: 10 },
        { id: 'rev',   name: 'Rev',   weight: 1, tell: 'An engine turns over somewhere.',     text: 'Somewhere a car starts, and the cloud grows.', heal: 8 }
      ] },
    { id: 'visitor', name: 'The Visitor', icon: 'flowers', text: 'Someone in a raincoat, holding dead flowers, asks you which room you are in.',
      zone: 'hospital', presence: 46, weak: 'reagent', resist: 'emf', value: 140, buyers: ['hunters', 'office', 'corporate'],
      lore: 'It comes during visiting hours that ended forty years ago, looking for a patient who was moved.',
      deep: 'Grief, mostly. Salt on the threshold tells it the room is empty.',
      moves: [
        { id: 'ask',     name: 'Which Room?', weight: 2, tell: 'It leans close to read your face.', text: 'It asks for a name you almost know. You cannot stop thinking about it.', stress: 9 },
        { id: 'flowers', name: 'Flowers',     weight: 2, tell: 'It holds out the flowers.',          text: 'You take them without meaning to. They are heavy, and you are tired.', stamina: 5, stress: 4 },
        { id: 'wait',    name: 'Wait',        weight: 1, tell: 'It sits in a plastic chair to wait.', text: 'It waits, patient, and seems more real for it.', heal: 10 }
      ] },
    { id: 'negative', name: 'The Negative', icon: 'xray', text: 'A figure made of old X-ray film steps out of a light box. You can see its ribs.',
      zone: 'hospital', presence: 44, weak: 'uv', resist: 'reagent', value: 155, buyers: ['techmage', 'office'],
      lore: 'A sheet of film that was exposed too long. It wants a new picture, and it wants you in it.',
      deep: 'It is film. Blacklight overexposes it until there is nothing left.',
      moves: [
        { id: 'expose',  name: 'Expose',  weight: 3, tell: 'It turns toward your light.',        text: 'It drinks your flashlight beam. The dark gets closer.', battery: 12, stress: 5 },
        { id: 'develop', name: 'Develop', weight: 2, tell: 'Its edges curl inward.',             text: 'You see your own bones for a second. You will see them again tonight.', stress: 8 },
        { id: 'fix',     name: 'Fix',     weight: 1, tell: 'It goes still under the light box.', text: 'It holds still, and sets.', heal: 9 }
      ] },
    /* ----- behind the other door ----- */
    { id: 'keeper', name: 'The Doorkeeper', icon: 'keyhole', text: 'A tall shape with a ring of keys for a face steps out of the wall and asks your name.',
      zone: 'undercroft', presence: 80, weak: 'reagent', resist: 'emf', value: 280, buyers: ['techmage', 'corporate', 'hunters', 'office'],
      lore: 'It keeps the other door. It knew your parents. It has not decided about you.',
      deep: 'It answers to the neighborhood, not to power. A line of salt is a promise it understands.',
      moves: [
        { id: 'name', name: 'What Is Your Name?', weight: 2, tell: 'Every key on its ring turns toward you.', text: 'It asks your name, and you are not sure the answer is yours.', stress: 13 },
        { id: 'lock', name: 'Lock',               weight: 2, tell: 'It lifts one heavy key.',                 text: 'A lock turns in your knees. You cannot move.', restrain: true, stress: 8 },
        { id: 'toll', name: 'Toll',               weight: 1, tell: 'It holds out an open palm.',              text: 'It takes its toll from your bag.', steal: true, stress: 4 },
        { id: 'keep', name: 'Keep',               weight: 1, tell: 'It steps back into the wall.',            text: 'The wall holds it up. It comes out larger.', heal: 14 }
      ] },
    { id: 'coats', name: 'The Coats', icon: 'coat', text: 'Two coats on a hook walk toward you. They smell like your parents’ kitchen.',
      zone: 'undercroft', presence: 70, weak: 'uv', resist: 'reagent', value: 320, buyers: ['techmage', 'corporate', 'hunters', 'office'],
      lore: 'Your mother’s raincoat and your father’s work jacket, walking. They say your name in voices that are almost right.',
      deep: 'They are what the dark kept of them. Not them. Light shows the seams.',
      moves: [
        { id: 'call', name: 'Call Your Name', weight: 3, tell: 'The collars turn toward you.',        text: 'They say your name the way they used to. It hurts more than a blow.', stress: 14 },
        { id: 'hold', name: 'Hold You',       weight: 2, tell: 'The sleeves open wide.',              text: 'They hold on too tight. You cannot breathe, then you can.', stamina: 6, stress: 5 },
        { id: 'hang', name: 'Hang Up',        weight: 1, tell: 'They drift back toward the hook.',    text: 'They hang still for a moment and fill out, as if someone were wearing them.', heal: 12 }
      ] }
  ],

  combat: {
    contact: { base: 3, perDanger: 3 },              // stress the moment it reaches you
    attacks: {
      uv:      { name: 'Blacklight',  icon: 'uv',   verb: 'You sweep the blacklight across it.', battery: 6 },
      emf:     { name: 'Field pulse', icon: 'emf',  verb: 'You crank the EMF meter into a pulse.', cal: 4 },
      reagent: { name: 'Salt',        icon: 'salt', verb: 'You throw a fistful of salt.',          salt: 1 }
    },
    damage: { base: 12, perLevel: 3, weak: 2, resist: 0.5 },
    scan: { base: 20, perLevel: 5 },                  // research per scan (average instrument level)
    watch: 3, braceWatch: 6, hitWatch: 4,             // research for seeing it act, bracing, landing a hit
    banishResearch: 10, captureResearch: 20,
    brace: 0.4,                                       // share of the incoming hit you still take
    tiers: { weak: 25, telegraph: 50, steady: 75, full: 100 },
    capture: { base: 0.15, wounded: 0.75, perDanger: 0.05, steady: 0.15, full: 0.25 },
    flee: { base: 0.55, steady: 0.15, stamina: 3, stun: 3 },
    loot: { essence: 1, extraEssenceAtDanger: 2, findChance: 0.3 }
  },

  /* The basement containment unit. Cells hold captured entities; their seals weaken every
     night, faster for dangerous ones. At 0 the entity breaks out. */
  containment: {
    cells: [2, 3, 4],                                 // by Containment Cells level
    decay: { base: 12, perDanger: 6 },
    feed: { cost: { salt: 1 }, amount: 40 },
    harvest: { mins: 15, essence: 1, stability: 15 },
    warnAt: 25,
    breakout: { stress: 15, heat: 10 },
    sellHeat: 3, sellRep: 4
  }
});
