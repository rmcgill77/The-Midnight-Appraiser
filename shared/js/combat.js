'use strict';

/* ===================================================================== combat
   When a cryptid reaches you, a fight starts. Each round it shows what it is about to
   do (clearly, once you have researched it), you act, then it does it.
   Your options: Scan (research), attack with an instrument, Brace, Capture (needs a
   jar and a free cell), Flee, or Offer it a find. run.encounter holds the fight. */
const Combat = {
  speciesOf: zoneId => DATA.species.find(s => s.zone === zoneId),
  byId: id => DATA.species.find(s => s.id === id),
  /* The species of one cryptid on the map (older saves have no sid: the zone's first). */
  of: (c, zoneId) => (c && Combat.byId(c.sid)) || Combat.speciesOf(zoneId),
  danger: sp => zoneOf(sp.zone).danger,
  entry(st, sid) {
    st.bestiary = st.bestiary || {};
    return st.bestiary[sid] || (st.bestiary[sid] = { seen: false, research: 0, weak: false, resist: false, banished: 0, captured: 0 });
  },
  knows: (st, sid, tier) => Combat.entry(st, sid).research >= DATA.combat.tiers[tier],
  knowsWeak: (st, sid) => Combat.entry(st, sid).weak || Combat.knows(st, sid, 'weak'),
  knowsResist: (st, sid) => Combat.entry(st, sid).resist || Combat.knows(st, sid, 'telegraph'),

  /* A cryptid has reached you. */
  start(st, run, c) {
    const sp = Combat.of(c, run.zoneId), C = DATA.combat.contact, z = zoneOf(run.zoneId);
    const hit = C.base + C.perDanger * z.danger;
    Combat.entry(st, sp.id).seen = true;
    run.encounter = { cid: c.id, sid: sp.id, presence: sp.presence, max: sp.presence, turn: 1, restrained: 0, hit, next: null, log: [] };
    Combat.pickNext(run.encounter, sp);
    Crawl.addStress(st, hit);
    Combat.say(run, `${sp.name}! ${sp.text} +${hit} Stress.`);
  },
  say(run, text) {
    const f = run.encounter;
    if (f) { f.log.unshift(text); f.log.length = Math.min(f.log.length, 3); }
    Crawl.say(run, text);
  },
  pickNext(f, sp) {
    const opts = sp.moves.filter(m => !(m.heal && f.presence >= f.max));
    f.next = weighted(rnd, opts.map(m => [m.id, m.weight]));
  },
  move: (sp, id) => sp.moves.find(m => m.id === id),
  research(st, sid, n) {
    const e = Combat.entry(st, sid);
    e.research = Math.min(100, e.research + n);
  },

  /* What one attack would do (for buttons and for the sim). */
  attackInfo(st, sid, tool) {
    const A = DATA.combat.attacks[tool], D = DATA.combat.damage, sp = Combat.byId(sid);
    const lv = st.upgrades[tool] || 1;
    const mult = tool === sp.weak ? D.weak : tool === sp.resist ? D.resist : 1;
    let block = null;
    if (A.battery && st.battery < A.battery) block = 'Not enough light';
    if (A.salt && st.supplies.salt < A.salt) block = 'No salt';
    return { dmg: Math.round((D.base + D.perLevel * (lv - 1)) * mult), mult, block,
      known: mult === D.weak ? Combat.knowsWeak(st, sid) : mult === D.resist ? Combat.knowsResist(st, sid) : Combat.knowsWeak(st, sid) && Combat.knowsResist(st, sid) };
  },
  captureChance(st, f) {
    const K = DATA.combat.capture, sp = Combat.byId(f.sid), e = Combat.entry(st, f.sid), T = DATA.combat.tiers;
    const bonus = e.research >= T.full ? K.full : e.research >= T.steady ? K.steady : 0;
    return clamp(K.base + K.wounded * (1 - f.presence / f.max) + bonus - K.perDanger * Combat.danger(sp), 0.05, 0.95);
  },
  fleeChance(st, f) {
    const F = DATA.combat.flee;
    return f.restrained ? 0 : clamp(F.base + (Combat.knows(st, f.sid, 'steady') ? F.steady : 0), 0.05, 0.95);
  },
  captureBlocker(st, f) {
    if (!(st.kit.jar > 0)) return 'No jars';
    if (Containment.free(st) <= 0) return 'No free cell';
    return null;
  },

  /* The player acts. Returns {note, sfx:[...]} or null if the action is not possible. */
  act(st, action, arg) {
    const run = st.run, f = run && run.encounter;
    if (!f) return null;
    const sp = Combat.byId(f.sid), z = zoneOf(run.zoneId), C = DATA.combat, sfx = [];
    const c = run.cryptids.find(k => k.id === f.cid);
    let braced = false;

    if (action === 'scan') {
      const lv = (st.upgrades.emf + st.upgrades.uv + st.upgrades.reagent) / 3;
      const before = Combat.entry(st, sp.id).research;
      Combat.research(st, sp.id, Math.round(C.scan.base + C.scan.perLevel * (lv - 1)));
      const now = Combat.entry(st, sp.id).research;
      const learned = before < C.tiers.weak && now >= C.tiers.weak ? ` It flinches from ${DATA.combat.attacks[sp.weak].name.toLowerCase()}.`
        : before < C.tiers.telegraph && now >= C.tiers.telegraph ? ` You can read its moves now, and it shrugs off ${DATA.combat.attacks[sp.resist].name.toLowerCase()}.`
        : before < C.tiers.full && now >= C.tiers.full ? ' Your notes on it are complete.' : '';
      Combat.say(run, `You sweep your instruments over it. Research ${now}%.${learned}`);
      sfx.push('scan');
    } else if (action === 'attack') {
      const A = C.attacks[arg], info = Combat.attackInfo(st, sp.id, arg);
      if (!A || info.block) return null;
      if (A.battery) st.battery = Math.max(0, st.battery - A.battery);
      if (A.cal) st.cal.emf = Math.max(0, st.cal.emf - A.cal);
      if (A.salt) st.supplies.salt -= A.salt;
      f.presence = Math.max(0, f.presence - info.dmg);
      const e = Combat.entry(st, sp.id);
      let how = 'It reels.';
      if (info.mult > 1) { e.weak = true; how = 'It shrieks. That hurt it badly.'; sfx.push('hitweak'); }
      else if (info.mult < 1) { e.resist = true; how = 'It barely notices.'; sfx.push('hitresist'); }
      else sfx.push('hit');
      Combat.research(st, sp.id, C.hitWatch);
      Combat.say(run, `${A.verb} ${how} (−${info.dmg})`);
      if (f.presence <= 0) return Combat.banish(st, run, f, sp, c, sfx);
    } else if (action === 'brace') {
      braced = true;
      Combat.research(st, sp.id, C.braceWatch);
      Combat.say(run, 'You plant your feet and watch it closely.');
      sfx.push('brace');
    } else if (action === 'capture') {
      if (Combat.captureBlocker(st, f)) return null;
      st.kit.jar -= 1;
      if (rnd() < Combat.captureChance(st, f)) {
        Combat.research(st, sp.id, C.captureResearch);
        Combat.entry(st, sp.id).captured += 1;
        Containment.add(st, sp, run.zoneId);
        run.cryptids = run.cryptids.filter(k => k !== c);
        Combat.say(run, `The jar seals with a crack of frost. ${sp.name} is yours now. It goes to the basement.`);
        return Combat.end(st, run, 'Captured', sfx.concat('capture'));
      }
      Combat.say(run, 'It slams against the glass and the jar shatters in your hands.');
      sfx.push('capturefail');
    } else if (action === 'flee') {
      if (f.restrained) return null;
      run.stamina = Math.max(0, run.stamina - C.flee.stamina);
      if (rnd() < Combat.fleeChance(st, f)) {
        c.stun = C.flee.stun;
        const back = Crawl.DIRS.map(([dx, dy]) => ({ x: run.pos.x + dx, y: run.pos.y + dy }))
          .filter(o => Crawl.open(run, o.x, o.y) && !Crawl.cryptidAt(run, o.x, o.y));
        if (back.length) run.pos = pick(rnd, back);
        Combat.say(run, 'You bolt. It does not follow, yet.');
        return Combat.end(st, run, 'Got away', sfx.concat('run'));
      }
      Combat.say(run, 'You turn to run and it cuts you off.');
      sfx.push('run');
    } else if (action === 'offer') {
      if (!run.bag.length) return null;
      const lost = run.bag.splice(Math.floor(rnd() * run.bag.length), 1)[0];
      run.cryptids = run.cryptids.filter(k => k !== c);
      Combat.say(run, `You throw it the ${Items.name(lost)}. It takes the offering and is gone.`);
      return Combat.end(st, run, 'It took the offering', sfx.concat('toss'));
    } else return null;

    // its turn: it does what it showed you (a restraint lasts until its next move)
    f.restrained = 0;
    Combat.entityTurn(st, run, f, sp, braced, sfx);
    f.turn += 1;
    Combat.pickNext(f, sp);
    const panic = Crawl.checkPanic(st);
    return { note: panic || null, sfx };
  },

  entityTurn(st, run, f, sp, braced, sfx) {
    const m = Combat.move(sp, f.next), C = DATA.combat, k = braced ? C.brace : 1;
    Combat.research(st, sp.id, C.watch);
    const parts = [];
    if (m.stress) { const n = Math.max(1, Math.round(m.stress * k)); Crawl.addStress(st, n); parts.push(`+${n} Stress`); }
    if (m.stamina) { const n = Math.max(1, Math.round(m.stamina * k)); run.stamina = Math.max(0, run.stamina - n); parts.push(`−${n} stamina`); }
    if (m.battery && st.battery > 0) {
      const n = Math.max(1, Math.round(m.battery * k));
      st.battery = Math.max(0, st.battery - n); parts.push(`−${n}% light`);
      if (st.battery === 0 && Crawl.useKit(st, 'cell')) { st.battery = DATA.kitEffects.cell.battery; parts.push('spare battery in'); }
    }
    if (m.heal) { const before = f.presence; f.presence = Math.min(f.max, f.presence + m.heal); parts.push(`it recovers ${f.presence - before}`); }
    if (m.steal) {
      if (run.bag.length && !braced) { const lost = run.bag.splice(Math.floor(rnd() * run.bag.length), 1)[0]; parts.push(`it took your ${Items.name(lost)}`); }
      else parts.push(braced ? 'you keep hold of your bag' : 'nothing to take');
    }
    if (m.restrain) f.restrained = 1;
    Combat.say(run, `${m.name}: ${m.text} ${parts.length ? '(' + parts.join(', ') + ')' : ''}`.trim());
    sfx.push(braced ? 'brace' : 'lash');
  },

  banish(st, run, f, sp, c, sfx) {
    const L = DATA.combat.loot, z = zoneOf(run.zoneId);
    run.cryptids = run.cryptids.filter(k => k !== c);
    const e = Combat.entry(st, sp.id);
    e.banished += 1;
    Endless.add(st, 'banish');
    Combat.research(st, sp.id, DATA.combat.banishResearch);
    const essence = L.essence + (z.danger >= L.extraEssenceAtDanger ? 1 : 0);
    st.supplies.essence += essence;
    let extra = '';
    if (rnd() < L.findChance && run.bag.length < Crawl.bagCap(st)) {
      const it = Items.generate(st, { zoneId: z.id });
      run.bag.push(it);
      extra = ` It left ${an(Items.name(it))} behind.`;
    }
    Combat.say(run, `${sp.name} comes apart and is gone. You bottle what is left: +${essence} essence.${extra}`);
    return Combat.end(st, run, 'Banished', sfx.concat('banish'));
  },

  end(st, run, note, sfx) {
    run.encounter = null;
    Crawl.reveal(st, run);
    return { note: Crawl.checkPanic(st) || note, sfx, ended: true };
  }
};

/* ===================================================================== containment
   Captured entities live in basement cells. Seals weaken every night; feed them salt
   to hold them. At 0 the entity breaks out. */
const Containment = {
  cap: st => DATA.containment.cells[(st.upgrades.cells || 1) - 1],
  free: st => Containment.cap(st) - st.containment.length,
  add(st, sp, zoneId) {
    st.counters.captives = (st.counters.captives || 0) + 1;
    st.containment.push({ uid: `C${st.counters.captives}-${sp.id}`, sid: sp.id, zone: zoneId, day: st.day, stability: 100, harvested: 0 });
    Story.addName(st, DATA.config.name.capture);
    Endless.add(st, 'capture');
  },
  find: (st, uid) => st.containment.find(c => c.uid === uid),
  name: cell => Combat.byId(cell.sid).name,
  feed(st, uid) {
    const c = Containment.find(st, uid), F = DATA.containment.feed;
    if (!c || c.stability >= 100 || Lab.missing(st, F.cost)) return false;
    Lab.pay(st, F.cost);
    c.stability = Math.min(100, c.stability + F.amount);
    log(st, `Re-salted the seals on ${Containment.name(c)}’s cell.`, 'note');
    return true;
  },
  harvestBlocker(st, c) {
    const H = DATA.containment.harvest;
    if (c.harvested === st.day) return 'Already harvested today';
    if (st.bench.mins < H.mins) return 'Out of bench time';
    return null;
  },
  harvest(st, uid) {
    const c = Containment.find(st, uid), H = DATA.containment.harvest;
    if (!c || Containment.harvestBlocker(st, c)) return false;
    st.bench.mins -= H.mins;
    st.supplies.essence += H.essence;
    c.stability = Math.max(0, c.stability - H.stability);
    c.harvested = st.day;
    log(st, `Drew essence from ${Containment.name(c)}. The seals did not like it.`, 'note');
    return true;
  },
  price: (st, sp, fac) => roundPrice(sp.value * (1 + st.rep[fac] / 100)),
  buyers: (st, sp) => sp.buyers.filter(f => st.rep[f] > -40),
  sell(st, uid, fac) {
    const c = Containment.find(st, uid);
    if (!c) return 0;
    const sp = Combat.byId(c.sid);
    if (!Containment.buyers(st, sp).includes(fac)) return 0;
    const price = Containment.price(st, sp, fac), K = DATA.containment;
    st.cash += price; Rep.add(st, fac, K.sellRep); st.heat += K.sellHeat;
    Story.addName(st, DATA.config.name.sellCaptive);
    Endless.add(st, 'revenue', price);
    st.containment = st.containment.filter(x => x !== c);
    log(st, `${byId(DATA.factions, fac).name} collected ${Containment.name(c)} in a van with no plates. ${money(price)}.`, 'note');
    return price;
  },
  release(st, uid) {
    const c = Containment.find(st, uid);
    if (!c) return false;
    st.containment = st.containment.filter(x => x !== c);
    log(st, `Let ${Containment.name(c)} go, far from the shop.`, 'note');
    return true;
  },
  /* At sleep: seals weaken; anything at 0 breaks out. Returns a line for the morning, or null. */
  overnight(st) {
    const K = DATA.containment, lines = [];
    for (const c of st.containment.slice()) {
      const sp = Combat.byId(c.sid);
      c.stability -= K.decay.base + K.decay.perDanger * Combat.danger(sp);
      if (c.stability > 0) { if (c.stability <= K.warnAt) lines.push(`${Containment.name(c)}’s seals are failing (${c.stability}%).`); continue; }
      st.containment = st.containment.filter(x => x !== c);
      st.stress += K.breakout.stress; st.heat += K.breakout.heat;
      st.counters.breakouts = (st.counters.breakouts || 0) + 1;
      Story.addName(st, DATA.config.name.breakout);
      Endless.add(st, 'breakout');
      const clean = st.inventory.loot.filter(x => !x.sealed && !x.job);
      if (clean.length) pick(rnd, clean).contam = { id: 'hex', tool: pick(rnd, ['emf', 'uv', 'reagent']) };
      const text = `${Containment.name(c)} broke out of the basement in the night. The neighbors called it in. +${K.breakout.stress} Stress, +${K.breakout.heat} Heat.`;
      log(st, text, 'warn');
      lines.push(text);
    }
    return lines.length ? lines.join(' ') : null;
  }
};
