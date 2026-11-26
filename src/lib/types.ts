export const TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
export const typeColors: Record<string, string> = {
  Normal: '#999870', Fire: '#e0701f', Water: '#2f6fe4', Electric: '#ddb216', Grass: '#5fb33a',
  Ice: '#5bbdb9', Fighting: '#c22e28', Poison: '#a33ea1', Ground: '#c9a240', Flying: '#8f75e6',
  Psychic: '#f95587', Bug: '#93a614', Rock: '#a48f2c', Ghost: '#735797', Dragon: '#6f35fc',
  Dark: '#705746', Steel: '#9393b3', Fairy: '#cc6ca0',
};
// attacker → defender multipliers (only non-1 entries)
export const CHART: Record<string, Record<string, number>> = {
  Normal:{Rock:.5,Ghost:0,Steel:.5},
  Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},
  Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},
  Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},
  Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},
  Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},
  Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2,Fairy:.5},
  Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0,Fairy:2},
  Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},
  Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},
  Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},
  Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5,Fairy:.5},
  Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},
  Ghost:{Normal:0,Psychic:2,Ghost:2,Dark:.5},
  Dragon:{Dragon:2,Steel:.5,Fairy:0},
  Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Fairy:.5},
  Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5,Fairy:2},
  Fairy:{Fire:.5,Fighting:2,Poison:.5,Dragon:2,Dark:2,Steel:.5},
};
export const eff = (atk: string, defs: string[]) => defs.reduce((m, d) => m * (CHART[atk][d] ?? 1), 1);
export const effLabel: Record<string, string> = { '4': '4', '2': '2', '1': '', '0.5': '½', '0.25': '¼', '0': '0' };
export const effColor: Record<string, string> = { '4': '#73d216', '2': '#4e9a06', '0.5': '#a40000', '0.25': '#7c0000', '0': '#2e3436' };

// Abilities that change how much damage a Pokémon takes from a type (defending side).
// Numbers multiply the normal type chart; 'se' applies only to super-effective hits.
export const ABILITY_DEF: Record<string, Record<string, number> & { se?: number; wonder?: number; delta?: number }> = {
  'Levitate': { Ground: 0 }, 'Earth Eater': { Ground: 0 },
  'Water Absorb': { Water: 0 }, 'Storm Drain': { Water: 0 }, 'Dry Skin': { Water: 0, Fire: 1.25 },
  'Volt Absorb': { Electric: 0 }, 'Lightning Rod': { Electric: 0 }, 'Motor Drive': { Electric: 0 },
  'Flash Fire': { Fire: 0 }, 'Well-Baked Body': { Fire: 0 }, 'Sap Sipper': { Grass: 0 },
  'Thick Fat': { Fire: 0.5, Ice: 0.5 }, 'Heatproof': { Fire: 0.5 }, 'Water Bubble': { Fire: 0.5 },
  'Purifying Salt': { Ghost: 0.5 }, 'Fluffy': { Fire: 2 },
  'Filter': { se: 0.75 }, 'Solid Rock': { se: 0.75 }, 'Prism Armor': { se: 0.75 },
  'Wonder Guard': { wonder: 1 },
  'Desolate Land': { Water: 0 }, 'Primordial Sea': { Fire: 0 },
  'Delta Stream': { delta: 1 },
};
export const effWith = (atk: string, defs: string[], ability?: string) => {
  let m = eff(atk, defs);
  const a = ability ? ABILITY_DEF[ability] : undefined;
  if (!a) return m;
  if (a.wonder) return m > 1 ? m : 0;
  if (a.delta && defs.includes('Flying') && (CHART[atk].Flying ?? 1) > 1) m /= 2; // strong winds: no super-effective hits on Flying
  if (a[atk] !== undefined) m *= a[atk];
  if (a.se && m > 1) m *= a.se;
  return m;
};
const FRAC: Record<string, string> = { '0': '0', '0.125': '⅛', '0.25': '¼', '0.5': '½', '0.625': '⅝', '1': '', '1.25': '1¼', '1.5': '1½', '2': '2', '2.5': '2½', '3': '3', '4': '4' };
export const effText = (m: number) => FRAC[String(m)] ?? String(+m.toFixed(2));
export const effBg = (m: number) => m === 1 ? '' : m === 0 ? '#2e3436' : m >= 4 ? '#73d216' : m > 1 ? '#4e9a06' : m <= 0.25 ? '#7c0000' : '#a40000';
// Text on effectiveness cells (PokemonDB style): yellow on red/green, white on black
export const effFg = (m: number) => m === 0 ? '#fff' : '#ffdd57';
// PokemonDB's type colors, used in the type defenses grid and type chart
export const dbTypeColors: Record<string, string> = { Normal: '#999988', Fire: '#ff4422', Water: '#1f6fe0', Electric: '#e6b318', Grass: '#5fb83d', Ice: '#3db5e6', Fighting: '#bb5544', Poison: '#aa5599', Ground: '#c9a23e', Flying: '#7080f0', Psychic: '#ff5599', Bug: '#93a614', Rock: '#a6944f', Ghost: '#6666bb', Dragon: '#7766ee', Dark: '#775544', Steel: '#9090a8', Fairy: '#d97fd9' };
