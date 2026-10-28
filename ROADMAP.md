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
  - Decided: world effects are puddles, wet streets, snow cover that builds and melts, fog
    banks sitting over areas, wind moving trees, and lightning lighting up the map. Only
    the falling rain and snow streaks stay on the screen, kept light so they don't feel
    stuck to the camera.
- **A longer, continuous day and night.**
  - Decided: the full day and night is one cycle of about 15-20 minutes of real time
    (today a shop day is about ten minutes, 8 AM to 8 PM, and the night is separate).
    The 15-20 minutes is awake time only: sleep fast-forwards past it. That is about 18
    awake game hours at roughly one real minute per game hour, close to today's pace.
  - Decided: two clocks. The player's **day** runs from waking to sleeping and governs the
    sleep rules. The **calendar date** changes at midnight and governs rent, weekdays, the
    weekly closed day, birthdays, holidays and appraisal due dates. Shop hours that run past
    midnight count toward the date they started on.
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
  - Decided: a skipped night means the 8 PM-10 AM sleep window ended with no sleep taken in
    it (a cut-short sleep has its own, milder penalty).
  - Decided: a sleep is "cut short" when 10 AM arrives before the player has had 6 hours.
    Sleep ends at 10 AM, so anyone who starts sleeping after 4 AM wakes at 10 AM with
    under 6 hours and gets the slow-walking penalty until they next do a full sleep.
  - Decided: NPC schedules are adjusted to fit the new clock, so morning, day and night
    connect: hours, story and NPC schedules line up across them.
  - Decided: NPC comments after a collapse vary by relationship. Some NPCs are worried,
    some are annoyed, and some didn't notice. The higher the relationship, the more worried
    the NPC is.
  - Decided: outside shop hours the player is free to explore the city, visit NPCs, fish
    and so on.
  - Decided: at night, depending on the time of year, the player can choose to do night
    runs. (The length of the night changes with the season, so the choice is only there
    when the season allows it.)
  - Decided: while the shop is open, the NPCs from the city visit the shop, as well as the
    non-custom (generic) customers. The player can't leave the shop or go to the back
    room while it is open.
  - Decided: the player can adjust item prices on the shop floor, not only at the bench.
  - Decided: old saves do not carry over, because so much is being added. Phase 30 starts
    a new save version and old saves are not migrated (the game should say so clearly,
    and could offer to export the old save).
    Confirmed again after weighing the alternative: carrying over long-term progress (and
    resetting in-progress days, jobs and night runs) was considered and not chosen.
  - Decided: the basement lab and back room are open any time the shop is closed. Testing
    an item takes in-game time from the player's day. Reports stay on the bench until the
    job's due date (see Appraisals take up to a week).
  - Decided: "out too late" is replaced by the sleep rules. The 3:30 warning goes. Staying
    up just means skipping sleep and the three-night penalties. On the third night an NPC
    finds the player and takes them home, and that is the collapse scene.
  - Decided: shop traffic scales with the shop hours and the weather: busier at lunch and
    after work, quieter early and late, with weather changing it as today. City NPCs visit
    based on their schedule and relationship (a few a day) and generic customers fill the
    rest. Prices set on the floor change how likely a sale is.
  - Superseded: the earlier note that day length/pacing was out of scope. Dusk and dawn
    lighting is still not requested, though a continuous cycle will probably want it.
- **Appraisals take up to a week.** Today an owner collects at bedtime on the same day
  (`settleJobs` in `shared/js/shop.js`, called from `sleep` in `src/rules/actions.js`).
  Decided: appraisal jobs can take up to a week.
  - Decided: each job carries its own due date of 1 to 7 days (longer for harder items).
    Owners collect on the due day: paid if the report is filed, nothing if not. The player
    can file early and get paid at once. Jobs are shown on a list with the days left.
  - This replaces the earlier rule that unfiled reports are lost when the player sleeps.
    Reports now stay on the bench until their due day.
  - Decided: a job due on the shop's closed day is collected on the next open day. A job
    due on a collapse (missed) day gets one extra day, so a collapse doesn't also cost the
    job's pay.
  - To watch while building: the lab only being open when the shop is closed limits how
    much testing fits in a day.
- **Found while building: shop upgrades and hours.** Today each shop upgrade ("tier") sets how
  many hours the shop opens (the boarded-up shop 5 hours, the restored one 12) and how many
  customers come (`src/data/shop-tiers.js`). The new rule lets the player pick up to 8 hours.
  Open: should upgrades still cap the hours (for example 5 hours at the start, 8 at the top
  tier), or should the player have the full 8 hours from the start with upgrades only
  affecting customers and space?
- **Status: Phase 30 is fully specified. No open questions.** Suggested build order:
  1. New save version and the new clock (15-20 minute day, wake-to-sleep days, sleep).
  2. Shop hours slider, closed weekly day, shop locked while open, floor pricing.
  3. Remove the day/night menus: free time, night runs by season, lab when closed.
  4. NPC schedules and shop visitors on the new clock.
  5. Sleep consequences (slow walking, shop mistakes, screen effects, collapse).
  6. Climate model and weather in the world.
- **Also part of Phase 30 (found in the consistency check):**
  - Rebalance the economy. A shop day was 12 hours of customers; it is now at most 8, so
    rent, prices and customer rates need retuning.
  - Remove the woods ranger's "out too late" line in `src/game/night-city.js`, since that
    rule is replaced by the sleep rules.
  - Write the collapse comments per NPC: about three variants each (worried, annoyed,
    didn't notice).
  - Half a heart is 5 relationship points (the game uses ten points per heart).
  - Ground weather effects: Phase 30 builds the climate model, the world weather rules
    and simple placeholder ground effects. The finished puddles, wet streets and snow
    cover are drawn in Phase 32 on the new tiles, so they aren't built twice.
- Likely files: `src/game/clock.js`, `src/game/weather.js`, `src/ui/weather-fx.js`,
  `src/game/night-city.js`, `src/game/schedule.js`, `src/main.js` (day phases: morning,
  day, errands, night).

### Phase 31: People
- **Deeper character creator.** Decided scope:
  - More options in the existing tabs (hairstyles, hats, tops, faces, accessories).
  - New categories: body shapes and heights, pronouns, backstory and a name tag.
    Voice is not wanted.
  - Decided: new content in four areas: more clothes (tops, bottoms such as shorts and
    dresses, jackets, shoes), more accessories (hats, jewelry, bags, glasses, scarves),
    more looks (makeup, tattoos, piercings, scars, birthmarks, more skin and eye detail),
    and body shape and height beyond Slim, Regular and Broad. The exact item lists are
    drawn up while building, with the player's review.
  - Pronouns: the player picks their pronouns and NPCs refer to the player with them in
    dialogue. That is all it does.
  - Backstory: dropped for now (kept in the backlog below).
- **More refined character portraits.** Decided scope:
  - Higher-resolution portraits than today's 48x48, in the same pixel style.
  - Expressions: portraits that change with mood during conversations. Decided: 12 moods:
    neutral, happy, sad, annoyed, angry, upset, flirty, surprised, scared, embarrassed,
    smug and tired. Portraits are built from face parts (eyes, brows, mouth), so
    expressions can be drawn for everyone instead of hand-drawn per NPC. (To confirm in the
    code before building.)
  - Portrait size: default to double the current size (96x96), to be confirmed when
    building.
- Today: six creator tabs, 24x32 figures and 48x48 portraits, all drawn by
  `src/engine/figure-hd.js`, so all of this runs through that one drawing system. The
  NPC looks in `src/game/people.js` must keep working. (Old saves don't carry over from
  Phase 30 on, so no save migration is needed for the new creator.)
- **Status: Phase 31 is specified.** Item lists and portrait size are settled while
  building.
- Likely files: `src/ui/creator.js`, `src/ui/portraits.js`, `src/engine/figure.js`,
  `src/engine/figure-hd.js`, `src/game/people.js`.

### Phase 32: The city
- **Updated city look**, including streets and so on. Decided scope: new art for the
  existing town (buildings, streets, sidewalks in a more detailed look). The layout stays.
  Not selected: changing the layout itself.
- Decided style: richer pixel art plus lighting: glowing windows and lamps at night, wet
  street reflections in rain, long shadows at dusk. It pairs with Phase 30's weather and
  day cycle.
- Decided parts that get new art: buildings and facades, streets and sidewalks, props and
  clutter (lamps, benches, signs, cars, bins, fences, plants, posters), and seasonal looks
  (trees and ground change with the season: leaves, blossoms, snow, bare branches).
- The town is generated from rules, not drawn by hand, so this is mostly new tile art and
  generator rules.
- Also in Phase 32: the finished ground weather effects (puddles, wet streets, snow cover
  that builds and melts) drawn on the new tiles. Phase 30 only ships placeholders.
- **Status: Phase 32 is specified.**
- Likely files: `src/data/city.js`, `src/data/city-tiles.js`, `src/data/tiles.js`.

### Phase 33: The woods
- **Woods expansion to the north.** Decided scope: a big expansion (its own story,
  creatures, shops and night events), not just a small walkable area.
- Already in the code: a roped-off trail with a sign at the top of the last street west of
  the park gate, past Kessler Heights (`woods` in `src/data/city.js`), and "out too late"
  ranger dialogue for the woods (`src/game/night-city.js`). The town can open onto new
  areas off the map edge (`src/data/areas.js`, `src/game/edges.js`).
- Decided content: a story arc (characters and a payoff), new creatures (woodland
  cryptids and animals for night runs and the bestiary), shops and people (such as a
  ranger station, a cabin, a camp store or a hermit who trades), and night events and
  fishing (woods mysteries and a lake or stream).
- Decided layout: several connected areas (a trailhead, a forest, a lake, ruins and a cabin,
  joined by paths). The woods open through a story event that takes down the rope across the
  trail.
- Why after the city look: the new area should match it.
- Deferred on purpose: the story itself, the creature list, and who runs the shops. They
  will be designed closer to Phase 33, not now. Phases 30 to 32 don't depend on them.
- **Status: Phase 33 is specified except for the deferred content above.**

## Consistency check (done)

All four phases were re-read against each other. Resolved: awake-time day length, the two
clocks (player day versus calendar date), the skipped-night rule, due dates on the closed
day and on a collapse day, the ground-weather order, and the shop-income rebalance. No known
conflicts remain. Phases 30, 31 and 32 are ready to build; Phase 33's woods content is
deferred on purpose.

## Backlog (ideas not yet in a phase)

- Rename the bar from "The Brass Lantern" to **The Brass Mug**. This also resolves the
  clash with Lantern Park: the bar's short name "the Lantern" becomes "the Mug", and
  the town's Lantern Park keeps its name. Small change across the game text, data and
  changelog. Not built yet.

- Character backstory (dropped from Phase 31 for now). Options discussed: pick an origin from
  a few presets that NPCs reference, or a free-text backstory shown on the player's profile.

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
