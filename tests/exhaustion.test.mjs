// Tests for what tiredness costs. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG } from '../src/engine/rng.js';
import { SLOW, fumbleAmount, afterMissedDay, reactionTier, collapseReactions } from '../src/game/exhaustion.js';

test('a tired player walks at four fifths speed', () => assert.equal(SLOW, 0.8));

test('about one sale in four is rung up wrong, 10-30% short', () => {
  const rng = new RNG(7);
  let slips = 0;
  for (let i = 0; i < 2000; i++) {
    const r = fumbleAmount(100, rng);
    assert.equal(r.amount + r.slipped, 100);
    if (r.slipped) { slips++; assert.ok(r.slipped >= 10 && r.slipped <= 30, `short by ${r.slipped}`); }
  }
  assert.ok(slips > 400 && slips < 600, `${slips} of 2000`);
});

test('tiny sales are never fumbled, and the same seed gives the same mistakes', () => {
  assert.deepEqual(fumbleAmount(1, new RNG(1)), { amount: 1, slipped: 0 });
  const a = [], b = [];
  const r1 = new RNG(3), r2 = new RNG(3);
  for (let i = 0; i < 20; i++) { a.push(fumbleAmount(50, r1).amount); b.push(fumbleAmount(50, r2).amount); }
  assert.deepEqual(a, b);
});

test('a missed day costs half a heart (five points) and never goes below zero', () => {
  assert.equal(afterMissedDay(23), 18);
  assert.equal(afterMissedDay(3), 0);
  assert.equal(afterMissedDay(0), 0);
});

test('the closer the friend, the more likely they are worried', () => {
  assert.equal(reactionTier(6, 0.9), 'worried');
  assert.equal(reactionTier(1, 0.9), 'unaware');
  assert.equal(reactionTier(1, 0.4), 'annoyed');
  assert.equal(reactionTier(1, 0.05), 'worried');
  const rng = new RNG(11), count = { worried: 0, annoyed: 0, unaware: 0 }, lo = { worried: 0, annoyed: 0, unaware: 0 };
  for (let i = 0; i < 3000; i++) { count[reactionTier(5, rng.next())]++; lo[reactionTier(1, rng.next())]++; }
  assert.ok(count.worried > lo.worried * 3, 'close friends worry far more often');
  assert.ok(lo.unaware > count.unaware, 'distant friends more often do not notice');
});

test('reactions: the closest few friends, strongest first, with a line each', () => {
  const people = [{ name: 'Kristen', hearts: 7 }, { name: 'Dex', hearts: 0 }, { name: 'Ryan', hearts: 2 }, { name: 'Erin', hearts: 4 }, { name: 'Mina', hearts: 1 }];
  const r = collapseReactions(people, new RNG(5));
  assert.deepEqual(r.map(x => x.name), ['Kristen', 'Erin', 'Ryan']);
  for (const x of r) { assert.ok(['worried', 'annoyed', 'unaware'].includes(x.tier)); assert.ok(x.line.includes(x.name)); }
  assert.deepEqual(collapseReactions([{ name: 'Dex', hearts: 0 }], new RNG(5)), []);
});
