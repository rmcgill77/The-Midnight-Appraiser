// The Midnight Appraiser: Phase 10, a main menu with your saves, and ready to install and play offline.
// Second Sight Pawn's own simulation (the "sim") decides every number. This file
// runs the world around it: rooms, the player, the day clock, customers on the
// floor, the basement stations and the night.

import { CONFIG } from './config.js';
import { PauseStack } from './engine/pause.js';
import { createLoop } from './engine/loop.js';
import { Renderer } from './engine/renderer.js';
import { Camera } from './engine/camera.js';
import { TileMap } from './engine/tilemap.js';
import { Input } from './engine/input.js';
import { Orientation } from './engine/orientation.js';
import { RNG } from './engine/rng.js';
import { makeCanvas } from './engine/sprites.js';
import { buildTileset, buildShopTiles, buildLabTiles, buildGrowthTiles, buildBarTiles, buildPlaceTiles, buildHomeTiles, buildStudioTiles, tierTileset, TC } from './data/tiles.js';
import { ROOMS, BAR, PLACE_ROOMS, PLACE_OF_ROOM } from './data/rooms.js';
import { EXTRA_PLACES, extraPlace, WALK_INS, mapIcon, TACKLE } from './data/places.js';
import { RoomCrowd, peopleIn } from './game/bar.js';
import { regularsAt, titleOf, dayOffSpot, streetWalkers, spouseOf, parkPeople, beachPeople, CUSTOM_NPCS } from './data/townsfolk.js';
import * as FISH from './game/fishing.js';
import { openTackle, openTackleBox, fishArt } from './ui/fishing-panels.js';
import { drawLine as drawFishLine, drawReel } from './ui/fishing-art.js';
import { birthdaysAhead, isBirthdayToday, birthdayThanks, whenText } from './data/birthdays.js';
import * as REL from './game/relationships.js';
import { RELATIONSHIPS } from './data/relationships.js';
import * as T from './game/talk.js';
import { convoFor, KEEPER_TALK, EXTRA_LINES, extraName, kristenGuard } from './data/conversations.js';
import { shopTierRoom, shopSpan, hoursText as shopHours } from './data/shop-tiers.js';
import { ContinuousClock } from './game/continuous-clock.js';
import { ShopHours } from './game/shophours.js';
import { openHoursPanel } from './ui/hours-panel.js';
import * as NW from './game/nightwindow.js';
import { skylight } from './game/skylight.js';
import { drawSunShadows, drawFigureShadow } from './ui/sun-shadows.js';
import * as EX from './game/exhaustion.js';
import * as AP from './game/appraisals.js';
import * as TR from './game/traffic.js';
import * as VS from './game/visits.js';
import { SleepFx } from './ui/sleepfx.js';
import { Player } from './game/player.js';
import { Crowd } from './game/customers.js';
import { createStorage } from './game/storage.js';
import { SaveSlots } from './game/save.js';
import { loadSettings, saveSettings } from './game/settings.js';
import { S, newSim, restoreSim, simRules, openShopDay, takeOpenedCases } from './rules/index.js';
import * as A from './rules/actions.js';
import { UI, el } from './ui/ui.js';
import { drawItem, drawBubble, drawPatience, alignColor, iconSvg, itemArt } from './ui/glyphs.js';
import { openSeller, openTill, openDisplay, newsBody, money, openAppraiser, openInspector, cleanDisplays, openRenovation, openDecor } from './ui/shop-panels.js';
import { layoutRoomOf, layoutRoom, defaultLayout } from './game/shop-layout.js';
import { Arranger, pieceName } from './game/arranger.js';
import { openMagic } from './ui/magic-panels.js';
import { openCreator } from './ui/creator.js';
import { decorDef, DECOR } from './data/decor.js';
import { APARTMENT } from './data/home.js';
import { homeState, homeLayout, homeRoom, homeKit, comfortOf, sleepStress, wellRested, buyForHome, homeBuyBlocker, homeOwned, priceFor, designAdvice, ERIN_DISCOUNT } from './game/home.js';
import { runOpening, runMorning, openStanding, runEnding } from './ui/story-panels.js';
import * as Y from './rules/year.js';
import * as CAL from './game/calendar.js';
import { ART } from './data/art.js';
import { loadArt, applyTileArt, artCount, problems as artProblems } from './engine/art.js';
import { AREAS, isArea } from './data/areas.js';
import { holidayOn, decorOn, fireworksOn } from './data/holidays.js';
import { crossing, arrival } from './game/edges.js';
import { openBench, openWorkshop, openDesk, openCells, openGear } from './ui/lab-panels.js';
import { buildCityLayout, CITY_WALKABLE, coastAt } from './data/city.js';
import { buildCityTiles, decorateCity, decorateArea } from './data/city-tiles.js';
import { Pedestrians } from './game/pedestrians.js';
import * as CR from './rules/city.js';
import { openLocation, openCityMap, hoursText } from './ui/city-panels.js';
import { Minimap } from './ui/minimap.js';
import { vehicleOf, hasVehicle, keepsOff, BUS_STOPS, BUS_MINUTES, busToday, busCost, passRides } from './game/rides.js';
import { drawRideBack, drawRideFront, SEAT_RISE } from './ui/ride-art.js';
import { weatherOn, TYPES as WEATHER, ORDER as WEATHER_ORDER, streetPace, forecastLine, seasonOf, setWeatherOverride, weatherOverride, setClimateProvider } from './game/weather.js';
import * as CLIM from './game/climate.js';
import * as FC from './game/forecast.js';
import { Ground } from './game/ground.js';
import { drawGroundWeather } from './ui/ground-fx.js';
import { WeatherFX, weatherIconSvg } from './ui/weather-fx.js';
import { EVENTS, EVENT_CONVOS, rollHour, startEvent, endEvent, eventsState, pickpocketTakes, PICKPOCKET_GRACE } from './game/city-events.js';
import { ZoneRunner, ZONE_CELL } from './game/zone-runner.js';
import * as N from './rules/night.js';
import { openZones, openFight, openBag, openRunEnd } from './ui/night-panels.js';
import { openCaseFiles } from './ui/case-panels.js';
import { GameAudio, sceneFor } from './game/audio.js';
import { cue } from './rules/cues.js';
import { freshShop, shopState, stageOf, applyRenovation, nextStage } from './game/shop-growth.js';
import { Guide, GUIDE_NAME } from './game/guide.js';
import { Speech } from './ui/speech.js';
import { Walkthrough, textOnce } from './game/walkthrough.js';
import { godState, applyGod, anyOn, checkPassword, FLAGS as GOD_FLAGS } from './game/god.js';
import { CHANGELOG, since as changesSince } from './data/changelog.js';
import * as NC from './game/night-city.js';
import * as MOON from './game/moon.js';
import { freshAttention, stepAttention, jolt } from './game/attention.js';
import { NIGHT_TALK } from './data/night-talk.js';
import * as NS from './rules/night-shop.js';
import * as NART from './ui/night-art.js';
import * as G from './game/graves.js';
import { CEMETERY, GEAR, RELICS } from './data/cemetery.js';
import { makeHaunt, stepHaunts, HAUNTS } from './game/haunts.js';
import * as BN from './game/beach-night.js';
import { freshStaff, staffState, onStaff, roleOpen, payroll, payrollNews, wagesDue, StaffFloor } from './game/staff.js';
import { ROLES, ROLE_ORDER } from './data/staff.js';
import { drawStorefront, drawComforts } from './ui/draw-art.js';
import { CLASSIC_LOOK } from './engine/figure.js';
import { HDSprites, HD_OFFSET, KO_OFFSET, frameOf, tickBudget } from './engine/figure-hd.js';
import { portraitFor, setPlayerPortrait, setPassingLook, faceRow } from './ui/portraits.js';
import { identityState, applyBackground, hasEdge, softenSeller } from './game/identity.js';
import { backgroundOf } from './data/backgrounds.js';
import { dress, lookKey, lookFor, SIGNATURE, spritesFor, offDutyLook } from './game/people.js';
import { statusAt, closedAllDay, weekdayName } from './game/schedule.js';
import { SCHEDULES } from './data/schedules.js';
import { drawDoorSign } from './ui/draw-art.js';
import { freshDraw, drawState, extrasToday, comfortMods, adOn, adBooked, regulars, setVisitBoost } from './game/marketing.js';

const layer = document.getElementById('game');
const canvas = document.getElementById('view');
let sleepFx = null;   // continuous mode only: what the second skipped night does to the screen
// Phase 30: the continuous day and night, still being built. It's switched on with ?continuous=1
// and keeps its saves apart (tma-cont.*), so the real game and its saves are untouched.
const pause = new PauseStack();
const storage = createStorage();
const slots = new SaveSlots(storage, CONFIG.saveSlots);
slots.adoptPreviewSaves();
const settings = loadSettings(storage);
const orientation = new Orientation(layer);
orientation.set(settings.orientation);
const renderer = new Renderer(canvas, CONFIG);
renderer.view = settings.viewSize;
document.documentElement.dataset.text = settings.textSize;
const audio = new GameAudio(settings);
const god = godState(settings);   // Phase 18: the hidden cheat menu's switches (game/god.js)
const finePointer = !!globalThis.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
document.documentElement.classList.toggle('fine-pointer', finePointer);
const camera = new Camera();
// v2.1: hand-made art, if any is listed (data/art.js), before the maps are built.
await loadArt(ART);
const tileset = buildStudioTiles(buildHomeTiles(buildPlaceTiles(buildBarTiles(buildGrowthTiles(buildLabTiles(buildShopTiles(buildTileset())))))));
applyTileArt(tileset, 'base');
const maps = Object.fromEntries(Object.values(ROOMS).map(r => { const m = new TileMap(r, tileset, CONFIG.tile); m.bake(); return [r.id, m]; }));

// The shop floor changes with each renovation stage and (Phase 24) wherever you've moved
// things; each layout bakes once, when first seen.
const shopMaps = new Map();
function shopMap(room) {
  const k = room.layoutKey;
  if (!shopMaps.has(k)) {
    if (shopMaps.size > 24) shopMaps.clear();
    const m = new TileMap(room, tierTileset(tileset, room.look), CONFIG.tile); m.bake(); shopMaps.set(k, m);
  }
  return shopMaps.get(k);
}
const shopRoom = () => maps.shop.room;
function syncShop() { maps.shop = shopMap(layoutRoomOf(world)); crowd?.setRoom?.(shopRoom(), maps.shop); }
// Phase 27: your apartment, with whatever furniture you've put out (game/home.js).
const homeMaps = new Map();
function syncHome() {
  const room = homeRoom(homeLayout(world)), k = room.layoutKey;
  if (!homeMaps.has(k)) { if (homeMaps.size > 16) homeMaps.clear(); const m = new TileMap(room, tierTileset(tileset, 'apartment'), CONFIG.tile); m.bake(); homeMaps.set(k, m); }
  maps.apartment = homeMaps.get(k);
}

// The city, laid out from the original's districts and locations.
const cityLayout = buildCityLayout(S.DATA, EXTRA_PLACES, { stops: BUS_STOPS });
const cityTiles = buildCityTiles();
applyTileArt(cityTiles, 'city');
let tileSeason = null;   // set by refreshSeason() once a game is loaded
const CITY_ROOM = { id: 'city', name: 'The City', rows: cityLayout.rows, spawn: cityLayout.spawn, interactions: { loc: { label: 'Go in', panel: 'loc' }, bus: { label: 'Bus', panel: 'bus' } } };
CITY_ROOM.decorate = decorateCity(cityLayout, S.DATA, cityTiles, EXTRA_PLACES);
// v2.2: the gate at the top of the street north of the square opens onto Lantern Park.
CITY_ROOM.edges = { north: { to: 'park', from: cityLayout.gate.x0, until: cityLayout.gate.x1, shift: AREAS.park.edges.south.shift * -1 } };
AREAS.park.decorate = decorateArea(AREAS.park);
// v2.3: the boardwalk at the bottom of the harbor runs down to the beach.
CITY_ROOM.edges.south = { to: 'beach', from: cityLayout.beach.x0, until: cityLayout.beach.x1, shift: AREAS.beach.edges.north.shift * -1 };
AREAS.beach.decorate = decorateCity({ locs: { tackle: AREAS.beach.tackle }, plaza: null, gate: null }, S.DATA, cityTiles, [TACKLE]);
maps.city = new TileMap(CITY_ROOM, cityTiles, CONFIG.tile); maps.city.bake();
// Phase 20: the Brass Lantern (the Lamplighter until Phase 24), a bar off the street, with its own floor and walls.
// Phase 21: five more (the Owl Diner, the Bijou, Second Hand Rose, St. Brigid's, and the
// library's reading room). Each has its own floor and walls.
for (const r of Object.values(PLACE_ROOMS)) { maps[r.id] = new TileMap(r, tierTileset(tileset, r.look), CONFIG.tile); maps[r.id].bake(); }
// v2.1: outdoor areas (data/areas.js), drawn with the city's tiles unless they say otherwise.
for (const r of Object.values(AREAS)) { maps[r.id] = new TileMap(r, r.tiles === 'city' ? cityTiles : tileset, CONFIG.tile); maps[r.id].bake(); }
wrapCemetery();
const ALL_ROOMS = { ...ROOMS, city: CITY_ROOM, ...PLACE_ROOMS, apartment: APARTMENT, ...AREAS };
// Inside one of the places off the street; out on the town (the street, or inside one).
const inPlace = () => !!PLACE_ROOMS[world?.room];
const inArea = () => isArea(world?.room);   // v2.1: the outdoor areas joined by their edges
const outdoors = () => world.room === 'city' || inArea();
const inTown = () => world.room === 'city' || inPlace() || inArea();
// Where a shopkeeper is spending today off (a walk-in place, or null: out on the street).
// Phase 30: the day is long, so the townsfolk move about it: where they are depends on the part of the day.
const dayPart = () => { const m = clock.minute; return m < 12 * 60 ? 0 : m < 17 * 60 ? 1 : m < 21 * 60 ? 2 : 3; };
const offDayPlace = name => dayOffSpot(name, st?.day ?? 1, st?.seed ?? 0, id => (SCHEDULES[id] ? placeStatus(id).open : true), dayPart());
// Who's in the place you're in (rebuilt each time you walk in, and on loading a save).
let placeCrowd = null, crowdPart = 0;
function syncPlaceCrowd() {
  if (AREAS[world.room]?.spots) { placeCrowd = areaCrowd(AREAS[world.room]); return; }
  const room = PLACE_ROOMS[world.room];
  if (!room) { placeCrowd = null; return; }
  const placeId = PLACE_OF_ROOM[room.id];
  const isOpen = id => (id === 'street' ? magicianOutside() : SCHEDULES[id] ? placeStatus(id).open : true);
  const keeper = SCHEDULES[placeId] && placeStatus(placeId).open ? SCHEDULES[placeId].keeper : null;
  const taken = new Set([playerKey(), ...SIGNATURE_KEYS]);
  // Shopkeepers on their day off (Phase 22), at the place they like.
  const offHere = Object.entries(SCHEDULES).filter(([id, s]) => placeStatus(id).why === 'off' && offDayPlace(s.keeper) === placeId).map(([, s]) => s.keeper);
  const walking = new Set([...walkersToday().map(n => n.name), ...parkToday().names, ...beachToday().names]);   // out on the street (Phase 29) or in the park (v2.2) instead
  // Ryan at lunch with Erin: at her shop, off duty, and not at the Lantern.
  const lunch = ryanAtLunch();
  if (lunch) walking.add('Ryan');
  const regs = [...regularsAt(placeId, isOpen, walking).map(n => n.name), ...offHere, ...(lunch && placeId === 'brush' ? ['Ryan'] : [])];
  lunchWas = lunch;
  placeCrowd = new RoomCrowd(room, peopleIn(room, { keeper, regulars: regs, looks: lunch ? { Ryan: offDutyLook('Ryan') } : {} }), { extras: room.extras ?? [], seed: `${st?.seed ?? 0}:${st?.day ?? 1}`, taken });
}
const HOME_DOOR = cityLayout.locs[S.DATA.locations.find(l => l.home)?.id ?? 'shop'].door;
// A shop day keeps the stage's hours: short at first, the full 8 AM to 8 PM once restored.
const shopDaySpan = () => shopSpan(shopState(world).tier);
const NIGHT_SPAN = { startMin: CONFIG.night.startMinute, endMin: CONFIG.night.startMinute + CONFIG.night.hours * 60, lengthMs: CONFIG.night.lengthMs };
// The player: the 24x32 figure (Phase 14) from the character creator's look, or the
// original appraiser's (fedora, trench coat) for a save made before there was one.
let sprites = new HDSprites(CLASSIC_LOOK, { signature: true }).warm();
const syncLook = () => { const l = world?.look ?? CLASSIC_LOOK; sprites = new HDSprites(l, { signature: true }).warm(); setPlayerPortrait(st?.player?.name ?? null, l); };
// Panels where you're looking something over: the loupe comes up to your eye.
const APPRAISE_PANELS = new Set(['seller', 'appraiser', 'bench', 'specimen', 'estate']);
// Faces already in a scene, so nobody new matches them (game/people.js).
const playerKey = () => (world?.look ? lookKey(world.look) : 'classic');
const SIGNATURE_KEYS = Object.values(SIGNATURE).map(lookKey);
function makePedestrians() {
  const taken = new Set([playerKey(), ...SIGNATURE_KEYS]);
  const crowdK = { storm: 0.35, rain: 0.6, snow: 0.6, fog: 0.8, clear: 1.15 }[todayWeather()] ?? 1;
  const n = st && world.night === 'city' ? 7 : Math.round(CONFIG.city.pedestrians * crowdK);   // v2.4: a thin night crowd
  return new Pedestrians(maps.city, CITY_WALKABLE, new RNG(st?.day ?? 1), n, i => dress(`${world.night === 'city' ? 'night' : 'street'}:${st?.seed ?? 0}:${st?.day ?? 1}:${i}`, taken));
}
const player = new Player(CONFIG.player);
const zone = new ZoneRunner(player);
const clock = new ContinuousClock(CONFIG);
sleepFx = new SleepFx({ canvas, layer, sound: S.Sound });
clock.errandHours = () => st?.ap?.left ?? 0;
const ui = new UI(pause);
const guide = new Guide();
// Phase 16: the dialog box. Talk waits for a tap, the radio runs on a timer, and every
// line (and every notice) goes into the conversation log.
const speech = new Speech(document.getElementById('say'), { hintEl: document.getElementById('say-hint'), dimEl: document.getElementById('say-dim') });
speech.portraitFor = (who, opts) => portraitFor(who, opts);
speech.settings = settings;
speech.titleOf = who => [titleOf(who), REL.hasRelationship(who) ? heartsText(T.personOf(world, who).rel) : null].filter(Boolean).join(' · ') || null;
speech.nameOf = who => (who === 'you' ? (st?.player?.name && st.player.name !== 'Owner' ? st.player.name : 'You') : who);
speech.pronounsOf = () => world?.look?.pronouns ?? 0;
speech.keyLabel = () => (input.lastSource === 'pad' ? 'A' : input.lastSource === 'keys' ? 'E' : 'tap');
speech.onArrive = (kind, who, swap) => audio.dialog(kind, who, swap);
speech.dayOf = () => (st ? (wt?.active ? 0 : st.day) : null);
const talkHold = () => speech.visible && speech.waiting && !ui.isOpen;
ui.onToast = text => speech.note(text);
ui.toastHold = () => speech.visible && speech.waiting;
document.documentElement.classList.toggle('reduce-motion', !!settings.reducedMotion);
const staffFloor = new StaffFloor();
const input = new Input({
  surface: document.getElementById('touch'),
  stickEl: document.getElementById('stick'), knobEl: document.getElementById('knob'),
  actionEl: document.getElementById('action'), sprintEl: document.getElementById('sprint'),
  deadZone: CONFIG.joystick.deadZone, size: CONFIG.joystick.sizes[settings.joystickSize],
  toLocal: (x, y) => orientation.toLocal(x, y),
});
input.onTap = e => (talkHold() ? (speech.tap(), true) : arranger.on && !ui.isOpen && e ? (arrangeTap(e), true) : false);

// ---------- state ----------
// st: the original game's simulation. world: everything this game adds around it.

let st = null;
let world = freshWorld();
let rng = new RNG(1), target = null, time = 0;
let crowd = null;
let pedestrians = null, lastDistrict = null;
let light = makeCanvas(1, 1), lg = light.getContext('2d');

function freshWorld() {
  return { room: 'apartment', dayMode: null, night: null, shopHours: null, shopSession: null, shopClosedDate: null, collapse: null, nightRunWindow: null, displays: {}, crowd: null, playTimeMs: 0, shop: freshShop(), staff: freshStaff(), draw: freshDraw(), look: null, background: null, tutorial: { done: true, step: null }, notes: {}, guide: null };
}

const godBadge = document.getElementById('god-badge');
const BUS_STOP_LOC = { id: 'bus-stop', icon: 'bus', front: { sign: '#7fa0e0' } };
// Phase 21: the minimap in the corner while you're out in the city.
const minimap = new Minimap(document.getElementById('minimap'), cityLayout,
  [...Object.values(cityLayout.locs).map(L => ({ loc: S.City.loc(L.id) ?? extraPlace(L.id), door: L.door })).filter(p => p.loc),
    ...Object.values(cityLayout.busStops).map(b => ({ loc: BUS_STOP_LOC, door: { tx: b.tx, ty: b.ty + 1 }, small: true }))],
  () => { if (!pause.paused || ui.isOpen) openCityMap(g, cityLayout, player, () => ui.close()); });

function makeCrowd() {
  const c = new Crowd(shopRoom(), maps.shop, {
    sim: () => st, get displays() { return world.displays; }, get tier() { return shopState(world).tier; },
    extras: () => (wt.active ? [] : extrasToday(world, st)),
    comforts: () => { const c = comfortMods(world, wt.active ? null : todayWeather()); return wt.active ? c : { ...c, spend: c.spend + (holidayOn(st.day)?.shop?.spend ?? 0) }; },
    fewer: () => (wt.active ? 0 : Math.max(0, -(holidayOn(st.day)?.shop?.buyers ?? 0))),   // v2.2: a quiet holiday
    weather: () => (wt.active ? null : todayWeather()),
    barred: () => (wt.active ? [] : Y.blockedKinds(st)), restricted: (sim, it) => (wt.active ? null : Y.saleBlock(st, sim, it)),
    seller: sim => (hasEdge(world, 'haggle') ? softenSeller(sim) : sim),
    // Phase 30 (continuous mode): traffic follows the shop's open hours and the time of day.
    hoursScale: () => (world.shopSession ? TR.hoursScale(world.shopSession.to - world.shopSession.opened, CONFIG.shopHours.maxMinutes) : 1),
    // ...and friends drop by when they're free: not asleep, and not while their own place is open.
    visitAt: (name, next) => {
      if (!world.shopSession) return undefined;
      const s = world.shopSession, npc = CUSTOM_NPCS.find(n => n.name === name);
      const jobOpen = (placeId, minute) => !!SCHEDULES[placeId] && statusAt(placeId, st.day, minute, st.seed).open;
      return VS.visitProgress(npc, s.opened, s.to, { jobOpen }, { next });
    },
    arrivals: (n, next) => (world.shopSession ? TR.arrivalProgress(n, world.shopSession.opened, world.shopSession.to, { next }) : null),
    dress: (sim, others) => dress(sim.name ?? `customer-${sim.id}`, new Set([playerKey(), ...others.map(o => o.lookKey).filter(Boolean)]), { faction: sim.faction, offDuty: !!sim.friend }),
  }, rng);
  c.events.pay = (cust, paid, it) => {
    cue(S.saleSfx(paid));
    const by = !playerAtTill() && clerkOnDuty() ? staffState(world).clerk.name.split(' ')[0] : null;
    ui.toast(by ? `${by} sold the ${S.Items.name(it)} for ${money(paid)}.` : `Sold the ${S.Items.name(it)} for ${money(paid)}.`, 1800);
    if (cust?.sim?.friend) { const fc = T.makeCtx(world, st, cust.sim.name, { name: cust.sim.name }); T.addRel(fc, 2); fc.p.lastDay = st.day; }
    changed();
  };
  // Phase 30: after a skipped night, now and then a sale is rung up a little short.
  c.fumble = amount => {
    if (!clock.cycle.penalties.shopMistakes) return amount;
    const r = EX.fumbleAmount(amount, rng);
    if (r.slipped) ui.toast(`Tired fingers: you rang it up ${money(r.slipped)} short.`, 2400);
    return r.amount;
  };
  c.events.walkout = () => cue('refuse');
  // v2.0: a sale the Office's restrictions won't allow. Say so, so it isn't a mystery.
  c.events.refuse = (cust, it, say) => { if (Y.on(st) && Object.values(Y.RESTRICTIONS).some(r => r.say === say)) ui.toast(`${cust.sim.name}: “${say}”`, 2800); };
  // Phase 29: a friend from around town, come in to browse. Selling them something is nice too.
  c.events.friend = (cust, pair = {}) => {
    if (!cust || pair.with) return;   // the second of a couple: already announced
    ui.toast(pair.partner ? `${cust.sim.name} and ${pair.partner} came by the shop together.` : `${cust.sim.name} came by the shop to look around.`, 2400);
  };
  // Inspector Vance doesn't wait forever: he lets himself into the back case.
  c.events.inspect = cust => {
    if (ui.current?.id === 'inspector') return;
    const r = A.inspectLook(st); cleanDisplays(g, r.confiscated); changed();
    c.dismiss(cust, null); ui.toast(`Inspector Vance checked the back case himself. ${r.msg}`, 3600);
  };
  return c;
}

const map = () => (world.room === 'zone' ? zone.map : maps[world.room]);
const g = {
  continuous: true,
  ui, clock, cityHourMs: CONFIG.city.hourMs, settings,
  get st() { return st; }, get crowd() { return crowd; }, get world() { return world; },
  changed: () => changed(),
  goHome: () => { if (nightCity()) endNightWalk('home'); goHome(); },
  // Phase 30: an appraisal job taken in the continuous day gets a due day, 1-7 days out.
  afterTakeJob: c => {
    if (!c.item?.job) return;
    const range = S.DATA.appraisal.fee[c.faction === 'civilian' ? 'civilian' : 'faction'];
    const closed = d => hoursObj().week[CAL.weekdayOf(d)] === null;
    c.item.job.due = AP.dueDate(st.day, AP.dueDays(c.fee, range, rng), closed);
  },
  arrange: () => startArranging(),
  weather: () => (st && !wt.active ? todayWeather() : null),
};

// ---------- Ryan, The Mystic Magician (Phase 26) ----------
// His stand is on the sidewalk outside the Brass Lantern; on a wet day the act moves inside
// (he's one of the Lantern's regulars then, and talking to him opens the act the same way).
let magician = null, magicianKey = '';
const WET = new Set(['rain', 'storm', 'snow']);
const magicianOutside = () => !!st && !WET.has(todayWeather()) && !isNight();
// Phase 29: townsfolk out walking the streets today instead of at the Lantern (not in the wet).
// v2.2: the trees and the grass follow the season. When it turns, the city's tiles are
// repainted and its maps rebuilt (hand-made art, if any, goes back on top).
function refreshSeason() {
  const season = st ? CAL.seasonOf(st.day) : 'summer';
  if (season === tileSeason) return;
  tileSeason = season;
  const fresh = buildCityTiles(season);
  cityTiles.season = season;
  for (const k of Object.keys(cityTiles.defs)) delete cityTiles.defs[k];
  Object.assign(cityTiles.defs, fresh.defs); cityTiles.floors = fresh.floors;
  applyTileArt(cityTiles, 'city', season);
  maps.city = new TileMap(CITY_ROOM, cityTiles, CONFIG.tile); maps.city.bake();
  Object.setPrototypeOf(vanMap, maps.city);
  for (const r of Object.values(AREAS)) if (r.tiles === 'city') { maps[r.id] = new TileMap(r, cityTiles, CONFIG.tile); maps[r.id].bake(); }
  wrapCemetery();
  if (pedestrians) pedestrians = makePedestrians();
}
const walkersToday = () => (st && !WET.has(todayWeather()) ? streetWalkers(st.day, st.seed ?? 0, dayPart()) : []);
// v2.2: who's in Lantern Park today (fine days only), and whose birthday party it is.
const parkToday = () => (st && !WET.has(todayWeather()) && !isNight() ? parkPeople(st.day, st.seed ?? 0, n => isBirthdayToday(n, st.day), dayPart()) : { names: [], party: null, guests: [] });
// The people in an outdoor area: the townsfolk spending the day there, a birthday party
// round its table, and strangers enjoying it (more at the weekend, few in the wet).
function areaCrowd(area) {
  if (area.id === 'beach') return beachCrowd(area);
  // v2.5: Mike by his shed (smoking in the doorway at night), and visitors by day.
  if (area.id === 'cemetery') {
    const wd = CAL.weekdayOf(st?.day ?? 1), n = isNight() ? 0 : WET.has(todayWeather()) ? 2 : wd === 6 ? 8 : 4;
    return new RoomCrowd(area, [{ name: 'Mike', spot: isNight() ? area.mike.night : area.mike.day, still: true }], { extras: area.extras.slice(0, n), seed: `${st?.seed ?? 0}:${st?.day ?? 1}:yard`, taken: new Set([playerKey(), ...SIGNATURE_KEYS]) });
  }
  const P = area.id === 'park' ? parkToday() : { names: [], party: null, guests: [] };
  const taken = new Set([playerKey(), ...SIGNATURE_KEYS]);
  const people = [];
  P.guests.forEach((name, i) => { const s = area.party?.spots[i]; if (s) people.push({ name, spot: s, still: true }); });
  const rest = P.names.filter(n => !P.guests.includes(n));
  rest.forEach((name, i) => { const s = area.spots[i % area.spots.length]; people.push({ name, spot: s }); });
  const wd = CAL.weekdayOf(st?.day ?? 1), n = isNight() ? 0 : WET.has(todayWeather()) ? 1 : wd >= 5 ? (area.extras?.length ?? 0) : 4;
  return new RoomCrowd(area, people, { extras: (area.extras ?? []).slice(0, n), seed: `${st?.seed ?? 0}:${st?.day ?? 1}:${area.id}`, taken });
}
// ---------- v2.4: the city at night ----------
// A night choice beside the lab, the zones and bed: the streets from 10 PM to 4 AM. The rules
// are in game/night-city.js (and game/attention.js, game/moon.js); the conversations for the
// things you meet in data/night-talk.js; the drawings in ui/night-art.js.
let night = null;   // { attn, sight, seen, rollAt, ents, key, warned, grace }
const nightCity = () => !!st && world.night === 'city' && isNight();
const nightShop = () => !!st && world.night === 'shop' && isNight();
const outAtNight = () => nightCity() && (outdoors() || inPlace());
const moonTonight = () => MOON.moonOn(st.day);
function nightState() {
  if (!night || night.day !== st.day) night = { day: st.day, attn: freshAttention(), sight: null, seen: new Set(), rollAt: 0, ents: [], key: '', warned: false, grace: false, foundT: 0 };
  return night;
}
// Where things can turn up, worked out once from the town's layout.
let spotsCache = null;
function nightSpots() {
  if (spotsCache) return spotsCache;
  const m = maps.city, rows = cityLayout.rows, ok = (x, y) => !m.isSolid(x, y);
  const near = (x, y) => { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) if (ok(x + dx, y + dy)) return { tx: x + dx, ty: y + dy }; return null; };
  const lamps = [], walk = [], lampTiles = [];
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'L') { lampTiles.push([x, y]); const s = near(x, y); if (s) lamps.push(s); } else if (c === ',' && ok(x, y)) walk.push({ tx: x, ty: y }); }));
  const dark = walk.filter((s, i) => i % 3 === 0 && !lampTiles.some(([x, y]) => Math.abs(x - s.tx) + Math.abs(y - s.ty) < 7));
  const bus = Object.values(cityLayout.busStops).map(b => b.stand).filter(s => ok(s.tx, s.ty));
  const bridges = cityLayout.river.bridges.map(b => { const tx = Math.round((b.x0 + b.x1) / 2), ty = Math.round((b.y0 + b.y1) / 2); return ok(tx, ty) ? { tx, ty } : near(tx, ty); }).filter(Boolean);
  const pz = cityLayout.plaza, square = [];
  if (pz) for (let y = pz.y0 + 1; y < pz.y1; y++) for (let x = pz.x0 + 1; x < pz.x1; x++) if (ok(x, y)) square.push({ tx: x, ty: y });
  const harbor = cityLayout.docks.map(d => { const tx = Math.round((d.x0 + d.x1) / 2); for (let y = coastAt(tx) - 1; y > coastAt(tx) - 6; y--) if (ok(tx, y)) return { tx, ty: y }; return null; }).filter(Boolean);
  const standOf = id => cityLayout.locs[id]?.stand;
  const off = (s, dx, dy) => (s && ok(s.tx + dx, s.ty + dy) ? { tx: s.tx + dx, ty: s.ty + dy } : s);
  const noodles = [off(standOf('diner'), 3, 0), square[Math.floor(square.length * 0.8)] ?? null, off(standOf('bijou'), -3, 0), harbor[0] ?? null].filter(Boolean);
  const tables = square[Math.floor(square.length / 2)] ?? null;
  const diner = off(standOf('diner'), -2, 0);
  spotsCache = { lamps, walk, dark, bus, bridges, square, harbor, noodles, tables, diner };
  return spotsCache;
}
// A spot of a kind, near enough to find (8 to 30 tiles away if there is one).
function spotNear(list, rand) {
  if (!list?.length) return null;
  const px = player.center.x / 16, py = player.center.y / 16;
  const mid = list.filter(s => { const d = Math.hypot(s.tx - px, s.ty - py); return d >= 8 && d <= 30; });
  const pool = mid.length ? mid : list;
  return pool[Math.floor(rand() * pool.length)];
}
const WALKING_KINDS = { lamp: 'lamps', bus: 'bus', bridge: 'bridges', square: 'square', dark: 'dark', walk: 'walk', harbor: 'harbor' };

function startNightCity() {
  ui.close();
  world.night = 'city';
  const N = NC.nightCityOf(world); N.nights += 1;
  night = null; nightState();
  clock.setSpan(NIGHT_SPAN);
  clock.load({ ...clock.save(), state: 'stopped', elapsedMs: 0, day: st.day });
  clock.beginTimed(nightRunMinutes()); world.nightRunWindow = clock.cycle.window;
  pedestrians = null;
  const L = cityLayout.locs.apartment;
  goThrough({ room: 'city', tx: L.stand.tx, ty: L.stand.ty, facing: 'down' });
  clock.start();
  const mo = moonTonight();
  ui.toast(`${mo.name}. The streets until ${clockText(NW.dawnMinute(CAL.seasonOf(st.day)))}. Keep to the lamps.`, 3200);
  // Kristen's breathing drill works out here too (v2.5).
  const guard = kristenGuard(T.personOf(world, 'Kristen').rel);
  world.nerve = guard ? { day: st.day, left: guard, max: guard } : null;
  yard = null;
  setTimeout(() => sendText('nightCity'), 600);
  changed();
}

// Who's out and what's set up, rebuilt every half hour of the night.
function syncNightEnts() {
  const S0 = nightState(), minute = clock.minute, wd = CAL.weekdayOf(st.day), mo = moonTonight();
  const key = `${st.day}:${Math.floor(minute / 30)}`;
  if (S0.key === key) return;
  S0.key = key;
  const sp = nightSpots(), ents = [];
  const noodle = NC.noodlesOut(wd, minute) ? sp.noodles[NC.noodleSpot(st.day, sp.noodles.length)] : null;
  if (noodle) ents.push({ kind: 'stall', id: 'noodles', tx: noodle.tx, ty: noodle.ty, label: 'Noodles', light: 40 });
  if (NC.tablesOut(wd, minute) && sp.tables) ents.push({ kind: 'stall', id: 'tables', tx: sp.tables.tx, ty: sp.tables.ty, label: 'Tarp Sal', light: 44 });
  const used = new Set(ents.map(e => `${e.tx},${e.ty}`));
  for (const p of NC.nightPeople(wd, minute, mo.id)) {
    const list = p.where === 'noodles' ? (noodle ? [{ tx: noodle.tx + 2, ty: noodle.ty + 1 }] : []) : p.where === 'diner' ? (sp.diner ? [sp.diner] : []) : sp[WALKING_KINDS[p.where]] ?? [];
    let s = list[(st.day * 3 + p.name.length) % Math.max(1, list.length)];
    if (!s) continue;
    if (used.has(`${s.tx},${s.ty}`)) s = { tx: s.tx + 1, ty: s.ty };
    used.add(`${s.tx},${s.ty}`);
    const fig = new Guide(30, SIGNATURE[p.name]); fig.who = p.name; fig.sprites = spritesFor(SIGNATURE[p.name]); fig.place('city', s.tx, s.ty, 'down'); fig.home = s;
    ents.push({ kind: 'person', id: p.name, tx: s.tx, ty: s.ty, fig, label: 'Talk' });
  }
  if (S0.sight) ents.push(S0.sight.ent);
  S0.ents = ents;
}

const SIGHT_LOOKS = {
  lamplighter: { build: 1, skin: 2, hair: 0, hairColor: 8, face: 2, facial: 1, hat: 5, hatColor: 0, top: 5, topColor: 18, bottom: 0, bottomColor: 18, extra: 5, extraColor: 18, eyes: 3, eyeColor: 1, brows: 4, mouth: 0, mark: 0, pattern: 0, neck: 3, neckColor: 18 },
  della: { build: 0, skin: 1, hair: 4, hairColor: 2, face: 3, facial: 0, hat: 0, hatColor: 0, top: 2, topColor: 14, bottom: 3, bottomColor: 2, extra: 3, extraColor: 0, eyes: 4, eyeColor: 3, brows: 1, mouth: 2, mark: 0, pattern: 0, neck: 0, neckColor: 5 },
  watcher: { build: 1, skin: 9, hair: 0, hairColor: 1, face: 0, facial: 0, hat: 1, hatColor: 18, top: 5, topColor: 18, bottom: 0, bottomColor: 18, extra: 5, extraColor: 18, eyes: 1, eyeColor: 1, brows: 0, mouth: 0, mark: 0, pattern: 0, neck: 3, neckColor: 18 },
};
function placeSight(id) {
  const S0 = nightState(), s = NC.SIGHTS[id], sp = nightSpots();
  const at = spotNear(sp[WALKING_KINDS[s.kind]], () => rng.next());
  if (!at) return;
  const ent = { kind: 'sight', id, tx: at.tx, ty: at.ty, label: s.label, light: s.look === 'bus' ? 46 : s.look === 'glow' ? 30 : s.look === 'lamplighter' ? 36 : 0 };
  if (SIGHT_LOOKS[s.look]) {
    const look = SIGHT_LOOKS[s.look], fig = new Guide(30, look);
    fig.who = s.name; fig.sprites = spritesFor(look); fig.place('city', at.tx, at.ty, 'down'); fig.home = at;
    ent.fig = fig; ent.alpha = s.look === 'della' ? 0.72 : s.look === 'watcher' ? 0.8 : 1;
    setPassingLook(s.name, look);
  }
  S0.sight = { id, ent, until: clock.minute + 90 };
  S0.seen.add(id);
  NC.nightCityOf(world).seen[id] = NC.nightCityOf(world).nights;
  S0.key = '';   // rebuild the list with it in
  ui.toast(`${s.blurb}${s.mystery && NC.mysteryStep(world, id) ? ' Again.' : ''}`, 2600, { minor: true });
  if (id === 'bus313') cue('warn');
}
function endSight() { const S0 = nightState(); S0.sight = null; S0.key = ''; }

// Each frame out at night: the dark, what turns up, and the clock.
function tickNightCity(dt) {
  if (!nightCity() || clock.state !== 'running') return;
  const S0 = nightState(), minute = clock.minute, mo = moonTonight(), fx = MOON.moonEffects(mo);
  if (world.room === 'city') syncNightEnts();
  for (const e of S0.ents) if (e.fig) { const near = Math.hypot(player.x - e.fig.x, player.y - e.fig.y) < 40; e.fig.update(dt, near ? player : null); if (!near) e.fig.facing = 'down'; }
  // Something new, every half hour, while nothing's out.
  if (S0.sight && minute >= S0.sight.until && !(speech.visible && talkingWith === NC.SIGHTS[S0.sight.id].name)) endSight();
  const slot = Math.floor(minute / 30);
  if (world.room === 'city' && !S0.sight && slot !== S0.rollAt && !talkHold() && !ui.isOpen) {
    S0.rollAt = slot;
    const id = NC.rollSight(world, { minute, weekday: CAL.weekdayOf(st.day), night: NC.nightCityOf(world).nights, moon: mo, seenTonight: S0.seen, strange: fx.strange }, () => rng.next());
    if (id) placeSight(id);
  }
  // The dark notices you (outside, between the lamps).
  if (outdoors() && !talkHold() && !fishing) {
    const Y0 = nightArea(), rel = G.cemeteryOf(world).relics;
    const k = fx.notice * (rel.includes('lantern') ? 0.75 : 1) * (inYard() ? (1 + (G.sectionAt(Math.floor(player.center.y / 16)).depth - 1) * 0.25) * (Y0.oil ? 0.75 : 1) : 1);
    const lvl = stepAttention(S0.attn, dt, { dark: inTheDark() || nearGull() || !!Y0.inTide, noise: Y0.inTide ? 0.3 : 0, still: !player.moving, k });
    if (lvl) noticed(lvl);
  } else stepAttention(S0.attn, dt, { dark: false });
  // Out too late: a warning at half past three.
  if (!S0.warned && NC.lateStage(minute) === 'warn' && world.room !== 'apartment') { S0.warned = true; ui.toast('Half past three. Get home before four, or someone will have to see you home.', 3600); cue('warn'); }
}
// In the dark: no lamp near (the lamplighter's lamps burn further), no lit doorway, no stall.
function inTheDark() {
  const c = player.center, m = map(), boost = NC.nightCityOf(world).mysteries.lamplighter >= 4 ? 1.35 : 1;
  for (const l of m.lights) { const d = Math.hypot(l.x - c.x, l.y - c.y); if (d < l.r * 1.15 * boost) return false; }
  for (const l of nightLights()) if (Math.hypot(l.x - c.x, l.y - c.y) < l.r * 1.1) return false;
  return true;
}
// Lights that aren't on the map: open doorways, the stalls, things that glow.
function nightLights() {
  if (nightCity() && world.room === 'beach') { const s = nightArea().sight; return s?.fig ? [{ x: s.fig.x + 8, y: s.fig.y, r: 40 }] : []; }
  if (!nightCity() || world.room !== 'city') return [];
  const out = [], minute = clock.minute;
  for (const id of Object.keys(NC.NIGHT_PLACES)) { const L = cityLayout.locs[id]; if (L && NC.nightOpen(id, minute).open) out.push({ x: L.door.tx * 16 + 8, y: L.door.ty * 16 + 14, r: 44 }); }
  for (const e of nightState().ents) if (e.light) out.push({ x: e.tx * 16 + 8, y: e.ty * 16, r: e.light });
  return out;
}
const UNEASY = ['You feel watched.', 'Footsteps behind you stop when you stop.', 'A window above you goes dark as you pass.', 'Somebody whispers your name. Nobody’s there.'];
function noticed(lvl) {
  const S0 = nightState();
  // v2.5: in the churchyard the dark is the dead, and the bell; on the beach, the sea.
  if (inYard() && lvl !== 'uneasy') { if (lvl === 'followed') { spawnRisen(); ui.toast('Something is standing up between the stones. Keep moving.', 2600); cue('breath'); } else tollBell(); return; }
  if (world.room === 'beach' && lvl !== 'uneasy') {
    const n = lvl === 'found' ? 2 : 1, m = map(), row = BN.tideRow(clock.minute);
    for (let i = 0; i < n; i++) { const x = Math.max(2, Math.min(m.cols - 3, Math.floor(player.center.x / 16) + (i ? 8 : -8))); nightArea().haunts.push(makeHaunt('hound', x * 16, Math.min(27, row + 1) * 16 - 4, () => rng.next())); }
    ui.toast(lvl === 'found' ? 'Two shapes come up out of the surf on all fours, running.' : 'Something long and low comes out of the water. It shakes itself like a dog.', 3000); cue('encounter');
    return;
  }
  if (lvl === 'uneasy') { ui.toast(UNEASY[Math.floor(rng.next() * UNEASY.length)], 2200, { minor: true }); cue('breath'); }
  else if (lvl === 'followed') { nightHurt(3); ui.toast('Something is keeping pace with you, just past the light. Get under a lamp.', 2800); cue('panic'); }
  else if (lvl === 'found') {
    const r = NC.darkFinds(st.cash, () => rng.next());
    nightHurt(r.stress);
    if (r.cash) st.cash = Math.max(0, st.cash - r.cash);
    S0.foundT = time;
    ui.toast(`${r.text}${r.cash ? ` (−${S.money(r.cash)})` : ''}`, 4200); cue('encounter');
    changed();
  }
}

// Four in the morning: home, a half hour's grace, then someone sees you home.
function nightCityClock() {
  return endNightWalk('dawn');
  const S0 = nightState();
  if (world.room === 'apartment') { clock.stop(); world.night = 'done'; ui.toast('Four in the morning. The bed’s in the bedroom.', 2600); return; }
  if (!S0.grace) {
    S0.grace = true;
    clock.extend(NC.NIGHT_HOURS.grace, NIGHT_SPAN.lengthMs / (NIGHT_SPAN.endMin - NIGHT_SPAN.startMin) * NC.NIGHT_HOURS.grace);
    ui.toast('Four o’clock. Home, now. You’ve got half an hour.', 3600); cue('warn');
    return;
  }
  caughtOut('city');
}
// Shared with the woods (later): someone sees you home, and you start late in the morning.
function caughtOut(place, extraLine = null) {
  clock.stop();
  if (ui.isOpen) ui.close();
  world.night = 'done';
  const friends = REL.relationshipNames().filter(n => T.personOf(world, n).met).map(n => ({ name: n, hearts: REL.heartsOf(T.personOf(world, n).rel) }));
  const r = NC.seenHome(place, friends, st.day);
  world.late = { day: st.day + 1, hours: NC.LATE.hours, who: r.who };
  const d = APARTMENT.door;
  goThrough({ room: 'apartment', tx: d.tx, ty: d.ty, facing: 'up' });
  setTimeout(() => speech.say([...r.lines.map(t => ({ who: r.who.startsWith('A ') || r.who.startsWith('The ') ? 'you' : r.who, text: t })), ...(extraLine ? [{ who: 'you', text: extraLine }] : []), { who: 'you', text: 'Home. You’ll be late opening up in the morning.' }], { who: 'you', kind: 'talk' }), 400);
  changed();
}

// Walking up to something at night.
function nightTarget() {
  if (!nightCity() || world.room !== 'city') return null;
  let best = null, bd = 22;
  for (const e of nightState().ents) {
    const x = e.fig ? e.fig.x : e.tx * 16, y = e.fig ? e.fig.y : e.ty * 16 - 4;
    const d = Math.hypot(x - player.x, y - player.y);
    if (d < (e.kind === 'stall' ? 28 : e.id === 'bus313' ? 34 : bd)) { bd = d; best = e; }
  }
  return best ? { panel: 'night', label: best.label, ent: best } : null;
}
function nightInteract(e) {
  if (e.kind === 'person') { nightState().ents.find(x => x === e)?.fig?.update?.(0, player); return talkTo(e.id, { nightHello: true }); }
  if (e.kind === 'stall') return e.id === 'tables' ? openNightTables() : openNoodles();
  if (e.kind === 'sight') {
    const id = e.id, s = NC.SIGHTS[id], N = NC.nightCityOf(world);
    const nc = {
      step: NC.mysteryStep(world, id), time: clock.label,
      advance: () => { const n = NC.advanceMystery(world, id); N.seen[id] = N.nights; return NC.mysteryDone(world, id) ? [`${s.name}: that’s the end of it, you think.`] : n === 1 ? [] : []; },
      bench: (odds, n) => { const out = []; for (let i = 0; i < n; i++) { const it = S.Items.generate(st, { odds }); it.fromNight = id; st.inventory.loot.push(it); out.push(`${S.Items.name(it)}: on your bench.`); } cue('find'); return out; },
      flag: k => (k === 'stygWatch' ? !!T.personOf(world, 'Stuart').flags.stygWatch : !!N[k]),
      jolt: n => { const l = jolt(nightState().attn, n); if (l) noticed(l); return []; },
      befriend: (name, n, note) => { const p = T.personOf(world, name); p.rel = Math.min(T.REL_MAX, p.rel + n); return note ? [note] : []; },
    };
    // The bus takes you home.
    const after = () => { endSight(); if (id === 'bus313' && NC.mysteryDone(world, id) && T.personOf(world, s.name).flags.rodeBus && !N.rodeHome) { N.rodeHome = true; const d = APARTMENT.door; goThrough({ room: 'apartment', tx: d.tx, ty: d.ty, facing: 'up' }); } changed(); };
    return talkTo(s.name, { convo: NIGHT_TALK[id], nc, onEnd: after });
  }
}
// What people you know say when you find them out late (their usual talk, a night hello).
function withNightHello(convo, name) {
  const hub = convo.nodes.hello, lines = NC.NIGHT_HELLO[name];
  if (!hub || !lines) return convo;
  return { ...convo, start: c => (c.p.met ? 'hello' : convo.start(c)), nodes: { ...convo.nodes, hello: { ...hub, say: c => [T.pickToday(lines, c, 5)] } } };
}

// Tarp Sal's night tables.
function openNightTables() {
  const N = NC.nightCityOf(world);
  ui.open({
    id: 'nightTables', size: 'wide', eyebrow: `Old Market Square · ${clock.label}`, title: 'Tarp Sal’s night tables',
    body: [
      faceRow(SIGNATURE['Tarp Sal'], 'Tarp Sal', el('p', { class: 'speech' }, '“This is the real market. Daytime’s for tourists. No receipts, no refunds, no questions.”')),
      el('div', { class: 'rows' }, NC.TABLE_GOODS.map(gd => el('article', { class: 'row-card' },
        el('div', { class: 'row-text' }, el('strong', {}, gd.name), el('span', {}, gd.blurb)),
        el('button', { type: 'button', class: 'btn small primary', id: `tables-${gd.id}`, disabled: st.cash < gd.price, onclick: () => {
          st.cash -= gd.price; cue('till');
          if (gd.kind === 'supplies') st.supplies[gd.id] = (st.supplies[gd.id] ?? 0) + gd.n;
          else if (gd.kind === 'kit') st.kit[gd.id] = (st.kit[gd.id] ?? 0) + gd.n;
          else { const it = S.Items.generate(st, { odds: NC.GRAB_ODDS }); it.fromNight = 'tables'; st.inventory.loot.push(it); ui.toast(`In the pillowcase: ${S.Items.name(it)}. It’s on your bench.`, 2600); }
          N.tables = (N.tables ?? 0) + 1;
          changed(); openNightTables();
        } }, money(gd.price))))),
      el('p', { class: 'note' }, `${money(st.cash)} on you.`),
    ],
    actions: [{ label: 'Back to the square', kind: 'quiet', onClick: () => ui.close() }],
  });
}
// The noodle cart: a hot bowl, once a night.
function openNoodles() {
  const N = NC.nightCityOf(world), had = N.noodles === st.day;
  ui.open({
    id: 'noodles', eyebrow: clock.label, title: 'The noodle cart',
    body: [el('p', {}, had ? 'The cook nods at you. “Already fed you. Go home.”' : 'Steam, a lantern, a man with a ladle. The broth smells like somebody’s grandmother’s kitchen.'), el('p', { class: 'note' }, had ? '' : `${money(NC.NOODLES.price)} a bowl · steadies your nerve`)],
    actions: [
      ...(had ? [] : [{ id: 'noodles-buy', label: `A bowl · ${money(NC.NOODLES.price)}`, kind: 'primary', disabled: st.cash < NC.NOODLES.price, onClick: () => { st.cash -= NC.NOODLES.price; st.stress = Math.max(0, st.stress + NC.NOODLES.stress); N.noodles = st.day; cue('till'); ui.close(); ui.toast('Hot broth, soft noodles, a lot of pepper. The night feels smaller.', 2600); changed(); } }]),
      { label: 'Walk on', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}
function drawNightThings(ctx, cx, cy) {
  if (!nightCity() || world.room !== 'city') return [];
  const out = [];
  for (const e of nightState().ents) {
    if (e.fig) { out.push({ kind: 'walker', y: e.fig.y, e: Object.assign(e.fig, { alpha: e.alpha ?? 1 }) }); continue; }
    out.push({ kind: 'nightThing', y: e.ty * 16 - 4 + (e.id === 'bus313' ? 22 : 0), e });
  }
  return out;
}
function drawNightThing(ctx, e, cx, cy) {
  if (e.haunt) { const h = e.haunt, x = Math.round(h.x) - cx, y = Math.round(h.y) - cy; return h.kind === 'crab' ? NART.drawCrab(ctx, x, y, time) : NART.drawHound(ctx, x, y, time, h.facing); }
  const x = e.tx * 16 - cx, y = e.ty * 16 - 4 - cy, look = e.kind === 'stall' ? e.id : NC.SIGHTS[e.id]?.look;
  if (look === 'bus') return NART.drawBus(ctx, x, y, time, NC.mysteryStep(world, 'bus313') >= 2);
  if (look === 'tables') return NART.drawTables(ctx, x, y, time);
  if (look === 'noodles') return NART.drawNoodles(ctx, x, y, time);
  if (look === 'eyes') return NART.drawEyes(ctx, x, y, time);
  if (look === 'glow') return NART.drawGlow(ctx, x, y, time);
  if (look === 'wallet') return NART.drawWallet(ctx, x, y);
  if (look === 'singer') return NART.drawSong(ctx, x, y, time);
}

// ---------- v2.5: the churchyard, and the beach after dark ----------
// The churchyard is behind St. Brigid's (through the chapel by day, the side gate at night with
// Mike's key). Rules in game/graves.js and game/haunts.js; the beach at night in
// game/beach-night.js. Both are part of a night out in the city (the same hours, the same
// Seen meter, the same out-too-late rule).
let yard = null;   // tonight: { haunts, tolls, oil, flotsam, crabT, sight, found, sang, tideStress }
function nightArea() {
  if (!yard || yard.day !== st.day) yard = { day: st.day, haunts: [], tolls: 0, oil: false, flotsam: null, crabT: 15, sight: null, found: [], sang: false, tideStress: 0, shipRolled: false };
  return yard;
}
const RISEN_LOOK = { build: 0, skin: 0, hair: 3, hairColor: 9, face: 2, facial: 0, hat: 0, hatColor: 0, top: 5, topColor: 16, bottom: 3, bottomColor: 16, extra: 0, extraColor: 0, eyes: 3, eyeColor: 4, brows: 4, mouth: 2, mark: 0, pattern: 0, neck: 3, neckColor: 16 };
const ANGRY_LOOK = { build: 2, skin: 9, hair: 14, hairColor: 1, face: 2, facial: 0, hat: 0, hatColor: 0, top: 5, topColor: 18, bottom: 0, bottomColor: 18, extra: 0, extraColor: 0, eyes: 1, eyeColor: 1, brows: 4, mouth: 2, mark: 1, pattern: 3, neck: 3, neckColor: 18 };
const MAE_LOOK = { build: 0, skin: 1, hair: 3, hairColor: 2, face: 2, facial: 0, hat: 5, hatColor: 19, top: 1, topColor: 19, bottom: 2, bottomColor: 12, extra: 0, extraColor: 0, eyes: 3, eyeColor: 3, brows: 1, mouth: 2, mark: 0, pattern: 0, neck: 0, neckColor: 5 };

// Locked section gates block the way (the tile itself is a plain gate).
function wrapCemetery() {
  const m = maps.cemetery;
  if (!m || m.gatesWrapped) return;
  const base = m.isSolid, baseW = m.walkable;
  m.isSolid = (tx, ty) => base(tx, ty) || (m.at(tx, ty) === 'R' && !!G.gateLock(world, ty));
  m.walkable = (tx, ty) => baseW(tx, ty) && !(m.at(tx, ty) === 'R' && !!G.gateLock(world, ty));
  m.gatesWrapped = true;
}
const inYard = () => world.room === 'cemetery';
function enterCemetery(night) {
  const s = CEMETERY.spawn;
  wrapCemetery();
  goThrough({ room: 'cemetery', tx: s.tx, ty: s.ty, facing: 'up' });
  if (night) {
    const Y0 = nightArea(), C = G.cemeteryOf(world);
    if (!Y0.oil && C.oil > 0) { C.oil -= 1; Y0.oil = true; setTimeout(() => ui.toast('You fill the lantern. It’ll burn till dawn.', 2400), 400); }
    else if (!Y0.oil) setTimeout(() => ui.toast('No lantern oil. It’s very dark in here.', 2400), 400);
  }
}
function leaveCemetery() {
  if (isNight()) { const L = cityLayout.locs.chapel; return goThrough({ room: 'city', tx: L.stand.tx, ty: L.stand.ty, facing: 'down' }); }
  goThrough({ room: 'chapel', tx: 14, ty: 2, facing: 'down' });
}
// The stones. Read them by day; dig by night.
function openGrave(tx, ty) {
  const C = G.cemeteryOf(world), key = G.graveKey(tx, ty), epi = G.epitaph(st.seed, tx, ty, { mikeMap: C.mikeMap });
  const dugDay = C.dug[key], night = isNight();
  C.read[key] = true;
  const fate = G.fateOf(st.seed, tx, ty), sec = G.sectionAt(ty);
  const tell = night && dugDay == null ? (fate === 'angry' ? 'The earth here is warm, and it moves a little, like breathing.' : fate === 'cursed' ? 'Nothing grows on this one. Not even moss.' : null) : null;
  const why = G.cantDig(world, tx, ty, { night, day: st.day, weekdayOf: CAL.weekdayOf });
  ui.open({
    id: 'grave', eyebrow: `${sec.name}${night ? ` · ${clock.label}` : ''}`, title: epi.name,
    body: [el('p', { class: 'document epitaph' }, `${epi.years}`, el('br'), `“${epi.line}”`),
      dugDay != null ? el('p', { class: 'note' }, 'The earth’s been turned over. Whatever was here is gone.') : null,
      tell ? el('p', { class: 'note warnline' }, tell) : null,
      night && dugDay == null ? el('p', { class: 'note' }, `${G.digsLeft(world, st.day, CAL.weekdayOf)} dig${G.digsLeft(world, st.day, CAL.weekdayOf) === 1 ? '' : 's'} left this week · digging takes ${G.DIG.minutes} minutes and it’s loud`) : null,
      !night ? el('p', { class: 'note' }, C.mikeMap ? 'Mike’s map says the stone tells the truth.' : 'The old carvers usually knew what went in the box.') : null],
    actions: [
      ...(night && dugDay == null ? [{ id: 'grave-dig', label: why ? `Dig · ${why.toLowerCase()}` : 'Dig', kind: 'primary', disabled: !!why, onClick: () => { ui.close(); digGrave(tx, ty); } }] : []),
      { label: 'Leave it', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}
function digGrave(tx, ty) {
  const Y0 = nightArea();
  cue('tap');
  pause.push('fade'); fadeEl.classList.add('on');
  setTimeout(() => {
    fadeEl.classList.remove('on'); pause.pop('fade');
    clock.advanceMinutes(G.DIG.minutes);
    const r = G.dig(world, st.seed, tx, ty, { day: st.day, weekdayOf: CAL.weekdayOf });
    const lines = [r.text];
    for (const odds of r.items) { const it = S.Items.generate(st, { odds }); it.fromGrave = true; st.inventory.loot.push(it); Y0.found.push(it.uid); lines.push(`${S.Items.name(it)}: on your bench.`); }
    if (r.cash) { st.cash += r.cash; lines.push(`And ${money(r.cash)} in old money.`); }
    if (r.relic) lines.push(`${r.relic.name}. ${r.relic.blurb}`);
    if (r.stress) nightHurt(r.stress);
    if (r.angry) { const h = makeHaunt('angry', tx * 16, (ty + 1) * 16 - 4, () => rng.next()); h.sprites = spritesFor(ANGRY_LOOK); h.alpha = 0.85; Y0.haunts.push(h); cue('encounter'); }
    else cue(r.items.length ? 'find' : 'tap');
    speech.say(lines.map(t => ({ who: 'you', text: t })), { who: 'you', kind: 'talk' });
    const k = (1 + (G.sectionAt(ty).depth - 1) * 0.25) * (Y0.oil ? 0.85 : 1);
    const lvl = jolt(nightState().attn, r.noise * k);
    if (lvl) noticed(lvl);
    changed();
  }, settings.reducedMotion ? 0 : 500);
}
// The bell: the yard is awake. Each toll tonight wakes more of them.
function tollBell() {
  const Y0 = nightArea();
  Y0.tolls += 1;
  if (Y0.tolls === 1 && G.cemeteryOf(world).relics.includes('rope')) { ui.toast('The bell swings in the tower, and the old rope holds it. Not a sound.', 3200); return; }
  cue('bell'); setTimeout(() => cue('bell'), 900); setTimeout(() => cue('bell'), 1800);
  const n = Math.min(6, Y0.tolls * 2);
  for (let i = 0; i < n; i++) spawnRisen();
  ui.toast(Y0.tolls === 1 ? 'The chapel bell tolls on its own. All over the yard, the ground stirs.' : 'The bell again. More of them now. Get to the lantern light.', 3600);
}
function spawnRisen() {
  const m = maps.cemetery, Y0 = nightArea();
  for (let tries = 0; tries < 80; tries++) {
    const tx = 2 + Math.floor(rng.next() * (m.cols - 4)), ty = 2 + Math.floor(rng.next() * (m.rowsN - 4));
    const d = Math.hypot(tx * 16 - player.x, ty * 16 - player.y), sec = G.sectionAt(ty);
    if (m.isSolid(tx, ty) || d < 80 || d > 320 || (sec.key && G.gateLock(world, sec.key === 'lower' ? 23 : 11))) continue;
    const h = makeHaunt('risen', tx * 16, ty * 16 - 4, () => rng.next()); h.sprites = spritesFor(RISEN_LOOK); h.alpha = 0.6; h.hunt = true;
    Y0.haunts.push(h); return;
  }
}
// Hurting at night: Kristen's shield takes it first; the Widow's Locket softens it.
function nightHurt(n) {
  if (G.cemeteryOf(world).relics.includes('locket')) n = Math.round(n * 0.75);
  const sh = world.nerve && world.nerve.day === st.day ? world.nerve : null;
  if (sh && sh.left > 0) { const t = Math.min(sh.left, n); sh.left -= t; n -= t; if (sh.left <= 0) ui.toast('Kristen’s shield is spent. From here on, every scare counts.', 2600); }
  if (n > 0) st.stress = Math.min(100, st.stress + n);
  if (st.stress >= 100) knockedOut();
}
// Out cold at night: someone finds you and gets you home. Anything you dug up or picked up
// tonight is lost in the dark.
function knockedOut() {
  if (!nightCity() || world.night !== 'city') return;
  const Y0 = nightArea();
  const lost = st.inventory.loot.filter(it => Y0.found.includes(it.uid));
  st.inventory.loot = st.inventory.loot.filter(it => !Y0.found.includes(it.uid));
  Y0.haunts = [];
  st.stress = 80;
  world.lastKnockout = st.day;
  caughtOut(inYard() ? 'cemetery' : world.room === 'beach' ? 'beach' : 'city', lost.length ? `You lost what you found tonight: ${lost.map(it => S.Items.name(it)).join(', ')}.` : null);
}

// Each frame in the yard or on the beach at night.
function tickNightAreas(dt) {
  if (!nightCity() || clock.state !== 'running' || (!inYard() && world.room !== 'beach')) return;
  const Y0 = nightArea(), m = map();
  if (world.room === 'beach') tickBeachNight(dt);
  const lit = (x, y) => m.lights.some(l => Math.hypot(l.x - x, l.y - y) < l.r * 0.7);
  const hits = stepHaunts(Y0.haunts, dt, { px: player.x, py: player.y, blocked: (x, y) => m.isSolid(Math.floor((x + 8) / 16), Math.floor((y + 12) / 16)), lit, rand: () => rng.next() });
  for (const h of hits) {
    if (HAUNTS[h.kind].steals) { crabSteal(); continue; }
    cue('encounter');
    ui.toast(h.kind === 'risen' ? 'Cold hands, then nothing. It falls apart against you.' : h.kind === 'angry' ? 'It hits you like grave dirt and fury, and sinks back into the ground.' : 'Wet teeth and salt. It drags at you, then breaks like a wave.', 2400);
    nightHurt(HAUNTS[h.kind].hit);
  }
}
function crabSteal() {
  const F = FISH.fishingOf(world), bait = FISH.BAIT_ORDER.find(id => (F.bait[id] ?? 0) > 0);
  if (bait) { F.bait[bait] -= 1; ui.toast(`A crab makes off with your ${FISH.BAIT[bait].name.toLowerCase()}.`, 2200); }
  else if (F.cooler.length) { const c = F.cooler.pop(); ui.toast(`A crab drags a ${FISH.fishById(c.id)?.name ?? 'fish'} out of your cooler and into the surf.`, 2400); }
  else ui.toast('A crab pinches your ankle, finds nothing worth stealing, and leaves.', 2000);
  changed();
}
function tickBeachNight(dt) {
  const Y0 = nightArea(), minute = clock.minute, row = BN.tideRow(minute), m = map();
  const ty = Math.floor((player.feet.y + player.feet.h / 2) / 16), tx = Math.floor((player.feet.x + player.feet.w / 2) / 16);
  // Flotsam on the tide line: placed once a night.
  if (!Y0.flotsam) {
    Y0.flotsam = [];
    for (let i = 0; i < BN.FLOTSAM.perNight * 4 && Y0.flotsam.length < BN.FLOTSAM.perNight; i++) {
      const x = 3 + Math.floor(rng.next() * (m.cols - 8)), y = 21 + Math.floor(rng.next() * 3);
      if (!m.isSolid(x, y) && '_:'.includes(m.at(x, y))) Y0.flotsam.push({ tx: x, ty: y });
    }
  }
  // In the water: it pulls at you.
  Y0.inTide = ty >= row && ty < 28;
  if (Y0.inTide) { Y0.tideStress += BN.TIDE_STRESS * dt; if (Y0.tideStress >= 1) { const n = Math.floor(Y0.tideStress); Y0.tideStress -= n; nightHurt(n); } }
  if (!Y0.sang && ty >= row - 2) { Y0.sang = true; ui.toast('Out in the water, someone is singing your name.', 3200); cue('spirit'); }
  // Crabs up out of the surf.
  if ((Y0.crabT -= dt) <= 0) {
    Y0.crabT = 18 + rng.next() * 14;
    if (Y0.haunts.filter(h => h.kind === 'crab').length < 3 && ty >= 11) {
      const x = Math.max(2, Math.min(m.cols - 3, tx + Math.round((rng.next() - 0.5) * 14)));
      if (!m.isSolid(x, row - 1)) Y0.haunts.push(makeHaunt('crab', x * 16, (row - 1) * 16 - 4, () => rng.next()));
    }
  }
  // The lantern-bearer and the ship.
  if (!Y0.sight) {
    const N = NC.nightCityOf(world), L = BN.BEACH_SIGHTS.lantern, wd = CAL.weekdayOf(st.day);
    const step = N.mysteries.lantern ?? 0;
    if (step < L.steps && L.days.includes(wd) && minute >= L.from && minute < L.to && N.seen.lantern !== N.nights && N.seen.lantern !== N.nights - 1) {
      const fig = new Guide(30, MAE_LOOK); fig.who = 'The lantern-bearer'; fig.sprites = spritesFor(MAE_LOOK); fig.place('beach', L.at.tx, L.at.ty, 'down');
      Y0.sight = { id: 'lantern', fig, alpha: 0.7 }; N.seen.lantern = N.nights; setPassingLook('The lantern-bearer', MAE_LOOK);
      ui.toast('A lantern, at the end of the pier. Someone is holding it.', 2600, { minor: true });
    } else if (!Y0.shipRolled && minute >= BN.BEACH_SIGHTS.ship.from && minute < BN.BEACH_SIGHTS.ship.to) {
      Y0.shipRolled = true;
      if (rng.next() < BN.BEACH_SIGHTS.ship.chance * MOON.moonEffects(moonTonight()).strange) { Y0.sight = { id: 'ship', ...BN.BEACH_SIGHTS.ship.at }; ui.toast('Far out past the breakwater, lanterns. A ship.', 2600, { minor: true }); }
    }
  }
  if (Y0.sight?.fig) { const f = Y0.sight.fig, near = Math.hypot(player.x - f.x, player.y - f.y) < 40; f.update(dt, near ? player : null); }
}
// Near a gull on the rail is like standing in the dark: they watch.
const nearGull = () => world.room === 'beach' && isNight() && BN.GULLS.some(x => Math.hypot(x * 16 + 8 - player.center.x, BN.GULL_ROW * 16 - player.center.y) < 44);

// What you can walk up to in the yard or on the beach at night.
function areaNightTarget() {
  if (!nightCity()) return null;
  const Y0 = nightArea();
  if (world.room === 'beach') {
    const f = (Y0.flotsam ?? []).find(p => Math.hypot(p.tx * 16 - player.x, p.ty * 16 - 4 - player.y) < 20);
    if (f) return { panel: 'flotsam', label: 'Pick up', spot: f };
    const s = Y0.sight;
    if (s?.fig && Math.hypot(s.fig.x - player.x, s.fig.y - player.y) < 24) return { panel: 'beachSight', label: 'Talk', id: 'lantern' };
    if (s?.id === 'ship' && player.y > 26 * 16 && Math.abs(s.tx * 16 - player.x) < 90) return { panel: 'beachSight', label: 'Look', id: 'ship' };
  }
  return null;
}
function beachSight(id) {
  const N = NC.nightCityOf(world), Y0 = nightArea(), name = BN.BEACH_TALK[id].name;
  const nc = {
    step: N.mysteries[id] ?? 0,
    advance: () => { N.mysteries[id] = (N.mysteries[id] ?? 0) + 1; if (N.mysteries[id] >= BN.BEACH_SIGHTS.lantern.steps && !N.done.includes(id)) N.done.push(id); return []; },
    bench: (odds, n) => { const out = []; for (let i = 0; i < n; i++) { const it = S.Items.generate(st, { odds }); st.inventory.loot.push(it); Y0.found.push(it.uid); out.push(`${S.Items.name(it)}: on your bench.`); } cue('find'); return out; },
  };
  return talkTo(name, { convo: BN.BEACH_TALK[id], nc, onEnd: () => { Y0.sight = null; changed(); } });
}
function pickFlotsam(spot) {
  const Y0 = nightArea();
  Y0.flotsam = Y0.flotsam.filter(p => p !== spot);
  const it = S.Items.generate(st, { odds: BN.FLOTSAM.odds }); it.fromWater = 'tide'; st.inventory.loot.push(it); Y0.found.push(it.uid);
  cue('find'); ui.toast(`Washed up on the tide line: ${S.Items.name(it)}. It’s on your bench.`, 2600); changed();
}
// Mike's shed: spades, lantern oil and keys.
function openShed() {
  const C = G.cemeteryOf(world), mp = T.personOf(world, 'Mike'), hearts = REL.heartsOf(mp.rel);
  if (!C.met) return talkTo('Mike');
  ui.open({
    id: 'shed', size: 'wide', eyebrow: 'St. Brigid’s churchyard', title: 'Mike’s shed',
    body: [faceRow(SIGNATURE.Mike, 'Mike', el('p', { class: 'speech' }, `“${isNight() ? 'Quiet, now. What do you need.' : 'Don’t touch the good shovel. That one’s mine.'}”`)),
      el('div', { class: 'rows' }, Object.entries(GEAR).map(([id, gd]) => {
        const no = G.cantBuy(world, id, st.cash, hearts), have = gd.once && C.gear[id];
        return el('article', { class: 'row-card' }, el('div', { class: 'row-text' }, el('strong', {}, gd.name), el('span', {}, `${gd.blurb}${id === 'oil' ? ` You have ${C.oil}.` : ''}`)),
          el('button', { type: 'button', class: 'btn small primary', id: `shed-${id}`, disabled: !!no, title: no ?? '', onclick: () => { st.cash -= G.buy(world, id); cue('till'); changed(); openShed(); } }, have ? 'Yours' : no && no !== 'Not enough cash' ? no : money(gd.price)));
      })),
      C.relics.length ? el('p', { class: 'note' }, `Relics from the Crypts: ${C.relics.map(id => RELICS.find(r => r.id === id)?.name).join(', ')}.`) : null,
      el('p', { class: 'note' }, `${G.digsLeft(world, st.day, CAL.weekdayOf)} of ${G.DIG.perWeek + (C.relics.includes('coin') ? 1 : 0)} digs left this week.`)],
    actions: [{ label: 'Back to the yard', kind: 'quiet', onClick: () => ui.close() }],
  });
}
function drawYardThings(ctx, cx, cy) {
  if (inYard()) {
    const C = G.cemeteryOf(world);
    for (const key of Object.keys(C.dug)) {
      const [tx, ty] = key.split(',').map(Number), x = tx * 16 - cx, y = ty * 16 - cy;
      if (x < -16 || y < -16 || x > renderer.w || y > renderer.h) continue;
      ctx.fillStyle = '#2a1e14'; ctx.fillRect(x + 1, y + 12, 14, 4); ctx.fillStyle = '#3e2c1c'; ctx.fillRect(x + 3, y + 11, 10, 2);
    }
  }
  if (world.room === 'beach' && isNight() && st) {
    const row = BN.tideRow(clock.minute), y0 = row * 16 - cy, y1 = 28 * 16 - cy;
    if (y1 > y0) {
      ctx.fillStyle = 'rgba(28,52,74,0.72)'; ctx.fillRect(0, y0, renderer.w, y1 - y0);
      ctx.fillStyle = 'rgba(200,220,230,0.35)';
      for (let x = -((time * 12) % 16); x < renderer.w; x += 8) ctx.fillRect(Math.round(x), y0 + Math.round(Math.sin((x + cx) / 9 + time * 2) * 1.5), 5, 1);
    }
    // Jellies in the shallows.
    for (let i = 0; i < 18; i++) {
      const jx = ((i * 97) % 56) * 16 + 8 - cx, jy = (28 + (i * 5) % 5) * 16 + 4 - cy + Math.round(Math.sin(time + i) * 2);
      const a = 0.4 + 0.3 * Math.sin(time * 1.3 + i);
      ctx.fillStyle = `rgba(122,224,208,${a.toFixed(2)})`; ctx.fillRect(jx, jy, 3, 2); ctx.fillRect(jx + 1, jy + 2, 1, 2);
    }
    // Gulls on the rail, eyes catching the light.
    for (const gx of BN.GULLS) { const x = gx * 16 + 4 - cx, y = BN.GULL_ROW * 16 - 2 - cy; ctx.fillStyle = '#d8d4c8'; ctx.fillRect(x, y, 7, 4); ctx.fillRect(x + 5, y - 2, 3, 3); ctx.fillStyle = Math.floor(time * 2 + gx) % 5 ? '#cfe8f0' : '#ffffff'; ctx.fillRect(x + 6, y - 1, 1, 1); }
    // Flotsam.
    for (const f of nightArea().flotsam ?? []) { const x = f.tx * 16 - cx, y = f.ty * 16 - cy; ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x + 4, y + 8, 8, 5); ctx.fillStyle = '#7a6a4a'; ctx.fillRect(x + 4, y + 8, 8, 1); ctx.fillStyle = '#9fc6d6'; ctx.fillRect(x + 10, y + 5, 2, 4); }
    const s = nightArea().sight;
    if (s?.id === 'ship') NART.drawShip(ctx, s.tx * 16 - cx, s.ty * 16 - cy, time);
  }
}
function areaNightDrawables() {
  if (!nightCity() || (!inYard() && world.room !== 'beach')) return [];
  const Y0 = nightArea(), out = [];
  for (const h of Y0.haunts) out.push(h.sprites ? { kind: 'walker', y: h.y, e: h } : { kind: 'nightThing', y: h.y, e: { haunt: h } });
  if (Y0.sight?.fig) out.push({ kind: 'walker', y: Y0.sight.fig.y, e: Object.assign(Y0.sight.fig, { alpha: Y0.sight.alpha }) });
  return out;
}

// ---------- v2.4: the shop open at night ----------
// Twice a week. Buyers who don't ask questions (rules/night-shop.js), the same hours as the
// night city. While it's open you're at the till; at four they stop coming and you go home.
function startNightShop() {
  ui.close();
  NS.openTonight(st);
  world.night = 'shop';
  clock.setSpan(NIGHT_SPAN);
  clock.load({ ...clock.save(), state: 'stopped', elapsedMs: 0, day: st.day });
  crowd = makeNightCrowd();
  world.nightTake = { sold: 0, total: 0, heat: 0, bust: null };
  const s = shopRoom().spawn;
  goThrough({ room: 'shop', tx: s.tx, ty: s.ty, facing: 'down' });
  clock.start();
  ui.toast(`Open after dark. ${NS.onNotice(st) ? 'You’re on notice. The Office could have anyone in here tonight.' : 'Whoever comes in won’t ask, and you won’t either.'}`, 3600);
  changed();
}
function makeNightCrowd() {
  const c = makeCrowd();
  const r = new RNG(`${st.seed}:nightshop:${st.day}`);
  const sims = NS.planNight(st, () => r.next());
  c.plan = sims.map((sim, i) => ({ kind: 'buy', sim, at: Math.min(0.92, (i + 0.4 + r.next() * 0.4) / sims.length * 0.85) }));
  c.world.offer = (sim, it) => (sim.shady ? NS.offer(sim, it) : null);
  c.world.judge = (sim, it) => (sim.shady ? NS.judge(sim, it) : null);
  c.world.restricted = () => null;   // the night doesn't care what the Office says (that's the risk)
  c.world.sell = (sim, it, amount) => {
    if (!sim.shady) return false;
    const res = NS.sell(st, sim, it, amount);
    const T0 = world.nightTake ??= { sold: 0, total: 0, heat: 0, bust: null };
    if (res?.caught) { T0.bust = res.caught; setTimeout(() => nightBust(res.caught), 300); }
    else if (res) { T0.sold += 1; T0.total += amount; T0.heat += res.heat; }
    return true;
  };
  c.events.pay = (cust, paid, it) => { if (cust?.sim?.undercover) return; cue(S.saleSfx(paid)); ui.toast(`Sold the ${S.Items.name(it)} for ${money(paid)}. ${cust.sim.name} pays cash and doesn’t look at it.`, 2400); changed(); };
  return c;
}
function nightBust(rec) {
  cue('knock');
  for (const c0 of [...crowd.list]) crowd.dismiss(c0);
  crowd.plan = crowd.plan?.slice(0, crowd.spawned) ?? [];
  speech.say([
    { who: 'Inspector Vance', text: 'He takes off the hat, and you know the face. “Municipal Office of Anomalous Property. After hours, cash, cursed stock. You’ve had a busy night.”' },
    { who: 'Inspector Vance', text: `“I’ll take this as evidence.” ${rec.text}` },
    { who: 'you', text: 'Everybody else melts out of the shop. The night’s over.' },
  ], { who: 'Inspector Vance', kind: 'talk' });
  clock.stop();
  world.night = 'done';
  changed();
}
// ---------- v2.3: fishing ----------
// Face open water from the beach (the pier, the surf, the rocks) or in town (the river mouth,
// the quay, the riverbank) and fish. The rules are in game/fishing.js; the screens in
// ui/fishing-panels.js; the line and The Reel in ui/fishing-art.js.
const THINGS_PER_DAY = 3;
let fishing = null;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function fishingSpot() {
  if (world.room !== 'city' && world.room !== 'beach') return null;
  const m = map(), f = player.feet, tx = Math.floor((f.x + f.w / 2) / 16), ty = Math.floor((f.y + f.h / 2) / 16);
  const [dx, dy] = DIRS[player.facing];
  for (const k of [1, 2]) {
    const wx = tx + dx * k, wy = ty + dy * k, ch = m.at(wx, wy);
    if (ch !== '~') { if (m.isSolid(wx, wy)) return null; continue; }
    let spot;
    if (world.room === 'city') { const c = cityLayout.river.cols[wy]; spot = c && wx >= c.x0 && wx <= c.x1 && wy < coastAt(wx) + 3 ? 'river' : 'harbor'; }
    else {
      let rocks = false;
      for (let yy = ty - 3; yy <= ty + 3 && !rocks; yy++) for (let xx = tx - 3; xx <= tx + 3; xx++) if (m.at(xx, yy) === 'r') { rocks = true; break; }
      spot = m.at(tx, ty) === 'd' && ty >= 24 ? 'pier' : rocks ? 'rocks' : 'surf';
    }
    return { spot, wx, wy };
  }
  return null;
}
function fishCond(spot) {
  const F = FISH.fishingOf(world), day = st.day, minute = clock.minute;
  const things = F.thingsDay?.day === day ? F.thingsDay.n : 0;
  return { spot, season: CAL.seasonOf(day), time: FISH.timeOfDay(minute), weather: todayWeather(), tide: FISH.tideAt(day, minute).name, bait: FISH.baitInUse(world), noThings: things >= THINGS_PER_DAY };
}
function fishConditionsLine() {
  if (!st) return '';
  const t = FISH.tideAt(st.day, clock.minute);
  return `${t.label} · ${WEATHER[todayWeather()].name} · ${CAL.seasonOf(st.day)[0].toUpperCase()}${CAL.seasonOf(st.day).slice(1)} ${FISH.timeOfDay(clock.minute)}`;
}
function startFishing(s) {
  if (!FISH.hasRod(world)) return ui.toast('You need a rod. The Bait & Tackle shack on the beach boardwalk sells them.', 2800);
  if (riding()) return ui.toast('Hop off your ride first.', 1600);
  if (clock.state !== 'running') return ui.toast('Too dark to see the line. Come back in the day.', 2200);
  const rng = new RNG(`${st.seed ?? 0}:fish:${st.day}:${FISH.fishingOf(world).casts++}`);
  const cond = fishCond(s.spot);
  fishing = { phase: 'cast', t: 0, spot: s, cond, rng, delay: FISH.biteDelay(cond, rng), bite: null, R: null };
  cue('tap');
  const Fw = FISH.fishingOf(world);
  // v2.5.2: the first few casts explain the reel, before anything bites.
  if ((Fw.reelTips ?? 0) < 3) { Fw.reelTips = (Fw.reelTips ?? 0) + 1; ui.toast('When it bites, tap to hook it. Then hold the button (or push the stick up) to lift your box, and keep the catch inside it.', 3000, { minor: true }); }
  else ui.toast(`${fishConditionsLine()}${cond.bait ? '' : ' · a bare hook'}`, 2200, { minor: true });
}
function stopFishing(text) { fishing = null; if (text) ui.toast(text, 2600); changed(); }
function stepFishing(dt, move, action, held = false) {
  const S_ = fishing; S_.t += dt;
  if (S_.phase === 'cast') { if (S_.t > 0.6) { S_.phase = 'wait'; S_.t = 0; } return; }
  if (S_.phase === 'wait') {
    if (action || move.mag > 0.6) return stopFishing('You reel in.');
    if (S_.t < S_.delay) return;
    const b = FISH.rollBite(S_.cond, S_.rng);
    if (!b) return stopFishing(S_.cond.noThings && S_.cond.bait === 'magnet' ? 'Nothing more down there today. The water’s given up what it had.' : 'Nothing’s biting here right now.');
    S_.bite = b; S_.phase = 'bite'; S_.t = 0; cue('bell');
    return;
  }
  if (S_.phase === 'bite') {
    if (action) {
      if (S_.cond.bait) FISH.useBait(world, S_.cond.bait);
      S_.R = FISH.startReel(S_.bite, FISH.rodOf(world), S_.rng, S_.cond.bait); S_.phase = 'reel'; S_.t = 0;
      if (S_.R.rod.tell) ui.toast(S_.bite.kind === 'thing' ? 'Dead weight. That’s no fish.' : 'It’s alive. It’s fighting.', 1600, { minor: true });
      return;
    }
    if (S_.t > FISH.rodOf(world).window) return stopFishing('Too slow. It got away.');
    return;
  }
  if (S_.phase === 'reel') {
    S_.hold = !!held || move.y < -0.35;
    const R = FISH.stepReel(S_.R, dt, S_.hold, S_.rng);
    if (R.done === 'snapped') return stopFishing(R.heavy ? 'It slipped off the hook and sank.' : 'It got away.');
    if (R.done === 'landed') return landCatch(S_);
  }
}
function landCatch(S_) {
  const F = FISH.fishingOf(world);
  if (S_.bite.kind === 'thing') {
    F.thingsDay = { day: st.day, n: (F.thingsDay?.day === st.day ? F.thingsDay.n : 0) + 1 };
    const it = S.Items.generate(st, { odds: { inert: 50, enchanted: 32, cursed: 18 } });
    it.fromWater = S_.cond.spot;
    st.inventory.loot.push(it);
    cue('find');
    return stopFishing(`You pulled up ${S.Items.name(it)}. Wet, and heavier than it looks. It’s on your bench.`);
  }
  const r = FISH.landFish(world, st.day, S_.bite);
  cue('bell');
  const size = r.lb < 1 ? `${Math.round(r.lb * 16)} oz` : `${r.lb.toFixed(1)} lb`;
  let text = `${r.fish.name}, ${size}${r.first ? '. New in your log!' : r.record ? '. Your biggest yet!' : '.'}`;
  if (!r.kept) text += ' The cooler’s full; you let it go.';
  fishing = null; changed();
  ui.toast(text, 2800);
  for (const rw of r.rewards) setTimeout(() => ui.toast(rw.text, 4200), 900);
  if (r.rewards.some(rw => rw.cash)) st.cash += r.rewards.reduce((a, rw) => a + (rw.cash ?? 0), 0);
}
function drawFishing(ctx, cx, cy) {
  if (!fishing) return;
  const f = player.feet, [dx, dy] = DIRS[player.facing];
  const hx = Math.round(player.x) - cx + 8 + dx * 8, hy = Math.round(player.y) - cy + 4 + (dy < 0 ? -6 : 0);
  const bx = fishing.spot.wx * 16 + 8 - cx, by = fishing.spot.wy * 16 + 8 - cy;
  fishing.screen = { x: Math.round(player.x) - cx + 8, y: Math.round(player.y) - cy + 8 };   // where the reel bar goes
  drawFishLine(ctx, hx, hy, bx, by, fishing.phase, time, fishing.phase === 'cast' ? Math.min(1, fishing.t / 0.6) : 1);
}
function drawFishingHud(ctx) {
  if (fishing?.phase === 'reel') drawReel(ctx, renderer.w, renderer.h, fishing.R, { time, hold: fishing.hold, at: fishing.screen });
}
// v2.4: Kip minds the shack every day but Sunday, when he's out on the pier and it runs on
// the honor tin. He's there from the morning to dusk (not at night). Each heart is a percent
// more for your catch while he's behind the counter.
const kipOnPier = () => !!st && CAL.weekdayOf(st.day) === 6 && !T.personOf(world, 'Kip').flags.maeGiven;   // v2.5: he stopped waiting
const kipHere = () => !!st && !isNight() && (clock.state === 'stopped' || clock.minute < 20 * 60);
const kipBonus = () => (kipHere() && !kipOnPier() ? REL.heartsOf(T.personOf(world, 'Kip').rel) / 100 : 0);
const KIP_LINES = ['Board’s up.', 'Fish or bait. I don’t do small talk.', 'Mm. You again.', 'Prices are prices.', 'Tide’s turning. Make it quick.'];
const tackleHooks = () => ({
  season: () => CAL.seasonOf(st.day),
  owner: kipHere() && !kipOnPier() ? { name: 'Kip', look: SIGNATURE.Kip, line: KIP_LINES[(st.day + T.personOf(world, 'Kip').talks) % KIP_LINES.length], bonus: kipBonus() } : null,
  sold: n => { const extra = Math.round(n * kipBonus()); st.cash += n + extra; cue('coins'); ui.toast(`+${S.money(n + extra)}${extra ? ` (${S.money(extra)} from Kip, for a friend)` : ''}`, 1800); changed(); },
  bought: c => { st.cash -= c; cue('till'); changed(); },
});
const tackleBoxHooks = () => ({ conditions: () => (inTown() || outdoors() ? fishConditionsLine() : '') });
// v2.3: the beach. Townsfolk on their towels, and strangers by the season: crowded on a
// summer weekend, a handful on a weekday in spring, nearly nobody in winter or the wet.
const beachToday = () => (st && !WET.has(todayWeather()) && !isNight() ? beachPeople(st.day, st.seed ?? 0, CAL.seasonOf(st.day), parkToday().names, dayPart()) : { names: [] });
function beachCrowd(area) {
  const taken = new Set([playerKey(), ...SIGNATURE_KEYS]);
  const named = beachToday().names.slice(0, area.spots.length);
  const people = named.map((name, i) => ({ name, spot: area.spots[i] }));
  // v2.4: Kip, by the shack door (Sundays, out on the end of the pier). He's there in any weather.
  if (kipHere()) people.push({ name: 'Kip', spot: kipOnPier() ? area.kip.pier : area.kip.shack, still: true });
  const pool = [...area.spots.slice(named.length), ...area.extras];
  const wd = CAL.weekdayOf(st?.day ?? 1), wet = WET.has(todayWeather());
  const k = (area.crowd[CAL.seasonOf(st?.day ?? 1)] ?? 0.5) * (wd >= 5 ? 1 : 0.6) * (wet ? 0.08 : todayWeather() === 'fog' ? 0.5 : 1);
  return new RoomCrowd(area, people, { extras: isNight() ? [] : pool.slice(0, Math.max(wet ? 0 : 1, Math.round(pool.length * k))), seed: `${st?.seed ?? 0}:${st?.day ?? 1}:beach`, taken });
}
function magicianSpot() {
  const L = cityLayout.locs.bar; if (!L) return null;
  const m = maps.city, s = L.stand;
  for (const [dx, dy] of [[2, 0], [-2, 0], [2, 1], [-2, 1], [3, 0], [-3, 0]]) {
    const tx = s.tx + dx, ty = s.ty + dy;
    if (!m.isSolid(tx, ty) && !m.isSolid(tx + 1, ty)) return { tx, ty };
  }
  return null;
}
// Phase 29: every day from noon to one he's at the Wandering Brush, having lunch with Erin.
// His table stays out, with a sign on it.
const ryanAtLunch = () => !!st && inTown() && clock.state !== 'stopped' && clock.minute >= 12 * 60 && clock.minute < 13 * 60;
let magicTable = null;
function syncMagician(dt) {
  const lunch = ryanAtLunch();
  const key = magicianOutside() ? `${st.day}${lunch ? ':lunch' : ''}` : '';
  if (key !== magicianKey) {
    magicianKey = key; magician = null;
    const spot = key ? magicianSpot() : null;
    magicTable = spot && lunch ? spot : null;
    if (spot && !lunch) {
      magician = new Guide(30, SIGNATURE.Ryan);
      magician.who = 'Ryan'; magician.sprites = spritesFor(SIGNATURE.Ryan);
      magician.place('city', spot.tx, spot.ty, 'down'); magician.home = spot;
    }
  }
  if (!magician) return;
  const near = Math.hypot(player.x - magician.x, player.y - magician.y) < 60;
  magician.update(dt, near ? player : null);
  if (!near) magician.facing = 'down';
}
// A little folding table beside him: a purple cloth with gold fringe, a deck, a top hat.
function drawMagicTable(ctx, at, cx, cy, t) {
  const x = (at.tx + 1) * 16 - cx + 1, y = at.ty * 16 - cy + 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, y + 12, 14, 2);
  ctx.fillStyle = '#07080c'; ctx.fillRect(x - 1, y + 1, 16, 11);
  ctx.fillStyle = '#4a2a6e'; ctx.fillRect(x, y + 2, 14, 9);
  ctx.fillStyle = '#6a3ad0'; ctx.fillRect(x, y + 2, 14, 2);
  ctx.fillStyle = '#e0a64a'; for (let i = 0; i < 14; i += 2) ctx.fillRect(x + i, y + 10, 1, 2);
  ctx.fillStyle = '#efe8d8'; ctx.fillRect(x + 2, y + 4, 4, 5); ctx.fillStyle = '#b2463f'; ctx.fillRect(x + 3, y + 5, 2, 1);
  ctx.fillStyle = '#16181e'; ctx.fillRect(x + 8, y - 2, 5, 6); ctx.fillRect(x + 7, y + 4, 7, 1);
  if (!settings.reducedMotion && Math.floor(t * 1.5) % 4 === 0) { ctx.fillStyle = '#c9a8ff'; ctx.fillRect(x + 10, y - 4 - Math.floor(t * 6) % 3, 1, 1); }
}
// A little card propped on the table: BACK AT 1.
function drawLunchSign(ctx, at, cx, cy) {
  const x = (at.tx + 1) * 16 - cx + 2, y = at.ty * 16 - cy - 6;
  ctx.fillStyle = '#07080c'; ctx.fillRect(x - 1, y - 1, 12, 9);
  ctx.fillStyle = '#efe8d8'; ctx.fillRect(x, y, 10, 7);
  ctx.fillStyle = '#4a2a6e'; ctx.fillRect(x + 2, y + 2, 6, 1); ctx.fillRect(x + 2, y + 4, 4, 1);
}
function openMagicAct(where) {
  openMagic(g, {
    look: SIGNATURE.Ryan, where, rand: () => Math.random(), cue: name => cue(name),
    hoursLeft: () => (clock.state === 'running' ? clock.hoursLeft : 24), spend: h => { if (clock.state === 'running') clock.advanceMinutes(h * 60); },
    talk: () => { ui.close(); talkTo('Ryan'); },
    // His friendship (data/relationships.js): a point for every show you watch, and his lucky
    // coin at ten hearts doubles the jackpot.
    onShow: () => { const c = T.makeCtx(world, st, 'Ryan', { name: 'Ryan' }); T.addRel(c, 1); c.p.lastDay = st.day; },
    jackpotChance: () => (T.personOf(world, 'Ryan').flags['event:10'] ? 0.02 : 0.01),
    get hearts() {
      const p = T.personOf(world, 'Ryan');
      if (!p.met) return null;
      const k = REL.pendingEvent(world, 'Ryan');
      return { text: heartsText(p.rel), label: `${REL.heartsOf(p.rel)} of ${REL.MAX_HEARTS} hearts`, pending: k != null, note: k != null ? 'He looks like he wants to tell you something.' : p.flags['event:10'] ? 'His lucky coin is in your pocket.' : null };
    },
  });
}

// ---------- home (Phase 27) ----------
// Every day starts in your apartment, across the street from the shop, and every night ends
// there. The front door is where you choose the day.
function wakeUp() { const w = APARTMENT.wake; placeAt('apartment', w.tx, w.ty, w.facing); }
function goHome() { const d = APARTMENT.door; goThrough({ room: 'apartment', tx: d.tx, ty: d.ty, facing: 'up' }); }
const youSay = (lines, opts = {}) => speech.say([].concat(lines).map(t => ({ who: 'you', text: t })), { who: 'you', ...opts });

function openHomeDoor() {
  if (wt.active) return ui.toast('Not now. Mina wants a word.');
  const L = cityLayout.locs.apartment;
  const toStreet = () => { ui.close(); goThrough({ room: 'city', tx: L.stand.tx, ty: L.stand.ty, facing: 'down' }); };
  if (!wt.active) {
    const nightOk = !world.shopSession && nightRunOk();
    return ui.open({
      id: 'door', eyebrow: `${CAL.formatDate(st.day)} · ${clock.label}`, title: 'Your front door',
      body: [
        el('p', {}, world.shopSession ? 'The shop across the street is open.' : 'The shop is across the street. The rest of town is out the other way.'),
        nightOk ? el('p', { class: 'note', id: 'door-dark' }, `It’s dark until ${clockText(NW.dawnMinute(CAL.seasonOf(st.day)))}. ${MOON.moonOn(st.day).name} tonight.`) : null,
        !nightOk && !world.shopSession && !world.night && nightRunUsed() && NW.canRun(CAL.seasonOf(st.day), clock.cycle.minuteOfDay) ? el('p', { class: 'note', id: 'door-been-out' }, 'You’ve already been out tonight.') : null,
      ],
      actions: [
        { id: 'door-shop', label: 'Across the street: the shop', kind: 'primary', onClick: () => { ui.close(); const sp = shopRoom().spawn; goThrough({ room: 'shop', tx: sp.tx, ty: sp.ty, facing: 'down' }); } },
        { id: 'door-street', label: 'Out to the street', onClick: toStreet },
        ...(nightOk ? [
          { id: 'door-night-city', label: 'Walk the city tonight', onClick: () => startNightWalk() },
          { id: 'door-night-zones', label: 'Go out into the zones', onClick: () => { sendText('zones'); startZones(); } },
        ] : []),
        { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() },
      ],
    });
  }
  if (st.phase === 'morning' && !world.dayMode) {
    const closed = closedToday();
    return ui.open({
      id: 'door', eyebrow: `${CAL.formatDate(st.day)} · Your front door`, title: 'Where to today?',
      body: [
        forecastCard(),
        closed.length ? el('p', { class: 'note' }, `Closed all day in town: ${closed.join(', ')}.`) : null,
        el('dl', { class: 'readout' },
          el('dt', {}, 'Shop'), el('dd', {}, `${stageOf(world).name} · open ${shopHours(shopState(world).tier)} · ${Object.keys(world.displays).length} of ${world.shop?.layout?.cases?.length ?? 0} cases full`),
          el('dt', {}, 'Errands'), el('dd', {}, `${(st.ap?.max ?? 8) + (hasEdge(world, 'errand') ? 1 : 0)} hours in the city`)),
        el('p', { class: 'note' }, 'One or the other. The clock starts when you step out.'),
      ],
      actions: [
        { id: 'choose-shop', label: 'Open the shop across the street', kind: 'primary', onClick: () => chooseDay('shop') },
        { id: 'choose-city', label: 'Go into the city', onClick: () => chooseDay('city') },
        { id: 'door-stay', label: 'Not yet', kind: 'quiet', onClick: () => ui.close() },
      ],
    });
  }
  if (world.dayMode === 'city' && clock.state === 'running') {
    return ui.open({
      id: 'door', eyebrow: `Your front door · ${clock.label}`, title: 'Heading out?',
      body: [el('p', {}, `${hoursText(clock)} of errands left. The landlord lives downstairs, if you need him.`)],
      actions: [
        { id: 'door-out', label: 'Back out to the street', kind: 'primary', onClick: toStreet },
        { id: 'door-landlord', label: 'Knock on the landlord’s door', onClick: () => { ui.close(); openLocation(g, 'apartment'); } },
        { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() },
      ],
    });
  }
  if (world.dayMode === 'shop' && clock.state === 'running') return ui.open({
    id: 'door', eyebrow: 'Your front door', title: 'The shop’s open',
    body: [el('p', {}, 'Customers are waiting across the street.')],
    actions: [{ id: 'door-shop', label: 'Back to the shop', kind: 'primary', onClick: () => { ui.close(); const sp = shopRoom().spawn; goThrough({ room: 'shop', tx: sp.tx, ty: sp.ty, facing: 'down' }); } }, { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() }],
  });
  // v2.4: out for the night: back out, or back to the shop.
  if (nightCity() && clock.state === 'running') return ui.open({
    id: 'door', eyebrow: `Your front door · ${clock.label}`, title: 'Back out?',
    body: [el('p', {}, 'The street’s dark and quiet. You could still turn in.')],
    actions: [{ id: 'door-out', label: 'Back out into the night', kind: 'primary', onClick: toStreet }, { label: 'Stay in', kind: 'quiet', onClick: () => ui.close() }],
  });
  if (nightShop() && clock.state === 'running') return ui.open({
    id: 'door', eyebrow: 'Your front door', title: 'The shop’s open late',
    body: [el('p', {}, 'Someone might be waiting at the till across the street.')],
    actions: [{ id: 'door-shop', label: 'Back to the shop', kind: 'primary', onClick: () => { ui.close(); const sp = shopRoom().spawn; goThrough({ room: 'shop', tx: sp.tx, ty: sp.ty, facing: 'down' }); } }, { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() }],
  });
  if (isNight() && world.night !== 'done' && world.night !== 'city' && world.night !== 'shop') return openNight();
  return ui.toast(isNight() ? 'It’s late. The bed’s in the bedroom.' : 'Not now.');
}

function useBed() {
  if (wt.active) return wt.allows('cot') ? wt.event('cot') : ui.toast('Not now. Mina’s still talking.');
  return continuousBed();
  if (isNight()) return confirmSleep();
  if (world.dayMode === 'city' && clock.state === 'running') return ui.open({
    id: 'bed', eyebrow: `${CAL.formatDate(st.day)} · ${clock.label}`, title: 'Call it a day?',
    body: [el('p', {}, `You still have ${hoursText(clock)} of errands. Turning in now ends the day.`)],
    actions: [{ id: 'bed-end', label: 'End the day', kind: 'primary', onClick: () => { ui.close(); clock.endDay(); } }, { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() }],
  });
  return ui.toast(st.phase === 'morning' ? 'You just got up. The day’s waiting.' : 'Not yet. The day isn’t over.');
}

// ---- Phase 30 (continuous mode): the sim's day follows the clock's date ----
// The date changes at midnight. While the shop is open the roll waits for closing time, so an
// overnight shift stays one day's ledger. Safe to call any time: it only rolls what's behind.
function syncSimDate() {
  let note = null;
  for (let n = 0; !world.shopSession && st.day < clock.cycle.date + 1 && n < 14; n++) {
    const r = A.rollDate(st);
    note = [note, r.rentNote].filter(Boolean).join(' ') || note;
  }
  return note;
}
function midnightRoll() {
  const before = st.day, note = syncSimDate();
  if (st.day === before) return;
  refreshSeason();
  changed();
  if (note) ui.toast(note, 2600);
  if (st.gameOver) openGameOver();
}

// ---- Phase 30 (continuous mode): night runs ----
// Night runs start at the front door whenever it's dark and the shop isn't open. How much dark is
// left depends on the season, so a summer night is a short run and a winter one a long one.
// One night run a night, like the original's one choice for the whole night.
const nightRunUsed = () => world.nightRunWindow != null && world.nightRunWindow === clock.cycle.window;
const nightRunOk = () => !!st && !world.shopSession && !world.night && !nightRunUsed() && NW.canRun(CAL.seasonOf(st.day), clock.cycle.minuteOfDay);
const nightRunMinutes = () => NW.runMinutes(CAL.seasonOf(st.day), clock.cycle.minuteOfDay, CONFIG.night.hours * 60);

function startNightWalk() {
  st.phase = 'night';
  startNightCity();
}
function startZones() {
  st.phase = 'night';
  openZones(g, enterZone, () => { st.phase = 'errands'; openHomeDoor(); }, { shield: shieldPreview() });
}
// A run is over (dawn, or the player went home): back to free time.
function backToFreeTime() {
  clock.endTimed();
  night = null;
  world.night = null;
  st.phase = 'errands';
  world.dayMode = 'city';
  clock.start();
}
function endNightWalk(why) {
  clock.stop();
  backToFreeTime();
  if (why === 'dawn') ui.toast('Dawn’s coming. The night’s over.', 2800);
  changed();
}

// ---- Phase 30 (continuous mode): the shop's hours and the OPEN sign ----
// The shop opens when the player flips the sign inside the hours, and they're locked in until
// closing time (or until they close early). A shop day can only be run once.
const clockText = t => { const m = Math.round(t) % 1440, h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'); return `${h % 12 || 12}:${mm} ${h < 12 ? 'AM' : 'PM'}`; };
const hoursObj = () => new ShopHours(CONFIG.shopHours).load(world.shopHours);
const weekdayOfDate = date => CAL.weekdayOf(date + 1);       // the sim's days count from 1
// The hours that cover right now: { date, from, to } in absolute game minutes, or null.
function shopWindowNow() {
  const hrs = hoursObj(), date = hrs.openDate(clock.cycle.t, weekdayOfDate);
  if (date === null) return null;
  const h = hrs.hoursOn(weekdayOfDate(date));
  return { date, from: date * 1440 + h.open, to: date * 1440 + h.open + h.minutes };
}
function shopProgress() {
  const s = world.shopSession;
  return s ? Math.max(0, Math.min(1, (clock.cycle.t - s.opened) / Math.max(1, s.to - s.opened))) : 0;
}

function shopSignCard() {
  const s = world.shopSession, win = shopWindowNow();
  const today = hoursObj().hoursOn(weekdayOfDate(clock.cycle.date));
  const eyebrow = `${CAL.formatDate(st.day)} · ${clock.label}`;
  if (s) {
    return ui.open({
      id: 'shop-sign', eyebrow, title: 'The shop’s open',
      body: [el('p', {}, `Open until ${clockText(s.to)}. The front door and the back room stay shut until you close.`)],
      actions: [{ id: 'close-early', label: 'Close early', kind: 'danger', onClick: () => endShopSession('early') }, { label: 'Keep going', kind: 'quiet', onClick: () => ui.close() }],
    });
  }
  if (win && world.shopClosedDate !== win.date) {
    return ui.open({
      id: 'shop-sign', eyebrow, title: 'Flip the sign?',
      body: [el('p', {}, `Hours today: ${clockText(win.from)} to ${clockText(win.to)}. Once it’s open you’re in the shop until closing time.`)],
      actions: [
        { id: 'open-shop', label: `Open the shop until ${clockText(win.to)}`, kind: 'primary', onClick: () => openShopSession(win) },
        { id: 'sign-hours', label: 'Set the weekly hours', onClick: () => openShopHoursPanel() },
        { id: 'sign-home', label: 'Head home', onClick: () => { ui.close(); goHome(); } },
        { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() },
      ],
    });
  }
  const why = win ? 'You already ran the shop today.' : today ? `Today’s hours are ${clockText(today.open)} to ${clockText(today.close)}, and it’s not time.` : 'The shop’s closed today.';
  return ui.open({
    id: 'shop-sign', eyebrow, title: 'Closed',
    body: [el('p', {}, why), el('p', { class: 'note' }, 'The back room is open while the shop’s shut.')],
    actions: [{ id: 'sign-home', label: 'Head home', kind: 'primary', onClick: () => { ui.close(); goHome(); } }, { id: 'sign-hours', label: 'Set the weekly hours', onClick: () => openShopHoursPanel() }, { label: 'Stay', kind: 'quiet', onClick: () => ui.close() }],
  });
}

function openShopHoursPanel() {
  if (world.shopSession) return ui.toast('The hours can’t change while the shop’s open.', 2400);
  openHoursPanel(g, {
    cfg: CONFIG.shopHours, saved: world.shopHours ?? hoursObj().save(),
    onSave: saved => { world.shopHours = saved; changed(); ui.toast('Hours saved.', 1800); shopSignCard(); },
    onBack: () => shopSignCard(),
  });
}

function openShopSession(win) {
  ui.close();
  openShopDay(st);
  st.phase = 'day';
  world.shopSession = { date: win.date, opened: clock.cycle.t, to: win.to };
  world.dayMode = 'shop';
  crowd = makeCrowd();
  changed();
  ui.toast(Object.keys(world.displays).length ? `Open until ${clockText(win.to)}.` : `Open until ${clockText(win.to)}. Your cases are empty: buyers need tagged stock to look at.`, 2800);
}

// Closing time, or closing early: customers out, the day's sales settled, the staff paid, then
// back to free time.
function endShopSession(reason) {
  if (!world.shopSession) return;
  if (ui.isOpen) ui.close();
  for (const c of [...crowd.list]) crowd.dismiss(c);
  crowd.clear();
  const heat0 = st.heat;
  const report = A.closeShop(st);
  if (report) {
    const pay = payroll(world, st);
    if (pay.paid.length || pay.quit.length) {
      report.items = report.items.filter(x => !/^Nothing sold today/.test(x.text));
      report.items.push(...payrollNews(pay));
      if (!report.sold) report.items.unshift({ kind: 'odd', text: 'Nothing sold today. The news had nothing on you, at least.', tag: '' });
    }
  }
  staffFloor.reset();
  st.phase = 'errands';
  world.shopClosedDate = world.shopSession.date;
  world.shopSession = null;
  world.dayMode = 'city';
  changed();
  if (st.gameOver) return;
  ui.open({
    id: 'news', size: 'wide', eyebrow: `${CAL.formatDate(st.day)} · ${reason === 'early' ? 'Closed early' : 'Closing time'}`, title: report ? 'The evening news' : 'Evening',
    reason: 'dayend', dismissable: false,
    body: report ? newsBody(report, st, heat0) : [el('p', {}, 'You lock up.')],
    actions: [{ id: 'lock-up', label: 'Lock up', kind: 'primary', onClick: () => { ui.close(); midnightRoll(); } }],
  });
}

// The third skipped night: the player passes out and the whole date is lost. Somebody finds them and
// takes them home, everyone who knows them takes it to heart (half a heart each), and the sim's days
// roll on (rent is still due). The reactions show on waking.
function collapseScene(e) {
  if (ui.isOpen) ui.close();
  if (world.shopSession) { endShopSession('early'); if (ui.isOpen) ui.close(); }
  if (world.night) backToFreeTime();
  clock.stop();
  const known = REL.relationshipNames().filter(n => T.personOf(world, n).met).map(n => ({ name: n, hearts: REL.heartsOf(T.personOf(world, n).rel) }));
  AP.extendForMissedDay(st.inventory.loot.filter(x => x.job).map(x => x.job));   // a lost day gives open jobs one more
  world.collapse = { found: NC.seenHome('city', known, st.day), reactions: EX.collapseReactions(known, rng), missedDate: e.missedDate };
  for (const n of REL.relationshipNames()) { const p = T.personOf(world, n); if (p.met) p.rel = EX.afterMissedDay(p.rel); }
  changed();
  sleep();
}

function collapseWakeCard() {
  const c = world.collapse; world.collapse = null;
  ui.open({
    id: 'collapse', eyebrow: `${CAL.formatDate(st.day)} · ${clock.label}`, title: 'You lost a whole day', reason: 'morning', dismissable: false,
    body: [
      el('p', {}, 'You pushed it too far and passed out. When you came to, the day was gone.'),
      ...c.found.lines.map(l => el('p', { class: 'speech' }, l)),
      c.reactions.length ? el('p', { class: 'label' }, 'Word got around') : null,
      ...c.reactions.map(r => el('p', { class: `note collapse-${r.tier}` }, r.line)),
      c.reactions.length ? el('p', { class: 'note warnline' }, 'Everyone who knows you well took it to heart. Half a heart lost with each of them. Rent was still due.') : null,
    ],
    actions: [{ id: 'collapse-ok', label: 'Get up', kind: 'primary', onClick: () => beginContinuousDay(false) }],
  });
}

// Phase 30 (continuous mode): sleeping is allowed from 8 PM to 10 AM, once a window, and takes at
// least six hours. It fast-forwards, then the sim's own sleep runs (rent, the morning, and so on).
function continuousBed() {
  const cy = clock.cycle;
  if (!cy.canSleep) {
    return ui.toast(cy.sleepBlock === 'alreadySlept' ? 'You’ve already slept. The bed can wait until tonight.' : 'You’re not tired yet. The bed is for 8 PM to 10 AM.', 2600);
  }
  const min = cy.t + CONFIG.cycle.minSleepMinutes, until = cy.windowEnd;
  const short = min > until;
  ui.open({
    id: 'sleep', eyebrow: `${CAL.formatDate(st.day)} · ${clock.label}`, title: 'Turn in?',
    body: [
      el('p', {}, short ? `It’s late. The morning cuts in at 10 AM, so you’ll get less than six hours and walk slowly until you’ve had a full sleep.` : `Six hours of sleep, at least. You’d wake at ${clockText(min)}, or you can sleep in until ${clockText(until)}.`),
    ],
    actions: [
      { id: 'sleep-min', label: short ? `Sleep until ${clockText(until)}` : `Sleep ${CONFIG.cycle.minSleepMinutes / 60} hours`, kind: 'primary', onClick: () => { ui.close(); continuousSleep(null); } },
      ...(!short && until > min ? [{ id: 'sleep-long', label: `Sleep in until ${clockText(until)}`, onClick: () => { ui.close(); continuousSleep(until); } }] : []),
      { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}

function continuousSleep(until) {
  const r = clock.cycle.sleep({ until });
  if (!r.ok) return ui.toast('You can’t sleep right now.', 2000);
  sleep();
}

function openWardrobe() {
  openCreator(ui, {
    look: world.look ?? CLASSIC_LOOK, eyebrow: 'Your wardrobe', title: 'What to wear', okLabel: 'Wear this', reason: 'panel',
    onDone: l => { world.look = l; syncLook(); changed(); ui.close(); ui.toast('Looking sharp.', 1600, { minor: true }); },
    onBack: () => ui.close(),
  });
}

function useKitchen() {
  const h = homeState(world);
  if (h.coffee === st.day) return ui.toast('You’ve had your coffee. Any more and you’ll hear colors.', 2200);
  h.coffee = st.day;
  st.stress = Math.max(0, st.stress - 6);
  if (clock.state === 'running') clock.advanceMinutes(15);
  changed();
  youSay(pickDay(['Coffee, black, the way Dad made it. Too strong. Perfect.', 'Toast and coffee standing at the counter. Breakfast of pawnbrokers.', 'The kettle screams. You pour. For a minute the day can wait.'], 1));
}

function useRadio() {
  const today = todayWeather(), tomorrow = weatherOn(st.seed ?? 0, st.day + 1);
  speech.say([
    { text: `WKNT, the voice of the night owls. ${WEATHER[today].blurb}`, who: 'WKNT', kind: 'radio' },
    { text: `The weatherman’s best guess for tomorrow: ${WEATHER[tomorrow].name.toLowerCase()}. ${pickDay(['He’s been wrong before.', 'Don’t quote him.', 'Take an umbrella anyway.'], 2)}`, who: 'WKNT', kind: 'radio' },
    ...birthdayRadio(),
    ...(holidayOn(st.day)?.radio ? [{ text: holidayOn(st.day).radio, who: 'WKNT', kind: 'radio' }] : []),
  ], { who: 'WKNT', kind: 'radio' });
}

// Phase 29: WKNT's birthday shout-outs: today's, then the next couple of days.
function birthdayRadio() {
  const ahead = birthdaysAhead(st.day, 3), today = ahead.filter(b => !b.inDays), soon = ahead.filter(b => b.inDays);
  const out = [];
  if (today.length) out.push({ text: `And a happy birthday today to ${listNames(today.map(b => b.name))}, from all of us night owls at WKNT.`, who: 'WKNT', kind: 'radio' });
  if (soon.length) out.push({ text: `Birthdays coming up: ${soon.map(b => `${b.name} ${whenText(b.inDays, b.day)}`).join(', ')}. Don’t forget a card.`, who: 'WKNT', kind: 'radio' });
  return out;
}
const listNames = a => (a.length < 2 ? a[0] : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

function lookAtPhoto() {
  const open = S.Story.doorOpen?.(st);
  youSay(open ? ['Mom and Dad at the shop’s grand reopening. The other door is open now. You keep looking at the photo like it might answer.']
    : pickDay([['Mom and Dad in front of the shop, the year it reopened. Dad’s squinting. Mom’s laughing at him.'], ['Their wedding photo. The frame is a pawn ticket stub glued to cardboard. Of course it is.'], ['You and Dad at the Bijou when you were nine. You don’t remember the movie. You remember the popcorn.']], 3));
}

function lookOutWindow() {
  const shopLit = world.dayMode === 'shop' && clock.state === 'running';
  youSay([`${WEATHER[todayWeather()].name} over Pell Street. ${shopLit ? 'Across the way, the shop’s sign is lit.' : isNight() ? 'Across the way, the shop is dark. Something in the basement window catches the streetlight.' : 'Across the way, Second Sight waits with its sign turned to CLOSED.'}`]);
}

function openHomeBoard() {
  const h = homeState(world), L = homeLayout(world), comfort = comfortOf(L);
  const stored = [...new Set(h.stored)];
  ui.open({
    id: 'homeBoard', eyebrow: 'Your apartment', title: 'Making it home',
    body: [
      el('dl', { class: 'readout' },
        el('dt', {}, 'Comfort'), el('dd', {}, comfort ? `${comfort} · ${sleepStress(comfort)} less stress overnight${wellRested(comfort) ? ' · well rested (more bench time)' : ` · ${8 - comfort} more and you’ll wake up well rested`}` : 'Bare walls. Sleep is sleep.'),
        el('dt', {}, 'Furniture out'), el('dd', {}, `${L.decor.length}${stored.length ? ` · ${h.stored.length} put away` : ''}`)),
      el('p', { class: 'note' }, 'Erin’s Wandering Brush in Westside sells furniture for your place (she’ll tell you what it needs, too). Put it out and move it around from here.'),
      // Phase 29: the week's birthdays, pinned up.
      el('h3', { class: 'sec-title' }, el('span', {}, 'Birthdays'), el('span', {}, 'this week')),
      (() => { const ahead = birthdaysAhead(st.day, 6); return ahead.length
        ? el('ul', { class: 'bday-list' }, ahead.map(b => el('li', { class: b.inDays ? '' : 'today' }, el('strong', {}, b.name), ` · ${whenText(b.inDays, b.day)}${REL.hasRelationship(b.name) ? ' · a gift counts double' : ''}`)))
        : el('p', { class: 'note' }, 'Nobody’s birthday this week.'); })(),
      el('p', { class: 'note' }, 'Wish someone a happy birthday when you see them on the day. WKNT on the radio reads them out too.'),
    ],
    actions: [
      { id: 'home-arrange', label: 'Rearrange the furniture', kind: 'primary', onClick: () => startArranging() },
      { label: 'Close', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}
const pickDay = (list, salt = 0) => list[(st.day * 7 + salt) % list.length];

// Erin's Wandering Brush (Phase 28): her counter. Furniture for your apartment (friends get
// a discount), her advice on the place, or just a chat.
function openErinShop(advice = false) {
  // Ten hearts with her (Phase 29): the family rate.
  const p = T.personOf(world, 'Erin'), tier = REL.heartsOf(p.rel) >= REL.MAX_HEARTS ? 'family' : T.tierOf?.(p.rel)?.id ?? null;
  const disc = ERIN_DISCOUNT[tier] ?? 0, a = designAdvice(world, tier);
  const again = adv => openErinShop(adv);
  const rows = DECOR.map(d => {
    const price = priceFor(d.id, tier), why = homeBuyBlocker(st, d.id, price), have = homeOwned(world, d.id);
    return el('article', { class: 'row-card' },
      el('div', { class: 'row-text' }, el('strong', {}, `${d.name} · ${money(price)}${disc ? ` (was ${money(d.cost)})` : ''}`), el('span', {}, d.blurb),
        el('small', {}, `Comfort +${d.charm}${have ? ` · you have ${have}` : ''}`), why ? el('small', { class: 'warnline' }, why) : null),
      el('button', { type: 'button', class: 'btn small', id: `home-buy-${d.id}`, disabled: !!why, onclick: () => {
        const r = buyForHome(world, st, d.id, price); if (r.error) return ui.toast(r.error);
        const c = T.makeCtx(world, st, 'Erin', { name: 'Erin' }); T.addRel(c, 1); c.p.met = true; c.p.lastDay = st.day;
        changed(); ui.toast(`${d.name}: Erin will have it delivered to your apartment. Put it out from the corkboard.`, 2800); again(advice);
      } }, 'Buy'));
  });
  const tip = !a.comfort ? 'Your place is bare, isn’t it? Start small. One good piece and the room starts to feel like yours.'
    : a.rested ? 'Your place is cozy now. You should be waking up rested. Anything else is just for joy.'
    : `You’re ${a.toRested} comfort away from waking up properly rested.${a.next ? ` If it were me, I’d get the ${a.next.name.toLowerCase()} next.` : ''}`;
  const stored = a.stored ? ` And you have ${a.stored} thing${a.stored === 1 ? '' : 's'} still in boxes. Put them out, honey.` : '';
  ui.open({
    id: 'erinShop', size: 'wide', eyebrow: 'Erin’s Wandering Brush', title: 'Erin, Interior Designer',
    body: [
      faceRow(SIGNATURE.Erin, 'Erin', el('p', { class: 'speech' }, `“${advice ? tip + stored : ['Looking for something for the apartment?', 'Every room is asking for something. Let’s find out what yours wants.', 'Mind the paint. Everything here is for living in.'][st.day % 3]}”`)),
      el('dl', { class: 'readout' },
        el('dt', {}, 'Your place'), el('dd', {}, a.comfort ? `Comfort ${a.comfort}${a.rested ? ' · well rested' : ` · ${a.toRested} more for well rested`}` : 'Bare walls'),
        el('dt', {}, 'Delivery'), el('dd', {}, 'Free, right to your door, no time out of your day'),
        ...(disc ? [el('dt', {}, tier === 'family' ? 'Family' : 'Friends'), el('dd', {}, `${Math.round(disc * 100)}% off`)] : [])),
      el('h3', { class: 'sec-title' }, el('span', {}, 'For your apartment'), el('span', {}, tier === 'family' ? 'family rate' : disc ? 'friend prices' : 'friends get a discount')),
      el('div', { class: 'rows' }, rows),
    ],
    actions: [
      { id: 'erin-advice', label: 'What would you do with my place?', onClick: () => again(true) },
      { id: 'erin-chat', label: 'Just chat', onClick: () => { ui.close(); talkTo('Erin'); } },
      { label: 'Back', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}

// ---------- rearranging the shop (Phase 24) ----------
// You move a cursor around the floor plan and pick things up and put them down
// (game/arranger.js). Only with nobody in the shop; the game waits while you do it.
const arranger = new Arranger();
const arrangeBar = document.getElementById('arrange-bar');
const abTitle = document.getElementById('ab-title'), abHint = document.getElementById('ab-hint');
const abCancel = document.getElementById('ab-cancel'), abStore = document.getElementById('ab-store');
let arrHold = 0, arrDir = '', abShown = '';

function arrangeBlocker() {
  if (!st || (world.room !== 'shop' && world.room !== 'apartment')) return 'You can rearrange from the shop floor.';
  if (wt.active) return 'Not tonight.';
  if (world.room === 'shop' && crowd?.list.length) return 'Wait until there are no customers in the shop.';
  return null;
}
const atHome = () => arranger.where === 'home';
const syncArranged = () => (atHome() ? syncHome() : syncShop());
function startArranging() {
  const why = arrangeBlocker();
  if (why) { ui.toast(why, 2200); return false; }
  ui.close();
  const c = player.center, home = world.room === 'apartment', m = home ? maps.apartment : maps.shop;
  arranger.start(world, { tx: Math.floor(c.x / 16), ty: Math.max(home ? 2 : 5, Math.floor(c.y / 16) + 1) }, { w: m.cols, h: m.rowsN }, home ? homeKit(world) : null);
  if (!pause.has('arrange')) pause.push('arrange');
  arrangeBar.hidden = false; layer.classList.add('arranging'); abShown = '';
  syncArrangeBar();
  return true;
}
function stopArranging() {
  if (!arranger.on) return;
  const moved = arranger.finish();
  pause.clear('arrange');
  arrangeBar.hidden = true; layer.classList.remove('arranging');
  const home = atHome();
  syncShop(); syncHome(); unstickPlayer(); changed();
  if (moved) { S.log(st, home ? 'Moved the furniture around at home.' : 'Rearranged the shop floor.', 'note'); ui.toast(home ? 'Home sweet home.' : 'The shop’s arranged.', 1600, { minor: true }); }
}
// Out of arranging: put down what you're holding first, then stop.
function resetArranging() { arranger.on = false; arranger.hand = null; pause.clear('arrange'); arrangeBar.hidden = true; layer.classList.remove('arranging'); }
function arrangeBack() { if (arranger.hand) { arranger.cancel(); syncArranged(); } else stopArranging(); }
function arrangeStore() { if (arranger.store()) { cue('stamp'); syncArranged(); } }
function arrangeAct() {
  const r = arranger.primary();
  if (!r) return;
  if (r.error) { cue('refuse'); ui.toast(r.error, 1800, { minor: true }); return; }
  if (r.placed) cue('stamp');
  syncArranged();
}
function openArrangeDecor() {
  if (atHome()) return openHomeStored();
  openDecor(g, id => {
    const r = arranger.takeOut(id);
    if (r?.error) return ui.toast(r.error, 2200);
    ui.close(); syncShop();
  });
}
// At home: the furniture you've bought and put away, to place.
function openHomeStored() {
  const h = homeState(world), ids = [...new Set(h.stored)];
  ui.open({
    id: 'homeStored', eyebrow: 'Arranging your apartment', title: 'Put away',
    body: ids.length ? [el('ol', { class: 'stages' }, ids.map(id => { const d = decorDef(id), n = h.stored.filter(x => x === id).length;
      return el('li', { class: 'stage next' }, el('div', { class: 'stage-head' }, el('strong', {}, d.name), el('span', { class: 'stage-tag' }, `×${n}`)), el('span', {}, d.blurb),
        el('div', { class: 'row-btns' }, el('button', { type: 'button', class: 'btn small primary', id: `place-${id}`, onclick: () => { const r = arranger.takeOut(id); if (r?.error) return ui.toast(r.error); ui.close(); syncHome(); } }, 'Place it'))); }))]
      : [el('p', {}, 'Nothing put away. Kowalski Hardware sells furniture on errand days.')],
    actions: [{ label: 'Back', kind: 'quiet', onClick: () => ui.close() }],
  });
}
function arrangeMove(dt, move) {
  if (move.mag < 0.5) { arrDir = ''; return; }
  const d = Math.abs(move.x) > Math.abs(move.y) ? (move.x > 0 ? 'r' : 'l') : (move.y > 0 ? 'd' : 'u');
  if (d !== arrDir) { arrDir = d; arrHold = 0.3; } else if ((arrHold -= dt) > 0) return; else arrHold = 0.1;
  arranger.step(d === 'r' ? 1 : d === 'l' ? -1 : 0, d === 'd' ? 1 : d === 'u' ? -1 : 0);
}
// A tap on the floor: pick up what's there, or put down what you're holding.
function arrangeTap(e) {
  const p = orientation.toLocal(e.clientX, e.clientY);
  const tx = Math.floor((p.x * renderer.dpr / renderer.scale + camera.ix) / 16), ty = Math.floor((p.y * renderer.dpr / renderer.scale + camera.iy) / 16);
  arranger.point(tx, ty);
  if (arranger.cursor.tx !== tx || arranger.cursor.ty !== ty) return;
  if (arranger.hand || arranger.under()) arrangeAct();
}
// After arranging, you might be standing where a case is now: step to the nearest open spot.
function unstickPlayer() {
  if (world.room !== 'shop' && world.room !== 'apartment') return;
  const m = maps[world.room], c = player.center, t0 = { tx: Math.floor(c.x / 16), ty: Math.floor(c.y / 16) };
  if (!m.isSolid(t0.tx, t0.ty)) return;
  for (let r = 1; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!m.isSolid(t0.tx + dx, t0.ty + dy)) { placeAt('shop', t0.tx + dx, t0.ty + dy, player.facing); return; }
  }
}
const cap1 = t => t.charAt(0).toUpperCase() + t.slice(1);
function syncArrangeBar() {
  const h = arranger.hand, under = arranger.under(), why = arranger.why();
  const title = h ? `Moving the ${pieceName(h)}` : atHome() ? 'Arranging your apartment' : 'Arranging the shop';
  const hint = h ? (why ?? (h.kind === 'decor' && !h.from ? 'Put it down anywhere it fits.' : 'It fits here.'))
    : under ? `The ${pieceName(under)}. ${input.lastSource === 'touch' ? 'Tap it' : input.lastSource === 'pad' ? 'Press A' : finePointer ? 'Click it or press E' : 'Press E'} to pick it up.`
    : atHome() ? (input.lastSource === 'touch' ? 'Tap a piece of furniture to move it. Decor shows what’s put away.' : 'Move to a piece of furniture and pick it up. Decor shows what’s put away.')
    : input.lastSource === 'touch' ? 'Tap a case, the till, the register or a piece of decor to move it.' : 'Move to a case, the till, the register or decor and pick it up.';
  const k = `${title}|${hint}|${!!h}|${h?.kind}|${!!why}`;
  if (k === abShown) return;
  abShown = k;
  abTitle.textContent = title; abHint.textContent = hint;
  abHint.classList.toggle('bad', !!(h && why));
  abCancel.hidden = !h; abStore.hidden = !(h && h.kind === 'decor');
}
document.getElementById('ab-done').addEventListener('click', () => stopArranging());
document.getElementById('ab-decor').addEventListener('click', () => openArrangeDecor());
abCancel.addEventListener('click', () => { arranger.cancel(); syncArranged(); });
abStore.addEventListener('click', () => arrangeStore());
for (const b of arrangeBar.querySelectorAll('button')) b.addEventListener('pointerdown', e => e.stopPropagation());

// The floor plan while arranging: where the lines form, what you can move, the cursor, and
// what you're holding (green where it fits, red where it doesn't).
function drawArrange(ctx, cx, cy) {
  const home = atHome(), room = home ? maps.apartment.room : shopRoom(), L = home ? homeLayout(world) : world.shop.layout, ts = (home ? maps.apartment : maps.shop).ts, t = time;
  ctx.save();
  for (const [kind, col] of [['sell', '#9fd0d0'], ['buy', '#9fd08a']]) for (const s of room.lines?.[kind] ?? []) {
    const x = s.tx * 16 - cx, y = s.ty * 16 - cy;
    ctx.fillStyle = col + '30'; ctx.fillRect(x + 2, y + 2, 12, 12);
    ctx.fillStyle = col + '90'; ctx.fillRect(x + 5, y + 6, 2, 3); ctx.fillRect(x + 9, y + 7, 2, 3);
  }
  const mark = (tx, ty) => { const x = tx * 16 - cx, y = ty * 16 - cy; ctx.strokeStyle = 'rgba(224,166,74,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 15, 15); };
  for (const s of L?.cases ?? []) { const [x, y] = s.split(',').map(Number); mark(x, y); }
  for (const d of L?.decor ?? []) mark(d.tx, d.ty);
  if (!home && L?.till != null) mark(L.till, 4);
  if (!home && L?.register != null) mark(L.register, 4);
  const { tx, ty } = arranger.cursor, x = tx * 16 - cx, y = ty * 16 - cy, h = arranger.hand;
  if (h) {
    const ch = h.kind === 'case' ? 'V' : h.kind === 'till' ? 'T' : h.kind === 'register' ? 'R' : decorDef(h.id).char;
    const def = ts.defs[ch], ok = !arranger.why();
    ctx.globalAlpha = 0.85;
    if (def?.prop) ctx.drawImage(def.prop, x, y); else if (def?.rug) ctx.drawImage(ts.rugMid, x, y);
    if (def?.over) ctx.drawImage([].concat(def.over.img)[0], x + (def.over.dx ?? 0), y + (def.over.dy ?? 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = ok ? 'rgba(120,220,120,0.22)' : 'rgba(230,80,70,0.3)'; ctx.fillRect(x, y, 16, 16);
    ctx.strokeStyle = ok ? '#9fd08a' : '#e06a5a';
  } else ctx.strokeStyle = TC.amber;
  const pulse = settings.reducedMotion ? 0 : Math.round((Math.sin(t * 6) + 1) / 2);
  ctx.lineWidth = 1; ctx.strokeRect(x - 0.5 - pulse, y - 0.5 - pulse, 17 + pulse * 2, 17 + pulse * 2);
  ctx.restore();
}

// ---------- the walkthrough ----------
// What the walkthrough needs from the game, in one place.
const host = {
  get st() { return st; }, get world() { return world; }, get crowd() { return crowd; },
  player, guide,
  room: () => world.room,
  map: room => (room === 'shop' ? maps.shop : room === 'zone' ? zone.map : maps[room]),
  shopRoom: () => shopRoom(),
  say: (lines, opts) => speech.say(lines, opts),
  hint: text => speech.setHint(text),
  speechBusy: () => speech.busy,
  panelOpen: () => ui.isOpen,
  background: () => backgroundOf(world.background),
  get input() { return input.padConnected ? 'pad' : finePointer ? 'keys' : 'touch'; },
  cue: name => cue(name),
  spawn: (kind, opts = {}) => spawnScripted(kind, opts),
  startRun: () => startPrologueRun(),
  zoneExit: () => (st?.run ? { room: 'zone', x: st.run.exit.x * ZONE_CELL + ZONE_CELL / 2, y: st.run.exit.y * ZONE_CELL + ZONE_CELL / 2 } : null),
  finish: opts => finishPrologue(opts),
};
const wt = new Walkthrough(host);

// Mina's texts after she's gone: once each, the first time something new happens.
function sendText(id) { if (st) textOnce(world, speech, id, cue); }
function morningTexts() {
  if (!st || wt.active) return;
  const n = nextStage(world), owed = S.Calendar.owed(st);
  if (st.day >= 3 && shopState(world).tier === 0 && shopState(world).booked == null && n && st.cash >= n.cost + owed) sendText('estimate');
  if (st.rent.dueDay - st.day === 1 && st.cash < owed) sendText('rent');
  if (st.day >= 2 && shopState(world).tier <= 1 && !adBooked(world, st.day) && st.cash >= 40 + owed) sendText('ads');
  if (regulars(st).length) sendText('regular');
  if (roleOpen(world, 'clerk') && !onStaff(world, 'clerk')) sendText('staff');
  else if (roleOpen(world, 'stocker') && !onStaff(world, 'stocker')) sendText('stockhand');
}

let doorWas;   // undefined until the first check after a new game or a load
function changed() {
  simRules(st);
  shieldNews();
  // The other door opening (or shutting again) is news worth stopping for.
  const door = st.story?.door ?? null;
  if (doorWas !== undefined && door !== doorWas && door === 'open') cue('door');
  if (doorWas !== undefined && door !== doorWas && door) ui.toast(door === 'open' ? 'Downstairs, the other door in the basement has opened by itself. Your parents’ chalk arrows point the way down.' : S.DATA.door.shut, 5200);
  doorWas = door;
  const cases = takeOpenedCases();
  if (cases.length) cue('casefile');
  cases.slice(0, 2).forEach((c, i) => setTimeout(() => ui.toast(`Case file opened: ${c.name}`, 2600), i * 2700));
  if (cases.length > 2) setTimeout(() => ui.toast(`…and ${cases.length - 2} more in Case files`, 2400), 5400);
  if (st.gameOver && !ui.current?.id?.startsWith('gameover')) openGameOver();
}

function serialize() {
  if (arranger.on && arranger.hand) { arranger.cancel(); syncShop(); }   // never save with a piece in your hands
  return {
    world: { ...world, crowd: crowd?.save() ?? null, guide: guide.save(), talkLog: speech.history.slice(-60) },
    sim: st,
    player: player.save(),
    clock: clock.save(),
    rng: rng.save(),
  };
}

function applyState(d) {
  resetArranging();
  world = { ...freshWorld(), ...(d.world || {}) };
  if (world.room === 'back-room') world.room = 'apartment';   // Phase 27: you sleep at home now
  if (!ALL_ROOMS[world.room] && world.room !== 'zone') world.room = 'apartment';
  syncHome();
  syncShop();
  staffState(world); drawState(world); identityState(world); syncLook(); staffFloor.reset();
  guide.load(world.guide); speech.clear(); speech.load(world.talkLog); ui.clearToasts();
  st = d.sim ? restoreSim(d.sim) : newSim({ seed: d.seed ?? Date.now() });
  CAL.useSim(st);                     // v2.0: this save's calendar (older saves keep their old one)
  refreshSeason();
  doorWas = undefined;
  rng = new RNG(st.seed ^ 0x5eed); if (Number.isFinite(d.rng)) rng.load(d.rng);
  player.load(d.player);
  clock.load({ ...(d.clock || {}), day: st.day });
  night = null;
  crowd = world.night === 'shop' && st.phase === 'night' ? makeNightCrowd() : makeCrowd(); crowd.load(world.crowd);
  pedestrians = world.room === 'city' ? makePedestrians() : null;
  syncPlaceCrowd();
  eventEnt = null;
  // v2.2: the town changed shape. Anyone saved standing where the river or a new house is now
  // steps out onto their own doorstep.
  if (world.room === 'city' || isArea(world.room)) {
    const m = maps[world.room], f = player.feet;
    if (m && m.isSolid(Math.floor((f.x + f.w / 2) / 16), Math.floor((f.y + f.h / 2) / 16))) {
      const L = cityLayout.locs.apartment ?? cityLayout.locs.shop;
      world.room = 'city'; player.place(L.stand.tx * CONFIG.tile, L.stand.ty * CONFIG.tile - 4);
    }
  }
  if (world.room === 'zone' && st.run) { zone.build(st); zone.snapToRun(st); }
  else if (world.room === 'zone') { world.room = 'apartment'; const w = APARTMENT.wake; player.place(w.tx * CONFIG.tile, w.ty * CONFIG.tile - 4); }
  simRules(st);
  snapCamera();
  if (wt.active) wt.resume();
  midnightRoll();
}

function placeAt(roomId, tx, ty, facing) {
  if (isArea(roomId) && roomId !== world.room && !AREAS[roomId].debug) setTimeout(() => ui.toast(AREAS[roomId].name, 1600, { minor: true }), 200);
  world.room = roomId;
  if (roomId === 'city' && !pedestrians) pedestrians = makePedestrians();
  syncPlaceCrowd();
  if (roomId === 'city' && st) buildEventEnt(); else eventEnt = null;
  lastDistrict = null;
  player.place(tx * CONFIG.tile, ty * CONFIG.tile - 4);
  player.pose = null;
  if (facing) player.facing = facing;
  snapCamera();
}

// A new campaign or Endless run, through the original opening cards.
function newGame(fromTitle = false) {
  runOpening(ui, pick => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    doorWas = undefined;
    st = newSim({ seed, mode: 'campaign', difficulty: 'medium', name: pick.name, ride: pick.ride, year: true });
    Y.initYear(st, pick.season);      // v2.0: the year, on the world's calendar
    refreshSeason();
    S.log(st, `The Office of Anomalous Property will inspect the shop at the start of every season. The first inspection is ${CAL.formatDate(Y.nextAuditDay(st), { long: true })}.`, 'warn');
    rng = new RNG(seed ^ 0x5eed);
    resetArranging();
    world = freshWorld();
    world.look = pick.look ?? null; world.background = pick.background ?? null;
    identityState(world); syncLook();
    applyBackground(st, world.background);
    syncShop();
    guide.hide(); speech.clear(); speech.load([]); ui.clearToasts(); staffFloor.reset();
    crowd = makeCrowd();
    clock.setSpan(shopDaySpan());
    clock.load({ state: 'stopped', elapsedMs: 0, day: st.day });
    syncHome();
    if (pick.walkthrough) { ui.close(); return startPrologue(); }
    wakeUp();
    changed();
    openMorning(true);
  }, fromTitle ? openTitle : null);
}

// ---------- the evening before Day 1 ----------

function startPrologue() {
  // A ledger for the evening's one seller and one buyer; the sim stays on the Day 1 morning.
  st.shop = { day: st.day, total: 0, queue: [], served: 0, current: null, sales: [], bought: [], jobs: [], pending: null, say: null, seen: [] };
  placeAt('shop', 11, 11, 'up');
  changed();
  wt.start();
}

// A walkthrough customer: the seller, or a buyer who's off the street if possible.
function spawnScripted(kind, { civilian = false } = {}) {
  let sim = null;
  if (kind === 'buy' && civilian) {
    for (let i = 0; i < 16 && !sim; i++) {
      const c = S.RNG.within(st, ['walkthrough-buyer', i], () => S.Shop.makeCustomer(st));
      if (c.faction === 'civilian') sim = c;
    }
  }
  return crowd.spawn(kind, undefined, { sim, patient: true });
}

// Out the front door with the radio: the laundromat, with one cryptid close enough to meet.
function startPrologueRun() {
  st.phase = 'night';
  const r = N.enterZone(st, 'laundromat');
  if (r.error) { st.phase = 'morning'; ui.toast(r.error); return false; }
  const run = st.run, d = S.Crawl.bfs(run, run.pos);
  const spots = [];
  for (let y = 0; y < run.H; y++) for (let x = 0; x < run.W; x++) if (d[y][x] >= 5 && d[y][x] <= 8 && !(x === run.exit.x && y === run.exit.y)) spots.push({ x, y });
  const c = run.cryptids[0], spot = spots[Math.floor(spots.length / 2)];
  if (c && spot && !run.cryptids.some(k => k.x === spot.x && k.y === spot.y)) { c.x = spot.x; c.y = spot.y; }
  world.night = 'zone'; world.lastZone = 'laundromat';
  zone.build(st);
  world.room = 'zone';
  zone.snapToRun(st); player.facing = 'up';
  snapCamera();
  clock.setSpan(NIGHT_SPAN);
  clock.load({ ...clock.save(), state: 'stopped', elapsedMs: 0, day: st.day });
  changed();
  clock.start();
  return true;
}

// The walkthrough is over (or skipped): wake up on the morning of Day 1.
function finishPrologue({ skipped = false } = {}) {
  if (ui.isOpen) ui.close();
  if (st.run) { st.run.encounter = null; st.run.bag.push(...(st.run.secured || [])); st.run.secured = []; S.Crawl.finish(st, 'You head home for the night.'); }
  if (st.shop?.sales?.length) S.Shop.resolveDay(st);      // the evening's sale still gets checked
  for (const c of [...crowd.list]) crowd.dismiss(c);
  crowd.clear(); crowd = makeCrowd();
  st.phase = 'morning';
  st.energy = st.maxEnergy; st.battery = 100; st.stress = 0;
  st.bench.max = S.Lab.benchMax(st); st.bench.mins = st.bench.max;
  st.shop = { day: 0, total: 0, queue: [], served: 0, current: null, sales: [], bought: [], jobs: [], pending: null, say: null, seen: [] };
  st.today = S.Recap.fresh(st); st.recap = null;
  st.dayStart = { cash: st.cash, heat: st.heat };
  world.tutorial = { done: true, step: null, skipped };
  world.night = null; world.dayMode = null;
  const done = applyRenovation(world, st);
  syncShop();
  guide.hide(); speech.clear();
  clock.setSpan(shopDaySpan());
  clock.load({ state: 'stopped', elapsedMs: 0, day: st.day });
  wakeUp();
  changed();
  if (done) ui.toast(`The crew worked through the night. The shop: ${done.name}.`, 3200);
  openMorning(true);
}

function firstMorningText() {
  const t = world.tutorial;
  if (t?.done && t.skipped === false) return `Day 1. Mina’s keys hang on the hook by the back door, with her number taped to the till. ${S.DATA.shopName} is yours now.${backgroundOf(world.background) ? ` ${backgroundOf(world.background).morning}` : ''}`;
  const bg = backgroundOf(world.background);
  return `You’ve taken over ${S.DATA.shopName}. It’s been shut for six weeks, and most of the floor is boarded up. Three boxes from your parents’ last pickup are waiting in the basement.${bg ? ` ${bg.morning}` : ''}`;
}

// A bouncing marker over where to go next; an arrow at the screen edge when it's off-screen.
function drawMarker(ctx, cx, cy) {
  const m = wt.marker();
  if (!m) return;
  let x, y;
  if (m.entity) { if (!m.entity.visible || m.entity.room !== world.room) return; x = m.entity.x + 8; y = m.entity.y - 6 + HD_OFFSET.y; }
  else { if (m.room !== world.room) return; x = m.x; y = m.y - 12; }
  const bob = settings.reducedMotion ? 0 : Math.round(Math.sin(time * 5) * 2);
  let sx = Math.round(x - cx), sy = Math.round(y - cy) + bob;
  const W = renderer.w, H = renderer.h, pad = 10;
  const off = sx < pad || sy < pad + 4 || sx > W - pad || sy > H - pad;
  ctx.fillStyle = '#07080c';
  if (!off) {
    ctx.fillRect(sx - 4, sy - 5, 9, 2); ctx.fillRect(sx - 3, sy - 3, 7, 2); ctx.fillRect(sx - 2, sy - 1, 5, 2); ctx.fillRect(sx - 1, sy + 1, 3, 2);
    ctx.fillStyle = TC.amber;
    ctx.fillRect(sx - 3, sy - 4, 7, 1); ctx.fillRect(sx - 2, sy - 3, 5, 2); ctx.fillRect(sx - 1, sy - 1, 3, 2); ctx.fillRect(sx, sy + 1, 1, 1);
    return;
  }
  // Off-screen: a small arrow on the edge, pointing the way.
  const ax = Math.max(pad, Math.min(W - pad, sx)), ay = Math.max(pad + 4, Math.min(H - pad, sy));
  const ang = Math.atan2(sy - ay || (sy > H / 2 ? 1 : -1), sx - ax || (sx > W / 2 ? 1 : -1));
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
  ctx.fillRect(-4, -5, 9, 10);
  ctx.fillStyle = TC.amber;
  for (let i = 0; i < 4; i++) ctx.fillRect(-3 + i, -3 + i, 1, 7 - i * 2);
  ctx.fillRect(1, -1, 3, 2);
  ctx.restore();
}

// Three dots over whoever is talking.
function drawTalk(ctx, hx, top) {
  const x = hx - 5, y = top - 10;
  ctx.fillStyle = '#07080c'; ctx.fillRect(x, y, 11, 7); ctx.fillRect(x + 3, y + 7, 2, 1);
  ctx.fillStyle = '#ddd5c1'; ctx.fillRect(x + 1, y + 1, 9, 5); ctx.fillRect(x + 4, y + 6, 1, 1);
  const on = Math.floor(time * 3) % 3;
  ctx.fillStyle = '#13151d';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 2 + i * 3, y + 3 - (i === on && !settings.reducedMotion ? 1 : 0), 1, 1);
}

function snapCamera() {
  const m0 = map();
  if (renderer.fitRoom(m0 ? { w: m0.pxW, h: m0.pxH } : null)) camera.resize(renderer.w, renderer.h);
  const c = player.center, m = map();
  camera.follow(c.x, c.y, m.pxW, m.pxH, 0, 0, true);
}

const fadeEl = document.getElementById('fade');
function goThrough(go) {
  if (settings.reducedMotion) { placeAt(go.room, go.tx, go.ty, go.facing); return; }
  pause.push('fade'); fadeEl.classList.add('on');
  setTimeout(() => {
    placeAt(go.room, go.tx, go.ty, go.facing);
    fadeEl.classList.remove('on');
    setTimeout(() => pause.pop('fade'), 120);
  }, 140);
}

clock.onDayEnd = () => (world.room === 'zone' && st?.run ? endRun(N.clockOut(st)) : world.night === 'city' ? nightCityClock() : ui.toast('Your bed is at home. Turn in there.', 2400));

// closer friends drop by the shop more often (game/visits.js)
setVisitBoost(name => VS.visitBoost(REL.heartsOf(T.personOf(world, name).rel)));
clock.onEvent = e => {
  if (e.type === 'skipped') ui.toast(e.count === 1 ? 'You didn’t sleep. You can feel it: you’re slower, and your hands aren’t steady.' : 'Two nights without sleep. The edges of things aren’t right.', 4200);
  else if (e.type === 'collapse') collapseScene(e);
  else if (e.type === 'midnight') midnightRoll();
};

const shopOpen = () => world.dayMode === 'shop' && st?.phase === 'day' && clock.state === 'running';
const clerkOnDuty = () => shopOpen() && onStaff(world, 'clerk');
const isNight = () => st?.phase === 'night';
function playerAtTill() {
  if (world.room !== 'shop') return false;
  const z = shopRoom().tillZone, f = player.feet;
  const tx = Math.floor((f.x + f.w / 2) / 16), ty = Math.floor((f.y + f.h / 2) / 16);
  return tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1;
}

// ---------- loop ----------

let lastFront = null;
let inSquare = false;
function update(dt) {
  const move = input.poll();
  for (const ev of input.takePadEvents()) handlePad(ev);
  const action = input.consumeAction();
  // A conversation on screen: the round button (E, Space, Enter, A) moves it along.
  if (action && talkHold()) speech.confirm();
  // Phase 24: rearranging the shop. The world waits; you move a cursor instead of yourself.
  if (arranger.on && !ui.isOpen) { arrangeMove(dt, move); if (action) arrangeAct(); }
  const m = map();
  if (!pause.paused && st) {
    // Night runs (Phase 18): walking is free; holding sprint runs faster and spends stamina.
    player.speedMul = world.room === 'city' ? CR.walkSpeed(st, riding()) * streetPace(todayWeather(), riding(), vehicleOf(st)?.kind)
      : world.room === 'zone' && st.run ? N.sprintStep(st, dt, input.sprintHeld, move.mag > 0.1) : 1;
    if (world.room === 'beach' && nightCity() && nightArea().inTide) player.speedMul *= 0.6;   // v2.5: wading
    if (clock.cycle.penalties.slow) player.speedMul *= EX.SLOW;                     // Phase 30: tired
    if (fishing) { if (!outdoors()) fishing = null; else stepFishing(dt, move, action, input.actionHeld); }
    else player.update(dt, move, world.room === 'city' ? cityMoveMap() : m);
    // v2.1: walked off the edge of an area onto the next one (game/edges.js).
    if (m?.room?.edges && world.room !== 'zone') {
      const x = crossing(m.room, player.feet, CONFIG.tile, m.walkable);
      if (x) { const to = maps[x.edge.to]; if (to) { const a = arrival(m.room, x.side, x.at, to.room, to.walkable); goThrough({ room: x.edge.to, ...a }); } }
    }
    if (world.room === 'city') {
      syncKeepers(dt);
      pedestrians?.update(dt);
      const c = player.center, d = cityLayout.districtAt(Math.floor(c.x / 16), Math.floor(c.y / 16));
      if (d && d.id !== lastDistrict) { if (lastDistrict) ui.toast(d.name, 1400, { minor: true }); lastDistrict = d.id; }
      // v2.2: Old Market Square, by name, as you walk into it.
      const pz = cityLayout.plaza, inSq = !!pz && c.x / 16 >= pz.x0 && c.x / 16 <= pz.x1 + 1 && c.y / 16 >= pz.y0 && c.y / 16 <= pz.y1 + 1;
      if (inSq && !inSquare) ui.toast('Old Market Square', 1400, { minor: true });
      inSquare = inSq;
    }
    if (placeCrowd) placeCrowd.update(dt, map(), player, speech.visible ? talkingWith : null);
    // Lunchtime came or went while you're inside somewhere: Ryan comes or goes (Phase 29).
    if (inPlace() && ryanAtLunch() !== lunchWas && !talkingWith && !ui.isOpen) syncPlaceCrowd();
    // Phase 30: a new part of the day: who's in the place you're in (or the park, the beach) changes too.
    if (dayPart() !== crowdPart && !talkingWith && !ui.isOpen) { crowdPart = dayPart(); if (inPlace() || inArea()) syncPlaceCrowd(); }
    if (world.room === 'city' && !isNight()) { tickCityEvents(dt); syncMagician(dt); }
    tickNightCity(dt);
    tickNightAreas(dt);
    tickWeather(dt);
    world.playTimeMs += dt * 1000;
    crowd.update(dt, { open: shopOpen() || (nightShop() && clock.state === 'running'), progress: shopProgress(), playerAtTill: playerAtTill() || clerkOnDuty() });
    for (const e of staffFloor.update(dt, { st, world, map: maps.shop, open: shopOpen() })) {
      if (e.stocked && world.room === 'shop') ui.toast(`${e.by.split(' ')[0]} put the ${S.Items.name(e.stocked)} out.`, 1600, { minor: true });
    }
    // The bell over the door when someone new reaches the counter; three knocks for the inspector.
    const front = world.room === 'shop' ? crowd.front('sell') : null;
    if (front && front !== lastFront) {
      cue(front.visit === 'inspector' ? 'knock' : 'bell');
      if (front.visit === 'inspector') sendText('inspector'); else if (front.visit === 'appraise') sendText('appraise');
    }
    lastFront = front;
    const tillFront = world.room === 'shop' ? crowd.front('buy') : null;
    if (tillFront?.pending?.counter) sendText('counter');
    applyGod(god, st, { inZone: world.room === 'zone' });
    if (world.room === 'zone' && st.run) runZone(dt);
    guide.update(dt, player);
    wt.update(dt);
    const p = player.probe;
    const hit = map().interactablesNear(p.x, p.y, CONFIG.interactRange)[0];
    const def = hit ? map().room.interactions[hit.id] : null;
    target = def ? { ...def, hit, label: labelFor(def, hit) } : null;
    // Mina, when she's close and nothing else is: ask her again what to do.
    // A shopkeeper out on the street while their place is shut: stop and talk.
    // Ryan's street act, outside the Lantern.
    if (!target && world.room === 'city' && magician && Math.hypot(magician.x - player.x, magician.y - player.y) < 22) target = { panel: 'magician', label: 'Magic' };
    if (!target && world.room === 'city' && magicTable && Math.hypot(magicTable.tx * 16 + 16 - player.x, magicTable.ty * 16 - player.y) < 24) target = { panel: 'lunchSign', label: 'Read' };
    if (!target && world.room === 'city' && pedestrians) {
      const k = pedestrians.keepers.find(p => Math.hypot(p.x - player.x, p.y - player.y) < 20);
      if (k) target = { panel: 'keeper', label: 'Talk', keeper: k };
    }
    // Someone in a place, close by: talk to them (before the furniture behind them).
    if (placeCrowd) {
      const pc = placeCrowd.near(player.x, player.y);
      if (pc && (!target || hit?.dist > 6)) target = { panel: 'npc', label: 'Talk', npc: pc };
    }
    // v2.4: someone or something out at night, close by.
    if (!target || hit?.dist > 6) { const nt = nightTarget() ?? areaNightTarget(); if (nt) target = nt; }
    // Something happening on the street, right in front of you.
    if (!target && world.room === 'city' && eventEnt && !eventEnt.done && eventEnt.kind !== 'thief') {
      const ex = eventEnt.x - player.x, ey = eventEnt.y - player.y;
      if (Math.hypot(ex, ey) < 20) target = { panel: 'event', label: EVENTS[eventEnt.id].label ?? 'Look' };
    }
    if (!target && wt.active && guide.visible && guide.room === world.room && Math.hypot(guide.x - player.x, guide.y - player.y) < 22) target = { panel: 'guide', label: 'Talk' };
    // v2.3: open water in front of you: fish.
    if (!target && !fishing && outdoors()) { const fs = fishingSpot(); if (fs) target = { panel: 'fish', label: 'Fish', spot: fs }; }
    if (fishing) target = { panel: 'fishing', label: fishing.phase === 'bite' ? 'Hook it!' : fishing.phase === 'reel' ? null : 'Reel in' };
    else if (action && target) interact(target);
  }
  speech.update(dt, ui.isOpen || pause.has('fade'));
  checkTalkEnd();
  // While someone's talking the world waits for you, the same as with a panel open.
  if (talkHold()) { if (!pause.has('talk')) pause.push('talk'); } else if (pause.has('talk')) pause.clear('talk');
  layer.classList.toggle('radio-on', speech.visible && speech.cur?.kind === 'radio');
  ui.tickToasts(dt * 1000);
  syncBanner();
  clock.tick(dt * 1000, pause.paused || (god.unlocked && !!god.freeze));
  if (world.shopSession && clock.cycle.t >= world.shopSession.to) endShopSession('timeout');
  if (sleepFx) sleepFx.update(dt, !!st && clock.cycle.penalties.screenEffects, { reduced: settings.reducedMotion });
  const c = arranger.on ? { x: arranger.cursor.tx * 16 + 8, y: arranger.cursor.ty * 16 + 8 } : player.center;
  camera.follow(c.x, c.y, m.pxW, m.pxH, dt, CONFIG.camera.followLerp, settings.reducedMotion);
  time += dt;
}

function labelFor(def, hit) {
  if (def.panel === 'bus') return 'Bus';
  if (def.panel === 'grave') return isNight() && G.cemeteryOf(world).gear.shovel && G.cemeteryOf(world).dug[`${hit.tx},${hit.ty}`] == null ? 'Dig' : 'Read';
  if (def.panel === 'exitPlace' && world.room === 'chapel' && hit.ty === 1) return 'Churchyard';
  if (def.panel === 'woodsRope') return 'Read sign';
  if (def.panel === 'beachSign') return 'Read sign';
  if (def.panel === 'counter') { const f = crowd.front('sell'); return !f ? 'Counter' : f.visit === 'inspector' ? 'Inspector' : f.visit === 'appraise' ? 'Appraisal' : 'Serve'; }
  if (def.panel === 'till') { const f = crowd.front('buy'); return f?.pending?.counter ? 'Counter offer' : f ? 'Ring up' : 'Till'; }
  if (def.panel === 'display') return world.displays[`${hit.tx},${hit.ty}`] ? 'Case' : 'Display';
  if (def.panel === 'loc') {
    const id = cityLayout.doors[`${hit.tx},${hit.ty}`], ex = extraPlace(id);
    if (ex) return ex.name;
    if (WALK_INS[id] && placeStatus(id).open) return S.City.loc(id).name;
    const loc = S.City.loc(id);
    if (!loc) return null;
    return loc.home ? 'Home' : placeStatus(id).open ? loc.name : 'Closed';
  }
  return def.label;
}

function render() {
  const ctx = renderer.ctx, m = map();
  tickBudget(5);   // new figure frames painted this frame, at most (engine/figure-hd.js)
  const mood = sceneFor(st, world, ui.current?.id);
  audio.update(mood.scene, mood.tension, st ? { type: todayWeather(), place: weatherPlace(), birds: outdoors() && clock.progress < 0.5 && !isNight(), dt: renderDt(), wind: !weatherOverride() ? climateNow().wind : null } : null);
  renderer.begin(TC.void);
  if (layer.classList.contains('no-game') !== !st) layer.classList.toggle('no-game', !st);
  if (!st) { drawTitleBackdrop(ctx); return; }
  const cx = camera.ix, cy = camera.iy;
  m.draw(ctx, cx, cy, renderer.w, renderer.h);
  if (outdoors() && !weatherOverride()) drawGroundWeather(ctx, m, cx, cy, renderer.w, renderer.h, groundNow(), { time, reduced: settings.reducedMotion, lights: m.lights, night: skyNow().night, sky: skyNow() });
  if (outdoors()) { const gw = groundNow(), cl = climateNow(); drawSunShadows(ctx, m, cx, cy, renderer.w, renderer.h, skyNow().sun, { cloud: Math.min(1, cl.cloud ?? 0), wetness: gw.wet ?? 0 }); }
  if (world.room === 'zone' && st.run) zone.drawObjects(ctx, st, cx, cy, time);
  if (world.room === 'city') {
    drawStorefront(ctx, HOME_DOOR, cx, cy, drawState(world).front, time);
    for (const id of Object.keys(SCHEDULES)) { const L = cityLayout.locs[id]; if (L) drawDoorSign(ctx, L.door, cx, cy, placeStatus(id).open); }
  }
  if (world.room === 'shop') drawComforts(ctx, drawState(world).comforts, cx, cy, time, settings.reducedMotion, shopRoom().till.tx);

  if (world.room === 'shop') {
    for (const [slot, uid] of Object.entries(world.displays)) {
      const it = st.inventory.stock.find(x => x.uid === uid);
      if (!it) continue;
      const [tx, ty] = slot.split(',').map(Number);
      const x = tx * 16 - cx, y = ty * 16 - cy;
      drawItem(ctx, it, x + 4, y + 3, alignColor(it.appraisal?.alignment));
      ctx.fillStyle = crowd.reserved.has(slot) ? '#9fd08a' : TC.amber;
      ctx.fillRect(x + 12, y + 10, 2, 2);
    }
  }

  if (world.room === 'park') drawParkParty(ctx, cx, cy);
  drawYardThings(ctx, cx, cy);
  if (outdoors()) drawHolidayDecor(ctx, m, cx, cy);
  if (world.room === 'city' && magician) drawMagicTable(ctx, magician.home, cx, cy, time);
  if (world.room === 'city' && magicTable) { drawMagicTable(ctx, magicTable, cx, cy, time); drawLunchSign(ctx, magicTable, cx, cy); }
  // Entities sorted by their feet so nearer ones draw on top.
  const ents = [{ kind: 'player', y: player.y, e: player }];
  if (guide.visible && guide.room === world.room) ents.push({ kind: 'walker', y: guide.y, e: guide });
  if (world.room === 'shop') for (const w of staffFloor.entities) ents.push({ kind: 'walker', y: w.y, e: w });
  if (world.room === 'shop') for (const c of crowd.list) ents.push({ kind: 'npc', y: c.y, e: c });
  if (world.room === 'city' && pedestrians) for (const p of pedestrians.list) {
    if (p.x > cx - 24 && p.x < cx + renderer.w + 8 && p.y > cy - 16 && p.y < cy + renderer.h + 16) ents.push({ kind: 'npc', y: p.y, e: p });
  }
  if (placeCrowd) for (const p of placeCrowd.people) ents.push({ kind: 'walker', y: p.y, e: p });
  for (const o of m.oversIn?.(cx, cy, renderer.w, renderer.h) ?? []) ents.push({ kind: 'over', y: o.sortY, e: o });
  if (world.room === 'city' && magician) ents.push({ kind: 'walker', y: magician.y, e: magician });
  if (world.room === 'city' && eventEnt) ents.push({ kind: eventEnt.sprites ? 'walker' : 'eventThing', y: eventEnt.y, e: eventEnt });
  if (world.room === 'zone' && st.run) ents.push(...zone.cryptidEntities(st, 1 / 60));
  ents.push(...drawNightThings(ctx, cx, cy), ...areaNightDrawables());
  ents.sort((a, b) => a.y - b.y);
  for (const { kind, e } of ents) {
    if (kind === 'cryptid') { zone.drawCryptid(ctx, e, cx, cy, time); continue; }
    if (kind === 'over') { ctx.drawImage(e.img, e.x - cx, e.y - cy); continue; }
    if (kind === 'eventThing') { drawEventThing(ctx, e, Math.round(e.x) - cx, Math.round(e.y) - cy); continue; }
    if (kind === 'nightThing') { drawNightThing(ctx, e, cx, cy); continue; }
    const px = Math.round(e.x) - cx, py = Math.round(e.y) - cy;
    if (kind === 'player') { drawPlayer(ctx, px, py); continue; }
    // Everyone is a 24x32 figure (Phase 15); anyone without a face of their own gets one from their number.
    const set = e.sprites ?? spritesFor(lookFor(`anon:${e.look ?? 0}`));
    if (!set) continue;
    const [pose, f, fr] = frameOf(e, time);
    drawFigureShadow(ctx, px + 8, py + 14, outdoors() ? skyNow().sun : null);
    const img = set.get(pose, f, fr);
    if (e.alpha != null && e.alpha < 1) ctx.globalAlpha = e.alpha;   // v2.4: something not quite there
    if (img) ctx.drawImage(img, px + HD_OFFSET.x, py + HD_OFFSET.y);
    ctx.globalAlpha = 1;
  }

  drawFishing(ctx, cx, cy);
  if (world.room === 'zone' && st.run) zone.drawFog(ctx, st, cx, cy);
  else drawLighting(ctx, cx, cy, m);
  drawFishingHud(ctx);

  if (world.room === 'shop') for (const c of crowd.list) {
    const hx = Math.round(c.x) - cx + 8, top = Math.round(c.y) - cy + HD_OFFSET.y;   // above the 24x32 head
    if (c.icon) drawBubble(ctx, c.icon, hx, top);
    if (c.state === 'waiting' && !c.patient) drawPatience(ctx, hx, top, c.patience / c.maxPatience);
  }
  // Dots over whoever is talking: Mina, a shopkeeper on the street, or you.
  const who = !ui.isOpen && speech.visible ? speech.talking : null;
  if (who === GUIDE_NAME && guide.visible && guide.room === world.room) drawTalk(ctx, Math.round(guide.x) - cx + 8, Math.round(guide.y) - cy + HD_OFFSET.y);
  else if (who === 'you') drawTalk(ctx, Math.round(player.x) - cx + 8, Math.round(player.y) - cy + HD_OFFSET.y);
  else if (who === 'Ryan' && world.room === 'city' && magician) drawTalk(ctx, Math.round(magician.x) - cx + 8, Math.round(magician.y) - cy + HD_OFFSET.y);
  else if (who && world.room === 'city' && pedestrians) { const k = pedestrians.keepers.find(p => p.keeper.name === who); if (k) drawTalk(ctx, Math.round(k.x) - cx + 8, Math.round(k.y) - cy + HD_OFFSET.y); }
  else if (who && placeCrowd) { const b = placeCrowd.find(who) ?? (talkingWith?.extra != null ? talkingWith : null); if (b) drawTalk(ctx, Math.round(b.x) - cx + 8, Math.round(b.y) - cy + HD_OFFSET.y); }
  drawMarker(ctx, cx, cy);
  if (world.room === 'city' && eventEnt && !eventEnt.done && eventEnt.kind !== 'thief' && !(speech.visible && talkingWith === EVENT_CONVOS[eventEnt.id]?.name)) {
    const bob = settings.reducedMotion ? 0 : Math.round(Math.sin(time * 4) * 1.5);
    drawBubble(ctx, EVENTS[eventEnt.id].bubble ?? 'alert', Math.round(eventEnt.x) - cx + 8, Math.round(eventEnt.y) - cy + (eventEnt.sprites ? HD_OFFSET.y : 2) + bob);
  }
  if (arranger.on && (world.room === 'shop' || world.room === 'apartment')) drawArrange(ctx, cx, cy);
  drawWeather(ctx, cx, cy);
  if (outdoors() && fireworksOn(st.day) && clock.progress > 0.72) drawFireworks(ctx);

  ui.setAction(talkHold() ? (speech.choosing ? 'Choose' : speech.typing || speech.more ? 'Next' : 'OK') : arranger.on && !ui.isOpen ? (arranger.hand ? 'Put down' : arranger.under() ? 'Pick up' : null) : pause.paused ? null : target?.label);
  if (arranger.on) { syncArrangeBar(); const hide = ui.isOpen; if (arrangeBar.hidden !== hide) arrangeBar.hidden = hide; }
  const inRun = world.room === 'zone' && !!st.run;
  const sh = inRun ? shieldTonight() : null;
  ui.setRun(inRun ? { light: st.battery, stamina: Math.round(st.run.stamina), maxStamina: S.Crawl.maxStamina(st), stress: st.stress, bag: N.carried(st.run), cap: S.Crawl.bagCap(st), tired: !!st.run.tired, shield: sh ? sh.left : 0, shieldMax: sh?.max ?? 0 } : null);
  ui.setSprint(inRun && !pause.paused ? { on: input.sprintHeld && N.canSprint(st) && player.moving, tired: !N.canSprint(st) } : null);
  ui.setNight(outAtNight() ? { seen: nightState().attn.v, stress: st.stress } : null);
  syncRideBtn();
  if (wt.active && world.room !== 'zone') {
    ui.setClock({ day: st.day, label: 'Evening', state: 'the night before', progress: 0 });
  } else if (world.room === 'zone' && st.run) {
    ui.setClock({ day: st.day, label: clock.label, state: pause.paused ? 'paused' : N.lightLevel(st) === 'lit' ? 'zone' : N.lightLevel(st) === 'low' ? 'light low' : 'dark', progress: clock.progress });
  } else if (nightCity() || nightShop()) {
    ui.setClock({ day: st.day, label: clock.label, state: pause.paused ? 'paused' : nightShop() ? 'open late' : MOON.moonOn(st.day).name.toLowerCase(), progress: clock.progress });
  } else if (!nightCity() && !nightShop()) {
    const ses = world.shopSession;
    ui.setClock({ day: st.day, label: clock.label, state: pause.paused ? 'paused' : ses ? `open until ${clockText(ses.to)}` : clock.cycle.canSleep ? 'can sleep' : '', progress: ses ? shopProgress() : clock.progress });
  } else if (isNight() || world.night) {
    ui.setClock({ day: st.day, label: 'Night', state: `bench ${S.dur(st.bench.mins)}`, progress: st.bench.mins / st.bench.max });
  } else if (inTown() && clock.state !== 'ended') {
    ui.setClock({ day: st.day, label: clock.label, state: pause.paused ? 'paused' : `${hoursText(clock)} left`, progress: clock.progress });
  } else {
    const state = clock.state === 'ended' ? 'closed' : clock.state === 'running' && pause.paused ? 'paused' : clock.state;
    ui.setClock({ day: st.day, label: clock.label, state, progress: clock.progress });
  }
  ui.setCash(st.cash);
  ui.setHeat(st.heat);
  ui.setFps(settings.showFps, loop.fps.value);
  godBadge.hidden = !anyOn(god);
  syncWeatherHud(todayWeather(), st ? FC.fmtTemp(climateNow().temp, settings.tempUnit) : null);
  const showMap = world.room === 'city' && !wt.active && clock.state !== 'ended';
  minimap.show(showMap);
  const marks = eventEnt && !eventEnt.done && eventEnt.kind !== 'thief' && !isNight() ? [{ tx: Math.round(eventEnt.x / 16), ty: Math.round(eventEnt.y / 16) }] : [];
  if (nightCity()) for (const e of nightState().ents) if (e.kind !== 'person') marks.push({ tx: e.tx, ty: e.ty });
  if (showMap) minimap.draw(player.center.x, player.center.y, player.facing, marks);
}

// The player's frame for this moment: knocked out, appraising, carrying the haul, walking or breathing.
function playerPose() {
  if (player.pose) return player.pose;
  if (ui.isOpen && APPRAISE_PANELS.has(ui.current?.id)) return 'appraise';
  if (world.room === 'zone' && st.run && N.carried(st.run) > 0) return 'carry';
  return player.moving ? 'walk' : 'idle';
}
function drawPlayer(ctx, px, py) {
  const pose = playerPose();
  // Phase 22: on your ride. The van is all you see; on two wheels you sit up a little.
  const ride = riding() && pose !== 'ko' ? vehicleOf(st) : null;
  if (ride) {
    const lit = clock.progress > 0.7;
    drawRideBack(ctx, ride.kind, px, py, player.facing, time, player.moving);
    if (ride.kind !== 'van') {
      const pedal = ride.kind === 'bike' || ride.kind === 'trike' || ride.kind === 'ebike';
      const [p, f, fr] = pedal && player.moving ? ['walk', player.facing, Math.floor(time * 8) % 4] : ['idle', player.facing, 0];
      ctx.drawImage(sprites.get(p, f, fr), px + HD_OFFSET.x, py + HD_OFFSET.y - SEAT_RISE[ride.kind]);
    }
    drawRideFront(ctx, ride.kind, px, py, player.facing, time, player.moving, lit);
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  if (pose === 'ko') { ctx.fillRect(px - 6, py + 12, 28, 3); ctx.drawImage(sprites.get('ko', 'down', 0), px + KO_OFFSET.x, py + KO_OFFSET.y); return; }
  ctx.fillRect(px + 2, py + 14, 12, 2); ctx.fillRect(px + 1, py + 15, 14, 1);
  const [p, f, fr] = pose === 'idle' ? ['idle', player.facing, player.breath] : frameOf(player, time, pose === 'walk' ? null : pose);
  ctx.drawImage(sprites.get(p, f, fr), px + HD_OFFSET.x, py + HD_OFFSET.y);
}

// Behind the main menu: the restored shop at night, drifting slowly past.
function drawTitleBackdrop(ctx) {
  const m = shopMap(layoutRoom(4, defaultLayout(4))), w = renderer.w, h = renderer.h;
  const drift = settings.reducedMotion ? 0.5 : 0.5 + Math.sin(time * 0.05) * 0.5;
  const cx = Math.round(m.pxW > w ? (m.pxW - w) * drift : (m.pxW - w) / 2);
  const cy = Math.round(m.pxH > h ? (m.pxH - h) * (0.5 + Math.sin(time * 0.037) * 0.3) : (m.pxH - h) / 2);
  m.draw(ctx, cx, cy, w, h);
  drawLighting(ctx, cx, cy, m, { room: 'shop', dark: 0.6, noPlayer: true });
}

// v2.2: the street dressed for the season's holiday (data/holidays.js): jack-o'-lanterns by
// the doors before Halloween, string lights on the fronts and wreaths on the doors in
// December, flags on the lamp posts at the start of July.
function drawHolidayDecor(ctx, m, cx, cy) {
  const kind = decorOn(st.day);
  if (!kind) return;
  const tx0 = Math.floor(cx / 16) - 1, ty0 = Math.floor(cy / 16) - 1, tx1 = tx0 + Math.ceil(renderer.w / 16) + 2, ty1 = ty0 + Math.ceil(renderer.h / 16) + 3;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const roofy = c => 'awkenh'.includes(c), facey = c => 'AWKENH'.includes(c) && c !== '';
  const tw = settings.reducedMotion ? 0 : time;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const ch = m.at(tx, ty), x = tx * 16 - cx, y = ty * 16 - cy, h = (tx * 7 + ty * 13) >>> 0;
    if (kind === 'halloween' && (ch === 'o' || ch === 'O') && h % 2 === 0 && CITY_WALKABLE.has(m.at(tx + 1, ty + 1))) {
      const px = x + 13, py = y + 18, glow = 0.75 + 0.25 * Math.sin(tw * 9 + h);
      R(px, py + 1, 9, 6, '#c0601a'); R(px + 1, py, 7, 8, '#d8702a'); R(px + 4, py - 2, 1, 2, '#3a5a2a');
      ctx.fillStyle = `rgba(255,${180 + Math.round(40 * glow)},80,${glow.toFixed(2)})`; ctx.fillRect(px + 2, py + 2, 2, 2); ctx.fillRect(px + 5, py + 2, 2, 2); ctx.fillRect(px + 3, py + 5, 3, 1);
    } else if (kind === 'lights') {
      if (facey(ch) && roofy(m.at(tx, ty - 1))) {
        for (let k = 1; k < 16; k += 3) { const on = Math.sin(tw * 2 + tx * 1.3 + k) > -0.6; R(x + k, y + 1 + (k % 2), 1, 1, on ? ['#e05050', '#50c060', '#e0c050', '#5080e0'][(tx + k) % 4] : '#2a2a2a'); }
        R(x, y, 16, 1, '#1a1a1a');
      }
      if (ch === 'O' || (ch === 'o' && h % 2 === 0)) { R(x + 4, y - 14, 8, 8, '#1f4a2a'); R(x + 6, y - 12, 4, 4, '#0c140f'); R(x + 7, y - 7, 2, 2, '#c0302a'); }
    } else if (kind === 'flags' && (ch === 'L' || ch === 'l')) {
      R(x + 9, y - 12, 1, 8, '#2a2a2a'); R(x + 10, y - 12, 6, 4, '#c0302a'); R(x + 10, y - 11, 6, 1, '#e8e4d8'); R(x + 10, y - 12, 3, 2, '#2e4a8a');
    }
  }
}
// Fireworks over the town on the evening of the Fourth and on New Year's Eve.
function drawFireworks(ctx) {
  if (settings.reducedMotion) return;
  const W = renderer.w, H = renderer.h;
  for (let i = 0; i < 4; i++) {
    const period = 2.6 + i * 0.7, t = (time + i * 1.13) % period, k = Math.floor((time + i * 1.13) / period);
    const sx = ((k * 97 + i * 53) % 100) / 100 * W, sy = H * (0.12 + ((k * 31 + i * 17) % 30) / 100);
    const col = ['#f6d48a', '#e05050', '#70c0f0', '#c080f0'][(k + i) % 4];
    if (t < 0.5) { ctx.fillStyle = '#f6d48a'; ctx.fillRect(Math.round(sx), Math.round(H - (H - sy) * (t / 0.5)), 1, 3); continue; }
    const r = Math.min(1, (t - 0.5) / 0.9) * 22, fade = Math.max(0, 1 - (t - 0.5) / 1.6);
    ctx.globalAlpha = fade; ctx.fillStyle = col;
    for (let a = 0; a < 14; a++) { const ang = (a / 14) * Math.PI * 2; ctx.fillRect(Math.round(sx + Math.cos(ang) * r), Math.round(sy + Math.sin(ang) * r + (t - 0.5) * 6), 2, 2); }
    ctx.globalAlpha = 1;
  }
}

// v2.2: a birthday in Lantern Park: a table with a cake (candles flicker), balloons tied to it.
function drawParkParty(ctx, cx, cy) {
  const P = parkToday(), t = AREAS.park.party?.table;
  if (!P.party || !t) return;
  const x = t.tx * 16 - cx, y = t.ty * 16 - cy, R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  R(-2, 12, 20, 3, 'rgba(0,0,0,0.35)'); R(-2, 4, 20, 9, '#e8e4d8'); R(-2, 4, 20, 2, '#f4f0e6'); R(-1, 13, 2, 3, '#5a4130'); R(15, 13, 2, 3, '#5a4130');
  R(4, 2, 8, 5, '#c9707a'); R(4, 2, 8, 1, '#e8a0aa');
  const fl = settings.reducedMotion ? 0 : Math.round(Math.sin(time * 12) * 0.6);
  for (const k of [5, 8, 10]) { R(k, -1, 1, 3, '#e8e4d8'); R(k, -2 + fl, 1, 1, '#f6d48a'); }
  const sway = settings.reducedMotion ? 0 : Math.sin(time * 1.6) * 1.5;
  [['#c0503a', -6, -26], ['#d8b040', 16, -30], ['#7a6ad0', 22, -20]].forEach(([c, bx, by], i) => {
    const bx2 = bx + Math.round(sway * (i % 2 ? 1 : -1));
    ctx.fillStyle = '#d8d4c8'; ctx.fillRect(x + (bx < 0 ? -1 : 16), y + by + 8, 1, -by - 4);
    R(bx2 - 3, by, 7, 8, c); R(bx2 - 2, by + 1, 2, 2, 'rgba(255,255,255,0.35)'); R(bx2, by + 8, 1, 1, c);
  });
}

// v2.5b: the brightness setting: the whole picture a little brighter, and the dark a little thinner.
function applyBrightness() { const cv = document.getElementById('view'); if (cv) cv.style.filter = Math.abs(settings.brightness - 1) < 0.01 ? '' : `brightness(${settings.brightness})`; }
applyBrightness();
const darkK = () => Math.max(0.45, 1 - (settings.brightness - 1) * 0.7);
// The sky now: colour wash, how dark, where the sun is (cached for a game minute).
let skyKey = '', skyCache = null;
function skyNow() {
  const day = st?.day ?? 1, minute = clock.minuteOfDay;
  const key = `${day}:${Math.floor(minute / 2)}`;
  if (key !== skyKey || !skyCache) { skyKey = key; skyCache = skylight(CAL.seasonOf(day), minute, { nightDark: st ? MOON.moonEffects(MOON.moonOn(day)).dark : 0.6 }); }
  return skyCache;
}
function drawLighting(ctx, cx, cy, m, opts = {}) {
  const w = renderer.w, h = renderer.h, room = isArea(opts.room ?? world.room) ? 'city' : (opts.room ?? world.room);   // v2.1: areas are lit like the street
  if (light.width !== w || light.height !== h) { light = makeCanvas(w, h); lg = light.getContext('2d'); }
  lg.globalCompositeOperation = 'source-over';
  lg.clearRect(0, 0, w, h);
  // The street brightens in the morning and goes to dusk as the errand hours run out.
  // v2.4: at night the street is dark between the lamps, darker with no moon.
  // Phase 32: the light follows the real clock and the season (game/skylight.js): rose at dawn, gold in the
  // afternoon, violet at dusk, then dark.
  const sky = skyNow();
  const dusk = room === 'city' ? sky.alpha : 0;
  const shopDark = opts.dark ?? (wt.active ? 0.62 : isNight() ? 0.66 : stageOf(world).dark);
  const dk = darkK();
  lg.fillStyle = room === 'city' ? `rgba(${sky.rgb.join(',')},${(dusk * dk).toFixed(3)})` : room === 'shop' ? `rgba(4,5,9,${(shopDark * dk).toFixed(3)})` : room === 'lab' ? `rgba(6,4,12,${(0.62 * dk).toFixed(3)})` : PLACE_ROOMS[room] ? `rgba(8,5,6,${((PLACE_ROOMS[room].dark ?? 0.4) * dk).toFixed(3)})` : `rgba(4,5,9,${(0.66 * dk).toFixed(3)})`;
  lg.fillRect(0, 0, w, h);
  lg.globalCompositeOperation = 'destination-out';
  // Lamps breathe a little; the bare bulb in a run-down shop stutters.
  const flick = (i, l) => settings.reducedMotion ? 1 : l?.flicker
    ? (Math.sin(time * 1.3 + i) > 0.93 ? 0.55 : 0.9 + Math.sin(time * 23 + i) * 0.06 + Math.sin(time * 9.1) * 0.04)
    : 1 + Math.sin(time * 7 + i * 2.3) * 0.025 + Math.sin(time * 17 + i) * 0.015;
  const hole = (x, y, r) => {
    const gr = lg.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = gr; lg.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const boost = nightCity() && NC.nightCityOf(world).mysteries.lamplighter >= 4 ? 1.2 : 1;   // the lamplighter's lamps
  const seen = [...m.lights.map(l => (boost > 1 ? { ...l, r: l.r * boost } : l)), ...(opts.noPlayer ? [] : nightLights())].filter(l => l.x > cx - 64 && l.x < cx + w + 64 && l.y > cy - 64 && l.y < cy + h + 64);
  seen.forEach((l, i) => hole(l.x - cx, l.y - cy, l.r * flick(i, l)));
  if (!opts.noPlayer) { const pc = player.center; hole(Math.round(pc.x) - cx, Math.round(pc.y) - cy - 2, room === 'city' ? (isNight() ? (inYard() && nightArea().oil ? 46 : 30) : 40) : 54); }
  ctx.drawImage(light, 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  const warm = room === 'lab' ? '169,139,224' : '224,166,74';
  const glow = room === 'city' ? Math.min(1, sky.night * 1.6) : 1;
  if (room === 'city' && glow > 0.05) m.drawGlow?.(ctx, cx, cy, w, h, glow * (settings.reducedMotion ? 0.7 : 0.85));
  seen.forEach((l, i) => {
    if (glow < 0.05) return;
    const x = l.x - cx, y = l.y - cy, r = l.r * 0.8 * flick(i, l);
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${warm},${(0.14 * glow).toFixed(3)})`); gr.addColorStop(1, `rgba(${warm},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  });
  ctx.globalCompositeOperation = 'source-over';
}

const loop = createLoop({ step: CONFIG.step, maxFrame: CONFIG.maxFrame, update, render });

// ---------- interactions ----------

// ---------- town hours ----------

// Whether a place in town is open right now (or at 9 AM, before you've gone out).
function placeStatus(id) {
  const minute = inTown() && clock.state !== 'stopped' ? clock.minute : CONFIG.city.startMinute;
  return statusAt(id, st.day, minute, st.seed);
}

let keeperT = 0, lunchWas = false;
function syncKeepers(dt) {
  if (!pedestrians || (keeperT -= dt) > 0) return;
  keeperT = 1;
  const out = [];
  for (const [id, s] of Object.entries(SCHEDULES)) {
    const L = cityLayout.locs[id];
    const ps = placeStatus(id);
    if (!L || !ps.keeperOut) continue;
    if (ps.why === 'off' && offDayPlace(s.keeper)) continue;   // spending the day inside somewhere
    out.push({ id, name: s.keeper, home: L.stand, sprites: spritesFor(SIGNATURE[s.keeper]), key: lookKey(SIGNATURE[s.keeper]), lines: s.street });
  }
  // Phase 29: townsfolk out for a walk today (Kristen most often), each around a corner of town.
  const stands = Object.entries(cityLayout.locs).filter(([, L]) => L.stand).sort(([a], [b]) => (a < b ? -1 : 1));
  walkersToday().forEach((n, i) => {
    if (!stands.length) return;
    const [, L] = stands[(st.day * 5 + i * 3 + n.name.length) % stands.length];
    out.push({ id: `walk:${n.name}`, name: n.name, custom: true, home: L.stand, sprites: spritesFor(SIGNATURE[n.name]), key: lookKey(SIGNATURE[n.name]), lines: {} });
  });
  pedestrians.setKeepers(out);
}

function talkToKeeper(p) {
  const k = p.keeper;
  p.paused = 6; p.path = [];
  const dx = player.x - p.x, dy = player.y - p.y;
  p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  if (k.custom) return talkTo(k.name, { onEnd: () => { p.paused = 1.5; } });   // out for a walk (Phase 29)
  const st0 = placeStatus(k.id);
  const lines = (st0.why === 'lunch' ? k.lines.lunch : k.lines.off) ?? k.lines.off ?? k.lines.lunch ?? ['…'];
  const line = lines[(st.day + Math.floor(time / 8)) % lines.length];
  const ask = st0.why === 'lunch' ? 'Out for lunch?' : 'Not open today?';
  if (st0.reopens) ui.toast(st0.sign, 3200);
  // You ask, they answer; then it's a conversation like any other (Phase 20).
  if (KEEPER_TALK[k.name]) return talkTo(k.name, { street: { ask, line }, onEnd: () => { p.paused = 1.5; } });
  speech.say([{ who: 'you', text: ask }, line], { who: k.name, kind: 'talk' });
}

// ---------- conversations (Phase 20) ----------
// Talking to someone with something to say: their lines, then your choices, in the
// dialog box. What you pick is remembered (world.people) and can change things for good.
let talkingWith = null;
function talkTo(name, extra = {}) {
  let convo = extra.convo ?? convoFor(name);
  if (!convo || !st) return false;
  if (extra.nightHello) convo = withNightHello(convo, name);   // v2.4: found out late
  if (REL.hasRelationship(name)) convo = withRelationship(convo, name);
  if (isBirthdayToday(name, st.day)) convo = withBirthday(convo, name);
  if (holidayOn(st.day)?.greeting) convo = withHoliday(convo, holidayOn(st.day));
  if (ui.isOpen) ui.close();
  const ctx = T.makeCtx(world, st, name, { name, place: PLACE_OF_ROOM[world.room] ?? null, ...talkWorld(name), workPlace: Object.keys(SCHEDULES).find(id => SCHEDULES[id].keeper === name) ?? null, here: placeCrowd?.names ?? [], hoursLeft: clock.hoursLeft, spend: h => clock.advanceMinutes(h * 60), ...extra });
  talkingWith = name;
  const at = placeCrowd?.find(name);
  if (at) placeCrowd.face(at, player.x, player.y);
  const notes = [];
  const finish = () => { talkEnd = null; talkingWith = null; changed(); notes.splice(0).forEach(n => ui.toast(n, 2800)); extra.onEnd?.(); };
  talkEnd = finish;
  const show = res => {
    notes.push(...res.notes);
    let v = res.view;
    const lines = [];
    // Nodes that run straight on into another: one stretch of talk, then the choices.
    for (let guard = 0; v && guard < 6; guard++) {
      lines.push(...v.lines.map(l => (typeof l === 'string' ? { who: name, text: l } : l)));
      if (v.choices.length || !v.after) break;
      const r = T.enter(convo, v.after, ctx); notes.push(...r.notes); v = r.view;
    }
    if (!lines.length) return finish();
    if (v?.choices.length) {
      const last = lines.pop();
      lines.push({ ...last, choices: v.choices, onChoose: i => {
        const r = T.choose(convo, v.id, v.choices[i].i, ctx);
        notes.push(...r.notes);
        if (r.next === 'rel:gift') { finish(); return openGift(name); }
        // v2.4: a choice that opens a screen ('open:tackle').
        if (typeof r.next === 'string' && r.next.startsWith('open:')) { finish(); return OPENERS[r.next.slice(5)]?.(); }
        if (r.next) show(T.enter(convo, r.next, ctx)); else finish();
      } });
    }
    speech.say(lines, { who: name, kind: 'talk' });
  };
  show(T.begin(convo, ctx));
  return true;
}
// v2.4: what a conversation can know about the world outside: the season, the weather, the
// time of day (for Kip's tips), and whether Kip is out on the pier today.
function talkWorld(name) {
  return { season: CAL.seasonOf(st.day), weather: todayWeather(), timeOfDay: FISH.timeOfDay(clock.state === 'stopped' ? CONFIG.city.startMinute : clock.minute), fishing: FISH, atPier: name === 'Kip' && kipOnPier(), graves: G, seed: st.seed, cemetery: G.cemeteryOf(world), night: isNight() };
}
const OPENERS = { tackle: () => openTackle(g, tackleHooks()), shed: () => openShed() };
// ---------- relationships (Phase 22) ----------
// For the people in data/relationships.js: a heart event first, when one's waiting, and
// "I brought you something" among the choices (one gift a day).
const heartsText = rel => { const h = REL.heartsOf(rel); return '♥'.repeat(h) + '♡'.repeat(REL.MAX_HEARTS - h); };
function withRelationship(convo, name) {
  const def = RELATIONSHIPS[name];
  const gift = { text: 'I brought you something.', if: () => REL.canGiftToday(world, name, st.day) && (REL.giftable(st, world).length > 0 || FISH.fishingOf(world).cooler.length > 0), next: 'rel:gift' };
  const nodes = { ...convo.nodes, 'rel:gift': { say: [] } };
  const hub = nodes.hello ? 'hello' : null;
  if (hub) { const ch = [...(nodes[hub].choices ?? [])]; ch.splice(Math.max(0, ch.length - 1), 0, gift); nodes[hub] = { ...nodes[hub], choices: ch }; }
  // v2.4: a heart scene can come with something (def.rewards[level]), given once with it.
  nodes['rel:event'] = { effects: () => { const k = REL.pendingEvent(world, name); return k != null ? def.rewards?.[k] ?? null : null; }, say: () => { const k = REL.pendingEvent(world, name); if (k == null) return ['…']; REL.seeEvent(world, name, k); return def.events[k]; } };
  return { ...convo, nodes, start: c => (c.p.met && REL.pendingEvent(world, name) != null ? 'rel:event' : convo.start(c)) };
}

// Phase 29: everybody's birthday. On the day, wish them a happy one (once).
function withBirthday(convo, name) {
  const hub = convo.nodes.hello;
  if (!hub) return convo;
  const wish = { text: 'Happy birthday!', if: c => c.p.met && !c.today('bday'), effects: { flag: { bday: 'today' }, rel: 4 }, next: 'bday' };
  return { ...convo, nodes: { ...convo.nodes, hello: { ...hub, choices: [wish, ...(hub.choices ?? [])] }, bday: { say: [birthdayThanks(name)] } } };
}

// v2.2: on a holiday, wish anyone a happy one (once each).
const HOLIDAY_REPLIES = ['Same to you!', 'And to you. Don’t let anything follow you home tonight.', 'You too. Thanks for remembering.', 'Ha! Yes. Happy everything.'];
function withHoliday(convo, h) {
  const hub = convo.nodes.hello;
  if (!hub) return convo;
  const wish = { text: h.greeting, if: c => c.p.met && !c.today('holiday'), effects: { flag: { holiday: 'today' }, rel: 2 }, next: 'holiday' };
  return { ...convo, nodes: { ...convo.nodes, hello: { ...hub, choices: [...(hub.choices ?? []).slice(0, 1), wish, ...(hub.choices ?? []).slice(1)] }, holiday: { say: [HOLIDAY_REPLIES[(st.day + (convo.name?.length ?? 0)) % HOLIDAY_REPLIES.length]] } } };
}

function openGift(name) {
  const def = RELATIONSHIPS[name], p = T.personOf(world, name), known = p.flags.known ?? {};
  const words = { love: 'Loves these', like: 'Likes these', neutral: 'Not fussed', dislike: 'Dislikes these' };
  const items = REL.giftable(st, world);
  ui.open({
    id: 'gift', size: 'wide', eyebrow: `A gift for ${name}`, title: 'What will you give?',
    body: [
      el('p', { class: 'note' }, `One gift a day. ${REL.isBirthday(def, st.day) ? 'It’s their birthday: a gift counts double today.' : 'Pieces in your display cases stay where they are.'}`),
      el('div', { class: 'rows' }, items.length ? items.map(it => {
        const cat = S.baseOf(it)?.category;
        return el('article', { class: 'row-card' }, itemArt(it, 'item-art sm'),
          el('div', { class: 'row-text' }, el('strong', {}, S.Items.name(it)), el('span', {}, `${cat}${known[cat] ? ` · ${words[known[cat]]}` : ''}`)),
          el('button', { type: 'button', class: 'btn small primary', id: `gift-${it.uid}`, onclick: () => {
            const r = REL.giveGift(world, st, name, it.uid);
            ui.close(); changed();
            if (!r) return;
            speech.say([r.line], { who: name, kind: 'talk' });
            ui.toast(r.change > 0 ? `${name}: ${heartsText(p.rel)}` : `${name} didn’t like that.`, 2600);
          } }, 'Give'));
      }) : el('p', { class: 'note' }, 'Nothing in your stock to give.')),
      // v2.3: a fish from your cooler.
      ...(FISH.fishingOf(world).cooler.length ? [el('p', { class: 'label' }, `From your cooler${known.fish ? ` · ${words[known.fish]}` : ''}`), el('div', { class: 'rows' }, FISH.fishingOf(world).cooler.map(c => el('article', { class: 'row-card' }, fishArt(c.id),
        el('div', { class: 'row-text' }, el('strong', {}, FISH.fishById(c.id)?.name ?? c.id), el('span', {}, c.lb < 1 ? `${Math.round(c.lb * 16)} oz` : `${c.lb.toFixed(1)} lb`)),
        el('button', { type: 'button', class: 'btn small primary', id: `gift-${c.uid}`, onclick: () => {
          const r = REL.giveFish(world, st, name, c.uid);
          ui.close(); changed();
          if (!r) return;
          speech.say([r.line], { who: name, kind: 'talk' });
          ui.toast(r.change > 0 ? `${name}: ${heartsText(p.rel)}` : `${name} didn’t like that.`, 2600);
        } }, 'Give'))))] : []),
    ],
    actions: [{ label: 'Never mind', kind: 'quiet', onClick: () => ui.close() }],
  });
}

// The people you're close to: hearts, birthdays, what they like (as far as you know).
function openPeople(back) {
  const words = { love: 'loves', like: 'likes', neutral: 'is not fussed about', dislike: 'dislikes' };
  ui.open({
    id: 'people', size: 'wide', eyebrow: 'Relationships', title: 'People', back,
    body: [el('div', { class: 'rows' }, REL.relationshipNames().map(name => {
      const def = RELATIONSHIPS[name], p = T.personOf(world, name), known = Object.entries(p.flags.known ?? {});
      const until = REL.daysToBirthday(def, st.day);
      return el('article', { class: 'row-card' }, portraitFor(name, { label: name }) ?? el('span'),
        el('div', { class: 'row-text' },
          el('strong', {}, `${name}${titleOf(name) ? ` · ${titleOf(name)}` : ''}`),
          el('span', { class: 'hearts', 'aria-label': `${REL.heartsOf(p.rel)} of ${REL.MAX_HEARTS} hearts` }, p.met ? heartsText(p.rel) : 'Not met yet'),
          def.birthday ? el('small', {}, until === 0 ? 'Birthday today!' : `Birthday in ${until} day${until === 1 ? '' : 's'}`) : null,
          known.length ? el('small', {}, known.map(([c, k]) => `${words[k]} ${c}`).join(' · ')) : null));
    }))],
    actions: [{ label: 'Back', kind: 'quiet', onClick: back }],
  });
}

// The talk is over when the box empties (after its last line, or if it's cleared).
let talkEnd = null;
function checkTalkEnd() { if (talkEnd && !speech.busy) talkEnd(); }

// Walking into one of the places off the street (this game's own, or the library).
function enterPlace(place) {
  const room = PLACE_ROOMS[place?.enter?.room ?? place?.room];
  if (!room) return;
  if (room.id === 'bar') sendText('bar');
  return goThrough({ room: room.id, tx: room.spawn.tx, ty: room.spawn.ty, facing: 'up' });
}
// Out the door you came in by, onto the sidewalk in front of it.
function leavePlace() {
  const L = cityLayout.locs[PLACE_OF_ROOM[world.room]];
  if (L) goThrough({ room: 'city', tx: L.stand.tx, ty: L.stand.ty, facing: 'down' });
}
// Someone who's just here: a line, different each day.
function talkToExtra(p) {
  const lines = EXTRA_LINES[world.room] ?? ['…'];
  placeCrowd?.face(p, player.x, player.y);
  talkingWith = p;
  speech.say([lines[(st.day + p.extra) % lines.length]], { who: extraName(world.room), kind: 'talk' });
  talkEnd = () => { talkEnd = null; talkingWith = null; };
}

// The Brass Lantern's piano: a few notes, and once a day it settles you a little.
function playBarPiano() {
  const p = T.personOf(world, 'Lou');
  if (p.flags.piano === st.day) return ui.toast('You play a few more notes. Lou pretends not to listen.', 2200);
  p.flags.piano = st.day;
  if (st.stress > 0) { st.stress = Math.max(0, st.stress - 5); changed(); }
  ui.toast(st.stress > 0 || Math.random() < 0.5 ? 'You pick out a slow tune. Somebody in a booth claps. You feel steadier.' : 'You pick out a slow tune. Somebody in a booth claps.', 3000);
}

// ---------- things that happen in the city (Phase 22) ----------
// One at a time (game/city-events.js): a person, a cat or a thing on the street near you,
// a pickpocket to chase, or the rain. world.cityEvents keeps it in the save.
let eventEnt = null;


// A sidewalk tile between `near` and `far` tiles from you, ahead of you if possible.
function streetSpot(near = 5, far = 9) {
  const c = player.center, ptx = Math.floor(c.x / 16), pty = Math.floor(c.y / 16);
  const f = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[player.facing] ?? [0, 1];
  let best = null, bs = -Infinity;
  for (let dy = -far; dy <= far; dy++) for (let dx = -far; dx <= far; dx++) {
    const d = Math.hypot(dx, dy);
    if (d < near || d > far) continue;
    const tx = ptx + dx, ty = pty + dy;
    if (maps.city.at(tx, ty) !== ',' ) continue;
    const score = (dx * f[0] + dy * f[1]) / d + Math.random() * 0.6;
    if (score > bs) { bs = score; best = { tx, ty }; }
  }
  return best;
}

// The thing on the street for the active event (rebuilt after a load, or coming back outside).
function buildEventEnt() {
  const a = world.cityEvents?.day === st.day ? world.cityEvents.active : null;
  eventEnt = null;
  if (!a || a.id === 'pickpocket') return;
  const e = EVENTS[a.id], x = a.tx * 16, y = a.ty * 16 - 4;
  if (e.kind === 'npc') {
    const { look, sprites } = dress(`event:${a.id}:${st.seed}:${st.day}`, new Set([playerKey(), ...SIGNATURE_KEYS]));
    const g0 = new Guide(e.approach ? 40 : 30, look);
    g0.place('city', a.tx, a.ty, 'down');
    eventEnt = Object.assign(g0, { id: a.id, kind: 'npc', sprites, done: !!a.done });
    setPassingLook(e.name, look);
    if (e.approach && !a.done) g0.walkTo(maps.city, Math.floor(player.center.x / 16), Math.floor(player.center.y / 16));
  } else eventEnt = { id: a.id, kind: e.kind, art: e.art, x, y, facing: 'down', moving: false, frame: 0, done: !!a.done };
}

function spawnEvent(id) {
  const e = EVENTS[id];
  if (id === 'pickpocket') return startPickpocket();
  const at = streetSpot(e.kind === 'npc' && e.approach ? 7 : 4, e.kind === 'npc' && e.approach ? 11 : 8);
  if (!at) return;
  startEvent(world, st.day, id, { ...at, day: st.day }, clock.minute);
  buildEventEnt();
}

// The pickpocket: a bump, your pocket's lighter, and a few seconds to catch them.
function startPickpocket() {
  const c = player.center, ptx = Math.floor(c.x / 16), pty = Math.floor(c.y / 16);
  const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ tx: ptx + dx, ty: pty + dy })).find(p => !maps.city.isSolid(p.tx, p.ty));
  if (!near) return;
  const taken = pickpocketTakes(st);
  if (taken <= 0) return;
  startEvent(world, st.day, 'pickpocket', { ...near, day: st.day, taken }, clock.minute);
  st.cash -= taken;
  const { look, sprites } = dress(`thief:${st.seed}:${st.day}`, new Set([playerKey(), ...SIGNATURE_KEYS]));
  const g0 = new Guide(58, look);
  g0.place('city', near.tx, near.ty, 'down');
  eventEnt = Object.assign(g0, { id: 'pickpocket', kind: 'thief', sprites, grace: PICKPOCKET_GRACE, taken });
  // Off down the street, away from you.
  let far = null, fd = 0;
  for (let i = 0; i < 400; i++) {
    const tx = ptx + Math.round((Math.random() - 0.5) * 50), ty = pty + Math.round((Math.random() - 0.5) * 34);
    const d = Math.hypot(tx - ptx, ty - pty), away = (tx - ptx) * (near.tx - ptx) + (ty - pty) * (near.ty - pty);
    if (away > 0 && d > fd && d < 26 && CITY_WALKABLE.has(maps.city.at(tx, ty))) { fd = d; far = { tx, ty }; }
  }
  if (far) g0.walkTo(maps.city, far.tx, far.ty);
  cue('panic');
  ui.toast(`Hey! Someone just lifted ${money(taken)} from your pocket. Catch them!`, 3200);
}

function tickCityEvents(dt) {
  if (!st || wt.active || clock.state !== 'running') return;
  const ev = eventsState(world, st.day), a = ev.active;
  // Something new at the top of the hour (not in the first hour out).
  const hour = Math.floor(clock.minute / 60);
  if (!a && hour > Math.floor(CONFIG.city.startMinute / 60) && !talkHold() && !ui.isOpen) { const id = rollHour(st, world, hour, todayWeather()); if (id) spawnEvent(id); }
  if (!a) return;
  if (!eventEnt && a.id !== 'pickpocket') buildEventEnt();
  if (a.id === 'pickpocket') {
    if (!eventEnt) { endEvent(world, st.day); return; }
    eventEnt.update(dt, null);
    eventEnt.grace -= dt;
    // Caught: you ran them down (not just stood where they happened to pass).
    if (eventEnt.grace < PICKPOCKET_GRACE - 0.6 && player.moving && Math.hypot(eventEnt.x - player.x, eventEnt.y - player.y) < 14) {
      st.cash += eventEnt.taken; changed();
      ui.toast(`You grab their sleeve. They drop your ${money(eventEnt.taken)} and bolt.`, 3000);
      endEvent(world, st.day); eventEnt = null; return;
    }
    if (eventEnt.grace <= 0 || !eventEnt.path.length) {
      ui.toast(`They’re gone, and so is your ${money(eventEnt.taken)}.`, 2800);
      endEvent(world, st.day); eventEnt = null;
    }
    return;
  }
  // Leaving: the time's up, or (for people) they've said their piece and walked off.
  if (clock.minute >= a.until || (eventEnt?.gone)) { endEvent(world, st.day); eventEnt = null; return; }
  if (!eventEnt) return;
  if (eventEnt.kind === 'npc') {
    const talking = speech.visible && talkingWith === EVENT_CONVOS[eventEnt.id]?.name;
    if (!talking) eventEnt.update(dt, Math.hypot(player.x - eventEnt.x, player.y - eventEnt.y) < 40 ? player : null);
    // The Office man comes to you.
    if (EVENTS[eventEnt.id].approach && !eventEnt.done && !talking && Math.hypot(player.x - eventEnt.x, player.y - eventEnt.y) < 22 && !ui.isOpen && !speech.busy) runEvent();
    if (eventEnt.done && !eventEnt.leaving) {
      eventEnt.leaving = true;
      const to = streetSpot(12, 18);
      if (to) eventEnt.walkTo(maps.city, to.tx, to.ty, () => { eventEnt && (eventEnt.gone = true); }); else eventEnt.gone = true;
    }
  } else if (eventEnt.kind === 'cat') {
    // A fed cat follows you around for the rest of the event.
    const fed = T.personOf(world, 'Stray cat').flags.fed === st.day;
    const d = Math.hypot(player.x - eventEnt.x, player.y - eventEnt.y);
    eventEnt.moving = false;
    if (fed && d > 22) {
      const sp = Math.min(d - 18, (d > 60 ? 90 : 60) * dt);
      eventEnt.x += (player.x - eventEnt.x) / d * sp; eventEnt.y += (player.y - eventEnt.y) / d * sp;
      eventEnt.moving = true;
      eventEnt.facing = Math.abs(player.x - eventEnt.x) > Math.abs(player.y - eventEnt.y) ? (player.x > eventEnt.x ? 'right' : 'left') : (player.y > eventEnt.y ? 'down' : 'up');
      a.tx = Math.round(eventEnt.x / 16); a.ty = Math.round((eventEnt.y + 4) / 16);
    }
  }
}

function runEvent() {
  if (!eventEnt) return;
  const id = eventEnt.id, convo = EVENT_CONVOS[id], a = world.cityEvents.active;
  if (eventEnt.kind === 'npc') { eventEnt.path = []; eventEnt.then = null; const dx = player.x - eventEnt.x, dy = player.y - eventEnt.y; eventEnt.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  talkTo(convo.name, { convo, onEnd: () => {
    if (!eventEnt || eventEnt.id !== id) return;
    if (eventEnt.kind === 'item') { endEvent(world, st.day); eventEnt = null; return; }
    if (eventEnt.kind === 'npc') { eventEnt.done = true; if (a) a.done = true; }
  } });
}

// A wallet with a glint, or a newspaper page that flutters; and a stray cat.
function drawEventThing(ctx, e, x, y) {
  const R0 = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  if (e.kind === 'cat') {
    const side = e.facing === 'left' || e.facing === 'right', flip = e.facing === 'left', step = e.moving ? Math.floor(time * 8) % 2 : 0;
    R0(2, 13, 12, 2, 'rgba(0,0,0,0.35)');
    if (side) {
      const X = n => (flip ? 15 - n : n);
      const P = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + (flip ? 16 - a - w : a), y + b, w, h); };
      P(3, 7, 9, 4, '#3a3a42'); P(10, 4, 4, 4, '#3a3a42'); P(10, 3, 1, 1, '#3a3a42'); P(13, 3, 1, 1, '#3a3a42');
      P(12, 5, 1, 1, '#c9a24a'); P(1, 4 + step, 2, 4, '#3a3a42'); P(2, 3 + step, 1, 1, '#3a3a42');
      P(4, 11, 1, 2 - step, '#2a2a30'); P(10, 11, 1, 1 + step, '#2a2a30'); P(6, 11, 1, 1 + step, '#2a2a30'); P(8, 11, 1, 2 - step, '#2a2a30');
      void X;
    } else {
      R0(5, 7, 6, 6, '#3a3a42'); R0(5, 3, 6, 5, '#3a3a42'); R0(5, 2, 1, 1, '#3a3a42'); R0(10, 2, 1, 1, '#3a3a42');
      if (e.facing === 'down') { R0(6, 5, 1, 1, '#c9a24a'); R0(9, 5, 1, 1, '#c9a24a'); R0(7, 6, 2, 1, '#8a5a5a'); }
      R0(11, 9 - step, 2, 3, '#3a3a42');
    }
    return;
  }
  if (e.art === 'wallet') {
    R0(4, 11, 8, 4, '#1c140e'); R0(4, 10, 8, 4, '#5a3a24'); R0(4, 10, 8, 1, '#7a5a40'); R0(9, 11, 2, 1, '#c9b98f');
    if (Math.floor(time * 2) % 3 === 0) { R0(12, 8, 1, 3, '#f6d48a'); R0(11, 9, 3, 1, '#f6d48a'); }
  } else {
    const fl = Math.floor(time * 5) % 2;
    R0(3, 13, 10, 2, 'rgba(0,0,0,0.3)');
    R0(3, 6 + fl, 10, 7, '#d8d0bc'); R0(3, 6 + fl, 10, 1, '#f3ecdc'); R0(4, 8 + fl, 4, 1, '#8a8274'); R0(4, 10 + fl, 7, 1, '#8a8274'); R0(9, 8 + fl, 3, 2, '#8a8274');
  }
}


// ---------- the weather (Phase 23) ----------
// Today's weather (game/weather.js): the same all day and night, chosen from the seed.
// Phase 30 (continuous mode): the weather is the climate at this moment, changing through the day.
const monthOf = date => { const d = CAL.dateOf(date + 1); return d.m + (d.d - 1) / 31; };
let climateKey = '', climateSample = null;
function climateNow() {
  const t = Math.floor(clock.cycle.t / 10) * 10;                  // a new reading every ten game minutes
  const key = `${st.seed ?? 0}:${t}`;
  if (key !== climateKey) { climateKey = key; climateSample = CLIM.sample(st.seed ?? 0, t, { month: monthOf(Math.floor(t / 1440)) }); climateSample.type = CLIM.typeOf(climateSample); }
  return climateSample;
}
setClimateProvider((seed, day) => CLIM.dayType(seed, day - 1, { month: monthOf(day - 1) }));
// ...and it leaves its mark on the ground: wet streets, puddles, snow (game/ground.js, ui/ground-fx.js).
let ground = null;
function groundNow() {
  if (!ground || ground.seed !== (st.seed ?? 0)) ground = new Ground(st.seed ?? 0, monthOf);
  ground.advanceTo(clock.cycle.t);
  ground.setRaining(climateNow().precip > 0.1 && climateNow().temp > 0.8);
  return ground;
}
const todayWeather = () => (st ? (!weatherOverride() ? climateNow().type : weatherOn(st.seed ?? 0, st.day)) : 'overcast');
const weatherFx = new WeatherFX();
// Night zones with windows (lightning shows, the rain's on the glass); the rest are underground.
const WINDOWED_ZONES = new Set(['laundromat', 'hospital']);
function weatherPlace() {
  if (outdoors()) return 'street';
  if (world.room === 'zone') return WINDOWED_ZONES.has(st?.run?.zoneId) ? 'windows' : 'under';
  return 'indoor';
}
const weatherMode = () => (outdoors() ? 'street' : world.room === 'zone' ? 'zone' : 'indoor');
let lastRenderT = 0;
const renderDt = () => { const now = performance.now() / 1000, d = Math.min(0.1, lastRenderT ? now - lastRenderT : 0.016); lastRenderT = now; return d; };
function tickWeather(dt) {
  if (!st || (wt.active && world.room !== 'zone')) return;
  const type = todayWeather(), place = weatherPlace();
  const fx = weatherFx.update(dt, type, { mode: weatherMode(), windows: place !== 'under', reducedMotion: !!settings.reducedMotion, w: renderer.w, h: renderer.h, world: !weatherOverride() });
  if (fx.bolt) {
    audio.thunder(fx.bolt.near, place);
    // A flash through the windows lights up the place you're in for a moment (and it stays seen).
    if (world.room === 'zone' && st.run && place === 'windows') {
      const run = st.run, R = 6;
      for (let y = Math.max(0, run.pos.y - R); y <= Math.min(run.H - 1, run.pos.y + R); y++) for (let x = Math.max(0, run.pos.x - R); x <= Math.min(run.W - 1, run.pos.x + R); x++) {
        if ((x - run.pos.x) ** 2 + (y - run.pos.y) ** 2 <= R * R) run.seen[S.Crawl.idx(run, x, y)] = 1;
      }
    }
  }
}
function drawWeather(ctx, cx, cy) {
  if (!st || (wt.active && world.room !== 'zone')) return;
  weatherFx.draw(ctx, todayWeather(), { w: renderer.w, h: renderer.h, camX: cx, camY: cy, mode: weatherMode(), dusk: outdoors() ? clock.progress : 0, windows: weatherPlace() !== 'under' });
}
// The weather in the HUD: its icon beside the day.
const wxEl = document.getElementById('clock-wx');
let wxShown = '';
function syncWeatherHud(type, temp = null) {
  const shown = `${type}|${temp}`;
  if (!wxEl || wxShown === shown) return;
  wxShown = shown;
  const w = WEATHER[type], label = temp == null ? w.name : `${w.name}, ${temp}`;
  wxEl.replaceChildren(weatherIconSvg(w.icon));
  wxEl.dataset.tone = w.tone;
  wxEl.title = label; wxEl.setAttribute('aria-label', `Weather: ${label}`);
}
// Phase 30 (continuous mode): tap the weather icon for the conditions and the outlook.
if (wxEl) {
  wxEl.style.pointerEvents = 'auto'; wxEl.style.cursor = 'pointer';
  wxEl.setAttribute('role', 'button'); wxEl.setAttribute('tabindex', '0');
  const open = () => { if (st && !ui.isOpen && !wt.active) openWeatherPanel(); };
  wxEl.addEventListener('click', open);
  wxEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
}
function openWeatherPanel() {
  const t = Math.floor(clock.cycle.t / 10) * 10, unit = settings.tempUnit;
  const v = FC.forecastView(st.seed ?? 0, t, { month: monthOf(Math.floor(t / 1440)) }, unit), w = WEATHER[v.type];
  ui.open({
    id: 'weather', eyebrow: `${CAL.formatDate(st.day)} · ${clock.label}`, title: 'The weather', reason: 'panel', dismissable: true,
    body: [
      el('div', { class: `forecast tone-${w.tone}` },
        el('span', { class: 'forecast-icon' }, weatherIconSvg(w.icon)),
        el('div', {}, el('strong', { id: 'wx-now' }, `${w.name}, ${v.temp}`), el('p', {}, forecastLine(v.type)))),
      el('dl', { class: 'readout' },
        el('dt', {}, 'Wind'), el('dd', { id: 'wx-wind' }, v.wind),
        el('dt', {}, 'Humidity'), el('dd', {}, v.humidity),
        el('dt', {}, 'Pressure'), el('dd', { id: 'wx-pressure' }, `${v.pressure} · ${v.trend.toLowerCase()}`)),
      el('p', { class: 'label' }, 'Outlook'),
      el('ul', { class: 'stock', id: 'wx-outlook' }, v.later.map(l => el('li', {}, el('span', { class: 'stock-row' },
        el('span', { class: 'forecast-icon' }, weatherIconSvg(WEATHER[l.type].icon)),
        el('span', { class: 'stock-text' }, el('strong', {}, `In ${l.hours} hours`), el('span', {}, `${WEATHER[l.type].name}, ${l.temp}`)))))),
      el('p', { class: 'note', id: 'wx-summary' }, v.summary),
    ],
    actions: [{ label: 'Close', kind: 'primary', onClick: () => ui.close() }],
  });
}

// The morning's forecast: what it is, what it means for today and tonight.
function forecastCard() {
  const type = todayWeather(), w = WEATHER[type];
  return el('div', { class: `forecast tone-${w.tone}` },
    el('span', { class: 'forecast-icon' }, weatherIconSvg(w.icon)),
    el('div', {}, el('strong', {}, `${w.name} · ${seasonOf(st.day)}`), el('span', {}, w.blurb),
      ...(w.perks?.length ? [el('small', { class: 'good' }, w.perks.join(' · '))] : []),
      ...(w.cons?.length ? [el('small', { class: 'bad' }, w.cons.join(' · '))] : [])));
}

// ---------- getting around (Phase 22) ----------
// Riding: on the street, when you have something to ride and haven't chosen to walk.
const riding = () => world?.room === 'city' && world.riding !== false && hasVehicle(st);
// The van keeps off the grass: the street map with those tiles closed to it.
const vanMap = Object.create(maps.city);
function cityMoveMap() {
  const off = keepsOff(st, riding());
  if (!off) return maps.city;
  vanMap.isSolid = (tx, ty) => maps.city.isSolid(tx, ty) || off.has(maps.city.at(tx, ty));
  return vanMap;
}
function toggleRide() {
  if (!hasVehicle(st) || world.room !== 'city') return;
  const on = world.riding === false;
  if (on && keepsOff(st, true)) {
    const c = player.center;
    if (keepsOff(st, true).has(maps.city.at(Math.floor(c.x / 16), Math.floor((c.y + 4) / 16)))) return ui.toast('Get back to the road first. The van doesn’t do lawns.', 2200);
  }
  world.riding = on;
  cue('tap');
  ui.toast(on ? `On ${vehicleOf(st).name}.` : 'You walk it for a while.', 1200, { minor: true });
}
const rideBtn = document.getElementById('ride-btn');
rideBtn?.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); toggleRide(); });
let rideKey = '';
function syncRideBtn() {
  const show = !!st && world.room === 'city' && hasVehicle(st) && !pause.paused && !wt.active;
  const key = show ? (riding() ? 'walk' : 'ride') : '';
  if (key === rideKey || !rideBtn) return;
  rideKey = key;
  rideBtn.hidden = !show;
  if (show) { rideBtn.querySelector('span').textContent = key === 'walk' ? 'Walk' : 'Ride'; rideBtn.classList.toggle('on', key === 'walk'); rideBtn.setAttribute('aria-label', key === 'walk' ? 'Get off and walk' : `Ride ${vehicleOf(st).name}`); }
}

// The bus: from any stop to any other, for a fare or a ride on your pass.
function openBus(hit) {
  const from = Object.values(cityLayout.busStops).find(b => b.tx === hit.tx && b.ty === hit.ty);
  const cost = busCost(st, world, S.DATA), left = Math.max(0, passRides(st, S.DATA) - busToday(world, st.day).used);
  const mins = WEATHER[todayWeather()].busMinutes ?? BUS_MINUTES;
  const short = clock.hoursLeft < mins / 60 + 0.25;
  const placeName = id => (S.City.loc(id) ?? extraPlace(id))?.name ?? id;
  const ride = to => {
    if (cost > st.cash) return ui.toast('Not enough for the fare.', 1800);
    if (cost) st.cash -= cost;
    busToday(world, st.day).used += 1;
    clock.advanceMinutes(mins);
    ui.close(); changed(); cue('travel');
    const b = cityLayout.busStops[to];
    goThrough({ room: 'city', tx: b.stand.tx, ty: b.stand.ty, facing: 'down' });
    ui.toast(`The bus lets you off by ${placeName(to)}.`, 2000);
  };
  const stops = Object.values(cityLayout.busStops).filter(b => b !== from);
  ui.open({
    id: 'bus', eyebrow: `Bus stop · ${placeName(from?.id)}`, title: 'Where to?', size: 'wide',
    body: [
      el('p', { class: 'note' }, `${mins} minutes to anywhere on the line${mins > BUS_MINUTES ? ' (the storm’s slowing everything down)' : ''}. ${cost ? `Fare $${cost}.` : passRides(st, S.DATA) === Infinity ? 'Your express card covers it.' : `Your pass covers it (${left} ride${left === 1 ? '' : 's'} left today).`}`),
      short ? el('p', { class: 'warnline' }, 'Not enough of the day left for a ride.') : null,
      el('div', { class: 'rows' }, stops.map(b => el('article', { class: 'row-card' },
        iconSvg(mapIcon(S.City.loc(b.id) ?? extraPlace(b.id)), 'px-icon'),
        el('div', { class: 'row-text' }, el('strong', {}, placeName(b.id)), el('span', {}, S.City.district((S.City.loc(b.id) ?? extraPlace(b.id)).district)?.name ?? '')),
        el('button', { type: 'button', class: 'btn small primary', id: `bus-${b.id}`, disabled: short || cost > st.cash, onclick: () => ride(b.id) }, cost ? `$${cost}` : 'Ride')))),
    ],
    actions: [{ label: 'Back to the street', kind: 'quiet', onClick: () => ui.close() }],
  });
}

function interact(t) {
  switch (t.panel) {
    case 'counter': {
      const f = crowd.front('sell');
      if (!f) return ui.toast('Nobody at the counter. Sellers line up here.');
      return f.visit === 'inspector' ? openInspector(g, f) : f.visit === 'appraise' ? openAppraiser(g, f) : openSeller(g, f);
    }
    case 'till': return openTill(g);
    case 'display': return openDisplay(g, `${t.hit.tx},${t.hit.ty}`);
    case 'renovate': wt.event('renovate'); return openRenovation(g, () => wt.event('booked'));
    case 'guide': return wt.talk();
    case 'frontdoor':
      if (wt.allows('frontdoor')) return wt.event('frontdoor');
      if (!wt.active) return shopSignCard();
      if (!wt.active && (isNight() || clock.state === 'ended')) { goHome(); return ui.toast('Across the street and up the stairs. Home.', 2000); }
      if (!wt.active && st.phase === 'morning' && !world.dayMode) { goHome(); return; }
      return ui.toast(wt.active ? 'Not yet. Mina’s still showing you around.' : 'The shop’s open. Your apartment is right across the street when the day’s done.');
    case 'stairsDown':
      if (world.night === 'lab' || wt.allows('lab')) return goThrough(t.go);
      if (!wt.active) return world.shopSession ? ui.toast('The shop’s open. The back room stays shut until you close.', 2400) : goThrough(t.go);
      if (wt.active) return ui.toast('Not yet. Mina’s still showing you the shop.');
      return ui.toast(isNight() ? 'You chose to rest tonight. The basement can wait.' : 'The basement workshop is night work. Choose it when the day ends.');
    case 'cot':
    case 'bed': return useBed();
    case 'wardrobe': return openWardrobe();
    case 'kitchen': return useKitchen();
    case 'radio': return useRadio();
    case 'photo': return lookAtPhoto();
    case 'window': return lookOutWindow();
    case 'homeBoard': return openHomeBoard();
    case 'homeDoor': return openHomeDoor();
    case 'erinShop': return openErinShop();
    case 'easel': return youSay(pickDay(['A half-finished painting of a room that doesn’t exist yet. It looks warm in there.', 'Paint swatches pinned to the easel: “Midnight Moss,” “Pawn Shop Gold,” “Rain on Pell Street.”', 'A sketch of an apartment over a dry cleaner. Yours? There’s a reading chair where your boxes are.'], 4));
    case 'bench': return openBench(g);
    case 'workshop': return openWorkshop(g);
    case 'desk': return openDesk(g);
    case 'cells': return openCells(g);
    case 'gear': return openGear(g);
    case 'otherDoor': return otherDoor();
    case 'keeper': return talkToKeeper(t.keeper);
    case 'magician': return openMagicAct('Outside the Brass Lantern');
    case 'lunchSign': return ui.toast('A card on the table, in loopy handwriting: “BACK AT 1. AT LUNCH WITH MY WIFE (ERIN’S WANDERING BRUSH, WESTSIDE). NO PEEKING AT THE DECK. — R.”', 4200);
    case 'npc': return t.npc.who === 'Ryan' && world.room === 'bar' ? openMagicAct('Inside the Brass Lantern') : t.npc.who ? talkTo(t.npc.who) : talkToExtra(t.npc);
    case 'talk': {
      if (placeCrowd && !placeCrowd.find(t.who)) return ui.toast(t.who === 'Morgan' ? 'Nobody at the desk. A sign says BACK IN 5 MINUTES (PROBABLY).' : 'Nobody’s here right now.', 2400);
      return talkTo(t.who, t.entry ? { entry: t.entry } : {});
    }
    case 'piano': return playBarPiano();
    case 'fish': return startFishing(t.spot);
    case 'tackle': return openTackle(g, tackleHooks());
    case 'snack': {
      if (CAL.seasonOf(st.day) === 'winter') return ui.toast('The snack shack is boarded up for the winter. A gull is sitting on the sign.', 2600);
      if (st.cash < 2) return ui.toast('A cone is $2. You’re short.', 1800);
      st.cash -= 2; st.stress = Math.max(0, st.stress - 4); cue('till'); changed();
      return ui.toast(['A soft-serve cone, $2. It melts faster than you can eat it. Worth it.', 'A paper boat of fries, $2. A gull watches every bite.', 'A lemonade, $2. Too sweet. Perfect.'][st.day % 3], 2600);
    }
    case 'lifeguard': {
      const tt = FISH.tideAt(st.day, clock.minute);
      return ui.toast(`The board by the lifeguard station: ${tt.label.toUpperCase()}. WATER ${CAL.seasonOf(st.day) === 'summer' ? '68°' : CAL.seasonOf(st.day) === 'winter' ? '39°' : '54°'}. ${WET.has(todayWeather()) ? 'NO SWIMMING TODAY.' : 'SWIM BETWEEN THE FLAGS.'}`, 3200);
    }
    case 'jukebox': return ui.toast(['The jukebox plays something slow with a lot of saxophone in it.', 'A song from before you were born. Dot hums along.', 'B-7 is stuck. It only plays B-7.'][st.day % 3], 2600);
    case 'seats': return ui.toast('The next show starts at the top of the hour. Tickets are at the counter in the lobby.', 2600);
    case 'catalog': return openLocation(g, 'library', null, { talk: name => talkTo(name) });
    case 'exitPlace': if (world.room === 'chapel' && t.hit?.ty === 1) return enterCemetery(false); return leavePlace();
    case 'bus': if (isNight()) return ui.toast('The buses stopped running hours ago. The timetable has a coffee ring on it.', 2400); return openBus(t.hit);
    case 'night': return nightInteract(t.ent);
    // v2.5: the churchyard, the beach at night, the woods rope.
    case 'grave': return openGrave(t.hit.tx, t.hit.ty);
    case 'cemGate': { const k = G.gateLock(world, t.hit.ty); return ui.toast(k ? `Locked. ${GEAR[k].name}: Mike has it.` : 'The gate stands open. You have the key.', 2400); }
    case 'cemExit': return leaveCemetery();
    case 'beachSign': return ui.toast('GULL POINT BEACH ↓ Down the boardwalk, through the dunes. Bait & Tackle · Snacks · Lifeguard on duty by day.', 3600);
    case 'shed': return openShed();
    case 'flotsam': return pickFlotsam(t.spot);
    case 'beachSight': return beachSight(t.id);
    case 'woodsRope': return ui.open({ id: 'woodsSign', eyebrow: 'The trail into the woods', title: 'A sign on the rope', body: [el('p', { class: 'document woods-sign' }, 'BEING CLEARED OUT FOR DANGEROUS ENTITIES!', el('br'), 'DANGEROUS!', el('br'), 'Do NOT cross!'), el('p', { class: 'note' }, 'Past the rope, the trail runs on into the trees. Something moves in there, a long way off.')], actions: [{ label: 'Leave it be', kind: 'quiet', onClick: () => ui.close() }] });
    case 'event': return runEvent();
    case 'loc': {
      const id = cityLayout.doors[`${t.hit.tx},${t.hit.ty}`];
      if (id === 'apartment') return goHome();   // Phase 27: your place, to walk around in
      // v2.4: at night only the late places are open.
      if (isNight() && id === 'chapel') return G.cemeteryOf(world).gear.gate ? (ui.toast('Mike’s key turns in the side gate. The churchyard, after dark.', 2200), enterCemetery(true)) : ui.toast('St. Brigid’s is locked. The side gate to the churchyard is locked too. Mike has the key.', 2800);
      if (isNight() && extraPlace(id)?.enter) { const no = NC.nightOpen(id, clock.minute); if (!no.open) return ui.toast(no.sign, 2600); return enterPlace(extraPlace(id)); }
      if (isNight() && id && id !== 'apartment' && !extraPlace(id)) return ui.toast('Dark and locked. The sign on the door says to come back in the morning.', 2400);
      if (extraPlace(id)?.enter) return enterPlace(extraPlace(id));
      if (WALK_INS[id] && placeStatus(id).open) return enterPlace(WALK_INS[id]);
      if (id && SCHEDULES[id] && !placeStatus(id).open) sendText('hours');
      const hooks = { offSpot: name => { const p = offDayPlace(name); return p ? (extraPlace(p) ?? S.City.loc(p))?.name : null; }, talk: name => talkTo(name, { onEnd: () => { if (!ui.isOpen && clock.state !== 'ended') openLocation(g, id, null, hooks); } }) };
      return id && openLocation(g, id, null, hooks);
    }
    case 'exit': { const r = N.climbOut(st); if (r) endRun(r); return; }
  }
  if (t.go) goThrough(t.go);
}

// ---------- the day ----------

// Mornings: the recap, letters and pages, the pledge if it's due, then the day's choice.
function openMorning(first = false, extra = null) {
  if (st) REL.driftAll(world, st.day);
  autosave();
  return first ? beginContinuousDay(true) : runMorning(g, extra, () => beginContinuousDay(false));
  if (first) return morningChoice(true);
  runMorning(g, extra, () => morningChoice(false));
}

// Phase 30 (continuous mode): there is no day choice. The day starts as free time in the city,
// run by the errand-day rules with no hour budget, and the clock runs until the player sleeps.
// For now the shop can't be opened and the sim's day number only moves at sleep, not at midnight.
function beginContinuousDay(first = false) {
  if (ui.isOpen) ui.close();
  clock.endTimed();
  if (world.collapse) return collapseWakeCard();
  if (st.phase === 'morning') CR.startErrandDay(st, clock);
  world.dayMode = 'city';
  pedestrians = null;
  clock.start();
  changed();
  ui.toast(first ? `Day 1. ${CAL.formatDate(st.day, { long: true })}.` : `Good morning. ${CAL.formatDate(st.day, { long: true })}.`, 2800);
}

const closedToday = () => closedAllDay(st.day, st.seed).map(id => S.City.loc(id)?.name).filter(Boolean);

// Phase 27: the morning is a card you read in bed; the day is chosen at your front door.
function chooseDay(what) {
  // v2.4: out too late last night: the morning got away from you.
  const late = world.late?.day === st.day ? world.late : null;
  if (late) setTimeout(() => { clock.advanceMinutes(late.hours * 60); ui.toast(`You slept through the alarm. It’s ${clock.label} already.`, 3000); }, 50);
  world.late = null;
  {
    if (what === 'shop') {
      clock.setSpan(shopDaySpan());
      openShopDay(st);
      world.dayMode = 'shop';
      crowd = makeCrowd();
      const s = shopRoom().spawn;
      goThrough({ room: 'shop', tx: s.tx, ty: s.ty, facing: 'down' });   // across the street
      ui.close(); clock.start();
      const hrs = shopHours(shopState(world).tier);
      ui.toast(Object.keys(world.displays).length ? `Open for business, ${hrs}.` : `Open ${hrs}. Your cases are empty: buyers need tagged stock to look at.`, 2600);
    } else {
      CR.startErrandDay(st, clock);
      if (hasEdge(world, 'errand')) clock.extend(60, CONFIG.city.hourMs);   // a repo driver knows the shortcuts
      world.dayMode = 'city';
      pedestrians = null;
      const L = cityLayout.locs.apartment;
      goThrough({ room: 'city', tx: L.stand.tx, ty: L.stand.ty, facing: 'down' });   // out the front door
      ui.close(); clock.start();
      ui.toast(`${Math.round(clock.hoursLeft)} errand hours${hasEdge(world, 'errand') ? ' (you know the shortcuts)' : ''}. The shop door ends the day.`, 3200);
      sendText('city');
    }
    changed();
  }
}

function morningChoice(first) {
  morningTexts();
  const left = S.Calendar.daysLeft(st), endless = S.Endless.on(st), yr = Y.auditLine(st);
  const est = endless && st.endless.estate?.day === st.day ? st.endless.estate : null;
  const when = yr ? ` · inspection in ${yr.left} day${yr.left === 1 ? '' : 's'}` : left !== null ? ` · audit in ${left} day${left === 1 ? '' : 's'}` : endless ? ` · ${S.Endless.rank(st).name}` : '';
  ui.open({
    id: 'morning', eyebrow: `${CAL.formatDate(st.day, { long: true })}${when}`, title: first ? 'A new start' : 'Good morning',
    reason: 'morning', dismissable: false,
    body: [
      first ? el('p', {}, firstMorningText()) : el('p', { class: 'speech' }, st.morningLine),
      holidayOn(st.day) ? el('p', { class: 'note holiday-line' }, holidayOn(st.day).morning) : null,
      world.late?.day === st.day ? el('p', { class: 'note warnline' }, `${world.late.who ?? 'Somebody'} saw you home at half past four. You’ll be ${world.late.hours} hours late out the door today.`) : null,
      forecastCard(),
      st.rent.arrears ? el('p', { class: 'note warnline' }, `You owe ${money(st.rent.arrears)} in back rent. The landlord’s notice is keeping some customers away.`) : null,
      S.Audit.hideOpen(st) ? el('p', { class: 'note warnline' }, yr ? 'The Office’s final review is a week out. You could still hide the basement (see the ledger).' : 'The audit is a week out. You could still hide the basement (see the ledger).') : null,
      yr && st.year.fine.owed ? el('p', { class: 'note warnline' }, `You owe the Office ${money(st.year.fine.owed)}. Pay it from the ledger.`) : null,
      yr && st.year.restrict.length ? el('p', { class: 'note warnline' }, `On notice: ${st.year.restrict.map(id => Y.RESTRICTIONS[id].name.toLowerCase()).join(', ')}.`) : null,
      el('dl', { class: 'readout' },
        el('dt', {}, 'Rent'), el('dd', {}, `${money(S.Calendar.owed(st))} due ${CAL.formatDate(st.rent.dueDay)}`),
        ...(endless ? [el('dt', {}, 'Rank'), el('dd', {}, `${S.Endless.rank(st).name} · ${S.Endless.score(st).toLocaleString('en-US')} points`)]
          : yr ? [el('dt', {}, 'Inspection'), el('dd', {}, `${yr.date} · ${Y.strikesThisYear(st)} of ${Y.YEAR.strikesToClose} failed this year`)]
          : [el('dt', {}, 'Audit'), el('dd', {}, st.auditDay ? `in ${left} days` : 'none')]),
        ...(endless && st.endless.commission ? [el('dt', {}, 'Commission'), el('dd', {}, `${S.byId(S.DATA.anomalies, st.endless.commission.anomalyId).name} · due day ${st.endless.commission.due}`)] : []),
        el('dt', {}, 'Basement'), el('dd', {}, `${st.inventory.loot.length} untagged · ${st.inventory.stock.length} tagged`),
        el('dt', {}, 'Shop'), el('dd', {}, `${stageOf(world).name} · open ${shopHours(shopState(world).tier)}${shopState(world).booked != null ? ' · crew booked tonight' : ''}`),
        ...(closedToday().length ? [el('dt', {}, 'In town'), el('dd', {}, `Closed all day: ${closedToday().join(', ')}`)] : []),
        ...(adOn(world, st.day) ? [el('dt', {}, 'Ads'), el('dd', {}, `${adOn(world, st.day).name} · through day ${drawState(world).ad.until}`)] : []),
        ...(wagesDue(world) ? [el('dt', {}, 'Staff'), el('dd', {}, `${ROLE_ORDER.filter(r => onStaff(world, r)).map(r => staffState(world)[r].name.split(' ')[0]).join(', ')} · ${money(wagesDue(world))} a day open`)] : [])),
      el('p', { class: 'note' }, 'Get up and look around. When you’re ready, the front door is where you choose the day: the shop across the street, or the city.'),
    ],
    actions: [
      { id: 'get-up', label: 'Get up', kind: 'primary', onClick: () => { ui.close(); if (!world.notes?.homeHint) { (world.notes ??= {}).homeHint = true; ui.toast('Your place. The wardrobe changes your look, the kitchen makes coffee, and the front door starts the day.', 4200); } } },
      ...(est ? [{ id: 'estate-buy', label: `Estate sale: ${est.who} · ${money(est.price)}`, disabled: st.cash < est.price, onClick: () => { const r = A.buyEstate(st); changed(); if (r) ui.toast(`${r.items.length} things are waiting in the lab.`); morningChoice(first); } }] : []),
      { id: 'open-ledger', label: endless ? 'The ledger: rent, rank, commissions' : 'The ledger: rent, standing, the audit', kind: 'quiet', onClick: () => openStanding(g, () => morningChoice(first)) },
    ],
  });
}

function endDay(reason) {
  if (ui.isOpen) ui.close();
  for (const c of [...crowd.list]) crowd.dismiss(c);
  crowd.clear();
  const heat0 = st.heat;
  let report = null;
  if (st.phase === 'day') {
    report = A.closeShop(st);
    const pay = payroll(world, st);
    if (report && (pay.paid.length || pay.quit.length)) {
      report.items = report.items.filter(x => !/^Nothing sold today/.test(x.text));
      report.items.push(...payrollNews(pay));
      if (!report.sold) report.items.unshift({ kind: 'odd', text: 'Nothing sold today. The news had nothing on you, at least.', tag: '' });
    }
    staffFloor.reset();
  } else if (st.phase === 'errands') S.Calendar.endErrands(st);
  changed();
  if (st.gameOver) return;
  ui.open({
    id: 'news', size: 'wide', eyebrow: `${CAL.formatDate(st.day)} · ${reason === 'early' ? 'Closed early' : 'Closing time'}`, title: report ? 'The evening news' : 'Evening',
    reason: 'dayend', dismissable: false,
    body: report ? newsBody(report, st, heat0) : [el('p', {}, reason === 'early' ? 'You head home before dark.' : 'The streetlights come on. Time to head home.')],
    actions: [{ id: 'to-night', label: 'Night falls', kind: 'primary', onClick: openNight }],
  });
}

function openNight() {
  const loot = st.inventory.loot.length;
  const mo = MOON.moonOn(st.day), noOpen = NS.cantOpen(st, Object.keys(world.displays).length);
  ui.open({
    id: 'night', eyebrow: `${CAL.formatDate(st.day)} · Night`, title: 'How will you spend tonight?',
    reason: 'night', dismissable: false,
    body: [
      el('p', {}, 'One choice for the whole night.'),
      el('p', { class: 'note' }, `${mo.name} tonight. ${mo.id === 'full' ? 'The streets are as bright as they get, and the strange things are out.' : mo.id === 'new' ? 'No moon. The dark between the lamps is very dark.' : ''}`),
      el('p', { class: 'note' }, loot ? `${loot} piece${loot === 1 ? '' : 's'} on the bench downstairs. ${S.dur(st.bench.max)} of bench time tonight.` : 'The bench is empty, but the workshop and desk are open.'),
    ],
    actions: [
      { id: 'night-lab', label: 'Work in the basement lab', kind: 'primary', onClick: () => {
        world.night = 'lab'; ui.close();
        const s = ROOMS.lab.spawn; placeAt('lab', s.tx, s.ty, 'down');
        ui.toast(`${S.dur(st.bench.mins)} of bench time tonight.`, 2400);
      } },
      { id: 'night-dungeon', label: 'Go out into the zones', onClick: () => { sendText('zones'); openZones(g, enterZone, openNight, { shield: shieldPreview() }); } },
      // v2.4: the city after dark, and the shop open late (twice a week).
      { id: 'night-city', label: 'Walk the city at night', onClick: startNightCity },
      { id: 'night-shop', label: noOpen ? `Open the shop tonight · ${noOpen.toLowerCase()}` : `Open the shop tonight · ${NS.opensLeft(st)} left this week`, disabled: !!noOpen, onClick: () => { sendText('nightShop'); startNightShop(); } },
      { id: 'night-sleep', label: 'Go home to bed', onClick: () => { ui.close(); world.night = 'rest'; if (world.room === 'apartment') confirmSleep(); else { goHome(); ui.toast('Home. The bed’s in the bedroom.', 2200); } } },
    ],
  });
}

// ---------- night runs ----------

// The other door in the basement: shut, hinting, or open onto Beneath Old Market.
function otherDoor() {
  const D = S.DATA.door;
  if (!S.Story.doorOpen(st)) {
    const shut = st.story.door === 'shut';
    return ui.toast(shut ? D.shut : st.story.pages.includes('p4') ? 'It doesn’t move. The wood is warm, like a door with a room behind it.' : 'An old door, painted shut. It doesn’t go anywhere. You’re fairly sure.', 3600);
  }
  ui.toast('The other door is open. Choose it from the zones when night falls.', 3800);
}

function enterZone(zoneId) {
  const r = N.enterZone(st, zoneId);
  if (r.error) { ui.toast(r.error); return; }
  world.night = 'zone'; world.lastZone = zoneId;
  zone.build(st);
  world.room = 'zone';
  zone.snapToRun(st); player.facing = 'up';
  snapCamera();
  clock.setSpan(NIGHT_SPAN);
  clock.load({ ...clock.save(), state: 'stopped', elapsedMs: 0, day: st.day });
  clock.beginTimed(nightRunMinutes()); world.nightRunWindow = clock.cycle.window;
  changed();
  ui.close();
  clock.start();
  ui.toast(st.run.log[0], 4200);
  // Phase 29: Kristen's breathing drill. The closer you are, the more you shrug off tonight.
  const guard = kristenGuard(T.personOf(world, 'Kristen').rel);
  world.nerve = guard ? { day: st.day, left: guard, max: guard } : null;
  if (guard) setTimeout(() => ui.toast(`In four, hold four. Kristen’s shield is up: the first ${guard} stress tonight won’t touch you. It’s the blue bar under Nerve.`, 4200), 4300);
}

// Kristen's drill (Phase 29): the shield itself works inside the night rules
// (rules/night.js `shielded`); here it's set up for the night and you're told when it's gone.
const shieldTonight = () => (st && world.nerve && world.nerve.day === st.day && world.nerve.left > 0 ? world.nerve : null);
N.nerveShield.get = () => shieldTonight();
function shieldNews() {
  const n = world?.nerve;
  if (n && n.day === st?.day && n.left <= 0 && !n.told) { n.told = true; ui.toast('Kristen’s shield is spent. From here on, every scare counts.', 2600); }
}
// What it'll be tonight, if you went out now (for the zones panel).
const shieldPreview = () => kristenGuard(T.personOf(world, 'Kristen').rel);

function runZone(dt) {
  // A fight already underway (just started, or loaded from a save) always gets its panel.
  if (st.run.encounter) { if (ui.current?.id !== 'fight') startFight(); return; }
  const ev = zone.update(st, dt);
  if (god.unlocked && god.invincible) { applyGod(god, st, { inZone: true }); ev.encounter = false; }
  changed();
  if (ev.knockout) return endRun(ev.knockout);
  if (ev.encounter) return startFight();
  if (wt.active && st.run) {
    if (ev.notes.some(n => /^Found/.test(n))) wt.event('find');
    const run = st.run, lit = S.Crawl.lit(st, run);
    if (run.cryptids.some(c => Math.abs(c.x - run.pos.x) + Math.abs(c.y - run.pos.y) <= 4 && S.Crawl.visibleCryptid(st, run, lit, c.x, c.y))) wt.event('near');
  }
  // Run notes: the log line matters; passing notes don't pile up behind it.
  if (ev.log) ui.toast(ev.log, 2600);
  else if (ev.notes.length) ui.toast(ev.notes[ev.notes.length - 1], 2200, { minor: true });
}

function startFight() {
  input.release();
  wt.event('fight');
  openFight(g, {
    onEnd: note => { if (st.run) { const c = zone.cellOfPlayer(); if (c.x !== st.run.pos.x || c.y !== st.run.pos.y) zone.snapToRun(st); } ui.toast(note || 'It’s over.'); wt.event('fightEnd'); },
    onKnockout: () => endRun({ how: 'knockout' }),
  });
}

function endRun(result) {
  if (!result) return;
  if (result.how === 'knockout') { player.pose = 'ko'; world.lastKnockout = st.day; }   // Kristen notices (Phase 29)
  if (ui.isOpen) ui.close();
  clock.stop();
  changed();
  world.night = 'done';
  openRunEnd(g, result, () => {
    ui.close();
    clock.setSpan(shopDaySpan());
    clock.load({ ...clock.save(), state: 'stopped', elapsedMs: 0, day: st.day });
    backToFreeTime();
    if (world.lastZone === 'undercroft') { placeAt('lab', 5, 2, 'down'); ui.toast('You close the other door behind you. Home is across the street.'); }
    else if (wt.active) { placeAt('apartment', 11, 9, 'up'); wt.event('runEnd', result.how); }
    else { const d = APARTMENT.door; placeAt('apartment', d.tx, d.ty, 'up'); ui.toast('Home. The bed’s in the bedroom.'); }
  });
}

function confirmSleep() {
  if (wt.active) { if (wt.allows('cot')) wt.event('cot'); else ui.toast('Not yet. Mina’s still showing you around.'); return; }
  ui.open({
    id: 'sleep', eyebrow: `${CAL.formatDate(st.day)} · Night`, title: 'Turn in for the night?',
    body: [el('p', {}, st.bench.mins > 0 && world.night === 'lab' ? `You still have ${S.dur(st.bench.mins)} of bench time. It doesn’t carry over.` : 'The basement is quiet. Morning comes fast.')],
    actions: [
      { id: 'do-sleep', label: 'Sleep until morning', kind: 'primary', onClick: () => { ui.close(); sleep(); } },
      { label: 'Not yet', kind: 'quiet', onClick: () => ui.close() },
    ],
  });
}

let lastSleep = null;
function sleep() {
  // The dates the sleep crossed roll over now (rent and all), then it's morning.
  const note = syncSimDate();
  const res = A.wake(st);
  res.rentNote = note;
  lastSleep = res;
  changed();
  if (st.gameOver) { openGameOver(); return; }
  wakeAfterSleep(res);
}

// The morning after (also after the story's finale, if you keep the shop open).
function wakeAfterSleep(res) {
  refreshSeason();
  world.dayMode = null; world.night = null; world.crowd = null;
  crowd = makeCrowd(); pedestrians = null;
  clock.setSpan(shopDaySpan());
  clock.load({ state: 'stopped', elapsedMs: 0, day: st.day });
  if (res.rentNote) ui.toast(res.rentNote, 2600);
  const done = applyRenovation(world, st);
  syncShop();
  if (done) setTimeout(() => ui.toast(`The crew worked through the night. The shop: ${done.name}.`, 3200), res.rentNote ? 2700 : 0);
  // Phase 27: home comforts. The furniture takes the edge off, and a cozy place leaves you well rested.
  const comfort = comfortOf(homeLayout(world));
  if (comfort) st.stress = Math.max(0, st.stress - sleepStress(comfort));
  if (wellRested(comfort)) { st.bench.mins += 30; setTimeout(() => ui.toast('Well rested: an extra half hour at the bench tonight.', 2600), (res.rentNote ? 2700 : 0) + (done ? 3300 : 0)); }
  wakeUp();
  openMorning(false, res);
}

function openGameOver() {
  clock.stop();
  const t = st.gameOver?.type;
  if (t === 'raid') cue('siren');
  else if (t === 'audit') { cue('knock'); setTimeout(() => cue('audit'), 1100); }
  runEnding(g, () => { ui.close(); newGame(); }, () => {
    // v2.0: the story is over, but the shop can stay open.
    if (!Y.continueAfterFinale(st)) return;
    ui.close(); changed();
    wakeAfterSleep(lastSleep ?? { rentNote: null, jobs: [] });
  });
}

// ---------- menu, saves, settings ----------

// Phase 16: everything said (and every notice shown), newest at the bottom, by day.
function openLog(back) {
  const list = speech.history.slice(-80);
  const items = [];
  let day;
  for (const e of list) {
    if (e.day !== day) {
      day = e.day;
      items.push(el('li', { class: 'log-day' }, day === 0 ? 'The night before Day 1' : day ? `Day ${day}` : ''));
    }
    if (e.kind === 'note') { items.push(el('li', { class: 'note' }, el('div', { class: 'log-line' }, e.text))); continue; }
    const face = e.who ? portraitFor(e.who, { cls: '' }) : null;
    const name = e.kind === 'radio' ? `${e.name} · radio` : e.kind === 'text' ? `Text from ${e.name}` : e.name;
    items.push(el('li', { class: `${e.kind} ${e.who === 'you' ? 'you' : ''}` },
      el('span', { class: `log-face ${face ? '' : 'blank'}` }, face),
      el('div', { class: 'log-line' }, el('strong', {}, name || ''), e.text)));
  }
  ui.open({
    id: 'log', size: 'wide', eyebrow: 'Conversation log', title: 'What was said', reason: 'menu', back,
    body: items.length ? el('ul', { class: 'talk-log' }, items) : el('p', { class: 'note' }, 'Nothing yet. Whatever anyone says, and every notice, shows up here.'),
    actions: [{ label: 'Back', kind: 'quiet', onClick: back }],
  });
  requestAnimationFrame(() => { ui.sheet.scrollTop = ui.sheet.scrollHeight; });
}

function openMenu() {
  const night = isNight();
  ui.open({
    id: 'menu', eyebrow: `${CAL.formatDate(st.day)} · ${night ? 'Night' : clock.label}`, title: 'Paused', reason: 'menu',
    actions: [
      { id: 'resume', label: 'Resume', kind: 'primary', onClick: () => ui.close() },
      { id: 'talk-log', label: 'Conversation log', onClick: () => openLog(openMenu) },
      ...(REL.relationshipNames().length ? [{ id: 'people', label: 'People', onClick: () => openPeople(openMenu) }] : []),
      ...(FISH.hasRod(world) || FISH.kindsCaught(world) ? [{ id: 'fishing', label: 'Fishing', onClick: () => openTackleBox(g, tackleBoxHooks(), 'box', openMenu) }] : []),
      { id: 'save', label: 'Save game', onClick: () => openSlots('save') },
      { id: 'load', label: 'Load game', onClick: () => openSlots('load') },
      ...(world.room === 'city' ? [{ id: 'city-map', label: 'City map', onClick: () => openCityMap(g, cityLayout, player, openMenu) }] : []),
      ...(world.room === 'zone' && st.run ? [{ id: 'bag', label: 'Your bag', onClick: () => openBag(g, openMenu) }] : []),
      { id: 'ledger', label: 'The ledger', onClick: () => openStanding(g, openMenu) },
      { id: 'cases', label: 'Case files', onClick: () => openCaseFiles(ui, st, openMenu) },
      { id: 'settings', label: 'Settings', onClick: openSettings },
      ...(god.unlocked ? [{ id: 'god-menu', label: 'God mode', onClick: () => openGodMenu(openMenu) }] : []),
      ...(wt.active ? [{ id: 'skip-walkthrough', label: 'Skip the walkthrough', onClick: () => { ui.close(); wt.skip(); } }] : []),
      ...(world.room === 'zone' || wt.active ? [] : night ? [{ id: 'go-to-bed', label: 'Go to bed', onClick: () => { ui.close(); confirmSleep(); } }]
        : clock.state === 'running' ? [{ id: 'end-day', label: 'End the day early', onClick: () => { ui.close(); clock.endDay(); } }] : []),
      { id: 'to-title', label: 'Main menu', kind: 'quiet', onClick: () => { autosave(); quitToTitle(); } },
      { id: 'new', label: 'New game', kind: 'quiet', onClick: confirmNew },
    ],
  });
}

function confirmNew() {
  ui.open({
    id: 'confirm-new', eyebrow: 'New game', title: 'Start over?', reason: 'menu',
    body: el('p', {}, 'Unsaved progress in this run is lost. Your save slots stay as they are.'),
    actions: [
      { id: 'confirm-new-go', label: 'Start a new game', kind: 'danger', onClick: () => { ui.close(); newGame(); } },
      { label: 'Back', onClick: openMenu },
    ],
  });
}

// A save's date on its own calendar (the live calendar is put back afterwards).
function savedDate(sim) {
  const back = st;
  CAL.useSim(sim); const text = CAL.formatDate(sim.day, { year: !!sim.year }); if (back) CAL.useSim(back); else CAL.setCalendar();
  return text;
}

const slotName = slot => (slot === 'auto' ? 'Autosave' : `Slot ${slot}`);

function slotSummary(d) {
  const when = new Date(d.savedAt);
  const sim = d.sim;
  const evening = d.world?.tutorial && !d.world.tutorial.done;
  const where = sim ? `${sim.mode === 'endless' ? 'Endless · ' : ''}${evening ? 'The night before Day 1' : `${savedDate(sim)} · ${sim.phase === 'night' ? 'night' : sim.phase}`} · ${money(sim.cash)}` : 'Older test save';
  return `${where} · ${when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

// Every save there is: the autosave, then the numbered slots.
function allSaves() {
  const auto = slots.readAuto();
  return [
    ...(auto ? [{ slot: 'auto', data: auto.corrupt || auto.legacy ? null : auto, corrupt: !!auto.corrupt, legacy: !!auto.legacy }] : []),
    ...slots.list(),
  ];
}

// Saving picks a numbered slot; loading shows them all, with export, delete and import.
function openSlots(mode, fromTitle = false) {
  const back = fromTitle ? openTitle : openMenu;
  const rows = (mode === 'save' ? slots.list() : allSaves()).map(s => {
    const desc = s.corrupt ? 'This save can’t be read.' : s.legacy ? 'From an older version of the game, so it can’t be loaded. You can still export it.' : s.data ? slotSummary(s.data) : 'Empty';
    const id = String(s.slot);
    const buttons = mode === 'save'
      ? [el('button', { type: 'button', class: 'btn small primary', id: `slot-${id}`, onclick: () => doSave(s.slot) }, s.data || s.legacy ? 'Overwrite' : 'Save here')]
      : [el('button', { type: 'button', class: 'btn small primary', id: `slot-${id}`, disabled: !s.data, onclick: () => doLoad(s.slot) }, 'Load'),
         s.data || s.legacy ? el('button', { type: 'button', class: 'btn small', id: `export-${id}`, onclick: () => exportSave(s.slot) }, 'Export') : null,
         s.data || s.corrupt || s.legacy ? el('button', { type: 'button', class: 'btn small quiet', id: `delete-${id}`, onclick: () => confirmDelete(s.slot, mode, fromTitle) }, 'Delete') : null];
    return el('li', { class: `slot ${s.data || s.legacy ? '' : 'empty'}` },
      el('div', { class: 'slot-text' }, el('strong', {}, slotName(s.slot)), el('span', {}, desc)),
      el('div', { class: 'slot-buttons' }, buttons));
  });
  ui.open({
    id: 'slots', eyebrow: mode === 'save' ? 'Save' : 'Saves', title: mode === 'save' ? 'Choose a slot' : 'Your saves',
    reason: fromTitle ? 'title' : 'menu', dismissable: !fromTitle, back,
    body: [
      el('ul', { class: 'slots' }, rows),
      mode === 'save' && crowd?.list.length ? el('p', { class: 'note' }, 'Customers in the shop aren’t saved. New ones come in after you load.') : null,
      mode === 'load' ? el('p', { class: 'note' }, 'The autosave is written every morning and whenever you put the game away. Export a save to keep it as a file, or to move it to another device.') : null,
      storage.persistent ? null : el('p', { class: 'note warn' }, 'This browser is blocking storage, so saves last only until you close the page. Export anything you want to keep.'),
    ],
    actions: [
      ...(mode === 'load' ? [{ id: 'import-save', label: 'Import a save file', onClick: () => importSave(fromTitle) }] : []),
      { label: 'Back', kind: 'quiet', onClick: back },
    ],
  });
}

function confirmDelete(slot, mode, fromTitle) {
  ui.open({
    id: 'confirm-delete', eyebrow: slotName(slot), title: 'Delete this save?', reason: fromTitle ? 'title' : 'menu', dismissable: false,
    body: el('p', {}, 'It’s gone for good. Export it first if you might want it back.'),
    actions: [
      { id: 'confirm-delete-go', label: 'Delete it', kind: 'danger', onClick: () => { slots.erase(slot); ui.toast(`${slotName(slot)} deleted.`); openSlots(mode, fromTitle); } },
      { label: 'Back', kind: 'quiet', onClick: () => openSlots(mode, fromTitle) },
    ],
  });
}

function exportSave(slot) {
  const text = slots.exportText(slot);
  if (!text) return ui.toast('Nothing to export.');
  try {
    const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: `midnight-appraiser-${slot === 'auto' ? 'autosave' : `slot-${slot}`}.json` });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    ui.toast('Save exported.');
  } catch { ui.toast('This browser won’t download files from here.'); }
}

function importSave(fromTitle) {
  const pickFile = el('input', { type: 'file', accept: '.json,application/json', hidden: true });
  pickFile.addEventListener('change', async () => {
    const f = pickFile.files?.[0]; pickFile.remove();
    if (!f) return;
    const r = slots.importText(await f.text());
    if (r.error) ui.toast(r.error, 3000); else ui.toast(`Imported into slot ${r.slot}.`);
    openSlots('load', fromTitle);
  });
  document.body.append(pickFile); pickFile.click();
}

function doSave(slot) {
  const r = slots.write(slot, serialize());
  ui.close();
  ui.toast(r.persistent ? `Saved to slot ${slot}.` : `Saved to slot ${slot} for this session only.`);
}

// The autosave: every morning, and whenever the game goes into the background.
function autosave() {
  if (!st || st.gameOver || ui.current?.id === 'fight' || ui.current?.id?.startsWith('gameover')) return;
  try { slots.writeAuto(serialize()); } catch { /* storage full or blocked: the numbered slots still work */ }
}

function quitToTitle() {
  ui.close(); clock.stop();
  for (const c of [...(crowd?.list || [])]) crowd.dismiss(c);
  guide.hide(); speech.clear(); speech.load([]); ui.clearToasts(); staffFloor.reset();
  st = null; world = freshWorld(); crowd = null;
  openTitle();
}

function doLoad(slot) {
  const d = slots.read(slot);
  if (d?.legacy) { ui.toast('That save is from an older version of the game and can’t be loaded. You can export it from Manage saves.', 4200); return; }
  if (!d || d.corrupt) { ui.toast('That save can’t be read.'); return; }
  ui.close();
  const older = !d.sim;
  applyState(d);
  if (slot !== 'auto') slots.setLast(slot);
  if (older) {
    world = { ...freshWorld(), playTimeMs: world.playTimeMs };
    syncHome(); wakeUp();
    clock.load({ state: 'stopped', elapsedMs: 0, day: st.day });
    ui.toast('That save is from an older test build. Starting fresh with the original rules.', 3600);
    return openMorning(true);
  }
  if (wt.active) { ui.toast(`Loaded ${slotName(slot).toLowerCase()}. The night before Day 1.`); return; }
  ui.toast(`Loaded ${slotName(slot).toLowerCase()}. ${CAL.formatDate(st.day, { long: true })}.`);
  if (st.gameOver) return openGameOver();
  if (st.phase === 'morning') return openMorning();
  if (st.phase === 'night' && !world.night) return openNight();
  if ((st.phase === 'day' || st.phase === 'errands') && clock.state === 'ended') endDay('timeout');
}

// Phase 19: settings in tabs, so nothing's a long scroll away on a short screen. Each field
// goes under the tab its label belongs to.
const SETTINGS_TABS = [['screen', 'Screen'], ['sound', 'Sound'], ['dialog', 'Dialog'], ['controls', 'Controls'], ['about', 'About']];
const TAB_OF = { Temperature: 'screen', Screen: 'screen', Brightness: 'screen', 'View size': 'screen', 'Text size': 'screen', 'Joystick size': 'screen', Comfort: 'screen', Sound: 'sound', Dialog: 'dialog', Controls: 'controls', Walkthrough: 'about', About: 'about' };
let settingsTab = 'screen';
function openSettings(section = null) {
  if (typeof section === 'string' && SETTINGS_TABS.some(([id]) => id === section)) settingsTab = section;
  const inTab = fields => fields.filter(f => f && TAB_OF[f.querySelector?.('.label')?.textContent] === settingsTab);
  const seg = (name, options, value, onPick) => el('div', { class: `seg n${options.length}`, role: 'radiogroup', 'aria-label': name },
    options.map(([v, label]) => el('button', {
      type: 'button', role: 'radio', id: `set-${name}-${v}`, 'aria-checked': String(v === value), class: v === value ? 'on' : '',
      onclick: () => { onPick(v); commit(); openSettings(); },
    }, label)));
  const toggle = (id, label, value, onFlip, note) => el('label', { class: 'toggle', for: id },
    el('span', {}, label, note ? el('small', { class: 'block-note' }, note) : null),
    el('input', { type: 'checkbox', id, checked: value, onchange: e => { onFlip(e.target.checked); commit(); } }));
  const slider = (id, label, key) => {
    const out = el('output', { for: id }, `${Math.round(settings[key] * 100)}%`);
    return el('label', { class: 'range-row', for: id }, el('span', {}, label),
      el('input', { type: 'range', id, min: '0', max: '1', step: '0.05', value: String(settings[key]), disabled: !settings.sound,
        oninput: e => { settings[key] = +e.target.value; out.textContent = `${Math.round(settings[key] * 100)}%`; audio.apply(); },
        onchange: commit }), out);
  };
  const commit = () => { saveSettings(storage, settings); audio.apply(); };
  const back = st ? openMenu : openTitle;
  ui.open({
    id: 'settings', size: 'wide', eyebrow: 'Settings', title: SETTINGS_TABS.find(([id]) => id === settingsTab)[1], reason: st ? 'menu' : 'title',
    body: [
      el('div', { class: `seg n${SETTINGS_TABS.length} settings-tabs`, role: 'tablist', 'aria-label': 'Settings' }, SETTINGS_TABS.map(([id, label]) =>
        el('button', { type: 'button', role: 'tab', id: `stab-${id}`, class: id === settingsTab ? 'on' : '', 'aria-selected': String(id === settingsTab), onclick: () => { settingsTab = id; openSettings(); } }, label))),
      ...inTab([
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Screen'),
        seg('orient', [['landscape', 'Landscape'], ['portrait', 'Portrait'], ['auto', 'Auto']], settings.orientation, v => { settings.orientation = v; orientation.set(v); }),
        el('p', { class: 'note' }, settings.orientation === 'auto'
          ? 'The game fills the screen however you hold it. Good for foldables and tablets.'
          : 'If your phone is held the other way, the game turns sideways; rotate the phone to match. Nearly square screens, like a foldable opened up, never turn.'),
        canFullscreen() ? el('button', { type: 'button', class: 'btn small', id: 'set-fullscreen', onclick: () => { toggleFullscreen(); setTimeout(() => openSettings(), 300); } }, document.fullscreenElement ? 'Leave fullscreen' : 'Go fullscreen') : null),
      // v2.5b: brightness, for dim screens and bright rooms.
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Brightness'),
        (() => { const out = el('output', { for: 'set-brightness' }, `${Math.round(settings.brightness * 100)}%`);
          return el('label', { class: 'range-row', for: 'set-brightness' }, el('span', {}, 'Brightness'),
            el('input', { type: 'range', id: 'set-brightness', min: '0.8', max: '1.6', step: '0.05', value: String(settings.brightness),
              oninput: e => { settings.brightness = +e.target.value; out.textContent = `${Math.round(settings.brightness * 100)}%`; applyBrightness(); }, onchange: commit }), out); })(),
        el('p', { class: 'note' }, 'Too dark on your screen? Turn it up. It lightens the night too, a little.')),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'View size'),
        seg('view', [['close', 'Close'], ['normal', 'Normal'], ['wide', 'Wide']], settings.viewSize, v => { settings.viewSize = v; renderer.setView(v); camera.resize(renderer.w, renderer.h); if (st) snapCamera(); }),
        el('p', { class: 'note' }, 'How much of the world fits on screen. Bigger screens show more either way.')),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Text size'),
        seg('text', [['normal', 'Normal'], ['large', 'Large']], settings.textSize, v => { settings.textSize = v; document.documentElement.dataset.text = v; })),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Temperature'),
        seg('temp', [['c', 'Celsius'], ['f', 'Fahrenheit']], settings.tempUnit, v => { settings.tempUnit = v; wxShown = ''; }),
        el('p', { class: 'note' }, 'For the weather: Celsius and km/h, or Fahrenheit and mph.')),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Joystick size'),
        seg('stick', [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']], settings.joystickSize, v => { settings.joystickSize = v; input.setSize(CONFIG.joystick.sizes[v]); })),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Sound'),
        toggle('set-sound', 'Sound and music', settings.sound, v => { settings.sound = v; openSettings(); }),
        slider('set-vol-master', 'Volume', 'volMaster'),
        slider('set-vol-music', 'Music', 'volMusic'),
        slider('set-vol-sfx', 'Effects', 'volSfx'),
        toggle('set-captions', 'Sound captions', settings.captions, v => { settings.captions = v; }, 'Short captions for sounds that matter, like something breathing nearby.'),
        toggle('set-vibration', 'Vibration', settings.vibration, v => { settings.vibration = v; }, 'A buzz when something finds you, and on big moments.')),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Dialog'),
        seg('textspeed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']], settings.textSpeed, v => { settings.textSpeed = v; }),
        el('p', { class: 'note' }, 'How fast lines type out. Tap once to show the whole line, again to move on.'),
        toggle('set-autoadvance', 'Move on by itself', settings.autoAdvance, v => { settings.autoAdvance = v; }, 'Conversations continue at reading pace without a tap. The radio always does.')),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Comfort'),
        toggle('set-motion', 'Reduce motion', settings.reducedMotion, v => { settings.reducedMotion = v; document.documentElement.classList.toggle('reduce-motion', v); }),
        toggle('set-fps', 'Show frame rate', settings.showFps, v => { settings.showFps = v; })),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Walkthrough'),
        el('p', { class: 'note' }, 'Mina’s evening tour of the shop, the bench, the till and a first night out. It plays at the start of a new game.'),
        el('button', { type: 'button', class: 'btn small', id: 'replay-walkthrough', onclick: () => (st ? confirmNew() : (ui.close(), newGame(true))) }, 'Play it again (starts a new game)')),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Controls'),
        el('dl', { class: 'readout keys' },
          el('dt', {}, 'Touch'), el('dd', {}, 'Drag on the left to walk. Tap the round button to act. When someone’s talking, tap anywhere to continue.'),
          el('dt', {}, 'Keyboard'), el('dd', {}, 'WASD or arrows walk · E, Space or Enter acts and continues a conversation · L opens the conversation log · Esc for the menu. In a panel, arrows or Tab move between buttons.'),
          el('dt', {}, 'Controller'), el('dd', {}, `Stick or d-pad walks · A acts · B or a bumper sprints on a night run · Start for the menu · Y for your bag on a night run. In a panel, d-pad moves, A presses, B goes back.${input.padConnected ? ' (Connected.)' : ''}`))),
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'About'),
        el('div', { class: 'about-row' },
          // Tap the version five times for the hidden menu (Phase 18).
          el('button', { type: 'button', class: 'version-tag', id: 'set-version', onclick: e => versionTap(e) }, `Version ${CONFIG.version}`),
          el('button', { type: 'button', class: 'btn small', id: 'whats-new', onclick: () => openWhatsNew(CHANGELOG, openSettings) }, 'What’s new')),
        god.unlocked ? el('button', { type: 'button', class: 'btn small', id: 'god-open', onclick: () => openGodMenu(openSettings) }, 'God mode') : null,
        godAsk ? el('form', { class: 'god-ask', onsubmit: e => { e.preventDefault(); tryGod(e.target.querySelector('input').value); } },
          el('input', { type: 'password', id: 'god-pass', autocomplete: 'off', 'aria-label': 'Password', placeholder: 'Password' }),
          el('button', { type: 'submit', class: 'btn small primary', id: 'god-unlock' }, 'Unlock')) : null),
      ]),
    ],
    actions: [{ id: 'settings-done', label: 'Done', kind: 'primary', onClick: back }],
  });
}

// ---------- the hidden menu (Phase 18) ----------

let godAsk = false, taps = [];
function versionTap() {
  const now = performance.now();
  taps = taps.filter(t => now - t < 2500); taps.push(now);
  if (taps.length >= 5 && !god.unlocked && !godAsk) { godAsk = true; taps = []; openSettings('about'); requestAnimationFrame(() => document.getElementById('god-pass')?.focus()); }
}
function tryGod(word) {
  if (!checkPassword(word)) { ui.toast('That’s not it.'); return; }
  god.unlocked = true; godAsk = false; saveSettings(storage, settings);
  ui.toast('God mode unlocked. It’s in Settings and the pause menu.');
  openGodMenu(openSettings);
}

function openGodMenu(back) {
  const commit = () => saveSettings(storage, settings);
  const again = () => openGodMenu(back);
  const act = (id, label, fn, ok = true) => el('button', { type: 'button', class: 'btn small', id: `god-${id}`, disabled: !ok, onclick: () => { fn(); if (st) changed(); again(); } }, label);
  const inRun = !!st?.run, open = clock.state === 'running';
  const flags = GOD_FLAGS.map(([k, label, note]) => el('label', { class: 'toggle', for: `god-flag-${k}` },
    el('span', {}, label, el('small', { class: 'block-note' }, note)),
    el('input', { type: 'checkbox', id: `god-flag-${k}`, checked: !!god[k], onchange: e => { god[k] = e.target.checked; commit(); } })));
  const group = (name, ...btns) => el('div', { class: 'field' }, el('p', { class: 'label' }, name), el('div', { class: 'god-row' }, btns));
  ui.open({
    id: 'god', size: 'wide', eyebrow: 'God mode', title: 'Testing tools', reason: st ? 'menu' : 'title', back,
    body: [
      el('div', { class: 'field' }, el('p', { class: 'label' }, 'Switches'), flags),
      ...(st ? [
        group('Money and Heat',
          act('cash100', '+$100', () => { st.cash += 100; }), act('cash1k', '+$1,000', () => { st.cash += 1000; }), act('cash10k', '+$10,000', () => { st.cash += 10000; }),
          act('heat', 'Heat −10', () => { st.heat = Math.max(0, st.heat - 10); }), act('heat0', 'Heat to 0', () => { st.heat = 0; }),
          act('rent', 'Clear back rent', () => { st.rent.arrears = 0; }, !!st.rent?.arrears)),
        group('Supplies',
          act('mats', '+10 of every material', () => { for (const k of Object.keys(st.supplies)) st.supplies[k] += 10; }),
          act('kit', '+5 jars, +3 of each kit', () => { st.kit.jar += 5; for (const k of ['ward', 'tincture', 'cell']) st.kit[k] = (st.kit[k] || 0) + 3; }),
          act('finds', '+3 finds on the bench', () => { for (let i = 0; i < 3; i++) st.inventory.loot.push(S.Items.generate(st, { zoneId: world.lastZone || 'laundromat' })); }),
          act('reveal', 'Reveal every reading', () => { for (const it of st.inventory.loot) for (const t of S.Lab.tools(st)) { it.revealed[t.id] = [S.Lab.truth(S.anomalyOf(it), t.id)]; it.tests[t.id] = Math.max(1, it.tests[t.id] || 0); } }, st.inventory.loot.length > 0)),
        group('Lab and gear',
          act('bench', 'Refill bench time', () => { st.bench.mins = st.bench.max; }),
          act('maxgear', 'Max every upgrade', () => { for (const k of Object.keys(st.upgrades)) st.upgrades[k] = 3; st.bench.max = S.Lab.benchMax(st); st.bench.mins = st.bench.max; for (const k of Object.keys(st.cal || {})) st.cal[k] = 100; }),
          act('recal', 'Recalibrate everything', () => { for (const k of Object.keys(st.cal || {})) st.cal[k] = 100; })),
        group('You and the night',
          act('rested', 'Fully rested', () => { st.energy = st.maxEnergy; st.stress = 0; }),
          act('light', 'Fresh batteries', () => { st.battery = 100; }),
          act('stam', 'Catch your breath', () => { st.run.stamina = S.Crawl.maxStamina(st); st.run.tired = false; }, inRun)),
        group(`Weather: ${WEATHER[todayWeather()].name}${weatherOverride() ? ' (set by hand)' : ''}`,
          ...WEATHER_ORDER.map(t => act(`wx-${t}`, WEATHER[t].name, () => { setWeatherOverride(t); if (world.room === 'city') pedestrians = makePedestrians(); })),
          act('wx-auto', 'Back to the forecast', () => setWeatherOverride(null), !!weatherOverride())),
        el('p', { class: 'note' }, `Hand-made art: ${artCount()} picture${artCount() === 1 ? '' : 's'} in use${artProblems.length ? `, ${artProblems.length} couldn’t load (${artProblems.slice(0, 3).join('; ')})` : ''}.`),
        group('Fishing',
          act('rod', 'A carbon rod, and bait', () => { FISH.giveRod(world, 'carbon'); for (const b of FISH.BAIT_ORDER) FISH.fishingOf(world).bait[b] = (FISH.fishingOf(world).bait[b] ?? 0) + 10; }),
          act('beach', 'Go to the beach', () => { ui.close(); const r = AREAS.beach; placeAt(r.id, r.spawn.tx, r.spawn.ty, 'down'); }, !inRun)),
        group('Places',
          act('edge-test', 'Edge test: meadow, grove and pond', () => { ui.close(); const r = AREAS['test-meadow']; placeAt(r.id, r.spawn.tx, r.spawn.ty, 'down'); }, !inRun),
          act('edge-back', 'Back to the street', () => { ui.close(); const L = cityLayout.locs.apartment; placeAt('city', L.stand.tx, L.stand.ty, 'down'); }, inArea())),
        group('The shop and the day',
          act('reno', 'Finish every renovation', () => { const sh = shopState(world); sh.tier = 4; sh.booked = null; syncShop(); }),
          act('endday', 'End the day now', () => { ui.close(); clock.endDay(); }, open && !inRun),
          act('skipwt', 'Skip the walkthrough', () => { ui.close(); wt.skip(); }, wt.active)),
      ] : [el('p', { class: 'note' }, 'Start or load a game for the rest. The switches above work everywhere.')]),
      el('p', { class: 'note' }, 'For testing. The switches stay on until you turn them off; a “God mode” tag sits in the corner while any are on.'),
      el('button', { type: 'button', class: 'btn small quiet', id: 'god-lock', onclick: () => { god.unlocked = false; for (const [k] of GOD_FLAGS) god[k] = false; commit(); back(); } }, 'Lock and hide god mode'),
    ],
    actions: [{ label: 'Back', kind: 'quiet', onClick: back }],
  });
}

// ---------- what's new, and updates (Phase 18) ----------

function openWhatsNew(list, back) {
  ui.open({
    id: 'whats-new', size: 'wide', eyebrow: `Version ${CONFIG.version}`, title: 'What’s new', reason: st ? 'menu' : 'title', back, dismissable: !!back,
    body: list.map(c => el('section', { class: 'changes' },
      el('h3', {}, `${c.version} · ${c.title}`),
      el('ul', {}, c.items.map(t => el('li', {}, t))))),
    actions: [{ id: 'whats-new-ok', label: back ? 'Back' : 'Got it', kind: 'primary', onClick: back ?? (() => openTitle()) }],
  });
}

// Shown once, the first time the game opens on a new version (not on a first install).
function whatsNewOnce() {
  const seen = storage.get('tma.seenVersion');
  storage.set('tma.seenVersion', CONFIG.version);
  const news = seen && seen !== CONFIG.version ? changesSince(seen) : [];
  if (news.length) openWhatsNew(news, null);
  return news.length > 0;
}

// The banner: a new version is downloaded and waiting. It never shows mid-run or mid-fight;
// it waits for you to be somewhere safe. Updating saves, then reloads.
const banner = document.getElementById('update-banner');
let waitingWorker = null, bannerLater = false;
function offerUpdate(w) { waitingWorker = w; bannerLater = false; }
function syncBanner() {
  const safe = !(world.room === 'zone' && st?.run) && ui.current?.id !== 'fight';
  banner.hidden = !waitingWorker || bannerLater || !safe;
}
banner.querySelector('#update-now').addEventListener('click', () => {
  autosave();
  banner.querySelector('#update-now').disabled = true;
  banner.querySelector('.ub-text').textContent = 'Updating…';
  waitingWorker?.postMessage({ type: 'update' });
  setTimeout(() => location.reload(), 4000);   // in case the new version never takes over
});
banner.querySelector('#update-later').addEventListener('click', () => { bannerLater = true; syncBanner(); });
for (const b of banner.querySelectorAll('button')) b.addEventListener('pointerdown', e => e.stopPropagation());

// The main menu: the first thing you see. Continue, your saves, a new game, settings.
function openTitle() {
  const latest = slots.latest();
  const saves = allSaves().filter(x => x.data);
  const oldSaves = allSaves().filter(x => x.legacy).length;
  const row = x => el('li', { class: 'title-save' },
    el('button', { type: 'button', class: 'title-save-btn', id: `title-load-${x.slot}`, onclick: () => doLoad(x.slot) },
      el('strong', {}, slotName(x.slot)), el('span', {}, slotSummary(x.data))));
  ui.open({
    id: 'title', eyebrow: `Version ${CONFIG.version}`, title: CONFIG.title, reason: 'title', dismissable: false,
    body: [
      el('p', { class: 'title-tag' }, 'A pawnbroker who buys the uncanny by day and works out what it really is by night.'),
      saves.length
        ? el('div', { class: 'title-saves' }, el('p', { class: 'label' }, 'Your saves'), el('ul', {}, saves.slice(0, 4).map(row)))
        : el('p', { class: 'note' }, 'No saves yet. A new game starts with Mina showing you around the shop.'),
      oldSaves ? el('p', { class: 'note warn', id: 'old-saves-note' }, `${oldSaves === 1 ? 'You have a save' : `You have ${oldSaves} saves`} from an older version of the game. ${oldSaves === 1 ? 'It' : 'They'} can’t be loaded in this version, so a new game starts fresh. Open Manage saves to export ${oldSaves === 1 ? 'it' : 'them'} as a file.`) : null,
      storage.persistent ? null : el('p', { class: 'note warn' }, 'This browser is blocking storage. Saves last until you close the page.'),
    ],
    actions: [
      ...(latest ? [{ id: 'continue', label: `Continue · ${slotName(latest.slot)}`, kind: 'primary', onClick: () => doLoad(latest.slot) }] : []),
      { id: 'new-game', label: 'New game', kind: latest ? '' : 'primary', onClick: () => { ui.close(); newGame(true); } },
      ...(saves.length || oldSaves ? [{ id: 'title-load', label: 'Manage saves', onClick: () => openSlots('load', true) }] : [{ id: 'title-import', label: 'Import a save file', kind: 'quiet', onClick: () => importSave(true) }]),
      { id: 'title-settings', label: 'Settings', onClick: () => openSettings() },
      { id: 'title-cases', label: 'Case files', kind: 'quiet', onClick: () => openCaseFiles(ui, null, openTitle, 'title') },
      ...(installPrompt ? [{ id: 'install', label: 'Install the game', kind: 'quiet', onClick: installGame }] : []),
    ],
  });
}

// ---------- installing, fullscreen, offline ----------

let installPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (ui.current?.id === 'title') openTitle(); });
addEventListener('appinstalled', () => { installPrompt = null; ui.toast('Installed. It’s on your home screen.'); if (ui.current?.id === 'title') openTitle(); });
async function installGame() {
  const p = installPrompt; installPrompt = null;
  if (!p) return;
  try { await p.prompt(); await p.userChoice; } catch { /* dismissed */ }
  if (ui.current?.id === 'title') openTitle();
}

const standalone = () => !!globalThis.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches;
const canFullscreen = () => !!document.fullscreenEnabled && !standalone();
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  else document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => ui.toast('This browser won’t go fullscreen from here.'));
}

// The offline copy: only on the real site (it has a manifest), never inside a preview.
if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') && /^https?:$/.test(location.protocol)) {
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading && waitingWorker) { reloading = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); });
    });
    // Long sessions: look for a new version every half hour, and whenever the game comes back to the front.
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => { /* offline play just won't be available */ });
}

document.getElementById('menu-btn').addEventListener('click', () => { if (!ui.isOpen && st) openMenu(); });
document.getElementById('menu-btn').addEventListener('pointerdown', e => e.stopPropagation());
addEventListener('keydown', e => {
  if (arranger.on && !ui.isOpen && st) {
    if (e.code === 'Escape') { e.preventDefault(); arrangeBack(); }
    else if (e.code === 'KeyQ' && !e.repeat) { e.preventDefault(); openArrangeDecor(); }
    else if ((e.code === 'Delete' || e.code === 'Backspace') && !e.repeat) { e.preventDefault(); arrangeStore(); }
    return;
  }
  if (e.code === 'Escape' && !e.defaultPrevented && !ui.isOpen && st) { e.preventDefault(); openMenu(); }
  // Answers in a conversation: arrows (or W/S) to move, a number to pick straight away.
  if (speech.choosing && speech.visible && !ui.isOpen) {
    const n = /^(Digit|Numpad)([1-9])$/.exec(e.code);
    if (n) { e.preventDefault(); speech.choose(+n[2] - 1); return; }
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); speech.move(-1); return; }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); speech.move(1); return; }
  }
  if (e.code === 'KeyR' && !e.repeat && !ui.isOpen && st && world.room === 'city' && !e.target?.closest?.('input, textarea')) { e.preventDefault(); toggleRide(); }
  if (e.code === 'KeyL' && !e.repeat && !ui.isOpen && st && !e.target?.closest?.('input, textarea')) { e.preventDefault(); openLog(() => ui.close()); }
});

// ---------- platform ----------

pause.onChange(p => { if (p) input.release(); });
orientation.onChange((rot, changedRot, resized) => { if (changedRot || resized) input.release(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause.push('hidden'); autosave(); } else pause.clear('hidden');
});
addEventListener('pagehide', () => autosave());

// The screen's shape: 'wide' (a phone on its side), 'tall' (a phone held upright, or a
// foldable's cover screen in Auto), 'square' (a foldable opened up, most tablets).
let shapeWas = null;
function screenShape(w, h) { const r = w / Math.max(1, h); return r >= 1.3 ? 'wide' : r <= 1 / 1.3 ? 'tall' : 'square'; }
function onResize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const shape = screenShape(w, h);
  layer.classList.toggle('wide', w > h * 1.3 && h < 560);
  layer.dataset.shape = shape;
  layer.classList.toggle('big', Math.min(w, h) >= 600);
  renderer.resize(); camera.resize(renderer.w, renderer.h); if (st) snapCamera();
  // Folding or unfolding mid-game: stop the clock until you've got a grip on the new screen.
  if (shapeWas && shape !== shapeWas && st && !ui.isOpen) { input.release(); openMenu(); ui.toast('Screen changed. Paused.', 1800); }
  shapeWas = shape;
}

// ---------- gamepad ----------

// Pad buttons: in the world A acts, Start opens the menu, Y opens the bag on a night run.
// In a panel the d-pad or stick moves between buttons, A presses, B goes back.
function handlePad(ev) {
  audio.unlock();
  if (ui.isOpen) {
    if (ev === 'up') ui.focusStep(-1);
    else if (ev === 'down') ui.focusStep(1);
    else if (ev === 'left') { if (!ui.nudge(-1)) ui.focusStep(-1); }
    else if (ev === 'right') { if (!ui.nudge(1)) ui.focusStep(1); }
    else if (ev === 'a') ui.activate();
    else if (ev === 'b') ui.back();
    else if (ev === 'start' && ui.current?.id === 'menu') ui.close();
    return;
  }
  if (!st) return;
  if (arranger.on) {
    if (ev === 'a') input.press('pad');
    else if (ev === 'b' || ev === 'start') arrangeBack();
    else if (ev === 'x' || ev === 'y') openArrangeDecor();
    return;
  }
  if (speech.choosing && speech.visible && (ev === 'up' || ev === 'down')) { speech.move(ev === 'up' ? -1 : 1); return; }
  if (ev === 'a') input.press('pad');
  else if (ev === 'start' || ev === 'select') openMenu();
  else if (ev === 'y' && world.room === 'zone' && st.run) openBag(g, () => ui.close());
  else if (ev === 'y' && world.room === 'city') toggleRide();
}
addEventListener('gamepadconnected', e => { ui.toast(`Controller connected: ${(e.gamepad?.id || 'gamepad').split('(')[0].trim()}`, 2400); });
new ResizeObserver(onResize).observe(canvas);
// Where the HUD ends, so the radio box can sit just under it on a tall screen.
const hudEl = document.getElementById('hud');
const clockEl = hudEl.querySelector('.clock');
new ResizeObserver(() => {
  layer.style.setProperty('--hud-b', `${hudEl.offsetTop + hudEl.offsetHeight}px`);
  layer.style.setProperty('--clock-r', `${clockEl.offsetLeft + clockEl.offsetWidth}px`);
}).observe(hudEl);
onResize();

// Debug hooks for automated checks; harmless in play.
globalThis.__tma = {
  // Testing: run the game this many seconds as fast as it'll go (no drawing).
  simulate: (secs, every = null) => { const n = Math.round(secs / CONFIG.step); for (let i = 0; i < n; i++) { update(CONFIG.step); if (every && i % 60 === 0 && every() === false) break; } },
  zoneExit: () => host.zoneExit(), endDay: r => endDay(r), openNightPanel: () => openNight(),
  pause, clock, player, maps, input, ui, slots, serialize, renderer, orientation, settings, S, A,
  audio, talkTo, cityLayout, T, enterPlace: id => enterPlace(extraPlace(id) ?? WALK_INS[id]), leavePlace, spawnEvent: id => spawnEvent(id), setWeather: t => setWeatherOverride(t), get weather() { return todayWeather(); }, weatherFx, get eventEnt() { return eventEnt; }, toggleRide, get placeCrowd() { return placeCrowd; },
  get st() { return st; }, get crowd() { return crowd; }, get world() { return world; }, refreshSeason, parkToday, CAL, get fishing() { return fishing; }, beachToday,
  G, BN, yard: () => nightArea(), tollBell, get target() { return target; }, openGrave, NC, NS, MOON, startNightCity, startNightShop, nightState: () => nightState(), placeSight, nightSpots: () => nightSpots(), nightTarget: () => nightTarget(), nightInteract: e => nightInteract(e), inTheDark: () => inTheDark(), tackleHooks: () => tackleHooks(),
  get loop() { return loop; }, get cityLayout() { return cityLayout; }, placeAt, sleep, continuousBed, shopSignCard, endShopSession, openShopHoursPanel, collapseScene, syncSimDate, afterTakeJob: c => g.afterTakeJob(c), openDisplay: slot => openDisplay(g, slot), climateNow: () => climateNow(), groundNow: () => groundNow(), openWeatherPanel: () => openWeatherPanel(), openSettings: sec => openSettings(sec), weatherOn: d => weatherOn(st.seed ?? 0, d), sleepFx, rng: () => rng, openNight, cityLayout, CR, N, zone, enterZone, endRun, morningChoice,
  guide, speech, wt, finishPrologue, syncShop, shopMap, staffFloor, autosave, quitToTitle,
  interact: t => interact(t), openStanding: () => openStanding(g, () => ui.close()), openBag: () => openBag(g, () => ui.close()),
  board: tab => openRenovation(g, { tab }), chooseDay: w => chooseDay(w), openHomeDoor: () => openHomeDoor(), goHome: () => goHome(), syncHome: () => syncHome(), arranger, openMagic: w => openMagicAct(w ?? 'Outside the Brass Lantern'), get magician() { return magician; }, arrange: () => startArranging(), stopArranging: () => stopArranging(), arrangeAct: () => arrangeAct(), arrangeTo: (tx, ty) => { arranger.point(tx, ty); }, tileToScreen: (tx, ty) => ({ x: (tx * 16 + 8 - camera.ix) * renderer.scale / renderer.dpr, y: (ty * 16 + 8 - camera.iy) * renderer.scale / renderer.dpr }), get layout() { return world.shop?.layout; }, shopRoom: () => shopRoom(), syncLook, god, openGodMenu: () => openGodMenu(() => ui.close()), offerUpdate, whatsNewOnce,
  openCounter: () => { const f = crowd.front('sell'); return f && (f.visit === 'appraise' ? openAppraiser(g, f) : openSeller(g, f)); }, placeStatus, get pedestrians() { return pedestrians; }, openLocation: id => openLocation(g, id, null, { offSpot: name => { const p = offDayPlace(name); return p ? (extraPlace(p) ?? S.City.loc(p))?.name : null; }, talk: name => talkTo(name) }), openCityMap: () => openCityMap(g, cityLayout, player, () => ui.close()),
};

function start(data) {
  syncHome();
  const s = APARTMENT.wake;
  player.place(s.tx * CONFIG.tile, s.ty * CONFIG.tile - 4);
  loop.start();
  if (data?.state?.sim) { applyState(data.state); return; }
  openTitle();
  whatsNewOnce();
}

window.claude?.hot?.snapshot?.(() => (st ? { state: serialize() } : {}));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
