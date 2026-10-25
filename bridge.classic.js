/* Bridge (classic script, loaded last). The original game's rules share one global
   scope through top-level const declarations, which ES modules can't import. This
   gathers them onto window.SSP and supplies the few UI hooks the rules call. */
'use strict';
/* eslint-disable no-var */
if (typeof toast === 'undefined') var toast = function () {};
/* The original's settings object, as far as the rules and the sound engine read it.
   The new game writes its own sound settings into Settings.v (src/game/audio.js). */
if (typeof Settings === 'undefined') var Settings = { v: { tutorial: false, sound: true, volMaster: 0.8, volMusic: 0.6, volSfx: 0.8, captions: false }, buzz() {} };
/* From the original js/actions.js (not loaded): big sales get the big-sale stinger. City.act calls it. */
if (typeof saleSfx === 'undefined') var saleSfx = function (amount) { return amount >= DATA.config.bigSale ? 'bigsale' : 'sale'; };
if (typeof Tutorial === 'undefined') var Tutorial = { start() {}, advance() {} };
if (typeof Tips === 'undefined') var Tips = { pick() {} };
/* From the original js/settings.js (not loaded): whether a per-save assist is on. */
if (typeof assistOn === 'undefined') var assistOn = function (st, key) { return !!(st && st.assist && st.assist[key]); };
window.SSP_ICONS = ICONS_PIXEL;
window.SSP = {
  DATA, Items, Lab, Shop, Game, RNG, Rep, Story, Endless, Bests, Recap, Calendar, Audit, Cases,
  MapGen, Crawl, Combat, Containment, City, Ride, Sound, Settings, saleSfx,
  log, money, rnd, byId, baseOf, prefixOf, anomalyOf, toolOf, zoneOf, repLabel, midName, roundPrice, dur, cap, pick, clamp, fill, hash32, mulberry32, orList, an,
};
