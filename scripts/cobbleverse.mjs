// Reads Cobbleverse's own data (Cobblemon jar + Mega Showdown jar + COBBLEVERSE datapack) and writes
// .cache/cobbleverse.json, which `npm run data` merges into the site.
//
// Usage: node scripts/cobbleverse.mjs <version> <cobblemon dir> [<more dirs> ...]
//   Each dir is an extracted jar/zip (the folder that contains data/cobblemon/...).
//   List them in load order: later ones override earlier ones, like datapacks do in game.
//   e.g. node scripts/cobbleverse.mjs 1.8.0 x/cobblemon x/mega x/dp
import fs from 'node:fs';
import path from 'node:path';

const [version, ...layers] = process.argv.slice(2);
if (!version || !layers.length) { console.error('usage: node scripts/cobbleverse.mjs <version> <dir> [dir...]'); process.exit(1); }

const toID = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.json') ? [path.join(dir, e.name)] : []) : [];
const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const pretty = (s) => String(s).replace(/^#/, '').replace(/^[a-z_]+:/, '').replace(/^(is|has)_/, '').replace(/\//g, ' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Cobblemon form names → Showdown forme suffixes
const FORM = { alolan: 'alola', alola: 'alola', galarian: 'galar', galar: 'galar', hisuian: 'hisui', hisui: 'hisui', paldean: 'paldea', paldea: 'paldea' };

// ── species: base files, then overrides by file name, then species_additions ──
const speciesFiles = new Map();
for (const dir of layers) for (const f of walk(path.join(dir, 'data/cobblemon/species'))) speciesFiles.set(path.basename(f), f);
const species = new Map();
for (const f of speciesFiles.values()) { const d = read(f); if (d?.name) species.set(toID(d.name), d); }
for (const dir of layers) for (const f of walk(path.join(dir, 'data/cobblemon/species_additions'))) {
  const a = read(f); if (!a?.target) continue;
  const d = species.get(toID(a.target.split(':').pop())); if (!d) continue;
  for (const [k, v] of Object.entries(a)) {
    if (k === 'target') continue;
    if (k === 'forms' && Array.isArray(d.forms)) { // forms merge by name
      for (const fo of v) { const i = d.forms.findIndex((x) => x.name === fo.name); if (i >= 0) d.forms[i] = { ...d.forms[i], ...fo }; else d.forms.push(fo); }
    } else d[k] = v;
  }
}

const learnsets = {}; const out = {};
const parseMoves = (list) => {
  const res = {};
  for (const m of list ?? []) {
    const [how, move] = m.split(':'); if (!move) continue;
    (res[toID(move)] ??= []).push(how);
  }
  return res;
};
const drops = (d) => d?.entries?.length ? d.entries.map((e) => `${pretty(e.item)}${e.percentage ? ` (${e.percentage}%)` : e.quantityRange ? ` ×${e.quantityRange}` : ''}`).join(', ') : null;
for (const [id, d] of species) {
  if (d.implemented === false) continue;
  learnsets[id] = parseMoves(d.moves);
  out[id] = { spawns: [], drops: drops(d.drops) };
  for (const fo of d.forms ?? []) {
    const fid = id + (FORM[toID(fo.name)] ?? toID(fo.name));
    learnsets[fid] = fo.moves ? parseMoves(fo.moves) : learnsets[id];
    out[fid] = { spawns: [], drops: drops(fo.drops ?? d.drops) };
  }
}

// ── spawns: spawn_pool_world files, overridden by file name ──
const poolFiles = new Map();
for (const dir of layers) for (const f of walk(path.join(dir, 'data/cobblemon/spawn_pool_world'))) poolFiles.set(path.basename(f), f);
const time = { day: 'Day', night: 'Night', morning: 'Morning', noon: 'Noon', dusk: 'Dusk', twilight: 'Twilight', midnight: 'Midnight' };
let nSpawns = 0;
for (const f of poolFiles.values()) {
  const pool = read(f); if (!pool || pool.enabled === false) continue;
  for (const s of pool.spawns ?? []) {
    if (s.type && s.type !== 'pokemon') continue;
    const [name, ...aspects] = String(s.pokemon ?? '').split(' ');
    let id = toID(name);
    const form = aspects.map((a) => FORM[toID(a.split('=').pop())]).find(Boolean);
    if (form && out[id + form]) id += form;
    if (!out[id]) continue;
    const c = s.condition ?? {}; const a = s.anticondition ?? {};
    const conds = [];
    if (c.canSeeSky === true) conds.push('Can see sky'); if (c.canSeeSky === false) conds.push('Under cover');
    if (c.minY != null || c.maxY != null) conds.push(`Y ${c.minY ?? '…'} to ${c.maxY ?? '…'}`);
    if (c.structures?.length) conds.push(`Near ${c.structures.map(pretty).join(', ')}`);
    if (c.dimensions?.length) conds.push(c.dimensions.map(pretty).join(', '));
    if (c.moonPhase != null) conds.push(`Moon phase ${c.moonPhase}`);
    if (c.minLureLevel) conds.push(`Lure level ${c.minLureLevel}+`);
    if (c.rodType) conds.push(pretty(c.rodType));
    if (c.bait) conds.push(`Bait: ${pretty(c.bait)}`);
    if (c.neededNearbyBlocks?.length) conds.push(`Near ${c.neededNearbyBlocks.map(pretty).join(', ')}`);
    if (a.biomes?.length) conds.push(`Not in ${a.biomes.map(pretty).join(', ')}`);
    if (a.structures?.length) conds.push(`Not near ${a.structures.map(pretty).join(', ')}`);
    out[id].spawns.push({
      bucket: pretty(s.bucket ?? ''), levels: s.level ?? '', weight: s.weight ?? null,
      biomes: c.biomes?.length ? c.biomes.map(pretty).join(', ') : 'Any',
      time: c.timeRange ? (time[c.timeRange] ?? pretty(c.timeRange)) : null,
      weather: c.isThundering ? 'Thunderstorm' : c.isRaining === true ? 'Rain' : c.isRaining === false ? 'Clear' : null,
      context: pretty(s.spawnablePositionType ?? s.context ?? 'grounded'),
      sky: c.minSkyLight != null || c.maxSkyLight != null ? `${c.minSkyLight ?? 0}–${c.maxSkyLight ?? 15}` : null,
      conditions: conds.join(' · ') || null,
      presets: s.presets ?? [],
    });
    nSpawns++;
  }
}
const order = { 'Common': 0, 'Uncommon': 1, 'Rare': 2, 'Ultra Rare': 3 };
for (const v of Object.values(out)) v.spawns.sort((x, y) => (order[x.bucket] ?? 9) - (order[y.bucket] ?? 9));

fs.mkdirSync('.cache', { recursive: true });
fs.writeFileSync('.cache/cobbleverse.json', JSON.stringify({ version, species: out, learnsets, items: {} }));
console.log(`cobbleverse ${version}: ${Object.keys(out).length} species/forms, ${nSpawns} spawn entries`);
