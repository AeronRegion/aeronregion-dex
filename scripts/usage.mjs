// VGC usage data, saved into src/data/usage/ (run by .github/workflows/usage.yml; `npm run usage`).
// Sources (both public, the same raw data Pikalytics uses):
//   1. Pokémon Showdown monthly usage stats (smogon.com/stats, "chaos" files), every VGC format, highest rating cutoff.
//   2. Limitless VGC tournaments (play.limitlesstcg.com/api): open team sheets from recent tournaments, with win rates.
// Each format file: { id, label, source, period, total, mons: [{ name, usage, n, moves, items, abilities, tera, spreads, mates, wr? }] }
import fs from 'node:fs';

const OUT = 'src/data/usage';
fs.mkdirSync(OUT, { recursive: true });
const UA = { 'user-agent': 'ARdex usage fetch (dex.aeronregion.net)' };
const get = async (url, as = 'json') => { const r = await fetch(url, { headers: UA }); if (!r.ok) throw new Error(`${r.status} ${url}`); return as === 'json' ? r.json() : r.text(); };
const round = (x) => Math.round(x * 100) / 100;
// top entries of a {key: weight} map as [[key, percent]], percent of `total`
const top = (obj, total, n, min = 0.5) => Object.entries(obj ?? {}).map(([k, v]) => [k, round((v / total) * 100)]).filter(([k, p]) => p >= min && k !== 'nothing' && k !== '').sort((a, b) => b[1] - a[1]).slice(0, n);
const index = [];
// team-sheet aggregation (Limitless + official majors): F = { teams, mons: Map }
const addTeam = (F, team, w, l) => {
  F.teams++;
  const names = team.map((x) => x.name);
  for (const x of team) {
    if (!F.mons.has(x.name)) F.mons.set(x.name, { n: 0, w: 0, l: 0, moves: {}, items: {}, abilities: {}, tera: {}, natures: {}, mates: {} });
    const M = F.mons.get(x.name); M.n++; M.w += w; M.l += l;
    const inc = (o, k) => { if (k) o[k] = (o[k] ?? 0) + 1; };
    for (const a of x.moves ?? []) inc(M.moves, a);
    inc(M.items, x.item); inc(M.abilities, x.ability); inc(M.tera, x.tera); inc(M.natures, x.nature);
    for (const o of names) if (o !== x.name) inc(M.mates, o);
  }
};
const sheetMons = (F) => [...F.mons].map(([name, M]) => ({
  name, usage: round((M.n / F.teams) * 100), n: M.n, wr: M.w + M.l ? round((M.w / (M.w + M.l)) * 100) : null,
  moves: top(M.moves, M.n, 12), items: top(M.items, M.n, 8), abilities: top(M.abilities, M.n, 3),
  tera: top(M.tera, M.n, 6), natures: top(M.natures, M.n, 6), spreads: [], mates: top(M.mates, M.n, 10, 1),
})).filter((m) => m.usage >= 0.5).sort((a, b) => b.usage - a.usage);

// ---------- 1. Showdown ----------
try {
  const root = await get('https://www.smogon.com/stats/', 'text');
  const months = [...root.matchAll(/href="(\d{4}-\d{2}(?:-[A-Za-z0-9]+)?)\/"/g)].map((m) => m[1]).filter((m) => /^\d{4}-\d{2}$/.test(m)).sort();
  const month = months.at(-1);
  const list = await get(`https://www.smogon.com/stats/${month}/chaos/`, 'text');
  const files = [...list.matchAll(/href="([a-z0-9]+)-(\d+)\.json"/g)].map((m) => ({ fmt: m[1], cut: +m[2] })).filter((f) => f.fmt.includes('vgc'));
  const best = new Map();
  for (const f of files) if (!best.has(f.fmt) || f.cut > best.get(f.fmt)) best.set(f.fmt, f.cut);
  for (const [fmt, cut] of best) {
    const d = await get(`https://www.smogon.com/stats/${month}/chaos/${fmt}-${cut}.json`);
    const battles = d.info?.['number of battles'] ?? 0;
    if (battles < 500) continue; // too few games to mean anything
    const mons = Object.entries(d.data).map(([name, x]) => {
      const total = Object.values(x.Abilities ?? {}).reduce((a, b) => a + b, 0) || 1;
      return {
        name, usage: round((x.usage ?? 0) * 100), n: x['Raw count'] ?? 0,
        moves: top(x.Moves, total, 12), items: top(x.Items, total, 8), abilities: top(x.Abilities, total, 3),
        tera: top(x['Tera Types'], total, 6), spreads: top(x.Spreads, total, 8, 1), mates: top(x.Teammates, total, 10, 1),
      };
    }).filter((m) => m.usage >= 0.5).sort((a, b) => b.usage - a.usage);
    const id = `sd-${fmt}`;
    fs.writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ id, label: fmt, source: 'Showdown ladder', period: month, cutoff: cut, total: battles, mons }));
    index.push({ id, label: fmt, source: 'Showdown ladder', period: month, cutoff: cut, total: battles });
    console.log('showdown', fmt, cut, battles, mons.length);
  }
} catch (e) { console.error('showdown failed:', e.message); }

// ---------- 2. Limitless tournaments (grassroots, open team sheets) ----------
try {
  const API = 'https://play.limitlesstcg.com/api';
  const since = Date.now() - 45 * 864e5; // last 45 days
  let tours = [];
  for (let page = 1; page <= 15; page++) {
    const batch = await get(`${API}/tournaments?game=VGC&limit=100&page=${page}`);
    if (!batch.length) break;
    tours.push(...batch);
    if (new Date(batch.at(-1).date).getTime() < since) break;
  }
  tours = tours.filter((t) => new Date(t.date).getTime() >= since && (t.players ?? 0) >= 16);
  const byFmt = new Map();
  for (const t of tours) {
    let st; try { st = await get(`${API}/tournaments/${t.id}/standings`); } catch { continue; }
    const teams = st.filter((p) => Array.isArray(p.decklist) && p.decklist.length);
    if (!teams.length) continue;
    const f = t.format || 'unknown';
    if (!byFmt.has(f)) byFmt.set(f, { teams: 0, tours: 0, from: t.date, to: t.date, mons: new Map() });
    const F = byFmt.get(f); F.tours++;
    if (t.date < F.from) F.from = t.date; if (t.date > F.to) F.to = t.date;
    for (const p of teams) addTeam(F, p.decklist.map((x) => ({ name: x.name, moves: x.attacks, item: x.item, ability: x.ability, tera: x.tera, nature: x.nature })), p.record?.wins ?? 0, p.record?.losses ?? 0);
    await new Promise((r) => setTimeout(r, 250)); // be gentle with their API
  }
  for (const [fmt, F] of byFmt) {
    if (F.teams < 32) continue;
    const id = `lt-${fmt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const meta = { id, label: `Reg ${fmt}`, source: 'Limitless tournaments', period: `${F.from.slice(0, 10)} to ${F.to.slice(0, 10)}`, tours: F.tours, total: F.teams };
    fs.writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ ...meta, mons: sheetMons(F) }));
    index.push(meta);
    console.log('limitless', fmt, F.tours, F.teams);
  }
} catch (e) { console.error('limitless failed:', e.message); }

// ---------- 3. Official majors (Regionals, Internationals, Worlds) via Pokedata (RK9 team lists), Masters only ----------
try {
  const PD = 'https://www.pokedata.ovh/standings2';
  const html = await get(`${PD}/`, 'text');
  const events = [...html.matchAll(/class="tournament vg"[^>]*>\s*<div class="title">([^<]+)<\/div>\s*<div class="dates">([^<]*)<\/div>[\s\S]*?name="id" value="(\d+)"/g)].map((m) => ({ title: m[1].trim(), dates: m[2].trim(), id: m[3] }));
  const bySeason = new Map();
  for (const e of events) {
    const season = e.title.match(/^(\d{4})/)?.[1];
    if (!season) continue;
    let st, roster;
    try { st = await get(`${PD}/standings/${e.id}_Masters.json`); roster = await get(`${PD}/RosterData/${e.id}.json`); } catch { continue; }
    const rec = new Map((st.standings?.players ?? []).map((p) => [p.n, p.s ?? [0, 0, 0]]));
    const teams = roster.filter((r) => r.d === 'M' && Array.isArray(r.tl) && r.tl.length);
    if (teams.length < 16) continue;
    if (!bySeason.has(season)) bySeason.set(season, { teams: 0, tours: 0, events: [], mons: new Map() });
    const F = bySeason.get(season); F.tours++; F.events.push(e.title.replace(/^\d{4}\s+/, '').replace(/ Pokémon VGC| Pokémon VG/, ''));
    // tl rows: [dex, form, nature, tera, ability, name, item, moves]
    for (const r of teams) { const s = rec.get(r.n) ?? [0, 0, 0]; addTeam(F, r.tl.map((x) => ({ name: x[5].replace(/ \[[^\]]+\]$/, (f) => (/Form\]$/.test(f) ? '' : f)), nature: x[2], tera: x[3], ability: x[4], item: x[6], moves: x[7] })), s[0], s[1]); }
    await new Promise((r) => setTimeout(r, 300));
  }
  for (const [season, F] of bySeason) {
    const id = `pd-${season}`;
    const meta = { id, label: `${season} season majors`, source: 'Official majors (RK9 team lists via Pokedata)', period: F.events.join(', '), tours: F.tours, total: F.teams };
    fs.writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ ...meta, mons: sheetMons(F) }));
    index.push(meta);
    console.log('majors', season, F.tours, F.teams);
  }
} catch (e) { console.error('majors failed:', e.message); }

if (index.length) fs.writeFileSync(`${OUT}/index.json`, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), formats: index }, null, 1));
else { console.error('no usage data fetched; keeping the old files'); process.exitCode = 1; }
