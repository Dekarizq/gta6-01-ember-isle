// The island story — eight missions for Ember Isle.
// Across the ferry, the volcano waits. Mara lands on Ember Isle to
// finish what the city started: the Tide Kings have a second base on
// the island, and the crown of Ember is won on the crater road. Every
// mission carries a giver, a reward, a respect payout, an intro, a
// brief, an outro, and a chain of steps on island places — the dock,
// the volcano road, the black beach, the resort, the night market and
// the lighthouse. Nothing is ever placed inside a building or in the
// sea.

import { ISLAND, islandRoadPoints } from './island.js';

function pt(x, z, text, kind) {
  return { x, z, text, kind: kind || 'goto' };
}

// The gate for the island finale (mission 20): an island business at
// level 2, 3,000 respect, Ember Town standing at level 2, and three
// street-race wins. Level 2 is reachable by playing the story (missions
// 13 and 16 give 205 Ember Town points, one island race win gives 60)
// while still asking Mara to have done something on the island first.
export function islandFinaleGateMet(islandBusiness, respectPoints, standing, races) {
  const missing = [];
  const maxLevel = islandBusiness ? maxIslandBusinessLevelOf(islandBusiness) : 0;
  if (maxLevel < 2) missing.push('an island business at level 2 (press B near a FOR SALE board on the island)');
  if (respectPoints < 3000) missing.push(`3,000 respect (you have ${respectPoints})`);
  const townLevel = standing ? standingLevelOf(standing, 'Ember Town') : 0;
  if (townLevel < 2) missing.push(`Ember Town standing level 2 (you have level ${townLevel})`);
  const wins = races ? (races.wins || 0) : 0;
  if (wins < 3) missing.push(`3 street race wins (you have ${wins})`);
  return { ok: missing.length === 0, missing };
}

function maxIslandBusinessLevelOf(business) {
  let best = 0;
  const owned = (business && business.owned) || {};
  for (const id of Object.keys(owned)) {
    const lvl = owned[id] && owned[id].level;
    if (Number.isInteger(lvl)) best = Math.max(best, lvl);
  }
  return best;
}

function standingLevelOf(standing, district) {
  const pts = (standing && standing.points && standing.points[district]) || 0;
  const thresholds = [0, 100, 250, 500, 900, 1500];
  let level = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (pts >= thresholds[i]) level = i;
  }
  return level;
}

export function buildIslandMissions(island) {
  const roads = islandRoadPoints();
  const cx = ISLAND.x;
  const cz = ISLAND.z;
  return [
    {
      id: 13, title: 'Ember Landing', giver: 'Old Tomas', reward: 1500, respect: 150, district: 'Ember Town',
      intro: 'Old Tomas: "Welcome to Ember Isle, Mara. The volcano is awake and the Tide Kings are already here. Step off the ferry and see for yourself."',
      brief: 'Mara lands on Ember Isle for the first time. Step off the ferry at Ember Dock, walk the town, and meet Old Tomas at the Fisher Village — the island is smaller than the city, and it watches newcomers closely.',
      outro: 'Old Tomas nods at the volcano: "The island is yours to take, if you are fast enough."',
      steps: [
        pt(roads.dock.x, roads.dock.z, 'Step off the ferry at Ember Dock', 'goto'),
        pt(cx - 60, cz + 40, 'Walk into Ember Town', 'goto'),
        pt(roads.village.x, roads.village.z, 'Meet Old Tomas at the Fisher Village', 'pickup'),
      ],
    },
    {
      id: 14, title: 'Volcano Run', giver: 'DJ Ash', reward: 2200, respect: 200, district: 'Volcano Rim',
      intro: 'Ash: "The volcano road is the fastest way to the crater, and the slowest way to survive it. Take the north road. Do not stop."',
      brief: 'DJ Ash wants a volcano run for the radio: take the north road toward the volcano, pass the crater road, and bring the lava report back to the rim hut — while the lava is moving.',
      outro: 'Ash on the air: "Mara Voss just ran the volcano road. The lava is moving. The music is NOT stopping."',
      steps: [
        pt(roads.craterRoad.x, roads.craterRoad.z, 'Take the north road toward the volcano', 'goto'),
        pt(cx + 40, cz - 60, 'Reach the crater road', 'goto'),
        pt(cx, cz - 100, 'Bring the lava report to the rim hut', 'deliver'),
      ],
    },
    {
      id: 15, title: 'Black Sand', giver: 'Old Tomas', reward: 2000, respect: 180, district: 'Black Sand Beach',
      intro: 'Old Tomas: "The black beach hides obsidian after every storm. Collect it. The market pays well for volcanic glass."',
      brief: 'After the storm, obsidian lies on the black beach. Collect the glass from the sand, the cove and the lighthouse point, and bring it to Old Tomas at the village.',
      outro: 'Old Tomas weighs the glass: "Volcanic glass, clean and black. The market will pay double."',
      steps: [
        pt(cx, cz - 200, 'Collect obsidian on the black beach', 'pickup'),
        pt(cx - 220, cz + 180, 'Collect obsidian at the cove', 'pickup'),
        pt(roads.lighthouse.x, roads.lighthouse.z, 'Collect obsidian at the lighthouse point', 'pickup'),
        pt(roads.village.x, roads.village.z, 'Bring the glass to Old Tomas', 'deliver'),
      ],
    },
    {
      id: 16, title: 'Ferry Heist', giver: 'Lena Voss', reward: 3200, respect: 260, district: 'Ember Town',
      intro: 'Lena: "A smuggler boat is running the cove with no lights. Take the ferry, take the boat, take the cargo. Quietly."',
      brief: 'A smuggler boat runs the cove with no lights. Board the ferry, cross to the island, intercept the boat at the cove, and bring the cargo to Lena at the night market.',
      outro: 'Lena opens the crate: "No lights, no questions, all profit. The island suits you, Mara."',
      steps: [
        pt(roads.dock.x, roads.dock.z, 'Board the ferry to Ember Isle', 'goto'),
        pt(cx - 220, cz + 180, 'Intercept the smuggler boat at the cove', 'eliminate'),
        pt(roads.market.x, roads.market.z, 'Bring the cargo to Lena at the night market', 'deliver'),
      ],
    },
    {
      id: 17, title: 'The Resort Job', giver: 'Dario Kess', reward: 2800, respect: 240, district: 'Ember Resort',
      intro: 'Dario: "The resort owes me. The tourists pay in cash and the cash is in the safe. Go and collect it."',
      brief: 'The Ember Resort owes Dario. Collect from the resort lobby, the pool bar and the cabanas, then bring the money to the dock — the tourists never notice a thing.',
      outro: 'Dario counts it twice: "The resort pays. The island pays. Everyone pays, eventually."',
      steps: [
        pt(roads.resort.x, roads.resort.z, 'Reach the Ember Resort', 'goto'),
        pt(cx + 190, cz + 20, 'Collect from the resort lobby', 'pickup'),
        pt(cx + 190, cz + 100, 'Collect from the pool bar', 'pickup'),
        pt(roads.dock.x, roads.dock.z, 'Bring the money to the dock', 'deliver'),
      ],
    },
    {
      id: 18, title: 'Night Market Rush', giver: 'DJ Ash', reward: 2600, respect: 230, district: 'Night Market',
      intro: 'Ash: "The night market is the loudest place on the island, and the Tide Kings tax every stall. Collect the takings. All of them."',
      brief: 'The night market takings are in the stalls and the Tide Kings tax every one. Collect from the grill, the charms and the lamps, then hide the money at the church before the patrol arrives.',
      outro: 'Ash on the air: "The market is dancing and the takings are safe. The island is listening."',
      steps: [
        pt(roads.market.x, roads.market.z, 'Reach the night market', 'goto'),
        pt(cx - 60, cz + 195, 'Collect the grill takings', 'pickup'),
        pt(cx + 40, cz + 195, 'Collect the charms takings', 'pickup'),
        pt(cx + 100, cz + 150, 'Hide the money at the church', 'deliver'),
      ],
    },
    {
      id: 19, title: 'Lava Festival', giver: 'Old Tomas', reward: 3000, respect: 280, district: 'Night Market',
      intro: 'Old Tomas: "The Lava Festival is tonight and the whole island is dancing. The Tide Kings want to spoil it. Do not let them."',
      brief: 'The Lava Festival is tonight: the market is dancing, the volcano is glowing, and the Tide Kings want to spoil it. Hold the market, hold the crater road, and keep the festival alive until the fireworks.',
      outro: 'Fireworks over the crater. Old Tomas raises a glass: "The island dances because you held it, Mara."',
      steps: [
        pt(roads.market.x, roads.market.z, 'Hold the night market', 'eliminate'),
        pt(roads.craterRoad.x, roads.craterRoad.z, 'Hold the crater road', 'eliminate'),
        pt(cx, cz - 100, 'Light the festival beacon at the rim', 'deliver'),
      ],
    },
    {
      id: 20, title: 'Queen of Ember', giver: 'DJ Ash', reward: 5000, respect: 500, district: 'Volcano Rim',
      intro: 'Ash: "The Tide Kings have a second base on the crater road, Mara. Take the volcano, take the island, and the crown is yours."',
      brief: 'The finale. The Tide Kings hold a second base on the crater road and the crown of Ember is won on the volcano itself. Take the crater, hold the town, finish them at the lighthouse — and bring the crown home across the ferry.',
      outro: 'The volcano glows over an island that is yours. Ash on the air: "Twenty jobs, one volcano — and the crown stays on Ember Isle. Queen of Ember, Mara."',
      steps: [
        pt(roads.craterRoad.x, roads.craterRoad.z, 'Take the crater road', 'eliminate'),
        pt(cx - 60, cz + 40, 'Hold Ember Town', 'eliminate'),
        pt(roads.lighthouse.x, roads.lighthouse.z, 'Finish them at the lighthouse', 'eliminate'),
        pt(roads.dock.x, roads.dock.z, 'Bring the crown home across the ferry', 'deliver'),
      ],
    },
  ];
}

export const ISLAND_MISSION_COUNT = 8;
export const TOTAL_MISSIONS = 20;

// The island mission by id.
export function islandMissionById(id, island) {
  return buildIslandMissions(island).find((m) => m.id === id) || null;
}

export function islandMissionBrief(id, island) {
  const m = islandMissionById(id, island);
  return m ? m.brief : '';
}

export function islandMissionOutro(id, island) {
  const m = islandMissionById(id, island);
  return m ? m.outro : '';
}

// A tip for an island mission, for the HUD hint line.
export const ISLAND_MISSION_TIPS = {
  13: 'The ferry runs every 90 seconds. Boarding is free for business owners.',
  14: 'The volcano road is steep — nitro helps on the climb.',
  15: 'Obsidian glints black on the black sand. Look for the shine.',
  16: 'The smugglers shoot back. Bring the Golden 12-Gauge.',
  17: 'The resort pays in cash. The cash is in the safe.',
  18: 'The patrol watches the market. Move fast and quiet.',
  19: 'The festival needs the crater road held, not just the market.',
  20: 'The finale needs an island business at level 2, 3,000 respect, Ember Town standing 2 and 3 race wins.',
};

export function islandMissionTip(id) {
  return ISLAND_MISSION_TIPS[id] || 'Drive fast. The island is watching.';
}
