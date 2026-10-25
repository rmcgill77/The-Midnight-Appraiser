'use strict';

/* ===================================================================== end-of-day recap (Phase 12b)
   When you sleep, the day closes into a short ledger: cash and Heat from morning to bedtime,
   rent, the best find, the worst deal, the night run, and how the audit (or, in Endless, the
   rank) looks. It is built only from what the player can see: surface estimates, prices, and
   outcomes the evening news already reported. Never the true nature of anything.

   st.today collects the day as it happens: { day, finds:[{name, est, from}], runs:[{zone, n, panic}],
   score }. Calendar.sleep builds st.recap from it and starts a fresh st.today. */

const Recap = {
  fresh(st) { return { day: st.day, finds: [], runs: [], score: Endless.on(st) ? Endless.score(st) : 0 }; },

  today(st) {
    if (!st.today || st.today.day !== st.day) st.today = Recap.fresh(st);
    return st.today;
  },
  find(st, it, from) {
    Recap.today(st).finds.push({ name: Items.name(it), est: Items.estimate(it), from });
  },
  run(st, zoneId, n, panic) {
    const z = zoneOf(zoneId);
    Recap.today(st).runs.push({ zone: z ? z.name : zoneId, n, panic: !!panic });
  },

  /* The worst deal of the day, from visible outcomes only. Sales carry est (the surface
     estimate when sold) and result (set by Shop.resolveDay). */
  worst(st, day) {
    const sales = st.shop.day === day ? st.shop.sales : [];
    const cands = [];
    for (const s of sales) {
      if (s.result === 'refund') cands.push({ score: 1000 + s.refund, text: `Sold the ${s.base} as something it wasn't. ${s.factionName} took back ${money(s.refund)}.`, tag: `−${money(s.refund)}` });
      else if (s.result === 'incident') cands.push({ score: 800 + (s.heat || 0), text: `The ${s.base} you sold ${s.who} made the evening news.`, tag: `+${s.heat} Heat` });
      else if (s.result === 'lost') cands.push({ score: 600, text: `${s.factionName} gambled on the unnamed ${s.base} and lost. They blame you.`, tag: '−8 rep' });
      else if (s.result === 'undersold') cands.push({ score: 400 + (s.est || 0) / 10, text: `Let the ${s.base} go for ${money(s.price)}. It was worth more than that.`, tag: 'Undersold' });
      else if (s.est && s.price < s.est * 0.85) cands.push({ score: 100 + (1 - s.price / s.est) * 100, text: `Let the ${s.base} go for ${money(s.price)}, under its surface estimate of ${money(s.est)}.`, tag: `−${money(s.est - s.price)}` });
    }
    for (const b of (st.shop.day === day ? st.shop.bought || [] : [])) {
      if (b.est && b.price > b.est * 1.2) cands.push({ score: 100 + (b.price / b.est - 1) * 100, text: `Paid ${b.who} ${money(b.price)} for ${an(b.item)} that looks worth ${money(b.est)}.`, tag: `+${money(b.price - b.est)} over` });
    }
    cands.sort((a, b) => b.score - a.score);
    return cands[0] ? { text: cands[0].text, tag: cands[0].tag } : null;
  },

  /* Called from Calendar.sleep after the day has rolled over. pre: the bedtime numbers before rent. */
  build(st, pre) {
    const t = pre.today, day = pre.day;
    const ds = pre.dayStart || { cash: pre.cash, heat: pre.heat };
    const best = t.finds.slice().sort((a, b) => b.est - a.est)[0] || null;
    const sales = st.shop.day === day ? st.shop.sales : [];
    const r = {
      day,
      cash: { start: ds.cash, end: st.cash, rent: pre.rentPaid, short: pre.rentShort },
      heat: { start: Math.round(ds.heat), end: clamp(Math.round(pre.heat), 0, DATA.config.heatMax) },
      shop: st.shop.day === day ? { sold: sales.length, revenue: sales.reduce((a, s) => a + s.price, 0) } : null,
      best, worst: Recap.worst(st, day),
      finds: t.finds.length,
      runs: t.runs.slice()
    };
    const left = Calendar.daysLeft(st);
    if (left !== null) r.audit = { left, standing: Audit.hints(st).standing };
    if (Endless.on(st)) r.endless = { rank: Endless.rank(st).name, gain: Endless.score(st) - (t.score || 0) };
    const net = r.cash.end - r.cash.start, dh = r.heat.end - r.heat.start;
    const mood = r.worst && /refund|news|blame/i.test(r.worst.text) || dh >= 10 || r.cash.short ? 'bad'
      : net > 0 || (best && best.est >= 60) ? 'good' : 'flat';
    r.mood = mood;
    r.line = pick(rnd, DATA.recapLines[mood]);
    return r;
  }
};
