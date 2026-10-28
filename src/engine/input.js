// One input layer for touch, keyboard and gamepad. Systems read `move` (a vector
// with length 0..1) and `consumeAction()`; they never touch DOM events directly.
//
// Touch: a floating joystick appears wherever the left thumb lands on the left
// side of the screen. The action button sits bottom-right. Pointer events only,
// tracked per pointer id so both thumbs work at once.

export function stickVector(dx, dy, radius, deadZone) {
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: 0, y: 0, mag: 0 };
  const clamped = Math.min(len, radius);
  const raw = clamped / radius;
  if (raw < deadZone) return { x: 0, y: 0, mag: 0 };
  const mag = (raw - deadZone) / (1 - deadZone);       // rescale so motion starts at 0
  return { x: (dx / len) * mag, y: (dy / len) * mag, mag };
}

export class Input {
  constructor({ surface, stickEl, knobEl, actionEl, sprintEl = null, deadZone, size, toLocal = (x, y) => ({ x, y }) }) {
    this.toLocal = toLocal;
    this.surface = surface; this.stickEl = stickEl; this.knobEl = knobEl; this.actionEl = actionEl; this.sprintEl = sprintEl;
    // Phase 18: sprint is held, from any source: Shift, the Run button, or a pad's B / bumper / trigger.
    this.sprintKey = false; this.sprintTouch = null; this.sprintPad = false;
    this.actionKey = false; this.actionTouch = null; this.actionPad = false;
    this.deadZone = deadZone; this.setSize(size);
    this.move = { x: 0, y: 0, mag: 0 };
    this.touch = { id: null, ox: 0, oy: 0, v: { x: 0, y: 0, mag: 0 } };
    this.keys = new Set();
    this.actionQueued = false;
    this.padEvents = [];
    this.enabled = true;
    this.lastSource = 'touch';
    this.#bind();
  }

  setSize(px) { this.radius = px / 2; this.stickEl?.style.setProperty('--stick', px + 'px'); }

  // v2.5.2: the action button held down (the fishing reel), from any source.
  get actionHeld() { return this.enabled && (this.actionKey || this.actionTouch !== null || this.actionPad); }

  get sprintHeld() { return this.enabled && (this.sprintKey || this.sprintTouch !== null || this.sprintPad); }

  consumeAction() { const a = this.actionQueued; this.actionQueued = false; return a; }

  // Called once per simulation step.
  poll() {
    let x = 0, y = 0, mag = 0;
    if (this.touch.id !== null) ({ x, y, mag } = this.touch.v);
    else {
      const k = this.keys;
      const kx = (k.has('right') ? 1 : 0) - (k.has('left') ? 1 : 0);
      const ky = (k.has('down') ? 1 : 0) - (k.has('up') ? 1 : 0);
      if (kx || ky) { const l = Math.hypot(kx, ky); x = kx / l; y = ky / l; mag = 1; }
      else ({ x, y, mag } = this.#pollGamepad());
    }
    if (!this.enabled) { x = 0; y = 0; mag = 0; }
    this.move = { x, y, mag };
    return this.move;
  }

  // Gamepads (standard mapping): the left stick or d-pad walks; button presses become
  // events (a, b, x, y, start, select, up, down, left, right) for main to route, so the
  // same buttons can act in the world and work through panels. Directions repeat while held.
  #pollGamepad() {
    const pads = globalThis.navigator?.getGamepads?.() || [];
    const p = [...pads].find(x => x && x.connected !== false);
    if (!p) { this._pad = null; return { x: 0, y: 0, mag: 0 }; }
    const prev = this._pad || {};
    const now = {};
    const btn = i => !!(p.buttons[i]?.pressed || (p.buttons[i]?.value ?? 0) > 0.5);
    const NAMES = { 0: 'a', 1: 'b', 2: 'x', 3: 'y', 8: 'select', 9: 'start' };
    for (const [i, name] of Object.entries(NAMES)) { now[name] = btn(+i); if (now[name] && !prev[name]) this.#pad(name); }
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const dirs = { up: btn(12) || ay < -0.6, down: btn(13) || ay > 0.6, left: btn(14) || ax < -0.6, right: btn(15) || ax > 0.6 };
    const t = performance.now();
    for (const [d, on] of Object.entries(dirs)) {
      now[d] = on;
      if (on && !prev[d]) { this.#pad(d); now[d + 'At'] = t + 380; }
      else if (on && prev[d] && t >= prev[d + 'At']) { this.#pad(d); now[d + 'At'] = t + 130; }
      else now[d + 'At'] = prev[d + 'At'];
    }
    this._pad = now;
    this.sprintPad = btn(1) || btn(5) || btn(7);
    this.actionPad = btn(0);
    const dx = (btn(15) ? 1 : 0) - (btn(14) ? 1 : 0), dy = (btn(13) ? 1 : 0) - (btn(12) ? 1 : 0);
    if (dx || dy) { const l = Math.hypot(dx, dy); return { x: dx / l, y: dy / l, mag: 1 }; }
    return stickVector(ax, ay, 1, this.deadZone);
  }

  #pad(name) { this.padEvents.push(name); this.lastSource = 'pad'; }
  takePadEvents() { const e = this.padEvents; this.padEvents = []; return e; }
  get padConnected() { return !!this._pad; }

  release() {
    this.touch.id = null; this.touch.v = { x: 0, y: 0, mag: 0 };
    this.keys.clear(); this.actionQueued = false;
    this.sprintKey = false; this.sprintTouch = null; this.sprintEl?.classList.remove('pressed');
    this.actionKey = false; this.actionTouch = null;
    this.#showStick(false);
  }

  press(src = 'pad') { this.#queueAction(src); }
  #queueAction(src) { if (this.enabled) { this.actionQueued = true; this.lastSource = src; } }

  #bind() {
    const s = this.surface;
    s.addEventListener('pointerdown', e => {
      if (!this.enabled || this.touch.id !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // Someone's talking (Phase 16): a tap anywhere moves the conversation on instead of walking.
      if (this.onTap?.(e)) { e.preventDefault(); this.lastSource = e.pointerType === 'mouse' ? 'keys' : 'touch'; return; }
      const p = this.toLocal(e.clientX, e.clientY);
      // Left 60% of the screen steers; the right side is reserved for buttons.
      if (p.x > s.clientWidth * 0.6 && e.pointerType !== 'mouse') return;
      e.preventDefault();
      s.setPointerCapture?.(e.pointerId);
      const r = this.radius;
      const ox = Math.min(Math.max(p.x, r + 8), s.clientWidth - r - 8);
      const oy = Math.min(Math.max(p.y, r + 8), s.clientHeight - r - 8);
      Object.assign(this.touch, { id: e.pointerId, ox, oy });
      this.lastSource = 'touch';
      this.#updateStick(p.x, p.y);
      this.#showStick(true);
    });
    s.addEventListener('pointermove', e => {
      if (e.pointerId !== this.touch.id) return;
      e.preventDefault();
      const p = this.toLocal(e.clientX, e.clientY);
      this.#updateStick(p.x, p.y);
    });
    const end = e => { if (e.pointerId === this.touch.id) this.release(); };
    s.addEventListener('pointerup', end);
    s.addEventListener('pointercancel', end);
    s.addEventListener('lostpointercapture', end);
    s.addEventListener('contextmenu', e => e.preventDefault());

    this.actionEl?.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      this.#queueAction('touch');
      this.actionEl.classList.add('pressed');
      this.actionTouch = e.pointerId; this.actionEl.setPointerCapture?.(e.pointerId);
    });
    const up = () => { this.actionEl?.classList.remove('pressed'); this.actionTouch = null; };
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'lostpointercapture']) this.actionEl?.addEventListener(ev, up);

    // The Run button: held with one thumb while the other steers.
    this.sprintEl?.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      if (!this.enabled) return;
      this.sprintTouch = e.pointerId; this.sprintEl.setPointerCapture?.(e.pointerId);
      this.sprintEl.classList.add('pressed'); this.lastSource = 'touch';
    });
    const sprintUp = e => { if (e.pointerId === this.sprintTouch) { this.sprintTouch = null; this.sprintEl.classList.remove('pressed'); } };
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) this.sprintEl?.addEventListener(ev, sprintUp);

    const map = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    addEventListener('keydown', e => {
      if (e.target?.closest?.('input, select, textarea')) return;
      if (map[e.code]) { this.keys.add(map[e.code]); this.lastSource = 'keys'; e.preventDefault(); }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprintKey = true;
      if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
        if (e.target?.closest?.('button')) return;
        this.actionKey = true;
        this.#queueAction('keys'); e.preventDefault();
      }
    });
    addEventListener('keyup', e => { if (map[e.code]) this.keys.delete(map[e.code]); if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') this.actionKey = false; if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprintKey = false; });
    addEventListener('blur', () => this.release());
  }

  #updateStick(cx, cy) {
    const dx = cx - this.touch.ox, dy = cy - this.touch.oy;
    this.touch.v = stickVector(dx, dy, this.radius, this.deadZone);
    const len = Math.hypot(dx, dy) || 1, k = Math.min(len, this.radius) / len;
    if (this.knobEl) this.knobEl.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
  }

  #showStick(on) {
    if (!this.stickEl) return;
    this.stickEl.classList.toggle('on', on);
    if (on) { this.stickEl.style.left = this.touch.ox + 'px'; this.stickEl.style.top = this.touch.oy + 'px'; }
    else if (this.knobEl) this.knobEl.style.transform = '';
  }
}
