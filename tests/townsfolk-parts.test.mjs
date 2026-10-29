import test from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_NPCS, streetWalkers, parkPeople, beachPeople, dayOffSpot, outWalking } from '../src/data/townsfolk.js';

test('part 0 keeps the old once-a-day answers', () => {
  for (let day = 1; day < 40; day++) {
    assert.deepEqual(streetWalkers(day, 7).map(n => n.name), streetWalkers(day, 7, 0).map(n => n.name));
    assert.deepEqual(parkPeople(day, 7).names, parkPeople(day, 7, () => false, 0).names);
  }
});
test('over a day people move: the walkers and the park crowd differ between parts', () => {
  let walkDiff = 0, parkDiff = 0, spotDiff = 0;
  for (let day = 1; day < 60; day++) {
    const w = [0, 1, 2].map(p => streetWalkers(day, 3, p).map(n => n.name).join());
    if (new Set(w).size > 1) walkDiff++;
    const k = [0, 1, 2].map(p => parkPeople(day, 3, () => false, p).names.join());
    if (new Set(k).size > 1) parkDiff++;
    const o = [0, 1, 2].map(p => dayOffSpot('Ray Delgado', day, 3, () => true, p));
    if (new Set(o).size > 1) spotDiff++;
  }
  assert.ok(walkDiff > 10 && parkDiff > 10 && spotDiff > 10, `${walkDiff} ${parkDiff} ${spotDiff}`);
});
test('people with jobs never wander, and the beach stays empty in winter, at any part', () => {
  for (const p of [0, 1, 2, 3]) {
    for (const n of CUSTOM_NPCS.filter(n => n.job)) assert.equal(outWalking(n, 5, 1, p), false);
    assert.deepEqual(beachPeople(5, 1, 'winter', [], p).names, []);
  }
});
