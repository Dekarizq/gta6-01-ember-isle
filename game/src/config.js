// Vesper City: Ember Isle — every tuning number, name and table in one place.
// A golden-hour coastal city (9x9 blocks) plus a volcanic island across the bay,
// joined by a ferry. Plain HTML + raw WebGL, no libraries, no network requests.

export const STEP = 1 / 60;

// World layout, in metres. City centre at the origin; the sea is west (negative x);
// Ember Isle sits across the bay to the north-west, reached by ferry from Sunset Pier.
export const CITY = { blocks: 9, block: 62, street: 22, half: 378 };
export const SEA_LINE = -400; // x < SEA_LINE is open water
export const ISLAND = { x: -920, z: 130, radius: 230, volcanoH: 150, dockX: -700, dockZ: 60 };
export const PIER = { x: -392, z: 0 };
export const FERRY_ROUTE = { from: { x: -396, z: 0 }, to: { x: -706, z: 64 }, period: 90, fare: 50 };

export const FOG = { near: 120, far: 1100 };
export const SKY = {
  clear: [0.99, 0.68, 0.38],
  fog: [0.96, 0.6, 0.42],
  horizon: [1.0, 0.78, 0.52],
  dusk: [0.55, 0.32, 0.5],
};
export const SUN = { x: -1180, y: 58, z: -140, disc: 64, halo: 150 };

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 15,
  accel: 34,
  brake: 60,
  grip: 7.5,
  handbrakeGrip: 1.6,
  maxReverse: 14,
  health: 100,
};

export const DISTRICTS = [
  { name: 'Sunset Mile', x: 0, z: -300, standing: 0 },
  { name: 'Harbor Docks', x: -300, z: -180, standing: 0 },
  { name: 'Old Vesper', x: -300, z: 180, standing: 0 },
  { name: 'Glass Quarter', x: 60, z: -300, standing: 0 },
  { name: 'Sunset Shore', x: -330, z: 60, standing: 0 },
  { name: 'Sunset Beach', x: -330, z: 300, standing: 0 },
  { name: 'Marina District', x: 180, z: 300, standing: 0 },
  { name: 'Old Town', x: 300, z: 0, standing: 0 },
  { name: 'Ember Village', x: -920, z: 260, standing: 0, island: true },
  { name: 'Black Sand Beach', x: -920, z: -80, standing: 0, island: true },
  { name: 'Lava Fields', x: -920, z: 130, standing: 0, island: true },
  { name: 'Night Market', x: -880, z: 330, standing: 0, island: true },
  { name: 'Ember Resort', x: -760, z: 260, standing: 0, island: true },
  { name: 'Fisherman\'s Cove', x: -1080, z: 220, standing: 0, island: true },
  { name: 'Ashen Quay', x: -700, z: 60, standing: 0, island: true },
];

// 20 story missions: 12 in the city, 8 on the island. Each is data the mission
// engine drives: a chain of waypoints with a verb (drive / chase / collect /
// deliver / race / escape) and a cash + standing reward.
export const MISSIONS = [
  { id: 1, name: 'First Borrowed Ride', place: 'Sunset Mile', verb: 'drive', cash: 300, text: 'Mara is back in Vesper City. Borrow a car and meet Jax at Sunset Mile.' },
  { id: 2, name: 'Harbor Heat', place: 'Harbor Docks', verb: 'escape', cash: 500, text: 'VCPD spotted the borrowed GT. Lose the heat at the docks.' },
  { id: 3, name: 'Glass Quarter Run', place: 'Glass Quarter', verb: 'race', cash: 800, text: 'Beat Rico through the glass towers. First to the Marina wins.' },
  { id: 4, name: 'Old Town Debts', place: 'Old Town', verb: 'collect', cash: 700, text: 'Collect three debts from Old Town shops before the Tide Kings do.' },
  { id: 5, name: 'The Sunset GT', place: 'Sunset Shore', verb: 'drive', cash: 1200, text: 'Steal back Mara\'s own Sunset GT from the impound on Sunset Shore.' },
  { id: 6, name: 'Midnight Ferry', place: 'Sunset Beach', verb: 'drive', cash: 900, text: 'Catch the midnight ferry. Do not let the Kings\' spotters see you board.' },
  { id: 7, name: 'Beachfront Brawl', place: 'Sunset Beach', verb: 'chase', cash: 1100, text: 'Chase down the Kings\' courier along the beachfront.' },
  { id: 8, name: 'Marina Buyout', place: 'Marina District', verb: 'deliver', cash: 1500, text: 'Deliver the buyout papers to the Marina office before the deadline.' },
  { id: 9, name: 'VCPD Roadblock', place: 'Harbor Docks', verb: 'escape', cash: 1400, text: 'Smash through the VCPD roadblock on the harbor road. Wanted 4.' },
  { id: 10, name: 'King\'s Courier', place: 'Old Vesper', verb: 'chase', cash: 1600, text: 'Run the Tide Kings\' courier off the road in Old Vesper.' },
  { id: 11, name: 'Sunset Mile Grand Prix', place: 'Sunset Mile', verb: 'race', cash: 2500, text: 'Win the Sunset Mile Grand Prix. Six laps, five rivals, one crown.' },
  { id: 12, name: 'The Ember Ticket', place: 'Sunset Pier', verb: 'drive', cash: 2000, text: 'Buy a ferry ticket and cross to Ember Isle. The Kings own the bay — go fast.' },
  { id: 13, name: 'Black Sand Landing', place: 'Black Sand Beach', verb: 'drive', cash: 1800, text: 'Land on the black sand and reach Ember Village before the patrol boats.' },
  { id: 14, name: 'Night Market Deal', place: 'Night Market', verb: 'collect', cash: 2200, text: 'Collect four crates from the night market stalls. Pay no one twice.' },
  { id: 15, name: 'Volcano Run', place: 'Lava Fields', verb: 'race', cash: 3000, text: 'Race the lava road around the crater. One mistake and you are ash.' },
  { id: 16, name: 'Fisherman\'s Debt', place: 'Fisherman\'s Cove', verb: 'deliver', cash: 2400, text: 'Deliver medicine to the cove fishermen before the storm hits.' },
  { id: 17, name: 'Resort Heist', place: 'Ember Resort', verb: 'chase', cash: 3500, text: 'Lift the Kings\' ledger from the resort safe and outrun Ember Patrol.' },
  { id: 18, name: 'Ashen Quay Standoff', place: 'Ashen Quay', verb: 'escape', cash: 3200, text: 'Hold the quay against the patrol, then escape by ferry at dawn.' },
  { id: 19, name: 'The Eruption', place: 'Lava Fields', verb: 'escape', cash: 5000, text: 'The volcano blows. Outrun the eruption to the dock. Do not look back.' },
  { id: 20, name: 'Queen of Ember', place: 'Ember Village', verb: 'chase', cash: 10000, text: 'Final race against the Tide King himself. Win, and Vesper City is yours.' },
];

// Waypoints per mission (world coords, on streets where the city is —
// streets run on the 42/126/210/294 grid, blocks sit between them).
export const MISSION_POINTS = {
  1: [[-42, -210], [42, -294]],
  2: [[-294, -126], [-210, -42], [-294, 42]],
  3: [[126, -210], [210, -126], [126, 210]],
  4: [[294, -42], [294, 42], [210, 126]],
  5: [[-294, 42], [-126, 126], [-42, 210]],
  6: [[-294, 294], [-378, 126], [-392, 0]],
  7: [[-294, 294], [-126, 294], [42, 294]],
  8: [[210, 294], [294, 210], [126, 294]],
  9: [[-294, -126], [-126, -126], [42, -126]],
  10: [[-294, 210], [-210, 294], [-126, 126]],
  11: [[-42, -294], [294, -294], [294, 294], [-42, 294], [-294, 294], [-294, -294]],
  12: [[-210, 42], [-294, 42], [-392, 0]],
  13: [[-760, 40], [-880, -40], [-920, 220]],
  14: [[-900, 320], [-840, 340], [-960, 330], [-880, 360]],
  15: [[-820, 180], [-760, 60], [-1020, 60], [-980, 220]],
  16: [[-920, 260], [-1020, 200], [-1080, 220]],
  17: [[-800, 260], [-760, 300], [-780, 220]],
  18: [[-720, 60], [-700, 120], [-706, 64]],
  19: [[-860, 130], [-780, 100], [-706, 64]],
  20: [[-920, 260], [-800, 200], [-920, 100], [-700, 60]],
};

export const RACES = [
  { name: 'Sunset Mile GP', laps: 3, entry: 200 },
  { name: 'Harbor Sprint', laps: 2, entry: 150 },
  { name: 'Glass Quarter Loop', laps: 3, entry: 250 },
  { name: 'Beachfront Dash', laps: 2, entry: 150 },
  { name: 'Volcano Ring', laps: 2, entry: 400 },
  { name: 'Ember Coast Classic', laps: 3, entry: 350 },
];

export const BUSINESSES = [
  { name: 'Sunset Diner', x: 40, z: -260, price: 1500, income: 120, island: false },
  { name: 'Harbor Warehouse', x: -300, z: -160, price: 2500, income: 200, island: false },
  { name: 'Glass Tower Office', x: 80, z: -280, price: 4000, income: 320, island: false },
  { name: 'Marina Boat Rental', x: 200, z: 300, price: 3000, income: 240, island: false },
  { name: 'Old Town Garage', x: 300, z: 40, price: 2000, income: 160, island: false },
  { name: 'Beach Bar', x: -320, z: 300, price: 1800, income: 140, island: false },
  { name: 'Night Market Stall', x: -880, z: 330, price: 2200, income: 180, island: true },
  { name: 'Ember Resort Suite', x: -760, z: 260, price: 5000, income: 420, island: true },
  { name: 'Fishing Fleet', x: -1080, z: 220, price: 2800, income: 230, island: true },
  { name: 'Lava Tour Kiosk', x: -820, z: 180, price: 1600, income: 130, island: true },
];

export const VEHICLES = [
  { name: 'Sunset GT', top: 62, accel: 34, color: [0.95, 0.62, 0.1] },
  { name: 'Harbor Van', top: 38, accel: 20, color: [0.7, 0.72, 0.75] },
  { name: 'Glass Coupe', top: 58, accel: 30, color: [0.15, 0.35, 0.6] },
  { name: 'Beach Buggy', top: 44, accel: 26, color: [0.95, 0.85, 0.3] },
  { name: 'Ember Pickup', top: 48, accel: 28, color: [0.6, 0.2, 0.12] },
  { name: 'VCPD Cruiser', top: 56, accel: 32, color: [0.08, 0.08, 0.1] },
];

export const WEAPONS = [
  { name: 'Fists', damage: 10, range: 3, rate: 0.4 },
  { name: 'Vesper 9mm', damage: 25, range: 90, rate: 0.18 },
  { name: 'Mako SMG', damage: 14, range: 70, rate: 0.07 },
  { name: 'Golden 12-Gauge', damage: 70, range: 40, rate: 0.7 },
];

export const RADIO = [
  { name: 'VESPER FM 88.1', dj: 'DJ Sol', genre: 'Sunset Pop', tempo: 112, scale: [0, 2, 4, 7, 9] },
  { name: 'EMBER 107.3', dj: 'DJ Magma', genre: 'Volcano Rock', tempo: 140, scale: [0, 3, 5, 7, 10] },
  { name: 'HARBOR 92.5', dj: 'Captain Waves', genre: 'Sea Shanty', tempo: 96, scale: [0, 2, 5, 7, 10] },
  { name: 'GLASS 101.9', dj: 'Nova', genre: 'Synthwave', tempo: 122, scale: [0, 2, 3, 7, 8] },
  { name: 'OLD TOWN 76.4', dj: 'Grandma Rosa', genre: 'Jazz', tempo: 84, scale: [0, 3, 5, 6, 10] },
  { name: 'TIDE 95.7', dj: 'King Tide', genre: 'Hip Hop', tempo: 100, scale: [0, 3, 5, 7, 10] },
  { name: 'LAVA 99.9', dj: 'Ash', genre: 'Metal', tempo: 160, scale: [0, 1, 3, 6, 8] },
  { name: 'VESPER TALK 104.2', dj: 'Mara Voss', genre: 'Talk', tempo: 0, scale: [0] },
];

export const COP_UNITS = [
  { name: 'Unit 7 — Vega', tactic: 'ram' },
  { name: 'Unit 12 — Ortiz', tactic: 'block' },
  { name: 'Unit 3 — Chen', tactic: 'chase' },
  { name: 'Unit 21 — Novak', tactic: 'ram' },
  { name: 'Air One — Reyes', tactic: 'heli' },
];
export const ISLAND_PATROL = [
  { name: 'Patrol 1 — Ika', tactic: 'chase' },
  { name: 'Patrol 2 — Bara', tactic: 'block' },
  { name: 'Patrol 3 — Sari', tactic: 'ram' },
  { name: 'Patrol 4 — Dewa', tactic: 'chase' },
];

export const DIALOGUE = {
  1: 'Jax: "Borrow a car and meet me at Sunset Mile. Quick."',
  2: 'Dario Kess: "VCPD is on you. Lose them at the docks."',
  3: 'Rico: "You call that driving? Beat me through the glass towers."',
  4: 'Lena Voss: "Old Town owes us. Collect every dollar."',
  5: 'Jax: "That is MY Sunset GT in the impound. Get it back."',
  6: 'Dario Kess: "Midnight ferry. Do not let the Kings\' spotters see you."',
  7: 'Lena Voss: "The courier is running. Run him down."',
  8: 'Dario Kess: "Papers to the Marina office. Before the deadline."',
  9: 'Jax: "Roadblock on the harbor road. Smash through it."',
  10: 'Lena Voss: "The courier knows too much. End the run."',
  11: 'Rico: "Grand Prix. Six laps. Do not embarrass me."',
  12: 'Dario Kess: "Buy the ticket. Ember Isle is where this ends."',
  13: 'Jax: "Black sand. Get to the village before the patrol boats."',
  14: 'Lena Voss: "Four crates. Pay no one twice."',
  15: 'Rico: "Lava road. One mistake and you are ash."',
  16: 'Dario Kess: "Medicine to the cove. Before the storm."',
  17: 'Lena Voss: "The ledger is in the resort safe. Lift it."',
  18: 'Jax: "Hold the quay till dawn. Then we sail."',
  19: 'Dario Kess: "The volcano is blowing. RUN."',
  20: 'Tide King: "You want my crown, Mara? Come and take it."',
};

export const SUN_COINS = 42;
export const SAVE_KEY = 'vesper-city-ember-isle.save';
export const BEST_KEY = 'vesper-city-ember-isle.best';
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
