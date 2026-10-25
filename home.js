// Your apartment (Phase 27): two rooms above a dry cleaner on Pell Street, right across
// the street from the shop. Every day starts here and every night ends here. The front
// door is where you choose the day: open the shop, or go into the city.
//
// Legend (tiles.js buildHomeTiles): [ / ] the bed (head, foot), ( the wardrobe, = the
// kitchen counter, + the stove, " a photo on the wall (v2.5b: the radio is furniture now,
// data/decor.js, and starts by the kitchen), / a window, : the
// corkboard, < > the front door. The rest is the usual: # walls, . floor, r rug, t a
// table, L a lamp. Furniture you buy (data/decor.js) goes on the floor (game/home.js).

export const APARTMENT = {
  id: 'apartment',
  name: 'Your apartment',
  look: 'apartment',
  rows: [
    '######################',
    '##"##/###:##==+=#/#"##',
    '#[..(...#............#',
    '#]......#............#',
    '#.......#....ttt.....#',
    '#..rrr..#............#',
    '#..rrr..#..........L.#',
    '#.L..................#',
    '#....................#',
    '#.........rrrr.......#',
    '#.........rrrr.......#',
    '##########<>##########',
  ],
  spawn: { tx: 10, ty: 10 },          // just inside the front door
  wake: { tx: 2, ty: 3, facing: 'down' },  // beside the bed
  door: { tx: 10, ty: 10, facing: 'up' },
  dark: 0.22,
  interactions: {
    bed: { label: 'Bed', panel: 'bed' },
    wardrobe: { label: 'Wardrobe', panel: 'wardrobe' },
    kitchen: { label: 'Kitchen', panel: 'kitchen' },
    radio: { label: 'Radio', panel: 'radio' },
    photo: { label: 'Photo', panel: 'photo' },
    window: { label: 'Window', panel: 'window' },
    homeBoard: { label: 'Corkboard', panel: 'homeBoard' },
    homeDoor: { label: 'Front door', panel: 'homeDoor' },
  },
};

// What the furniture at home does: comfort (each piece's charm, the first two of a kind)
// takes the edge off when you sleep, and a cozy enough place leaves you well rested.
export const COMFORT = {
  perKind: 2,
  stressPer: 2, stressMax: 20,        // extra stress gone overnight, on top of the usual
  restedAt: 8, restedBench: 30,       // comfort for "well rested": more bench time tonight
  maxPieces: 14,
};
// v2.5b: where the radio starts out (it's yours from the first day; move it where you like).
export const RADIO_START = [{ tx: 16, ty: 2 }, { tx: 15, ty: 2 }, { tx: 18, ty: 2 }];
