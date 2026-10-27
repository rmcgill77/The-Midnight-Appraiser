'use strict';

/* ===================================================================== case files (Phase 12c)
   Achievements. DATA.cases (data/cases.js) lists them; Cases.check runs after every change
   (Game.rules) and opens any whose condition is now true.
   - Never in a modded save: once god mode has touched a save, nothing more opens in it.
   - Each save keeps the ones it opened (state.cases: [{id, day}]).
   - Opened files are also kept across saves in localStorage (Cases.KEY), so the Case files
     screen shows everything you have ever opened, from the title screen too.
   Unlock toasts wait in Cases.pending (memory only) until the next render. */

const Cases = {
  KEY: 'ssp.cases.v1',
  pending: [],
  _life: null,

  list: () => DATA.cases,
  byId: id => DATA.cases.find(c => c.id === id),
  fits: (c, st) => !c.mode || (st ? st.mode === c.mode : true),

  life() {
    if (this._life) return this._life;
    try { const d = JSON.parse(localStorage.getItem(this.KEY) || '{}'); this._life = d && typeof d.opened === 'object' && d.opened ? d : { opened: {} }; }
    catch (e) { this._life = { opened: {} }; }
    return this._life;
  },
  saveLife() { try { localStorage.setItem(this.KEY, JSON.stringify(this.life())); } catch (e) { /* private mode: kept for this session */ } },
  opened(id) { return this.life().opened[id] || null; },
  inSave: (st, id) => !!st && Array.isArray(st.cases) && st.cases.some(x => x.id === id),
  count() { return DATA.cases.filter(c => this.opened(c.id)).length; },

  check(st) {
    if (!st || st.modded) return;
    if (!Array.isArray(st.cases)) st.cases = [];
    for (const c of DATA.cases) {
      if (!Cases.fits(c, st) || Cases.inSave(st, c.id)) continue;
      let ok = false;
      try { ok = !!c.when(st); } catch (e) { ok = false; }
      if (!ok) continue;
      st.cases.push({ id: c.id, day: st.day });
      const L = Cases.life();
      const first = !L.opened[c.id];
      if (first) { L.opened[c.id] = { day: st.day, mode: st.mode, at: Date.now() }; Cases.saveLife(); }
      log(st, `Case file opened: ${c.name}. ${c.text}`, 'loot');
      Cases.pending.push({ id: c.id, first });
    }
  },

  /* Called after each render: one toast per newly opened file. */
  flush() {
    if (!this.pending.length) return;
    const p = this.pending.splice(0);
    for (const x of p.slice(0, 3)) { const c = this.byId(x.id); if (c) toast(`Case file opened: ${c.name}`); }
    if (p.length > 3) toast(`…and ${p.length - 3} more in Case files`);
    if (typeof Sound !== 'undefined' && Sound.play) Sound.play('casefile');
  }
};
