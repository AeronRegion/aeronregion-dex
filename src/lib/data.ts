import speciesData from '../data/species.json';
import movesData from '../data/moves.json';
import itemsData from '../data/items.json';
import meta from '../data/meta.json';

export const species = speciesData as any[];
export const moves = movesData as any[];
export const items = itemsData as any[];
export { meta };

export const slug = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/['’.:%]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const speciesById = new Map(species.map((s) => [s.id, s]));
export const moveById = new Map(moves.map((m) => [m.id, m]));
export const itemByName = new Map(items.map((i) => [i.name, i]));
// One page per Pokédex number; forms and Megas are tabs on that page (/pokemon/venusaur/#mega).
export const groups: any[][] = [];
{ const byNum = new Map<number, any[]>();
  for (const s of species) (byNum.get(s.num) ?? byNum.set(s.num, []).get(s.num)!).push(s);
  for (const g of [...byNum.values()].sort((a, b) => a[0].num - b[0].num)) groups.push(g.sort((a, b) => (a.forme ? 1 : 0) - (b.forme ? 1 : 0))); }
const baseOf = new Map(groups.flatMap((g) => g.map((s) => [s.id, g[0]])));
export const formSlug = (s: any) => s.forme ? slug(s.forme) : '';
export const pokeUrl = (s: any) => { const b = baseOf.get(s.id) ?? s; return `/pokemon/${slug(b.name)}/${s.forme && b.id !== s.id ? '#' + formSlug(s) : ''}`; };
const REGION: Record<string, string> = { Alola: 'Alolan', Galar: 'Galarian', Hisui: 'Hisuian', Paldea: 'Paldean' };
export const formLabel = (s: any) => {
  if (!s.forme) return s.baseSpecies;
  const [first, ...rest] = s.forme.split('-');
  if (REGION[first]) return `${REGION[first]} ${s.baseSpecies}${rest.length ? ` (${rest.join(' ')})` : ''}`;
  if (first === 'Mega') return `Mega ${s.baseSpecies}${rest.length ? ' ' + rest.join(' ') : ''}`;
  if (s.forme.endsWith('-Mega')) return `Mega ${s.baseSpecies} (${s.forme.replace(/-Mega$/, '').replace(/-/g, ' ')})`;
  if (first === 'Primal') return `Primal ${s.baseSpecies}`;
  return `${s.baseSpecies} (${s.forme.replace(/-/g, ' ')})`;
};
export const moveUrl = (m: { name: string }) => `/moves/${slug(m.name)}/`;
export const itemUrl = (i: { name: string }) => `/items/${slug(i.name)}/`;

const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
export const artUrl = (art: string | null) => art ? `${SPR}/pokemon/other/official-artwork/${art}.png` : '';
export const iconUrl = (art: string | null) => art ? `${SPR}/pokemon/${art}.png` : '';
export const itemIconUrl = (icon: string | null) => icon ? `${SPR}/items/${icon}.png` : '';

export const GAMES: Record<number, string> = {
  9: 'Scarlet / Violet', 8: 'Sword / Shield', 7: 'Sun / Moon / USUM', 6: 'X / Y / ORAS', 5: 'Black / White', 4: 'DPPt / HGSS', 3: 'RSE / FRLG', 2: 'Gold / Silver / Crystal', 1: 'Red / Blue / Yellow',
};
export const STATS: [string, string][] = [['hp', 'HP'], ['atk', 'Attack'], ['def', 'Defense'], ['spa', 'Sp. Atk'], ['spd', 'Sp. Def'], ['spe', 'Speed']];
export const statRange = (k: string, b: number) => k === 'hp'
  ? [2 * b + 110, 2 * b + 204]
  : [Math.floor((2 * b + 5) * 0.9), Math.floor((2 * b + 99) * 1.1)];
