// The character creator (Phase 12, rebuilt for the 24x32 figure in Phase 14): a big
// preview you can turn around and put through its poses, your portrait beside it, and
// every part of the look in six tabs. Changes update in place (no re-render), so the
// panel never jumps while you click through hairstyles.

import { el } from './ui.js';
import { PARTS, COLOR_OF, CLASSIC_LOOK, EXTRA_KEYS, cleanLook, randomLook, randomExtras } from '../engine/figure.js';
import { paintHD, HD_W, HD_H, PORTRAIT_SIZE } from '../engine/figure-hd.js';
import { paintInto } from './portraits.js';

const TABS = [
  ['body', 'Body', [['build', 'Build'], ['height', 'Height'], ['skin', 'Skin', 'color'], ['skinFx', 'Skin details'], ['pronouns', 'Pronouns']]],
  ['face', 'Face', [['eyes', 'Eyes'], ['eyeColor', 'Eye color', 'color'], ['brows', 'Brows'], ['mouth', 'Mouth'], ['face', 'Complexion'], ['mark', 'Marks'], ['eyeFx', 'Eye details'], ['makeup', 'Makeup'], ['piercing', 'Piercings'], ['facial', 'Facial hair']]],
  ['hair', 'Hair', [['hair', 'Style'], ['hairColor', 'Color', 'color'], ['hairFx', 'Dye']]],
  ['hat', 'Hat', [['hat', 'Hat'], ['hatColor', 'Hat color', 'color']]],
  ['clothes', 'Outfit', [['top', 'Top'], ['topColor', 'Top color', 'color'], ['pattern', 'Pattern'], ['neck', 'Neck'], ['neckColor', 'Neck color', 'color'], ['bottom', 'Bottoms'], ['bottomColor', 'Bottoms color', 'color'], ['shoes', 'Shoes']]],
  ['extras', 'Extras', [['extra', 'Accessory'], ['extraColor', 'Color', 'color'], ['extra2', 'Second accessory'], ['extra2Color', 'Second color', 'color']]],
];
const FACINGS = ['down', 'left', 'up', 'right'];
const POSES = [['walk', 'Walk'], ['idle', 'Stand'], ['appraise', 'Appraise'], ['carry', 'Haul']];
const FRAMES = { walk: 4, idle: 2, appraise: 2, carry: 4 };
const STEP_MS = { walk: 130, idle: 700, appraise: 600, carry: 150 };

function drawGrid(cv, grid) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } }));
}

// Phase 27: the wardrobe at home opens this too (eyebrow, title, okLabel, reason say so).
export function openCreator(ui, { look: start, onDone, onBack, eyebrow = 'New game · You', title = 'Who walks in the door?', okLabel = 'Continue', reason = 'title' }) {
  const look = cleanLook(start || CLASSIC_LOOK);
  let tab = 'body', facing = 0, frame = 0, pose = 'walk', timer = null;
  const sig = { signature: true };

  // The preview: the 24x32 figure scaled up crisp, your portrait, and all four sides.
  const big = el('canvas', { width: String(HD_W), height: String(HD_H), class: 'creator-big', id: 'creator-preview', role: 'img', 'aria-label': 'Your character' });
  const face = el('canvas', { width: String(PORTRAIT_SIZE), height: String(PORTRAIT_SIZE), class: 'creator-portrait', id: 'creator-portrait', role: 'img', 'aria-label': 'Your portrait' });
  const strip = FACINGS.map(() => el('canvas', { width: String(HD_W), height: String(HD_H), class: 'creator-small', 'aria-hidden': 'true' }));
  const drawBig = () => drawGrid(big, paintHD(look, pose === 'appraise' ? 'down' : FACINGS[facing], frame % FRAMES[pose], pose, sig));
  const redraw = () => { drawBig(); paintInto(face, look, true); strip.forEach((cv, i) => drawGrid(cv, paintHD(look, FACINGS[i], 0, 'idle', sig))); };
  const turn = d => { facing = (facing + d + 4) % 4; if (pose === 'appraise') setPose('walk'); else drawBig(); };

  const poseBtns = POSES.map(([id, name]) => el('button', { type: 'button', id: `pose-${id}`, onclick: () => setPose(id) }, name));
  function setPose(p) {
    pose = p; frame = 0;
    poseBtns.forEach((b, i) => { const on = POSES[i][0] === p; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    restart(); drawBig();
  }

  const preview = el('div', { class: 'creator-preview' },
    el('div', { class: 'creator-figure' },
      el('button', { type: 'button', class: 'icon-btn', id: 'turn-left', 'aria-label': 'Turn left', onclick: () => turn(-1) }, '‹'),
      el('button', { type: 'button', class: 'creator-stage', 'aria-label': 'Turn around', onclick: () => turn(1) }, big),
      el('button', { type: 'button', class: 'icon-btn', id: 'turn-right', 'aria-label': 'Turn right', onclick: () => turn(1) }, '›')),
    el('div', { class: 'creator-side' },
      face,
      el('div', { class: 'creator-strip' }, strip)),
    el('div', { class: 'seg creator-poses', role: 'group', 'aria-label': 'Pose' }, poseBtns));

  // One stepper per part, one swatch row per color.
  const controls = {};
  const set = (key, v) => { look[key] = v; sync(); };
  const stepper = (key, label) => {
    const list = PARTS[key], val = el('output', { class: 'creator-val', id: `val-${key}` });
    controls[key] = () => { val.textContent = list[look[key] ?? 0]; };
    return el('div', { class: 'creator-row' },
      el('span', { class: 'label' }, label),
      el('div', { class: 'creator-step' },
        el('button', { type: 'button', class: 'icon-btn', id: `prev-${key}`, 'aria-label': `Previous ${label.toLowerCase()}`, onclick: () => set(key, ((look[key] ?? 0) - 1 + list.length) % list.length) }, '‹'),
        val,
        el('button', { type: 'button', class: 'icon-btn', id: `next-${key}`, 'aria-label': `Next ${label.toLowerCase()}`, onclick: () => set(key, ((look[key] ?? 0) + 1) % list.length) }, '›')));
  };
  const swatches = (key, label) => {
    const list = COLOR_OF[key];
    const btns = list.map((c, i) => el('button', { type: 'button', class: 'swatch', id: `sw-${key}-${i}`, style: `background:${c}`, 'aria-label': `${label} ${i + 1}`, onclick: () => set(key, i) }));
    controls[key] = () => btns.forEach((b, i) => { b.classList.toggle('on', i === look[key]); b.setAttribute('aria-pressed', String(i === look[key])); });
    return el('div', { class: 'creator-row' }, el('span', { class: 'label' }, label), el('div', { class: 'swatches', role: 'group', 'aria-label': label }, btns));
  };
  const panes = {};
  for (const [id, , rows] of TABS) panes[id] = el('div', { class: 'creator-pane', id: `pane-${id}` }, rows.map(([key, label, kind]) => (kind === 'color' ? swatches(key, label) : stepper(key, label))));
  const tabBtns = TABS.map(([id, name]) => el('button', { type: 'button', role: 'tab', id: `ctab-${id}`, onclick: () => { tab = id; sync(); } }, name));

  function sync() {
    redraw();
    for (const f of Object.values(controls)) f();
    for (const [id] of TABS) panes[id].hidden = id !== tab;
    tabBtns.forEach((b, i) => { const on = TABS[i][0] === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  }

  ui.open({
    id: 'creator', size: 'wide', eyebrow, title, reason, dismissable: false,
    body: [
      el('div', { class: 'creator' },
        preview,
        el('div', { class: 'creator-controls' },
          el('div', { class: 'seg creator-tabs', role: 'tablist', 'aria-label': 'Parts' }, tabBtns),
          Object.values(panes))),
      el('p', { class: 'note creator-note' }, 'Whatever you wear, the loupe on its cord comes with the job.'),
    ],
    actions: [
      { id: 'look-ok', label: okLabel, kind: 'primary', onClick: () => { stop(); onDone({ ...look }); } },
      { id: 'look-random', label: 'Surprise me', onClick: () => { for (const k of [...EXTRA_KEYS, 'height']) look[k] = 0; delete look.extra2Color; Object.assign(look, randomLook(Math.random, { full: true }), randomExtras()); sync(); } },
      { label: 'Back', kind: 'quiet', onClick: () => { stop(); onBack?.({ ...look }); } },
    ],
  });
  setPose('walk');
  sync();

  // Animate the pose while the panel is up.
  function restart() {
    clearInterval(timer);
    timer = setInterval(() => { if (!big.isConnected) return stop(); frame = (frame + 1) % FRAMES[pose]; drawBig(); }, STEP_MS[pose]);
  }
  function stop() { clearInterval(timer); }
}
