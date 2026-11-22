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

// Round 10 — dynamic golden-hour light. The sun sits low in the west
// (azimuth -0.86, -0.50) at 17:24 and sinks as dayTime advances; the
// renderer turns this into long east-pointing shadows, warm window light
// and a sky that cools toward dusk. shadowLen is the ground-shadow
// length of a 1 m tall object at golden hour.
export const LIGHT = {
  sunAzimuth: [-0.86, -0.50], // west, slightly south — sun sets over the strait
  sunElevation: 0.16, // low sun, long shadows
  shadowLen: 3.4, // shadow metres per metre of height at golden hour
  shadowDir: [0.86, 0.50], // shadows point east, away from the sun
  duskStart: 18.6, // dayTime when the city lights switch on
};

// Round 10 — traffic behaviour. Cars brake for the car ahead, change
// lanes to overtake, and turn at grid intersections instead of cruising
// in a straight line forever.
export const TRAFFIC = {
  brakeGap: 14, // metres to the car ahead before braking starts
  stopGap: 6, // metres — full stop behind a queue
  turnChance: 0.22, // chance to turn at an intersection, per pass
  laneWobble: 0.6, // lateral drift inside a lane, metres
  overtakeGap: 26, // clear road ahead needed before a lane change
};

// Round 10 — living surf and coastal fog. Foam lines roll up the east
// beach and the isle's black-sand shore; warm mist bands drift over the
// strait at golden hour.
export const SURF = {
  foamLines: 5, // parallel foam strips along the shoreline
  foamSpeed: 0.35, // metres per second the surf advances and retreats
  foamWidth: 3.2,
  mistBands: 4, // drifting fog quads over the sea near the shore
  mistDrift: 2.5, // metres per second along the coast
};

// Round 10 — Air One livery. The police helicopter is now painted bright
// rescue white with a red cheatline and a gold VCPD star, so it reads
// instantly against the orange sky instead of hiding as a dark blob.
export const HELI = {
  body: '#f4f2ec', // bright white fuselage
  cheatline: '#c81e3a', // red cheatline along the fuselage
  belly: '#2e4a6e', // dark blue belly
  tail: '#f4f2ec',
  star: '#ffd23c',
  rotor: '#1a1a1a',
};

// Round 10 — beach dressing: umbrellas and surfboards on Sunset Beach,
// marker buoys along the ferry route, crates and benches on Sunset Pier.
export const BEACH = {
  umbrellas: 14,
  surfboards: 8,
  buoys: 6,
  pierCrates: 5,
};

// Round 10 — side jobs: quick cash work between missions. A taxi fare
// pays for a fast clean drive across town, a courier run pays for
// reaching a district before the timer ends, and a vigilante stop pays
// for ramming a marked Tide Kings car off the road.
export const SIDE_JOBS = [
  { id: 'taxi', name: 'Taxi Fare', brief: 'Drive a tourist from Sunset Pier to Glass Quarter — no crashes.', pay: 180, time: 75 },
  { id: 'courier', name: 'Courier Run', brief: 'Deliver the package to Tide Market before the timer runs out.', pay: 220, time: 60 },
  { id: 'vigilante', name: 'Vigilante Stop', brief: 'Ram the marked Kings sedan off the road — VCPD looks away.', pay: 350, time: 90 },
  { id: 'tour', name: 'Sunset Tour', brief: 'Show a visitor the beach, the pier and the lighthouse — slow and scenic.', pay: 150, time: 120 },
];

// Round 10 — seagulls over the harbour and the beach: white birds
// circling on fixed paths, so the sky above the water is never empty.
export const BIRDS = {
  count: 9,
  // [centreX, centreZ, radius, height, speed, phase]
  flocks: [
    { cx: -215, cz: 60, r: 40, y: 42, speed: 0.12, phase: 0 },
    { cx: 230, cz: -40, r: 55, y: 36, speed: 0.10, phase: 2.1 },
    { cx: -380, cz: 20, r: 70, y: 48, speed: 0.08, phase: 4.2 },
  ],
};

// Round 10 — golden-hour clouds: long warm bands high above the city,
// drifting slowly east, so the sky has shape above the skyline.
export const CLOUDS = {
  count: 7,
  // [x, z, length, width, height, drift]
  bands: [
    { x: -300, z: -500, len: 420, w: 26, y: 300, drift: 1.2 },
    { x: 100, z: -700, len: 520, w: 34, y: 330, drift: 0.9 },
    { x: 500, z: -300, len: 380, w: 22, y: 280, drift: 1.5 },
    { x: -600, z: 200, len: 460, w: 30, y: 310, drift: 1.0 },
    { x: -100, z: 500, len: 400, w: 24, y: 290, drift: 1.3 },
    { x: 300, z: 600, len: 480, w: 28, y: 320, drift: 0.8 },
    { x: -800, z: -200, len: 360, w: 20, y: 270, drift: 1.6 },
  ],
};

// Round 10 — Harbor Docks cranes, the fishing village on the isle's
// south shore, and the Ember Resort on the north shore: the working
// harbour and the lived-in island, not just a volcano and a beach.
export const HARBOR = {
  cranes: 3,
  craneX: -170, craneZ: -40,
  villageHuts: 10,
  villageX: -620, villageZ: 110,
  resortBlocks: 4,
  resortX: -620, resortZ: -180,
  billboards: 4,
};

// Round 10 — wanted heat: how hot the chase is right now. Heat rises
// with speed and with police nearby, and cools when Mara hides slow
// and far from every unit; at zero heat the stars start to fall.
export const HEAT = {
  riseSpeed: 0.9, // heat per second at full speed in a chase
  coolSpeed: 0.5, // heat lost per second while hidden
  hideSpeed: 3, // below this speed Mara counts as hiding
  hideRange: 90, // police must be further than this to count as hidden
};

// Round 10 — harbour containers, bus stops and beach kites: the docks
// stack rust-red and sea-blue boxes, the bus stops give the sidewalks
// somewhere to wait, and three kites dance over Sunset Beach.
export const DOCKS = {
  containers: 12,
  containerX: -180, containerZ: -70,
  busStops: 4,
  kites: 3,
};
export const KITE_COLS = ['#ff5c8a', '#2fd8ff', '#ffd23c'];

// Round 10 — idle hints: when Mara stands still for a while, the game
// nudges her toward something to do, rotating through the list.
export const HINTS = [
  'Tip: press T for a side job — taxi, courier, vigilante or tour.',
  'Tip: press M for the full map — the gold beam marks your mission.',
  'Tip: press B to buy a business — it pays you every in-game day.',
  'Tip: press G in the garage — Rook cuts every upgrade by 15%.',
  'Tip: 42 Sun Coins hide on rooftops, the beach and the crater rim.',
  'Tip: ride the ferry from Sunset Pier — it leaves every 90 seconds.',
];

// Round 10 — tide pools on Sunset Beach: small still pools left by the
// retreating surf, catching the sky.
export const TIDE_POOLS = [
  { x: 238, z: -90, r: 4 },
  { x: 242, z: 30, r: 3 },
  { x: 236, z: 120, r: 5 },
  { x: 240, z: -170, r: 3.5 },
];

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
