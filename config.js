// Central tuning values. Change numbers here, not in the systems that use them.

export const CONFIG = {
  title: 'The Midnight Appraiser',
  saveVersion: 1,
  version: '2.5.1',
  saveSlots: 3,

  tile: 16,

  // Rendering: pick the largest integer scale that still shows at least this
  // many logical pixels across the narrow side of the screen.
  minLogicalShortSide: 176,
  // ...and on bigger screens, about one logical pixel per this many CSS pixels (by the
  // View size setting), never more than maxLogicalShortSide.
  cssPerLogical: { close: 2.8, normal: 2.3, wide: 1.9 },
  maxLogicalShortSide: 400,

  // Fixed simulation step (seconds) and the longest frame we will catch up on.
  step: 1 / 60,
  maxFrame: 0.25,

  // Day clock: one full day lasts this long in real time while the clock runs.
  dayLengthMs: 10 * 60 * 1000,
  dayStartMinute: 8 * 60,   // 8:00 AM in-game
  dayEndMinute: 20 * 60,    // 8:00 PM in-game
  clockDisplayStep: 10,     // in-game minutes per visible clock tick

  player: {
    speed: 68,              // logical px per second at full stick
    box: { w: 10, h: 6, ox: 3, oy: 10 }, // collision box (feet) inside the 16x16 sprite
    walkFrameTime: 0.11,     // per frame of the 4-frame walk
  },

  camera: { followLerp: 10 },

  joystick: {
    sizes: { small: 96, medium: 120, large: 148 }, // CSS px diameter of the base
    deadZone: 0.18,
  },

  interactRange: 14,

  // Errand days in the city keep the original's budget: 6 errand hours (more with ride
  // upgrades) starting at 9 AM. One errand hour lasts 100 seconds, so a 6-hour errand
  // day runs the same 10 minutes as a shop day.
  city: {
    startMinute: 9 * 60,
    hourMs: 100 * 1000,
    pedestrians: 28,
    // Walking speed by ride tier (on foot, then each upgrade).
    rideSpeed: [1, 1.45, 1.8],
  },

  // Night runs. The zone clock starts when you go in and runs 10 PM to 4 AM.
  // Each cell of the original map is drawn as cellTiles x cellTiles tiles.
  night: {
    startMinute: 22 * 60,
    hours: 6,
    lengthMs: 5 * 60 * 1000,
    cellTiles: 3,
    // Seconds between cryptid moves. Lower light makes them hunt faster and notice you sooner.
    cryptidStep: { lit: 1.0, low: 0.82, dark: 0.6 },
    lowBattery: 25,
    // The light drains every this many steps (the original: every 2). Phase 18: a little slower.
    lightDrainEvery: 3,
    knockoutHeat: 3,
    clockOutLoss: 1 / 3,
  },
};
