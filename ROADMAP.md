# The Midnight Appraiser: roadmap

Things we want to change, fix and add. Nothing here is built yet. The game's code
comments already number phases up to 29, so new phases start at 30.

Add new ideas to the **Backlog** at the bottom as they come up, then move them into a
phase when we plan it.

## Planned phases (draft: order and grouping are open to change)

### Phase 30: Sky and time
- **Better day/night flow.** (details to be decided)
- **Weather effects follow the screen** instead of happening in the world. Rain, snow
  and similar should be drawn over the view, not placed on the map.

Why together: both live in the clock and weather code, and the weather change is small
and self-contained, so it's a good first phase. (Likely files: `src/game/clock.js`,
`src/game/weather.js`, `src/ui/weather-fx.js`.)

### Phase 31: People
- **Deeper character creator.**
- **More refined character portraits.**

Why together: both build on the same character drawing system. (Likely files:
`src/ui/creator.js`, `src/ui/portraits.js`, `src/engine/figure-hd.js`.)

### Phase 32: The city
- **Updated city look**, including streets and so on.

(Likely files: `src/data/city.js`, `src/data/city-tiles.js`, `src/data/tiles.js`.)

### Phase 33: The woods
- **Woods expansion to the north.** A new area north of the existing town.

Why after the city look: the new area should match the updated look. (Likely files: the
map, zone and area data under `src/data/`.)

## Backlog (ideas not yet in a phase)

- (empty: add new ideas here)

## Housekeeping (not game features)

- Play-test the live GitHub Pages site end to end, including saves after the NPC and bar
  renames.
- Add automated tests (a smoke test that loads the game, and a save-migration test).
- `assets/` art folder is empty in the build; decide whether to ship custom art.
- Android app: set up the Capacitor wrapper in a private repo, regenerate the launcher
  and Play Store icons from the new eye icon, fix `privacy.html` (contact email, remove
  the Netlify line), retake store screenshots with the new names, and get the signing key
  files.
- Optional: shorter URL (custom domain or renamed repo).
