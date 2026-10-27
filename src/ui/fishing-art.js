// Fishing on screen (v2.3): the line and the bobber in the water, and (v2.5.2) The Reel: a
// bar beside you while you bring something in.

const BRASS = '#c9a24a', BRASS_D = '#8a6a2a', BRASS_L = '#ecd28a', INK = '#0c0d12', CREAM = '#e6e3da';
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

// The line from your hands to the bobber (screen coordinates). phase: 'cast' (flying out,
// k 0..1), 'wait' (bobbing), 'bite' (pulled under, a "!" over it), 'reel' (taut).
export function drawLine(g, hx, hy, bx, by, phase, t, k = 1) {
  const ex = hx + (bx - hx) * k, ey = hy + (by - hy) * k - (phase === 'cast' ? Math.sin(k * Math.PI) * 18 : 0);
  g.strokeStyle = phase === 'reel' ? 'rgba(230,227,218,0.85)' : 'rgba(230,227,218,0.55)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(hx + 0.5, hy + 0.5);
  if (phase === 'reel') g.lineTo(ex + 0.5, ey + 0.5);
  else g.quadraticCurveTo((hx + ex) / 2, Math.max(hy, ey) + 6, ex + 0.5, ey + 0.5);
  g.stroke();
  if (phase === 'reel') {
    // Where the line goes in: rings on the water.
    const r = 3 + (t * 8) % 5;
    g.strokeStyle = 'rgba(230,227,218,0.35)'; g.beginPath(); g.ellipse(ex, ey + 1, r, r / 2, 0, 0, Math.PI * 2); g.stroke();
    return;
  }
  const bob = phase === 'wait' ? Math.round(Math.sin(t * 3) * 1) : phase === 'bite' ? 2 : 0;
  R(g, ex - 2, ey - 3 + bob, 4, 3, '#c0392b'); R(g, ex - 2, ey + bob, 4, 2, CREAM); R(g, ex - 1, ey - 4 + bob, 2, 1, INK);
  if (phase === 'bite') {
    g.strokeStyle = 'rgba(230,227,218,0.5)'; g.beginPath(); g.ellipse(ex, ey + 2, 6, 3, 0, 0, Math.PI * 2); g.stroke();
    R(g, ex - 3, ey - 22, 7, 12, INK); R(g, ex - 2, ey - 21, 5, 10, BRASS); R(g, ex - 1, ey - 20, 3, 6, INK); R(g, ex - 1, ey - 13, 3, 2, INK);
  }
}

// The fish's colors [body, belly], shared with the tackle panels.
export const FISH_LOOK = {
  mackerel: ['#3d6a7a', '#c8d6d0'], herring: ['#8a9aa6', '#e0e6e8'], smelt: ['#9ab0a0', '#e6efe6'], flounder: ['#6a5a3e', '#a08a60'], scup: ['#9a8a7a', '#d0c4b0'],
  pollock: ['#5a6a4a', '#b0b89a'], cod: ['#7a6a4a', '#c8b88a'], bluefish: ['#3d5a7a', '#a6b8c8'], seabass: ['#26282e', '#5a5f6e'], striper: ['#6a7078', '#d0d4d6'],
  tautog: ['#3a3022', '#6a5a40'], skate: ['#6a5e4a', '#9a8a6a'], dogfish: ['#5a5e66', '#a8acb0'], eel: ['#3a3a1e', '#7a7a4a'], perch: ['#a08a2e', '#d6c46a'],
  catfish: ['#4a4436', '#8a8070'], carp: ['#a0782e', '#e0b85a'], monkfish: ['#5a4a3a', '#8a7a62'], tuna: ['#1e2a4a', '#a6b0c0'], lanternfish: ['#1e2a3a', '#7ae0d0'],
  glasseel: ['#a0c0c8', '#e6f6f6'], grandfather: ['#3a3a3e', '#7a7a80'],
};

// Little sprites for the reel bar. '#' body, 'b' belly, 'e' eye, 't' tail (two frames).
const FISH_A = ['..#####...', '.#######.t', '#e#######t', '.bbbbbbb.t', '..bbbbb...'];
const FISH_B = ['..#####..t', '.#######t.', '#e#######.', '.bbbbbbbt.', '..bbbbb..t'];
const MAGNET = ['ss....ss', 'rr....rr', 'rr....rr', 'rr....rr', 'rrr..rrr', '.rrrrrr.', '..rrrr..', '....k...', '...kkk..', '....k...', '....kk..'];
const BOTTLE = ['..cc..', '..gg..', '..gg..', '.gggg.', 'gGgggg', 'gGgggg', 'gGgggg', 'gGgggg', '.gggg.'];
function sprite(g, rows, x, y, pal) {
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = pal[r[i]]; if (c) R(g, x + i, y + j, 1, 1, c); } });
}

// The Reel: a bar beside you (game/fishing.js has the rules). Your box, what's on the line,
// how far it's come in, and the reel turning. w, h: the screen in game pixels.
// at: the angler's screen position (the bar stands just to their right).
export function drawReel(g, w, h, f, { time = 0, hold = false, at = null } = {}) {
  const H = Math.max(70, Math.min(128, h - 66)), tw = 14;
  const ax = at?.x ?? Math.round(w / 2), ay = at?.y ?? Math.round(h / 2);
  const x = Math.max(8, Math.min(w - 44, ax + 24));
  const top = Math.max(22, Math.min(h - H - 30, ay - Math.round(H * 0.7)));
  // The frame: a brass-edged plate, the water inside it, the progress gauge beside it.
  R(g, x - 4, top - 4, tw + 16, H + 8, 'rgba(7,8,12,0.86)');
  R(g, x - 4, top - 4, tw + 16, 1, BRASS_D); R(g, x - 4, top + H + 3, tw + 16, 1, BRASS_D);
  R(g, x - 4, top - 4, 1, H + 8, BRASS_D); R(g, x + tw + 11, top - 4, 1, H + 8, BRASS_D);
  for (let j = 0; j < H; j++) { const k = j / H; R(g, x, top + j, tw, 1, `rgb(${Math.round(16 + 8 * (1 - k))},${Math.round(34 + 22 * (1 - k))},${Math.round(44 + 18 * (1 - k))})`); }
  for (let i = 0; i < 4; i++) { const by = top + H - 3 - ((time * 14 + i * 29) % (H - 6)); R(g, x + 2 + ((i * 5) % (tw - 4)), Math.round(by), 1, 1, 'rgba(200,230,240,0.45)'); }
  const yOf = p => top + Math.round((1 - p) * H);
  // Your box.
  const bh = Math.round(f.size * H), by = yOf(f.box) - Math.round(bh / 2);
  g.fillStyle = f.inside ? 'rgba(110,200,120,0.32)' : 'rgba(110,200,120,0.14)'; g.fillRect(x, by, tw, bh);
  const edge = f.inside ? '#7ed08a' : '#3f7a48';
  R(g, x, by, tw, 1, edge); R(g, x, by + bh - 1, tw, 1, edge); R(g, x, by, 1, bh, edge); R(g, x + tw - 1, by, 1, bh, edge);
  // What's on the line.
  const py = yOf(f.pos), wob = f.icon === 'fish' ? 0 : Math.round(Math.sin(time * 2) * 1);
  if (f.icon === 'fish') {
    const [body, belly] = FISH_LOOK[f.bite.fish?.id] ?? ['#5a6070', '#a0a6b0'];
    sprite(g, Math.floor(time * 8) % 2 ? FISH_A : FISH_B, x + 2, py - 2, { '#': body, b: belly, e: INK, t: body });
  } else if (f.icon === 'magnet') {
    sprite(g, MAGNET, x + 3 + wob, py - 5, { s: '#d8dce0', r: '#b2463f', k: '#a3843e' });
  } else {
    sprite(g, BOTTLE, x + 4 + wob, py - 4, { c: '#8a6a3a', g: '#3e6a4a', G: '#7aa88a' });
  }
  // How far it's come in: fills from the bottom; flashes when it's nearly gone.
  const gx = x + tw + 3, fill = Math.round(f.reel * H);
  R(g, gx, top, 4, H, '#1c1e26');
  R(g, gx, top + H - fill, 4, fill, f.reel < 0.2 && Math.floor(time * 8) % 2 ? '#a63a34' : f.reel > 0.75 ? '#7ed08a' : BRASS);
  // The reel, under the bar: it winds while the catch is in the box, and slips back when it isn't.
  const cx = x + tw / 2 + 4, cy = top + H + 13, a = f.spin;
  g.fillStyle = BRASS_D; g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = INK; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = BRASS; g.beginPath(); g.arc(cx, cy, 2, 0, Math.PI * 2); g.fill();
  const hx = cx + Math.cos(a) * 6, hy = cy + Math.sin(a) * 6;
  g.strokeStyle = BRASS_L; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, cy); g.lineTo(hx, hy); g.stroke();
  R(g, hx - 1, hy - 1, 3, 3, hold ? CREAM : BRASS_L);
}
