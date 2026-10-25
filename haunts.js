// Things that come for you at night (v2.5): in the churchyard (the risen, woken by the
// bell; something angry from a grave you shouldn't have opened) and on the beach (tide
// hounds out of the surf, crabs after your bait). Simple steering, in world pixels: they
// close on you when they can see you, drift when they can't, and won't step into light.
// Touching you is a hit: the thing is spent and the caller decides what it costs you.
// Pure apart from the rand passed in.

export const HAUNTS = {
  risen: { speed: 24, sight: 130, life: 70, hit: 10, name: 'The risen' },
  angry: { speed: 46, sight: 400, life: 26, hit: 16, name: 'Something angry' },
  hound: { speed: 52, sight: 150, life: 40, hit: 12, name: 'A tide hound' },
  crab: { speed: 30, sight: 90, life: 45, hit: 0, steals: true, name: 'A crab' },
};

export function makeHaunt(kind, x, y, rand = Math.random) {
  const H = HAUNTS[kind];
  return { kind, x, y, life: H.life * (0.8 + rand() * 0.4), wx: 0, wy: 0, wt: 0, facing: 'down', moving: false, frame: 0, animT: 0, seed: Math.floor(rand() * 1000) };
}

// Move them all. env: { px, py (the player's feet), blocked(x, y) (world px), lit(x, y),
// rand }. Returns the ones that reached you (removed from the list).
export function stepHaunts(list, dt, env) {
  const hits = [];
  for (let i = list.length - 1; i >= 0; i--) {
    const h = list[i], H = HAUNTS[h.kind];
    h.life -= dt;
    if (h.life <= 0) { list.splice(i, 1); continue; }
    const dx = env.px - h.x, dy = env.py - h.y, d = Math.hypot(dx, dy);
    if (d < 9) { list.splice(i, 1); hits.push(h); continue; }
    let vx = 0, vy = 0;
    if (d < H.sight || h.hunt) { vx = dx / d; vy = dy / d; }   // hunt: woken by the bell, it knows where you are
    else {
      h.wt -= dt;
      if (h.wt <= 0) { const a = env.rand() * Math.PI * 2; h.wx = Math.cos(a) * 0.4; h.wy = Math.sin(a) * 0.4; h.wt = 2 + env.rand() * 3; }
      vx = h.wx; vy = h.wy;
    }
    const sp = H.speed * dt;
    const tryMove = (nx, ny) => { if (env.blocked(nx, ny) || env.lit(nx, ny)) return false; h.x = nx; h.y = ny; return true; };
    const moved = tryMove(h.x + vx * sp, h.y + vy * sp) || tryMove(h.x + vx * sp, h.y) || tryMove(h.x, h.y + vy * sp);
    h.moving = moved && (vx || vy);
    if (h.moving) {
      h.facing = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
      h.animT += dt; if (h.animT > 0.14) { h.animT = 0; h.frame = (h.frame + 1) % 4; }
    }
  }
  return hits;
}
