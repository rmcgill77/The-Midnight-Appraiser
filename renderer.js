// Canvas setup with whole-number pixel scaling. The canvas backing store matches
// device pixels; drawing happens in logical pixels under an integer transform,
// so every 16x16 sprite lands on exact device-pixel boundaries.

// How many logical pixels the narrow side of the screen should show. Phones get the
// minimum; bigger screens (a foldable's inner screen, tablets, desktops) see more
// of the world at about the same physical pixel size, up to a cap.
// `fit` (optional): the current room's size along the screen's short side. A small room
// on a big screen is shown closer instead of floating in a sea of black.
export function targetShortSide(cssShort, { minShort, maxShort, cssPer, view = 'normal', fit = Infinity }) {
  const per = cssPer[view] ?? cssPer.normal ?? 2.3;
  return Math.max(minShort, Math.min(maxShort, cssShort / per, fit + 48));
}

export class Renderer {
  constructor(canvas, { minLogicalShortSide, maxLogicalShortSide = 400, cssPerLogical = { normal: 2.3 } }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.minShort = minLogicalShortSide; this.maxShort = maxLogicalShortSide;
    this.cssPer = cssPerLogical; this.view = 'normal'; this.room = null;
    this.scale = 1; this.w = 0; this.h = 0; this.dpr = 1;
    this.resize();
  }

  resize() {
    const dpr = Math.max(1, Math.min(globalThis.devicePixelRatio || 1, 4));
    const cssW = Math.max(1, this.canvas.clientWidth), cssH = Math.max(1, this.canvas.clientHeight);
    const devW = Math.round(cssW * dpr), devH = Math.round(cssH * dpr);
    const fit = this.room ? (cssW >= cssH ? this.room.h : this.room.w) : Infinity;
    const scale = Math.max(1, Math.floor(Math.min(devW, devH) / targetShortSide(Math.min(cssW, cssH), { ...this, fit })));
    this.canvas.width = devW; this.canvas.height = devH;
    this.dpr = dpr; this.scale = scale;
    this.w = Math.ceil(devW / scale); this.h = Math.ceil(devH / scale);
    this.ctx.imageSmoothingEnabled = false;
    return { w: this.w, h: this.h };
  }

  setView(view) { this.view = view; return this.resize(); }
  // The room being shown, in logical pixels ({w, h}), or null for no limit.
  fitRoom(room) {
    const same = room && this.room && room.w === this.room.w && room.h === this.room.h;
    if (same || (!room && !this.room)) return false;
    this.room = room; this.resize(); return true;
  }

  begin(color) {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
}
