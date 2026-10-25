'use strict';

/* ===================================================================== city
   Errand days. You start at the shop with state.ap.left hours. Travelling costs
   1 or 2 hours; most things you do cost an hour or two; buying costs nothing.
   state.city = { at, done:{key:day}, scouted:{zone:day}, market:{day, lots}, trips, carried, noFuel } */

/* ===================================================================== ride
   How you get around: state.ride = { id, tier }. Picked on the opening cards. */
const Ride = {
  def: st => DATA.rides[st.ride && st.ride.id] || DATA.rides.foot,
  tier: st => Ride.def(st).tiers[st.ride.tier] || Ride.def(st).tiers[0],
  next: st => Ride.def(st).tiers[st.ride.tier + 1] || null,
  tripsLeft(st) { const t = Ride.tier(st); return t.trips ? Math.max(0, t.trips - (st.city.trips || 0)) : Infinity; },
  carryLeft(st) { const t = Ride.tier(st); return t.carry ? Math.max(0, t.carry - (st.city.carried || 0)) : Infinity; },
  noFuel: st => !!Ride.tier(st).fuel && st.city.noFuel === st.day,
  /* Hours for a trip across town right now. Out of bus rides or out of gas, you walk. */
  far(st) {
    const t = Ride.tier(st);
    if (t.trips && Ride.tripsLeft(st) <= 0) return DATA.rides.foot.tiers[0].far;
    if (Ride.noFuel(st)) return DATA.rides.foot.tiers[0].far;
    return t.far;
  },
  bag: st => Ride.tier(st).bag || 0,
  /* Start of an errand day: reset the counters, pay for gas. Returns a note for the log, or ''. */
  startDay(st) {
    st.city.trips = 0; st.city.carried = 0;
    const t = Ride.tier(st);
    if (!t.fuel) return '';
    if (st.cash < t.fuel) { st.city.noFuel = st.day; return ` No money for gas, so the van stays parked: crossing town takes ${DATA.rides.foot.tiers[0].far} hours today.`; }
    st.cash -= t.fuel;
    if (t.heat) st.heat += t.heat;
    return ` Gas for the van: ${money(t.fuel)}.${t.heat ? ` Somebody at the Office clocked the plates. +${t.heat} Heat.` : ''}`;
  },
  upBlocker(st) {
    const n = Ride.next(st), at = City.loc(Ride.def(st).upgradeAt);
    if (!n) return 'Fully upgraded';
    if (!City.open(st)) return 'Only on errand days';
    if (st.city.at !== at.id) return `At ${at.name}`;
    if (st.cash < n.cost) return `Needs ${money(n.cost)}`;
    return null;
  },
  upgrade(st) {
    if (Ride.upBlocker(st)) return null;
    const old = Ride.tier(st), n = Ride.next(st);
    st.cash -= n.cost;
    st.ride.tier += 1;
    st.ap.max = City.maxHours(st);
    st.ap.left += (n.hours || 0) - (old.hours || 0);   // the extra hours start today
    log(st, `Traded up to a ${n.name.toLowerCase()} for ${money(n.cost)}.`, 'note');
    return n;
  }
};

const City = {
  loc: id => DATA.locations.find(l => l.id === id),
  district: id => DATA.districts.find(d => d.id === id),
  open: st => st.phase === 'errands',
  here: st => City.loc(st.city.at) || City.loc('shop'),
  maxHours: st => Math.min(DATA.config.apCap, DATA.config.apBase + (Ride.tier(st).hours || 0)),

  /* Hours to get from where you are to a location. */
  cost(st, id) {
    const a = City.here(st), b = City.loc(id), T = DATA.travel;
    if (!b || a.id === b.id) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y) <= T.near ? T.nearCost : Ride.far(st);
  },
  isFar(st, id) { const a = City.here(st), b = City.loc(id); return !!b && Math.hypot(a.x - b.x, a.y - b.y) > DATA.travel.near; },
  travelBlocker(st, id) {
    if (!City.open(st)) return st.phase === 'morning' ? 'Close for errands to head out' : 'Only on errand days';
    if (st.city.at === id) return 'You are here';
    if (st.ap.left < City.cost(st, id)) return 'Not enough hours left';
    return null;
  },
  go(st, id) {
    if (City.travelBlocker(st, id)) return 0;
    const c = City.cost(st, id);
    if (Ride.tier(st).trips && Ride.tripsLeft(st) > 0) st.city.trips = (st.city.trips || 0) + 1;   // a bus ride
    st.ap.left -= c;
    st.city.at = id;
    return c;
  },

  onceKey: (locId, actId) => `${locId}:${actId}`,
  usedUp(st, loc, actId) {
    const a = DATA.cityActions[actId], v = st.city.done[City.onceKey(loc.id, actId)];
    if (a.once === 'day') return v === st.day;
    if (a.once === 'rent') return v === st.rent.dueDay;
    return false;
  },
  /* Why an action cannot be done right now, or null. */
  blocker(st, locId, actId) {
    const loc = City.loc(locId), a = DATA.cityActions[actId];
    if (!City.open(st)) return 'Only on errand days';
    if (st.city.at !== locId) return 'Travel here first';
    if (City.usedUp(st, loc, actId)) return a.once === 'rent' ? 'Done this rent period' : 'Done today';
    if (st.ap.left < a.hours) return 'Not enough hours left';
    if (a.cost && st.cash < a.cost) return `Needs ${money(a.cost)}`;
    if (['deliver', 'surrender', 'fence'].includes(actId) && !st.inventory.stock.length) return 'The back case is empty';
    if (actId === 'study' && !Lab.openProjects(st).length) return 'Nothing to research';
    if (actId === 'readup' && !DATA.species.some(s => Combat.entry(st, s.id).seen && Combat.entry(st, s.id).research < 100)) return 'No cryptid to read up on';
    if (actId === 'landlord' && !st.rent.arrears && !st.rent.strikes) return 'You do not owe anything';
    if (actId === 'rest' && st.stress <= 0) return 'You feel fine';
    return null;
  },
  /* Actions that need you to pick something first (an item, a project, a cryptid). */
  needsPick: actId => ['deliver', 'surrender', 'fence', 'study', 'readup'].includes(actId),

  /* What a faction office would pay for an item, and whether they take it. */
  quote(st, loc, it) {
    const f = byId(DATA.factions, loc.faction);
    const c = { faction: f.id, traits: f.wants };
    const j = Shop.judge(c, it);
    if (j.fit === 'no') return { fit: 'no', why: j.why, pay: 0 };
    const cl = Shop.claim(it), est = Items.estimate(it);
    let fair;
    if (cl.anomaly) fair = est * cl.anomaly.valueMult * 1.2;
    else {
      const pool = Lab.known(st).filter(a => a.alignment === cl.alignment && a.traits.some(t => f.wants.includes(t)));
      fair = est * (pool.reduce((s, a) => s + a.valueMult, 0) / Math.max(1, pool.length)) * 0.6;
    }
    return { fit: j.fit, why: j.why, pay: Math.max(1, Math.min(it.price, roundPrice(fair))) };
  },
  fencePrice(st, it) {
    const ap = it.appraisal;
    const fair = ap ? Lab.suggest(st, it, { alignment: ap.alignment, anomalyId: ap.anomalyId }) : Items.estimate(it);
    return Math.max(1, Math.round(fair * DATA.cityActions.fence.rate));
  },

  /* Do something. Returns {toast, sfx, bad} or null. */
  act(st, locId, actId, arg) {
    if (City.blocker(st, locId, actId)) return null;
    const loc = City.loc(locId), a = DATA.cityActions[actId];
    let r = null;
    const takeStock = uid => {
      const i = st.inventory.stock.findIndex(x => x.uid === uid);
      return i < 0 ? null : st.inventory.stock.splice(i, 1)[0];
    };
    switch (actId) {
      case 'rest':
        st.stress = Math.max(0, st.stress - a.stress);
        log(st, 'Lay down for an hour with the curtains shut.', 'note');
        r = { toast: `−${a.stress} Stress`, sfx: 'morning' }; break;
      case 'landlord': {
        const off = Math.min(a.forgive, st.rent.arrears);
        st.rent.arrears -= off; st.rent.strikes = 0;
        log(st, `Talked the landlord down over coffee.${off ? ` He knocked ${money(off)} off what you owe.` : ''} The notice comes off the door.`, 'note');
        r = { toast: off ? `Forgave ${money(off)} · strikes cleared` : 'Strikes cleared', sfx: 'coins' }; break;
      }
      case 'deliver': {
        const it = st.inventory.stock.find(x => x.uid === arg);
        if (!it) return null;
        const q = City.quote(st, loc, it);
        if (q.fit === 'no') return null;
        takeStock(arg);
        const f = byId(DATA.factions, loc.faction), truth = anomalyOf(it), cl = Shop.claim(it);
        st.cash += q.pay; st.counters.sold += 1; st.heat += DATA.config.factionHeat;
        Endless.add(st, 'revenue', q.pay);
        let text, bad = false;
        if (cl.anomaly) {
          if (cl.anomaly.id === truth.id) { Rep.add(st, f.id, 6); st.counters.named = (st.counters.named || 0) + 1; text = `${f.name} tested the ${baseOf(it).name} on the spot. Exactly what you said. ${money(q.pay)}, +6 standing.`; }
          else { st.cash -= q.pay; Endless.add(st, 'revenue', -q.pay); Rep.add(st, f.id, -20); bad = true; text = `${f.name} tested the ${baseOf(it).name} on the spot. It is no ${cl.anomaly.name}. They kept it and paid nothing. −20 standing.`; }
        } else if (truth.traits.some(t => f.wants.includes(t))) { Rep.add(st, f.id, 3); text = `${f.name} took a chance on the unnamed ${baseOf(it).name}, and it paid off. ${money(q.pay)}, +3 standing.`; }
        else { Rep.add(st, f.id, -8); bad = true; text = `${f.name} took a chance on the unnamed ${baseOf(it).name} and it was not what they wanted. ${money(q.pay)}, −8 standing.`; }
        log(st, text, bad ? 'warn' : 'note');
        r = { toast: bad ? 'They were not happy' : `Delivered · ${money(q.pay)}`, bad, sfx: bad ? 'refuse' : saleSfx(q.pay), text }; break;
      }
      case 'job': {
        const f = loc.faction, J = DATA.jobs[f], rv = DATA.rivals[f];
        Rep.add(st, f, a.rep); st.cash += J.cash;
        if (J.heat) st.heat += J.heat;
        if (J.stress) st.stress += J.stress;
        if (f !== 'office') Story.addName(st, DATA.config.name.job);
        const fname = byId(DATA.factions, f).name;
        log(st, `${J.text} ${fname} paid ${money(J.cash)}.${rv ? ` ${byId(DATA.factions, rv).name} heard about it.` : ''}`, 'note');
        r = { toast: `+${a.rep} ${fname} · ${money(J.cash)}`, sfx: 'coins' }; break;
      }
      case 'calibrate':
        for (const k in st.cal) st.cal[k] = 100;
        log(st, 'The Faraday Circle recalibrated your instruments, humming the whole time.', 'note');
        r = { toast: 'Every instrument recalibrated', sfx: 'calibrate' }; break;
      case 'lawyers':
        st.cash -= a.cost; st.heat += a.heat;
        log(st, `Halberd & Vane sent the Office a letter on heavy paper. ${a.heat} Heat.`, 'note');
        r = { toast: `${a.heat} Heat`, sfx: 'stamp' }; break;
      case 'train': {
        const seen = DATA.species.filter(s => Combat.entry(st, s.id).seen);
        seen.forEach(s => Combat.research(st, s.id, a.research));
        log(st, `The Night Shift walked you through their case files on ${seen.length ? orList(seen.map(s => s.name)) : 'nothing you have met yet'}.`, 'note');
        r = { toast: seen.length ? `+${a.research}% research on ${seen.length} cryptid${seen.length > 1 ? 's' : ''}` : 'Nothing you have met yet', sfx: 'research' }; break;
      }
      case 'paperwork':
        st.heat += a.heat;
        log(st, `Filed three forms in triplicate at the Office of Anomalous Property. ${a.heat} Heat.`, 'note');
        r = { toast: `${a.heat} Heat`, sfx: 'stamp' }; break;
      case 'surrender': {
        const it = takeStock(arg);
        if (!it) return null;
        const cursed = anomalyOf(it).alignment === 'cursed';
        if (cursed) { st.heat += a.heat; st.cash += a.bounty; st.counters.surrendered = (st.counters.surrendered || 0) + 1; Story.addName(st, DATA.config.name.surrender); Endless.add(st, 'surrender'); }
        const text = cursed ? `Turned in the ${Items.name(it)}. The clerk went pale and stamped it twice. ${a.heat} Heat, ${money(a.bounty)} bounty.`
          : `Turned in the ${Items.name(it)}. The clerk tested it, shrugged, and kept it anyway.`;
        log(st, text, cursed ? 'note' : 'warn');
        r = { toast: cursed ? `${a.heat} Heat · ${money(a.bounty)}` : 'It was not cursed', bad: !cursed, sfx: cursed ? 'stamp' : 'refuse' }; break;
      }
      case 'browse':
        st.city.market = RNG.within(st, ['market', st.day], () => City.lots(st));
        log(st, 'Walked the Night Market stalls under the overpass.', 'note');
        r = { toast: 'Three lots on the tables', sfx: 'page' }; break;
      case 'fence': {
        const it = st.inventory.stock.find(x => x.uid === arg);
        if (!it) return null;
        const pay = City.fencePrice(st, it);
        takeStock(arg);
        st.cash += pay; st.heat += a.heat; st.counters.sold += 1;
        Story.addName(st, DATA.config.name.fence);
        Endless.add(st, 'revenue', pay);
        log(st, `Fenced the ${Items.name(it)} under the overpass for ${money(pay)}. +${a.heat} Heat.`, 'note');
        r = { toast: `Fenced · ${money(pay)}`, sfx: 'coins' }; break;
      }
      case 'study': {
        const msg = Lab.work(st, arg, a.mins, true);
        if (msg === null) return null;
        r = { toast: msg || 'An hour of reading', sfx: msg ? 'unlock' : 'research' };
        if (Story.library(st)) r = { toast: 'The librarian handed you a page', sfx: 'unlock' };
        break;
      }
      case 'readup': {
        const sp = Combat.byId(arg);
        if (!sp || !Combat.entry(st, arg).seen) return null;
        Combat.research(st, arg, a.research);
        log(st, `Read everything the library has on ${sp.name}.`, 'note');
        r = { toast: `+${a.research}% research`, sfx: 'research' };
        if (Story.library(st)) r = { toast: 'The librarian handed you a page', sfx: 'unlock' };
        break;
      }
      case 'scout':
        st.city.scouted[loc.zone] = st.day;
        log(st, `Scouted ${zoneOf(loc.zone).name} in daylight. Tonight you know where the hazards are.`, 'note');
        r = { toast: 'Hazards marked for tonight', sfx: 'page' }; break;
      default: return null;
    }
    st.ap.left -= a.hours;
    if (a.once) st.city.done[City.onceKey(locId, actId)] = a.once === 'rent' ? st.rent.dueDay : st.day;
    return r;
  },

  /* ----- buying ----- */
  buyBlocker(st, locId, id) {
    const it = DATA.shopItems[id], loc = City.loc(locId);
    if (!City.open(st)) return 'Only on errand days';
    if (st.city.at !== locId) return 'Travel here first';
    if (!loc.sells || !loc.sells.includes(id)) return 'Not sold here';
    if (Ride.carryLeft(st) <= 0) return 'Basket is full';
    if (st.cash < it.cost) return `Needs ${money(it.cost)}`;
    return null;
  },
  buy(st, locId, id) {
    if (City.buyBlocker(st, locId, id)) return null;
    const it = DATA.shopItems[id];
    st.cash -= it.cost;
    if (it.mat) st.supplies[it.mat] += it.qty;
    if (it.kit) st.kit[it.kit] += it.qty;
    st.city.carried = (st.city.carried || 0) + 1;
    return it;
  },

  /* ----- the Night Market ----- */
  lots(st) {
    const N = DATA.nightMarket, rng = rnd;
    return { day: st.day, lots: Array.from({ length: N.lots + (Endless.has(st, 'crowd') ? 1 : 0) }, () => {
      const item = Items.generate(st, { odds: N.odds });
      return { item, price: roundPrice(Items.estimate(item) * (N.price[0] + rng() * (N.price[1] - N.price[0]))), peeked: false };
    }) };
  },
  buyLot(st, i) {
    const m = st.city.market, lot = m && m.day === st.day && m.lots[i];
    if (!lot || !City.open(st) || st.city.at !== 'market' || st.cash < lot.price || Ride.carryLeft(st) <= 0) return null;
    st.cash -= lot.price;
    st.city.carried = (st.city.carried || 0) + 1;
    lot.item.source = { kind: 'bought', who: 'the Night Market', price: lot.price, day: st.day };
    st.inventory.loot.push(lot.item);
    Recap.find(st, lot.item, 'the Night Market');
    m.lots.splice(i, 1);
    log(st, `Bought ${an(Items.name(lot.item))} at the Night Market for ${money(lot.price)}.`, 'loot');
    return lot;
  },
  peekLot(st, i) {
    const m = st.city.market, lot = m && m.day === st.day && m.lots[i];
    if (!lot || lot.peeked || st.city.at !== 'market') return null;
    const it = lot.item, a = anomalyOf(it);
    it.revealed.emf = Lab.read('emf', Lab.truth(a, 'emf'), Lab.exactChance(st, it, 'emf'), rnd);
    it.tests.emf = 1;
    st.cal.emf = Math.max(0, st.cal.emf - Lab.wear(st, 'emf'));
    lot.peeked = true;
    return it.revealed.emf;
  }
};
