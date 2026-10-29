// The wind's sound (Phase 30), the rule only, so it can be tested without the audio engine.
// Phase 30: the wind bed follows the climate's real wind (metres a second): a breeze is a whisper,
// a gale a roar, pitched higher the harder it blows. Returns { gain, freq }.
export function windBed(wind) {
  const k = Math.max(0, Math.min(1, wind / 14));
  return { gain: 0.004 + 0.07 * k ** 1.4, freq: 280 + 520 * k };
}

