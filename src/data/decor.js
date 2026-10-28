// Decor for the shop floor (Phase 24). Bought from the notice board, placed by hand when
// you rearrange the shop, and put back in storage whenever you like. Every piece adds
// charm; charm makes people wait longer, spend a little more, and, past a point, brings
// in the odd browser who heard the place is worth a look. A few pieces do something of
// their own on top.
//
// `homeOnly`: furniture for the apartment, not the shop floor (Phase 27). Every piece can go
// in either place otherwise; the hardware store sells them for home.
// `char` is the piece's tile in the shop's rows (data/tiles.js draws it). `solid`: people
// walk around it. `unlock`: the renovation stage it needs.

export const DECOR = [
  { id: 'mat', char: '9', name: 'Welcome mat', cost: 15, charm: 1, solid: false, unlock: 0,
    blurb: 'WELCOME, mostly worn off. People wipe their feet and feel invited.' },
  { id: 'fern', char: '1', name: 'Potted fern', cost: 35, charm: 2, solid: true, unlock: 0,
    blurb: 'Something green in here that isn’t mold. People relax around plants.' },
  { id: 'runner', char: '3', name: 'Runner rug', cost: 40, charm: 1, solid: false, unlock: 0,
    blurb: 'A long patterned rug. You can walk on it. Lay a few in a row and they join up.' },
  { id: 'umbrella', char: '4', name: 'Umbrella stand', cost: 25, charm: 1, solid: true, unlock: 0, wet: 0.15,
    blurb: 'Somewhere to leave a dripping umbrella. On a wet day, people stay longer.' },
  { id: 'lamp', char: '2', name: 'Brass floor lamp', cost: 60, charm: 2, solid: true, unlock: 1, light: 46,
    blurb: 'Warm light in a dim corner. The cases near it catch the eye.' },
  { id: 'chair', char: '5', name: 'Reading chair', cost: 90, charm: 2, solid: true, unlock: 1, patience: 0.05,
    blurb: 'A worn green armchair. Somebody always sits in it while the line moves.' },
  { id: 'bust', char: '7', name: 'Marble bust', cost: 120, charm: 3, solid: true, unlock: 2,
    blurb: 'Somebody’s great-grandfather, probably. He watches the room.' },
  { id: 'clock', char: '6', name: 'Grandfather clock', cost: 140, charm: 3, solid: true, unlock: 2,
    blurb: 'Six minutes slow since 1931. It chimes on the hour and nobody minds.' },
  { id: 'curio', char: '8', name: 'Curio cabinet', cost: 180, charm: 4, solid: true, unlock: 3,
    blurb: 'Glass shelves of small strange things that aren’t for sale. People ask anyway.' },
  // Phase 27: for the apartment only (Kowalski Hardware stocks them).
  { id: 'bookshelf', char: '0', name: 'Bookshelf', cost: 70, charm: 2, solid: true, unlock: 0, homeOnly: true,
    blurb: 'Somewhere to put the paperbacks. Morgan would approve. Mostly.' },
  { id: 'record', char: '_', name: 'Record player', cost: 110, charm: 3, solid: true, unlock: 0, homeOnly: true,
    blurb: 'Your dad’s old turntable and a crate of jazz. The apartment finally sounds lived in.' },
  // v2.5b: more to buy, for the shop and for home. (Greek letters are just their tiles.)
  { id: 'globe', char: 'α', name: 'Antique globe', cost: 75, charm: 2, solid: true, unlock: 0,
    blurb: 'Countries that aren’t countries anymore. People spin it on the way past.' },
  { id: 'palm', char: 'β', name: 'Parlor palm', cost: 45, charm: 2, solid: true, unlock: 0,
    blurb: 'Taller than the fern and just as hard to kill. Somehow it likes the dark.' },
  { id: 'coatrack', char: 'δ', name: 'Coat rack', cost: 35, charm: 1, solid: true, unlock: 0, wet: 0.1,
    blurb: 'Bentwood, with a hat that nobody owns. On a wet day people take their coats off and stay.' },
  { id: 'trunk', char: 'ζ', name: 'Steamer trunk', cost: 65, charm: 2, solid: true, unlock: 0,
    blurb: 'Stickers from ports that closed before your parents were born. Locked. You lost the key.' },
  { id: 'candelabra', char: 'γ', name: 'Candelabra', cost: 55, charm: 2, solid: true, unlock: 1, light: 34,
    blurb: 'Five candles on a tall brass stand. The room feels like a secret.' },
  { id: 'birdcage', char: 'ε', name: 'Birdcage', cost: 85, charm: 2, solid: true, unlock: 1,
    blurb: 'An old brass cage, empty. Some mornings you could swear something in it was singing.' },
  { id: 'aquarium', char: 'ι', name: 'Fish tank', cost: 130, charm: 3, solid: true, unlock: 1, light: 26, patience: 0.03,
    blurb: 'Goldfish, a little castle and a hum. People watch it while they wait.' },
  { id: 'gramophone', char: 'η', name: 'Gramophone', cost: 150, charm: 3, solid: true, unlock: 2, patience: 0.04,
    blurb: 'A brass horn and a stack of old 78s. A little music, and nobody minds the line.' },
  { id: 'armor', char: 'θ', name: 'Suit of armor', cost: 240, charm: 4, solid: true, unlock: 3,
    blurb: 'Dented, mismatched and absolutely genuine. It faces a different way some mornings.' },
  { id: 'roundrug', char: 'ξ', name: 'Round rug', cost: 50, charm: 1, solid: false, unlock: 0,
    blurb: 'A braided rag rug in faded reds. Soft underfoot.' },
  // For the apartment.
  { id: 'radio', char: 'κ', name: 'Tabletop radio', cost: 30, charm: 1, solid: true, unlock: 0, homeOnly: true, interact: 'radio',
    blurb: 'WKNT, the voice of the night owls. Put it wherever you like to listen.' },
  { id: 'loveseat', char: 'λ', name: 'Loveseat', cost: 160, charm: 4, solid: true, unlock: 0, homeOnly: true,
    blurb: 'Green velvet, two cushions, one spring that tells you it’s there. The best seat in the house.' },
  { id: 'desk', char: 'μ', name: 'Writing desk', cost: 95, charm: 2, solid: true, unlock: 0, homeOnly: true,
    blurb: 'A rolltop with pigeonholes full of somebody else’s letters. You haven’t read them. Yet.' },
  { id: 'cactus', char: 'ν', name: 'Little cactus', cost: 12, charm: 1, solid: true, unlock: 0, homeOnly: true,
    blurb: 'Hard to kill. You’ll manage it anyway.' },
];
export const decorDef = id => DECOR.find(d => d.id === id) ?? null;
export const decorByChar = ch => DECOR.find(d => d.char === ch) ?? null;

// How charm pays off. Only the first two of any one piece count (a third fern is just a fern).
export const CHARM = {
  perKind: 2,
  patiencePer: 0.02, patienceMax: 0.3,    // people wait longer
  spendPer: 0.006, spendMax: 0.08,        // and spend a little more
  browsersAt: [8, 16],                    // charm for one, then two, extra browsers a day
  maxPieces: 14,                          // on the floor at once
};
