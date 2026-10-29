import test from 'node:test';
import assert from 'node:assert/strict';
import { windBed } from '../src/game/wind.js';

test('the wind bed grows and rises in pitch with the wind', () => {
  const calm = windBed(1), breeze = windBed(5), gale = windBed(14), mad = windBed(40);
  assert.ok(calm.gain < breeze.gain && breeze.gain < gale.gain);
  assert.ok(calm.freq < breeze.freq && breeze.freq < gale.freq);
  assert.deepEqual(mad, gale);          // capped
  assert.ok(calm.gain < 0.012 && gale.gain < 0.1);
  assert.ok(windBed(-3).gain > 0);
});
