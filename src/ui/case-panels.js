// Case files: the original's achievements. Each save keeps the files it opened;
// files opened in any save are remembered on this device too (the original's
// Cases.KEY), so the list can be read from the title screen.

import { el } from './ui.js';
import { iconSvg } from './glyphs.js';
import { S } from '../rules/index.js';

const { DATA } = S;

export function openCaseFiles(ui, st, back, reason = 'menu') {
  const all = S.Cases.list(), here = id => S.Cases.inSave(st, id), ever = id => S.Cases.opened(id);
  const bests = S.Bests.read();
  const opened = all.filter(c => ever(c.id) || here(c.id)).length;
  const endings = bests.endings.length;
  ui.open({
    id: 'cases', size: 'wide', eyebrow: `${opened} of ${all.length} opened`, title: 'Case files', reason,
    body: [
      el('dl', { class: 'readout' },
        el('dt', {}, 'Campaign endings found'), el('dd', {}, `${endings} of ${DATA.endingKeys.length}`),
        el('dt', {}, 'Best Endless run'), el('dd', {}, bests.endless.score ? `${bests.endless.score.toLocaleString('en-US')} points · ${DATA.endless.ranks[bests.endless.rank].name} · ${bests.endless.days} days` : 'None yet')),
      el('div', { class: 'rows' }, [...all].sort((a, b) => (ever(b.id) || here(b.id) ? 1 : 0) - (ever(a.id) || here(a.id) ? 1 : 0)).map(c => {
        const inSave = here(c.id), known = inSave || ever(c.id);
        const hidden = c.secret && !known;
        const mode = c.mode ? ` · ${c.mode === 'endless' ? 'Endless' : 'Campaign'} only` : '';
        return el('article', { class: `row-card case ${known ? 'mark-good' : 'closed'}`, id: `case-${c.id}` },
          iconSvg(hidden ? 'lock' : c.icon, 'px-icon'),
          el('div', { class: 'row-text' },
            el('strong', {}, hidden ? 'A sealed file' : c.name),
            el('span', {}, hidden ? 'Something in this city you haven’t found yet.' : known ? c.text : c.goal),
            el('small', {}, known ? (inSave ? `Opened day ${st.cases.find(x => x.id === c.id).day} in this run${mode}` : `Opened in another run${mode}`) : `Closed${mode}`)));
      })),
    ],
    actions: [{ label: 'Back', kind: 'primary', onClick: back }],
  });
}
