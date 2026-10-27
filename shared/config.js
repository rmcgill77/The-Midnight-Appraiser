/* data/config.js — loads first. Creates the global DATA object that the other
   data files extend, and holds the tuning numbers. */
'use strict';

const DATA = {
  config: {
    maxEnergy: 10, heatMax: 100, logMax: 40,
    benchMins: 360,   // bench time per day, in minutes (6 hours)
    startVials: 6, vialPack: { qty: 3, cost: 20 }, scrapRate: 0.3,
    customersBase: 6, customersMax: 10, customersEvery: 5,   // +1 customer every 5 days
    kindWeights: { buy: 55, sell: 25, appraise: 20 },        // who walks in on an open day
    factionHeat: 2, inspectorHeat: 50, maxRefusals: 2,
    apBase: 6, apCap: 8,                // errand hours; your ride's upgrades raise them toward apCap
    /* Campaign story (Phase 7). The shop's own name has a target of nameRate × campaign days. */
    nameRate: 1.3, nameShowAt: 0.2, libraryPageAt: 0.25, pageRuns: 5,
    pledgeRep: 10, pledgeRivalHit: 10, selfPledgeName: 5,
    bigSale: 120,                      // a sale this big gets the big-sale stinger (Phase 12d)
    doorPages: 4, doorName: 0.6,       // the other door: pages found (page 4 among them) and the shop's own name
    name: { civSale: 1, civAppraisal: 2, incident: -4, surrender: 2, fence: -2, job: -1, capture: 1, sellCaptive: -1, breakout: -3 }
  },

  /* Per-mode tuning. days = full days before the audit (audit is the morning after
     the last day). Rent is never a game over: short rent becomes arrears plus a late
     fee, adds Heat, and the landlord's notice scares off customers until it's paid. */
  difficulty: {
    easy:    { name:'Easy',    days:90,   startCash:500, rent:200, rentEvery:7, heatDecay:5, lateFee:0.15,
               blurb:'90 days until the audit. Cheaper rent and a forgiving city.' },
    medium:  { name:'Medium',  days:60,   startCash:400, rent:250, rentEvery:7, heatDecay:4, lateFee:0.20,
               blurb:'60 days until the audit. The intended balance.' },
    hard:    { name:'Hard',    days:30,   startCash:350, rent:300, rentEvery:7, heatDecay:3, lateFee:0.25,
               blurb:'30 days until the audit. Steep rent, and Heat lingers.' },
    endless: { name:'Endless', days:null, startCash:400, rent:250, rentEvery:7, heatDecay:4, lateFee:0.20,
               blurb:'No audit. Keep the doors open as long as you can.' }
  },

  rentPenalty: {
    heatPerStrike: 5,       // Heat added per missed payment, times the strike count
    heatCap: 90,            // rent Heat never pushes you past this, so rent alone can't trigger a raid
    customerLossMax: 2      // fewer customers per day while arrears are owed (one per strike, capped)
  }
};
