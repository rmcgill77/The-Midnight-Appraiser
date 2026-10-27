// St. Brigid's churchyard (v2.5), behind the chapel. By day: mourners, a gardener, the
// ghost-tour guide, kids on a dare, and Mike, the Gravekeeper, outside his shed; every stone
// can be read, and what's carved on it hints at what's under it. By night (with Mike's gate
// key, through the chapel's side gate): digging, the bell, and the dead (game/graves.js).
//
// Three sections, deeper and richer to the north, each behind an iron gate Mike holds the
// key to: the Old Yard (open), the Lower Rows (his key at four hearts) and the Crypts (at
// eight). Legend (city tiles): X hedge, " grass, , path, t tree, l lantern, b bench,
// 1 headstone, 2 stone cross, 3 obelisk, C mausoleum wall, M tomb door, Y iron fence,
// R section gate, ! the way out, h H U Mike's shed (roof, wall, door).

export const CEMETERY = {
  id: 'cemetery', name: 'St. Brigid’s Churchyard', tiles: 'city', outdoor: true,
  rows: [
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","""X',
    'X""",""CCCCC"""CCCCC""""""",,"""""CCCCC"""CCCCC"""","""X',
    'X"t",""CCCCC"""CCCCC""""""",,"""""CCCCC"""CCCCC"""","t"X',
    'X""",""""M"""""""M""""""""",,"""""""M"""""""M"""""","""X',
    'X"",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,""X',
    'X""","""""""""""""""""""""l,,"""""""""""""""""""""","""X',
    'X""",""3""3""3""3""3""3"""",,"""3""3""3""3""3""3""","""X',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","""X',
    'X""",""3""3""3""3""3""3"""",,"""3""3""3""3""3""3""","""X',
    'X""","""""""""""""""""""t"",,""t""""""""""""""""""","""X',
    'XYYYYYYYYYYYYYYYYYYYYYYYYYYRRYYYYYYYYYYYYYYYYYYYYYYYYYYX',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","""X',
    'X""","2"2"2"2"2"2"2"2"2"2"",,""2"2"2"2"2"2"2"2"2"2","""X',
    'X"t","""""""""""""""""""""",,"""""""""""""""""""""","t"X',
    'X""","2"2"2"2"2"2"2"2"2"2"",,""2"2"2"2"2"2"2"2"2"2","""X',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","""X',
    'X"",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,""X',
    'X""","""""""""""""""""""""",,l""""""""""""""""""""","""X',
    'X""","2"2"2"2"2"2"2"2"2"2"",,""2"2"2"2"2"2"2"2"2"2","""X',
    'X""","""""""""""""""""""""l,,"""""""""""""""""""""","""X',
    'X""","2"2"2"2"2"2"2"2"2"2"",,""2"2"2"2"2"2"2"2"2"2","""X',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","""X',
    'XYYYYYYYYYYYYYYYYYYYYYYYYYYRRYYYYYYYYYYYYYYYYYYYYYYYYYYX',
    'X""","""""""""""""""""""""",,"""""""""""""hhhhhhhh","""X',
    'X""","1"1"1"1"1"1"1"1"1"1"",,""1"1"1"1""""hhhhhhhh","""X',
    'X"t","""""""""""""""""""""",,"""""""""""""HHHUHHHH","""X',
    'X""","1"1"1"1"1"1"1"1"1"1"",,""1"1"1"1""""""""""""","""X',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","t"X',
    'X"",,l,,,,,,,,,,,,,,,,,b,,,,,,,,,,,,,,,,,,,,,,,,,,l,,""X',
    'X""","""""""""""""""""""""l,,"""""""""""""""""""""","""X',
    'X""","1"1"1"1"1"1"1"1"1"1"",,""1"1"1"1"1"1"1"1"1""","""X',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","""X',
    'X""","t"""""""""""""""""""",,"""""""""""""""""""t"","""X',
    'X"",,,,,,,,,,,,,,,,,b,,,,,,,,,,,,,,b,,,,,,,,,,,,,,,,,""X',
    'X""","""""t"""""""""""""""",,l"""""""""""""""t""""","""X',
    'X"t","""""""""""""""""""""",,"""""""""""""""""""""","t"X',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","""X',
    'X""","""""""""""""""""""""",,"""""""""""""""""""""","""X',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXX!!XXXXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
  spawn: { tx: 27, ty: 37 },
  // Sections, top to bottom rows; key: what opens the gate into it (data: GEAR).
  sections: [
    { id: 'crypts', name: 'The Crypts', y0: 1, y1: 10, key: 'crypt', depth: 3 },
    { id: 'lower', name: 'The Lower Rows', y0: 12, y1: 22, key: 'lower', depth: 2 },
    { id: 'old', name: 'The Old Yard', y0: 24, y1: 38, key: null, depth: 1 },
  ],
  gates: [{ ty: 23, key: 'lower' }, { ty: 11, key: 'crypt' }],
  mike: { day: { tx: 46, ty: 27, facing: 'down' }, night: { tx: 44, ty: 27, facing: 'down' } },
  spots: [{ tx: 12, ty: 26, facing: 'up' }, { tx: 20, ty: 32, facing: 'up' }, { tx: 34, ty: 28, facing: 'up' }, { tx: 9, ty: 30, facing: 'right' }],
  extras: [{ tx: 7, ty: 26, facing: 'up' }, { tx: 15, ty: 28, facing: 'up' }, { tx: 33, ty: 26, facing: 'up' }, { tx: 40, ty: 32, facing: 'up' }, { tx: 22, ty: 36, facing: 'left' }, { tx: 30, ty: 30, facing: 'down' }, { tx: 10, ty: 20, facing: 'up' }, { tx: 36, ty: 16, facing: 'up' }],
  interactions: {
    grave: { label: 'Read', panel: 'grave' },
    gate: { label: 'Gate', panel: 'cemGate' },
    cemExit: { label: 'Leave', panel: 'cemExit' },
    shed: { label: 'Mike’s shed', panel: 'shed' },
  },
};

// What Mike sells from his shed. need: hearts (or 'met'). once: a thing you keep.
export const GEAR = {
  shovel: { name: 'A grave spade', price: 35, once: true, need: 'met', blurb: 'Square blade, ash handle, older than you. “Bring it back clean.”' },
  oil: { name: 'Lantern oil', price: 6, need: 'met', blurb: 'One flask lights you through one night in the yard. The dark takes longer to notice you.' },
  gate: { name: 'Side gate key', price: 15, once: true, need: 'met', blurb: 'For the gate beside the chapel, after dark. “I didn’t give you this.”' },
  lower: { name: 'Key to the Lower Rows', price: 40, once: true, need: 4, blurb: 'Iron, heavy, cold even in your pocket.' },
  crypt: { name: 'Key to the Crypts', price: 120, once: true, need: 8, blurb: 'A long key on a ring of three. “The other two are for doors you don’t want.”' },
};

// The tombs in the Crypts each hold one relic. Each does something for you for good.
export const RELICS = [
  { id: 'lantern', name: 'The Sexton’s Lantern', blurb: 'A tin lantern that lights itself. In the dark, things take longer to notice you.' },
  { id: 'locket', name: 'A Widow’s Locket', blurb: 'Two portraits, one scratched out. Out at night, frights hit you a little softer.' },
  { id: 'coin', name: 'The Ferryman’s Coin', blurb: 'Worn smooth on one side. Mike lets you dig one more grave a week.' },
  { id: 'rope', name: 'The Bell Rope', blurb: 'A length of the old bell rope. The first toll each night wakes nobody.' },
];

// Epitaphs: a name, the years, and a line that (usually) tells you what's below.
export const FIRST = ['Agnes', 'Silas', 'Martha', 'Ezra', 'Cora', 'Josiah', 'Edith', 'Amos', 'Hattie', 'Ward', 'Lavinia', 'Otis', 'Mabel', 'Cyrus', 'Della', 'Horace', 'Ida', 'Jasper', 'Nell', 'Thaddeus', 'Opal', 'Gideon', 'Winifred', 'Lemuel'];
export const LAST = ['Pell', 'Harrow', 'Vance', 'Doyle', 'Quill', 'Marsh', 'Kessler', 'Fenn', 'Gault', 'Ashby', 'Crane', 'Moody', 'Thorne', 'Blackwood', 'Larkin', 'Sexton', 'Rook', 'Winter'];
export const LINES = {
  rich: ['She took it all with her.', 'All he had, he kept.', 'Buried as he lived: well.', 'Her jewels and her secrets.', 'Rich in this world.', 'He trusted no bank.'],
  empty: ['At rest.', 'Gone home.', 'Asleep in the Lord.', 'Beloved.', 'Remembered.', 'Peace at last.'],
  cursed: ['Let no hand disturb.', 'What she kept, keep buried.', 'Do not wake what sleeps.', 'He brought it home from the sea.', 'Forgive her what she carried.', 'Burn what he left.'],
  angry: ['He did not go quietly.', 'Taken before her time.', 'Not here willingly.', 'Wronged.', 'He waits.', 'She will be heard.'],
};
// What turns up, by section: weights for rich, empty, cursed, angry.
export const FATES = { old: [30, 42, 18, 10], lower: [36, 26, 22, 16], crypts: [42, 12, 24, 22] };

// Who's in the yard by day, and what they say.
export const YARD_LINES = [
  'A mourner, kneeling: “Forty years. You’d think I’d have run out of things to tell him.”',
  'The gardener, clipping grass round a stone: “They don’t mind the noise. The living complain.”',
  'A tour guide, to nobody: “And on your left, the grave that rings its own bell. Nights only. Tickets are nonrefundable.”',
  'A kid, daring another: “Touch the big one. Touch it. You won’t.”',
  'A woman with flowers: “Same flowers every week. She’d have hated them. I keep bringing them.”',
  'An old man on the bench: “Mike knows where everybody is. Ask him. He won’t tell you, but ask.”',
];
