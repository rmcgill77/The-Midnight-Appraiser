// Who you were before the shop (Phase 12). Picked in the character creator; each one
// shifts the start a little (cash, Heat, standing, supplies) and gives one small edge
// for the whole game, and Mina and the first morning mention it. World state
// (world.background); the original game has nothing like it.
//
//   cash, heat: added to the start. rep: standing added per faction. vials: added.
//   edge: 'haggle' sellers open 10% lower · 'errand' one more errand hour on city days

export const BACKGROUNDS = [
  { id: 'family', name: 'The family business', edge: 'haggle',
    blurb: 'You grew up behind this counter, doing homework on the glass while your parents haggled.',
    perk: 'Sellers open their asking price 10% lower: they know whose kid you are.',
    mina: 'You remember me? You were this tall. You used to sleep on the coats in the back.',
    morning: 'The counter still has your initials scratched under it.' },
  { id: 'chemist', name: 'Night-school chemist', cash: -40, vials: 8,
    blurb: 'A semester short of the degree when the tuition ran out. You still know your reagents.',
    perk: '8 extra test vials to start. $40 less in the till: the lab coat wasn’t free.',
    mina: 'Your mom said you were the one who’d understand the bench. No pressure.',
    morning: 'You line the vials up by size before you’ve even had coffee.' },
  { id: 'excon', name: 'Two years upstate', cash: 120, heat: 8, rep: { hunters: 15 },
    blurb: 'You did two years for something you’ll explain later. The people who matter remember you kept quiet.',
    perk: 'A $120 stash and +15 with the Night Shift. The Office already knows your name: +8 Heat.',
    mina: 'I heard where you were. I’m not going to ask. Your folks never did either.',
    morning: 'Old habits: you check the street from the window before you unlock anything.' },
  { id: 'repo', name: 'Repo driver', cash: 40, edge: 'errand',
    blurb: 'Six years taking back cars from people who swore they’d paid. You know every shortcut in town.',
    perk: 'One more errand hour every city day, and $40 saved up.',
    mina: 'You drove repo? Then you know how people lie about what things are worth.',
    morning: 'You know three ways to the Night Market, and two of them are legal.' },
  { id: 'adjuster', name: 'Insurance adjuster', cash: -40, heat: -8, rep: { office: 15 },
    blurb: 'You priced other people’s losses for a living. The paperwork never scared you.',
    perk: '+15 with the Office and Heat starts at zero. You quit without notice: $40 less to start.',
    mina: 'An adjuster. Good. Somebody in this family should be able to read a form.',
    morning: 'You file last week’s receipts before you open. It calms you down.' },
];

export const backgroundOf = id => BACKGROUNDS.find(b => b.id === id) ?? null;
