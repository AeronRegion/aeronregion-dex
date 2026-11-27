// VGC usage data (src/data/usage/, written weekly by scripts/usage.mjs) plus name lookups for the Usage pages.
import { species, moves, items, abilities } from './data';

const files = import.meta.glob('../data/usage/*.json', { eager: true }) as Record<string, any>;
const get = (id: string) => files[`../data/usage/${id}.json`]?.default ?? files[`../data/usage/${id}.json`];
const idx = get('index') ?? { updated: '', formats: [] };

const toID = (s: string) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const spBy = new Map(species.map((s) => [s.id, s]));
const mvBy = new Map(moves.map((m) => [m.id, m.name]));
const itBy = new Map(items.map((i) => [i.id, i.name]));
const abBy = new Map(abilities.map((a) => [a.id, a.name]));

// "Basculegion [Female]", "Rotom [Heat Rotom]", "Floette [Eternal Flower]" (team lists) or "Basculegion-F" (Showdown)
const REGION: Record<string, string> = { alolan: 'alola', galarian: 'galar', hisuian: 'hisui', paldean: 'paldea' };
export const findSpecies = (name: string) => {
  const m = name.match(/^(.*?)\s*\[(.+)\]$/);
  const base = m ? m[1] : name, inner = m ? m[2] : '';
  const tries = [toID(name)];
  if (inner) {
    const words = inner.split(/\s+/).map(toID);
    if (words[0] === 'male' || /form$/.test(toID(inner)) && !REGION[words[0]]) tries.push(toID(base));
    if (words[0] === 'female') tries.push(toID(base) + 'f');
    if (REGION[words[0]]) tries.push(toID(base) + REGION[words[0]] + (words[1] && words[1] !== 'form' ? words[1] : ''));
    tries.push(toID(base) + words[0], toID(base) + words.join(''), toID(base) + words.at(-1));
    tries.push(toID(base));
  }
  // Limitless writes some forms first: "Eternal Flower Floette", "Paldean Tauros"
  if (!inner && / /.test(name)) { const w = name.split(/\s+/), b = toID(w.at(-1)!), f = w.slice(0, -1).map(toID); tries.push(b + (REGION[f[0]] ?? f[0]), b + f.join(''), b + f.at(-1)); }
  for (const t of tries) if (spBy.has(t)) return spBy.get(t);
  return null;
};
export const moveName = (x: string) => mvBy.get(toID(x)) ?? x;
export const itemName = (x: string) => itBy.get(toID(x)) ?? x;
export const abilityName = (x: string) => abBy.get(toID(x)) ?? x;

// readable format names
const regLabel = (r: string) => (r.length === 2 ? `${r[0]}-${r[1]}` : r).toUpperCase();
const GAME: Record<string, string> = { '8': 'Sword & Shield', '9': 'Scarlet & Violet' };
export const formatName = (f: any) => {
  if (f.id.startsWith('sd-')) {
    const m = f.label.match(/^gen(\d)(champions)?vgc(\d{4})(.*?)(bo3)?$/);
    if (!m) return f.label;
    const game = m[2] ? 'Champions' : GAME[m[1]] ?? `Gen ${m[1]}`;
    const rest = m[4];
    const reg = rest.match(/^reg(?:ulation)?([a-z]{1,2})$/), ser = rest.match(/^series(\d+)$/);
    const what = reg ? `Reg ${regLabel(reg[1])}` : ser ? `VGC ${m[3]} Series ${ser[1]}` : rest ? `VGC ${m[3]} ${rest}` : `VGC ${m[3]}`;
    return `${game} ${reg ? `${m[3]} ` : ''}${what}${m[5] ? ' (Bo3)' : ''}`.replace(/Champions \d{4} /, 'Champions ');
  }
  if (f.id.startsWith('lt-')) {
    const code = f.label.replace(/^Reg /, '');
    const sv = code.match(/^SV([A-Z])$/);
    return sv ? `Scarlet & Violet Reg ${sv[1]}` : `Champions Reg ${code}`;
  }
  return f.label.replace(/^(\d{4}) season majors$/, '$1 season (official majors)');
};
export const GROUPS = [
  { key: 'sd', label: 'Showdown ladder', note: 'Monthly ladder stats, top-rated games only' },
  { key: 'lt', label: 'Online tournaments (Limitless)', note: 'Open team sheets from the last 45 days' },
  { key: 'pd', label: 'Official majors', note: 'Regionals, Internationals and Worlds, Masters division (RK9 team lists)' },
];
export const formats = (idx.formats as any[])
  .filter((f) => !/custom/i.test(f.label) && (f.total ?? 0) >= 100)
  .map((f) => ({ ...f, name: formatName(f), group: f.id.slice(0, 2) }))
  .map((f) => ({ ...f, current: f.group !== 'sd' || f.current !== false }))
  .sort((a, b) => GROUPS.findIndex((g) => g.key === a.group) - GROUPS.findIndex((g) => g.key === b.group) || Number(b.current) - Number(a.current) || (a.group === 'pd' ? b.id.localeCompare(a.id) : b.period.localeCompare(a.period)) || b.total - a.total);
export const updated = idx.updated as string;
export const loadFormat = (id: string) => get(id);
