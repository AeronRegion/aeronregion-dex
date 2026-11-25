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
export const pokeUrl = (s: { name: string }) => `/pokemon/${slug(s.name)}/`;
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
