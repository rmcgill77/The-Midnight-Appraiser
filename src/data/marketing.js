// Bringing people in without making the shop any bigger (Phase 11). Four kinds:
//  - Advertising: a campaign runs for a few days from tomorrow; one at a time, buy it again.
//  - Storefront: one-time work on the outside of the building; you can see it from the street.
//  - Regulars: earned, not bought. Factions that trust you send someone, and a clean record
//    gets the neighborhood talking.
//  - Comforts: one-time; people wait longer in line and spend a little more.
// Every extra customer still has to fit in the room (SHOP_TIERS[].room).

export const ADS = [
  { id: 'flyers', name: 'Flyers on the block', cost: 40, days: 4, extra: 1, unlock: 0, mix: ['buy'],
    blurb: 'Photocopied and stapled to every pole between here and the laundromat.' },
  { id: 'paper', name: 'Classified ad', cost: 110, days: 7, extra: 2, unlock: 1, mix: ['buy', 'sell'],
    blurb: 'A week in the Ledger-Courier, between the psychics and the plumbers. Sellers read it too.' },
  { id: 'radio', name: 'Late-night radio spot', cost: 260, days: 7, extra: 3, unlock: 2, mix: ['buy', 'sell', 'buy'],
    blurb: 'Thirty seconds on WKNT after the call-in show. The people awake at that hour are your people.' },
];

export const STOREFRONT = [
  { id: 'sign', name: 'Painted sign', cost: 120, extra: 1, unlock: 0,
    blurb: 'Gold leaf over the door, the shop’s name the way it used to read.' },
  { id: 'window', name: 'Window display', cost: 220, extra: 1, unlock: 1,
    blurb: 'Peel the newspaper off the front window and light it. People stop to look.' },
  { id: 'awning', name: 'Striped awning', cost: 340, extra: 1, unlock: 2,
    blurb: 'A dry spot in the rain, and you can pick it out from the corner.' },
];

export const COMFORTS = [
  { id: 'bench', name: 'Waiting bench', cost: 80, unlock: 0, patience: 0.35, spend: 0,
    blurb: 'Somewhere to sit while the line moves. People wait a lot longer sitting down.' },
  { id: 'coffee', name: 'Coffee pot', cost: 140, unlock: 1, patience: 0.2, spend: 0.05,
    blurb: 'Free coffee by the counter. People linger, and people who linger spend.' },
  { id: 'radio', name: 'Shop radio', cost: 200, unlock: 2, patience: 0.15, spend: 0.07,
    blurb: 'Low jazz from behind the till. Nobody hurries, and nobody haggles quite as hard.' },
];

// Regulars: one from each faction whose standing is at least `trust`; one more from the
// neighborhood while Heat stays at or under `cleanHeat`. Never more than `max` a day.
export const REGULARS = { trust: 20, cleanHeat: 15, max: 3 };
