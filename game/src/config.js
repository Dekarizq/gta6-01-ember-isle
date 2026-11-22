// World constants for Vesper City: Ember Isle.
// One place for every number the rest of the game shares: the size of the
// city and the island, the golden-hour palette, the sun, the fog, the cars,
// the weapons, the radio stations, the prices. Nothing here reads the DOM;
// every module imports what it needs from this file.

// ---------------------------------------------------------------- the map
export const WORLD = {
  seed: 20261122,
  blocks: 9, // city blocks across (9x9)
  block: 34, // metres of buildings per block
  road: 14, // metres of road between blocks
  seaStartX: 280, // where the Sunset Sea begins (east of the city)
  islandX: 1250, // island centre, east across the sea
  islandZ: 0,
  islandSize: 520, // island ground, edge to edge
  volcanoHeight: 88, // the crater cone, visible from far away
  volcanoRadius: 150,
};

export function citySize() {
  return WORLD.blocks * (WORLD.block + WORLD.road) + WORLD.road;
}

// ---------------------------------------------------------------- the light
export const SUN = {
  x: -800, y: 140, z: -260, // low in the west, down the boulevard
  color: [1.0, 0.72, 0.38],
  skyTop: [0.42, 0.55, 0.85],
  skyHorizon: [1.0, 0.62, 0.28],
  fogNear: 150,
  fogFar: 1200,
  fogColor: [0.98, 0.66, 0.38],
};

// Golden-hour palette: warm sand, cream, terracotta, gold and rose.
export const GOLD = {
  sand: [0.88, 0.72, 0.48],
  cream: [0.95, 0.88, 0.72],
  terracotta: [0.78, 0.42, 0.28],
  gold: [0.98, 0.76, 0.3],
  rose: [0.92, 0.55, 0.5],
  teal: [0.35, 0.68, 0.7],
  white: [0.93, 0.92, 0.88],
  asphalt: [0.16, 0.15, 0.17],
  sea: [0.1, 0.35, 0.55],
  sandBeach: [0.92, 0.8, 0.58],
  blackSand: [0.12, 0.11, 0.13],
  lava: [1.0, 0.32, 0.08],
  lavaGlow: [1.0, 0.55, 0.15],
};

export const WINDOW_STRIP = ['#ffd166', '#7dd3fc', '#fda4af', '#ff9a3d', '#a5f3fc'];

// ---------------------------------------------------------------- districts
export const DISTRICTS = [
  { id: 'sunset-mile', name: 'Sunset Mile', color: GOLD.gold },
  { id: 'harbor-docks', name: 'Harbor Docks', color: GOLD.terracotta },
  { id: 'old-vesper', name: 'Old Vesper', color: GOLD.cream },
  { id: 'glass-quarter', name: 'Glass Quarter', color: GOLD.teal },
  { id: 'sunset-shore', name: 'Sunset Shore', color: GOLD.rose },
  { id: 'sunset-beach', name: 'Sunset Beach', color: GOLD.sandBeach },
  { id: 'marina', name: 'Marina District', color: GOLD.white },
  { id: 'old-town', name: 'Old Town', color: [0.58, 0.3, 0.22] },
  { id: 'ember-town', name: 'Ember Town', color: [0.85, 0.45, 0.2] },
  { id: 'fisher-village', name: 'Fisher Village', color: [0.6, 0.65, 0.55] },
  { id: 'black-beach', name: 'Black Sand Beach', color: GOLD.blackSand },
  { id: 'volcano-rim', name: 'Volcano Rim', color: GOLD.lava },
  { id: 'ember-resort', name: 'Ember Resort', color: [0.95, 0.85, 0.6] },
  { id: 'night-market', name: 'Night Market', color: [0.9, 0.5, 0.85] },
  { id: 'lighthouse-point', name: 'Lighthouse Point', color: GOLD.white },
];

// ---------------------------------------------------------------- the player
export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 12,
  health: 100,
  startCash: 500,
  startX: -20,
  startZ: 300,
};

// ---------------------------------------------------------------- vehicles
export const VEHICLES = [
  { id: 'sunset', name: 'Sunset GT', color: [0.95, 0.6, 0.15], top: 42, accel: 22, brake: 34, grip: 3.2, len: 4.6 },
  { id: 'marina-coupe', name: 'Marina Coupe', color: [0.2, 0.65, 0.75], top: 38, accel: 20, brake: 32, grip: 3.0, len: 4.4 },
  { id: 'oldtown-sedan', name: 'Old Town Sedan', color: [0.7, 0.55, 0.35], top: 32, accel: 16, brake: 28, grip: 2.8, len: 4.5 },
  { id: 'dock-truck', name: 'Dock Truck', color: [0.5, 0.45, 0.4], top: 28, accel: 13, brake: 26, grip: 2.5, len: 5.6 },
  { id: 'glass-sport', name: 'Glass Sport', color: [0.9, 0.25, 0.35], top: 48, accel: 26, brake: 36, grip: 3.6, len: 4.3 },
  { id: 'beach-buggy', name: 'Beach Buggy', color: [0.95, 0.85, 0.3], top: 34, accel: 18, brake: 30, grip: 3.4, len: 4.0 },
  { id: 'taxi', name: 'Sunset Taxi', color: [0.98, 0.8, 0.1], top: 34, accel: 17, brake: 30, grip: 2.9, len: 4.5 },
  { id: 'police', name: 'VCPD Cruiser', color: [0.12, 0.14, 0.2], top: 44, accel: 24, brake: 36, grip: 3.4, len: 4.7 },
];

export const ISLAND_VEHICLES = [
  { id: 'ember-buggy', name: 'Ember Buggy', color: [0.95, 0.5, 0.1], top: 36, accel: 19, brake: 30, grip: 3.5, len: 4.0 },
  { id: 'lava-roadster', name: 'Lava Roadster', color: [0.85, 0.15, 0.1], top: 46, accel: 25, brake: 35, grip: 3.5, len: 4.2 },
  { id: 'fish-van', name: 'Fish Van', color: [0.55, 0.65, 0.6], top: 28, accel: 13, brake: 26, grip: 2.5, len: 5.2 },
  { id: 'resort-cabrio', name: 'Resort Cabrio', color: [0.95, 0.9, 0.7], top: 38, accel: 20, brake: 32, grip: 3.1, len: 4.3 },
];

// ---------------------------------------------------------------- weapons
export const WEAPONS = [
  { id: 'fists', name: 'Fists', damage: 12, range: 3, rate: 0.45, ammo: Infinity, color: [0.9, 0.8, 0.6] },
  { id: 'vesper-9mm', name: 'Vesper 9mm', damage: 22, range: 60, rate: 0.28, ammo: 72, color: [0.3, 0.3, 0.32] },
  { id: 'mako-smg', name: 'Mako SMG', damage: 14, range: 48, rate: 0.09, ammo: 150, color: [0.2, 0.5, 0.6] },
  { id: 'golden-12', name: 'Golden 12-Gauge', damage: 65, range: 26, rate: 0.85, ammo: 40, color: [0.95, 0.75, 0.25] },
];

// ---------------------------------------------------------------- radio
export const RADIO_STATIONS = [
  { id: 'sunset-fm', name: 'SUNSET 88.1', show: 'Golden Hour', tempo: 96, root: 220, scale: [0, 2, 4, 7, 9, 12], dj: 'DJ Mara' },
  { id: 'harbor-am', name: 'HARBOR 540 AM', show: 'Dockside Talk', tempo: 80, root: 196, scale: [0, 3, 5, 7, 10, 12], dj: 'Old Tomas' },
  { id: 'neon-nights', name: 'NEON 99.9', show: 'Night Drive', tempo: 118, root: 246.9, scale: [0, 2, 3, 5, 7, 10, 12], dj: 'DJ Lena' },
  { id: 'glass-classical', name: 'GLASS 104.2', show: 'Tower Strings', tempo: 72, root: 261.6, scale: [0, 2, 4, 5, 7, 9, 11, 12], dj: 'Maestro Rook' },
  { id: 'tide-reggae', name: 'TIDE 91.7', show: 'Beach Riddim', tempo: 88, root: 207.65, scale: [0, 2, 4, 7, 9, 12], dj: 'DJ Kai' },
  { id: 'storm-rock', name: 'STORM 107.9', show: 'Hurricane Rock', tempo: 132, root: 233.1, scale: [0, 2, 3, 5, 7, 8, 10, 12], dj: 'DJ Dario' },
  { id: 'vesper-jazz', name: 'VESPER 95.5', show: 'Blue Hour Jazz', tempo: 84, root: 174.6, scale: [0, 3, 5, 6, 7, 10, 12], dj: 'DJ Sable' },
  { id: 'ember', name: 'EMBER 107.3', show: 'Volcano Rock', tempo: 142, root: 207.65, scale: [0, 2, 3, 5, 7, 8, 10, 12], dj: 'DJ Ash' },
];

// ---------------------------------------------------------------- economy
export const ECONOMY = {
  ferryFare: 50,
  ferryIntervalSec: 90,
  ferryCrossSec: 12,
  taxiFare: 120,
  deliveryPay: 180,
  raceBet: 500,
  sunCoinBonus: 500,
  sunStreakBonus: 50,
};

// ---------------------------------------------------------------- ranks
export const RESPECT_RANKS = [
  { name: 'NOBODY', at: 0 },
  { name: 'STREET KID', at: 200 },
  { name: 'HUSTLER', at: 500 },
  { name: 'DRIVER', at: 1000 },
  { name: 'SUNSET KING', at: 1800 },
  { name: 'COAST LEGEND', at: 2600 },
  { name: 'EMBER LEGEND', at: 3400 },
  { name: 'QUEEN OF EMBER', at: 4500 },
];

export const CREW = ['Lena Voss', 'Rook', 'Dario Kess', 'Kai Sol'];
