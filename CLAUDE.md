# ARdex (dex.aeronregion.net)

Pokémon database for the Aeron Region Cobbleverse server. Combines the best of
PokemonDB (ease of use), Bulbapedia (accurate movesets) and Smogon/Showdown (data).
Neutral and non-salesy. Linked from aeronregion.net; lives in its own repo.

## Stack
- Repo: AeronRegion/aeronregion-dex, Astro site, Cloudflare Workers Builds (auto-deploy on push to main; the commit's check run shows when it's live)
- Data: @pkmn/dex, processed by scripts/prepare.mjs into JSON (`npm run data`)
- Default movepool: Cobbleverse. Spawns, drops and movepools come from the Cobbleverse pack files (scripts/cobbleverse.mjs); see README
- Build: `npm run build` (astro build)

## Working rules (READ FIRST)
- git pull before any change.
- EDIT existing files. Never rewrite a whole file from scratch; that is how past changes got reverted.
- Before changing anything visual, check "Locked decisions" below. If a request conflicts with one, ask first.
- After every change: add a line to docs/changelog.md, and if it was a design decision, add it below.
- Before pushing any visual change: `npm run build && npm run check:mobile`. It opens the main pages at iPhone size (390px) and fails if anything runs off the screen or needs sideways scrolling; look at the screenshots it saves in .cache/mobile/ too. Don't push until it passes. New pages go in its PAGES list.
- Verify on the live site after deploy (hard refresh: Ctrl+Shift+R).
- Table rows keep one height: extra info (multi-hit ×2–5, notes) goes inline on the same line, never stacked under a value.
- Review every new or changed page for alignment before pushing: numbers right-aligned with tabular figures, columns lined up row to row (fixed widths, not content-sized), labels and values on the same baseline, no bars or chips that shift per row. Look at the screenshot at desktop width and at 390px.
- Every clickable box (buttons, dropdowns, toggles, selectable rows) must show interaction: hover (border/background change), press (inset), and keyboard focus (blue outline). Check each new control by hovering and clicking it before pushing; a button that looks the same on hover is a bug.
- Click every button and link you add (in the local build) and confirm it does what its label says before pushing. A button that only toggles a row or opens a tab without showing anything new is a bug.
- Pages that are mostly data (tables, usage) may use the wide container (1500px); everything else stays 1180px.

## Locked decisions
### Global
- Look: light-blue, Showdown-like utility style (thin 1px borders, little bold). Body text Segoe UI/system; the "ARdex" logo text stays heavy Rubik. Site must not look AI-built.
- Dark mode: neutral grays, toggled in the header; the `theme` cookie on .aeronregion.net is shared with the main site.
- Links are blue. Underlined only inside sentences; elsewhere underline on hover. Pokémon names are never underlined.
- Type labels: the rounded Scarlet & Violet type icons from PokeAPI (sprites/types/generation-ix/scarlet-violet/<id>.png, type symbol + name), 80x16 everywhere, via `data-type` on .chip/.tchip/.ac-t (CSS in global.css). Every new type label must carry data-type. Pokémon cards show types as colored text ("#0131 / Water · Ice").
- Pokémon tables and cards use the small box icons (PokemonDB style).
- Name is "ARdex" (header, tab titles, footer). "arDB" rebrand is undecided; don't change it.
- Top bar on every page (blue in light mode, dark in dark mode): Pokémon ▾, Tools ▾, light/dark toggle, Aeron Region link, search. NO Home tab; the logo links home.
- Dates are written "07 NOV 2026" (two-digit day, capital month, spaces), or "APR 2024" without a day (fmtDate in src/lib/usage.ts).
- Every Pokémon, move, item, ability and type name shown on the site links to its own page (tools included, e.g. VGC usage cards). Only exception: the Teambuilder's editor and pick list, where the data is already shown and a link would pull you off your team.
- Page titles get a small muted italic label: "Dragon (type)", "Rock Slide (move)", etc.

### Homepage
- Heading: "Welcome to ARdex" (no "the Aeron Region Pokédex").
- No logo image on ARdex (it stays on aeronregion.net only); the header shows the "ARdex" text with the tagline "Data & tools in one place" (hidden on phones).
- Background: Trick Room battle image, darkened.
- Pokémon of the day: shows abilities (hidden marked), EV yield, Cobbleverse spawn, stats.
  The card is NOT one big link; the Pokémon name and each ability link separately.
  Float animation is subtle, not big movement.

### Pokédex list
- "Show forms" is unchecked by default (one row per species).

### Pokémon pages
- Type effectiveness: small fixed squares (32px), 2 rows of 9 (PokemonDB style).
- Base stats: PokemonDB-style table (min/max columns) with Showdown's flat bars and bar colors.
- Evolution: the stage you're on is a plain box, not a link.
- Damage taken includes abilities (e.g. Levitate shows Ground 0, "Includes Levitate").
  Multiple relevant abilities get toggle buttons. No "Before abilities" note.
- Moves tab: one list sorted Physical > Special > Status, with a "How" column
  (Lv / TM / Egg / Tutor). "Split by how it learns" button. Priority is a column (green +, red -).

### Moves / abilities / items / types
- Move pages: PokemonDB-style data table, effect text from Showdown, target diagram
  (Foe/Foe/User/Ally), "Learnt by" as one grid. No "In doubles" box for now.
- Abilities have their own pages with descriptions, linked from every Pokémon.
- Types page: type picker tiles, then the 18x18 chart (no toggles or combo checker). The chart sits on a light panel in both modes; neutral cells stay light in dark mode.
- Moveset search: pick up to 4 moves, Cobbleverse movepool by default, results sortable by stat.

### VGC usage
- Under Tools ("VGC usage", /usage/). Pikalytics-style layout: Pokémon list with usage on the left (sticky, searchable), the selected Pokémon on the right: base stats, moves (type + category), teammates (icon + name; no type labels, they'd squeeze the names), items, abilities, Tera types, spreads. Wide container. Cards are large like Pikalytics: fixed 460px boxes in a 3-column grid, 42px rows, ~.95rem text, each box scrolls on its own (phones: auto height).
- Spreads always show nature and EVs/Stat Points together in one row (Nature | HP Atk Def SpA SpD Spe | %), never split.
- Tera types card is shown for every format; formats without Tera say "No Terastallization in this format", SV formats without data say "No Tera data for this period".
- Format picker grouped by source (Showdown ladder, Limitless tournaments, official majors), current formats first, then past formats (every VGC format since gen 8, each from its last full month on the ladder).
- Format picker: source tabs (Showdown ladder / Tournaments / Official majors), one dropdown grouped by game and year (Champions, Scarlet & Violet 2026, 2025, 2024…), Bo1/Bo3 as a toggle beside it (never separate list entries).
- Set builder is opt-in: browsing shows plain data; "Build a set from this data" opens it (stays open while you switch Pokémon; "Close set builder" hides it). While open, rows in Moves (up to 4), Items, Abilities, Tera types and Spreads/Natures are click-to-select (checkbox + highlight); "Your set" shows the Showdown text live, starting from the most common pick of each; "Reset to most common". Move type label sits right after the move name (doesn't need to line up); no Physical/Special/Status icon in usage cards. While the builder is open, clicking a name selects the row instead of following its link.
- Pickers show a small battle count in each option ("· 250k battles"): formats, months and events.
- Showdown formats: every month with a real ladder at 1500+ and 1760+ (Month dropdown + rating toggle); the default view is the last full month at 1760+ (matches Pikalytics).
- Tournaments and majors show how much data is behind them (events, team sheets, battles), an "Event" dropdown (all events, or one), and an "Events in this data" table sorted by battles. Each Pokémon shows its team count.
- "Add set to Teambuilder ▾" opens a list of your saved teams (plus "+ New team") and adds the set to the one you pick; "Copy as Showdown text".
- Data refreshes weekly via GitHub Actions (.github/workflows/usage.yml). No Smogon analyses or Pikalytics scraping.

## Docs index
- docs/changelog.md: dated list of changes
- docs/decisions.md: longer reasoning behind decisions

### Teambuilder
- Layout mirrors Showdown's compact teambuilder: a set card on top (art | details + Pokémon/Item/Ability | moves; no stat summary box), then the EV editor and the pick list side by side. The pick list stays open (move list for the next empty slot by default).
- Below the EV editor only "Remaining" for the selected format (EVs or Stat Points) and the nature; no extra totals or notes.
- Artwork: PokéAPI HOME renders for both normal and shiny (they match); official artwork only as a fallback.
- Pokémon search has Showdown-style filters (type, ability, move chips).
- Stat bars use Showdown's formula, sized as at Lv. 100, and move with EVs/IVs/nature/level. Don't change how much they move.
- Nature is set by typing + or - after a stat's EVs (no +/- buttons).
- + adds an empty slot; changing a slot's Pokémon resets EVs, IVs and nature.
