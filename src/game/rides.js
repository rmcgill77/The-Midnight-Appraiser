// Getting around town (Phase 22). Your ride (the original's bike, van, bus pass or your
// own two feet, and its upgrades) decides what you can ride on the street, and how fast.
// Riding is a choice: the Ride/Walk button (R, or Y on a controller) gets off and walks
// it, and you always walk indoors. The bus pass is different: bus stops on the street
// take you across town (a few free rides a day with a pass; anyone can pay the fare).

// What you ride, by ride and upgrade tier. speed: how many times walking pace.
const VEHICLES = {
  bike: [{ kind: 'bike', speed: 1.6, name: 'your bike' }, { kind: 'trike', speed: 1.75, name: 'the cargo trike' }, { kind: 'ebike', speed: 2.1, name: 'the e-bike' }],
  foot: [null, { kind: 'scooter', speed: 1.9, name: 'the scooter' }, { kind: 'motorcycle', speed: 2.3, name: 'the motorcycle' }],
  van: [{ kind: 'van', speed: 2.2, name: 'the van' }, { kind: 'van', speed: 2.4, name: 'the van' }, { kind: 'van', speed: 2.4, name: 'the van' }],
  bus: [null, null, null],
};

export function vehicleOf(st) {
  const list = VEHICLES[st?.ride?.id] ?? VEHICLES.foot;
  return list[Math.min(st?.ride?.tier ?? 0, list.length - 1)] ?? null;
}
export const hasVehicle = st => !!vehicleOf(st);
// How fast you get around the street: your ride's pace when you're on it, walking pace otherwise.
export const citySpeed = (st, riding = true) => (riding && vehicleOf(st) ? vehicleOf(st).speed : 1);
// Tiles a vehicle stays off: the van keeps to the road, the curb and the lots, not the grass.
export const keepsOff = (st, riding) => (riding && vehicleOf(st)?.kind === 'van' ? new Set(['"', 't', 'b']) : null);

// ---------- the bus ----------
export const BUS_FARE = 3;          // dollars, without a pass (or once the pass's rides are used)
export const BUS_MINUTES = 30;      // a ride across town, waiting included
// The stops: one on the sidewalk by each of these places.
export const BUS_STOPS = ['shop', 'relay', 'library', 'office', 'hardware', 'market', 'firehouse', 'autoshop', 'diner', 'z-laundromat', 'z-hospital'];
// Free rides a day with a pass (the original's trips; the express card is unlimited).
export function passRides(st, DATA) {
  if (st?.ride?.id !== 'bus') return 0;
  const t = DATA.rides.bus.tiers[st.ride.tier ?? 0];
  return t.trips ?? Infinity;
}
// Today's rides so far (kept in world.bus, reset each day).
export function busToday(world, day) {
  if (world.bus?.day !== day) world.bus = { day, used: 0 };
  return world.bus;
}
// What the next ride costs: free while the pass covers it, the fare after.
export function busCost(st, world, DATA) {
  const used = busToday(world, st.day).used;
  return used < passRides(st, DATA) ? 0 : BUS_FARE;
}
