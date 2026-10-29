// The shop-hours panel (Phase 30): a slider for when the shop opens and for how long (up to
// eight hours), the same every day or set day by day, with the closed day(s) picked by the player.
// The rules live in game/shophours.js; this only shows them.

import { el } from './ui.js';
import { ShopHours } from '../game/shophours.js';
import { formatMinute } from '../game/clock.js';
import { WEEKDAY_NAMES } from '../game/calendar.js';

const SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hoursLabel = m => (m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`);

// saved: a ShopHours.save() object. onSave(newSaved) gets the result; onBack() leaves unchanged.
export function openHoursPanel(g, { cfg, saved, onSave, onBack, note = null }) {
  const { ui } = g;
  const h = new ShopHours(cfg).load(saved);
  // The "same every day" form: its own copy of the numbers, taken from the first open day.
  const first = h.week.find(x => x) ?? { open: cfg.defaultOpen, minutes: cfg.maxMinutes };
  const same = { open: first.open, minutes: first.minutes, closed: new Set(h.closedDays) };
  const body = el('div', { class: 'hours-panel' });
  const warn = msg => ui.toast(msg, 2400);

  const applySame = () => { try { h.setSame({ open: same.open, minutes: same.minutes }, [...same.closed]); } catch (e) { warn(e.message); } };

  const slider = (id, label, min, max, step, value, fmt, onInput) => {
    const out = el('output', { for: id }, fmt(value));
    return el('label', { class: 'range-row', for: id }, el('span', {}, label),
      el('input', { type: 'range', id, min: String(min), max: String(max), step: String(step), value: String(value),
        oninput: e => { const v = +e.target.value; out.textContent = fmt(v); onInput(v); } }), out);
  };

  const summary = () => {
    const days = h.openDays.length;
    return el('p', { class: 'note', id: 'hours-summary' }, `${days} day${days === 1 ? '' : 's'} open a week, ${hoursLabel(h.weekMinutes)} in all. Closed: ${h.closedDays.map(d => WEEKDAY_NAMES[d]).join(', ') || 'none'}.`);
  };

  const render = () => {
    body.replaceChildren();
    const modeBtn = (mode, label) => el('button', { type: 'button', id: `hours-mode-${mode}`, class: h.mode === mode ? 'on' : '', 'aria-pressed': String(h.mode === mode),
      onclick: () => { if (h.mode === mode) return; if (mode === 'same') { const o = h.week.find(x => x) ?? first; same.open = o.open; same.minutes = o.minutes; same.closed = new Set(h.closedDays); applySame(); } else h.mode = 'perDay'; render(); } }, label);
    body.append(el('div', { class: 'seg', style: 'grid-template-columns: repeat(2, 1fr)', role: 'group', 'aria-label': 'Hours' }, modeBtn('same', 'Same every day'), modeBtn('perDay', 'Day by day')));

    if (h.mode === 'same') {
      body.append(
        slider('hours-open', 'Opens', 0, 24 * 60 - cfg.stepMinutes, cfg.stepMinutes, same.open, formatMinute, v => { same.open = v; applySame(); refreshSummary(); }),
        slider('hours-length', 'Open for', cfg.minMinutes, cfg.maxMinutes, cfg.stepMinutes, same.minutes, hoursLabel, v => { same.minutes = v; applySame(); refreshSummary(); }),
        el('p', { class: 'label' }, 'Closed on'),
        el('div', { class: 'seg', style: 'grid-template-columns: repeat(7, 1fr)', role: 'group', 'aria-label': 'Closed days' },
          SHORT.map((n, d) => el('button', { type: 'button', id: `closed-${d}`, class: same.closed.has(d) ? 'on' : '', 'aria-pressed': String(same.closed.has(d)),
            onclick: () => {
              const next = new Set(same.closed);
              if (next.has(d)) next.delete(d); else next.add(d);
              if (!next.size) return warn('The shop has to be closed at least one day a week.');
              if (next.size > 6) return warn('The shop has to be open at least one day a week.');
              same.closed = next; applySame(); render();
            } }, n))),
      );
    } else {
      for (let d = 0; d < 7; d++) {
        const day = h.week[d];
        const row = el('div', { class: 'field', id: `hours-day-${d}` });
        row.append(el('div', { class: 'seg', style: 'grid-template-columns: 1fr 1fr', role: 'group', 'aria-label': WEEKDAY_NAMES[d] },
          el('button', { type: 'button', class: day ? 'on' : '', id: `day-open-${d}`, 'aria-pressed': String(!!day), onclick: () => { try { h.setDay(d, { open: first.open, minutes: first.minutes }); render(); } catch (e) { warn(e.message); } } }, `${WEEKDAY_NAMES[d]}: open`),
          el('button', { type: 'button', class: day ? '' : 'on', id: `day-closed-${d}`, 'aria-pressed': String(!day), onclick: () => { try { h.setDay(d, null); render(); } catch (e) { warn(e.message); } } }, 'Closed')));
        if (day) {
          row.append(
            slider(`day-start-${d}`, 'Opens', 0, 24 * 60 - cfg.stepMinutes, cfg.stepMinutes, day.open, formatMinute, v => { h.setDay(d, { open: v, minutes: h.week[d].minutes }); refreshSummary(); }),
            slider(`day-length-${d}`, 'Open for', cfg.minMinutes, cfg.maxMinutes, cfg.stepMinutes, day.minutes, hoursLabel, v => { h.setDay(d, { open: h.week[d].open, minutes: v }); refreshSummary(); }));
        }
        body.append(row);
      }
    }
    body.append(summary());
    if (note) body.append(el('p', { class: 'note' }, note));
  };
  const refreshSummary = () => body.querySelector('#hours-summary')?.replaceWith(summary());

  render();
  ui.open({
    id: 'shop-hours', size: 'wide', eyebrow: 'The shop', title: 'Opening hours', reason: 'panel', dismissable: true,
    body: [body, el('p', { class: 'note' }, 'Up to 8 hours a day, at any time. Hours that run past midnight count toward the day they start. The shop has to be closed at least one day a week. You can’t change them while the shop’s open.')],
    actions: [
      { id: 'hours-save', label: 'Save hours', kind: 'primary', onClick: () => onSave(h.save()) },
      { label: 'Back', kind: 'quiet', onClick: onBack },
    ],
  });
}
