import test from 'node:test';
import assert from 'node:assert/strict';
import { shadowLength } from '../src/ui/sun-shadows.js';
import { skylight } from '../src/game/skylight.js';

test('shadows are short at noon and long (but capped) at the ends of the day', () => {
  const noon = skylight('summer', 13 * 60).sun, low = skylight('summer', 20 * 60 + 30).sun;
  assert.ok(shadowLength(noon) < 15);
  assert.ok(shadowLength(low) > 40);
  assert.ok(shadowLength({ len: 99 }) <= 76);
});
