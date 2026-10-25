'use strict';

/* ===================================================================== calendar
   The day machine. Each day runs:
     morning  → choose: open the shop, or take an errand day
     day      → shop open, customers come in (Shop.tick)
     errands  → shop closed, action points to spend in the city (Phase 6)
     night    → scavenging; sleeping ends the day
   Rent comes due at the end of a due day. It is never a game over: what you
   can't pay becomes arrears plus a late fee, adds Heat, and the landlord's
   notice drives off customers until it is cleared. In the campaign, the audit
   happens the morning after the last day. */
const Calendar = {
  diff: st => DATA.difficulty[st.difficulty],
  daysLeft: st => st.auditDay ? st.auditDay - st.day : null,
  isAuditDay: st => !!st.auditDay && st.day >= st.auditDay,
  owed: st => st.rent.amount + st.rent.arrears,

  openShop(st) {
    if (st.phase !== 'morning' || st.story.pledgeDue) return false;
    st.phase = 'day';
    log(st, 'Flipped the sign to OPEN.', 'note');
    return true;
  },
  takeErrandDay(st) {
    if (st.phase !== 'morning' || st.story.pledgeDue) return false;
    st.phase = 'errands';
    st.ap.max = City.maxHours(st);
    st.ap.left = st.ap.max;
    st.city.at = 'shop';
    st.ui.tab = 'city';
    const ride = Ride.startDay(st);
    log(st, `Kept the shop closed for errands. ${st.ap.max} hours to get things done.${ride}`, 'note');
    return true;
  },
  endErrands(st) {
    if (st.phase !== 'errands') return false;
    st.phase = 'night';
    st.ap.left = 0;
    st.ui.tab = 'scavenge';
    log(st, 'Errands done. The city is getting dark.', 'note');
    return true;
  },

  /* Collect rent if today is a due day. Returns a short summary for a toast. */
  collectRent(st) {
    const r = st.rent;
    if (st.day < r.dueDay) return null;
    const owed = Calendar.owed(st), onTime = !r.arrears;
    const paid = Math.max(0, Math.min(st.cash, owed));
    st.cash -= paid;
    const short = owed - paid;
    r.dueDay += r.every;
    Endless.raiseRent(st);                  // Endless: the rent climbs after every rent day
    if (short <= 0) {
      r.arrears = 0; r.strikes = 0;
      if (onTime) st.counters.rentOnTime = (st.counters.rentOnTime || 0) + 1;
      log(st, `Paid ${money(paid)} rent. The landlord nods and leaves.`, 'note');
      return `Rent paid · ${money(paid)}`;
    }
    const fee = Math.round(Math.min(short, owed - r.arrears) * Calendar.diff(st).lateFee);
    r.arrears = short + fee;
    r.lateFees += fee;
    r.strikes += 1;
    // Rent alone never ends the game: its Heat can't push you past the cap.
    const heat = Math.max(0, Math.min(DATA.rentPenalty.heatPerStrike * r.strikes, DATA.rentPenalty.heatCap - st.heat));
    st.heat += heat;
    log(st, `Came up ${money(short)} short on rent. Late fee ${money(fee)}. The landlord taped a notice to the door and started asking about the basement. +${heat} Heat.`, 'warn');
    return `Short on rent · owe ${money(r.arrears)}`;
  },
  payArrears(st) {
    const r = st.rent;
    const paid = Math.min(st.cash, r.arrears);
    if (paid <= 0) return 0;
    st.cash -= paid; r.arrears -= paid;
    if (r.arrears <= 0) { r.arrears = 0; r.strikes = 0; log(st, `Cleared your back rent. The notice comes off the door.`, 'note'); }
    else log(st, `Paid ${money(paid)} toward back rent. Still owe ${money(r.arrears)}.`, 'note');
    return paid;
  },
  customerPenalty: st => st.rent.arrears > 0 ? Math.min(DATA.rentPenalty.customerLossMax, st.rent.strikes) : 0,

  /* Sleep: end the day, settle rent, reset daily resources, start the next morning. */
  sleep(st) {
    Shop.settleJobs(st, null);               // anything left from appraisals goes home with its owner
    const pre = { day: st.day, cash: st.cash, today: Recap.today(st), dayStart: st.dayStart, arrears: st.rent.arrears };
    const rentNote = Calendar.collectRent(st);
    pre.rentPaid = Math.max(0, pre.cash - st.cash); pre.rentShort = st.rent.arrears > pre.arrears; pre.heat = st.heat;
    st.day += 1;
    st.phase = 'morning';
    st.energy = st.maxEnergy;
    st.battery = 100;
    st.stress = Math.max(0, st.stress - 30);
    st.overnight = Lab.overnight(st);        // unsealed curses leak while you sleep
    st.overnightCells = Containment.overnight(st);   // cell seals weaken; anything at 0 breaks out
    st.bench.max = Lab.benchMax(st);
    st.bench.mins = st.bench.max;
    st.ap.left = 0;
    st.heat -= Endless.heatDecay(st);
    Endless.add(st, 'day');
    st.ui.tab = 'shop';
    RNG.within(st, ['morning', st.day], () => {
      st.morningLine = Story.nameRatio(st) >= 0.3 && rnd() < 0.4 ? pick(rnd, DATA.nameLines) : pick(rnd, DATA.morningLines);
      log(st, pick(rnd, DATA.news), 'news');
    });
    st.dayStart = { cash: st.cash, heat: clamp(Math.round(st.heat), 0, DATA.config.heatMax) };
    st.recap = Recap.build(st, pre);
    st.today = Recap.fresh(st);
    if (Calendar.isAuditDay(st)) { Audit.run(st); return rentNote; }
    Story.morning(st);
    Endless.morning(st);
    return rentNote;
  }
};
