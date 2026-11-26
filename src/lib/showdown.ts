// Reads a team in Showdown's text format. Forgiving about what chat apps do to a paste:
// moves may start with "- ", "* ", "• " or nothing, and blank lines may appear inside a set.
export type ParsedSet = { species: string; item: string; ability: string; level: number | null; tera: string; evs: number[] | null; ivs: number[] | null; nature: string; moves: string[] };
const STAT = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const stats = (line: string, base: number) => {
  const out = Array(6).fill(base);
  for (const part of line.split('/')) { const m = part.trim().match(/^(\d+)\s+(\w+)/); if (m) { const k = STAT.indexOf(m[2].toLowerCase()); if (k >= 0) out[k] = +m[1]; } }
  return out;
};
const toID = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const ATTR = /^(Ability|Level|Tera Type|EVs|IVs|Shiny|Happiness|Gigantamax|Dynamax Level|Hidden Power|Pokeball|Ball):/i;

/** isMove(name) and isSpecies(name) decide what a bare line is. */
export function parseShowdown(text: string, isMove: (name: string) => boolean, isSpecies: (name: string) => boolean): ParsedSet[] {
  const sets: ParsedSet[] = [];
  let cur: ParsedSet | null = null;
  const headOf = (line: string) => {
    const [h, item = ''] = line.split(' @ ');
    let head = h.replace(/\s*\((M|F)\)\s*$/, '').trim();
    const paren = head.match(/\(([^)]+)\)\s*$/); if (paren && paren[1].length > 1) head = paren[1];
    return { head, item: item.trim() };
  };
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trim().replace(/^[`>]+\s*/, '');
    if (!line) continue;
    const bullet = line.match(/^[-*•·–]\s*(.+)$/);
    if (bullet && cur) { if (cur.moves.length < 4) cur.moves.push(bullet[1].trim()); continue; }
    if (cur && ATTR.test(line)) {
      const v = line.replace(ATTR, '').trim(), key = line.split(':')[0].toLowerCase();
      if (key === 'ability') cur.ability = v;
      else if (key === 'level') cur.level = Math.max(1, Math.min(100, +v.replace(/\D/g, '') || 100));
      else if (key === 'tera type') cur.tera = v;
      else if (key === 'evs') cur.evs = stats(v, 0);
      else if (key === 'ivs') cur.ivs = stats(v, 31);
      continue;
    }
    if (cur && /^\w+\s+Nature$/i.test(line)) { cur.nature = line.replace(/\s*Nature$/i, ''); continue; }
    // a bare line: a move if the current set has room and it names a move, otherwise maybe a new Pokémon
    if (cur && !line.includes(' @ ') && cur.moves.length < 4 && isMove(line)) { cur.moves.push(line); continue; }
    const { head, item } = headOf(line);
    if (isSpecies(head)) { cur = { species: head, item, ability: '', level: null, tera: '', evs: null, ivs: null, nature: '', moves: [] }; sets.push(cur); }
  }
  return sets;
}
export const moveId = (name: string, types: string[]) => {
  const hp = name.match(/^Hidden Power\s*\[?(\w+)\]?/i);
  if (hp && types.some((t) => t.toLowerCase() === hp[1].toLowerCase())) return `hiddenpower-${hp[1].toLowerCase()}`;
  return toID(name);
};
