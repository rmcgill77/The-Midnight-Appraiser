# The Midnight Appraiser: roadmap

Things we want to change, fix and add. Nothing here is built yet. The game's code
comments already number phases up to 29, so new phases start at 30.

Add new ideas to the **Backlog** at the bottom as they come up, then move them into a
phase when we plan it.

## Planned phases (draft: order and grouping are open to change)

### Phase 30: Sky and time
- **Weather happens in the world.** Today `src/ui/weather-fx.js` draws rain, snow, fog and
  lightning over the screen (screen-space, before the HUD), so it follows the camera.
  Decided: move it into the world, so weather belongs to the map (for example rain
  splashes and puddles on the ground, snow settling, fog sitting over places) and you
  walk through it.
  - Open: which effects stay as a screen overlay (falling rain/snow) and which become
    ground effects.
- **Better day/night flow.** Decided problems to fix:
  - Night is a menu today: at the end of the day the player picks the lab, a zone run,
    the night city or bed. Make the day turn into night continuously instead.
  - Morning, day and night don't connect well: hours, story and NPC schedules should line
    up across them.
  - Not selected (so out of scope unless raised again): dusk/dawn sky lighting and day
    length/pacing.
  - Open: what happens to the lab, zone runs and bed choices once there is no menu.
- Likely files: `src/game/clock.js`, `src/game/weather.js`, `src/ui/weather-fx.js`,
  `src/game/night-city.js`, `src/main.js` (day phases: morning, day, errands, night).

### Phase 31: People
- **Deeper character creator.** Decided scope:
  - More options in the existing tabs (hairstyles, hats, tops, faces, accessories).
  - New categories the creator can't do now (ideas: body shapes and heights, pronouns,
    voice, backstory, name tag). Open: which of these.
- **More refined character portraits.** Decided scope:
  - Higher-resolution portraits than today's 48x48, in the same pixel style.
  - Expressions: portraits that change with mood during conversations.
- Today: six creator tabs, 24x32 figures and 48x48 portraits, all drawn by
  `src/engine/figure-hd.js`, so all of this runs through that one drawing system. Existing
  saves and the NPC looks in `src/game/people.js` must keep working.
- Likely files: `src/ui/creator.js`, `src/ui/portraits.js`, `src/engine/figure.js`,
  `src/engine/figure-hd.js`, `src/game/people.js`.

### Phase 32: The city
- **Updated city look**, including streets and so on. Decided scope: new art for the
  existing town (buildings, streets, sidewalks in a more detailed look). The layout stays.
  Not selected: changing the layout itself.
- The town is generated from rules, not drawn by hand, so this is mostly new tile art and
  generator rules.
- Likely files: `src/data/city.js`, `src/data/city-tiles.js`, `src/data/tiles.js`.

### Phase 33: The woods
- **Woods expansion to the north.** Decided scope: a big expansion (its own story,
  creatures, shops and night events), not just a small walkable area.
- Already in the code: a roped-off trail with a sign at the top of the last street west of
  the park gate, past Kessler Heights (`woods` in `src/data/city.js`), and "out too late"
  ranger dialogue for the woods (`src/game/night-city.js`). The town can open onto new
  areas off the map edge (`src/data/areas.js`, `src/game/edges.js`).
- Why after the city look: the new area should match it.
- Open: story, creatures, shops, how it ties into the night.

## Backlog (ideas not yet in a phase)

- Naming clash: the bar's short name is now "the Lantern", and the town already has
  Lantern Park. Decide whether to change the bar's short name (for example "the Brass").

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
