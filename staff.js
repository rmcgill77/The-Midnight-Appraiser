// Hired help (Phase 9). The rules: who you can hire at which shop stage, hiring and
// letting go, and payroll at closing (if you can't make it, they quit). And the
// floor: the clerk standing at the till, the stock hand walking cases full.
// World state, kept in world.staff; the original game has no staff.

import { S } from '../rules/index.js';
import { cue } from '../rules/cues.js';
import { ROLES, ROLE_ORDER, applicant } from '../data/staff.js';
import { SHOP_TIERS } from '../data/shop-tiers.js';
import { shopState } from './shop-growth.js';
import { caseSlotsOf } from './shop-layout.js';
import { Guide } from './guide.js';
import { lookFor } from './people.js';

export const freshStaff = () => ({ clerk: null, stocker: null });

export function staffState(world) {
  const s = world.staff && typeof world.staff === 'object' ? world.staff : freshStaff();
  for (const r of ROLE_ORDER) if (s[r] && typeof s[r].name !== 'string') s[r] = null; else if (!(r in s)) s[r] = null;
  world.staff = s;
  return s;
}

export const onStaff = (world, role) => !!staffState(world)[role];
export const roleOpen = (world, role) => shopState(world).tier >= ROLES[role].unlock;
export const todaysApplicant = (st, role) => applicant(role, st.seed, st.day);
export const wagesDue = world => ROLE_ORDER.reduce((n, r) => n + (onStaff(world, r) ? ROLES[r].wage : 0), 0);

export function hireBlocker(world, role) {
  if (!roleOpen(world, role)) return `Needs the ${SHOP_TIERS[ROLES[role].unlock].name.toLowerCase()} renovation`;
  if (onStaff(world, role)) return 'Already on staff';
  return null;
}

export function hire(world, st, role) {
  const why = hireBlocker(world, role);
  if (why) return { error: why };
  const a = todaysApplicant(st, role);
  staffState(world)[role] = { name: a.name, since: st.day, days: 0 };
  cue('stamp');
  S.log(st, `Hired ${a.name} as your ${ROLES[role].name.toLowerCase()} at ${S.money(ROLES[role].wage)} a day.`, 'note');
  return { name: a.name };
}

export function letGo(world, st, role) {
  const s = staffState(world), w = s[role];
  if (!w) return null;
  s[role] = null;
  S.log(st, `Let ${w.name} go.`, 'note');
  return w;
}

// Closing time on a shop day: everyone on staff gets paid, or quits.
export function payroll(world, st) {
  const s = staffState(world), out = { paid: [], quit: [], total: 0 };
  for (const role of ROLE_ORDER) {
    const w = s[role]; if (!w) continue;
    const wage = ROLES[role].wage;
    if (st.cash >= wage) {
      st.cash -= wage; w.days += 1; out.total += wage;
      out.paid.push({ role, name: w.name, wage });
    } else {
      s[role] = null;
      out.quit.push({ role, name: w.name, wage });
      S.log(st, `${w.name} quit. You couldn’t make payroll.`, 'warn');
    }
  }
  if (out.total) S.log(st, `Paid ${S.money(out.total)} in wages.`, 'note');
  return out;
}

// Evening-news lines for payroll, in the shape the news list uses.
export function payrollNews(p) {
  return [
    ...p.paid.map(x => ({ kind: 'odd', text: `Paid ${x.name}, your ${ROLES[x.role].name.toLowerCase()}.`, tag: `−${S.money(x.wage)}` })),
    ...p.quit.map(x => ({ kind: 'bad', text: `${x.name} quit. You couldn’t cover a day’s wages.`, tag: 'Quit' })),
  ];
}

// What the stock hand would put out next: the best-priced tagged piece that isn't
// on display and isn't tagged cursed, into the first empty case.
export function pickRestock(st, world) {
  const slots = caseSlotsOf(world).filter(s => !world.displays[s]);   // wherever you've put the cases (Phase 24)
  if (!slots.length) return null;
  const shown = new Set(Object.values(world.displays));
  const it = st.inventory.stock
    .filter(x => !shown.has(x.uid) && x.appraisal?.alignment !== 'cursed')
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0];
  return it ? { slot: slots[0], it } : null;
}

// ---------- on the floor ----------

const CLERK_POST = { tx: 17, ty: 3 };
const BACK_DOOR = { tx: 13, ty: 2 };

export class StaffFloor {
  constructor() {
    this.clerk = new Guide(40, ROLES.clerk.look);
    this.stocker = new Guide(56, ROLES.stocker.look);
    this.job = null; this.wait = 0.8;
  }

  // Show who's working: the clerk at the till while the shop is open.
  sync(world, open) {
    // Each hire has their own face, the same every day they work.
    for (const role of ROLE_ORDER) {
      const w = staffState(world)[role], g = this[role === 'clerk' ? 'clerk' : 'stocker'];
      if (w && g.who !== w.name) { g.who = w.name; g.setLook(lookFor(w.name)); }
    }
    const c = this.clerk;
    if (open && onStaff(world, 'clerk')) { if (!c.visible) c.place('shop', CLERK_POST.tx, CLERK_POST.ty, 'down'); }
    else c.hide();
    if (!open || !onStaff(world, 'stocker')) { this.stocker.hide(); this.job = null; }
  }

  get entities() { return [this.clerk, this.stocker].filter(g => g.visible); }

  // Returns events: [{ stocked: item, by: name }].
  update(dt, { st, world, map, open }) {
    const ev = [];
    this.sync(world, open);
    this.clerk.update(dt, null);
    this.stocker.update(dt, null);
    if (!open || !onStaff(world, 'stocker')) return ev;
    const sk = this.stocker, name = staffState(world).stocker.name;
    if (!this.job) {
      this.wait -= dt;
      if (this.wait > 0) return ev;
      this.wait = 1.2;
      const pick = pickRestock(st, world);
      if (!pick) return ev;
      const [tx, ty] = pick.slot.split(',').map(Number);
      const stand = [[tx, ty + 1], [tx, ty - 1], [tx - 1, ty], [tx + 1, ty]].find(([x, y]) => !map.isSolid(x, y));
      if (!stand) return ev;
      this.job = { slot: pick.slot, uid: pick.it.uid, phase: 'out', t: 0 };
      sk.place('shop', BACK_DOOR.tx, BACK_DOOR.ty, 'down');
      sk.walkTo(map, stand[0], stand[1], () => { if (this.job) { this.job.phase = 'place'; this.job.t = 0.7; sk.facing = ty < stand[1] ? 'up' : ty > stand[1] ? 'down' : tx < stand[0] ? 'left' : 'right'; } });
      return ev;
    }
    const j = this.job;
    if (j.phase === 'place') {
      j.t -= dt;
      if (j.t > 0) return ev;
      const it = st.inventory.stock.find(x => x.uid === j.uid);
      const shown = new Set(Object.values(world.displays));
      if (it && !world.displays[j.slot] && !shown.has(it.uid)) { world.displays[j.slot] = it.uid; ev.push({ stocked: it, by: name }); }
      // More empty cases and more stock? Go straight to the next one.
      const next = pickRestock(st, world);
      if (next) { this.job = null; this.#resumeFrom(sk, map, next); return ev; }
      j.phase = 'back';
      sk.walkTo(map, BACK_DOOR.tx, BACK_DOOR.ty, () => { sk.hide(); this.job = null; this.wait = 1.2; });
    }
    return ev;
  }

  // Keep walking from where they are to the next case, instead of going back first.
  #resumeFrom(sk, map, pick) {
    const [tx, ty] = pick.slot.split(',').map(Number);
    const stand = [[tx, ty + 1], [tx, ty - 1], [tx - 1, ty], [tx + 1, ty]].find(([x, y]) => !map.isSolid(x, y));
    if (!stand) return;
    sk.visible = true;
    this.job = { slot: pick.slot, uid: pick.it.uid, phase: 'out', t: 0 };
    sk.walkTo(map, stand[0], stand[1], () => { if (this.job) { this.job.phase = 'place'; this.job.t = 0.7; } });
  }

  reset() { this.clerk.hide(); this.stocker.hide(); this.job = null; this.wait = 0.8; }
}
