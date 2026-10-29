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
- **Shop upgrades and hours.** Today each shop upgrade ("tier") sets how many hours the shop
  opens (the boarded-up shop 5 hours, the restored one 12) and how many customers come
  (`src/data/shop-tiers.js`). Decided: the player has the full 8 hours from the start.
  Upgrades no longer cap the hours; they only affect customers and space.
- **Decided while building (wiring the clock in):**
  - The shop opens when the player flips the OPEN sign inside the shop hours. From then until
    closing time (or closing early) the player is locked in the shop. If they never open, no
    customers come and the hours are wasted.
  - At night the front door gives the night options (walk the city, the zones, the night shop),
    only when the season and the clock allow them. The lab is the basement door.
  - Rollout: the new flow is built beside the old one behind a switch (`?continuous=1` for
    testing). The live game stays on the old flow until the new one is finished and tested,
    then the switch is flipped and the old code removed. The save cutoff (`FIRST_SUPPORTED`)
    is raised at the same time.
  - Architecture: a `ContinuousClock` stands in for the old `Clock` (same members, backed by
    `DayCycle` and `ShopHours`), so most of the old code keeps working unchanged. The calendar
    date rolling over at midnight and sleeping are separated in the sim (today
    `Calendar.sleep` does both).
- **Economy rebalance (built, behind the continuous switch).** The continuous day lets one player do
  the shop, errands, the lab and a night run in a single day, where the original made them one choice
  each. To keep the pace the original had, the continuous day keeps its daily limits:
  - errands spend the original's daily budget of errand hours (6, plus ride upgrades), refilled when
    the player wakes, no matter how many hours of free time there are;
  - one night run a night (a city walk or a zone run), refreshed with each night;
  - bench time and energy still reset at waking, as before.
  Rent, prices, customer counts per shop tier and wages are unchanged: a full eight-hour shift brings
  the same crowd the old twelve-hour day did, and a shorter or late shift scales it down.
  Not play-tested over weeks: tune these numbers once the new flow is live and people have played it.
- **Trying the new flow (preview).** The new day and night is on the live site behind a switch: the
  title screen has "Try the new day and night (preview)", which opens the same game with `?continuous=1`
  (its saves are kept apart from the normal ones), and "Back to the normal game" returns. Flipping it
  on for everyone means making it the default, raising `FIRST_SUPPORTED` in `src/game/save.js` to the
  new save version, adding a changelog entry, bumping the version, and removing the old day loop.
- **Where Phase 30 stands (playtest stage).** The new day and night is built and on the live site as
  a preview (title screen, "Try the new day and night"). The owner's first play says it works.
  Decided: play it more before making it the real game, and fix what feels off first.
  **Shipped as version 3.0.0:** the new day and night is the game. Save version 6 is the first
  supported; preview saves were copied into free slots; the preview switch and the classic-flow
  tests are gone. The `CONTINUOUS` switch is gone from `src/main.js`. Still in the code, unused or
  barely used: `endDay` (the old end-of-day flow), `A.sleep` and the old `Clock` in
  `src/game/clock.js`; remove them once nothing in the shop or the sim needs them.
  Update: the leftovers below are now built (wind drives the wind sound, each friend has their own
  collapse comments, townsfolk move between parts of the day, the four-in-the-morning line is
  fixed). Economy numbers stay as they are until real play says otherwise.
  Left over, none of it needed for the flow itself: wind affecting sound, per-NPC collapse comments
  (today generic lines by how close the friend is), where NPCs stand across the longer day, the
  "found and taken home" line that still says four in the morning, and tuning the economy numbers
  after real play. Then: make it the default, raise the save cutoff, changelog and version, remove
  the old day loop.
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
- **Status: Phase 31 is in progress.** Item lists and portrait size are settled while
  building. Built: 31a pronouns (creator Body tab; `{they}`-style tokens in any spoken line,
  `src/game/pronouns.js`; stored as optional `look.pronouns`). 31b moods (12 faces via
  `paintPortrait(look, { mood })`; a speech line can carry `mood`). 31c step 1 (body, height, face
  details; tattoos cut): 4 new builds, height (Average/Tall/Short/Very tall), skin details,
  eye shapes, brows, marks, beards, eye details, makeup, piercings. 31c step 2 (10 hairstyles, 10 hats, 6 hair colors, hair dye
  details). 31c step 3 (10 tops, 7 bottoms, shoes, 5 patterns). 31c step 4 (14 accessories, second accessory slot). 31c is done. 31d (first pass): portraits are shown at 96x96, smoothed up from the 48x48 drawing with Scale2x; a true redraw at 96 is optional later. Phase 31 content is otherwise done.
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
- **Decided (scope pass with the owner):** build lighting first; keep 16x16 tiles with richer
  shading (layout, collision and sprites unchanged); everything drawn in code from rules. Order:
  1. **Lighting (32a, built):** the sky follows the real clock and the season (`game/skylight.js`:
     rose dawn, golden afternoon, violet dusk, dark), lit windows glow at night, buildings, trees,
     lamps and people throw sun shadows (long at the ends of the day, short at noon, none in the
     dark or under cloud), wet streets reflect lamps and the dusk sky.
  2. **Streets and sidewalks (32b, built):** curbs, gutters and drains, dashed lane lines, dropped
     kerbs with yellow strips, manholes, cracks, patches, oil stains, litter by season.
     Then (32b, owner's request after play): **roads that never just end** - every east-west
     street crosses the river on a bridge, a road runs down both sides and along the top of town,
     a roundabout (Garden Street x the street at y 50) and three turning circles (true pixel
     circles), rounded road corners. Traffic (cars, scooters, bikes) was built and then **removed at the owner's request**: the
     streets are for people on foot, the player's own ride aside. A pavement strip is now laid beside
     every curb whatever is under it, so grass and gravel never touch the road.
     Roads are now painted as **true curves** (owner feedback: tile staircases read as 90-degree
     bends): `game/street-net.js` holds every street's smooth centre line, and `decorateCity`
     paints asphalt, curbs, gutters, dashed lane lines and junction rounding from each pixel's
     distance to the nearest street (a soft minimum rounds every junction). Traffic keeps to the
     right-hand lane of those curves. The layout is the calmer one (no diagonal connectors).
  3. **Buildings and facades (32c, first pass built, `data/building-dress.js`):** roofs get two
     slopes with a ridge, staggered shingles, shaded edges, chimneys, vents, air conditioners,
     aerials and (in the Narrows) water tanks; fronts get shutters (Westside, Eastgate), flower
     boxes, fire escapes and air conditioners (Narrows, Harbour), posters, drainpipes, a dark
     foot and a shadow on the pavement, and a stoop at every house door. More per-district
     character is built too: Kessler Heights halls have pilasters, dentil cornices and arches;
     Harbour warehouses have roll-up doors, stencilled numbers and loading docks; shop fronts
     have blade signs; Eastgate has striped awnings; the Narrows have washing lines.
  4. **Props and clutter (32d, built, `data/street-props.js`):** fire hydrants, mail boxes,
     newspaper boxes, litter bins and bike racks at the kerb, parking meters along Old Market,
     sandwich boards outside shops, pots by house doors, bags and boxes in the alleys. Painted on
     the map (not solid), placed by tile hash. 5. **Seasonal looks (32e, built, `data/season-dress.js`):** leaf piles and pumpkins in autumn,
     blossom drift and daisies in spring, dappled shade and wildflowers in summer, snow banked
     at trunks, icicles, door wreaths and frosted fences in winter.
  6. **Finished ground weather (32f, built, `ui/ground-fx.js`):** snow is soft drifts that run on
     from tile to tile, build from the hollows and melt away patchily (nine depths), roads are
     worn clear down the middle with banks at the curbs; puddles are irregular pools in the
     gutters mirroring the sky, with ripples in the rain. Phase 32 is complete except for any
     polish after play. Before Phase 33,
     each as its own slice, with the finished puddles, wet streets and snow drawn on the new tiles.
- **Status: Phase 32 is built (32a-32f); polish after play remains.**
- Likely files: `src/data/city.js`, `src/data/city-tiles.js`, `src/data/tiles.js`.

### Refinement pass (after Phase 32, owner's order: characters, roads, look)
- **Characters (done):** the walking figure now has real drawings for the ten newer hairstyles and ten
  newer hats (no more borrowing a near neighbour); the Cowboy hat (creased crown, curled brim) and
  the Headscarf (tied, knot and tails) were redrawn on portraits; portraits at 96x96 now get a
  light across the face, catchlights and fine hair strands on top of the smoothed 48x48 drawing.
  Still smoothed, not redrawn: a full 96x96 redraw of every part.
- **Roads (done):** lane lines already follow every bend (each street is one smooth curve, and they break only at junctions); the roundabout and turning circles now have a pavement band that follows the circle instead of tile-shaped apron squares; zebra crossings across every arm of every junction.
- **Look (done):** warehouse bay numbers sit on painted plates on about one warehouse in three; night window glow has a wider halo and light spilling onto the pavement; evening sun shadows are softer (lower strength, shorter, fading earlier).

### Phase 33: The woods (design settled with the owner; nothing built yet)
**Decisions (owner):** tone is a blend of folk horror (the forest), a ceremonial lodge (the dungeon) and a
hedge-witch (the ally in the cabin); the woods unlock through a mix of an investigation chain and friendships,
with the friendships focused on a **new Town Hall and its staff, including a new Mayor**; the threat is a
**surviving order**; and for now this is **design only**: nothing here is built until the owner says so.

Why after the city look: the woods should match it. Already in the code: the roped-off trail with a sign
(`woods` in `src/data/city.js`, rope tiles `%` and `&`), a woods ranger line in `src/game/night-city.js`, and a way
to open areas off the map edge (`src/data/areas.js`, `src/game/edges.js`).

#### The story in one page
- Long ago the **Society of the Still Hour** held the woods north of town. They tried to *appraise the unseen*:
  to measure, price and bind what lives in the dark. Their instrument was **the Eye**, a loupe cut so that the
  holder sees what hides. It is the player's own loupe (the one on the cord, and the eye on the app icon).
- Something went wrong at the **Standing Ring** one midwinter. The town sealed the trail "by order of the council"
  and told a smaller story. The Society went underground, and a few of its members hold seats in town to this day.
- **The player's parents** were members, left, and took the Eye with them. The shop, the pickups and the inspection
  were all ways of staying hidden and keeping it out of the Society's hands.
- The Society wants the Eye back because it is the key to the **inner door of the Lodge**. The woods open
  because the town (the Mayor above all) has decided, for its own reasons, that it is time.
- **Payoff, three endings the player steers towards:** *seal* the Ring (the Mayor's way: the order is contained,
  nothing is told), *break* the Society (expose it to the Office and the town, at a cost to the people who lied for
  years), or *take the seat* (become the Warden, with the power and the weight). Which one is open depends on
  whom the player trusted.

#### The Town Hall (a new building, in the town before the woods open)
A civic building in Old Market, facing the square, open weekdays. It is useful on its own (permits, records, the
council's weekly notices) and it is where the woods story is played out with people.
- **The Mayor, Constance Hargrove** (woman): warm, tired, hospitable. Publicly the face of the town; secretly the
  Society's current **Warden**, who wants it contained. Ally or antagonist depending on the player.
- **The Archivist, Theo Maddox** (man): nervous, precise, keeps the council minutes and the old maps. Finds the
  parents' file. Frightened of what he has read.
- **Councillor Ines Valdez** (woman): a sharp-tongued lawyer who chairs planning. Wants the woods developed and
  the "superstition" ended; a sceptic whose mind can be changed, and the source of the **permit and the hearing**.
- **Bram, the caretaker** (man): old, keeps the building's keys and the town's folklore; knows the trail's
  *rules* (never go in at dusk, salt the threshold, don't answer the third call). Gives the **gate key**.
All four use the existing relationship system (hearts, gifts, likes and dislikes, birthdays, schedules,
collapse reactions) and get looks from the creator, with pronouns used for the player as elsewhere.

#### The lead-up (the woods open in chapters, so it feels like a whole new set of places)
0. **Seeds (from the start of Phase 33):** the rope sign's notice changes each week; odd items arrive carved with
   the same sigil; a customer pays in pressed leaves; the Town Hall opens its doors.
1. **The Marks.** Six *marks* are hidden around town, each shown only under the UV lamp: an item at the shop, a
   headstone in Mike's yard, a bottle washed up on Kip's beach, the carved bar top at the Lantern, a page in Ms.
   Achterberg's special collection, and one on a night-run sight. Each fills in a page of a **Pattern** in a
   journal. Finding marks is investigation; understanding them needs the people below.
2. **The Vouching (the friendship gates, all at the Town Hall).**
   - Theo, 3 hearts and at least 3 marks found: the minutes of the closing, the old maps, the parents' file.
   - Bram, 4 hearts: the gate key, and the rules of the trail.
   - Ines, 3 hearts and the file in hand: she calls a **public hearing** on reopening the trail (a scheduled evening).
   - Constance, 5 hearts and the other three: her blessing, and, if the player's choices say so, her confession.
3. **The Hearing.** An evening event at the Town Hall. Who spoke for the player, and what the marks showed, decides
   how the vote goes and what the Mayor reveals.
4. **The Opening Night.** On the next dark moon (game's moon calendar) the rope comes down at the trailhead, with
   a short scene. Only the first area opens.
5. **Opening in layers.** Each further area needs something from the one before (a key, a charm, a name).

#### The areas (several connected places joined by paths)
- **The Trailhead and the Watch Post:** the ranger station, abandoned; the ranger's logbooks; the way in. The
  first shop is here.
- **The Thornwood:** forest of hanging charms and bone chimes, where the paths slowly rearrange; salt lines and
  warding stones keep it safe if you carry or place them.
- **The Standing Ring:** a stone circle, the heart of the old rite; where the midwinter went wrong.
- **The Mirror Lake:** a still lake that reflects things that are not there. Fishing with odd catches (and some that
  are not fish).
- **The Lodge:** the Society's ruined house. The dungeon: the library, the vestry, the cellar, and the inner door
  that only the Eye opens.
- **The Cabin:** a hedge-witch's home deep in the trees, a safe place with a hearth and a trading table.

#### People and shops in the woods
- **Ranger Dale Whitlock** (man): the Watch Post's last ranger, a decent man haunted by one night.
- **Hester Fenn** (woman), the hedge-witch of the Cabin: herbs, salt, candles, hex bags and charms; trades for what
  the forest gives back. The woods' **shop** and the ally who teaches wards.
- **The Brethren** (hooded, in the Lodge): former members who never left. Some can be reasoned with.
- Members of the Society in town, revealed through the story and not as a list: the Mayor, and the player gets to
  decide whether to trust the Professor, Mr. Pryce and the library.

#### New things for the player (rules and creatures)
- **Wards:** salt, charms and candles protect a night run in the woods (a ward meter that falls with each strange
  thing and refills at the Cabin). New ritual-component items for the shop's bench and the appraisal system; the UV
  lamp already reveals sigils.
- **Moon rites:** some events and creatures depend on the moon's phase (the game already has a moon calendar).
- **Creatures (for the night runs and the bestiary):** *Corpse-candles* (wisps that lead you the wrong way),
  *Black Dogs* (the Hollow's hounds), *Effigy Men* (straw and wicker walkers), *The Salt Wives* (figures in white who
  stand at the threshold lines), *The Horned Judge* (a stag-headed presence at the Ring; appears at the finale),
  *Moths of the Still Hour* (a swarm that dims lamps), *The Drowned* (what the Mirror Lake gives back), and the
  Brethren themselves.
- **The Eye:** the player's loupe gains a use in the woods: it shows what is hidden, and at the inner door of the
  Lodge it is the key.

#### Suggested build order (when the owner decides to build)
33a Town Hall: the building, the four NPCs, hours and the relationship track. 33b The Marks, the UV reveals and the
journal's Pattern page. 33c The Vouching, the Hearing and the Opening Night. 33d the Trailhead, the Watch Post and the
Thornwood, with the first creatures and Hester's table. 33e the creature set and the ward rules. 33f the Ring, the
Lake, the Lodge and the Cabin. 33g the three endings. Each slice can be its own pull request, as in Phases 30-32.

#### Still open (to decide before building)
Whether the Town Hall NPCs' schedules follow the long day and whether the council meets on a fixed weekday; how hard
the Hearing should be to fail; what exactly the endings change in the town afterwards; the final names and looks of
the Brethren and the Horned Judge; whether Mr. Pryce, Professor Okoye or Ms. Achterberg is a member of the Society.

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
