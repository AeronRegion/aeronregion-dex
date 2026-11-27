// Finds links to pages that don't exist in the built site (run after `npm run build`): `npm run check:links`.
// Checks every href="/..." in dist/**/index.html, plus the move/item/ability/Pokémon links on the VGC usage pages.
import fs from 'node:fs';
import path from 'node:path';

const DIST = 'dist';
const has = (u) => fs.existsSync(path.join(DIST, u.split('#')[0], u.endsWith('/') || u.includes('#') ? '' : '/', 'index.html'));
const slug = (n) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/♀/g, '-f').replace(/♂/g, '-m').replace(/['’.:%]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dead = new Map();
const add = (u, from) => { if (!dead.has(u)) dead.set(u, from); };
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (e.name !== 'index.html') continue;
    const h = fs.readFileSync(p, 'utf8');
    for (const m of h.matchAll(/href="(\/[^"?]*)"/g)) {
      const u = m[1];
      if (u.startsWith('/_astro') || /\.\w+$/.test(u.split('#')[0]) || u.includes('${')) continue;
      if (!has(u)) add(u, p);
    }
    const j = h.match(/id="udata"[^>]*>([\s\S]*?)<\/script>/);
    if (j) {
      for (const mon of JSON.parse(j[1]).mons) {
        if (mon.url && !has(mon.url)) add(mon.url, p);
        for (const [n, , , , ok] of mon.mv) if (ok && !has(`/moves/${slug(n)}/`)) add(`/moves/${slug(n)}/`, p);
        for (const [n, , , ok] of mon.it) if (ok && !has(`/items/${slug(n)}/`)) add(`/items/${slug(n)}/`, p);
        for (const [n, , ok] of mon.ab) if (ok && !has(`/abilities/${slug(n)}/`)) add(`/abilities/${slug(n)}/`, p);
      }
    }
  }
};
walk(DIST);
if (dead.size) { for (const [u, from] of dead) console.log(`DEAD ${u}  (on ${from})`); process.exitCode = 1; }
else console.log('No dead links.');
