// Fixed-timestep game loop. update(dt) always receives CONFIG.step; render(alpha)
// runs once per animation frame. Rendering is capped by the display (60fps on phones).

export function createLoop({ step, maxFrame, update, render, raf = globalThis.requestAnimationFrame }) {
  let acc = 0, last = 0, running = false, handle = 0;
  const fps = { value: 0, frames: 0, time: 0 };

  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    let dt = last ? t - last : step;
    last = t;
    if (dt > maxFrame) dt = maxFrame;     // tab came back or a long hitch: don't spiral
    acc += dt;
    let steps = 0;
    while (acc >= step && steps < 8) { update(step); acc -= step; steps++; }
    if (steps === 8) acc = 0;
    render(acc / step);

    fps.frames++; fps.time += dt;
    if (fps.time >= 0.5) { fps.value = Math.round(fps.frames / fps.time); fps.frames = 0; fps.time = 0; }
    handle = raf(frame);
  }

  return {
    fps,
    start() { if (running) return; running = true; last = 0; handle = raf(frame); },
    stop() { running = false; if (globalThis.cancelAnimationFrame) cancelAnimationFrame(handle); },
    get running() { return running; },
  };
}
