// Camera that eases toward a target, clamps to the map, and snaps to whole pixels.

export class Camera {
  constructor() { this.x = 0; this.y = 0; this.w = 0; this.h = 0; }

  resize(w, h) { this.w = w; this.h = h; }

  follow(tx, ty, mapW, mapH, dt, lerp, snap = false) {
    const goalX = this.#clamp(tx - this.w / 2, mapW - this.w);
    const goalY = this.#clamp(ty - this.h / 2, mapH - this.h);
    const k = snap ? 1 : 1 - Math.exp(-lerp * dt);
    this.x += (goalX - this.x) * k;
    this.y += (goalY - this.y) * k;
  }

  // Maps smaller than the view are centered instead of clamped.
  #clamp(v, max) { return max <= 0 ? max / 2 : Math.min(Math.max(v, 0), max); }

  get ix() { return Math.round(this.x); }
  get iy() { return Math.round(this.y); }
}
