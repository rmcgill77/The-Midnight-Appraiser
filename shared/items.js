/* data/items.js — what you find and how the lab reads it.
   Items are composed at runtime: BASE object + PREFIX (visible wear) + hidden ANOMALY.
   Each anomaly has a unique clue signature across the three bench tools. */
'use strict';

Object.assign(DATA, {
  bases: [
    { id:'polaroid',   name:'Polaroid Camera',  icon:'camera', category:'photo',       value:40, materials:['plastic','glass','film chemicals'], desc:'SX-70 era instant camera. One undeveloped frame is still in the slot.' },
    { id:'vhs',        name:'VHS Tape',         icon:'vhs', category:'photo',       value:5,  materials:['plastic','magnetic tape'],           desc:'Handwritten label reads "DO NOT TAPE OVER".' },
    { id:'brasskey',   name:'Brass Key',        icon:'key', category:'hardware',    value:12, materials:['brass'],                             desc:'Skeleton key. No lock in the city seems to fit it.' },
    { id:'zippo',      name:'Zippo Lighter',    icon:'lighter', category:'hardware',    value:30, materials:['chrome','flint','naphtha'],          desc:'The lid snaps shut with a clean clack.' },
    { id:'flipphone',  name:'Flip Phone',       icon:'flipphone', category:'electronics', value:22, materials:['plastic','lithium cell','copper'],   desc:'Clamshell handset. Shows one bar of signal with no SIM.' },
    { id:'walkman',    name:'Cassette Walkman', icon:'headphones', category:'electronics', value:35, materials:['plastic','magnetic tape','copper'],  desc:'A mixtape is still inside, labeled in marker.' },
    { id:'rotary',     name:'Rotary Phone',     icon:'rotary', category:'electronics', value:55, materials:['bakelite','copper','bell steel'],    desc:'Heavy desk set. The cord was cut cleanly.' },
    { id:'radio',      name:'Transistor Radio', icon:'radio', category:'electronics', value:45, materials:['plastic','germanium','copper'],      desc:'Dial is stuck between two stations.' },
    { id:'token',      name:'Subway Token',     icon:'token', category:'coin',        value:6,  materials:['brass alloy'],                       desc:'Stamped for a transit line that closed in 1978.' },
    { id:'watch',      name:'Pocket Watch',     icon:'watch', category:'coin',        value:70, materials:['silver','steel','glass'],            desc:'Stopped at 3:17. The crown will not wind.' },
    { id:'stethoscope',name:'Stethoscope',      icon:'stethoscope', category:'medical',     value:28, materials:['steel','rubber'],                    desc:'The name tape on the tubing has been scratched off.' },
    { id:'pen',        name:'Fountain Pen',     icon:'pen', category:'personal',    value:26, materials:['lacquer','gold nib','ink'],          desc:'Still loaded with ink the color of rust.' },
    { id:'glasses',    name:'Reading Glasses',  icon:'glasses', category:'personal',    value:14, materials:['wire','glass'],                      desc:'Strong prescription. The left lens is fogged from inside.' },
    { id:'musicbox',   name:'Music Box',        icon:'musicbox', category:'personal',    value:38, materials:['walnut','brass comb','velvet'],      desc:'Plays four notes, then stops on a wrong one.' }
  ],

  prefixes: [
    { id:'waterstained', name:'Water-Stained', valueMod:0.7,  tell:'Tide lines on every surface, like it sat in standing water.' },
    { id:'scorched',     name:'Scorched',      valueMod:0.6,  tell:'Heat-blistered on one side only.' },
    { id:'mint',         name:'Mint',          valueMod:1.6,  tell:'Spotless. Too spotless for where you found it.' },
    { id:'rusted',       name:'Rusted',        valueMod:0.65, tell:'Flaking oxide, even on the parts that are not metal.' },
    { id:'engraved',     name:'Engraved',      valueMod:1.3,  tell:'Initials engraved on the back: "M.R. 1961".' },
    { id:'taped',        name:'Taped-Up',      valueMod:0.8,  tell:'Wrapped in electrical tape by someone in a hurry.' },
    { id:'frosted',      name:'Frost-Rimed',   valueMod:1.0,  tell:'Cold to the touch. Condensation keeps forming.' },
    { id:'humming',      name:'Humming',       valueMod:1.1,  tell:'A low hum you feel in your fillings more than hear.' },
    { id:'unmarked',     name:'Unmarked',      valueMod:1.0,  tell:'Serial numbers filed off.' },
    { id:'sootblack',    name:'Soot-Black',    valueMod:0.75, tell:'Coated in greasy soot that will not wipe off.' }
  ],

  /* Clue vocabulary per bench tool. */
  clues: {
    emf:     { flat:'Flat (0 mG)', flicker:'Flicker (0.5–2 mG)', steady:'Steady (~3 mG)', spiking:'Spiking (5+ mG)' },
    uv:      { none:'Nothing fluoresces', handprints:'Overlapping handprints', spiral:'A spiral sigil', script:'Lines of Latin script', circuit:'Circuit-trace lines', teeth:'Bite marks' },
    reagent: { none:'No reaction', warms:'Turns warm', blue_smoke:'Gives off blue smoke', black_froth:'Froths black', crystals:'Crystallizes salt-white', weeps:'Weeps salt water' },
    spirit:  { none:'Dead silence', residue:'A faint hum, nothing more', fortune:'Whispers about luck and winning', divination:'Voices talking over each other', warding:'Something about doors and thresholds',
               memory:'Someone describing a summer afternoon', hunger:'Chewing. Only chewing.', time:'The same sentence, over and over', possession:'A second voice answering yours',
               signal:'Numbers read out between stations', binding:'Someone reading a contract aloud', drain:'Breathing that slows down' }
  },
  short: {
    emf:     { flat:'Flat', flicker:'Flicker', steady:'Steady', spiking:'Spiking' },
    uv:      { none:'Clean', handprints:'Hands', spiral:'Spiral', script:'Script', circuit:'Circuit', teeth:'Teeth' },
    reagent: { none:'Inert', warms:'Warm', blue_smoke:'Smoke', black_froth:'Froth', crystals:'Salt', weeps:'Weeps' },
    spirit:  { none:'Silence', residue:'Hum', fortune:'Luck', divination:'Voices', warding:'Doors', memory:'Summer', hunger:'Chewing', time:'Repeating',
               possession:'Answering', signal:'Numbers', binding:'Contract', drain:'Breath' }
  },
  emfOrder: ['flat', 'flicker', 'steady', 'spiking'],
  uvGroups: { none:['none'], handprints:['handprints','teeth'], teeth:['handprints','teeth'], spiral:['spiral','script','circuit'], script:['spiral','script','circuit'], circuit:['spiral','script','circuit'] },
  uvGroupName: { 2:'Faint organic marks', 3:'Faint geometric marks' },
  uvIcon: { none:'blank', handprints:'hand', teeth:'teeth', spiral:'spiral', script:'script', circuit:'circuit' },
  reagentColor: { none:'#3a4a4f', warms:'#f3a646', blue_smoke:'#5aa7ff', black_froth:'#05080a', crystals:'#e8e6df', weeps:'#5ed6c1' },

  /* Hidden truths. signature = the reading each tool converges on.
     tornUntil/tornField: below that Lore level, the archive page is missing
     that field (shown as "?", never rules the entry out). */
  anomalies: [
    { id:'inert_mundane',  name:'Mundane',            alignment:'inert',     traits:[],              danger:0, valueMult:1,   affinity:[],                   buyers:['civilian'],
      signature:{ emf:'flat',    uv:'none',       reagent:'none' },        effect:'Exactly what it looks like.' },
    { id:'inert_residue',  name:'Faded Residue',      alignment:'inert',     traits:['residue'],     danger:0, valueMult:1.2, affinity:['personal','photo'], buyers:['civilian'],
      signature:{ emf:'flicker', uv:'handprints', reagent:'none' },        effect:'Old magic brushed against it once. Harmless now.' },
    { id:'ench_luck',      name:'Pocket Luck',        alignment:'enchanted', traits:['fortune'],     danger:0, valueMult:4,   affinity:['coin','hardware'],  buyers:['corporate'],
      signature:{ emf:'steady',  uv:'spiral',     reagent:'warms' },       effect:'Coin flips, traffic lights and job interviews lean the carrier’s way.' },
    { id:'ench_deadair',   name:'Dead Air Receiver',  alignment:'enchanted', traits:['divination','signal'], danger:1, valueMult:5, affinity:['electronics'], buyers:['techmage'],
      signature:{ emf:'spiking', uv:'circuit',    reagent:'blue_smoke' },  effect:'Picks up conversations from people who are no longer alive.', tornUntil:2, tornField:'reagent' },
    { id:'ench_ward',      name:'Threshold Ward',     alignment:'enchanted', traits:['warding'],     danger:0, valueMult:4.5, affinity:['hardware','coin'],  buyers:['hunters'],
      signature:{ emf:'steady',  uv:'script',     reagent:'crystals' },    effect:'Things that were never invited cannot cross a door it hangs on.' },
    { id:'ench_memory',    name:'Memory Keeper',      alignment:'enchanted', traits:['memory'],      danger:0, valueMult:3.5, affinity:['photo','personal'], buyers:['civilian','techmage'],
      signature:{ emf:'flicker', uv:'spiral',     reagent:'weeps' },       effect:'Holding it replays a stranger’s happiest afternoon.', tornUntil:3, tornField:'reagent' },
    { id:'curse_hunger',   name:'The Hunger',         alignment:'cursed',    traits:['hunger','drain'], danger:3, valueMult:3, affinity:[],                  buyers:['hunters','office'],
      signature:{ emf:'spiking', uv:'teeth',      reagent:'black_froth' }, effect:'Drains warmth from whoever owns it. Pets avoid the room.' },
    { id:'curse_loop',     name:'Looping Night',      alignment:'cursed',    traits:['time'],        danger:2, valueMult:2.5, affinity:['photo','electronics'], buyers:['techmage','office'],
      signature:{ emf:'steady',  uv:'handprints', reagent:'blue_smoke' },  effect:'The owner relives the same night until they give it away.', tornUntil:2, tornField:'uv' },
    { id:'curse_tenant',   name:'Second Tenant',      alignment:'cursed',    traits:['possession'],  danger:2, valueMult:2.5, affinity:['personal','medical'], buyers:['corporate','office'],
      signature:{ emf:'flicker', uv:'script',     reagent:'black_froth' }, effect:'Something else uses it at night. It leaves things moved.', tornUntil:3, tornField:'emf' },
    { id:'curse_jinx',     name:'Jinx',               alignment:'cursed',    traits:['fortune','binding'], danger:1, valueMult:2, affinity:['coin','hardware'], buyers:['corporate'],
      signature:{ emf:'steady',  uv:'spiral',     reagent:'black_froth' }, effect:'Luck, reversed. Small disasters follow the carrier around.' },

    /* Uncatalogued: not in the archive until you write them up at the research desk.
       Their readings match no known page, which is how you spot one. Deeper zones turn up more. */
    { id:'ench_wish',      name:'Wishing Weight',     alignment:'enchanted', traits:['binding','fortune'], danger:0, valueMult:5.5, affinity:['coin','hardware'], buyers:['corporate'], uncatalogued:true,
      signature:{ emf:'flat',    uv:'spiral',     reagent:'crystals' },    effect:'Whatever its owner wishes for arrives, a little smaller than they hoped.' },
    { id:'ench_nurse',     name:'Night Nurse',        alignment:'enchanted', traits:['warding','memory'], danger:0, valueMult:5,   affinity:['medical','personal'], buyers:['hunters','civilian'], uncatalogued:true,
      signature:{ emf:'steady',  uv:'teeth',      reagent:'weeps' },       effect:'Sickrooms it sits in stay quiet all night. Nothing comes for the patient.' },
    { id:'curse_listener', name:'The Listener',       alignment:'cursed',    traits:['possession','divination'], danger:2, valueMult:3.5, affinity:['electronics'], buyers:['techmage','corporate','office'], uncatalogued:true,
      signature:{ emf:'spiking', uv:'script',     reagent:'warms' },       effect:'It hears everything said near it, and something on the other end takes notes.' },
    { id:'curse_choir',    name:'Hollow Choir',       alignment:'cursed',    traits:['drain','time','hunger'], danger:3, valueMult:3.5, affinity:['personal','photo'], buyers:['hunters','techmage','office'], uncatalogued:true,
      signature:{ emf:'flicker', uv:'circuit',    reagent:'crystals' },    effect:'Plays a hymn nobody wrote. Every listener loses an hour they cannot account for.' }
  ],

  alignments: [
    { id:'inert',     name:'Inert',     note:'Safe for anyone' },
    { id:'enchanted', name:'Enchanted', note:'Faction money' },
    { id:'cursed',    name:'Cursed',    note:'Handle with care' }
  ],

  /* Bench tools. mins = bench time per test. exact[lv-1] = chance a single test pins the exact reading;
     otherwise it returns an honest shortlist that still contains the truth. */
  tools: [
    { id:'emf',     name:'EMF Meter',     reads:'Field strength',   mins:20, vials:0, exact:[0.5, 0.8, 1],
      perks:['Half the time the needle wavers between two bands', 'Wavers 1 test in 5', 'Locks on every time'] },
    { id:'uv',      name:'UV Blacklight', reads:'Hidden marks',     mins:15, vials:0, exact:[0.45, 0.8, 1],
      perks:['Often shows only faint shapes', 'Faint 1 test in 5', 'Every mark in full detail'] },
    { id:'reagent', name:'Reagent Kit',   reads:'Chemical reaction', mins:40, vials:1, exact:[0.55, 0.85, 1],
      perks:['Murky results almost half the time', 'Murky about 1 test in 7', 'Clean reaction every time'] },
    /* Bought separately (upgrades.spirit starts at 0). Hears an anomaly's main trait: what factions shop for. */
    { id:'spirit',  name:'Spirit Box',    reads:'Main trait',       mins:30, vials:0, exact:[0.5, 0.8, 1], station:true,
      perks:['Half the time two voices talk over each other', 'Crosstalk 1 test in 5', 'One clear voice every time'] }
  ],
  lore: { name:'Lore Archive', perks:['4 torn pages', '2 torn pages', 'Every page restored'] },
  upgradeCost: [0, 150, 400],   // cost to reach Lv 2, Lv 3

  mishaps: [
    'The lamp dimmed and the room got cold. Your hands are still shaking.',
    'Something knocked from inside the bench drawer. Three times.',
    'You heard your own voice from the floor drain, asking you to stop.',
    'Every clock in the basement jumped forward eleven minutes.'
  ]
});
