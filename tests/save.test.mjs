// Tests for old-save handling. Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveSlots, SAVE_VERSION, FIRST_SUPPORTED } from '../src/game/save.js';
import { createStorage } from '../src/game/storage.js';

const mem = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) }; };
const put = (storage, key, obj) => storage.set(key, JSON.stringify(obj));
const sim = { cash: 10 };
const NEW = SAVE_VERSION, OLD = SAVE_VERSION - 1;   // pretend the current version is the first supported one

test('today every older save still loads (nothing is marked old yet)', () => {
  assert.equal(FIRST_SUPPORTED, 0);
  const storage = createStorage(mem()), slots = new SaveSlots(storage, 3);
  put(storage, 'tma.save.1', { version: SAVE_VERSION, sim, savedAt: 5 });
  const [one] = slots.list();
  assert.ok(one.data); assert.equal(one.legacy, false);
});

test('a save older than the first supported version is marked old, not loaded or migrated', () => {
  const storage = createStorage(mem()), slots = new SaveSlots(storage, 3, NEW);
  put(storage, 'tma.save.1', { version: OLD, sim, savedAt: 5 });
  put(storage, 'tma.save.2', { version: NEW, sim, savedAt: 9 });
  const [one, two] = slots.list();
  assert.equal(one.data, null); assert.equal(one.legacy, true); assert.equal(one.corrupt, false);
  assert.ok(two.data); assert.equal(two.legacy, false);
  assert.equal(slots.read(1).legacy, true);
  assert.equal(slots.read(1).version, OLD);
});

test('a save with no version counts as old', () => {
  const storage = createStorage(mem()), slots = new SaveSlots(storage, 3, NEW);
  put(storage, 'tma.save.1', { sim });
  assert.equal(slots.list()[0].legacy, true);
});

test('Continue ignores old saves, including an old autosave', () => {
  const storage = createStorage(mem()), slots = new SaveSlots(storage, 3, NEW);
  put(storage, 'tma.save.1', { version: OLD, sim, savedAt: 100 });
  put(storage, 'tma.save.auto', { version: OLD, sim, savedAt: 200 });
  assert.equal(slots.latest(), null);
  put(storage, 'tma.save.2', { version: NEW, sim, savedAt: 50 });
  assert.equal(slots.latest().slot, 2);
});

test('an old save can still be exported byte for byte', () => {
  const storage = createStorage(mem()), slots = new SaveSlots(storage, 3, NEW);
  const text = JSON.stringify({ version: OLD, sim, savedAt: 5 });
  storage.set('tma.save.1', text);
  assert.equal(slots.exportText(1), text);
});

test('importing an old save file is refused with a clear message', () => {
  const storage = createStorage(mem()), slots = new SaveSlots(storage, 3, NEW);
  const r = slots.importText(JSON.stringify({ version: OLD, sim }));
  assert.match(r.error, /older version/);
  assert.equal(slots.list()[0].data, null);
  assert.equal(slots.list()[0].legacy, false);     // nothing was written
});

test('importing a current save works, and writing stamps the current version', () => {
  const storage = createStorage(mem()), slots = new SaveSlots(storage, 3, NEW);
  const r = slots.importText(JSON.stringify({ version: NEW, sim, savedAt: 3 }));
  assert.equal(r.slot, 1);
  const w = slots.write(2, { sim });
  assert.equal(w.data.version, SAVE_VERSION);
});

test('a broken file is still reported as corrupt, not old', () => {
  const storage = createStorage(mem()), slots = new SaveSlots(storage, 3, NEW);
  storage.set('tma.save.1', '{nope');
  const [one] = slots.list();
  assert.equal(one.corrupt, true); assert.equal(one.legacy, false);
});

test('the preview mode keeps its own saves, apart from the normal ones', () => {
  const storage = createStorage(mem());
  const normal = new SaveSlots(storage, 3), preview = new SaveSlots(storage, 3, undefined, 'tma-cont');
  put(storage, 'tma.save.1', { version: SAVE_VERSION, sim, savedAt: 5 });
  assert.ok(normal.list()[0].data); assert.equal(preview.list()[0].data, null);
  preview.write(2, { sim });
  assert.ok(preview.list()[1].data); assert.equal(normal.list()[1].data, null);
  assert.equal(storage.get('tma-cont.lastSlot'), '2'); assert.equal(storage.get('tma.lastSlot'), null);
  assert.equal(preview.lastSlot(), 2); assert.equal(normal.lastSlot(), null);
});
