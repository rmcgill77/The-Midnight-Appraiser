/* data/lab.js — the deeper lab: condition, contamination, the basin, the workbench,
   the research desk, instrument calibration and the lab's own equipment. */
'use strict';

Object.assign(DATA, {
  /* Condition (0–100). Rolled from the prefix when an item is found; it scales the
     surface estimate (×0.7 at 0, ×1.0 at 60, ×1.2 at 100). Restoring raises it. */
  condition: {
    bands: [[25, 'Wrecked'], [50, 'Worn'], [75, 'Fair'], [90, 'Good'], [101, 'Pristine']],
    byPrefix: { waterstained: [20, 50], scorched: [15, 45], mint: [92, 100], rusted: [20, 50], engraved: [65, 90],
                taped: [35, 60], frosted: [50, 85], humming: [55, 85], unmarked: [50, 80], sootblack: [20, 50] }
  },

  /* Contamination clouds one instrument until it is washed off. Each zone leaves its own. */
  contaminants: {
    lint:   { name: 'Dryer lint',        tool: 'uv',      text: 'Grey lint packed into every seam. It glows under the blacklight and hides any marks.' },
    silt:   { name: 'Flood silt',        tool: 'reagent', text: 'A crust of old flood silt. It reacts with anything you drip on it.' },
    static: { name: 'Static charge',     tool: 'emf',     text: 'It crackles when you touch it. The EMF needle will not settle.' },
    film:   { name: 'Disinfectant film', tool: 'reagent', text: 'A tacky hospital film that spoils chemical tests.' },
    hex:    { name: 'Hex soot',          tool: null,      text: 'Black soot that crept over from something else in the bin.' }
  },
  zoneContam: { laundromat: 'lint', subway: 'silt', garage: 'static', hospital: 'film' },
  contamChance: 0.4,        // chance a find comes back contaminated
  contamPenalty: 0.25,      // taken off the chance of an exact reading on the clouded instrument

  /* Instruments drift with use. Exact-reading chance × (0.5 + 0.5 × calibration). */
  calibration: { wear: { emf: 6, uv: 5, reagent: 8, spirit: 8 }, floor: 0.5, mins: 15, cost: 12 },

  /* Materials live in state.supplies next to reagent vials. */
  /* The workshop only makes things. Materials come from Kowalski Hardware (City tab),
     from caches found on night runs, and from breaking down finds. `from` says where. */
  materials: {
    vials:   { name: 'Reagent vials', icon: 'flask',   note: 'Chemical tests and tinctures',
               from: ['Kowalski Hardware', 'Lab glassware on night runs, mostly at St. Agnes', 'Breaking down medical and photo finds'] },
    salt:    { name: 'Salt',          icon: 'salt',    note: 'Washing, wards, jars and rites',
               from: ['Kowalski Hardware', 'Spilled salt on night runs'] },
    scrap:   { name: 'Scrap',         icon: 'gear',    note: 'Metal and glass for repairs and gear',
               from: ['Kowalski Hardware', 'Scrap piles on night runs', 'Breaking down any find'] },
    essence: { name: 'Essence',       icon: 'essence', note: 'Residue bottled from anything that was more than it looked',
               from: ['Breaking down enchanted or cursed finds', 'Banishing or harvesting cryptids'] }
  },
  startSupplies: { vials: 6, salt: 4, scrap: 2, essence: 0 },

  /* The basin: work done on one find. mins = bench time. */
  basin: {
    wash:    { name: 'Wash',          icon: 'drop',    mins: 15, cost: { salt: 1 },             note: 'Scrub off contamination so the instruments read true.' },
    restore: { name: 'Restore',       icon: 'hammer',  mins: 45, cost: { scrap: 1 }, amount: 25, note: '+25 condition. A better-kept find fetches more.' },
    purify:  { name: 'Purify',        icon: 'rite',    mins: 90, cost: { salt: 2, essence: 1 },  note: 'A rite that breaks curses. It strips enchantments too, and does nothing to the ordinary.' },
    seal:    { name: 'Seal in a jar', icon: 'jar',     mins: 5,  cost: { jar: 1 },               note: 'Sealed finds cannot leak overnight. A sealed curse is confiscated without Heat.' }
  },
  purify: { odds: [0.55, 0.7, 0.85], perDanger: 0.1, riteBonus: 0.15, failStress: 12 },

  /* Breaking a find down (was "scrap"): some cash, scrap, and essence if it was more than it looked. */
  breakdown: { cashRate: 0.3, essence: { inert: 0, enchanted: 1, cursed: 2 }, cursedStress: 6,
    extra: { medical: { vials: 2 }, photo: { vials: 1 } } },   // film chemicals and lab glass come out as vials

  /* Truly cursed finds that are not sealed leak overnight: stress, and soot on a neighbor. */
  bleed: { stress: 3, perDanger: 2, spreadChance: 0.5 },

  /* Consumables. jar is used at the basin; the rest ride along on night runs. */
  kit: {
    jar:      { name: 'Containment jar',  icon: 'jar',      note: 'Seal one find at the basin.' },
    ward:     { name: 'Salt ward',        icon: 'ward',     run: true, note: 'The first cryptid that reaches you each run is driven off. No stress, no choice to make.' },
    tincture: { name: 'Calming tincture', icon: 'tincture', run: true, note: 'Drunk when your stress reaches 80. −25 stress, once per run.' },
    cell:     { name: 'Battery pack',     icon: 'battery',  run: true, note: 'Snapped in when your light dies. +40% battery, once per run.' }
  },
  startKit: { jar: 1, ward: 0, tincture: 0, cell: 0 },
  kitEffects: { tincture: { at: 80, stress: 25 }, cell: { battery: 40 } },

  recipes: [
    { id: 'jar',      mins: 20, cost: { scrap: 1, salt: 1 } },
    { id: 'cell',     mins: 30, cost: { scrap: 2, vials: 1 } },
    { id: 'ward',     mins: 30, cost: { salt: 2, essence: 1 }, needs: 'folk' },
    { id: 'tincture', mins: 30, cost: { vials: 1, essence: 1 }, needs: 'folk' }
  ],

  /* The research desk. Projects are sized in hours and worked in any amount; the time comes out of
     the same bench time as tests, so the long ones run over days. */
  projects: [
    { id: 'folk',   name: 'Folk remedies',      icon: 'book',    hours: 4,  note: 'Your parents left margin notes on salt and herbs. Unlocks salt wards and calming tinctures.' },
    { id: 'manual', name: 'Calibration manual', icon: 'wrench',  hours: 6,  note: 'Learn to keep the instruments true. They drift half as fast.' },
    { id: 'rite',   name: 'Rite of Unbinding',  icon: 'rite',    hours: 8,  note: 'A cleaner version of the purification rite. +15% chance to break a curse.' }
  ],
  pageHours: 3,             // reconstruct one torn archive page
  catalogueHours: 4,        // write up an anomaly the archive has never seen

  /* The lab's own equipment (instruments are in DATA.tools; the archive is DATA.lore). */
  labGear: {
    lamp:   { name: 'Bench Lamp',    perks: ['6 bench hours a day', '7 bench hours a day', '8 bench hours a day'] },
    cells:  { name: 'Containment Cells', perks: ['2 cells in the basement', '3 cells in the basement', '4 cells in the basement'] },
    circle: { name: 'Ritual Circle', perks: ['Chalk on the floor · rites often fail', 'Silver inlay · steadier rites', 'Consecrated · rites rarely fail'] }
  },
  spiritCost: 250,          // buying the Spirit Box (Lv 1); later levels cost upgradeCost

  /* Spirit Box readings: the trait an anomaly is built around (its first trait). */
  spiritTraits: ['none', 'residue', 'fortune', 'divination', 'warding', 'memory', 'hunger', 'time', 'possession', 'signal', 'binding', 'drain']
});
