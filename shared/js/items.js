'use strict';

/* ===================================================================== items */
const Items = {
  generate(st, { zoneId, odds } = {}) {
    const seed = (rnd() * 4294967296) >>> 0;
    const rng = mulberry32(seed);
    const zone = zoneOf(zoneId) || pick(rng, DATA.zones.filter(z => !z.secret));
    const base = weighted(rng, DATA.bases.map(b => [b, zone.affinity.includes(b.category) ? 3 : 1]));
    const prefix = pick(rng, DATA.prefixes);
    const alignment = weighted(rng, Object.entries(odds || zone.odds));
    const pool = DATA.anomalies.filter(a => a.alignment === alignment);
    // uncatalogued anomalies are rarer, and turn up more the deeper the zone
    const anomaly = weighted(rng, pool.map(a => [a, (a.affinity.includes(base.category) ? 3 : 1) * (a.uncatalogued ? 0.25 * zone.danger : 1)]));
    const ticket = ++st.counters.ticket;
    const [c0, c1] = DATA.condition.byPrefix[prefix.id] || [40, 80];
    const contamId = rng() < DATA.contamChance ? DATA.zoneContam[zone.id] : null;
    return {
      uid: `T${ticket}-${seed.toString(36)}`,
      ticket, seed,
      baseId: base.id, prefixId: prefix.id, zoneId: zone.id, dayFound: st.day,
      hidden:   { anomalyId: anomaly.id },          // never rendered outside debug
      revealed: { emf: null, uv: null, reagent: null, spirit: null }, // candidate lists, narrowed by each test
      tests:    { emf: 0, uv: 0, reagent: 0, spirit: 0 },
      draft: null,      // in-progress verdict on the bench {alignment, anomalyId, price}
      appraisal: null,  // locked verdict once shelved {alignment, anomalyId, price, day, tests}
      verdict: null, price: null,
      condition: randInt(rng, c0, c1),
      contam: contamId ? { id: contamId, tool: DATA.contaminants[contamId].tool } : null,
      sealed: false, purified: false,
      ...(zone.valueMult ? { valueBonus: zone.valueMult } : {})
    };
  },
  name: it => `${prefixOf(it).name} ${baseOf(it).name}`,
  /* Surface value: base × wear × condition (×0.7 at 0, ×1.0 at 60, ×1.2 at 100). */
  condMult: it => 0.7 + 0.5 * (it.condition ?? 60) / 100,
  estimate: it => Math.max(1, Math.round(baseOf(it).value * prefixOf(it).valueMod * Items.condMult(it) * (it.valueBonus || 1))),
  condLabel: it => DATA.condition.bands.find(([lim]) => (it.condition ?? 60) < lim)[1],
  trueValue: it => Math.round(Items.estimate(it) * anomalyOf(it).valueMult),
  find(st, uid) {
    for (const list of ['loot', 'stock']) {
      const index = st.inventory[list].findIndex(x => x.uid === uid);
      if (index > -1) return { list, index, item: st.inventory[list][index] };
    }
    return null;
  },
  ensure(it) {           // bring items from older saves up to the current shape
    it.revealed = { emf: null, uv: null, reagent: null, spirit: null, ...(it.revealed || {}) };
    delete it.revealed.lore;
    it.tests = { emf: 0, uv: 0, reagent: 0, spirit: 0, ...(it.tests || {}) };
    if (it.condition === undefined) it.condition = 60;
    if (it.contam === undefined) it.contam = null;
    if (it.sealed === undefined) it.sealed = false;
    if (it.purified === undefined) it.purified = false;
    if (it.draft === undefined) it.draft = null;
    if (it.appraisal === undefined) it.appraisal = null;
    return it;
  }
};
