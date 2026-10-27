// God mode (Phase 18): a hidden cheat menu for testing, behind a password in Settings.
// Only a hash of the password lives here, never the word itself. It's a casual lock: the
// game runs in the browser, so anyone who reads the code could get past it.

// cyrb53: a small, fast 53-bit string hash. Not cryptographic; it doesn't need to be.
export function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

const GOD_HASH = 6231163942215339;
export const checkPassword = s => cyrb53(String(s ?? '').trim(), 18) === GOD_HASH;

// The switches that stay on until you turn them off. Stored with the device's settings.
export const FLAGS = [
  ['invincible', 'Untouchable', 'Night runs: cryptids freeze in place, contact never starts a fight, and your nerve stays at zero.'],
  ['light', 'Endless light', 'Your flashlight never drains.'],
  ['stamina', 'Endless stamina', 'Sprint as long as you like.'],
  ['freeze', 'Stop the clock', 'The day and night clocks stand still.'],
  ['bench', 'Endless bench time', 'Lab work never runs out of time, vials or salt.'],
];

export const godState = settings => {
  settings.god = { unlocked: false, ...(settings.god || {}) };
  return settings.god;
};
export const anyOn = god => !!god?.unlocked && FLAGS.some(([k]) => god[k]);

// Every frame while a game is running: keep the switched-on cheats true.
export function applyGod(god, st, { inZone = false } = {}) {
  if (!god?.unlocked || !st) return;
  const run = st.run;
  if (inZone && run) {
    if (god.invincible) {
      st.stress = 0;
      for (const c of run.cryptids) c.stun = Math.max(c.stun || 0, 2);
      if (run.encounter) run.encounter = null;
    }
    if (god.light) st.battery = 100;
    if (god.stamina) { run.stamina = Math.max(run.stamina, globalThis.SSP?.Crawl?.maxStamina?.(st) ?? run.stamina); run.tired = false; }
  }
  if (god.bench && st.bench) {
    st.bench.mins = Math.max(st.bench.mins, st.bench.max);
    if (st.supplies) { st.supplies.vials = Math.max(st.supplies.vials, 20); st.supplies.salt = Math.max(st.supplies.salt, 20); }
  }
}
