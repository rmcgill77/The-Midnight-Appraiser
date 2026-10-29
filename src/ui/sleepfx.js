// What the second skipped night does to the screen (Phase 30): the picture blurs and sways, the
// light flickers and dims, faint ghost copies drift across it, dark figures stand at the edges of
// view and vanish, and the sound goes muffled. Cosmetic only, and it stops the moment the player
// sleeps. With "reduce motion" on, it holds still: a steady blur and dim, no sway or flicker.

const rnd = (a, b) => a + Math.random() * (b - a);

export class SleepFx {
  // canvas: the game view. layer: the element the overlays go in. sound: the game's sound engine.
  constructor({ canvas, layer, sound = null }) {
    this.canvas = canvas; this.layer = layer; this.sound = sound;
    this.on = false; this.t = 0; this.flicker = 0; this.nextFlicker = rnd(3, 8); this.nextFigure = rnd(6, 14);
    this.dim = Object.assign(document.createElement('div'), { id: 'sleepfx-dim' });
    Object.assign(this.dim.style, { position: 'absolute', inset: '0', pointerEvents: 'none', background: '#05060a', opacity: '0', zIndex: '4', transition: 'opacity 0.12s' });
    this.ghost = Object.assign(document.createElement('canvas'), { id: 'sleepfx-ghost' });
    Object.assign(this.ghost.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', opacity: '0', zIndex: '3', imageRendering: 'pixelated', mixBlendMode: 'screen' });
    this.figure = Object.assign(document.createElement('div'), { id: 'sleepfx-figure' });
    Object.assign(this.figure.style, { position: 'absolute', width: '22px', height: '54px', pointerEvents: 'none', opacity: '0', zIndex: '4', transition: 'opacity 0.8s',
      background: 'linear-gradient(#0b0b10 0 30%, transparent 30% 34%, #0b0b10 34% 100%)', clipPath: 'polygon(30% 0, 70% 0, 75% 28%, 100% 40%, 85% 100%, 15% 100%, 0 40%, 25% 28%)', filter: 'drop-shadow(0 0 3px #6a7aa0)' });
    layer.append(this.ghost, this.dim, this.figure);
    this.ghostAt = 0; this.ghostCtx = this.ghost.getContext('2d'); this.shot = document.createElement('canvas');
  }

  // dt in seconds. on: the effects are wanted. reduced: the player asked for less motion.
  update(dt, on, { reduced = false } = {}) {
    if (on !== this.on) this.#switch(on);
    if (!on) return;
    this.t += dt;
    const c = this.canvas;
    // the blur is a backdrop filter on the dim layer, so it leaves the canvas's own brightness filter alone
    const blur = (reduced ? 1.2 : 1.2 + 0.9 * Math.sin(this.t * 0.9)).toFixed(2);
    this.dim.style.backdropFilter = this.dim.style.webkitBackdropFilter = `blur(${blur}px)`;
    c.style.transform = reduced ? '' : `rotate(${(Math.sin(this.t * 0.35) * 1.1).toFixed(2)}deg) scale(1.04)`;
    // the light: a steady dim, with now and then a flicker
    this.flicker = Math.max(0, this.flicker - dt);
    if (!reduced && (this.nextFlicker -= dt) <= 0) { this.flicker = rnd(0.08, 0.25); this.nextFlicker = rnd(2.5, 7); }
    this.dim.style.opacity = String(this.flicker > 0 ? 0.55 : reduced ? 0.18 : 0.12 + 0.08 * Math.sin(this.t * 0.6));
    // ghosts: a faint, offset copy of the picture a moment ago
    if (!reduced) {
      this.ghostAt -= dt;
      if (this.ghostAt <= 0) { this.ghostAt = 0.35; this.#ghostFrame(); }
      this.ghost.style.opacity = String(0.22 + 0.1 * Math.sin(this.t * 1.3));
    }
    // a dark figure at the edge of view, then gone
    if (!reduced && (this.nextFigure -= dt) <= 0) {
      this.nextFigure = rnd(9, 20);
      const left = Math.random() < 0.5, f = this.figure.style;
      f.left = left ? '1.5%' : 'auto'; f.right = left ? 'auto' : '1.5%'; f.top = `${rnd(25, 60)}%`; f.opacity = '0.9';
      setTimeout(() => { this.figure.style.opacity = '0'; }, 1400);
    }
  }

  #ghostFrame() {
    const c = this.canvas, s = this.shot, g = this.ghostCtx;
    if (!c.width || !c.height) return;
    if (this.ghost.width !== c.width || this.ghost.height !== c.height) { this.ghost.width = c.width; this.ghost.height = c.height; }
    // draw the last copy, offset, then take a new one
    g.clearRect(0, 0, this.ghost.width, this.ghost.height);
    if (s.width) g.drawImage(s, Math.round(rnd(-6, 6)), Math.round(rnd(-4, 4)));
    s.width = c.width; s.height = c.height; s.getContext('2d').drawImage(c, 0, 0);
  }

  #switch(on) {
    this.on = on;
    if (!on) {
      this.canvas.style.transform = ''; this.dim.style.backdropFilter = this.dim.style.webkitBackdropFilter = '';
      this.dim.style.opacity = '0'; this.ghost.style.opacity = '0'; this.figure.style.opacity = '0';
      this.ghostCtx.clearRect(0, 0, this.ghost.width, this.ghost.height);
    }
    // muffled sound: a low-pass filter at the end of the sound chain
    const f = this.sound?.muffle;
    if (f && this.sound.ctx) f.frequency.setTargetAtTime(on ? 700 : 22000, this.sound.ctx.currentTime, 0.4);
  }
}
