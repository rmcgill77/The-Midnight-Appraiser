// What the customer-draw upgrades look like (Phase 11): the storefront from the street
// (sign, window, awning; newspaper over the glass until you clear it) and the comforts
// on the shop floor (bench by the till line, coffee pot and radio on the back wall).
// Drawn over the baked maps each frame, in logical pixels, with plain rectangles.

const C = { ink: '#07080c', gold: '#e0a64a', goldD: '#8a5a22', board: '#2a1c14', glass: '#f3c46a', glassD: '#b07a2e',
  paper: '#8f8a7c', paperD: '#6d695e', red: '#9c3a34', bone: '#ddd5c1', wood: '#5a3b24', woodD: '#3a2616', steel: '#6f7686', steelD: '#454b58' };

const box = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// door: the shop's door tile on the city map. owned: the storefront ids bought.
export function drawStorefront(g, door, cx, cy, owned, time = 0) {
  const fx = door.tx * 16 - cx, fy = door.ty * 16 - cy;     // top-left of the door tile
  // The two front windows, either side of the door.
  for (const wx of [fx - 64 + 4, fx + 48 + 4]) {
    box(g, wx - 1, fy + 2, 26, 12, C.ink);
    if (owned.includes('window')) {
      const flick = 0.85 + 0.15 * Math.sin(time * 1.7 + wx);
      g.globalAlpha = flick; box(g, wx, fy + 3, 24, 10, C.glass); g.globalAlpha = 1;
      box(g, wx, fy + 10, 24, 3, C.glassD);
      // A few good pieces on display: a lamp, a clock, a jar.
      box(g, wx + 3, fy + 6, 2, 4, C.ink); box(g, wx + 2, fy + 5, 4, 1, C.ink);
      box(g, wx + 10, fy + 6, 4, 4, C.ink); box(g, wx + 11, fy + 7, 2, 2, C.gold);
      box(g, wx + 18, fy + 7, 3, 3, C.ink); box(g, wx + 18, fy + 6, 3, 1, C.steelD);
      box(g, wx + 11, fy + 3, 1, 10, C.ink);
    } else {
      // Yellowed newspaper taped over the glass.
      box(g, wx, fy + 3, 24, 10, C.paper);
      for (let i = 0; i < 4; i++) box(g, wx + 2, fy + 5 + i * 2, i % 2 ? 14 : 19, 1, C.paperD);
      box(g, wx + 12, fy + 3, 1, 10, C.paperD);
    }
  }
  if (owned.includes('awning')) {
    const ax = fx - 12, aw = 40;
    box(g, ax - 1, fy - 3, aw + 2, 8, C.ink);
    for (let i = 0; i < aw; i += 4) box(g, ax + i, fy - 2, 2, 6, C.red), box(g, ax + i + 2, fy - 2, 2, 6, C.bone);
    for (let i = 0; i < aw; i += 4) box(g, ax + i + 1, fy + 4, 2, 1, i % 8 ? C.bone : C.red);
  }
  if (owned.includes('sign')) {
    const sx = fx - 14, sy = fy - 14;
    box(g, sx - 1, sy - 1, 46, 10, C.ink);
    box(g, sx, sy, 44, 8, C.board);
    box(g, sx + 1, sy + 1, 42, 1, C.goldD);
    // Gold-leaf lettering, suggested: three words.
    const words = [[3, 10], [16, 9], [28, 13]];
    for (const [x, w] of words) for (let i = 0; i < w; i += 2) box(g, sx + x + i, sy + 3, 1, 3, C.gold);
    box(g, sx + 1, sy + 6, 42, 1, C.goldD);
  }
}

// comforts: the comfort ids bought. Positions are tiles that are the same in every stage.
// till: the column the till is in (Phase 24: you can move it); the bench and radio go with it.
export function drawComforts(g, comforts, cx, cy, time = 0, reducedMotion = false, till = 16) {
  if (comforts.includes('bench')) {
    // A long bench beside the till line, seen from above.
    const x = (till - 1) * 16 - cx + 4, y = 6 * 16 - cy + 1;
    box(g, x - 1, y - 1, 10, 29, C.ink);
    box(g, x, y, 8, 27, C.wood);
    for (let i = 3; i < 27; i += 5) box(g, x, y + i, 8, 1, C.woodD);
    box(g, x + 7, y, 1, 27, C.woodD);
  }
  if (comforts.includes('coffee')) {
    // A coffee pot on a little wall shelf by the counter, with steam.
    const x = 11 * 16 - cx + 3, y = 1 * 16 - cy + 3;
    box(g, x - 1, y + 9, 12, 3, C.ink); box(g, x, y + 9, 10, 2, C.wood);
    box(g, x + 2, y + 2, 6, 7, C.ink); box(g, x + 3, y + 3, 4, 5, C.steel); box(g, x + 3, y + 6, 4, 2, C.woodD);
    box(g, x + 8, y + 4, 2, 1, C.ink); box(g, x + 9, y + 4, 1, 3, C.ink);
    if (!reducedMotion) { const t = Math.floor(time * 3) % 3; box(g, x + 4 + (t === 1 ? 1 : 0), y - 1 - t, 1, 2, 'rgba(221,213,193,0.55)'); }
  }
  if (comforts.includes('radio')) {
    // A wooden cabinet radio on the wall shelf behind the till, its dial lit.
    const x = (till + 1) * 16 - cx + 2, y = 1 * 16 - cy + 2;
    box(g, x - 1, y + 10, 14, 3, C.ink); box(g, x, y + 10, 12, 2, C.wood);
    box(g, x, y + 1, 12, 9, C.ink); box(g, x + 1, y + 2, 10, 7, C.wood);
    box(g, x + 2, y + 3, 4, 4, C.woodD); box(g, x + 7, y + 3, 3, 2, C.gold);
    box(g, x + 7, y + 6, 1, 1, C.bone); box(g, x + 9, y + 6, 1, 1, C.bone);
  }
}

// The little sign hanging beside a door in town: lit amber when it's open, dark red when it isn't.
export function drawDoorSign(g, door, cx, cy, open) {
  const x = (door.tx + 1) * 16 - cx + 2, y = door.ty * 16 - cy + 2;
  box(g, x + 5, y - 2, 1, 2, C.ink);
  box(g, x - 1, y, 13, 7, C.ink);
  box(g, x, y + 1, 11, 5, open ? '#3a2a12' : '#2a1414');
  const c = open ? C.gold : '#b2463f';
  for (let i = 0; i < (open ? 4 : 6); i++) box(g, x + 1 + i * (open ? 2.5 : 1.6), y + 2, 1, 3, c);
}
