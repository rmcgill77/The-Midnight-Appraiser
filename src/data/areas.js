import { CEMETERY } from './cemetery.js';
// Outdoor areas joined by their edges (v2.1, game/edges.js): Lantern Park (v2.2); the beach
// and the woods arrive in later updates. Each is a room drawn with the city's tiles (unless it
// says otherwise) and counts as "in town" for the clock.
//
// The three areas here are a small test loop, only reachable from god mode, that checks the
// joins work: a meadow with a path east to a grove and north to a pond.
// Legend (city tiles): X hedge, " grass, , path, t tree, b bench, L lamp.

export const EDGE_TEST = {
  'test-meadow': {
    id: 'test-meadow', name: 'Test meadow', tiles: 'city', outdoor: true, debug: true,
    rows: [
      'XXXXXXXXXXX,,XXXXXXXXXXX',
      'X"""""""""",,"""""""t""X',
      'X""t""""""",,""""""""""X',
      'X"""""""""",,""""""""""X',
      'X"""""L"""",,""""""""""X',
      'X"""""""""",,"""""""t""X',
      'X"""""""""",,,,,,,,,,,,,',
      'X"""""""""",,,,,,,,,,,,,',
      'X""b"""""""""""""""""""X',
      'X"""""""""""""""""""t""X',
      'X""""t"""""""""""""""""X',
      'X"""""""""""""""""L""""X',
      'X""""""""""""""""""""""X',
      'XXXXXXXXXXXXXXXXXXXXXXXX',
    ],
    spawn: { tx: 11, ty: 7 },
    edges: { north: { to: 'test-pond' }, east: { to: 'test-grove' } },
    interactions: {},
  },
  'test-grove': {
    id: 'test-grove', name: 'Test grove', tiles: 'city', outdoor: true, debug: true,
    rows: [
      'XXXXXXXXXXXXXXXXXXXX',
      'X"t""t"""t""t""t"""X',
      'X""""""""""""""""""X',
      'X"t""""t"""""t""t""X',
      'X""""""""""""""""""X',
      'X""t"""""""""""t"""X',
      ',,,,,,,,,,""""""t""X',
      ',,,,,,,,,,"""""""""X',
      'X"""t""""",,"""t"""X',
      'X""""""""""""""""""X',
      'X"t"""t"""""t"""t""X',
      'XXXXXXXXXXXXXXXXXXXX',
    ],
    spawn: { tx: 4, ty: 7 },
    edges: { west: { to: 'test-meadow' } },
    interactions: {},
  },
  'test-pond': {
    id: 'test-pond', name: 'Test pond', tiles: 'city', outdoor: true, debug: true,
    rows: [
      'XXXXXXXXXXXXXXXXXXXXXXXX',
      'X""""t"""""""""""t"""""X',
      'X""""""""""""""""""""""X',
      'X""""""""bb""""""""""""X',
      'X""""""""""""""""""""""X',
      'X""t""""""""""""""""t""X',
      'X""""""""""""""""""""""X',
      'X""""""""",,,""""""""""X',
      'X""""""""""",,"""""""""X',
      'XXXXXXXXXXX,,XXXXXXXXXXX',
    ],
    spawn: { tx: 11, ty: 7 },
    edges: { south: { to: 'test-meadow' } },
    interactions: {},
  },
};

// v2.2: Lantern Park, through the gate at the top of the street north of Old Market Square.
// A pond, paths round a flower circle, a bandstand, lanterns that come on at dusk. The
// townsfolk come here on fine days, and birthdays are celebrated here (data/townsfolk.js).
// Legend (city tiles): X hedge, " grass, , path, t tree, b bench, l lantern, f flower bed,
// ~ water, S the bandstand (painted over these tiles).
export const PARK = {
  id: 'park', name: 'Lantern Park', tiles: 'city', outdoor: true,
  rows: [
      'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'X""""""""""""""""""""""""""""""""""""""""""""""""""X',
      'X"""""""""""""""""""""""",,""""""""""""""""""""""""X',
      'X"",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,""X',
      'X"",""""""""""""""""""""",,""""""""""""""""""""",""X',
      'X"",""""""~~~~~""""t""""",,"""""""""t""""""t"t"",""X',
      'X"","""~~~~~~~~~~~""""""l,,"""""t"""""f""""""f"",""X',
      'X"",""~~~~~~~~~~~~~"""""",,""""""""""""SSSSSS""",""X',
      'X"","~~~~~~~~~~~~~~~""""",,""""""""""""SSSSSS""",""X',
      'X"","~~~~~~~~~~~~~~~""""",,l"""""""""""SSSSSS""",""X',
      'X"",l~~~~~~~~~~~~~~~"t""",,""""""""""""SSSSSS""l,""X',
      'X"",""~~~~~~~~~~~~~""""""""""""""""""""SSSSSS""",""X',
      'X"","""~~~~~~~~~~~"""",,,,,,,,""""""t"",,,,,,""",""X',
      'X"",""""""~~~~~"""""",,,"""",,,""""""""""",""""",""X',
      'X"","""""""""""""""",,"""""""",,"t""""""t"l""""",""X',
      'X"",""""""b"""""""l",,""f""f"",,""""b""""",""""",""X',
      'X"",",,,,,,,,,,,,,,,,,"""ff""",,,,,,,,,,,,,,,,"",""X',
      'X"",",,,,,,,,,,,,,,,,,""f""f"",,,,,,,,,,,,,,,,"",""X',
      'X"",""""""""""b""""",,""",,""",,"l""""""b""""""",""X',
      'X"",""""""""""t""t""",,,",,",,,""""""""""""""""",""X',
      'X"",""t""""""""""""""",,,,,,,,"""""""t"""""""""",""X',
      'X"","""""~""""""""""""""",,""""""""""""""""""""","tX',
      'X"","""~~~~~""""""""""""",,""""""""""""""""""""",""X',
      'X"",""~~~~~~~"""""""""t"",,""""""""""""""""t"""",""X',
      'X"",l~~~~~~~~~""""""""""",,""""""""""""""""""""l,""X',
      'X"",""~~~~~~~""""""t"""t",,""""""""""""""""""""",""X',
      'X"","""~~~~~"""""""""l""",,"""l""""""t"""""""""",""X',
      'X"","""""~"""""""""t""""",,"t"""""""""""""""""t",""X',
      'X"",""t"""""""""""""""""l,,l""""t""""""""""""""",""X',
      'X"",""""b"""""""""""""""",,""""""""""""""""""""",""X',
      'X"",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,""X',
      'X""""""""""""""""""""""f",,"f""""""""""""""""""""""X',
      'Xt""""""""t"""""""""""""",,"""""""t""""t"""""""""""X',
      'XXXXXXXXXXXXXXXXXXXXXXXXX,,XXXXXXXXXXXXXXXXXXXXXXXXX',
  ],
  spawn: { tx: 25, ty: 30 },
  edges: { south: { to: 'city', shift: 102 } },
  bandstand: { tx: 39, ty: 7, w: 6, h: 5 },
  // A birthday party on the east lawn: a table with a cake, and where the guests stand.
  party: { table: { tx: 38, ty: 23 }, spots: [{ tx: 37, ty: 23, facing: 'right' }, { tx: 39, ty: 23, facing: 'left' }, { tx: 38, ty: 22, facing: 'down' }, { tx: 38, ty: 24, facing: 'up' }, { tx: 36, ty: 24, facing: 'right' }, { tx: 40, ty: 22, facing: 'left' }] },
  // Where people stand: by the benches, the flowers, the bandstand and the water.
  spots: [{ tx: 38, ty: 11, facing: 'right' }, { tx: 24, ty: 18, facing: 'up' }, { tx: 10, ty: 16, facing: 'up' }, { tx: 6, ty: 22, facing: 'down' }, { tx: 9, ty: 13, facing: 'up' }, { tx: 15, ty: 13, facing: 'up' }, { tx: 27, ty: 31, facing: 'right' }, { tx: 19, ty: 7, facing: 'down' }, { tx: 28, ty: 17, facing: 'left' }, { tx: 39, ty: 6, facing: 'down' }, { tx: 41, ty: 18, facing: 'left' }, { tx: 41, ty: 12, facing: 'up' }, { tx: 5, ty: 25, facing: 'up' }, { tx: 12, ty: 26, facing: 'up' }],
  extras: [{ tx: 7, ty: 29, facing: 'right' }, { tx: 11, ty: 21, facing: 'down' }, { tx: 12, ty: 14, facing: 'up' }, { tx: 16, ty: 5, facing: 'down' }, { tx: 10, ty: 4, facing: 'down' }, { tx: 23, ty: 15, facing: 'right' }, { tx: 45, ty: 7, facing: 'up' }, { tx: 27, ty: 14, facing: 'down' }],
  interactions: {},
};

// v2.3: the beach, down the boardwalk from the harbor. The Bait & Tackle shack, the snack
// shack and the lifeguard station along the boardwalk; sand, umbrellas and a volleyball net;
// the pier out to deep water and the old breakwater at the west end. Busy on a summer day,
// near empty in winter. Fishing: off the end of the pier, from the wet sand into the surf,
// or by the rocks (game/fishing.js).
// Legend (city tiles): _ sand, : wet sand, ~ the sea, d boardwalk and pier, r rocks,
// m umbrella, j towel, V volleyball net, g lifeguard chair, I ice cream cart, h/H the
// buildings (harbor roofs and fronts), D the Bait & Tackle door, Z the snack shack's,
// J the lifeguard station's.
export const BEACH = {
  id: 'beach', name: 'Gull Point Beach', tiles: 'city', outdoor: true,
  rows: [
      'XXXXXXXXXXXXXXXXXXXXXXXXdddXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      'X""""hhhhhhhhhhhh"""""""ddd""""""hhhhhhhhhh"""""hhhhhh"""""X',
      'X"t""hhhhhhhhhhhh"""""""ddd""t"""hhhhhhhhhh"""""hhhhhh""t""X',
      'X""""hhhhhhhhhhhh""t""""ddd""""""hhhhhhhhhh""t""hhhhhh"""""X',
      'X""""hhhhhhhhhhhh"""""""ddd""""""hhhhhhhhhh"""""hhhhhh"""""X',
      'X""""HHHHHHHHHHHH"b"""b"ddd"b""""HHHHHHHHHH"""""HHHHHH"""""X',
      'X""""HHHHHHHHHHHH""""t""ddd""""""HHHHHHHHHH"""""HHHHHH"""""X',
      'X""L"HHHHHDHHHHHH""L""""ddd"""L""HHHHZHHHHH"""L"HHJHHH"""L"X',
      'XddddddddddddddddddddddddddddddddddddddddddddddddddddddddddX',
      'XddddddddddddddddddddddddddddddddddddddddddddddddddddddddddX',
      'XddddddddddddddddddddddddddddddddddddddddddddddddddddddddddX',
      'X________________I_________________________dd______________X',
      'X__________________________________________dd______________X',
      'X____________________m_____________________dd______________X',
      'X________m____________jj_________m_________dd______________X',
      'X_________jj______________________jj_______dd______m_______X',
      'X__________________________________________dd_______jj_____X',
      'X______________m___________________________dd______________X',
      'X_______________jj_________m_______________dd______________X',
      'X_rrr_______________________jj_______m_____dd______________X',
      'X_rrr_________________________________jj___dd__________m___X',
      'X__rrr______m______________________________dd___________jj_X',
      'X_rrr________jj_________m____VVVVVVVV______dd___g__________X',
      'X_rrr____________________jj________________dd______________X',
      'X__rrr____________::::::::::::::::_________dd______________X',
      'X_rrr_______::::::::::::::::::::::::::::___dd___________:::X',
      'X:rr::::::::::::::~~~~~~~~~~~~~~~~:::::::::dd::::::::::::::X',
      'X::rr:::::::~~~~~~~~~~~~~~~~~~~~~~~~~~~~:::dd:::::::::::~~~~',
      '~~rr~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~dd~~~~~~~~~~~~~~~',
      '~~rr~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~dd~~~~~~~~~~~~~~~',
      '~~~rr~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~dddddddd~~~~~~~~~~~~',
      '~~rr~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~dddddddd~~~~~~~~~~~~',
      '~~rr~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  spawn: { tx: 25, ty: 2 },
  edges: { north: { to: 'city', shift: 126 } },
  // The Bait & Tackle shack: its front (for the storefront) and its door.
  tackle: { id: 'tackle', door: { tx: 10, ty: 7 }, roof: { tx: 5, ty: 1, w: 12, h: 4 } },
  // v2.4: where Kip stands: beside the shack door, or (Sundays) at the end of the pier.
  kip: { shack: { tx: 12, ty: 8, facing: 'down' }, pier: { tx: 46, ty: 31, facing: 'down' } },
  // On towels in the sun, round the volleyball net, at the ice cream cart.
  spots: [{ tx: 23, ty: 14, facing: 'down' }, { tx: 11, ty: 15, facing: 'down' }, { tx: 35, ty: 15, facing: 'down' }, { tx: 53, ty: 16, facing: 'down' }, { tx: 17, ty: 18, facing: 'down' }, { tx: 29, ty: 19, facing: 'down' }, { tx: 39, ty: 20, facing: 'down' }, { tx: 57, ty: 21, facing: 'down' }, { tx: 14, ty: 22, facing: 'down' }, { tx: 26, ty: 23, facing: 'down' }, { tx: 30, ty: 21, facing: 'down' }, { tx: 33, ty: 21, facing: 'down' }, { tx: 31, ty: 23, facing: 'up' }, { tx: 35, ty: 23, facing: 'up' }, { tx: 18, ty: 12, facing: 'up' }, { tx: 16, ty: 12, facing: 'right' }],
  // Out on the pier, along the boardwalk, at the water's edge.
  extras: [{ tx: 44, ty: 24, facing: 'right' }, { tx: 43, ty: 29, facing: 'left' }, { tx: 41, ty: 31, facing: 'down' }, { tx: 46, ty: 31, facing: 'down' }, { tx: 8, ty: 9, facing: 'down' }, { tx: 20, ty: 9, facing: 'up' }, { tx: 36, ty: 9, facing: 'up' }, { tx: 52, ty: 9, facing: 'down' }, { tx: 14, ty: 10, facing: 'right' }, { tx: 20, ty: 24, facing: 'down' }, { tx: 27, ty: 25, facing: 'down' }, { tx: 14, ty: 26, facing: 'down' }, { tx: 50, ty: 24, facing: 'down' }, { tx: 38, ty: 25, facing: 'down' }, { tx: 56, ty: 26, facing: 'down' }],
  // How many strangers come, by season (on a fine weekend; fewer on weekdays and in the wet).
  crowd: { summer: 1, spring: 0.55, autumn: 0.45, winter: 0.12 },
  interactions: { tackle: { label: 'Bait & Tackle', panel: 'tackle' }, snack: { label: 'Snack shack', panel: 'snack' }, lifeguard: { label: 'Lifeguard', panel: 'lifeguard' } },
};

// Every area the game knows about.
export const AREAS = { park: PARK, beach: BEACH, cemetery: CEMETERY, ...EDGE_TEST };
export const isArea = id => !!AREAS[id];
