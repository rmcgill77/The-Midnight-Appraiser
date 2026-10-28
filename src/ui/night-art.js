// Things on the street at night (v2.4), drawn in code like everything else until Brit's art
// arrives: the 3:13, Tarp Sal's night tables, the noodle cart, eyes in an alley, a lit
// laundromat window, a dropped wallet, a song in the air. x, y: the top-left of the tile the
// thing stands on, in screen pixels. t: seconds.

const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

// A city bus side-on, 48 x 22, fogged windows lit a sickly green, no number on the sign.
export function drawBus(g, x, y, t, open = false) {
  const bx = x - 16, by = y + 6;   // at the curb, on the road below the stop
  R(g, bx + 2, by + 20, 44, 2, 'rgba(0,0,0,0.45)');
  R(g, bx, by, 48, 19, '#0b0c12');
  R(g, bx + 1, by + 1, 46, 17, '#3a4a46'); R(g, bx + 1, by + 1, 46, 2, '#5a6a64'); R(g, bx + 1, by + 13, 46, 5, '#26302e');
  R(g, bx + 3, by + 3, 8, 2, '#141818');   // the blank route sign
  for (let i = 0; i < 5; i++) { const wx = bx + 12 + i * 7; R(g, wx, by + 4, 6, 6, '#8ab09a'); R(g, wx, by + 4, 6, 2, '#b4d0bc'); if ((Math.floor(t * 0.7) + i) % 4 === 0) R(g, wx + 2, by + 6, 2, 3, '#3a4a46'); }
  R(g, bx + 3, by + 5, 6, 8, open ? '#0b0c12' : '#6a8a7a');   // the door
  for (const wx of [bx + 8, bx + 38]) { R(g, wx, by + 16, 6, 5, '#0b0c12'); R(g, wx + 2, by + 18, 2, 1, '#5a5f6e'); }
  R(g, bx + 46, by + 12, 2, 3, '#e8e0a0');
}
// Tarp Sal's tables: two trestles under a stretched tarp, a lantern, goods.
export function drawTables(g, x, y, t) {
  R(g, x - 14, y + 13, 44, 2, 'rgba(0,0,0,0.4)');
  R(g, x - 15, y - 9, 46, 3, '#0b0c12'); R(g, x - 14, y - 8, 44, 2, '#4a5a3a');
  for (const px of [x - 14, x + 28]) R(g, px, y - 6, 2, 19, '#2a2018');
  R(g, x - 12, y + 3, 40, 2, '#0b0c12'); R(g, x - 12, y + 4, 40, 5, '#6a5a3e'); R(g, x - 12, y + 4, 40, 1, '#8a7a5a');
  const goods = ['#c9b98f', '#9fc6d6', '#7a3a34', '#e0a64a', '#4a4f63', '#a3843e'];
  goods.forEach((c, i) => R(g, x - 10 + i * 6, y, 4, 4, c));
  const f = 0.85 + Math.sin(t * 6) * 0.1;
  R(g, x + 25, y - 4, 3, 4, '#0b0c12'); R(g, x + 25, y - 3, 3, 2, `rgba(240,190,90,${f.toFixed(2)})`);
}
// The noodle cart: a red cart with a striped awning, a lantern and steam.
export function drawNoodles(g, x, y, t) {
  R(g, x - 3, y + 13, 24, 2, 'rgba(0,0,0,0.4)');
  R(g, x - 4, y - 8, 26, 3, '#0b0c12');
  for (let i = 0; i < 6; i++) R(g, x - 3 + i * 4, y - 7, 4, 2, i % 2 ? '#e6e3da' : '#b2463f');
  R(g, x - 2, y - 5, 1, 9, '#2a2018'); R(g, x + 19, y - 5, 1, 9, '#2a2018');
  R(g, x - 3, y + 3, 24, 8, '#0b0c12'); R(g, x - 2, y + 4, 22, 6, '#8a2a24'); R(g, x - 2, y + 4, 22, 1, '#b2463f');
  R(g, x + 1, y + 1, 6, 3, '#5a5f6e');
  for (let i = 0; i < 3; i++) { const s = (t * 8 + i * 5) % 12; R(g, x + 2 + i * 2 + Math.round(Math.sin(t * 2 + i)), y - s, 1, 2, `rgba(230,227,218,${(0.5 - s / 26).toFixed(2)})`); }
  for (const wx of [x, x + 15]) R(g, wx, y + 10, 4, 4, '#16181e');
  R(g, x + 14, y - 3, 3, 4, '#0b0c12'); R(g, x + 14, y - 2, 3, 2, '#f0c060');
}
// Two small round headlights at knee height, blinking now and then.
export function drawEyes(g, x, y, t) {
  if (Math.floor(t * 3) % 9 === 0) return;
  for (const ex of [x + 4, x + 10]) { R(g, ex, y + 8, 3, 2, '#e8d070'); R(g, ex + 1, y + 8, 1, 1, '#fff4c0'); }
}
// A laundromat window lit from inside, the dryers turning.
export function drawGlow(g, x, y, t) {
  R(g, x - 2, y - 2, 20, 14, '#0b0c12'); R(g, x - 1, y - 1, 18, 12, '#2a3a4a');
  for (let i = 0; i < 3; i++) { const cx = x + 2 + i * 6; R(g, cx, y + 2, 4, 4, '#d0e0f0'); const a = t * 6 + i; R(g, cx + 1 + Math.round(Math.cos(a)), y + 3 + Math.round(Math.sin(a)), 1, 1, '#7a8a9a'); }
}
export function drawWallet(g, x, y) { R(g, x + 5, y + 10, 6, 4, '#0b0c12'); R(g, x + 6, y + 11, 4, 2, '#6a4a2a'); R(g, x + 6, y + 11, 4, 1, '#8a6a3a'); }
// Notes in the air over the fountain.
export function drawSong(g, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.6 + i / 3) % 1, nx = x + 6 + Math.round(Math.sin((t + i) * 1.7) * 5), ny = y + 4 - Math.round(p * 18);
    const a = (p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8) * 0.9;
    R(g, nx, ny, 2, 2, `rgba(230,227,218,${a.toFixed(2)})`); R(g, nx + 1, ny - 4, 1, 4, `rgba(230,227,218,${a.toFixed(2)})`);
  }
}

// v2.5: a three-master far out, every lantern lit and no wind in its sails.
export function drawShip(g, x, y, t) {
  const bob = Math.round(Math.sin(t * 0.8) * 1);
  R(g, x - 20, y + 6 + bob, 48, 6, '#0b0c12'); R(g, x - 18, y + 7 + bob, 44, 4, '#1e2430');
  for (const mx of [x - 8, x + 4, x + 16]) { R(g, mx, y - 22 + bob, 1, 28, '#2a2e38'); R(g, mx - 6, y - 18 + bob, 13, 7, 'rgba(160,170,180,0.25)'); R(g, mx - 5, y - 9 + bob, 11, 6, 'rgba(160,170,180,0.2)'); }
  for (let i = 0; i < 6; i++) { const f = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7); R(g, x - 15 + i * 7, y + 7 + bob, 2, 2, `rgba(240,200,110,${f.toFixed(2)})`); }
}
// A tide hound: long and low, water running off it, two pale lights for eyes.
export function drawHound(g, x, y, t, facing = 'right') {
  const dir = facing === 'left' ? -1 : 1, cx = x + 8;
  R(g, cx - 9, y + 13, 18, 2, 'rgba(0,0,0,0.4)');
  R(g, cx - 8, y + 6, 16, 6, '#1a2a34'); R(g, cx - 7, y + 5, 14, 2, '#2a4050');
  R(g, cx + dir * 7 - (dir < 0 ? 4 : 0), y + 4, 5, 5, '#1a2a34');
  R(g, cx + dir * 9 - (dir < 0 ? 1 : 0), y + 5, 1, 1, '#cfe8f0');
  for (const lx of [-6, -2, 3, 6]) R(g, cx + lx, y + 11 + (Math.floor(t * 8 + lx) % 2), 1, 3, '#14202a');
  if (Math.floor(t * 6) % 3 === 0) R(g, cx - 3, y + 13, 1, 2, 'rgba(160,200,220,0.6)');
}
// A crab, sideways, claws up.
export function drawCrab(g, x, y, t) {
  const cx = x + 8, k = Math.floor(t * 10) % 2;
  R(g, cx - 4, y + 10, 8, 4, '#8a2a24'); R(g, cx - 3, y + 9, 6, 1, '#b2463f');
  R(g, cx - 6, y + 7 + k, 2, 3, '#b2463f'); R(g, cx + 4, y + 7 + (1 - k), 2, 3, '#b2463f');
  for (const lx of [-5, -3, 2, 4]) R(g, cx + lx, y + 14, 1, 1, '#5a1a14');
  R(g, cx - 2, y + 9, 1, 1, '#0b0c12'); R(g, cx + 1, y + 9, 1, 1, '#0b0c12');
}
