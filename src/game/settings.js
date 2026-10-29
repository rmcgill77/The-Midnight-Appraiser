// Player settings. Stored separately from save slots: they belong to the
// device, not to a run.

export const DEFAULT_SETTINGS = {
  orientation: 'landscape', // landscape | portrait | auto (follow the screen; foldables and tablets)
  joystickSize: 'medium',   // small | medium | large
  viewSize: 'normal',       // close | normal | wide: how much of the world fits on screen
  textSize: 'normal',       // normal | large
  reducedMotion: false,     // turns off lamp flicker and camera easing
  showFps: false,
  brightness: 1.15,         // v2.5b: how bright the game is drawn (0.8 to 1.6); lifts the dark too
  sound: true, volMaster: 0.8, volMusic: 0.6, volSfx: 0.8,
  captions: false,          // short on-screen captions for sounds that carry information
  vibration: true,
  textSpeed: 'normal',      // slow | normal | fast | instant: how fast dialog types out
  tempUnit: 'c',            // c | f: the weather's temperature and wind (C and km/h, or F and mph)
  autoAdvance: false,       // conversations move on by themselves at reading pace (off: tap to continue)
  assists: { slowEntities: false }, // placeholder for Phase 4 combat assists
};

export function loadSettings(storage) {
  let stored = {};
  try { stored = JSON.parse(storage.get('tma.settings') || '{}') || {}; } catch { stored = {}; }
  const prefersReduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const s = { ...DEFAULT_SETTINGS, reducedMotion: prefersReduced, ...stored };
  s.assists = { ...DEFAULT_SETTINGS.assists, ...(stored.assists || {}) };
  if (!['small', 'medium', 'large'].includes(s.joystickSize)) s.joystickSize = 'medium';
  if (!['landscape', 'portrait', 'auto'].includes(s.orientation)) s.orientation = 'landscape';
  if (!['close', 'normal', 'wide'].includes(s.viewSize)) s.viewSize = 'normal';
  if (!['normal', 'large'].includes(s.textSize)) s.textSize = 'normal';
  if (!['slow', 'normal', 'fast', 'instant'].includes(s.textSpeed)) s.textSpeed = 'normal';
  if (!['c', 'f'].includes(s.tempUnit)) s.tempUnit = 'c';
  s.autoAdvance = !!s.autoAdvance;
  s.brightness = Math.max(0.8, Math.min(1.6, Number(s.brightness) || DEFAULT_SETTINGS.brightness));
  for (const k of ['volMaster', 'volMusic', 'volSfx']) s[k] = Math.max(0, Math.min(1, Number(s[k]) || 0));
  return s;
}

export function saveSettings(storage, s) { storage.set('tma.settings', JSON.stringify(s)); }
