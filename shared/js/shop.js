'use strict';

/* ===================================================================== shop rules
   Customers only ever see the tag (appraisal). The hidden truth is
   checked at closing time, when the evening news comes in. */
const Shop = {
  claim(it) {
    const ap = it.appraisal;
    return { alignment: ap ? ap.alignment : null, anomaly: ap && ap.anomalyId ? byId(DATA.anomalies, ap.anomalyId) : null };
  },
  claimText(it) {
    const { alignment, anomaly } = Shop.claim(it);
    return !alignment ? 'Untested' : anomaly ? anomaly.name : cap(alignment);
  },

  /* How a customer reads a tag: fit (yes | gamble | no), price multiplier on budget, reason. */
  judge(c, it) {
    const { alignment, anomaly } = Shop.claim(it);
    if (c.faction === 'civilian') {
      if (alignment === 'cursed') return { fit: 'no', mult: 0, why: 'Tagged cursed. Not a chance' };
      let mult, why;
      if (!alignment) { mult = 0.8; why = 'Sold as-is'; }
      else if (alignment === 'inert') { mult = 1; why = 'Tagged safe'; }
      else if (anomaly && anomaly.traits.includes('memory')) { mult = 1.3; why = 'Loves a keepsake'; }
      else if (anomaly) { mult = 0.7; why = 'Nervous about magic'; }
      else { mult = 0.85; why = 'Curious about it'; }
      if (c.category) {
        if (baseOf(it).category === c.category) { mult *= 1.25; why += ' · what they asked for'; }
        else mult *= 0.8;
      }
      return { fit: 'yes', mult, why };
    }
    const W = c.traits || [];
    if (anomaly) {
      return anomaly.traits.some(t => W.includes(t))
        ? { fit: 'yes', mult: 1, why: 'Named on the tag' }
        : { fit: 'no', mult: 0, why: `${anomaly.name} is not what they want` };
    }
    if (alignment && alignment !== 'inert' && DATA.anomalies.some(a => a.alignment === alignment && a.traits.some(t => W.includes(t))))
      return { fit: 'gamble', mult: 0.45, why: 'No name on the tag, so they want a discount' };
    return { fit: 'no', mult: 0, why: !alignment ? 'Untested. Factions will not touch it' : alignment === 'inert' ? 'Tagged inert' : `No ${alignment} anomaly has that trait` };
  },

  offer(c, it) {
    const j = Shop.judge(c, it);
    if (j.fit === 'no') return { result: 'refuse', say: j.why + '.' };
    const max = c.budget * j.mult;
    if (it.price <= max) return { result: 'deal', amount: it.price, fit: j.fit };
    if (it.price <= max * 1.3) return { result: 'counter', amount: roundPrice(max), fit: j.fit };
    return { result: 'refuse', say: pick(rnd, DATA.tooRich) };
  },

  /* Who comes in, and from which faction. Blacklisted factions stay away. */
  pickPerson(st, pool, civWeight = 6) {
    const rng = rnd;
    const facs = DATA.factions.filter(f => f.id === 'civilian' || st.rep[f.id] > -40);
    const f = weighted(rng, facs.map(x => [x, x.id === 'civilian' ? civWeight : Math.max(0.4, 2 + st.rep[x.id] / 15)]));
    const people = pool && f.id === 'civilian' ? f.people.concat(pool) : f.people;
    const seen = st.shop.seen || (st.shop.seen = []);
    const fresh = people.filter(n => !seen.includes(n));
    const name = pick(rng, fresh.length ? fresh : people);
    seen.push(name);
    return { f, name };
  },

  makeCustomer(st) {
    const rng = rnd;
    const { f, name } = Shop.pickPerson(st);
    const c = { id: ++st.counters.customer, kind: 'buy', faction: f.id, name, refusals: 0 };
    if (f.id === 'civilian') {
      c.category = rng() < 0.6 ? pick(rng, Object.keys(DATA.civLines).filter(k => k !== 'any')) : null;
      c.line = pick(rng, DATA.civLines[c.category || 'any']);
    } else {
      c.traits = f.wants.slice().sort(() => rng() - 0.5).slice(0, rng() < 0.35 ? 2 : 1);
      c.line = (f.lines && f.lines[c.traits[0]]) || DATA.traitLines[c.traits[0]];
    }
    // Most customers can afford something already on the shelf; the rest arrive with their own idea of price.
    const fits = st.inventory.stock.map(it => [it, Shop.judge(c, it)]).filter(([, j]) => j.fit !== 'no');
    let budget;
    if (fits.length && rng() < 0.6) {
      const [it, j] = pick(rng, fits);
      budget = it.price / j.mult * (0.95 + rng() * 0.45);
    } else if (f.id === 'civilian') budget = 18 + rng() * 60;
    else {
      const pool = DATA.anomalies.filter(a => a.traits.some(t => c.traits.includes(t)));
      budget = 34 * (pool.reduce((s, a) => s + a.valueMult, 0) / pool.length) * (0.85 + rng() * 0.6);
    }
    if (f.id !== 'civilian') budget *= 1 + st.rep[f.id] / 100;
    c.budget = roundPrice(budget);
    return c;
  },

  /* A seller with something to haggle over. */
  makeSeller(st) {
    const rng = rnd, B = DATA.barter;
    const mood = weighted(rng, Object.entries(B.moods).map(([k, m]) => [k, m.weight]));
    const M = B.moods[mood];
    const { f, name } = Shop.pickPerson(st, DATA.sellerNames, 12);
    const it = Items.generate(st, { odds: M.odds });
    let floor = Items.estimate(it) * (M.floor[0] + rng() * (M.floor[1] - M.floor[0]));
    if (M.knows) floor *= Math.sqrt(anomalyOf(it).valueMult);   // shrewd sellers price in the magic
    floor = Math.max(3, roundPrice(floor));
    const ask = Math.max(floor + 1, roundPrice(floor * (M.ask[0] + rng() * (M.ask[1] - M.ask[0]))));
    return { id: ++st.counters.customer, kind: 'sell', faction: f.id, name, mood, line: pick(rng, M.lines), item: it,
      floor, ask, ask0: ask, patience: M.patience, maxPatience: M.patience, offer: roundPrice(ask * 0.6), peeked: false, say: null };
  },

  /* Someone who wants an object identified. They leave it and come back at closing. */
  makeAppraiser(st) {
    const rng = rnd, A = DATA.appraisal;
    const { f, name } = Shop.pickPerson(st, null, 7);
    const it = Items.generate(st, {});
    const civ = f.id === 'civilian', [lo, hi] = A.fee[civ ? 'civilian' : 'faction'];
    let fee = lo + rng() * (hi - lo);
    if (!civ) fee *= 1 + st.rep[f.id] / 100;
    return { id: ++st.counters.customer, kind: 'appraise', faction: f.id, name, item: it, fee: Math.max(5, roundPrice(fee)),
      line: fill(pick(rng, civ ? A.civLines : A.facLines), { item: baseOf(it).name }) };
  },

  /* Haggling. Returns {result: deal | counter | leave, price?, say}. */
  barter(c, offer) {
    const B = DATA.barter;
    offer = Math.max(1, Math.min(Math.round(offer), c.ask));
    if (offer >= c.floor) return { result: 'deal', price: offer, say: pick(rnd, B.say.deal) };
    const gap = (c.floor - offer) / c.floor;
    c.patience -= offer < c.floor * B.insult ? 2 : 1;
    if (c.patience <= 0) return { result: 'leave', say: pick(rnd, B.say.leave) };
    c.ask = Math.max(c.floor, roundPrice(c.ask - (c.ask - offer) * B.counterStep));
    const band = gap <= B.close ? 'close' : gap <= B.warm ? 'warm' : 'cold';
    return { result: 'counter', band, say: pick(rnd, B.say[band]) };
  },

  /* Plan the day's queue: how many come in, and what each one wants. */
  planDay(st) {
    const c = DATA.config, rng = rnd;
    const crowd = Endless.has(st, 'crowd') ? 1 : 0;
    const total = Math.max(1, clamp(c.customersBase + crowd + Math.floor((st.day - 1) / c.customersEvery), c.customersBase + crowd, c.customersMax + crowd) - Calendar.customerPenalty(st));
    const w = { ...c.kindWeights };
    if (!st.inventory.stock.length) w.buy = Math.round(w.buy / 2);   // word gets around when the case is empty
    const queue = Array.from({ length: total }, () => weighted(rng, Object.entries(w)));
    // a good record with the Office means fewer surprise visits
    if (st.heat >= Endless.inspectorHeat(st) && rng() < clamp(0.5 - st.rep.office / 100, 0.2, 0.7)) queue[0] = 'inspector';
    return queue;
  },

  /* Called from Game.rules after every change: open a new day, call the next customer. */
  tick(st) {
    if (st.phase !== 'day' || st.gameOver) return;
    if (st.shop.day !== st.day) {
      const queue = RNG.within(st, ['queue', st.day], () => Shop.planDay(st));
      st.shop = { day: st.day, total: queue.length, queue, served: 0, current: null, sales: [], bought: [], jobs: [], pending: null, say: null, seen: [] };
    }
    const s = st.shop;
    if (s.current && s.pending && !st.inventory.stock.some(x => x.uid === s.pending.uid)) s.pending = null;
    if (s.current || s.served >= s.total) return;
    const kind = (s.queue && s.queue[s.served]) || 'buy';
    if (kind === 'inspector') {
      s.current = { id: ++st.counters.customer, kind: 'inspector', faction: 'inspector', name: 'Inspector Vance',
        line: 'Municipal Office of Anomalous Property. Routine look at your back case. You don’t mind.', bribe: 40 + st.heat };
      return;
    }
    s.current = RNG.within(st, ['customer', st.day, s.served], () => kind === 'sell' ? Shop.makeSeller(st) : kind === 'appraise' ? Shop.makeAppraiser(st) : Shop.makeCustomer(st));
  },

  /* Buy what a seller brought in. It goes to the lab like any find. */
  buyFrom(st, c, price) {
    const it = c.item;
    st.cash -= price;
    it.source = { kind: 'bought', who: c.name, price, day: st.day };
    st.inventory.loot.push(it);
    st.shop.bought.push({ who: c.name, item: Items.name(it), price, est: Items.estimate(it) });
    Recap.find(st, it, `bought from ${c.name}`);
    st.counters.bought = (st.counters.bought || 0) + 1;
    if (c.ask0 && price <= c.ask0 * 0.5) st.counters.haggled = (st.counters.haggled || 0) + 1;
    log(st, `Bought ${an(Items.name(it))} from ${c.name} for ${money(price)}. It is waiting in the lab.`, 'loot');
    Shop.leave(st);
  },

  /* Take an appraisal job: the object goes to the evidence bin until closing. */
  takeJob(st, c) {
    const it = c.item;
    it.job = { who: c.name, faction: c.faction, fee: c.fee, day: st.day, report: null };
    st.inventory.loot.push(it);
    log(st, `Took in ${c.name}’s ${baseOf(it).name} to appraise for ${money(c.fee)}. They will be back at closing.`, 'loot');
    Shop.leave(st);
  },
  jobPay(job) {
    const P = DATA.appraisal.pay;
    return { named: Math.round(job.fee * P.named), right: Math.round(job.fee * P.right), wrong: Math.round(job.fee * P.wrong) };
  },
  /* File the report: the object leaves the bench and waits for pickup. */
  fileReport(st, uid) {
    const f = Items.find(st, uid);
    if (!f || f.list !== 'loot' || !f.item.job || !f.item.draft || !f.item.draft.alignment) return null;
    const it = f.item;
    it.job.report = { alignment: it.draft.alignment, anomalyId: it.draft.anomalyId || null };
    st.inventory.loot.splice(f.index, 1);
    st.shop.jobs = st.shop.jobs || [];
    st.shop.jobs.push(it);
    if (st.ui.bench === uid) st.ui.bench = null;
    log(st, `Filed the appraisal on ${it.job.who}’s ${baseOf(it).name}.`, 'note');
    return it;
  },
  /* Closing time: customers pick up their objects and pay for the reports. r is the day report, or null. */
  settleJobs(st, r) {
    const fees = Shop.payFiled(st, r);
    Shop.takeBackOpen(st, r, () => true);
    if (r) r.fees = fees;
    return fees;
  },
  /* Pay for the filed reports (st.shop.jobs) and send those customers home. Returns the fees. */
  payFiled(st, r) {
    const R = DATA.appraisal.rep;
    const repD = (fac, d) => { if (fac === 'civilian' || !d) return; Rep.add(st, fac, d, r ? r.rep : null); };
    let fees = 0;
    const done = (st.shop.jobs || []).length;
    for (const it of st.shop.jobs || []) {
      const j = it.job, rp = j.report, truth = anomalyOf(it), pay = Shop.jobPay(j);
      const right = rp.alignment === truth.alignment && (!rp.anomalyId || rp.anomalyId === truth.id);
      const said = cap(rp.alignment) + (rp.anomalyId ? ` · ${byId(DATA.anomalies, rp.anomalyId).name}` : '');
      const amount = right ? (rp.anomalyId ? pay.named : pay.right) : pay.wrong;
      fees += amount; st.cash += amount;
      repD(j.faction, right ? (rp.anomalyId ? R.named : 0) : R.wrong);
      if (right && j.faction === 'civilian') Story.addName(st, DATA.config.name.civAppraisal);
      if (right) { Endless.add(st, 'appraisal'); st.counters.appraisalsRight = (st.counters.appraisalsRight || 0) + 1; }
      Endless.add(st, 'revenue', amount);
      if (r) r.items.push(right
        ? { kind: 'ok', text: `${j.who} picked up the ${baseOf(it).name}. You called it ${said}, and you were right.`, tag: `${money(amount)}${rp.anomalyId ? ' · named' : ''}` }
        : { kind: 'bad', text: `${j.who} picked up the ${baseOf(it).name}. You called it ${said}. They had it checked across town: it is ${truth.alignment}${Lab.isKnown(st, truth) ? `: ${truth.name}` : ''}.`, tag: `Only ${money(amount)}` });
    }
    st.shop.jobs = [];
    st.counters.appraisals = (st.counters.appraisals || 0) + done;
    return fees;
  },
  /* Owners come back for objects whose report was never filed: they take them back unpaid. `which(it)`
     picks the jobs (all of them at closing time; only the overdue ones in the continuous day). */
  takeBackOpen(st, r, which) {
    const R = DATA.appraisal.rep;
    const repD = (fac, d) => { if (fac === 'civilian' || !d) return; Rep.add(st, fac, d, r ? r.rep : null); };
    const open = st.inventory.loot.filter(x => x.job && which(x));
    for (const it of open) {
      repD(it.job.faction, R.unfinished);
      if (r) r.items.push({ kind: 'bad', text: `${it.job.who} came back for the ${baseOf(it).name}. The report was not done, so they took it back unpaid.`, tag: 'No fee' });
    }
    if (open.length) {
      st.inventory.loot = st.inventory.loot.filter(x => !open.includes(x));
      if (st.ui.bench && !st.inventory.loot.some(x => x.uid === st.ui.bench)) st.ui.bench = null;
    }
    return open.length;
  },

  leave(st) {
    st.shop.current = null; st.shop.pending = null; st.shop.say = null;
    st.shop.served += 1;
  },

  sell(st, c, it, price, fit) {
    const f = Items.find(st, it.uid);
    if (!f || f.list !== 'stock') return;
    st.inventory.stock.splice(f.index, 1);
    st.cash += price;
    const cl = Shop.claim(it);
    st.shop.sales.push({ item: Items.name(it), base: baseOf(it).name, truthId: it.hidden.anomalyId,
      claimAlignment: cl.alignment, claimId: cl.anomaly ? cl.anomaly.id : null,
      faction: c.faction, who: c.name, traits: c.traits || null, price, fit, sealed: !!it.sealed, est: Items.estimate(it) });
    st.counters.sold += 1;
    st.counters.bestSale = Math.max(st.counters.bestSale || 0, price);
    Endless.add(st, 'revenue', price);
    if (c.faction !== 'civilian') st.heat += DATA.config.factionHeat;
    log(st, `Sold the ${Items.name(it)} to ${c.name} for ${money(price)}.`, 'note');
    Shop.leave(st);
  },

  /* Closing time: every sale is checked against the hidden truth. */
  resolveDay(st) {
    const sales = st.shop.sales;
    const r = { day: st.day, sold: sales.length, revenue: sales.reduce((s, x) => s + x.price, 0), refunds: 0, heat: 0, rep: {}, items: [] };
    const heat0 = st.heat;
    const rep = (fac, d) => Rep.add(st, fac, d, r.rep), N = DATA.config.name;
    for (const s of sales) {
      const truth = byId(DATA.anomalies, s.truthId);
      const fac = byId(DATA.factions, s.faction);
      const vars = { item: s.base, place: pick(rnd, DATA.places) };
      s.factionName = fac ? fac.name : s.who; s.result = 'ok';
      if (s.faction === 'civilian') {
        if (truth.alignment === 'cursed') {
          // a jar slows it down: the curse still gets out, but later and smaller
          const h = Math.round((10 + 6 * truth.danger) * (s.sealed ? 0.5 : 1));
          st.heat += h; st.counters.incidents += 1; s.result = 'incident'; s.heat = h;
          Story.addName(st, N.incident);
          Endless.add(st, 'incident');
          const text = fill(pick(rnd, DATA.incidents[truth.id]), vars);
          r.items.push({ kind: 'bad', text, tag: `+${h} Heat`, news: true });
          log(st, text, 'news');
        } else if (truth.alignment === 'enchanted' && s.claimAlignment !== 'enchanted') {
          Story.addName(st, N.civSale); s.result = 'undersold';
          r.items.push({ kind: 'odd', text: fill(pick(rnd, DATA.luckyNews), vars), tag: 'Undersold' });
        } else {
          Story.addName(st, N.civSale);
          r.items.push({ kind: 'ok', text: `${s.who} went home happy with the ${s.base}.`, tag: money(s.price) });
        }
      } else if (s.claimId) {
        if (s.claimId === truth.id) {
          const bonus = s.sealed && truth.alignment === 'cursed' ? 2 : 0;
          Endless.add(st, 'named'); st.counters.named = (st.counters.named || 0) + 1;
          rep(s.faction, 6 + bonus);
          r.items.push({ kind: 'ok', text: `${fac.name} confirmed the ${s.base} is exactly what you said.${bonus ? ' They noticed it came sealed.' : ''}`, tag: `+${6 + bonus} rep` });
        } else {
          const said = byId(DATA.anomalies, s.claimId).name;
          st.cash -= s.price; r.refunds += s.price; rep(s.faction, -20); s.result = 'refund'; s.refund = s.price;
          Endless.add(st, 'revenue', -s.price);
          const text = `${fac.name} tested the ${s.base}. It is no ${said}. They took back ${money(s.price)} and will remember this.`;
          r.items.push({ kind: 'bad', text, tag: 'Refund · −20 rep' });
          log(st, text, 'warn');
        }
      } else if (s.traits.some(t => truth.traits.includes(t))) {
        rep(s.faction, 3);
        r.items.push({ kind: 'ok', text: `${fac.name} took a gamble on the unnamed ${s.base}, and it paid off.`, tag: '+3 rep' });
      } else {
        rep(s.faction, -8); s.result = 'lost';
        r.items.push({ kind: 'bad', text: `${fac.name} took a gamble on the unnamed ${s.base} and lost. No refund, but they are sour about it.`, tag: '−8 rep' });
      }
    }
    for (const b of st.shop.bought || []) r.items.push({ kind: 'odd', text: `Bought ${an(b.item)} from ${b.who}. It is in the lab.`, tag: `−${money(b.price)}` });
    r.spent = (st.shop.bought || []).reduce((s, b) => s + b.price, 0);
    Shop.settleJobs(st, r);
    r.heat = st.heat - heat0;
    if (!r.items.length) r.items.push({ kind: 'odd', text: 'Nothing sold today. The news had nothing on you, at least.', tag: '' });
    st.report = r;
  }
};
