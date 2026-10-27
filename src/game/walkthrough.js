// The walkthrough: the evening before your first day. Mina, who ran your parents'
// counter, shows you the shop by doing it with you: walk, buy from a seller, test and
// tag it at the bench, put it in a case, sell it at the till, then a first night run
// with her on the radio. Then she tells you she's going back to college, and leaves.
//
// No panels of its own: she talks in the speech strip, a marker shows where to go, and
// each step waits for you to actually do the thing (checked against the real sim, the
// way the original's tutorial steps did). It runs on the real game, so what you buy,
// tag and sell that evening carries into Day 1, and it doesn't use up a calendar day.
//
// After she leaves she still sends the odd text the first time something new happens.

import { S } from '../rules/index.js';

export const STEP_ORDER = ['arrive', 'look', 'seller', 'downstairs', 'tests', 'tag', 'display', 'buyer', 'news', 'outside', 'run', 'home'];

export const freshTutorial = on => (on ? { done: false, step: STEP_ORDER[0], base: null, flags: {}, t: 0 } : { done: true, step: null, skipped: true });

const counts = (st, world) => ({
  bought: st.counters.bought || 0, appraised: st.counters.appraised || 0, sold: st.counters.sold || 0,
  displays: Object.keys(world.displays || {}).length,
});

// Where the counters stood when the tour began (a new game: all zero). Steps that wait for
// "you did the thing" compare against this, not against the moment the step started, so
// doing a later step early (testing and tagging everything before Mina asks) still counts.
const ORIGIN = { bought: 0, appraised: 0, sold: 0, displays: 0 };
const org = w => w.origin ?? ORIGIN;

// A line of yours in the middle of Mina's (Phase 16: your portrait, on the right).
const you = text => ({ who: 'you', text });

const T = 16;
const mark = (room, tx, ty) => ({ room, x: tx * T + 8, y: ty * T + 8 });

// Where Mina walks to when she heads for another room (a floor tile next to the way out).
// Phase 27: the shop's back door goes straight down to the basement; home is across the street.
const EXITS = { shop: { any: [13, 2] }, lab: { any: [17, 2] }, apartment: { any: [10, 10] } };

// Where the next door is, from wherever you are, on the way to a room.
function wayTo(h, target, there) {
  const r = h.room();
  if (r === target) return there;
  if (r === 'shop') return mark('shop', 13, 1);                         // the back door
  if (r === 'lab') return mark('lab', 17, 1);                           // stairs up
  if (r === 'apartment') return mark('apartment', 10, 11);              // the front door
  return null;
}

function guideTo(h, room, tx, ty, facing = 'down') {
  const g = h.guide;
  if (g.visible && g.room === room) { g.walkTo(h.map(room), tx, ty, () => { g.facing = facing; }); return; }
  if (!g.visible || g.room !== h.room()) { g.place(room, tx, ty, facing); return; }
  const ex = EXITS[g.room]?.[room] ?? EXITS[g.room]?.any;
  if (!ex) { g.place(room, tx, ty, facing); return; }
  g.walkTo(h.map(g.room), ex[0], ex[1], () => g.place(room, tx, ty, facing));
}

const nearGuide = (h, r = 28) => {
  const g = h.guide, p = h.player.center;
  return g.visible && g.room === h.room() && Math.hypot(g.x + 8 - p.x, g.y + 10 - p.y) <= r;
};
const nearTile = (h, room, tx, ty, r = 26) => {
  const p = h.player.center;
  return h.room() === room && Math.hypot(tx * T + 8 - p.x, ty * T + 8 - p.y) <= r;
};
const benchItem = (st, min) => st.inventory.loot.find(x => !x.job && S.Lab.testsRun(x) >= min);
const firstEmptyCase = h => {
  const used = h.world.displays || {};
  const row = h.shopRoom().rows.findIndex((r, ty) => [...r].some((c, tx) => c === 'V' && !used[`${tx},${ty}`]));
  if (row < 0) return null;
  const tx = [...h.shopRoom().rows[row]].findIndex((c, x) => c === 'V' && !used[`${x},${row}`]);
  return [tx, row];
};
const alive = (h, kind) => h.crowd.list.some(c => c.kind === kind && c.state !== 'leaving');

const STEPS = {
  arrive: {
    enter(h) {
      h.guide.place('shop', 13, 6, 'down');
      h.say(['There you are. I wasn’t sure you’d come.', you('Mina?'), 'Come over here. Watch the floor, half these boards are rotten.']);
      h.hint(h.input === 'touch' ? 'Drag anywhere on the left of the screen to walk.' : h.input === 'pad' ? 'Walk with the left stick or the d-pad.' : 'Walk with WASD or the arrow keys.');
    },
    tick: h => nearGuide(h),
    marker: h => ({ entity: h.guide }),
    nudge: ['Over here. By the counter.'],
  },

  look: {
    enter(h) {
      h.say([
        'I’m Mina. I ran the counter for your folks. Three years.',
        ...(h.background?.()?.mina ? [h.background().mina] : []),
        you('They talked about you. A lot.'),
        'It got bad this last year. Then they were gone, and I kept it locked up.',
        'Most of the floor’s boarded off. Two cases still lock. One bulb works.',
        you('Where do I even start?'),
        'Money fixes it. The contractor left an estimate by the back door. Go look.',
      ]);
      h.hint(h.input === 'touch' ? 'When the round button lights up, tap it to use what’s in front of you.' : h.input === 'pad' ? 'Press A to use what’s in front of you.' : 'Press E or Space to use what’s in front of you.');
    },
    tick: (h, w) => !!w.flags.estimate && !h.panelOpen(),
    on: { renovate: (h, w) => { w.flags.estimate = true; h.hint(null); } },
    marker: () => mark('shop', 15, 1),
    nudge: ['The clipboard by the back door. Walk up to it.'],
  },

  seller: {
    enter(h, w, wt, resumed) {
      if (resumed) w.flags.spawned = false;
      if (!resumed) {
        h.say([
          wt.prev.booked ? 'Booked it already? Your mom would’ve haggled them down. Anyway.' : 'Rent’s every week, though. Fix it when you can.',
          'Someone at the door. One of the regulars.',
          'Sellers wait at the counter. Get behind it and serve him.',
          'Rule one: never pay what they ask. Start low, come up slow.',
        ]);
      }
      guideTo(h, 'shop', 12, 2, 'down');
    },
    tick(h, w) {
      if (!w.flags.spawned && w.t > 4) { w.flags.spawned = true; h.spawn('sell'); }
      if ((h.st.counters.bought || 0) > w.base.bought) return true;
      if (w.flags.spawned && !alive(h, 'seller')) { w.flags.missed = true; return true; }
      return false;
    },
    marker: h => mark('shop', h.shopRoom().counter.tx, h.shopRoom().counter.ty),
    nudge: ['Behind the counter. He won’t wait all night.'],
  },

  downstairs: {
    enter(h, w, wt, resumed) {
      if (!resumed) h.say([
        wt.prev.missed ? 'Happens. Some of them won’t budge. Your folks left three boxes downstairs anyway.' : 'Not bad. Everything you buy goes straight to the basement.',
        'Come on. Back door, then the stairs. That’s where the real work is.',
      ]);
      guideTo(h, 'lab', 5, 4, 'left');
    },
    tick: h => nearTile(h, 'lab', 3, 3, 30) || nearTile(h, 'lab', 4, 3, 30),
    marker: h => wayTo(h, 'lab', mark('lab', 3, 3)),
    nudge: ['Basement. The door at the back of the shop goes straight down.'],
  },

  tests: {
    enter(h, w, wt, resumed) {
      if (!resumed && !benchItem(h.st, 2) && (h.st.counters.appraised || 0) <= org(w).appraised) h.say([
        'The bench. Your mom taught me this part.',
        you('What am I looking for?'),
        'What it really is. Put a piece under the lamp and test it. Every test crosses off what it can’t be.',
        'The bench tells you which test to run. Do two.',
        'Tests cost bench time, the hours at the top. You only get so many a night.',
      ]);
      guideTo(h, 'lab', 5, 4, 'left');
    },
    tick: (h, w) => !!benchItem(h.st, 2) || (h.st.counters.appraised || 0) > org(w).appraised,
    marker: () => mark('lab', 3, 3),
    nudge: ['Use the bench. Pick a piece and run the test it suggests. Two tests.'],
  },

  tag: {
    enter(h, w, wt, resumed) {
      if (!resumed && (h.st.counters.appraised || 0) <= org(w).appraised) h.say([
        'Now make the call. Inert is safe. Enchanted is money. Cursed is trouble.',
        'When everything left is one kind, that’s your tag. If it’s still mixed, test again or take the gamble.',
      ]);
    },
    tick: (h, w) => (h.st.counters.appraised || 0) > org(w).appraised,
    marker: () => mark('lab', 3, 3),
    nudge: ['Pick what the evidence says, check the price, then tag and shelve it.'],
  },

  display: {
    enter(h, w, wt, resumed) {
      if (!resumed) h.say([
        'Tagged means it can go out front. Customers only ever see the tag, never what it really is.',
        'Upstairs. Put it in one of the cases.',
      ]);
      guideTo(h, 'shop', 11, 7, 'left');
    },
    tick: (h, w) => Object.keys(h.world.displays || {}).length > org(w).displays,
    marker(h) { const c = firstEmptyCase(h); return wayTo(h, 'shop', c ? mark('shop', c[0], c[1]) : null); },
    nudge: ['Walk up to a case and put your tagged piece in it.'],
  },

  buyer: {
    enter(h, w, wt, resumed) {
      if (resumed) { w.flags.spawned = false; w.flags.wait = 0; }
      if (!resumed) h.say([
        'Look at that. Somebody at the window. Must’ve seen the light on.',
        'Buyers look at the cases, then line up at the till. Stand behind the till and they pay.',
      ]);
      guideTo(h, 'shop', 13, 2, 'down');
    },
    tick(h, w) {
      if ((h.st.counters.sold || 0) > w.base.sold) return true;
      if (!w.flags.spawned && w.t > 3.5) { w.flags.spawned = true; h.spawn('buy', { civilian: (w.flags.tries || 0) === 0 }); }
      if (w.flags.spawned && !alive(h, 'buyer')) {
        w.flags.tries = (w.flags.tries || 0) + 1;
        if (w.flags.tries >= 2) { w.flags.missed = true; return true; }
        w.flags.spawned = false; w.t = 0;
        h.say(['They read the tag, not the thing. Too pricey, or cursed, and people walk.', 'Here’s another one.']);
      }
      return false;
    },
    marker: h => mark('shop', 16, 4),
    nudge: ['Stand behind the till, the one on the right.'],
  },

  news: {
    enter(h, w, wt, resumed) {
      if (resumed) return;
      const st = h.st, sales = st.shop?.sales || [];
      let verdict = 'No sale tonight. Doesn’t matter. Every sale gets checked against the truth later, remember that.';
      if (sales.length) {
        const heat0 = st.heat;
        S.Shop.resolveDay(st);
        const bad = sales.some(s => s.result === 'incident' || s.result === 'refund');
        verdict = bad
          ? `That one’s going to come back on you. Sold as something it isn’t. ${st.heat > heat0 ? 'That’s Heat. The Office reads the papers too.' : ''}`.trim()
          : 'Clean sale. Every sale gets checked against the truth later. Sell a curse as harmless and it ends up in the paper, with the shop’s name on it.';
        st.shop.sales = []; st.shop.bought = [];
      }
      h.say([
        verdict,
        'Mornings, you choose: open the shop, or go out into the city for errands. Never both.',
        'Nights, you work the bench. Or you do what your folks really did.',
      ]);
    },
    tick: h => !h.speechBusy(),
  },

  outside: {
    enter(h, w, wt, resumed) {
      if (!resumed) h.say([
        'They went out at night. Laundromats after closing, the subway. Places where things turn up.',
        you('Things?'),
        'You’ll see. I never went with them. Not once.',
        'Take their old radio. I’ll be on the other end. The laundromat on Fifth is the easy one. Front door.',
      ]);
      guideTo(h, 'shop', 13, 9, 'down');
    },
    tick: (h, w) => !!w.flags.out,
    on: { frontdoor: (h, w) => { if (h.startRun()) w.flags.out = true; } },
    marker: () => mark('shop', 11, 13),
    nudge: ['Front door. I’ll be on the radio.'],
  },

  run: {
    enter(h, w, wt, resumed) {
      h.guide.hide();
      h.say(resumed ? ['Still there? Good. Keep your light up.'] : [
        'Radio check. Can you hear me? Good.',
        'Watch the clock. When the night runs out, you drop some of what you’re carrying.',
        'Keep your light up, too. When it gets low, things out there get bolder.',
        'Walk over anything that glints to bag it. The bag only holds so much.',
        'Need to move fast? Run. It winds you, so save it for when something’s coming.',
      ], { kind: 'radio' });
    },
    tick(h, w) {
      if (!w.flags.toldExit && (w.t > 75 || (w.flags.finds || 0) >= 2)) {
        w.flags.toldExit = true;
        h.say([
          'When you’ve had enough, head back to where you came in. Leave by the exit and you keep everything.',
          'If the night runs out first, you drop some of it. Get knocked down and you lose more.',
        ], { kind: 'radio', replace: false });
      }
      return !!w.flags.over;
    },
    on: {
      find(h, w) { w.flags.finds = (w.flags.finds || 0) + 1; if (w.flags.finds === 1) h.say(['That’s how your folks filled the basement.'], { kind: 'radio', replace: false }); },
      near(h, w) { if (!w.flags.near) { w.flags.near = true; h.say(['Something’s moving out there. If it touches you, you’ll have to fight it.', 'Or keep your distance. Your call.'], { kind: 'radio' }); } },
      fight(h, w) { if (!w.flags.fought) { w.flags.fought = true; h.say(['Breathe. You can hit it, scare it off with the light, or run.'], { kind: 'radio' }); } },
      fightEnd(h, w) { if (!w.flags.fightOver) { w.flags.fightOver = true; h.say(['You okay? You sound okay.'], { kind: 'radio', replace: false }); } },
      runEnd(h, w, wt, how) { w.flags.over = true; w.flags.how = how; },
    },
    marker(h, w) { return w.flags.toldExit ? h.zoneExit() : null; },
  },

  home: {
    enter(h, w, wt, resumed) {
      h.guide.place('apartment', 12, 8, 'left');
      if (resumed && w.flags.left) { h.guide.hide(); return; }
      const how = wt.prev.how;
      h.say([
        how === 'knockout' ? 'You’re back. You’re shaking. Sit down a second.' : 'You came back. Good. I was about to call somebody, and I don’t even know who.',
        'Listen. I owe your folks a lot. But I’m not built for this.',
        'I got back into school. I’m going back to college. Classes start Monday.',
        you('You’re leaving?'),
        'Rent comes every week. Keep your Heat down. And fix this place up. It deserves it.',
        you('I’ll keep the lights on.'),
        'My number’s taped to the till. Keys are on the hook. Good luck.',
        'And sleep here, okay? Not on a cot in the back of a pawn shop. Your folks kept this place for a reason. The bed’s in the bedroom.',
      ]);
    },
    tick(h, w) {
      if (!h.speechBusy() && !w.flags.leaving) {
        w.flags.leaving = true;
        h.guide.walkTo(h.map('apartment'), 10, 10, () => { h.guide.hide(); w.flags.left = true; h.cue('door'); });
      }
      return !!w.flags.slept;
    },
    on: { cot: (h, w) => { w.flags.slept = true; } },
    marker(h, w) { return w.flags.leaving ? mark('apartment', 1, 3) : { entity: h.guide }; },
  },
};

export class Walkthrough {
  constructor(host) { this.h = host; this.idle = 0; this.prev = {}; }

  get w() { return this.h.world.tutorial; }
  get active() { return !!this.w && !this.w.done; }
  get stepId() { return this.active ? this.w.step : null; }
  get index() { return this.active ? STEP_ORDER.indexOf(this.w.step) : -1; }

  // What the prologue lets you do early: the stairs, the front door, the cot.
  allows(what) {
    const i = this.index;
    if (i < 0) return false;
    if (what === 'lab') return i >= STEP_ORDER.indexOf('downstairs') && i <= STEP_ORDER.indexOf('display');
    if (what === 'frontdoor') return this.w.step === 'outside';
    if (what === 'cot') return this.w.step === 'home';
    return false;
  }

  start() { this.h.world.tutorial = freshTutorial(true); this.#enter(false); }
  resume() { if (this.active) this.#enter(true); }

  #enter(resumed) {
    const w = this.w;
    if (!resumed) { w.base = counts(this.h.st, this.h.world); w.flags = w.flags || {}; w.t = 0; }
    w.base = w.base || counts(this.h.st, this.h.world);
    w.flags = w.flags || {};
    this.idle = 0;
    STEPS[w.step].enter(this.h, w, this, resumed);
  }

  advance() {
    const w = this.w, i = STEP_ORDER.indexOf(w.step);
    this.prev = { ...w.flags };
    if (i + 1 >= STEP_ORDER.length) { this.h.finish({ skipped: false }); return; }
    w.step = STEP_ORDER[i + 1]; w.flags = {};
    this.#enter(false);
  }

  event(name, data) {
    if (!this.active) return;
    const s = STEPS[this.w.step];
    s.on?.[name]?.(this.h, this.w, this, data);
    // Remember a booking made during the tour, for Mina's next line.
    if (name === 'booked') this.w.flags.booked = true;
  }

  update(dt) {
    if (!this.active) return;
    const w = this.w, s = STEPS[w.step];
    w.t += dt;
    this.idle = this.h.speechBusy() || this.h.panelOpen() ? 0 : this.idle + dt;
    if (s.tick(this.h, w, this, dt)) { this.advance(); return; }
    if (s.nudge && this.idle > (s.nudgeAfter ?? 40)) { this.idle = 0; this.h.say(s.nudge); }
  }

  marker() { return this.active ? STEPS[this.w.step].marker?.(this.h, this.w) ?? null : null; }

  // Walking up to Mina and pressing act: she says what to do again.
  talk() {
    if (!this.active) return;
    const s = STEPS[this.w.step];
    this.idle = 0;
    this.h.say(s.nudge ?? ['Go on. I’m right here.']);
  }
  skip() { if (this.active) this.h.finish({ skipped: true }); }
}

// ---------- after she's gone: the odd text, once each ----------

export const TEXTS = {
  city: 'City days: every stop costs hours, and shops close. Be home before dark.',
  appraise: 'Appraisal jobs: test it tonight and file a report. They pick it up at bedtime. Get it right, get paid.',
  inspector: 'That’s Vance, from the Office. He takes anything cursed out of the back case. Jars help. A clean case helps more.',
  counter: 'Counter-offers wait at the till. You’re allowed to say no.',
  estimate: 'Rode past the shop on the bus. Still boarded up? The estimate’s by the back door.',
  rent: 'Rent’s due tomorrow. The landlord doesn’t take IOUs. Trust me.',
  zones: 'First night out on your own? Keep your light up and know where the exit is.',
  staff: 'Bigger counter, bigger days. You could use a clerk at the till. Put a Help Wanted sign on the board.',
  stockhand: 'All those cases won’t fill themselves. A stock hand would. The board by the back door.',
  hours: 'Everybody in this town keeps their own hours. The map says who’s open, and the morning paper says who isn’t opening at all.',
  ads: 'Slow days? Flyers are cheap, and so is a coat of paint on the sign. Board by the back door, under Customers.',
  bar: 'The Gathering Hub! Mom and Dad’s coffee place. Everybody ends up there. Say hi to Lou, and to whoever’s in.',
  regular: 'Somebody at the bus stop asked me if you’re open tomorrow. That’s a regular. Keep it honest and they keep coming.',
  // v2.4
  nightCity: 'Out after dark? Stay under the streetlights. The Hub’s open till two, the Owl all night. And be home by four, or somebody will have to walk you.',
  nightShop: 'Your parents opened late sometimes, too. Different crowd. They paid well and your dad hated it. Careful who you sell to.',
};

// Send a text the first time, and only the first time. Returns true if it was sent.
export function textOnce(world, speech, id, cue) {
  if (!TEXTS[id] || world.notes?.[id] || (world.tutorial && !world.tutorial.done)) return false;
  world.notes = { ...(world.notes || {}), [id]: true };
  speech.say([TEXTS[id]], { who: 'Mina', kind: 'text', replace: false });
  cue?.('tap');
  return true;
}

