// Renovating the shop. You pay the contractor up front; the crew works overnight and
// the next stage is there in the morning, so the room never changes under customers.
// This is world state (the original game has no shop stages), kept in world.shop.

import { S } from '../rules/index.js';
import { cue } from '../rules/cues.js';
import { SHOP_TIERS, MAX_TIER, clampTier, reslotDisplays, caseSlots } from '../data/shop-tiers.js';

export const freshShop = () => ({ tier: 0, booked: null });

export function shopState(world) {
  const s = world.shop && typeof world.shop === 'object' ? world.shop : freshShop();
  s.tier = clampTier(s.tier);
  if (s.booked != null && (s.booked !== s.tier + 1 || s.booked > MAX_TIER)) s.booked = null;
  world.shop = s;
  return s;
}

export const stageOf = world => SHOP_TIERS[shopState(world).tier];
export const nextStage = world => { const s = shopState(world); return s.tier < MAX_TIER ? SHOP_TIERS[s.tier + 1] : null; };

// What stopping a renovation from being booked right now, or null.
export function renovationBlocker(world, st) {
  const s = shopState(world), n = nextStage(world);
  if (!n) return 'The shop is fully restored.';
  if (s.booked != null) return 'The crew is already booked for tonight.';
  if (st.cash < n.cost) return `Needs ${S.money(n.cost)}`;
  return null;
}

export function bookRenovation(world, st) {
  const why = renovationBlocker(world, st);
  if (why) return { error: why };
  const n = nextStage(world);
  st.cash -= n.cost;
  world.shop.booked = n.tier;
  cue('upgrade');
  S.log(st, `Paid the contractor ${S.money(n.cost)}: ${n.work.charAt(0).toLowerCase()}${n.work.slice(1)}`, 'note');
  return { stage: n };
}

// Overnight: the booked work gets done. Returns the new stage, or null.
export function applyRenovation(world, st = null) {
  const s = shopState(world);
  if (s.booked == null) return null;
  s.tier = s.booked; s.booked = null;
  world.displays = reslotDisplays(world.displays, s.tier);
  const stage = SHOP_TIERS[s.tier];
  if (st) S.log(st, `The crew worked through the night. The shop is ${stage.name.toLowerCase()} now.`, 'note');
  return stage;
}

// What a stage gives you, for the estimate.
export function stageFacts(tier) {
  const t = SHOP_TIERS[clampTier(tier)];
  return { cases: caseSlots(t.tier).length, customers: t.customers, bonus: t.bonus };
}
