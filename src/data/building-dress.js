// Buildings, dressed (Phase 32): what turns flat blocks of roof and wall into buildings. Roofs get a ridge and two
// slopes, shaded edges and the odd chimney, vent or aerial; fronts get shutters, flower boxes, fire escapes, air
// conditioners, posters, a stoop at the door and a shadow on the pavement at their foot. All of it is painted by tile
// (with a look at the neighbours), after the tiles' own art and the fronts are drawn, and varies with the district
// and the season. Pure drawing: `g` is a 2D context.

const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const shadeHex = (hex, f) => {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f))));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
};
const IRON = '#0c0d12', IRON_L = '#262a34', STONE_L = '#5c5c62', STONE = '#4a4a4e', BRICK = '#5a3328';
const SHUTTERS = ['#3a5a46', '#5a3a34', '#34445a', '#5a4e34', '#4a3a5a'];
const BLOOMS = { spring: ['#e8a0b8', '#e8d070', '#c8a0e0'], summer: ['#c0503a', '#d8b040', '#e0e0d0', '#7a6ad0'], autumn: ['#c0702a', '#a04a22', '#d8a040'], winter: null };

// How many tiles run on from this one in a direction while `same(tile)` holds.
const run = (map, tx, ty, dx, dy, same, max = 14) => { let n = 0; while (n < max && same(map.at(tx + dx * (n + 1), ty + dy * (n + 1)))) n++; return n; };

export function dressBuildingTile(g, map, tx, ty, ch, h, season, { districtOf, isRoof, isFace, isHouseDoor }) {
  const x = tx * 16, y = ty * 16;
  if (isRoof(ch)) return dressRoof(g, map, tx, ty, ch, h, season, districtOf(ch));
  if (isFace(ch)) return dressFront(g, map, tx, ty, ch, h, season, districtOf(ch), { isRoof, isFace });
  if (isHouseDoor(ch)) {
    // a stoop: two stone steps down to the pavement, and a doormat
    const below = map.at(tx, ty + 1);
    if (below === ',') { R(g, x + 1, y + 16, 14, 3, STONE_L); R(g, x + 2, y + 19, 12, 2, STONE); R(g, x + 1, y + 21, 14, 1, 'rgba(0,0,0,0.3)'); }
    R(g, x + 4, y + 12, 8, 2, '#4a2a26');
  }
}

function dressRoof(g, map, tx, ty, ch, h, season, d) {
  const x = tx * 16, y = ty * 16, same = c => c === ch;
  const up = run(map, tx, ty, 0, -1, same), down = run(map, tx, ty, 0, 1, same), left = same(map.at(tx - 1, ty)), right = same(map.at(tx + 1, ty));
  const rows = up + down + 1, pos = (up + 0.5) / rows;               // how far down the roof this tile is, 0 at the top edge to 1
  // two slopes: the far one (north) darker, the near one a touch lit, and a ridge between them
  if (rows >= 3) {
    if (pos < 0.5) R(g, x, y, 16, 16, 'rgba(0,0,0,0.12)'); else R(g, x, y, 16, 16, 'rgba(255,236,210,0.05)');
    if (up === down || (rows % 2 === 0 && up === down + 1)) { R(g, x, y + (up === down ? 7 : 15), 16, 2, d.roofLight); R(g, x, y + (up === down ? 9 : 17 - 16 + 1), 16, 1, 'rgba(0,0,0,0.3)'); }
  }
  // shingle courses staggered across the tile
  for (let j = 0; j < 16; j += 4) { const o = (j / 4 + tx) % 2 ? 5 : 11; R(g, x + o, y + j, 1, 3, d.roofDark); }
  // the edges: the top of the roof catches the light, the sides fall away in shadow
  if (up === 0) { R(g, x, y, 16, 1, d.trim); R(g, x, y + 1, 16, 1, d.roofLight); }
  if (!left) { R(g, x, y, 2, 16, d.roofDark); R(g, x + 2, y, 1, 16, 'rgba(0,0,0,0.2)'); }
  if (!right) { R(g, x + 14, y, 2, 16, d.roofDark); R(g, x + 13, y, 1, 16, 'rgba(0,0,0,0.2)'); }
  // things on the roof, well inside it
  if (up >= 1 && down >= 1 && left && right) {
    if (h % 53 === 0) { R(g, x + 10, y + 2, 4, 8, BRICK); R(g, x + 10, y + 2, 1, 8, shadeHex(BRICK, 0.7)); R(g, x + 9, y + 1, 6, 2, STONE_L); R(g, x + 11, y + 10, 5, 2, 'rgba(0,0,0,0.3)'); }   // a chimney
    else if (h % 41 === 0 && (ch === 'n' || ch === 'h' || ch === 'a')) { R(g, x + 3, y + 5, 8, 6, '#6a6f7e'); R(g, x + 3, y + 5, 8, 1, '#8e939e'); R(g, x + 5, y + 7, 4, 3, IRON_L); R(g, x + 4, y + 11, 9, 2, 'rgba(0,0,0,0.3)'); }   // an air conditioner
    else if (h % 71 === 0) { R(g, x + 8, y + 1, 1, 12, IRON); R(g, x + 4, y + 3, 9, 1, IRON); R(g, x + 5, y + 6, 7, 1, IRON); }   // an aerial
    else if (h % 97 === 0 && ch === 'n') { R(g, x + 3, y + 4, 10, 6, '#5a4130'); R(g, x + 3, y + 3, 10, 2, '#7a5a40'); R(g, x + 5, y + 10, 1, 4, IRON); R(g, x + 10, y + 10, 1, 4, IRON); }   // a water tank
  }
  void season;
}

function dressFront(g, map, tx, ty, ch, h, season, d, { isRoof, isFace }) {
  const x = tx * 16, y = ty * 16, below = map.at(tx, ty + 1), above = map.at(tx, ty - 1);
  const row = isRoof(above) ? 0 : (isFace(below) || below === 'o' || below === 'O') ? 1 : 2;
  const grp = ((tx >> 2) * 31 + (ty >> 2) * 7) >>> 0, gh = (grp * 2654435761) >>> 0;
  const district = ch.toLowerCase();
  const lowerRow = isFace(map.at(tx, ty + 1)) ? null : row;       // only the ground row has the ground floor's things
  // shutters beside the windows: houses on the Westside and in Eastgate
  if ((district === 'w' || district === 'e') && (gh >>> 5) % 3 !== 0) {
    const c = SHUTTERS[(gh >>> 9) % SHUTTERS.length], cd = shadeHex(c, 0.7);
    const spans = row === 0 ? [[7, 9]] : row === 1 ? [[0, 6]] : [[2, 10]];
    for (const [a, hgt] of spans) for (const sx of [1, 13]) { R(g, x + sx, y + a, 2, hgt, c); R(g, x + sx + (sx === 1 ? 1 : 0), y + a, 1, hgt, cd); }
  }
  // flower boxes under the ground windows
  if (lowerRow === 2 && ['w', 'e', 'a'].includes(district) && (gh >>> 12) % 3 !== 1 && h % 7 < 5) {
    R(g, x + 3, y + 12, 10, 3, '#4a3220'); R(g, x + 3, y + 12, 10, 1, '#6a4a30');
    const B = BLOOMS[season];
    if (B) for (let i = 0; i < 5; i++) { R(g, x + 4 + i * 2, y + 10 + (i % 2), 1, 2, '#2e5a38'); R(g, x + 4 + i * 2, y + 10 + (i % 2), 1, 1, B[(h >>> i) % B.length]); }
    else for (let i = 0; i < 5; i++) R(g, x + 3 + i * 2, y + 11, 2, 1, '#c8ccd2');
  }
  // fire escapes zig-zagging down the Narrows and the harbour fronts
  if ((district === 'n' || district === 'h') && (gh >>> 4) % 5 === 0 && (tx & 3) >= 1 && (tx & 3) <= 2) {
    R(g, x + 1, y + 13, 14, 1, IRON); R(g, x + 1, y + 10, 14, 1, IRON_L);
    for (let i = 0; i < 14; i += 3) R(g, x + 1 + i, y + 10, 1, 4, IRON_L);
    for (let i = 0; i < 10; i++) R(g, x + 3 + i, y + (row === 2 ? 0 : 1) + i, 1, 1, IRON);
  }
  // air conditioners hung under the windows, and posters pasted on the lower walls
  if (['n', 'h', 'a'].includes(district) && row === 1 && h % 9 === 0) { R(g, x + 4, y + 8, 8, 5, '#6a6f7e'); R(g, x + 4, y + 8, 8, 1, '#8e939e'); R(g, x + 6, y + 10, 4, 2, IRON_L); }
  if (district === 'n' && lowerRow === 2 && h % 11 === 0) { const c = ['#c0503a', '#d8b040', '#7a6ad0', '#4e9a52'][(h >>> 4) % 4]; R(g, x + 1, y + 3, 2, 7, shadeHex(c, 0.9)); R(g, x + 1, y + 3, 2, 2, c); }
  // a drainpipe where one building ends and the next begins
  if (!isFace(map.at(tx - 1, ty)) && (row !== 0)) { R(g, x + 3, y, 1, 16, IRON_L); }
  // ---- the character of each district ----
  // Kessler Heights: stone halls with pilasters, dentilled cornices and arched windows
  if (district === 'k') {
    const stone = '#5c6278', stoneD = '#3e4358';
    if (row === 0) { for (let i = 0; i < 16; i += 2) R(g, x + i, y + 4, 1, 2, stoneD); R(g, x, y + 3, 16, 1, stone); }
    if ((tx & 3) === 0) { R(g, x, y, 3, 16, stone); R(g, x + 2, y, 1, 16, stoneD); if (row === 0) R(g, x - 1, y + 6, 5, 2, stone); if (lowerRow === 2) R(g, x - 1, y + 13, 5, 3, stone); }
    if (row === 1) { R(g, x + 4, y, 8, 1, stone); R(g, x + 5, y - 1, 6, 1, stone); }                       // an arch over the upper window
    if (lowerRow === 2) R(g, x + 4, y, 8, 1, stone);
  }
  // Harbour Row: warehouses with roll-up doors, stencilled numbers and a loading dock
  if (district === 'h') {
    if (lowerRow === 2 && (gh >>> 3) % 3 === 0 && (tx & 3) >= 1 && (tx & 3) <= 2) {
      R(g, x, y + 1, 16, 14, '#3a3f48'); for (let i = 2; i < 14; i += 2) R(g, x, y + i, 16, 1, '#2a2e36'); R(g, x, y + 12, 16, 3, '#c8a23a'); for (let i = 0; i < 16; i += 4) R(g, x + i, y + 12, 2, 3, IRON);
      R(g, x, y + 15, 16, 1, '#5a5f6e');
    }
    // a bay number on a painted plate, on about one warehouse in three (not on every one)
    if (row === 1 && (tx & 3) >= 1 && (tx & 3) <= 2 && (gh >>> 6) % 3 === 0) {
      const num = 1 + (gh >>> 9) % 49, left = (tx & 3) === 1;
      R(g, left ? x + 3 : x, y + 1, left ? 13 : 12, 10, '#23262e'); R(g, left ? x + 3 : x, y + 1, left ? 13 : 12, 1, '#c8a23a'); R(g, left ? x + 3 : x, y + 10, left ? 13 : 12, 1, '#c8a23a');
      drawDigit(g, left ? x + 6 : x + 3, y + 3, left ? Math.floor(num / 10) : num % 10, '#e8e0c8');
    }
    if (lowerRow === 2 && (gh >>> 10) % 4 === 0) { R(g, x, y + 10, 16, 5, '#5a5f6e'); R(g, x, y + 10, 16, 1, '#7a8090'); }
  }
  // shop fronts on Old Market, Eastgate and in the Narrows: a blade sign hung over the pavement, and Eastgate's striped awnings
  if ((district === 'a' || district === 'e' || district === 'n') && row === 1 && (tx & 3) === 3 && (gh >>> 8) % 2 === 0) {
    const c = ['#a63a34', '#3d63b5', '#c8a23a', '#4e9a52', '#7a3a5e'][(gh >>> 11) % 5];
    R(g, x + 9, y + 3, 7, 1, IRON); R(g, x + 11, y + 4, 1, 2, IRON); R(g, x + 14, y + 4, 1, 2, IRON); R(g, x + 10, y + 6, 6, 7, IRON_L); R(g, x + 11, y + 7, 4, 5, c); R(g, x + 12, y + 8, 2, 2, shadeHex(c, 1.5));
  }
  if (district === 'e' && lowerRow === 2 && (gh >>> 2) % 2 === 0) {
    const c1 = ['#8a3a34', '#34588a', '#5a7a3a'][(gh >>> 14) % 3];
    for (let i = 0; i < 16; i += 4) { R(g, x + i, y, 2, 4, c1); R(g, x + i + 2, y, 2, 4, '#d8d0bc'); }
    R(g, x, y + 4, 16, 1, 'rgba(0,0,0,0.35)');
  }
  // washing lines strung across the Narrows
  if (district === 'n' && row === 1 && (gh >>> 7) % 4 === 0) {
    R(g, x, y + 2, 16, 1, '#8a867c');
    for (let i = 0; i < 3; i++) { const c = ['#d8d0bc', '#a63a34', '#3d63b5', '#c8a23a'][(h >>> (i * 3)) % 4]; R(g, x + 2 + i * 5, y + 3, 3, 4, c); R(g, x + 2 + i * 5, y + 3, 3, 1, shadeHex(c, 1.3)); }
  }
  // the building's foot: a dark line, and a shadow thrown onto the pavement
  if (lowerRow === 2) {
    R(g, x, y + 15, 16, 1, 'rgba(0,0,0,0.4)');
    if (map.at(tx, ty + 1) === ',') R(g, x, y + 16, 16, 3, 'rgba(0,0,0,0.2)');
  }
}

// A digit, 3 x 5 pixels, for the numbers stencilled on warehouses.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
function drawDigit(g, x, y, d, c) { const m = DIGITS[d] ?? DIGITS[0]; for (let i = 0; i < 15; i++) if (m[i] === '1') R(g, x + (i % 3) * 2, y + Math.floor(i / 3) * 2, 2, 2, c); }
