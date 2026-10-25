/* data/zones.js — night-run zones, their hazards and cryptids, map supplies and scavenging gear. */
'use strict';

Object.assign(DATA, {
  /* Scavenging zones. drain = flashlight % per step; cols × rows = map size.
     floor / wall pick the canvas art for lit tiles (js/ui/mapview.js).
     Each zone has its own hazards and one kind of cryptid. */
  zones: [
    { id:'laundromat', name:'Suds 24-Hr Laundromat', icon:'washer', sub:'Open all night. Nobody works there.', danger:1, energy:2, drain:2, cols:17, rows:21, layout:'aisles', floor:'checker',  wall:'machine',
      haul:[4,7], hazards:10, supplies:4, caches:4, cachePool:['salt','salt','scrap'], cryptids:2, affinity:['personal','photo'], odds:{ inert:60, enchanted:28, cursed:12 },
      hazardTypes:[
        { icon:'suds', sfx:'slip', name:'Suds slick',     stamina:2,  text:'You slip on suds that should have dried years ago.' },
        { icon:'spin', sfx:'spin', name:'Spinning drum',  stress:8,   text:'A dryer starts spinning as you pass. Something tumbles inside.' } ],
      pool:[['wraith', 3], ['sockling', 3], ['changer', 2]] },
    { id:'subway',     name:'Line 9 Subway',         icon:'train', sub:'Sealed since the 1978 flood. The lights still cycle.', danger:2, energy:3, drain:2, cols:23, rows:19, layout:'platforms',  floor:'subway',   wall:'tile',
      haul:[5,8], hazards:11, supplies:5, caches:4, cachePool:['scrap','salt','scrap'], cryptids:2, affinity:['coin','electronics'], odds:{ inert:45, enchanted:35, cursed:20 },
      hazardTypes:[
        { icon:'bolt', sfx:'zap', name:'Live rail',      stress:10, stamina:1, text:'The third rail arcs. It has not had power since 1978.' },
        { icon:'drop', sfx:'splash', name:'Flood water',    battery:8,  text:'Knee-deep water. Your flashlight shorts out for a second.' } ],
      pool:[['ratking', 3], ['conductor', 2], ['choir', 2]] },
    { id:'garage',     name:'Level B4 Garage',       icon:'car', sub:'The elevator only goes down.', danger:2, energy:3, drain:3, cols:21, rows:21, layout:'levels', floor:'concrete', wall:'pillar',
      haul:[5,8], hazards:14, supplies:5, caches:5, cachePool:['scrap','scrap','salt'], cryptids:3, affinity:['hardware','electronics'], odds:{ inert:40, enchanted:32, cursed:28 },
      hazardTypes:[
        { icon:'barrel', sfx:'slip', name:'Oil slick',      stamina:2,  text:'Black oil, still warm. You go down hard.' },
        { icon:'siren', sfx:'alarm', name:'Car alarm',      stress:12,  text:'Every car on the level wails at once, then stops.' } ],
      pool:[['hound', 3], ['valet', 2], ['exhaust', 2]] },
    { id:'hospital',   name:'St. Agnes Hospital',    icon:'hospital', sub:'Condemned. The fourth floor still has power.', danger:3, energy:4, drain:4, cols:19, rows:27, layout:'wards', floor:'linoleum', wall:'panel',
      haul:[6,9], hazards:13, supplies:5, caches:5, cachePool:['vials','vials','salt','scrap'], cryptids:3, affinity:['medical','personal'], odds:{ inert:30, enchanted:30, cursed:40 }, requires:{ flashlight:2 },
      hazardTypes:[
        { icon:'syringe', sfx:'needle', name:'Needle tray',    stamina:2, stress:4, text:'A tipped tray of needles. One goes through your sole.' },
        { icon:'megaphone', sfx:'pa', name:'PA system',      stress:14,  text:'The PA calls your full name to the fourth floor.' } ],
      pool:[['orderly', 3], ['visitor', 2], ['negative', 2]] },
    /* The fifth place: behind the other door in your own basement. Hidden until the story
       opens it (Story.doorOpen); Endless opens it at the Collector rank. */
    { id:'undercroft', name:'Beneath Old Market', icon:'keyhole', sub:'Behind the other door in your basement. Your parents’ chalk marks are still on the walls.', danger:4, energy:5, drain:3, cols:21, rows:21, layout:'undercroft', floor:'stone', wall:'brick', secret:true, valueMult:1.6,
      enter:'You open the other door and go down the stairs your parents cut into the dark. The chalk arrows start at the bottom step.',
      haul:[7,10], hazards:14, supplies:6, caches:6, cachePool:['essence','essence','salt','vials'], cryptids:4, affinity:['coin','personal'], odds:{ inert:15, enchanted:45, cursed:40 }, requires:{ flashlight:2 },
      hazardTypes:[
        { icon:'drop', sfx:'splash', name:'Black water',     stamina:2, battery:6, text:'Ankle-deep water, warm and far too still.' },
        { icon:'spiral', sfx:'pa', name:'Whispering wall', stress:16,           text:'The bricks say your name in your mother’s voice.' } ],
      pool:[['keeper', 1], ['coats', 1]] }
  ],
  /* Night-run tuning for the room-and-corridor maps (Phase 11d). Battery drains on every
     drainEvery-th step; minimum BFS distances from the door keep the first rooms calm. */
  runTuning: { stamina: 56, staminaPerBoots: 14, drainEvery: 2, minFloor: 0.3, lootMin: 8, hazardMin: 3, cryptidMin: 10 },
  supplies: [
    { icon:'battery', name:'Batteries',       battery:25, text:'A blister pack of batteries, still sealed.' },
    { icon:'can', name:'Energy drink',    stamina:6,  text:'Warm, flat and exactly what you needed.' },
    { icon:'thermos', name:'Thermos of tea',  stress:-15, text:'Someone left a thermos of chamomile. Still hot. You do not ask why.' },
    /* Material caches (placed by each zone's caches and cachePool, never as ordinary supplies). */
    { id:'salt',  icon:'salt',  name:'Spilled salt',   mat:{ salt:[2,3] },  text:'A torn sack of rock salt behind a door. Someone was keeping something out.' },
    { id:'scrap', icon:'gear',  name:'Scrap pile',     mat:{ scrap:[1,2] }, text:'Copper, glass and bolts. Good for repairs.' },
    { id:'vials', icon:'flask', name:'Lab glassware',  mat:{ vials:[2,3] }, text:'A rack of clean sample vials, still capped.' },
    { id:'essence', icon:'essence', name:'Bottled residue', mat:{ essence:[1,2] }, text:'A crate of old jars labeled in your father’s handwriting. Something still glows in them.' }
  ],
  /* Scavenging gear. Same costs as lab equipment (upgradeCost). */
  gear: {
    flashlight: { name:'Flashlight', perks:['Light radius 2', 'Uses 1% less per step · opens St. Agnes', 'Light radius 3'] },
    boots:      { name:'Work Boots', perks:['70 stamina per run', '84 stamina per run', '98 stamina per run'] },
    bag:        { name:'Duffel Bag', perks:['Carries 4 finds', 'Carries 5 finds', 'Carries 6 finds'] }
  }
});
