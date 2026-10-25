// People you can hire once the shop is big enough to need them. Wages are paid at
// closing, only on days the shop is open (they're off on city days).

export const ROLES = {
  clerk: {
    id: 'clerk', name: 'Clerk', unlock: 2, wage: 30,
    does: 'Works the till. Buyers who take the tag get rung up even when you’re busy at the counter or the cases. Counter-offers still wait for you.',
    names: ['Dana Ruiz', 'Theo Park', 'June Okafor', 'Marcus Bell', 'Priya Shah', 'Leon Duarte', 'Hattie Moss', 'Sam Kowalski'],
    lines: ['I can count change and I don’t ask questions.', 'Worked a register at the pharmacy for two years.', 'I’m good with people. Mostly.', 'I need the hours. I’m reliable.'],
    look: { h: '#2e3a4a', H: '#5a6e8a', c: '#6a3a3a', C: '#542e2e', s: '#c9a88a', d: '#3a2a1a', b: '#d8d0bc' },
  },
  stocker: {
    id: 'stocker', name: 'Stock hand', unlock: 3, wage: 20,
    does: 'Keeps the cases full: when one is empty, brings up the best-priced tagged piece that isn’t out yet. Never puts out anything tagged cursed.',
    names: ['Ike Brennan', 'Rosa Valdez', 'Gus Ferreira', 'Tamsin Lowe', 'Abel Nakamura', 'Wren Holloway', 'Odell Price', 'Cy Marchetti'],
    lines: ['I can lift. I can carry. I don’t break things.', 'Did stockroom at a hardware store.', 'Point me at the boxes.', 'Quiet work suits me.'],
    look: { h: '#3a3a22', H: '#6a6a3a', c: '#4a5a3a', C: '#3a482e', s: '#a07a5e', d: '#2a1a12', b: '#c9b98f' },
  },
};
export const ROLE_ORDER = ['clerk', 'stocker'];

// Today's applicant for a role: a different face most days, the same one all day.
export function applicant(role, seed, day) {
  const r = ROLES[role];
  const h = Math.abs(((seed | 0) * 31 + day * 7919 + (role === 'clerk' ? 0 : 104729)) | 0);
  return { role, name: r.names[h % r.names.length], line: r.lines[(h >>> 3) % r.lines.length] };
}
