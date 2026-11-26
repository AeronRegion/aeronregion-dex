// Small themed autocomplete used instead of the browser's <datalist> popup.
export type AcItem = { label: string; sub?: string; type?: string; cat?: string; value?: string; move?: { pow: number | null; acc: number | true | null; pp: number; desc: string } };
const TC: Record<string, string> = { Normal: '#a8a77a', Fire: '#ee8130', Water: '#2f6fe4', Electric: '#f7d02c', Grass: '#7ac74c', Ice: '#96d9d6', Fighting: '#c22e28', Poison: '#a33ea1', Ground: '#e2bf65', Flying: '#a98ff3', Psychic: '#f95587', Bug: '#a6b91a', Rock: '#b6a136', Ghost: '#735797', Dragon: '#6f35fc', Dark: '#705746', Steel: '#b7b7ce', Fairy: '#d685ad' };
const LIGHT = new Set(['Normal', 'Electric', 'Grass', 'Ice', 'Ground', 'Flying', 'Bug', 'Rock', 'Steel', 'Fairy']);
// same category icons as the rest of the site (components/Cat.astro)
export const CAT_SVG: Record<string, string> = {
  Physical: '<rect width="28" height="14" rx="3" fill="#c9482c"/><path d="M14 2.2l1.5 3 3.2-1.1-1.2 3.1 3 1.6-3.3.6.2 3.3-2.6-2-2.6 2 .2-3.3-3.3-.6 3-1.6L9.3 4.1l3.2 1.1z" fill="#ffd34d"/>',
  Special: '<rect width="28" height="14" rx="3" fill="#4f6fc7"/><circle cx="14" cy="7" r="4.6" fill="none" stroke="#dfe7ff" stroke-width="1.4"/><circle cx="14" cy="7" r="2.2" fill="#dfe7ff"/>',
  Status: '<rect width="28" height="14" rx="3" fill="#8a8a8a"/><circle cx="14" cy="7" r="4.4" fill="none" stroke="#f2f2f2" stroke-width="1.4"/><path d="M14 2.6a4.4 4.4 0 0 1 0 8.8z" fill="#f2f2f2"/>',
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// openEmpty: clicking or focusing the box lists every item (scrollable), and typing narrows it down
export function autocomplete(input: HTMLInputElement, getItems: () => Promise<AcItem[]> | AcItem[], onPick: (item: AcItem) => void, max = 12, openEmpty = false) {
  input.removeAttribute('list');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('role', 'combobox');
  const box = document.createElement('div');
  box.className = 'ac'; box.hidden = true; box.setAttribute('role', 'listbox');
  input.parentElement!.style.position ||= 'relative';
  input.insertAdjacentElement('afterend', box);
  let items: AcItem[] = [], shown: AcItem[] = [], active = -1;
  const place = () => {
    box.style.left = input.offsetLeft + 'px'; box.style.top = input.offsetTop + input.offsetHeight + 'px';
    const rich = shown.some((it) => it.move); box.classList.toggle('ac-rich', rich);
    // move lists get Showdown-style detail columns, so they need more room (kept inside the window)
    const room = document.documentElement.clientWidth - input.getBoundingClientRect().left - 8;
    box.style.width = (rich ? Math.max(input.offsetWidth, Math.min(640, room)) : Math.max(input.offsetWidth, 260)) + 'px';
  };
  const render = () => {
    box.innerHTML = shown.map((it, i) => `<div class="ac-row${i === active ? ' on' : ''}" role="option" data-i="${i}">` +
      `<span class="ac-l">${esc(it.label)}</span>` +
      (it.sub ? `<span class="ac-s">${esc(it.sub)}</span>` : '') +
      (it.type ? `<span class="ac-t" style="background:${TC[it.type]};color:${LIGHT.has(it.type) ? '#2e1a20' : '#fff'}">${it.type}</span>` : '') +
      (it.cat ? `<span class="ac-c" title="${it.cat}"><svg viewBox="0 0 28 14" width="30" height="15" aria-label="${it.cat}" role="img">${CAT_SVG[it.cat] ?? ''}</svg></span>` : '') +
      (it.move ? `<span class="ac-n"><small>Pow</small>${it.move.pow ?? '—'}</span><span class="ac-n"><small>Acc</small>${it.move.acc === true ? '—' : it.move.acc ?? '—'}</span><span class="ac-n"><small>PP</small>${it.move.pp}</span><span class="ac-d">${esc(it.move.desc)}</span>` : '') +
      `</div>`).join('');
    box.hidden = shown.length === 0; place();
    box.querySelector('.ac-row.on')?.scrollIntoView({ block: 'nearest' });
  };
  const update = async () => {
    items = await getItems();
    const q = input.value.trim().toLowerCase();
    if (!q) { shown = openEmpty ? items.slice() : []; active = -1; render(); return; }
    const starts = items.filter((it) => it.label.toLowerCase().startsWith(q));
    const has = items.filter((it) => !it.label.toLowerCase().startsWith(q) && it.label.toLowerCase().includes(q));
    shown = [...starts, ...has].slice(0, openEmpty ? 400 : max); active = shown.length ? 0 : -1; render();
  };
  const pick = (i: number) => { const it = shown[i]; if (!it) return; input.value = it.label; shown = []; render(); onPick(it); };
  input.addEventListener('input', update);
  const showAll = async () => { items = await getItems(); shown = items.slice(); active = shown.findIndex((it) => it.label === input.value); render(); };
  input.addEventListener('focus', () => { if (openEmpty) { input.select(); showAll(); } else if (input.value) update(); });
  input.addEventListener('mousedown', () => { if (openEmpty && document.activeElement === input && box.hidden) showAll(); });
  input.addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'ArrowDown') { active = (active + 1) % shown.length; render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = (active - 1 + shown.length) % shown.length; render(); e.preventDefault(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') { shown = []; render(); }
  });
  box.addEventListener('mousedown', (e) => { const row = (e.target as HTMLElement).closest<HTMLElement>('.ac-row'); if (row) { e.preventDefault(); pick(+row.dataset.i!); } });
  input.addEventListener('blur', () => setTimeout(() => { shown = []; render(); }, 120));
}
