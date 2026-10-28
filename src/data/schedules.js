// When the places in town are open (Phase 13), and who runs them. Day 1 is a Monday.
// Times are minutes since midnight. City days run from 9 AM for six to eight hours,
// so every place is open at some point on most of them, just not all.
//
//   days: which weekdays it opens, Monday first. open/close: today's hours.
//   short: { weekday: [open, close] } for days with different hours.
//   lunch: [from, to] the keeper steps out. sick: the chance they don't come in at all.
//   street: what the keeper says if you catch them out (at lunch, or on their day off).
//   door: the hours painted on the door. sickNote: the note taped up on a sick day.

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const h = (hh, mm = 0) => hh * 60 + mm;

export const SCHEDULES = {
  hardware: {
    keeper: 'Mrs. Kowalski', days: [1, 1, 1, 1, 1, 1, 0], open: h(9), close: h(17), lunch: [h(12), h(13)], sick: 0.04,
    door: 'KOWALSKI HARDWARE · Mon to Sat 9 to 5 · Closed for lunch 12 to 1',
    street: { lunch: ['Even I eat lunch, dear. Back at one.', 'Salt’s not going anywhere. One o’clock.'], off: ['Sundays are for church and my feet. Monday, nine sharp.'] },
    sickNote: 'CLOSED TODAY. Back tomorrow. — K.',
  },
  autoshop: {
    keeper: 'Ray Delgado', days: [0, 1, 1, 1, 1, 1, 0], open: h(10), close: h(18), lunch: [h(13), h(14)], sick: 0.05,
    door: 'DELGADO CYCLE & AUTO · Tue to Sat 10 to 6',
    street: { lunch: ['Out for a sandwich. The van’s not going to fix itself, but it can wait an hour.', 'Back at two. Don’t touch the bikes.'], off: ['Shop’s shut. Even the lift gets a day off.', 'Tuesday. I’ll have the coffee on.'] },
    sickNote: 'Ray’s out sick. Back tomorrow. Leave keys in the slot.',
  },
  library: {
    keeper: 'Ms. Achterberg', days: [1, 1, 1, 1, 1, 1, 0], open: h(9), close: h(17), short: { 5: [h(10), h(14)] }, sick: 0.03,
    door: 'SPECIAL COLLECTIONS · Mon to Fri 9 to 5 · Sat 10 to 2',
    street: { off: ['Sundays I read for myself. Your mother used to tease me about it.', 'The collection keeps until Monday. So do I.'] },
    sickNote: 'Special Collections is closed today. Staff illness.',
  },
  office: {
    keeper: 'Clerk Dunmore', days: [1, 1, 1, 1, 1, 0, 0], open: h(9), close: h(16, 30), lunch: [h(12), h(13)], sick: 0.03,
    door: 'OFFICE OF ANOMALOUS PROPERTY · Weekdays 9 to 4:30 · Closed 12 to 1',
    street: { lunch: ['The window reopens at one. Take a number.'], off: ['Weekends are for the dead and the private sector.'] },
    sickNote: 'WINDOW CLOSED. Personnel absence. Forms may be left in the slot.',
  },
  relay: {
    keeper: 'Professor Okoye', days: [1, 0, 1, 1, 0, 1, 0], open: h(11), close: h(17), sick: 0.06,
    door: 'THE RELAY · Mon, Wed, Thu, Sat 11 to 5 · Knock twice',
    street: { off: ['The Circle meets when the signal’s clean. Not today.', 'Come by when the Relay’s open. Bring something that hums.'] },
    sickNote: 'Interference. Come back tomorrow.',
  },
  tower: {
    keeper: 'Mr. Pryce', days: [1, 1, 1, 1, 1, 0, 0], open: h(9), close: h(17), lunch: [h(12, 30), h(13, 30)], sick: 0.02,
    door: 'HALBERD & VANE · By appointment, weekdays 9 to 5',
    street: { lunch: ['I’m at lunch. Halberd & Vane is not.', 'The thirteenth floor reopens at half past one.'], off: ['Weekends, I am not available. Neither is anyone you’d want to see.'] },
    sickNote: 'Floor 13 is unavailable today.',
  },
  firehouse: {
    keeper: 'Captain Rourke', days: [1, 0, 1, 1, 1, 1, 1], open: h(13), close: h(19), sick: 0.04,
    door: 'ENGINE 9 · Night Shift sleeps till one · Closed Tuesdays',
    street: { off: ['Tuesday’s the one day we sleep in. Mostly.', 'Firehouse is shut. Come by tomorrow after one.'] },
    sickNote: 'Out on a call. Nobody here.',
  },
  market: {
    keeper: 'Tarp Sal', days: [1, 0, 0, 1, 1, 1, 1], open: h(10), close: h(16), sick: 0.08,
    door: 'NIGHT MARKET · Thu to Mon, which tarp you knock on is up to you',
    street: { off: ['Tarps are down Tuesdays and Wednesdays. The cops like routine.', 'Come back Thursday. Bring cash.'] },
    sickNote: 'No tables today. Somebody heard something.',
  },
};
