# The Midnight Appraiser: roadmap

Things we want to change, fix and add. Nothing here is built yet. The game's code
comments already number phases up to 29, so new phases start at 30.

Add new ideas to the **Backlog** at the bottom as they come up, then move them into a
phase when we plan it.

## Planned phases (draft: order and grouping are open to change)

### Phase 30: Sky and time
- **Weather happens in the world, and behaves like real weather and climate.**
  - Today `src/ui/weather-fx.js` draws rain, snow, fog and lightning over the screen
    (screen-space, before the HUD), so it follows the camera. Decided: move it into the
    world, so weather belongs to the map (for example rain splashes and puddles on the
    ground, snow settling, fog sitting over places) and you walk through it.
  - Today `src/game/weather.js` picks one weather type per day, the same all day and
    night, from the seed and season. Decided: weather should do its best to mimic how real
    weather and climate react, so it should change through the day and follow the season
    (for example fronts moving in, fog burning off by midday, storms building up, snow
    that falls, settles and melts).
  - Open: how detailed the climate model should be (temperature, humidity, wind, fronts),
    and which effects stay as a screen overlay (falling rain/snow) and which become ground
    effects.
- **A longer, continuous day and night.**
  - Decided: the full day and night is one cycle of about 15-20 minutes of real time
    (today a shop day is about ten minutes, 8 AM to 8 PM, and the night is separate).
  - Decided: the player chooses a set timeframe during the day for the shop to be open.
  - Decided: night runs still happen at night, as part of the same cycle.
  - Decided goal: far fewer menus. Today the player picks from menus at the start of the
    day and again at its end (the lab, a zone run, the night city, bed). The day should
    flow into night instead, with a much simpler set of choices.
  - Morning, day and night should connect: hours, story and NPC schedules line up across
    them.
  - Open: how the shop-hours choice works (picked once, or adjusted during the day?), what
    the player does outside shop hours, what happens to the lab, zone runs and bed, how
    sleeping and "out too late" fit in, how NPC schedules and shop customers map onto the
    longer clock, and how old saves carry over (the clock stores its own day length).
  - Superseded: the earlier note that day length/pacing was out of scope. Dusk and dawn
    lighting is still not requested, though a continuous cycle will probably want it.
- Likely files: `src/game/clock.js`, `src/game/weather.js`, `src/ui/weather-fx.js`,
  `src/game/night-city.js`, `src/game/schedule.js`, `src/main.js` (day phases: morning,
  day, errands, night).

### Phase 31: People
- **Deeper character creator.** Decided scope:
  - More options in the existing tabs (hairstyles, hats, tops, faces, accessories).
  - New categories: body shapes and heights, pronouns, backstory and a name tag.
    Voice is not wanted.
  - "Maybe a bit more": extra ideas still to be named (see the open list below).
- **More refined character portraits.** Decided scope:
  - Higher-resolution portraits than today's 48x48, in the same pixel style.
  - Expressions: portraits that change with mood during conversations.
- Today: six creator tabs, 24x32 figures and 48x48 portraits, all drawn by
  `src/engine/figure-hd.js`, so all of this runs through that one drawing system. Existing
  saves and the NPC looks in `src/game/people.js` must keep working.
- Open: what the "bit more" is, how pronouns and backstory show up in dialogue, and which
  moods the expressions cover.
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

- Rename the bar from "The Brass Lantern" to **The Brass Mug**. This also resolves the
  clash with Lantern Park: the bar's short name "the Lantern" becomes "the Mug", and
  the town's Lantern Park keeps its name. Small change across the game text, data and
  changelog. Not built yet.

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
