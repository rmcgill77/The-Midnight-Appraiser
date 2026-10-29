// Phase 31a: the pronouns NPCs use when they talk about the player. Nothing else changes.
// A line may carry tokens like {they} or {They}; they are filled from the player's pick.
export const PRONOUN_SETS = [
  { label: 'They/them', they: 'they', them: 'them', their: 'their', theirs: 'theirs', themself: 'themself', plural: true },
  { label: 'She/her', they: 'she', them: 'her', their: 'her', theirs: 'hers', themself: 'herself', plural: false },
  { label: 'He/him', they: 'he', them: 'him', their: 'his', theirs: 'his', themself: 'himself', plural: false },
];

export const pronounSet = i => PRONOUN_SETS[Number.isInteger(i) && i >= 0 && i < PRONOUN_SETS.length ? i : 0];

const cap = s => s[0].toUpperCase() + s.slice(1);

// {are}/{were}/{has}/{s}/{es} follow the verb agreement of the chosen set.
export function fillPronouns(text, index) {
  if (typeof text !== 'string' || !text.includes('{')) return text;
  const p = pronounSet(index);
  const words = {
    they: p.they, them: p.them, their: p.their, theirs: p.theirs, themself: p.themself,
    are: p.plural ? 'are' : 'is', were: p.plural ? 'were' : 'was', has: p.plural ? 'have' : 'has',
    s: p.plural ? '' : 's', es: p.plural ? '' : 'es',
  };
  return text.replace(/\{(\w+)\}/g, (m, k) => {
    const w = words[k] ?? (words[k.toLowerCase()] && cap(words[k.toLowerCase()]));
    return w ?? m;
  });
}
