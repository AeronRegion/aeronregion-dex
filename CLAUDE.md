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
- Review every new or changed page for alignment before pushing: numbers right-aligned with tabular figures, columns lined up row to row (fixed widths, not content-sized), labels and values on the same baseline, no bars or chips that shift per row. Look at the screenshot at desktop width and at 390px.
- Click every button and link you add (in the local build) and confirm it does what its label says before pushing. A button that only toggles a row or opens a tab without showing anything new is a bug.
- Pages that are mostly data (tables, usage) may use the wide container (1500px); everything else stays 1180px.

## Locked decisions
### Global
- Look: light-blue, Showdown-like utility style (thin 1px borders, little bold). Body text Segoe UI/system; the "ARdex" logo text stays heavy Rubik. Site must not look AI-built.
- Dark mode: neutral grays, toggled in the header; the `theme` cookie on .aeronregion.net is shared with the main site.
- Links are blue. Underlined only inside sentences; elsewhere underline on hover. Pokémon names are never underlined.
- Type labels: one fixed size everywhere, white text, centered (PokemonDB style). Pokémon cards show types as colored text ("#0131 / Water · Ice").
- Pokémon tables and cards use the small box icons (PokemonDB style).
- Name is "ARdex" (header, tab titles, footer). "arDB" rebrand is undecided; don't change it.
- Top bar on every page (blue in light mode, dark in dark mode): Pokémon ▾, Tools ▾, light/dark toggle, Aeron Region link, search. NO Home tab; the logo links home.
- Page titles get a small muted italic label: "Dragon (type)", "Rock Slide (move)", etc.

### Homepage
- Heading: "Welcome to ARdex" (no "the Aeron Region Pokédex").
- No logo image on ARdex (it stays on aeronregion.net only); the header shows the "ARdex" text with the tagline "All data and tools in one place" (hidden on phones).
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
- Under Tools ("VGC usage", /usage/). Pikalytics-style layout: Pokémon list with usage on the left (sticky, searchable), the selected Pokémon on the right: base stats, moves (type + category), teammates (with types), items, abilities, Tera types, spreads. Wide container.
- Spreads always show nature and EVs/Stat Points together in one row (Nature | HP Atk Def SpA SpD Spe | %), never split.
- Tera types card is shown for every format; formats without Tera say "No Terastallization in this format", SV formats without data say "No Tera data for this period".
- Format picker grouped by source (Showdown ladder, Limitless tournaments, official majors), current formats first, then past formats (every VGC format since gen 8, each from its busiest month).
- "Add set to Teambuilder" (top item/ability/spread/4 moves) and "Copy as Showdown text".
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
