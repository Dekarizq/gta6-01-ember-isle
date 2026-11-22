// Vesper City: Ember Isle — configuration and content data.
// All names, districts, missions, vehicles and stations are original.
export const GAME_TITLE = 'VESPER CITY';
export const GAME_SUBTITLE = 'EMBER ISLE';
export const GAME_TAGLINE = 'Take back the city. Rule the island.';

export const FOG = { near: 120, far: 1100 };
export const SKY = {
  top: [0.72, 0.38, 0.28],
  mid: [0.85, 0.42, 0.18],
  horizon: [1.00, 0.62, 0.24],
  fogColor: [0.62, 0.30, 0.14],
  sunDir: [-0.86, 0.10, -0.50],
  sunColor: [1.0, 0.78, 0.42],
};
export const SEA = {
  bandWarm: [0.88, 0.50, 0.22],
  bandBlue: [0.16, 0.32, 0.52],
  bandDeep: [0.10, 0.22, 0.42],
  glint: [1.0, 0.85, 0.45],
};

// City: 9x9 blocks, block pitch 46 m, centred on origin.
export const CITY = { blocks: 9, pitch: 46, road: 14, half: 207 };
export const DISTRICTS = [
  { name: 'Sunset Mile', x: 0, z: -160, color: '#ff9a3c' },
  { name: 'Harbor Docks', x: -170, z: -40, color: '#4db8ff' },
  { name: 'Old Vesper', x: -120, z: 120, color: '#ffd27a' },
  { name: 'Glass Quarter', x: 60, z: -120, color: '#7ae0ff' },
  { name: 'Sunset Shore', x: 150, z: -20, color: '#ff7a5c' },
  { name: 'Sunset Beach', x: 190, z: 90, color: '#ffe08a' },
  { name: 'Marina District', x: -40, z: 170, color: '#5cffc8' },
  { name: 'Old Town', x: 120, z: 140, color: '#ffb35c' },
  { name: 'Vesper Heights', x: 40, z: 40, color: '#ff8ad8' },
  { name: 'Copper Row', x: -160, z: -150, color: '#c98a4b' },
  { name: 'Palm Court', x: 170, z: -160, color: '#8aff9a' },
  { name: 'Fisherman Wharf', x: -190, z: 80, color: '#8ab8ff' },
  { name: 'Ember Gate', x: 0, z: 200, color: '#ff5c3c' },
  { name: 'Lantern Row', x: -80, z: -40, color: '#ffe066' },
  { name: 'Tide Market', x: 90, z: -170, color: '#ff6a8a' },
];

// Ember Isle sits across the strait, west (-x) past the sea.
export const ISLE = { x: -620, z: -40, radius: 190 };
export const VOLCANO = { x: -660, z: -70, base: 150, height: 120, craterR: 26 };

export const FERRY = {
  pier: { x: -215, z: 60 },
  isleDock: { x: -470, z: -20 },
  fare: 50, intervalSec: 90, speed: 14,
};

export const PLAYER = { name: 'Mara Voss', startCash: 250, startHealth: 100 };

// Respect & crew: allies who join as Mara's reputation grows. Each one
// changes play in a visible way — Lena drives getaways, Rook cuts garage
// prices, Dario pays more per Sun Coin.
export const CREW = [
  { name: 'Lena Voss', role: 'getaway driver', joinAfter: 4 },
  { name: 'Rook', role: 'mechanic — garage upgrades 15% off', joinAfter: 8 },
  { name: 'Dario Kess', role: 'fence — Sun Coins pay $75 instead of $50', joinAfter: 12 },
];

export const VEHICLES = [
  { id: 'sunset-gt', name: 'Sunset GT', top: 62, accel: 26, grip: 2.6, color: '#ff5c1f' },
  { id: 'tide-runner', name: 'Tide Runner', top: 48, accel: 20, grip: 2.2, color: '#2fa8ff' },
  { id: 'copper-cab', name: 'Copper Cab', top: 38, accel: 14, grip: 1.8, color: '#ffc233' },
  { id: 'harbor-hauler', name: 'Harbor Hauler', top: 34, accel: 11, grip: 1.5, color: '#7a8a99' },
  { id: 'ember-rod', name: 'Ember Rod', top: 58, accel: 24, grip: 2.4, color: '#c81e3a' },
  { id: 'palm-cruiser', name: 'Palm Cruiser', top: 44, accel: 17, grip: 2.0, color: '#2fd8a0' },
  { id: 'vcpd-cruiser', name: 'VCPD Cruiser', top: 56, accel: 25, grip: 2.7, color: '#1c2f4d' },
  { id: 'vcpd-interceptor', name: 'VCPD Interceptor', top: 66, accel: 30, grip: 3.0, color: '#101c33' },
  { id: 'patrol-buggy', name: 'Ember Patrol Buggy', top: 46, accel: 21, grip: 2.3, color: '#5c3a1e' },
];

export const WEAPONS = [
  { id: 'fists', name: 'Fists', damage: 8, range: 2.2, rate: 2.4, auto: false },
  { id: 'vesper-9mm', name: 'Vesper 9mm', damage: 22, range: 60, rate: 5, auto: false },
  { id: 'mako-smg', name: 'Mako SMG', damage: 14, range: 45, rate: 11, auto: true },
  { id: 'golden-12', name: 'Golden 12-Gauge', damage: 55, range: 22, rate: 1.4, auto: false },
];

export const RADIO = [
  { id: 'sunset-fm', name: 'SUNSET 88.1', genre: 'Golden Hour Pop', dj: 'DJ Sol', bpm: 104, root: 220 },
  { id: 'ember-rock', name: 'EMBER 107.3', genre: 'Volcano Rock', dj: 'DJ Magma', bpm: 132, root: 110 },
  { id: 'tide-jazz', name: 'TIDE 92.4', genre: 'Harbor Jazz', dj: 'DJ Blue Note', bpm: 84, root: 174 },
  { id: 'palm-hiphop', name: 'PALM 95.7', genre: 'Street Hip-Hop', dj: 'MC Coral', bpm: 96, root: 146 },
  { id: 'glass-electro', name: 'GLASS 101.9', genre: 'Neon Electro', dj: 'DJ Prism', bpm: 122, root: 196 },
  { id: 'old-vesper', name: 'OLD VESPER 76.5', genre: 'Classic Vesper', dj: 'Auntie Rosa', bpm: 76, root: 164 },
  { id: 'market-cumbia', name: 'MARKET 99.2', genre: 'Night Market Cumbia', dj: 'DJ Lantern', bpm: 112, root: 207 },
  { id: 'storm-talk', name: 'STORM TALK 104.4', genre: 'News & Storm Watch', dj: 'Vera Gale', bpm: 0, root: 0 },
];

export const MISSIONS = [
  { id: 1, title: 'Homecoming', area: 'city', brief: 'Steal your first car on Sunset Mile and lose the tail.', reward: 300, target: 'Sunset Mile' },
  { id: 2, title: 'Keys to the City', area: 'city', brief: 'Lift the Tide Kings courier sedan from Harbor Docks.', reward: 450, target: 'Harbor Docks' },
  { id: 3, title: 'Glass Heist', area: 'city', brief: 'Grab the Sunset Diamond from the Glass Quarter vault.', reward: 900, target: 'Glass Quarter' },
  { id: 4, title: 'Old Vesper Debt', area: 'city', brief: 'Collect three debts across Old Vesper before dawn.', reward: 600, target: 'Old Vesper' },
  { id: 5, title: 'Beach Run', area: 'city', brief: 'Outrun VCPD along Sunset Beach at wanted level 2.', reward: 700, target: 'Sunset Beach' },
  { id: 6, title: 'Marina Nights', area: 'city', brief: 'Sink the Kings speedboat deal at the Marina District.', reward: 800, target: 'Marina District' },
  { id: 7, title: 'Copper Row Payback', area: 'city', brief: 'Torch the Kings chop shop on Copper Row.', reward: 850, target: 'Copper Row' },
  { id: 8, title: 'Palm Court Drift', area: 'city', brief: 'Win the midnight drift trial on Palm Court.', reward: 1000, target: 'Palm Court' },
  { id: 9, title: 'Lantern Row Smuggle', area: 'city', brief: 'Smuggle lantern crates through Lantern Row checkpoints.', reward: 950, target: 'Lantern Row' },
  { id: 10, title: 'Tide Market Takeover', area: 'city', brief: 'Buy out the Tide Market stalls and cut the Kings off.', reward: 1200, target: 'Tide Market' },
  { id: 11, title: 'The Ferry Ticket', area: 'city', brief: 'Board the Sunset Pier ferry to Ember Isle — $50, one way.', reward: 200, target: 'Sunset Pier' },
  { id: 12, title: 'Storm Warning', area: 'city', brief: 'Outrun the hurricane front and reach Ember Gate.', reward: 1100, target: 'Ember Gate' },
  { id: 13, title: 'Black Sand Landing', area: 'isle', brief: 'Land on Ember Isle and meet the fisherfolk of Black Sand.', reward: 500, target: 'Black Sand Beach' },
  { id: 14, title: 'Lighthouse Signal', area: 'isle', brief: 'Relight the Ember Lighthouse before the patrol arrives.', reward: 900, target: 'Ember Lighthouse' },
  { id: 15, title: 'Fisher Village Feud', area: 'isle', brief: 'Settle the net war in the fishing village.', reward: 1000, target: 'Fisher Village' },
  { id: 16, title: 'Resort Raid', area: 'isle', brief: 'Crash the Kings resort party on the north shore.', reward: 1400, target: 'Ember Resort' },
  { id: 17, title: 'Night Market Fire', area: 'isle', brief: 'Light every lantern stall in the night market.', reward: 1300, target: 'Night Market' },
  { id: 18, title: 'Crater Run', area: 'isle', brief: 'Drive the lava road to the crater rim — do not stop.', reward: 1800, target: 'Ember Crater' },
  { id: 19, title: 'The Second Crater', area: 'isle', brief: 'Find the hidden second crater and its Sun Coin cache.', reward: 2200, target: 'Second Crater' },
  { id: 20, title: 'Queen of Ember', area: 'isle', brief: 'Defeat the Tide Kings at the crater and take the throne.', reward: 5000, target: 'Ember Crater' },
];

export const POLICE_CITY = [
  { name: 'Sgt. Reyes', tactic: 'Roadblock ahead, box the player in', unit: 'VCPD-01' },
  { name: 'Off. Kade', tactic: 'PIT maneuver from the rear quarter', unit: 'VCPD-02' },
  { name: 'Off. Marlow', tactic: 'Spike strip on the escape route', unit: 'VCPD-03' },
  { name: 'Sgt. Vane', tactic: 'Helicopter Air One — spotlight and track', unit: 'AIR-ONE' },
  { name: 'Off. Duarte', tactic: 'Flank through side streets', unit: 'VCPD-05' },
  { name: 'Off. Solis', tactic: 'Ram at intersections', unit: 'VCPD-06' },
];
export const POLICE_ISLE = [
  { name: 'Warden Ash', tactic: 'Lava-road ambush', unit: 'PATROL-1' },
  { name: 'Warden Cole', tactic: 'Beach blockade', unit: 'PATROL-2' },
  { name: 'Warden Flint', tactic: 'Crater rim pursuit', unit: 'PATROL-3' },
  { name: 'Warden Ember', tactic: 'Night market sweep', unit: 'PATROL-4' },
];

export const RACES = [
  { id: 'mile-sprint', name: 'Sunset Mile Sprint', laps: 3, bet: 200, district: 'Sunset Mile' },
  { id: 'harbor-loop', name: 'Harbor Loop', laps: 3, bet: 300, district: 'Harbor Docks' },
  { id: 'glass-gp', name: 'Glass Quarter GP', laps: 4, bet: 500, district: 'Glass Quarter' },
  { id: 'beach-dash', name: 'Sunset Beach Dash', laps: 2, bet: 250, district: 'Sunset Beach' },
  { id: 'crater-climb', name: 'Crater Climb', laps: 2, bet: 800, district: 'Ember Crater' },
  { id: 'isle-ring', name: 'Ember Isle Ring', laps: 3, bet: 600, district: 'Black Sand Beach' },
];
export const RIVALS = ['Jax', 'Lena', 'Rook', 'Ivy', 'Dario'];

export const BUSINESSES = [
  { id: 'sunset-diner', name: 'Sunset Diner', area: 'city', cost: 1500, income: 120, district: 'Sunset Mile' },
  { id: 'harbor-garage', name: 'Harbor Garage', area: 'city', cost: 3000, income: 260, district: 'Harbor Docks' },
  { id: 'glass-boutique', name: 'Glass Boutique', area: 'city', cost: 4500, income: 380, district: 'Glass Quarter' },
  { id: 'beach-bar', name: 'Sunset Beach Bar', area: 'city', cost: 2200, income: 190, district: 'Sunset Beach' },
  { id: 'market-stall', name: 'Tide Market Stall', area: 'city', cost: 900, income: 80, district: 'Tide Market' },
  { id: 'old-town-inn', name: 'Old Town Inn', area: 'city', cost: 2600, income: 220, district: 'Old Town' },
  { id: 'fisher-hut', name: 'Fisher Hut', area: 'isle', cost: 1200, income: 110, district: 'Fisher Village' },
  { id: 'ember-resort', name: 'Ember Resort', area: 'isle', cost: 8000, income: 700, district: 'Ember Resort' },
  { id: 'night-market', name: 'Night Market Stall', area: 'isle', cost: 1600, income: 150, district: 'Night Market' },
  { id: 'lighthouse-cafe', name: 'Lighthouse Cafe', area: 'isle', cost: 2000, income: 170, district: 'Ember Lighthouse' },
];

export const GARAGE_UPGRADES = [
  { id: 'engine', name: 'Engine Tune', levels: 3, cost: [400, 900, 1800] },
  { id: 'armour', name: 'Armour Plating', levels: 3, cost: [350, 800, 1600] },
  { id: 'tyres', name: 'Racing Tyres', levels: 3, cost: [300, 700, 1400] },
  { id: 'nitro', name: 'Nitro Boost', levels: 3, cost: [500, 1100, 2200] },
  { id: 'chrome', name: 'Chrome Finish', levels: 3, cost: [250, 600, 1200] },
  { id: 'racespec', name: 'RACE SPEC Kit', levels: 1, cost: [5000] },
];

export const SUN_COINS_TOTAL = 42;
export const SAVE_SLOTS = 3;
export const CONTROLS_TEXT = 'WASD drive / walk · SPACE handbrake · SHIFT sprint · E steal / enter car · Mouse aim · Click shoot · Q weapon wheel · R radio · G garage · B business · J side jobs · L GPS · K save · M map · P pause';
