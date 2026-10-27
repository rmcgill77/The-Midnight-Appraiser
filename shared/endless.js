/* data/endless.js — Endless mode. No audit and no story: the rent climbs every week, the
   Office pays closer attention every two weeks, and the shop climbs ranks that unlock
   new things. The run ends in a raid, or when you retire. */
'use strict';

Object.assign(DATA, {
  endless: {
    rentStep: 25, rentCap: 1000,                 // rent rises by this after every rent day
    attentionEvery: 14,                         // days per level of Office attention
    attention: { decayLoss: 1, minDecay: -6, inspectorDrop: 5, minInspector: 30 },

    /* Score. Revenue counts per dollar; the rest per event. */
    score: { revenue: 0.1, day: 5, capture: 25, banish: 10, surrender: 15, named: 10, appraisal: 5, commission: 60, estate: 10, incident: -20, breakout: -15 },
    scoreNames: { revenue: 'Sales', day: 'Days open', capture: 'Captures', banish: 'Banishings', surrender: 'Curses turned in', named: 'Named faction sales',
                  appraisal: 'Right appraisals', commission: 'Commissions', estate: 'Estate sales', incident: 'News incidents', breakout: 'Breakouts' },

    ranks: [
      { id: 'pawnbroker', name: 'Pawnbroker',          at: 0,    perk: 'Where everyone starts.' },
      { id: 'dealer',     name: 'Dealer',              at: 250,  perk: 'Commissions: each week a faction asks for one named anomaly, and pays well for it.', unlock: 'commissions' },
      { id: 'appraiser',  name: 'Appraiser',           at: 700,  perk: 'Estate sales: once a week, a whole box from a house clearance, sold as one lot.', unlock: 'estates' },
      { id: 'curator',    name: 'Curator',             at: 1500, perk: 'Word gets around: one more customer a day, and a fourth lot at the Night Market.', unlock: 'crowd' },
      { id: 'collector',  name: 'Collector',           at: 2600, perk: 'You know where to look: one more bag slot on night runs, and the other door in the basement opens.', unlock: 'bag', unlocks: ['door'] },
      { id: 'legend',     name: 'Legend of Old Market', at: 4000, perk: 'The Office hesitates: Heat cools 1 more every day.', unlock: 'legend' }
    ],

    /* Commissions: one at a time; a new one is posted a week after the last was settled. */
    commission: { every: 7, days: 6, base: 40, payMult: 2.2, rep: 8, fail: -6, wrong: -12 },
    /* Estate sales: a box of items for one price, on the morning it is offered. */
    estate: { every: 7, items: 3, price: [0.6, 0.85] },

    intro: 'The rent goes up every week, and the Office looks a little harder every two. Climb the ranks, keep the doors open, and see how far you get.'
  },

  estateNames: ['The Varga estate', 'A Kessler Heights house clearance', 'The late Mr. Pell’s nephew', 'A storage unit auction', 'The Abernathy sisters', 'A widower moving to Florida'],

  /* Every campaign ending, for the "endings found" count on the title screen. */
  endingKeys: ['true',
    ...['techmage', 'corporate', 'hunters', 'office', 'self'].flatMap(f => ['cleared', 'probation', 'closed'].map(o => `${f}:${o}`))]
});
