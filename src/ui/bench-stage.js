// The lamp (Phase 17): the find on the bench under a pool of light, drawn in pixels, and
// a short animation for each instrument so you can see the test happen.
//   EMF meter:   a gauge; the needle swings up and settles on the band (or wavers between two).
//   Blacklight:  a violet beam sweeps the find and the hidden mark glows into view.
//   Reagent:     a drop falls, then the reaction rises in its own color.
//   Spirit Box:  static, then a voice (a clean wave) or crosstalk (a ragged one).
// About a second and a half. Reduced motion skips straight to the end.

import { iconRects, S } from '../rules/index.js';

export const STAGE_W = 160, STAGE_H = 64;
const DUR = 1500;
const BANDS = ['flat', 'flicker', 'steady', 'spiking'];
const BAND_COLOR = ['#6c7287', '#7fbf6a', '#e0a64a', '#d0584e'];
const UV_ICON = { none: null, handprints: 'hand', teeth: 'teeth', spiral: 'spiral', script: 'script', circuit: 'circuit' };

function drawIcon(g, name, x, y, scale, color, alpha = 1) {
  if (!name) return;
  g.globalAlpha = alpha; g.fillStyle = color;
  for (const [rx, ry, w] of iconRects(name)) g.fillRect(x + rx * scale, y + ry * scale, w * scale, scale);
  g.globalAlpha = 1;
}

export class BenchStage {
  constructor(it, { reducedMotion = false } = {}) {
    this.it = it; this.reduced = reducedMotion;
    this.canvas = document.createElement('canvas');
    this.canvas.width = STAGE_W; this.canvas.height = STAGE_H;
    this.canvas.className = 'bench-stage';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', `${S.Items.name(it)} under the bench lamp`);
    this.g = this.canvas.getContext('2d');
    this.busy = false;
    this.draw(null, 1);
  }

  // The bench, the lamp's pool of light and the find.
  base(t = 0) {
    const g = this.g;
    g.fillStyle = '#0b0c12'; g.fillRect(0, 0, STAGE_W, STAGE_H);
    g.fillStyle = '#2a1f17'; g.fillRect(0, 44, STAGE_W, 20);                 // the bench top
    g.fillStyle = '#3a2b1f'; g.fillRect(0, 44, STAGE_W, 2);
    for (let x = 6; x < STAGE_W; x += 23) { g.fillStyle = '#231a13'; g.fillRect(x, 50 + (x % 3), 14, 1); }
    // the lamp pool
    const gr = g.createRadialGradient(80, 40, 2, 80, 40, 52);
    gr.addColorStop(0, `rgba(224,166,74,${0.32 + Math.sin(t * 6) * 0.01})`); gr.addColorStop(1, 'rgba(224,166,74,0)');
    g.fillStyle = gr; g.fillRect(20, 0, 120, STAGE_H);
    g.fillStyle = '#5a4630'; g.fillRect(70, 0, 20, 3); g.fillStyle = '#e0a64a'; g.fillRect(73, 3, 14, 1);
    // shadow and the find, at 2x
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(66, 47, 28, 3);
    const icon = S.baseOf(this.it)?.icon;
    drawIcon(g, icon, 65, 17, 2, '#07080c');
    drawIcon(g, icon, 64, 16, 2, '#ddd5c1');
  }

  draw(anim, p, t = 0) {
    this.base(t);
    if (!anim) return;
    const f = this[`fx_${anim.tool}`];
    f?.call(this, anim, p, t);
  }

  // Play a test. reading: the instrument's values after the test (one value = a sure reading).
  play(toolId, reading) {
    const anim = { tool: toolId, reading: reading || [], sure: (reading || []).length === 1 };
    if (this.reduced || !this.canvas.isConnected) { this.draw(anim, 1, 0); return Promise.resolve(); }
    this.busy = true;
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / DUR);
        this.draw(anim, p, (now - t0) / 1000);
        if (p < 1 && this.canvas.isConnected) requestAnimationFrame(step);
        else { this.busy = false; this.last = anim; res(); }
      };
      requestAnimationFrame(step);
    });
  }

  // After a re-render: show the last result still on the stage.
  hold(anim) { if (anim) { this.last = anim; this.draw(anim, 1, 0); } }

  fx_emf(a, p, t) {
    const g = this.g, cx = 28, cy = 40, r = 20;
    g.fillStyle = '#13151d'; g.fillRect(cx - r - 3, cy - r - 3, r * 2 + 6, r + 8);
    g.fillStyle = '#2c3140'; g.fillRect(cx - r - 3, cy + 4, r * 2 + 6, 1);
    // four colored bands along the arc
    for (let i = 0; i < 4; i++) for (let s = 0; s < 10; s++) {
      const ang = Math.PI + (i * 10 + s) / 40 * Math.PI;
      g.fillStyle = BAND_COLOR[i];
      g.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 2, 2);
    }
    const at = v => Math.PI + ((BANDS.indexOf(v) + 0.5) / 4) * Math.PI;
    const vals = a.reading.length ? a.reading : ['flat'];
    let target = at(vals[0]);
    if (!a.sure && vals.length > 1) target = at(vals[0]) + (at(vals[1]) - at(vals[0])) * (0.5 + 0.5 * Math.sin(t * 9));
    const swing = p < 0.55 ? Math.PI + Math.sin(p / 0.55 * Math.PI) * Math.PI * 0.95 : null;
    const ang = swing ?? (Math.PI + (target - Math.PI) * Math.min(1, (p - 0.55) / 0.2) + (a.sure ? Math.sin(t * 30) * 0.04 * (1 - p) : 0));
    for (let i = 0; i < r - 3; i++) { g.fillStyle = '#ddd5c1'; g.fillRect(Math.round(cx + Math.cos(ang) * i), Math.round(cy + Math.sin(ang) * i), 1, 1); }
    g.fillStyle = '#e0a64a'; g.fillRect(cx - 1, cy - 1, 3, 3);
    // a probe held out toward the find
    g.fillStyle = '#8d93a6'; g.fillRect(48, 30, 12, 2);
    if (p > 0.2) { g.fillStyle = `rgba(224,166,74,${0.25 + 0.2 * Math.sin(t * 20)})`; g.fillRect(58, 29, 4, 4); }
  }

  fx_uv(a, p, t) {
    const g = this.g;
    // the room goes dark and violet
    g.fillStyle = `rgba(30,10,60,${Math.min(0.55, p * 1.4)})`; g.fillRect(0, 0, STAGE_W, STAGE_H);
    const x = 40 + Math.min(1, p / 0.6) * 80;
    const gr = g.createLinearGradient(x - 18, 0, x + 18, 0);
    gr.addColorStop(0, 'rgba(169,139,224,0)'); gr.addColorStop(0.5, 'rgba(169,139,224,0.55)'); gr.addColorStop(1, 'rgba(169,139,224,0)');
    g.fillStyle = gr; g.fillRect(x - 18, 4, 36, 44);
    // the blacklight itself
    g.fillStyle = '#2c3140'; g.fillRect(x - 6, 2, 12, 4); g.fillStyle = '#b9a0ec'; g.fillRect(x - 5, 6, 10, 1);
    if (p < 0.55) return;
    const glow = Math.min(1, (p - 0.55) / 0.3);
    const vals = a.reading.filter(v => UV_ICON[v]);
    if (!vals.length) return;
    if (a.sure) drawIcon(g, UV_ICON[vals[0]], 64, 16, 2, '#d6c4ff', glow * (0.75 + 0.25 * Math.sin(t * 8)));
    else {   // faint: the possibilities flicker over each other
      const i = Math.floor(t * 4) % vals.length;
      drawIcon(g, UV_ICON[vals[i]], 64, 16, 2, '#b9a0ec', glow * 0.45);
    }
  }

  fx_reagent(a, p, t) {
    const g = this.g, C = S.DATA.reagentColor;
    // the dropper
    g.fillStyle = '#8d93a6'; g.fillRect(78, 0, 4, 6); g.fillStyle = '#c9d3e8'; g.fillRect(79, 6, 2, 3);
    const vals = a.reading.length ? a.reading : ['none'];
    if (p < 0.35) { const y = 9 + (p / 0.35) * 14; g.fillStyle = '#9fd0e0'; g.fillRect(79, Math.round(y), 2, 3); return; }
    const q = (p - 0.35) / 0.65;
    const pick = a.sure ? vals[0] : vals[Math.floor(t * 3) % vals.length];
    const col = C[pick] ?? '#3a4a4f';
    if (pick === 'none') { g.fillStyle = 'rgba(160,190,200,0.4)'; g.fillRect(76, 24, 8, 2); return; }
    // the reaction: bubbles or smoke rising in the reaction's color
    for (let i = 0; i < 14; i++) {
      const life = (q * 1.6 + i / 14) % 1;
      const bx = 64 + ((i * 37) % 32) + Math.sin(t * 3 + i) * 2;
      const by = 40 - life * 34;
      g.globalAlpha = (1 - life) * (a.sure ? 0.9 : 0.5);
      g.fillStyle = col; g.fillRect(Math.round(bx), Math.round(by), i % 3 ? 2 : 3, i % 3 ? 2 : 3);
    }
    g.globalAlpha = 1;
    g.fillStyle = col; g.globalAlpha = 0.35 * Math.min(1, q * 3); g.fillRect(62, 40, 36, 4); g.globalAlpha = 1;
  }

  fx_spirit(a, p, t) {
    const g = this.g;
    // the box
    g.fillStyle = '#2c3140'; g.fillRect(8, 22, 34, 22); g.fillStyle = '#13151d'; g.fillRect(10, 24, 30, 12);
    g.fillStyle = '#9fd08a'; g.fillRect(36, 39, 3, 3);
    // static, then a voice
    const clean = a.sure ? Math.max(0, (p - 0.5) / 0.4) : 0;
    for (let x = 0; x < 28; x++) {
      const noise = (Math.sin(x * 12.9 + t * 40) * 43758.5 % 1) * 5;
      const wave = Math.sin(x * 0.55 + t * 10) * 4;
      const y = 30 + Math.round(wave * clean + noise * (1 - clean) * (a.sure ? 1 : 0.8) * (p < 0.15 ? p / 0.15 : 1));
      g.fillStyle = '#9fd08a'; g.fillRect(11 + x, Math.max(25, Math.min(35, y)), 1, 1);
    }
    // sound reaching toward the find
    for (let i = 0; i < 3; i++) { const r = ((t * 30 + i * 10) % 30); g.fillStyle = `rgba(159,208,138,${0.4 * (1 - r / 30)})`; g.fillRect(44 + r, 32 - Math.round(r / 3), 1, Math.round(r / 1.5) + 1); }
  }
}
