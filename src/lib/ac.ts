// Small themed autocomplete used instead of the browser's <datalist> popup.
export type AcItem = { label: string; sub?: string; type?: string; cat?: string; value?: string; move?: { pow: number | null; acc: number | true | null; pp: number; desc: string } };
const TC: Record<string, string> = { Normal: '#999870', Fire: '#e0701f', Water: '#2f6fe4', Electric: '#ddb216', Grass: '#5fb33a', Ice: '#5bbdb9', Fighting: '#c22e28', Poison: '#a33ea1', Ground: '#c9a240', Flying: '#8f75e6', Psychic: '#f95587', Bug: '#93a614', Rock: '#a48f2c', Ghost: '#735797', Dragon: '#6f35fc', Dark: '#705746', Steel: '#9393b3', Fairy: '#cc6ca0' };
const LIGHT = new Set(['Normal', 'Electric', 'Grass', 'Ice', 'Ground', 'Flying', 'Bug', 'Rock', 'Steel', 'Fairy']);
// same category icons as the rest of the site (components/Cat.astro)
export const CAT_SVG: Record<string, string> = {
  Physical: '<path d="M15.13,0.60L15.85,3.80L18.98,2.82L17.48,5.73L20.50,7.00L17.48,8.27L18.98,11.18L15.85,10.20L15.13,13.40L13.36,10.64L10.75,12.63L11.17,9.38L7.89,9.22L10.30,7.00L7.89,4.78L11.17,4.62L10.75,1.37L13.36,3.36Z" fill="#fff" stroke="#e2492a" stroke-width="1.15" stroke-linejoin="round"/>',
  Special: '<g transform="rotate(-14 14 7)" fill="none" stroke="#3f6fd6" stroke-width="1.2"><ellipse cx="14" cy="7" rx="8.2" ry="4.6"/><ellipse cx="14" cy="7" rx="5.4" ry="2.9"/><ellipse cx="14" cy="7" rx="2.5" ry="1.3" fill="#3f6fd6"/></g>',
  Status: '<g transform="rotate(-28 14 7)"><ellipse cx="14" cy="7" rx="7.4" ry="4.4" fill="#4d4d4d"/><ellipse cx="15.9" cy="7" rx="5.1" ry="3.6" fill="#ececec"/><ellipse cx="14" cy="7" rx="7.4" ry="4.4" fill="none" stroke="#4d4d4d" stroke-width=".9"/></g>',
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
    // a short box near the right edge (the header search): open the list leftwards so it stays on screen
    const w = box.offsetWidth || parseFloat(box.style.width);
    if (w > input.offsetWidth && (input.id === 'find' || room < w)) box.style.left = (input.offsetLeft + input.offsetWidth - w) + 'px';
  };
  const render = () => {
    box.innerHTML = shown.map((it, i) => `<div class="ac-row${i === active ? ' on' : ''}" role="option" data-i="${i}">` +
      `<span class="ac-l">${esc(it.label)}</span>` +
      (it.sub ? `<span class="ac-s">${esc(it.sub)}</span>` : '') +
      (it.type ? (it.type.includes('/')
        // two types: the small symbol-only icons, side by side
        ? `<span class="ac-ts">${it.type.split('/').map((t) => `<span class="ac-t sym" data-type="${t}" title="${t}">${t}</span>`).join('')}</span>`
        : `<span class="ac-t" data-type="${it.type}" style="background:${TC[it.type]};color:#fff">${it.type}</span>`) : '') +
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
