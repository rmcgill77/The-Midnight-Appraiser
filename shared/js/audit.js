'use strict';

/* ===================================================================== audit
   The morning after the last day, the Office inspects the storefront, the back case
   and the basement. Each check scores points; the total gives one of three outcomes.
   The ending then depends on who you pledged to, whether you maxed them, and whether
   you found the shop's own name. state.gameOver = { type:'audit', checks, total,
   outcome, ending:{kind, fac, maxed, coda}, recap }. */
const Audit = {
  /* ----- hiding the basement ----- */
  hideOpen(st) {
    const left = Calendar.daysLeft(st);
    return Story.on(st) && !st.story.hidden && left !== null && left > 0 && left <= DATA.hide.window;
  },
  hideBlocker(st, how) {
    const H = DATA.hide[how];
    if (!H) return 'Unknown';
    if (!Audit.hideOpen(st)) return st.story.hidden ? 'Already hidden' : 'Only in the last week';
    if (st.cash < H.cost) return `Needs ${money(H.cost)}`;
    if (H.scrap && st.supplies.scrap < H.scrap) return `Needs ${H.scrap} scrap`;
    if (H.mins && st.bench.mins < H.mins) return `Needs ${dur(H.mins)} of bench time`;
    if (H.rep && st.rep.corporate < H.rep) return `Needs H&V ${repLabel(H.rep)}`;
    return null;
  },
  hide(st, how) {
    if (Audit.hideBlocker(st, how)) return false;
    const H = DATA.hide[how];
    st.cash -= H.cost;
    if (H.scrap) st.supplies.scrap -= H.scrap;
    if (H.mins) st.bench.mins -= H.mins;
    if (how === 'lawyers') Rep.add(st, 'office', -10);
    st.story.hidden = how;
    log(st, how === 'brick'
      ? 'Bricked up the basement door. The mortar is still wet. Something on the other side was very quiet while you worked.'
      : 'Halberd & Vane made a call. The lower premises are now “under private review.” Nobody will say whose.', 'warn');
    return true;
  },

  /* ----- the inspection ----- */
  checks(st) {
    const A = DATA.audit, hidden = !!st.story.hidden, rows = [];
    const add = (id, label, value, pts, extra = {}) => rows.push({ id, label, value, pts, ...extra });
    const cursedOf = list => list.filter(it => anomalyOf(it).alignment === 'cursed');
    const stock = cursedOf(st.inventory.stock);
    const mis = stock.filter(it => !it.appraisal || it.appraisal.alignment !== 'cursed').length;
    const open = stock.filter(it => it.appraisal && it.appraisal.alignment === 'cursed' && !it.sealed).length;
    add('stock', 'Cursed stock not tagged cursed', mis, Math.max(A.mislabeledMax, mis * A.mislabeled));
    add('open', 'Cursed stock left unsealed', open, Math.max(A.basementMax, open * A.openCurse));
    if (hidden) {
      add('basement', 'Unsealed curses in the basement', 'Not inspected', 0, { skipped: true });
      add('cells', 'Contained entities with weak seals', 'Not inspected', 0, { skipped: true });
    } else {
      const bin = cursedOf(st.inventory.loot).filter(it => !it.sealed && !it.job).length;
      const weak = st.containment.filter(c => c.stability < A.weakAt).length;
      add('basement', 'Unsealed curses in the basement', bin, Math.max(A.basementMax, bin * A.basementCurse));
      add('cells', 'Contained entities with weak seals', `${weak} of ${st.containment.length}`, Math.max(A.cellsMax, weak * A.weakCell));
    }
    const out = st.counters.breakouts || 0;
    add('breakouts', 'Entities that broke out', out, Math.max(A.breakoutMax, out * A.breakout));
    const inc = st.counters.incidents || 0;
    add('incidents', 'Incidents in the news', inc, Math.max(A.incidentsMax, -Math.floor(inc / A.incidentsPer)));
    add('heat', 'Heat', st.heat, A.heat.find(([max]) => st.heat < max)[1]);
    const ar = st.rent.arrears;
    add('rent', 'Back rent owed', money(ar), !ar ? 0 : ar > st.rent.amount ? A.rentDeep : A.rentShort);
    const off = st.rep.office;
    add('office', 'Record with the Office', repLabel(off), off >= A.officeGood ? 1 : off <= A.officeBad ? -1 : 0);
    const sur = st.counters.surrendered || 0;
    add('surrendered', 'Curses turned in to the Office', sur, sur >= A.surrendered ? 1 : 0);
    return rows;
  },
  /* What the Audit box tells you before the day: broad categories and a rough standing,
     built only from what the player can see (never the true nature of anything, and never
     the basement). mark: good | watch | bad. */
  hints(st) {
    const A = DATA.audit, rows = [];
    let pts = 0;
    const stock = st.inventory.stock;
    const open = stock.filter(it => it.appraisal && it.appraisal.alignment === 'cursed' && !it.sealed).length;
    const untested = stock.filter(it => !it.appraisal || !it.appraisal.alignment).length;
    pts += Math.max(A.basementMax, -open);
    rows.push({ id: 'case', label: 'The back case', mark: open ? 'bad' : untested ? 'watch' : 'good',
      text: open ? `${open} thing${open > 1 ? 's' : ''} tagged cursed and not sealed. They will not like that.`
        : untested ? `${untested} thing${untested > 1 ? 's' : ''} on the shelf untested. The inspectors test everything they find.`
        : 'Everything is tested, and anything tagged cursed is sealed. They test it all again anyway.' });
    const inc = st.counters.incidents || 0, out = st.counters.breakouts || 0;
    pts += Math.max(A.incidentsMax, -Math.floor(inc / A.incidentsPer)) + Math.max(A.breakoutMax, out * A.breakout);
    rows.push({ id: 'news', label: 'The evening news', mark: !inc && !out ? 'good' : inc >= 4 || out >= 2 ? 'bad' : 'watch',
      text: !inc && !out ? 'Nothing traced back to the shop. Keep it that way.'
        : `${inc ? `${inc} incident${inc > 1 ? 's' : ''} on the news` : ''}${inc && out ? ' and ' : ''}${out ? `${out} breakout${out > 1 ? 's' : ''}` : ''}. Every one is in their file.` });
    const hp = A.heat.find(([max]) => st.heat < max)[1];
    pts += hp;
    rows.push({ id: 'heat', label: 'Heat', mark: hp > 0 ? 'good' : hp === 0 ? 'watch' : 'bad',
      text: hp > 0 ? 'Low. That reads well on paper.' : hp === 0 ? 'Not low, not alarming. Lower would help.' : 'High. It will count against you.' });
    const ar = st.rent.arrears;
    pts += !ar ? 0 : ar > st.rent.amount ? A.rentDeep : A.rentShort;
    rows.push({ id: 'rent', label: 'The rent', mark: ar ? 'bad' : 'good',
      text: ar ? 'You owe back rent. They check the lease too.' : 'Paid up. The landlord has nothing to tell them.' });
    const off = st.rep.office, sur = st.counters.surrendered || 0;
    const op = (off >= A.officeGood ? 1 : off <= A.officeBad ? -1 : 0) + (sur >= A.surrendered ? 1 : 0);
    pts += op;
    rows.push({ id: 'office', label: 'Your record with the Office', mark: op > 0 ? 'good' : off <= A.officeBad ? 'bad' : 'watch',
      text: off <= A.officeBad ? 'Poor. They remember who made their job harder.'
        : op > 0 ? 'They know your name, in a good way.' : 'Ordinary. Clean inspections and curses turned in would help.' });
    const standing = pts >= 1 ? 'track' : pts >= -2 ? 'shaky' : 'trouble';
    return { rows, standing };
  },
  outcome(total) {
    const A = DATA.audit;
    return total >= A.cleared ? 'cleared' : total <= A.closed ? 'closed' : 'probation';
  },

  /* Who gets the epilogue, and whether this is the true ending. */
  ending(st, outcome) {
    const s = st.story;
    const anyMaxed = Object.keys(st.rep).some(f => Rep.maxed(st, f));
    const isTrue = !anyMaxed && !s.hidden && outcome !== 'closed'
      && s.pages.length >= DATA.pages.length && Story.nameRatio(st) >= 1;
    const fac = s.pledge && s.pledge !== 'self' ? s.pledge : 'self';
    return { kind: isTrue ? 'true' : 'faction', fac, maxed: fac !== 'self' && Rep.maxed(st, fac), coda: s.hidden || null };
  },
  fateShort(g) {
    if (!g.ending) return 'Unknown';
    if (g.ending.kind === 'true') return DATA.trueEnding.short;
    const F = DATA.fates[g.ending.fac];
    return g.ending.maxed ? F.short : 'Unknown';
  },

  /* The numbers pinned to the evidence board at the end of any run. */
  recap(st) {
    return {
      days: st.day - 1, sold: st.counters.sold || 0, bought: st.counters.bought || 0,
      captives: st.counters.captives || 0, surrendered: st.counters.surrendered || 0,
      incidents: st.counters.incidents || 0, runs: st.counters.runs || 0, cash: st.cash,
      pledge: st.story.pledge, rep: { ...st.rep }, pages: st.story.pages.length, ride: Ride.tier(st).name
    };
  },

  run(st) {
    const checks = Audit.checks(st);
    const total = checks.reduce((s, c) => s + c.pts, 0);
    const outcome = Audit.outcome(total);
    st.gameOver = { type: 'audit', day: st.day, checks, total, outcome, ending: Audit.ending(st, outcome), recap: Audit.recap(st) };
    Bests.record(st);
    log(st, `The Office of Anomalous Property audited the shop. ${DATA.outcomes[outcome].name}.`, 'warn');
  }
};
