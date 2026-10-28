'use strict';

/* ===================================================================== standing
   Every change to faction standing goes through Rep.add. A gain also costs that
   faction's rival a third as much. Before the pledge no faction can pass 40; after
   it, only the faction you pledged to can, so only one can be maxed (45+). */
const Rep = {
  maxAt: 45,
  cap: (st, fac) => st.mode !== 'campaign' ? 50 : st.story.pledge === fac ? 50 : 40,
  maxed: (st, fac) => st.rep[fac] >= Rep.maxAt,
  rival: fac => DATA.rivals[fac] || null,
  /* rec, if given, collects the changes per faction (for the evening news). */
  add(st, fac, d, rec) {
    if (!d || !(fac in st.rep)) return 0;
    const shift = (f, by) => {
      const b = st.rep[f];
      st.rep[f] = clamp(Math.round(b + by), -50, Rep.cap(st, f));
      const got = st.rep[f] - b;
      if (rec && got) rec[f] = (rec[f] || 0) + got;
      return got;
    };
    const got = shift(fac, d);
    const rv = Rep.rival(fac), loss = d > 0 ? Math.round(d / 3) : 0;
    if (rv && loss) shift(rv, -loss);
    return got;
  }
};

/* ===================================================================== story
   Campaign only. state.story = {
     pledge: null | faction id | 'self', pledgeDue, name, pages:[], seen:[], inbox:[], hidden: null | 'brick' | 'lawyers' }
   Letters and pages land in the inbox and are read from the Counter. The shop's own
   name (story.name) is never shown as a number. */
const Story = {
  on: st => st.mode === 'campaign' && !!st.auditDay,
  campaignDays: st => st.auditDay - 1,
  pledgeDay: st => Story.on(st) ? Math.floor(Story.campaignDays(st) / 2) + 1 : null,
  nameTarget: st => Math.max(10, Math.round(Story.campaignDays(st) * DATA.config.nameRate)),
  nameRatio: st => Story.on(st) ? st.story.name / Story.nameTarget(st) : 0,
  nameLabel(st) {
    const r = Story.nameRatio(st);
    return r < DATA.config.nameShowAt ? null : DATA.nameLabels.find(([max]) => r < max)[1];
  },
  addName(st, n) { if (Story.on(st) && n) st.story.name = Math.max(0, st.story.name + n); },

  letter: id => DATA.letters.find(l => l.id === id),
  page: id => DATA.pages.find(p => p.id === id),
  queued: (st, kind, id) => st.story.inbox.some(x => x.kind === kind && x.id === id),

  send(st, id) {
    const s = st.story;
    if (s.seen.includes(id) || Story.queued(st, 'letter', id)) return false;
    const L = Story.letter(id);
    s.inbox.push({ kind: 'letter', id });
    if (L.page) Story.findPage(st, L.page, true);
    log(st, `A letter came: “${L.title}”, from ${L.from.split(' · ')[0]}.`, 'note');
    return true;
  },
  /* A page of your parents' ledger. quiet: it arrives inside a letter, so no separate card. */
  findPage(st, id, quiet = false) {
    const s = st.story;
    if (!Story.on(st) || s.pages.includes(id)) return false;
    s.pages.push(id);
    if (!quiet) s.inbox.push({ kind: 'page', id });
    log(st, `Found a page of your parents’ ledger (${s.pages.length} of ${DATA.pages.length}).`, 'loot');
    return true;
  },

  /* ----- the other door (Phase 11e) -----
     Opens for someone the neighborhood vouches for and nobody owns: in the campaign,
     page 4 and enough other pages, the shop's own name talked about, no faction maxed
     or pledged to, and the basement not hidden. In Endless it opens at a rank. */
  doorOpen(st) {
    const s = st.story;
    if (s.doorForced) return true;
    if (Endless.on(st)) return Endless.has(st, 'door');
    if (!Story.on(st) || s.hidden || (s.pledge && s.pledge !== 'self')) return false;
    if (Object.keys(st.rep).some(f => Rep.maxed(st, f))) return false;
    return s.pages.includes('p4') && s.pages.length >= DATA.config.doorPages && Story.nameRatio(st) >= DATA.config.doorName;
  },
  /* Logs the door opening (or shutting again) once per change. */
  doorCheck(st) {
    if (st.gameOver) return;
    const s = st.story, open = Story.doorOpen(st);
    if (open && s.door !== 'open') {
      log(st, s.doorDay ? DATA.door.reopen : DATA.door.open, 'loot');
      if (!s.doorDay) s.doorDay = st.day;
      s.door = 'open';
    } else if (!open && s.door === 'open') {
      log(st, DATA.door.shut, 'warn');
      s.door = 'shut';
    }
  },
  /* Walking into a named room behind the door. */
  onRoom(st, room) {
    if (room.name === DATA.door.campRoom && !st.story.camp) {
      st.story.camp = st.day;
      log(st, DATA.door.camp, 'loot');
      Story.addName(st, 2);
      return DATA.door.camp;
    }
    return null;
  },

  /* Called after every change (Game.rules). Pages that come from things you did. */
  check(st) {
    Story.doorCheck(st);
    if (!Story.on(st) || st.gameOver) return;
    const research = st.research.done.length + st.archive.catalogued.length + st.archive.restored.length;
    if ((st.counters.captives || 0) >= 1) Story.findPage(st, 'p2');
    if (research >= 1) Story.findPage(st, 'p3');
    if ((st.counters.runs || 0) >= DATA.config.pageRuns) Story.findPage(st, 'p6');
  },

  /* Called at the start of every morning: letters, the back-room page, the pledge. */
  morning(st) {
    if (!Story.on(st)) return;
    const days = Story.campaignDays(st), left = Calendar.daysLeft(st), r = Story.nameRatio(st);
    if (st.day >= 2) Story.findPage(st, 'p1');
    for (const L of DATA.letters) {
      if (L.fac && st.rep[L.fac] >= L.rep && (!L.pledged || st.story.pledge === L.fac)) Story.send(st, L.id);
      if (L.at && st.day - 1 >= Math.round(days * L.at)) Story.send(st, L.id);
      if (L.left && left <= L.left) Story.send(st, L.id);
      if (L.name && r >= L.name) Story.send(st, L.id);
    }
    if (!st.story.pledge && st.day >= Story.pledgeDay(st)) st.story.pledgeDue = true;
    // the door hints at itself once the librarian's page is found
    if (st.story.pages.includes('p4') && !Story.doorOpen(st) && rnd() < 0.35) st.morningLine = pick(rnd, DATA.door.hints);
  },

  /* The librarian holds page 4 until the neighborhood is talking about you. */
  library(st) {
    if (Story.nameRatio(st) >= DATA.config.libraryPageAt) return Story.findPage(st, 'p4');
    return false;
  },

  read(st) {
    const s = st.story, x = s.inbox.shift();
    if (x && x.kind === 'letter') s.seen.push(x.id);
    return x;
  },

  pledge(st, fac) {
    const s = st.story;
    if (!Story.on(st) || s.pledge || !s.pledgeDue) return false;
    if (fac !== 'self' && !(fac in st.rep)) return false;
    s.pledge = fac; s.pledgeDue = false; s.pledgeDayTaken = st.day;
    if (fac === 'self') {
      Story.addName(st, DATA.config.selfPledgeName);
      log(st, DATA.pledge.selfDone, 'note');
      return true;
    }
    const f = byId(DATA.factions, fac), rv = Rep.rival(fac);
    Rep.add(st, fac, DATA.config.pledgeRep);
    if (rv) st.rep[rv] = clamp(st.rep[rv] - DATA.config.pledgeRivalHit, -50, Rep.cap(st, rv));
    log(st, `Signed with ${midName(f.name)}.${rv ? ` ${byId(DATA.factions, rv).name} will not forget it.` : ''}`, 'warn');
    return true;
  }
};
