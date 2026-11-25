// Builds the JSON the site reads (src/data/*.json) from:
//   • Pokémon Showdown data via @pkmn/dex (MIT): species, moves, items, learnsets, descriptions
//   • PokéAPI CSVs (BSD-3): EV yield, catch rate, growth, egg cycles, height, dex entries, game locations, item text
//   • Cobbleverse pack files, when present in .cache/cobbleverse/ (see README): spawns, Cobblemon movepools
// Run: npm run data   (downloads the PokéAPI CSVs into .cache/ if they're missing)
import { Dex } from '@pkmn/dex';
import { parse } from 'csv-parse/sync';
import fs from 'node:fs';

const CACHE = '.cache';
const OUT = 'src/data';
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const CSVS = ['pokemon', 'pokemon_species', 'pokemon_stats', 'pokemon_species_flavor_text', 'versions', 'version_names',
  'encounters', 'encounter_slots', 'encounter_methods', 'location_areas', 'location_area_prose', 'locations', 'location_names',
  'growth_rate_prose', 'item_prose', 'items'];
async function csv(name) {
  const f = `${CACHE}/${name}.csv`;
  if (!fs.existsSync(f)) {
    const r = await fetch(`https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`);
    if (!r.ok) throw new Error(`download failed: ${name}`);
    fs.writeFileSync(f, await r.text());
  }
  return parse(fs.readFileSync(f), { columns: true, skip_empty_lines: true });
}
const T = Object.fromEntries(await Promise.all(CSVS.map(async (n) => [n, await csv(n)])));
const EN = '9';
const by = (rows, key) => { const m = new Map(); for (const r of rows) { const k = r[key]; (m.get(k) ?? m.set(k, []).get(k)).push(r); } return m; };

// ── PokéAPI lookups ──────────────────────────────────────────────────────
const apiPokemon = new Map(T.pokemon.map((r) => [r.identifier.replace(/-/g, ''), r]));
const apiSpecies = new Map(T.pokemon_species.map((r) => [r.id, r]));
const statsBy = by(T.pokemon_stats, 'pokemon_id');
const STATN = { 1: 'HP', 2: 'Atk', 3: 'Def', 4: 'SpA', 5: 'SpD', 6: 'Spe' };
const growth = Object.fromEntries(T.growth_rate_prose.filter((r) => r.local_language_id === EN).map((r) => [r.growth_rate_id, r.name]));
const versionName = Object.fromEntries(T.version_names.filter((r) => r.local_language_id === EN).map((r) => [r.version_id, r.name]));
const versionOrder = Object.fromEntries(T.versions.map((r) => [r.id, +r.id]));
const flavorBy = by(T.pokemon_species_flavor_text.filter((r) => r.language_id === EN), 'species_id');
const areaName = Object.fromEntries(T.location_area_prose.filter((r) => r.local_language_id === EN).map((r) => [r.location_area_id, r.name]));
const locName = Object.fromEntries(T.location_names.filter((r) => r.local_language_id === EN).map((r) => [r.location_id, r.name]));
const areaLoc = Object.fromEntries(T.location_areas.map((r) => [r.id, r.location_id]));
const encBy = by(T.encounters, 'pokemon_id');

const apiById = new Map(T.pokemon.map((r) => [r.id, r]));
function apiFor(sp) {
  return apiPokemon.get(sp.id) ?? (sp.forme ? null : apiById.get(String(sp.num)))
    ?? apiPokemon.get(Dex.species.get(sp.baseSpecies).id) ?? apiById.get(String(sp.num));
}
function locations(apiId) {
  const byGame = new Map();
  for (const e of encBy.get(apiId) ?? []) {
    const g = versionName[e.version_id]; if (!g) continue;
    const place = locName[areaLoc[e.location_area_id]] ?? areaName[e.location_area_id];
    if (!place) continue;
    (byGame.get(e.version_id) ?? byGame.set(e.version_id, new Set()).get(e.version_id)).add(place);
  }
  // newest games first, merge games that share the same list (Red/Blue, Sword/Shield…)
  const rows = [...byGame].sort((a, b) => versionOrder[b[0]] - versionOrder[a[0]]).map(([v, s]) => ({ game: versionName[v], places: [...s].sort() }));
  const merged = [];
  for (const r of rows) {
    const same = merged.find((m) => m.places.join('|') === r.places.join('|'));
    if (same) same.games.unshift(r.game); else merged.push({ games: [r.game], places: r.places });
  }
  return merged.map((m) => ({ game: m.games.join(', '), places: m.places }));
}
function dexEntries(speciesId) {
  const seen = new Set(); const out = [];
  const rows = (flavorBy.get(speciesId) ?? []).sort((a, b) => versionOrder[b.version_id] - versionOrder[a.version_id]);
  for (const r of rows) {
    const t = r.flavor_text.replace(/[\f\n­]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (seen.has(t)) { const o = out.find((x) => x.text === t); if (o && o.games.length < 4) o.games.push(versionName[r.version_id]); continue; }
    seen.add(t); out.push({ games: [versionName[r.version_id]], text: t });
  }
  return out.slice(0, 6).map((o) => ({ game: o.games.join(' / '), text: o.text }));
}

// ── Cobbleverse layer (optional) ─────────────────────────────────────────
// Filled in once the pack files are extracted to .cache/cobbleverse/ — see scripts/cobbleverse.mjs
const cobble = fs.existsSync(`${CACHE}/cobbleverse.json`) ? JSON.parse(fs.readFileSync(`${CACHE}/cobbleverse.json`)) : null;

// ── Species ──────────────────────────────────────────────────────────────
const OK = (s) => s.exists && [undefined, null, 'Past', 'Future'].includes(s.isNonstandard ?? null) && !/Gmax|Totem/.test(s.forme) && s.num > 0;
// Forms that only change looks (Vivillon patterns, Arceus plates, Pikachu caps…) have the same stats and
// abilities as the base, so they're folded into the base page. Tera-only forms are battle states, not Pokémon.
const same = (a, b) => JSON.stringify(a.baseStats) === JSON.stringify(b.baseStats) && JSON.stringify(a.abilities) === JSON.stringify(b.abilities);
const species = Dex.species.all().filter(OK)
  .filter((s) => !/(^|-)Tera$|Terastal|Stellar/.test(s.forme))
  .filter((s) => !s.forme || !same(s, Dex.species.get(s.baseSpecies)) || /Mega|Primal/.test(s.forme))
  .sort((a, b) => a.num - b.num || (a.forme ? 1 : 0) - (b.forme ? 1 : 0));
const ids = new Set(species.map((s) => s.id));

const learnsets = {};
for (const s of species) {
  let ls = (await Dex.learnsets.get(s.id))?.learnset;
  if (!ls || !Object.keys(ls).length) ls = (await Dex.learnsets.get(s.changesFrom ? Dex.species.get(s.changesFrom).id : Dex.species.get(s.baseSpecies).id))?.learnset;
  learnsets[s.id] = ls ?? {};
}

function evoLabel(s) {
  if (!s.prevo) return null;
  if (s.evoType === 'useItem') return s.evoItem;
  if (s.evoType === 'trade') return s.evoItem ? `Trade holding ${s.evoItem}` : 'Trade';
  if (s.evoType === 'levelFriendship') return `High friendship${s.evoCondition ? ', ' + s.evoCondition : ''}`;
  if (s.evoType === 'levelMove') return `Level up knowing ${s.evoMove}`;
  if (s.evoType === 'levelHold') return `Level up holding ${s.evoItem}`;
  if (s.evoType === 'levelExtra' || s.evoType === 'other') return s.evoCondition ?? 'Special';
  if (s.evoLevel) return `Lv. ${s.evoLevel}${s.evoCondition ? ', ' + s.evoCondition : ''}`;
  return s.evoCondition ?? 'Level up';
}
function chain(s) {
  let root = Dex.species.get(s.baseSpecies);
  while (root.prevo) root = Dex.species.get(root.prevo);
  const stages = [];
  const walk = (sp, depth) => {
    (stages[depth] ??= []).push({ id: sp.id, name: sp.name, num: sp.num, types: sp.types, how: evoLabel(sp), art: apiFor(sp)?.id });
    for (const e of sp.evos ?? []) { const n = Dex.species.get(e); if (OK(n)) walk(n, depth + 1); }
  };
  walk(root, 0);
  return stages.length > 1 ? stages : [];
}

const out = species.map((s) => {
  const api = apiFor(s);
  const spec = api && apiSpecies.get(api.species_id);
  const ev = (statsBy.get(api?.id) ?? []).filter((r) => +r.effort > 0).map((r) => `${r.effort} ${STATN[r.stat_id]}`);
  const gr = spec ? +spec.gender_rate : null;
  const gender = gr === -1 ? 'Genderless' : gr === null ? null : gr === 0 ? '100% ♂' : gr === 8 ? '100% ♀' : `${100 - gr * 12.5}% ♂ · ${gr * 12.5}% ♀`;
  const cv = cobble?.species?.[s.id];
  return {
    id: s.id, num: s.num, name: s.name, baseSpecies: s.baseSpecies, forme: s.forme || null,
    types: s.types, stats: s.baseStats, bst: s.bst, abilities: s.abilities,
    tier: s.tier, doublesTier: s.doublesTier, natDexTier: s.natDexTier,
    eggGroups: s.eggGroups, gender, weight: s.weightkg, height: api ? +api.height / 10 : null,
    ev, catchRate: spec ? +spec.capture_rate : null, friendship: spec ? +spec.base_happiness : null,
    baseExp: api?.base_experience ? +api.base_experience : null, growth: spec ? growth[spec.growth_rate_id].replace(/\b\w/g, (c) => c.toUpperCase()) : null,
    eggCycles: spec ? +spec.hatch_counter : null,
    art: api?.id ?? null, gen: s.gen,
    evo: chain(s),
    dex: spec ? dexEntries(spec.id) : [],
    locations: api ? locations(api.id) : [],
    cobbleverse: cv ? { spawns: cv.spawns ?? [], drops: cv.drops ?? null } : null,
  };
});

// ── Moves ────────────────────────────────────────────────────────────────
const TARGET = {
  normal: 'One adjacent Pokémon', adjacentFoe: 'One adjacent foe', allAdjacentFoes: 'All adjacent foes', allAdjacent: 'All adjacent Pokémon',
  self: 'User', adjacentAlly: 'Adjacent ally', adjacentAllyOrSelf: 'User or adjacent ally', allySide: "User's side", foeSide: "Foes' side",
  allyTeam: "User's team", allies: 'User and allies', all: 'Entire field', any: 'Any Pokémon', randomNormal: 'Random adjacent foe', scripted: 'Varies',
};
const moves = Dex.moves.all().filter((m) => m.exists && !m.isZ && !m.isMax && !['CAP', 'Custom', 'LGPE'].includes(m.isNonstandard))
  .map((m) => ({
    id: m.id, name: m.name, type: m.type, cat: m.category, power: m.basePower || null, acc: m.accuracy === true ? null : m.accuracy,
    pp: m.pp, maxpp: Math.floor(m.pp * 1.6), pri: m.priority, target: TARGET[m.target] ?? m.target, targetKey: m.target,
    contact: !!m.flags.contact, gen: m.gen, desc: m.desc || m.shortDesc, short: m.shortDesc,
    flags: Object.keys(m.flags), past: m.isNonstandard === 'Past',
  })).sort((a, b) => a.name.localeCompare(b.name));
const moveIds = new Set(moves.map((m) => m.id));

// ── Learnsets → compact per-species lists + move→species index ──────────
// source code: "9L12" = gen 9 level 12; M = TM, T = tutor, E = egg, S = event, D = dream world, V = transfer
const learn = {}; const learnedBy = {};
for (const s of species) {
  const list = [];
  const cvMoves = cobble?.learnsets?.[s.id];
  for (const [mid, src] of Object.entries(learnsets[s.id])) {
    if (!moveIds.has(mid)) continue;
    list.push([mid, src]);
  }
  if (cvMoves) for (const [mid, how] of Object.entries(cvMoves)) {
    if (!moveIds.has(mid)) continue;
    const row = list.find((r) => r[0] === mid);
    const code = how.map((h) => 'C' + h);
    if (row) row[1] = [...code, ...row[1]]; else list.push([mid, code]);
  }
  learn[s.id] = list;
  for (const [mid, src] of list) {
    let mask = 0;
    for (const c of src) mask |= c[0] === 'C' ? 1 : 1 << +c[0];
    (learnedBy[mid] ??= []).push([s.id, mask]);
  }
}

// ── Items ────────────────────────────────────────────────────────────────
const itemProse = Object.fromEntries(T.item_prose.filter((r) => r.local_language_id === EN).map((r) => [r.item_id, r]));
const apiItems = new Map(T.items.map((r) => [r.identifier.replace(/-/g, ''), r]));
const items = Dex.items.all().filter((i) => i.exists && !['CAP', 'Custom', 'LGPE'].includes(i.isNonstandard)).map((i) => {
  const api = apiItems.get(i.id);
  const pr = api && itemProse[api.id];
  return {
    id: i.id, name: i.name, gen: i.gen, desc: i.desc || i.shortDesc,
    effect: pr ? pr.short_effect.replace(/\s+/g, ' ') : null,
    fling: i.fling?.basePower ?? null, icon: api?.identifier ?? null, past: i.isNonstandard === 'Past',
    megaStone: i.megaStone ? Object.values(i.megaStone)[0] : null, cost: api && +api.cost ? +api.cost : null,
    cobbleverse: cobble?.items?.[i.id] ?? null,
  };
}).sort((a, b) => a.name.localeCompare(b.name));

// ── Abilities ────────────────────────────────────────────────────────────
const abilities = Dex.abilities.all().filter((a) => a.exists && a.num > 0 && !['CAP', 'Custom'].includes(a.isNonstandard)).map((a) => ({
  id: a.id, name: a.name, gen: a.gen, desc: a.desc || a.shortDesc, short: a.shortDesc || a.desc,
  holders: out.filter((s) => Object.values(s.abilities).includes(a.name)).map((s) => [s.id, s.abilities.H === a.name ? 'H' : 'N']),
})).sort((a, b) => a.name.localeCompare(b.name));
const write = (n, d) => fs.writeFileSync(`${OUT}/${n}.json`, JSON.stringify(d));
write('species', out); write('abilities', abilities); write('moves', moves); write('items', items); write('learn', learn); write('learnedBy', learnedBy);
// names for the header search box
const sl = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/['’.:%]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const moveNames = new Set(moves.map((m) => m.name)), monNames = new Set(out.map((s) => s.name));
// one page per Pokédex number; forms are #anchors on it
const firstOfNum = new Map(); for (const s of out) if (!firstOfNum.has(s.num) || !s.forme) if (!firstOfNum.has(s.num) || firstOfNum.get(s.num).forme) firstOfNum.set(s.num, s);
const urlOf = (s) => { const b = firstOfNum.get(s.num); return `/pokemon/${sl(b.name)}/${b.id !== s.id && s.forme ? '#' + sl(s.forme) : ''}`; };
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/names.json', JSON.stringify([
  ...out.map((s) => [s.name, urlOf(s)]),
  ...moves.map((m) => [monNames.has(m.name) ? `${m.name} (move)` : m.name, `/moves/${sl(m.name)}/`]),
  ...abilities.map((a) => [monNames.has(a.name) || moveNames.has(a.name) ? `${a.name} (ability)` : a.name, `/abilities/${sl(a.name)}/`]),
  ...items.map((i) => [monNames.has(i.name) || moveNames.has(i.name) ? `${i.name} (item)` : i.name, `/items/${sl(i.name)}/`]),
]));
// compact index for the moveset search page: species list + move → [speciesIndex, genMask, …]
const idx = new Map(out.map((s, i) => [s.id, i]));
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/search-index.json', JSON.stringify({
  species: out.map((s) => [s.id, s.name, s.types, s.art, s.num, urlOf(s)]),
  moves: Object.fromEntries(moves.map((m) => [m.id, [m.name, m.type, m.cat]])),
  learn: Object.fromEntries(Object.entries(learnedBy).map(([m, l]) => [m, l.flatMap(([sid, mask]) => [idx.get(sid), mask])])),
}));
write('meta', { cobbleverse: cobble ? cobble.version : null, built: new Date().toISOString().slice(0, 10) });
console.log(`species ${out.length}, moves ${moves.length}, items ${items.length}, cobbleverse ${cobble ? 'yes' : 'no'}`);
