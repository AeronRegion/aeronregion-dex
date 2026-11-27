// Small themed autocomplete used instead of the browser's <datalist> popup.
export type AcItem = { label: string; sub?: string; type?: string; cat?: string; value?: string; move?: { pow: number | null; acc: number | true | null; pp: number; desc: string } };
const TC: Record<string, string> = { Normal: '#999870', Fire: '#e0701f', Water: '#2f6fe4', Electric: '#ddb216', Grass: '#5fb33a', Ice: '#5bbdb9', Fighting: '#c22e28', Poison: '#a33ea1', Ground: '#c9a240', Flying: '#8f75e6', Psychic: '#f95587', Bug: '#93a614', Rock: '#a48f2c', Ghost: '#735797', Dragon: '#6f35fc', Dark: '#705746', Steel: '#9393b3', Fairy: '#cc6ca0' };
const LIGHT = new Set(['Normal', 'Electric', 'Grass', 'Ice', 'Ground', 'Flying', 'Bug', 'Rock', 'Steel', 'Fairy']);
// same category icons as the rest of the site (components/Cat.astro)
export const CAT_SVG: Record<string, string> = {
  Physical: '<path d="M14.00,0.40L15.24,3.20L17.88,1.66L17.24,4.65L20.28,4.96L18.00,7.00L20.28,9.04L17.24,9.35L17.88,12.34L15.24,10.80L14.00,13.60L12.76,10.80L10.12,12.34L10.76,9.35L7.72,9.04L10.00,7.00L7.72,4.96L10.76,4.65L10.12,1.66L12.76,3.20Z" fill="#f6a04a" stroke="#c8331d" stroke-width="1.1" stroke-linejoin="round"/><path d="M14.00,3.80L14.73,5.24L16.26,4.74L15.76,6.27L17.20,7.00L15.76,7.73L16.26,9.26L14.73,8.76L14.00,10.20L13.27,8.76L11.74,9.26L12.24,7.73L10.80,7.00L12.24,6.27L11.74,4.74L13.27,5.24Z" fill="#fff1b8"/>',
  Special: '<g transform="rotate(-12 14 7)" fill="none" stroke="#3a64cf" stroke-width="1.25"><ellipse cx="14" cy="7" rx="8.6" ry="5"/><ellipse cx="14" cy="7" rx="5.6" ry="3.2"/><ellipse cx="14" cy="7" rx="2.6" ry="1.5" fill="#3a64cf"/></g>',
  Status: '<circle cx="14" cy="7" r="5.6" fill="#e2e2e2" stroke="#6f6f6f" stroke-width="1.1"/><path d="M14 1.4a5.6 5.6 0 0 0 0 11.2a3.4 5.6 0 0 1 0-11.2z" fill="#7a7a7a"/>',
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
