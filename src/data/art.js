// Hand-made art (v2.1). Everything in the game is drawn by code until a picture for it is
// listed here; then the picture is used instead, and the code-drawn version stays as the
// fallback (a file that's missing or fails to load is simply skipped). Paths are relative to
// the `assets/` folder. The art brief (ART-BRIEF.md) gives the sizes and layouts.
//
//   tiles:       'set/name' → a PNG strip of 16x16 variants side by side (one is fine).
//                v2.2: 'set/name-spring' (or -summer, -autumn, -winter) is used in that season
//                instead, so grass and trees can change with the year.
//                Tall pieces (a tree's crown, a lamp's head) have their own size, listed in
//                TILE_NAMES below.
//   characters:  a person's name → a 24x32 sheet: four columns (walk frames), rows down,
//                up, left, right. Optional rows 5-8: standing (two frames each). A sheet
//                with only three rows (no left) has its right row mirrored.
//   portraits:   a person's name → a 48x48 PNG.
//   props:       reserved for later (furniture, signs, items).
//
// Example, once Morgan's art arrives:
//   tiles: { 'city/grass': 'tiles/city/grass.png' },
//   characters: { Kristen: 'characters/kristen.png' },
//   portraits: { Kristen: 'portraits/kristen.png' },

export const ART = {
  tiles: {},
  characters: {},
  portraits: {},
  props: {},
};

// Which tile each map character is, by tile set, for the names above. Only these can be
// swapped so far; the rest of each set stays code-drawn.
export const TILE_NAMES = {
  city: {
    '=': 'road', '+': 'crossing', ',': 'sidewalk', '"': 'grass', p: 'parking', X: 'hedge',
    t: 'tree-trunk', L: 'lamp-post', b: 'bench', Q: 'bus-stop-post',
    a: 'roof-oldmarket', w: 'roof-westside', k: 'roof-kessler', e: 'roof-eastgate', n: 'roof-narrows', h: 'roof-harbor',
    A: 'brick-oldmarket', W: 'brick-westside', K: 'brick-kessler', E: 'brick-eastgate', N: 'brick-narrows', H: 'brick-harbor',
    // v2.2: the river, the square, the districts' own ground, the park.
    '~': 'water', u: 'bridge', P: 'square-paving', F: 'fountain-base', B: 'square-bench', T: 'planter', f: 'flower-bed', i: 'picket-fence',
    y: 'alley-cobbles', z: 'bins', x: 'crates', q: 'campus-path', G: 'park-gate', S: 'bandstand-base', l: 'lantern-post',
    // v2.3: the harbor's jetties and the boardwalk to the beach.
    d: 'dock', _: 'sand', ':': 'wet-sand', r: 'rocks', m: 'umbrella-pole', j: 'towel', V: 'volleyball-net', g: 'lifeguard-chair', I: 'ice-cream-cart',
    // v2.5: St. Brigid's churchyard, and the rope across the woods trail.
    1: 'headstone', 2: 'stone-cross', 3: 'obelisk', C: 'mausoleum-wall', M: 'tomb-door', Y: 'iron-fence', R: 'yard-gate', '!': 'yard-exit-gate', U: 'shed-door', '%': 'woods-rope-left', '&': 'woods-rope-right',
    // v2.5b: the dunes and the beach signpost.
    s: 'dunes', '>': 'beach-signpost', '}': 'dune-fence',
  },
  // Pieces that stand above their tile, drawn with the people: [width, height].
  cityTall: { t: { name: 'tree-crown', size: [32, 32] }, T: { name: 'tree-crown', size: [32, 32] }, L: { name: 'lamp-head', size: [16, 16] }, Q: { name: 'bus-stop-sign', size: [16, 16] }, l: { name: 'lantern-head', size: [16, 16] }, m: { name: 'umbrella-top', size: [32, 24] }, g: { name: 'lifeguard-chair-top', size: [16, 16] }, I: { name: 'cart-canopy', size: [16, 16] }, 3: { name: 'obelisk-top', size: [16, 16] } },
  // Indoors: the basement and back rooms.
  base: { floor: 'floor', wallTop: 'wall-top', wallFace: 'wall-face', c: 'crate' },
};

export const fileName = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
