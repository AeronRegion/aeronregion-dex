// Preset sets for the damage calculator: the most common set of each Pokémon in every format we have usage
// data for (default month / latest data), as Showdown text. One file per generation, loaded when you open "Load set".
import { formats, loadFormat, moveName, itemName, abilityName } from '../../lib/usage';

const TOP = 100; // Pokémon per format
const spToEv = (sp: number) => (sp > 0 ? Math.min(252, 4 + 8 * (sp - 1)) : 0);
const STAT = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];
const genOf = (f: any) => { const m = String(f.label).match(/^gen(\d)/) ?? String(f.id).match(/gen(\d)/); return m ? +m[1] : 9; };

export function getStaticPaths() {
  return [8, 9].map((g) => ({ params: { gen: String(g) } }));
}

export function GET({ params }: { params: { gen: string } }) {
  const gen = +params.gen;
  const out: Record<string, [string, string][]> = {};
  for (const f of formats as any[]) {
    if (!f.def || f.bo3 || f.id === 'lt-custom' || genOf(f) !== gen) continue;
    const d = loadFormat(f.id); if (!d) continue;
    const champ = /^Champions/.test(f.name);
    const lvl = f.group === 'sm' ? (/lc$/.test(f.label) ? 5 : 100) : 50;
    for (const m of d.mons.slice(0, TOP)) {
      const [spread] = m.spreads?.[0] ?? [];
      let nature = '', evs: number[] = [];
      if (spread) { const [n, v] = String(spread).split(':'); nature = n; evs = v.split('/').map(Number); if (champ) evs = evs.map(spToEv); }
      const item = m.items?.[0]?.[0], ab = m.abilities?.[0]?.[0], tera = m.tera?.[0]?.[0];
      const lines = [`${m.name}${item ? ` @ ${itemName(item)}` : ''}`];
      if (ab) lines.push(`Ability: ${abilityName(ab)}`);
      lines.push(`Level: ${lvl}`);
      if (tera) lines.push(`Tera Type: ${tera[0].toUpperCase() + tera.slice(1)}`);
      const ev = evs.map((x, k) => (x ? `${x} ${STAT[k]}` : '')).filter(Boolean).join(' / ');
      if (ev) lines.push(`EVs: ${ev}`);
      if (nature) lines.push(`${nature} Nature`);
      for (const [mv] of (m.moves ?? []).slice(0, 4)) lines.push(`- ${moveName(mv)}`);
      (out[m.name] ??= []).push([`${f.name}${f.group === 'sd' || f.group === 'sm' ? '' : ` (${f.group === 'pd' ? 'majors' : 'tournaments'})`}`, lines.join('\n')]);
    }
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
}
