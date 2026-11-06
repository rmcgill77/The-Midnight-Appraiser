// Phase 34a: the noir figure paints every option in every pose and direction, keeps the 24x32 frame
// (32x24 knocked out) and the feet where the old figure had them, and is off unless switched on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { paintHD, setArtStyle, artStyle } from '../src/engine/figure-hd.js';
import { paintNoir } from '../src/engine/figure-noir.js';
import { PARTS, CLASSIC_LOOK, cleanLook } from '../src/engine/figure.js';

const POSES = [['walk', 4], ['idle', 2], ['carry', 4], ['appraise', 2]];
const FACINGS = ['down', 'up', 'left', 'right'];
const filled = g => g.flat().filter(Boolean).length;

test('the switch is off by default, and switching it changes what paintHD draws', () => {
  assert.equal(artStyle(), 'classic');
  const classic = paintHD(CLASSIC_LOOK, 'down', 0);
  setArtStyle('noir');
  try {
    assert.equal(artStyle(), 'noir');
    assert.notDeepEqual(paintHD(CLASSIC_LOOK, 'down', 0), classic);
  } finally { setArtStyle('classic'); }
  assert.deepEqual(paintHD(CLASSIC_LOOK, 'down', 0), classic);
});

test('every option paints in every pose and direction, at the right size', () => {
  const keys = ['build', 'top', 'bottom', 'extra', 'neck', 'pattern', 'shoes', 'height', 'hair', 'hat'];
  for (const k of keys) {
    for (let i = 0; i < PARTS[k].length; i++) {
      const look = cleanLook({ ...CLASSIC_LOOK, [k]: i });
      for (const [pose, n] of POSES) for (const f of FACINGS) for (let fr = 0; fr < n; fr++) {
        const g = paintNoir(look, f, fr, pose, { signature: true });
        assert.equal(g.length, 32, `${k} ${PARTS[k][i]} ${pose} ${f}`);
        assert.equal(g[0].length, 24);
        assert.ok(filled(g) > 150, `${k} ${PARTS[k][i]} ${pose} ${f} ${fr} is drawn`);
      }
      const ko = paintNoir(look, 'down', 0, 'ko');
      assert.equal(ko.length, 24); assert.equal(ko[0].length, 32);
    }
  }
});

test('the feet stand where they always did (row 30, around column 12)', () => {
  for (let b = 0; b < PARTS.build.length; b++) {
    const g = paintNoir(cleanLook({ ...CLASSIC_LOOK, build: b }), 'down', 1, 'walk');
    const lowest = Math.max(...g.map((r, y) => (r.some(Boolean) ? y : -1)));
    assert.ok(lowest >= 30 && lowest <= 31, `build ${PARTS.build[b]}: lowest row ${lowest}`);
    const xs = g[30].map((c, x) => (c ? x : null)).filter(x => x != null);
    assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - 11.5) <= 1.5, `build ${PARTS.build[b]}: feet centred`);
  }
});

test('left is right mirrored (the shape; the light stays on the upper left)', () => {
  const r = paintNoir(cleanLook(CLASSIC_LOOK), 'right', 2, 'walk'), l = paintNoir(cleanLook(CLASSIC_LOOK), 'left', 2, 'walk');
  assert.deepEqual(l.map(row => row.map(Boolean)), r.map(row => [...row].reverse().map(Boolean)));
});

test('34c: a noir portrait changes the clothes only: same size, the same face and hair', async () => {
  const { paintPortraitHD } = await import('../src/engine/figure-hd.js');
  const look = { ...CLASSIC_LOOK, hat: 0 };
  const classic = paintPortraitHD(look, { mood: 'happy' });
  setArtStyle('noir');
  let noir;
  try { noir = paintPortraitHD(look, { mood: 'happy' }); } finally { setArtStyle('classic'); }
  assert.equal(noir.length, classic.length); assert.equal(noir[0].length, classic[0].length);
  assert.deepEqual(noir.slice(0, 64), classic.slice(0, 64), 'the head is untouched');
  assert.notDeepEqual(noir.slice(70), classic.slice(70), 'the clothes are restyled');
});
