// Small themed autocomplete used instead of the browser's <datalist> popup.
export type AcItem = { label: string; sub?: string; type?: string; cat?: string; value?: string; move?: { pow: number | null; acc: number | true | null; pp: number; desc: string } };
const TC: Record<string, string> = { Normal: '#999870', Fire: '#e0701f', Water: '#2f6fe4', Electric: '#ddb216', Grass: '#5fb33a', Ice: '#5bbdb9', Fighting: '#c22e28', Poison: '#a33ea1', Ground: '#c9a240', Flying: '#8f75e6', Psychic: '#f95587', Bug: '#93a614', Rock: '#a48f2c', Ghost: '#735797', Dragon: '#6f35fc', Dark: '#705746', Steel: '#9393b3', Fairy: '#cc6ca0' };
const LIGHT = new Set(['Normal', 'Electric', 'Grass', 'Ice', 'Ground', 'Flying', 'Bug', 'Rock', 'Steel', 'Fairy']);
// same category icons as the rest of the site (components/Cat.astro)
export const CAT_SVG: Record<string, string> = {
  Physical: '<path d="M14 .6l1.6 3.4 3.6-1.5-1.1 3.7 3.7 1.3-3.5 1.6 1.6 3.5-3.7-1.1L14 14.6l-1.2-3.1-3.7 1.1 1.6-3.5-3.5-1.6 3.7-1.3-1.1-3.7 3.6 1.5z" fill="#e8562a"/><circle cx="14" cy="7.6" r="2.6" fill="#ffd24a"/>',
  Special: '<circle cx="14" cy="7" r="6.3" fill="#5b79c9"/><circle cx="14" cy="7" r="4.1" fill="none" stroke="#e4ebff" stroke-width="1.3"/><circle cx="14" cy="7" r="1.7" fill="#e4ebff"/>',
  Status: '<circle cx="14" cy="7" r="6.3" fill="#9a9a9a"/><circle cx="14" cy="7" r="4.2" fill="#f4f4f4"/><path d="M14 2.8a4.2 4.2 0 0 1 0 8.4z" fill="#9a9a9a"/>',
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
      (it.type ? `<span class="ac-t" data-type="${it.type}" style="background:${TC[it.type]};color:#fff">${it.type}</span>` : '') +
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
