# ARdex (Aeron Region Dex)

dex.aeronregion.net: Pokédex, moves, items, type chart and moveset search, with Cobbleverse spawns and movepools.

## Run it locally
```
npm install
npm run dev        # http://localhost:4321
```

## Where things are
| What | File |
|---|---|
| Header, nav, footer, header search | `src/layouts/Base.astro` |
| Colors and fonts (same as aeronregion.net) | `src/styles/tokens.css`, `src/styles/global.css` |
| Pokémon page (Overview + Moves tabs) | `src/pages/pokemon/[slug].astro` |
| Move page / all moves | `src/pages/moves/[slug].astro`, `src/pages/moves/index.astro` |
| Item page / all items | `src/pages/items/[slug].astro`, `src/pages/items/index.astro` |
| Type chart | `src/pages/types.astro` (numbers in `src/lib/types.ts`) |
| Moveset search | `src/pages/search.astro` |
| Pokédex list (home page) | `src/pages/index.astro` |

## Data
The site reads the JSON in `src/data/` (and `public/search-index.json`, `public/names.json`). Those files are generated and committed, so Cloudflare doesn't need to download anything when it builds.

Sources:
- **Pokémon Showdown** (via `@pkmn/dex`): stats, types, abilities, moves, move text, items, learnsets for every game.
- **PokéAPI** CSVs: EV yield, catch rate, growth rate, egg cycles, height, Pokédex entries, main-game locations, item text.
- **Cobbleverse pack files**: spawns, drops and Cobblemon movepools.

### Updating after a Cobbleverse update
1. From the Modrinth profile, unzip each of these into its own folder:
   `mods/Cobblemon-fabric-*.jar`, `mods/mega_showdown-*.jar`, `datapacks/COBBLEVERSE-DP-v*.zip`
2. Run, listing the folders in that order (later ones override earlier ones):
   ```
   node scripts/cobbleverse.mjs 1.8.0 path/to/cobblemon path/to/mega_showdown path/to/cobbleverse-dp
   npm run data
   ```
3. Commit the changed files in `src/data/` and `public/`, and push.

To refresh only the Showdown/PokéAPI data: `npm update @pkmn/dex`, delete `.cache/*.csv`, then `npm run data`.
