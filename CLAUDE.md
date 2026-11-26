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
- Verify on the live site after deploy (hard refresh: Ctrl+Shift+R).

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
- Logo: keep the current live logo exactly as it is. Do not change it.
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

## Docs index
- docs/changelog.md: dated list of changes
- docs/decisions.md: longer reasoning behind decisions

### Teambuilder
- Layout: details | stats | moves side by side; the pick list opens full width underneath.
- Stat bars use Showdown's formula, sized as at Lv. 100, and move with EVs/IVs/nature/level. Don't change how much they move.
- Nature is set by typing + or - after a stat's EVs (no +/- buttons).
- + adds an empty slot; changing a slot's Pokémon resets EVs, IVs and nature.
