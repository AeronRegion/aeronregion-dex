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
const TIER: Record<string, string> = { ubers: 'Ubers', ou: 'OU', uu: 'UU', ru: 'RU', nu: 'NU', pu: 'PU', lc: 'LC', monotype: 'Monotype', doublesou: 'Doubles OU' };
const TIER_ORDER = Object.keys(TIER);
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
  if (f.id.startsWith('sm-')) { const m = f.label.match(/^gen(\d)(.+)$/); return m ? `${GAME[m[1]] ?? 'Gen ' + m[1]} ${TIER[m[2]] ?? m[2]}` : f.label; }
  return f.label.replace(/^(\d{4}) season majors$/, '$1 season (official majors)');
};
export const GROUPS = [
  { key: 'sd', label: 'Showdown ladder', note: 'Monthly ladder stats, top-rated games only' },
  { key: 'lt', label: 'Online tournaments (Limitless)', note: 'Open team sheets from the last 45 days' },
  { key: 'pd', label: 'Official majors', note: 'Regionals, Internationals and Worlds, Masters division (RK9 team lists)' },
  { key: 'sm', label: 'Smogon tiers', note: 'Monthly Showdown ladder stats for Smogon singles tiers and Doubles OU' },
];
export const formats = (idx.formats as any[])
  .filter((f) => !/custom/i.test(f.label) && (f.total ?? 0) >= (f.event ? 32 : 100))
  .map((f) => ({ ...f, name: formatName(f), group: f.id.slice(0, 2), ladder: /^s[dm]-/.test(f.id) }))
  .map((f) => ({ ...f, current: !f.ladder || f.current !== false }))
  .sort((a, b) => GROUPS.findIndex((g) => g.key === a.group) - GROUPS.findIndex((g) => g.key === b.group) || Number(b.current) - Number(a.current) || (a.group === 'pd' ? b.id.localeCompare(a.id) : b.period.localeCompare(a.period)) || b.total - a.total);
// Picker parts: which game/season a format belongs to, a short name inside that group, and its Bo3 twin.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// dates are written 07 NOV 2026, or APR 2024 when there's no day
export const fmtDate = (p: string) => { const m = String(p ?? '').match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/); return m ? `${m[3] ? m[3] + ' ' : ''}${MON[+m[2] - 1].toUpperCase()} ${m[1]}` : p; };
export const monthName = fmtDate;
export const fmtRange = (p: string) => String(p ?? '').replace(/(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/, (_, a, b) => `${fmtDate(a)} – ${fmtDate(b)}`);
for (const f of formats as any[]) {
  f.base ??= f.id; f.def ??= true;
  if (f.group === 'sd') {
    const m = f.label.match(/^gen(\d)(champions)?vgc(\d{4})(.*?)(bo3)?$/);
    f.bo3 = !!m?.[5]; f.fam = f.base.replace(/bo3$/, '');
    f.game = m?.[2] ? 'Champions' : m ? `${GAME[m[1]] ?? 'Gen ' + m[1]} ${m[3]}` : 'Other';
    f.short = f.name.replace(/ \(Bo3\)$/, '').replace(/^(Champions|Scarlet & Violet|Sword & Shield)( \d{4})? /, '').replace(/^VGC \d{4} (Series)/, '$1');
    f.order = m?.[2] ? 9999 : m ? +m[3] : 0;
  } else if (f.group === 'sm') {
    const m = f.label.match(/^gen(\d)(.+)$/);
    f.bo3 = false; f.fam = f.base; f.game = GAME[m?.[1]] ?? 'Other'; f.short = TIER[m?.[2]] ?? f.label; f.order = +(m?.[1] ?? 0); f.tord = TIER_ORDER.indexOf(m?.[2]);
  } else {
    f.bo3 = false; f.fam = f.id; f.game = f.group === 'pd' ? 'Official majors' : f.name.startsWith('Champions') ? 'Champions' : 'Scarlet & Violet';
    f.short = f.group === 'pd' ? f.name.replace(' (official majors)', '') : f.name.replace(/^(Champions|Scarlet & Violet) /, '');
    f.order = 0;
  }
}
export const twin = (f: any) => (formats as any[]).find((x) => x.def && x.group === f.group && x.fam === f.fam && x.bo3 !== f.bo3);
// other months / rating cutoffs of the same Showdown format
export const variants = (f: any) => (formats as any[]).filter((x) => x.base === f.base);
export const pickerGroups = (src: string) => {
  const list = (formats as any[]).filter((f) => f.def && f.group === src && (!f.bo3 || !twin(f)));
  const games = [...new Set(list.map((f) => f.game))].sort((a, b) => (list.find((f) => f.game === b)!.order - list.find((f) => f.game === a)!.order));
  return games.map((g) => ({ game: g, items: list.filter((f) => f.game === g).sort((a, b) => (a.tord ?? 0) - (b.tord ?? 0) || b.period.localeCompare(a.period)) }));
};
export const updated = idx.updated as string;
export const loadFormat = (id: string) => get(id);

// Pokémon id -> where it shows up in VGC usage (one row per format, default views only), for the Pokémon pages
let byMonCache: Map<string, any[]> | null = null;
export const usageFor = (id: string) => {
  if (!byMonCache) {
    byMonCache = new Map();
    for (const f of formats as any[]) {
      if (!f.def || f.bo3) continue;
      const d = loadFormat(f.id); if (!d) continue;
      d.mons.forEach((m: any, k: number) => {
        const s = findSpecies(m.name); if (!s) return;
        const key = String(s.name).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!byMonCache!.has(s.id)) byMonCache!.set(s.id, []);
        byMonCache!.get(s.id)!.push({ href: `/usage/${f.id}/#${key}`, name: f.name, group: f.group, current: f.current, period: f.period, usage: m.usage, rank: k + 1, total: d.mons.length, tours: f.tours });
      });
    }
    for (const rows of byMonCache.values()) rows.sort((a, b) => Number(b.current) - Number(a.current) || String(b.period).localeCompare(String(a.period)));
  }
  return byMonCache.get(id) ?? [];
};
