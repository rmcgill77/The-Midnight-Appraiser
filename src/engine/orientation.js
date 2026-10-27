// Orientation. Phones can't lock rotation from a web page, so when the chosen
// layout disagrees with how the phone is held, the whole game layer is rotated
// 90 degrees in CSS and the player turns the phone to match.
//
// Every system that reads screen coordinates goes through toLocal(), and every
// edge-pinned control uses the --sa-* variables instead of env() directly, so
// safe-area insets follow the rotation.

// Screens close to square (a foldable opened up, many tablets) never rotate: both
// layouts fit, so the game just fills the screen the way it is held. 'auto' never
// rotates at all.
export const SQUARE_RATIO = 1.3;
export function rotationFor(want, viewW, viewH) {
  if (want === 'auto') return 0;
  if (Math.max(viewW, viewH) / Math.max(1, Math.min(viewW, viewH)) < SQUARE_RATIO) return 0;
  const isLandscape = viewW >= viewH;
  if (want === 'landscape' && !isLandscape) return 90;
  if (want === 'portrait' && isLandscape) return -90;
  return 0;
}

// Screen point -> point in the (possibly rotated) game layer.
export function screenToLocal(x, y, rot, viewW, viewH) {
  if (rot === 90) return { x: y, y: viewW - x };
  if (rot === -90) return { x: viewH - y, y: x };
  return { x, y };
}

export class Orientation {
  constructor(layer) {
    this.layer = layer; this.want = 'landscape'; this.rot = 0; this.listeners = new Set();
    // Folding or unfolding a phone, rotating it, or resizing a desktop window all land here.
    addEventListener('resize', () => this.apply());
    globalThis.visualViewport?.addEventListener('resize', () => this.apply());
    globalThis.screen?.orientation?.addEventListener?.('change', () => this.apply());
  }

  set(want) { this.want = want; this.apply(); }
  onChange(fn) { this.listeners.add(fn); }

  apply() {
    const vw = innerWidth, vh = innerHeight;
    const rot = rotationFor(this.want, vw, vh);
    const s = this.layer.style;
    this.layer.dataset.rot = String(rot);
    if (rot === 0) {
      s.width = ''; s.height = ''; s.transform = ''; s.transformOrigin = '';
    } else {
      s.width = vh + 'px'; s.height = vw + 'px'; s.transformOrigin = '0 0';
      s.transform = rot === 90 ? `translateX(${vw}px) rotate(90deg)` : `translateY(${vh}px) rotate(-90deg)`;
    }
    const changed = rot !== this.rot, resized = vw !== this.vw || vh !== this.vh;
    if (!changed && !resized) return;
    this.rot = rot; this.vw = vw; this.vh = vh;
    for (const fn of this.listeners) fn(rot, changed, resized);
  }

  toLocal(x, y) { return screenToLocal(x, y, this.rot, this.vw ?? innerWidth, this.vh ?? innerHeight); }
}
