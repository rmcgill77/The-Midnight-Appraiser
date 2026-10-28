// Save slots. Every save carries a version so later phases can migrate old
// saves forward instead of throwing them away.

export const SAVE_VERSION = 5;
const KEY = slot => `tma.save.${slot}`;

const RENAMED = { Brit: 'Morgan', Styg: 'Stuart', Jae: 'Jade', Rando: 'Jackson', Paco: 'Pablo' };

// Migrations run in order: MIGRATIONS[n] upgrades a version-n save to n+1.
export const MIGRATIONS = {
  0: d => ({ ...d, version: 1, settings: d.settings ?? {} }),
  // Phase 1 adds rooms, the day's choice and the shop's books.
  1: d => ({ ...d, version: 2, room: d.room ?? 'back-room', dayMode: d.dayMode ?? null, shop: d.shop ?? null, nextItemId: d.nextItemId ?? 1 }),
  // Phase 2 runs on Second Sight Pawn's own simulation. Older test saves used stand-in
  // rules that can't be converted, so they keep only the seed and start a fresh sim.
  2: d => ({ version: 3, seed: d.seed, sim: null, world: { room: 'back-room', playTimeMs: d.playTimeMs ?? 0 }, player: d.player, clock: { state: 'stopped', elapsedMs: 0 }, savedAt: d.savedAt, slot: d.slot }),
  // Phase 8 adds shop stages and the walkthrough. A game saved before then already had
  // the whole shop, so it keeps it (stage 4, restored) and never sees the walkthrough.
  3: d => ({ ...d, version: 4, world: { ...(d.world || {}), shop: d.world?.shop ?? { tier: 4, booked: null }, tutorial: d.world?.tutorial ?? { done: true, step: null }, notes: d.world?.notes ?? {} } }),
  // Five townsfolk and the bar were renamed. Saves key people by name, so rename exact
  // matches ("Brit" the key or value, never part of a longer string) throughout the save.
  4: d => ({ ...JSON.parse(Object.entries(RENAMED).reduce((j, [from, to]) => j.split(`"${from}"`).join(`"${to}"`), JSON.stringify(d))), version: 5 }),
};

export function migrate(data, target = SAVE_VERSION, migrations = MIGRATIONS) {
  let d = { ...data, version: Number.isInteger(data?.version) ? data.version : 0 };
  if (d.version > target) throw new Error(`save is from a newer version (${d.version})`);
  while (d.version < target) {
    const step = migrations[d.version];
    if (!step) throw new Error(`no migration from version ${d.version}`);
    d = step(d);
  }
  return d;
}

export class SaveSlots {
  constructor(storage, count) { this.storage = storage; this.count = count; }

  write(slot, state) {
    const data = { ...state, version: SAVE_VERSION, savedAt: Date.now(), slot };
    const ok = this.storage.set(KEY(slot), JSON.stringify(data));
    this.storage.set('tma.lastSlot', String(slot));
    return { ok, persistent: this.storage.persistent, data };
  }

  read(slot) {
    const raw = this.storage.get(KEY(slot));
    if (!raw) return null;
    try { return migrate(JSON.parse(raw)); }
    catch (err) { return { corrupt: true, error: String(err.message || err), slot }; }
  }

  erase(slot) {
    this.storage.remove(KEY(slot));
    if (this.lastSlot() === slot) this.storage.remove('tma.lastSlot');
  }

  // The autosave: written every morning and when the game is put away. It lives beside
  // the numbered slots and never overwrites them.
  writeAuto(state) {
    const data = { ...state, version: SAVE_VERSION, savedAt: Date.now(), slot: 'auto' };
    return this.storage.set(KEY('auto'), JSON.stringify(data));
  }
  readAuto() { return this.read('auto'); }

  // Whatever was saved most recently, numbered slot or autosave: what Continue loads.
  latest() {
    const c = [...this.list().filter(s => s.data).map(s => ({ slot: s.slot, data: s.data }))];
    const a = this.readAuto(); if (a && !a.corrupt) c.push({ slot: 'auto', data: a });
    return c.sort((x, y) => (y.data.savedAt || 0) - (x.data.savedAt || 0))[0] ?? null;
  }

  // A save as a file you can keep, and back again. Import goes into the first empty slot.
  exportText(slot) { return this.storage.get(KEY(slot)); }
  importText(text) {
    let data;
    try { data = migrate(JSON.parse(text)); } catch (err) { return { error: 'That file isn’t a Midnight Appraiser save.' }; }
    if (!data || typeof data !== 'object' || !data.sim || typeof data.sim !== 'object') return { error: 'That file isn’t a Midnight Appraiser save.' };
    const free = this.list().find(s => !s.data && !s.corrupt);
    if (!free) return { error: 'Every slot is full. Delete one first.' };
    this.storage.set(KEY(free.slot), JSON.stringify({ ...data, version: SAVE_VERSION, slot: free.slot, savedAt: data.savedAt || Date.now() }));
    return { slot: free.slot };
  }

  list() {
    return Array.from({ length: this.count }, (_, i) => {
      const d = this.read(i + 1);
      return { slot: i + 1, data: d && !d.corrupt ? d : null, corrupt: !!d?.corrupt };
    });
  }

  lastSlot() {
    const n = parseInt(this.storage.get('tma.lastSlot'), 10);
    return n >= 1 && n <= this.count ? n : null;
  }
}
