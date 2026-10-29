// The seasons on the street (Phase 32): the small touches that tell you the time of year beyond the colour of the
// leaves. Autumn: leaf piles under the trees, pumpkins on the stoops. Spring: blossom drifted round the trees, daisies
// and dandelions in the grass. Summer: dappled shade under the trees, tufts and wildflowers. Winter: snow banked at
// the trunks, icicles under the eaves, wreaths on the doors, frost on the fences, dry tufts through the snow. Drawn
// onto the baked map, by tile, placed by hash. Pure drawing.

const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
const pick = (a, h) => a[(h >>> 0) % a.length];

export function dressSeason(g, tx, ty, ch, h, season, { isFace, isRoofAbove }) {
  const x = tx * 16, y = ty * 16;
  if (ch === 't' || ch === 'T') {                           // under the trees
    if (season === 'autumn') {
      const leaves = ['#a0602a', '#8a5a22', '#7a3a1c', '#c0702a'];
      for (let i = 0; i < 16; i++) { const a = (h >>> (i % 12)) & 15, b = (h >>> ((i * 3) % 13)) & 7; R(g, x + 1 + a % 14, y + 7 + b, i % 3 ? 2 : 3, 1, pick(leaves, h + i)); }
    } else if (season === 'spring') {
      for (let i = 0; i < 12; i++) R(g, x + 1 + ((h >>> i) & 15) % 14, y + 6 + ((h >>> (i + 3)) & 7), 1, 1, pick(['#e8a0b8', '#f0c8d4', '#d88aa0'], h + i));
    } else if (season === 'summer') {
      for (const [dx, dy, w] of [[-2, 10, 9], [5, 8, 7], [1, 13, 10]]) { R(g, x + dx + ((h >>> 3) & 3), y + dy, w, 2, 'rgba(0,0,0,0.16)'); }
    } else {
      R(g, x + 2, y + 11, 12, 3, '#d8e0ea'); R(g, x + 4, y + 9, 8, 2, '#e8eef4'); R(g, x + 3, y + 14, 10, 1, 'rgba(120,140,170,0.4)');
    }
    return;
  }
  if (ch === '"') {                                           // the grass
    const k = h % 31;
    if (season === 'spring' && k < 9) R(g, x + ((h >>> 4) & 15) % 14, y + ((h >>> 8) & 15) % 14, 1, 1, pick(['#e8e4d8', '#e8d070', '#f0c8d4'], h));
    else if (season === 'summer' && k < 4) { const px = x + ((h >>> 4) & 15) % 13, py = y + ((h >>> 8) & 15) % 12; R(g, px, py + 2, 1, 2, '#3a6a42'); R(g, px + 1, py + 1, 1, 3, '#2e5a38'); R(g, px + 2, py + 2, 1, 2, '#3a6a42'); if (k === 0) R(g, px + 1, py, 1, 1, pick(['#e8c040', '#c0503a', '#e0e0d0'], h)); }
    else if (season === 'winter' && k < 5) { const px = x + ((h >>> 4) & 15) % 13, py = y + ((h >>> 8) & 15) % 12; R(g, px, py + 1, 1, 3, '#6a5a3a'); R(g, px + 2, py, 1, 4, '#5a4a30'); R(g, px + 1, py + 2, 1, 2, '#6a5a3a'); }
    return;
  }
  if (ch === 'o' || ch === 'Z' || ch === 'J') {              // the doors
    if (season === 'autumn' && h % 3 !== 0) { R(g, x + 12, y + 14, 5, 4, '#c8642e'); R(g, x + 12, y + 14, 5, 1, '#e08040'); R(g, x + 14, y + 13, 1, 1, '#4a5a2e'); R(g, x + 13, y + 15, 1, 3, '#a04a22'); }
    if (season === 'winter') {                                // a wreath on the door
      for (let a = 0; a < 12; a++) { const r = Math.PI * 2 * a / 12; R(g, x + 8 + Math.round(Math.cos(r) * 4), y + 3 + Math.round(Math.sin(r) * 4), 2, 2, a % 3 ? '#2e5a38' : '#3a6a42'); }
      R(g, x + 7, y + 7, 3, 2, '#a63a34'); R(g, x + 6, y + 2, 1, 1, '#c8a23a');
    }
    return;
  }
  if (ch === 'i' && season === 'winter') { R(g, x, y + 2, 16, 1, '#e8eef4'); for (let i = 1; i < 16; i += 4) R(g, x + i, y + 1, 2, 1, '#f4f8fb'); return; }
  if (season === 'winter' && isFace && isRoofAbove) {         // icicles hanging from the eaves
    for (let i = 1; i < 15; i += 3) { const len = 2 + ((h >>> (i % 9)) & 3); R(g, x + i, y + 5, 1, len, '#d4e6f2'); R(g, x + i, y + 5 + len, 1, 1, '#f0f8ff'); }
  }
}
