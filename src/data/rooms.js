// Rooms. Coordinates are tiles. `go` says where a door leads and where you appear.
// Legend: # wall, S shelf wall, . floor, r rug, c crate, L lamp, D/d back door, F/f front door,
// K counter, R seller counter, T buyer till, V display case, e/E shop back door,
// n stairs down, U/u stairs up, Z/z cot, B/b bench, W/w workbench, Q/q desk, G gear rack, X cell,
// O/o the other door (Beneath Old Market), N the contractor's estimate (shop-tiers.js has the rest).

export const BACK_ROOM = {
  id: 'back-room',
  name: 'The Back Room',
  rows: [
    '######################',
    '##SSS####SSSS#nn#SS###',
    '#....................#',
    '#.cc.......Zz....L...#',
    '#.c..................#',
    '#......rrrrrr........#',
    '#......rrrrrr....cc..#',
    '#..L...rrrrrr....c...#',
    '#....................#',
    '#..cc................#',
    '#..c.........L.......#',
    '#....................#',
    '##########Dd##########',
  ],
  spawn: { tx: 11, ty: 8 },
  interactions: {
    cot: { label: 'Sleep', panel: 'cot' },
    stairsDown: { label: 'Basement', panel: 'stairsDown', go: { room: 'lab', tx: 17, ty: 2, facing: 'down' } },
    door: { label: 'Shop floor', go: { room: 'shop', tx: 13, ty: 2, facing: 'down' } },
  },
};

// 26 x 14. This is the fully restored shop; shop-tiers.js has the earlier, smaller stages.
export const SHOP_FLOOR = {
  id: 'shop',
  name: 'The Shop Floor',
  rows: [
    '##########################',
    '#SSSS###SSSS#eENSSSS#SSS##',
    '#........................#',
    '#.cc.....................#',
    '#KKKKRKKKKK..KKKTKKKKKKKK#',
    '#........................#',
    '#.VV....VV.......VV...VV.#',
    '#........................#',
    '#........rrrrrrrr........#',
    '#.VV.....rrrrrrrr....VV..#',
    '#........rrrrrrrr........#',
    '#.L....................L.#',
    '#........................#',
    '###########Ff#############',
  ],
  spawn: { tx: 5, ty: 3 },
  customerMinRow: 5,           // customers never step on rows at or above the counter
  entrance: { tx: 11, ty: 12 },
  exit: [{ tx: 11, ty: 12 }, { tx: 12, ty: 12 }],
  // Two lines: sellers queue at the counter, buyers at the till.
  lines: {
    sell: [{ tx: 5, ty: 5 }, { tx: 5, ty: 6 }, { tx: 5, ty: 7 }, { tx: 5, ty: 8 }, { tx: 5, ty: 9 }],
    buy: [{ tx: 16, ty: 5 }, { tx: 16, ty: 6 }, { tx: 16, ty: 7 }, { tx: 16, ty: 8 }, { tx: 16, ty: 9 }],
  },
  counter: { tx: 5, ty: 4 },
  till: { tx: 16, ty: 4 },
  tillZone: { x0: 14, x1: 18, y0: 2, y1: 3 },  // stand here and buyers at the till pay on their own
  interactions: {
    register: { label: 'Serve', panel: 'counter' },
    till: { label: 'Till', panel: 'till' },
    display: { label: 'Display', panel: 'display' },
    // Phase 27: the back door goes straight down to the basement workshop (the back room and
    // its cot are gone: you sleep at home now, across the street).
    backdoor: { label: 'Basement', panel: 'stairsDown', go: { room: 'lab', tx: 17, ty: 2, facing: 'down' } },
  },
};

// The basement lab. 20 x 12.
export const LAB = {
  id: 'lab',
  name: 'The Basement',
  rows: [
    '####################',
    '#SSSSOoGG##XX#XX#Uu#',
    '#..................#',
    '#..Bb.........Ww...#',
    '#..................#',
    '#.......rrrr.......#',
    '#.L.....rrrr.....L.#',
    '#.......rrrr.......#',
    '#..Qq..............#',
    '#.............cc...#',
    '#..................#',
    '####################',
  ],
  spawn: { tx: 17, ty: 2 },
  interactions: {
    bench: { label: 'Bench', panel: 'bench' },
    workshop: { label: 'Workshop', panel: 'workshop' },
    desk: { label: 'Desk', panel: 'desk' },
    gear: { label: 'Gear', panel: 'gear' },
    cells: { label: 'Cells', panel: 'cells' },
    otherDoor: { label: 'The other door', panel: 'otherDoor' },
    stairsUp: { label: 'Up to the shop', go: { room: 'shop', tx: 13, ty: 2, facing: 'down' } },
  },
};

// The Brass Lantern (Phase 20; the Lamplighter until Phase 24, when it grew into the
// place the whole town gathers): a corner bar off the street. 30 x 16. Legend (tiles.js
// buildBarTiles): H bottle shelf, A/a/I bar counter (the barkeep), i stool, t table with a
// candle, k booth seat, Y/y the piano, $ framed photos of regulars, M/m the door out.
// `look: 'bar'` gives it its own checker floor and green walls. The street door (`go`) is
// filled in from the city layout.
export const BAR = {
  id: 'bar',
  name: 'The Brass Lantern',
  look: 'bar',
  rows: [
    '##############################',
    '#HHHHHHHHH####HHH#####$$$$$$$#',
    '#.........#.......Yy.........#',
    '#AAaAIAaAA#..................#',
    '#............................#',
    '#.i..i..i.....kkk....kkk.....#',
    '#.............ttt....ttt...L.#',
    '#.L...........kkk....kkk.....#',
    '#............................#',
    '#..t....t.......t......t.....#',
    '#............................#',
    '#..kkk...............kkk.....#',
    '#..ttt.......L.......ttt..L..#',
    '#..kkk...............kkk.....#',
    '#............................#',
    '#########Mm###################',
  ],
  spawn: { tx: 9, ty: 14 },
  dark: 0.42,
  // Who works here, where the regulars stand around (custom townsfolk with no job, anyone
  // whose job is shut for the day, and shopkeepers on their day off), and a few faces who
  // are just here. Enough spots for a full house.
  staff: [{ name: 'Lou', spot: { tx: 5, ty: 2, facing: 'down' } }],
  spots: [
    { tx: 12, ty: 8, facing: 'down' }, { tx: 4, ty: 4, facing: 'up' }, { tx: 18, ty: 9, facing: 'left' }, { tx: 6, ty: 10, facing: 'right' },
    { tx: 12, ty: 5, facing: 'right' }, { tx: 19, ty: 6, facing: 'left' }, { tx: 24, ty: 6, facing: 'right' }, { tx: 25, ty: 9, facing: 'left' },
    { tx: 10, ty: 10, facing: 'up' }, { tx: 14, ty: 11, facing: 'down' }, { tx: 6, ty: 12, facing: 'left' }, { tx: 20, ty: 12, facing: 'right' },
    { tx: 17, ty: 4, facing: 'down' }, { tx: 27, ty: 4, facing: 'down' }, { tx: 3, ty: 8, facing: 'right' }, { tx: 12, ty: 14, facing: 'up' },
    { tx: 26, ty: 11, facing: 'left' }, { tx: 8, ty: 4, facing: 'up' },
  ],
  extras: [{ tx: 17, ty: 5, facing: 'left' }, { tx: 27, ty: 13, facing: 'left' }, { tx: 9, ty: 12, facing: 'right' }],
  interactions: {
    barkeep: { label: 'Bar', panel: 'talk', who: 'Lou' },
    piano: { label: 'Piano', panel: 'piano' },
    barDoor: { label: 'Street', panel: 'exitPlace' },
  },
};

// ---------- Phase 21: more places to walk into ----------
// The same legend as the bar, plus (tiles.js buildPlaceTiles): J jukebox, $ framed posters,
// ^ the movie screen, ~ theater seats, % clothes rack, & bargain bin, - pew, * candle
// stand, | altar, ! stained glass, { a wall of books, @ a bookcase, ; the card catalog,
// C/h the circulation desk. Each has its own floor and walls (`look`), how dark it is
// (`dark`), who works there (`staff`), and spots for regulars and passers-by.

// The Owl Diner: a counter with stools, booths, a jukebox. 22 x 13.
export const DINER = {
  id: 'diner', name: 'The Owl Diner', look: 'diner', dark: 0.22,
  rows: [
    '######################',
    '#$$$$$$$##########$$$#',
    '#.........#..........#',
    '#AaAIAAaAA#.........J#',
    '#....................#',
    '#.i.i.i.i....kkk.kkk.#',
    '#............ttt.ttt.#',
    '#.L..........kkk.kkk.#',
    '#....................#',
    '#.kkk.kkk............#',
    '#.ttt.ttt.........L..#',
    '#.kkk.kkk............#',
    '#########Mm###########',
  ],
  spawn: { tx: 9, ty: 11 },
  staff: [{ name: 'Dot', spot: { tx: 4, ty: 2, facing: 'down' } }],
  spots: [{ tx: 10, ty: 8, facing: 'down' }, { tx: 17, ty: 8, facing: 'up' }, { tx: 7, ty: 4, facing: 'up' }, { tx: 12, ty: 10, facing: 'left' }],
  extras: [{ tx: 5, ty: 4, facing: 'up' }, { tx: 12, ty: 6, facing: 'right' }, { tx: 5, ty: 10, facing: 'left' }],
  interactions: {
    barkeep: { label: 'Counter', panel: 'talk', who: 'Dot' },
    jukebox: { label: 'Jukebox', panel: 'jukebox' },
    barDoor: { label: 'Street', panel: 'exitPlace' },
  },
};

// The Bijou: the auditorium (screen, seats) through an arch from the lobby. 24 x 13.
export const BIJOU = {
  id: 'bijou', name: 'The Bijou', look: 'bijou', dark: 0.5,
  rows: [
    '########################',
    '#^^^^^^^^^^^^^^^^^^^^^^#',
    '#......................#',
    '#..~~~~~~~~..~~~~~~~~..#',
    '#..~~~~~~~~..~~~~~~~~..#',
    '#..~~~~~~~~..~~~~~~~~..#',
    '#......................#',
    '##########....##########',
    '#$$$$$$$$$#..#$$$$$$$$$#',
    '#......................#',
    '#.L..AaAaA........L....#',
    '#......................#',
    '###########Mm###########',
  ],
  spawn: { tx: 11, ty: 11 },
  staff: [{ name: 'Teddy', spot: { tx: 7, ty: 9, facing: 'down' } }],
  spots: [{ tx: 16, ty: 9, facing: 'left' }, { tx: 2, ty: 6, facing: 'up' }, { tx: 10, ty: 2, facing: 'up' }, { tx: 21, ty: 6, facing: 'up' }],
  extras: [{ tx: 11, ty: 4, facing: 'up' }, { tx: 20, ty: 9, facing: 'up' }],
  interactions: {
    barkeep: { label: 'Tickets', panel: 'talk', who: 'Teddy' },
    seats: { label: 'Sit', panel: 'seats' },
    barDoor: { label: 'Street', panel: 'exitPlace' },
  },
};

// Second Hand Rose: racks, bargain bins, a counter. 22 x 11.
export const THRIFT = {
  id: 'thrift', name: 'Second Hand Rose', look: 'thrift', dark: 0.3,
  rows: [
    '######################',
    '#SSSSSS##SSSSSS##SSSS#',
    '#....................#',
    '#.%%%..%%%..%%%..&&..#',
    '#....................#',
    '#.%%%..%%%..%%%..&&..#',
    '#....................#',
    '#.&&.........KKKRK...#',
    '#....................#',
    '#....L........L......#',
    '##########Mm##########',
  ],
  spawn: { tx: 10, ty: 9 },
  staff: [{ name: 'Rose', spot: { tx: 16, ty: 6, facing: 'down' } }],
  spots: [{ tx: 6, ty: 6, facing: 'up' }, { tx: 12, ty: 2, facing: 'up' }, { tx: 19, ty: 4, facing: 'left' }, { tx: 4, ty: 8, facing: 'right' }],
  extras: [{ tx: 8, ty: 4, facing: 'down' }],
  interactions: {
    register: { label: 'Counter', panel: 'talk', who: 'Rose' },
    bins: { label: 'Bins', panel: 'talk', who: 'Rose', entry: 'bins' },
    barDoor: { label: 'Street', panel: 'exitPlace' },
  },
};

// St. Brigid's: pews, an altar, candles in the side aisles. 20 x 12.
export const CHAPEL = {
  id: 'chapel', name: 'St. Brigid’s Chapel', look: 'chapel', dark: 0.5,
  rows: [
    '####################',
    '#!!!!!!!###!!!Mm!!!#',
    '#*......||||......*#',
    '#..................#',
    '#..-----....-----..#',
    '#..................#',
    '#..-----....-----..#',
    '#..................#',
    '#..-----....-----..#',
    '#*.......rr.......*#',
    '#........rr........#',
    '#########Mm#########',
  ],
  spawn: { tx: 9, ty: 10 },
  staff: [{ name: 'Abernathy', spot: { tx: 13, ty: 3, facing: 'left' } }],
  spots: [{ tx: 2, ty: 7, facing: 'right' }, { tx: 16, ty: 5, facing: 'up' }, { tx: 10, ty: 7, facing: 'up' }],
  extras: [{ tx: 4, ty: 5, facing: 'up' }],
  interactions: {
    candles: { label: 'Candles', panel: 'talk', who: 'Abernathy', entry: 'candle' },
    barDoor: { label: 'Street', panel: 'exitPlace' },
  },
};

// The Kessler University Library's reading room: stacks, the circulation desk (Morgan),
// the card catalog (the library's own services), and Ms. Achterberg by Special
// Collections when the library's open. 24 x 12.
export const LIBRARY = {
  id: 'library', name: 'Kessler University Library', look: 'library', dark: 0.28,
  rows: [
    '########################',
    '#{{{{{{{{{{###{{{{{{{{{#',
    '#......................#',
    '#.@@@.@@@.@@@..........#',
    '#...............CCh....#',
    '#.@@@.@@@.@@@..........#',
    '#......................#',
    '#.tt..tt..rrrrrr..;;.L.#',
    '#.......L.rrrrrr.......#',
    '#.tt..tt...............#',
    '#......................#',
    '###########Mm###########',
  ],
  spawn: { tx: 11, ty: 10 },
  // Morgan's desk; the keeper of the place stands by Special Collections.
  jobSpots: { Morgan: { tx: 17, ty: 3, facing: 'down' } },
  keeperSpot: { tx: 20, ty: 9, facing: 'left' },
  spots: [{ tx: 14, ty: 2, facing: 'up' }, { tx: 13, ty: 6, facing: 'down' }, { tx: 3, ty: 10, facing: 'up' }],
  extras: [{ tx: 4, ty: 8, facing: 'up' }, { tx: 13, ty: 4, facing: 'left' }],
  interactions: {
    circ: { label: 'Desk', panel: 'talk', who: 'Morgan' },
    catalog: { label: 'Catalog', panel: 'catalog' },
    barDoor: { label: 'Street', panel: 'exitPlace' },
  },
};

// Erin's Wandering Brush (Phase 28): an interior designer's studio and showroom. Erin works
// the counter; the floor is set out like rooms you could live in. Extra legend (tiles.js):
// p paint cans on a wall shelf, ` an easel. The numbered pieces are the decor itself, on show.
export const BRUSH = {
  id: 'brush', name: 'Erin’s Wandering Brush', look: 'studio', dark: 0.16,
  rows: [
    '######################',
    '#$$pp$$$##$$$$##pp$$$#',
    '#....................#',
    '#AAaAA.....`....0.._.#',
    '#....................#',
    '#..3333.....5..2...6.#',
    '#....................#',
    '#.1..........%%%....8#',
    '#....................#',
    '#..5.7.....3333....1.#',
    '#....................#',
    '#.L................L.#',
    '#########Mm###########',
  ],
  spawn: { tx: 9, ty: 11 },
  jobSpots: { Erin: { tx: 3, ty: 2, facing: 'down' } },
  // Phase 29: Ryan, over lunch, leaning on the counter across from her.
  sitSpots: { Ryan: { tx: 4, ty: 4, facing: 'up' } },
  spots: [{ tx: 12, ty: 4, facing: 'up' }, { tx: 7, ty: 8, facing: 'right' }, { tx: 17, ty: 6, facing: 'up' }],
  extras: [{ tx: 16, ty: 8, facing: 'left' }, { tx: 6, ty: 6, facing: 'down' }],
  interactions: {
    barkeep: { label: 'Counter', panel: 'erinShop' },
    easel: { label: 'Easel', panel: 'easel' },
    barDoor: { label: 'Street', panel: 'exitPlace' },
  },
};

// Every room you walk into off the street, and the place on the map it belongs to.
export const PLACE_ROOMS = { bar: BAR, diner: DINER, bijou: BIJOU, thrift: THRIFT, chapel: CHAPEL, library: LIBRARY, brush: BRUSH };
export const PLACE_OF_ROOM = { bar: 'bar', diner: 'diner', bijou: 'bijou', thrift: 'thrift', chapel: 'chapel', library: 'library', brush: 'brush' };

export const ROOMS = { shop: SHOP_FLOOR, lab: LAB };   // Phase 27: BACK_ROOM is kept only for the record (old saves move home)
