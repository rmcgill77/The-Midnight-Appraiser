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
  - Decided: the climate model should be fairly detailed: temperature, humidity, wind and
    fronts, with the season setting the climate.
  - Open: which effects stay as a screen overlay (falling rain/snow) and which become
    ground effects.
- **A longer, continuous day and night.**
  - Decided: the full day and night is one cycle of about 15-20 minutes of real time
    (today a shop day is about ten minutes, 8 AM to 8 PM, and the night is separate).
  - Decided: the player chooses a set timeframe during the day for the shop to be open.
  - Decided: a day starts and ends when the player chooses to sleep. The player can skip
    sleep and go straight into the next day, but suffers consequences, which get worse
    each night in a row:
    - First night skipped: the player moves slower, and makes mistakes in the shop.
    - Second night skipped: parts of the screen change to mess with the player.
    - Third night skipped: the player is forced to collapse and miss a whole day.
  - Decided: the player must get at least 6 hours of sleep a day, whenever they choose to
    take it. A full sleep resets the skipped-night count.
  - Decided: sleep fast-forwards time. It is only allowed between 8 PM and 10 AM, and only
    once per 24-hour day.
  - Decided: all of these screen effects are wanted for the second stage: blur, a tilt,
    flickering or dimming, ghost images, false characters at the edge of view, and muffled
    sound.
  - Decided: a missed day (the third-night collapse) costs:
    - relationship points with NPCs, if the player has any: half a heart lost per missed day;
    - rent is still due on the same day as usual;
    - no night run, and no money from opening the shop that day (and so on);
    - NPCs comment on it when the player passes out and misses a day.
  - Decided: shop hours are set with a slider. The player can set each day separately, or
    choose to use the same hours every day, up to 8 hours total, at any time of the day.
    The shop must be closed at least one day a week, and the player picks the closed day.
  - Decided: sleep that is cut short (for example it starts late and hits the 10 AM
    limit) gives a minor penalty: slow walking until the player performs a full sleep.
    This is separate from, and milder than, the skipped-night stages above.
  - Decided: a day starts when the player wakes up and ends when they go to sleep. If the
    player goes to sleep at exactly 8 PM, the earliest they can wake is 2 AM (6 hours),
    and then they can start their day or sleep a little longer. The 6 hours of sleep per
    24-hour day rule has to be followed either way.
  - Decided: a skipped night means a day with no sleep at all (a cut-short sleep has its
    own, milder penalty).
  - Open: what counts as a sleep being "cut short" if the player can't wake before 6
    hours (for example it hits the 10 AM limit before 6 hours, or the player is woken by
    something, or the player is allowed to wake early and takes the penalty).
  - Open: whether the player can sleep past 10 AM when they started after 4 AM.
  - Open: how the NPC comments vary after a collapse.
  - Decided: NPC schedules are adjusted to fit the new clock, so morning, day and night
    connect: hours, story and NPC schedules line up across them.
  - Open: what the player does outside shop hours, what happens to the lab and zone runs,
    how "out too late" fits with a day that ends at sleep, how shop customers map onto the
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
  - A bit more: extra additions to the creator: more clothes, accessories, looks and
    similar. Exact list still to be written.
  - Pronouns: the player picks their pronouns and NPCs refer to the player with them in
    dialogue. That is all it does.
  - Backstory: undecided. Keep it parked until it's decided.
- **More refined character portraits.** Decided scope:
  - Higher-resolution portraits than today's 48x48, in the same pixel style.
  - Expressions: portraits that change with mood during conversations, over a wide range
    of moods: happy, sad, annoyed, angry, upset, flirty and more.
- Today: six creator tabs, 24x32 figures and 48x48 portraits, all drawn by
  `src/engine/figure-hd.js`, so all of this runs through that one drawing system. Existing
  saves and the NPC looks in `src/game/people.js` must keep working.
- Open: the exact list of new clothes, accessories and looks, whether to keep backstory,
  and the full list of moods. Each NPC portrait would need every mood drawn.
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
