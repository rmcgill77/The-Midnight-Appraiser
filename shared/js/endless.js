'use strict';

/* ===================================================================== endless
   Endless mode only. state.endless = { score, by:{key:points}, rank, newRank,
   commission:{fac, anomalyId, due, pay, day} | null, lastCommission,
   estate:{day, items, price} | null, lastEstate }.
   Escalation: rent climbs after every rent day; every 14 days the Office's attention
   rises a level, cooling Heat more slowly (eventually it creeps up) and sending the
   inspector at lower Heat. */
const Endless = {
  on: st => st.mode === 'endless',
  E: () => DATA.endless,

  /* ----- escalation ----- */
  attention: st => Endless.on(st) ? Math.floor((st.day - 1) / DATA.endless.attentionEvery) : 0,
  heatDecay(st) {
    const base = Calendar.diff(st).heatDecay;
    if (!Endless.on(st)) return base;
    const A = DATA.endless.attention;
    return Math.max(A.minDecay, base - Endless.attention(st) * A.decayLoss) + (Endless.has(st, 'legend') ? 1 : 0);
  },
  inspectorHeat(st) {
    const c = DATA.config.inspectorHeat;
    if (!Endless.on(st)) return c;
    const A = DATA.endless.attention;
    return Math.max(A.minInspector, c - Endless.attention(st) * A.inspectorDrop);
  },
  nextRent(st) { return Math.min(DATA.endless.rentCap, st.rent.amount + DATA.endless.rentStep); },
  raiseRent(st) {
    if (!Endless.on(st) || st.rent.amount >= DATA.endless.rentCap) return;
    st.rent.amount = Endless.nextRent(st);
    log(st, `The landlord slid a new lease under the door. Rent is ${money(st.rent.amount)} from now on.`, 'warn');
  },

  /* ----- score and rank ----- */
  score: st => Math.floor(st.endless.score),
  rankOf: score => DATA.endless.ranks.reduce((r, R, i) => score >= R.at ? i : r, 0),
  rank: st => DATA.endless.ranks[st.endless.rank] || DATA.endless.ranks[0],
  nextRank: st => DATA.endless.ranks[st.endless.rank + 1] || null,
  has: (st, unlock) => Endless.on(st) && DATA.endless.ranks.slice(0, st.endless.rank + 1).some(r => r.unlock === unlock || (r.unlocks || []).includes(unlock)),
  add(st, key, n = 1) {
    if (!Endless.on(st) || st.gameOver || !n) return;
    const pts = DATA.endless.score[key] * n;
    st.endless.score = Math.max(0, st.endless.score + pts);
    st.endless.by[key] = (st.endless.by[key] || 0) + pts;
    const r = Endless.rankOf(Endless.score(st));
    if (r > st.endless.rank) {
      st.endless.rank = r; st.endless.newRank = r;
      const R = DATA.endless.ranks[r];
      log(st, `The shop made a new rank: ${R.name}. ${R.perk}`, 'loot');
    }
  },

  /* ----- each morning ----- */
  morning(st) {
    if (!Endless.on(st)) return;
    const E = st.endless, C = DATA.endless.commission, S = DATA.endless.estate;
    if (E.commission && st.day > E.commission.due) {
      const f = byId(DATA.factions, E.commission.fac);
      Rep.add(st, f.id, C.fail);
      log(st, `${f.name} gave up waiting for their ${byId(DATA.anomalies, E.commission.anomalyId).name}. ${C.fail} standing.`, 'warn');
      E.commission = null; E.lastCommission = st.day;
    }
    if (!E.commission && Endless.has(st, 'commissions') && st.day >= E.lastCommission + C.every) RNG.within(st, ['commission', st.day], () => Endless.postCommission(st));
    if (E.estate && E.estate.day < st.day) { E.lastEstate = E.estate.day; E.estate = null; }
    if (!E.estate && Endless.has(st, 'estates') && st.day >= E.lastEstate + S.every) RNG.within(st, ['estate', st.day], () => Endless.offerEstate(st));
  },

  /* ----- commissions ----- */
  postCommission(st) {
    const C = DATA.endless.commission, known = Lab.known(st).filter(a => a.alignment !== 'inert');
    const pairs = DATA.factions.filter(f => f.id !== 'civilian' && st.rep[f.id] > -40)
      .flatMap(f => known.filter(a => a.buyers.includes(f.id)).map(a => [f, a]));
    if (!pairs.length) return null;
    const [f, a] = pick(rnd, pairs);
    const pay = roundPrice(C.base * a.valueMult * C.payMult * (1 + Math.max(0, st.rep[f.id]) / 100));
    st.endless.commission = { fac: f.id, anomalyId: a.id, due: st.day + C.days, pay, day: st.day };
    log(st, `${f.name} posted a commission: one ${a.name}, tagged by name, within ${C.days} days. ${money(pay)}.`, 'note');
    return st.endless.commission;
  },
  /* Stock tagged with the commissioned anomaly's name. */
  candidates(st) {
    const c = st.endless.commission;
    return c ? st.inventory.stock.filter(it => it.appraisal && it.appraisal.anomalyId === c.anomalyId) : [];
  },
  fulfil(st, uid) {
    const c = st.endless.commission, C = DATA.endless.commission;
    const it = c && Endless.candidates(st).find(x => x.uid === uid);
    if (!it) return null;
    st.inventory.stock = st.inventory.stock.filter(x => x !== it);
    const f = byId(DATA.factions, c.fac), a = byId(DATA.anomalies, c.anomalyId), right = anomalyOf(it).id === c.anomalyId;
    if (right) {
      st.cash += c.pay; Rep.add(st, f.id, C.rep);
      st.counters.commissions = (st.counters.commissions || 0) + 1; st.counters.named = (st.counters.named || 0) + 1;
      Endless.add(st, 'revenue', c.pay); Endless.add(st, 'commission');
      log(st, `${f.name} collected the ${a.name} and paid the commission: ${money(c.pay)}.`, 'note');
    } else {
      Rep.add(st, f.id, C.wrong);
      log(st, `${f.name} tested the ${baseOf(it).name} on the spot. It is no ${a.name}. They kept it, paid nothing, and will remember. ${C.wrong} standing.`, 'warn');
    }
    st.endless.commission = null; st.endless.lastCommission = st.day;
    return { right, pay: c.pay, fac: f.name };
  },

  /* ----- estate sales ----- */
  offerEstate(st) {
    const S = DATA.endless.estate;
    const items = Array.from({ length: S.items }, () => Items.generate(st, {}));
    const est = items.reduce((s, it) => s + Items.estimate(it), 0);
    const price = roundPrice(est * (S.price[0] + rnd() * (S.price[1] - S.price[0])));
    st.endless.estate = { day: st.day, items, price, who: pick(rnd, DATA.estateNames) };
    return st.endless.estate;
  },
  buyEstate(st) {
    const e = st.endless.estate;
    if (!e || e.day !== st.day || st.cash < e.price || st.phase === 'night') return null;
    st.cash -= e.price;
    e.items.forEach(it => { it.source = { kind: 'bought', who: e.who, price: Math.round(e.price / e.items.length), day: st.day }; st.inventory.loot.push(it); Recap.find(st, it, `${e.who}’s estate`); });
    Endless.add(st, 'estate');
    log(st, `Bought the whole box from ${e.who} for ${money(e.price)}. ${e.items.length} things are waiting in the lab.`, 'loot');
    st.endless.estate = null; st.endless.lastEstate = st.day;
    return e;
  },
  passEstate(st) {
    if (!st.endless.estate) return;
    st.endless.lastEstate = st.endless.estate.day; st.endless.estate = null;
  },

  /* ----- the end ----- */
  retire(st) {
    if (!Endless.on(st) || st.gameOver || st.run) return false;
    st.gameOver = { type: 'retired', day: st.day, recap: Audit.recap(st) };
    log(st, 'You turned the sign to CLOSED for the last time.', 'note');
    Bests.record(st);
    return true;
  }
};

/* ===================================================================== bests
   Kept across runs in their own localStorage key: Endless records, and every campaign
   ending you have reached. */
const Bests = {
  KEY: 'ssp.bests.v1',
  blank: () => ({ endless: { score: 0, days: 0, rank: 0, cash: 0, seed: null }, endings: [], daily: {} }),
  read() {
    try {
      const d = JSON.parse(localStorage.getItem(Bests.KEY) || '{}'), b = Bests.blank();
      return { endless: { ...b.endless, ...(d.endless || {}) }, endings: Array.isArray(d.endings) ? d.endings : [], daily: d.daily && typeof d.daily === 'object' ? d.daily : {} };
    } catch (e) { return Bests.blank(); }
  },
  write(b) { try { localStorage.setItem(Bests.KEY, JSON.stringify(b)); } catch (e) {} },
  endingKey: g => !g.ending ? null : g.ending.kind === 'true' ? 'true' : `${g.ending.fac}:${g.outcome}`,
  /* Called once when a run ends. Marks what was beaten on st.gameOver.best. */
  record(st) {
    const g = st.gameOver, b = Bests.read(), best = {};
    if (!g || g.recorded) return best;
    if (st.modded) { g.best = best; g.recorded = true; g.modded = true; return best; }   // god mode: never recorded
    if (st.daily) {            // 12e: the Daily run keeps its own best for each date, apart from Endless records
      const r = g.recap, score = Endless.score(st), D = b.daily[st.daily] || { score: 0, days: 0, rank: 0 };
      g.score = score; g.rank = st.endless.rank;
      if (score > D.score) { Object.assign(D, { score, days: r.days, rank: st.endless.rank }); best.score = true; }
      b.daily[st.daily] = D;
      const dates = Object.keys(b.daily).sort();   // keep the last 60 days
      while (dates.length > 60) delete b.daily[dates.shift()];
    } else if (Endless.on(st)) {
      const r = g.recap, score = Endless.score(st);
      g.score = score; g.rank = st.endless.rank;
      const E = b.endless;
      if (score > E.score) { E.score = score; E.seed = st.seedKind === 'code' ? RNG.code(st.seed) : null; best.score = true; }
      if (r.days > E.days) { E.days = r.days; best.days = true; }
      if (st.endless.rank > E.rank) { E.rank = st.endless.rank; best.rank = true; }
      if (r.cash > E.cash) { E.cash = r.cash; best.cash = true; }
    } else if (g.type === 'audit') {
      const k = Bests.endingKey(g);
      if (k && !b.endings.includes(k)) { b.endings.push(k); best.ending = true; }
    }
    g.best = best; g.recorded = true;
    Bests.write(b);
    return best;
  }
};
