import test from 'node:test';
import assert from 'node:assert/strict';
import { fillPronouns, pronounSet } from '../src/game/pronouns.js';
import { cleanLook, CLASSIC_LOOK } from '../src/engine/figure.js';

test('they/them uses plural verbs', () => {
  assert.equal(fillPronouns('{They} {are} late; I told {them}.', 0), 'They are late; I told them.');
  assert.equal(fillPronouns('{They} {has}', undefined), 'They have');
});
test('she/her and he/him', () => {
  assert.equal(fillPronouns('{They} {are} here, {their} bag is {theirs}.', 1), 'She is here, her bag is hers.');
  assert.equal(fillPronouns('{They}{s} lock{s} {themself} in', 2), 'Hes locks himself in');
});
test('plain text and unknown tokens are untouched', () => {
  assert.equal(fillPronouns('No tokens', 1), 'No tokens');
  assert.equal(fillPronouns('{nope}', 1), '{nope}');
  assert.equal(pronounSet(99).label, 'They/them');
});
test('cleanLook keeps pronouns only when set to a valid non-default', () => {
  assert.equal(cleanLook({ ...CLASSIC_LOOK, pronouns: 2 }).pronouns, 2);
  assert.equal('pronouns' in cleanLook({ ...CLASSIC_LOOK, pronouns: 0 }), false);
  assert.equal('pronouns' in cleanLook({ ...CLASSIC_LOOK, pronouns: 9 }), false);
  assert.equal('pronouns' in cleanLook(CLASSIC_LOOK), false);
});
