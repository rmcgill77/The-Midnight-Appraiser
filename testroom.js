// Phase 0 test room: the appraiser's back room. 22 x 13 tiles.
// Legend: # wall, S shelf wall, . floor, c crate, B/b bench, r rug, L lamp, D/d door.

export const TEST_ROOM = {
  id: 'back-room',
  name: 'The Back Room',
  rows: [
    '######################',
    '##SSS####SSSS####SS###',
    '#....................#',
    '#.cc.......Bb....L...#',
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
    bench: { label: 'Appraise', panel: 'bench' },
    door: { label: 'Shop', panel: 'door' },
  },
};
