// Who you are (Phase 12): your look and your background, kept in world.look and
// world.background. A save without a look keeps the original hand-drawn appraiser.

import { S } from '../rules/index.js';
import { cleanLook } from '../engine/figure.js';
import { backgroundOf } from '../data/backgrounds.js';

export function identityState(world) {
  world.look = world.look ? cleanLook(world.look) : null;
  world.background = backgroundOf(world.background) ? world.background : null;
  return { look: world.look, background: backgroundOf(world.background) };
}

// Once, at the start of a new game: the background's changes to the starting sim.
export function applyBackground(st, id) {
  const b = backgroundOf(id);
  if (!b) return null;
  st.cash += b.cash || 0;
  st.heat = Math.max(0, st.heat + (b.heat || 0));
  for (const [f, n] of Object.entries(b.rep || {})) if (f in st.rep) st.rep[f] += n;
  if (b.vials) st.supplies.vials += b.vials;
  st.dayStart = { cash: st.cash, heat: st.heat };
  S.log(st, `${b.name}: ${b.perk}`, 'note');
  return b;
}

export const hasEdge = (world, edge) => backgroundOf(world?.background)?.edge === edge;

// The family business: sellers open lower. Applied to a fresh seller from the original rules.
export const HAGGLE_EDGE = 0.9;
export function softenSeller(sim) {
  sim.ask = Math.max(sim.floor + 1, Math.round(sim.ask * HAGGLE_EDGE));
  sim.ask0 = sim.ask;
  sim.offer = Math.max(1, Math.round(sim.ask * 0.6));
  return sim;
}
